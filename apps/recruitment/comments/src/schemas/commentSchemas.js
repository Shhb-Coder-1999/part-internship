import { z } from 'zod';

export const zCommentId = z
  .string()
  .min(1, 'Comment ID is required')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid comment ID format');
export const zOptionalParentId = z
  .union([
    z.string().regex(/^[a-zA-Z0-9_-]+$/, 'Invalid parent comment ID format'),
    z.null(),
  ])
  .optional();

export const zCommentText = z
  .string({ required_error: 'Comment text is required' })
  .transform(v => (typeof v === 'string' ? v.trim() : v))
  .refine(
    v => typeof v === 'string' && v.length > 0,
    'Comment text is required'
  )
  .refine(
    v => typeof v === 'string' && v.length <= 1000,
    'Comment text must be between 1 and 1000 characters'
  );

export const CreateCommentBody = z.object({
  text: zCommentText,
  parentId: zOptionalParentId,
});
export const UpdateCommentParams = z.object({ id: zCommentId });
export const UpdateCommentBody = z.object({ text: zCommentText });
export const CommentIdParams = z.object({ id: zCommentId });
export const SearchQuery = z.object({
  q: z.string().min(1, 'Search term is required and must be a string'),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
});
export const ListCommentsQuery = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  parentId: z
    .string()
    .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid parent comment ID format')
    .optional(),
  includeDeleted: z
    .union([z.boolean(), z.string()])
    .transform(v => (typeof v === 'string' ? v === 'true' : Boolean(v)))
    .optional(),
});
