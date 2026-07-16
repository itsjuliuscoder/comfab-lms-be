import { emailBrand as brand } from './brand.js';
import {
  escapeHtml,
  renderEmailLayout,
  renderButton,
  renderInfoCard,
  renderAlert,
  renderParagraph,
  buildPlainTextEmail,
} from './layout.js';

function buildProgramAccessLabel(programName, cohortName) {
  if (!programName) return brand.platformName;
  if (cohortName) {
    return `${programName} (${cohortName})`;
  }
  return programName;
}

function buildInvitationCopy(user, invitedBy, inviteContext = {}) {
  const { programName = null, cohortName = null } = inviteContext;
  const role = user.role;

  if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
    const bodyLine = `You have been invited by <strong>${escapeHtml(invitedBy.name)}</strong> to join the <strong>${escapeHtml(brand.platformName)}</strong> as an Administrator.`;
    return {
      subject: `You've been invited to administer ${brand.platformName}`,
      preheader: `${invitedBy.name} invited you to administer ${brand.platformName}.`,
      heading: "You're invited!",
      bodyLine,
      plainBodyLine: `You have been invited by ${invitedBy.name} to join the ${brand.platformName} as an Administrator.`,
      infoRows: [
        { label: 'Email', value: escapeHtml(user.email) },
        { label: 'Role', value: escapeHtml(user.role) },
      ],
      plainInfoLines: [`- Email: ${user.email}`, `- Role: ${user.role}`],
    };
  }

  const accessLabel = buildProgramAccessLabel(programName, cohortName);
  const bodyLine = cohortName || programName
    ? `You have been invited by <strong>${escapeHtml(brand.teamName)}</strong> to join <strong>${escapeHtml(accessLabel)}</strong> on ${escapeHtml(brand.platformName)}.`
    : `You have been invited by <strong>${escapeHtml(brand.teamName)}</strong> to join ${escapeHtml(brand.platformName)}.`;

  const plainAccessLabel = cohortName || programName
    ? `${accessLabel} on ${brand.platformName}`
    : brand.platformName;

  const infoRows = [
    ...(programName ? [{ label: 'Program', value: escapeHtml(programName) }] : []),
    ...(cohortName ? [{ label: 'Cohort', value: escapeHtml(cohortName) }] : []),
    { label: 'Email', value: escapeHtml(user.email) },
    { label: 'Role', value: escapeHtml(user.role) },
  ];

  const plainInfoLines = [
    ...(programName ? [`- Program: ${programName}`] : []),
    ...(cohortName ? [`- Cohort: ${cohortName}`] : []),
    `- Email: ${user.email}`,
    `- Role: ${user.role}`,
  ];

  const subjectProgram = programName || brand.platformName;

  return {
    subject: `You've been invited to join ${subjectProgram}`,
    preheader: `${brand.teamName} invited you to join ${plainAccessLabel}.`,
    heading: "You're invited!",
    bodyLine,
    plainBodyLine: `You have been invited by ${brand.teamName} to join ${plainAccessLabel}.`,
    infoRows,
    plainInfoLines,
  };
}

export const createEmailTemplates = {
  welcomeEmail: (user) => {
    const dashboardUrl = brand.clientUrl;
    const bodyHtml = [
      renderParagraph(`Hello ${escapeHtml(user.name)},`),
      renderParagraph(`Thank you for joining ${escapeHtml(brand.appName)}. We're excited to have you on board!`),
      renderInfoCard([
        { label: 'Name', value: escapeHtml(user.name) },
        { label: 'Email', value: escapeHtml(user.email) },
        { label: 'Role', value: escapeHtml(user.role) },
      ]),
      renderParagraph('You can now log in to your account and start exploring our courses.'),
    ].join('');

    const ctaHtml = renderButton('Go to Dashboard', dashboardUrl);

    return {
      subject: `Welcome to ${brand.appName}!`,
      html: renderEmailLayout({
        preheader: `Welcome to ${brand.appName} — your account is ready.`,
        heading: 'Welcome aboard!',
        bodyHtml,
        ctaHtml,
      }),
      text: buildPlainTextEmail({
        heading: `Welcome to ${brand.appName}!`,
        lines: [
          `Hello ${user.name},`,
          '',
          `Thank you for joining ${brand.appName}. We're excited to have you on board!`,
          '',
          'Your account details:',
          `- Name: ${user.name}`,
          `- Email: ${user.email}`,
          `- Role: ${user.role}`,
          '',
          'You can now log in to your account and start exploring our courses.',
        ],
        ctaLabel: 'Go to Dashboard',
        ctaUrl: dashboardUrl,
      }),
    };
  },

  passwordResetEmail: (user, resetToken) => {
    const resetUrl = `${brand.clientUrl}/reset-password?token=${resetToken}`;
    const bodyHtml = [
      renderParagraph(`Hello ${escapeHtml(user.name)},`),
      renderParagraph(`We received a request to reset the password for your ${escapeHtml(brand.appName)} account.`),
      renderParagraph('Click the button below to choose a new password:'),
    ].join('');

    const ctaHtml = renderButton('Reset Password', resetUrl);
    const footerNote = renderAlert(
      'If you did not request a password reset, you can safely ignore this email. This link will expire in 1 hour.',
      'warning'
    );

    return {
      subject: `Password Reset Request - ${brand.appName}`,
      html: renderEmailLayout({
        preheader: 'Reset your CONFAB LMS password.',
        heading: 'Reset your password',
        bodyHtml,
        ctaHtml,
        footerNote,
      }),
      text: buildPlainTextEmail({
        heading: `Password Reset Request - ${brand.appName}`,
        lines: [
          `Hello ${user.name},`,
          '',
          `We received a request to reset the password for your ${brand.appName} account.`,
          '',
          'If you did not request this, you can safely ignore this email.',
          'This link will expire in 1 hour.',
        ],
        ctaLabel: 'Reset Password',
        ctaUrl: resetUrl,
      }),
    };
  },

  invitationEmail: (user, inviteToken, invitedBy, inviteContext = {}) => {
    const inviteUrl = `${brand.clientUrl}/complete-invite?token=${inviteToken}`;
    const copy = buildInvitationCopy(user, invitedBy, inviteContext);

    const bodyHtml = [
      renderParagraph(`Hi ${escapeHtml(user.name)},`),
      renderParagraph(copy.bodyLine),
      renderInfoCard(copy.infoRows),
      renderParagraph('Complete your account setup and set your password to get started:'),
    ].join('');

    const ctaHtml = renderButton('Complete Account Setup', inviteUrl);
    const footerNote = renderAlert(
      'This invitation link will expire in 7 days. If you have any questions, please contact support.',
      'warning'
    );

    return {
      subject: copy.subject,
      html: renderEmailLayout({
        preheader: copy.preheader,
        heading: copy.heading,
        bodyHtml,
        ctaHtml,
        footerNote,
      }),
      text: buildPlainTextEmail({
        heading: copy.subject,
        lines: [
          `Hi ${user.name},`,
          '',
          copy.plainBodyLine,
          '',
          'Your account details:',
          ...copy.plainInfoLines,
          '',
          'Complete your account setup and set your password to get started.',
          '',
          'This invitation link will expire in 7 days.',
        ],
        ctaLabel: 'Complete Account Setup',
        ctaUrl: inviteUrl,
      }),
    };
  },

  enrollmentEmail: (user, course) => {
    const courseUrl = `${brand.clientUrl}/courses/${course._id}`;
    const bodyHtml = [
      renderParagraph(`Hello ${escapeHtml(user.name)},`),
      renderParagraph(
        `Congratulations! You've successfully enrolled in <strong>${escapeHtml(course.title)}</strong>.`
      ),
      course.summary
        ? renderInfoCard([{ label: 'Summary', value: escapeHtml(course.summary) }])
        : '',
      renderParagraph('You can now access your course and start learning!'),
    ].join('');

    const ctaHtml = renderButton('Start Learning', courseUrl, 'accent');

    return {
      subject: `Welcome to ${course.title} - ${brand.appName}`,
      html: renderEmailLayout({
        preheader: `You're enrolled in ${course.title}.`,
        heading: `Welcome to ${escapeHtml(course.title)}!`,
        bodyHtml,
        ctaHtml,
      }),
      text: buildPlainTextEmail({
        heading: `Welcome to ${course.title} - ${brand.appName}`,
        lines: [
          `Hello ${user.name},`,
          '',
          `Congratulations! You've successfully enrolled in ${course.title}.`,
          course.summary ? `\nCourse Summary:\n${course.summary}` : '',
          '',
          'You can now access your course and start learning!',
        ],
        ctaLabel: 'Start Learning',
        ctaUrl: courseUrl,
      }),
    };
  },

  verificationEmail: (user, verificationToken) => {
    const verifyUrl = `${brand.clientUrl}/verify-email?token=${verificationToken}`;
    const bodyHtml = [
      renderParagraph(`Hello ${escapeHtml(user.name)},`),
      renderParagraph(
        `Please confirm your email address to complete your ${escapeHtml(brand.appName)} account setup.`
      ),
    ].join('');

    const ctaHtml = renderButton('Verify Email', verifyUrl);
    const footerNote = renderAlert(
      "If you didn't create an account, you can ignore this email. This link will expire in 24 hours.",
      'info'
    );

    return {
      subject: `Verify your email - ${brand.appName}`,
      html: renderEmailLayout({
        preheader: 'Confirm your email address for CONFAB LMS.',
        heading: 'Verify your email',
        bodyHtml,
        ctaHtml,
        footerNote,
      }),
      text: buildPlainTextEmail({
        heading: `Verify your email - ${brand.appName}`,
        lines: [
          `Hello ${user.name},`,
          '',
          `Please confirm your email address to complete your ${brand.appName} account setup.`,
          '',
          "If you didn't create an account, you can ignore this email.",
          'This link will expire in 24 hours.',
        ],
        ctaLabel: 'Verify Email',
        ctaUrl: verifyUrl,
      }),
    };
  },

  passwordChangedEmail: (user) => {
    const bodyHtml = [
      renderParagraph(`Hello ${escapeHtml(user.name)},`),
      renderParagraph(`Your ${escapeHtml(brand.appName)} account password was changed successfully.`),
    ].join('');

    const footerNote = renderAlert(
      `If you did not make this change, please contact support immediately at ${brand.supportEmail}.`,
      'danger'
    );

    return {
      subject: `Your password was changed - ${brand.appName}`,
      html: renderEmailLayout({
        preheader: 'Your CONFAB LMS password was changed.',
        heading: 'Password changed',
        bodyHtml,
        footerNote,
      }),
      text: buildPlainTextEmail({
        heading: `Your password was changed - ${brand.appName}`,
        lines: [
          `Hello ${user.name},`,
          '',
          `Your ${brand.appName} account password was changed successfully.`,
          '',
          `If you did not make this change, please contact support immediately at ${brand.supportEmail}.`,
        ],
      }),
    };
  },

  courseCompletionEmail: (user, course, { certificateIssued = false } = {}) => {
    const courseUrl = `${brand.clientUrl}/courses/${course._id}`;
    const bodyHtml = [
      renderParagraph(`Hello ${escapeHtml(user.name)},`),
      renderParagraph(
        `Congratulations on completing <strong>${escapeHtml(course.title)}</strong>!`
      ),
      certificateIssued
        ? renderAlert('Your certificate has been issued and is available in your account.', 'success')
        : '',
    ].join('');

    const ctaHtml = renderButton('View Course', courseUrl);

    return {
      subject: `Congratulations! You completed ${course.title} - ${brand.appName}`,
      html: renderEmailLayout({
        preheader: `You completed ${course.title}!`,
        heading: 'Course completed!',
        bodyHtml,
        ctaHtml,
      }),
      text: buildPlainTextEmail({
        heading: `Congratulations! You completed ${course.title} - ${brand.appName}`,
        lines: [
          `Hello ${user.name},`,
          '',
          `Congratulations on completing ${course.title}!`,
          certificateIssued
            ? '\nYour certificate has been issued and is available in your account.'
            : '',
        ],
        ctaLabel: 'View Course',
        ctaUrl: courseUrl,
      }),
    };
  },

  announcementEmail: (user, announcement, author) => {
    const announcementsUrl = `${brand.clientUrl}/announcements`;
    const authorLine = author?.name
      ? `A new announcement has been posted by <strong>${escapeHtml(author.name)}</strong>:`
      : 'A new announcement has been posted:';

    const bodyHtml = [
      renderParagraph(`Hello ${escapeHtml(user.name)},`),
      renderParagraph(authorLine),
      `
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:20px 0;">
          <tr>
            <td style="padding:16px 20px;background-color:${brand.background};border:1px solid ${brand.border};border-radius:8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:${brand.textPrimary};">
              ${announcement.content}
            </td>
          </tr>
        </table>
      `.trim(),
    ].join('');

    const ctaHtml = renderButton('View Announcements', announcementsUrl);

    return {
      subject: `${announcement.title} - ${brand.appName}`,
      html: renderEmailLayout({
        preheader: announcement.title,
        heading: escapeHtml(announcement.title),
        bodyHtml,
        ctaHtml,
      }),
      text: buildPlainTextEmail({
        heading: `${announcement.title} - ${brand.appName}`,
        lines: [
          `Hello ${user.name},`,
          '',
          author?.name
            ? `A new announcement has been posted by ${author.name}:`
            : 'A new announcement has been posted:',
          '',
          stripAnnouncementContent(announcement.content),
        ],
        ctaLabel: 'View Announcements',
        ctaUrl: announcementsUrl,
      }),
    };
  },

  customAdminEmail: ({ subject, body }) => {
    const bodyLines = String(body || '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const bodyHtml = bodyLines.length
      ? bodyLines.map((line) => renderParagraph(escapeHtml(line))).join('')
      : renderParagraph('');

    const plainLines = String(body || '')
      .split(/\r?\n/)
      .map((line) => line.trimEnd());

    return {
      subject,
      html: renderEmailLayout({
        preheader: subject,
        heading: subject,
        bodyHtml,
      }),
      text: buildPlainTextEmail({
        heading: subject,
        lines: plainLines,
      }),
    };
  },

  testEmail: (provider) => {
    const bodyHtml = [
      renderParagraph(`This is a test email from ${escapeHtml(brand.appName)}.`),
      renderParagraph('If you received this email, the email service is working correctly!'),
      renderInfoCard([
        { label: 'Provider', value: escapeHtml(provider) },
        { label: 'Timestamp', value: new Date().toISOString() },
      ]),
    ].join('');

    return {
      subject: `Test Email from ${brand.appName}`,
      html: renderEmailLayout({
        preheader: 'CONFAB LMS email service test.',
        heading: 'Email service test',
        bodyHtml,
      }),
      text: buildPlainTextEmail({
        heading: `Test Email from ${brand.appName}`,
        lines: [
          `This is a test email from ${brand.appName}.`,
          'If you received this email, the email service is working correctly!',
          '',
          `Provider: ${provider}`,
          `Timestamp: ${new Date().toISOString()}`,
        ],
      }),
    };
  },
};

function stripAnnouncementContent(html) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

export default createEmailTemplates;
