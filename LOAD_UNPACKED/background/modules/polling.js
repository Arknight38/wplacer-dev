// --- Polling Logic ---
import { POLL_INTERVAL_MS, POLL_INTERVAL_IDLE_MS, IDLE_THRESHOLD_MS, lastActivityTime, isIdle, setLastActivityTime, setIsIdle, setPollInterval, setActivityCheckInterval, getPollInterval, getActivityCheckInterval } from './constants.js';
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
    const currentPollInterval = getPollInterval();
    const currentActivityCheckInterval = getActivityCheckInterval();

    if (currentPollInterval) {
        clearInterval(currentPollInterval);
    }
    if (currentActivityCheckInterval) {
        clearInterval(currentActivityCheckInterval);
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
    const currentPollInterval = getPollInterval();
    const currentActivityCheckInterval = getActivityCheckInterval();

    if (currentPollInterval) {
        clearInterval(currentPollInterval);
        setPollInterval(null);
    }
    if (currentActivityCheckInterval) {
        clearInterval(currentActivityCheckInterval);
        setActivityCheckInterval(null);
    }
    console.log("wplacer: Stopped polling");
};
