/**
 * Token manager for handling Turnstile tokens
 * Thread-safe singleton with proper locking, validation, and promise cleanup
 */

import type { TokenQueueItem } from '../types/index.js';
import { log } from '../utils/logger.js';
import { MS } from '../config/constants.js';

const MAX_QUEUE_SIZE = 50;
const TOKEN_TIMEOUT_MS = MS.TWO_MIN;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]+$/; // Basic Turnstile token pattern

class TokenManagerClass {
  private tokenQueue: TokenQueueItem[] = [];
  private tokenPromise: Promise<string> | null = null;
  private resolvePromise: ((value: string) => void) | null = null;
  private rejectPromise: ((reason: Error) => void) | null = null;
  private isTokenNeeded = false;
  private tokenTimeout: NodeJS.Timeout | null = null;
  private lockPromise: Promise<void> = Promise.resolve();
  private TOKEN_EXPIRATION_MS = MS.TWO_MIN;

  /**
   * Acquire lock for thread-safe operations
   */
  private async acquireLock(): Promise<() => void> {
    let release: () => void = () => {};
    const newLock = new Promise<void>((resolve) => {
      release = () => resolve();
    });
    const prevLock = this.lockPromise;
    this.lockPromise = this.lockPromise.then(() => newLock);
    await prevLock;
    return release;
  }

  /**
   * Validate token format and expiration
   */
  private isValidToken(token: string, receivedAt: number): boolean {
    // Check format
    if (!token || typeof token !== 'string' || !TOKEN_PATTERN.test(token)) {
      log('SYSTEM', 'wplacer', 'TOKEN_MANAGER: Invalid token format rejected');
      return false;
    }
    // Check if already expired
    if (Date.now() - receivedAt >= this.TOKEN_EXPIRATION_MS) {
      log('SYSTEM', 'wplacer', 'TOKEN_MANAGER: Expired token rejected');
      return false;
    }
    return true;
  }

  /**
   * Clean up abandoned promise with timeout
   */
  private setupTokenTimeout(): void {
    if (this.tokenTimeout) {
      clearTimeout(this.tokenTimeout);
    }
    this.tokenTimeout = setTimeout(() => {
      if (this.rejectPromise) {
        log('SYSTEM', 'wplacer', 'TOKEN_MANAGER: ⏰ Token request timed out');
        this.rejectPromise(new Error('Token request timeout'));
        this.cleanupPromise();
      }
    }, TOKEN_TIMEOUT_MS);
  }

  /**
   * Clean up promise state
   */
  private cleanupPromise(): void {
    if (this.tokenTimeout) {
      clearTimeout(this.tokenTimeout);
      this.tokenTimeout = null;
    }
    this.tokenPromise = null;
    this.resolvePromise = null;
    this.rejectPromise = null;
    this.isTokenNeeded = false;
  }

  /**
   * Purge expired tokens from queue
   */
  private purgeExpiredTokens(): void {
    const now = Date.now();
    const size0 = this.tokenQueue.length;
    this.tokenQueue = this.tokenQueue.filter((t) => {
      const isValid = now - t.receivedAt < this.TOKEN_EXPIRATION_MS;
      if (!isValid) {
        log('SYSTEM', 'wplacer', `TOKEN_MANAGER: Discarding expired token from queue`);
      }
      return isValid;
    });
    const removed = size0 - this.tokenQueue.length;
    if (removed > 0) {
      log('SYSTEM', 'wplacer', `TOKEN_MANAGER: Discarded ${removed} expired token(s)`);
    }
  }

  /**
   * Get a token from the queue or wait for one
   */
  async getToken(templateName = 'Unknown'): Promise<string> {
    const release = await this.acquireLock();
    try {
      this.purgeExpiredTokens();

      if (this.tokenQueue.length > 0) {
        const item = this.tokenQueue.shift()!;
        log('SYSTEM', 'wplacer', `TOKEN_MANAGER: Token consumed by "${templateName}"`);
        return item.token;
      }

      if (!this.tokenPromise) {
        log('SYSTEM', 'wplacer', `TOKEN_MANAGER: "${templateName}" waiting for token`);
        this.isTokenNeeded = true;
        this.tokenPromise = new Promise<string>((resolve, reject) => {
          this.resolvePromise = resolve;
          this.rejectPromise = reject;
        });
        this.setupTokenTimeout();
      }

      return this.tokenPromise;
    } finally {
      release();
    }
  }

  /**
   * Add a new token to the queue or fulfill a pending request
   */
  async setToken(t: string): Promise<void> {
    const release = await this.acquireLock();
    try {
      const now = Date.now();

      // Validate before accepting
      if (!this.isValidToken(t, now)) {
        return;
      }

      const newToken: TokenQueueItem = { token: t, receivedAt: now };

      if (this.resolvePromise) {
        log('SYSTEM', 'wplacer', 'TOKEN_MANAGER: Token consumed by waiting task');
        this.resolvePromise(newToken.token);
        this.cleanupPromise();
        return;
      }

      // Check queue size limit
      if (this.tokenQueue.length >= MAX_QUEUE_SIZE) {
        log('SYSTEM', 'wplacer', `TOKEN_MANAGER: Queue full, discarding oldest token`);
        this.tokenQueue.shift();
      }

      this.tokenQueue.push(newToken);
      log('SYSTEM', 'wplacer', `TOKEN_MANAGER: Token queued (size: ${this.tokenQueue.length})`);
    } finally {
      release();
    }
  }

  /**
   * Invalidate the oldest token in queue
   */
  async invalidateToken(): Promise<void> {
    const release = await this.acquireLock();
    try {
      const invalidated = this.tokenQueue.shift();
      if (invalidated) {
        log('SYSTEM', 'wplacer', `TOKEN_MANAGER: 🔄 Token invalidated (${this.tokenQueue.length} left)`);
      }
    } finally {
      release();
    }
  }

  /**
   * Get current queue size (for monitoring)
   */
  getQueueSize(): number {
    return this.tokenQueue.length;
  }

  /**
   * Check if a token is currently being awaited
   */
  isAwaitingToken(): boolean {
    return this.isTokenNeeded && this.tokenPromise !== null;
  }

  /**
   * Check if a token is needed (public getter for external checks)
   */
  getIsTokenNeeded(): boolean {
    return this.isTokenNeeded;
  }

  /**
   * Force cleanup (useful for testing or shutdown)
   */
  async clear(): Promise<void> {
    const release = await this.acquireLock();
    try {
      if (this.rejectPromise) {
        this.rejectPromise(new Error('Token manager cleared'));
      }
      this.cleanupPromise();
      this.tokenQueue = [];
      log('SYSTEM', 'wplacer', 'TOKEN_MANAGER: 🧹 Cleared all tokens and promises');
    } finally {
      release();
    }
  }
}

// Export singleton instance
export const TokenManager = new TokenManagerClass();
