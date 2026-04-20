// --- User/Cookie Management ---
import { getServerUrl } from './core.js';

export const sendCookie = async (callback) => {
    const getCookie = (details) => new Promise((resolve, reject) => {
        chrome.cookies.get(details, (cookie) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
            } else {
                resolve(cookie);
            }
        });
    });

    let jCookie, sCookie;
    try {
        [jCookie, sCookie] = await Promise.all([
            getCookie({ url: "https://backend.wplace.live", name: "j" }),
            getCookie({ url: "https://backend.wplace.live", name: "s" })
        ]);
    } catch (error) {
        console.error("wplacer: Failed to retrieve cookies:", error);
        if (callback) callback({ success: false, error: `Failed to access cookies: ${error.message}` });
        return;
    }

    if (!jCookie) {
        if (callback) callback({ success: false, error: "Cookie 'j' not found. Are you logged in?" });
        return;
    }

    const cookies = { j: jCookie.value };
    if (sCookie) cookies.s = sCookie.value;
    const url = await getServerUrl("/user");

    console.log(`wplacer: Sending cookie to server at ${url}`);
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cookies, expirationDate: jCookie.expirationDate })
        });
        if (!response.ok) throw new Error(`Server responded with status: ${response.status}`);
        const userInfo = await response.json();
        console.log(`wplacer: Cookie sent successfully, user: ${userInfo.name}`);
        if (callback) callback({ success: true, name: userInfo.name });
    } catch (error) {
        console.error(`wplacer: Failed to connect to server at ${url}`, error);
        if (callback) callback({ success: false, error: "Could not connect to the wplacer server." });
    }
};

export const clearPawtectCache = (callback) => {
    console.log("wplacer: Clearing pawtect cache...");
    return new Promise((resolve) => {
        chrome.tabs.query({ url: "https://wplace.live/*" }, (tabs) => {
            if (tabs && tabs.length > 0) {
                let completedTabs = 0;
                tabs.forEach(tab => {
                    chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        world: 'MAIN',
                        func: () => {
                            console.log("wplacer: Removing cached pawtect data from localStorage");
                            localStorage.removeItem('wplacer_pawtect_path');
                            localStorage.removeItem('wplacerPawtectChunk')
                            window.__wplacerPawtectChunk = null;
                            return true;
                        }
                    }, (results) => {
                        const success = results && results[0] && results[0].result === true;
                        console.log(`wplacer: Cleared pawtect cache for tab ${tab.id}: ${success ? 'success' : 'failed'}`);
                        chrome.tabs.reload(tab.id);
                        completedTabs++;
                        if (completedTabs === tabs.length) {
                            if (callback) callback({ success: true });
                            resolve(true);
                        }
                    });
                });
            } else {
                console.log("wplacer: No wplace.live tabs found to clear pawtect cache");
                if (callback) callback({ success: false, error: "No wplace.live tabs open" });
                resolve(false);
            }
        });
    });
};

export const quickLogout = (callback) => {
    const origin = "https://backend.wplace.live/";
    console.log(`wplacer: Clearing browsing data for ${origin}`);
    chrome.browsingData.remove({
        origins: [origin]
    }, {
        cache: true,
        cookies: true,
        fileSystems: true,
        indexedDB: true,
        localStorage: true,
        pluginData: true,
        serviceWorkers: true,
        webSQL: true
    }, () => {
        if (chrome.runtime.lastError) {
            console.error("wplacer: Error clearing browsing data.", chrome.runtime.lastError);
            if (callback) callback({ success: false, error: "Failed to clear data." });
        } else {
            console.log("wplacer: Browsing data cleared successfully. Reloading wplace.live tabs.");
            chrome.tabs.query({ url: "https://wplace.live/*" }, (tabs) => {
                if (tabs && tabs.length > 0) {
                    tabs.forEach(tab => chrome.tabs.reload(tab.id));
                }
            });
            if (callback) callback({ success: true });
        }
    });
};
