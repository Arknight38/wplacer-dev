/**
 * General utility functions
 */

import { exec } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

// Re-export MS time constants from central constants module
export { MS } from '../config/constants.js';

/**
 * Cross-platform open-in-browser
 */
export function openBrowser(url: string): void {
  const start =
    process.platform === 'darwin'
      ? 'open'
      : process.platform === 'win32'
        ? 'start'
        : 'xdg-open';
  exec(`${start} ${url}`);
}

/**
 * Human-readable duration formatter
 */
export function duration(ms: number): string {
  if (ms <= 0) return '0s';
  if (ms < 1000) return `${ms}ms`;

  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60) % 60;
  const h = Math.floor(s / 3600);

  return [h ? `${h}h` : '', m ? `${m}m` : '', `${s % 60}s`]
    .filter(Boolean)
    .join(' ');
}

/**
 * Sleep/promise delay
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Safe JSON load
 */
export function loadJSON<T>(filename: string): T {
  if (!existsSync(filename)) return {} as T;
  try {
    return JSON.parse(readFileSync(filename, 'utf8')) as T;
  } catch (error) {
    console.error(`Failed to load JSON from ${filename}:`, error);
    return {} as T;
  }
}

/**
 * Safe JSON save
 */
export function saveJSON<T>(filename: string, data: T): void {
  try {
    writeFileSync(filename, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`Failed to save JSON to ${filename}:`, error);
    throw error;
  }
}
