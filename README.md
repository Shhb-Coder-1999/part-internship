# comment Project

A modular comments management system built with Node.js, Express, and Prisma.

## Project Structure

```
comment/
├── apps/                    # Application modules
│   ├── comments/           # Comments management service
│   ├── sahab/             # Sahab service module
│   └── user-management/   # User management service
├── shared/                 # Shared utilities and modules
│   ├── utils/             # Common utility functions
│   ├── middleware/        # Shared middleware
│   ├── auth/              # Authentication utilities
│   ├── database/          # Database utilities
│   └── config/            # Configuration management
├── docs/                  # Project documentation
├── tools/                 # Development and deployment tools
└── tests/                 # Test suites
```

## Features

- **Modular Architecture**: Separate services for different functionalities
- **Shared Utilities**: Common modules shared across applications
- **Database Integration**: Prisma ORM with PostgreSQL
- **API Documentation**: Swagger/OpenAPI specifications
- **Testing**: Comprehensive test suites (unit, integration, e2e)
- **Docker Support**: Containerized deployment

## Quick Start

1. **Install Dependencies**
   ```bash
   pnpm install
   ```

2. **Setup Environment**
   ```bash
   cd apps/comments
   cp env.example .env
   # Configure your environment variables
   ```

3. **Setup Database**
   ```bash
   cd apps/comments
   pnpm prisma generate
   pnpm prisma db push
   pnpm prisma db seed
   ```

4. **Run Comments Service**
   ```bash
   cd apps/comments
   pnpm start
   ```

## Development

### Importing Modules

All modules can be imported from their respective index files:

```javascript
// Import from specific directories
import { CommentController } from '@controllers';
import { createCommentQueryConditions } from '@utils';
import { DatabaseService } from '@services';

// Import shared modules
import { createAppLogger, errorHandler } from '@shared';
```

### Adding New Modules

1. Create your module file in the appropriate directory
2. Export it from the directory's `index.js`
3. Update the main `src/index.js` if needed
4. Add documentation in the directory's `README.md`

## Testing

```bash
# Run all tests
cd apps/comments
pnpm test

# Run specific test suites
pnpm test:unit
pnpm test:integration
pnpm test:e2e
```

## API Documentation

- **Swagger UI**: Available at `/docs/swagger-ui.html`
- **Postman Collection**: `docs/postman-collection.json`
- **API Docs**: `docs/API_DOCUMENTATION.md`

## Contributing

1. Follow the existing module structure
2. Add appropriate tests for new functionality
3. Update documentation and README files
4. Use the established import patterns

## License

[Add your license information here] 