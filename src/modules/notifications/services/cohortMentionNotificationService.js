import { UserCohort } from "../../cohorts/models/UserCohort.js";
import { Cohort } from "../../cohorts/models/Cohort.js";
import { parseMentions } from "../../cohort-chat/services/cohortMentionService.js";
import { createNotificationsForUsers } from "./notificationService.js";
import { logger } from "../../../utils/logger.js";

export async function getCohortMembersForMentions(cohortId) {
  const memberships = await UserCohort.find({
    cohortId,
    status: "ACTIVE",
  })
    .populate("userId", "name email")
    .select("userId");

  return memberships
    .map((membership) => membership.userId)
    .filter(Boolean)
    .map((user) => ({
      userId: user._id,
      name: user.name,
      email: user.email,
    }));
}

export async function notifyCohortMentions({
  cohortId,
  content,
  sender,
  messageId,
}) {
  try {
    const members = await getCohortMembersForMentions(cohortId);
    const mentionedUserIds = parseMentions(content, members, sender._id);
    if (!mentionedUserIds.length) return;

    const cohort = await Cohort.findById(cohortId).select("name");
    const preview = String(content || "").trim().slice(0, 160);

    await createNotificationsForUsers(mentionedUserIds, {
      type: "COHORT_MENTION",
      title: `${sender.name} mentioned you`,
      message: preview || `New mention in ${cohort?.name || "cohort chat"}`,
      link: "/dashboard/my-cohort",
      data: {
        cohortId: cohortId.toString(),
        messageId: messageId?.toString(),
        senderId: sender._id.toString(),
      },
      priority: "MEDIUM",
    });
  } catch (error) {
    logger.error("Failed to send cohort mention notifications:", error);
  }
}
