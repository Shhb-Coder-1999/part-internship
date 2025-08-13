# Documentation Generation Tools

This project uses a hybrid approach combining `swagger-jsdoc` and `swagger-autogen` to automatically generate Swagger/OpenAPI documentation and Postman collections from JSDoc comments in your code.

## How It Works

1. **JSDoc Comments**: Write JSDoc comments with `@swagger` annotations in your route files
2. **Hybrid Generation**: The system tries JSDoc parsing first, then falls back to automatic generation
3. **Dual Output**: Generates both Swagger documentation and Postman collections
4. **Server Integration**: The server automatically serves the generated documentation

## Available Scripts

```bash
# Generate all documentation (Swagger + Postman)
npm run docs:generate

# Generate only Swagger documentation
npm run docs:swagger

# Generate only Postman collection
npm run docs:postman

# Generate docs and start development server
npm run docs:dev

# Watch for changes and regenerate docs automatically
npm run docs:watch
```

## JSDoc Comment Format

Use the `@swagger` annotation in your route files. Here's an example:

```javascript
/**
 * @swagger
 * /api/comments:
 *   get:
 *     summary: Get all comments
 *     description: Retrieve comments. Returns a flat list of comments.
 *     tags: [Comments]
 *     parameters:
 *       - in: query
 *         name: parentId
 *         schema:
 *           type: string
 *         description: Get only replies to this specific comment
 *     responses:
 *       200:
 *         description: List of comments retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Comment'
 */
router.get('/', commentController.getAllComments);
```

## Workflow

1. **Development**: Write your routes with JSDoc comments
2. **Generate**: Run `npm run docs:generate` to create the Swagger file
3. **Start Server**: Run `npm run dev` or `npm run docs:dev`
4. **View Docs**: Access `/api-docs` endpoint in your browser

## Benefits

- ✅ **Hybrid Approach**: Combines JSDoc parsing with automatic generation
- ✅ **Fallback Support**: Automatically falls back if JSDoc parsing fails
- ✅ **Dual Output**: Generates both Swagger docs and Postman collections
- ✅ **JSDoc Integration**: Uses standard JSDoc comments
- ✅ **Real-time**: Regenerate docs whenever you change routes
- ✅ **Consistent**: Maintains consistent API documentation
- ✅ **Interactive**: Provides interactive Swagger UI
- ✅ **Organized**: Clean, modular tool structure

## File Structure

```
apps/comments/
├── tools/                   # Documentation generation tools
│   ├── README.md           # Tools documentation
│   ├── config.js           # Configuration file
│   ├── generate-docs.js    # Main generation script
│   ├── swagger/            # Swagger generation tools
│   │   └── index.js       # Swagger module
│   └── postman/            # Postman collection tools
│       └── index.js       # Postman generator
├── docs/                    # Generated documentation
│   ├── swagger-output.json # Swagger specification
│   └── comments-api.postman_collection.json # Postman collection
├── server.js               # Server with Swagger UI integration
└── src/
    └── routes/
        └── comments.js     # Routes with JSDoc comments
```

## Customization

You can modify the configuration in `tools/config.js`:

- API information (title, description, version)
- Server configurations
- Tags and categories
- Schema definitions
- Security schemes
- Output file paths
- Postman collection settings

## Troubleshooting

- **Docs not updating**: Make sure to run `npm run docs:generate` after changes
- **Swagger UI not loading**: Check that `swagger-output.json` exists
- **JSDoc errors**: Ensure your JSDoc syntax is correct

## Migration from Manual Swagger

The old `src/swagger.js` file has been replaced with automatic generation. Your existing JSDoc comments will continue to work and will be automatically converted to the new format.

## Postman Collection

The generated Postman collection includes:
- All API endpoints with proper HTTP methods
- Request body examples for POST/PUT/PATCH methods
- Query parameter examples
- Environment variables for easy configuration
- Import-ready format for Postman

To use the Postman collection:
1. Run `npm run docs:generate` to create the collection
2. Import `./docs/comments-api.postman_collection.json` into Postman
3. Set up environment variables (baseUrl, port) in Postman
4. Start testing your API endpoints
