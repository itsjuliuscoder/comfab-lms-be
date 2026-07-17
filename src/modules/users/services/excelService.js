import XLSX from 'xlsx';
import { logger } from '../../../utils/logger.js';

const BASE_ROLE_OPTIONS = ['ADMIN', 'INSTRUCTOR', 'PARTICIPANT'];
const SUPER_ADMIN_ROLE_OPTIONS = ['SUPER_ADMIN', ...BASE_ROLE_OPTIONS];
const COHORT_ROLE_OPTIONS = ['LEADER', 'MEMBER', 'MENTOR'];
const USER_TEMPLATE_HEADERS = ['name', 'email', 'role', 'programCode', 'cohortName', 'roleInCohort'];

const buildRoleOptions = ({ includeSuperAdmin = false } = {}) =>
  includeSuperAdmin ? SUPER_ADMIN_ROLE_OPTIONS : BASE_ROLE_OPTIONS;

const applyTemplateFormatting = (worksheet, rowCount) => {
  worksheet['!cols'] = [
    { wch: 28 },
    { wch: 34 },
    { wch: 18 },
    { wch: 18 },
    { wch: 26 },
    { wch: 18 },
  ];
  worksheet['!autofilter'] = { ref: `A1:F${rowCount}` };
  worksheet['!freeze'] = { xSplit: 0, ySplit: 1 };

  USER_TEMPLATE_HEADERS.forEach((_, index) => {
    const cell = worksheet[XLSX.utils.encode_cell({ r: 0, c: index })];
    if (cell) {
      cell.s = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '174C35' } },
        alignment: { horizontal: 'center' },
      };
    }
  });
};

const addDataValidationHints = (worksheet, roleOptions) => {
  // SheetJS CE preserves the worksheet data and ignores unsupported writer metadata.
  // Keeping this metadata here documents the intended Excel validations for compatible readers.
  worksheet['!dataValidations'] = [
    {
      sqref: 'C2:C1001',
      type: 'list',
      formula1: `"${roleOptions.join(',')}"`,
      allowBlank: true,
    },
    {
      sqref: 'F2:F1001',
      type: 'list',
      formula1: `"${COHORT_ROLE_OPTIONS.join(',')}"`,
      allowBlank: true,
    },
  ];
};

/**
 * Excel Service for processing bulk user invite files
 */
class ExcelService {
  /**
   * Process Excel file and extract user data
   * @param {Buffer} fileBuffer - Excel file buffer
   * @returns {Object} Processed data with users array and validation results
   */
  static processExcelFile(fileBuffer) {
    try {
      // Read the Excel file
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      
      // Get the first sheet
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1,
        defval: '',
        blankrows: false 
      });
      
      if (jsonData.length < 2) {
        throw new Error('Excel file must have at least a header row and one data row');
      }
      
      // Extract headers (first row)
      const headers = jsonData[0].map(header => 
        header ? header.toString().trim().toLowerCase() : ''
      );
      
      // Validate required headers
      const requiredHeaders = ['name', 'email'];
      const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
      
      if (missingHeaders.length > 0) {
        throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`);
      }
      
      // Process data rows (skip header row)
      const users = [];
      const errors = [];
      
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        const rowNumber = i + 1; // Excel row number (1-based)
        
        try {
          const userData = this.processRow(row, headers, rowNumber);
          if (userData) {
            users.push(userData);
          }
        } catch (error) {
          errors.push({
            row: rowNumber,
            error: error.message,
            data: row
          });
        }
      }
      
      return {
        users,
        errors,
        totalRows: jsonData.length - 1, // Exclude header
        validRows: users.length,
        invalidRows: errors.length
      };
      
    } catch (error) {
      logger.error('Excel file processing error:', error);
      throw new Error(`Failed to process Excel file: ${error.message}`);
    }
  }
  
  /**
   * Process a single row from the Excel file
   * @param {Array} row - Row data
   * @param {Array} headers - Column headers
   * @param {number} rowNumber - Row number for error reporting
   * @returns {Object|null} Processed user data or null if invalid
   */
  static processRow(row, headers, rowNumber) {
    // Create object from row data
    const rowData = {};
    headers.forEach((header, index) => {
      rowData[header] = row[index] || '';
    });
    
    // Validate required fields
    const { name, email } = rowData;
    
    if (!name || !name.toString().trim()) {
      throw new Error('Name is required');
    }
    
    if (!email || !email.toString().trim()) {
      throw new Error('Email is required');
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.toString().trim())) {
      throw new Error('Invalid email format');
    }
    
    // Process user data
    const userData = {
      name: name.toString().trim(),
      email: email.toString().trim().toLowerCase(),
      role: this.parseRole(rowData.role || 'PARTICIPANT'),
      programCode: rowData.programcode ? rowData.programcode.toString().trim().toUpperCase() : '',
      cohortName: rowData.cohortname ? rowData.cohortname.toString().trim() : '',
      roleInCohort: this.parseCohortRole(rowData.roleincohort || rowData.roleInCohort || 'MEMBER')
    };
    
    // Validate role
    if (!['SUPER_ADMIN', 'ADMIN', 'INSTRUCTOR', 'PARTICIPANT'].includes(userData.role)) {
      throw new Error('Invalid role. Must be SUPER_ADMIN, ADMIN, INSTRUCTOR, or PARTICIPANT');
    }
    
    // Validate cohort role
    if (!['LEADER', 'MEMBER', 'MENTOR'].includes(userData.roleInCohort)) {
      throw new Error('Invalid cohort role. Must be LEADER, MEMBER, or MENTOR');
    }
    
    return userData;
  }
  
  /**
   * Parse and validate role
   * @param {string} role - Role string
   * @returns {string} Validated role
   */
  static parseRole(role) {
    const roleStr = role.toString().trim().toUpperCase();
    const validRoles = ['SUPER_ADMIN', 'ADMIN', 'INSTRUCTOR', 'PARTICIPANT'];
    
    if (validRoles.includes(roleStr)) {
      return roleStr;
    }
    
    // Handle common variations
    const roleMap = {
      'ADMINISTRATOR': 'ADMIN',
      'SUPER ADMIN': 'SUPER_ADMIN',
      'SUPERADMIN': 'SUPER_ADMIN',
      'TEACHER': 'INSTRUCTOR',
      'FACILITATOR': 'INSTRUCTOR',
      'STUDENT': 'PARTICIPANT',
      'LEARNER': 'PARTICIPANT',
      'USER': 'PARTICIPANT'
    };
    
    return roleMap[roleStr] || 'PARTICIPANT';
  }
  
  /**
   * Parse and validate cohort role
   * @param {string} cohortRole - Cohort role string
   * @returns {string} Validated cohort role
   */
  static parseCohortRole(cohortRole) {
    const roleStr = cohortRole.toString().trim().toUpperCase();
    const validRoles = ['LEADER', 'MEMBER', 'MENTOR'];
    
    if (validRoles.includes(roleStr)) {
      return roleStr;
    }
    
    // Handle common variations
    const roleMap = {
      'COORDINATOR': 'LEADER',
      'FACILITATOR': 'MENTOR',
      'ADVISOR': 'MENTOR',
      'PARTICIPANT': 'MEMBER',
      'STUDENT': 'MEMBER'
    };
    
    return roleMap[roleStr] || 'MEMBER';
  }
  
  /**
   * Generate Excel template for bulk user invites
   * @returns {Buffer} Excel file buffer
   */
  static createTemplateWorkbook(options = {}) {
    const roleOptions = buildRoleOptions(options);
    const programs = Array.isArray(options.programs) ? options.programs : [];
    const platformAdminLabel = roleOptions.includes('SUPER_ADMIN')
      ? 'ADMIN and SUPER_ADMIN rows'
      : 'ADMIN rows';
    const workbook = XLSX.utils.book_new();

    const usersRows = [
      USER_TEMPLATE_HEADERS,
      ['Ada Participant', 'ada.participant@example.com', 'PARTICIPANT', programs[0]?.code || '', 'Cohort 1', 'MEMBER'],
      ['Tunde Instructor', 'tunde.instructor@example.com', 'INSTRUCTOR', programs[0]?.code || '', '', 'MENTOR'],
      ['Platform Admin', 'admin@example.com', 'ADMIN', '', '', 'MEMBER'],
    ];

    if (roleOptions.includes('SUPER_ADMIN')) {
      usersRows.push(['Root Admin', 'super.admin@example.com', 'SUPER_ADMIN', '', '', 'MEMBER']);
    }

    const usersSheet = XLSX.utils.aoa_to_sheet(usersRows);
    applyTemplateFormatting(usersSheet, usersRows.length);
    addDataValidationHints(usersSheet, roleOptions);

    const instructions = [
      ['Bulk User Invite Template'],
      [''],
      ['How to use this file'],
      ['1. Fill user records in the Users sheet.'],
      ['2. Required columns: name, email.'],
      ['3. Optional columns: role, programCode, cohortName, roleInCohort. Blank role defaults to PARTICIPANT. Blank roleInCohort defaults to MEMBER.'],
      ['4. Copy programCode values from the Programs sheet.'],
      ['5. Program and Cohort selected in the LMS bulk upload modal are fallback values when programCode or cohortName are blank.'],
      ['6. PARTICIPANT rows require a resolved Program and Cohort. INSTRUCTOR rows require a resolved Program; Cohort is optional.'],
      [`7. ${platformAdminLabel} ignore Program and Cohort.`],
      ['8. Remove or replace the sample rows before uploading.'],
      ['9. Maximum upload size is 1000 users per file.'],
      [''],
      ['Allowed roles for your account'],
      [roleOptions.join(', ')],
      [''],
      ['Allowed cohort roles'],
      [COHORT_ROLE_OPTIONS.join(', ')],
      [''],
      ['Column reference'],
      ['name', 'Required. Full name of the user.'],
      ['email', 'Required. Valid email address.'],
      ['role', `Optional. One of: ${roleOptions.join(', ')}.`],
      ['programCode', 'Optional. Copy from the Programs sheet. Overrides the modal-selected Program for that row.'],
      ['cohortName', 'Optional. Cohort name within the row program. Overrides the modal-selected Cohort for that row.'],
      ['roleInCohort', `Optional. One of: ${COHORT_ROLE_OPTIONS.join(', ')}.`],
    ];

    const instructionSheet = XLSX.utils.aoa_to_sheet(instructions);
    instructionSheet['!cols'] = [{ wch: 26 }, { wch: 92 }];

    const programRows = [
      ['programCode', 'programName'],
      ...programs.map((program) => [program.code, program.name]),
    ];
    const programsSheet = XLSX.utils.aoa_to_sheet(programRows);
    programsSheet['!cols'] = [{ wch: 22 }, { wch: 42 }];
    programsSheet['!autofilter'] = { ref: `A1:B${Math.max(1, programRows.length)}` };

    XLSX.utils.book_append_sheet(workbook, usersSheet, 'Users');
    XLSX.utils.book_append_sheet(workbook, programsSheet, 'Programs');
    XLSX.utils.book_append_sheet(workbook, instructionSheet, 'Instructions');

    return workbook;
  }

  static generateTemplate(options = {}) {
    try {
      const workbook = this.createTemplateWorkbook(options);
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      return buffer;
    } catch (error) {
      logger.error('Template generation error:', error);
      throw new Error('Failed to generate Excel template');
    }
  }
  
  /**
   * Validate Excel file format
   * @param {Object} file - Uploaded file object
   * @returns {boolean} True if valid
   */
  static validateFile(file) {
    if (!file) {
      throw new Error('No file uploaded');
    }
    
    if (!file.buffer) {
      throw new Error('File buffer is missing');
    }
    
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'application/octet-stream' // Generic binary
    ];
    
    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error('Invalid file type. Please upload an Excel file (.xlsx or .xls)');
    }
    
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new Error('File size too large. Maximum size is 5MB');
    }
    
    return true;
  }
}

export default ExcelService;
