// injected.js - Runs in page context to intercept fetch calls and capture signed headers

(function() {
    console.log('wplace-bridge: injected.js loaded');

    // Override window.fetch to intercept calls to backend.wplace.live
    const originalFetch = window.fetch;
    window.fetch = async function(url, opts) {
        if (typeof url === 'string' && url.includes('backend.wplace.live')) {
            const headers = opts?.headers || {};
            if (headers['x-pawtect-token']) {
                console.log('wplace-bridge: Captured signed headers from fetch');
                window.dispatchEvent(new CustomEvent('wplace-headers', {
                    detail: {
                        pawtect: headers['x-pawtect-token'],
                        t: headers['x-t'],
                        fp: headers['x-fp'],
                        cookie: document.cookie,
                        body: opts?.body
                    }
                }));
            }
        }
        return originalFetch.apply(this, arguments);
    };

    // Listen for sign requests from content script
    window.addEventListener('wplace-sign', async (e) => {
        const { body, requestId } = e.detail;
        console.log('wplace-bridge: Received sign request for requestId:', requestId);
        
        // Try to call the sign function if available
        if (window.__wplaceSign && typeof window.__wplaceSign === 'function') {
            try {
                const headers = await window.__wplaceSign(body);
                window.dispatchEvent(new CustomEvent('wplace-signed', {
                    detail: { headers, requestId, cookie: document.cookie }
                }));
            } catch (err) {
                console.error('wplace-bridge: Sign function failed:', err);
                window.dispatchEvent(new CustomEvent('wplace-signed', {
                    detail: { headers: null, requestId, error: err.message }
                }));
            }
        } else {
            console.warn('wplace-bridge: __wplaceSign not available, cannot sign on demand');
            window.dispatchEvent(new CustomEvent('wplace-signed', {
                detail: { headers: null, requestId, error: 'Sign function not available' }
            }));
        }
    });

    console.log('wplace-bridge: Fetch interception installed');
})();
