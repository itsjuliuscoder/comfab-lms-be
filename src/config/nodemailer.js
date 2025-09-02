import nodemailer from 'nodemailer';
import { config } from './env.js';
import { logger } from '../utils/logger.js';

// Create reusable transporter object using SMTP transport
const createTransporter = () => {
  const emailConfig = config.email;

  // If using Gmail
  if (emailConfig.provider === 'gmail') {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailConfig.nodemailer.user,
        pass: emailConfig.nodemailer.password, // Use app password for Gmail
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  // If using Outlook/Hotmail
  if (emailConfig.provider === 'outlook') {
    return nodemailer.createTransport({
      service: 'outlook',
      auth: {
        user: emailConfig.nodemailer.user,
        pass: emailConfig.nodemailer.password,
      },
    });
  }

  // If using Yahoo
  if (emailConfig.provider === 'yahoo') {
    return nodemailer.createTransport({
      service: 'yahoo',
      auth: {
        user: emailConfig.nodemailer.user,
        pass: emailConfig.nodemailer.password,
      },
    });
  }

  // If using custom SMTP server
  if (emailConfig.provider === 'smtp') {
    return nodemailer.createTransport({
      host: emailConfig.nodemailer.host,
      port: emailConfig.nodemailer.port,
      secure: emailConfig.nodemailer.secure, // true for 465, false for other ports
      auth: {
        user: emailConfig.nodemailer.user,
        pass: emailConfig.nodemailer.password,
      },
      tls: {
        rejectUnauthorized: emailConfig.nodemailer.rejectUnauthorized || false,
      },
    });
  }

  // Default to Gmail if no provider specified
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: emailConfig.nodemailer.user,
      pass: emailConfig.nodemailer.password,
    },
  });
};

// Verify transporter connection
export const verifyNodemailerConnection = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    logger.info('✅ Nodemailer connection verified successfully');
    return true;
  } catch (error) {
    logger.error('❌ Nodemailer connection failed:', error);
    return false;
  }
};

// Send email using Nodemailer
export const sendEmailWithNodemailer = async (emailOptions) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: config.email.nodemailer.from || config.email.nodemailer.user,
      to: emailOptions.to,
      subject: emailOptions.subject,
      html: emailOptions.html,
      text: emailOptions.text,
      attachments: emailOptions.attachments || [],
    };

    const info = await transporter.sendMail(mailOptions);
    
    logger.info('📧 Email sent successfully via Nodemailer:', {
      messageId: info.messageId,
      to: emailOptions.to,
      subject: emailOptions.subject,
    });

    return {
      success: true,
      messageId: info.messageId,
      provider: 'nodemailer',
    };
  } catch (error) {
    logger.error('❌ Failed to send email via Nodemailer:', error);
    throw new Error(`Nodemailer email sending failed: ${error.message}`);
  }
};

// Email templates for Nodemailer
export const createNodemailerTemplates = {
  // Welcome email template
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

  // Password reset email template
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

  // User invitation email template
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

  // Course enrollment email template
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
};

export default {
  createTransporter,
  verifyNodemailerConnection,
  sendEmailWithNodemailer,
  createNodemailerTemplates,
};
