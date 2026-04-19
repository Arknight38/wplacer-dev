/**
 * Palette routes
 */

import { Router, Request, Response } from 'express';
import { palette, COLOR_NAMES } from '../config/constants.js';

const router = Router();

router.get('/palette', (_req: Request, res: Response) => {
  res.json({ palette, colorNames: COLOR_NAMES });
});

export default router;
