import mongoose from "mongoose";
import { Announcement } from "../../announcements/models/Announcement.js";
import {
  getUnreadCount,
  listForUser,
  markAllRead,
  markRead,
  serializeNotification,
} from "../services/notificationService.js";
import {
  successResponse,
  errorResponse,
  notFoundResponse,
} from "../../../utils/response.js";
import { getPaginationParams } from "../../../utils/pagination.js";
import { logger } from "../../../utils/logger.js";

export const getNotifications = async (req, res) => {
  try {
    const { page, limit } = getPaginationParams(req.query);
    const unreadOnly = req.query.unreadOnly === "true";

    const result = await listForUser(req.user._id, {
      page,
      limit,
      unreadOnly,
    });

    return successResponse(res, result, "Notifications retrieved successfully");
  } catch (error) {
    logger.error("Get notifications error:", error);
    return errorResponse(res, error);
  }
};

export const getNotificationUnreadCount = async (req, res) => {
  try {
    const unreadCount = await getUnreadCount(req.user._id);
    return successResponse(res, { unreadCount }, "Unread count retrieved");
  } catch (error) {
    logger.error("Get notification unread count error:", error);
    return errorResponse(res, error);
  }
};

export const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        ok: false,
        error: { code: "INVALID_ID", message: "Invalid notification id" },
      });
    }

    const notification = await markRead(req.user._id, id);
    if (!notification) {
      return notFoundResponse(res, "Notification");
    }

    if (
      notification.type === "ANNOUNCEMENT" &&
      notification.data?.announcementId
    ) {
      try {
        await Announcement.markAsRead(
          notification.data.announcementId,
          req.user._id
        );
      } catch (announcementError) {
        logger.warn("Failed to sync announcement read state:", announcementError);
      }
    }

    return successResponse(
      res,
      { notification: serializeNotification(notification) },
      "Notification marked as read"
    );
  } catch (error) {
    if (error.code === "NOT_FOUND") {
      return notFoundResponse(res, "Notification");
    }
    logger.error("Mark notification read error:", error);
    return errorResponse(res, error);
  }
};

export const markAllNotificationsRead = async (req, res) => {
  try {
    const modifiedCount = await markAllRead(req.user._id);
    return successResponse(
      res,
      { modifiedCount },
      "All notifications marked as read"
    );
  } catch (error) {
    logger.error("Mark all notifications read error:", error);
    return errorResponse(res, error);
  }
};
