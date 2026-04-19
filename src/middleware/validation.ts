/**
 * Validation middleware using Zod
 */

import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';

// ============ Validation Schemas ============

export const cookiesSchema = z.object({
  j: z.string().min(1),
}).and(z.record(z.string()));

export const userLoginSchema = z.object({
  cookies: cookiesSchema,
  expirationDate: z.string().optional(),
});

export const templateCreateSchema = z.object({
  templateName: z.string().min(1).max(100),
  template: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    data: z.array(z.array(z.number())),
  }),
  coords: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  userIds: z.array(z.string()),
  canBuyCharges: z.boolean().optional(),
  canBuyMaxCharges: z.boolean().optional(),
  antiGriefMode: z.boolean().optional(),
  eraseMode: z.boolean().optional(),
  outlineMode: z.boolean().optional(),
  skipPaintedPixels: z.boolean().optional(),
  enableAutostart: z.boolean().optional(),
});

export const templateUpdateSchema = z.object({
  templateName: z.string().min(1).max(100).optional(),
  coords: z.tuple([z.number(), z.number(), z.number(), z.number()]).optional(),
  userIds: z.array(z.string()).optional(),
  canBuyCharges: z.boolean().optional(),
  canBuyMaxCharges: z.boolean().optional(),
  antiGriefMode: z.boolean().optional(),
  eraseMode: z.boolean().optional(),
  outlineMode: z.boolean().optional(),
  skipPaintedPixels: z.boolean().optional(),
  enableAutostart: z.boolean().optional(),
  running: z.boolean().optional(),
});

export const tokenSchema = z.object({
  t: z.string().min(1),
  pawtect: z.string().optional(),
  fp: z.string().optional(),
});

export const settingsSchema = z.object({
  accountCooldown: z.number().int().min(1000).max(300000).optional(),
  purchaseCooldown: z.number().int().min(1000).max(60000).optional(),
  keepAliveCooldown: z.number().int().min(300000).max(86400000).optional(),
  dropletReserve: z.number().int().min(0).max(10000).optional(),
  antiGriefStandby: z.number().int().min(0).max(3600000).optional(),
  drawingDirection: z.enum(['ttb', 'btt', 'ltr', 'rtl', 'center_out', 'random']).optional(),
  drawingOrder: z.enum(['linear', 'color']).optional(),
  chargeThreshold: z.number().min(0).max(1).optional(),
  pixelSkip: z.number().int().min(1).max(10).optional(),
  proxyEnabled: z.boolean().optional(),
  proxyRotationMode: z.enum(['sequential', 'random']).optional(),
  logProxyUsage: z.boolean().optional(),
  openBrowserOnStart: z.boolean().optional(),
});

// ============ Validation Middleware ============

export function validateBody<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: err.errors,
        });
        return;
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

export function validateParams<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.params = schema.parse(req.params) as any;
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: err.errors,
        });
        return;
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

export function validateQuery<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query) as any;
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: err.errors,
        });
        return;
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}
