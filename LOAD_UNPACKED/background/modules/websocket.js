// --- WebSocket Connection ---
import { WS_RECONNECT_DELAY_MS, ws, wsReconnectTimer, tokenWaitStartTime, setWs, setWsReconnectTimer, setTokenWaitStartTime } from './constants.js';
import { getSettings } from './core.js';

export const connectWebSocket = async () => {
    try {
        const { host, port } = await getSettings();
        const wsUrl = `ws://${host}:${port}`;
        
        console.log(`wplacer: Connecting to WebSocket at ${wsUrl}`);
        setWs(new WebSocket(wsUrl));
        
        ws.onopen = () => {
            console.log("wplacer: WebSocket connected");
            ws.send(JSON.stringify({ type: 'logs' }));
            
            if (wsReconnectTimer) {
                clearTimeout(wsReconnectTimer);
                setWsReconnectTimer(null);
            }
        };
        
        ws.onmessage = (event) => {
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
            } catch (error) {
                console.error("wplacer: Failed to parse WebSocket message", error);
            }
        };
        
        ws.onerror = (error) => {
            console.error("wplacer: WebSocket error", error);
        };
        
        ws.onclose = () => {
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
