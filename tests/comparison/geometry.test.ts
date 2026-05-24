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

// ─── resize ──────────────────────────────────────────────────────────────────

describe("resize: canvas-native vs OpenCV", () => {
  test("downscale 2× — solid colour (no interpolation ambiguity)", async () => {
    // A solid colour canvas should downscale to the same colour regardless of
    // the interpolation implementation.
    const src = createCanvas(100, 100);
    src.getContext("2d").fillStyle = "#4287f5";
    src.getContext("2d").fillRect(0, 0, 100, 100);

    const cpResult = new CanvasProcessor(src).resize({ width: 50, height: 50 }).toCanvas();

    const srcCopy = createCanvas(100, 100);
    srcCopy.getContext("2d").drawImage(src, 0, 0);
    const ocvResult = new ImageProcessor(srcCopy).resize({ width: 50, height: 50 }).toCanvas();

    const stats = compareRGB(await getPixels(cpResult), await getPixels(ocvResult));

    console.log("\n  resize solid colour 100×100 → 50×50:");
    printStats("canvas vs opencv", stats);

    // Solid colour: interpolation doesn't matter, results should be identical
    expect(stats.maxDiff).toBe(0);
  });

  test("downscale 2× — real image — per-pixel statistics", async () => {
    const file = Bun.file("./assets/receipt.jpg");
    const src = await CanvasProcessor.prepareCanvas(await file.arrayBuffer());

    const targetW = Math.floor(src.width / 2);
    const targetH = Math.floor(src.height / 2);

    const cpResult = new CanvasProcessor(src)
      .resize({ width: targetW, height: targetH })
      .toCanvas();

    const srcCopy = copyToCanvas(src);
    const ocvResult = new ImageProcessor(srcCopy)
      .resize({ width: targetW, height: targetH })
      .toCanvas();

    const stats = compareRGB(await getPixels(cpResult), await getPixels(ocvResult));

    console.log("\n  resize real image 2× downscale:");
    printStats("canvas vs opencv", stats);

    // Bilinear implementations differ in sub-pixel rounding — allow up to ±5
    expect(stats.maxDiff).toBeLessThanOrEqual(5);
  });

  test("upscale 2× — real image — per-pixel statistics", async () => {
    // Use a small crop to keep runtime manageable
    const src = createCanvas(100, 100);
    const file = Bun.file("./assets/receipt.jpg");
    const original = await CanvasProcessor.prepareCanvas(await file.arrayBuffer());
    src.getContext("2d").putImageData(original.getContext("2d").getImageData(0, 0, 100, 100), 0, 0);

    const cpResult = new CanvasProcessor(src).resize({ width: 200, height: 200 }).toCanvas();

    const srcCopy = copyToCanvas(src);
    const ocvResult = new ImageProcessor(srcCopy).resize({ width: 200, height: 200 }).toCanvas();

    const stats = compareRGB(await getPixels(cpResult), await getPixels(ocvResult));

    console.log("\n  resize real image 2× upscale:");
    printStats("canvas vs opencv", stats);

    expect(stats.maxDiff).toBeLessThanOrEqual(10);
  });
});

// ─── border ──────────────────────────────────────────────────────────────────

describe("border: canvas-native vs OpenCV", () => {
  test("white border size=10 — real image", async () => {
    const file = Bun.file("./assets/receipt.jpg");
    const src = await CanvasProcessor.prepareCanvas(await file.arrayBuffer());

    const cpResult = new CanvasProcessor(src).border({ size: 10, color: "white" }).toCanvas();

    const srcCopy = copyToCanvas(src);
    // OpenCV borderColor is [B, G, R, A] for BORDER_CONSTANT on a BGRA mat,
    // but the canvas input is RGBA, so [255,255,255,255] = white in practice
    const ocvResult = new ImageProcessor(srcCopy)
      .border({
        size: 10,
        borderType: 0 /* BORDER_CONSTANT */,
        borderColor: [255, 255, 255, 255],
      })
      .toCanvas();

    // Dimensions must match
    expect(cpResult.width).toBe(ocvResult.width);
    expect(cpResult.height).toBe(ocvResult.height);

    const stats = compareRGB(await getPixels(cpResult), await getPixels(ocvResult));

    console.log("\n  border size=10 white:");
    printStats("canvas vs opencv", stats);

    // No interpolation — border pixels should be identical
    expect(stats.maxDiff).toBe(0);
  });
});

// ─── rotate ──────────────────────────────────────────────────────────────────

describe("rotate: canvas-native vs OpenCV", () => {
  test("0° rotation — identical", async () => {
    const file = Bun.file("./assets/receipt.jpg");
    const src = await CanvasProcessor.prepareCanvas(await file.arrayBuffer());

    const cpResult = new CanvasProcessor(src).rotate({ angle: 0 }).toCanvas();

    const srcCopy = copyToCanvas(src);
    const ocvResult = new ImageProcessor(srcCopy).rotate({ angle: 0 }).toCanvas();

    const stats = compareRGB(await getPixels(cpResult), await getPixels(ocvResult));

    console.log("\n  rotate 0°:");
    printStats("canvas vs opencv", stats);

    expect(stats.maxDiff).toBe(0);
  });

  test("15° rotation — centre region statistics", async () => {
    // Note: canvas ctx.rotate uses anti-aliasing by default; OpenCV warpAffine
    // uses plain bilinear without AA. This causes visible pixel differences
    // especially at high angles. 15° is a realistic deskew-like angle.
    const file = Bun.file("./assets/receipt.jpg");
    const original = await CanvasProcessor.prepareCanvas(await file.arrayBuffer());
    const src = createCanvas(200, 200);
    src.getContext("2d").putImageData(original.getContext("2d").getImageData(0, 0, 200, 200), 0, 0);

    const cpResult = new CanvasProcessor(src).rotate({ angle: 15 }).toCanvas();

    const srcCopy = createCanvas(200, 200);
    srcCopy.getContext("2d").drawImage(src, 0, 0);
    const ocvResult = new ImageProcessor(srcCopy).rotate({ angle: 15 }).toCanvas();

    // Compare only the inner 50% to avoid border fill differences
    const cx = 50,
      cy = 50,
      cw = 100,
      ch = 100;
    const cpInner = cpResult.getContext("2d").getImageData(cx, cy, cw, ch)
      .data as Uint8ClampedArray;
    const ocvInner = ocvResult.getContext("2d").getImageData(cx, cy, cw, ch)
      .data as Uint8ClampedArray;
    const stats = compareRGB(cpInner, ocvInner);

    console.log("\n  rotate 15° (inner 50% of 200×200):");
    printStats("canvas vs opencv", stats);

    // Canvas AA vs OpenCV bilinear — small but real difference
    expect(stats.maxDiff).toBeLessThanOrEqual(20);
  });
});

// ─── combined chain ───────────────────────────────────────────────────────────

describe("chain: resize → grayscale", () => {
  test("combined pipeline statistics", async () => {
    const file = Bun.file("./assets/receipt.jpg");
    const src = await CanvasProcessor.prepareCanvas(await file.arrayBuffer());

    const targetW = Math.floor(src.width / 2);
    const targetH = Math.floor(src.height / 2);

    const cpResult = new CanvasProcessor(src)
      .resize({ width: targetW, height: targetH })
      .grayscale()
      .toCanvas();

    const srcCopy = copyToCanvas(src);
    const ocvResult = new ImageProcessor(srcCopy)
      .resize({ width: targetW, height: targetH })
      .grayscale()
      .toCanvas();

    const stats = compareRGB(await getPixels(cpResult), await getPixels(ocvResult));

    console.log("\n  resize → grayscale chain:");
    printStats("canvas vs opencv", stats);

    // Combined interpolation + luma rounding — allow slightly wider tolerance
    expect(stats.maxDiff).toBeLessThanOrEqual(6);
  });
});
