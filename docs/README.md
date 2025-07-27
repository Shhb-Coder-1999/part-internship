# Comments API - User Guide

## 🚀 Quick Start

Welcome to the Comments API! This is a powerful REST API for managing comments with features like nested replies, likes/dislikes, and soft deletion.

### What You'll Get

- ✅ **Full CRUD Operations** - Create, read, update, delete comments
- ✅ **Nested Replies** - Build threaded comment discussions
- ✅ **Like/Dislike System** - Track user reactions
- ✅ **Soft Deletion** - Safe comment removal
- ✅ **Input Validation** - Robust error handling
- ✅ **Unicode Support** - Persian, Arabic, and all languages
- ✅ **RESTful Design** - Standard HTTP methods

## 📋 Prerequisites

Before you start, make sure you have:

- **Node.js** (version 16 or higher)
- **npm** (version 8 or higher)

### Check Your Versions

```bash
node --version
npm --version
```

If you don't have Node.js installed, download it from [nodejs.org](https://nodejs.org/)

## 🛠️ Installation & Setup

### Step 1: Download the Project

Download or clone the project files to your computer.

### Step 2: Install Dependencies

Open a terminal/command prompt in the project folder and run:

```bash
npm install
```

**If you get an error**, try these steps:

1. **Clear npm cache**:
   ```bash
   npm cache clean --force
   ```

2. **Delete existing files**:
   ```bash
   # Windows
   rmdir /s node_modules
   del package-lock.json
   
   # Mac/Linux
   rm -rf node_modules package-lock.json
   ```

3. **Update npm**:
   ```bash
   npm install -g npm@latest
   ```

4. **Try again**:
   ```bash
   npm install
   ```

### Step 3: Start the Server

```bash
# Development mode (auto-restart on changes)
npm run dev

# OR Production mode
npm start
```

You should see:
```
🚀 Server is running on http://localhost:3000
📝 Comments API available at http://localhost:3000/api/comments
🏥 Health check at http://localhost:3000/health
```

## 🌐 API Endpoints

### Base URL
```
http://172.30.230.15:3000
```

### Quick Test

Test if the server is running:
```bash
curl http://172.30.230.15:3000/health
```

You should get:
```json
{
  "status": "success",
  "message": "Server is running",
  "timestamp": "2023-12-20T10:30:00Z"
}
```

## 📖 API Usage Examples

### 1. Get All Comments

```bash
curl http://localhost:3000/api/comments
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

### 2. Create a New Comment

```bash
curl -X POST http://localhost:3000/api/comments \
  -H "Content-Type: application/json" \
  -d '{"text": "This is a great article!"}'
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

### 3. Create a Reply

```bash
curl -X POST http://localhost:3000/api/comments \
  -H "Content-Type: application/json" \
  -d '{
    "text": "I agree with your comment!",
    "parentId": "comment_123"
  }'
```

### 4. Update a Comment

```bash
curl -X PATCH http://localhost:3000/api/comments/comment_123 \
  -H "Content-Type: application/json" \
  -d '{"text": "Updated comment text"}'
```

### 5. Like a Comment

```bash
curl -X POST http://localhost:3000/api/comments/comment_123/like
```

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

### 6. Delete a Comment (Soft Delete)

```bash
curl -X DELETE http://localhost:3000/api/comments/comment_123
```

**Response:**
```json
{
  "status": "success",
  "message": "Comment with ID 'comment_123' soft-deleted successfully.",
  "data": null
}
```

## 🔧 Advanced Features

### Get Replies to a Specific Comment

```bash
curl "http://localhost:3000/api/comments?parentId=comment_123"
```

### Include Deleted Comments

```bash
curl "http://localhost:3000/api/comments?includeDeleted=true"
```

### Persian/Arabic Text Support

```bash
curl -X POST http://localhost:3000/api/comments \
  -H "Content-Type: application/json" \
  -d '{"text": "این یک کامنت فارسی است"}'
```

## 📱 Using with Different Tools

### Postman

1. **Import the collection**:
   - Open Postman
   - Click "Import" → "File"
   - Select `docs/postman-collection.json`

2. **Set up environment**:
   - The collection uses variables: `{{baseUrl}}` and `{{apiBase}}`
   - Default: `http://localhost:3000` and `http://localhost:3000/api/comments`

3. **Start testing**:
   - Begin with "Health Check"
   - Try "Get All Comments"
   - Create, update, and delete comments

### Swagger UI

1. **Open the documentation**:
   - Open `docs/swagger-ui.html` in your browser
   - Make sure the server is running

2. **Interactive testing**:
   - Click "Try it out" on any endpoint
   - Fill in the parameters
   - Execute the request

### JavaScript/Fetch

```javascript
// Get all comments
fetch('http://localhost:3000/api/comments')
  .then(response => response.json())
  .then(data => console.log(data));

// Create a comment
fetch('http://localhost:3000/api/comments', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    text: 'Hello from JavaScript!'
  })
})
.then(response => response.json())
.then(data => console.log(data));
```

## 🧪 Testing

### Run Automated Tests

```bash
# Start the server first
npm start

# In another terminal, run tests
npm test
```

### Manual Testing

Use the provided test scenarios in the Postman collection or try these curl commands:

```bash
# Test health check
curl http://localhost:3000/health

# Test API info
curl http://localhost:3000/

# Test getting comments
curl http://localhost:3000/api/comments

# Test creating a comment
curl -X POST http://localhost:3000/api/comments \
  -H "Content-Type: application/json" \
  -d '{"text": "Test comment"}'
```

## ⚠️ Common Issues & Solutions

### 1. "Port 3000 is already in use"

**Solution:**
```bash
# Find the process using port 3000
netstat -ano | findstr :3000

# Kill the process (replace <PID> with the actual process ID)
taskkill /PID <PID> /F
```

### 2. "Cannot connect to server"

**Check:**
- Is the server running? Run `npm start`
- Is the port correct? Default is 3000
- Check firewall settings

### 3. "Validation error"

**Common causes:**
- Empty comment text (minimum 1 character)
- Text too long (maximum 250 characters)
- Invalid parent comment ID

### 4. "Comment not found"

**Check:**
- Comment ID exists
- Comment is not soft-deleted
- Use `?includeDeleted=true` to see deleted comments

## 📊 Data Structure

### Comment Object

```json
{
  "id": "comment_123",           // Unique identifier
  "userId": "user_456",          // User who posted
  "text": "Comment content",     // 1-250 characters
  "likes": 5,                    // Number of likes
  "dislikes": 2,                 // Number of dislikes
  "parentId": null,              // Parent comment ID (null for top-level)
  "replies": ["comment_124"],    // Array of reply IDs
  "createdAt": "2023-05-20T10:30:00Z",  // Creation timestamp
  "updatedAt": "2023-05-20T10:30:00Z",  // Last update timestamp
  "isDeleted": false             // Soft deletion flag
}
```

### Response Format

All responses follow this format:

**Success:**
```json
{
  "status": "success",
  "data": { ... }
}
```

**Error:**
```json
{
  "status": "error",
  "message": "Error description"
}
```

## 🔒 Validation Rules

- **Comment text**: Required, 1-250 characters
- **Parent comment**: Must exist and not be deleted
- **Comment operations**: Cannot perform actions on deleted comments
- **Unicode support**: Full support for all languages

## 📞 Getting Help

### Documentation Files

- `docs/API_DOCUMENTATION.md` - Complete technical documentation
- `docs/postman-collection.json` - Postman collection
- `docs/swagger.yaml` - OpenAPI specification
- `docs/swagger-ui.html` - Interactive documentation

### Troubleshooting Steps

1. **Check server status**: `curl http://localhost:3000/health`
2. **Review server logs**: Look for error messages in the terminal
3. **Test with curl**: Use the examples above
4. **Use Postman**: Import the collection for easy testing
5. **Check validation**: Ensure your requests meet the requirements

### Common HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `404` - Not Found
- `500` - Internal Server Error

## 🎯 Next Steps

1. **Explore the API**: Try all endpoints with the provided examples
2. **Build your application**: Integrate the API into your project
3. **Test thoroughly**: Use the automated test suite
4. **Customize**: Modify the code to fit your specific needs

## 📄 License

This project is licensed under the MIT License.

---

**Happy coding! 🚀**

If you need help, check the troubleshooting section or review the complete documentation in `docs/API_DOCUMENTATION.md`. 