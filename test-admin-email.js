import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:9092/api/v1';
const ADMIN_TOKEN = 'YOUR_ADMIN_JWT_TOKEN_HERE'; // Replace with your actual admin token

async function testAdminEmailAPI() {
  console.log('🧪 Testing Admin Email API...\n');

  try {
    // 1. Get current email provider
    console.log('1️⃣ Getting current email provider...');
    const providerResponse = await fetch(`${BASE_URL}/admin/email/provider`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (providerResponse.ok) {
      const providerData = await providerResponse.json();
      console.log('✅ Current provider:', providerData.data.provider);
    } else {
      console.log('❌ Failed to get provider:', providerResponse.status);
    }

    // 2. Switch to Nodemailer
    console.log('\n2️⃣ Switching to Nodemailer...');
    const switchResponse = await fetch(`${BASE_URL}/admin/email/provider`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ provider: 'nodemailer' })
    });

    if (switchResponse.ok) {
      const switchData = await switchResponse.json();
      console.log('✅ Switched to:', switchData.data.provider);
    } else {
      console.log('❌ Failed to switch provider:', switchResponse.status);
    }

    // 3. Test email sending
    console.log('\n3️⃣ Testing email sending...');
    const testResponse = await fetch(`${BASE_URL}/admin/email/test`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        email: 'thetechconfab@gmail.com',
        provider: 'nodemailer'
      })
    });

    if (testResponse.ok) {
      const testData = await testResponse.json();
      console.log('✅ Test email sent successfully!');
      console.log('📧 Message ID:', testData.data.messageId);
      console.log('🔧 Provider:', testData.data.provider);
    } else {
      console.log('❌ Failed to send test email:', testResponse.status);
      const errorData = await testResponse.json();
      console.log('Error details:', errorData);
    }

  } catch (error) {
    console.error('❌ API test failed:', error.message);
  }
}

// Instructions
console.log('📋 Instructions:');
console.log('1. Make sure your server is running on port 9092');
console.log('2. Replace ADMIN_TOKEN with your actual admin JWT token');
console.log('3. Run this script to test the admin email API\n');

// Run the test
testAdminEmailAPI();
