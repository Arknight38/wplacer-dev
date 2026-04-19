/**
 * Token management routes
 */

import { Router, Request, Response } from 'express';
import { TokenManager } from '../services/token-manager.js';
import { HTTP_STATUS } from '../config/constants.js';

const router = Router();

router.get('/token-needed', (_req: Request, res: Response) => {
  res.json({ needed: TokenManager.getIsTokenNeeded() });
});

router.post('/t', (req: Request, res: Response): void => {
  const { t, pawtect, fp } = req.body || {};
  if (!t) {
    res.sendStatus(HTTP_STATUS.BAD_REQ);
    return;
  }
  // Store Turnstile token as usual
  TokenManager.setToken(t);
  // Also keep latest pawtect in memory for pairing with paints
  try {
    if (pawtect && typeof pawtect === 'string') {
      (globalThis as any).__wplacer_last_pawtect = pawtect;
    }
    if (fp && typeof fp === 'string') {
      (globalThis as any).__wplacer_last_fp = fp;
    }
  } catch {
    // Intentionally empty - global variable assignment failure is acceptable
  }
  res.sendStatus(HTTP_STATUS.OK);
});

export default router;
