// SPDX-License-Identifier: MIT
// Copyright (c) 2026 PT Perkasa Pilar Utama

/**
 * Shared fixtures for the CanvasProcessor-vs-OpenCV comparison tests: pixel-diff
 * stats, canvas pixel access, and runtime init. No test code lives here.
 */
import { createCanvas } from "@napi-rs/canvas";
import type { CanvasLike } from "../../src/canvas-factory.js";
import { setPlatform } from "../../src/canvas-factory.js";
// Import via the package entry so the static `import _cv from "@techstark/opencv-js"`
// in src/index.ts runs and registers cv with cv-provider before any test code
// accesses the cv proxy.
import { CanvasProcessor, Contours, cv, ImageProcessor } from "../../src/index.js";
import type { BoundingBox } from "../../src/index.interface.js";
import { nodePlatform } from "../../src/platform/node.js";

export { CanvasProcessor, Contours, cv, ImageProcessor, createCanvas };
export type { CanvasLike, BoundingBox };

export type PixelStats = {
  totalPixels: number;
  exactMatch: number;
  exactMatchPct: string;
  maxDiff: number;
  meanDiff: string;
};

export function compareRGB(a: Uint8ClampedArray, b: Uint8ClampedArray): PixelStats {
  let totalPixels = 0;
  let exactMatch = 0;
  let maxDiff = 0;
  let sumDiff = 0;
  let comparisons = 0;

  for (let i = 0; i < a.length; i += 4) {
    totalPixels++;
    let pixelExact = true;

    // Compare R, G, B channels only (alpha handling differs between impls)
    for (let c = 0; c < 3; c++) {
      const diff = Math.abs((a[i + c] ?? 0) - (b[i + c] ?? 0));
      if (diff > 0) pixelExact = false;
      if (diff > maxDiff) maxDiff = diff;
      sumDiff += diff;
      comparisons++;
    }

    if (pixelExact) exactMatch++;
  }

  return {
    totalPixels,
    exactMatch,
    exactMatchPct: `${((exactMatch / totalPixels) * 100).toFixed(2)}%`,
    maxDiff,
    meanDiff: (sumDiff / comparisons).toFixed(4),
  };
}

export function printStats(label: string, stats: PixelStats): void {
  console.log(
    `  [${label}] exact: ${stats.exactMatchPct} of ${stats.totalPixels}px` +
      `  maxDiff: ${stats.maxDiff}  meanDiff: ${stats.meanDiff}`
  );
}

export async function getPixels(canvas: {
  width: number;
  height: number;
  // oxlint-disable-next-line typescript/no-explicit-any -- platform bridging type
  getContext: (...args: any[]) => any;
}): Promise<Uint8ClampedArray> {
  return canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height)
    .data as Uint8ClampedArray;
}

/** Copy a CanvasLike into a fresh canvas (routes through CanvasProcessor
 *  to avoid @napi-rs/canvas drawImage typing constraints). */
export function copyToCanvas(source: CanvasLike): CanvasLike {
  return new CanvasProcessor(source)
    .resize({ width: source.width, height: source.height })
    .toCanvas();
}

/** Set the node platform and initialise the OpenCV runtime once per file. */
export async function init(): Promise<void> {
  setPlatform(nodePlatform);
  await ImageProcessor.initRuntime();
}
