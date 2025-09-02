# 📧 Bulk User Invite API - CURL Examples

This document provides comprehensive CURL examples for the bulk user invite feature in the CONFAB LMS API.

## 🔑 **Authentication Setup**

First, get your admin access token:

```bash
# Login as admin
curl -X POST http://localhost:9092/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@theconfab.org",
    "password": "admin123"
  }'

# Extract the access token from the response
# Set it as a variable for easier use
export ACCESS_TOKEN="your_access_token_here"
```

## 📋 **Bulk Invite Endpoints**

### **1. Bulk Invite Users (Basic)**

```bash
curl -X POST http://localhost:9092/api/v1/users/bulk-invite \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "users": [
      {
        "name": "John Doe",
        "email": "john.doe@example.com",
        "role": "PARTICIPANT"
      },
      {
        "name": "Jane Smith",
        "email": "jane.smith@example.com",
        "role": "INSTRUCTOR"
      },
      {
        "name": "Bob Johnson",
        "email": "bob.johnson@example.com",
        "role": "PARTICIPANT"
      }
    ],
    "sendWelcomeEmail": true
  }'
```

**Expected Response:**
```json
{
  "ok": true,
  "data": {
    "results": {
      "successful": [
        {
          "email": "john.doe@example.com",
          "name": "John Doe",
          "role": "PARTICIPANT",
          "userId": "68b4b490f5fbc4ca3098cbdb"
        },
        {
          "email": "jane.smith@example.com",
          "name": "Jane Smith",
          "role": "INSTRUCTOR",
          "userId": "68b4b490f5fbc4ca3098cbdc"
        },
        {
          "email": "bob.johnson@example.com",
          "name": "Bob Johnson",
          "role": "PARTICIPANT",
          "userId": "68b4b490f5fbc4ca3098cbdd"
        }
      ],
      "failed": [],
      "skipped": []
    },
    "summary": {
      "total": 3,
      "successful": 3,
      "failed": 0,
      "skipped": 0
    }
  },
  "message": "Bulk invite completed. 3 users invited successfully."
}
```

### **2. Bulk Invite with Cohort Assignment**

```bash
curl -X POST http://localhost:9092/api/v1/users/bulk-invite \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "users": [
      {
        "name": "Alice Cooper",
        "email": "alice.cooper@example.com",
        "role": "PARTICIPANT",
        "roleInCohort": "MEMBER"
      },
      {
        "name": "Charlie Brown",
        "email": "charlie.brown@example.com",
        "role": "PARTICIPANT",
        "roleInCohort": "LEADER"
      },
      {
        "name": "Diana Prince",
        "email": "diana.prince@example.com",
        "role": "INSTRUCTOR",
        "roleInCohort": "MENTOR"
      }
    ],
    "cohortId": "68b4b490f5fbc4ca3098cbde",
    "roleInCohort": "MEMBER",
    "sendWelcomeEmail": true
  }'
```

### **3. Bulk Invite with Mixed Roles and Cohort Roles**

```bash
curl -X POST http://localhost:9092/api/v1/users/bulk-invite \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "users": [
      {
        "name": "Eve Wilson",
        "email": "eve.wilson@example.com",
        "role": "PARTICIPANT",
        "roleInCohort": "MEMBER"
      },
      {
        "name": "Frank Miller",
        "email": "frank.miller@example.com",
        "role": "ADMIN",
        "roleInCohort": "LEADER"
      },
      {
        "name": "Grace Lee",
        "email": "grace.lee@example.com",
        "role": "INSTRUCTOR",
        "roleInCohort": "MENTOR"
      },
      {
        "name": "Henry Ford",
        "email": "henry.ford@example.com",
        "role": "PARTICIPANT"
      }
    ],
    "cohortId": "68b4b490f5fbc4ca3098cbdf",
    "sendWelcomeEmail": false
  }'
```

### **4. Large Batch Invite (Maximum 100 Users)**

```bash
curl -X POST http://localhost:9092/api/v1/users/bulk-invite \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "users": [
      {
        "name": "User 1",
        "email": "user1@example.com",
        "role": "PARTICIPANT"
      },
      {
        "name": "User 2",
        "email": "user2@example.com",
        "role": "PARTICIPANT"
      }
      // ... (up to 100 users)
    ],
    "cohortId": "68b4b490f5fbc4ca3098cbe0",
    "sendWelcomeEmail": true
  }'
```

## 🔍 **Error Handling Examples**

### **1. Invalid Cohort ID**

```bash
curl -X POST http://localhost:9092/api/v1/users/bulk-invite \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "users": [
      {
        "name": "Test User",
        "email": "test@example.com",
        "role": "PARTICIPANT"
      }
    ],
    "cohortId": "invalid_cohort_id"
  }'
```

**Expected Response:**
```json
{
  "ok": false,
  "error": {
    "code": "COHORT_NOT_FOUND",
    "message": "Cohort not found"
  }
}
```

### **2. Duplicate Users (Some Already Exist)**

```bash
curl -X POST http://localhost:9092/api/v1/users/bulk-invite \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "users": [
      {
        "name": "New User",
        "email": "newuser@example.com",
        "role": "PARTICIPANT"
      },
      {
        "name": "Existing User",
        "email": "admin@theconfab.org",
        "role": "PARTICIPANT"
      }
    ]
  }'
```

**Expected Response:**
```json
{
  "ok": true,
  "data": {
    "results": {
      "successful": [
        {
          "email": "newuser@example.com",
          "name": "New User",
          "role": "PARTICIPANT",
          "userId": "68b4b490f5fbc4ca3098cbe1"
        }
      ],
      "failed": [],
      "skipped": [
        {
          "email": "admin@theconfab.org",
          "reason": "User already exists",
          "name": "Existing User"
        }
      ]
    },
    "summary": {
      "total": 2,
      "successful": 1,
      "failed": 0,
      "skipped": 1
    }
  },
  "message": "Bulk invite completed. 1 users invited successfully."
}
```

### **3. Invalid Email Format**

```bash
curl -X POST http://localhost:9092/api/v1/users/bulk-invite \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "users": [
      {
        "name": "Invalid Email User",
        "email": "invalid-email",
        "role": "PARTICIPANT"
      }
    ]
  }'
```

**Expected Response:**
```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email address"
  }
}
```

### **4. Too Many Users (Over 100 Limit)**

```bash
curl -X POST http://localhost:9092/api/v1/users/bulk-invite \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "users": [
      // ... 101 users
    ]
  }'
```

**Expected Response:**
```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Maximum 100 users can be invited at once"
  }
}
```

## 📊 **Response Structure**

### **Successful Response**
```json
{
  "ok": true,
  "data": {
    "results": {
      "successful": [
        {
          "email": "user@example.com",
          "name": "User Name",
          "role": "PARTICIPANT",
          "userId": "user_id_here"
        }
      ],
      "failed": [
        {
          "email": "failed@example.com",
          "reason": "Error reason",
          "name": "Failed User"
        }
      ],
      "skipped": [
        {
          "email": "existing@example.com",
          "reason": "User already exists",
          "name": "Existing User"
        }
      ]
    },
    "summary": {
      "total": 3,
      "successful": 1,
      "failed": 1,
      "skipped": 1
    }
  },
  "message": "Bulk invite completed. 1 users invited successfully."
}
```

### **Error Response**
```json
{
  "ok": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description"
  }
}
```

## 🛡️ **Security Considerations**

### **1. Rate Limiting**
The API includes rate limiting to prevent abuse:
- Maximum 100 users per request
- Rate limits on the endpoint

### **2. Email Validation**
- All emails are validated for proper format
- Duplicate emails are skipped (not failed)

### **3. Cohort Validation**
- Cohort existence is verified
- Cohort capacity is checked
- Cohort roles are validated

## 🔧 **Advanced Usage**

### **1. Using with Scripts**

```bash
#!/bin/bash

# Read users from a JSON file
USERS_JSON=$(cat users.json)

curl -X POST http://localhost:9092/api/v1/users/bulk-invite \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d "$USERS_JSON"
```

### **2. CSV to JSON Conversion**

```bash
# Convert CSV to JSON format
cat users.csv | jq -R -s -c 'split("\n") | map(select(length > 0)) | map(split(",")) | map({
  "name": .[0],
  "email": .[1],
  "role": .[2],
  "roleInCohort": .[3]
})' > users.json
```

### **3. Batch Processing**

```bash
# Process users in batches of 50
for i in {0..9}; do
  start=$((i * 50))
  end=$((start + 49))
  
  # Extract batch from users array
  batch=$(echo "$USERS_JSON" | jq ".users[$start:$end]")
  
  curl -X POST http://localhost:9092/api/v1/users/bulk-invite \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -d "{\"users\": $batch, \"cohortId\": \"$COHORT_ID\"}"
done
```

## 📝 **Sample Data Files**

### **users.json**
```json
{
  "users": [
    {
      "name": "John Doe",
      "email": "john.doe@example.com",
      "role": "PARTICIPANT",
      "roleInCohort": "MEMBER"
    },
    {
      "name": "Jane Smith",
      "email": "jane.smith@example.com",
      "role": "INSTRUCTOR",
      "roleInCohort": "MENTOR"
    }
  ],
  "cohortId": "68b4b490f5fbc4ca3098cbe2",
  "sendWelcomeEmail": true
}
```

### **users.csv**
```csv
Name,Email,Role,RoleInCohort
John Doe,john.doe@example.com,PARTICIPANT,MEMBER
Jane Smith,jane.smith@example.com,INSTRUCTOR,MENTOR
Bob Johnson,bob.johnson@example.com,PARTICIPANT,LEADER
```

## ⚠️ **Important Notes**

1. **Maximum 100 users per request** - Use multiple requests for larger batches
2. **Email validation** - Invalid emails will cause the entire request to fail
3. **Duplicate handling** - Existing users are skipped, not failed
4. **Cohort validation** - Invalid cohort IDs will fail the entire request
5. **Email sending** - Can be disabled with `sendWelcomeEmail: false`
6. **Role inheritance** - Individual user roles override default cohort roles
7. **Error handling** - Partial failures are reported in the response
8. **Logging** - All bulk operations are logged for audit purposes
