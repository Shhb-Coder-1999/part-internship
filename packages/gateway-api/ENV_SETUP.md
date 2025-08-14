# Environment Configuration

Create a `.env` file in the gateway-api directory with the following variables:

```bash
# Gateway Configuration
NODE_ENV=development
GATEWAY_PORT=3000

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-make-it-very-long-and-random
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d
JWT_ISSUER=part-internship-gateway
JWT_AUDIENCE=part-internship-services

# Password Security
BCRYPT_SALT_ROUNDS=12
PASSWORD_MIN_LENGTH=8
PASSWORD_REQUIRE_SPECIAL=false
PASSWORD_REQUIRE_NUMBER=true
PASSWORD_REQUIRE_UPPERCASE=true

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX_REQUESTS=5

# Service URLs
COMMENTS_SERVICE_URL=http://localhost:3001
USER_MANAGEMENT_SERVICE_URL=http://localhost:3002
SAHAB_SERVICE_URL=http://localhost:3003

# Service Protection Configuration
# Set to 'false' to disable auth for specific services
PROTECT_COMMENTS_SERVICE=true
PROTECT_USERS_SERVICE=true
PROTECT_SAHAB_SERVICE=false
PROTECT_COLLEGE_SERVICES=true
PROTECT_INTERNSHIP_SERVICES=true

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:8080

# Security Configuration
MAX_REQUEST_SIZE=10mb
BLACKLISTED_IPS=
WHITELISTED_IPS=

# Internal API Key (for service-to-service communication)
INTERNAL_API_KEY=your-internal-api-key-for-service-communication

# Logging
LOG_LEVEL=info
```
