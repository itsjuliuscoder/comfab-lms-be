import { User } from '../../users/models/User.js';
import { Enrollment } from '../../enrollments/models/Enrollment.js';
import { sendAnnouncementEmail } from '../../../config/email.js';
import { logger } from '../../../utils/logger.js';

const emailOptInQuery = {
  status: 'ACTIVE',
  'preferences.emailNotifications': { $ne: false },
};

export async function getAnnouncementRecipients(announcement) {
  const { visibility, targetAudience = {} } = announcement;

  switch (visibility) {
    case 'PUBLIC':
      return User.find(emailOptInQuery).select('name email preferences');

    case 'ENROLLED_USERS': {
      if (!targetAudience.courseId) {
        return User.find(emailOptInQuery).select('name email preferences');
      }

      const userIds = await Enrollment.find({
        courseId: targetAudience.courseId,
        status: { $in: ['ACTIVE', 'COMPLETED'] },
      }).distinct('userId');

      return User.find({
        _id: { $in: userIds },
        ...emailOptInQuery,
      }).select('name email preferences');
    }

    case 'INSTRUCTORS':
      return User.find({
        role: { $in: ['SUPER_ADMIN', 'ADMIN', 'INSTRUCTOR'] },
        ...emailOptInQuery,
      }).select('name email preferences');

    case 'ADMINS':
      return User.find({
        role: { $in: ['SUPER_ADMIN', 'ADMIN'] },
        ...emailOptInQuery,
      }).select('name email preferences');

    case 'SPECIFIC_USERS': {
      const userIds = targetAudience.userIds || [];
      if (userIds.length === 0) {
        return [];
      }

      return User.find({
        _id: { $in: userIds },
        ...emailOptInQuery,
      }).select('name email preferences');
    }

    default:
      return [];
  }
}

export async function sendAnnouncementEmails(announcement, author) {
  if (announcement.status !== 'PUBLISHED') {
    return;
  }

  const recipients = await getAnnouncementRecipients(announcement);

  await Promise.allSettled(
    recipients.map(async (recipient) => {
      try {
        await sendAnnouncementEmail(recipient, announcement, author);
      } catch (error) {
        logger.error(`Failed to send announcement email to ${recipient.email}:`, error);
      }
    })
  );
}
