// --- Bot State Management ---
import { getBotActive, setBotActive, setLastActivityTime } from './constants.js';
import { startPolling, stopPolling } from './polling.js';
import { sendCookie } from './user-management.js';

/**
 * Activate the bot - starts polling and allows wplace requests
 */
export const activateBot = async () => {
    if (getBotActive()) {
        console.log("wplacer: Bot already active");
        return;
    }

    setBotActive(true);
    setLastActivityTime(Date.now());
    startPolling();

    // Send initial cookie when activating
    sendCookie(response => {
        console.log(`wplacer: Bot activated, cookie status: ${response.success ? 'Success' : 'Failed'}`);
    });

    console.log("wplacer: Bot activated - polling started, wplace requests enabled");
};

/**
 * Deactivate the bot - stops polling and blocks wplace requests
 */
export const deactivateBot = () => {
    if (!getBotActive()) {
        console.log("wplacer: Bot already inactive");
        return;
    }

    setBotActive(false);
    stopPolling();

    console.log("wplacer: Bot deactivated - polling stopped, wplace requests blocked");
};

/**
 * Get current bot state
 */
export const getBotState = () => {
    return {
        active: getBotActive()
    };
};
