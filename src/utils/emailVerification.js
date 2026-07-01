import crypto from 'crypto';
import { sendVerificationEmail } from '../config/email.js';
import { logger } from './logger.js';

const VERIFICATION_EXPIRY_MS = 24 * 60 * 60 * 1000;

export async function issueEmailVerificationToken(user) {
  const verificationToken = crypto.randomBytes(32).toString('hex');
  user.emailVerificationToken = verificationToken;
  user.emailVerificationExpires = new Date(Date.now() + VERIFICATION_EXPIRY_MS);
  await user.save();
  return verificationToken;
}

export async function sendUserVerificationEmail(user) {
  const verificationToken = await issueEmailVerificationToken(user);

  try {
    await sendVerificationEmail(user, verificationToken);
  } catch (error) {
    logger.error('Failed to send verification email:', error);
    throw error;
  }
}
