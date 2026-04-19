/**
 * Log streaming routes
 */

import { Router, Request, Response } from 'express';
import { createReadStream, statSync } from 'node:fs';
import path from 'node:path';
import { DATA_DIR } from '../config/constants.js';

const router = Router();

// Helper: stream file from offset
function streamLogFile(res: Response, filePath: string, lastSize: number): void {
  try {
    const stats = statSync(filePath);
    const size = stats.size;
    if (lastSize && lastSize < size) {
      // Send only new data
      const stream = createReadStream(filePath, { start: lastSize });
      stream.pipe(res);
    } else {
      // Send whole file
      const stream = createReadStream(filePath);
      stream.pipe(res);
    }
  } catch {
    res.status(500).end();
  }
}

// Simple polling endpoint for logs (returns full file, or new data if client provides lastSize)
router.get('/logs', (req: Request, res: Response) => {
  const filePath = path.join(DATA_DIR, 'logs.log');
  const lastSize = req.query.lastSize ? parseInt(req.query.lastSize as string, 10) : 0;
  streamLogFile(res, filePath, lastSize);
});

router.get('/errors', (req: Request, res: Response) => {
  const filePath = path.join(DATA_DIR, 'errors.log');
  const lastSize = req.query.lastSize ? parseInt(req.query.lastSize as string, 10) : 0;
  streamLogFile(res, filePath, lastSize);
});

export default router;
