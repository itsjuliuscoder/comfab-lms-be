import { Resend } from 'resend';
import { config } from './env.js';
import { logger } from '../utils/logger.js';

// Check if Resend is configured
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

export const sendEmail = async ({ to, subject, html, text }) => {
  try {
    if (!resend) {
      throw new Error('Resend is not configured. Please set RESEND_API_KEY in your environment variables.');
    }

    const result = await resend.emails.send({
      from: config.email.resend.fromEmail,
      to,
      subject,
      html,
      text,
    });

    logger.info('Email sent successfully via Resend:', { to, subject, id: result.data?.id });
    return result;
  } catch (error) {
    logger.error('Failed to send email via Resend:', error);
    throw new Error(`Resend email sending failed: ${error.message}`);
  }
};

export const sendWelcomeEmail = async (user) => {
  const subject = `Welcome to ${config.app.name}!`;
  const html = `
    <h1>Welcome to ${config.app.name}!</h1>
    <p>Hi ${user.name},</p>
    <p>Welcome to your learning journey! We're excited to have you on board.</p>
    <p>You can now access your courses and start learning.</p>
    <p>Best regards,<br>The ${config.app.name} Team</p>
  `;

  return sendEmail({
    to: user.email,
    subject,
    html,
  });
};

export const sendPasswordResetEmail = async (user, resetToken) => {
  const resetUrl = `${config.app.clientUrl}/reset-password?token=${resetToken}`;
  const subject = 'Password Reset Request';
  const html = `
    <h1>Password Reset Request</h1>
    <p>Hi ${user.name},</p>
    <p>You requested a password reset for your ${config.app.name} account.</p>
    <p>Click the link below to reset your password:</p>
    <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px;">Reset Password</a>
    <p>If you didn't request this, please ignore this email.</p>
    <p>This link will expire in 1 hour.</p>
    <p>Best regards,<br>The ${config.app.name} Team</p>
  `;

  return sendEmail({
    to: user.email,
    subject,
    html,
  });
};

export const sendEnrollmentEmail = async (user, course) => {
  const subject = `You've been enrolled in ${course.title}`;
  const html = `
    <h1>Course Enrollment Confirmation</h1>
    <p>Hi ${user.name},</p>
    <p>You have been successfully enrolled in <strong>${course.title}</strong>.</p>
    <p>Course summary: ${course.summary}</p>
    <p>You can now access this course in your dashboard.</p>
    <p>Best regards,<br>The ${config.app.name} Team</p>
  `;

  return sendEmail({
    to: user.email,
    subject,
    html,
  });
};

export const sendInviteEmail = async (user, inviteToken, invitedBy) => {
  const inviteUrl = `${config.app.clientUrl}/complete-invite?token=${inviteToken}`;
  const subject = `You've been invited to join ${config.app.name}`;
  const html = `
    <h1>Welcome to ${config.app.name}!</h1>
    <p>Hi ${user.name},</p>
    <p>You have been invited by <strong>${invitedBy.name}</strong> to join ${config.app.name}.</p>
    <p>Your account has been created with the following details:</p>
    <ul>
      <li><strong>Email:</strong> ${user.email}</li>
      <li><strong>Role:</strong> ${user.role}</li>
    </ul>
    <p>To complete your account setup and set your password, click the link below:</p>
    <a href="${inviteUrl}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px;">Complete Account Setup</a>
    <p>This invitation link will expire in 7 days.</p>
    <p>If you have any questions, please contact support.</p>
    <p>Best regards,<br>The ${config.app.name} Team</p>
  `;

  return sendEmail({
    to: user.email,
    subject,
    html,
  });
};

// Export convenience functions for the unified email service
export const sendEmailWithResend = sendEmail;
export const createResendTemplates = {
  welcomeEmail: sendWelcomeEmail,
  passwordResetEmail: sendPasswordResetEmail,
  invitationEmail: sendInviteEmail,
  enrollmentEmail: sendEnrollmentEmail,
};
