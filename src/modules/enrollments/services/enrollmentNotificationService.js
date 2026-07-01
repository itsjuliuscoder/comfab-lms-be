import { Enrollment } from '../models/Enrollment.js';
import { sendCourseCompletionEmail } from '../../../config/email.js';
import { logger } from '../../../utils/logger.js';

export async function notifyEnrollmentCompletedIfNeeded(previousStatus, enrollment) {
  if (previousStatus === 'COMPLETED' || enrollment.status !== 'COMPLETED') {
    return;
  }

  try {
    const populated = await Enrollment.findById(enrollment._id)
      .populate('userId', 'name email')
      .populate('courseId', 'title summary _id');

    if (!populated?.userId || !populated?.courseId) {
      return;
    }

    await sendCourseCompletionEmail(populated.userId, populated.courseId, {
      certificateIssued: populated.certificateIssued,
    });
  } catch (error) {
    logger.error('Failed to send course completion email:', error);
  }
}
