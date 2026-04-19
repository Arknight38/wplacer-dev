/**
 * Main server entry point
 * WPlace auto-drawing bot
 */

import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { WebSocketServer } from 'ws';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import gradient from 'gradient-string';

// Import routes
import logsRouter from './routes/logs.js';
import tokensRouter from './routes/tokens.js';
import usersRouter from './routes/users.js';
import settingsRouter from './routes/settings.js';
import proxyRouter from './routes/proxy.js';
import paletteRouter from './routes/palette.js';
import colorOrderingRouter from './routes/color-ordering.js';
import templatesRouter from './routes/templates.js';
import bridgeRouter from './routes/bridge.js';

// Import middleware
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';

// Import services and utilities
import { APP_HOST, APP_PRIMARY_PORT, APP_FALLBACK_PORTS, DATA_DIR, USERS_FILE, SETTINGS_FILE, TEMPLATES_PATH, ALLOWED_ORIGINS, RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX, MAX_WS_CONNECTIONS, WS_PING_INTERVAL_MS, GRACEFUL_SHUTDOWN_TIMEOUT_MS, KEEP_ALIVE_INTERVAL_MS, MS } from './config/constants.js';
import { loadSettings } from './config/settings.js';
import { log, logger } from './utils/logger.js';
import { loadJSON, saveJSON } from './utils/helpers.js';
import type { User, TemplateData } from './types/index.js';
import { setActiveBrowserUsers, setActiveTemplateUsers, setTemplateQueue, setActivePaintingTasks, processQueue } from './services/template-manager.js';

// Import route state setters
import {
  setUsersState as setUsersRouteState,
  setTemplatesState as setTemplatesRouteState,
  setSettingsState as setSettingsRouteState,
  setSaveTemplates as setTemplatesSaveTemplates,
  setTemplateQueue as setTemplatesTemplateQueue,
  setProcessQueueFn as setTemplatesProcessQueueFn,
  getTemplates as getTemplatesFromRoutes,
} from './routes/templates.js';
import { setUsersState as setUsersRouteState2, setTemplatesState as setUsersTemplatesState, setSaveUsers, setSaveTemplates as setUsersSaveTemplates, setActiveBrowserUsers as setUsersActiveBrowserUsers } from './routes/users.js';
import { setSettingsState as setSettingsRouteState2, setSaveSettings, setLoadedProxies as setSettingsLoadedProxies } from './routes/settings.js';
import { setProxyFunctions, updateLoadedProxies } from './routes/proxy.js';

// Ensure data directory exists
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

// Load settings
const currentSettings = loadSettings();

// Load users
const users = loadJSON<Record<string, User>>(USERS_FILE);

// Load templates
const templates = loadJSON<Record<string, TemplateData>>(TEMPLATES_PATH);

// Server state
const activeBrowserUsers = new Set<string>();
const activeTemplateUsers = new Set<string>();
const templateQueue: string[] = [];
const activePaintingTasks = 0;

// Initialize global state for services
setActiveBrowserUsers(activeBrowserUsers);
setActiveTemplateUsers(activeTemplateUsers);
setTemplateQueue(templateQueue);
setActivePaintingTasks(activePaintingTasks);

// Initialize route state
setUsersRouteState(users);
setTemplatesRouteState({} as any); // Will be populated after migration
setSettingsRouteState(currentSettings);
setUsersRouteState2(users);
setUsersTemplatesState({} as any);
setSettingsRouteState2(currentSettings);
setUsersActiveBrowserUsers(activeBrowserUsers);

// Proxy loading
const PROXIES_FILE = path.join(DATA_DIR, 'proxies.txt');
let loadedProxies: string[] = [];

function loadProxies(): void {
  if (existsSync(PROXIES_FILE)) {
    const data = readFileSync(PROXIES_FILE, 'utf8');
    loadedProxies = data.split('\n').filter((line: string) => line.trim());
    log('SYSTEM', 'wplacer', `Loaded ${loadedProxies.length} proxies.`);
  } else {
    loadedProxies = [];
    log('SYSTEM', 'wplacer', `No proxies file found.`);
  }
  updateLoadedProxies(loadedProxies);
  setSettingsLoadedProxies(loadedProxies);
}

// Initialize proxy functions
setProxyFunctions(loadProxies, loadedProxies);

// Save functions
function saveUsers(): void {
  saveJSON(USERS_FILE, users);
}

function saveTemplates(): void {
  saveJSON(TEMPLATES_PATH, templates);
}

function saveSettingsFn(): void {
  saveJSON(SETTINGS_FILE, currentSettings);
}

// Set save functions in routes
setSaveUsers(saveUsers);
setUsersSaveTemplates(saveTemplates);
setSaveSettings(saveSettingsFn);
setTemplatesSaveTemplates(saveTemplates);
setTemplatesTemplateQueue(templateQueue);
setTemplatesProcessQueueFn(() => processQueue(getTemplatesFromRoutes() as any));

// Express setup
const app = express();
const limiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true,
}));
app.use(express.static('public'));
app.use(express.json({ limit: '50mb' }));
app.use('/api/', limiter);

// Mount routes
app.use(logsRouter);
app.use(tokensRouter);
app.use(usersRouter);
app.use(settingsRouter);
app.use(proxyRouter);
app.use(paletteRouter);
app.use(colorOrderingRouter);
app.use(templatesRouter);
app.use(bridgeRouter);

// Swagger API documentation
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'WPlace API',
      version: '5.6.2',
      description: 'API for WPlace auto-drawing bot',
      contact: {
        name: 'JinxTheCatto and luluwaffless',
      },
    },
    servers: [
      {
        url: `http://${APP_HOST}:${APP_PRIMARY_PORT}`,
        description: 'Development server',
      },
    ],
  },
  apis: ['./src/routes/*.ts'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Error handling middleware (must be after routes)
app.use(notFoundHandler);
app.use(errorHandler);

// WebSocket setup
const wsClients = {
  logs: new Set<any>(),
  errors: new Set<any>(),
};

const wsConnections = new Set<any>();

function cleanupWebSocket(ws: any): void {
  wsClients.logs.delete(ws);
  wsClients.errors.delete(ws);
  wsConnections.delete(ws);
}

// Cached WPlacer class to avoid dynamic imports in loop
let WPlacerCache: typeof import('./services/wplacer-client.js').WPlacer | null = null;

async function getWPlacerClass(): Promise<typeof import('./services/wplacer-client.js').WPlacer> {
  if (!WPlacerCache) {
    const { WPlacer } = await import('./services/wplacer-client.js');
    WPlacerCache = WPlacer;
  }
  return WPlacerCache;
}

// Keep-alive function with cached import and improved error handling
async function runKeepAlive(): Promise<void> {
  const now = Date.now();
  const WPlacerClass = await getWPlacerClass();

  for (const userId in users) {
    if (activeBrowserUsers.has(userId)) continue;
    const lastActivity = users[userId].lastActivity || 0;
    if (now - lastActivity > MS.ONE_HOUR) {
      try {
        const w = new WPlacerClass({});
        await w.login(users[userId].cookies);
        users[userId].lastActivity = now;
        saveUsers();
      } catch (error: any) {
        log(userId, users[userId].name, 'Keep-alive failed', error);
        // Enhanced error handling: flag potentially expired sessions
        if (error?.status === 401 || error?.message?.includes('unauthorized') || error?.message?.includes('Invalid session')) {
          logger.warn(`User ${userId} (${users[userId].name}) session may be expired - authentication failed`);
        }
      }
    }
  }
}

// Server state for graceful shutdown
let serverState = {
  wss: null as WebSocketServer | null,
  httpServer: null as any,
  shutdownInProgress: false,
  intervals: [] as NodeJS.Timeout[],
};

// Graceful shutdown handler
async function gracefulShutdown(signal: string): Promise<void> {
  if (serverState.shutdownInProgress) {
    logger.warn(`Shutdown already in progress, forcing exit...`);
    process.exit(1);
  }

  serverState.shutdownInProgress = true;
  console.log(gradient('yellow', 'red')(`\n📴 Received ${signal}. Starting graceful shutdown...`));

  // Clear all intervals
  serverState.intervals.forEach(clearInterval);

  // Persist state
  try {
    saveUsers();
    saveTemplates();
    saveSettingsFn();
    log('SYSTEM', 'wplacer', 'State persisted before shutdown');
  } catch (error) {
    logger.error('Failed to persist state during shutdown:', error);
  }

  // Close WebSocket connections gracefully
  if (serverState.wss) {
    const closePromises: Promise<void>[] = [];
    serverState.wss.clients.forEach((ws: any) => {
      const closePromise = new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          ws.terminate();
          resolve();
        }, 2000);
        ws.once('close', () => {
          clearTimeout(timeout);
          resolve();
        });
        ws.close(1001, 'Server shutting down');
      });
      closePromises.push(closePromise);
    });

    await Promise.race([
      Promise.allSettled(closePromises),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('WebSocket close timeout')), GRACEFUL_SHUTDOWN_TIMEOUT_MS)
      ),
    ]).catch((err) => {
      logger.warn('Some WebSocket connections force-closed:', err);
    });

    log('SYSTEM', 'wplacer', `Closed ${closePromises.length} WebSocket connections`);
  }

  // Close HTTP server
  if (serverState.httpServer) {
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        logger.warn('Force closing HTTP server after timeout');
        resolve();
      }, GRACEFUL_SHUTDOWN_TIMEOUT_MS);

      serverState.httpServer!.close(() => {
        clearTimeout(timeout);
        log('SYSTEM', 'wplacer', 'HTTP server closed');
        resolve();
      });
    });
  }

  console.log(gradient('green', 'cyan')('✅ Graceful shutdown completed'));
  process.exit(0);
}

// Server startup
async function startServer(): Promise<void> {
  console.log(
    gradient('cyan', 'magenta')(`
    ╔════════════════════════════════════════════════════════════╗
    ║                                                          ║
    ║              WPlace Auto-Drawing Bot v5.6.2              ║
    ║                                                          ║
    ╚════════════════════════════════════════════════════════════╝
    `)
  );

  try {
    // Load proxies
    loadProxies();

    // Validate settings
    if (!currentSettings) {
      throw new Error('Failed to load settings');
    }

    // Validate users data
    if (!users || typeof users !== 'object') {
      throw new Error('Failed to load users data');
    }

    // Validate templates data
    if (!templates || typeof templates !== 'object') {
      throw new Error('Failed to load templates data');
    }

    // Attempt to bind to available ports
    const ports = [APP_PRIMARY_PORT, ...APP_FALLBACK_PORTS];
    let server: any = null;
    let boundPort: number | null = null;

    for (const port of ports) {
      try {
        server = await new Promise((resolve, reject) => {
          const s = app.listen(port, APP_HOST, () => {
            console.log(gradient('green', 'cyan')(`🚀 Server listening on http://${APP_HOST}:${port}`));
            resolve(s);
          });
          s.on('error', reject);
        });
        serverState.httpServer = server;
        boundPort = port;
        break;
      } catch (error: any) {
        if (error.code === 'EADDRINUSE') {
          console.log(`Port ${port} is in use, trying next port...`);
        } else {
          console.error(`Failed to bind to port ${port}:`, error.message);
          throw error;
        }
      }
    }

    if (!server || boundPort === null) {
      console.error('Failed to bind to any port');
      process.exit(1);
    }

    // WebSocket server
    const wss = new WebSocketServer({ server });
    serverState.wss = wss;
    wss.on('connection', (ws: any, _req) => {
      // Check connection limit
      if (wsConnections.size >= MAX_WS_CONNECTIONS) {
        ws.close(1013, 'Server overloaded');
        return;
      }

      wsConnections.add(ws);

      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message);
          if (data.type === 'logs') {
            wsClients.logs.add(ws);
          } else if (data.type === 'errors') {
            wsClients.errors.add(ws);
          }
        } catch (err) {
          logger.error('Failed to parse WebSocket message', err);
        }
      });
      ws.on('close', () => {
        cleanupWebSocket(ws);
      });
      ws.on('error', (err: Error) => {
        logger.error('WebSocket error', err);
        cleanupWebSocket(ws);
      });

      // Send ping every 30 seconds to keep connection alive
      ws.isAlive = true;
      ws.on('pong', () => {
        ws.isAlive = true;
      });
    });

    // Clean up dead connections on configured interval
    setInterval(() => {
      if (serverState.shutdownInProgress) {
        return;
      }
      wss.clients.forEach((ws: any) => {
        if (!ws.isAlive) {
          ws.terminate();
          cleanupWebSocket(ws);
        }
        ws.isAlive = false;
        ws.ping();
      });
    }, WS_PING_INTERVAL_MS);

    // Start keep-alive interval using configured value
    const keepAliveInterval = setInterval(runKeepAlive, KEEP_ALIVE_INTERVAL_MS);
    serverState.intervals.push(keepAliveInterval);

    // Register graceful shutdown handlers
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    console.log(gradient('green', 'yellow')('✅ Server started successfully'));
  } catch (error) {
    console.error('Failed to start server:', error);
    log('SYSTEM', 'wplacer', 'Server startup failed', error as Error);
    process.exit(1);
  }
}

// Handle uncaught errors with graceful shutdown
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  log('SYSTEM', 'wplacer', 'Uncaught exception', error);
  gracefulShutdown('uncaughtException').catch(() => process.exit(1));
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  log('SYSTEM', 'wplacer', 'Unhandled rejection', reason as Error);
  // Don't shutdown on unhandled rejections, just log them
});

// Start server
startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
