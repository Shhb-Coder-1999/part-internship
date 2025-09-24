/**
 * Transaction Schemas for Part Bank API
 */

import { z } from 'zod';
import { paginationQuerySchema, errorResponseSchema, paginationMetaSchema } from './common.schemas.js';

// Transaction query parameters schema
export const transactionQuerySchema = paginationQuerySchema.extend({
  type: z.enum(['deposit', 'withdraw']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  minAmount: z.coerce.number().int().min(0).optional(),
  maxAmount: z.coerce.number().int().min(0).optional()
}).refine((data) => {
  // Validate date range
  if (data.startDate && data.endDate) {
    return new Date(data.startDate) <= new Date(data.endDate);
  }
  return true;
}, {
  message: 'startDate must be before or equal to endDate'
}).refine((data) => {
  // Validate amount range
  if (data.minAmount !== undefined && data.maxAmount !== undefined) {
    return data.minAmount <= data.maxAmount;
  }
  return true;
}, {
  message: 'minAmount must be less than or equal to maxAmount'
});

// Fastify schemas for documentation
export const transactionSchemas = {
  // List transactions endpoint
  listTransactionsQuery: {
    type: 'object',
    properties: {
      page: { 
        type: 'integer', 
        minimum: 1, 
        default: 1,
        description: 'Page number for pagination'
      },
      pageSize: { 
        type: 'integer', 
        minimum: 1, 
        maximum: 100, 
        default: 20,
        description: 'Number of items per page'
      },
      type: { 
        type: 'string', 
        enum: ['deposit', 'withdraw'],
        description: 'Filter by transaction type'
      },
      startDate: { 
        type: 'string', 
        format: 'date-time',
        description: 'Filter transactions from this date (ISO 8601)',
        example: '2024-01-01T00:00:00Z'
      },
      endDate: { 
        type: 'string', 
        format: 'date-time',
        description: 'Filter transactions until this date (ISO 8601)',
        example: '2024-12-31T23:59:59Z'
      },
      minAmount: { 
        type: 'integer', 
        minimum: 0,
        description: 'Filter transactions with amount >= this value (in minor units)',
        example: 1000000
      },
      maxAmount: { 
        type: 'integer', 
        minimum: 0,
        description: 'Filter transactions with amount <= this value (in minor units)',
        example: 10000000
      }
    }
  },

  listTransactionsResponse: {
    type: 'object',
    properties: {
      data: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            transactionId: { 
              type: 'string', 
              format: 'uuid',
              description: 'Unique transaction identifier',
              example: '123e4567-e89b-12d3-a456-426614174000'
            },
            accountId: { 
              type: 'string', 
              format: 'uuid',
              description: 'Associated deposit account ID',
              example: '123e4567-e89b-12d3-a456-426614174001'
            },
            type: { 
              type: 'string', 
              enum: ['deposit', 'withdraw'],
              description: 'Transaction type',
              example: 'deposit'
            },
            date: { 
              type: 'string', 
              format: 'date-time',
              description: 'Transaction date and time',
              example: '2024-07-17T12:53:35Z'
            },
            amount: { 
              type: 'integer',
              description: 'Transaction amount in minor units (rials)',
              example: 863937943
            }
          },
          required: ['transactionId', 'accountId', 'type', 'date', 'amount']
        }
      },
      meta: paginationMetaSchema
    },
    required: ['data', 'meta']
  },

  // Error response schema
  errorResponse: errorResponseSchema
};

export default {
  transactionQuerySchema,
  transactionSchemas
};