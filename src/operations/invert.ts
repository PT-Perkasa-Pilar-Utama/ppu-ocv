import cv from "@techstark/opencv-js";

import { registry } from "@/pipeline/registry";
import type { BaseOperationOptions, OperationResult } from "@/pipeline/types";

declare module '@/pipeline/types' {
  interface RegisteredOperations {
    invert: InvertOptions;
  }
}

export interface InvertOptions extends BaseOperationOptions {}

export const defaultOptions: InvertOptions = {};

export function invert(
  img: cv.Mat,
  options: InvertOptions
): OperationResult {
  const imgInvert = new cv.Mat();

  cv.bitwise_not(img, imgInvert);
  img.delete();

  return {
    img: imgInvert,
    width: imgInvert.cols,
    height: imgInvert.rows,
  };
}

registry.register("invert", invert, defaultOptions);
