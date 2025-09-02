import { Assessment } from '../models/Assessment.js';
import { AssessmentSubmission } from '../models/AssessmentSubmission.js';
import { Course } from '../../courses/models/Course.js';
import { successResponse, errorResponse, notFoundResponse, forbiddenResponse } from '../../../utils/response.js';
import { getPaginationParams, createPaginationResult } from '../../../utils/pagination.js';
import { logger } from '../../../utils/logger.js';

// GET /assessments - Get all assessments for a course
export const getCourseAssessments = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { page, limit } = getPaginationParams(req.query);
    const { type, status, search } = req.query;

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return notFoundResponse(res, 'Course');
    }ar

    // Build query
    const query = { courseId };
    if (type) query.type = type;
    if (status === 'published') query.isPublished = true;
    if (status === 'draft') query.isPublished = false;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } },
      ];
    }

    // For non-admin users, only show published assessments
    if (req.user?.role !== 'ADMIN' && course.ownerId.toString() !== req.user?._id.toString()) {
      query.isPublished = true;
    }

    // Get total count
    const total = await Assessment.countDocuments(query);

    // Get assessments with pagination
    const assessments = await Assessment.find(query)
      .populate('ownerId', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const result = createPaginationResult(assessments, total, page, limit);
    return successResponse(res, result, 'Assessments retrieved successfully');
  } catch (error) {
    logger.error('Get course assessments error:', error);
    return errorResponse(res, error);
  }
};

// POST /assessments - Create assessment (instructor/admin)
export const createAssessment = async (req, res) => {
  try {
    const { courseId } = req.params;
    const {
      title,
      description,
      type,
      questions,
      timeLimit,
      passingScore,
      maxAttempts,
      isPublished,
      isAutoGraded,
      allowReview,
      showCorrectAnswers,
      dueDate,
      instructions,
      tags,
      difficulty,
    } = req.body;

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return notFoundResponse(res, 'Course');
    }

    // Check permissions
    if (course.ownerId.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      return forbiddenResponse(res, 'Only course owner or admin can create assessments');
    }

    // Validate questions
    if (!questions || questions.length === 0) {
      return errorResponse(res, new Error('At least one question is required'), 400);
    }

    // Set order for questions if not provided
    questions.forEach((question, index) => {
      if (!question.order) {
        question.order = index + 1;
      }
    });

    const assessment = new Assessment({
      courseId,
      title,
      description,
      type,
      questions,
      timeLimit,
      passingScore,
      maxAttempts,
      isPublished: isPublished !== undefined ? isPublished : false,
      isAutoGraded: isAutoGraded !== undefined ? isAutoGraded : true,
      allowReview: allowReview !== undefined ? allowReview : true,
      showCorrectAnswers: showCorrectAnswers !== undefined ? showCorrectAnswers : false,
      dueDate,
      instructions,
      tags,
      difficulty,
      ownerId: req.user._id,
    });

    await assessment.save();

    const populatedAssessment = await Assessment.findById(assessment._id)
      .populate('ownerId', 'name email');

    return successResponse(res, { assessment: populatedAssessment }, 'Assessment created successfully', 201);
  } catch (error) {
    logger.error('Create assessment error:', error);
    return errorResponse(res, error);
  }
};

// GET /assessments/:id - Get assessment by ID
export const getAssessmentById = async (req, res) => {
  try {
    const { courseId, assessmentId } = req.params;

    const assessment = await Assessment.findById(assessmentId)
      .populate('ownerId', 'name email')
      .populate('courseId', 'title status ownerId');

    if (!assessment) {
      return notFoundResponse(res, 'Assessment');
    }

    // Check if assessment belongs to the course
    if (assessment.courseId._id.toString() !== courseId) {
      return notFoundResponse(res, 'Assessment not found in this course');
    }

    // Check permissions
    if (!assessment.isPublished && 
        req.user?.role !== 'ADMIN' && 
        assessment.ownerId._id.toString() !== req.user?._id.toString()) {
      return forbiddenResponse(res, 'Access denied');
    }

    return successResponse(res, { assessment }, 'Assessment retrieved successfully');
  } catch (error) {
    logger.error('Get assessment by ID error:', error);
    return errorResponse(res, error);
  }
};

// PUT /assessments/:id - Update assessment (instructor/admin)
export const updateAssessment = async (req, res) => {
  try {
    const { courseId, assessmentId } = req.params;
    const updates = req.body;

    const assessment = await Assessment.findById(assessmentId)
      .populate('courseId', 'ownerId');

    if (!assessment) {
      return notFoundResponse(res, 'Assessment');
    }

    // Check if assessment belongs to the course
    if (assessment.courseId._id.toString() !== courseId) {
      return notFoundResponse(res, 'Assessment not found in this course');
    }

    // Check permissions
    if (assessment.ownerId.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      return forbiddenResponse(res, 'Only assessment owner or admin can update assessment');
    }

    // If questions are being updated, validate them
    if (updates.questions) {
      if (updates.questions.length === 0) {
        return errorResponse(res, new Error('At least one question is required'), 400);
      }

      // Set order for questions if not provided
      updates.questions.forEach((question, index) => {
        if (!question.order) {
          question.order = index + 1;
        }
      });
    }

    const updatedAssessment = await Assessment.findByIdAndUpdate(
      assessmentId,
      updates,
      { new: true, runValidators: true }
    ).populate('ownerId', 'name email');

    return successResponse(res, { assessment: updatedAssessment }, 'Assessment updated successfully');
  } catch (error) {
    logger.error('Update assessment error:', error);
    return errorResponse(res, error);
  }
};

// DELETE /assessments/:id - Delete assessment (instructor/admin)
export const deleteAssessment = async (req, res) => {
  try {
    const { courseId, assessmentId } = req.params;

    const assessment = await Assessment.findById(assessmentId)
      .populate('courseId', 'ownerId');

    if (!assessment) {
      return notFoundResponse(res, 'Assessment');
    }

    // Check if assessment belongs to the course
    if (assessment.courseId._id.toString() !== courseId) {
      return notFoundResponse(res, 'Assessment not found in this course');
    }

    // Check permissions
    if (assessment.ownerId.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      return forbiddenResponse(res, 'Only assessment owner or admin can delete assessment');
    }

    // Check if there are any submissions
    const submissionCount = await AssessmentSubmission.countDocuments({ assessmentId });
    if (submissionCount > 0) {
      return errorResponse(res, new Error('Cannot delete assessment with existing submissions'), 400);
    }

    await Assessment.findByIdAndDelete(assessmentId);

    return successResponse(res, null, 'Assessment deleted successfully');
  } catch (error) {
    logger.error('Delete assessment error:', error);
    return errorResponse(res, error);
  }
};

// POST /assessments/:id/start - Start assessment attempt
export const startAssessment = async (req, res) => {
  try {
    const { courseId, assessmentId } = req.params;
    const { userId } = req.user;

    const assessment = await Assessment.findById(assessmentId)
      .populate('courseId', 'title status');

    if (!assessment) {
      return notFoundResponse(res, 'Assessment');
    }

    // Check if assessment belongs to the course
    if (assessment.courseId._id.toString() !== courseId) {
      return notFoundResponse(res, 'Assessment not found in this course');
    }

    // Check if assessment is published
    if (!assessment.isPublished) {
      return forbiddenResponse(res, 'Assessment is not available');
    }

    // Check if user has reached max attempts
    const existingSubmissions = await AssessmentSubmission.findUserSubmissions(assessmentId, userId);
    if (existingSubmissions.length >= assessment.maxAttempts) {
      return errorResponse(res, new Error('Maximum attempts reached for this assessment'), 400);
    }

    // Check if there's an in-progress submission
    const inProgressSubmission = existingSubmissions.find(sub => sub.status === 'IN_PROGRESS');
    if (inProgressSubmission) {
      return successResponse(res, { 
        submission: inProgressSubmission,
        message: 'Resuming existing attempt'
      }, 'Resuming existing attempt');
    }

    // Create new submission
    const attemptNumber = existingSubmissions.length + 1;
    const submission = new AssessmentSubmission({
      assessmentId,
      courseId,
      userId,
      attemptNumber,
      startTime: new Date(),
      maxPossibleScore: assessment.totalPoints,
      status: 'IN_PROGRESS',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    await submission.save();

    return successResponse(res, { 
      submission,
      assessment: {
        id: assessment._id,
        title: assessment.title,
        description: assessment.description,
        timeLimit: assessment.timeLimit,
        questionCount: assessment.questions.length,
        totalPoints: assessment.totalPoints,
        instructions: assessment.instructions,
      }
    }, 'Assessment started successfully');
  } catch (error) {
    logger.error('Start assessment error:', error);
    return errorResponse(res, error);
  }
};

// POST /assessments/:id/submit - Submit assessment
export const submitAssessment = async (req, res) => {
  try {
    const { courseId, assessmentId } = req.params;
    const { submissionId, answers } = req.body;
    const { userId } = req.user;

    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) {
      return notFoundResponse(res, 'Assessment');
    }

    // Check if assessment belongs to the course
    if (assessment.courseId.toString() !== courseId) {
      return notFoundResponse(res, 'Assessment not found in this course');
    }

    // Find submission
    const submission = await AssessmentSubmission.findOne({
      _id: submissionId,
      assessmentId,
      userId,
      status: 'IN_PROGRESS'
    });

    if (!submission) {
      return notFoundResponse(res, 'Submission not found or already submitted');
    }

    // Validate answers
    if (!answers || answers.length === 0) {
      return errorResponse(res, new Error('At least one answer is required'), 400);
    }

    // Check time limit
    const timeSpent = Math.floor((new Date() - submission.startTime) / 1000);
    const isTimeLimitExceeded = assessment.timeLimit && timeSpent > (assessment.timeLimit * 60);

    // Process answers and grade if auto-graded
    const processedAnswers = answers.map((answer, index) => {
      const question = assessment.questions[index];
      if (!question) return null;

      let isCorrect = null;
      let score = 0;
      let feedback = '';

      if (assessment.isAutoGraded) {
        switch (question.type) {
          case 'MULTIPLE_CHOICE':
          case 'SINGLE_CHOICE':
          case 'TRUE_FALSE':
            isCorrect = answer.answer === question.correctAnswer;
            score = isCorrect ? question.points : 0;
            feedback = isCorrect ? 'Correct!' : `Incorrect. The correct answer was: ${question.correctAnswer}`;
            break;
          case 'SHORT_ANSWER':
          case 'ESSAY':
          case 'FILE_UPLOAD':
            isCorrect = null;
            score = 0;
            feedback = 'Pending manual review';
            break;
        }
      }

      return {
        questionId: question._id,
        questionIndex: index,
        answer: answer.answer,
        isCorrect,
        score,
        feedback,
        explanation: question.explanation,
        timeSpent: answer.timeSpent || 0,
      };
    }).filter(Boolean);

    // Update submission
    submission.answers = processedAnswers;
    submission.submitTime = new Date();
    submission.timeSpent = timeSpent;
    submission.isTimeLimitExceeded = isTimeLimitExceeded;

    // Calculate score if auto-graded
    if (assessment.isAutoGraded) {
      const scoreResult = submission.calculateScore();
      submission.checkPassed(assessment.passingScore);
      submission.status = 'GRADED';
    } else {
      submission.status = 'SUBMITTED';
    }

    await submission.save();

    return successResponse(res, { 
      submission: submission.getSummary(),
      autoGraded: assessment.isAutoGraded,
      showCorrectAnswers: assessment.showCorrectAnswers,
    }, 'Assessment submitted successfully');
  } catch (error) {
    logger.error('Submit assessment error:', error);
    return errorResponse(res, error);
  }
};

// GET /assessments/:id/submissions - Get user submissions for assessment
export const getUserSubmissions = async (req, res) => {
  try {
    const { courseId, assessmentId } = req.params;
    const { userId } = req.user;

    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) {
      return notFoundResponse(res, 'Assessment');
    }

    // Check if assessment belongs to the course
    if (assessment.courseId.toString() !== courseId) {
      return notFoundResponse(res, 'Assessment not found in this course');
    }

    const submissions = await AssessmentSubmission.findUserSubmissions(assessmentId, userId);

    return successResponse(res, { submissions }, 'Submissions retrieved successfully');
  } catch (error) {
    logger.error('Get user submissions error:', error);
    return errorResponse(res, error);
  }
};

// GET /assessments/:id/results - Get all submissions for assessment (instructor/admin)
export const getAssessmentResults = async (req, res) => {
  try {
    const { courseId, assessmentId } = req.params;
    const { page, limit } = getPaginationParams(req.query);

    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) {
      return notFoundResponse(res, 'Assessment');
    }

    // Check if assessment belongs to the course
    if (assessment.courseId.toString() !== courseId) {
      return notFoundResponse(res, 'Assessment not found in this course');
    }

    // Check permissions
    if (assessment.ownerId.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      return forbiddenResponse(res, 'Only assessment owner or admin can view results');
    }

    // Get total count
    const total = await AssessmentSubmission.countDocuments({ assessmentId });

    // Get submissions with pagination
    const submissions = await AssessmentSubmission.find({ assessmentId })
      .populate('userId', 'name email')
      .populate('gradedBy', 'name email')
      .sort({ submitTime: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const result = createPaginationResult(submissions, total, page, limit);
    return successResponse(res, result, 'Assessment results retrieved successfully');
  } catch (error) {
    logger.error('Get assessment results error:', error);
    return errorResponse(res, error);
  }
};
