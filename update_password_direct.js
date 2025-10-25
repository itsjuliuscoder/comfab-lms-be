#!/usr/bin/env node

/**
 * Direct database script to update user password
 * Usage: node update_password_direct.js
 */

import bcrypt from "bcryptjs";
import mongoose from "mongoose";

// MongoDB connection
const MONGODB_URI = "mongodb://localhost:27017/confab_lms";

async function updateUserPassword() {
  try {
    console.log("🔐 Direct Database Password Update Script");
    console.log("==========================================");
    console.log("");

    // Connect to MongoDB
    console.log("1️⃣ Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");
    console.log("");

    // Define User schema (simplified for direct access)
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

    // Find user by email
    console.log("2️⃣ Finding user by email: devcalledjulius@gmail.com");
    const user = await User.findOne({ email: "devcalledjulius@gmail.com" });

    if (!user) {
      console.log("❌ User not found with email: devcalledjulius@gmail.com");
      console.log("Available users:");
      const allUsers = await User.find({}, "name email role status");
      allUsers.forEach((u) => {
        console.log(`   - ${u.name} (${u.email}) - ${u.role} - ${u.status}`);
      });
      process.exit(1);
    }

    console.log("✅ User found:");
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Status: ${user.status}`);
    console.log("");

    // Hash new password
    console.log("3️⃣ Hashing new password...");
    const newPassword = "Password";
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    console.log("✅ Password hashed successfully");
    console.log("");

    // Update user password
    console.log("4️⃣ Updating user password...");
    user.password = hashedPassword;
    user.updatedAt = new Date();
    await user.save();

    console.log("✅ Password updated successfully!");
    console.log("   User: devcalledjulius@gmail.com");
    console.log("   New Password: Password");
    console.log("");

    // Verify the update
    console.log("5️⃣ Verifying password update...");
    const updatedUser = await User.findOne({
      email: "devcalledjulius@gmail.com",
    });
    const passwordMatch = await bcrypt.compare(
      "Password",
      updatedUser.password
    );

    if (passwordMatch) {
      console.log("✅ Password verification successful!");
    } else {
      console.log("❌ Password verification failed!");
    }

    console.log("");
    console.log("🎉 Password update completed successfully!");
  } catch (error) {
    console.error("❌ Error updating password:", error);
  } finally {
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log("📝 MongoDB connection closed");
  }
}

// Run the script
updateUserPassword();
