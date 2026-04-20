// --- Event Listeners ---
import { tokenWaitStartTime, autoReloadEnabled, autoClearEnabled, setTokenWaitStartTime, getPollInterval } from './constants.js';
import { getSettings, getServerUrl } from './core.js';
import { startPolling } from './polling.js';
import { sendCookie, clearPawtectCache, quickLogout } from './user-management.js';
import { activateBot, deactivateBot, getBotState } from './bot-state.js';

// Ensure offscreen document exists for canvas compositing
async function ensureOffscreen() {
    const exists = await chrome.offscreen.hasDocument();
    if (!exists) {
        await chrome.offscreen.createDocument({
            url: chrome.runtime.getURL('offscreen/offscreen.html'),
            reasons: ['BLOBS'],
            justification: 'Composite overlay image onto tile canvases using blob manipulation'
        });
    }
}

export function setupEventListeners() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log("wplacer: Received message:", request);
        
        if (request.action === "getSettings") {
            getSettings().then(settings => {
                console.log("wplacer: Current settings:", settings);
                sendResponse(settings);
            });
            return true;
        }

        if (request.action === "sendCookie") {
            sendCookie(sendResponse);
            return true;
        }
        if (request.action === "clearPawtectCache") {
            clearPawtectCache(sendResponse);
            return true;
        }
        if (request.action === "getTokenStatus") {
            if (tokenWaitStartTime) {
                const waitTimeMs = Date.now() - tokenWaitStartTime;
                const waitTimeSec = Math.floor(waitTimeMs / 1000);
                sendResponse({ waiting: true, waitTime: waitTimeSec });
            } else {
                sendResponse({ waiting: false, waitTime: 0 });
            }
            return true;
        }
        if (request.action === "settingsUpdated") {
            getSettings().then((settings) => {
                console.log("wplacer: Settings updated. Auto-reload:", settings.autoReload, "Auto-clear:", settings.autoClear);
                startPolling();
                sendResponse({ success: true });
            });
            return true;
        }
        if (request.action === "quickLogout") {
            quickLogout(sendResponse);
            return true;
        }
        if (request.action === "activateBot") {
            activateBot().then(() => {
                sendResponse({ success: true, state: getBotState() });
            });
            return true;
        }
        if (request.action === "deactivateBot") {
            deactivateBot();
            sendResponse({ success: true, state: getBotState() });
            return true;
        }
        if (request.action === "getBotState") {
            sendResponse({ success: true, state: getBotState() });
            return true;
        }
        if (request.type === "SEND_TOKEN") {
            if (tokenWaitStartTime) {
                console.log("wplacer: Token received. Resetting wait timer.");
                setTokenWaitStartTime(null);
            }
            
            getServerUrl("/t").then(url => {
                fetch(url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        t: request.token,
                        pawtect: request.pawtect || null,
                        fp: request.fp || null,
                        colors: request.colors || null
                    })
                });
            });
        }

        if (request.action === "tokenPairReceived") {
            if (request.turnstile && request.pawtect) {
                console.log("wplacer: Token pair received");
                if (tokenWaitStartTime) {
                    console.log("wplacer: Token pair received. Resetting wait timer.");
                    setTokenWaitStartTime(null);
                    
                    chrome.runtime.sendMessage({
                        action: "tokenStatusChanged",
                        waiting: false
                    }).catch(() => {});
                }
                
                getServerUrl("/t").then(url => {
                    fetch(url, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            t: request.turnstile,
                            pawtect: request.pawtect,
                            fp: request.fp || null,
                            colors: request.colors || null
                        })
                    }).then(response => {
                        if (response.ok) {
                            console.log("wplacer: Token pair sent successfully");
                        } else {
                            console.error("wplacer: Failed to send token pair, status:", response.status);
                        }
                    }).catch(error => {
                        console.error("wplacer: Error sending token pair:", error);
                    });
                });
                sendResponse({ success: true });
            } else {
                sendResponse({ success: false, error: "Missing turnstile or pawtect token" });
            }
            return true;
        }

        // --- Overlay Handlers ---
        if (request.action === "overlayCoords") {
            // Forward to backend via WebSocket or HTTP
            getServerUrl("/overlay/coords").then(url => {
                fetch(url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(request.payload)
                }).catch(error => {
                    console.error("wplacer: Failed to send overlay coords:", error);
                });
            });
            return true;
        }

        if (request.action === "setOverlayAnchor") {
            chrome.storage.local.set({ overlayAnchorX: request.worldX, overlayAnchorY: request.worldY });
            // Tell offscreen doc to update its anchor
            ensureOffscreen().then(() => {
                chrome.runtime.sendMessage({
                    action: 'setOverlayAnchor',
                    worldX: request.worldX,
                    worldY: request.worldY
                });
            });
            sendResponse({ success: true });
            return true;
        }

        if (request.action === "setOverlayImage") {
            chrome.storage.local.set({ overlayImageData: request.dataUrl });
            ensureOffscreen().then(() => {
                chrome.runtime.sendMessage({
                    action: 'setOverlayImage',
                    dataUrl: request.dataUrl,
                    worldX: request.worldX,
                    worldY: request.worldY
                });
            });
            sendResponse({ success: true });
            return true;
        }

        if (request.action === "compositeTile") {
            ensureOffscreen().then(() => {
                chrome.runtime.sendMessage({
                    action: 'compositeTile',
                    tileX: request.tileX,
                    tileY: request.tileY,
                    buffer: request.buffer,
                    blobId: request.blobId
                }, (response) => sendResponse(response));
            });
            return true; // async
        }

        return false;
    });

    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        if (changeInfo.status === 'complete' && tab.url?.startsWith("https://wplace.live")) {
            console.log("wplacer: wplace.live tab loaded.");
            // Only send cookie and start polling if bot is active
            if (getBotState().active) {
                sendCookie(response => console.log(`wplacer: Cookie send status: ${response.success ? 'Success' : 'Failed'}`));
                if (!getPollInterval()) {
                    console.log("wplacer: Starting polling because wplace.live tab loaded (bot active).");
                    startPolling();
                }
            } else {
                console.log("wplacer: Bot inactive - not sending cookie or starting polling.");
            }
        }
    });
}
