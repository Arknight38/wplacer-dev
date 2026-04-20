// content-scripts/modules/overlay-bridge.js
function setupOverlayBridge() {
    window.addEventListener('message', (event) => {
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
                });
                break;

            case 'SET_OVERLAY_ANCHOR':
                console.log('[wplacer] Setting overlay anchor:', msg.worldX, msg.worldY);
                chrome.runtime.sendMessage({
                    action: 'setOverlayAnchor',
                    worldX: msg.worldX,
                    worldY: msg.worldY
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
                }, (response) => {
                    console.log('[wplacer] Composited tile response:', response ? 'has buffer' : 'no buffer');
                    if (!response?.buffer) return;
                    // Hand composited buffer back to page world
                    window.postMessage({
                        source: 'wplacer-overlay-response',
                        blobId: msg.blobId,
                        buffer: response.buffer
                    }, '*', [response.buffer]);
                });
                break;
            }
        }
    });
}
