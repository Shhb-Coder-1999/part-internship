/**
 * Deposit Account Schemas for Part Bank API
 */

import { z } from 'zod';
import { nameSchema, addressSchema, postalCodeSchema, paginationQuerySchema, errorResponseSchema, paginationMetaSchema } from './common.schemas.js';

// Create deposit account request schema (for multipart data validation)
export const createDepositAccountSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  address: addressSchema,
  postalCode: postalCodeSchema
});

// Query parameters for listing accounts
export const listAccountsQuerySchema = paginationQuerySchema;

// Query parameters for deleting account
export const deleteAccountQuerySchema = z.object({
  accountId: z.string().uuid('Account ID must be a valid UUID').optional()
});

// Fastify schemas for documentation
export const depositAccountSchemas = {
  // Create deposit account endpoint
  createAccountRequest: {
    description: 'Multipart form data with fields and file upload',
    type: 'object',
    properties: {
      firstName: { 
        type: 'string', 
        minLength: 1, 
        maxLength: 100,
        description: 'Account holder first name',
        example: 'علی'
      },
      lastName: { 
        type: 'string', 
        minLength: 1, 
        maxLength: 100,
        description: 'Account holder last name',
        example: 'احمدی'
      },
      address: { 
        type: 'string', 
        minLength: 1, 
        maxLength: 300,
        description: 'Account holder address',
        example: 'خیابان ولیعصر، پلاک ۱۲۳، تهران'
      },
      postalCode: { 
        type: 'string', 
        minLength: 5, 
        maxLength: 12,
        pattern: '^\\d+$',
        description: 'Postal code (5-12 digits)',
        example: '1234567890'
      },
      nationalCardImage: {
        type: 'string',
        format: 'binary',
        description: 'National ID card image (JPEG/PNG, max 5MB)'
      }
    },
    required: ['firstName', 'lastName', 'address', 'postalCode', 'nationalCardImage']
  },

  createAccountResponse: {
    type: 'object',
    properties: {
      data: {
        type: 'object',
        properties: {
          accountId: { 
            type: 'string', 
            format: 'uuid',
            description: 'Unique account identifier',
            example: '123e4567-e89b-12d3-a456-426614174000'
          },
          userId: { 
            type: 'string', 
            format: 'uuid',
            description: 'Account owner user ID',
            example: '123e4567-e89b-12d3-a456-426614174001'
          },
          firstName: { 
            type: 'string',
            description: 'Account holder first name',
            example: 'علی'
          },
          lastName: { 
            type: 'string',
            description: 'Account holder last name',
            example: 'احمدی'
          },
          address: { 
            type: 'string',
            description: 'Account holder address',
            example: 'خیابان ولیعصر، پلاک ۱۲۳، تهران'
          },
          postalCode: { 
            type: 'string',
            description: 'Postal code',
            example: '1234567890'
          },
          cardNumber: { 
            type: 'string',
            description: 'Generated card number (Luhn-valid)',
            example: '5555123456781234'
          },
          balance: { 
            type: 'integer',
            description: 'Account balance in minor units (rials)',
            example: 71000000
          },
          score: {
            type: 'object',
            properties: {
              amount: { 
                type: 'integer',
                description: 'Score amount in minor units (rials)',
                example: 11000000
              },
              paymentPeriod: { 
                type: 'integer',
                enum: [12, 24, 48],
                description: 'Payment period in months',
                example: 12
              }
            },
            required: ['amount', 'paymentPeriod']
          },
          upcomingInstalment: {
            type: 'object',
            properties: {
              amount: { 
                type: 'integer',
                description: 'Instalment amount in minor units (rials)',
                example: 1000000
              },
              dueDate: { 
                type: 'string',
                pattern: '^\\d{8}$',
                description: 'Due date in YYYYMMDD format',
                example: '20250108'
              }
            },
            required: ['amount', 'dueDate']
          },
          document: {
            type: 'object',
            properties: {
              type: { 
                type: 'string',
                description: 'Document type',
                example: 'nationalCardImage'
              },
              contentType: { 
                type: 'string',
                description: 'File MIME type',
                example: 'image/jpeg'
              },
              size: { 
                type: 'integer',
                description: 'File size in bytes',
                example: 123456
              },
              id: { 
                type: 'string',
                description: 'File identifier',
                example: 'file-id'
              }
            },
            required: ['type', 'contentType', 'size', 'id']
          },
          createdAt: { 
            type: 'string', 
            format: 'date-time',
            description: 'Account creation timestamp',
            example: '2025-09-22T10:00:00Z'
          }
        },
        required: ['accountId', 'userId', 'firstName', 'lastName', 'address', 'postalCode', 'cardNumber', 'balance', 'score', 'upcomingInstalment', 'document', 'createdAt']
      }
    },
    required: ['data']
  },

  // List accounts endpoint
  listAccountsQuery: {
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
        default: 50,
        description: 'Number of items per page'
      }
    }
  },

  listAccountsResponse: {
    type: 'object',
    properties: {
      data: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            accountId: { 
              type: 'string', 
              format: 'uuid',
              description: 'Unique account identifier'
            },
            userId: { 
              type: 'string', 
              format: 'uuid',
              description: 'Account owner user ID'
            },
            firstName: { 
              type: 'string',
              description: 'Account holder first name'
            },
            lastName: { 
              type: 'string',
              description: 'Account holder last name'
            },
            address: { 
              type: 'string',
              description: 'Account holder address'
            },
            postalCode: { 
              type: 'string',
              description: 'Postal code'
            },
            cardNumber: { 
              type: 'string',
              description: 'Card number'
            },
            balance: { 
              type: 'integer',
              description: 'Account balance in minor units (rials)'
            },
            score: {
              type: 'object',
              properties: {
                amount: { type: 'integer' },
                paymentPeriod: { type: 'integer', enum: [12, 24, 48] }
              }
            },
            upcomingInstalment: {
              type: 'object',
              properties: {
                amount: { type: 'integer' },
                dueDate: { type: 'string', pattern: '^\\d{8}$' }
              }
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        }
      },
      meta: paginationMetaSchema
    },
    required: ['data', 'meta']
  },

  // Delete account endpoint
  deleteAccountQuery: {
    type: 'object',
    properties: {
      accountId: { 
        type: 'string', 
        format: 'uuid',
        description: 'Account ID to delete (optional - if not provided, all accounts are deleted)'
      }
    }
  },

  deleteAccountResponse: {
    type: 'object',
    properties: {
      message: {
        type: 'string',
        description: 'Success message'
      }
    }
  },

  // Error response schema
  errorResponse: errorResponseSchema
};

export default {
  createDepositAccountSchema,
  listAccountsQuerySchema,
  deleteAccountQuerySchema,
  depositAccountSchemas
};