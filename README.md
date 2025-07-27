# Comments API Server

A simple Express.js server for managing comments with full CRUD operations, nested replies, likes/dislikes, and soft deletion.

## Features

- ✅ Full CRUD operations for comments
- ✅ Nested comment replies
- ✅ Like/Dislike functionality
- ✅ Soft deletion (comments are marked as deleted but not removed)
- ✅ Input validation with proper error handling
- ✅ RESTful API design
- ✅ CORS enabled for cross-origin requests
- ✅ Comprehensive logging

## Quick Start

### Prerequisites

- Node.js (version 14 or higher)
- npm or yarn

### Installation

1. Clone or download the project files
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   # Development mode with auto-restart
   npm run dev
   
   # Production mode
   npm start
   ```

4. The server will start on `http://localhost:3000`

## API Endpoints

### Base URL
```
http://localhost:3000/api/comments
```

### 1. Get Comments
**GET** `/api/comments`

**Query Parameters:**
- `parentId` (optional): Get only replies to a specific comment
- `includeDeleted` (optional): Include soft-deleted comments (default: false)

**Examples:**
```bash
# Get all comments
GET /api/comments

# Get replies to a specific comment
GET /api/comments?parentId=comment_123

# Get all comments including deleted ones
GET /api/comments?includeDeleted=true
```

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": "comment_123",
      "userId": "user_456",
      "text": "مقاله فوق‌العاده‌ای بود!",
      "likes": 5,
      "dislikes": 2,
      "parentId": null,
      "replies": ["comment_124", "comment_125"],
      "createdAt": "2023-05-20T10:30:00Z",
      "updatedAt": "2023-05-20T10:30:00Z",
      "isDeleted": false
    }
  ]
}
```

### 2. Create Comment
**POST** `/api/comments`

**Request Body:**
```json
{
  "text": "Your comment text here",
  "parentId": "comment_123"  // Optional: for replies
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "id": "comment_1703123456789_123",
    "createdAt": "2023-12-20T10:30:00Z"
  }
}
```

### 3. Update Comment
**PATCH** `/api/comments/:id`

**Request Body:**
```json
{
  "text": "Updated comment text"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "updatedAt": "2023-12-20T10:35:00Z"
  }
}
```

### 4. Delete Comment (Soft Delete)
**DELETE** `/api/comments/:id`

**Response:**
```json
{
  "status": "success",
  "message": "Comment with ID 'comment_123' soft-deleted successfully.",
  "data": null
}
```

### 5. Like Comment
**POST** `/api/comments/:id/like`

**Response:**
```json
{
  "status": "success",
  "data": {
    "id": "comment_123",
    "likes": 6,
    "dislikes": 2
  }
}
```

### 6. Dislike Comment
**POST** `/api/comments/:id/dislike`

**Response:**
```json
{
  "status": "success",
  "data": {
    "id": "comment_123",
    "likes": 5,
    "dislikes": 3
  }
}
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "status": "error",
  "message": "Error description"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `404` - Not Found
- `500` - Internal Server Error

## Data Structure

### Comment Object
```typescript
interface Comment {
  id: string;           // Unique identifier
  userId: string;       // User who posted the comment
  text: string;         // Comment content (max 250 chars)
  likes: number;        // Number of likes
  dislikes: number;     // Number of dislikes
  parentId: string | null;  // Parent comment ID for replies
  replies: string[];    // Array of reply comment IDs
  createdAt: string;    // ISO 8601 timestamp
  updatedAt: string;    // ISO 8601 timestamp
  isDeleted: boolean;   // Soft deletion flag
}
```

## Validation Rules

- **Comment text**: Required, 1-250 characters
- **Parent comment**: Must exist and not be deleted
- **Comment operations**: Cannot perform actions on deleted comments

## Testing the API

### Using curl

```bash
# Get all comments
curl http://localhost:3000/api/comments

# Create a new comment
curl -X POST http://localhost:3000/api/comments \
  -H "Content-Type: application/json" \
  -d '{"text": "This is a test comment"}'

# Create a reply
curl -X POST http://localhost:3000/api/comments \
  -H "Content-Type: application/json" \
  -d '{"text": "This is a reply", "parentId": "comment_123"}'

# Update a comment
curl -X PATCH http://localhost:3000/api/comments/comment_123 \
  -H "Content-Type: application/json" \
  -d '{"text": "Updated comment text"}'

# Like a comment
curl -X POST http://localhost:3000/api/comments/comment_123/like

# Delete a comment
curl -X DELETE http://localhost:3000/api/comments/comment_123
```

### Using Postman or similar tools

Import these example requests:

1. **Get Comments**
   - Method: GET
   - URL: `http://localhost:3000/api/comments`

2. **Create Comment**
   - Method: POST
   - URL: `http://localhost:3000/api/comments`
   - Headers: `Content-Type: application/json`
   - Body: `{"text": "Your comment here"}`

3. **Update Comment**
   - Method: PATCH
   - URL: `http://localhost:3000/api/comments/comment_123`
   - Headers: `Content-Type: application/json`
   - Body: `{"text": "Updated text"}`

## Project Structure

```
├── server.js              # Main server file
├── package.json           # Dependencies and scripts
├── models/
│   └── Comment.js         # Comment data model and business logic
├── routes/
│   └── comments.js        # API route handlers
└── README.md              # This file
```

## Development

### Available Scripts

- `npm start` - Start the server in production mode
- `npm run dev` - Start the server in development mode with auto-restart

### Environment Variables

- `PORT` - Server port (default: 3000)

## Notes

- The server uses in-memory storage for simplicity
- All data is reset when the server restarts
- The current user is hardcoded as "user_456" for demonstration
- Comments support Persian/Arabic text and other Unicode characters
- Soft deletion is implemented - deleted comments are marked but not removed from data

## License

MIT 