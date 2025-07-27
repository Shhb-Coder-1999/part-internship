# Comments API Documentation

## Overview

This is a comprehensive API for managing comments with full CRUD operations, nested replies, likes/dislikes, and soft deletion. The API is built with Express.js and provides a RESTful interface.

## Quick Setup

### Prerequisites

- **Node.js**: Version 16 or higher (recommended: 18.x or 20.x)
- **npm**: Version 8 or higher

### Installation Troubleshooting

If you encounter the "Class extends value undefined is not a constructor or null" error:

1. **Clear npm cache**:
   ```bash
   npm cache clean --force
   ```

2. **Delete node_modules and package-lock.json**:
   ```bash
   rm -rf node_modules package-lock.json
   # On Windows:
   # rmdir /s node_modules
   # del package-lock.json
   ```

3. **Update npm to latest version**:
   ```bash
   npm install -g npm@latest
   ```

4. **Reinstall dependencies**:
   ```bash
   npm install
   ```

5. **Alternative: Use yarn** (if npm continues to fail):
   ```bash
   npm install -g yarn
   yarn install
   ```

### Start the Server

```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:3000`

## API Documentation

### Documentation Options

1. **Postman Collection**: `docs/postman-collection.json`
2. **Swagger/OpenAPI**: `docs/swagger.yaml`
3. **Interactive Swagger UI**: `docs/swagger-ui.html`

### Using Postman Collection

1. **Import the collection**:
   - Open Postman
   - Click "Import" → "File" → Select `docs/postman-collection.json`
   - The collection will be imported with all endpoints and examples

2. **Set up environment variables**:
   - The collection uses variables: `{{baseUrl}}` and `{{apiBase}}`
   - Default values are set to `http://localhost:3000` and `http://localhost:3000/api/comments`
   - You can modify these in the collection variables

3. **Test the API**:
   - Start with "Health Check" to verify server is running
   - Use "Get All Comments" to see initial data
   - Try creating, updating, and deleting comments

### Using Swagger Documentation

1. **View interactive documentation**:
   - Open `docs/swagger-ui.html` in your browser
   - This provides a web interface to explore and test the API
   - Make sure the server is running on `http://localhost:3000`

2. **Import to Swagger tools**:
   - Use `docs/swagger.yaml` with any OpenAPI-compatible tool
   - Compatible with Swagger Editor, Swagger UI, and other API documentation tools

## API Endpoints

### Base URL
```
http://localhost:3000
```

### System Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Check server health |
| GET | `/` | Get API information |

### Comments Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/comments` | Get all comments |
| POST | `/api/comments` | Create new comment |
| PATCH | `/api/comments/:id` | Update comment |
| DELETE | `/api/comments/:id` | Soft delete comment |
| POST | `/api/comments/:id/like` | Like comment |
| POST | `/api/comments/:id/dislike` | Dislike comment |

### Query Parameters

- `parentId` (optional): Get replies to specific comment
- `includeDeleted` (optional): Include soft-deleted comments (default: false)

## Data Models

### Comment Object

```json
{
  "id": "comment_123",
  "userId": "user_456",
  "text": "This is a comment",
  "likes": 5,
  "dislikes": 2,
  "parentId": null,
  "replies": ["comment_124", "comment_125"],
  "createdAt": "2023-05-20T10:30:00Z",
  "updatedAt": "2023-05-20T10:30:00Z",
  "isDeleted": false
}
```

### Request/Response Examples

#### Create Comment
```bash
POST /api/comments
Content-Type: application/json

{
  "text": "This is a new comment",
  "parentId": "comment_123"  // Optional
}
```

#### Update Comment
```bash
PATCH /api/comments/comment_123
Content-Type: application/json

{
  "text": "Updated comment text"
}
```

## Testing

### Manual Testing with curl

```bash
# Health check
curl http://localhost:3000/health

# Get all comments
curl http://localhost:3000/api/comments

# Create a comment
curl -X POST http://localhost:3000/api/comments \
  -H "Content-Type: application/json" \
  -d '{"text": "Test comment"}'

# Update a comment
curl -X PATCH http://localhost:3000/api/comments/comment_123 \
  -H "Content-Type: application/json" \
  -d '{"text": "Updated text"}'

# Like a comment
curl -X POST http://localhost:3000/api/comments/comment_123/like

# Delete a comment
curl -X DELETE http://localhost:3000/api/comments/comment_123
```

### Automated Testing

Run the comprehensive test suite:

```bash
# Start the server first
npm start

# In another terminal, run tests
npm test
```

## Features

### ✅ Implemented Features

- **Full CRUD Operations**: Create, Read, Update, Delete comments
- **Nested Replies**: Support for hierarchical comment structure
- **Like/Dislike System**: Track user reactions
- **Soft Deletion**: Comments are marked as deleted but not removed
- **Input Validation**: Comprehensive validation with proper error messages
- **RESTful Design**: Standard HTTP methods and status codes
- **CORS Support**: Cross-origin requests enabled
- **Comprehensive Logging**: Request logging and error tracking
- **Unicode Support**: Full support for Persian, Arabic, and other languages
- **Error Handling**: Proper HTTP status codes and error messages

### 🔧 Technical Details

- **Framework**: Express.js
- **Data Storage**: In-memory (for demonstration)
- **Validation**: Custom validation service with rules
- **Error Handling**: Centralized error handling with status codes
- **Logging**: Request logging middleware
- **CORS**: Enabled for all origins

## Error Handling

All endpoints return consistent error responses:

```json
{
  "status": "error",
  "message": "Error description"
}
```

### Common HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `404` - Not Found
- `500` - Internal Server Error

### Validation Rules

- **Comment text**: Required, 1-250 characters
- **Parent comment**: Must exist and not be deleted
- **Comment operations**: Cannot perform actions on deleted comments

## Development

### Project Structure

```
├── server.js              # Main server file
├── package.json           # Dependencies and scripts
├── models/
│   └── Comment.js         # Comment data model and business logic
├── routes/
│   └── comments.js        # API route handlers
├── test/
│   └── test-api.js        # Comprehensive test suite
├── docs/
│   ├── postman-collection.json  # Postman collection
│   ├── swagger.yaml             # OpenAPI specification
│   ├── swagger-ui.html          # Interactive documentation
│   └── API_DOCUMENTATION.md     # This file
└── README.md              # Project overview
```

### Available Scripts

- `npm start` - Start the server in production mode
- `npm run dev` - Start the server in development mode with auto-restart
- `npm test` - Run the comprehensive test suite

### Environment Variables

- `PORT` - Server port (default: 3000)

## Troubleshooting

### Common Issues

1. **Port already in use**:
   ```bash
   # Find process using port 3000
   netstat -ano | findstr :3000
   # Kill the process
   taskkill /PID <process_id> /F
   ```

2. **CORS issues**: The server has CORS enabled for all origins

3. **Validation errors**: Check the error message for specific validation requirements

4. **Comment not found**: Ensure the comment ID exists and is not deleted

### Getting Help

1. Check the server logs for detailed error information
2. Use the health check endpoint to verify server status
3. Review the test suite for examples of proper API usage
4. Use the interactive Swagger UI for testing endpoints

## License

MIT License - see LICENSE file for details. 