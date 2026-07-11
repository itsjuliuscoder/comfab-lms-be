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

const BATCH_SIZE = 100;

function validateBatchEmail(email, index) {
  if (!email?.from) {
    throw new Error(`Batch email at index ${index} is missing required field: from`);
  }
  if (!email?.to || (Array.isArray(email.to) && email.to.length === 0)) {
    throw new Error(`Batch email at index ${index} is missing required field: to`);
  }
  if (!email?.subject) {
    throw new Error(`Batch email at index ${index} is missing required field: subject`);
  }
  if (!email?.html && !email?.text) {
    throw new Error(`Batch email at index ${index} must include html or text`);
  }
}

function normalizeBatchResponseData(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  return null;
}

export const sendBatchWithResend = async (emails, { idempotencyPrefix } = {}) => {
  if (!resend) {
    throw new Error(
      'Resend is not configured. Please set RESEND_API_KEY in your environment variables.'
    );
  }

  if (!Array.isArray(emails) || emails.length === 0) {
    throw new Error('Batch emails array is required and cannot be empty');
  }

  emails.forEach((email, index) => validateBatchEmail(email, index));

  const chunks = [];
  for (let i = 0; i < emails.length; i += BATCH_SIZE) {
    chunks.push(emails.slice(i, i + BATCH_SIZE));
  }

  const results = [];
  let sent = 0;
  let failed = 0;

  for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex += 1) {
    const chunk = chunks[chunkIndex];
    const idempotencyKey = idempotencyPrefix
      ? `${idempotencyPrefix}/chunk-${chunkIndex}`
      : undefined;

    const requestOptions = idempotencyKey ? { idempotencyKey } : undefined;
    const { data, error } = await resend.batch.send(chunk, requestOptions);

    if (error) {
      logger.error(
        {
          resendError: error,
          message: error.message,
          statusCode: error.statusCode,
          chunkIndex,
          chunkSize: chunk.length,
        },
        'Failed to send batch emails via Resend'
      );
      throw new Error(`Resend batch email sending failed: ${error.message}`);
    }

    const normalizedData = normalizeBatchResponseData(data);

    if (!normalizedData) {
      logger.error(
        {
          responseData: data,
          chunkIndex,
          chunkSize: chunk.length,
        },
        'Unexpected Resend batch response shape'
      );
    }

    const responseItems = normalizedData || [];
    const chunkResults = chunk.map((email, itemIndex) => {
      const item = responseItems[itemIndex];
      const recipient = Array.isArray(chunk[itemIndex]?.to)
        ? chunk[itemIndex].to[0]
        : chunk[itemIndex]?.to;

      if (item?.id) {
        sent += 1;
        return {
          success: true,
          email: recipient,
          messageId: item.id,
          provider: 'resend',
        };
      }

      failed += 1;
      return {
        success: false,
        email: recipient,
        error: normalizedData
          ? 'No message id returned from Resend'
          : 'Unexpected Resend batch response shape',
        provider: 'resend',
      };
    });

    results.push(...chunkResults);
  }

  return {
    success: failed === 0,
    sent,
    failed,
    results,
    provider: 'resend',
  };
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
  sendBatchWithResend,
  createResendTemplates,
};
