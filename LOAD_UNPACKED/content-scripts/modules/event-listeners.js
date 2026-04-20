// --- Event Listeners ---

// NOTE: These functions/variables are defined in token-handling.js and shared via global scope:
// - pending: object with turnstile and pawtect tokens
// - trySendPair: function to attempt sending token pair
// - generateRandomHex: function to generate random hex string
// - postToken: function to send token to background script
// Do NOT redeclare these with let/const or they will shadow the global definitions.

function setupEventListeners() {
    const RELOAD_FLAG = 'wplacer_reload_in_progress';
    const GEN_REQUEST_TYPE = 'WPLACER_TURNSTILE_REQUEST';
    const GEN_TOKEN_TYPE = 'WPLACER_TURNSTILE_TOKEN';

    // Listen for messages from the Cloudflare Turnstile iframe (primary method)
    window.addEventListener('message', (event) => {
        if (event.origin !== "https://challenges.cloudflare.com" || !event.data) {
            return;
        }
        try {
            const token = String(event.data.token || event.data.response || event.data['cf-turnstile-response'] || '');
            if (token) {
                // Access global pending from token-handling.js
                window.pending = window.pending || { turnstile: null, pawtect: null };
                window.pending.turnstile = token;
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
                    window.pending.pawtect = window.wplacerPawtectToken;
                    try { delete window.wplacerPawtectToken; } catch {}
                }
                // Call global trySendPair from token-handling.js
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

// Expose on window for periodic-generation.js to access
window.requestInPageTokenWithTimeout = (timeoutMs = 55000, fallbackToReload = false) => {
    const RELOAD_FLAG = 'wplacer_reload_in_progress';
    const GEN_REQUEST_TYPE = 'WPLACER_TURNSTILE_REQUEST';
    const GEN_TOKEN_TYPE = 'WPLACER_TURNSTILE_TOKEN';

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
                // Call global postToken from token-handling.js
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
