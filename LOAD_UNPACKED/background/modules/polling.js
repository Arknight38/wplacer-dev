// --- Polling Logic ---
import { POLL_INTERVAL_MS, POLL_INTERVAL_IDLE_MS, IDLE_THRESHOLD_MS, pollInterval, activityCheckInterval, lastActivityTime, isIdle, setLastActivityTime, setIsIdle, setPollInterval, setActivityCheckInterval } from './constants.js';
import { pollForTokenRequest } from './token-refresh.js';

export const updateActivityTime = () => {
    setLastActivityTime(Date.now());
    if (isIdle) {
        setIsIdle(false);
        console.log("wplacer: Activity detected, switching to active polling");
        restartPolling();
    }
};

export const checkIdleStatus = () => {
    const idleTime = Date.now() - lastActivityTime;
    
    if (!isIdle && idleTime > IDLE_THRESHOLD_MS) {
        setIsIdle(true);
        console.log("wplacer: No activity detected, switching to idle polling");
        restartPolling();
    }
};

export const startPolling = () => {
    if (pollInterval) {
        clearInterval(pollInterval);
    }
    if (activityCheckInterval) {
        clearInterval(activityCheckInterval);
    }
    
    pollForTokenRequest();
    
    const interval = isIdle ? POLL_INTERVAL_IDLE_MS : POLL_INTERVAL_MS;
    setPollInterval(setInterval(() => {
        pollForTokenRequest();
    }, interval));
    
    console.log(`wplacer: Started polling every ${interval}ms (idle: ${isIdle})`);
    
    setActivityCheckInterval(setInterval(checkIdleStatus, 30000));
};

export const restartPolling = () => {
    startPolling();
};

export const stopPolling = () => {
    if (pollInterval) {
        clearInterval(pollInterval);
        setPollInterval(null);
    }
    if (activityCheckInterval) {
        clearInterval(activityCheckInterval);
        setActivityCheckInterval(null);
    }
    console.log("wplacer: Stopped polling");
};
