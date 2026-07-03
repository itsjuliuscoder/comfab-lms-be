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
import { createEmailTemplates } from './email/templates.js';

export const createNodemailerTemplates = createEmailTemplates;

export default {
  createTransporter,
  verifyNodemailerConnection,
  sendEmailWithNodemailer,
  createNodemailerTemplates,
};
