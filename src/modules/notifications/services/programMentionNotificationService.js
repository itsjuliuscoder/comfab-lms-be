import UserProgram from "../../programs/models/UserProgram.js";
import { Program } from "../../programs/models/Program.js";
import { parseMentions } from "../../cohort-chat/services/cohortMentionService.js";
import { createNotificationsForUsers } from "./notificationService.js";
import { logger } from "../../../utils/logger.js";

export async function getProgramMembersForMentions(programId) {
  const memberships = await UserProgram.find({
    programId,
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

export async function notifyProgramMentions({
  programId,
  content,
  sender,
  messageId,
}) {
  try {
    const members = await getProgramMembersForMentions(programId);
    const mentionedUserIds = parseMentions(content, members, sender._id);
    if (!mentionedUserIds.length) return;

    const program = await Program.findById(programId).select("name");
    const preview = String(content || "").trim().slice(0, 160);

    await createNotificationsForUsers(mentionedUserIds, {
      type: "PROGRAM_MENTION",
      title: `${sender.name} mentioned you`,
      message:
        preview ||
        `New mention in ${program?.name || "program interactive section"}`,
      link: `/dashboard/programs/${programId}/community`,
      data: {
        programId: programId.toString(),
        messageId: messageId?.toString(),
        senderId: sender._id.toString(),
      },
      priority: "MEDIUM",
    });
  } catch (error) {
    logger.error("Failed to send program mention notifications:", error);
  }
}
