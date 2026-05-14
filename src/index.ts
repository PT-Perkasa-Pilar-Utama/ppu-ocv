/**
 * Default entry point — Node.js / Bun with OpenCV + `@napi-rs/canvas`.
 *
 * Use this when you want the full image-processing pipeline (OpenCV
 * operations like `blur`, `threshold`, `findContours`, `warp`) in a
 * server-side runtime. The OpenCV WASM is loaded on first call to
 * `ImageProcessor.initRuntime()`. Canvas operations are backed by
 * `@napi-rs/canvas` for fast native rendering.
 *
 * For browser usage, import from `ppu-ocv/web` instead. For canvas-only
 * usage (no OpenCV), see `ppu-ocv/canvas` or `ppu-ocv/canvas-web`.
 *
 * @example
 * ```ts
 * import { ImageProcessor, CanvasProcessor } from "ppu-ocv";
 *
 * await ImageProcessor.initRuntime();
 * const canvas = await CanvasProcessor.prepareCanvas(buffer);
 * const result = new ImageProcessor(canvas)
 *   .grayscale()
 *   .threshold()
 *   .toCanvas();
 * ```
 *
 * @module
 */
import _cv from "@techstark/opencv-js";
import { cv, setCv } from "./cv-provider.js";
setCv(_cv);
export { cv };

import { setPlatform } from "./canvas-factory.js";
import { nodePlatform } from "./platform/node.js";
setPlatform(nodePlatform);

export { Canvas, createCanvas, ImageData, loadImage } from "@napi-rs/canvas";
export type { SKRSContext2D } from "@napi-rs/canvas";
export type { BoundingBox, Coordinate, Points } from "./index.interface.js";
export { executeOperation, OperationRegistry, registry } from "./pipeline/index.js";

export { getPlatform, setPlatform } from "./canvas-factory.js";
export type { CanvasLike, CanvasPlatform, Context2DLike } from "./canvas-factory.js";

export { CanvasToolkitBase, type ContourLike } from "./canvas-toolkit.base.js";
export { CanvasToolkit } from "./canvas-toolkit.js";
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
