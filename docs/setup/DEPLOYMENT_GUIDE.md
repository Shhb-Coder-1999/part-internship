# 🚀 Deployment Guide - Part Internship Monorepo

## 🎯 **Answer: You DON'T Need a Root Server!**

Your **API Gateway** (`packages/gateway-api`) already serves as the integration point. Here are the different ways to run your integrated system:

## 🔧 **Development Mode (Recommended)**

### Option 1: Smart Development Script (Best!)

```bash
# Starts all services with colored logs and proper orchestration
pnpm dev
```

This will start:

- 🚪 Gateway API (port 3000) - Your main entry point
- 💬 Comments API (port 3001)
- 👥 User Management (port 3002)
- 🏢 Sahab API (port 3003)

**Access your app:** `http://localhost:3000/part/recruitment/comments`

### Option 2: PNPM Parallel (Alternative)

```bash
# Basic parallel execution
pnpm dev:parallel
```

### Option 3: Individual Services

```bash
# Start services individually
pnpm dev:gateway
pnpm dev:comments
pnpm dev:recruitment
```

## 🏭 **Production Mode**

### Option 1: Docker Compose (Recommended for Production)

```bash
# Build and start all services
pnpm docker:up

# View logs
pnpm docker:logs

# Stop services
pnpm docker:down
```

### Option 2: PM2 Process Manager

```bash
# Install PM2 globally
npm install -g pm2

# Start all services with PM2
pnpm pm2:start

# View logs
pnpm pm2:logs

# Stop services
pnpm pm2:stop
```

### Option 3: Manual Production

```bash
# Start each service in production mode
pnpm start:gateway &
pnpm start:recruitment &
pnpm start:college &
pnpm start:internship &
```

## 🌐 **Your API Routes**

All requests go through the **Gateway** at `http://localhost:3000`:

### Recruitment Services

- `GET /part/recruitment/comments/*` → Comments API
- `GET /part/recruitment/users/*` → User Management
- `GET /part/recruitment/sahab/*` → Sahab API

### Future Services

- `GET /part/college/*` → College APIs (when you add them)
- `GET /part/internship/*` → Internship APIs (when you add them)

## 🏗️ **Architecture Benefits**

```
┌─────────────────┐    ┌─────────────────┐
│   Your Client   │────│   API Gateway   │ ← Single Entry Point
│   (Frontend)    │    │   Port 3000     │
└─────────────────┘    └─────────────────┘
                                │
                    ┌───────────┼───────────┐
                    │           │           │
         ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
         │  Comments API   │ │ User Management │ │   Sahab API     │
         │   Port 3001     │ │   Port 3002     │ │   Port 3003     │
         └─────────────────┘ └─────────────────┘ └─────────────────┘
```

### ✅ **Why This is Better Than a Root Server:**

1. **🎯 Single Entry Point** - Gateway handles all routing
2. **🔧 Independent Services** - Each service can be developed/deployed separately
3. **📈 Scalability** - Scale individual services based on load
4. **🛡️ Security** - Gateway handles auth, rate limiting, CORS
5. **🔄 Load Balancing** - Gateway can distribute load
6. **📝 Centralized Logging** - All requests flow through gateway

## 🚀 **Quick Start Commands**

```bash
# 1. Install dependencies
pnpm install

# 2. Start development (all services)
pnpm dev

# 3. Test your API
curl http://localhost:3000/health
curl http://localhost:3000/part/recruitment/comments

# 4. For production
pnpm docker:up
```

## 🔧 **Environment Variables**

Create `.env` files as needed:

### Gateway (.env)

```env
GATEWAY_PORT=3000
COMMENTS_SERVICE_URL=http://localhost:3001
USER_MANAGEMENT_SERVICE_URL=http://localhost:3002
SAHAB_SERVICE_URL=http://localhost:3003
```

### Individual Services

Each service has its own `.env` with service-specific configuration.

## 📊 **Monitoring & Logs**

### Development

- The `pnpm dev` script shows colored logs from all services
- Each service logs with timestamps and service names

### Production

- **Docker:** `pnpm docker:logs`
- **PM2:** `pnpm pm2:logs`
- **Manual:** Check individual service logs

## 🎉 **Conclusion**

You have a **modern microservices architecture** where:

- ✅ **No root server needed** - Gateway handles integration
- ✅ **Clean separation** - Each domain (recruitment/college/internship) is independent
- ✅ **Easy development** - Single command starts everything
- ✅ **Production ready** - Docker + PM2 + Nginx support
- ✅ **Scalable** - Add new services easily

Your API is accessible at `http://localhost:3000/part/recruitment/comments` exactly as you wanted! 🎯
