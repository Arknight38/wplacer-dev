/**
 * WPlacer client - Main coordinator for WPlace operations
 * Refactored to use modular components
 */

import type { Template, TemplateSettings, UserInfo, Cookies, PaintRequest, Pixel } from '../types/index.js';
import { NetworkError, SuspensionError } from '../types/index.js';
import { log } from '../utils/logger.js';
import { sleep } from '../utils/helpers.js';
import { WPLACE_ME, WPLACE_PIXEL, WPLACE_PURCHASE, HTTP_STATUS, palette } from '../config/constants.js';
import { ChargeCache } from './charge-cache.js';
import type { Settings } from '../types/index.js';
import { WPlaceHttpClient } from './http-client.js';
import { TileManager } from './tile-manager.js';

interface WPlacerConfig {
  template?: Template;
  coords?: [number, number, number, number];
  globalSettings?: Settings;
  templateSettings?: TemplateSettings;
  templateName?: string;
  browserGlobals?: BrowserExtensionGlobals;
}

interface BrowserExtensionGlobals {
  pawtect?: string;
  fp?: string;
}

export class WPlacer {
  template?: Template;
  templateName?: string;
  coords?: [number, number, number, number];
  globalSettings?: Settings;
  templateSettings?: TemplateSettings;
  userInfo: UserInfo | null = null;
  token: string | null = null;
  pawtect: string | null = null;
  browserGlobals: BrowserExtensionGlobals;

  private httpClient: WPlaceHttpClient;
  private tileManager: TileManager;

  constructor(config: WPlacerConfig = {}, httpClient?: WPlaceHttpClient) {
    this.template = config.template;
    this.templateName = config.templateName;
    this.coords = config.coords;
    this.globalSettings = config.globalSettings;
    this.templateSettings = config.templateSettings || {
      eraseMode: false,
      outlineMode: false,
      skipPaintedPixels: false,
    };
    this.browserGlobals = config.browserGlobals || {};

    // Use injected HTTP client or create new one
    this.httpClient = httpClient || new WPlaceHttpClient();

    // Initialize tile manager with palette
    this.tileManager = new TileManager(this.httpClient, palette);
  }

  /**
   * Login with cookies and initialize HTTP client
   */
  async login(cookies: Cookies): Promise<UserInfo> {
    await this.httpClient.initialize(cookies);
    await this.loadUserInfo();
    return this.userInfo!;
  }

  /**
   * Switch to a different user
   */
  async switchUser(cookies: Cookies): Promise<UserInfo> {
    await this.httpClient.switchUser(cookies);
    await this.loadUserInfo();
    return this.userInfo!;
  }

  /**
   * Load user information from WPlace API
   */
  async loadUserInfo(): Promise<boolean> {
    const me = await this.httpClient.fetch(WPLACE_ME);
    const bodyText = await me.text();

    if (bodyText.trim().startsWith('<!DOCTYPE html>')) {
      throw new NetworkError('Cloudflare interruption detected.');
    }

    try {
      const userInfo = JSON.parse(bodyText) as UserInfo;
      if (userInfo.error === 'Unauthorized') {
        throw new NetworkError(
          '(401) Unauthorized. The cookie may be invalid or the current IP/proxy is rate-limited.'
        );
      }
      if (userInfo.error) {
        throw new Error(`(500) Auth failed: "${userInfo.error}".`);
      }
      if (userInfo.id && userInfo.name) {
        this.userInfo = userInfo;
        ChargeCache.markFromUserInfo(userInfo);
        return true;
      }
      throw new Error(`Unexpected /me response: ${JSON.stringify(userInfo)}`);
    } catch (e) {
      if (e instanceof NetworkError) throw e;
      if (bodyText.includes('Error 1015')) {
        throw new NetworkError('(1015) Rate-limited.');
      }
      if (bodyText.includes('502') && bodyText.includes('gateway')) {
        throw new NetworkError('(502) Bad Gateway.');
      }
      throw new Error(`Failed to parse server response: "${bodyText.substring(0, 150)}..."`);
    }
  }

  /**
   * Check if user has access to a specific color
   */
  hasColor(id: number): boolean {
    if (id < 32) return true;
    if (!this.userInfo) return false;
    return !!(this.userInfo.extraColorsBitmap & (1 << (id - 32)));
  }

  /**
   * Execute a paint operation on a tile
   */
  async _executePaint(
    tx: number,
    ty: number,
    body: PaintRequest
  ): Promise<{ painted: number; success: boolean; reason?: string }> {
    if (body.colors.length === 0) return { painted: 0, success: true };
    
    const response = await this.httpClient.post(WPLACE_PIXEL(tx, ty), body);

    // Success Case
    const responseData = response.data as { painted?: number; error?: string; suspension?: { durationMs?: number } };
    if (responseData.painted && responseData.painted === body.colors.length) {
      log(
        this.userInfo!.id,
        this.userInfo!.name,
        `[${this.templateName}] Painted ${body.colors.length} px at ${tx},${ty}.`
      );
      // Update the in-memory tile data.
      this.tileManager.updateTileData(tx, ty, body.coords, body.colors);
      return { painted: responseData.painted, success: true };
    }

    if (responseData.painted === 0 && body.colors.length > 0) {
      return { painted: 0, success: false, reason: 'NO_CHARGES' };
    }

    // classify other errors
    if (
      response.status === HTTP_STATUS.UNAUTH &&
      responseData.error === 'Unauthorized'
    ) {
      throw new NetworkError(
        '(401) Unauthorized during paint. The cookie may be invalid or the current IP/proxy is rate-limited.'
      );
    }
    if (
      response.status === HTTP_STATUS.FORBIDDEN &&
      (responseData.error === 'refresh' || responseData.error === 'Unauthorized')
    ) {
      throw new Error('REFRESH_TOKEN');
    }
    if (response.status === HTTP_STATUS.UNAVAILABLE_LEGAL && responseData.suspension) {
      throw new SuspensionError(
        'Account is suspended.',
        responseData.suspension.durationMs || 0
      );
    }
    if (response.status === HTTP_STATUS.SRV_ERR) {
      log(
        this.userInfo!.id,
        this.userInfo!.name,
        `[${this.templateName}] Server error (500). Wait 40s.`
      );
      await sleep(40000);
      return { painted: 0, success: true };
    }
    if (
      response.status === HTTP_STATUS.TOO_MANY ||
      (this._hasError1015(response.data))
    ) {
      throw new NetworkError('(1015) Rate-limited.');
    }

    throw new Error(`Unexpected response for tile ${tx},${ty}: ${JSON.stringify(response)}`);
  }

  /**
   * Get pixels that need to be painted
   */
  _getMismatchedPixels(currentSkip = 1, colorFilter: number | null = null): Pixel[] {
    if (!this.coords || !this.template) return [];

    const [startX, startY, startPx, startPy] = this.coords;
    const out: Pixel[] = [];

    for (let y = 0; y < this.template.height; y++) {
      for (let x = 0; x < this.template.width; x++) {
        if ((x + y) % currentSkip !== 0) continue;

        const tplColor = this.template.data[x][y];
        if (colorFilter !== null && tplColor !== colorFilter) continue;

        const globalPx = startPx + x,
          globalPy = startPy + y;

        const targetTx = startX + Math.floor(globalPx / 1000);
        const targetTy = startY + Math.floor(globalPy / 1000);
        const localPx = globalPx % 1000,
          localPy = globalPy % 1000;

        const tile = this.tileManager.getTile(targetTx, targetTy);
        if (!tile || !tile.data[localPx]) continue;

        const canvasColor = tile.data[localPx][localPy];
        const neighbors = [
          this.template.data[x - 1]?.[y],
          this.template.data[x + 1]?.[y],
          this.template.data[x]?.[y - 1],
          this.template.data[x]?.[y + 1],
        ];
        const isEdge = neighbors.some((n) => n === 0 || n === undefined);

        // erase non-template
        if (this.templateSettings?.eraseMode && tplColor === 0 && canvasColor !== 0) {
          out.push({
            tx: targetTx,
            ty: targetTy,
            px: localPx,
            py: localPy,
            color: 0,
            isEdge: false,
            localX: x,
            localY: y,
          });
          continue;
        }
        // treat -1 as "clear if filled"
        if (tplColor === -1 && canvasColor !== 0) {
          out.push({
            tx: targetTx,
            ty: targetTy,
            px: localPx,
            py: localPy,
            color: 0,
            isEdge,
            localX: x,
            localY: y,
          });
          continue;
        }
        // positive colors
        if (tplColor > 0 && this.hasColor(tplColor)) {
          const shouldPaint = this.templateSettings?.skipPaintedPixels
            ? canvasColor === 0
            : tplColor !== canvasColor;
          if (shouldPaint) {
            out.push({
              tx: targetTx,
              ty: targetTy,
              px: localPx,
              py: localPy,
              color: tplColor,
              isEdge,
              localX: x,
              localY: y,
            });
          }
        }
      }
    }
    return out;
  }

  /**
   * Main paint method
   */
  async paint(currentSkip = 1, colorFilter: number | null = null): Promise<number> {
    if (this.tileManager.getTileCount() === 0) await this.loadTiles();
    if (!this.token) throw new Error('Token not provided.');

    let mismatched = this._getMismatchedPixels(currentSkip, colorFilter);
    if (mismatched.length === 0) return 0;

    log(this.userInfo!.id, this.userInfo!.name, `[${this.templateName}] Found ${mismatched.length} paintable pixels.`);

    // outline
    if (this.templateSettings?.outlineMode) {
      const edge = mismatched.filter((p) => p.isEdge);
      if (edge.length > 0) mismatched = edge;
    }

    const chargesNow = Math.floor(this.userInfo?.charges?.count ?? 0);
    const todo = mismatched.slice(0, chargesNow);

    // group per tile
    const byTile: Record<string, { colors: number[]; coords: number[] }> = {};
    for (const p of todo) {
      const key = `${p.tx},${p.ty}`;
      if (!byTile[key]) byTile[key] = { colors: [], coords: [] };
      byTile[key].colors.push(p.color);
      byTile[key].coords.push(p.px, p.py);
    }

    let total = 0;
    for (const k in byTile) {
      const [tx, ty] = k.split(',').map(Number);
      const body: PaintRequest = { ...byTile[k], t: this.token };
      if (this.browserGlobals.fp) {
        body.fp = this.browserGlobals.fp;
      }

      const r = await this._executePaint(tx, ty, body);

      if (!r.success && r.reason === 'NO_CHARGES') {
        log(
          this.userInfo!.id,
          this.userInfo!.name,
          `[${this.templateName}] Prediction mismatch. Server reports no charges. Resyncing cache.`
        );
        ChargeCache.forceResync(this.userInfo!.id, 0);
        break;
      }

      total += r.painted;
    }

    if (this.userInfo?.id && total > 0) ChargeCache.consume(this.userInfo.id, total);
    return total;
  }

  /**
   * Purchase a product (charges or upgrades)
   */
  async buyProduct(productId: number, amount: number): Promise<boolean> {
    const res = await this.httpClient.post(WPLACE_PURCHASE, { product: { id: productId, amount } });
    const responseData = res.data as { success?: boolean; error?: string };
    if (responseData.success) {
      let msg = `Purchase ok product #${productId} amount ${amount}`;
      if (productId === 80) msg = `Bought ${amount * 30} pixels for ${amount * 500} droplets`;
      else if (productId === 70) msg = `Bought ${amount} Max Charge for ${amount * 500} droplets`;
      log(this.userInfo!.id, this.userInfo!.name, `[${this.templateName}] ${msg}`);
      return true;
    }
    if (
      res.status === HTTP_STATUS.TOO_MANY ||
      (responseData.error && responseData.error.includes('Error 1015'))
    ) {
      throw new NetworkError('(1015) Rate-limited during purchase.');
    }
    throw new Error(`Unexpected purchase response: ${JSON.stringify(res)}`);
  }

  /**
   * Load tiles for the template's bounding box
   */
  async loadTiles(): Promise<boolean> {
    if (!this.coords || !this.template) return false;

    const [tx, ty, px, py] = this.coords;
    const endPx = px + this.template.width;
    const endPy = py + this.template.height;
    const endTx = tx + Math.floor(endPx / 1000);
    const endTy = ty + Math.floor(endPy / 1000);

    await this.tileManager.loadTilesForBoundingBox(tx, ty, endTx, endTy);
    return true;
  }

  /**
   * Get the HTTP client instance
   */
  getHttpClient(): WPlaceHttpClient {
    return this.httpClient;
  }

  /**
   * Get the tile manager instance
   */
  getTileManager(): TileManager {
    return this.tileManager;
  }

  /**
   * Check if response data contains Error 1015
   */
  private _hasError1015(data: unknown): boolean {
    if (typeof data !== 'object' || data === null) return false;
    const error = (data as { error?: string }).error;
    return typeof error === 'string' && error.includes('Error 1015');
  }
}
