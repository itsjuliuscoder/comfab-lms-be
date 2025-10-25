#!/usr/bin/env node

/**
 * Test script for Program Management API
 * This script demonstrates the Program API functionality
 */

const API_BASE_URL = "http://localhost:9092/api/v1";

async function loginAsAdmin() {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "admin@theconfab.org",
        password: "admin123",
      }),
    });

    const data = await response.json();

    if (data.ok) {
      console.log("✅ Admin login successful");
      return data.data.accessToken;
    } else {
      console.error("❌ Admin login failed:", data.error);
      return null;
    }
  } catch (error) {
    console.error("❌ Login error:", error.message);
    return null;
  }
}

async function testCreateProgram(accessToken) {
  try {
    console.log("📝 Creating Purpose Discovery Program...");

    const programData = {
      name: "Purpose Discovery Program",
      description:
        "A comprehensive program to help individuals discover their life purpose through guided exercises and mentorship",
      code: "PDP-2024",
      startDate: "2024-01-15T00:00:00.000Z",
      endDate: "2024-12-15T00:00:00.000Z",
      duration: 48,
      maxParticipants: 100,
      coordinatorId: "68b4b490f5fbc4ca3098cbd9", // You'll need to get a real coordinator ID
      tags: ["purpose", "discovery", "life-coaching"],
      objectives: [
        "Help participants identify their core values",
        "Guide them through life purpose discovery",
        "Provide mentorship and support",
      ],
      requirements: [
        "Commitment to 6-month program",
        "Weekly group sessions attendance",
        "Completion of self-reflection exercises",
      ],
      isPublic: true,
      enrollmentOpen: true,
      enrollmentEndDate: "2024-03-15T00:00:00.000Z",
      cost: {
        amount: 500,
        currency: "USD",
        isFree: false,
      },
      location: {
        type: "ONLINE",
        city: "Remote",
        country: "Global",
      },
      settings: {
        allowSelfEnrollment: true,
        requireApproval: false,
        maxCoursesPerUser: 5,
        allowCohortCreation: true,
        maxCohorts: 10,
      },
    };

    const response = await fetch(`${API_BASE_URL}/programs`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(programData),
    });

    const data = await response.json();

    if (data.ok) {
      console.log("✅ Program created successfully!");
      console.log(`   Program ID: ${data.data._id}`);
      console.log(`   Program Name: ${data.data.name}`);
      console.log(`   Program Code: ${data.data.code}`);
      return data.data._id;
    } else {
      console.error("❌ Program creation failed:", data.error);
      return null;
    }
  } catch (error) {
    console.error("❌ Create program error:", error.message);
    return null;
  }
}

async function testGetAllPrograms(accessToken) {
  try {
    console.log("📋 Getting all programs...");

    const response = await fetch(`${API_BASE_URL}/programs`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = await response.json();

    if (data.ok) {
      console.log("✅ Programs retrieved successfully!");
      console.log(`   Total programs: ${data.data.programs.length}`);
      data.data.programs.forEach((program) => {
        console.log(
          `   - ${program.name} (${program.code}) - ${program.status}`
        );
      });
      return data.data.programs;
    } else {
      console.error("❌ Get programs failed:", data.error);
      return null;
    }
  } catch (error) {
    console.error("❌ Get programs error:", error.message);
    return null;
  }
}

async function testGetProgramById(accessToken, programId) {
  try {
    console.log(`🔍 Getting program by ID: ${programId}...`);

    const response = await fetch(`${API_BASE_URL}/programs/${programId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = await response.json();

    if (data.ok) {
      console.log("✅ Program retrieved successfully!");
      console.log(`   Name: ${data.data.name}`);
      console.log(`   Description: ${data.data.description}`);
      console.log(`   Status: ${data.data.status}`);
      console.log(`   Enrollment Status: ${data.data.enrollmentStatus}`);
      console.log(`   Progress: ${data.data.progress}%`);
      console.log(
        `   Capacity: ${data.data.currentParticipants}/${data.data.maxParticipants}`
      );
      return data.data;
    } else {
      console.error("❌ Get program failed:", data.error);
      return null;
    }
  } catch (error) {
    console.error("❌ Get program error:", error.message);
    return null;
  }
}

async function testUpdateProgram(accessToken, programId) {
  try {
    console.log(`✏️ Updating program: ${programId}...`);

    const updateData = {
      name: "Purpose Discovery Program - Updated",
      description:
        "An enhanced comprehensive program to help individuals discover their life purpose",
      maxParticipants: 150,
      status: "ACTIVE",
      enrollmentOpen: true,
    };

    const response = await fetch(`${API_BASE_URL}/programs/${programId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updateData),
    });

    const data = await response.json();

    if (data.ok) {
      console.log("✅ Program updated successfully!");
      console.log(`   Updated Name: ${data.data.name}`);
      console.log(`   Max Participants: ${data.data.maxParticipants}`);
      return data.data;
    } else {
      console.error("❌ Update program failed:", data.error);
      return null;
    }
  } catch (error) {
    console.error("❌ Update program error:", error.message);
    return null;
  }
}

async function testGetProgramStatistics(accessToken, programId) {
  try {
    console.log(`📊 Getting program statistics: ${programId}...`);

    const response = await fetch(
      `${API_BASE_URL}/programs/${programId}/statistics`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const data = await response.json();

    if (data.ok) {
      console.log("✅ Program statistics retrieved successfully!");
      console.log(
        `   Program: ${data.data.program.name} (${data.data.program.status})`
      );
      console.log(
        `   Participants: ${data.data.program.currentParticipants}/${data.data.program.maxParticipants}`
      );
      console.log(`   Capacity: ${data.data.program.capacityPercentage}%`);
      console.log(
        `   Enrollment Status: ${data.data.program.enrollmentStatus}`
      );
      console.log(`   Progress: ${data.data.program.progress}%`);

      if (data.data.courses) {
        console.log("   Courses:", data.data.courses);
      }
      if (data.data.cohorts) {
        console.log("   Cohorts:", data.data.cohorts);
      }
      if (data.data.enrollments) {
        console.log("   Enrollments:", data.data.enrollments);
      }

      return data.data;
    } else {
      console.error("❌ Get program statistics failed:", data.error);
      return null;
    }
  } catch (error) {
    console.error("❌ Get program statistics error:", error.message);
    return null;
  }
}

async function testEnrollInProgram(accessToken, programId) {
  try {
    console.log(`🎯 Enrolling in program: ${programId}...`);

    const response = await fetch(
      `${API_BASE_URL}/programs/${programId}/enroll`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const data = await response.json();

    if (data.ok) {
      console.log("✅ Successfully enrolled in program!");
      console.log(`   Enrollment ID: ${data.data.enrollment._id}`);
      console.log(`   Enrolled At: ${data.data.enrollment.enrolledAt}`);
      console.log(`   Status: ${data.data.enrollment.status}`);
      console.log(
        `   Program Participants: ${data.data.program.currentParticipants}`
      );
      return data.data;
    } else {
      console.error("❌ Enrollment failed:", data.error);
      return null;
    }
  } catch (error) {
    console.error("❌ Enrollment error:", error.message);
    return null;
  }
}

async function testErrorCases(accessToken) {
  console.log("\n🧪 Testing Error Cases");

  // Test 1: Get non-existent program
  console.log("\n1️⃣ Testing non-existent program...");
  try {
    const response = await fetch(
      `${API_BASE_URL}/programs/68b4b490f5fbc4ca3098cb99`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const data = await response.json();
    console.log("Response:", data.error?.message || "Unexpected response");
  } catch (error) {
    console.error("Error:", error.message);
  }

  // Test 2: Create program with invalid data
  console.log("\n2️⃣ Testing invalid program data...");
  try {
    const response = await fetch(`${API_BASE_URL}/programs`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Invalid Program",
        // Missing required fields
      }),
    });

    const data = await response.json();
    console.log("Response:", data.error?.message || "Unexpected response");
  } catch (error) {
    console.error("Error:", error.message);
  }

  // Test 3: Try to enroll in non-existent program
  console.log("\n3️⃣ Testing enrollment in non-existent program...");
  try {
    const response = await fetch(
      `${API_BASE_URL}/programs/68b4b490f5fbc4ca3098cb99/enroll`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const data = await response.json();
    console.log("Response:", data.error?.message || "Unexpected response");
  } catch (error) {
    console.error("Error:", error.message);
  }
}

async function main() {
  console.log("🚀 Starting Program Management API Tests\n");

  // Step 1: Login as admin
  const accessToken = await loginAsAdmin();
  if (!accessToken) {
    console.error("❌ Cannot proceed without admin access token");
    process.exit(1);
  }

  // Step 2: Create a program
  const programId = await testCreateProgram(accessToken);
  if (!programId) {
    console.error("❌ Cannot proceed without program ID");
    process.exit(1);
  }

  // Step 3: Get all programs
  await testGetAllPrograms(accessToken);

  // Step 4: Get program by ID
  await testGetProgramById(accessToken, programId);

  // Step 5: Update program
  await testUpdateProgram(accessToken, programId);

  // Step 6: Get program statistics
  await testGetProgramStatistics(accessToken, programId);

  // Step 7: Enroll in program
  await testEnrollInProgram(accessToken, programId);

  // Step 8: Test error cases
  await testErrorCases(accessToken);

  console.log("\n✨ Program Management API tests completed!");
  console.log(
    "\n📝 Note: Check the server logs for detailed information about program operations."
  );
  console.log(`\n📁 Program ID: ${programId}`);
}

// Run the tests
main().catch(console.error);
