# Modern API Documentation Setup

This guide explains how to use the new **modern API documentation system** that leverages Fastify's native OpenAPI support for optimal performance and accuracy.

## 🚀 Quick Start

```bash
# Generate all documentation
npm run docs:generate

# Start server with fresh docs
npm run docs:dev

# Auto-regenerate on changes
npm run docs:watch
```

## 📚 What You Get

### 1. **Interactive Swagger UI**
- **URL**: `http://localhost:3000/api-docs`
- **Features**: Try-it-out functionality, schema validation, response examples
- **Auto-sync**: Always reflects your current route definitions

### 2. **Comprehensive Postman Collection**
- **File**: `./docs/comments-api.postman_collection.json`
- **Features**: Pre-configured requests, environment variables, automated tests
- **Organization**: Endpoints grouped by tags for easy navigation

### 3. **OpenAPI 3.0 Specification**
- **File**: `./docs/swagger-output.json`
- **Standard**: Full OpenAPI 3.0+ compliance
- **Usage**: Can be imported into any OpenAPI-compatible tool

### 4. **Enhanced Documentation**
- **API Summary**: `./docs/api-summary.json` - Overview and statistics
- **Endpoints List**: `./docs/endpoints-list.json` - Structured endpoint reference

## ⚡ How It Works

### Schema-Driven Approach
Instead of writing separate documentation, your **Fastify route schemas** become your documentation:

```javascript
// Your route definition IS your documentation
fastify.get('/api/comments', {
  schema: {
    description: 'Get all comments with pagination',
    tags: ['Comments'],
    querystring: {
      type: 'object',
      properties: {
        page: { type: 'integer', minimum: 1, default: 1 },
        limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 }
      }
    },
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              comments: { type: 'array', items: { $ref: '#/components/schemas/Comment' } },
              pagination: { $ref: '#/components/schemas/PaginationInfo' }
            }
          }
        }
      }
    }
  }
}, async (request, reply) => {
  // Your route handler
});
```

### Native Performance
- ✅ **Zero parsing overhead** - uses Fastify's built-in schema compilation
- ✅ **Always accurate** - documentation matches validation rules exactly
- ✅ **Real-time sync** - no manual maintenance required

## 🎯 Best Practices

### 1. Write Comprehensive Schemas
```javascript
// ❌ Basic schema
body: {
  type: 'object',
  required: ['text'],
  properties: {
    text: { type: 'string' }
  }
}

// ✅ Rich schema with examples and descriptions
body: {
  type: 'object',
  required: ['text'],
  properties: {
    text: { 
      type: 'string', 
      minLength: 1, 
      maxLength: 1000,
      description: 'Comment content',
      example: 'This is a great post!'
    },
    parentId: {
      type: 'string',
      nullable: true,
      description: 'Parent comment ID for replies',
      example: 'clh123abc456xyz'
    }
  },
  additionalProperties: false
}
```

### 2. Use Consistent Tags
```javascript
// Group related endpoints
tags: ['Comments']  // For comment operations
tags: ['System']    // For health/info endpoints
tags: ['Users']     // For user operations
```

### 3. Define Reusable Schemas
```javascript
// In your server-instance.js
components: {
  schemas: {
    Comment: {
      type: 'object',
      required: ['id', 'text', 'createdAt'],
      properties: {
        id: { type: 'string', example: 'clh123abc456def' },
        text: { type: 'string', example: 'Great comment!' },
        // ... more properties
      }
    }
  }
}

// Reference in routes
response: {
  200: { $ref: '#/components/schemas/Comment' }
}
```

### 4. Include Examples
```javascript
// Schema examples
properties: {
  email: { 
    type: 'string', 
    format: 'email',
    example: 'user@example.com'
  },
  createdAt: {
    type: 'string',
    format: 'date-time',
    example: '2024-01-15T10:30:00Z'
  }
}
```

## 🔧 Configuration

### Customize API Information
Edit `./src/server-instance.js`:

```javascript
info: {
  title: 'Your API Name',
  description: 'Your API description',
  version: '1.0.0',
  contact: {
    name: 'Your Team',
    email: 'team@yourcompany.com'
  }
}
```

### Add Multiple Servers
```javascript
servers: [
  { url: 'http://localhost:3000', description: 'Development' },
  { url: 'https://api.yourcompany.com', description: 'Production' }
]
```

### Custom Output Paths
Edit `./tools/config.js`:

```javascript
export const TOOL_CONFIG = {
  output: {
    docs: './docs',
    swagger: './docs/api-spec.json',
    postman: './docs/api-collection.json'
  }
  // ... more config
};
```

## 📱 Postman Integration

### Import Collection
1. Run `npm run docs:generate`
2. Open Postman
3. Import `./docs/comments-api.postman_collection.json`
4. Set environment variables:
   - `baseUrl`: `localhost`
   - `port`: `3000`

### Automated Tests
Generated collections include test scripts:

```javascript
// Automatically included in requests
pm.test("Status code is success", function () {
    pm.expect(pm.response.code).to.be.oneOf([200, 201, 204]);
});

pm.test("Response has proper structure", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property("success");
    pm.expect(jsonData).to.have.property("timestamp");
});
```

## 🔄 Development Workflow

### During Development
```bash
# Option 1: Auto-regenerate on changes
npm run docs:watch

# Option 2: Manual regeneration
npm run docs:generate
```

### Integration with CI/CD
```yaml
# Example GitHub Actions
- name: Generate API Documentation
  run: npm run docs:generate
  
- name: Deploy Documentation
  # Deploy generated docs to your documentation site
```

## 🆚 Migration from Old System

If you're migrating from the old hybrid approach:

### ✅ What's Better
- **50%+ faster** documentation generation
- **Zero dependencies** on external parsing tools
- **100% accurate** - docs always match validation
- **Simpler maintenance** - one source of truth

### 🔄 What Changed
- No more `@swagger` JSDoc comments needed
- Documentation comes from Fastify schemas
- New tool names: `docs-generator.js`, `swagger-generator.js`, `postman-generator.js`

### 📦 Dependencies Removed
```json
// No longer needed
"swagger-autogen": "^2.23.7",
"swagger-jsdoc": "^6.2.8", 
"swagger-ui-express": "^5.0.1"
```

## 🐛 Troubleshooting

### Documentation Not Generating
```bash
# Check if server can start
npm run dev

# Verify schemas are valid
npm run test
```

### Missing Endpoints
- Ensure routes are registered in `server-instance.js`
- Check that schemas include `tags` and `description`

### Postman Import Issues
- Verify JSON is valid: `npm run docs:generate`
- Check file exists: `./docs/comments-api.postman_collection.json`

### Performance Issues
- The new system should be significantly faster
- If slow, check for circular schema references

## 🎉 Success Indicators

You'll know the system is working when:
- ✅ Server starts with `/api-docs` endpoint
- ✅ Documentation reflects all your routes
- ✅ Postman collection imports successfully
- ✅ Test requests work in Postman
- ✅ Examples show realistic data

---

**Need help?** Check the `./tools/README.md` for technical details or refer to the Fastify OpenAPI documentation.