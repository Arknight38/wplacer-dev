/**
 * Default settings and settings management
 */

import type { Settings } from '../types/index.js';
import { MS } from './constants.js';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { DATA_DIR, SETTINGS_FILE } from './constants.js';
import { logger } from '../utils/logger.js';

// Ensure data directory exists
if (!existsSync(DATA_DIR)) {
  // This will be handled by the main server bootstrap
}

export const DEFAULT_SETTINGS: Settings = {
  accountCooldown: 20_000,
  purchaseCooldown: 5_000,
  keepAliveCooldown: MS.ONE_HOUR,
  dropletReserve: 0,
  antiGriefStandby: 600_000,
  drawingDirection: 'ttb',
  drawingOrder: 'linear',
  chargeThreshold: 0.5,
  pixelSkip: 1,
  proxyEnabled: false,
  proxyRotationMode: 'sequential',
  logProxyUsage: false,
  openBrowserOnStart: true,
};

/**
 * Load settings from disk or return defaults
 */
export function loadSettings(): Settings {
  if (!existsSync(SETTINGS_FILE)) {
    return { ...DEFAULT_SETTINGS };
  }

  try {
    const data = readFileSync(SETTINGS_FILE, 'utf8');
    const loaded = JSON.parse(data) as Partial<Settings>;
    const settings = { ...DEFAULT_SETTINGS, ...loaded };

    // Sanitize keepAliveCooldown to prevent issues from old/bad settings files
    if (settings.keepAliveCooldown < MS.FIVE_MIN) {
      logger.warn(
        `[SYSTEM] WARNING: keepAliveCooldown is set to a very low value. Adjusting to 1 hour.`
      );
      settings.keepAliveCooldown = MS.ONE_HOUR;
    }

    return settings;
  } catch (error) {
    logger.error('Failed to load settings, using defaults:', error);
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Save settings to disk
 */
export function saveSettings(settings: Settings): void {
  try {
    writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
  } catch (error) {
    logger.error('Failed to save settings:', error);
    throw error;
  }
}
