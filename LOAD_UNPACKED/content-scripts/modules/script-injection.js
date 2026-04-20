// --- Script Injection ---

// Inject the page-level Turnstile generator so it runs in the page context
function injectTurnstileGenerator() {
    try {
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('injected/turnstile_inject.js');
        script.async = false;
        (document.head || document.documentElement).appendChild(script);
        script.onload = () => script.remove();
    } catch (e) {
        console.warn('wplacer: Failed to inject generator script', e);
    }
}

// Inject pawtect helper on load and allow manual reinject via Ctrl+Shift+P
let pawtectInjected = false;

function injectPawtectHelper() {
    if (pawtectInjected) return;
    try {
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('injected/pawtect_inject.js');
        script.async = true;
        (document.head || document.documentElement).appendChild(script);
        pawtectInjected = true;
        console.log('wplacer: pawtect helper injected.');
    } catch (e) {
        console.warn('wplacer: Failed to inject pawtect helper', e);
    }
}

function injectOverlayScript() {
    try {
        console.log('wplacer: Attempting to inject overlay script...');
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('injected/overlay_inject.js');
        script.async = false;
        (document.head || document.documentElement).appendChild(script);
        script.onload = () => {
            console.log('wplacer: overlay script injected and loaded.');
            script.remove();
        };
        script.onerror = (e) => {
            console.error('wplacer: Failed to load overlay script:', e);
        };
    } catch (e) {
        console.warn('wplacer: Failed to inject overlay script', e);
    }
}

function setupScriptInjection() {
    // Inject turnstile generator
    injectTurnstileGenerator();

    // Inject pawtect helper on wplace.live
    if (location.hostname.endsWith('wplace.live')) {
        injectPawtectHelper();
        injectOverlayScript();
    }

    // Allow manual reinject via Ctrl+Shift+P
    window.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && (e.key === 'P' || e.key === 'p')) {
            pawtectInjected = false; // allow re-inject
            injectPawtectHelper();
        }
    }, true);
}
