import { Enrollment } from '../models/Enrollment.js';
import { sendCourseCompletionEmail } from '../../../config/email.js';
import { createNotification } from '../../notifications/services/notificationService.js';
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

    await createNotification({
      userId: populated.userId._id,
      type: 'COURSE_COMPLETION',
      title: 'Course completed',
      message: `Congratulations! You completed "${populated.courseId.title}".`,
      link: `/dashboard/courses/${populated.courseId._id}/learn`,
      data: {
        courseId: populated.courseId._id.toString(),
        enrollmentId: populated._id.toString(),
      },
      priority: 'HIGH',
    });
  } catch (error) {
    logger.error('Failed to send course completion email:', error);
  }
}
