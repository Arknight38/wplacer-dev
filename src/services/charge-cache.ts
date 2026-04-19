/**
 * Charge prediction and caching service
 */

import type { UserInfo } from '../types/index.js';

interface ChargeCacheEntry {
  base: number;
  max: number;
  lastSync: number;
}

export const ChargeCache = {
  _m: new Map<string, ChargeCacheEntry>(),
  REGEN_MS: 30_000,
  SYNC_MS: 8 * 60_000,

  _key(id: string | number): string {
    return String(id);
  },

  has(id: string | number): boolean {
    return this._m.has(this._key(id));
  },

  stale(id: string | number, now = Date.now()): boolean {
    const u = this._m.get(this._key(id));
    if (!u) return true;
    return now - u.lastSync > this.SYNC_MS;
  },

  markFromUserInfo(userInfo: UserInfo | null, now = Date.now()): void {
    if (!userInfo?.id || !userInfo?.charges) return;
    const k = this._key(userInfo.id);

    const count = Math.floor(userInfo.charges.count ?? 0);
    const max = Math.floor(userInfo.charges.max ?? 0);

    let sanitizedCount = count;
    if (count > max) {
      console.log(
        `[ChargeCache] Correcting optimistic charge count for user ${userInfo.id}. Server sent ${count}, capping to max ${max}.`
      );
      sanitizedCount = max;
    }

    this._m.set(k, { base: sanitizedCount, max, lastSync: now });
  },

  predict(id: string | number, now = Date.now()): { count: number; max: number; cooldownMs: number } | null {
    const u = this._m.get(this._key(id));
    if (!u) return null;
    const grown = Math.floor((now - u.lastSync) / this.REGEN_MS);
    const count = Math.min(u.max, u.base + Math.max(0, grown));
    return { count, max: u.max, cooldownMs: this.REGEN_MS };
  },

  consume(id: string | number, n = 1, now = Date.now()): void {
    const k = this._key(id);
    const u = this._m.get(k);
    if (!u) return;
    const grown = Math.floor((now - u.lastSync) / this.REGEN_MS);
    const avail = Math.min(u.max, u.base + Math.max(0, grown));
    const newCount = Math.max(0, avail - n);
    u.base = newCount;
    // align to last regen tick
    u.lastSync = now - ((now - u.lastSync) % this.REGEN_MS);
    this._m.set(k, u);
  },

  forceResync(id: string | number, newCount = 0, now = Date.now()): void {
    const k = this._key(id);
    const u = this._m.get(k) || { max: 0, base: 0, lastSync: 0 }; // Get existing or create a shell
    u.base = newCount;
    u.lastSync = now; // Reset the timer from this exact moment
    this._m.set(k, u);
  },
};
