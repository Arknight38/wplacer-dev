// offscreen/offscreen.js
// Handles OffscreenCanvas compositing — same logic as Blue Marble's Z() method

const TILE_GRID_SIZE = 4;  // Number of tiles per row/column in wrap cycle (4 = 4000x4000 world)
const TILE_SIZE = 1000;
const SCALE = 3; // Blue Marble's $e

let overlayBitmap = null;
let overlayAnchor = null; // { worldX, worldY }

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    console.log('[wplacer offscreen] Received:', msg.action);
    switch (msg.action) {
        case 'setOverlayImage': {
            // msg.dataUrl: the overlay PNG as a data URL
            // msg.worldX, msg.worldY: top-left anchor in world coords
            console.log('[wplacer offscreen] Setting overlay image at:', msg.worldX, msg.worldY);
            fetch(msg.dataUrl)
                .then(r => r.blob())
                .then(b => createImageBitmap(b))
                .then(bmp => {
                    overlayBitmap = bmp;
                    overlayAnchor = { worldX: msg.worldX, worldY: msg.worldY };
                    console.log('[wplacer offscreen] Overlay image set, bitmap size:', bmp.width, 'x', bmp.height);
                    sendResponse({ ok: true });
                })
                .catch(e => {
                    console.error('[wplacer offscreen] Failed to set overlay image:', e);
                    sendResponse({ ok: false });
                });
            return true;
        }

        case 'setOverlayAnchor': {
            console.log('[wplacer offscreen] Setting overlay anchor:', msg.worldX, msg.worldY);
            overlayAnchor = { worldX: msg.worldX, worldY: msg.worldY };
            sendResponse({ ok: true });
            break;
        }

        case 'compositeTile': {
            console.log('[wplacer offscreen] Compositing tile:', msg.tileX, msg.tileY, msg.blobId);
            compositeTile(msg.tileX, msg.tileY, msg.buffer)
                .then(result => {
                    console.log('[wplacer offscreen] Tile composited, buffer size:', result.byteLength);
                    sendResponse({ buffer: result });
                })
                .catch(e => {
                    console.error('[wplacer offscreen] Failed to composite tile:', e.name, e.message, e);
                    sendResponse({ buffer: null });
                });
            return true;
        }
    }
});

async function compositeTile(tileX, tileY, buffer) {
    if (!buffer || buffer.byteLength === 0) {
        console.error('[wplacer offscreen] Invalid buffer: null or empty');
        throw new Error('Invalid buffer');
    }
    console.log('[wplacer offscreen] Buffer size:', buffer.byteLength, 'bytes');
    
    const blob = new Blob([buffer], { type: 'image/png' });
    const bitmap = await createImageBitmap(blob);

    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0);

    console.log('[wplacer offscreen] Compositing: overlayBitmap exists:', !!overlayBitmap, 'overlayAnchor:', overlayAnchor);

    if (overlayBitmap && overlayAnchor) {
        // World origin of this tile (must match overlay_inject.js calculation)
        const tileWorldX = (tileX % TILE_GRID_SIZE) * TILE_SIZE;
        const tileWorldY = (tileY % TILE_GRID_SIZE) * TILE_SIZE;

        // Where the overlay's top-left falls inside this tile, in canvas pixels
        const localX = (overlayAnchor.worldX - tileWorldX) * SCALE;
        const localY = (overlayAnchor.worldY - tileWorldY) * SCALE;
        const drawW = overlayBitmap.width;
        const drawH = overlayBitmap.height;

        console.log('[wplacer offscreen] Tile world origin:', tileWorldX, tileWorldY, 'overlay anchor:', overlayAnchor.worldX, overlayAnchor.worldY, 'local pos:', localX, localY);

        // Only draw if overlay intersects this tile
        const w = canvas.width, h = canvas.height;
        if (localX < w && localY < h && localX + drawW > 0 && localY + drawH > 0) {
            console.log('[wplacer offscreen] Drawing overlay at:', localX, localY);
            ctx.globalAlpha = 0.6;
            ctx.drawImage(overlayBitmap, localX, localY, drawW, drawH);
            ctx.globalAlpha = 1.0;
        } else {
            console.log('[wplacer offscreen] Overlay does not intersect this tile');
        }
    }

    const resultBlob = await canvas.convertToBlob({ type: 'image/png' });
    return await resultBlob.arrayBuffer();
}
