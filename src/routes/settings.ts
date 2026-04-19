/**
 * Settings management routes
 */

import { Router, Request, Response } from 'express';
import { HTTP_STATUS } from '../config/constants.js';
import type { Settings } from '../types/index.js';

let currentSettings: Settings;
let saveSettings: () => void;
let loadedProxies: string[] = [];

export function setSettingsState(s: Settings): void {
  currentSettings = s;
}

export function setSaveSettings(fn: () => void): void {
  saveSettings = fn;
}

export function setLoadedProxies(proxies: string[]): void {
  loadedProxies = proxies;
}

const router = Router();

router.get('/settings', (_req: Request, res: Response) => {
  res.json({ ...currentSettings, proxyCount: loadedProxies.length });
});

router.put('/settings', (req: Request, res: Response): void => {
  const prev = { ...currentSettings };
  currentSettings = { ...prev, ...req.body };
  saveSettings();
  res.sendStatus(HTTP_STATUS.OK);
});

export default router;
