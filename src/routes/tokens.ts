/**
 * Token management routes
 */

import { Router, Request, Response } from 'express';
import { TokenManager } from '../services/token-manager.js';
import { HTTP_STATUS } from '../config/constants.js';

const router = Router();

// Module-level state for browser extension globals (replaces globalThis pollution)
const browserGlobals = {
  pawtect: null as string | null,
  fp: null as string | null,
};

/**
 * Get current browser globals
 */
export function getBrowserGlobals(): { pawtect: string | null; fp: string | null } {
  return { ...browserGlobals };
}

/**
 * Clear browser globals (useful for testing or logout)
 */
export function clearBrowserGlobals(): void {
  browserGlobals.pawtect = null;
  browserGlobals.fp = null;
}

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
  // Store pawtect and fp in module-level state (not globalThis)
  if (pawtect && typeof pawtect === 'string') {
    browserGlobals.pawtect = pawtect;
  }
  if (fp && typeof fp === 'string') {
    browserGlobals.fp = fp;
  }
  res.sendStatus(HTTP_STATUS.OK);
});

export default router;
