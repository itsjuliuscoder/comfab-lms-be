import { describe, expect, it, vi } from 'vitest';

vi.mock('../env.js', () => ({
  config: {
    app: {
      name: 'CONFAB LMS',
      clientUrl: 'https://lms.theconfab.org',
    },
  },
}));

const { createEmailTemplates } = await import('./templates.js');

const sampleUser = {
  name: 'Jane Doe',
  email: 'jane@example.com',
  role: 'PARTICIPANT',
};

const sampleCourse = {
  title: 'Leadership 101',
  summary: 'Learn core leadership skills.',
  _id: 'course-1',
};

describe('createEmailTemplates', () => {
  const brandChecks = (template) => {
    expect(template.html).toContain('#6c5ce7');
    expect(template.html).toContain('https://lms.theconfab.org/confab-ft.png');
    expect(template.html).toContain('theconfab01@gmail.com');
    expect(template.html).toContain('<!DOCTYPE html>');
    expect(template.text).toBeTruthy();
    expect(template.subject).toBeTruthy();
  };

  it('welcomeEmail includes brand elements and dashboard link', () => {
    const template = createEmailTemplates.welcomeEmail(sampleUser);
    brandChecks(template);
    expect(template.html).toContain('Jane Doe');
    expect(template.html).toContain('https://lms.theconfab.org');
    expect(template.text).toContain('Go to Dashboard');
  });

  it('passwordResetEmail includes reset link and warning', () => {
    const template = createEmailTemplates.passwordResetEmail(sampleUser, 'reset-token-123');
    brandChecks(template);
    expect(template.html).toContain(
      'https://lms.theconfab.org/reset-password?token=reset-token-123'
    );
    expect(template.text).toContain('reset-token-123');
    expect(template.html).toContain('Reset Password');
  });

  it('invitationEmail includes invite link and inviter name', () => {
    const template = createEmailTemplates.invitationEmail(
      { ...sampleUser, role: 'ADMIN' },
      'invite-token-456',
      { name: 'Julius Olajumoke' }
    );
    brandChecks(template);
    expect(template.html).toContain('Julius Olajumoke');
    expect(template.html).toContain('CONFAB Learning Platform');
    expect(template.html).not.toContain('Purpose Discovery LMS');
    expect(template.html).toContain('Administrator');
    expect(template.html).toContain(
      'https://lms.theconfab.org/complete-invite?token=invite-token-456'
    );
    expect(template.html).toContain('Complete Account Setup');
    expect(template.html).toContain('7 days');
  });

  it('invitationEmail uses program and cohort copy for participants', () => {
    const template = createEmailTemplates.invitationEmail(
      { ...sampleUser, role: 'PARTICIPANT' },
      'invite-token-789',
      { name: 'Admin User' },
      { programName: 'Purpose Discovery', cohortName: 'Cohort 2026' }
    );
    brandChecks(template);
    expect(template.html).toContain('the CONFAB Team');
    expect(template.html).toContain('Purpose Discovery (Cohort 2026)');
    expect(template.html).toContain('CONFAB Learning Platform');
    expect(template.text).toContain('Purpose Discovery (Cohort 2026)');
  });

  it('invitationEmail uses program-only copy for instructors', () => {
    const template = createEmailTemplates.invitationEmail(
      { ...sampleUser, role: 'INSTRUCTOR' },
      'invite-token-101',
      { name: 'Admin User' },
      { programName: 'Leadership Track' }
    );
    brandChecks(template);
    expect(template.html).toContain('the CONFAB Team');
    expect(template.html).toContain('Leadership Track');
    expect(template.html).not.toContain('Leadership Track (');
    expect(template.text).toContain('Leadership Track on CONFAB Learning Platform');
  });

  it('enrollmentEmail uses accent button and course link', () => {
    const template = createEmailTemplates.enrollmentEmail(sampleUser, sampleCourse);
    brandChecks(template);
    expect(template.html).toContain('#22c55e');
    expect(template.html).toContain('Leadership 101');
    expect(template.html).toContain('https://lms.theconfab.org/courses/course-1');
    expect(template.text).toContain('Start Learning');
  });

  it('verificationEmail includes verify link', () => {
    const template = createEmailTemplates.verificationEmail(sampleUser, 'verify-token-789');
    brandChecks(template);
    expect(template.html).toContain(
      'https://lms.theconfab.org/verify-email?token=verify-token-789'
    );
    expect(template.text).toContain('24 hours');
  });

  it('passwordChangedEmail includes security warning', () => {
    const template = createEmailTemplates.passwordChangedEmail(sampleUser);
    brandChecks(template);
    expect(template.html).toContain('Password changed');
    expect(template.html).toContain('theconfab01@gmail.com');
    expect(template.text).toContain('contact support');
  });

  it('courseCompletionEmail includes certificate callout when issued', () => {
    const template = createEmailTemplates.courseCompletionEmail(sampleUser, sampleCourse, {
      certificateIssued: true,
    });
    brandChecks(template);
    expect(template.html).toContain('certificate');
    expect(template.html).toContain('View Course');
  });

  it('announcementEmail includes title and content', () => {
    const template = createEmailTemplates.announcementEmail(
      sampleUser,
      { title: 'Platform Update', content: '<p>New features available.</p>' },
      { name: 'Admin User' }
    );
    brandChecks(template);
    expect(template.html).toContain('Platform Update');
    expect(template.html).toContain('Admin User');
    expect(template.text).toContain('New features available');
  });

  it('customAdminEmail wraps subject and body in branded layout', () => {
    const template = createEmailTemplates.customAdminEmail({
      subject: 'Important update',
      body: 'Hello team,\nPlease review the latest module.',
    });

    brandChecks(template);
    expect(template.subject).toBe('Important update');
    expect(template.html).toContain('Important update');
    expect(template.html).toContain('Hello team,');
    expect(template.html).toContain('Please review the latest module.');
    expect(template.html).not.toContain('<script>');
    expect(template.text).toContain('Hello team,');
  });

  it('testEmail includes provider and timestamp', () => {
    const template = createEmailTemplates.testEmail('resend');
    brandChecks(template);
    expect(template.html).toContain('resend');
    expect(template.text).toContain('resend');
  });
});

describe('email layout helpers', () => {
  it('escapes HTML in user-provided content', async () => {
    const { escapeHtml } = await import('./layout.js');
    expect(escapeHtml('<script>alert("x")</script>')).not.toContain('<script>');
  });
});
