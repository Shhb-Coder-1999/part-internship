import { commentController } from '../controllers/index.js';
// Schema imports temporarily simplified for startup
// import {
//   CreateCommentBody,
//   UpdateCommentParams,
//   UpdateCommentBody,
//   CommentIdParams,
//   SearchQuery,
//   ListCommentsQuery,
// } from '../schemas/index.js';
import { VALIDATION_RULES, LOG_CONTEXTS } from '../constants/index.js';
import { 
  extractUserContext, 
  requireAuth, 
  requireRoles, 
  optionalAuth 
} from '../../../../../packages/shared/auth/index.js';

/**
 * Fastify Comments Routes Plugin
 * Handles all comment-related endpoints with JSON Schema validation
 */
async function commentsRoutes(fastify, options) {
  // Register user context middleware for all routes
  fastify.addHook('preHandler', extractUserContext);

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

  // Get all comments with pagination (PUBLIC endpoint - returns all comments or user's comments if authenticated)
  fastify.get(
    '/',
    {
      preHandler: [optionalAuth], // Optional authentication
      schema: {
        description: 'Get all comments with pagination and filtering. Public endpoint but can be filtered by user if authenticated.',
        tags: ['Comments'],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'integer', minimum: 1, default: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            parentId: { type: 'string' },
            includeDeleted: { type: 'boolean' }
          }
        },
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
                  meta: { type: 'object' },
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

  // Get user's private comments (PRIVATE endpoint - requires authentication)
  fastify.get(
    '/my',
    {
      preHandler: [requireAuth], // Requires authentication
      schema: {
        description: 'Get current user\'s comments with pagination and filtering',
        tags: ['Comments', 'Private'],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'integer', minimum: 1, default: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            parentId: { type: 'string' },
            includeDeleted: { type: 'boolean' }
          }
        },
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
                  meta: { type: 'object' },
                },
              },
              timestamp: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      return await commentController.getComments(request, reply);
    }
  );

  // Create new comment (PROTECTED - requires authentication)
  fastify.post(
    '/',
    {
      preHandler: [requireAuth], // Requires authentication
      config: {
        rateLimit: rateLimitOptions,
      },
      schema: {
        description: 'Create a new comment (requires authentication)',
        tags: ['Comments', 'Protected'],
        body: {
          type: 'object',
          required: ['text'],
          properties: {
            text: { type: 'string', minLength: 1, maxLength: 1000 },
            parentId: { type: 'string' }
          }
        },
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
          401: {
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
        querystring: {
          type: 'object',
          required: ['q'],
          properties: {
            q: { type: 'string', minLength: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 }
          }
        },
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
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', pattern: '^[a-zA-Z0-9_-]+$' }
          }
        },
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
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', pattern: '^[a-zA-Z0-9_-]+$' }
          }
        },
        body: {
          type: 'object',
          required: ['text'],
          properties: {
            text: { type: 'string', minLength: 1, maxLength: 1000 }
          }
        },
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
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', pattern: '^[a-zA-Z0-9_-]+$' }
          }
        },
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
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', pattern: '^[a-zA-Z0-9_-]+$' }
          }
        },
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
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', pattern: '^[a-zA-Z0-9_-]+$' }
          }
        },
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
