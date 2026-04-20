/**
 * Bridge routes for wplace extension
 * Handles communication between the browser extension and local server
 */

import { Router, Request, Response } from 'express';
import { HTTP_STATUS } from '../config/constants.js';
import { logger } from '../utils/logger.js';

const router = Router();

// Store for pending sign requests
const pendingSignRequests = new Map<string, { body: string; resolve: (headers: any) => void }>();
const signRequestTimeouts = new Map<string, NodeJS.Timeout>();

// Store for latest captured headers (for immediate use)
let latestHeaders: {
  pawtect: string;
  t: string;
  fp: string;
  cookie: string;
  originalBody: string;
} | null = null;

/**
 * POST /bridge
 * Receives captured headers from the extension
 */
router.post('/bridge', (req: Request, res: Response): void => {
  try {
    const { headers, originalBody } = req.body || {};
    
    if (!headers || !headers['x-pawtect-token']) {
      res.sendStatus(HTTP_STATUS.BAD_REQ);
      return;
    }

    // Store the latest headers
    latestHeaders = {
      pawtect: headers['x-pawtect-token'],
      t: headers['x-t'] || '',
      fp: headers['x-fp'] || '',
      cookie: headers['Cookie'] || '',
      originalBody: originalBody || ''
    };

    logger.info('Bridge: Received captured headers', {
      hasPawtect: !!latestHeaders.pawtect,
      hasT: !!latestHeaders.t,
      hasFP: !!latestHeaders.fp,
      hasCookie: !!latestHeaders.cookie
    });

    res.sendStatus(HTTP_STATUS.OK);
  } catch (error) {
    logger.error('Bridge: Error processing /bridge request', error);
    res.sendStatus(HTTP_STATUS.SRV_ERR);
  }
});

/**
 * GET /sign-request
 * Polling endpoint for the extension to check for pending sign requests
 */
router.get('/sign-request', (_req: Request, res: Response): void => {
  try {
    // Check if there's a pending sign request
    const requestId = Array.from(pendingSignRequests.keys())[0];
    
    if (requestId) {
      const request = pendingSignRequests.get(requestId);
      if (request) {
        // Return the sign request to the extension
        res.json({ body: request.body, requestId });
        
        // Clear the timeout since the request was picked up
        const timeout = signRequestTimeouts.get(requestId);
        if (timeout) {
          clearTimeout(timeout);
          signRequestTimeouts.delete(requestId);
        }
      } else {
        res.sendStatus(204);
      }
    } else {
      res.sendStatus(204);
    }
  } catch (error) {
    logger.error('Bridge: Error processing /sign-request', error);
    res.sendStatus(HTTP_STATUS.SRV_ERR);
  }
});

/**
 * POST /sign-response
 * Receives signed headers from the extension
 */
router.post('/sign-response', (req: Request, res: Response): void => {
  try {
    const { headers, requestId, cookie, error } = req.body || {};
    
    if (!requestId) {
      res.sendStatus(HTTP_STATUS.BAD_REQ);
      return;
    }

    const pendingRequest = pendingSignRequests.get(requestId);
    
    if (pendingRequest) {
      // Resolve the pending request with the signed headers
      if (error) {
        logger.warn('Bridge: Sign request failed', { requestId, error });
        pendingRequest.resolve({ error });
      } else {
        logger.info('Bridge: Sign request succeeded', { requestId, hasHeaders: !!headers });
        pendingRequest.resolve({ headers, cookie });
      }
      
      // Clean up
      pendingSignRequests.delete(requestId);
      const timeout = signRequestTimeouts.get(requestId);
      if (timeout) {
        clearTimeout(timeout);
        signRequestTimeouts.delete(requestId);
      }
      
      res.sendStatus(HTTP_STATUS.OK);
    } else {
      logger.warn('Bridge: Received response for unknown request', { requestId });
      res.sendStatus(404);
    }
  } catch (error) {
    logger.error('Bridge: Error processing /sign-response', error);
    res.sendStatus(HTTP_STATUS.SRV_ERR);
  }
});

/**
 * Helper function to request a signature for a body
 * This can be called by other parts of the application
 */
export function requestSignature(body: string, timeoutMs: number = 10000): Promise<{ headers?: any; cookie?: string; error?: string }> {
  return new Promise((resolve) => {
    const requestId = crypto.randomUUID();
    
    pendingSignRequests.set(requestId, { body, resolve });
    
    // Set timeout
    const timeout = setTimeout(() => {
      pendingSignRequests.delete(requestId);
      signRequestTimeouts.delete(requestId);
      resolve({ error: 'Sign request timeout' });
    }, timeoutMs);
    
    signRequestTimeouts.set(requestId, timeout);
    
    logger.info('Bridge: Created sign request', { requestId });
  });
}

/**
 * Helper function to get the latest captured headers
 */
export function getLatestHeaders(): typeof latestHeaders {
  return latestHeaders;
}

/**
 * Helper function to clear the latest headers
 */
export function clearLatestHeaders(): void {
  latestHeaders = null;
}

// WebSocket broadcast function - will be set by server.ts
let broadcastToExtension: (type: string, data?: any) => void = () => {};

export function setBroadcastFunction(fn: (type: string, data?: any) => void): void {
  broadcastToExtension = fn;
}

/**
 * Broadcast bot activation to extension
 */
export function broadcastBotActivate(): void {
  broadcastToExtension('bot-activate');
  logger.info('Bridge: Broadcasted bot activation');
}

/**
 * Broadcast bot deactivation to extension
 */
export function broadcastBotDeactivate(): void {
  broadcastToExtension('bot-deactivate');
  logger.info('Bridge: Broadcasted bot deactivation');
}

/**
 * POST /bot/activate
 * Activate the extension bot (start polling, allow wplace requests)
 */
router.post('/bot/activate', (_req: Request, res: Response): void => {
  try {
    broadcastToExtension('bot-activate');
    logger.info('Bridge: Bot activation sent to extension');
    res.json({ success: true, message: 'Bot activation sent' });
  } catch (error) {
    logger.error('Bridge: Error sending bot activation', error);
    res.status(HTTP_STATUS.SRV_ERR).json({ error: 'Failed to send activation' });
  }
});

/**
 * POST /bot/deactivate
 * Deactivate the extension bot (stop polling, block wplace requests)
 */
router.post('/bot/deactivate', (_req: Request, res: Response): void => {
  try {
    broadcastToExtension('bot-deactivate');
    logger.info('Bridge: Bot deactivation sent to extension');
    res.json({ success: true, message: 'Bot deactivation sent' });
  } catch (error) {
    logger.error('Bridge: Error sending bot deactivation', error);
    res.status(HTTP_STATUS.SRV_ERR).json({ error: 'Failed to send deactivation' });
  }
});

export default router;
