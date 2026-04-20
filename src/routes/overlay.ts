/**
 * Overlay routes for image overlay coordinates
 */

import { Router, Request, Response } from 'express';
import { log } from '../utils/logger.js';
import { HTTP_STATUS } from '../config/constants.js';

const router = Router();

// Store overlay coordinates temporarily
let overlayCoords: {
  tileX: number;
  tileY: number;
  pixelX: number;
  pixelY: number;
  worldX: number;
  worldY: number;
  timestamp: number;
} | null = null;

/**
 * @swagger
 * /overlay/coords:
 *   post:
 *     summary: Receive overlay coordinates from extension
 *     tags: [Overlay]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tileX:
 *                 type: number
 *               tileY:
 *                 type: number
 *               pixelX:
 *                 type: number
 *               pixelY:
 *                 type: number
 *               worldX:
 *                 type: number
 *               worldY:
 *                 type: number
 *     responses:
 *       200:
 *         description: Coordinates received
 *       400:
 *         description: Invalid request
 */
router.post('/overlay/coords', (req: Request, res: Response) => {
  const { tileX, tileY, pixelX, pixelY, worldX, worldY } = req.body;

  if (typeof worldX !== 'number' || typeof worldY !== 'number') {
    res.status(HTTP_STATUS.BAD_REQ).json({ error: 'Missing worldX or worldY coordinates' });
    return;
  }

  overlayCoords = {
    tileX,
    tileY,
    pixelX,
    pixelY,
    worldX,
    worldY,
    timestamp: Date.now(),
  };

  log('SYSTEM', 'Overlay', `Received overlay coordinates: world(${worldX}, ${worldY})`);
  res.json({ success: true, worldX, worldY });
});

/**
 * @swagger
 * /overlay/coords:
 *   get:
 *     summary: Get latest overlay coordinates
 *     tags: [Overlay]
 *     responses:
 *       200:
 *         description: Latest coordinates or null
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 coords:
 *                   type: object
 *                   nullable: true
 */
router.get('/overlay/coords', (_req: Request, res: Response) => {
  // Clear coordinates after retrieval (one-time read)
  const coords = overlayCoords;
  overlayCoords = null;
  res.json({ coords });
});

export default router;
export { overlayCoords };
