import { ZodError } from 'zod';
import { HTTP_STATUS } from '@app/constants';

export const makeZodValidator = (
  { body, params, query } = {},
  options = {}
) => {
  const { formatError } = options;
  return (req, res, next) => {
    try {
      if (params) req.params = params.parse(req.params);
      if (query) req.query = query.parse(req.query);
      if (body) req.body = body.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const first = error.issues?.[0];
        const message =
          typeof formatError === 'function'
            ? formatError(error.issues)
            : first?.message || 'Invalid request';
        return res
          .status(HTTP_STATUS.BAD_REQUEST)
          .json({ success: false, error: message });
      }
      next(error);
    }
  };
};
