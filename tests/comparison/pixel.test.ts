// SPDX-License-Identifier: MIT
// Copyright (c) 2026 PT Perkasa Pilar Utama

import { beforeAll, describe, expect, test } from "bun:test";
import {
  CanvasProcessor,
  compareRGB,
  copyToCanvas,
  createCanvas,
  getPixels,
  ImageProcessor,
  init,
  printStats,
} from "./helpers.js";

beforeAll(init);

// ─── grayscale ───────────────────────────────────────────────────────────────

describe("grayscale: canvas-native vs OpenCV", () => {
  test("single opaque pixel — pure red", async () => {
    const src = createCanvas(1, 1);
    src.getContext("2d").fillStyle = "red";
    src.getContext("2d").fillRect(0, 0, 1, 1);

    const canvasResult = new CanvasProcessor(src).grayscale().toCanvas();

    // OpenCV operates on a fresh copy of the same source
    const srcCopy = createCanvas(1, 1);
    srcCopy.getContext("2d").drawImage(src, 0, 0);
    const ocvResult = new ImageProcessor(srcCopy).grayscale().toCanvas();

    const cp = await getPixels(canvasResult);
    const oc = await getPixels(ocvResult);

    console.log(`\n  pure red (255,0,0):`);
    console.log(`    CanvasProcessor → R=${cp[0]}`);
    console.log(`    ImageProcessor  → R=${oc[0]}`);
    console.log(`    diff: ${Math.abs((cp[0] ?? 0) - (oc[0] ?? 0))}`);

    // Both implement BT.601; diff should be 0 or 1 due to rounding
    expect(Math.abs((cp[0] ?? 0) - (oc[0] ?? 0))).toBeLessThanOrEqual(1);
  });

  test("single opaque pixel — pure green", async () => {
    const src = createCanvas(1, 1);
    src.getContext("2d").fillStyle = "green"; // #008000 → R=0,G=128,B=0
    src.getContext("2d").fillRect(0, 0, 1, 1);

    const cp = await getPixels(new CanvasProcessor(src).grayscale().toCanvas());

    const srcCopy = createCanvas(1, 1);
    srcCopy.getContext("2d").drawImage(src, 0, 0);
    const oc = await getPixels(new ImageProcessor(srcCopy).grayscale().toCanvas());

    console.log(`\n  pure green (0,128,0):`);
    console.log(`    CanvasProcessor → R=${cp[0]}`);
    console.log(`    ImageProcessor  → R=${oc[0]}`);
    console.log(`    diff: ${Math.abs((cp[0] ?? 0) - (oc[0] ?? 0))}`);

    expect(Math.abs((cp[0] ?? 0) - (oc[0] ?? 0))).toBeLessThanOrEqual(1);
  });

  test("real image — per-pixel statistics", async () => {
    const file = Bun.file("./assets/receipt.jpg");
    const src = await CanvasProcessor.prepareCanvas(await file.arrayBuffer());

    const cpResult = new CanvasProcessor(src).grayscale().toCanvas();

    const srcCopy = copyToCanvas(src);
    const ocvResult = new ImageProcessor(srcCopy).grayscale().toCanvas();

    const stats = compareRGB(await getPixels(cpResult), await getPixels(ocvResult));

    console.log("\n  grayscale — real image:");
    printStats("canvas vs opencv", stats);

    // Virtually all pixels should match within ±1 (rounding-only difference)
    expect(stats.maxDiff).toBeLessThanOrEqual(1);
    expect(parseFloat(stats.meanDiff)).toBeLessThan(0.5);
  });
});

// ─── invert ──────────────────────────────────────────────────────────────────

describe("invert: canvas-native vs OpenCV", () => {
  test("grayscaled image — per-pixel statistics", async () => {
    // Note: OpenCV's bitwise_not inverts ALL channels including alpha, so
    // comparing on an RGBA source produces divergent alpha channels.
    // We compare on a grayscaled image: OpenCV toCanvas() reconstructs
    // alpha=255 from a single-channel mat; canvas invert already preserves alpha.
    const file = Bun.file("./assets/receipt.jpg");
    const src = await CanvasProcessor.prepareCanvas(await file.arrayBuffer());

    // Canvas: grayscale first so alpha stays 255, then invert
    const cpResult = new CanvasProcessor(src).grayscale().invert().toCanvas();

    const srcCopy = copyToCanvas(src);
    // OpenCV single-channel mat → toCanvas sets alpha=255 after invert
    const ocvResult = new ImageProcessor(srcCopy).grayscale().invert().toCanvas();

    const stats = compareRGB(await getPixels(cpResult), await getPixels(ocvResult));

    console.log("\n  invert (after grayscale) — real image:");
    printStats("canvas vs opencv", stats);

    // bitwise_not on same grayscale values — should be 1:1
    expect(stats.maxDiff).toBe(0);
  });
});

// ─── threshold ───────────────────────────────────────────────────────────────

describe("threshold: canvas-native vs OpenCV", () => {
  test("THRESH_BINARY at fixed value — real image after grayscale", async () => {
    const file = Bun.file("./assets/receipt.jpg");
    const src = await CanvasProcessor.prepareCanvas(await file.arrayBuffer());

    // Canvas: grayscale → threshold
    const cpResult = new CanvasProcessor(src)
      .grayscale()
      .threshold({ thresh: 127, maxValue: 255 })
      .toCanvas();

    // OpenCV: grayscale → THRESH_BINARY (same fixed value, no Otsu)
    const srcCopy = copyToCanvas(src);
    const ocvResult = new ImageProcessor(srcCopy)
      .grayscale()
      .threshold({ lower: 127, upper: 255, type: 0 /* cv.THRESH_BINARY */ })
      .toCanvas();

    const stats = compareRGB(await getPixels(cpResult), await getPixels(ocvResult));

    console.log("\n  threshold THRESH_BINARY=127 after grayscale:");
    printStats("canvas vs opencv", stats);

    // Both operate on the same grayscale values — results should be identical
    expect(stats.maxDiff).toBe(0);
  });
});
