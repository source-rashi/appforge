import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.error('[AppForge API] Error:', err);

  if (err instanceof AppError) {
    const body: Record<string, unknown> = {
      error: err.code,
      message: err.message,
    };
    // Forward field-level validation details if present
    if ((err as any).fields) {
      body.fields = (err as any).fields;
    }
    return res.status(err.statusCode).json(body);
  }

  // Handle unexpected errors, hide internal details in production
  const isProd = process.env.NODE_ENV === 'production';
  return res.status(500).json({
    error: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred',
    ...(isProd ? {} : { details: err.message }),
  });
};
