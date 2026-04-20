// --- Main Content Script Entry Point ---
console.log("wplacer: Content script loaded.");

import { setupScriptInjection } from './modules/script-injection.js';
import { setupTokenHandling } from './modules/token-handling.js';
import { setupEventListeners } from './modules/event-listeners.js';
import { setupPeriodicGeneration } from './modules/periodic-generation.js';
import { setupOverlayBridge } from './modules/overlay-bridge.js';

// Initialize all modules
setupScriptInjection();
setupTokenHandling();
setupEventListeners();
setupPeriodicGeneration();
setupOverlayBridge();
