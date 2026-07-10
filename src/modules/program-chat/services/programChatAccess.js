import { Program } from "../../programs/models/Program.js";
import UserProgram from "../../programs/models/UserProgram.js";

function isProgramManager(user, program) {
  const userId = user._id?.toString();
  return (
    program.ownerId?.toString() === userId ||
    program.coordinatorId?.toString() === userId
  );
}

/**
 * Determines whether a user may access a program chat channel.
 * - ADMIN: all programs
 * - INSTRUCTOR: program owner or coordinator
 * - PARTICIPANT: active UserProgram enrollment only
 */
export async function canAccessProgramChat(user, programId) {
  if (!user || !programId) {
    return { allowed: false, reason: "Authentication required" };
  }

  const program = await Program.findById(programId).select(
    "_id ownerId coordinatorId status name"
  );
  if (!program) {
    return { allowed: false, reason: "Program not found" };
  }

  if (user.role === "ADMIN") {
    return { allowed: true, program };
  }

  if (user.role === "INSTRUCTOR") {
    if (isProgramManager(user, program)) {
      return { allowed: true, program };
    }
    return { allowed: false, reason: "You do not manage this program" };
  }

  if (user.role === "PARTICIPANT") {
    const enrollment = await UserProgram.findByUserAndProgram(
      user._id,
      programId
    );
    if (!enrollment) {
      return {
        allowed: false,
        reason: "You need a program invitation to join this interactive section",
      };
    }
    if (enrollment.status === "PENDING") {
      return {
        allowed: false,
        reason: "Your enrollment is pending approval",
      };
    }
    if (enrollment.status !== "ACTIVE") {
      return {
        allowed: false,
        reason: "You are not an active member of this program",
      };
    }
    return { allowed: true, program, enrollment };
  }

  return { allowed: false, reason: "Access denied" };
}

/**
 * Whether the user may delete a specific message.
 */
export function canDeleteProgramMessage(user, message, program) {
  if (!user || !message) return false;
  if (user.role === "ADMIN") return true;
  if (
    user.role === "INSTRUCTOR" &&
    program &&
    isProgramManager(user, program)
  ) {
    return true;
  }
  return message.authorId?.toString() === user._id?.toString();
}
