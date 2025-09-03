// Vercel API function for bulk invite template
import { ExcelService } from '../../src/modules/users/services/excelService.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      ok: false, 
      error: { 
        code: 'METHOD_NOT_ALLOWED', 
        message: 'Only GET method is allowed' 
      } 
    });
  }

  try {
    // Generate template
    const templateBuffer = ExcelService.generateTemplate();

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="bulk_invite_template.xlsx"');
    res.setHeader('Content-Length', templateBuffer.length);

    // Send the file
    res.send(templateBuffer);

  } catch (error) {
    console.error('Template generation error:', error);
    res.status(500).json({
      ok: false,
      error: {
        code: 'TEMPLATE_GENERATION_ERROR',
        message: 'Failed to generate template'
      }
    });
  }
}
