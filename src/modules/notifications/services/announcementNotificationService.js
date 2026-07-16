import { User } from "../../users/models/User.js";
import { Enrollment } from "../../enrollments/models/Enrollment.js";
import { UserCohort } from "../../cohorts/models/UserCohort.js";
import { createNotificationsForUsers } from "./notificationService.js";
import { logger } from "../../../utils/logger.js";

export async function getAnnouncementRecipientIds(announcement) {
  const visibility = announcement.visibility || "PUBLIC";
  const target = announcement.targetAudience || {};
  const authorId = announcement.authorId?.toString?.() || announcement.authorId?.toString();

  if (visibility === "SPECIFIC_USERS" && target.userIds?.length) {
    return target.userIds
      .map((id) => id.toString())
      .filter((id) => id !== authorId);
  }

  if (visibility === "ENROLLED_USERS" && target.courseId) {
    const enrollments = await Enrollment.find({
      courseId: target.courseId,
      status: { $in: ["ACTIVE", "COMPLETED"] },
    }).select("userId");
    return enrollments
      .map((enrollment) => enrollment.userId.toString())
      .filter((id) => id !== authorId);
  }

  if (visibility === "ADMINS") {
    const admins = await User.find({ role: { $in: ["SUPER_ADMIN", "ADMIN"] }, status: "ACTIVE" }).select("_id");
    return admins
      .map((user) => user._id.toString())
      .filter((id) => id !== authorId);
  }

  if (visibility === "INSTRUCTORS") {
    const instructors = await User.find({
      role: { $in: ["SUPER_ADMIN", "ADMIN", "INSTRUCTOR"] },
      status: "ACTIVE",
    }).select("_id");
    return instructors
      .map((user) => user._id.toString())
      .filter((id) => id !== authorId);
  }

  const query = { status: "ACTIVE" };
  if (target.roles?.length) {
    query.role = { $in: target.roles };
  } else if (visibility === "PUBLIC") {
    query.role = { $in: ["PARTICIPANT", "INSTRUCTOR", "ADMIN", "SUPER_ADMIN"] };
  }

  if (target.cohortId) {
    const memberships = await UserCohort.find({
      cohortId: target.cohortId,
      status: "ACTIVE",
    }).select("userId");
    const cohortUserIds = new Set(
      memberships.map((membership) => membership.userId.toString())
    );
    const users = await User.find(query).select("_id role");
    return users
      .map((user) => user._id.toString())
      .filter((id) => cohortUserIds.has(id) && id !== authorId);
  }

  const users = await User.find(query).select("_id");
  return users
    .map((user) => user._id.toString())
    .filter((id) => id !== authorId);
}

export async function notifyAnnouncementPublished(announcement) {
  try {
    const recipientIds = await getAnnouncementRecipientIds(announcement);
    if (!recipientIds.length) return;

    const preview =
      String(announcement.content || "").trim().slice(0, 160) ||
      "A new announcement is available.";

    await createNotificationsForUsers(recipientIds, {
      type: "ANNOUNCEMENT",
      title: announcement.title,
      message: preview,
      link: "/dashboard/announcements",
      data: {
        announcementId: announcement._id?.toString() || announcement.id,
      },
      priority: announcement.priority || "MEDIUM",
    });
  } catch (error) {
    logger.error("Failed to send announcement notifications:", error);
  }
}
