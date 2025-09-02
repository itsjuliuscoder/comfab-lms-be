# 🔑 JWT Token Management

This document explains how JWT tokens work in the CONFAB LMS API and how to manage them.

## 📋 **Token Types**

### **1. Access Token**
- **Purpose**: Used to authenticate API requests
- **Expiration**: **24 hours** (configurable)
- **Usage**: Include in `Authorization: Bearer <token>` header
- **Security**: Short-lived for security

### **2. Refresh Token**
- **Purpose**: Used to get new access tokens when they expire
- **Expiration**: **30 days** (configurable)
- **Usage**: Send to `/api/v1/auth/refresh` endpoint
- **Security**: Long-lived but can be revoked

## ⏰ **Current Token Expiration Settings**

```bash
# Default values (can be overridden with environment variables)
JWT_EXPIRES_IN=24h          # Access token: 24 hours
REFRESH_TOKEN_EXPIRES_IN=30d # Refresh token: 30 days
```

## 🔄 **Token Lifecycle**

### **Step 1: Login**
```bash
curl -X POST http://localhost:9092/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "user": { ... },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Login successful"
}
```

### **Step 2: Use Access Token**
```bash
curl -X GET http://localhost:9092/api/v1/courses \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### **Step 3: Token Expires (After 24 hours)**
When the access token expires, you'll get:
```json
{
  "ok": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Token expired"
  }
}
```

### **Step 4: Refresh Token**
```bash
curl -X POST http://localhost:9092/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Token refreshed successfully"
}
```

## ⚙️ **Configuration Options**

### **Environment Variables**
You can customize token expiration by setting these environment variables:

```bash
# In your .env file
JWT_EXPIRES_IN=24h              # Access token expiration
REFRESH_TOKEN_EXPIRES_IN=30d    # Refresh token expiration
```

### **Common Time Formats**
```bash
# Access Token Examples
JWT_EXPIRES_IN=1h     # 1 hour
JWT_EXPIRES_IN=24h    # 24 hours
JWT_EXPIRES_IN=7d     # 7 days
JWT_EXPIRES_IN=30m    # 30 minutes

# Refresh Token Examples
REFRESH_TOKEN_EXPIRES_IN=7d     # 7 days
REFRESH_TOKEN_EXPIRES_IN=30d    # 30 days
REFRESH_TOKEN_EXPIRES_IN=90d    # 90 days
```

## 🛡️ **Security Best Practices**

### **1. Store Tokens Securely**
```javascript
// Frontend - Store in memory or secure storage
localStorage.setItem('accessToken', accessToken);
localStorage.setItem('refreshToken', refreshToken);

// Or use secure HTTP-only cookies (recommended)
```

### **2. Automatic Token Refresh**
```javascript
// Frontend - Auto-refresh before expiration
const refreshTokenIfNeeded = async () => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    try {
      // Decode token to check expiration
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expirationTime = payload.exp * 1000; // Convert to milliseconds
      const currentTime = Date.now();
      
      // Refresh if token expires in next 5 minutes
      if (expirationTime - currentTime < 5 * 60 * 1000) {
        await refreshToken();
      }
    } catch (error) {
      console.error('Token refresh error:', error);
    }
  }
};
```

### **3. Handle Token Errors**
```javascript
// Frontend - Handle token expiration
const handleApiCall = async (url, options = {}) => {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        ...options.headers,
      },
    });
    
    if (response.status === 401) {
      // Token expired, try to refresh
      const refreshed = await refreshToken();
      if (refreshed) {
        // Retry the original request
        return handleApiCall(url, options);
      } else {
        // Redirect to login
        window.location.href = '/login';
      }
    }
    
    return response;
  } catch (error) {
    console.error('API call error:', error);
    throw error;
  }
};
```

## 🔍 **Troubleshooting**

### **Common Issues**

#### **1. "Token expired" Error**
```json
{
  "ok": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Token expired"
  }
}
```
**Solution**: Use refresh token to get new access token

#### **2. "Invalid refresh token" Error**
```json
{
  "ok": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid refresh token"
  }
}
```
**Solution**: User needs to log in again (refresh token expired)

#### **3. "Access token required" Error**
```json
{
  "ok": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Access token required"
  }
}
```
**Solution**: Include `Authorization: Bearer <token>` header

### **Debug Token Information**
```javascript
// Decode JWT token to see payload
const decodeToken = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    console.log('Token payload:', payload);
    console.log('Expires at:', new Date(payload.exp * 1000));
    console.log('Issued at:', new Date(payload.iat * 1000));
    return payload;
  } catch (error) {
    console.error('Invalid token:', error);
    return null;
  }
};
```

## 📊 **Token Expiration Timeline**

```
Login Time: 2024-01-15 10:00:00
├── Access Token: Expires 2024-01-16 10:00:00 (24 hours)
└── Refresh Token: Expires 2024-02-14 10:00:00 (30 days)

Timeline:
├── 0-24 hours: Use access token
├── 24 hours: Access token expires, use refresh token
├── 24 hours - 30 days: Continue using refresh token
└── 30 days: Refresh token expires, login required
```

## 🚀 **Quick Reference**

### **Login**
```bash
curl -X POST http://localhost:9092/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}'
```

### **Use API with Token**
```bash
curl -X GET http://localhost:9092/api/v1/courses \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### **Refresh Token**
```bash
curl -X POST http://localhost:9092/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "YOUR_REFRESH_TOKEN"}'
```

### **Logout**
```bash
# Simply discard tokens on frontend
# No server-side logout required (stateless)
```

## ⚠️ **Important Notes**

1. **Access tokens expire after 24 hours** - Use refresh token to get new ones
2. **Refresh tokens expire after 30 days** - User must login again
3. **Tokens are stateless** - No server-side storage
4. **Always use HTTPS in production** - Tokens are sensitive data
5. **Store tokens securely** - Use HTTP-only cookies or secure storage
6. **Handle token expiration gracefully** - Implement auto-refresh logic
