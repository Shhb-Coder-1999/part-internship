# Part Internship Monorepo Structure

This monorepo contains three main project domains (recruitment, college, internship) with shared packages and a centralized API gateway.

## 🏗️ Project Structure

```
part-internship/
├── apps/                          # Main applications organized by domain
│   ├── recruitment/               # Recruitment-related services
│   │   ├── comments/             # Comments API service
│   │   ├── user-management/      # User management service
│   │   └── sahab/                # Sahab service
│   ├── college/                  # College-related services (placeholder)
│   └── internship/               # Internship-related services (placeholder)
├── packages/                     # Shared packages and utilities
│   ├── shared/                   # Common utilities, middleware, auth
│   └── gateway-api/              # API Gateway for routing
├── docs/                         # Documentation
├── tools/                        # Build tools and scripts
├── pnpm-workspace.yaml          # PNPM workspace configuration
└── package.json                 # Root package.json with workspace scripts
```

## 🌐 API Routes Structure

All services are accessible through the API Gateway at:

### Recruitment Domain

- `http://localhost:3000/part/recruitment/comments/*` → Comments Service
- `http://localhost:3000/part/recruitment/users/*` → User Management Service
- `http://localhost:3000/part/recruitment/sahab/*` → Sahab Service

### College Domain (Future)

- `http://localhost:3000/part/college/*` → College Services

### Internship Domain (Future)

- `http://localhost:3000/part/internship/*` → Internship Services

## 📦 Packages

### 🔄 Shared Package (`packages/shared`)

Contains common utilities used across all applications:

- **Auth**: Authentication middleware and utilities
- **Config**: Environment and configuration management
- **Constants**: Shared constants [[memory:6195746]]
- **Controllers**: Base controllers
- **Database**: Database connection utilities
- **Middleware**: Common middleware (error handling, validation [[memory:6195740]])
- **Repositories**: Base repository patterns
- **Services**: Shared business logic
- **Utils**: Common utility functions

### 🚪 Gateway API (`packages/gateway-api`)

Centralized API Gateway that:

- Routes requests to appropriate services
- Handles authentication and authorization
- Provides unified API endpoints
- Manages cross-cutting concerns

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- PNPM 8+

### Installation

```bash
# Install dependencies for all packages
pnpm install

# Setup the workspace
pnpm setup
```

### Development

```bash
# Start all services in development mode
pnpm dev

# Start specific domains
pnpm dev:recruitment
pnpm dev:college
pnpm dev:internship

# Start only the gateway
pnpm dev:gateway

# Start specific service
pnpm dev:comments
```

### Production

```bash
# Build all packages
pnpm build

# Start all services
pnpm start

# Start specific domains
pnpm start:recruitment
pnpm start:college
pnpm start:internship
```

## 🧪 Testing

```bash
# Run tests for all packages
pnpm test

# Run tests for specific domain
pnpm test:recruitment
pnpm test:college
pnpm test:internship
```

## 📝 Adding New Services

### To Recruitment Domain

```bash
# Create new service
mkdir apps/recruitment/your-service
cd apps/recruitment/your-service

# Initialize package.json
pnpm init

# Add shared dependencies
pnpm add @shared/core
```

### To College/Internship Domains

1. Create service directory under respective domain
2. Add to the domain's package.json scripts
3. Update gateway routes in `packages/gateway-api/index.js`

## 🔧 Configuration

### Environment Variables

Each service should have its own `.env` file. Common variables:

- Service-specific ports
- Database URLs
- Auth secrets
- API keys

### Shared Configuration

Use `packages/shared/config` for common configuration that can be shared across services.

## 🏗️ Development Guidelines

1. **DRY Principle**: Use shared constants and utilities [[memory:6195746]]
2. **Validation**: Use Zod for input validation [[memory:6195740]]
3. **Authentication**: Leverage shared auth middleware
4. **Database**: Use shared database utilities
5. **Error Handling**: Use standardized error responses
6. **Testing**: Write comprehensive tests for each service

## 📁 File Naming Conventions

- Services: `kebab-case` (e.g., `user-management`)
- Files: `camelCase.js` (e.g., `commentController.js`)
- Constants: `UPPER_SNAKE_CASE`
- Database: `snake_case` for tables/columns

## 🤝 Contributing

1. Create feature branches from `main`
2. Follow the established project structure
3. Use shared packages when possible
4. Add tests for new functionality
5. Update documentation as needed

## 📚 Learn More

- [PNPM Workspaces](https://pnpm.io/workspaces)
- [Monorepo Best Practices](https://monorepo.tools/)
- [API Gateway Pattern](https://microservices.io/patterns/apigateway.html)
