# 🚪 Generic Gateway Architecture Guide

## 🎯 **Problem Solved**

✅ **DRY Principle** - No code duplication, shared constants and utilities  
✅ **Generic Gateway** - Services register themselves dynamically  
✅ **Configurable** - Each service defines its own auth rules  
✅ **Scalable** - Easy to add new services without touching gateway code  
✅ **Maintainable** - Centralized constants, environment management

## 🏗️ **Architecture Overview**

```
part-internship/
├── packages/
│   ├── shared/
│   │   ├── constants/index.js       # 🎯 ALL constants (HTTP_STATUS, USER_ROLES, PERMISSIONS)
│   │   └── utils/env.utils.js       # 🔧 Generic environment loader
│   └── gateway-api/
│       ├── core/
│       │   ├── service-registry.js  # 🗂️ Dynamic service registry
│       │   └── config-loader.js     # 📂 Auto-discovery service configs
│       ├── middleware/
│       │   └── generic-auth.middleware.js # 🔐 Generic auth using registry
│       └── index.generic.js         # 🚪 Completely generic gateway
├── apps/
│   └── recruitment/
│       ├── comments/
│       │   ├── envs/.env           # 🌍 Service-specific environment
│       │   └── service.config.js   # ⚙️ Service defines its own rules
│       ├── user-management/
│       │   └── service.config.js   # ⚙️ Admin-only service config
│       └── sahab/
│           └── service.config.js   # ⚙️ Public service config
└── services.config.js              # 🎛️ Optional global service config
```

## 📚 **How It Works**

### 1️⃣ **Services Self-Configure**

Each service defines its own authentication rules in `service.config.js`:

```javascript
// apps/recruitment/comments/service.config.js
import { USER_ROLES, PERMISSIONS, HTTP_STATUS } from '@shared/core/constants';
import { getEnv } from '@shared/core/utils/env.utils';

export default {
  name: 'comments-api',
  basePath: '/part/recruitment/comments',

  routes: [
    {
      path: '/part/recruitment/comments',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      methodConfigs: {
        GET: { requireAuth: false }, // Public read
        POST: { requireAuth: true, requireRoles: [USER_ROLES.USER] },
        DELETE: { requireAuth: true, requireRoles: [USER_ROLES.ADMIN] },
      },
    },
  ],
};
```

### 2️⃣ **Gateway Auto-Discovers Services**

```javascript
// Gateway automatically finds and registers all services
const configLoader = new ConfigLoader(process.cwd());
await configLoader.discoverAndRegisterServices();

// Services register themselves:
// ✅ comments-api at /part/recruitment/comments
// ✅ user-management-api at /part/recruitment/users
// ✅ sahab-api at /part/recruitment/sahab
```

### 3️⃣ **Dynamic Route Protection**

```javascript
// Gateway checks each request against service registry
app.use('*', (req, res, next) => {
  const route = serviceRegistry.getRoute(req.path);
  const authConfig = serviceRegistry.getRouteAuth(req.path, req.method);

  // Apply auth based on service configuration
  if (authConfig.requireAuth) {
    authMiddleware(req, res, next);
  } else {
    next(); // Public route
  }
});
```

## 🔧 **Using Shared Constants**

### ✅ **Before (Static/Hardcoded)**

```javascript
// ❌ BAD - Hardcoded values everywhere
if (!user) {
  return res.status(401).json({ error: 'Unauthorized' });
}
if (!user.roles.includes('admin')) {
  return res.status(403).json({ error: 'Forbidden' });
}
```

### ✅ **After (DRY with Shared Constants)**

```javascript
// ✅ GOOD - Using shared constants
import { HTTP_STATUS, USER_ROLES, API_MESSAGES } from '@shared/core/constants';

if (!user) {
  return res.status(HTTP_STATUS.UNAUTHORIZED).json({
    error: API_MESSAGES.ERROR.UNAUTHORIZED,
  });
}
if (!user.roles.includes(USER_ROLES.ADMIN)) {
  return res.status(HTTP_STATUS.FORBIDDEN).json({
    error: API_MESSAGES.ERROR.FORBIDDEN,
  });
}
```

## 🌍 **Environment Management**

### ✅ **Before (process.env everywhere)**

```javascript
// ❌ BAD - Direct process.env usage
const port = process.env.PORT || 3000;
const requireAuth = process.env.REQUIRE_AUTH === 'true';
```

### ✅ **After (Centralized Environment Utils)**

```javascript
// ✅ GOOD - Using shared environment utilities
import { getEnv } from '@shared/core/utils/env.utils';

const port = getEnv(currentDir, 'PORT', 3000, 'number');
const requireAuth = getEnv(currentDir, 'REQUIRE_AUTH', true, 'boolean');
```

## 📝 **Service Configuration Examples**

### 🔓 **Public Service (Sahab)**

```javascript
export default {
  name: 'sahab-api',
  basePath: '/part/recruitment/sahab',

  authentication: {
    requireAuth: false, // Public by default
  },

  routes: [
    {
      path: '/part/recruitment/sahab',
      methodConfigs: {
        GET: { requireAuth: false }, // Public read
        POST: { requireAuth: true, requireRoles: [USER_ROLES.USER] },
        DELETE: { requireAuth: true, requireRoles: [USER_ROLES.ADMIN] },
      },
    },
  ],
};
```

### 🔒 **Admin-Only Service (User Management)**

```javascript
export default {
  name: 'user-management-api',
  basePath: '/part/recruitment/users',

  authentication: {
    requireAuth: true,
    requireRoles: [USER_ROLES.ADMIN], // Admin only
  },

  routes: [
    {
      path: '/part/recruitment/users',
      methodConfigs: {
        GET: { requireRoles: [USER_ROLES.ADMIN] },
        POST: { requireRoles: [USER_ROLES.ADMIN] },
        DELETE: { requireRoles: [USER_ROLES.ADMIN] },
      },
    },
  ],
};
```

### ⚙️ **Configurable Service (Comments)**

```javascript
export default {
  name: 'comments-api',
  basePath: '/part/recruitment/comments',

  routes: [
    {
      path: '/part/recruitment/comments',
      methodConfigs: {
        GET: {
          requireAuth: getEnv(
            currentDir,
            'REQUIRE_AUTH_FOR_READ',
            false,
            'boolean'
          ),
        },
        POST: {
          requireAuth: getEnv(
            currentDir,
            'REQUIRE_AUTH_FOR_WRITE',
            true,
            'boolean'
          ),
          requireRoles: [USER_ROLES.USER, USER_ROLES.ADMIN],
        },
        DELETE: {
          requireAuth: true,
          requireRoles: getEnv(currentDir, 'ADMIN_ONLY_DELETE', true, 'boolean')
            ? [USER_ROLES.ADMIN]
            : [USER_ROLES.USER, USER_ROLES.ADMIN],
        },
      },
    },
  ],
};
```

## 🚀 **Adding New Services**

### 1️⃣ **Create Service Structure**

```bash
mkdir -p apps/college/courses
cd apps/college/courses
```

### 2️⃣ **Create Service Configuration**

```javascript
// apps/college/courses/service.config.js
import { USER_ROLES, PERMISSIONS } from '@shared/core/constants';

export default {
  name: 'courses-api',
  baseUrl: 'http://localhost:4001',
  basePath: '/part/college/courses',

  routes: [
    {
      path: '/part/college/courses',
      methodConfigs: {
        GET: {
          requireAuth: true,
          requireRoles: [USER_ROLES.STUDENT, USER_ROLES.TEACHER],
        },
        POST: { requireAuth: true, requireRoles: [USER_ROLES.TEACHER] },
        DELETE: { requireAuth: true, requireRoles: [USER_ROLES.ADMIN] },
      },
    },
  ],
};
```

### 3️⃣ **Create Environment Config**

```bash
# apps/college/courses/envs/.env
SERVICE_NAME=courses-api
SERVICE_BASE_URL=http://localhost:4001
PORT=4001
REQUIRE_AUTH_FOR_READ=true
```

### 4️⃣ **That's It! 🎉**

Gateway automatically discovers and registers the service on startup.

## 📊 **Gateway Endpoints**

### 🔍 **Service Discovery**

```bash
GET /services
# Returns all registered services and their configurations
```

### 🏥 **Health Check**

```bash
GET /health
# Returns gateway status + all service health
```

### 📝 **Manual Registration**

```bash
POST /register-service
# Manually register a service (optional)
```

## 🎯 **Benefits Achieved**

### ✅ **DRY Principle**

- ✅ HTTP status codes centralized in `@shared/core/constants`
- ✅ User roles centralized and reusable
- ✅ Environment utilities shared across all services
- ✅ No code duplication in gateway

### ✅ **Configurable**

- ✅ Each service defines its own auth rules
- ✅ Environment-based configuration per service
- ✅ Method-level permission control
- ✅ Easy to enable/disable features per service

### ✅ **Generic Gateway**

- ✅ Zero hardcoded routes in gateway
- ✅ Services self-register automatically
- ✅ Dynamic proxy routing
- ✅ Automatic service discovery

### ✅ **Maintainable**

- ✅ Adding new services requires zero gateway changes
- ✅ Shared constants prevent inconsistencies
- ✅ Environment management centralized
- ✅ Clear separation of concerns

## 🔄 **Migration from Static Gateway**

1. **Replace gateway index.js** → Use `index.generic.js`
2. **Create service configs** → Add `service.config.js` to each service
3. **Add envs directories** → Move environment variables to `envs/.env`
4. **Update imports** → Use shared constants instead of hardcoded values
5. **Test & Deploy** → Services register automatically

Your gateway is now **truly generic, configurable, and follows DRY principles**! 🎉
