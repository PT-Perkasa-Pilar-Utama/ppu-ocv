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
export {
  executeOperation,
  OperationRegistry,
  registry,
} from "./pipeline/index.js";

export { getPlatform, setPlatform } from "./canvas-factory.js";
export type {
  CanvasLike,
  CanvasPlatform,
  Context2DLike,
} from "./canvas-factory.js";

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
