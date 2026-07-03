import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocked = vi.hoisted(() => ({
  Cohort: { findById: vi.fn() },
  Program: { findById: vi.fn() },
}));

vi.mock('../../modules/cohorts/models/Cohort.js', () => ({
  Cohort: mocked.Cohort,
}));

vi.mock('../../modules/programs/models/Program.js', () => ({
  default: mocked.Program,
}));

const {
  resolveInviteContext,
  resolveInviteContextFromAssignment,
  validateInviteAssignment,
} = await import('./inviteContext.js');

describe('validateInviteAssignment', () => {
  it('rejects admin invites with program or cohort', () => {
    expect(() =>
      validateInviteAssignment({ role: 'ADMIN', cohortId: 'abc', programId: null })
    ).toThrow(expect.objectContaining({ code: 'INVALID_ADMIN_INVITE' }));
  });

  it('requires program and cohort for participants', () => {
    expect(() =>
      validateInviteAssignment({ role: 'PARTICIPANT', cohortId: null, programId: null })
    ).toThrow(expect.objectContaining({ code: 'PROGRAM_REQUIRED' }));

    expect(() =>
      validateInviteAssignment({
        role: 'PARTICIPANT',
        cohortId: null,
        programId: '507f1f77bcf86cd799439012',
      })
    ).toThrow(expect.objectContaining({ code: 'COHORT_REQUIRED' }));

    expect(() =>
      validateInviteAssignment({
        role: 'PARTICIPANT',
        cohortId: '507f1f77bcf86cd799439011',
        programId: null,
      })
    ).toThrow(expect.objectContaining({ code: 'PROGRAM_REQUIRED' }));
  });

  it('allows participant invite with program and cohort', () => {
    expect(() =>
      validateInviteAssignment({
        role: 'PARTICIPANT',
        cohortId: '507f1f77bcf86cd799439011',
        programId: '507f1f77bcf86cd799439012',
      })
    ).not.toThrow();
  });

  it('requires program for instructors without cohort', () => {
    expect(() =>
      validateInviteAssignment({ role: 'INSTRUCTOR', cohortId: null, programId: null })
    ).toThrow(expect.objectContaining({ code: 'PROGRAM_REQUIRED' }));
  });

  it('allows instructor invite with program only', () => {
    expect(() =>
      validateInviteAssignment({
        role: 'INSTRUCTOR',
        cohortId: null,
        programId: '507f1f77bcf86cd799439011',
      })
    ).not.toThrow();
  });
});

describe('resolveInviteContext', () => {
  beforeEach(() => {
    mocked.Cohort.findById.mockReset();
    mocked.Program.findById.mockReset();
  });

  it('returns empty context for admin invites', async () => {
    const context = await resolveInviteContext({ role: 'ADMIN' });
    expect(context).toEqual({
      programName: null,
      cohortName: null,
      programId: null,
      cohortId: null,
    });
  });

  it('resolves program and cohort names for participants', async () => {
    const cohortId = '507f1f77bcf86cd799439011';
    const programId = '507f1f77bcf86cd799439012';

    mocked.Cohort.findById.mockResolvedValue({
      _id: cohortId,
      name: 'Cohort Alpha',
      programId,
    });
    mocked.Program.findById.mockResolvedValue({
      _id: programId,
      name: 'Leadership Program',
    });

    const context = await resolveInviteContext({
      role: 'PARTICIPANT',
      cohortId,
      programId,
    });

    expect(context).toEqual({
      programName: 'Leadership Program',
      cohortName: 'Cohort Alpha',
      programId,
      cohortId,
    });
  });

  it('rejects cohort that does not belong to the selected program', async () => {
    const cohortId = '507f1f77bcf86cd799439011';
    const programId = '507f1f77bcf86cd799439012';
    const otherProgramId = '507f1f77bcf86cd799439099';

    mocked.Cohort.findById.mockResolvedValue({
      _id: cohortId,
      name: 'Cohort Alpha',
      programId,
    });

    await expect(
      resolveInviteContext({
        role: 'PARTICIPANT',
        cohortId,
        programId: otherProgramId,
      })
    ).rejects.toMatchObject({ code: 'COHORT_PROGRAM_MISMATCH' });
  });

  it('resolves program-only context for instructors', async () => {
    const programId = '507f1f77bcf86cd799439012';

    mocked.Program.findById.mockResolvedValue({
      _id: programId,
      name: 'Leadership Program',
    });

    const context = await resolveInviteContext({
      role: 'INSTRUCTOR',
      programId,
    });

    expect(context).toEqual({
      programName: 'Leadership Program',
      cohortName: null,
      programId,
      cohortId: null,
    });
  });
});

describe('resolveInviteContextFromAssignment', () => {
  beforeEach(() => {
    mocked.Cohort.findById.mockReset();
    mocked.Program.findById.mockReset();
  });

  it('uses cohortAssignment when present', async () => {
    const cohortId = '507f1f77bcf86cd799439011';
    const programId = '507f1f77bcf86cd799439012';

    mocked.Cohort.findById.mockResolvedValue({
      _id: cohortId,
      name: 'Cohort Beta',
      programId,
    });
    mocked.Program.findById.mockResolvedValue({
      _id: programId,
      name: 'Purpose Discovery',
    });

    const context = await resolveInviteContextFromAssignment({
      role: 'PARTICIPANT',
      cohortAssignment: { cohortId, programId },
    });

    expect(context.programName).toBe('Purpose Discovery');
    expect(context.cohortName).toBe('Cohort Beta');
  });
});
