// --- Script Injection ---

// Inject the page-level Turnstile generator so it runs in the page context
export function injectTurnstileGenerator() {
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

export function injectPawtectHelper() {
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

export function injectOverlayScript() {
    try {
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('injected/overlay_inject.js');
        script.async = false;
        (document.head || document.documentElement).appendChild(script);
        script.onload = () => script.remove();
        console.log('wplacer: overlay script injected.');
    } catch (e) {
        console.warn('wplacer: Failed to inject overlay script', e);
    }
}

export function setupScriptInjection() {
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
