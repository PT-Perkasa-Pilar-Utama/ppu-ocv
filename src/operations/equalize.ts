import type { OperationResult, PartialOptions } from "../pipeline/types.js";
import { cv } from "../cv-provider.js";
import { registry } from "../pipeline/registry.js";

/** Options for the histogram equalization operation. */
export type EqualizeOptions = PartialOptions & {
  /**
   * Equalization algorithm to use.
   * - `"clahe"` (default) — Contrast Limited Adaptive Histogram Equalization;
   *   preserves local contrast and avoids over-amplification in bright regions.
   * - `"global"` — Standard global histogram equalization via `cv.equalizeHist`;
   *   faster but may blow out highlights.
   */
  method: "clahe" | "global";
  /**
   * CLAHE only — clip limit for contrast limiting (default `2.0`).
   * Higher values allow more contrast; lower values are closer to global equalization.
   */
  clipLimit: number;
  /**
   * CLAHE only — tile grid size in pixels (default `8` → 8×8 tiles).
   * The image is divided into this many tiles in each dimension.
   */
  tileGridSize: number;
};

function defaultOptions(): EqualizeOptions {
  return {
    method: "clahe",
    clipLimit: 2.0,
    tileGridSize: 8,
  };
}

/**
 * Equalise histogram contrast on a single-channel (grayscale) image.
 *
 * Supports two algorithms selectable via {@link EqualizeOptions.method}:
 * - `"clahe"` (default) — locally adaptive, clip-limited equalization.
 * - `"global"` — standard whole-image histogram spreading.
 *
 * Input `img` must be an 8-bit single-channel `cv.Mat` (run `.grayscale()` first).
 * The input Mat is deleted by this operation.
 */
export function equalize(img: cv.Mat, options: EqualizeOptions): OperationResult {
  const dst = new cv.Mat();

  if (options.method === "global") {
    cv.equalizeHist(img, dst);
  } else {
    // CLAHE — @techstark/opencv-js exposes this as a constructor, not cv.createCLAHE()
    const tileSize = new cv.Size(options.tileGridSize, options.tileGridSize);
    const clahe = new cv.CLAHE(options.clipLimit, tileSize);
    clahe.apply(img, dst);
    clahe.delete();
  }

  img.delete();

  return {
    img: dst,
    width: dst.cols,
    height: dst.rows,
  };
}

registry.register("equalize", equalize, defaultOptions);
