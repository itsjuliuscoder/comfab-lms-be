import mongoose from 'mongoose';

const failedRecipientSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    error: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const adminEmailLogSchema = new mongoose.Schema(
  {
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    bodyPreview: {
      type: String,
      required: true,
      maxlength: 200,
    },
    recipientCount: {
      type: Number,
      required: true,
      min: 0,
    },
    sentCount: {
      type: Number,
      required: true,
      min: 0,
    },
    failedCount: {
      type: Number,
      required: true,
      min: 0,
    },
    recipients: [{
      type: String,
      lowercase: true,
      trim: true,
    }],
    failedRecipients: [failedRecipientSchema],
    provider: {
      type: String,
      enum: ['resend', 'nodemailer'],
      required: true,
    },
    idempotencyPrefix: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

adminEmailLogSchema.index({ createdAt: -1 });

export const AdminEmailLog = mongoose.model('AdminEmailLog', adminEmailLogSchema);

export default AdminEmailLog;
