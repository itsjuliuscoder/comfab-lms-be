import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters'],
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email'],
  },
  password: {
    type: String,
    required: function() {
      // Password is required only if user is not invited (no inviteToken)
      return !this.inviteToken;
    },
    minlength: [8, 'Password must be at least 8 characters'],
    select: false, // Don't include password in queries by default
  },
  role: {
    type: String,
    enum: ['ADMIN', 'INSTRUCTOR', 'PARTICIPANT'],
    default: 'PARTICIPANT',
  },
  avatarUrl: {
    type: String,
    default: null,
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'SUSPENDED'],
    default: 'ACTIVE',
  },
  emailVerified: {
    type: Boolean,
    default: false,
  },
  lastLoginAt: {
    type: Date,
    default: null,
  },
  passwordResetToken: {
    type: String,
    default: null,
  },
  passwordResetExpires: {
    type: Date,
    default: null,
  },
  emailVerificationToken: {
    type: String,
    default: null,
  },
  emailVerificationExpires: {
    type: Date,
    default: null,
  },
  inviteToken: {
    type: String,
    default: null,
  },
  inviteTokenExpires: {
    type: Date,
    default: null,
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  cohortAssignment: {
    cohortId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cohort',
      default: null,
    },
    programId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Program',
      default: null,
    },
    roleInCohort: {
      type: String,
      enum: ['LEADER', 'MEMBER', 'MENTOR'],
      default: 'MEMBER',
    },
  },
  preferences: {
    emailNotifications: {
      type: Boolean,
      default: true,
    },
    pushNotifications: {
      type: Boolean,
      default: false,
    },
    language: {
      type: String,
      default: 'en',
    },
    timezone: {
      type: String,
      default: 'UTC',
    },
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return this.name;
});

// Index for better query performance
userSchema.index({ role: 1 });
userSchema.index({ status: 1 });
userSchema.index({ createdAt: -1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new) and exists
  if (!this.isModified('password') || !this.password) return next();

  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
  // If user doesn't have a password (invited user), return false
  if (!this.password) {
    return false;
  }
  return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method to get public profile (without sensitive data)
userSchema.methods.toPublicJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.passwordResetToken;
  delete userObject.passwordResetExpires;
  delete userObject.emailVerificationToken;
  delete userObject.emailVerificationExpires;
  userObject.invitePending = Boolean(userObject.inviteToken);
  userObject.inviteExpiresAt = userObject.inviteTokenExpires || null;
  delete userObject.inviteToken;
  delete userObject.inviteTokenExpires;
  return userObject;
};

// Static method to find by email
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Static method to find active users
userSchema.statics.findActive = function() {
  return this.find({ status: 'ACTIVE' });
};

// Static method to find by role
userSchema.statics.findByRole = function(role) {
  return this.find({ role, status: 'ACTIVE' });
};

// Static method to get instructors
userSchema.statics.findInstructors = function() {
  return this.findByRole('INSTRUCTOR');
};

// Static method to get participants
userSchema.statics.findParticipants = function() {
  return this.findByRole('PARTICIPANT');
};

// Static method to get admins
userSchema.statics.findAdmins = function() {
  return this.findByRole('ADMIN');
};

export const User = mongoose.model('User', userSchema);
