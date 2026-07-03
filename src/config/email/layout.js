import { emailBrand as brand } from './brand.js';

export function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function stripHtmlForText(html) {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function renderButton(label, href, variant = 'primary') {
  const styles =
    variant === 'accent'
      ? `background-color:${brand.accent};color:#ffffff;`
      : variant === 'secondary'
        ? `background-color:#ffffff;color:${brand.primary};border:2px solid ${brand.primary};`
        : `background-color:${brand.primary};color:#ffffff;`;

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
      <tr>
        <td align="center" style="border-radius:8px;${styles}">
          <a href="${escapeHtml(href)}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:600;text-decoration:none;color:inherit;border-radius:8px;">
            ${escapeHtml(label)}
          </a>
        </td>
      </tr>
    </table>
  `.trim();
}

export function renderInfoCard(rows) {
  const rowsHtml = rows
    .map(
      ({ label, value }) => `
        <tr>
          <td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${brand.textMuted};width:100px;vertical-align:top;">
            ${escapeHtml(label)}
          </td>
          <td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${brand.textPrimary};font-weight:600;">
            ${value}
          </td>
        </tr>
      `
    )
    .join('');

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:20px 0;background-color:${brand.infoBg};border:1px solid ${brand.infoBorder};border-radius:8px;">
      <tr>
        <td style="padding:16px 20px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            ${rowsHtml}
          </table>
        </td>
      </tr>
    </table>
  `.trim();
}

export function renderAlert(message, type = 'info') {
  const styles = {
    info: { bg: brand.infoBg, border: brand.infoBorder, text: brand.textPrimary },
    warning: { bg: brand.warningBg, border: brand.warningBorder, text: brand.warningText },
    danger: { bg: brand.dangerBg, border: brand.dangerBorder, text: brand.dangerText },
    success: { bg: '#f0fdf4', border: '#bbf7d0', text: '#166534' },
  };
  const s = styles[type] || styles.info;

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:16px 0;">
      <tr>
        <td style="padding:12px 16px;background-color:${s.bg};border:1px solid ${s.border};border-radius:8px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:${s.text};">
          ${message}
        </td>
      </tr>
    </table>
  `.trim();
}

export function renderParagraph(text) {
  return `<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:${brand.textPrimary};">${text}</p>`;
}

export function renderEmailLayout({
  preheader = '',
  heading,
  bodyHtml = '',
  ctaHtml = '',
  footerNote = '',
}) {
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${escapeHtml(heading)}</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:${brand.background};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(preheader)}</div>` : ''}
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${brand.background};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="background-color:${brand.primary};border-radius:12px 12px 0 0;padding:24px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td width="48" style="vertical-align:middle;padding-right:12px;">
                    <img src="${brand.logoUrl}" alt="${escapeHtml(brand.appName)}" width="48" height="48" style="display:block;border-radius:50%;background-color:#ffffff;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <span style="font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">
                      ${escapeHtml(brand.appName)}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background-color:${brand.card};padding:32px;border-left:1px solid ${brand.border};border-right:1px solid ${brand.border};">
              <h1 style="margin:0 0 20px;font-family:Arial,Helvetica,sans-serif;font-size:24px;font-weight:700;line-height:1.3;color:${brand.textPrimary};">
                ${escapeHtml(heading)}
              </h1>
              ${bodyHtml}
              ${ctaHtml}
              ${footerNote ? `<div style="margin-top:8px;">${footerNote}</div>` : ''}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:${brand.card};border:1px solid ${brand.border};border-top:none;border-radius:0 0 12px 12px;padding:24px 32px;">
              <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:${brand.textMuted};text-align:center;">
                Need help? Contact us at
                <a href="mailto:${brand.supportEmail}" style="color:${brand.primary};text-decoration:none;">${brand.supportEmail}</a>
              </p>
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:${brand.textLight};text-align:center;">
                &copy; ${year} ${escapeHtml(brand.appName)}. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

export function buildPlainTextEmail({ heading, lines = [], ctaLabel, ctaUrl, footerNote = '' }) {
  const parts = [
    heading,
    '',
    ...lines,
  ];

  if (ctaLabel && ctaUrl) {
    parts.push('', `${ctaLabel}:`, ctaUrl);
  }

  if (footerNote) {
    parts.push('', footerNote);
  }

  parts.push(
    '',
    '---',
    `Need help? Contact us at ${brand.supportEmail}`,
    `© ${new Date().getFullYear()} ${brand.appName}`
  );

  return parts.join('\n');
}
