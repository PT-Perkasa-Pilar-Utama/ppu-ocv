import type { OperationResult, PartialOptions } from "@/index";
import { cv, registry } from "@/index";

declare module "@/pipeline/types" {
  interface RegisteredOperations {
    threshold: ThresholdOptions;
  }
}

export interface ThresholdOptions extends PartialOptions {
  /** Lower threshold value (0-255) */
  lower: number;
  /** Upper threshold value (0-255) */
  upper: number;
  /** Type of thresholding (cv.THRESH_...) */
  type: cv.ThresholdTypes;
}

function defaultOptions(): ThresholdOptions {
  return {
    lower: 0,
    upper: 255,
    type: cv.THRESH_BINARY_INV + cv.THRESH_OTSU,
  };
}

export function threshold(
  img: cv.Mat,
  options: ThresholdOptions
): OperationResult {
  const imgThreshold = new cv.Mat();
  cv.threshold(img, imgThreshold, options.lower, options.upper, options.type);
  img.delete();

  return {
    img: imgThreshold,
    width: imgThreshold.cols,
    height: imgThreshold.rows,
  };
}

registry.register("threshold", threshold, defaultOptions);
