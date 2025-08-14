/**
 * Shared Zod validator middleware
 * Usage: makeZodValidator({ body, params, query }, { formatError })
 */

import { ZodError } from 'zod';

export const isZodError = (error) => error instanceof ZodError;

export const formatZodIssues = (issues = []) => {
  if (!issues.length) return 'Invalid request';
  const first = issues[0];
  return first?.message || 'Invalid request';
};

export const makeZodValidator = ({ body, params, query } = {}, options = {}) => {
  const { formatError = formatZodIssues } = options;
  return (req, res, next) => {
    try {
      if (params) req.params = params.parse(req.params);
      if (query) req.query = query.parse(req.query);
      if (body) req.body = body.parse(req.body);
      next();
    } catch (error) {
      if (isZodError(error)) {
        const message = formatError(error.issues);
        return res.status(400).json({ success: false, error: message });
      }
      next(error);
    }
  };
};


