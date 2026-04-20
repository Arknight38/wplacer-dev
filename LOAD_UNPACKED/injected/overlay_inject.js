// injected/overlay_inject.js
// Runs in page world. Intercepts tile fetches and canvas clicks.
(() => {
    const BRIDGE = 'wplacer-overlay';
    const blobQueue = new Map();

    // --- Tile fetch interception ---
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
        const response = await originalFetch.apply(this, args);
        const url = (args[0] instanceof Request ? args[0].url : args[0]) || '';

        const isTile = /\/tiles?\/\d+\/\d+/.test(url);
        const contentType = response.headers.get('content-type') || '';

        if (isTile && contentType.includes('image/')) {
            console.log('[wplacer] Intercepting tile:', url);
            const clone = response.clone();
            const blob = await clone.blob();

            const segments = url.split('?')[0].split('/').filter(s => s && !isNaN(Number(s)));
            const tileX = parseInt(segments[segments.length - 2]);
            const tileY = parseInt(segments[segments.length - 1]);
            const blobId = crypto.randomUUID();
            console.log('[wplacer] Tile coords:', tileX, tileY, 'blobId:', blobId);

            const modifiedBuffer = await new Promise((resolve) => {
                blobQueue.set(blobId, resolve);

                // Send blob as ArrayBuffer — blobs don't cross postMessage cleanly
                blob.arrayBuffer().then(buf => {
                    window.postMessage({
                        source: BRIDGE,
                        type: 'TILE_BLOB',
                        tileX, tileY, blobId,
                        buffer: buf
                    }, '*', [buf]);
                });

                // Fallback: if extension doesn't respond in 2s, pass original through
                setTimeout(() => {
                    if (blobQueue.has(blobId)) {
                        blobQueue.delete(blobId);
                        resolve(null);
                    }
                }, 2000);
            });

            if (!modifiedBuffer) return response;

            return new Response(new Blob([modifiedBuffer], { type: 'image/png' }), {
                headers: response.headers,
                status: response.status,
                statusText: response.statusText
            });
        }

        // --- Coord extraction (pixel placement endpoint) ---
        const params = new URLSearchParams(url.split('?')[1] || '');
        const pathSegments = url.split('?')[0].split('/').filter(s => s && !isNaN(Number(s)));
        if (params.has('x') && params.has('y') && pathSegments.length >= 2) {
            const tileX = parseInt(pathSegments[pathSegments.length - 2]);
            const tileY = parseInt(pathSegments[pathSegments.length - 1]);
            const px = parseInt(params.get('x'));
            const py = parseInt(params.get('y'));
            window.postMessage({
                source: BRIDGE,
                type: 'COORDS',
                tileX, tileY, pixelX: px, pixelY: py,
                worldX: tileX % 4 * 1000 + px,
                worldY: tileY % 4 * 1000 + py
            }, '*');
        }

        return response;
    };

    // --- Canvas click → set overlay pin ---
    // Wplace renders into a <canvas>. We capture clicks and convert to world coords
    // by reading the same tile/pixel data the game exposes via the URL intercept above.
    // We store the last known coords from fetch and use them on click as the pin position.
    let lastCoords = null;
    window.addEventListener('message', (e) => {
        if (e.data?.source === BRIDGE && e.data?.type === 'COORDS') {
            lastCoords = e.data;
        }
        // Composited tile buffer coming back from extension
        if (e.data?.source === 'wplacer-overlay-response') {
            const resolve = blobQueue.get(e.data.blobId);
            if (resolve) {
                resolve(e.data.buffer);
                blobQueue.delete(e.data.blobId);
            }
        }
    });

    document.addEventListener('click', (e) => {
        const canvas = e.target.closest('canvas');
        if (!canvas || !lastCoords) return;
        // On click, promote lastCoords as the overlay anchor
        window.postMessage({
            source: BRIDGE,
            type: 'SET_OVERLAY_ANCHOR',
            ...lastCoords
        }, '*');
    }, true);

    console.log('[wplacer] overlay_inject loaded');
})();
