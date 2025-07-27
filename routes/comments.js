import express from 'express';
import { CommentData } from '../models/Comment.js';

const router = express.Router();

// A) GET /api/comments - Get list of comments
// Query parameter: parentId (optional) - if present, returns direct replies for that parentId.
//                   If no parentId, returns all comments (top-level and replies) in a flat list.
// Query parameter: includeDeleted (optional) - if true, includes soft-deleted comments.
router.get('/', (req, res) => {
  try {
    const parentId = req.query.parentId || null;
    const includeDeleted = req.query.includeDeleted === 'true'; // Check for boolean true
    const fetchedComments = CommentData.getAll(parentId, includeDeleted);

    console.log(`API: Returning comments (parentId: ${parentId || 'all'}, includeDeleted: ${includeDeleted}):`, fetchedComments);

    return res.status(200).json({
      status: "success",
      data: fetchedComments
    });
  } catch (error) {
    console.error('API: Error getting comments:', error.message);
    return res.status(500).json({ 
      status: "error", 
      message: error.message 
    });
  }
});

// B) POST /api/comments - Add a new comment
// Request body: { text: string, parentId?: string }
router.post('/', async (req, res) => {
  try {
    const { text, parentId } = req.body;
    const newComment = CommentData.add(text, parentId);

    console.log('API: Created new comment:', newComment);

    return res.status(201).json({
      status: "success",
      data: {
        id: newComment.id,
        createdAt: newComment.createdAt,
      }
    });
  } catch (error) {
    console.error('API: Error adding comment:', error.message);
    // Use the statusCode attached to the error object, default to 500
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ 
      status: "error", 
      message: error.message 
    });
  }
});

// C) PATCH /api/comments/:id - Edit a comment
// Request body: { text: string }
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;

    const updatedComment = CommentData.update(id, text);

    console.log('API: Updated comment:', updatedComment);

    return res.status(200).json({
      status: "success",
      data: {
        updatedAt: updatedComment.updatedAt
      }
    });
  } catch (error) {
    console.error('API: Error updating comment:', error.message);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ 
      status: "error", 
      message: error.message 
    });
  }
});

// D) DELETE /api/comments/:id - Delete a comment (soft-delete)
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const deleted = CommentData.deleteComment(id);

    // No need for 'if (!deleted)' check here, as validation service will throw
    // if it's not found or already deleted.
    console.log(`API: Soft-deleted comment with ID: ${id}`);

    return res.status(200).json({
      status: "success",
      message: `Comment with ID '${id}' soft-deleted successfully.`,
      data: null
    });
  } catch (error) {
    console.error('API: Error deleting comment:', error.message);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ 
      status: "error", 
      message: error.message 
    });
  }
});

// E) POST /api/comments/:id/like - Like a comment
router.post('/:id/like', (req, res) => {
  try {
    const { id } = req.params;
    const { likes, dislikes } = CommentData.addLike(id);

    console.log(`API: Liked comment ${id}. New likes: ${likes}`);

    return res.status(200).json({
      status: "success",
      data: { id, likes, dislikes }
    });
  } catch (error) {
    console.error('API: Error liking comment:', error.message);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ 
      status: "error", 
      message: error.message 
    });
  }
});

// F) POST /api/comments/:id/dislike - Dislike a comment
router.post('/:id/dislike', (req, res) => {
  try {
    const { id } = req.params;
    const { likes, dislikes } = CommentData.addDislike(id);

    console.log(`API: Disliked comment ${id}. New dislikes: ${dislikes}`);

    return res.status(200).json({
      status: "success",
      data: { id, likes, dislikes }
    });
  } catch (error) {
    console.error('API: Error disliking comment:', error.message);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ 
      status: "error", 
      message: error.message 
    });
  }
});

export default router; 