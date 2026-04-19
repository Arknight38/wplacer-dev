/**
 * Proxy management routes
 */

import { Router, Request, Response } from 'express';
import { HTTP_STATUS } from '../config/constants.js';

let loadProxies: () => void;
let loadedProxies: string[] = [];

export function setProxyFunctions(loadFn: () => void, proxies: string[]): void {
  loadProxies = loadFn;
  loadedProxies = proxies;
}

export function updateLoadedProxies(proxies: string[]): void {
  loadedProxies = proxies;
}

const router = Router();

router.post('/reload-proxies', (_req: Request, res: Response): void => {
  loadProxies();
  res.status(HTTP_STATUS.OK).json({ success: true, count: loadedProxies.length });
});

export default router;
