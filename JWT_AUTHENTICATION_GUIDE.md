# 🔐 JWT Authentication & User Data Isolation Guide

## 📋 **Overview**

All services in this workspace now require **JWT authentication** with comprehensive **user data isolation**. Each user can only access their own data, while admins have full access to all data.

## 🏗️ **Architecture**

```mermaid
graph TD
    A[Client] -->|JWT Token| B[API Gateway]
    B -->|Validates JWT| C[Auth Middleware]
    C -->|Forwards Headers| D[Comments Service]
    C -->|Forwards Headers| E[User Management]
    C -->|Forwards Headers| F[Sahab Service]
    
    D -->|User Context| G[User-Aware Repository]
    E -->|User Context| H[User-Aware Repository]
    F -->|User Context| I[In-Memory Storage]
    
    G -->|Filtered Data| J[Database]
    H -->|Filtered Data| J
```

## 🔑 **Authentication Flow**

### 1. **User Login**
```bash
POST /auth/login
{
  "email": "user@example.com", 
  "password": "password123"
}

Response:
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { "id": "123", "email": "user@example.com", "roles": ["user"] }
}
```

### 2. **Request with JWT**
```bash
GET /part/recruitment/comments
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. **Gateway Processing**
- ✅ Validates JWT token
- ✅ Extracts user information
- ✅ Forwards request with headers:
  ```
  X-User-ID: 123
  X-User-Email: user@example.com
  X-User-Roles: ["user"]
  X-Request-ID: req-456
  X-Service-Name: comments
  ```

### 4. **Service Processing**
- ✅ Extracts user context from headers
- ✅ Applies data filtering based on user ownership
- ✅ Returns only user's data (or all data for admins)

## 🔒 **Data Isolation Rules**

### **User Access:**
- ✅ **Can create** their own data
- ✅ **Can read** their own data
- ✅ **Can update** their own data
- ✅ **Can delete** their own data
- ❌ **Cannot access** other users' data

### **Admin Access:**
- ✅ **Can read** all users' data
- ✅ **Can update** all users' data
- ✅ **Can delete** all users' data
- ✅ **Can create** data for any user

## 🛡️ **Security Implementation**

### **Gateway Level**
```javascript
// ALL routes require JWT (except auth endpoints)
serviceProtection: {
  '/part/recruitment/comments': {
    enabled: true,
    requireAuth: true,
    requireRoles: ['user', 'admin']
  },
  '/part/recruitment/users': {
    enabled: true, 
    requireAuth: true,
    requireRoles: ['user', 'admin']
  },
  '/part/recruitment/sahab': {
    enabled: true,
    requireAuth: true, 
    requireRoles: ['user', 'admin']
  }
}
```

### **Service Level**
```javascript
// User context middleware on every route
fastify.addHook('preHandler', extractUserContext);

// Protected endpoints
fastify.get('/data', {
  preHandler: [requireAuth],
  // ... route handler
});
```

### **Data Layer**
```javascript
// Automatic user filtering in repositories
applyUserFilter(where, userId, isPublic, isAdmin) {
  if (!isPublic && userId && !isAdmin) {
    where.userId = userId; // Only user's data
  }
  return where;
}
```

## 📊 **Service Details**

### 🗨️ **Comments Service**
| Endpoint | Method | Auth | Access Rule |
|----------|--------|------|-------------|
| `GET /comments` | GET | Required | User sees own, Admin sees all |
| `GET /comments/my` | GET | Required | User's private comments only |
| `POST /comments` | POST | Required | Creates with user ID |
| `PUT /comments/:id` | PUT | Required | Owner or admin only |
| `DELETE /comments/:id` | DELETE | Required | Owner or admin only |

### 👥 **User Management Service**
| Endpoint | Method | Auth | Access Rule |
|----------|--------|------|-------------|
| `GET /users` | GET | Required | User sees profile, Admin sees all |
| `GET /users/me` | GET | Required | Current user profile |
| `GET /users/:id` | GET | Required | Own profile or admin only |
| `PUT /users/:id` | PUT | Required | Own profile or admin only |
| `DELETE /users/:id` | DELETE | Required | Admin only |

### 🏢 **Sahab Service** 
| Endpoint | Method | Auth | Access Rule |
|----------|--------|------|-------------|
| `GET /data` | GET | Required | User sees own, Admin sees all |
| `POST /data` | POST | Required | Creates with user ID |
| `PUT /data/:id` | PUT | Required | Owner or admin only |
| `DELETE /data/:id` | DELETE | Required | Owner or admin only |

## 🧪 **Testing**

### **Run Authentication Tests**
```bash
# Install axios if not already installed
npm install axios

# Run the test script
node test-jwt-auth.js
```

### **Manual Testing**

#### 1. **Login as User**
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"user123"}'
```

#### 2. **Use Token for Protected Requests**
```bash
# Get user's comments
curl -X GET http://localhost:3000/part/recruitment/comments \
  -H "Authorization: Bearer YOUR_TOKEN"

# Create comment  
curl -X POST http://localhost:3000/part/recruitment/comments \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text":"My comment","parentId":null}'

# Access without token (should fail)
curl -X GET http://localhost:3000/part/recruitment/comments
```

## 🔧 **Implementation Components**

### **Shared Auth Package** (`/packages/shared/auth/`)
- ✅ `userContext.js` - Universal user context middleware
- ✅ `middleware.js` - Legacy auth middleware
- ✅ `index.js` - Exports all auth functions

### **User-Aware Repository** (`/packages/shared/repositories/`)
- ✅ `userAwareRepository.js` - Base class with automatic user filtering
- ✅ `baseRepository.js` - Standard repository base class

### **Gateway Configuration** (`/packages/gateway-api/config/`)
- ✅ `auth.config.js` - JWT settings and service protection rules
- ✅ All routes require authentication by default

### **Service Integration**
- ✅ **Comments**: Full JWT auth + user data isolation
- ✅ **User Management**: Profile access + admin controls
- ✅ **Sahab**: Complete CRUD with user isolation

## 🚀 **Usage Examples**

### **Creating User-Isolated Data**
```javascript
// In your service
import { UserAwareRepository } from '@app/shared/repositories';

class MyRepository extends UserAwareRepository {
  constructor() {
    super(prisma, {
      modelName: 'myModel',
      userField: 'userId', // Field that links to user
      logContext: 'MyRepository'
    });
  }
}

// Automatically filters by user
const userRecords = await repo.getUserFilteredRecords(options, userContext);
const newRecord = await repo.createUserRecord(data, userContext);
```

### **Adding Auth to Routes**
```javascript
import { extractUserContext, requireAuth } from '@app/shared/auth';

// Apply to all routes
fastify.addHook('preHandler', extractUserContext);

// Protected endpoint
fastify.get('/protected', {
  preHandler: [requireAuth],
  // ... handler
});
```

### **Checking User Permissions**
```javascript
import { getUserContext, isAdmin, isOwnerOrAdmin } from '@app/shared/auth';

// In route handler
const userContext = getUserContext(request);
const adminAccess = isAdmin(request);
const canAccess = isOwnerOrAdmin(request, resourceUserId);
```

## ⚡ **Key Benefits**

✅ **Enterprise Security** - JWT-based authentication with role-based access  
✅ **Data Isolation** - Users only see their own data automatically  
✅ **Admin Control** - Admins have full system access  
✅ **Scalable Architecture** - Easy to add new services  
✅ **Comprehensive Testing** - Automated test suite included  
✅ **Zero Trust** - All endpoints require authentication  
✅ **Request Tracing** - Full request tracking across services  

## 🔄 **Migration Impact**

### **Breaking Changes:**
- ❌ **All APIs now require JWT tokens**
- ❌ **Public access removed** (except auth endpoints)
- ❌ **Anonymous requests rejected** with 401 Unauthorized

### **Data Access Changes:**
- ✅ **Users see only their data** (privacy by design)
- ✅ **Admins see all data** (administrative access)
- ✅ **Automatic user assignment** on data creation

### **Frontend Updates Needed:**
1. **Add JWT token** to all API requests
2. **Handle 401 errors** and redirect to login
3. **Store tokens securely** (localStorage/cookies)
4. **Implement token refresh** logic
5. **Update error handling** for 403 Forbidden

## 🛠️ **Development Setup**

### **Environment Variables**
```bash
# Gateway (.env)
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# Services inherit gateway headers
# No additional JWT config needed
```

### **Running the System**
```bash
# Start all services
pnpm dev

# Test authentication
node test-jwt-auth.js

# Check gateway status
curl http://localhost:3000/health
```

---

🎉 **Your system now has enterprise-grade JWT authentication with complete user data isolation!** Every user can only access their own data, while maintaining admin capabilities for system management.