/**
 * Comment Routes
 * Defines all comment-related API endpoints
 */

import express from 'express';
import { commentController } from '@controllers';
import { commentValidation } from '@middleware';
import { commentRateLimit, createRateLimiter } from '@utils';
import { asyncHandler } from '@shared/utils';

const router = express.Router();

/**
 * @swagger
 * /api/comments:
 *   get:
 *     summary: Get all comments
 *     description: Retrieve comments. Returns a flat list of comments. Client is responsible for nesting.
 *     tags: [Comments]
 *     parameters:
 *       - in: query
 *         name: parentId
 *         schema:
 *           type: string
 *         description: Get only replies to this specific comment
 *         example: comment_123
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include soft-deleted comments in the response
 *         example: true
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
router.get('/', asyncHandler(commentController.getAllComments.bind(commentController)));

/**
 * @swagger
 * /api/comments:
 *   post:
 *     summary: Create a new comment
 *     description: Create a new comment with text and author information
 *     tags: [Comments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CommentCreate'
 *           example:
 *             text: "This is a new comment"
 *             authorId: "user_123"
 *             parentId: null
 *     responses:
 *       201:
 *         description: Comment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Comment'
 */
router.post('/', 
  commentRateLimit(createRateLimiter()),
  commentValidation.sanitizeTextMiddleware,
  commentValidation.validateCommentCreation,
  asyncHandler(commentController.createComment.bind(commentController))
);

/**
 * @swagger
 * /api/comments/search:
 *   get:
 *     summary: Search comments
 *     description: Search comments by text content
 *     tags: [Comments]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query string
 *         example: "example"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Maximum number of results to return
 *         example: 10
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Comment'
 */
router.get('/search', asyncHandler(commentController.searchComments.bind(commentController)));

/**
 * @swagger
 * /api/comments/stats:
 *   get:
 *     summary: Get comment statistics
 *     description: Get comment statistics and metrics
 *     tags: [Comments]
 *     responses:
 *       200:
 *         description: Comment statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalComments:
 *                   type: integer
 *                   example: 150
 *                 totalLikes:
 *                   type: integer
 *                   example: 1250
 *                 totalDislikes:
 *                   type: integer
 *                   example: 45
 */
router.get('/stats', asyncHandler(commentController.getCommentStats.bind(commentController)));

/**
 * @swagger
 * /api/comments/{id}:
 *   get:
 *     summary: Get comment by ID
 *     description: Get a specific comment by its ID
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Comment ID
 *         example: comment_123
 *     responses:
 *       200:
 *         description: Comment retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Comment'
 *       404:
 *         description: Comment not found
 */
router.get('/:id', asyncHandler(commentController.getCommentById.bind(commentController)));

/**
 * @swagger
 * /api/comments/{id}:
 *   patch:
 *     summary: Update a comment
 *     description: Update an existing comment's text
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Comment ID
 *         example: comment_123
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CommentUpdate'
 *           example:
 *             text: "Updated comment text"
 *     responses:
 *       200:
 *         description: Comment updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Comment'
 *       404:
 *         description: Comment not found
 */
router.patch('/:id', 
  commentValidation.sanitizeTextMiddleware,
  commentValidation.validateCommentUpdate,
  asyncHandler(commentController.updateComment.bind(commentController))
);

/**
 * @swagger
 * /api/comments/{id}:
 *   delete:
 *     summary: Delete a comment
 *     description: Soft delete a comment (marks as deleted but doesn't remove from database)
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Comment ID
 *         example: comment_123
 *     responses:
 *       200:
 *         description: Comment deleted successfully
 *       404:
 *         description: Comment not found
 */
router.delete('/:id', asyncHandler(commentController.deleteComment.bind(commentController)));

/**
 * @swagger
 * /api/comments/{id}/like:
 *   post:
 *     summary: Like a comment
 *     description: Like a comment (increments like count)
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Comment ID
 *         example: comment_123
 *     responses:
 *       200:
 *         description: Comment liked successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Comment'
 *       404:
 *         description: Comment not found
 */
router.post('/:id/like', asyncHandler(commentController.likeComment.bind(commentController)));

/**
 * @swagger
 * /api/comments/{id}/dislike:
 *   post:
 *     summary: Dislike a comment
 *     description: Dislike a comment (increments dislike count)
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Comment ID
 *         example: comment_123
 *     responses:
 *       200:
 *         description: Comment disliked successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Comment'
 *       404:
 *         description: Comment not found
 */
router.post('/:id/dislike', asyncHandler(commentController.dislikeComment.bind(commentController)));

export default router;
