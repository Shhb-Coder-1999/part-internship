import { commentController } from '@app/controllers';
import {
  CreateCommentBody,
  UpdateCommentParams,
  UpdateCommentBody,
  CommentIdParams,
  SearchQuery,
  ListCommentsQuery,
} from '@app/schemas';
import { VALIDATION_RULES, LOG_CONTEXTS } from '@app/constants';

/**
 * Fastify Comments Routes Plugin
 * Handles all comment-related endpoints with JSON Schema validation
 */
async function commentsRoutes(fastify, options) {
  // Configure rate limiting for comment creation
  const rateLimitOptions = {
    max: VALIDATION_RULES.RATE_LIMIT.MAX_COMMENTS,
    timeWindow: VALIDATION_RULES.RATE_LIMIT.WINDOW_MS,
    errorResponseBuilder: (request, context) => ({
      success: false,
      error: 'Rate limit exceeded',
      message: `Too many comment attempts, retry in ${Math.round(context.ttl / 1000)} seconds`,
      statusCode: 429,
      timestamp: new Date().toISOString(),
    }),
  };

  // Get all comments with pagination
  fastify.get(
    '/',
    {
      schema: {
        description: 'Get all comments with pagination and filtering',
        tags: ['Comments'],
        querystring: ListCommentsQuery,
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  comments: { type: 'array' },
                  pagination: { type: 'object' },
                },
              },
              timestamp: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      return await commentController.getAllComments(request, reply);
    }
  );

  // Create new comment (with rate limiting)
  fastify.post(
    '/',
    {
      config: {
        rateLimit: rateLimitOptions,
      },
      schema: {
        description: 'Create a new comment',
        tags: ['Comments'],
        body: CreateCommentBody,
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: { type: 'object' },
              timestamp: { type: 'string' },
            },
          },
          400: {
            type: 'object',
            properties: {
              success: { type: 'boolean', enum: [false] },
              error: { type: 'string' },
              statusCode: { type: 'integer' },
              timestamp: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      reply.status(201);
      return await commentController.createComment(request, reply);
    }
  );

  // Search comments
  fastify.get(
    '/search',
    {
      schema: {
        description: 'Search comments by text content',
        tags: ['Comments'],
        querystring: SearchQuery,
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  comments: { type: 'array' },
                  query: { type: 'string' },
                  count: { type: 'integer' },
                },
              },
              timestamp: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      return await commentController.searchComments(request, reply);
    }
  );

  // Get comment statistics
  fastify.get(
    '/stats',
    {
      schema: {
        description: 'Get comprehensive comment statistics',
        tags: ['Comments'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  totalComments: { type: 'integer' },
                  activeComments: { type: 'integer' },
                  deletedComments: { type: 'integer' },
                  totalLikes: { type: 'integer' },
                  totalDislikes: { type: 'integer' },
                  commentsToday: { type: 'integer' },
                },
              },
              timestamp: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      return await commentController.getCommentStats(request, reply);
    }
  );

  // Get comment by ID
  fastify.get(
    '/:id',
    {
      schema: {
        description: 'Get a specific comment by ID',
        tags: ['Comments'],
        params: CommentIdParams,
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: { type: 'object' },
              timestamp: { type: 'string' },
            },
          },
          404: {
            type: 'object',
            properties: {
              success: { type: 'boolean', enum: [false] },
              error: { type: 'string' },
              statusCode: { type: 'integer' },
              timestamp: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      return await commentController.getCommentById(request, reply);
    }
  );

  // Update comment
  fastify.patch(
    '/:id',
    {
      schema: {
        description: 'Update a comment by ID',
        tags: ['Comments'],
        params: UpdateCommentParams,
        body: UpdateCommentBody,
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: { type: 'object' },
              timestamp: { type: 'string' },
            },
          },
          404: {
            type: 'object',
            properties: {
              success: { type: 'boolean', enum: [false] },
              error: { type: 'string' },
              statusCode: { type: 'integer' },
              timestamp: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      return await commentController.updateComment(request, reply);
    }
  );

  // Delete comment (soft delete)
  fastify.delete(
    '/:id',
    {
      schema: {
        description: 'Delete a comment by ID (soft delete)',
        tags: ['Comments'],
        params: CommentIdParams,
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: { type: 'null' },
              timestamp: { type: 'string' },
            },
          },
          404: {
            type: 'object',
            properties: {
              success: { type: 'boolean', enum: [false] },
              error: { type: 'string' },
              statusCode: { type: 'integer' },
              timestamp: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      return await commentController.deleteComment(request, reply);
    }
  );

  // Like a comment
  fastify.post(
    '/:id/like',
    {
      schema: {
        description: 'Like a comment',
        tags: ['Comments'],
        params: CommentIdParams,
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: { type: 'object' },
              timestamp: { type: 'string' },
            },
          },
          404: {
            type: 'object',
            properties: {
              success: { type: 'boolean', enum: [false] },
              error: { type: 'string' },
              statusCode: { type: 'integer' },
              timestamp: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      return await commentController.likeComment(request, reply);
    }
  );

  // Dislike a comment
  fastify.post(
    '/:id/dislike',
    {
      schema: {
        description: 'Dislike a comment',
        tags: ['Comments'],
        params: CommentIdParams,
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: { type: 'object' },
              timestamp: { type: 'string' },
            },
          },
          404: {
            type: 'object',
            properties: {
              success: { type: 'boolean', enum: [false] },
              error: { type: 'string' },
              statusCode: { type: 'integer' },
              timestamp: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      return await commentController.dislikeComment(request, reply);
    }
  );
}

export default commentsRoutes;
