// --- WebSocket Connection ---
import {
    WS_RECONNECT_DELAY_MS,
    getWs,
    getWsReconnectTimer,
    getTokenWaitStartTime,
    setWs,
    setWsReconnectTimer,
    setTokenWaitStartTime
} from './constants.js';
import { getSettings } from './core.js';
import { activateBot, deactivateBot } from './bot-state.js';

// Exponential backoff state
let reconnectAttempts = 0;
const MAX_RECONNECT_DELAY_MS = 60000; // Cap at 60 seconds
const INITIAL_RECONNECT_DELAY_MS = WS_RECONNECT_DELAY_MS;

const calculateReconnectDelay = () => {
    // Exponential backoff: 5s, 10s, 20s, 40s, 60s (capped)
    const delay = Math.min(
        INITIAL_RECONNECT_DELAY_MS * Math.pow(2, reconnectAttempts),
        MAX_RECONNECT_DELAY_MS
    );
    reconnectAttempts++;
    return delay;
};

const scheduleReconnect = () => {
    if (!getWsReconnectTimer()) {
        const delay = calculateReconnectDelay();
        console.log(`wplacer: Scheduling WebSocket reconnect in ${delay}ms (attempt ${reconnectAttempts})`);
        setWsReconnectTimer(setTimeout(() => {
            connectWebSocket();
        }, delay));
    }
};

export const connectWebSocket = async () => {
    try {
        const { host, port } = await getSettings();
        const wsUrl = `ws://${host}:${port}`;

        console.log(`wplacer: Connecting to WebSocket at ${wsUrl}`);
        const socket = new WebSocket(wsUrl);
        setWs(socket);

        socket.onopen = () => {
            console.log("wplacer: WebSocket connected");
            // Reset backoff on successful connection
            reconnectAttempts = 0;
            socket.send(JSON.stringify({ type: 'logs' }));

            if (getWsReconnectTimer()) {
                clearTimeout(getWsReconnectTimer());
                setWsReconnectTimer(null);
            }
        };

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'token-needed' && data.needed) {
                    console.log("wplacer: WebSocket received token request");
                    if (!getTokenWaitStartTime()) {
                        setTokenWaitStartTime(Date.now());
                        chrome.runtime.sendMessage({
                            action: "tokenStatusChanged",
                            waiting: true,
                            waitTime: 0
                        }).catch(() => {});
                    }
                }
                if (data.type === 'bot-activate') {
                    console.log("wplacer: WebSocket received bot activation request");
                    activateBot();
                }
                if (data.type === 'bot-deactivate') {
                    console.log("wplacer: WebSocket received bot deactivation request");
                    deactivateBot();
                }
            } catch (error) {
                console.error("wplacer: Failed to parse WebSocket message", error);
            }
        };

        socket.onerror = (error) => {
            console.error("wplacer: WebSocket error", error);
            // Error doesn't trigger close immediately, let onclose handle reconnection
        };

        socket.onclose = () => {
            console.log("wplacer: WebSocket closed");
            setWs(null);
            scheduleReconnect();
        };
    } catch (error) {
        console.error("wplacer: Failed to connect WebSocket", error);
        // Schedule reconnection even if initial connection setup fails
        setWs(null);
        scheduleReconnect();
    }
};
