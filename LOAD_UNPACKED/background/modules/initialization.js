// --- Initialization ---
import { COOKIE_ALARM_NAME, getBotActive } from './constants.js';
import { getSettings } from './core.js';
import { startPolling, stopPolling } from './polling.js';
import { connectWebSocket } from './websocket.js';
import { sendCookie } from './user-management.js';

let isInitializing = false;

export const initializeExtension = async () => {
    if (isInitializing) {
        console.log("wplacer: Initialization already in progress, skipping.");
        return;
    }
    isInitializing = true;
    console.log("wplacer: Initializing extension...");

    try {
        await getSettings();
        // Don't start polling by default - only when bot is activated
        connectWebSocket().catch(() => {
            console.log("wplacer: WebSocket connection failed");
        });

        chrome.alarms.clearAll();
        chrome.alarms.create(COOKIE_ALARM_NAME, {
            periodInMinutes: 20
        });

        chrome.alarms.onAlarm.addListener((alarm) => {
            if (alarm.name === COOKIE_ALARM_NAME) {
                // Only refresh cookie if bot is active
                if (getBotActive()) {
                    console.log("wplacer: Periodic cookie refresh triggered (bot active).");
                    sendCookie(response => console.log(`wplacer: Periodic cookie refresh: ${response.success ? 'Success' : 'Failed'}`));
                } else {
                    console.log("wplacer: Skipping cookie refresh (bot inactive).");
                }
            }
        });

        console.log("wplacer: Extension initialized (bot inactive, no polling).");
    } catch (error) {
        console.error("wplacer: Initialization failed:", error);
        throw error;
    } finally {
        isInitializing = false;
    }
};

export function setupLifecycleListeners() {
    chrome.runtime.onStartup.addListener(() => {
        console.log("wplacer: Browser startup.");
        initializeExtension();
    });

    chrome.runtime.onInstalled.addListener(() => {
        console.log("wplacer: Extension installed/updated.");
        initializeExtension();
    });
}
