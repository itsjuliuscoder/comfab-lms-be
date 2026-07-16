import { UserCohort } from "../../cohorts/models/UserCohort.js";
import { Cohort } from "../../cohorts/models/Cohort.js";

/**
 * Determines whether a user may access a cohort chat channel.
 * - ADMIN: all cohorts
 * - INSTRUCTOR: all cohorts
 * - PARTICIPANT: active UserCohort membership only
 */
export async function canAccessCohortChat(user, cohortId) {
  if (!user || !cohortId) {
    return { allowed: false, reason: "Authentication required" };
  }

  const cohort = await Cohort.findById(cohortId).select("_id programId status");
  if (!cohort) {
    return { allowed: false, reason: "Cohort not found" };
  }

  if (["SUPER_ADMIN", "ADMIN"].includes(user.role) || user.role === "INSTRUCTOR") {
    return { allowed: true, cohort };
  }

  if (user.role === "PARTICIPANT") {
    const membership = await UserCohort.isUserInCohort(user._id, cohortId);
    if (!membership) {
      return { allowed: false, reason: "You are not a member of this cohort" };
    }
    return { allowed: true, cohort, membership };
  }

  return { allowed: false, reason: "Access denied" };
}

/**
 * Whether the user may delete a specific message.
 */
export function canDeleteCohortMessage(user, message) {
  if (!user || !message) return false;
  if (["SUPER_ADMIN", "ADMIN"].includes(user.role) || user.role === "INSTRUCTOR") return true;
  return message.authorId?.toString() === user._id?.toString();
}
