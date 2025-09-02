#!/usr/bin/env node

/**
 * Test script for Excel Bulk User Invite API
 * This script demonstrates how to use the Excel-based bulk invite functionality
 */

const API_BASE_URL = 'http://localhost:9092/api/v1';
const fs = require('fs');
const path = require('path');

async function loginAsAdmin() {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@theconfab.org',
        password: 'admin123'
      })
    });

    const data = await response.json();
    
    if (data.ok) {
      console.log('✅ Admin login successful');
      return data.data.accessToken;
    } else {
      console.error('❌ Admin login failed:', data.error);
      return null;
    }
  } catch (error) {
    console.error('❌ Login error:', error.message);
    return null;
  }
}

async function downloadTemplate() {
  try {
    console.log('📥 Downloading Excel template...');
    
    const response = await fetch(`${API_BASE_URL}/users/bulk-invite-template`, {
      method: 'GET'
    });

    if (response.ok) {
      const buffer = await response.arrayBuffer();
      const templatePath = path.join(__dirname, 'bulk_invite_template.xlsx');
      fs.writeFileSync(templatePath, Buffer.from(buffer));
      he
      console.log('✅ Template downloaded successfully:', templatePath);
      return templatePath;
    } else {
      const error = await response.json();
      console.error('❌ Template download failed:', error);
      return null;
    }
  } catch (error) {
    console.error('❌ Template download error:', error.message);
    return null;
  }
}

async function createTestExcelFile() {
  try {
    console.log('📝 Creating test Excel file...');
    
    // Create a simple test Excel file using the xlsx library
    const XLSX = require('xlsx');
    
    // Test data
    const testData = [
      {
        name: 'Alice Johnson',
        email: 'alice.johnson@example.com',
        role: 'PARTICIPANT',
        roleInCohort: 'MEMBER'
      },
      {
        name: 'Bob Smith',
        email: 'bob.smith@example.com',
        role: 'INSTRUCTOR',
        roleInCohort: 'MENTOR'
      },
      {
        name: 'Carol Davis',
        email: 'carol.davis@example.com',
        role: 'PARTICIPANT',
        roleInCohort: 'LEADER'
      },
      {
        name: 'David Wilson',
        email: 'david.wilson@example.com',
        role: 'PARTICIPANT'
      },
      {
        name: 'Invalid User',
        email: 'invalid-email',
        role: 'PARTICIPANT'
      }
    ];
    
    // Create workbook
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(testData);
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Users');
    
    // Write to file
    const testFilePath = path.join(__dirname, 'test_users.xlsx');
    XLSX.writeFile(workbook, testFilePath);
    
    console.log('✅ Test Excel file created:', testFilePath);
    return testFilePath;
    
  } catch (error) {
    console.error('❌ Error creating test Excel file:', error.message);
    return null;
  }
}

async function uploadExcelFile(accessToken, filePath) {
  try {
    console.log('📤 Uploading Excel file...');
    
    // Read file
    const fileBuffer = fs.readFileSync(filePath);
    
    // Create form data
    const formData = new FormData();
    formData.append('excelFile', new Blob([fileBuffer]), 'test_users.xlsx');
    formData.append('cohortId', '68b4b490f5fbc4ca3098cbde');
    formData.append('roleInCohort', 'MEMBER');
    formData.append('sendWelcomeEmail', 'true');
    
    const response = await fetch(`${API_BASE_URL}/users/bulk-invite-excel`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      body: formData
    });

    const data = await response.json();
    
    if (data.ok) {
      console.log('✅ Excel upload successful!');
      console.log('📊 Results:');
      console.log(`   Total rows: ${data.data.excelProcessing.totalRows}`);
      console.log(`   Valid rows: ${data.data.excelProcessing.validRows}`);
      console.log(`   Invalid rows: ${data.data.excelProcessing.invalidRows}`);
      console.log(`   Successful invites: ${data.data.summary.successful}`);
      console.log(`   Failed invites: ${data.data.summary.failed}`);
      console.log(`   Skipped invites: ${data.data.summary.skipped}`);
      
      if (data.data.results.successful.length > 0) {
        console.log('   ✅ Successful invites:');
        data.data.results.successful.forEach(user => {
          console.log(`      - ${user.name} (${user.email}) - ${user.role}`);
        });
      }
      
      if (data.data.results.skipped.length > 0) {
        console.log('   ⏭️ Skipped users:');
        data.data.results.skipped.forEach(user => {
          console.log(`      - ${user.name} (${user.email}) - ${user.reason}`);
        });
      }
      
      if (data.data.results.excelErrors.length > 0) {
        console.log('   ❌ Excel errors:');
        data.data.results.excelErrors.forEach(error => {
          console.log(`      - Row ${error.row}: ${error.error}`);
        });
      }
      
    } else {
      console.error('❌ Excel upload failed:', data.error);
    }
    
  } catch (error) {
    console.error('❌ Upload error:', error.message);
  }
}

async function testErrorCases(accessToken) {
  console.log('\n🧪 Testing Error Cases');
  
  // Test 1: No file uploaded
  console.log('\n1️⃣ Testing no file upload...');
  try {
    const response = await fetch(`${API_BASE_URL}/users/bulk-invite-excel`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        cohortId: '68b4b490f5fbc4ca3098cbde'
      })
    });
    
    const data = await response.json();
    console.log('Response:', data.error?.message || 'Unexpected response');
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  // Test 2: Invalid file type
  console.log('\n2️⃣ Testing invalid file type...');
  try {
    const formData = new FormData();
    formData.append('excelFile', new Blob(['test content']), 'test.txt');
    formData.append('cohortId', '68b4b490f5fbc4ca3098cbde');
    
    const response = await fetch(`${API_BASE_URL}/users/bulk-invite-excel`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      body: formData
    });
    
    const data = await response.json();
    console.log('Response:', data.error?.message || 'Unexpected response');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function main() {
  console.log('🚀 Starting Excel Bulk Invite API Tests\n');
  
  // Step 1: Download template (public endpoint)
  const templatePath = await downloadTemplate();
  if (!templatePath) {
    console.error('❌ Cannot proceed without template');
    process.exit(1);
  }
  
  // Step 2: Login as admin (needed for upload operations)
  const accessToken = await loginAsAdmin();
  if (!accessToken) {
    console.error('❌ Cannot proceed without admin access token');
    process.exit(1);
  }
  
  // Step 3: Create test Excel file
  const testFilePath = await createTestExcelFile();
  if (!testFilePath) {
    console.error('❌ Cannot proceed without test file');
    process.exit(1);
  }
  
  // Step 4: Upload Excel file
  await uploadExcelFile(accessToken, testFilePath);
  
  // Step 5: Test error cases
  await testErrorCases(accessToken);
  
  console.log('\n✨ Excel bulk invite tests completed!');
  console.log('\n📝 Note: Check the server logs for detailed information about email sending.');
  console.log('\n📁 Files created:');
  console.log(`   - Template: ${templatePath}`);
  console.log(`   - Test file: ${testFilePath}`);
}

// Run the tests
main().catch(console.error);
