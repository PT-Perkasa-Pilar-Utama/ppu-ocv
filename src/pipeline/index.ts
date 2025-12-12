export { executeOperation, OperationRegistry, registry } from "./registry.js";
export type {
  OperationFunction,
  OperationName,
  OperationOptions,
  OperationResult,
  PartialOptions,
  RegisteredOperations,
  RequiredOptions,
} from "./types.js";

import "../operations/adaptive-threshold.js";
import "../operations/blur.js";
import "../operations/border.js";
import "../operations/canny.js";
import "../operations/convert.js";
import "../operations/dilate.js";
import "../operations/erode.js";
import "../operations/grayscale.js";
import "../operations/invert.js";
import "../operations/morphological-gradient.js";
import "../operations/resize.js";
import "../operations/rotate.js";
import "../operations/threshold.js";
import "../operations/warp.js";

export type { AdaptiveThresholdOptions } from "../operations/adaptive-threshold.js";
export type { BlurOptions } from "../operations/blur.js";
export type { BorderOptions } from "../operations/border.js";
export type { CannyOptions } from "../operations/canny.js";
export type { ConvertOptions } from "../operations/convert.js";
export type { DilateOptions } from "../operations/dilate.js";
export type { ErodeOptions } from "../operations/erode.js";
export type { GrayscaleOptions } from "../operations/grayscale.js";
export type { InvertOptions } from "../operations/invert.js";
export type { MorphologicalGradientOptions } from "../operations/morphological-gradient.js";
export type { ResizeOptions } from "../operations/resize.js";
export type { RotateOptions } from "../operations/rotate.js";
export type { ThresholdOptions } from "../operations/threshold.js";
export type { WarpOptions } from "../operations/warp.js";
