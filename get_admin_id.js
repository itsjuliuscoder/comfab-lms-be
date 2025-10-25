#!/usr/bin/env node

/**
 * Script to get admin user ID
 * Usage: node get_admin_id.js
 */

import mongoose from "mongoose";

// MongoDB connection
const MONGODB_URI = "mongodb://localhost:27017/confab_lms";

async function getAdminId() {
  try {
    console.log("🔍 Getting Admin User ID");
    console.log("========================");
    console.log("");

    // Connect to MongoDB
    console.log("1️⃣ Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");
    console.log("");

    // Define User schema
    const userSchema = new mongoose.Schema(
      {
        name: String,
        email: String,
        password: String,
        role: String,
        status: String,
        createdAt: Date,
        updatedAt: Date,
      },
      { timestamps: true }
    );

    const User = mongoose.model("User", userSchema);

    // Find admin users
    console.log("2️⃣ Finding admin users...");
    const adminUsers = await User.find(
      { role: "ADMIN" },
      "name email role status"
    );

    if (adminUsers.length === 0) {
      console.log("❌ No admin users found");
      process.exit(1);
    }

    console.log("✅ Admin users found:");
    adminUsers.forEach((user, index) => {
      console.log(
        `   ${index + 1}. ${user.name} (${user.email}) - ID: ${user._id}`
      );
    });

    // Get the first admin user ID
    const adminId = adminUsers[0]._id;
    console.log("");
    console.log("🎯 Use this coordinatorId in your request:");
    console.log(`   "coordinatorId": "${adminId}"`);
  } catch (error) {
    console.error("❌ Error getting admin ID:", error);
  } finally {
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log("📝 MongoDB connection closed");
  }
}

// Run the script
getAdminId();
