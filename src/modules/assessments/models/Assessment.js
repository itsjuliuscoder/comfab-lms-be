import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: [true, 'Question text is required'],
    trim: true,
    maxlength: [1000, 'Question cannot exceed 1000 characters'],
  },
  type: {
    type: String,
    enum: ['MULTIPLE_CHOICE', 'SINGLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER', 'ESSAY', 'FILE_UPLOAD'],
    required: true,
  },
  options: [{
    type: String,
    trim: true,
    maxlength: [500, 'Option cannot exceed 500 characters'],
  }],
  correctAnswer: {
    type: mongoose.Schema.Types.Mixed,
    required: function() {
      return ['MULTIPLE_CHOICE', 'SINGLE_CHOICE', 'TRUE_FALSE'].includes(this.type);
    },
  },
  points: {
    type: Number,
    required: true,
    min: [1, 'Points must be at least 1'],
    max: [100, 'Points cannot exceed 100'],
  },
  explanation: {
    type: String,
    trim: true,
    maxlength: [1000, 'Explanation cannot exceed 1000 characters'],
  },
  isRequired: {
    type: Boolean,
    default: true,
  },
  order: {
    type: Number,
    required: true,
    min: [1, 'Order must be at least 1'],
  },
}, {
  timestamps: true,
});

const assessmentSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
  },
  title: {
    type: String,
    required: [true, 'Assessment title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters'],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters'],
  },
  type: {
    type: String,
    enum: ['QUIZ', 'ASSIGNMENT', 'EXAM', 'SURVEY'],
    required: true,
  },
  questions: [questionSchema],
  timeLimit: {
    type: Number,
    min: [1, 'Time limit must be at least 1 minute'],
    max: [480, 'Time limit cannot exceed 8 hours'],
  },
  passingScore: {
    type: Number,
    min: [0, 'Passing score cannot be negative'],
    max: [100, 'Passing score cannot exceed 100'],
    default: 70,
  },
  maxAttempts: {
    type: Number,
    min: [1, 'Max attempts must be at least 1'],
    default: 1,
  },
  isPublished: {
    type: Boolean,
    default: false,
  },
  isAutoGraded: {
    type: Boolean,
    default: true,
  },
  allowReview: {
    type: Boolean,
    default: true,
  },
  showCorrectAnswers: {
    type: Boolean,
    default: false,
  },
  dueDate: {
    type: Date,
  },
  instructions: {
    type: String,
    trim: true,
    maxlength: [2000, 'Instructions cannot exceed 2000 characters'],
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [50, 'Tag cannot exceed 50 characters'],
  }],
  difficulty: {
    type: String,
    enum: ['EASY', 'MEDIUM', 'HARD'],
    default: 'MEDIUM',
  },
  totalPoints: {
    type: Number,
    default: 0,
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtual for total questions count
assessmentSchema.virtual('questionCount').get(function() {
  return this.questions.length;
});

// Virtual for total points
assessmentSchema.virtual('maxPoints').get(function() {
  return this.questions.reduce((total, question) => total + question.points, 0);
});

// Pre-save middleware to calculate total points
assessmentSchema.pre('save', function(next) {
  this.totalPoints = this.questions.reduce((total, question) => total + question.points, 0);
  next();
});

// Indexes
assessmentSchema.index({ courseId: 1, type: 1 });
assessmentSchema.index({ ownerId: 1 });
assessmentSchema.index({ isPublished: 1 });
assessmentSchema.index({ dueDate: 1 });

// Static method to find by course
assessmentSchema.statics.findByCourse = function(courseId) {
  return this.find({ courseId, isPublished: true }).sort({ createdAt: -1 });
};

// Static method to find published assessments
assessmentSchema.statics.findPublished = function(courseId) {
  return this.find({ courseId, isPublished: true }).sort({ order: 1 });
};

// Instance method to get assessment summary
assessmentSchema.methods.getSummary = function() {
  return {
    id: this._id,
    title: this.title,
    type: this.type,
    questionCount: this.questionCount,
    totalPoints: this.totalPoints,
    timeLimit: this.timeLimit,
    passingScore: this.passingScore,
    isPublished: this.isPublished,
    dueDate: this.dueDate,
    difficulty: this.difficulty,
  };
};

// Instance method to validate answers
assessmentSchema.methods.validateAnswers = function(userAnswers) {
  const results = [];
  let totalScore = 0;
  let maxPossibleScore = 0;

  this.questions.forEach((question, index) => {
    const userAnswer = userAnswers[index];
    let isCorrect = false;
    let score = 0;
    let feedback = '';

    maxPossibleScore += question.points;

    if (!userAnswer) {
      results.push({
        questionIndex: index,
        questionId: question._id,
        isCorrect: false,
        score: 0,
        feedback: 'No answer provided',
      });
      return;
    }

    switch (question.type) {
      case 'MULTIPLE_CHOICE':
      case 'SINGLE_CHOICE':
        isCorrect = userAnswer.answer === question.correctAnswer;
        score = isCorrect ? question.points : 0;
        feedback = isCorrect ? 'Correct!' : `Incorrect. The correct answer was: ${question.correctAnswer}`;
        break;

      case 'TRUE_FALSE':
        isCorrect = userAnswer.answer === question.correctAnswer;
        score = isCorrect ? question.points : 0;
        feedback = isCorrect ? 'Correct!' : `Incorrect. The correct answer was: ${question.correctAnswer}`;
        break;

      case 'SHORT_ANSWER':
      case 'ESSAY':
        isCorrect = null;
        score = 0;
        feedback = 'Pending manual review';
        break;

      case 'FILE_UPLOAD':
        isCorrect = null;
        score = 0;
        feedback = 'File uploaded - pending review';
        break;

      default:
        isCorrect = false;
        score = 0;
        feedback = 'Invalid question type';
    }

    totalScore += score;
    results.push({
      questionIndex: index,
      questionId: question._id,
      isCorrect,
      score,
      feedback,
      explanation: question.explanation,
    });
  });

  const percentage = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;
  const passed = percentage >= this.passingScore;

  return {
    totalScore,
    maxPossibleScore,
    percentage,
    passed,
    results,
  };
};

export const Assessment = mongoose.model('Assessment', assessmentSchema);
