// --- Polling Logic ---
import { POLL_INTERVAL_MS, POLL_INTERVAL_IDLE_MS, IDLE_THRESHOLD_MS, getLastActivityTime, getIsIdle, setLastActivityTime, setIsIdle, setPollInterval, setActivityCheckInterval, getPollInterval, getActivityCheckInterval } from './constants.js';
import { pollForTokenRequest } from './token-refresh.js';

export const updateActivityTime = () => {
    setLastActivityTime(Date.now());
    if (getIsIdle()) {
        setIsIdle(false);
        console.log("wplacer: Activity detected, switching to active polling");
        restartPolling();
    }
};

export const checkIdleStatus = () => {
    const idleTime = Date.now() - getLastActivityTime();

    if (!getIsIdle() && idleTime > IDLE_THRESHOLD_MS) {
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

    // Use the shorter interval and dynamically check idle state in callback
    // This allows immediate response to idle state changes without waiting for restartPolling()
    setPollInterval(setInterval(() => {
        // Dynamically check if we should poll based on idle state
        // In idle mode, we only poll every Nth cycle based on interval ratio
        const isCurrentlyIdle = getIsIdle();
        const idleRatio = Math.floor(POLL_INTERVAL_IDLE_MS / POLL_INTERVAL_MS);
        const shouldPoll = !isCurrentlyIdle || (Date.now() % POLL_INTERVAL_IDLE_MS < POLL_INTERVAL_MS);

        if (shouldPoll) {
            pollForTokenRequest();
        }
    }, POLL_INTERVAL_MS));

    console.log(`wplacer: Started polling (base: ${POLL_INTERVAL_MS}ms, idle: ${POLL_INTERVAL_IDLE_MS}ms, current idle: ${getIsIdle()})`);

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
