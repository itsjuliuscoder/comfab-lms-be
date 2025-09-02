#!/usr/bin/env node

import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function createSampleExcelFile() {
  try {
    console.log('📝 Creating sample Excel file for bulk user invites...');
    
    // Sample user data
    const sampleUsers = [
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
      },
      {
        name: 'Alice Cooper',
        email: 'alice.cooper@example.com',
        role: 'PARTICIPANT',
        roleInCohort: 'MEMBER'
      },
      {
        name: 'Charlie Brown',
        email: 'charlie.brown@example.com',
        role: 'INSTRUCTOR',
        roleInCohort: 'MENTOR'
      }
    ];
    
    // Create workbook
    const workbook = XLSX.utils.book_new();
    
    // Create main users worksheet
    const usersWorksheet = XLSX.utils.json_to_sheet(sampleUsers);
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, usersWorksheet, 'Users');
    
    // Create instructions worksheet
    const instructions = [
      ['📋 CONFAB LMS - Bulk User Invite Template'],
      [''],
      ['📝 Instructions:'],
      ['1. Fill in the user details below'],
      ['2. Required fields: Name, Email'],
      ['3. Optional fields: Role, RoleInCohort'],
      ['4. Valid roles: ADMIN, INSTRUCTOR, PARTICIPANT'],
      ['5. Valid cohort roles: LEADER, MEMBER, MENTOR'],
      ['6. Remove sample data before uploading'],
      ['7. Save file as .xlsx format']
    ];
    
    const instructionsWorksheet = XLSX.utils.aoa_to_sheet(instructions);
    
    // Add instructions worksheet
    XLSX.utils.book_append_sheet(workbook, instructionsWorksheet, 'Instructions');
    
    // Write to file
    const filePath = path.join(__dirname, 'bulk_invite_sample.xlsx');
    XLSX.writeFile(workbook, filePath);
    
    console.log('✅ Sample Excel file created successfully!');
    console.log(`📁 File location: ${filePath}`);
    console.log('\n📊 File contains:');
    console.log('   - Users worksheet with 5 sample users');
    console.log('   - Instructions worksheet with usage guide');
    
    return filePath;
    
  } catch (error) {
    console.error('❌ Error creating Excel file:', error.message);
    return null;
  }
}

// Run the script
createSampleExcelFile();
