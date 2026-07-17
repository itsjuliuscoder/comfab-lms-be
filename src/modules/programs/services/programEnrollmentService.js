import UserProgram from "../models/UserProgram.js";
import { Program } from "../models/Program.js";
import { logger } from "../../../utils/logger.js";

/**
 * Enroll a user in a program (invite flow, admin assignment, etc.).
 * Reuses participant count logic from self-enroll when status is ACTIVE.
 */
export async function enrollUserInProgram(userId, programId, options = {}) {
  const {
    status = "ACTIVE",
    skipCapacityCheck = false,
    programRole = "PARTICIPANT",
  } = options;
  const shouldCountAsParticipant = programRole === "PARTICIPANT";

  const program = await Program.findById(programId);
  if (!program) {
    const err = new Error("Program not found");
    err.code = "NOT_FOUND";
    err.statusCode = 404;
    throw err;
  }

  let enrollment = await UserProgram.findByUserAndProgram(userId, programId);

  if (enrollment) {
    const previousStatus = enrollment.status;
    const previousProgramRole = enrollment.programRole || "PARTICIPANT";
    const previouslyCounted =
      previousStatus === "ACTIVE" && previousProgramRole === "PARTICIPANT";
    const shouldBeCounted =
      status === "ACTIVE" && programRole === "PARTICIPANT";
    let changed = false;

    if (enrollment.status !== status) {
      enrollment.status = status;
      changed = true;
    }
    if (previousProgramRole !== programRole) {
      enrollment.programRole = programRole;
      changed = true;
    }
    if (changed) {
      await enrollment.save();
    }
    if (!previouslyCounted && shouldBeCounted) {
      const added = program.addParticipant();
      if (!added && !skipCapacityCheck) {
        const err = new Error("Program has reached maximum capacity");
        err.code = "PROGRAM_FULL";
        err.statusCode = 400;
        throw err;
      }
      if (added) {
        await program.save();
      }
    } else if (previouslyCounted && !shouldBeCounted) {
      program.removeParticipant();
      await program.save();
    }

    return {
      enrollment,
      program,
      isNew: false,
      wasActivated: previousStatus !== "ACTIVE" && status === "ACTIVE",
      programRoleChanged: previousProgramRole !== programRole,
    };
  }

  if (status === "ACTIVE" && shouldCountAsParticipant && !skipCapacityCheck) {
    const added = program.addParticipant();
    if (!added) {
      const err = new Error("Program has reached maximum capacity");
      err.code = "PROGRAM_FULL";
      err.statusCode = 400;
      throw err;
    }
    await program.save();
  } else if (status === "ACTIVE" && shouldCountAsParticipant) {
    const added = program.addParticipant();
    if (added) {
      await program.save();
    }
  }

  enrollment = new UserProgram({
    userId,
    programId,
    enrolledAt: new Date(),
    status,
    programRole,
  });
  await enrollment.save();

  logger.info("User enrolled in program", {
    programId: programId.toString(),
    userId: userId.toString(),
    status,
    programRole,
  });

  return { enrollment, program, isNew: true };
}
