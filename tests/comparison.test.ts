/**
 * Comparison tests: CanvasProcessor (canvas-native) vs ImageProcessor (OpenCV)
 *
 * These tests are NOT checking for pixel-perfect equality — the two
 * implementations use different arithmetic and interpolation paths.
 * Instead they measure the actual fidelity gap so you can make an informed
 * decision about whether canvas-native is a suitable drop-in for your use case.
 *
 * Reported stats per comparison:
 *   exactMatch  — pixels where both implementations produce the same value
 *   maxDiff     — worst-case absolute difference across all pixels/channels
 *   meanDiff    — average absolute difference
 */

import { beforeAll, describe, expect, test } from "bun:test";
import { CanvasProcessor } from "../src/canvas-processor.js";
import { ImageProcessor } from "../src/image-processor.js";
import { Contours } from "../src/contours.js";
import { cv } from "../src/cv-provider.js";
import type { BoundingBox } from "../src/index.interface.js";
import { setPlatform } from "../src/canvas-factory.js";
import { nodePlatform } from "../src/platform/node.js";
import { createCanvas } from "@napi-rs/canvas";

// ─── helpers ────────────────────────────────────────────────────────────────

interface PixelStats {
  totalPixels: number;
  exactMatch: number;
  exactMatchPct: string;
  maxDiff: number;
  meanDiff: string;
}

function compareRGB(a: Uint8ClampedArray, b: Uint8ClampedArray): PixelStats {
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
      const diff = Math.abs(a[i + c]! - b[i + c]!);
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
    exactMatchPct: ((exactMatch / totalPixels) * 100).toFixed(2) + "%",
    maxDiff,
    meanDiff: (sumDiff / comparisons).toFixed(4),
  };
}

function printStats(label: string, stats: PixelStats) {
  console.log(
    `  [${label}] exact: ${stats.exactMatchPct} of ${stats.totalPixels}px` +
      `  maxDiff: ${stats.maxDiff}  meanDiff: ${stats.meanDiff}`,
  );
}

async function getPixels(canvas: { width: number; height: number; getContext: any }) {
  return canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height)
    .data as Uint8ClampedArray;
}

// ─── setup ───────────────────────────────────────────────────────────────────

beforeAll(async () => {
  setPlatform(nodePlatform);
  await ImageProcessor.initRuntime();
});

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
    console.log(`    diff: ${Math.abs(cp[0]! - oc[0]!)}`);

    // Both implement BT.601; diff should be 0 or 1 due to rounding
    expect(Math.abs(cp[0]! - oc[0]!)).toBeLessThanOrEqual(1);
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
    console.log(`    diff: ${Math.abs(cp[0]! - oc[0]!)}`);

    expect(Math.abs(cp[0]! - oc[0]!)).toBeLessThanOrEqual(1);
  });

  test("real image — per-pixel statistics", async () => {
    const file = Bun.file("./assets/receipt.jpg");
    const src = await CanvasProcessor.prepareCanvas(await file.arrayBuffer());

    const cpResult = new CanvasProcessor(src).grayscale().toCanvas();

    const srcCopy = createCanvas(src.width, src.height);
    srcCopy.getContext("2d").drawImage(src, 0, 0);
    const ocvResult = new ImageProcessor(srcCopy).grayscale().toCanvas();

    const stats = compareRGB(
      await getPixels(cpResult),
      await getPixels(ocvResult),
    );

    console.log("\n  grayscale — real image:");
    printStats("canvas vs opencv", stats);

    // Virtually all pixels should match within ±1 (rounding-only difference)
    expect(stats.maxDiff).toBeLessThanOrEqual(1);
    expect(parseFloat(stats.meanDiff)).toBeLessThan(0.5);
  });
});

// ─── resize ──────────────────────────────────────────────────────────────────

describe("resize: canvas-native vs OpenCV", () => {
  test("downscale 2× — solid colour (no interpolation ambiguity)", async () => {
    // A solid colour canvas should downscale to the same colour regardless of
    // the interpolation implementation.
    const src = createCanvas(100, 100);
    src.getContext("2d").fillStyle = "#4287f5";
    src.getContext("2d").fillRect(0, 0, 100, 100);

    const cpResult = new CanvasProcessor(src)
      .resize({ width: 50, height: 50 })
      .toCanvas();

    const srcCopy = createCanvas(100, 100);
    srcCopy.getContext("2d").drawImage(src, 0, 0);
    const ocvResult = new ImageProcessor(srcCopy)
      .resize({ width: 50, height: 50 })
      .toCanvas();

    const stats = compareRGB(
      await getPixels(cpResult),
      await getPixels(ocvResult),
    );

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

    const srcCopy = createCanvas(src.width, src.height);
    srcCopy.getContext("2d").drawImage(src, 0, 0);
    const ocvResult = new ImageProcessor(srcCopy)
      .resize({ width: targetW, height: targetH })
      .toCanvas();

    const stats = compareRGB(
      await getPixels(cpResult),
      await getPixels(ocvResult),
    );

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
    src.getContext("2d").drawImage(original, 0, 0, 100, 100, 0, 0, 100, 100);

    const cpResult = new CanvasProcessor(src)
      .resize({ width: 200, height: 200 })
      .toCanvas();

    const srcCopy = createCanvas(100, 100);
    srcCopy.getContext("2d").drawImage(src, 0, 0);
    const ocvResult = new ImageProcessor(srcCopy)
      .resize({ width: 200, height: 200 })
      .toCanvas();

    const stats = compareRGB(
      await getPixels(cpResult),
      await getPixels(ocvResult),
    );

    console.log("\n  resize real image 2× upscale:");
    printStats("canvas vs opencv", stats);

    expect(stats.maxDiff).toBeLessThanOrEqual(10);
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

    const srcCopy = createCanvas(src.width, src.height);
    srcCopy.getContext("2d").drawImage(src, 0, 0);
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
    const srcCopy = createCanvas(src.width, src.height);
    srcCopy.getContext("2d").drawImage(src, 0, 0);
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

// ─── border ──────────────────────────────────────────────────────────────────

describe("border: canvas-native vs OpenCV", () => {
  test("white border size=10 — real image", async () => {
    const file = Bun.file("./assets/receipt.jpg");
    const src = await CanvasProcessor.prepareCanvas(await file.arrayBuffer());

    const cpResult = new CanvasProcessor(src)
      .border({ size: 10, color: "white" })
      .toCanvas();

    const srcCopy = createCanvas(src.width, src.height);
    srcCopy.getContext("2d").drawImage(src, 0, 0);
    // OpenCV borderColor is [B, G, R, A] for BORDER_CONSTANT on a BGRA mat,
    // but the canvas input is RGBA, so [255,255,255,255] = white in practice
    const ocvResult = new ImageProcessor(srcCopy)
      .border({ size: 10, borderType: 0 /* BORDER_CONSTANT */, borderColor: [255, 255, 255, 255] })
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

    const srcCopy = createCanvas(src.width, src.height);
    srcCopy.getContext("2d").drawImage(src, 0, 0);
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
    src.getContext("2d").drawImage(original, 0, 0, 200, 200, 0, 0, 200, 200);

    const cpResult = new CanvasProcessor(src).rotate({ angle: 15 }).toCanvas();

    const srcCopy = createCanvas(200, 200);
    srcCopy.getContext("2d").drawImage(src, 0, 0);
    const ocvResult = new ImageProcessor(srcCopy).rotate({ angle: 15 }).toCanvas();

    // Compare only the inner 50% to avoid border fill differences
    const cx = 50, cy = 50, cw = 100, ch = 100;
    const cpInner = cpResult.getContext("2d").getImageData(cx, cy, cw, ch).data as Uint8ClampedArray;
    const ocvInner = ocvResult.getContext("2d").getImageData(cx, cy, cw, ch).data as Uint8ClampedArray;
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

    const srcCopy = createCanvas(src.width, src.height);
    srcCopy.getContext("2d").drawImage(src, 0, 0);
    const ocvResult = new ImageProcessor(srcCopy)
      .resize({ width: targetW, height: targetH })
      .grayscale()
      .toCanvas();

    const stats = compareRGB(
      await getPixels(cpResult),
      await getPixels(ocvResult),
    );

    console.log("\n  resize → grayscale chain:");
    printStats("canvas vs opencv", stats);

    // Combined interpolation + luma rounding — allow slightly wider tolerance
    expect(stats.maxDiff).toBeLessThanOrEqual(6);
  });
});

// ─── findRegions vs OpenCV Contours ──────────────────────────────────────────

describe("findRegions: canvas-native vs OpenCV Contours", () => {
  /**
   * Compares CanvasProcessor.findRegions() against OpenCV RETR_LIST
   * on a pre-binarised image (white regions on black background).
   *
   * OpenCV pipeline mirrors the production usage:
   *   Contours(mat, { mode: RETR_LIST, method: CHAIN_APPROX_SIMPLE })
   *   → filter by rect.width * rect.height > minBoxArea
   *   → convert rect to BoundingBox
   *
   * Canvas pipeline:
   *   findRegions({ foreground: "light", minArea: minBoxArea + 1 })
   *   (pixel-area filter is slightly different from bbox-area filter, but for
   *   solid rectangular regions they are equivalent)
   */
  test("binary-text-detection.png — count and bbox fidelity", async () => {
    const MIN_BOX_AREA = 20;

    const file = Bun.file("./assets/binary-text-detection.png");
    const src = await CanvasProcessor.prepareCanvas(await file.arrayBuffer());

    // ── Canvas side ──────────────────────────────────────────────────────────
    const canvasRegions = new CanvasProcessor(src).findRegions({
      foreground: "light",
      minArea: MIN_BOX_AREA + 1,
    });

    // ── OpenCV side ──────────────────────────────────────────────────────────
    const srcCopy = createCanvas(src.width, src.height);
    srcCopy.getContext("2d").drawImage(src, 0, 0);

    const mat = new ImageProcessor(srcCopy).grayscale().toMat();
    // RETR_EXTERNAL retrieves only outer contours — conceptually equivalent to
    // flood-fill connected components (which also finds outer regions, not holes).
    // Production code that uses RETR_LIST will receive additional inner contours
    // for any white region that contains a dark hole; findRegions counts such a
    // region as one connected component regardless of interior holes.
    const contours = new Contours(mat, {
      mode: cv.RETR_EXTERNAL,
      method: cv.CHAIN_APPROX_SIMPLE,
    });

    const ocvRegions: { bbox: BoundingBox; bboxArea: number }[] = [];
    contours.iterate((contour) => {
      const rect = contours.getRect(contour);
      const bboxArea = rect.width * rect.height;
      const pixelArea = cv.contourArea(contour);
      // Use pixel area for the filter to match findRegions' minArea semantics
      if (pixelArea > MIN_BOX_AREA) {
        ocvRegions.push({
          bbox: {
            x0: rect.x,
            y0: rect.y,
            x1: rect.x + rect.width,
            y1: rect.y + rect.height,
          },
          bboxArea,
        });
      }
    });
    contours.destroy();
    mat.delete();

    console.log(`\n  binary-text-detection.png (minArea=${MIN_BOX_AREA}):`);
    console.log(`    canvas findRegions: ${canvasRegions.length} regions`);
    console.log(`    OpenCV Contours:    ${ocvRegions.length} contours`);

    // ── Match regions by IoU ──────────────────────────────────────────────────
    // Both algorithms may produce slightly different counts because:
    // - 8-connected DFS merges regions that only touch diagonally into one
    //   connected component, while OpenCV contour tracing can keep them separate.
    // - Boundary pixels sampled by findContours vs flood-fill can differ by ±1px.
    //
    // We accept up to 3 unmatched regions and measure IoU on matched pairs.

    const iou = (a: BoundingBox, b: BoundingBox): number => {
      const ix0 = Math.max(a.x0, b.x0);
      const iy0 = Math.max(a.y0, b.y0);
      const ix1 = Math.min(a.x1, b.x1);
      const iy1 = Math.min(a.y1, b.y1);
      if (ix1 <= ix0 || iy1 <= iy0) return 0;
      const inter = (ix1 - ix0) * (iy1 - iy0);
      const areaA = (a.x1 - a.x0) * (a.y1 - a.y0);
      const areaB = (b.x1 - b.x0) * (b.y1 - b.y0);
      return inter / (areaA + areaB - inter);
    };

    // Greedy match: for each canvas region find the best-IoU OpenCV counterpart
    const matched: { canvasIdx: number; ocvIdx: number; iou: number }[] = [];
    const usedOcv = new Set<number>();

    for (let ci = 0; ci < canvasRegions.length; ci++) {
      let bestIou = 0;
      let bestOi = -1;
      for (let oi = 0; oi < ocvRegions.length; oi++) {
        if (usedOcv.has(oi)) continue;
        const score = iou(canvasRegions[ci]!.bbox, ocvRegions[oi]!.bbox);
        if (score > bestIou) {
          bestIou = score;
          bestOi = oi;
        }
      }
      if (bestOi >= 0 && bestIou > 0.5) {
        matched.push({ canvasIdx: ci, ocvIdx: bestOi, iou: bestIou });
        usedOcv.add(bestOi);
      }
    }

    const unmatchedCanvas = canvasRegions.length - matched.length;
    const unmatchedOcv = ocvRegions.length - matched.length;
    const meanIou =
      matched.reduce((s, m) => s + m.iou, 0) / (matched.length || 1);

    console.log(`    matched pairs: ${matched.length}`);
    console.log(`    unmatched canvas: ${unmatchedCanvas}  unmatched ocv: ${unmatchedOcv}`);
    console.log(`    mean IoU of matched pairs: ${(meanIou * 100).toFixed(2)}%`);

    // Most regions should match — at most 3 unmatched from either side
    expect(unmatchedCanvas).toBeLessThanOrEqual(3);
    expect(unmatchedOcv).toBeLessThanOrEqual(3);

    // Matched regions should have high IoU.
    // Note: many regions in this image are thin horizontal stripes (~10px tall),
    // so even a 1px boundary shift noticeably reduces IoU (a 1px shift on a 10px
    // strip is a 10% relative error). 0.85 is a realistic lower bound.
    expect(meanIou).toBeGreaterThanOrEqual(0.85);
  });
});
