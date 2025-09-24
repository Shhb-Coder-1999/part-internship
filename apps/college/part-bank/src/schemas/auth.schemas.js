/**
 * Authentication Schemas for Part Bank API
 */

import { z } from 'zod';
import { phoneNumberSchema, nameSchema, idNumberSchema, passwordSchema, errorResponseSchema } from './common.schemas.js';

// Sign-up request schema
export const signUpRequestSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  idNumber: idNumberSchema,
  phoneNumber: phoneNumberSchema,
  password: passwordSchema
});

// Login request schema
export const loginRequestSchema = z.object({
  phoneNumber: phoneNumberSchema,
  password: passwordSchema
});

// Fastify schemas for documentation
export const authSchemas = {
  // Sign-up endpoint
  signUpRequest: {
    type: 'object',
    properties: {
      firstName: { 
        type: 'string', 
        minLength: 1, 
        maxLength: 100,
        description: 'User first name (Persian or English letters, spaces, hyphens)',
        example: 'علی'
      },
      lastName: { 
        type: 'string', 
        minLength: 1, 
        maxLength: 100,
        description: 'User last name (Persian or English letters, spaces, hyphens)',
        example: 'احمدی'
      },
      idNumber: { 
        type: 'string', 
        minLength: 10, 
        maxLength: 20,
        pattern: '^\\d+$',
        description: 'National ID number (10-20 digits)',
        example: '1234567890'
      },
      phoneNumber: { 
        type: 'string', 
        pattern: '^09\\d{9}$',
        description: 'Iranian mobile phone number',
        example: '09123456789'
      },
      password: { 
        type: 'string', 
        minLength: 6, 
        maxLength: 128,
        description: 'User password (6-128 characters)',
        example: 'password123'
      }
    },
    required: ['firstName', 'lastName', 'idNumber', 'phoneNumber', 'password'],
    additionalProperties: false
  },

  signUpResponse: {
    type: 'object',
    properties: {
      data: {
        type: 'object',
        properties: {
          userId: { 
            type: 'string', 
            format: 'uuid',
            description: 'Unique user identifier',
            example: '123e4567-e89b-12d3-a456-426614174000'
          },
          phoneNumber: { 
            type: 'string',
            description: 'User phone number',
            example: '09123456789'
          },
          firstName: { 
            type: 'string',
            description: 'User first name',
            example: 'علی'
          },
          lastName: { 
            type: 'string',
            description: 'User last name',
            example: 'احمدی'
          },
          createdAt: { 
            type: 'string', 
            format: 'date-time',
            description: 'Account creation timestamp',
            example: '2025-09-22T10:00:00Z'
          }
        },
        required: ['userId', 'phoneNumber', 'firstName', 'lastName', 'createdAt']
      }
    },
    required: ['data']
  },

  // Login endpoint
  loginRequest: {
    type: 'object',
    properties: {
      phoneNumber: { 
        type: 'string', 
        pattern: '^09\\d{9}$',
        description: 'Iranian mobile phone number',
        example: '09123456789'
      },
      password: { 
        type: 'string',
        description: 'User password',
        example: 'password123'
      }
    },
    required: ['phoneNumber', 'password'],
    additionalProperties: false
  },

  loginResponse: {
    type: 'object',
    properties: {
      data: {
        type: 'object',
        properties: {
          token: { 
            type: 'string',
            description: 'JWT access token',
            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
          },
          expiresIn: { 
            type: 'integer',
            description: 'Token expiration time in seconds',
            example: 3600
          },
          user: {
            type: 'object',
            properties: {
              userId: { 
                type: 'string', 
                format: 'uuid',
                description: 'Unique user identifier',
                example: '123e4567-e89b-12d3-a456-426614174000'
              },
              phoneNumber: { 
                type: 'string',
                description: 'User phone number',
                example: '09123456789'
              },
              firstName: { 
                type: 'string',
                description: 'User first name',
                example: 'علی'
              },
              lastName: { 
                type: 'string',
                description: 'User last name',
                example: 'احمدی'
              }
            },
            required: ['userId', 'phoneNumber', 'firstName', 'lastName']
          }
        },
        required: ['token', 'expiresIn', 'user']
      }
    },
    required: ['data']
  },

  // Error response schema
  errorResponse: errorResponseSchema
};

export default {
  signUpRequestSchema,
  loginRequestSchema,
  authSchemas
};