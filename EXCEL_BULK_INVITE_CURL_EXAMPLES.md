# 📊 Excel Bulk User Invite API - CURL Examples

This document provides comprehensive CURL examples for the Excel-based bulk user invite feature in the CONFAB LMS API. This feature allows admins to upload Excel files containing user data for bulk invitations.

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
export ACCESS_TOKEN="your_access_token_here"
```

## 📋 **Excel Bulk Invite Endpoints**

### **1. Download Excel Template**
**GET** `/api/v1/users/bulk-invite-template`

Download a pre-filled Excel template with sample data and instructions. This endpoint is publicly accessible.

```bash
curl -X GET http://localhost:9092/api/v1/users/bulk-invite-template \
  --output bulk_invite_template.xlsx
```

**Expected Response:**
- Downloads an Excel file (`bulk_invite_template.xlsx`) containing:
  - Sample user data
  - Instructions sheet
  - Proper column headers

### **2. Upload Excel File for Bulk Invite**
**POST** `/api/v1/users/bulk-invite-excel`

Upload an Excel file containing user data for bulk invitations.

```bash
curl -X POST http://localhost:9092/api/v1/users/bulk-invite-excel \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -F "excelFile=@users.xlsx" \
  -F "cohortId=68b4b490f5fbc4ca3098cbde" \
  -F "roleInCohort=MEMBER" \
  -F "sendWelcomeEmail=true"
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
        }
      ],
      "failed": [],
      "skipped": [
        {
          "email": "existing@example.com",
          "reason": "User already exists",
          "name": "Existing User"
        }
      ],
      "excelErrors": [
        {
          "row": 5,
          "error": "Invalid email format",
          "data": ["Invalid User", "invalid-email", "PARTICIPANT", "MEMBER"]
        }
      ]
    },
    "excelProcessing": {
      "totalRows": 10,
      "validRows": 8,
      "invalidRows": 2,
      "errors": [
        {
          "row": 5,
          "error": "Invalid email format",
          "data": ["Invalid User", "invalid-email", "PARTICIPANT", "MEMBER"]
        }
      ]
    },
    "summary": {
      "total": 8,
      "successful": 7,
      "failed": 0,
      "skipped": 1
    }
  },
  "message": "Excel bulk invite completed. 7 users invited successfully."
}
```

## 📊 **Excel File Format**

### **Required Columns:**
- **Name** (required) - User's full name
- **Email** (required) - User's email address

### **Optional Columns:**
- **Role** (optional) - User role (ADMIN, INSTRUCTOR, PARTICIPANT)
- **RoleInCohort** (optional) - Cohort role (LEADER, MEMBER, MENTOR)

### **Sample Excel Content:**
```
Name            | Email                    | Role        | RoleInCohort
John Doe        | john.doe@example.com     | PARTICIPANT | MEMBER
Jane Smith      | jane.smith@example.com   | INSTRUCTOR  | MENTOR
Bob Johnson     | bob.johnson@example.com  | PARTICIPANT | LEADER
Alice Cooper    | alice.cooper@example.com | PARTICIPANT | MEMBER
```

## 🔍 **Error Handling Examples**

### **1. No File Uploaded**
```bash
curl -X POST http://localhost:9092/api/v1/users/bulk-invite-excel \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -F "cohortId=68b4b490f5fbc4ca3098cbde"
```

**Expected Response:**
```json
{
  "ok": false,
  "error": {
    "code": "NO_FILE",
    "message": "No Excel file uploaded"
  }
}
```

### **2. Invalid File Type**
```bash
curl -X POST http://localhost:9092/api/v1/users/bulk-invite-excel \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -F "excelFile=@document.pdf" \
  -F "cohortId=68b4b490f5fbc4ca3098cbde"
```

**Expected Response:**
```json
{
  "ok": false,
  "error": {
    "code": "INVALID_FILE",
    "message": "Only Excel files (.xlsx, .xls) are allowed"
  }
}
```

### **3. File Too Large**
```bash
# Upload a file larger than 10MB
curl -X POST http://localhost:9092/api/v1/users/bulk-invite-excel \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -F "excelFile=@large_file.xlsx" \
  -F "cohortId=68b4b490f5fbc4ca3098cbde"
```

**Expected Response:**
```json
{
  "ok": false,
  "error": {
    "code": "INVALID_FILE",
    "message": "File size too large. Maximum size is 10MB"
  }
}
```

### **4. Missing Required Headers**
```bash
# Upload Excel file without required columns
curl -X POST http://localhost:9092/api/v1/users/bulk-invite-excel \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -F "excelFile=@invalid_headers.xlsx" \
  -F "cohortId=68b4b490f5fbc4ca3098cbde"
```

**Expected Response:**
```json
{
  "ok": false,
  "error": {
    "code": "PROCESSING_ERROR",
    "message": "Missing required headers: name, email"
  }
}
```

### **5. No Valid Users**
```bash
# Upload Excel file with all invalid rows
curl -X POST http://localhost:9092/api/v1/users/bulk-invite-excel \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -F "excelFile=@all_invalid.xlsx" \
  -F "cohortId=68b4b490f5fbc4ca3098cbde"
```

**Expected Response:**
```json
{
  "ok": false,
  "error": {
    "code": "NO_VALID_USERS",
    "message": "No valid users found in Excel file"
  },
  "data": {
    "excelProcessing": {
      "totalRows": 5,
      "validRows": 0,
      "invalidRows": 5,
      "errors": [...]
    }
  }
}
```

### **6. Too Many Users**
```bash
# Upload Excel file with more than 1000 users
curl -X POST http://localhost:9092/api/v1/users/bulk-invite-excel \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -F "excelFile=@too_many_users.xlsx" \
  -F "cohortId=68b4b490f5fbc4ca3098cbde"
```

**Expected Response:**
```json
{
  "ok": false,
  "error": {
    "code": "TOO_MANY_USERS",
    "message": "Maximum 1000 users allowed per Excel upload"
  },
  "data": {
    "totalUsers": 1500
  }
}
```

## 🔧 **Advanced Usage Examples**

### **1. Upload with Cohort Assignment**
```bash
curl -X POST http://localhost:9092/api/v1/users/bulk-invite-excel \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -F "excelFile=@users.xlsx" \
  -F "cohortId=68b4b490f5fbc4ca3098cbde" \
  -F "roleInCohort=LEADER" \
  -F "sendWelcomeEmail=true"
```

### **2. Upload Without Email Sending**
```bash
curl -X POST http://localhost:9092/api/v1/users/bulk-invite-excel \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -F "excelFile=@users.xlsx" \
  -F "sendWelcomeEmail=false"
```

### **3. Upload Without Cohort Assignment**
```bash
curl -X POST http://localhost:9092/api/v1/users/bulk-invite-excel \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -F "excelFile=@users.xlsx"
```

## 📝 **Excel Template Structure**

### **Template Features:**
- **Sample Data** - Pre-filled with example users
- **Instructions Sheet** - Detailed usage instructions
- **Proper Headers** - Correct column names
- **Validation Rules** - Built-in data validation

### **Template Content:**
```
Sheet 1: Users
Name            | Email                    | Role        | RoleInCohort
John Doe        | john.doe@example.com     | PARTICIPANT | MEMBER
Jane Smith      | jane.smith@example.com   | INSTRUCTOR  | MENTOR
Bob Johnson     | bob.johnson@example.com  | PARTICIPANT | LEADER

Sheet 2: Instructions
Instructions:
1. Fill in the user details below
2. Required fields: Name, Email
3. Optional fields: Role, RoleInCohort
4. Valid roles: ADMIN, INSTRUCTOR, PARTICIPANT
5. Valid cohort roles: LEADER, MEMBER, MENTOR
6. Remove sample data before uploading
```

## 🛡️ **Validation Rules**

### **File Validation:**
- **File Type** - Only .xlsx and .xls files
- **File Size** - Maximum 10MB
- **Required Headers** - Name, Email columns must exist

### **Data Validation:**
- **Name** - Required, non-empty string
- **Email** - Required, valid email format
- **Role** - Must be ADMIN, INSTRUCTOR, or PARTICIPANT
- **RoleInCohort** - Must be LEADER, MEMBER, or MENTOR

### **Business Logic Validation:**
- **User Existence** - Skip if user already exists
- **Cohort Capacity** - Check if cohort is full
- **Cohort Existence** - Validate cohort ID if provided

## 📊 **Response Structure**

### **Successful Response:**
```json
{
  "ok": true,
  "data": {
    "results": {
      "successful": [...],
      "failed": [...],
      "skipped": [...],
      "excelErrors": [...]
    },
    "excelProcessing": {
      "totalRows": 10,
      "validRows": 8,
      "invalidRows": 2,
      "errors": [...]
    },
    "summary": {
      "total": 8,
      "successful": 7,
      "failed": 0,
      "skipped": 1
    }
  },
  "message": "Excel bulk invite completed. 7 users invited successfully."
}
```

### **Error Response:**
```json
{
  "ok": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description"
  }
}
```

## 🔧 **Script Examples**

### **1. Download Template and Upload**
```bash
#!/bin/bash

# Download template
curl -X GET http://localhost:9092/api/v1/users/bulk-invite-template \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  --output template.xlsx

echo "Template downloaded. Please fill it with user data and save as users.xlsx"

# Upload filled template
curl -X POST http://localhost:9092/api/v1/users/bulk-invite-excel \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -F "excelFile=@users.xlsx" \
  -F "cohortId=68b4b490f5fbc4ca3098cbde"
```

### **2. Batch Processing Multiple Files**
```bash
#!/bin/bash

for file in users_*.xlsx; do
  echo "Processing $file..."
  curl -X POST http://localhost:9092/api/v1/users/bulk-invite-excel \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -F "excelFile=@$file" \
    -F "cohortId=68b4b490f5fbc4ca3098cbde"
  echo "Completed $file"
done
```

## ⚠️ **Important Notes**

1. **File Format** - Only Excel files (.xlsx, .xls) are supported
2. **File Size** - Maximum 10MB per file
3. **User Limit** - Maximum 1000 users per upload
4. **Required Fields** - Name and Email are mandatory
5. **Email Validation** - All emails are validated for format
6. **Duplicate Handling** - Existing users are skipped
7. **Cohort Validation** - Cohort existence and capacity are checked
8. **Error Reporting** - Detailed error information for each row
9. **Template Download** - Always use the provided template
10. **Email Sending** - Can be disabled with `sendWelcomeEmail=false`

## 🚀 **Quick Reference**

### **Download Template (Public):**
```bash
GET /api/v1/users/bulk-invite-template
```

### **Upload Excel File:**
```bash
POST /api/v1/users/bulk-invite-excel
Content-Type: multipart/form-data
```

### **Required Form Fields:**
- `excelFile` - Excel file (.xlsx or .xls)

### **Optional Form Fields:**
- `cohortId` - Cohort ID for assignment
- `roleInCohort` - Default cohort role
- `sendWelcomeEmail` - Whether to send emails (true/false)

The Excel bulk invite feature provides a powerful and user-friendly way to invite large numbers of users to the platform!
