/**
 * Error handling middleware for Express
 */

import type { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

// Custom error classes
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor() {
    super('Validation failed', 400);
  }
}

export class NotFoundError extends AppError {
  constructor() {
    super('Resource not found', 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Conflict') {
    super(message, 409);
  }
}

// Error handler middleware
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  logger.error('Error:', err);

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      ...(err.isOperational ? {} : { stack: err.stack }),
    });
    return;
  }

  // Default error response
  res.status(500).json({
    error: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
}

// Async error wrapper for route handlers
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// 404 handler
export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({
    error: 'Resource not found',
  });
}
