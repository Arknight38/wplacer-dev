/**
 * TemplateManager - Manages template painting operations
 * Refactored with dependency injection, extracted methods, and parallel execution
 */

import type { Template, User, Settings } from '../types/index.js';
import { log } from '../utils/logger.js';
import { sleep, duration, MS } from '../utils/helpers.js';
import { COLOR_NAMES, TEMPLATE_CONFIG } from '../config/constants.js';
import { ChargeCache } from './charge-cache.js';
import { TokenManager } from './token-manager.js';
import { WPlacer } from './wplacer-client.js';

interface TemplateManagerConfig {
  templateId: string;
  name: string;
  templateData: Template;
  coords: [number, number, number, number];
  canBuyCharges: boolean;
  canBuyMaxCharges: boolean;
  antiGriefMode: boolean;
  eraseMode: boolean;
  outlineMode: boolean;
  skipPaintedPixels: boolean;
  enableAutostart: boolean;
  userIds: string[];
}

/** Dependency injection context to replace global state */
export interface TemplateContext {
  users: Record<string, User>;
  settings: Settings;
  getColorOrderForTemplate: (templateId: string) => number[];
  activeBrowserUsers: Set<string>;
  activeTemplateUsers: Set<string>;
  templateQueue: string[];
  activePaintingTasks: { count: number };
}

/** Create a complete context with all required properties */
export function createTemplateContext(partial: Partial<TemplateContext> = {}): TemplateContext {
  return {
    users: partial.users ?? {},
    settings: partial.settings ?? {} as Settings,
    getColorOrderForTemplate: partial.getColorOrderForTemplate ?? (() => []),
    activeBrowserUsers: partial.activeBrowserUsers ?? new Set(),
    activeTemplateUsers: partial.activeTemplateUsers ?? new Set(),
    templateQueue: partial.templateQueue ?? [],
    activePaintingTasks: partial.activePaintingTasks ?? { count: 0 },
  };
}

// Legacy global context for backward compatibility during migration
let globalContext: TemplateContext = createTemplateContext();

/** Set the global context - should be called once at app startup */
export function setTemplateContext(context: Partial<TemplateContext>): void {
  globalContext = { ...globalContext, ...context };
}

/** Legacy setters for backward compatibility */
export function setGlobalUsers(u: Record<string, User>): void {
  globalContext.users = u;
}

export function setGlobalSettings(s: Settings): void {
  globalContext.settings = s;
}

export function setColorOrderGetter(fn: (templateId: string) => number[]): void {
  globalContext.getColorOrderForTemplate = fn;
}

export function setActiveBrowserUsers(set: Set<string>): void {
  globalContext.activeBrowserUsers = set;
}

export function setActiveTemplateUsers(set: Set<string>): void {
  globalContext.activeTemplateUsers = set;
}

export function setTemplateQueue(queue: string[]): void {
  globalContext.templateQueue = queue;
}

export function getActivePaintingTasks(): number {
  return globalContext.activePaintingTasks.count;
}

export function setActivePaintingTasks(count: number): void {
  globalContext.activePaintingTasks.count = count;
}

export function processQueue(
  templates: Record<string, TemplateManager>,
  context?: TemplateContext
): void {
  const ctx = context ?? globalContext;
  const { templateQueue, activeTemplateUsers } = ctx;

  for (let i = 0; i < templateQueue.length; i++) {
    const templateId = templateQueue[i];
    const manager = templates[templateId];
    if (!manager) {
      templateQueue.splice(i, 1);
      i--;
      continue;
    }
    const busy = manager.userIds.some((id) => activeTemplateUsers.has(id));
    if (!busy) {
      templateQueue.splice(i, 1);
      manager.userIds.forEach((id) => activeTemplateUsers.add(id));
      manager.start().catch((e) =>
        log(templateId, manager.masterName, 'Error starting queued template', e as Error)
      );
      break;
    }
  }
}

/** Result type for pixel check operations */
interface PixelCheckResult {
  wplacer: WPlacer;
  mismatchedPixels: any[];
}

/** Ready user with their charge information */
interface ReadyUser {
  userId: string;
  potentialCharges: number;
}

export class TemplateManager {
  templateId: string;
  name: string;
  template: Template;
  coords: [number, number, number, number];
  canBuyCharges: boolean;
  canBuyMaxCharges: boolean;
  antiGriefMode: boolean;
  eraseMode: boolean;
  outlineMode: boolean;
  skipPaintedPixels: boolean;
  enableAutostart: boolean;
  userIds: string[];
  userQueue: string[];

  running: boolean;
  status: string;
  masterId: string;
  masterName: string;
  sleepAbortController: AbortController | null;
  totalPixels: number;
  pixelsRemaining: number;
  currentPixelSkip: number;

  initialRetryDelay: number;
  maxRetryDelay: number;
  currentRetryDelay: number;

  private ctx: TemplateContext;

  constructor(config: TemplateManagerConfig, context: TemplateContext) {
    this.templateId = config.templateId;
    this.name = config.name;
    this.template = config.templateData;
    this.coords = config.coords;
    this.canBuyCharges = config.canBuyCharges;
    this.canBuyMaxCharges = config.canBuyMaxCharges;
    this.antiGriefMode = config.antiGriefMode;
    this.eraseMode = config.eraseMode;
    this.outlineMode = config.outlineMode;
    this.skipPaintedPixels = config.skipPaintedPixels;
    this.enableAutostart = config.enableAutostart;
    this.userIds = config.userIds;

    // Context is now required - no global fallback
    this.ctx = context;

    this.running = false;
    this.status = 'Waiting to be started.';
    this.masterId = this.userIds[0];
    this.masterName = this.ctx.users[this.masterId]?.name || 'Unknown';
    this.sleepAbortController = null;

    this.totalPixels = this.template.data.flat().filter((p) => p !== 0).length;
    this.pixelsRemaining = this.totalPixels;
    this.currentPixelSkip = this.ctx.settings.pixelSkip ?? 1;

    this.initialRetryDelay = MS.THIRTY_SEC;
    this.maxRetryDelay = MS.FIVE_MIN;
    this.currentRetryDelay = this.initialRetryDelay;

    this.userQueue = [...this.userIds];

    // Validate context on construction
    this._validateContext();
  }

  private _validateContext(): void {
    if (!this.ctx.users || typeof this.ctx.users !== 'object') {
      throw new Error('TemplateContext.users is required and must be an object');
    }
    if (!this.ctx.settings || typeof this.ctx.settings !== 'object') {
      throw new Error('TemplateContext.settings is required and must be an object');
    }
    if (!this.ctx.activeBrowserUsers || !(this.ctx.activeBrowserUsers instanceof Set)) {
      throw new Error('TemplateContext.activeBrowserUsers is required and must be a Set');
    }
    if (!this.ctx.activeTemplateUsers || !(this.ctx.activeTemplateUsers instanceof Set)) {
      throw new Error('TemplateContext.activeTemplateUsers is required and must be a Set');
    }
    if (!this.ctx.activePaintingTasks || typeof this.ctx.activePaintingTasks.count !== 'number') {
      throw new Error('TemplateContext.activePaintingTasks with count property is required');
    }
    if (typeof this.ctx.getColorOrderForTemplate !== 'function') {
      throw new Error('TemplateContext.getColorOrderForTemplate is required and must be a function');
    }
  }

  /* Sleep that can be interrupted when settings change. */
  cancellableSleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      const controller = new AbortController();
      this.sleepAbortController = controller;
      const timeout = setTimeout(() => {
        if (this.sleepAbortController === controller) this.sleepAbortController = null;
        resolve();
      }, ms);
      controller.signal.addEventListener('abort', () => {
        clearTimeout(timeout);
        if (this.sleepAbortController === controller) this.sleepAbortController = null;
        resolve();
      });
    });
  }

  interruptSleep(): void {
    if (this.sleepAbortController) {
      log('SYSTEM', 'wplacer', `[${this.name}] ⚙️ Settings changed, waking.`);
      this.sleepAbortController.abort();
    }
  }

  /* Optional purchase of max-charge upgrades. */
  async handleUpgrades(wplacer: WPlacer): Promise<void> {
    if (!this.canBuyMaxCharges) return;
    await wplacer.loadUserInfo();
    const affordableDroplets = wplacer.userInfo!.droplets - this.ctx.settings.dropletReserve;
    const amountToBuy = Math.floor(affordableDroplets / TEMPLATE_CONFIG.MAX_CHARGE_UPGRADE_COST);
    if (amountToBuy > 0) {
      try {
        await wplacer.buyProduct(70, amountToBuy);
        await sleep(this.ctx.settings.purchaseCooldown);
        await wplacer.loadUserInfo();
      } catch (error: any) {
        this.logUserError(error, wplacer.userInfo!.id, wplacer.userInfo!.name, 'purchase max charge upgrades');
      }
    }
  }

  async handleChargePurchases(wplacer: WPlacer): Promise<void> {
    if (!this.canBuyCharges) return;
    const userInfo = wplacer.userInfo!;
    const affordableDroplets = userInfo.droplets - this.ctx.settings.dropletReserve;

    if (affordableDroplets < TEMPLATE_CONFIG.DEFAULT_CHARGE_PACK_COST) {
      return;
    }

    const amountToBuy = Math.floor(affordableDroplets / TEMPLATE_CONFIG.DEFAULT_CHARGE_PACK_COST);

    if (amountToBuy > 0) {
      try {
        log(userInfo.id, userInfo.name, `[${this.name}] 💰 Attempting to buy ${amountToBuy} charge pack(s) based on available droplets...`);
        await wplacer.buyProduct(80, amountToBuy);
        await sleep(this.ctx.settings.purchaseCooldown);
        await wplacer.loadUserInfo();
      } catch (error: any) {
        this.logUserError(error, userInfo.id, userInfo.name, 'purchase charges');
      }
    }
  }

  async _performPaintTurn(wplacer: WPlacer, colorFilter: number | null = null): Promise<number> {
    let paintedTotal = 0;
    let done = false;
    while (!done && this.running) {
      try {
        wplacer.token = await TokenManager.getToken(this.name);
        // Pull latest pawtect token if available
        wplacer.pawtect = (globalThis as any).__wplacer_last_pawtect || null;
        const painted = await wplacer.paint(this.currentPixelSkip, colorFilter);
        paintedTotal += painted;
        done = true;
      } catch (error: any) {
        if (error.name === 'SuspensionError') {
          const until = new Date(error.suspendedUntil).toLocaleString();

          // Difference between a BAN and a SUSPENSION of the account.
          if (error.durationMs > 0) log(wplacer.userInfo!.id, wplacer.userInfo!.name, `[${this.name}] 🛑 Account suspended until ${until}.`);
          else log(wplacer.userInfo!.id, wplacer.userInfo!.name, `[${this.name}] 🛑 Account BANNED PERMANENTLY, banned due to ${error.reason}.`);

          /*
          If a BAN has been issued, instead of setting suspendedUntil to wplacer's suspendedUntil (current date in ms),
          set it to a HUGE number to avoid modifying any logic in the rest of the code, and still perform properly with
          the banned account.
          */
          this.ctx.users[wplacer.userInfo!.id].suspendedUntil = error.durationMs > 0 ? error.suspendedUntil : Number.MAX_SAFE_INTEGER;
          throw error;
        }
        if (error.message === 'REFRESH_TOKEN') {
          log(wplacer.userInfo!.id, wplacer.userInfo!.name, `[${this.name}] 🔄 Token expired. Next token...`);
          await TokenManager.invalidateToken();
          await sleep(TEMPLATE_CONFIG.TOKEN_REFRESH_DELAY_MS);
        } else {
          throw error;
        }
      }
    }
    if (wplacer?.userInfo?.id && paintedTotal > 0) ChargeCache.consume(wplacer.userInfo.id, paintedTotal);
    return paintedTotal;
  }

  private _getColorsToPaint(mismatchedPixels: any[]): (number | null)[] {
    const isColorMode = this.ctx.settings.drawingOrder === 'color';
    if (isColorMode) {
      const mismatchedColors = new Set(mismatchedPixels.map((p: any) => p.color));
      const allTemplateColors = this.template.data.flat().filter((c) => c > 0);
      const colorCounts = allTemplateColors.reduce((acc: Record<number, number>, color: number) => ({ ...acc, [color]: (acc[color] || 0) + 1 }), {} as Record<number, number>);

      const customOrder = this.ctx.getColorOrderForTemplate(this.templateId);
      const sortedColors = [...new Set(allTemplateColors)];

      if (customOrder && customOrder.length > 0) {
        const orderMap = new Map(customOrder.map((id: number, index: number) => [id, index]));
        sortedColors.sort((a: number, b: number) => (orderMap.get(a) ?? 999) - (orderMap.get(b) ?? 999));
      } else {
        sortedColors.sort((a: number, b: number) => (a === 1 ? -1 : b === 1 ? 1 : colorCounts[a] - colorCounts[b]));
      }

      const colorsToPaint = sortedColors.filter((c: number) => mismatchedColors.has(c));
      if (this.eraseMode && mismatchedColors.has(0)) {
        colorsToPaint.push(0);
      }
      return colorsToPaint;
    } else {
      return [null];
    }
  }

  private async _getReadyUsers(): Promise<ReadyUser[]> {
    const readyUsers: ReadyUser[] = [];
    const now = Date.now();

    for (const userId of this.userQueue) {
      if (!this.ctx.users[userId] || (this.ctx.users[userId].suspendedUntil && now < this.ctx.users[userId].suspendedUntil!)) {
        continue;
      }

      if (ChargeCache.stale(userId, now)) {
        if (!this.ctx.activeBrowserUsers.has(userId)) {
          this.ctx.activeBrowserUsers.add(userId);
          const w = new WPlacer({});
          try {
            const info = await w.login(this.ctx.users[userId].cookies);
            this.ctx.users[userId].droplets = info.droplets;
          } catch (e: any) {
            this.logUserError(e, userId, this.ctx.users[userId].name, 'opportunistic resync');
          } finally {
            this.ctx.activeBrowserUsers.delete(userId);
          }
        }
      }

      const predicted = ChargeCache.predict(userId, now);
      if (!predicted) continue;

      const threshold = Math.max(1, Math.floor(predicted.max * this.ctx.settings.chargeThreshold));
      let potentialCharges = predicted.count;

      // Factor in purchasable charges
      if (this.canBuyCharges && this.ctx.users[userId].droplets) {
        const affordableDroplets = this.ctx.users[userId].droplets! - this.ctx.settings.dropletReserve;
        if (affordableDroplets >= TEMPLATE_CONFIG.DEFAULT_CHARGE_PACK_COST) {
          const purchasable = Math.floor(affordableDroplets / TEMPLATE_CONFIG.DEFAULT_CHARGE_PACK_COST) * TEMPLATE_CONFIG.CHARGES_PER_PACK;
          potentialCharges += purchasable;
        }
      }

      if (potentialCharges >= threshold) {
        readyUsers.push({ userId, potentialCharges: Math.min(predicted.max, potentialCharges) });
      }
    }

    return readyUsers;
  }

  private async _handleNoReadyUsers(): Promise<void> {
    const now = Date.now();
    const cooldowns = this.userQueue.map((id) => {
      const p = ChargeCache.predict(id, now);
      if (!p || p.count >= p.max) return Infinity;
      const th = Math.max(1, Math.floor(p.max * this.ctx.settings.chargeThreshold));

      if (p.count >= th) {
        return Math.max(0, (p.max - p.count) * (p.cooldownMs ?? MS.THIRTY_SEC));
      }
      return Math.max(0, (th - p.count) * (p.cooldownMs ?? MS.THIRTY_SEC));
    });

    let waitTime = (cooldowns.length > 0 ? Math.min(...cooldowns) : MS.TWO_MIN) + TEMPLATE_CONFIG.COOLDOWN_CALCULATION_BUFFER_MS;
    if (waitTime < this.ctx.settings.accountCooldown) {
      log('SYSTEM', 'wplacer', `[${this.name}] ⚠️ Calculated wait time (${duration(waitTime)}) is unusually short. Defaulting to account cooldown to prevent rapid looping.`);
      waitTime = this.ctx.settings.accountCooldown;
    }

    this.status = 'Waiting for charges.';
    log('SYSTEM', 'wplacer', `[${this.name}] ⏳ No users ready. Waiting ~${duration(waitTime)}.`);
    await this.cancellableSleep(waitTime);
    log('SYSTEM', 'wplacer', `[${this.name}] 🫃 Woke up. Re-evaluating...`);
  }

  async _findWorkingUserAndCheckPixels(): Promise<PixelCheckResult | null> {
    // Create an array of promises that race to find a working user
    const checkPromises = this.userQueue.map((userId, index) =>
      this._tryCheckPixelsWithUser(userId, index)
    );

    try {
      // Race all promises and return the first successful result
      const result = await Promise.race(
        checkPromises.map((p) =>
          p.then((result) => {
            if (result) return result;
            // Return a sentinel that means "keep waiting"
            return new Promise<never>(() => {});
          })
        )
      );
      return result;
    } catch {
      // All failed, cycle queue and return null
      this._cycleQueueForFailedChecks();
      return null;
    }
  }

  private async _tryCheckPixelsWithUser(
    userId: string,
    queueIndex: number
  ): Promise<PixelCheckResult | null> {
    if (
      !this.ctx.users[userId] ||
      (this.ctx.users[userId].suspendedUntil && Date.now() < this.ctx.users[userId].suspendedUntil!)
    ) {
      return null;
    }

    const wplacer = new WPlacer({
      template: this.template,
      coords: this.coords,
      globalSettings: this.ctx.settings,
      templateSettings: {
        eraseMode: this.eraseMode,
        outlineMode: this.outlineMode,
        skipPaintedPixels: this.skipPaintedPixels,
      },
      templateName: this.name,
    });

    try {
      log(
        'SYSTEM',
        'wplacer',
        `[${this.name}] Checking template status with user ${this.ctx.users[userId].name}...`
      );
      await wplacer.login(this.ctx.users[userId].cookies);
      await wplacer.loadTiles();
      const mismatchedPixels = (wplacer as any)._getMismatchedPixels(1, null);
      log(
        'SYSTEM',
        'wplacer',
        `[${this.name}] Check complete. Found ${mismatchedPixels.length} mismatched pixels.`
      );

      // On success, reorder queue so successful user moves to back
      this._moveUserToBackOfQueue(queueIndex);

      return { wplacer, mismatchedPixels };
    } catch (error: any) {
      this.logUserError(error, userId, this.ctx.users[userId].name, 'cycle pixel check');
      return null;
    }
  }

  private _moveUserToBackOfQueue(successfulIndex: number): void {
    // Remove the successful user from their position and add to back
    const userId = this.userQueue[successfulIndex];
    this.userQueue.splice(successfulIndex, 1);
    this.userQueue.push(userId);
  }

  private _cycleQueueForFailedChecks(): void {
    // When all checks fail, rotate entire queue by one position
    // to ensure different user is tried first next time
    if (this.userQueue.length > 0) {
      const first = this.userQueue.shift()!;
      this.userQueue.push(first);
    }
  }

  private async _executePaintingPass(
    checkResult: PixelCheckResult,
    color: number | null,
    passPixels: any[]
  ): Promise<boolean> {
    const isColorMode = this.ctx.settings.drawingOrder === 'color';
    let passComplete = false;

    for (this.currentPixelSkip = this.ctx.settings.pixelSkip; this.currentPixelSkip >= 1; this.currentPixelSkip /= 2) {
      if (!this.running) break;

      const pixelsInThisPass = passPixels.filter((p: any) => (p.localX + p.localY) % this.currentPixelSkip === 0);
      if (pixelsInThisPass.length === 0) continue;

      log('SYSTEM', 'wplacer', `[${this.name}] Starting pass (1/${this.currentPixelSkip}) for color ${isColorMode ? (COLOR_NAMES[color as number] || 'Erase') : 'All'}`);

      const result = await this._executePixelPass(checkResult, color, passComplete);
      if (result.needsLongCooldown) return true;
      passComplete = result.passComplete;
    }

    return false;
  }

  private async _executePixelPass(
    checkResult: PixelCheckResult,
    color: number | null,
    initialPassComplete: boolean
  ): Promise<{ needsLongCooldown: boolean; passComplete: boolean }> {
    let passComplete = initialPassComplete;

    while (this.running && !passComplete) {
      if (this.userQueue.length === 0) {
        log('SYSTEM', 'wplacer', `[${this.name}] ⏳ No valid users in queue. Waiting...`);
        await this.cancellableSleep(TEMPLATE_CONFIG.EMPTY_QUEUE_RETRY_DELAY_MS);
        this.userQueue = [...this.userIds];
        continue;
      }

      const readyUsers = await this._getReadyUsers();

      if (readyUsers.length === 0) {
        await this._handleNoReadyUsers();
        return { needsLongCooldown: true, passComplete };
      }

      readyUsers.sort((a, b) => b.potentialCharges - a.potentialCharges);
      const bestUser = readyUsers[0];

      const result = await this._paintWithUser(bestUser, checkResult, color);
      if (result.needsCooldown && this.running && !result.passComplete && this.ctx.settings.accountCooldown > 0) {
        log('SYSTEM', 'wplacer', `[${this.name}] ⏱️ Waiting for cooldown (${duration(this.ctx.settings.accountCooldown)}).`);
        await this.cancellableSleep(this.ctx.settings.accountCooldown);
      }

      passComplete = result.passComplete;
    }

    return { needsLongCooldown: false, passComplete };
  }

  private async _paintWithUser(
    bestUser: ReadyUser,
    _checkResult: PixelCheckResult,
    color: number | null
  ): Promise<{ needsCooldown: boolean; passComplete: boolean }> {
    const { userId } = bestUser;
    this.ctx.activeBrowserUsers.add(userId);

    const wplacer = new WPlacer({
      template: this.template,
      coords: this.coords,
      globalSettings: this.ctx.settings,
      templateSettings: {
        eraseMode: this.eraseMode,
        outlineMode: this.outlineMode,
        skipPaintedPixels: this.skipPaintedPixels,
      },
      templateName: this.name,
    });

    try {
      const userInfo = await wplacer.login(this.ctx.users[userId].cookies);
      this.status = `Running user ${userInfo.name} | Pass (1/${this.currentPixelSkip})`;

      await this.handleChargePurchases(wplacer);

      const chargesBeforePaint = wplacer.userInfo!.charges;
      log(userInfo.id, userInfo.name, `[${this.name}] 🔋 Best user selected. Ready with charges: ${Math.floor(chargesBeforePaint.count)}/${chargesBeforePaint.max}.`);

      await this._performPaintTurn(wplacer, color);
      await this.handleUpgrades(wplacer);

      this.ctx.users[userId].droplets = wplacer.userInfo!.droplets;
    } catch (error: any) {
      if (error.name !== 'SuspensionError') {
        this.logUserError(error, userId, this.ctx.users[userId].name, 'perform paint turn');
      }
    } finally {
      this.ctx.activeBrowserUsers.delete(userId);
      this.userQueue.push(this.userQueue.splice(this.userQueue.indexOf(userId), 1)[0]);
    }

    const postPaintCheck = await this._findWorkingUserAndCheckPixels();
    let passComplete = false;

    if (postPaintCheck) {
      const remainingPassPixels = postPaintCheck.mismatchedPixels.filter(
        (p: any) => (color === null || p.color === color) && (p.localX + p.localY) % this.currentPixelSkip === 0
      );
      if (remainingPassPixels.length === 0) {
        log('SYSTEM', 'wplacer', `[${this.name}] ✅ Pass (1/${this.currentPixelSkip}) complete.`);
        passComplete = true;
      }
    }

    return { needsCooldown: true, passComplete };
  }

  private async _checkTemplateStatus(): Promise<PixelCheckResult | null> {
    this.status = 'Checking for pixels...';
    log('SYSTEM', 'wplacer', `[${this.name}] 💓 Starting new check cycle...`);

    const checkResult = await this._findWorkingUserAndCheckPixels();
    if (!checkResult) {
      log('SYSTEM', 'wplacer', `[${this.name}] ❌ No working users found for pixel check. Retrying in 30s.`);
      await this.cancellableSleep(TEMPLATE_CONFIG.NO_USERS_RETRY_DELAY_MS);
      return null;
    }

    return checkResult;
  }

  private async _handleTemplateCompletion(): Promise<boolean> {
    if (this.antiGriefMode) {
      this.status = 'Monitoring for changes.';
      log('SYSTEM', 'wplacer', `[${this.name}] 🖼️ Template complete. Monitoring... Recheck in ${duration(this.ctx.settings.antiGriefStandby)}.`);
      await this.cancellableSleep(this.ctx.settings.antiGriefStandby);
      return false;
    } else {
      log('SYSTEM', 'wplacer', `[${this.name}] ✅ Template finished.`);
      this.status = 'Finished.';
      this.running = false;
      return true;
    }
  }

  async start(): Promise<void> {
    this.running = true;
    this.status = 'Started.';
    log('SYSTEM', 'wplacer', `▶️ Starting template "${this.name}"...`);
    this.ctx.activePaintingTasks.count++;

    try {
      while (this.running) {
        const checkResult = await this._checkTemplateStatus();
        if (!checkResult) continue;

        this.pixelsRemaining = checkResult.mismatchedPixels.length;

        if (this.pixelsRemaining === 0) {
          const finished = await this._handleTemplateCompletion();
          if (finished) break;
          continue;
        }

        this.currentRetryDelay = this.initialRetryDelay;
        const colorsToPaint = this._getColorsToPaint(checkResult.mismatchedPixels);
        let needsLongCooldown = false;

        for (const color of colorsToPaint) {
          if (!this.running || needsLongCooldown) break;

          const passPixels = checkResult.mismatchedPixels.filter((p: any) => color === null || p.color === color);
          if (passPixels.length === 0) continue;

          needsLongCooldown = await this._executePaintingPass(checkResult, color, passPixels);
        }
      }
    } finally {
      this.ctx.activePaintingTasks.count--;
      if (this.status !== 'Finished.') this.status = 'Stopped.';
      this.userIds.forEach((id) => this.ctx.activeTemplateUsers.delete(id));
    }
  }

  private logUserError(error: any, id: string, name: string, context: string): void {
    const message = error?.message || 'Unknown error.';
    if (
      error?.name === 'NetworkError' ||
      message.includes('(500)') ||
      message.includes('(1015)') ||
      message.includes('(502)') ||
      error?.name === 'SuspensionError'
    ) {
      log(id, name, `❌ Failed to ${context}: ${message}`);
    } else {
      log(id, name, `❌ Failed to ${context}`, error);
    }
  }
}
