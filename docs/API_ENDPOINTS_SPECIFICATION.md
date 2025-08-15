# API Endpoints Specification

This document provides a comprehensive overview of all API endpoints across the microservices architecture, including request/response formats, authentication requirements, and testing results.

## Table of Contents

1. [Gateway API Authentication](#gateway-api-authentication)
2. [Comments Service](#comments-service)
3. [User Management Service](#user-management-service)
4. [Sahab Service](#sahab-service)
5. [Response Format Standards](#response-format-standards)
6. [Error Handling](#error-handling)
7. [Testing Summary](#testing-summary)

---

## Gateway API Authentication

**Base URL:** `http://localhost:3000`

### Authentication Endpoints

#### POST /auth/register
Register a new user in the system.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "id": "user-uuid-123",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "isActive": true,
    "isVerified": false,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z",
    "roles": ["user"]
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "service": "gateway-auth",
    "version": "2.0.0"
  }
}
```

**Error Response (409):**
```json
{
  "success": false,
  "error": "User with this email already exists",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### POST /auth/login
Authenticate user and return JWT token.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "id": "user-uuid-123",
    "email": "user@example.com",
    "roles": ["user"],
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z",
    "isActive": true,
    "isVerified": false,
    "meta": {
      "lastLogin": "2024-01-15T10:30:00.000Z",
      "permissions": []
    }
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "service": "gateway-auth",
    "version": "2.0.0"
  }
}
```

#### GET /auth/profile
Get current user profile information.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "user-uuid-123",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "roles": ["user"],
    "isActive": true,
    "isVerified": false,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "service": "gateway-auth",
    "version": "2.0.0"
  }
}
```

#### POST /auth/refresh
Refresh JWT token.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "id": "user-uuid-123",
    "email": "user@example.com",
    "roles": ["user"]
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "service": "gateway-auth",
    "version": "2.0.0"
  }
}
```

### Admin Endpoints

#### POST /admin/users
Create a new user (Admin only).

**Headers:**
```
Authorization: Bearer <admin_jwt_token>
```

**Request:**
```json
{
  "email": "newuser@example.com",
  "password": "securePassword123",
  "firstName": "Jane",
  "lastName": "Smith",
  "isActive": true,
  "isVerified": true,
  "roles": ["user"]
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "id": "user-uuid-456",
    "email": "newuser@example.com",
    "firstName": "Jane",
    "lastName": "Smith",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z",
    "isActive": true,
    "isVerified": true,
    "roles": ["user"],
    "meta": {}
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "service": "gateway-auth",
    "version": "2.0.0"
  }
}
```

#### GET /admin/users
List all users (Admin only).

**Headers:**
```
Authorization: Bearer <admin_jwt_token>
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `sortBy` (optional): Sort field (default: createdAt)
- `order` (optional): Sort order (asc/desc, default: desc)

**Response (200):**
```json
{
  "success": true,
  "users": [
    {
      "id": "user-uuid-123",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "isActive": true,
      "isVerified": false,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z",
      "roles": ["user"]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "pages": 1
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "service": "gateway-auth",
    "version": "2.0.0"
  }
}
```

### Gateway Health

#### GET /health
Check gateway health status.

**Response (200):**
```json
{
  "status": "OK",
  "service": "Fastify API Gateway",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600.123,
  "environment": "production",
  "version": "2.0.0"
}
```

#### GET /
Get gateway information.

**Response (200):**
```json
{
  "message": "Welcome to the Fastify API Gateway",
  "version": "2.0.0",
  "environment": "production",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "authentication": {
    "enabled": true,
    "type": "JWT"
  },
  "services": {
    "comments": "active",
    "users": "active"
  }
}
```

---

## Comments Service

**Base URL:** `http://localhost:3001/api`

### Comment Management

#### GET /comments
Retrieve all comments with pagination and filtering.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `parentId` (optional): Filter by parent comment ID
- `authorId` (optional): Filter by author ID
- `sort` (optional): Sort field (createdAt, updatedAt, likes, dislikes)
- `order` (optional): Sort order (asc/desc, default: desc)
- `includeDeleted` (optional): Include soft-deleted comments (default: false)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "comments": [
      {
        "id": "comment-uuid-123",
        "text": "This is a sample comment",
        "authorId": "user-uuid-123",
        "parentId": null,
        "likes": 5,
        "dislikes": 1,
        "isDeleted": false,
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "pages": 1
    }
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### POST /comments
Create a new comment.

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request:**
```json
{
  "text": "This is a new comment",
  "parentId": null
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Comment created successfully",
  "data": {
    "id": "comment-uuid-456",
    "text": "This is a new comment",
    "authorId": "user-uuid-123",
    "parentId": null,
    "likes": 0,
    "dislikes": 0,
    "isDeleted": false,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### GET /comments/:id
Retrieve a specific comment by ID.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "comment-uuid-123",
    "text": "This is a sample comment",
    "authorId": "user-uuid-123",
    "parentId": null,
    "likes": 5,
    "dislikes": 1,
    "isDeleted": false,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### PUT /comments/:id
Update an existing comment.

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request:**
```json
{
  "text": "This is an updated comment"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Comment updated successfully",
  "data": {
    "id": "comment-uuid-123",
    "text": "This is an updated comment",
    "authorId": "user-uuid-123",
    "parentId": null,
    "likes": 5,
    "dislikes": 1,
    "isDeleted": false,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:31:00.000Z"
  },
  "timestamp": "2024-01-15T10:31:00.000Z"
}
```

#### DELETE /comments/:id
Soft delete a comment.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Comment deleted successfully",
  "timestamp": "2024-01-15T10:32:00.000Z"
}
```

### Comment Interactions

#### POST /comments/:id/like
Like a comment.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Comment liked successfully",
  "data": {
    "id": "comment-uuid-123",
    "text": "This is a sample comment",
    "authorId": "user-uuid-123",
    "parentId": null,
    "likes": 6,
    "dislikes": 1,
    "isDeleted": false,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:33:00.000Z"
  },
  "timestamp": "2024-01-15T10:33:00.000Z"
}
```

#### POST /comments/:id/dislike
Dislike a comment.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Comment disliked successfully",
  "data": {
    "id": "comment-uuid-123",
    "text": "This is a sample comment",
    "authorId": "user-uuid-123",
    "parentId": null,
    "likes": 6,
    "dislikes": 2,
    "isDeleted": false,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:34:00.000Z"
  },
  "timestamp": "2024-01-15T10:34:00.000Z"
}
```

### Comment Search

#### GET /comments/search
Search comments by text content.

**Query Parameters:**
- `q` (required): Search query text
- `limit` (optional): Number of results (default: 20, max: 100)
- `page` (optional): Page number (default: 1)

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "comment-uuid-123",
      "text": "This is a sample comment",
      "authorId": "user-uuid-123",
      "parentId": null,
      "likes": 6,
      "dislikes": 2,
      "isDeleted": false,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:34:00.000Z"
    }
  ],
  "meta": {
    "query": "sample",
    "totalResults": 1,
    "page": 1,
    "limit": 20
  },
  "timestamp": "2024-01-15T10:35:00.000Z"
}
```

---

## User Management Service

**Base URL:** `http://localhost:3002/api`

### User CRUD Operations

#### GET /users
Retrieve all users with pagination.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `role` (optional): Filter by user role
- `isActive` (optional): Filter by active status

**Response (200):**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "user-uuid-123",
        "email": "user@example.com",
        "firstName": "John",
        "lastName": "Doe",
        "isActive": true,
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z",
        "roles": ["user"]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "pages": 1
    }
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "service": "user-management",
    "version": "1.0.0"
  }
}
```

#### POST /users
Create a new user.

**Headers:**
```
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json
```

**Request:**
```json
{
  "email": "newuser@example.com",
  "firstName": "Jane",
  "lastName": "Smith",
  "isActive": true,
  "roles": ["user"]
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "id": "user-uuid-456",
    "email": "newuser@example.com",
    "firstName": "Jane",
    "lastName": "Smith",
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z",
    "roles": ["user"]
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "service": "user-management",
    "version": "1.0.0"
  }
}
```

#### GET /users/:id
Retrieve a specific user by ID.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "user-uuid-123",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z",
    "roles": ["user"]
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "service": "user-management",
    "version": "1.0.0"
  }
}
```

#### PUT /users/:id
Update an existing user.

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request:**
```json
{
  "firstName": "Johnny",
  "lastName": "Doe"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "User updated successfully",
  "data": {
    "id": "user-uuid-123",
    "email": "user@example.com",
    "firstName": "Johnny",
    "lastName": "Doe",
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:36:00.000Z",
    "roles": ["user"]
  },
  "meta": {
    "timestamp": "2024-01-15T10:36:00.000Z",
    "service": "user-management",
    "version": "1.0.0"
  }
}
```

#### DELETE /users/:id
Deactivate a user account.

**Headers:**
```
Authorization: Bearer <admin_jwt_token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "User deactivated successfully",
  "meta": {
    "timestamp": "2024-01-15T10:37:00.000Z",
    "service": "user-management",
    "version": "1.0.0"
  }
}
```

---

## Sahab Service

**Base URL:** `http://localhost:3003/api`

### Service Health

#### GET /health
Check sahab service health status.

**Response (200):**
```json
{
  "status": "OK",
  "service": "sahab-service",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "1.0.0"
}
```

---

## Response Format Standards

All API responses follow a consistent format across services:

### Success Response Structure
```json
{
  "success": true,
  "message": "Optional success message",
  "data": {
    // Response data object or array
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "service": "service-name",
    "version": "x.x.x"
  }
}
```

### Error Response Structure
```json
{
  "success": false,
  "error": "Error message description",
  "details": {
    // Optional error details object
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Pagination Structure
```json
{
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### Required Fields for All Entities

#### Users
- `id`: Unique identifier
- `email`: User email address
- `createdAt`: ISO 8601 timestamp
- `updatedAt`: ISO 8601 timestamp
- `isActive`: Boolean status

#### Comments
- `id`: Unique identifier
- `text`: Comment content
- `authorId`: User ID who created the comment
- `createdAt`: ISO 8601 timestamp
- `updatedAt`: ISO 8601 timestamp
- `likes`: Number of likes
- `dislikes`: Number of dislikes

---

## Error Handling

### HTTP Status Codes

| Code | Description | Usage |
|------|-------------|-------|
| 200 | OK | Successful GET, PUT requests |
| 201 | Created | Successful POST requests |
| 204 | No Content | Successful DELETE requests |
| 400 | Bad Request | Invalid request data |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource already exists |
| 422 | Unprocessable Entity | Validation errors |
| 429 | Too Many Requests | Rate limiting exceeded |
| 500 | Internal Server Error | Server-side errors |

### Common Error Responses

#### Validation Error (400)
```json
{
  "success": false,
  "error": "Validation failed",
  "details": {
    "field": "email",
    "message": "Invalid email format",
    "value": "invalid-email"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### Authentication Error (401)
```json
{
  "success": false,
  "error": "Authentication required",
  "details": {
    "message": "No valid token provided"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### Authorization Error (403)
```json
{
  "success": false,
  "error": "Insufficient permissions",
  "details": {
    "required": "admin",
    "current": "user"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### Rate Limiting (429)
```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "details": {
    "limit": 100,
    "window": "1 hour",
    "retryAfter": 3600
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## Testing Summary

### Test Coverage Results

#### Gateway API
- **Unit Tests**: ✅ Authentication flow, JWT handling, user management
- **Integration Tests**: ⚠️ Service routing, middleware integration
- **E2E Tests**: ✅ Complete user registration and authentication workflow
- **Coverage**: ~75% (excluding routing logic)

#### Comments Service
- **Unit Tests**: ✅ Comment utils, validation, controller logic
- **Integration Tests**: ⚠️ Database operations, API endpoints
- **E2E Tests**: ✅ Full CRUD workflow, search functionality
- **Coverage**: ~80% (core functionality tested)

#### User Management Service
- **Unit Tests**: ⚠️ Service logic, repository pattern
- **Integration Tests**: ⚠️ Database integration, role management
- **E2E Tests**: ❌ Pending implementation
- **Coverage**: ~40% (basic structure tested)

#### Sahab Service
- **Unit Tests**: ❌ Pending implementation
- **Integration Tests**: ❌ Pending implementation
- **E2E Tests**: ❌ Pending implementation
- **Coverage**: ~10% (health check only)

### Key Test Scenarios Covered

#### Authentication & Authorization
- ✅ User registration with validation
- ✅ User login with JWT token generation
- ✅ Token refresh functionality
- ✅ Profile retrieval with authentication
- ✅ Admin-only endpoints access control
- ✅ Invalid token handling
- ✅ Missing authorization header handling

#### Comments Management
- ✅ Comment creation with validation
- ✅ Comment retrieval with pagination
- ✅ Comment updates and deletion
- ✅ Like/dislike functionality
- ✅ Comment search by text
- ✅ Reply comments with parent-child relationships
- ✅ HTML sanitization and XSS prevention
- ✅ Unicode text handling

#### Data Validation
- ✅ Email format validation
- ✅ Password strength requirements
- ✅ Text length constraints
- ✅ SQL injection prevention
- ✅ Malformed JSON handling
- ✅ Rate limiting enforcement

#### Security Features
- ✅ CORS preflight request handling
- ✅ JWT token validation
- ✅ Role-based access control
- ✅ Input sanitization
- ✅ Error message sanitization

### Performance Testing
- ✅ Concurrent request handling
- ✅ Response time validation (<500ms for simple operations)
- ✅ Bulk operation efficiency
- ✅ Database connection pooling

### Known Issues & Limitations

1. **Service Routing**: Gateway service routing to microservices needs configuration
2. **Database Migrations**: Automated migration scripts need enhancement
3. **Rate Limiting**: Advanced rate limiting rules need implementation
4. **Monitoring**: Comprehensive logging and monitoring needs setup
5. **Documentation**: API documentation auto-generation from code

### Recommendations

1. Implement comprehensive integration tests for all services
2. Add performance benchmarking and load testing
3. Enhance error handling and logging across services
4. Implement API versioning strategy
5. Add comprehensive monitoring and health checks
6. Implement automated database backup and recovery
7. Add API documentation auto-generation tools

---

## Development & Testing Commands

### Running Services
```bash
# Start all services
pnpm run dev

# Start individual services
cd packages/gateway-api && npm start
cd apps/recruitment/comments && npm start
cd apps/recruitment/user-management && npm start
cd apps/recruitment/sahab && npm start
```

### Running Tests
```bash
# Run all tests
pnpm test

# Run tests for specific service
cd packages/gateway-api && npm test
cd apps/recruitment/comments && npm test
cd apps/recruitment/user-management && npm test
```

### Database Operations
```bash
# Push database schema
cd packages/gateway-api && npx prisma db push
cd apps/recruitment/comments && npx prisma db push
cd apps/recruitment/user-management && npx prisma db push

# View database in Prisma Studio
npx prisma studio
```

---

*Last Updated: 2024-01-15*
*Version: 2.0.0*