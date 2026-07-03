import mongoose from 'mongoose';

export async function resolveInviteContext({ role, cohortId, programId }) {
  const context = {
    programName: null,
    cohortName: null,
    programId: null,
    cohortId: null,
  };

  if (role === 'ADMIN') {
    return context;
  }

  const { Cohort } = await import('../../modules/cohorts/models/Cohort.js');
  const Program = (await import('../../modules/programs/models/Program.js')).default;

  let resolvedProgramId = programId || null;
  let cohort = null;

  if (cohortId) {
    if (!mongoose.Types.ObjectId.isValid(cohortId)) {
      const error = new Error('Invalid cohort ID');
      error.code = 'INVALID_COHORT_ID';
      throw error;
    }

    cohort = await Cohort.findById(cohortId);
    if (!cohort) {
      const error = new Error('Cohort not found');
      error.code = 'COHORT_NOT_FOUND';
      throw error;
    }

    context.cohortName = cohort.name;
    context.cohortId = cohort._id.toString();
    resolvedProgramId = cohort.programId?.toString() || resolvedProgramId;

    if (programId && cohort.programId) {
      const cohortProgramId = cohort.programId.toString();
      const requestedProgramId = programId.toString();
      if (cohortProgramId !== requestedProgramId) {
        const error = new Error('Selected cohort does not belong to the selected program');
        error.code = 'COHORT_PROGRAM_MISMATCH';
        throw error;
      }
    }
  }

  if (resolvedProgramId) {
    if (!mongoose.Types.ObjectId.isValid(resolvedProgramId)) {
      const error = new Error('Invalid program ID');
      error.code = 'INVALID_PROGRAM_ID';
      throw error;
    }

    const program = await Program.findById(resolvedProgramId);
    if (!program) {
      const error = new Error('Program not found');
      error.code = 'PROGRAM_NOT_FOUND';
      throw error;
    }

    context.programName = program.name;
    context.programId = program._id.toString();
  }

  return context;
}

export async function resolveInviteContextFromAssignment(user) {
  const assignment = user.cohortAssignment;
  if (!assignment) {
    return resolveInviteContext({ role: user.role });
  }

  return resolveInviteContext({
    role: user.role,
    cohortId: assignment.cohortId?.toString(),
    programId: assignment.programId?.toString(),
  });
}

export function validateInviteAssignment({ role, cohortId, programId }) {
  if (role === 'ADMIN') {
    if (cohortId || programId) {
      const error = new Error('Admin invites cannot include program or cohort assignment');
      error.code = 'INVALID_ADMIN_INVITE';
      throw error;
    }
    return;
  }

  if (role === 'PARTICIPANT') {
    if (!programId) {
      const error = new Error('Program is required when inviting a participant');
      error.code = 'PROGRAM_REQUIRED';
      throw error;
    }
    if (!cohortId) {
      const error = new Error('Cohort is required when inviting a participant');
      error.code = 'COHORT_REQUIRED';
      throw error;
    }
    return;
  }

  if (role === 'INSTRUCTOR') {
    if (!cohortId && !programId) {
      const error = new Error('Program is required when inviting an instructor');
      error.code = 'PROGRAM_REQUIRED';
      throw error;
    }
  }
}
