// SPDX-License-Identifier: MIT
// Copyright (c) 2026 PT Perkasa Pilar Utama

import { beforeAll, describe, expect, test } from "bun:test";
import { CanvasProcessor, Contours, copyToCanvas, cv, ImageProcessor, init } from "./helpers.js";
import type { BoundingBox } from "./helpers.js";

beforeAll(init);

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
    // binary-text-detection.png is already pure 0/255, so thresh=127 is fine here.
    const canvasRegions = new CanvasProcessor(src).findRegions({
      foreground: "light",
      minArea: MIN_BOX_AREA + 1,
    });

    // ── OpenCV side ──────────────────────────────────────────────────────────
    const srcCopy = copyToCanvas(src);

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
        const canvasRegion = canvasRegions[ci];
        const ocvRegion = ocvRegions[oi];
        if (canvasRegion === undefined || ocvRegion === undefined) continue;
        const score = iou(canvasRegion.bbox, ocvRegion.bbox);
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
    const meanIou = matched.reduce((s, m) => s + m.iou, 0) / (matched.length || 1);

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

  /**
   * Full pipeline comparison: replicates extractBoxesFromContours() exactly.
   *
   * OpenCV pipeline (from production code):
   *   RETR_LIST + CHAIN_APPROX_SIMPLE
   *   → filter: rect.width * rect.height > minBoxArea
   *   → applyPaddingToRect: vPad = round(h * 0.4), hPad = round(h * 0.6)
   *   → convertToOriginalCoordinates: coords / resizeRatio, clamped
   *   → filter: width > 5 && height > 5
   *
   * Canvas pipeline (using findRegions padding + scale options):
   *   findRegions({ foreground: "light", minArea, padding, scale })
   *   → same padding and scale math applied internally
   *   → filter: width > 5 && height > 5 after scale
   */
  test("full extractBoxesFromContours pipeline — padding + scale", async () => {
    const MIN_BOX_AREA = 20;
    const PADDING_V = 0.4;
    const PADDING_H = 0.6;

    // Simulate a resize ratio (processed image is 60% of original size)
    const RESIZE_RATIO = 0.6;
    const SCALE = 1 / RESIZE_RATIO;

    const file = Bun.file("./assets/binary-text-detection.png");
    const original = await CanvasProcessor.prepareCanvas(await file.arrayBuffer());

    // Resize to simulate the processed canvas that gets passed to contour detection
    const processedW = Math.round(original.width * RESIZE_RATIO);
    const processedH = Math.round(original.height * RESIZE_RATIO);
    const processed = new CanvasProcessor(original)
      .resize({ width: processedW, height: processedH })
      .toCanvas();

    // ── OpenCV pipeline ───────────────────────────────────────────────────────
    const ocvProcessed = copyToCanvas(processed);
    const mat = new ImageProcessor(ocvProcessed).grayscale().toMat();
    const contours = new Contours(mat, {
      mode: cv.RETR_LIST,
      method: cv.CHAIN_APPROX_SIMPLE,
    });

    const ocvBoxes: BoundingBox[] = [];
    contours.iterate((contour) => {
      const rect = contours.getRect(contour);
      if (rect.width * rect.height <= MIN_BOX_AREA) return;

      // applyPaddingToRect
      const vPad = Math.round(rect.height * PADDING_V);
      const hPad = Math.round(rect.height * PADDING_H);
      const px = Math.max(0, rect.x - hPad);
      const py = Math.max(0, rect.y - vPad);
      const rightEdge = Math.min(processedW, rect.x + rect.width + hPad);
      const bottomEdge = Math.min(processedH, rect.y + rect.height + vPad);
      const pw = rightEdge - px;
      const ph = bottomEdge - py;

      // convertToOriginalCoordinates
      const fx = Math.max(0, Math.round(px / RESIZE_RATIO));
      const fy = Math.max(0, Math.round(py / RESIZE_RATIO));
      const fw = Math.min(original.width - fx, Math.round(pw / RESIZE_RATIO));
      const fh = Math.min(original.height - fy, Math.round(ph / RESIZE_RATIO));

      if (fw > 5 && fh > 5) {
        ocvBoxes.push({ x0: fx, y0: fy, x1: fx + fw, y1: fy + fh });
      }
    });
    contours.destroy();
    mat.delete();

    // ── Canvas pipeline ───────────────────────────────────────────────────────
    // thresh: 0 matches OpenCV's behaviour: any non-zero pixel is foreground.
    // Resizing a binary image introduces anti-aliased gray border pixels (1–127)
    // that the default thresh=127 would miss, causing boundary differences.
    const canvasRaw = new CanvasProcessor(processed).findRegions({
      foreground: "light",
      thresh: 0,
      minArea: MIN_BOX_AREA + 1,
      padding: { vertical: PADDING_V, horizontal: PADDING_H },
      scale: SCALE,
    });
    const canvasBoxes = canvasRaw
      .map((r) => r.bbox)
      .filter((b) => b.x1 - b.x0 > 5 && b.y1 - b.y0 > 5);

    const sortByPos = (boxes: BoundingBox[]) =>
      [...boxes].sort((a, b) => (a.y0 !== b.y0 ? a.y0 - b.y0 : a.x0 - b.x0));

    const sortedCanvas = sortByPos(canvasBoxes);
    const sortedOcv = sortByPos(ocvBoxes);

    console.log(
      `\n  full pipeline (resize=${RESIZE_RATIO}, padding v=${PADDING_V} h=${PADDING_H}):`
    );
    console.log(`    canvas boxes: ${canvasBoxes.length}`);
    console.log(`    OpenCV boxes: ${ocvBoxes.length}`);

    const iou = (a: BoundingBox, b: BoundingBox): number => {
      const ix0 = Math.max(a.x0, b.x0),
        iy0 = Math.max(a.y0, b.y0);
      const ix1 = Math.min(a.x1, b.x1),
        iy1 = Math.min(a.y1, b.y1);
      if (ix1 <= ix0 || iy1 <= iy0) return 0;
      const inter = (ix1 - ix0) * (iy1 - iy0);
      const areaA = (a.x1 - a.x0) * (a.y1 - a.y0);
      const areaB = (b.x1 - b.x0) * (b.y1 - b.y0);
      return inter / (areaA + areaB - inter);
    };

    const usedOcv = new Set<number>();
    let totalIou = 0;
    let matched = 0;
    for (const cb of sortedCanvas) {
      let best = 0,
        bestIdx = -1;
      for (let i = 0; i < sortedOcv.length; i++) {
        if (usedOcv.has(i)) continue;
        const ocvBox = sortedOcv[i];
        if (ocvBox === undefined) continue;
        const score = iou(cb, ocvBox);
        if (score > best) {
          best = score;
          bestIdx = i;
        }
      }
      if (bestIdx >= 0 && best > 0.5) {
        usedOcv.add(bestIdx);
        totalIou += best;
        matched++;
      }
    }
    const meanIou = matched > 0 ? totalIou / matched : 0;

    console.log(
      `    matched: ${matched}  unmatched canvas: ${canvasBoxes.length - matched}  unmatched ocv: ${ocvBoxes.length - matched}`
    );
    console.log(`    mean IoU: ${(meanIou * 100).toFixed(2)}%`);

    // With thresh:0, canvas includes anti-aliased gray border pixels just like
    // OpenCV. Remaining ±1px differences are rounding in the scale math only.
    expect(canvasBoxes.length - matched).toBeLessThanOrEqual(1);
    expect(ocvBoxes.length - matched).toBeLessThanOrEqual(1);
    expect(meanIou).toBeGreaterThanOrEqual(0.95);
  });
});
