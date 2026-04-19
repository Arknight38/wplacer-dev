/**
 * Template management routes
 */

import { Router, Request, Response } from 'express';
import { TemplateManager, setGlobalUsers, setGlobalSettings, setColorOrderGetter, createTemplateContext, type TemplateContext } from '../services/template-manager.js';
import { log } from '../utils/logger.js';
import { HTTP_STATUS } from '../config/constants.js';
import type { Template, User, Settings } from '../types/index.js';
import { getColorOrder } from './color-ordering.js';
import { validateBody, templateCreateSchema, templateUpdateSchema } from '../middleware/validation.js';

// Global state
let templates: Record<string, TemplateManager> = {};
let saveTemplates: () => void;
let templateQueue: string[] = [];
let processQueueFn: () => void;
let globalUsers: Record<string, User> = {};
let globalSettings: Settings = {} as Settings;

/**
 * Create template context from global state
 */
function getTemplateContext(): TemplateContext {
  return createTemplateContext({
    users: globalUsers,
    settings: globalSettings,
    getColorOrderForTemplate: getColorOrder,
    activeBrowserUsers: new Set(),
    activeTemplateUsers: new Set(),
    templateQueue,
    activePaintingTasks: { count: 0 },
  });
}

// Template codec functions with RLE encoding/decoding
const CODEC_VERSION = 'v1';
const SEPARATOR = '|';

/**
 * Encode template data using RLE compression
 * Format: v1|<width>|<height>|<RLE-encoded-flat-data>
 * RLE format: count,value;count,value;...
 */
function shareCodeFromTemplate(template: Template): string {
  try {
    if (!template || !template.data || !Array.isArray(template.data)) {
      throw new Error('Invalid template data structure');
    }

    // Flatten 2D array and apply RLE
    const flatData: number[] = [];
    for (const row of template.data) {
      if (Array.isArray(row)) {
        flatData.push(...row);
      }
    }

    // RLE encode
    const rleParts: string[] = [];
    let current = flatData[0];
    let count = 1;

    for (let i = 1; i < flatData.length; i++) {
      if (flatData[i] === current && count < 255) {
        count++;
      } else {
        rleParts.push(`${count},${current}`);
        current = flatData[i];
        count = 1;
      }
    }
    if (flatData.length > 0) {
      rleParts.push(`${count},${current}`);
    }

    const rleString = rleParts.join(';');
    const encoded = Buffer.from(rleString).toString('base64url');

    return `${CODEC_VERSION}${SEPARATOR}${template.width}${SEPARATOR}${template.height}${SEPARATOR}${encoded}`;
  } catch (error: any) {
    log('ERROR', 'ShareCode', `Failed to encode template: ${error.message}`);
    throw new Error(`Share code generation failed: ${error.message}`);
  }
}

/**
 * Decode share code back to template
 */
function templateFromShareCode(code: string): Template | null {
  try {
    if (!code || typeof code !== 'string') {
      log('WARN', 'ShareCode', 'Invalid share code: empty or non-string');
      return null;
    }

    const parts = code.split(SEPARATOR);
    if (parts.length !== 4 || parts[0] !== CODEC_VERSION) {
      log('WARN', 'ShareCode', `Invalid share code format: expected 4 parts with version ${CODEC_VERSION}, got ${parts.length} parts`);
      return null;
    }

    const width = parseInt(parts[1], 10);
    const height = parseInt(parts[2], 10);

    if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0 || width > 10000 || height > 10000) {
      log('WARN', 'ShareCode', `Invalid dimensions: width=${parts[1]}, height=${parts[2]}`);
      return null;
    }

    const rleString = Buffer.from(parts[3], 'base64url').toString('utf-8');
    const rleParts = rleString.split(';');

    // RLE decode
    const flatData: number[] = [];
    for (const part of rleParts) {
      const [countStr, valueStr] = part.split(',');
      const count = parseInt(countStr, 10);
      const value = parseInt(valueStr, 10);

      if (isNaN(count) || isNaN(value) || count <= 0 || count > 10000) {
        log('WARN', 'ShareCode', `Invalid RLE segment: ${part}`);
        return null;
      }

      for (let i = 0; i < count; i++) {
        flatData.push(value);
      }
    }

    // Reshape to 2D
    const expectedSize = width * height;
    if (flatData.length !== expectedSize) {
      log('WARN', 'ShareCode', `Data size mismatch: expected ${expectedSize}, got ${flatData.length}`);
      return null;
    }

    const data: number[][] = [];
    for (let y = 0; y < height; y++) {
      const row = flatData.slice(y * width, (y + 1) * width);
      data.push(row);
    }

    const template: Template = {
      width,
      height,
      data,
      shareCode: code,
    };

    return template;
  } catch (error: any) {
    log('WARN', 'ShareCode', `Failed to decode share code: ${error.message}`);
    return null;
  }
}

/**
 * Validate that a template ID is unique before insertion
 */
function validateTemplateIdUnique(templateId: string): { valid: boolean; error?: string } {
  if (!templateId || typeof templateId !== 'string') {
    return { valid: false, error: 'Template ID is required and must be a string' };
  }
  if (templateId.trim().length === 0) {
    return { valid: false, error: 'Template ID cannot be empty or whitespace only' };
  }
  if (templates[templateId]) {
    return { valid: false, error: `Template ID '${templateId}' already exists` };
  }
  if (!/^[a-zA-Z0-9_.-]+$/.test(templateId)) {
    return { valid: false, error: 'Template ID contains invalid characters (only alphanumeric, underscore, hyphen, and dot allowed)' };
  }
  return { valid: true };
}

export function setTemplatesState(t: Record<string, TemplateManager>): void {
  // eslint-disable-next-line no-empty
  templates = t;
}

export function setUsersState(u: Record<string, User>): void {
  setGlobalUsers(u);
}

export function setSettingsState(s: Settings): void {
  setGlobalSettings(s);
}

export function setSaveTemplates(fn: () => void): void {
  saveTemplates = fn;
}

export function setTemplateQueue(q: string[]): void {
  templateQueue = q;
}

export function setProcessQueueFn(fn: () => void): void {
  processQueueFn = fn;
}

export function getTemplates(): Record<string, TemplateManager> {
  return templates;
}

// Initialize color order getter
setColorOrderGetter(getColorOrder);

const router = Router();

router.get('/templates', (_req: Request, res: Response) => {
  const templateList: Record<string, any> = {};

  for (const id in templates) {
    const manager = templates[id];
    try {
      let shareCode: string | null = null;
      try {
        shareCode = manager.template?.shareCode || shareCodeFromTemplate(manager.template);
      } catch (shareCodeError: any) {
        log('WARN', 'Templates', `Failed to generate share code for template '${id}' (${manager.name}): ${shareCodeError.message}`);
      }

      templateList[id] = {
        id: id,
        name: manager.name,
        coords: manager.coords,
        userIds: manager.userIds,
        canBuyCharges: manager.canBuyCharges,
        canBuyMaxCharges: manager.canBuyMaxCharges,
        antiGriefMode: manager.antiGriefMode,
        eraseMode: manager.eraseMode,
        outlineMode: manager.outlineMode,
        skipPaintedPixels: manager.skipPaintedPixels,
        enableAutostart: manager.enableAutostart,
        running: manager.running,
        status: manager.status,
        masterId: manager.masterId,
        masterName: manager.masterName,
        totalPixels: manager.totalPixels,
        pixelsRemaining: manager.pixelsRemaining,
        currentPixelSkip: manager.currentPixelSkip,
        shareCode: shareCode,
      };
    } catch (e: any) {
      log('ERROR', 'Templates', `Failed to serialize template '${id}' (${manager.name}): ${e.message}`);
    }
  }

  res.json(templateList);
});

router.post('/templates/import', async (req: Request, res: Response): Promise<void> => {
  const { id, name, coords, code } = req.body;
  if (!code) {
    res.status(HTTP_STATUS.BAD_REQ).json({ error: 'Missing required field: code (share code)' });
    return;
  }

  const template = templateFromShareCode(code);
  if (!template) {
    res.status(HTTP_STATUS.BAD_REQ).json({ error: 'Invalid share code: could not decode template data. Check that the code is valid and not corrupted.' });
    return;
  }

  const templateId = id || `imported_${Date.now()}`;
  const idValidation = validateTemplateIdUnique(templateId);
  if (!idValidation.valid) {
    res.status(HTTP_STATUS.CONFLICT).json({ error: idValidation.error });
    return;
  }

  try {
    const manager = new TemplateManager(
      {
        templateId,
        name: name || 'Imported Template',
        templateData: template,
        coords: coords || [0, 0, 0, 0],
        canBuyCharges: false,
        canBuyMaxCharges: false,
        antiGriefMode: false,
        eraseMode: false,
        outlineMode: false,
        skipPaintedPixels: false,
        enableAutostart: false,
        userIds: [],
      },
      getTemplateContext()
    );

    templates[templateId] = manager;
    saveTemplates();
    log('SYSTEM', 'Templates', `📥 Imported template '${templateId}' (${manager.name}) from share code`);
    res.status(HTTP_STATUS.OK).json({ success: true, id: templateId });
  } catch (error: any) {
    log('ERROR', 'Templates', `Failed to import template '${templateId}': ${error.message}`);
    res.status(HTTP_STATUS.SRV_ERR).json({ error: `Import failed: ${error.message}` });
  }
});

router.post('/template', validateBody(templateCreateSchema), async (req: Request, res: Response): Promise<void> => {
  const {
    templateName,
    template,
    coords,
    userIds,
    canBuyCharges,
    canBuyMaxCharges,
    antiGriefMode,
    eraseMode,
    outlineMode,
    skipPaintedPixels,
    enableAutostart,
  } = req.body;

  const templateId = `template_${Date.now()}`;

  // Validate template ID is unique before creation
  const idValidation = validateTemplateIdUnique(templateId);
  if (!idValidation.valid) {
    // This should rarely happen with timestamp-based IDs, but handle it gracefully
    log('WARN', 'Templates', `Generated duplicate template ID: ${templateId}`);
    res.status(HTTP_STATUS.CONFLICT).json({ error: idValidation.error });
    return;
  }

  try {
    const manager = new TemplateManager(
      {
        templateId,
        name: templateName,
        templateData: template,
        coords,
        canBuyCharges: canBuyCharges || false,
        canBuyMaxCharges: canBuyMaxCharges || false,
        antiGriefMode: antiGriefMode || false,
        eraseMode: eraseMode || false,
        outlineMode: outlineMode || false,
        skipPaintedPixels: skipPaintedPixels || false,
        enableAutostart: enableAutostart || false,
        userIds,
      },
      getTemplateContext()
    );

    templates[templateId] = manager;
    saveTemplates();
    log('SYSTEM', 'Templates', `✅ Created new template '${templateId}' (${manager.name})`);
    res.status(HTTP_STATUS.OK).json({ success: true, id: templateId });
  } catch (error: any) {
    log('ERROR', 'Templates', `Failed to create template '${templateId}' (${templateName}): ${error.message}`);
    res.status(HTTP_STATUS.SRV_ERR).json({ error: `Template creation failed: ${error.message}` });
  }
});

router.delete('/template/:id', (_req: Request, res: Response): void => {
  const { id } = _req.params;
  if (!templates[id]) {
    res.status(HTTP_STATUS.BAD_REQ).json({ error: 'Template not found' });
    return;
  }

  const manager = templates[id];
  if (manager.running) {
    manager.running = false;
  }

  delete templates[id];
  saveTemplates();
  log('SYSTEM', 'Templates', `🗑️ Deleted template "${manager.name}".`);
  res.sendStatus(HTTP_STATUS.OK);
});

router.put('/template/edit/:id', validateBody(templateUpdateSchema), (req: Request, res: Response): void => {
  const { id } = req.params;
  if (!templates[id]) {
    res.status(HTTP_STATUS.BAD_REQ).json({ error: 'Template not found' });
    return;
  }

  const manager = templates[id];
  const updates = req.body;

  if (updates.templateName !== undefined) manager.name = updates.templateName;
  if (updates.coords !== undefined) manager.coords = updates.coords;
  if (updates.userIds !== undefined) manager.userIds = updates.userIds;
  if (updates.canBuyCharges !== undefined) manager.canBuyCharges = updates.canBuyCharges;
  if (updates.canBuyMaxCharges !== undefined) manager.canBuyMaxCharges = updates.canBuyMaxCharges;
  if (updates.antiGriefMode !== undefined) manager.antiGriefMode = updates.antiGriefMode;
  if (updates.eraseMode !== undefined) manager.eraseMode = updates.eraseMode;
  if (updates.outlineMode !== undefined) manager.outlineMode = updates.outlineMode;
  if (updates.skipPaintedPixels !== undefined) manager.skipPaintedPixels = updates.skipPaintedPixels;
  if (updates.enableAutostart !== undefined) manager.enableAutostart = updates.enableAutostart;
  if (updates.template !== undefined) manager.template = updates.template;

  saveTemplates();
  res.sendStatus(HTTP_STATUS.OK);
});

router.put('/template/:id', (req: Request, res: Response): void => {
  const { id } = req.params;
  if (!templates[id]) {
    res.status(HTTP_STATUS.BAD_REQ).json({ error: 'Template not found' });
    return;
  }

  const { running } = req.body;
  if (running === undefined) {
    res.status(HTTP_STATUS.BAD_REQ).json({ error: 'Missing running field' });
    return;
  }

  const manager = templates[id];

  if (running && !manager.running) {
    templateQueue.push(id);
    processQueueFn();
  } else if (!running && manager.running) {
    manager.running = false;
    manager.status = 'Stopped.';
  }

  res.sendStatus(HTTP_STATUS.OK);
});

export default router;
