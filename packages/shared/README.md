# Shared Modules

This directory contains reusable modules and utilities that can be shared across all applications in the monorepo.

## Structure

```
shared/
├── auth/           # Authentication utilities and middleware
├── config/         # Configuration management
├── constants/      # Common constants and enums
├── controllers/    # Base controller classes
├── database/       # Database connection and utilities
├── middleware/     # Common middleware functions
├── services/       # Base service classes
└── utils/          # Utility functions and helpers
```

## Available Modules

### Constants (`shared/constants/`)

Common constants used across applications:

- **HTTP_STATUS**: Standard HTTP status codes
- **VALIDATION_RULES**: Common validation patterns
- **DB_CONFIG**: Database configuration constants
- **API_MESSAGES**: Standard API response messages
- **LOG_CONTEXTS**: Logging context identifiers
- **PRISMA_ERROR_CODES**: Prisma error code mappings
- **REGEX_PATTERNS**: Common regex patterns

### Controllers (`shared/controllers/`)

Base controller classes for common CRUD operations:

- **BaseController**: Generic controller with standard CRUD methods
  - `getAllRecords()` - Retrieve multiple records
  - `getRecordById()` - Get single record by ID
  - `createRecord()` - Create new record
  - `updateRecord()` - Update existing record
  - `deleteRecord()` - Delete record
  - `searchRecords()` - Search records
  - `getStats()` - Get statistics

### Services (`shared/services/`)

Base service classes for business logic:

- **BaseService**: Generic service with validation and business logic
  - Data validation with configurable rules
  - Business logic checks (can modify, can interact)
  - Error handling and logging
  - Data sanitization for logging

- **BaseDatabaseService**: Generic database operations
  - CRUD operations with Prisma
  - Soft delete support
  - Search and pagination
  - Statistics and aggregation
  - Connection management

### Utils (`shared/utils/`)

Common utility functions:

- **Rate Limiting**: Generic rate limiting for any action
  - `RateLimiter` class with configurable windows and limits
  - Express middleware integration
  - Automatic cleanup and statistics

- **Validation**: Common validation utilities
  - Field validation rules
  - Object validation
  - Data sanitization

- **Error Handling**: Standardized error classes
  - `ValidationError`, `NotFoundError`, `BusinessLogicError`
  - Consistent error structure

- **Logging**: Centralized logging with context
- **Responses**: Standardized API response formats

## Usage Examples

### Using Base Controller

```javascript
import { BaseController } from '@shared/controllers';

export class CommentController extends BaseController {
  constructor(commentService) {
    super(commentService, {
      resourceName: 'Comment',
      logContext: 'CommentController',
      successMessages: {
        created: 'Comment created successfully',
        updated: 'Comment updated successfully'
      }
    });
  }

  // Custom methods can override base methods
  async createComment(req, res) {
    // Custom logic before calling base method
    const result = await this.createRecord(req, res, 'createComment');
    // Custom logic after base method
    return result;
  }
}
```

### Using Base Service

```javascript
import { BaseService } from '@shared/services';

export class CommentService extends BaseService {
  constructor(databaseService) {
    super(databaseService, {
      resourceName: 'Comment',
      logContext: 'CommentService',
      requiredFields: ['text'],
      validationRules: {
        text: {
          required: true,
          minLength: 1,
          maxLength: 250
        }
      }
    });
  }

  // Custom business logic methods
  async likeComment(id) {
    const comment = await this.getRecordById(id);
    // Custom like logic
  }
}
```

### Using Base Database Service

```javascript
import { BaseDatabaseService } from '@shared/services';

export class CommentDatabaseService extends BaseDatabaseService {
  constructor(prismaClient) {
    super(prismaClient, {
      modelName: 'comment',
      logContext: 'CommentDatabase',
      softDeleteField: 'isDeleted',
      timestampFields: ['createdAt', 'updatedAt']
    });
  }

  // Custom database methods
  async getCommentsByUser(userId) {
    return this.getAllRecords({
      where: { userId },
      include: { replies: true }
    });
  }
}
```

### Using Rate Limiting

```javascript
import { rateLimitMiddleware } from '@shared/utils';

// Simple rate limiting
const commentRateLimit = rateLimitMiddleware({
  windowMs: 60000,        // 1 minute
  maxAttempts: 5,         // 5 comments per minute
  actionName: 'comment_creation',
  logContext: 'CommentRateLimit'
});

// Apply to routes
app.post('/comments', commentRateLimit, commentController.createComment);
```

## Benefits

1. **Code Reusability**: Common patterns implemented once, used everywhere
2. **Consistency**: Standardized error handling, validation, and responses
3. **Maintainability**: Centralized logic, easier to update and fix
4. **Performance**: Optimized implementations shared across apps
5. **Testing**: Common test utilities and patterns
6. **Documentation**: Single source of truth for common operations

## Migration Guide

To migrate existing apps to use shared modules:

1. **Update imports**: Change from app-specific imports to `@shared/*`
2. **Extend base classes**: Inherit from `BaseController`, `BaseService`, etc.
3. **Configure options**: Set resource names, validation rules, and log contexts
4. **Remove duplicate code**: Delete app-specific implementations of common patterns
5. **Update tests**: Use shared test utilities and patterns

## Contributing

When adding new shared modules:

1. **Generic**: Ensure the module can be used by multiple apps
2. **Configurable**: Use options and parameters for flexibility
3. **Documented**: Include JSDoc comments and usage examples
4. **Tested**: Write comprehensive tests for the shared functionality
5. **Indexed**: Export from appropriate index files
