import cv from "@techstark/opencv-js";

import { registry } from "@/pipeline/registry";
import type { BaseOperationOptions, OperationResult } from "@/pipeline/types";

export interface BlurOptions extends BaseOperationOptions {
  /** Size of the blur [x, y] */
  size: [number, number];
  /** Gaussian kernel standard deviation on x axis */
  sigma: number;
}

export const defaultOptions: BlurOptions = {
  size: [5, 5],
  sigma: 0,
};

export function blur(
  img: cv.Mat,
  options: Partial<BlurOptions> = {}
): OperationResult {
  const opts: BlurOptions = {
    ...defaultOptions,
    ...options,
  };

  const imgBlur = new cv.Mat();

  cv.GaussianBlur(
    img,
    imgBlur,
    new cv.Size(opts.size[0], opts.size[1]),
    opts.sigma
  );
  img.delete();

  return {
    img: imgBlur,
    width: imgBlur.cols,
    height: imgBlur.rows,
  };
}

registry.register("blur", blur, defaultOptions);
