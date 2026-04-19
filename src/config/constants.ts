/**
 * Runtime constants for wplacer
 */

import type { Palette, ColorNames } from '../types/index.js';

// ============ Server Configuration ============

export const APP_HOST = '0.0.0.0';
export const APP_PRIMARY_PORT = Number(process.env.PORT) || 80;
export const APP_FALLBACK_PORTS = [
  3000,
  5173,
  8080,
  8000,
  5000,
  7000,
  4200,
  5500,
  ...Array.from({ length: 50 }, (_, i) => 3001 + i),
];

export const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim())
  : ['http://localhost:*'];

export const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000; // 15 minutes
export const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX) || 100;

// ============ WebSocket Configuration ============

export const MAX_WS_CONNECTIONS = Number(process.env.MAX_WS_CONNECTIONS) || 50;
export const WS_PING_INTERVAL_MS = Number(process.env.WS_PING_INTERVAL_MS) || 30_000;

// ============ Server Lifecycle Configuration ============

export const GRACEFUL_SHUTDOWN_TIMEOUT_MS = Number(process.env.GRACEFUL_SHUTDOWN_TIMEOUT_MS) || 10_000;

// ============ WPlace API Endpoints ============

export const WPLACE_BASE = process.env.WPLACE_BASE || 'https://backend.wplace.live';
export const WPLACE_FILES = `${WPLACE_BASE}/files/s0`;
export const WPLACE_ME = `${WPLACE_BASE}/me`;
export const WPLACE_PURCHASE = `${WPLACE_BASE}/purchase`;

export const WPLACE_PIXEL = (tx: number, ty: number): string =>
  `${WPLACE_BASE}/s0/pixel/${tx}/${ty}`;
export const TILE_URL = (tx: number, ty: number): string =>
  `${WPLACE_FILES}/tiles/${tx}/${ty}.png`;

// ============ File System Paths ============

export const DATA_DIR = './data';
export const USERS_FILE = `${DATA_DIR}/users.json`;
export const SETTINGS_FILE = `${DATA_DIR}/settings.json`;
export const TEMPLATES_PATH = `${DATA_DIR}/templates.json`;
export const COLOR_ORDERING_PATH = `${DATA_DIR}/color_ordering.json`;

export const JSON_LIMIT = '50mb';

// ============ Time Constants (milliseconds) ============

export const MS = {
  QUARTER_SEC: 250,
  TWO_SEC: 2_000,
  THIRTY_SEC: 30_000,
  TWO_MIN: 120_000,
  FIVE_MIN: 300_000,
  FORTY_SEC: 40_000,
  ONE_HOUR: 3_600_000,
} as const;

export const KEEP_ALIVE_INTERVAL_MS = Number(process.env.KEEP_ALIVE_INTERVAL_MS) || MS.ONE_HOUR;

// ============ HTTP Status Codes ============

export const HTTP_STATUS = {
  OK: 200,
  BAD_REQ: 400,
  UNAUTH: 401,
  FORBIDDEN: 403,
  TOO_MANY: 429,
  UNAVAILABLE_LEGAL: 451,
  SRV_ERR: 500,
  BAD_GATEWAY: 502,
  CONFLICT: 409,
} as const;

// ============ Color Palette ============

export const palette: Palette = {
  '0,0,0': 1,
  '60,60,60': 2,
  '120,120,120': 3,
  '210,210,210': 4,
  '255,255,255': 5,
  '96,0,24': 6,
  '237,28,36': 7,
  '255,127,39': 8,
  '246,170,9': 9,
  '249,221,59': 10,
  '255,250,188': 11,
  '14,185,104': 12,
  '19,230,123': 13,
  '135,255,94': 14,
  '12,129,110': 15,
  '16,174,166': 16,
  '19,225,190': 17,
  '40,80,158': 18,
  '64,147,228': 19,
  '96,247,242': 20,
  '107,80,246': 21,
  '153,177,251': 22,
  '120,12,153': 23,
  '170,56,185': 24,
  '224,159,249': 25,
  '203,0,122': 26,
  '236,31,128': 27,
  '243,141,169': 28,
  '104,70,52': 29,
  '149,104,42': 30,
  '248,178,119': 31,
  '170,170,170': 32,
  '165,14,30': 33,
  '250,128,114': 34,
  '228,92,26': 35,
  '214,181,148': 36,
  '156,132,49': 37,
  '197,173,49': 38,
  '232,212,95': 39,
  '74,107,58': 40,
  '90,148,74': 41,
  '132,197,115': 42,
  '15,121,159': 43,
  '187,250,242': 44,
  '125,199,255': 45,
  '77,49,184': 46,
  '74,66,132': 47,
  '122,113,196': 48,
  '181,174,241': 49,
  '219,164,99': 50,
  '209,128,81': 51,
  '255,197,165': 52,
  '155,82,73': 53,
  '209,128,120': 54,
  '250,182,164': 55,
  '123,99,82': 56,
  '156,132,107': 57,
  '51,57,65': 58,
  '109,117,141': 59,
  '179,185,209': 60,
  '109,100,63': 61,
  '148,140,107': 62,
  '205,197,158': 63,
};

export const VALID_COLOR_IDS = new Set([-1, 0, ...Object.values(palette)]);

// ============ Template Manager Configuration ============

export const TEMPLATE_CONFIG = {
  MAX_QUEUE_SIZE: 50,
  DEFAULT_CHARGE_PACK_COST: 500,
  CHARGES_PER_PACK: 30,
  MAX_CHARGE_UPGRADE_COST: 500,
  NO_USERS_RETRY_DELAY_MS: 30_000,
  EMPTY_QUEUE_RETRY_DELAY_MS: 5_000,
  COOLDOWN_CALCULATION_BUFFER_MS: 2_000,
  MIN_WAIT_TIME_MS: 5_000,
  PARALLEL_PIXEL_CHECK_CONCURRENCY: 3,
  TOKEN_REFRESH_DELAY_MS: 1_000,
} as const;

export const COLOR_NAMES: ColorNames = {
  1: 'Black',
  2: 'Dark Gray',
  3: 'Gray',
  4: 'Light Gray',
  5: 'White',
  6: 'Dark Red',
  7: 'Red',
  8: 'Orange',
  9: 'Light Orange',
  10: 'Yellow',
  11: 'Light Yellow',
  12: 'Dark Green',
  13: 'Green',
  14: 'Light Green',
  15: 'Dark Teal',
  16: 'Teal',
  17: 'Light Teal',
  18: 'Dark Blue',
  19: 'Blue',
  20: 'Light Blue',
  21: 'Indigo',
  22: 'Periwinkle',
  23: 'Dark Purple',
  24: 'Purple',
  25: 'Lavender',
  26: 'Dark Pink',
  27: 'Pink',
  28: 'Light Pink',
  29: 'Dark Brown',
  30: 'Brown',
  31: 'Light Brown',
  32: '★ Gray',
  33: '★ Maroon',
  34: '★ Salmon',
  35: '★ Burnt Orange',
  36: '★ Tan',
  37: '★ Dark Gold',
  38: '★ Gold',
  39: '★ Light Gold',
  40: '★ Olive',
  41: '★ Forest Green',
  42: '★ Lime Green',
  43: '★ Dark Aqua',
  44: '★ Cyan',
  45: '★ Sky Blue',
  46: '★ Royal Blue',
  47: '★ Navy',
  48: '★ Light Purple',
  49: '★ Lilac',
  50: '★ Ochre',
  51: '★ Terracotta',
  52: '★ Peach',
  53: '★ Dark Rose',
  54: '★ Rose',
  55: '★ Light Rose',
  56: '★ Taupe',
  57: '★ Light Taupe',
  58: '★ Charcoal',
  59: '★ Slate',
  60: '★ Light Slate',
  61: '★ Khaki',
  62: '★ Light Khaki',
  63: '★ Beige',
};
