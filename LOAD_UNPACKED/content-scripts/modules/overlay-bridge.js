// content-scripts/modules/overlay-bridge.js
// Use specific origin for postMessage security
const WPLACE_ORIGIN = 'https://wplace.live';

function setupOverlayBridge() {
    window.addEventListener('message', (event) => {
        // Validate origin for security - only accept messages from wplace.live
        if (event.origin !== WPLACE_ORIGIN && event.origin !== window.location.origin) {
            return;
        }
        if (event.source !== window) return;
        if (event.data?.source !== 'wplacer-overlay') return;

        const msg = event.data;
        console.log('[wplacer] Overlay bridge received:', msg.type);

        switch (msg.type) {
            case 'COORDS':
                console.log('[wplacer] Sending coords to backend:', msg.worldX, msg.worldY);
                chrome.runtime.sendMessage({
                    action: 'overlayCoords',
                    payload: {
                        tileX: msg.tileX,
                        tileY: msg.tileY,
                        pixelX: msg.pixelX,
                        pixelY: msg.pixelY,
                        worldX: msg.worldX,
                        worldY: msg.worldY
                    }
                }).catch(err => {
                    if (err.message.includes('Extension context invalidated')) {
                        console.warn('[wplacer] Extension reloaded - page refresh required for overlay to work');
                    } else {
                        console.error('[wplacer] Failed to send coords:', err);
                    }
                });
                break;

            case 'SET_OVERLAY_ANCHOR':
                console.log('[wplacer] Setting overlay anchor:', msg.worldX, msg.worldY);
                chrome.runtime.sendMessage({
                    action: 'setOverlayAnchor',
                    worldX: msg.worldX,
                    worldY: msg.worldY
                }).catch(err => {
                    if (err.message.includes('Extension context invalidated')) {
                        console.warn('[wplacer] Extension reloaded - page refresh required for overlay to work');
                    } else {
                        console.error('[wplacer] Failed to set anchor:', err);
                    }
                });
                break;

            case 'TILE_BLOB': {
                console.log('[wplacer] Sending tile blob for compositing:', msg.tileX, msg.tileY, msg.blobId);
                chrome.runtime.sendMessage({
                    action: 'compositeTile',
                    tileX: msg.tileX,
                    tileY: msg.tileY,
                    blobId: msg.blobId,
                    buffer: msg.buffer
                }).then((response) => {
                    console.log('[wplacer] Composited tile response:', response ? 'has buffer' : 'no buffer');
                    if (!response?.buffer) return;
                    // Hand composited buffer back to page world using specific origin
                    window.postMessage({
                        source: 'wplacer-overlay-response',
                        blobId: msg.blobId,
                        buffer: response.buffer
                    }, WPLACE_ORIGIN, [response.buffer]);
                }).catch(err => {
                    if (err.message && err.message.includes('Extension context invalidated')) {
                        console.warn('[wplacer] Extension reloaded - page refresh required for overlay to work');
                    } else {
                        console.error('[wplacer] Failed to send tile blob:', err);
                    }
                });
                break;
            }
        }
    });
}
