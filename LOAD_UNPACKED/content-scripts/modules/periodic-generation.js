// --- Periodic Token Generation ---

import { PERIODIC_GEN_MS } from './constants.js';
import { requestInPageTokenWithTimeout } from './event-listeners.js';

let periodicTimer = null;
let periodicBusy = false;

const periodicTick = async () => {
    if (!location.hostname.endsWith('wplace.live')) return;
    if (document.visibilityState !== 'visible') return;
    if (periodicBusy) return;
    periodicBusy = true;
    try {
        requestInPageTokenWithTimeout(15000, true);
    } finally {
        setTimeout(() => { periodicBusy = false; }, 2000);
    }
};

export const startPeriodicGeneration = () => {
    if (periodicTimer) return;
    periodicTimer = setInterval(periodicTick, PERIODIC_GEN_MS);
    console.log('wplacer: Periodic token generation started');
};

export const stopPeriodicGeneration = () => {
    if (!periodicTimer) return;
    try { clearInterval(periodicTimer); } catch {}
    periodicTimer = null;
};

export function setupPeriodicGeneration() {
    if (location.hostname.endsWith('wplace.live')) {
        window.addEventListener('beforeunload', () => stopPeriodicGeneration(), { once: true });
    }
}
