import { Resend } from 'resend';
import { config } from './env.js';
import { logger } from '../utils/logger.js';

let resend = null;

try {
  if (config.email?.resend?.apiKey) {
    resend = new Resend(config.email.resend.apiKey);
    logger.info('✅ Resend configured successfully');
  } else {
    logger.warn('⚠️ Resend not configured - API key missing');
  }
} catch (error) {
  logger.error('❌ Failed to initialize Resend:', error.message);
}

export const createResendTemplates = {
  welcomeEmail: (user) => ({
    subject: `Welcome to ${config.app.name}!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to ${config.app.name}!</h2>
        <p>Hello ${user.name},</p>
        <p>Thank you for joining our platform. We're excited to have you on board!</p>
        <p>Your account has been successfully created with the following details:</p>
        <ul>
          <li><strong>Name:</strong> ${user.name}</li>
          <li><strong>Email:</strong> ${user.email}</li>
          <li><strong>Role:</strong> ${user.role}</li>
        </ul>
        <p>You can now log in to your account and start exploring our courses.</p>
        <p>Best regards,<br>The ${config.app.name} Team</p>
      </div>
    `,
    text: `
      Welcome to ${config.app.name}!

      Hello ${user.name},

      Thank you for joining our platform. We're excited to have you on board!

      Your account has been successfully created with the following details:
      - Name: ${user.name}
      - Email: ${user.email}
      - Role: ${user.role}

      You can now log in to your account and start exploring our courses.

      Best regards,
      The ${config.app.name} Team
    `,
  }),

  passwordResetEmail: (user, resetToken) => ({
    subject: `Password Reset Request - ${config.app.name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>Hello ${user.name},</p>
        <p>We received a request to reset your password for your ${config.app.name} account.</p>
        <p>Click the link below to reset your password:</p>
        <p>
          <a href="${config.app.clientUrl}/reset-password?token=${resetToken}"
             style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Reset Password
          </a>
        </p>
        <p>If you didn't request this password reset, please ignore this email.</p>
        <p>This link will expire in 1 hour.</p>
        <p>Best regards,<br>The ${config.app.name} Team</p>
      </div>
    `,
    text: `
      Password Reset Request - ${config.app.name}

      Hello ${user.name},

      We received a request to reset your password for your ${config.app.name} account.

      Click the link below to reset your password:
      ${config.app.clientUrl}/reset-password?token=${resetToken}

      If you didn't request this password reset, please ignore this email.
      This link will expire in 1 hour.

      Best regards,
      The ${config.app.name} Team
    `,
  }),

  invitationEmail: (user, inviteToken, invitedBy) => ({
    subject: `You've been invited to join ${config.app.name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to ${config.app.name}!</h2>
        <p>Hi ${user.name},</p>
        <p>You have been invited by <strong>${invitedBy.name}</strong> to join ${config.app.name}.</p>
        <p>Your account has been created with the following details:</p>
        <ul>
          <li><strong>Email:</strong> ${user.email}</li>
          <li><strong>Role:</strong> ${user.role}</li>
        </ul>
        <p>To complete your account setup and set your password, click the link below:</p>
        <p>
          <a href="${config.app.clientUrl}/complete-invite?token=${inviteToken}"
             style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Complete Account Setup
          </a>
        </p>
        <p>This invitation link will expire in 7 days.</p>
        <p>If you have any questions, please contact support.</p>
        <p>Best regards,<br>The ${config.app.name} Team</p>
      </div>
    `,
    text: `
      You've been invited to join ${config.app.name}!

      Hi ${user.name},

      You have been invited by ${invitedBy.name} to join ${config.app.name}.

      Your account has been created with the following details:
      - Email: ${user.email}
      - Role: ${user.role}

      To complete your account setup and set your password, click the link below:
      ${config.app.clientUrl}/complete-invite?token=${inviteToken}

      This invitation link will expire in 7 days.
      If you have any questions, please contact support.

      Best regards,
      The ${config.app.name} Team
    `,
  }),

  enrollmentEmail: (user, course) => ({
    subject: `Welcome to ${course.title} - ${config.app.name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to ${course.title}!</h2>
        <p>Hello ${user.name},</p>
        <p>Congratulations! You've successfully enrolled in <strong>${course.title}</strong>.</p>
        <p><strong>Course Summary:</strong></p>
        <p>${course.summary}</p>
        <p>You can now access your course and start learning!</p>
        <p>
          <a href="${config.app.clientUrl}/courses/${course._id}"
             style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Start Learning
          </a>
        </p>
        <p>Best regards,<br>The ${config.app.name} Team</p>
      </div>
    `,
    text: `
      Welcome to ${course.title} - ${config.app.name}

      Hello ${user.name},

      Congratulations! You've successfully enrolled in ${course.title}.

      Course Summary:
      ${course.summary}

      You can now access your course and start learning!
      ${config.app.clientUrl}/courses/${course._id}

      Best regards,
      The ${config.app.name} Team
    `,
  }),

  verificationEmail: (user, verificationToken) => ({
    subject: `Verify your email - ${config.app.name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Verify your email address</h2>
        <p>Hello ${user.name},</p>
        <p>Please confirm your email address to complete your ${config.app.name} account setup.</p>
        <p>
          <a href="${config.app.clientUrl}/verify-email?token=${verificationToken}"
             style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Verify Email
          </a>
        </p>
        <p>If you didn't create an account, you can ignore this email.</p>
        <p>This link will expire in 24 hours.</p>
        <p>Best regards,<br>The ${config.app.name} Team</p>
      </div>
    `,
    text: `
      Verify your email - ${config.app.name}

      Hello ${user.name},

      Please confirm your email address to complete your ${config.app.name} account setup.

      Click the link below to verify your email:
      ${config.app.clientUrl}/verify-email?token=${verificationToken}

      If you didn't create an account, you can ignore this email.
      This link will expire in 24 hours.

      Best regards,
      The ${config.app.name} Team
    `,
  }),

  passwordChangedEmail: (user) => ({
    subject: `Your password was changed - ${config.app.name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password changed</h2>
        <p>Hello ${user.name},</p>
        <p>Your ${config.app.name} account password was changed successfully.</p>
        <p>If you did not make this change, please contact support immediately.</p>
        <p>Best regards,<br>The ${config.app.name} Team</p>
      </div>
    `,
    text: `
      Your password was changed - ${config.app.name}

      Hello ${user.name},

      Your ${config.app.name} account password was changed successfully.

      If you did not make this change, please contact support immediately.

      Best regards,
      The ${config.app.name} Team
    `,
  }),

  courseCompletionEmail: (user, course, { certificateIssued = false } = {}) => ({
    subject: `Congratulations! You completed ${course.title} - ${config.app.name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Course completed!</h2>
        <p>Hello ${user.name},</p>
        <p>Congratulations on completing <strong>${course.title}</strong>!</p>
        ${certificateIssued ? '<p>Your certificate has been issued and is available in your account.</p>' : ''}
        <p>
          <a href="${config.app.clientUrl}/courses/${course._id}"
             style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            View Course
          </a>
        </p>
        <p>Best regards,<br>The ${config.app.name} Team</p>
      </div>
    `,
    text: `
      Congratulations! You completed ${course.title} - ${config.app.name}

      Hello ${user.name},

      Congratulations on completing ${course.title}!
      ${certificateIssued ? 'Your certificate has been issued and is available in your account.' : ''}

      View course: ${config.app.clientUrl}/courses/${course._id}

      Best regards,
      The ${config.app.name} Team
    `,
  }),

  announcementEmail: (user, announcement, author) => ({
    subject: `${announcement.title} - ${config.app.name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">${announcement.title}</h2>
        <p>Hello ${user.name},</p>
        <p>A new announcement has been posted${author?.name ? ` by <strong>${author.name}</strong>` : ''}:</p>
        <div style="background-color: #f5f5f5; padding: 16px; border-radius: 4px; margin: 16px 0;">
          ${announcement.content}
        </div>
        <p>
          <a href="${config.app.clientUrl}/announcements"
             style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            View Announcements
          </a>
        </p>
        <p>Best regards,<br>The ${config.app.name} Team</p>
      </div>
    `,
    text: `
      ${announcement.title} - ${config.app.name}

      Hello ${user.name},

      A new announcement has been posted${author?.name ? ` by ${author.name}` : ''}:

      ${announcement.content}

      View announcements: ${config.app.clientUrl}/announcements

      Best regards,
      The ${config.app.name} Team
    `,
  }),
};

export const sendEmailWithResend = async ({ to, subject, html, text }) => {
  if (!resend) {
    throw new Error(
      'Resend is not configured. Please set RESEND_API_KEY in your environment variables.'
    );
  }

  const { data, error } = await resend.emails.send({
    from: config.email.resend.fromEmail,
    to,
    subject,
    html,
    text,
  });

  if (error) {
    logger.error('Failed to send email via Resend:', error);
    throw new Error(`Resend email sending failed: ${error.message}`);
  }

  logger.info('Email sent successfully via Resend:', {
    to,
    subject,
    id: data?.id,
  });

  return {
    success: true,
    messageId: data?.id,
    provider: 'resend',
  };
};

export default {
  sendEmailWithResend,
  createResendTemplates,
};
