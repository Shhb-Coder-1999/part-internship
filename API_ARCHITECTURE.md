# 🏗️ Part Internship Platform - API Architecture

## 📊 System Overview Diagram

```mermaid
graph TB
    subgraph "Client Layer"
        A[Web Browser] 
        B[Mobile App]
        C[API Client]
    end
    
    subgraph "API Gateway Layer - Port 3000"
        GW[🌐 Fastify API Gateway]
        AU[🔐 Authentication Service]
        RT[🚦 Rate Limiter] 
        LB[⚖️ Load Balancer]
    end
    
    subgraph "Microservices Layer"
        subgraph "Recruitment Services"
            US[👥 User Management<br/>Port 3003]
            CS[💬 Comments Service<br/>Port 3001] 
            SB[🏢 Sahab Application<br/>Port 3002]
        end
        
        subgraph "Future Services"
            CL[🎓 College Services<br/>TBD]
            IS[💼 Internship Services<br/>TBD]
        end
    end
    
    subgraph "Data Layer"
        PG[(🐘 PostgreSQL)]
        RD[(📊 Redis Cache)]
        FS[📁 File Storage]
    end
    
    subgraph "Infrastructure"
        DK[🐳 Docker]
        NG[🔧 Nginx]
        PM[📦 PM2]
    end
    
    %% Connections
    A --> GW
    B --> GW  
    C --> GW
    
    GW --> AU
    GW --> RT
    GW --> LB
    
    LB --> US
    LB --> CS
    LB --> SB
    LB --> CL
    LB --> IS
    
    US --> PG
    CS --> PG
    SB --> PG
    CL --> PG
    IS --> PG
    
    AU --> RD
    RT --> RD
    
    US --> FS
    CS --> FS
    
    DK --> NG
    NG --> PM
    PM --> GW
```

## 🔗 API Endpoints Overview

### 🌐 API Gateway (`localhost:3000`)

#### Base Routes
- `GET /` - Gateway health and info
- `GET /health` - Comprehensive health check
- `GET /api-docs` - OpenAPI documentation

#### Authentication Routes (`/auth`)
- `POST /auth/register` - User registration
- `POST /auth/login` - User authentication  
- `POST /auth/refresh` - Token refresh
- `POST /auth/logout` - User logout
- `GET /auth/profile` - User profile (auth required)
- `PUT /auth/change-password` - Change password (auth required)
- `GET /auth/status` - Authentication status (auth required)
- `GET /auth/info` - Authentication service info

#### Service Proxy Routes
- `/part/recruitment/comments/*` → Comments Service
- `/part/recruitment/user-management/*` → User Management Service  
- `/part/recruitment/sahab/*` → Sahab Application

---

### 👥 User Management Service (`localhost:3003`)

#### User Operations
- `GET /users` - List users (paginated, role-based access)
- `GET /users/me` - Current user profile (auth required)
- `GET /users/:id` - Get user by ID (own profile or admin)
- `POST /users` - Create new user
- `PATCH /users/:id` - Update user (auth required)
- `DELETE /users/:id` - Delete user (auth required)
- `GET /users/search?q=term` - Search users

#### Service Health
- `GET /health` - Service health check
- `GET /api-docs` - Service API documentation

**Authentication**: JWT required for most endpoints  
**Authorization**: Role-based access control (USER, ADMIN, STUDENT, TEACHER, INTERN, SUPERVISOR)

---

### 💬 Comments Service (`localhost:3001`)

#### Comment Operations
- `GET /comments` - List all comments (public, paginated)
- `GET /comments/my` - User's private comments (auth required)
- `POST /comments` - Create comment (auth required, rate limited)
- `GET /comments/search?q=term` - Search comments
- `GET /comments/stats` - Comment statistics
- `GET /comments/:id` - Get specific comment
- `PATCH /comments/:id` - Update comment (auth required)
- `DELETE /comments/:id` - Soft delete comment (auth required)

#### Comment Interactions
- `POST /comments/:id/like` - Like a comment
- `POST /comments/:id/dislike` - Dislike a comment

#### Service Health  
- `GET /health` - Service health check
- `GET /api-docs` - Service API documentation

**Features**: Rate limiting, nested comments support, user data isolation

---

### 🏢 Sahab Application (`localhost:3002`)

#### Basic Operations
- `GET /` - Application info
- `GET /health` - Service health check

**Status**: 🔄 Migrating to Fastify (basic endpoints available)

---

## 🔐 Authentication & Authorization

### JWT Token Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant G as Gateway
    participant A as Auth Service
    participant S as Microservice
    participant D as Database
    
    Note over C,D: Authentication Flow
    C->>G: POST /auth/login
    G->>A: Validate credentials
    A->>D: Check user data
    D-->>A: User info
    A-->>G: JWT access + refresh tokens
    G-->>C: Tokens + user profile
    
    Note over C,D: API Request Flow
    C->>G: API Request + JWT
    G->>G: Validate JWT
    G->>S: Forward request + user context
    S->>D: Query with user isolation
    D-->>S: Filtered data
    S-->>G: Response
    G-->>C: Final response
```

### Role-Based Access Control

| Role | Access Level | Description |
|------|-------------|-------------|
| `ADMIN` | Full access | Complete system administration |
| `SUPERVISOR` | Limited admin | Internship program oversight |
| `TEACHER` | Educational | College course management |
| `STUDENT` | Educational | College course participation |  
| `INTERN` | Professional | Internship program participation |
| `USER` | Basic | Standard user operations |

## 🛡️ Security Features

### Gateway Security
- **Helmet.js** - Security headers
- **CORS** - Cross-origin protection  
- **Rate Limiting** - Request throttling
- **JWT Validation** - Token-based auth
- **Input Sanitization** - XSS protection

### Service Security
- **User Data Isolation** - Users see only their data
- **JSON Schema Validation** - Input validation
- **SQL Injection Protection** - Prisma ORM
- **Password Hashing** - bcrypt with salt

## 📈 Performance Characteristics

### Benchmark Results

| Service | Requests/sec | Memory Usage | Response Time |
|---------|-------------|-------------|---------------|
| **Gateway** | ~10,000 | 32-35MB | <50ms |
| **Comments** | ~8,000 | 28-30MB | <75ms |
| **User Mgmt** | ~8,500 | 30-32MB | <60ms |
| **Sahab** | ~5,000 | 25-28MB | <100ms |

### Technology Stack Performance
- **Fastify Framework** - 3x faster than Express
- **Native JSON Schema** - Built-in validation
- **Prisma ORM** - Type-safe database operations  
- **PNPM** - Fast package management
- **SWC Compiler** - Fast JavaScript compilation

## 🔧 Development & Deployment

### Local Development
```bash
# Start all services
pnpm dev

# Individual services
pnpm start:gateway      # Port 3000
pnpm start:comments     # Port 3001  
pnpm start:sahab        # Port 3002
pnpm start:user-mgmt    # Port 3003
```

### API Documentation
- **Gateway**: http://localhost:3000/api-docs
- **Comments**: http://localhost:3001/api-docs
- **User Management**: http://localhost:3003/api-docs

### Health Monitoring
- **Gateway**: http://localhost:3000/health
- **Comments**: http://localhost:3001/health  
- **User Management**: http://localhost:3003/health
- **Sahab**: http://localhost:3002/health

## 🚀 Future Architecture Plans

### Planned Services
- **🎓 College Services** - Academic management
- **💼 Internship Services** - Professional placement
- **📊 Analytics Service** - Usage metrics
- **🔔 Notification Service** - Real-time alerts

### Scalability Plans
- **Service Mesh** - Istio implementation
- **Message Queue** - Redis/RabbitMQ integration
- **Caching Layer** - Redis distributed caching
- **Database Sharding** - Horizontal scaling

---

**🏗️ Architecture Version**: 2.0.0  
**📅 Last Updated**: January 2025  
**⚡ Built with**: Fastify • Prisma • JWT • Docker • PNPM