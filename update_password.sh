#!/bin/bash

# Script to update user password
# Usage: ./update_password.sh

API_BASE_URL="http://localhost:9092/api/v1"
USER_EMAIL="devcalledjulius@gmail.com"
NEW_PASSWORD="Password"

echo "🔐 User Password Update Script"
echo "=============================="
echo ""

# Step 1: Login as admin to get access token
echo "1️⃣ Logging in as admin..."
ADMIN_RESPONSE=$(curl -s -X POST "$API_BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@theconfab.org",
    "password": "admin123"
  }')

# Extract access token
ACCESS_TOKEN=$(echo $ADMIN_RESPONSE | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

if [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ Failed to get access token. Admin login failed."
  echo "Response: $ADMIN_RESPONSE"
  exit 1
fi

echo "✅ Admin login successful"
echo ""

# Step 2: Find user by email
echo "2️⃣ Finding user by email: $USER_EMAIL"
USER_RESPONSE=$(curl -s -X GET "$API_BASE_URL/users" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -G -d "search=$USER_EMAIL")

# Extract user ID from response
USER_ID=$(echo $USER_RESPONSE | grep -o '"_id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$USER_ID" ]; then
  echo "❌ User not found with email: $USER_EMAIL"
  echo "Response: $USER_RESPONSE"
  exit 1
fi

echo "✅ User found with ID: $USER_ID"
echo ""

# Step 3: Update user password
echo "3️⃣ Updating password for user: $USER_EMAIL"
UPDATE_RESPONSE=$(curl -s -X PATCH "$API_BASE_URL/users/$USER_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "password": "'$NEW_PASSWORD'"
  }')

# Check if update was successful
if echo "$UPDATE_RESPONSE" | grep -q '"ok":true'; then
  echo "✅ Password updated successfully!"
  echo "   User: $USER_EMAIL"
  echo "   New Password: $NEW_PASSWORD"
else
  echo "❌ Failed to update password"
  echo "Response: $UPDATE_RESPONSE"
  exit 1
fi

echo ""
echo "🎉 Password update completed successfully!"
