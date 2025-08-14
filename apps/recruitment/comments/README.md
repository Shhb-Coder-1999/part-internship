# 🚀 Comments App - Refactored & Enhanced

A modern, scalable comments API built with Express.js, Prisma ORM, and SQLite. This app demonstrates enterprise-grade architecture with best practices, comprehensive error handling, and clean code principles.

## ✨ **Features**

- **🔒 Robust Error Handling**: Custom error classes with automatic HTTP status codes
- **📝 Structured Logging**: Centralized logging with context and levels
- **✅ Input Validation**: Comprehensive validation with detailed error messages
- **🛡️ Rate Limiting**: Anti-spam protection with configurable limits
- **🗄️ Database Layer**: Prisma ORM with SQLite for persistence
- **🧹 Clean Architecture**: Separation of concerns with services, controllers, and utilities
- **🔧 Development Tools**: ESLint, Prettier, and code quality enforcement

## 🏗️ **Architecture Overview**

```
src/
├── constants/          # Centralized configuration & constants
├── controllers/        # HTTP request/response handling
├── middleware/         # Request validation & processing
├── routes/            # API endpoint definitions
├── services/          # Business logic layer
├── utils/             # Reusable utility functions
└── database/          # Database operations (Prisma)
```

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js 18+ 
- pnpm/npm/yarn

### **1. Install Dependencies**
```bash
pnpm install
```

### **2. Setup Database**
```bash
# Generate Prisma client
pnpm db:generate

# Push schema to database
pnpm db:push

# Seed with sample data
pnpm db:seed
```

### **3. Start Development Server**
```bash
# Development mode with auto-reload
pnpm dev

# Production mode
pnpm start
```

## 🛠️ **Development Commands**

```bash
# Code Quality
pnpm lint              # Check for linting issues
pnpm lint:fix          # Auto-fix linting issues
pnpm format            # Format code with Prettier
pnpm format:check      # Check code formatting

# Database Operations
pnpm db:generate       # Generate Prisma client
pnpm db:push          # Push schema changes
pnpm db:studio        # Open Prisma Studio
pnpm db:seed          # Seed database

# Testing & Setup
pnpm test             # Run API tests
pnpm setup            # Automated setup process
```

## 🔧 **Configuration**

### **Environment Variables**
```bash
PORT=3000                    # Server port
HOST=0.0.0.0               # Server host
NODE_ENV=development        # Environment
LOG_LEVEL=INFO             # Logging level
```

### **Constants & Configuration**
All configuration is centralized in `src/constants/index.js`:

- **HTTP Status Codes**: Standardized response codes
- **Validation Rules**: Business logic constraints
- **API Messages**: Consistent response messages
- **Database Config**: Connection and field mappings
- **Rate Limiting**: Anti-spam configuration

## 📚 **Code Quality & Best Practices**

### **1. DRY Principles (Don't Repeat Yourself)**
- **Centralized Constants**: All configuration in one place
- **Utility Functions**: Reusable validation and processing logic
- **Shared Middleware**: Common functionality across routes

### **2. Separation of Concerns**
- **Controllers**: Handle HTTP requests/responses only
- **Services**: Contain business logic
- **Database Layer**: Abstract data access
- **Utilities**: Reusable helper functions

### **3. Error Handling**
- **Custom Error Classes**: Type-safe error handling
- **Automatic Status Codes**: HTTP codes based on error type
- **Structured Logging**: Context-rich error information
- **Global Middleware**: Centralized error processing

### **4. Input Validation**
- **Utility Functions**: Reusable validation logic
- **Detailed Error Messages**: Clear feedback for developers
- **Sanitization**: HTML tag removal and text cleaning
- **Rate Limiting**: Anti-spam protection

## 🔍 **API Endpoints**

### **Comments**
```
GET    /api/comments           # List all comments
POST   /api/comments           # Create new comment
PATCH  /api/comments/:id       # Update comment
DELETE /api/comments/:id       # Soft delete comment
POST   /api/comments/:id/like  # Like comment
POST   /api/comments/:id/dislike # Dislike comment
```

### **Query Parameters**
```
?parentId=123          # Filter by parent comment
?includeDeleted=true   # Include deleted comments
```

## 🗄️ **Database Schema**

### **Comment Model**
```prisma
model Comment {
  id        String   @id @default(cuid())
  userId    String
  text      String
  likes     Int      @default(0)
  dislikes  Int      @default(0)
  parentId  String?
  isDeleted Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  parent   Comment?  @relation("CommentReplies", fields: [parentId], references: [id])
  replies  Comment[] @relation("CommentReplies")
}
```

## 🧪 **Testing**

### **Run Tests**
```bash
pnpm test
```

### **Test Coverage**
- API endpoint testing
- Validation logic testing
- Error handling verification
- Database operation testing

## 📊 **Monitoring & Logging**

### **Log Levels**
- **ERROR**: Application errors and failures
- **WARN**: Warning conditions
- **INFO**: General information
- **DEBUG**: Detailed debugging information
- **TRACE**: Very detailed tracing

### **Log Contexts**
- **CommentsAPI**: Service layer operations
- **CommentsController**: HTTP request handling
- **CommentsDB**: Database operations
- **CommentValidation**: Input validation
- **CommentRateLimit**: Rate limiting events

## 🚀 **Deployment**

### **Production Considerations**
- **Environment Variables**: Secure configuration
- **Database**: Production-ready database (PostgreSQL/MySQL)
- **Rate Limiting**: Redis-based rate limiting
- **Logging**: Structured logging to external services
- **Monitoring**: Health checks and metrics

### **Docker Support**
```bash
# Build image
docker build -t comments-app .

# Run container
docker run -p 3000:3000 comments-app
```

## 🔒 **Security Features**

- **Input Sanitization**: HTML tag removal
- **Rate Limiting**: Anti-spam protection
- **Validation**: Comprehensive input validation
- **Error Handling**: No sensitive information leakage
- **CORS**: Configurable cross-origin policies

## 📈 **Performance Optimizations**

- **Database Indexing**: Optimized Prisma queries
- **Connection Pooling**: Efficient database connections
- **Caching**: Rate limit data management
- **Async Operations**: Non-blocking request processing

## 🤝 **Contributing**

### **Code Style**
- **ESLint**: JavaScript linting rules
- **Prettier**: Code formatting
- **Import Ordering**: Organized imports
- **Documentation**: JSDoc comments

### **Development Workflow**
1. **Fork** the repository
2. **Create** feature branch
3. **Implement** changes with tests
4. **Run** linting and formatting
5. **Submit** pull request

## 📝 **Changelog**

### **v2.0.0 - Refactored Architecture**
- ✨ **New**: Centralized constants and configuration
- 🔧 **New**: Utility functions for common operations
- 🧹 **Improved**: Cleaner, more maintainable code
- 🛠️ **New**: ESLint and Prettier configuration
- 📚 **New**: Comprehensive documentation
- 🚀 **Improved**: Better error handling and logging

### **v1.0.0 - Initial Release**
- 🎯 **Basic**: CRUD operations for comments
- 🗄️ **Database**: Prisma + SQLite integration
- 🔒 **Security**: Basic validation and rate limiting

## 📞 **Support**

- **Issues**: GitHub Issues
- **Documentation**: This README
- **Examples**: See `test/` directory
- **API Docs**: Swagger documentation available

## 📄 **License**

MIT License - see LICENSE file for details

---

**🎉 You're all set!** Your comments app now follows enterprise-grade best practices with clean, maintainable, and extensible code.
