/**
 * Deposit Account Routes
 */

import { DepositAccountController } from '#app/controllers';
import { depositAccountSchemas } from '#app/schemas';

export default async function depositAccountRoutes(fastify, options) {
  const controller = DepositAccountController;

  // Apply authentication to all routes
  fastify.addHook('preHandler', fastify.authenticate);

  // Create deposit account
  fastify.post('/', {
    preHandler: [
      // Apply upload rate limiting
      async function (request, reply) {
        const uploadLimiter = fastify.rateLimitConfig.upload;
        await fastify.rateLimit(uploadLimiter)(request, reply);
      }
    ],
    schema: {
      description: 'Create a new deposit account for the authenticated user',
      tags: ['Deposit Accounts'],
      security: [{ bearerAuth: [] }],
      consumes: ['multipart/form-data'],
      body: depositAccountSchemas.createAccountRequest,
      response: {
        201: depositAccountSchemas.createAccountResponse,
        400: depositAccountSchemas.errorResponse,
        413: depositAccountSchemas.errorResponse,
        422: depositAccountSchemas.errorResponse
      }
    }
  }, controller.createAccount.bind(controller));

  // Get user's deposit accounts
  fastify.get('/', {
    schema: {
      description: 'Retrieve the list of the user\'s deposit accounts',
      tags: ['Deposit Accounts'],
      security: [{ bearerAuth: [] }],
      querystring: depositAccountSchemas.listAccountsQuery,
      response: {
        200: depositAccountSchemas.listAccountsResponse,
        401: depositAccountSchemas.errorResponse
      }
    }
  }, controller.getAccounts.bind(controller));

  // Delete deposit account(s)
  fastify.delete('/', {
    schema: {
      description: 'Delete deposit account(s) - specific account if ID provided, all accounts otherwise',
      tags: ['Deposit Accounts'],
      security: [{ bearerAuth: [] }],
      querystring: depositAccountSchemas.deleteAccountQuery,
      response: {
        204: {
          type: 'null',
          description: 'Account(s) deleted successfully'
        },
        404: depositAccountSchemas.errorResponse,
        401: depositAccountSchemas.errorResponse
      }
    }
  }, controller.deleteAccounts.bind(controller));

  // Get specific account by ID
  fastify.get('/:accountId', {
    schema: {
      description: 'Get a specific deposit account by ID',
      tags: ['Deposit Accounts'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          accountId: { type: 'string', format: 'uuid' }
        },
        required: ['accountId']
      },
      response: {
        200: depositAccountSchemas.createAccountResponse,
        404: depositAccountSchemas.errorResponse,
        401: depositAccountSchemas.errorResponse
      }
    }
  }, controller.getAccountById.bind(controller));

  // Get account statistics
  fastify.get('/stats', {
    schema: {
      description: 'Get user account statistics',
      tags: ['Deposit Accounts'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: {
                totalAccounts: { type: 'integer' },
                totalBalance: { type: 'integer' },
                totalScore: { type: 'integer' }
              }
            }
          }
        },
        401: depositAccountSchemas.errorResponse
      }
    }
  }, controller.getAccountStats.bind(controller));
}