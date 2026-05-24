// SPDX-License-Identifier: MIT
// Copyright (c) 2026 PT Perkasa Pilar Utama

/**
 * Web entry point — browsers with OpenCV + DOM canvas.
 *
 * Use this when you need the full image-processing pipeline in a browser.
 * Canvas operations target `HTMLCanvasElement` / `OffscreenCanvas` instead
 * of `@napi-rs/canvas`. OpenCV is loaded via `ImageProcessor.initRuntime()`
 * — either from the bundled `@techstark/opencv-js` or from jsDelivr CDN
 * when no bundler is in play.
 *
 * Not suitable for Manifest V3 Chrome extensions or other CSP-restricted
 * runtimes — OpenCV.js uses Emscripten embind which calls `new Function`.
 * For those environments, import `ppu-ocv/canvas-web` (no OpenCV).
 *
 * @example
 * ```ts
 * import { ImageProcessor, CanvasProcessor } from "ppu-ocv/web";
 *
 * await ImageProcessor.initRuntime();
 * const canvas = await CanvasProcessor.prepareCanvas(await response.arrayBuffer());
 * const result = new ImageProcessor(canvas).grayscale().toCanvas();
 * ```
 *
 * @module
 */
import { cv } from "./cv-provider.js";
export { cv };

import { setPlatform } from "./canvas-factory.js";
import { webPlatform } from "./platform/web.js";
setPlatform(webPlatform);

export { getPlatform, setPlatform } from "./canvas-factory.js";
export type { CanvasLike, CanvasPlatform, Context2DLike } from "./canvas-factory.js";
export { webPlatform } from "./platform/web.js";

export type { BoundingBox, Coordinate, Points } from "./index.interface.js";
export { executeOperation, OperationRegistry, registry } from "./pipeline/index.js";

export {
  CanvasToolkitBase as CanvasToolkit,
  CanvasToolkitBase,
  type ContourLike,
} from "./canvas-toolkit.base.js";
export { CanvasProcessor, type DetectedRegion } from "./canvas-processor.js";
export { Contours } from "./contours.js";
export {
  calculateMeanGrayscaleValue,
  calculateMeanNormalizedLabLightness,
  type CalculateMeanLightnessOptions,
} from "./image-analysis.js";
export { ImageProcessor } from "./image-processor.js";
export { DeskewService, type DeskewOptions } from "./deskew.js";

export type {
  AdaptiveThresholdOptions,
  BlurOptions,
  BorderOptions,
  CannyOptions,
  DilateOptions,
  EqualizeOptions,
  ErodeOptions,
  GrayscaleOptions,
  InvertOptions,
  MorphologicalGradientOptions,
  OperationFunction,
  OperationName,
  OperationOptions,
  OperationResult,
  PartialOptions,
  RegisteredOperations,
  RequiredOptions,
  ResizeOptions,
  RotateOptions,
  ThresholdOptions,
  WarpOptions,
} from "./pipeline/index.js";
