# Plop Templates - Microservice Generator

Ready-to-use templates for generating high-performance microservices with **shared core architecture**, authentication, and best practices built-in.

## 🚀 Features

### ✨ **Shared Core Integration**
- **Authentication**: Built-in JWT authentication using `@shared/core/auth`
- **Constants**: Centralized HTTP status codes, API messages, and configuration
- **Response Utilities**: Consistent API response formatting
- **SSOT Principle**: Single Source of Truth for all common functionality

### 🔧 **Production-Ready Setup**
- **Fastify Framework**: High-performance web framework (3x faster than Express)
- **Modern ES Modules**: Full ES6+ support with proper Jest configuration
- **Database Integration**: Optional Prisma ORM with PostgreSQL/SQLite support
- **API Documentation**: Swagger/OpenAPI with interactive UI
- **Testing**: Comprehensive Jest setup with coverage thresholds
- **Development Tools**: ESLint, Prettier, Nodemon, and more

### 🛡️ **Security & Performance**
- **Rate Limiting**: Built-in request rate limiting
- **CORS**: Cross-origin resource sharing configuration
- **Helmet**: Security headers middleware
- **Input Validation**: Zod schema validation
- **Error Handling**: Structured error responses

## 📋 Prerequisites

- Node.js 18+
- pnpm 8+
- Plop CLI (`npm install -g plop`)

## 🚀 Quick Start

### 1. Generate a New Microservice

```bash
# From workspace root
pnpm plop microservice

# Follow the interactive prompts:
# ✓ Service name: my-service
# ✓ Description: My awesome microservice
# ✓ Default port: 3002
# ✓ Include authentication? Yes
# ✓ Include database? Yes
```

### 2. Generated Structure

```
apps/my-service/
├── src/
│   ├── routes/
│   │   ├── auth.js          # Authentication endpoints (if enabled)
│   │   └── my-service.js    # CRUD endpoints with pagination
│   ├── server-instance.js   # Fastify server factory
│   └── index.js            # Entry point
├── tests/
│   └── setup.js            # Test configuration
├── envs/
│   └── env.example         # Environment variables template
├── package.json            # Dependencies with shared core
├── jest.config.cjs         # Jest configuration
├── Dockerfile              # Container deployment
└── README.md               # Service documentation
```

### 3. Ready-to-Use Features

#### 🔐 **Authentication (if enabled)**
```javascript
// Automatic JWT authentication endpoints
POST /auth/register        // User registration
POST /auth/login          // User login  
GET  /auth/profile        // Get user profile (protected)
POST /auth/validate-token // Token validation
```

#### 📊 **CRUD Operations**
```javascript
// Full CRUD with pagination and search
GET    /api/my-service?page=1&limit=20&search=term
GET    /api/my-service/:id
POST   /api/my-service
PUT    /api/my-service/:id
DELETE /api/my-service/:id
```

#### 🔍 **API Documentation**
- Swagger UI: `http://localhost:3002/api-docs`
- OpenAPI spec with authentication, schemas, and examples

### 4. Development Commands

```bash
# Install dependencies
pnpm install

# Database setup (if enabled)
pnpm db:generate
pnpm db:push
pnpm db:seed

# Development
pnpm dev                 # Start with hot reload
pnpm docs:dev           # Start with documentation generation

# Testing
pnpm test               # Run all tests
pnpm test:unit          # Unit tests only
pnpm test:coverage      # Coverage report

# Code quality
pnpm lint               # ESLint check
pnpm format             # Prettier formatting
```

## 🏗️ Architecture Benefits

### **Before (Traditional)**
```javascript
// Each service duplicates authentication logic
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Custom authentication middleware
app.use(async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  // ... 50+ lines of JWT verification code
});

// Manual response formatting
res.status(200).json({
  success: true,
  data: results,
  // ... inconsistent response structure
});
```

### **After (Shared Core)**
```javascript
// Leverage centralized authentication
import { authPlugin, jwtService, passwordService } from '@shared/core/auth';
import { HTTP_STATUS, API_MESSAGES } from '@shared/core/constants';
import { sendSuccessResponse } from '@shared/core/utils';

// One-line authentication setup
await fastify.register(authPlugin);

// Protected routes with single decorator
fastify.get('/protected', {
  preHandler: fastify.authenticate
}, handler);

// Consistent responses with shared utilities
return sendSuccessResponse(reply, data, API_MESSAGES.SUCCESS.RECORDS_RETRIEVED);
```

## 📊 Template Options

### **Authentication** (`includeAuth: true`)
- ✅ JWT authentication with shared services
- ✅ Register, login, profile endpoints
- ✅ Protected route decorators
- ✅ Bearer token security in Swagger
- ✅ Password hashing with shared service

### **Database** (`includeDatabase: true`)
- ✅ Prisma ORM integration
- ✅ Database migrations and seeding
- ✅ Connection management
- ✅ SQLite (dev) / PostgreSQL (prod) support

### **Documentation**
- ✅ Swagger UI with interactive testing
- ✅ OpenAPI 3.0 specifications
- ✅ Authentication schemes
- ✅ Request/response examples

## 🛠️ Customization

### Adding Custom Routes
```javascript
// src/routes/my-service.js
export default async function myServiceRoutes(fastify, options) {
  // Use shared constants
  fastify.get('/custom', {
    preHandler: fastify.authenticate, // Shared auth
    schema: { /* OpenAPI schema */ }
  }, async (request, reply) => {
    // Use shared response utilities
    return sendSuccessResponse(reply, data, 'Custom success message');
  });
}
```

### Environment Configuration
```bash
# envs/.env
PORT=3002
JWT_SECRET=your-secret-key
DATABASE_URL=postgresql://user:pass@localhost:5432/db
LOG_LEVEL=info
```

## 🔧 Advanced Features

### **Shared Services Usage**
```javascript
// Password handling
import { passwordService } from '@shared/core/auth';
const hashedPassword = await passwordService.hashPassword(plainPassword);
const isValid = await passwordService.verifyPassword(plainPassword, hash);

// JWT management  
import { jwtService } from '@shared/core/auth';
const tokenData = jwtService.createUserToken(user);
const decoded = jwtService.validateTokenAndGetUser(token);

// Response formatting
import { createPaginatedResponse } from '@shared/core/utils';
const response = createPaginatedResponse(data, pagination);
```

### **Testing Setup**
```javascript
// Automatic test setup with shared mocks
describe('My Service', () => {
  let app;
  
  beforeAll(async () => {
    app = await createFastifyServer({ logger: false });
  });
  
  afterAll(async () => {
    await app.close();
  });
  
  test('should authenticate user', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'test@example.com', password: 'password' }
    });
    
    expect(response.statusCode).toBe(200);
    expect(response.json().data.token).toBeDefined();
  });
});
```

## 🎯 Best Practices Included

1. **🔒 Security First**: Built-in authentication, input validation, and security headers
2. **📊 Observability**: Structured logging, health checks, and error tracking  
3. **🚀 Performance**: Fastify framework, request rate limiting, and optimized responses
4. **🧪 Testability**: Comprehensive Jest setup with coverage requirements
5. **📖 Documentation**: Auto-generated Swagger docs with authentication
6. **🔄 Consistency**: Shared utilities ensure uniform API responses
7. **⚡ Developer Experience**: Hot reload, linting, formatting, and type safety

## 🔗 Related Documentation

- [Shared Core Architecture](../../packages/shared/README.md)
- [Authentication Guide](../../JWT_AUTHENTICATION_GUIDE.md)
- [API Architecture](../../API_ARCHITECTURE.md)
- [Deployment Guide](../../docs/setup/DEPLOYMENT_GUIDE.md)

---

**Generated services are production-ready with authentication, documentation, testing, and shared core integration built-in. Start building your microservice in minutes, not hours!** 🚀