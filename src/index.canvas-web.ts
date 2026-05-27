// SPDX-License-Identifier: MIT
// Copyright (c) 2026 PT Perkasa Pilar Utama

/**
 * Canvas-only entry point — browsers, no OpenCV dependency.
 *
 * Use this in Chrome Manifest V3 extensions, service workers, edge
 * runtimes, or anywhere OpenCV.js cannot run because of CSP restrictions
 * on `unsafe-eval` (Emscripten embind uses `new Function`). The canvas
 * operations target `HTMLCanvasElement` / `OffscreenCanvas`.
 *
 * Functionally equivalent to `ppu-ocv/canvas` but binds the browser
 * platform instead of `@napi-rs/canvas`.
 *
 * @example
 * ```ts
 * import { CanvasProcessor } from "ppu-ocv/canvas-web";
 *
 * const response = await fetch("/image.jpg");
 * const canvas = await CanvasProcessor.prepareCanvas(await response.arrayBuffer());
 * ```
 *
 * @module
 */
import { setPlatform } from "./canvas-factory.js";
import { webPlatform } from "./platform/web.js";
setPlatform(webPlatform);

export type { BoundingBox, Coordinate, Points } from "./index.interface.js";
export { getPlatform, setPlatform } from "./canvas-factory.js";
export type { CanvasLike, CanvasPlatform, Context2DLike } from "./canvas-factory.js";
export { webPlatform } from "./platform/web.js";
export {
  CanvasToolkitBase as CanvasToolkit,
  CanvasToolkitBase,
  type ContourLike,
} from "./canvas-toolkit.base.js";
export { CanvasProcessor, type DetectedRegion } from "./canvas-processor.js";
