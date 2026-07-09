import mongoose from "mongoose";
import { Notification } from "../models/Notification.js";
import { getIO } from "../../../socket/index.js";
import { logger } from "../../../utils/logger.js";

export const NOTIFICATION_TYPES = [
  "ANNOUNCEMENT",
  "ENROLLMENT",
  "COURSE_COMPLETION",
  "TASK_SUBMISSION",
  "TASK_REVIEWED",
  "ASSESSMENT_RESULT",
  "COHORT_MENTION",
  "ADMIN_MESSAGE",
  "SYSTEM",
];

export function userRoom(userId) {
  return `user:${userId.toString()}`;
}

export function serializeNotification(doc) {
  if (!doc) return null;
  const plain = doc.toObject ? doc.toObject({ virtuals: true }) : doc;
  return {
    id: plain._id?.toString() || plain.id,
    userId: plain.userId?.toString(),
    type: plain.type,
    title: plain.title,
    message: plain.message,
    link: plain.link || "",
    data: plain.data || {},
    priority: plain.priority || "MEDIUM",
    isRead: Boolean(plain.readAt),
    readAt: plain.readAt || null,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
  };
}

export async function getUnreadCount(userId) {
  return Notification.countDocuments({
    userId,
    readAt: null,
  });
}

async function emitUnreadCount(userId) {
  const io = getIO();
  if (!io) return;

  const unreadCount = await getUnreadCount(userId);
  io.to(userRoom(userId)).emit("notification:unread-count", { unreadCount });
}

export async function createNotification(payload) {
  const {
    userId,
    type,
    title,
    message,
    link = "",
    data = {},
    priority = "MEDIUM",
  } = payload;

  if (!userId || !type || !title || !message) {
    throw new Error("userId, type, title, and message are required");
  }

  const notification = await Notification.create({
    userId,
    type,
    title,
    message,
    link,
    data,
    priority,
    readAt: null,
  });

  const serialized = serializeNotification(notification);
  const io = getIO();
  if (io) {
    io.to(userRoom(userId)).emit("notification:new", { notification: serialized });
    await emitUnreadCount(userId);
  }

  return notification;
}

export async function createNotificationsForUsers(userIds, payload) {
  const uniqueIds = [
    ...new Set(
      (userIds || [])
        .filter(Boolean)
        .map((id) => id.toString())
    ),
  ];

  const results = [];
  for (const userId of uniqueIds) {
    try {
      const notification = await createNotification({ ...payload, userId });
      results.push(notification);
    } catch (error) {
      logger.error(`Failed to create notification for user ${userId}:`, error);
    }
  }
  return results;
}

export async function listForUser(userId, options = {}) {
  const { page = 1, limit = 20, unreadOnly = false } = options;
  const query = { userId };
  if (unreadOnly) {
    query.readAt = null;
  }

  const skip = (page - 1) * limit;
  const [notifications, total] = await Promise.all([
    Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Notification.countDocuments(query),
  ]);

  return {
    notifications: notifications.map(serializeNotification),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit) || 1,
    },
  };
}

export async function markRead(userId, notificationId) {
  if (!mongoose.isValidObjectId(notificationId)) {
    const err = new Error("Invalid notification id");
    err.code = "INVALID_ID";
    throw err;
  }

  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { $set: { readAt: new Date() } },
    { new: true }
  );

  if (!notification) {
    const err = new Error("Notification not found");
    err.code = "NOT_FOUND";
    throw err;
  }

  await emitUnreadCount(userId);
  return notification;
}

export async function markAllRead(userId) {
  const result = await Notification.updateMany(
    { userId, readAt: null },
    { $set: { readAt: new Date() } }
  );

  await emitUnreadCount(userId);
  return result.modifiedCount;
}

export async function notifyAdmins(payload) {
  const { User } = await import("../../users/models/User.js");
  const admins = await User.find({ role: "ADMIN", isActive: true }).select("_id");
  const adminIds = admins.map((admin) => admin._id);
  return createNotificationsForUsers(adminIds, payload);
}
