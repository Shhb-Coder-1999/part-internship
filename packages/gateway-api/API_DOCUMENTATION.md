# 🚪 Gateway API Documentation

## 🔐 Authentication & Authorization System

The API Gateway provides comprehensive authentication and authorization with configurable service protection.

## 🎯 Base URL
```
Development: http://localhost:3000
```

## 📋 Authentication Endpoints

### 1. Register User
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "user"
}
```

**Response:**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "roles": ["user"],
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "accessToken": "jwt-token",
  "refreshToken": "refresh-token"
}
```

### 2. Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

### 3. Get Profile
```http
GET /auth/profile
Authorization: Bearer <access-token>
```

### 4. Refresh Token
```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "your-refresh-token"
}
```

### 5. Logout
```http
POST /auth/logout
Content-Type: application/json

{
  "refreshToken": "your-refresh-token"
}
```

### 6. Change Password
```http
PUT /auth/change-password
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

## 🏢 Service Routes

All service routes support configurable authentication based on environment variables.

### Recruitment Services

#### Comments Service
```http
GET    /part/recruitment/comments     # Public read (configurable)
POST   /part/recruitment/comments     # Requires: user, admin
PUT    /part/recruitment/comments     # Requires: user, admin  
DELETE /part/recruitment/comments     # Requires: admin
```

#### User Management Service
```http
GET    /part/recruitment/users        # Requires: admin
POST   /part/recruitment/users        # Requires: admin
PUT    /part/recruitment/users        # Requires: admin
DELETE /part/recruitment/users        # Requires: admin
```

#### Sahab Service
```http
GET    /part/recruitment/sahab        # Public (configurable)
POST   /part/recruitment/sahab        # Requires: user, admin
PUT    /part/recruitment/sahab        # Requires: admin
DELETE /part/recruitment/sahab        # Requires: admin
```

### Future Services

#### College Services
```http
GET    /part/college/*                # Requires: student, teacher, admin
POST   /part/college/*                # Requires: teacher, admin
PUT    /part/college/*                # Requires: teacher, admin
DELETE /part/college/*                # Requires: admin
```

#### Internship Services
```http
GET    /part/internship/*             # Requires: intern, supervisor, admin
POST   /part/internship/*             # Requires: supervisor, admin
PUT    /part/internship/*             # Requires: supervisor, admin
DELETE /part/internship/*             # Requires: admin
```

## 👥 User Roles

| Role | Description | Default Permissions |
|------|-------------|-------------------|
| `admin` | Full system access | All permissions (`*`) |
| `user` | Regular user | Comments, profile management |
| `student` | College student | Courses, assignments, profile |
| `teacher` | College teacher | Course management, grading |
| `intern` | Internship participant | Projects, reports, profile |
| `supervisor` | Internship supervisor | Project management, evaluations |

## ⚙️ Configuration

### Environment Variables

#### Service Protection
```bash
# Enable/disable auth for specific services
PROTECT_COMMENTS_SERVICE=true
PROTECT_USERS_SERVICE=true  
PROTECT_SAHAB_SERVICE=false
PROTECT_COLLEGE_SERVICES=true
PROTECT_INTERNSHIP_SERVICES=true
```

#### JWT Configuration
```bash
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d
```

#### Rate Limiting
```bash
RATE_LIMIT_WINDOW_MS=900000        # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100        # 100 requests per window
AUTH_RATE_LIMIT_MAX_REQUESTS=5     # 5 auth attempts per window
```

## 🔒 Security Features

### 1. **Rate Limiting**
- General API: 100 requests per 15 minutes
- Auth endpoints: 5 attempts per 15 minutes
- Configurable via environment variables

### 2. **Security Headers**
- Helmet.js for security headers
- CORS protection
- Content Security Policy

### 3. **Input Validation**
- Express-validator for input sanitization
- Content-type validation
- Request size limiting

### 4. **Password Security**
- Bcrypt with configurable salt rounds
- Password strength requirements
- Secure password change flow

## 📝 Request/Response Examples

### Authentication Flow
```bash
# 1. Register or Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'

# 2. Use the access token for protected routes
curl -X GET http://localhost:3000/part/recruitment/comments \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Service Request with User Context
When authenticated, the gateway forwards user information to downstream services:

```http
Headers forwarded to services:
X-User-ID: user-uuid
X-User-Email: user@example.com  
X-User-Roles: ["user","admin"]
```

## 🧪 Demo Users

For development/testing:

```json
{
  "admin": {
    "email": "admin@example.com",
    "password": "admin123",
    "roles": ["admin"]
  },
  "user": {
    "email": "user@example.com", 
    "password": "user123",
    "roles": ["user"]
  }
}
```

## 🚨 Error Responses

### Authentication Errors
```json
{
  "error": "Authentication required",
  "message": "Valid authentication token required",
  "path": "/part/recruitment/users"
}
```

### Authorization Errors
```json
{
  "error": "Insufficient permissions",
  "message": "Access denied. Required roles: admin",
  "userRoles": ["user"],
  "requiredRoles": ["admin"]
}
```

### Rate Limiting
```json
{
  "error": "Too many requests",
  "message": "Too many requests from this IP, please try again later",
  "retryAfter": 900
}
```

## 🛠️ Development & Testing

### Start Gateway
```bash
cd packages/gateway-api
pnpm dev
```

### Test Authentication
```bash
# Health check
curl http://localhost:3000/health

# Get API info
curl http://localhost:3000/auth/info

# Test protected route
curl http://localhost:3000/part/recruitment/users
```

## 📊 Monitoring

### Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "OK",
  "service": "API Gateway", 
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "environment": "development"
}
```

## 🔧 Customization

### Adding New Services
1. Add service configuration in `config/auth.config.js`
2. Add proxy middleware in `index.js`
3. Configure protection levels via environment variables

### Custom Roles
1. Update `authConfig.roles` in `config/auth.config.js`
2. Update service protection rules
3. Add role-specific permissions

This gateway provides enterprise-grade authentication and authorization with maximum flexibility for your microservices architecture! 🎉
