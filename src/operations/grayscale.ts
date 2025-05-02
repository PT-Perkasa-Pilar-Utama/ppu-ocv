import cv from "@techstark/opencv-js";

import { registry } from "@/pipeline/registry";
import type { BaseOperationOptions, OperationResult } from "@/pipeline/types";

export interface GrayscaleOptions extends BaseOperationOptions {}

export const defaultOptions: GrayscaleOptions = {};

export function grayscale(
  img: cv.Mat,
  options: Partial<GrayscaleOptions> = {}
): OperationResult {
  const imgGrayscale = new cv.Mat();

  cv.cvtColor(img, imgGrayscale, cv.COLOR_RGBA2GRAY);
  img.delete();

  return {
    img: imgGrayscale,
    width: imgGrayscale.cols,
    height: imgGrayscale.rows,
  };
}

registry.register("grayscale", grayscale, defaultOptions);
