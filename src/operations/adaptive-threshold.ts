import type { OperationResult, PartialOptions } from "../index.js";
import { cv, registry } from "../index.js";

declare module "../index" {
  interface RegisteredOperations {
    adaptiveThreshold: AdaptiveThresholdOptions;
  }
}

export interface AdaptiveThresholdOptions extends PartialOptions {
  /** Upper threshold value (0-255) */
  upper: number;
  /** Adaptive threshold method (cv.ADAPTIVE_THRESH_...) */
  method: cv.AdaptiveThresholdTypes;
  /** Type of thresholding (cv.THRESH_...) */
  type: cv.ThresholdTypes;
  /** Block size for adaptive thresholding (must be odd) */
  size: number;
  /** Constant subtracted from the mean or weighted mean */
  constant: number;
}

function defaultOptions(): AdaptiveThresholdOptions {
  return {
    upper: 255,
    method: cv.ADAPTIVE_THRESH_GAUSSIAN_C,
    type: cv.THRESH_BINARY_INV,
    size: 7,
    constant: 2,
  };
}

export function adaptiveThreshold(
  img: cv.Mat,
  options: AdaptiveThresholdOptions
): OperationResult {
  const imgAdaptiveThreshold = new cv.Mat();

  cv.adaptiveThreshold(
    img,
    imgAdaptiveThreshold,
    options.upper,
    options.method,
    options.type,
    options.size,
    options.constant
  );
  img.delete();

  return {
    img: imgAdaptiveThreshold,
    width: imgAdaptiveThreshold.cols,
    height: imgAdaptiveThreshold.rows,
  };
}

registry.register("adaptiveThreshold", adaptiveThreshold, defaultOptions);
