/**
 * Common Schemas for Part Bank API
 */

import { z } from 'zod';
import { VALIDATION_RULES } from '#app/constants';

// Common validation patterns
export const phoneNumberSchema = z.string()
  .regex(VALIDATION_RULES.PHONE_NUMBER.PATTERN, 'Phone number must be in format 09XXXXXXXXX');

export const nameSchema = z.string()
  .min(VALIDATION_RULES.NAME.MIN_LENGTH, `Name must be at least ${VALIDATION_RULES.NAME.MIN_LENGTH} character`)
  .max(VALIDATION_RULES.NAME.MAX_LENGTH, `Name must not exceed ${VALIDATION_RULES.NAME.MAX_LENGTH} characters`)
  .regex(VALIDATION_RULES.NAME.PATTERN, 'Name can only contain letters, spaces, and hyphens');

export const idNumberSchema = z.string()
  .min(VALIDATION_RULES.ID_NUMBER.MIN_LENGTH, `ID number must be at least ${VALIDATION_RULES.ID_NUMBER.MIN_LENGTH} digits`)
  .max(VALIDATION_RULES.ID_NUMBER.MAX_LENGTH, `ID number must not exceed ${VALIDATION_RULES.ID_NUMBER.MAX_LENGTH} digits`)
  .regex(VALIDATION_RULES.ID_NUMBER.PATTERN, 'ID number must contain only digits');

export const passwordSchema = z.string()
  .min(VALIDATION_RULES.PASSWORD.MIN_LENGTH, `Password must be at least ${VALIDATION_RULES.PASSWORD.MIN_LENGTH} characters`)
  .max(VALIDATION_RULES.PASSWORD.MAX_LENGTH, `Password must not exceed ${VALIDATION_RULES.PASSWORD.MAX_LENGTH} characters`);

export const addressSchema = z.string()
  .min(VALIDATION_RULES.ADDRESS.MIN_LENGTH, `Address must be at least ${VALIDATION_RULES.ADDRESS.MIN_LENGTH} character`)
  .max(VALIDATION_RULES.ADDRESS.MAX_LENGTH, `Address must not exceed ${VALIDATION_RULES.ADDRESS.MAX_LENGTH} characters`);

export const postalCodeSchema = z.string()
  .min(VALIDATION_RULES.POSTAL_CODE.MIN_LENGTH, `Postal code must be at least ${VALIDATION_RULES.POSTAL_CODE.MIN_LENGTH} digits`)
  .max(VALIDATION_RULES.POSTAL_CODE.MAX_LENGTH, `Postal code must not exceed ${VALIDATION_RULES.POSTAL_CODE.MAX_LENGTH} digits`)
  .regex(VALIDATION_RULES.POSTAL_CODE.PATTERN, 'Postal code must contain only digits');

// Pagination schemas
export const paginationQuerySchema = z.object({
  page: z.coerce.number()
    .int()
    .min(VALIDATION_RULES.PAGINATION.MIN_PAGE, 'Page must be at least 1')
    .default(VALIDATION_RULES.PAGINATION.DEFAULT_PAGE)
    .optional(),
  pageSize: z.coerce.number()
    .int()
    .min(VALIDATION_RULES.PAGINATION.MIN_PAGE_SIZE, 'Page size must be at least 1')
    .max(VALIDATION_RULES.PAGINATION.MAX_PAGE_SIZE, `Page size must not exceed ${VALIDATION_RULES.PAGINATION.MAX_PAGE_SIZE}`)
    .default(VALIDATION_RULES.PAGINATION.DEFAULT_PAGE_SIZE)
    .optional()
});

// Standard response schemas
export const errorResponseSchema = {
  type: 'object',
  properties: {
    error: {
      type: 'object',
      properties: {
        code: { type: 'string' },
        message: {
          oneOf: [
            { type: 'string' },
            {
              type: 'object',
              properties: {
                fa: { type: 'string' },
                en: { type: 'string' }
              }
            }
          ]
        },
        details: { type: 'object' }
      },
      required: ['code', 'message']
    },
    meta: { type: 'object' }
  },
  required: ['error']
};

export const paginationMetaSchema = {
  type: 'object',
  properties: {
    page: { type: 'integer', minimum: 1 },
    pageSize: { type: 'integer', minimum: 1, maximum: 100 },
    totalItems: { type: 'integer', minimum: 0 },
    totalPages: { type: 'integer', minimum: 0 }
  },
  required: ['page', 'pageSize', 'totalItems', 'totalPages']
};

export default {
  phoneNumberSchema,
  nameSchema,
  idNumberSchema,
  passwordSchema,
  addressSchema,
  postalCodeSchema,
  paginationQuerySchema,
  errorResponseSchema,
  paginationMetaSchema
};