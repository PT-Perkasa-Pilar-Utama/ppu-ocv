import { setPlatform } from "./canvas-factory.js";
import { nodePlatform } from "./platform/node.js";
setPlatform(nodePlatform);

export { Canvas, createCanvas, ImageData, loadImage } from "@napi-rs/canvas";
export type { SKRSContext2D } from "@napi-rs/canvas";
export type { BoundingBox, Coordinate, Points } from "./index.interface.js";
export { getPlatform, setPlatform } from "./canvas-factory.js";
export type {
  CanvasLike,
  CanvasPlatform,
  Context2DLike,
} from "./canvas-factory.js";
export { CanvasToolkitBase, type ContourLike } from "./canvas-toolkit.base.js";
export { CanvasToolkit } from "./canvas-toolkit.js";
export { CanvasProcessor } from "./canvas-processor.js";
