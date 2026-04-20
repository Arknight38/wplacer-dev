// --- Token Refresh Logic ---
import { TOKEN_WAIT_THRESHOLD_MS, getTokenWaitStartTime, getIsReloading, getAutoReloadEnabled, getAutoClearEnabled, setTokenWaitStartTime, setIsReloading, getBotActive } from './constants.js';
import { getSettings, getServerUrl } from './core.js';
import { clearPawtectCache } from './user-management.js';

export const pollForTokenRequest = async () => {
    if (!getBotActive()) {
        return; // Don't poll when bot is not active
    }
    console.log("wplacer: Polling server for token request...");
    try {
        // Fetch fresh settings at decision points using getter functions
        // to ensure we're using current state, not stale cached values
        await getSettings(); // Ensure settings are loaded into state

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

            if (!getTokenWaitStartTime()) {
                setTokenWaitStartTime(Date.now());
                console.log("wplacer: Started tracking token wait time.");

                chrome.runtime.sendMessage({
                    action: "tokenStatusChanged",
                    waiting: true,
                    waitTime: 0
                }).catch(() => {});

                // Use live getter to check current autoReload setting
                if (getAutoReloadEnabled() && !getIsReloading()) {
                    console.log("wplacer: Token requested by server. Auto-reload enabled. Initiating immediate reload.");
                    await initiateReload();
                }
            } else {
                const waitTime = Date.now() - getTokenWaitStartTime();
                const waitTimeSeconds = Math.floor(waitTime / 1000);

                console.log(`wplacer: Token still needed. Wait time: ${waitTimeSeconds}s`);

                chrome.runtime.sendMessage({
                    action: "tokenStatusChanged",
                    waiting: true,
                    waitTime: waitTimeSeconds
                }).catch(() => {});

                // Use live getter to check current autoClear setting
                if (waitTime > TOKEN_WAIT_THRESHOLD_MS && getAutoClearEnabled()) {
                    console.log(`wplacer: Token wait time exceeded threshold (${waitTime}ms). Clearing pawtect cache.`);
                    await clearPawtectCache();
                    setTokenWaitStartTime(Date.now());
                }
            }
        } else {
            if (getTokenWaitStartTime()) {
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

// Track reload completion by tab ID
let reloadCompleteListener = null;

const waitForReloadComplete = (tabId, timeoutMs = 30000) => {
    return new Promise((resolve) => {
        // Set up one-time listener for tab load completion
        const onUpdated = (updatedTabId, changeInfo) => {
            if (updatedTabId === tabId && changeInfo.status === 'complete') {
                chrome.tabs.onUpdated.removeListener(onUpdated);
                resolve(true);
            }
        };
        chrome.tabs.onUpdated.addListener(onUpdated);

        // Also resolve after timeout to avoid hanging indefinitely
        setTimeout(() => {
            chrome.tabs.onUpdated.removeListener(onUpdated);
            resolve(false);
        }, timeoutMs);
    });
};

export const initiateReload = async () => {
    if (getIsReloading()) {
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
            setIsReloading(false);
            return;
        }

        const targetTab = tabs.find(t => t.active) || tabs[0];
        const targetTabId = targetTab.id;
        console.log(`wplacer: Attempting to reload tab #${targetTabId}`);

        let usedContentScript = false;
        try {
            await chrome.tabs.sendMessage(targetTabId, { action: "reloadForToken" });
            console.log("wplacer: Reload message sent to content script successfully.");
            usedContentScript = true;
        } catch (error) {
            console.log("wplacer: Content script not available, using direct reload.");
            await chrome.tabs.reload(targetTabId);
        }

        // Wait for tab to actually complete loading before resetting flag
        const completed = await waitForReloadComplete(targetTabId, 30000);
        if (completed) {
            console.log("wplacer: Tab reload completed.");
        } else {
            console.warn("wplacer: Tab reload timeout, resetting flag anyway.");
        }

        chrome.runtime.sendMessage({
            action: "statusUpdate",
            status: completed ? "Page reloaded successfully." : "Reload status unknown."
        }).catch(() => {});
        setIsReloading(false);

    } catch (error) {
        console.error("wplacer: Error during reload:", error);
        chrome.runtime.sendMessage({
            action: "statusUpdate",
            status: "Reload failed: " + error.message
        }).catch(() => {});
        setIsReloading(false);
    }
};
