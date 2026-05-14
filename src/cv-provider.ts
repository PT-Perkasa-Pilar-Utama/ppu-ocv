/**
 * Lazy OpenCV accessor.
 *
 * In Node (with @techstark/opencv-js installed), `cv` is available after
 * `import cv from "@techstark/opencv-js"`.
 *
 * In the browser, `cv` is set on `globalThis` after OpenCV.js is loaded
 * (either via a <script> tag or dynamically by `initRuntime()`).
 *
 * This module re-exports `cv` as a lazy proxy so that static `import`
 * resolution does NOT require `@techstark/opencv-js` to be present
 * as a resolvable bare specifier at module-load time.
 */

import type _cvType from "@techstark/opencv-js";

type CV = typeof _cvType;

let _cv: CV | null = null;

function getCv(): CV {
  if (_cv) return _cv;
  if (typeof globalThis !== "undefined" && (globalThis as { cv?: CV }).cv) {
    _cv = (globalThis as { cv?: CV }).cv || null;
    // _cv is guaranteed non-null by the truthy check above
    return _cv as CV;
  }
  throw new Error("OpenCV is not loaded. Call ImageProcessor.initRuntime() first.");
}

/**
 * Set the cv instance (called by platform entry points).
 */
export function setCv(instance: CV): void {
  _cv = instance;
  // Also make it globally available
  if (typeof globalThis !== "undefined") {
    (globalThis as { cv?: typeof instance }).cv = instance;
  }
}

/**
 * Return the raw cv module if it was already registered via `setCv`, or
 * `null` otherwise. Used by `ImageProcessor.initRuntime` to avoid a second
 * dynamic import of `@techstark/opencv-js` — re-importing the module in
 * Bun causes Emscripten's embind to run its registration callbacks twice
 * and throw `BindingError: Cannot register public name ... twice`.
 */
export function getRawCv(): CV | null {
  return _cv;
}

/**
 * TypeScript Declaration Merging:
 * By exporting both a `namespace cv` and a `const cv`, consumers importing `{ cv }`
 * get BOTH the types (e.g. `cv.Mat`) AND the runtime Proxy object.
 */
export namespace cv {
  /** OpenCV Mat (matrix / image buffer). */
  export type Mat = _cvType.Mat;
  /** A vector of Mat objects, used for contours. */
  export type MatVector = _cvType.MatVector;
  /** A 2D point `{ x, y }`. */
  export type Point = _cvType.Point;
  /** An axis-aligned rectangle `{ x, y, width, height }`. */
  export type Rect = _cvType.Rect;
  /** A 2D size `{ width, height }`. */
  export type Size = _cvType.Size;
  /** A 4-element scalar value, often used for colors `[b, g, r, a]`. */
  export type Scalar = _cvType.Scalar;
  /** Adaptive thresholding method constants (e.g., `cv.ADAPTIVE_THRESH_GAUSSIAN_C`). */
  export type AdaptiveThresholdTypes = _cvType.AdaptiveThresholdTypes;
  /** Thresholding type constants (e.g., `cv.THRESH_BINARY`). */
  export type ThresholdTypes = _cvType.ThresholdTypes;
  /** Line type constants (e.g., `cv.LINE_8`). */
  export type LineTypes = _cvType.LineTypes;
  /** Contour retrieval mode constants (e.g., `cv.RETR_EXTERNAL`). */
  export type RetrievalModes = _cvType.RetrievalModes;
  /** Contour approximation method constants (e.g., `cv.CHAIN_APPROX_SIMPLE`). */
  export type ContourApproximationModes = _cvType.ContourApproximationModes;
  /** Border type constants (e.g., `cv.BORDER_CONSTANT`). */
  export type BorderTypes = _cvType.BorderTypes;
  /** Interpolation flag constants (e.g., `cv.INTER_LINEAR`). */
  export type InterpolationFlags = _cvType.InterpolationFlags;
  /** Color conversion code constants (e.g., `cv.COLOR_RGBA2GRAY`). */
  export type ColorConversionCodes = _cvType.ColorConversionCodes;
  /** Morphological structuring element shape constants (e.g., `cv.MORPH_RECT`). */
  export type MorphShapes = _cvType.MorphShapes;
  /** Morphological operation type constants (e.g., `cv.MORPH_GRADIENT`). */
  export type MorphTypes = _cvType.MorphTypes;
  /** Integer alias — opencv-js represents `int` as a plain `number`. */
  export type int = number; // int is just an alias for number in opencv-js
}

/**
 * Lazy proxy for the OpenCV runtime.
 * Access any OpenCV constant or constructor (e.g. `cv.Mat`, `cv.RETR_EXTERNAL`)
 * through this object. The underlying instance is resolved on first access,
 * so importing this module never throws at module-load time — only when a
 * property is actually accessed before {@link ImageProcessor.initRuntime} has run.
 */
export const cv: CV = new Proxy({} as CV, {
  get(_target, prop) {
    // Special handling: allow typeof checks before init
    if (prop === Symbol.toPrimitive || prop === Symbol.toStringTag) {
      return undefined;
    }
    return (getCv() as unknown as Record<string | symbol, unknown>)[prop];
  },
  set(_target, prop, value) {
    (getCv() as unknown as Record<string | symbol, unknown>)[prop] = value;
    return true;
  },
  has(_target, prop) {
    try {
      return prop in getCv();
    } catch {
      return false;
    }
  },
});
