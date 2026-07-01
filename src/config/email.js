import { config } from './env.js';
import { logger } from '../utils/logger.js';
import { sendEmailWithNodemailer, createNodemailerTemplates } from './nodemailer.js';

// Import Resend functions (assuming they exist in resend.js)
let sendEmailWithResend, createResendTemplates;

try {
  const resendModule = await import('./resend.js');
  sendEmailWithResend = resendModule.sendEmailWithResend;
  createResendTemplates = resendModule.createResendTemplates;
} catch (error) {
  logger.warn('Resend module not found, using Nodemailer only');
}

// Unified email service
export class EmailService {
  constructor() {
    this.provider = config.email.provider;
    this.logger = logger;
  }

  // Send email using the configured provider
  async sendEmail(emailOptions) {
    try {
      if (this.provider === 'nodemailer') {
        return await this.sendWithNodemailer(emailOptions);
      } else if (this.provider === 'resend') {
        return await this.sendWithResend(emailOptions);
      } else {
        throw new Error(`Unsupported email provider: ${this.provider}`);
      }
    } catch (error) {
      this.logger.error(`Failed to send email with ${this.provider}:`, error);
      throw error;
    }
  }

  // Send email using Nodemailer
  async sendWithNodemailer(emailOptions) {
    try {
      const result = await sendEmailWithNodemailer(emailOptions);
      this.logger.info(`📧 Email sent successfully via Nodemailer to ${emailOptions.to}`);
      return result;
    } catch (error) {
      this.logger.error('❌ Nodemailer email sending failed:', error);
      throw error;
    }
  }

  // Send email using Resend
  async sendWithResend(emailOptions) {
    try {
      if (!sendEmailWithResend) {
        throw new Error('Resend service not available');
      }
      const result = await sendEmailWithResend(emailOptions);
      this.logger.info(`📧 Email sent successfully via Resend to ${emailOptions.to}`);
      return result;
    } catch (error) {
      this.logger.error('❌ Resend email sending failed:', error);
      throw error;
    }
  }

  // Send welcome email
  async sendWelcomeEmail(user) {
    const emailOptions = this.provider === 'nodemailer' 
      ? createNodemailerTemplates.welcomeEmail(user)
      : createResendTemplates?.welcomeEmail(user);

    if (!emailOptions) {
      throw new Error('Email templates not available for current provider');
    }

    return await this.sendEmail({
      to: user.email,
      ...emailOptions,
    });
  }

  // Send password reset email
  async sendPasswordResetEmail(user, resetToken) {
    const emailOptions = this.provider === 'nodemailer'
      ? createNodemailerTemplates.passwordResetEmail(user, resetToken)
      : createResendTemplates?.passwordResetEmail(user, resetToken);

    if (!emailOptions) {
      throw new Error('Email templates not available for current provider');
    }

    return await this.sendEmail({
      to: user.email,
      ...emailOptions,
    });
  }

  // Send invitation email
  async sendInvitationEmail(user, inviteToken, invitedBy) {
    const emailOptions = this.provider === 'nodemailer'
      ? createNodemailerTemplates.invitationEmail(user, inviteToken, invitedBy)
      : createResendTemplates?.invitationEmail(user, inviteToken, invitedBy);

    if (!emailOptions) {
      throw new Error('Email templates not available for current provider');
    }

    return await this.sendEmail({
      to: user.email,
      ...emailOptions,
    });
  }

  // Send enrollment email
  async sendEnrollmentEmail(user, course) {
    const emailOptions = this.provider === 'nodemailer'
      ? createNodemailerTemplates.enrollmentEmail(user, course)
      : createResendTemplates?.enrollmentEmail(user, course);

    if (!emailOptions) {
      throw new Error('Email templates not available for current provider');
    }

    return await this.sendEmail({
      to: user.email,
      ...emailOptions,
    });
  }

  async sendVerificationEmail(user, verificationToken) {
    const emailOptions = this.provider === 'nodemailer'
      ? createNodemailerTemplates.verificationEmail(user, verificationToken)
      : createResendTemplates?.verificationEmail(user, verificationToken);

    if (!emailOptions) {
      throw new Error('Email templates not available for current provider');
    }

    return await this.sendEmail({
      to: user.email,
      ...emailOptions,
    });
  }

  async sendPasswordChangedEmail(user) {
    const emailOptions = this.provider === 'nodemailer'
      ? createNodemailerTemplates.passwordChangedEmail(user)
      : createResendTemplates?.passwordChangedEmail(user);

    if (!emailOptions) {
      throw new Error('Email templates not available for current provider');
    }

    return await this.sendEmail({
      to: user.email,
      ...emailOptions,
    });
  }

  async sendCourseCompletionEmail(user, course, options = {}) {
    const emailOptions = this.provider === 'nodemailer'
      ? createNodemailerTemplates.courseCompletionEmail(user, course, options)
      : createResendTemplates?.courseCompletionEmail(user, course, options);

    if (!emailOptions) {
      throw new Error('Email templates not available for current provider');
    }

    return await this.sendEmail({
      to: user.email,
      ...emailOptions,
    });
  }

  async sendAnnouncementEmail(user, announcement, author) {
    const emailOptions = this.provider === 'nodemailer'
      ? createNodemailerTemplates.announcementEmail(user, announcement, author)
      : createResendTemplates?.announcementEmail(user, announcement, author);

    if (!emailOptions) {
      throw new Error('Email templates not available for current provider');
    }

    return await this.sendEmail({
      to: user.email,
      ...emailOptions,
    });
  }

  // Send custom email
  async sendCustomEmail(to, subject, html, text, attachments = []) {
    return await this.sendEmail({
      to,
      subject,
      html,
      text,
      attachments,
    });
  }

  // Get current provider
  getCurrentProvider() {
    return this.provider;
  }

  // Switch provider (for testing or dynamic switching)
  setProvider(provider) {
    if (['resend', 'nodemailer'].includes(provider)) {
      this.provider = provider;
      this.logger.info(`Email provider switched to: ${provider}`);
    } else {
      throw new Error(`Unsupported email provider: ${provider}`);
    }
  }

  // Test email service
  async testEmailService(testEmail) {
    try {
      const result = await this.sendCustomEmail(
        testEmail,
        `Test Email from ${config.app.name}`,
        `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Test Email</h2>
            <p>This is a test email from ${config.app.name} using ${this.provider}.</p>
            <p>If you received this email, the email service is working correctly!</p>
            <p>Provider: ${this.provider}</p>
            <p>Timestamp: ${new Date().toISOString()}</p>
            <p>Best regards,<br>The ${config.app.name} Team</p>
          </div>
        `,
        `
          Test Email from ${config.app.name}
          
          This is a test email from ${config.app.name} using ${this.provider}.
          If you received this email, the email service is working correctly!
          
          Provider: ${this.provider}
          Timestamp: ${new Date().toISOString()}
          
          Best regards,
          The ${config.app.name} Team
        `
      );

      this.logger.info(`✅ Test email sent successfully via ${this.provider}`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Test email failed via ${this.provider}:`, error);
      throw error;
    }
  }
}

// Create singleton instance
export const emailService = new EmailService();

// Export convenience functions
export const sendEmail = (emailOptions) => emailService.sendEmail(emailOptions);
export const sendWelcomeEmail = (user) => emailService.sendWelcomeEmail(user);
export const sendPasswordResetEmail = (user, resetToken) => emailService.sendPasswordResetEmail(user, resetToken);
export const sendInvitationEmail = (user, inviteToken, invitedBy) => emailService.sendInvitationEmail(user, inviteToken, invitedBy);
export const sendEnrollmentEmail = (user, course) => emailService.sendEnrollmentEmail(user, course);
export const sendVerificationEmail = (user, verificationToken) => emailService.sendVerificationEmail(user, verificationToken);
export const sendPasswordChangedEmail = (user) => emailService.sendPasswordChangedEmail(user);
export const sendCourseCompletionEmail = (user, course, options) => emailService.sendCourseCompletionEmail(user, course, options);
export const sendAnnouncementEmail = (user, announcement, author) => emailService.sendAnnouncementEmail(user, announcement, author);
export const sendCustomEmail = (to, subject, html, text, attachments) => emailService.sendCustomEmail(to, subject, html, text, attachments);
export const testEmailService = (testEmail) => emailService.testEmailService(testEmail);
export const getCurrentProvider = () => emailService.getCurrentProvider();
export const setEmailProvider = (provider) => emailService.setProvider(provider);

export default emailService;
