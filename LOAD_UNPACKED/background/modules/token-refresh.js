// --- Token Refresh Logic ---
import { TOKEN_WAIT_THRESHOLD_MS, tokenWaitStartTime, isReloading, autoReloadEnabled, autoClearEnabled, setTokenWaitStartTime, setIsReloading, getBotActive } from './constants.js';
import { getSettings, getServerUrl } from './core.js';
import { clearPawtectCache } from './user-management.js';

export const pollForTokenRequest = async () => {
    if (!getBotActive()) {
        return; // Don't poll when bot is not active
    }
    console.log("wplacer: Polling server for token request...");
    try {
        const settings = await getSettings();
        
        const url = await getServerUrl("/token-needed");
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });
        
        if (!response.ok) {
            console.warn(`wplacer: Server poll failed with status: ${response.status}`);
            return;
        }
        
        const data = await response.json();
        console.log("wplacer: Server response:", data);
        
        if (data.needed) {
            console.log("wplacer: Server requires a token.");
            
            if (!tokenWaitStartTime) {
                setTokenWaitStartTime(Date.now());
                console.log("wplacer: Started tracking token wait time.");
                
                chrome.runtime.sendMessage({
                    action: "tokenStatusChanged",
                    waiting: true,
                    waitTime: 0
                }).catch(() => {});
                
                if (settings.autoReload && !isReloading) {
                    console.log("wplacer: Token requested by server. Auto-reload enabled. Initiating immediate reload.");
                    await initiateReload();
                }
            } else {
                const waitTime = Date.now() - tokenWaitStartTime;
                const waitTimeSeconds = Math.floor(waitTime / 1000);
                
                console.log(`wplacer: Token still needed. Wait time: ${waitTimeSeconds}s`);
                
                chrome.runtime.sendMessage({
                    action: "tokenStatusChanged",
                    waiting: true,
                    waitTime: waitTimeSeconds
                }).catch(() => {});
                
                if (waitTime > TOKEN_WAIT_THRESHOLD_MS && settings.autoClear) {
                    console.log(`wplacer: Token wait time exceeded threshold (${waitTime}ms). Clearing pawtect cache.`);
                    await clearPawtectCache();
                    setTokenWaitStartTime(Date.now());
                }
            }
        } else {
            if (tokenWaitStartTime) {
                console.log("wplacer: Token no longer needed. Resetting wait timer.");
                setTokenWaitStartTime(null);
                setIsReloading(false);
                
                chrome.runtime.sendMessage({
                    action: "tokenStatusChanged",
                    waiting: false
                }).catch(() => {});
            }
        }
    } catch (error) {
        console.error("wplacer: Could not connect to the server to poll for tokens.", error.message);
    }
};

export const initiateReload = async () => {
    if (isReloading) {
        console.log("wplacer: Reload already in progress, skipping.");
        return;
    }
    
    setIsReloading(true);
    
    try {
        chrome.runtime.sendMessage({ 
            action: "statusUpdate", 
            status: "Reloading page..."
        }).catch(() => {});
        
        const tabs = await chrome.tabs.query({ url: "https://wplace.live/*" });
        if (tabs.length === 0) {
            console.warn("wplacer: Token requested, but no wplace.live tabs are open.");
            chrome.runtime.sendMessage({ 
                action: "statusUpdate", 
                status: "No wplace.live tabs found to reload."
            }).catch(() => {});
            return;
        }
        
        const targetTab = tabs.find(t => t.active) || tabs[0];
        console.log(`wplacer: Attempting to reload tab #${targetTab.id}`);
        
        try {
            await chrome.tabs.sendMessage(targetTab.id, { action: "reloadForToken" });
            console.log("wplacer: Reload message sent to content script successfully.");
        } catch (error) {
            console.log("wplacer: Content script not available, using direct reload.");
            await chrome.tabs.reload(targetTab.id);
        }
        
        setTimeout(() => {
            chrome.runtime.sendMessage({ 
                action: "statusUpdate", 
                status: "Page reloaded successfully."
            }).catch(() => {});
            setIsReloading(false);
        }, 3000);
        
    } catch (error) {
        console.error("wplacer: Error during reload:", error);
        chrome.runtime.sendMessage({ 
            action: "statusUpdate", 
            status: "Reload failed: " + error.message
        }).catch(() => {});
        setIsReloading(false);
    }
};
