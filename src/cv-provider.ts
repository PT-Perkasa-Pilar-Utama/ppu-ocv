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
    return _cv!;
  }
  throw new Error(
    "OpenCV is not loaded. Call ImageProcessor.initRuntime() first.",
  );
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
 * TypeScript Declaration Merging:
 * By exporting both a `namespace cv` and a `const cv`, consumers importing `{ cv }`
 * get BOTH the types (e.g. `cv.Mat`) AND the runtime Proxy object.
 */
export namespace cv {
  export type Mat = _cvType.Mat;
  export type MatVector = _cvType.MatVector;
  export type Point = _cvType.Point;
  export type Rect = _cvType.Rect;
  export type Size = _cvType.Size;
  export type Scalar = _cvType.Scalar;
  export type AdaptiveThresholdTypes = _cvType.AdaptiveThresholdTypes;
  export type ThresholdTypes = _cvType.ThresholdTypes;
  export type LineTypes = _cvType.LineTypes;
  export type RetrievalModes = _cvType.RetrievalModes;
  export type ContourApproximationModes = _cvType.ContourApproximationModes;
  export type BorderTypes = _cvType.BorderTypes;
  export type InterpolationFlags = _cvType.InterpolationFlags;
  export type ColorConversionCodes = _cvType.ColorConversionCodes;
  export type MorphShapes = _cvType.MorphShapes;
  export type MorphTypes = _cvType.MorphTypes;
  export type int = number; // int is just an alias for number in opencv-js
}

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
