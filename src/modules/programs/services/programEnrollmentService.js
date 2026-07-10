import UserProgram from "../models/UserProgram.js";
import { Program } from "../models/Program.js";
import { logger } from "../../../utils/logger.js";

/**
 * Enroll a user in a program (invite flow, admin assignment, etc.).
 * Reuses participant count logic from self-enroll when status is ACTIVE.
 */
export async function enrollUserInProgram(userId, programId, options = {}) {
  const { status = "ACTIVE", skipCapacityCheck = false } = options;

  const program = await Program.findById(programId);
  if (!program) {
    const err = new Error("Program not found");
    err.code = "NOT_FOUND";
    err.statusCode = 404;
    throw err;
  }

  let enrollment = await UserProgram.findByUserAndProgram(userId, programId);

  if (enrollment) {
    if (enrollment.status !== status) {
      enrollment.status = status;
      await enrollment.save();
    }
    return { enrollment, program, isNew: false };
  }

  if (status === "ACTIVE" && !skipCapacityCheck) {
    const added = program.addParticipant();
    if (!added) {
      const err = new Error("Program has reached maximum capacity");
      err.code = "PROGRAM_FULL";
      err.statusCode = 400;
      throw err;
    }
    await program.save();
  } else if (status === "ACTIVE") {
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
  });
  await enrollment.save();

  logger.info("User enrolled in program", {
    programId: programId.toString(),
    userId: userId.toString(),
    status,
  });

  return { enrollment, program, isNew: true };
}
