/**
 * Core type definitions for wplacer
 */

// ============ User Types ============

export interface User {
  id: string;
  name: string;
  cookies: Cookies;
  suspendedUntil?: number;
  expirationDate?: number;
  droplets?: number;
  lastActivity?: number;
}

export interface Cookies {
  j: string;
  [key: string]: string;
}

export interface UserInfo {
  id: string;
  name: string;
  charges: Charges;
  droplets: number;
  extraColorsBitmap: number;
  ban?: BanStatus;
  error?: string; // For API error responses
}

export interface Charges {
  count: number;
  max: number;
}

export interface BanStatus {
  status: boolean;
  until: number;
}

// ============ Template Types ============

export interface Template {
  width: number;
  height: number;
  data: number[][];
  shareCode: string;
}

export interface TemplateData {
  templateId: string;
  name: string;
  template: Template;
  coords: [number, number, number, number]; // [tx, ty, px, py]
  userIds: string[];
  canBuyCharges: boolean;
  canBuyMaxCharges: boolean;
  antiGriefMode: boolean;
  eraseMode: boolean;
  outlineMode: boolean;
  skipPaintedPixels: boolean;
  enableAutostart: boolean;
  running: boolean;
  status: string;
  masterId: string;
  masterName: string;
  totalPixels: number;
  pixelsRemaining: number;
  currentPixelSkip: number;
}

export interface TemplateSettings {
  eraseMode: boolean;
  outlineMode: boolean;
  skipPaintedPixels: boolean;
}

export interface Pixel {
  tx: number;
  ty: number;
  px: number;
  py: number;
  color: number;
  isEdge: boolean;
  localX: number;
  localY: number;
}

// ============ Settings Types ============

export interface Settings {
  accountCooldown: number;
  purchaseCooldown: number;
  keepAliveCooldown: number;
  dropletReserve: number;
  antiGriefStandby: number;
  drawingDirection: DrawingDirection;
  drawingOrder: DrawingOrder;
  chargeThreshold: number;
  pixelSkip: number;
  proxyEnabled: boolean;
  proxyRotationMode: ProxyRotationMode;
  logProxyUsage: boolean;
  openBrowserOnStart: boolean;
}

export type DrawingDirection = 'ttb' | 'btt' | 'ltr' | 'rtl' | 'center_out' | 'random';
export type DrawingOrder = 'linear' | 'color';
export type ProxyRotationMode = 'sequential' | 'random';

// ============ Proxy Types ============

export interface Proxy {
  protocol: string;
  host: string;
  port: number;
  username: string;
  password: string;
}

// ============ HTTP/Network Types ============

export interface HttpResponse<T = unknown> {
  status: number;
  data: T;
}

export interface PaintRequest {
  t: string;
  fp?: string;
  colors: number[];
  coords: number[];
}

export interface PaintResponse {
  painted: number;
  error?: string;
}

export interface PurchaseRequest {
  product: {
    id: number;
    amount: number;
  };
}

export interface PurchaseResponse {
  success: boolean;
  error?: string;
}

// ============ Tile Types ============

export interface Tile {
  width: number;
  height: number;
  data: number[][];
}

// ============ Color Types ============

export type Palette = Record<string, number>;
export type ColorNames = Record<number, string>;

export interface ColorInfo {
  id: number;
  rgb: string;
  name: string | null;
}

export interface ColorOrdering {
  global: number[];
  templates: Record<string, number[]>;
}

// ============ Error Types ============

export class NetworkError extends Error {
  name = 'NetworkError';
}

export class SuspensionError extends Error {
  name = 'SuspensionError';
  durationMs: number;
  suspendedUntil: number;

  constructor(message: string, durationMs: number) {
    super(message);
    this.durationMs = durationMs;
    this.suspendedUntil = Date.now() + durationMs;
  }
}

// ============ Token Types ============

export interface TokenQueueItem {
  token: string;
  receivedAt: number;
}

// ============ WebSocket Types ============

export interface WsClient {
  readyState: number;
  OPEN: number;
  send(data: string): void;
}

export interface WsClients {
  logs: Set<WsClient>;
  errors: Set<WsClient>;
}

// ============ File System Types ============

export interface LogFileData {
  users: Record<string, User>;
  templates: Record<string, TemplateData>;
  settings: Settings;
  colorOrdering: ColorOrdering;
}

// ============ API Request/Response Types ============

export interface CreateUserRequest {
  cookies: Cookies;
  expirationDate?: number;
}

export interface CreateTemplateRequest {
  templateName: string;
  template: Template;
  coords: [number, number, number, number];
  userIds: string[];
  canBuyCharges: boolean;
  canBuyMaxCharges: boolean;
  antiGriefMode: boolean;
  eraseMode: boolean;
  outlineMode: boolean;
  skipPaintedPixels: boolean;
  enableAutostart: boolean;
}

export interface ImportTemplateRequest {
  id: string;
  name?: string;
  coords?: [number, number, number, number];
  code: string;
}

export interface UpdateTemplateRequest {
  templateName?: string;
  coords?: [number, number, number, number];
  userIds?: string[];
  canBuyCharges?: boolean;
  canBuyMaxCharges?: boolean;
  antiGriefMode?: boolean;
  eraseMode?: boolean;
  outlineMode?: boolean;
  skipPaintedPixels?: boolean;
  enableAutostart?: boolean;
  template?: Template;
}

export interface ToggleTemplateRequest {
  running: boolean;
}

export interface UpdateSettingsRequest {
  accountCooldown?: number;
  purchaseCooldown?: number;
  keepAliveCooldown?: number;
  dropletReserve?: number;
  antiGriefStandby?: number;
  drawingDirection?: DrawingDirection;
  drawingOrder?: DrawingOrder;
  chargeThreshold?: number;
  pixelSkip?: number;
  proxyEnabled?: boolean;
  proxyRotationMode?: ProxyRotationMode;
  logProxyUsage?: boolean;
  openBrowserOnStart?: boolean;
}

export interface TokenRequest {
  t: string;
  pawtect?: string;
  fp?: string;
}

export interface TokenNeededResponse {
  needed: boolean;
}

export interface UpdateColorOrderRequest {
  order: number[];
}

// ============ Utility Types ============

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
