import XLSX from 'xlsx';
import { logger } from '../../../utils/logger.js';

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
      roleInCohort: this.parseCohortRole(rowData.roleInCohort || 'MEMBER')
    };
    
    // Validate role
    if (!['ADMIN', 'INSTRUCTOR', 'PARTICIPANT'].includes(userData.role)) {
      throw new Error('Invalid role. Must be ADMIN, INSTRUCTOR, or PARTICIPANT');
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
    const validRoles = ['ADMIN', 'INSTRUCTOR', 'PARTICIPANT'];
    
    if (validRoles.includes(roleStr)) {
      return roleStr;
    }
    
    // Handle common variations
    const roleMap = {
      'ADMINISTRATOR': 'ADMIN',
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
  static generateTemplate() {
    try {
      // Create workbook
      const workbook = XLSX.utils.book_new();
      
      // Sample data
      const sampleData = [
        {
          name: 'John Doe',
          email: 'john.doe@example.com',
          role: 'PARTICIPANT',
          roleInCohort: 'MEMBER'
        },
        {
          name: 'Jane Smith',
          email: 'jane.smith@example.com',
          role: 'INSTRUCTOR',
          roleInCohort: 'MENTOR'
        },
        {
          name: 'Bob Johnson',
          email: 'bob.johnson@example.com',
          role: 'PARTICIPANT',
          roleInCohort: 'LEADER'
        }
      ];
      
      // Create worksheet
      const worksheet = XLSX.utils.json_to_sheet(sampleData);
      
      // Add instructions as comments or additional sheet
      const instructions = [
        ['Instructions:'],
        ['1. Fill in the user details below'],
        ['2. Required fields: Name, Email'],
        ['3. Optional fields: Role, RoleInCohort'],
        ['4. Valid roles: ADMIN, INSTRUCTOR, PARTICIPANT'],
        ['5. Valid cohort roles: LEADER, MEMBER, MENTOR'],
        ['6. Remove sample data before uploading'],
        [''],
        ['Name', 'Email', 'Role', 'RoleInCohort']
      ];
      
      const instructionSheet = XLSX.utils.aoa_to_sheet(instructions);
      
      // Add sheets to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Users');
      XLSX.utils.book_append_sheet(workbook, instructionSheet, 'Instructions');
      
      // Generate buffer
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
