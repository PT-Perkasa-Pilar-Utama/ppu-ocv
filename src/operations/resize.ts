import cv from "@techstark/opencv-js";

import { registry } from "@/pipeline/registry";
import type { BaseOperationOptions, OperationResult } from "@/pipeline/types";

export interface ResizeOptions extends BaseOperationOptions {
  /** Width of the resized image */
  width: number;
  /** Height of the resized image */
  height: number;
}

export const defaultOptions: ResizeOptions = {
  width: 250,
  height: 250,
};

export function resize(
  img: cv.Mat,
  options: Partial<ResizeOptions> = {}
): OperationResult {
  const opts: ResizeOptions = {
    ...defaultOptions,
    ...options,
  };

  const imgResize = new cv.Mat();
  cv.resize(img, imgResize, new cv.Size(opts.width, opts.height));
  img.delete();

  return {
    img: imgResize,
    width: imgResize.cols,
    height: imgResize.rows,
  };
}

registry.register("resize", resize, defaultOptions);
