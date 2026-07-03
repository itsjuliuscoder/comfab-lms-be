import { Resend } from 'resend';
import { config } from './env.js';
import { logger } from '../utils/logger.js';
import { createEmailTemplates } from './email/templates.js';

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

export const createResendTemplates = createEmailTemplates;

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
    logger.error(
      {
        resendError: error,
        message: error.message,
        statusCode: error.statusCode,
        to,
        from: config.email.resend.fromEmail,
      },
      'Failed to send email via Resend'
    );
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
