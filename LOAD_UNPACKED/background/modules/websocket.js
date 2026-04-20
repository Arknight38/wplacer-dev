// --- WebSocket Connection ---
import { WS_RECONNECT_DELAY_MS, ws, wsReconnectTimer, tokenWaitStartTime, setWs, setWsReconnectTimer, setTokenWaitStartTime } from './constants.js';
import { getSettings } from './core.js';
import { activateBot, deactivateBot } from './bot-state.js';

export const connectWebSocket = async () => {
    try {
        const { host, port } = await getSettings();
        const wsUrl = `ws://${host}:${port}`;

        console.log(`wplacer: Connecting to WebSocket at ${wsUrl}`);
        const socket = new WebSocket(wsUrl);
        setWs(socket);

        socket.onopen = () => {
            console.log("wplacer: WebSocket connected");
            socket.send(JSON.stringify({ type: 'logs' }));

            if (wsReconnectTimer) {
                clearTimeout(wsReconnectTimer);
                setWsReconnectTimer(null);
            }
        };

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'token-needed' && data.needed) {
                    console.log("wplacer: WebSocket received token request");
                    if (!tokenWaitStartTime) {
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
        };
        
        socket.onclose = () => {
            console.log("wplacer: WebSocket closed");
            setWs(null);
            if (!wsReconnectTimer) {
                setWsReconnectTimer(setTimeout(connectWebSocket, WS_RECONNECT_DELAY_MS));
            }
        };
    } catch (error) {
        console.error("wplacer: Failed to connect WebSocket", error);
    }
};
