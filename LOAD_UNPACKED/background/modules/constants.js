// --- Constants ---
export const TOKEN_WAIT_THRESHOLD_MS = 30000; // 30 seconds threshold for token waiting
export const POLL_ALARM_NAME = 'wplacer-poll';
export const COOKIE_ALARM_NAME = 'wplacer-cookie';
export const POLL_INTERVAL_MS = 30000; // 30 seconds for more responsive polling
export const POLL_INTERVAL_IDLE_MS = 120000; // 2 minutes when idle
export const WS_RECONNECT_DELAY_MS = 5000; // 5 seconds before reconnecting WebSocket
export const IDLE_THRESHOLD_MS = 60000; // 1 minute of inactivity

// --- State Variables (internal - do not export directly to prevent uncontrolled mutation) ---
let tokenWaitStartTime = null;
let autoReloadEnabled = true;
let autoClearEnabled = true;
let isReloading = false; // Prevent multiple simultaneous reloads
let lastActivityTime = Date.now();
let isIdle = false;
let ws = null; // WebSocket connection
let wsReconnectTimer = null;
let pollInterval = null;
let activityCheckInterval = null;
let botActive = false; // Gate for wplace requests - only true when templates running

// --- State Getters (controlled read access) ---
export const getTokenWaitStartTime = () => tokenWaitStartTime;
export const getAutoReloadEnabled = () => autoReloadEnabled;
export const getAutoClearEnabled = () => autoClearEnabled;
export const getIsReloading = () => isReloading;
export const getLastActivityTime = () => lastActivityTime;
export const getIsIdle = () => isIdle;
export const getWs = () => ws;
export const getWsReconnectTimer = () => wsReconnectTimer;
export const getPollInterval = () => pollInterval;
export const getActivityCheckInterval = () => activityCheckInterval;
export const getBotActive = () => botActive;

// --- State Setters (controlled write access) ---
export const setTokenWaitStartTime = (value) => { tokenWaitStartTime = value; };
export const setAutoReloadEnabled = (value) => { autoReloadEnabled = value; };
export const setAutoClearEnabled = (value) => { autoClearEnabled = value; };
export const setIsReloading = (value) => { isReloading = value; };
export const setLastActivityTime = (value) => { lastActivityTime = value; };
export const setIsIdle = (value) => { isIdle = value; };
export const setWs = (value) => { ws = value; };
export const setWsReconnectTimer = (value) => { wsReconnectTimer = value; };
export const setPollInterval = (value) => { pollInterval = value; };
export const setActivityCheckInterval = (value) => { activityCheckInterval = value; };
export const setBotActive = (value) => { botActive = value; };
