#!/usr/bin/env node

/**
 * Test script for Bulk User Invite API
 * This script demonstrates how to use the bulk invite functionality
 */

const API_BASE_URL = 'http://localhost:9092/api/v1';

// Test data for bulk invite
const testBulkInviteData = {
  users: [
    {
      name: "Alice Johnson",
      email: "alice.johnson@example.com",
      role: "PARTICIPANT",
      roleInCohort: "MEMBER"
    },
    {
      name: "Bob Smith",
      email: "bob.smith@example.com",
      role: "INSTRUCTOR",
      roleInCohort: "MENTOR"
    },
    {
      name: "Carol Davis",
      email: "carol.davis@example.com",
      role: "PARTICIPANT",
      roleInCohort: "LEADER"
    },
    {
      name: "David Wilson",
      email: "david.wilson@example.com",
      role: "PARTICIPANT"
    }
  ],
  sendWelcomeEmail: true
};

// Test data with cohort assignment
const testBulkInviteWithCohort = {
  users: [
    {
      name: "Eve Brown",
      email: "eve.brown@example.com",
      role: "PARTICIPANT",
      roleInCohort: "MEMBER"
    },
    {
      name: "Frank Miller",
      email: "frank.miller@example.com",
      role: "PARTICIPANT",
      roleInCohort: "LEADER"
    }
  ],
  cohortId: "68b4b490f5fbc4ca3098cbde", // Replace with actual cohort ID
  roleInCohort: "MEMBER",
  sendWelcomeEmail: false
};

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

async function testBulkInvite(accessToken, testData, description) {
  try {
    console.log(`\n🧪 Testing: ${description}`);
    console.log('📤 Sending request...');
    
    const response = await fetch(`${API_BASE_URL}/users/bulk-invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(testData)
    });

    const data = await response.json();
    
    if (data.ok) {
      console.log('✅ Bulk invite successful!');
      console.log('📊 Results:');
      console.log(`   Total users: ${data.data.summary.total}`);
      console.log(`   Successful: ${data.data.summary.successful}`);
      console.log(`   Failed: ${data.data.summary.failed}`);
      console.log(`   Skipped: ${data.data.summary.skipped}`);
      
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
      
      if (data.data.results.failed.length > 0) {
        console.log('   ❌ Failed invites:');
        data.data.results.failed.forEach(user => {
          console.log(`      - ${user.name} (${user.email}) - ${user.reason}`);
        });
      }
    } else {
      console.error('❌ Bulk invite failed:', data.error);
    }
  } catch (error) {
    console.error('❌ Request error:', error.message);
  }
}

async function testErrorCases(accessToken) {
  console.log('\n🧪 Testing Error Cases');
  
  // Test 1: Invalid email format
  console.log('\n1️⃣ Testing invalid email format...');
  await testBulkInvite(accessToken, {
    users: [
      {
        name: "Invalid User",
        email: "invalid-email",
        role: "PARTICIPANT"
      }
    ]
  }, "Invalid email format");
  
  // Test 2: Empty users array
  console.log('\n2️⃣ Testing empty users array...');
  await testBulkInvite(accessToken, {
    users: []
  }, "Empty users array");
  
  // Test 3: Invalid cohort ID
  console.log('\n3️⃣ Testing invalid cohort ID...');
  await testBulkInvite(accessToken, {
    users: [
      {
        name: "Test User",
        email: "test@example.com",
        role: "PARTICIPANT"
      }
    ],
    cohortId: "invalid_cohort_id"
  }, "Invalid cohort ID");
}

async function main() {
  console.log('🚀 Starting Bulk Invite API Tests\n');
  
  // Step 1: Login as admin
  const accessToken = await loginAsAdmin();
  if (!accessToken) {
    console.error('❌ Cannot proceed without admin access token');
    process.exit(1);
  }
  
  // Step 2: Test basic bulk invite
  await testBulkInvite(accessToken, testBulkInviteData, "Basic bulk invite (4 users)");
  
  // Step 3: Test bulk invite with cohort assignment
  await testBulkInvite(accessToken, testBulkInviteWithCohort, "Bulk invite with cohort assignment");
  
  // Step 4: Test error cases
  await testErrorCases(accessToken);
  
  console.log('\n✨ Bulk invite tests completed!');
  console.log('\n📝 Note: Check the server logs for detailed information about email sending.');
}

// Run the tests
main().catch(console.error);
