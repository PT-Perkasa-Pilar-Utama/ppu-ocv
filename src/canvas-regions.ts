// SPDX-License-Identifier: MIT
// Copyright (c) 2026 PT Perkasa Pilar Utama

/**
 * Canvas-native region detection: 8-connected flood-fill bounding-box
 * extraction on a binary image's raw RGBA pixels. Extracted from
 * `CanvasProcessor.findRegions` so the processor stays a thin wrapper over this
 * pure algorithm.
 */
import type { BoundingBox } from "./index.interface.js";

/** A detected region: its bounding box and foreground-pixel count. */
export type DetectedRegion = {
  /** Axis-aligned bounding box of the region (x1/y1 are exclusive). */
  bbox: BoundingBox;
  /** Number of foreground pixels in the region. */
  area: number;
};

/** Options for {@link detectRegions} / `CanvasProcessor.findRegions`. */
export type FindRegionsOptions = {
  /** Which pixels count as foreground relative to `thresh`. @default "light" */
  foreground?: "light" | "dark";
  /** Grayscale threshold separating foreground from background. @default 127 */
  thresh?: number;
  /** Discard regions with fewer than this many pixels. @default 1 */
  minArea?: number;
  /** Discard regions with more than this many pixels. @default Infinity */
  maxArea?: number;
  /** Padding per box as a fraction of its height (vertical/horizontal). */
  padding?: { vertical?: number; horizontal?: number };
  /** Multiply all bbox coordinates by this factor after padding. @default 1 */
  scale?: number;
};

/**
 * Detect foreground regions in raw RGBA pixel data via 8-connected flood fill.
 *
 * @param data - RGBA pixel data (`width * height * 4` bytes).
 * @param width - Image width in pixels.
 * @param height - Image height in pixels.
 * @param options - See {@link FindRegionsOptions}.
 */
export function detectRegions(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  options: FindRegionsOptions = {}
): DetectedRegion[] {
  const {
    foreground = "light",
    thresh = 127,
    minArea = 1,
    maxArea = Infinity,
    padding,
    scale = 1,
  } = options;

  // visited[y * width + x] = 1 once a pixel has been assigned to a region
  const visited = new Uint8Array(width * height);
  const regions: DetectedRegion[] = [];

  // 8-connected neighbour offsets: [dx, dy]
  const neighbours = [
    [-1, -1],
    [0, -1],
    [1, -1],
    [-1, 0],
    [1, 0],
    [-1, 1],
    [0, 1],
    [1, 1],
  ] as const;

  const isForeground = (pixelIdx: number): boolean => {
    const r = data[pixelIdx] ?? 0;
    return foreground === "light" ? r > thresh : r <= thresh;
  };

  for (let startY = 0; startY < height; startY++) {
    for (let startX = 0; startX < width; startX++) {
      const startFlat = startY * width + startX;
      if (visited[startFlat]) continue;
      visited[startFlat] = 1;

      if (!isForeground(startFlat * 4)) continue;

      // DFS stack — stores flat index
      const stack: number[] = [startFlat];
      let minX = startX,
        maxX = startX;
      let minY = startY,
        maxY = startY;
      let area = 0;

      while (stack.length > 0) {
        const flat = stack.pop();
        if (flat === undefined) break;
        area++;

        const x = flat % width;
        const y = (flat - x) / width;

        if (x < minX) minX = x;
        else if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        else if (y > maxY) maxY = y;

        for (const [dx, dy] of neighbours) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          const nFlat = ny * width + nx;
          if (visited[nFlat]) continue;
          visited[nFlat] = 1;
          if (isForeground(nFlat * 4)) stack.push(nFlat);
        }
      }

      if (area >= minArea && area <= maxArea) {
        let x0 = minX;
        let y0 = minY;
        let x1 = maxX + 1;
        let y1 = maxY + 1;

        // Apply padding relative to bbox height (mirrors extractBoxesFromContours)
        if (padding) {
          const bboxH = y1 - y0;
          const vPad = Math.round(bboxH * (padding.vertical ?? 0));
          const hPad = Math.round(bboxH * (padding.horizontal ?? 0));
          x0 = Math.max(0, x0 - hPad);
          y0 = Math.max(0, y0 - vPad);
          x1 = Math.min(width, x1 + hPad);
          y1 = Math.min(height, y1 + vPad);
        }

        // Scale coordinates (e.g. processed → original image space)
        if (scale !== 1) {
          x0 = Math.max(0, Math.round(x0 * scale));
          y0 = Math.max(0, Math.round(y0 * scale));
          x1 = Math.round(x1 * scale);
          y1 = Math.round(y1 * scale);
        }

        regions.push({ bbox: { x0, y0, x1, y1 }, area });
      }
    }
  }

  return regions;
}
