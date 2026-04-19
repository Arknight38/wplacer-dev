// Shared types for the application

export interface User {
  id: string;
  name: string;
  cookies: { j: string; s?: string };
  suspendedUntil?: number;
  droplets?: number;
}

export interface Template {
  id: string;
  name: string;
  width: number;
  height: number;
  x: number;
  y: number;
  // Add other template fields as needed
}

export interface Settings {
  openBrowserOnStart: boolean;
  drawingDirection: string;
  drawingOrder: string;
  pixelSkip: number;
  accountCooldown: number;
  purchaseCooldown: number;
  accountCheckCooldown: number;
  dropletReserve: number;
  antiGriefStandby: number;
  chargeThreshold: number;
  proxyEnabled: boolean;
  proxyRotationMode: string;
  logProxyUsage: boolean;
}

export type TabType = 'main' | 'logs' | 'users' | 'addTemplate' | 'templates' | 'settings';
