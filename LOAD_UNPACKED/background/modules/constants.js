// --- Constants ---
export const TOKEN_WAIT_THRESHOLD_MS = 30000; // 30 seconds threshold for token waiting
export const POLL_ALARM_NAME = 'wplacer-poll';
export const COOKIE_ALARM_NAME = 'wplacer-cookie';
export const POLL_INTERVAL_MS = 30000; // 30 seconds for more responsive polling
export const POLL_INTERVAL_IDLE_MS = 120000; // 2 minutes when idle
export const WS_RECONNECT_DELAY_MS = 5000; // 5 seconds before reconnecting WebSocket
export const IDLE_THRESHOLD_MS = 60000; // 1 minute of inactivity

// --- State Variables ---
export let tokenWaitStartTime = null;
export let autoReloadEnabled = true;
export let autoClearEnabled = true;
export let isReloading = false; // Prevent multiple simultaneous reloads
export let lastActivityTime = Date.now();
export let isIdle = false;
export let ws = null; // WebSocket connection
export let wsReconnectTimer = null;
export let pollInterval = null;
export let activityCheckInterval = null;

// --- State Setters ---
export const setAutoReloadEnabled = (value) => { autoReloadEnabled = value; };
export const setAutoClearEnabled = (value) => { autoClearEnabled = value; };
export const setTokenWaitStartTime = (value) => { tokenWaitStartTime = value; };
export const setIsReloading = (value) => { isReloading = value; };
export const setLastActivityTime = (value) => { lastActivityTime = value; };
export const setIsIdle = (value) => { isIdle = value; };
export const setWs = (value) => { ws = value; };
export const setWsReconnectTimer = (value) => { wsReconnectTimer = value; };
export const setPollInterval = (value) => { pollInterval = value; };
export const setActivityCheckInterval = (value) => { activityCheckInterval = value; };

// --- State Getters ---
export const getPollInterval = () => pollInterval;
export const getActivityCheckInterval = () => activityCheckInterval;
