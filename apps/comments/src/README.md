# Comments App Source Directory

This directory contains the main source code for the comments application.

## Directory Structure

- **constants/** - Application constants and configuration values
- **utils/** - Utility functions for comments and rate limiting
- **services/** - Business logic and data operation services
- **controllers/** - HTTP request/response handlers
- **middleware/** - Request validation and processing middleware
- **routes/** - API route definitions
- **models/** - Data models (defined in Prisma schema)

## Usage

Import all modules from the main index:

```javascript
import { 
  CommentController, 
  CommentService, 
  DatabaseService,
  commentRoutes,
  validateCommentInput 
} from './src/index.js';
```

Or import specific modules from their directories:

```javascript
import { CommentController } from './src/controllers';
import { createCommentQueryConditions } from './src/utils';
```
