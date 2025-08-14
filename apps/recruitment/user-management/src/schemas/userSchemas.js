import { z } from 'zod';
import { VALIDATION_RULES } from '../constants/index.js';

// Base field validators
export const zUserId = z
  .string()
  .min(1, 'User ID is required')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid user ID format');

export const zRoleId = z
  .string()
  .min(1, 'Role ID is required')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid role ID format');

export const zEmail = z
  .string({ required_error: 'Email is required' })
  .email('Invalid email format')
  .max(VALIDATION_RULES.USER.EMAIL.MAX_LENGTH, `Email must not exceed ${VALIDATION_RULES.USER.EMAIL.MAX_LENGTH} characters`)
  .transform(v => v.toLowerCase().trim());

export const zUsername = z
  .string({ required_error: 'Username is required' })
  .min(VALIDATION_RULES.USER.USERNAME.MIN_LENGTH, `Username must be at least ${VALIDATION_RULES.USER.USERNAME.MIN_LENGTH} characters`)
  .max(VALIDATION_RULES.USER.USERNAME.MAX_LENGTH, `Username must not exceed ${VALIDATION_RULES.USER.USERNAME.MAX_LENGTH} characters`)
  .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens')
  .transform(v => v.toLowerCase().trim());

export const zPassword = z
  .string({ required_error: 'Password is required' })
  .min(VALIDATION_RULES.USER.PASSWORD.MIN_LENGTH, `Password must be at least ${VALIDATION_RULES.USER.PASSWORD.MIN_LENGTH} characters`)
  .max(VALIDATION_RULES.USER.PASSWORD.MAX_LENGTH, `Password must not exceed ${VALIDATION_RULES.USER.PASSWORD.MAX_LENGTH} characters`)
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number');

export const zFirstName = z
  .string()
  .max(VALIDATION_RULES.USER.FIRST_NAME.MAX_LENGTH, `First name must not exceed ${VALIDATION_RULES.USER.FIRST_NAME.MAX_LENGTH} characters`)
  .transform(v => v.trim())
  .optional();

export const zLastName = z
  .string()
  .max(VALIDATION_RULES.USER.LAST_NAME.MAX_LENGTH, `Last name must not exceed ${VALIDATION_RULES.USER.LAST_NAME.MAX_LENGTH} characters`)
  .transform(v => v.trim())
  .optional();

export const zPhone = z
  .string()
  .max(VALIDATION_RULES.USER.PHONE.MAX_LENGTH, `Phone must not exceed ${VALIDATION_RULES.USER.PHONE.MAX_LENGTH} characters`)
  .regex(/^\+?[\d\s-()]+$/, 'Invalid phone number format')
  .transform(v => v.trim())
  .optional();

export const zRoleName = z
  .string({ required_error: 'Role name is required' })
  .min(VALIDATION_RULES.ROLE.NAME.MIN_LENGTH, `Role name must be at least ${VALIDATION_RULES.ROLE.NAME.MIN_LENGTH} characters`)
  .max(VALIDATION_RULES.ROLE.NAME.MAX_LENGTH, `Role name must not exceed ${VALIDATION_RULES.ROLE.NAME.MAX_LENGTH} characters`)
  .regex(/^[a-zA-Z0-9_-]+$/, 'Role name can only contain letters, numbers, underscores, and hyphens')
  .transform(v => v.toLowerCase().trim());

export const zRoleDescription = z
  .string()
  .max(VALIDATION_RULES.ROLE.DESCRIPTION.MAX_LENGTH, `Description must not exceed ${VALIDATION_RULES.ROLE.DESCRIPTION.MAX_LENGTH} characters`)
  .transform(v => v.trim())
  .optional();

// Authentication schemas
export const LoginSchema = z.object({
  email: zEmail,
  password: z.string().min(1, 'Password is required'),
});

export const RegisterSchema = z.object({
  email: zEmail,
  username: zUsername,
  password: zPassword,
  firstName: zFirstName,
  lastName: zLastName,
  phone: zPhone,
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: zPassword,
});

// User management schemas
export const CreateUserSchema = z.object({
  email: zEmail,
  username: zUsername,
  password: zPassword,
  firstName: zFirstName,
  lastName: zLastName,
  phone: zPhone,
  isActive: z.boolean().optional().default(true),
  isVerified: z.boolean().optional().default(false),
});

export const UpdateUserSchema = z.object({
  email: zEmail.optional(),
  username: zUsername.optional(),
  firstName: zFirstName,
  lastName: zLastName,
  phone: zPhone,
  isActive: z.boolean().optional(),
  isVerified: z.boolean().optional(),
});

export const UpdateProfileSchema = z.object({
  firstName: zFirstName,
  lastName: zLastName,
  phone: zPhone,
});

// Role management schemas
export const CreateRoleSchema = z.object({
  name: zRoleName,
  description: zRoleDescription,
  permissions: z.record(z.array(z.string())).optional(),
  isActive: z.boolean().optional().default(true),
});

export const UpdateRoleSchema = z.object({
  name: zRoleName.optional(),
  description: zRoleDescription,
  permissions: z.record(z.array(z.string())).optional(),
  isActive: z.boolean().optional(),
});

export const AssignRoleSchema = z.object({
  userId: zUserId,
  roleId: zRoleId,
});

// Parameter schemas
export const UserIdParams = z.object({ id: zUserId });
export const RoleIdParams = z.object({ id: zRoleId });

// Query schemas
export const ListUsersQuery = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  search: z.string().optional(),
  role: z.string().optional(),
  isActive: z
    .union([z.boolean(), z.string()])
    .transform(v => (typeof v === 'string' ? v === 'true' : Boolean(v)))
    .optional(),
  isVerified: z
    .union([z.boolean(), z.string()])
    .transform(v => (typeof v === 'string' ? v === 'true' : Boolean(v)))
    .optional(),
});

export const ListRolesQuery = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  search: z.string().optional(),
  isActive: z
    .union([z.boolean(), z.string()])
    .transform(v => (typeof v === 'string' ? v === 'true' : Boolean(v)))
    .optional(),
});

export const SearchUsersQuery = z.object({
  q: z.string().min(1, 'Search term is required'),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
});