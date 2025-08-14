# Shared Utilities - Error Handling & Logging

This directory contains shared utilities for error handling and logging across all applications in the workspace.

## 🚨 Error Handling System

### **Custom Error Classes**

```javascript
import { 
  AppError, 
  ValidationError, 
  NotFoundError, 
  DatabaseError,
  BusinessLogicError 
} from '../shared/utils/errors.js';

// Create custom errors
throw new ValidationError('Invalid input data', { field: 'email', value: 'invalid' });
throw new NotFoundError('User not found', { userId: '123' });
throw new DatabaseError('Connection failed', { host: 'localhost', port: 5432 });
```

### **Prisma Error Handling**

```javascript
import { createErrorFromPrisma } from '../shared/utils/errors.js';

try {
  const user = await prisma.user.create({ data: userData });
} catch (error) {
  if (error.code && error.code.startsWith('P')) {
    throw createErrorFromPrisma(error);
  }
  throw error;
}
```

### **Validation Error Handling**

```javascript
import { createErrorFromValidation } from '../shared/utils/errors.js';

const validation = validate(data, rules);
const validationError = createErrorFromValidation(validation);
if (validationError) {
  throw validationError;
}
```

## 📝 Logging System

### **Basic Usage**

```javascript
import { createAppLogger } from '../shared/utils/logger.js';

const logger = createAppLogger('MyApp');

// Different log levels
logger.error('Critical error occurred', { userId: '123' }, error);
logger.warn('Warning message', { data: 'some info' });
logger.info('Information message', { action: 'user_login' });
logger.debug('Debug information', { requestId: 'abc123' });
logger.trace('Very detailed trace', { step: 'validation' });
```

### **Specialized Logging**

```javascript
// HTTP request logging
logger.logRequest(req, res, 150); // 150ms response time

// Database operation logging
logger.logDatabase('SELECT', 'users', 25); // 25ms duration

// Authentication logging
logger.logAuth('login', 'user123', true, { ip: '192.168.1.1' });

// Business logic logging
logger.logBusiness('comment_created', 'Comment', 'comment456', { userId: 'user123' });
```

### **Logger Configuration**

```javascript
const logger = new Logger({
  appName: 'MyApp',
  level: 'DEBUG', // ERROR, WARN, INFO, DEBUG, TRACE
  enableColors: true,
  enableTimestamp: true,
  enableCaller: true,
  outputToFile: false
});

// Change log level at runtime
logger.setLevel('DEBUG');
```

## 🔧 Error Handling Middleware

### **Setup in Express App**

```javascript
import { setupErrorHandling } from '../shared/middleware/errorHandler.js';

// Setup error handling with options
setupErrorHandling(app, {
  handleValidation: true,
  handleDatabase: true,
  handleRateLimit: true,
  handleSecurity: true
});
```

### **Async Error Wrapper**

```javascript
import { asyncHandler } from '../shared/middleware/errorHandler.js';

// Wrap async route handlers to eliminate try-catch
router.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await userService.getUser(req.params.id);
  res.json(user);
}));
```

## 🌍 Environment Configuration

### **Environment Variables**

```bash
# Log level
LOG_LEVEL=DEBUG  # ERROR, WARN, INFO, DEBUG, TRACE

# Node environment
NODE_ENV=development  # Affects colors and caller info
```

### **Development vs Production**

- **Development**: Colors enabled, caller info shown, stack traces included
- **Production**: Colors disabled, caller info hidden, stack traces hidden

## 📊 Log Output Examples

### **Info Level**
```
[2024-01-15T10:30:45.123Z] [MyApp] [INFO] [server.js:45] User login successful { userId: 'user123', ip: '192.168.1.1' }
```

### **Error Level**
```
[2024-01-15T10:30:45.123Z] [MyApp] [ERROR] [database.js:67] Database connection failed { host: 'localhost', port: 5432 }
Stack: Error: connect ECONNREFUSED 127.0.0.1:5432
    at TCPConnectWrap.afterConnect [as oncomplete] (net.js:1146:16)
```

### **Debug Level**
```
[2024-01-15T10:30:45.123Z] [MyApp] [DEBUG] [service.js:23] Processing user request { requestId: 'req456', method: 'GET' }
```

## 🎯 Best Practices

### **Error Handling**
1. **Use specific error types** instead of generic Error
2. **Include relevant context** in error details
3. **Handle Prisma errors** with createErrorFromPrisma
4. **Validate input** and throw ValidationError for invalid data

### **Logging**
1. **Use appropriate log levels** for different types of information
2. **Include structured data** for better debugging
3. **Log at entry/exit points** of major functions
4. **Use child loggers** for different components

### **Performance**
1. **Check log level** before expensive operations
2. **Use debug/trace** for detailed information
3. **Avoid logging sensitive data** (passwords, tokens)
4. **Consider file logging** for production environments

## 🔄 Integration with Existing Code

### **Replace Console.log**
```javascript
// Before
console.log('User logged in:', userId);

// After
logger.info('User logged in', { userId });
```

### **Replace Error Throwing**
```javascript
// Before
const error = new Error('User not found');
error.statusCode = 404;
throw error;

// After
throw new NotFoundError('User not found', { userId });
```

### **Replace Try-Catch**
```javascript
// Before
try {
  const result = await someAsyncOperation();
  return result;
} catch (error) {
  console.error('Operation failed:', error);
  throw error;
}

// After
return await someAsyncOperation();
// Errors are automatically caught and logged by middleware
```
