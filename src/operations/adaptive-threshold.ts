import cv, {
  type AdaptiveThresholdTypes,
  type ThresholdTypes,
} from "@techstark/opencv-js";

import { registry } from "@/pipeline/registry";
import type { BaseOperationOptions, OperationResult } from "@/pipeline/types";

export interface AdaptiveThresholdOptions extends BaseOperationOptions {
  /** Upper threshold value (0-255) */
  upper: number;
  /** Adaptive threshold method (cv.ADAPTIVE_THRESH_...) */
  method: AdaptiveThresholdTypes;
  /** Type of thresholding (cv.THRESH_...) */
  type: ThresholdTypes;
  /** Block size for adaptive thresholding (must be odd) */
  size: number;
  /** Constant subtracted from the mean or weighted mean */
  constant: number;
}

export const defaultOptions: AdaptiveThresholdOptions = {
  upper: 255,
  method: cv.ADAPTIVE_THRESH_GAUSSIAN_C,
  type: cv.THRESH_BINARY_INV,
  size: 7,
  constant: 2,
};

export function adaptiveThreshold(
  img: cv.Mat,
  options: Partial<AdaptiveThresholdOptions> = {}
): OperationResult {
  const opts: AdaptiveThresholdOptions = {
    ...defaultOptions,
    ...options,
  };

  const imgAdaptiveThreshold = new cv.Mat();

  cv.adaptiveThreshold(
    img,
    imgAdaptiveThreshold,
    opts.max,
    opts.method,
    opts.type,
    opts.size,
    opts.constant
  );
  img.delete();

  return {
    img: imgAdaptiveThreshold,
    width: imgAdaptiveThreshold.cols,
    height: imgAdaptiveThreshold.rows,
  };
}

registry.register("adaptiveThreshold", adaptiveThreshold, defaultOptions);
