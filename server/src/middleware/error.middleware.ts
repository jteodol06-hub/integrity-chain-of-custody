import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { env } from '../config/env.js';

export interface AppError extends Error {
  statusCode?: number;
  details?: unknown;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void => {
  const statusCode = err.statusCode || (err instanceof ZodError ? 400 : 500);

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request payload or parameters',
        details: err.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
    });
    return;
  }

  // Hide internal implementation details and stack traces in production
  const errorObj: Record<string, unknown> = {
    code: err.name || 'INTERNAL_SERVER_ERROR',
    message:
      statusCode === 500 && env.NODE_ENV === 'production'
        ? 'An unexpected error occurred. Please contact the administrator.'
        : err.message || 'Internal Server Error',
  };

  if (env.NODE_ENV !== 'production' && err.stack) {
    errorObj.stack = err.stack;
  }

  if (err.details !== undefined) {
    errorObj.details = err.details;
  }

  res.status(statusCode).json({
    success: false,
    error: errorObj,
  });
};
