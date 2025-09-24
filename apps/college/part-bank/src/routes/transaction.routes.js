/**
 * Transaction Routes
 */

import { TransactionController } from '#app/controllers';
import { transactionSchemas } from '#app/schemas';

export default async function transactionRoutes(fastify, options) {
  const controller = TransactionController;

  // Apply authentication to all routes
  fastify.addHook('preHandler', fastify.authenticate);

  // Get user's transactions with filtering and pagination
  fastify.get('/', {
    schema: {
      description: 'List transactions for the user\'s deposit accounts',
      tags: ['Transactions'],
      security: [{ bearerAuth: [] }],
      querystring: transactionSchemas.listTransactionsQuery,
      response: {
        200: transactionSchemas.listTransactionsResponse,
        401: transactionSchemas.errorResponse,
        422: transactionSchemas.errorResponse
      }
    }
  }, controller.getTransactions.bind(controller));

  // Get transaction by ID
  fastify.get('/:transactionId', {
    schema: {
      description: 'Get a specific transaction by ID',
      tags: ['Transactions'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          transactionId: { type: 'string', format: 'uuid' }
        },
        required: ['transactionId']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: {
                transactionId: { type: 'string', format: 'uuid' },
                accountId: { type: 'string', format: 'uuid' },
                type: { type: 'string', enum: ['deposit', 'withdraw'] },
                date: { type: 'string', format: 'date-time' },
                amount: { type: 'integer' }
              }
            }
          }
        },
        404: transactionSchemas.errorResponse,
        401: transactionSchemas.errorResponse
      }
    }
  }, controller.getTransactionById.bind(controller));

  // Get user transaction statistics
  fastify.get('/stats', {
    schema: {
      description: 'Get user transaction statistics',
      tags: ['Transactions'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: {
                totalTransactions: { type: 'integer' },
                totalDeposits: { type: 'integer' },
                totalWithdrawals: { type: 'integer' },
                depositAmount: { type: 'integer' },
                withdrawalAmount: { type: 'integer' }
              }
            }
          }
        },
        401: transactionSchemas.errorResponse
      }
    }
  }, controller.getTransactionStats.bind(controller));

  // Get recent transactions
  fastify.get('/recent', {
    schema: {
      description: 'Get recent transactions for the user',
      tags: ['Transactions'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'integer', minimum: 1, maximum: 50, default: 10 }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  transactionId: { type: 'string', format: 'uuid' },
                  accountId: { type: 'string', format: 'uuid' },
                  type: { type: 'string', enum: ['deposit', 'withdraw'] },
                  date: { type: 'string', format: 'date-time' },
                  amount: { type: 'integer' },
                  cardNumber: { type: 'string' }
                }
              }
            }
          }
        },
        401: transactionSchemas.errorResponse
      }
    }
  }, controller.getRecentTransactions.bind(controller));

  // Get transactions for a specific account
  fastify.get('/account/:accountId', {
    schema: {
      description: 'Get transactions for a specific deposit account',
      tags: ['Transactions'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          accountId: { type: 'string', format: 'uuid' }
        },
        required: ['accountId']
      },
      querystring: transactionSchemas.listTransactionsQuery,
      response: {
        200: transactionSchemas.listTransactionsResponse,
        404: transactionSchemas.errorResponse,
        401: transactionSchemas.errorResponse,
        422: transactionSchemas.errorResponse
      }
    }
  }, controller.getAccountTransactions.bind(controller));

  // Get transaction statistics for a specific account
  fastify.get('/account/:accountId/stats', {
    schema: {
      description: 'Get transaction statistics for a specific account',
      tags: ['Transactions'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          accountId: { type: 'string', format: 'uuid' }
        },
        required: ['accountId']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: {
                totalTransactions: { type: 'integer' },
                totalDeposits: { type: 'integer' },
                totalWithdrawals: { type: 'integer' },
                depositAmount: { type: 'integer' },
                withdrawalAmount: { type: 'integer' },
                lastTransaction: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    type: { type: 'string' },
                    amount: { type: 'integer' },
                    date: { type: 'string', format: 'date-time' }
                  }
                }
              }
            }
          }
        },
        404: transactionSchemas.errorResponse,
        401: transactionSchemas.errorResponse
      }
    }
  }, controller.getAccountTransactionStats.bind(controller));

  // Create transaction (admin/demo endpoint)
  fastify.post('/account/:accountId', {
    schema: {
      description: 'Create a new transaction for a deposit account (admin/demo)',
      tags: ['Transactions'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          accountId: { type: 'string', format: 'uuid' }
        },
        required: ['accountId']
      },
      body: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['deposit', 'withdraw'] },
          amount: { type: 'integer', minimum: 1 },
          date: { type: 'string', format: 'date-time' }
        },
        required: ['type', 'amount']
      },
      response: {
        201: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: {
                transactionId: { type: 'string', format: 'uuid' },
                accountId: { type: 'string', format: 'uuid' },
                type: { type: 'string', enum: ['deposit', 'withdraw'] },
                date: { type: 'string', format: 'date-time' },
                amount: { type: 'integer' }
              }
            }
          }
        },
        404: transactionSchemas.errorResponse,
        401: transactionSchemas.errorResponse,
        422: transactionSchemas.errorResponse
      }
    }
  }, controller.createTransaction.bind(controller));
}