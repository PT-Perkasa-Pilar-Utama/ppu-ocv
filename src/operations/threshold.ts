import cv, { type ThresholdTypes } from "@techstark/opencv-js";

import { registry } from "@/pipeline/registry";
import type { BaseOperationOptions, OperationResult } from "@/pipeline/types";

export interface ThresholdOptions extends BaseOperationOptions {
  /** Lower threshold value (0-255) */
  lower: number;
  /** Upper threshold value (0-255) */
  upper: number;
  /** Type of thresholding (cv.THRESH_...) */
  type: ThresholdTypes;
}

export const defaultOptions: ThresholdOptions = {
  lower: 0,
  upper: 255,
  type: cv.THRESH_BINARY_INV + cv.THRESH_OTSU,
};

export function threshold(
  img: cv.Mat,
  options: Partial<ThresholdOptions> = {}
): OperationResult {
  const opts: ThresholdOptions = {
    ...defaultOptions,
    ...options,
  };

  const imgThreshold = new cv.Mat();

  cv.threshold(img, imgThreshold, opts.min, opts.max, opts.type);
  img.delete();

  return {
    img: imgThreshold,
    width: imgThreshold.cols,
    height: imgThreshold.rows,
  };
}

registry.register("threshold", threshold, defaultOptions);
