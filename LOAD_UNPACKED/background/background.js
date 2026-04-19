// --- Main Background Script Entry Point ---
console.log("wplacer: Background script loaded.");

import { initializeExtension, setupLifecycleListeners } from './modules/initialization.js';
import { setupEventListeners } from './modules/event-listeners.js';

// Initialize extension
initializeExtension();

// Setup event listeners
setupEventListeners();

// Setup lifecycle listeners (startup, install)
setupLifecycleListeners();
