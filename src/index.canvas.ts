/**
 * Canvas-only entry point — Node.js / Bun, no OpenCV dependency.
 *
 * Use this when you only need canvas I/O (loading, saving, cropping,
 * drawing) and the connected-component / threshold helpers exposed by
 * `CanvasProcessor`. OpenCV is **never imported or initialised**, so the
 * import is much lighter and side-effect-free with respect to WASM.
 *
 * Targets `@napi-rs/canvas` natively, so it works in Node, Bun, and any
 * runtime that ships `@napi-rs/canvas` bindings. For the browser-side
 * equivalent, see `ppu-ocv/canvas-web`.
 *
 * @example
 * ```ts
 * import { CanvasProcessor, CanvasToolkit } from "ppu-ocv/canvas";
 *
 * const canvas = await CanvasProcessor.prepareCanvas(buffer);
 * const cropped = CanvasToolkit.getInstance().crop({
 *   canvas,
 *   bbox: { x0: 10, y0: 10, x1: 100, y1: 100 },
 * });
 * ```
 *
 * @module
 */
import { setPlatform } from "./canvas-factory.js";
import { nodePlatform } from "./platform/node.js";
setPlatform(nodePlatform);

export { Canvas, createCanvas, ImageData, loadImage } from "@napi-rs/canvas";
export type { SKRSContext2D } from "@napi-rs/canvas";
export type { BoundingBox, Coordinate, Points } from "./index.interface.js";
export { getPlatform, setPlatform } from "./canvas-factory.js";
export type { CanvasLike, CanvasPlatform, Context2DLike } from "./canvas-factory.js";
export { CanvasToolkitBase, type ContourLike } from "./canvas-toolkit.base.js";
export { CanvasToolkit } from "./canvas-toolkit.js";
export { CanvasProcessor, type DetectedRegion } from "./canvas-processor.js";
