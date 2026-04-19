/**
 * User management routes
 */

import { Router, Request, Response } from 'express';
import { WPlacer } from '../services/wplacer-client.js';
import { log } from '../utils/logger.js';
import { HTTP_STATUS } from '../config/constants.js';
import type { User, Cookies } from '../types/index.js';
import { validateBody, userLoginSchema } from '../middleware/validation.js';

// Global state
let users: Record<string, User> = {};
let templates: Record<string, any> = {};
let saveUsers: () => void;
let saveTemplates: () => void;
let activeBrowserUsers = new Set<string>();

// Simple async lock for activeBrowserUsers to prevent race conditions
const pendingLocks = new Map<string, Promise<void>>();

async function acquireUserLock(id: string): Promise<boolean> {
  if (pendingLocks.has(id)) return false;
  if (activeBrowserUsers.has(id)) return false;
  activeBrowserUsers.add(id);
  return true;
}

function releaseUserLock(id: string): void {
  activeBrowserUsers.delete(id);
  pendingLocks.delete(id);
}

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: List of all users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   cookies:
 *                     type: object
 *                   suspendedUntil:
 *                     type: number
 *       500:
 *         description: Server error
 */

export function setUsersState(u: Record<string, User>): void {
  users = u;
}

export function setTemplatesState(t: Record<string, any>): void {
  templates = t;
}

export function setSaveUsers(fn: () => void): void {
  saveUsers = fn;
}

export function setSaveTemplates(fn: () => void): void {
  saveTemplates = fn;
}

export function setActiveBrowserUsers(set: Set<string>): void {
  activeBrowserUsers = set;
}

const router = Router();

type ErrorCategory = 'transient' | 'permanent' | 'auth';

function classifyError(error: any): { category: ErrorCategory; message: string } {
  const message = error?.message || 'Unknown error.';
  const name = error?.name || '';

  // Transient errors - should retry
  if (
    name === 'NetworkError' ||
    message.includes('(500)') ||
    message.includes('(502)') ||
    message.includes('(503)') ||
    message.includes('(504)') ||
    message.includes('timeout') ||
    message.includes('ETIMEDOUT') ||
    message.includes('ECONNRESET') ||
    message.includes('(1015)') // Cloudflare rate limit
  ) {
    return { category: 'transient', message };
  }

  // Auth errors - don't retry, needs re-login
  if (
    name === 'SuspensionError' ||
    message.includes('unauthorized') ||
    message.includes('authentication failed') ||
    message.includes('401')
  ) {
    return { category: 'auth', message };
  }

  // Permanent errors - don't retry
  return { category: 'permanent', message };
}

function logUserError(error: any, id: string, name: string, context: string): void {
  const { category, message } = classifyError(error);
  const emoji = category === 'transient' ? '[WARNING]' : '[ERROR]';

  if (category === 'transient') {
    log(id, name, `${emoji} Transient error during ${context}: ${message}`);
  } else if (category === 'auth') {
    log(id, name, `${emoji} Auth error during ${context}: ${message}`);
  } else {
    log(id, name, `${emoji} Failed to ${context}`, error);
  }
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: any;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      const { category } = classifyError(error);
      lastError = error;

      if (category !== 'transient' || attempt === maxRetries) {
        throw error;
      }

      const delay = baseDelayMs * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}

router.get('/users', (_req: Request, res: Response) => {
  res.json(users);
});

router.post('/user', validateBody(userLoginSchema), async (req: Request, res: Response): Promise<void> => {
  const wplacer = new WPlacer({});
  try {
    const userInfo = await wplacer.login(req.body.cookies as Cookies);
    const banned = users[userInfo.id]?.suspendedUntil;
    users[userInfo.id] = {
      id: userInfo.id,
      name: userInfo.name,
      cookies: req.body.cookies,
      expirationDate: req.body.expirationDate,
    };

    if (banned && banned > new Date().getTime()) {
      users[userInfo.id].suspendedUntil = banned;
    }

    saveUsers();
    res.json(userInfo);
  } catch (error: any) {
    logUserError(error, 'NEW_USER', 'N/A', 'add new user');
    res.status(HTTP_STATUS.SRV_ERR).json({ error: error.message });
  }
});

router.delete('/user/:id', async (req: Request, res: Response): Promise<void> => {
  const userId = req.params.id;
  if (!userId || !users[userId]) {
    res.sendStatus(HTTP_STATUS.BAD_REQ);
    return;
  }

  const deletedName = users[userId].name;
  delete users[userId];
  saveUsers();
  log('SYSTEM', 'Users', `Deleted user ${deletedName}#${userId}.`);

  let templatesModified = false;
  for (const templateId in templates) {
    const manager = templates[templateId];
    const before = manager.userIds.length;
    manager.userIds = manager.userIds.filter((id: string) => id !== userId);
    manager.userQueue = manager.userQueue.filter((id: string) => id !== userId);
    if (manager.userIds.length < before) {
      templatesModified = true;
      log('SYSTEM', 'Templates', `Removed user ${deletedName}#${userId} from template "${manager.name}".`);
      if (manager.masterId === userId) {
        manager.masterId = manager.userIds[0] || null;
        manager.masterName = manager.masterId ? users[manager.masterId].name : null;
      }
      if (manager.userIds.length === 0 && manager.running) {
        manager.running = false;
        log('SYSTEM', 'wplacer', `[${manager.name}] Template stopped, no users left.`);
      }
    }
  }
  if (templatesModified) saveTemplates();
  res.sendStatus(HTTP_STATUS.OK);
});

router.get('/user/status/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  if (!users[id]) {
    res.status(HTTP_STATUS.CONFLICT).json({ error: 'User not found' });
    return;
  }

  if (!(await acquireUserLock(id))) {
    res.status(HTTP_STATUS.CONFLICT).json({ error: 'User is busy' });
    return;
  }

  const wplacer = new WPlacer({});
  try {
    const userInfo = await retryWithBackoff(() => wplacer.login(users[id].cookies));
    res.status(HTTP_STATUS.OK).json(userInfo);
  } catch (error: any) {
    const { category, message } = classifyError(error);
    logUserError(error, id, users[id].name, 'validate cookie');
    const statusCode = category === 'auth' ? HTTP_STATUS.UNAUTH : HTTP_STATUS.SRV_ERR;
    res.status(statusCode).json({ error: message, category });
  } finally {
    releaseUserLock(id);
  }
});

router.post('/users/status', async (_req: Request, res: Response): Promise<void> => {
  const userIds = Object.keys(users);
  const results: Record<string, any> = {};

  const USER_TIMEOUT_MS = 30_000;
  const withTimeout = (p: Promise<any>, ms: number, label: string) =>
    Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(`${label} timeout`)), ms))]);

  const checkUser = async (id: string): Promise<void> => {
    if (!(await acquireUserLock(id))) {
      results[id] = { success: false, error: 'User is busy.', category: 'concurrent' };
      return;
    }

    const wplacer = new WPlacer({});
    try {
      const userInfo = await retryWithBackoff(() =>
        withTimeout(wplacer.login(users[id].cookies), USER_TIMEOUT_MS, `user ${id}`)
      );
      results[id] = { success: true, data: userInfo };
    } catch (error: any) {
      const { category, message } = classifyError(error);
      logUserError(error, id, users[id].name, 'bulk check');
      results[id] = { success: false, error: message, category };
    } finally {
      releaseUserLock(id);
    }
  };

  // Run all checks in parallel instead of sequentially
  await Promise.all(userIds.map((id) => checkUser(id)));
  res.json(results);
});

export default router;
