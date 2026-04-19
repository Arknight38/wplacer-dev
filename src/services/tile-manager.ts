/**
 * Tile management for loading and caching canvas tiles
 */

import type { Tile, Palette } from '../types/index.js';
import { TILE_URL } from '../config/constants.js';
import type { WPlaceHttpClient } from './http-client.js';
import { Image, createCanvas } from 'canvas';

export class TileManager {
  private tiles = new Map<string, Tile>();
  private httpClient: WPlaceHttpClient;
  private palette: Palette;

  constructor(httpClient: WPlaceHttpClient, palette: Palette) {
    this.httpClient = httpClient;
    this.palette = palette;
  }

  /**
   * Get a tile from cache
   */
  getTile(tx: number, ty: number): Tile | undefined {
    return this.tiles.get(`${tx}_${ty}`);
  }

  /**
   * Set a tile in cache
   */
  setTile(tx: number, ty: number, tile: Tile): void {
    this.tiles.set(`${tx}_${ty}`, tile);
  }

  /**
   * Clear all tiles from cache
   */
  clearTiles(): void {
    this.tiles.clear();
  }

  /**
   * Get the number of cached tiles
   */
  getTileCount(): number {
    return this.tiles.size;
  }

  /**
   * Load tiles for a given bounding box
   */
  async loadTilesForBoundingBox(
    tx: number,
    ty: number,
    endTx: number,
    endTy: number
  ): Promise<void> {
    const promises: Promise<void>[] = [];

    for (let X = tx; X <= endTx; X++) {
      for (let Y = ty; Y <= endTy; Y++) {
        const p = this.httpClient
          .fetch(`${TILE_URL(X, Y)}?t=${Date.now()}`)
          .then(async (r: any) => (r.ok ? Buffer.from(await r.arrayBuffer()) : null))
          .then((buf: Buffer | null) => {
            if (!buf) return null;
            const image = new Image();
            image.src = buf;
            const canvas = createCanvas(image.width, image.height);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(image, 0, 0);
            const d = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const tile: Tile = {
              width: canvas.width,
              height: canvas.height,
              data: Array.from({ length: canvas.width }, () => Array(canvas.height).fill(0)),
            };
            for (let x = 0; x < canvas.width; x++) {
              for (let y = 0; y < canvas.height; y++) {
                const i = (y * canvas.width + x) * 4;
                const r = d.data[i],
                  g = d.data[i + 1],
                  b = d.data[i + 2],
                  a = d.data[i + 3];
                tile.data[x][y] = a === 255 ? this.palette[`${r},${g},${b}`] || 0 : 0;
              }
            }
            return tile;
          })
          .then((tileData: Tile | null) => {
            if (tileData) {
              this.setTile(X, Y, tileData);
            }
          });
        promises.push(p);
      }
    }

    await Promise.all(promises);
  }

  /**
   * Update tile data after painting
   */
  updateTileData(
    tx: number,
    ty: number,
    coords: number[],
    colors: number[]
  ): void {
    const tile = this.getTile(tx, ty);
    if (!tile) return;

    for (let i = 0; i < colors.length; i++) {
      const px = coords[i * 2];
      const py = coords[i * 2 + 1];
      const color = colors[i];
      if (tile.data[px]) {
        tile.data[px][py] = color;
      }
    }
  }
}
