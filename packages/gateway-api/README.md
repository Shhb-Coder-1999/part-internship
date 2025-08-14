# API Gateway

This is the main API Gateway that routes requests to all the microservices in the monorepo.

## Routes

### Recruitment Services

- `GET /part/recruitment/comments/*` → Comments Service (port 3001)
- `GET /part/recruitment/users/*` → User Management Service (port 3002)
- `GET /part/recruitment/sahab/*` → Sahab Service (port 3003)

### College Services

- `GET /part/college/*` → College Services (not yet implemented)

### Internship Services

- `GET /part/internship/*` → Internship Services (not yet implemented)

## Environment Variables

Create a `.env` file with the following variables:

```bash
# Gateway Configuration
GATEWAY_PORT=3000
NODE_ENV=development

# Service URLs
COMMENTS_SERVICE_URL=http://localhost:3001
USER_MANAGEMENT_SERVICE_URL=http://localhost:3002
SAHAB_SERVICE_URL=http://localhost:3003

# Future services
COLLEGE_SERVICE_URL=http://localhost:4000
INTERNSHIP_SERVICE_URL=http://localhost:5000
```

## Usage

```bash
# Development
pnpm dev:gateway

# Production
pnpm start:gateway
```

## Health Check

```bash
GET /health
```

Returns gateway status and available services.
