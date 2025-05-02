import cv from "@techstark/opencv-js";

import { registry } from "@/pipeline/registry";
import type { BaseOperationOptions, OperationResult } from "@/pipeline/types";

export interface CannyOptions extends BaseOperationOptions {
  /** Lower threshold for the hysteresis procedure (0-255) */
  lower: number;
  /** Upper threshold for the hysteresis procedure (0-255) */
  upper: number;
}

export const defaultOptions: CannyOptions = {
  lower: 50,
  upper: 150,
};

export function canny(
  img: cv.Mat,
  options: Partial<CannyOptions> = {}
): OperationResult {
  const opts: CannyOptions = {
    ...defaultOptions,
    ...options,
  };

  const imgCanny = new cv.Mat();

  cv.Canny(img, imgCanny, opts.lower, opts.upper);
  img.delete();

  return {
    img: imgCanny,
    width: imgCanny.cols,
    height: imgCanny.rows,
  };
}

registry.register("canny", canny, defaultOptions);
