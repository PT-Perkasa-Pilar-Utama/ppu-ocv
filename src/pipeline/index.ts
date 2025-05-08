export { executeOperation, OperationRegistry, registry } from "./registry";
export type {
  OperationFunction,
  OperationName,
  OperationOptions,
  OperationResult,
  PartialOptions,
  RegisteredOperations,
  RequiredOptions,
} from "./types";

import "../operations/adaptive-threshold";
import "../operations/blur";
import "../operations/border";
import "../operations/canny";
import "../operations/convert";
import "../operations/dilate";
import "../operations/erode";
import "../operations/grayscale";
import "../operations/invert";
import "../operations/morphological-gradient";
import "../operations/resize";
import "../operations/threshold";
import "../operations/warp";

export type { AdaptiveThresholdOptions } from "../operations/adaptive-threshold";
export type { BlurOptions } from "../operations/blur";
export type { BorderOptions } from "../operations/border";
export type { CannyOptions } from "../operations/canny";
export type { ConvertOptions } from "../operations/convert";
export type { DilateOptions } from "../operations/dilate";
export type { ErodeOptions } from "../operations/erode";
export type { GrayscaleOptions } from "../operations/grayscale";
export type { InvertOptions } from "../operations/invert";
export type { MorphologicalGradientOptions } from "../operations/morphological-gradient";
export type { ResizeOptions } from "../operations/resize";
export type { ThresholdOptions } from "../operations/threshold";
export type { WarpOptions } from "../operations/warp";
