// --- Event Listeners ---

import { RELOAD_FLAG, GEN_REQUEST_TYPE, GEN_TOKEN_TYPE } from './constants.js';
import { generateRandomHex, postToken, trySendPair, pending } from './token-handling.js';

export function setupEventListeners() {
    // Listen for messages from the Cloudflare Turnstile iframe (primary method)
    window.addEventListener('message', (event) => {
        if (event.origin !== "https://challenges.cloudflare.com" || !event.data) {
            return;
        }
        try {
            const token = String(event.data.token || event.data.response || event.data['cf-turnstile-response'] || '');
            if (token) {
                pending.turnstile = token;
                const fp = window.wplacerFP || sessionStorage.getItem('wplacer_fp') || generateRandomHex(32);
                const body = { colors: [0], coords: [1, 1], fp: String(fp), t: String(token) };
                try {
                    chrome.runtime.sendMessage({
                        action: 'computePawtectForT',
                        url: 'https://backend.wplace.live/s0/pixel/1/1',
                        bodyStr: JSON.stringify(body)
                    });
                } catch {}
                if (window.wplacerPawtectToken) {
                    pending.pawtect = window.wplacerPawtectToken;
                    try { delete window.wplacerPawtectToken; } catch {}
                }
                trySendPair();
            }
        } catch {
            // Ignore errors from parsing message data
        }
    }, true);

    // Listen for commands from the background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "reloadForToken") {
            console.log("wplacer: Received reload command from background script. Reloading now...");
            sessionStorage.setItem(RELOAD_FLAG, 'true');
            location.reload();
        } else if (request.action === 'generateToken') {
            console.log('wplacer: Received generateToken command. Attempting in-page Turnstile execution...');
            requestInPageTokenWithTimeout(55000, true);
        }
    });
}

const requestInPageTokenWithTimeout = (timeoutMs = 55000, fallbackToReload = false) => {
    let done = false;
    const timeout = setTimeout(() => {
        if (done) return;
        done = true;
        if (fallbackToReload) {
            console.warn('wplacer: Token generation timed out, falling back to reload.');
            sessionStorage.setItem(RELOAD_FLAG, 'true');
            location.reload();
        }
    }, timeoutMs);

    const onToken = (event) => {
        if (event.source === window && event.data?.type === GEN_TOKEN_TYPE) {
            window.removeEventListener('message', onToken, true);
            if (done) return;
            done = true;
            clearTimeout(timeout);
            if (event.data.token) {
                postToken(event.data.token);
            } else if (fallbackToReload) {
                console.warn('wplacer: Generator responded without token. Reloading.');
                sessionStorage.setItem(RELOAD_FLAG, 'true');
                location.reload();
            }
        }
    };
    window.addEventListener('message', onToken, true);
    window.postMessage({ type: GEN_REQUEST_TYPE }, '*');
};

export { requestInPageTokenWithTimeout };
