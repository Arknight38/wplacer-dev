/**
 * Validation middleware tests
 */

import {
  userLoginSchema,
  templateCreateSchema,
  templateUpdateSchema,
  validateBody,
} from '../middleware/validation.js';
import type { Response, NextFunction } from 'express';

describe('Validation Schemas', () => {
  describe('userLoginSchema', () => {
    it('should validate valid user login data', () => {
      const validData = {
        cookies: {
          j: 'test-token',
          additional: 'data',
        },
        expirationDate: '2025-01-01',
      };

      const result = userLoginSchema.parse(validData);
      expect(result).toEqual(validData);
    });

    it('should reject data without cookies', () => {
      const invalidData = {
        expirationDate: '2025-01-01',
      };

      expect(() => userLoginSchema.parse(invalidData)).toThrow();
    });

    it('should reject data without j cookie', () => {
      const invalidData = {
        cookies: {
          additional: 'data',
        },
      };

      expect(() => userLoginSchema.parse(invalidData)).toThrow();
    });
  });

  describe('templateCreateSchema', () => {
    it('should validate valid template data', () => {
      const validData = {
        templateName: 'Test Template',
        template: {
          width: 100,
          height: 100,
          data: [[1, 2, 3]],
        },
        coords: [0, 0, 100, 100],
        userIds: ['user1', 'user2'],
        canBuyCharges: true,
        canBuyMaxCharges: false,
        antiGriefMode: false,
        eraseMode: false,
        outlineMode: false,
        skipPaintedPixels: false,
        enableAutostart: true,
      };

      const result = templateCreateSchema.parse(validData);
      expect(result).toEqual(validData);
    });

    it('should reject data without templateName', () => {
      const invalidData = {
        template: {
          width: 100,
          height: 100,
          data: [[1, 2, 3]],
        },
        coords: [0, 0, 100, 100],
        userIds: ['user1'],
      };

      expect(() => templateCreateSchema.parse(invalidData)).toThrow();
    });

    it('should reject data without template', () => {
      const invalidData = {
        templateName: 'Test Template',
        coords: [0, 0, 100, 100],
        userIds: ['user1'],
      };

      expect(() => templateCreateSchema.parse(invalidData)).toThrow();
    });
  });

  describe('templateUpdateSchema', () => {
    it('should validate valid template update data', () => {
      const validData = {
        templateName: 'Updated Name',
        coords: [0, 0, 200, 200],
        userIds: ['user1', 'user2', 'user3'],
        canBuyCharges: true,
        running: false,
      };

      const result = templateUpdateSchema.parse(validData);
      expect(result).toEqual(validData);
    });

    it('should allow partial updates', () => {
      const partialData = {
        templateName: 'Updated Name',
      };

      const result = templateUpdateSchema.parse(partialData);
      expect(result.templateName).toBe('Updated Name');
    });
  });
});

describe('Validation Middleware', () => {
  describe('validateBody', () => {
    it('should call next on valid data', () => {
      const middleware = validateBody(userLoginSchema);
      const req = {
        body: {
          cookies: {
            j: 'test-token',
          },
        },
      } as any;
      const res = {} as Response;
      const next = jest.fn() as NextFunction;

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should send 400 on invalid data', () => {
      const middleware = validateBody(userLoginSchema);
      const req = {
        body: {
          invalid: 'data',
        },
      } as any;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;
      const next = jest.fn() as NextFunction;

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation failed',
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });
});
