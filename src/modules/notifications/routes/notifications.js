import express from "express";
import { requireAuth } from "../../../middleware/auth.js";
import { asyncHandler } from "../../../middleware/error.js";
import {
  getNotifications,
  getNotificationUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "../controllers/notificationController.js";

const router = express.Router();

router.get("/", requireAuth, asyncHandler(getNotifications));
router.get("/unread-count", requireAuth, asyncHandler(getNotificationUnreadCount));
router.post("/mark-all-read", requireAuth, asyncHandler(markAllNotificationsRead));
router.post("/:id/read", requireAuth, asyncHandler(markNotificationRead));

export default router;
