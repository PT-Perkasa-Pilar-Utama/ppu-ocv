import { cv } from "./cv-provider.js";
export { cv };

import { setPlatform } from "./canvas-factory.js";
import { webPlatform } from "./platform/web.js";
setPlatform(webPlatform);

export { getPlatform, setPlatform } from "./canvas-factory.js";
export type {
  CanvasLike,
  CanvasPlatform,
  Context2DLike,
} from "./canvas-factory.js";
export { webPlatform } from "./platform/web.js";

export type { BoundingBox, Coordinate, Points } from "./index.interface.js";
export {
  executeOperation,
  OperationRegistry,
  registry,
} from "./pipeline/index.js";

export {
  CanvasToolkitBase as CanvasToolkit,
  CanvasToolkitBase,
} from "./canvas-toolkit.base.js";
export { Contours } from "./contours.js";
export {
  calculateMeanGrayscaleValue,
  calculateMeanNormalizedLabLightness,
  type CalculateMeanLightnessOptions,
} from "./image-analysis.js";
export { ImageProcessor } from "./image-processor.js";

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
