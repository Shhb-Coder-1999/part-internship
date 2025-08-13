# Documentation Generation Tools

This directory contains tools for automatically generating API documentation and Postman collections.

## Directory Structure

```
tools/
├── README.md              # This file
├── config.js              # Configuration file for all tools
├── generate-docs.js       # Main script to generate all documentation
├── swagger/               # Swagger generation tools
│   └── index.js          # Swagger generation module
└── postman/               # Postman collection tools
    └── index.js          # Postman collection generator
```

## Quick Start

### Generate All Documentation

```bash
# From project root
npm run docs:generate

# Or directly
node tools/generate-docs.js
```

### Generate Only Swagger

```bash
node tools/swagger/index.js
```

### Generate Only Postman Collection

```bash
node tools/postman/index.js
```

## What Gets Generated

- **Swagger Documentation**: `./docs/swagger-output.json`
- **Postman Collection**: `./docs/comments-api.postman_collection.json`
- **API Documentation**: Available at `/api-docs` when server is running

## Configuration

Edit `config.js` to customize:

- API information (title, description, version)
- Server URLs and descriptions
- API tags and categories
- Output file paths
- Postman collection settings

## Features

### Swagger Generation
- **JSDoc Parsing**: Automatically parses `@swagger` comments
- **Auto-generation**: Falls back to automatic generation if JSDoc fails
- **Hybrid Approach**: Best of both worlds
- **Real-time Updates**: Regenerate when routes change

### Postman Collection
- **Automatic Generation**: Creates collection from Swagger specs
- **Environment Variables**: Uses `{{baseUrl}}` and `{{port}}` variables
- **Request Examples**: Includes sample request bodies
- **Query Parameters**: Automatically adds query parameters

## Integration

The tools are integrated with your npm scripts:

```json
{
  "scripts": {
    "docs:generate": "node tools/generate-docs.js",
    "docs:swagger": "node tools/swagger/index.js",
    "docs:postman": "node tools/postman/index.js",
    "docs:dev": "npm run docs:generate && npm run dev",
    "docs:watch": "nodemon --watch src --ext js --exec 'npm run docs:generate'"
  }
}
```

## Workflow

1. **Write Routes**: Add JSDoc `@swagger` comments to your routes
2. **Generate Docs**: Run `npm run docs:generate`
3. **Start Server**: Run `npm run dev` or `npm run docs:dev`
4. **View Docs**: Access `/api-docs` in your browser
5. **Import Postman**: Import the generated collection into Postman

## Customization

### Adding New API Endpoints

1. Add JSDoc comments to your route files
2. Run `npm run docs:generate`
3. Documentation is automatically updated

### Modifying Schemas

Edit the schema definitions in `tools/swagger/index.js`:

```javascript
components: {
  schemas: {
    YourNewSchema: {
      type: 'object',
      properties: {
        // Your schema properties
      }
    }
  }
}
```

### Changing Output Paths

Edit `tools/config.js`:

```javascript
output: {
  docs: './your-custom-path',
  swagger: './your-custom-path/swagger.json',
  postman: './your-custom-path/postman.json'
}
```

## Troubleshooting

### Common Issues

- **Docs not updating**: Make sure to run `npm run docs:generate` after changes
- **Swagger UI not loading**: Check that `swagger-output.json` exists in `./docs/`
- **Postman collection empty**: Ensure Swagger generation succeeded first
- **JSDoc errors**: Verify your JSDoc syntax is correct

### Debug Mode

Add `DEBUG=true` environment variable for verbose logging:

```bash
DEBUG=true npm run docs:generate
```

## Contributing

When adding new tools or modifying existing ones:

1. Follow the existing directory structure
2. Update this README with new features
3. Test with `npm run docs:generate`
4. Ensure backward compatibility
