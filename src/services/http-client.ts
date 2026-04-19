/**
 * HTTP client wrapper for WPlace API calls
 */

import { Impit } from 'impit';
import { CookieJar } from 'tough-cookie';
import type { Cookies, HttpResponse } from '../types/index.js';
import { NetworkError } from '../types/index.js';
import { WPLACE_BASE } from '../config/constants.js';

export interface HttpClientOptions {
  // TLS verification is always enabled for security
}

export class WPlaceHttpClient {
  private browser: Impit | null = null;
  private cookies: Cookies | null = null;

  constructor(_options: HttpClientOptions = {}) {
    this.browser = null;
    this.cookies = null;
  }

  /**
   * Initialize the HTTP client with cookies
   */
  async initialize(cookies: Cookies): Promise<void> {
    this.cookies = cookies;
    const jar = new CookieJar();
    for (const k of Object.keys(this.cookies)) {
      jar.setCookieSync(`${k}=${this.cookies[k]}; Path=/`, WPLACE_BASE);
    }

    const opts = {
      cookieJar: jar,
      browser: 'chrome' as const,
      ignoreTlsErrors: false, // TLS verification always enabled for security
    };

    this.browser = new Impit(opts);
  }

  /**
   * Make a fetch request with default headers
   */
  async fetch(url: string, options: RequestInit = {}): Promise<any> {
    try {
      const defaultHeaders: Record<string, string> = {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        Referer: 'https://wplace.live/',
      };

      const mergedHeaders = { ...defaultHeaders, ...(options.headers || {}) };
      const optsWithTimeout = { timeout: 30000, ...options, headers: mergedHeaders };

      return await this.browser!.fetch(url, optsWithTimeout as any);
    } catch (error: any) {
      if (error.code === 'InvalidArg') {
        throw new NetworkError(
          `Internal fetch error (InvalidArg) for URL: ${url}. This may be a temporary network issue or a problem with a proxy.`
        );
      }
      throw error;
    }
  }

  /**
   * Make a POST request
   */
  async post(url: string, body: unknown): Promise<HttpResponse> {
    const headers: Record<string, string> = {
      'Content-Type': 'text/plain;charset=UTF-8',
    };

    const req = await this.fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const data = await req.json();
    return { status: req.status, data };
  }

  /**
   * Switch to a different user
   */
  async switchUser(cookies: Cookies): Promise<void> {
    this.cookies = cookies;
    const jar = new CookieJar();
    for (const k of Object.keys(this.cookies)) {
      jar.setCookieSync(`${k}=${this.cookies[k]}; Path=/`, WPLACE_BASE);
    }

    if (this.browser) {
      (this.browser as any).cookieJar = jar;
    }
  }

  /**
   * Get the underlying Impit browser instance
   */
  getBrowser(): Impit | null {
    return this.browser;
  }
}
