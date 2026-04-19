// --- Initialization ---
import { COOKIE_ALARM_NAME } from './constants.js';
import { getSettings } from './core.js';
import { startPolling } from './polling.js';
import { connectWebSocket } from './websocket.js';
import { sendCookie } from './user-management.js';

export const initializeExtension = async () => {
    console.log("wplacer: Initializing extension...");
    
    await getSettings();
    startPolling();
    connectWebSocket().catch(() => {
        console.log("wplacer: WebSocket connection failed, using polling fallback");
    });
    
    chrome.alarms.clearAll();
    chrome.alarms.create(COOKIE_ALARM_NAME, {
        periodInMinutes: 20
    });
    
    chrome.alarms.onAlarm.addListener((alarm) => {
        if (alarm.name === COOKIE_ALARM_NAME) {
            console.log("wplacer: Periodic cookie refresh triggered.");
            sendCookie(response => console.log(`wplacer: Periodic cookie refresh: ${response.success ? 'Success' : 'Failed'}`));
        }
    });
    
    console.log("wplacer: Extension initialized.");
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
