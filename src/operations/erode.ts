import cv from "@techstark/opencv-js";

import { registry } from "@/pipeline/registry";
import type { BaseOperationOptions, OperationResult } from "@/pipeline/types";

export interface ErodeOptions extends BaseOperationOptions {
  /** Size of the block [x, y] */
  size: [number, number];
  /** Number of iterations for the erosion operation */
  iter: number;
}

export const defaultOptions: ErodeOptions = {
  size: [20, 20],
  iter: 1,
};

export function erode(
  img: cv.Mat,
  options: Partial<ErodeOptions> = {}
): OperationResult {
  const opts: ErodeOptions = {
    ...defaultOptions,
    ...options,
  };

  const imgErode = new cv.Mat();
  const kernel = cv.getStructuringElement(
    cv.MORPH_RECT,
    new cv.Size(opts.size[0], opts.size[1])
  );

  cv.erode(img, imgErode, kernel, new cv.Point(-1, -1), opts.iter);
  img.delete();

  return {
    img: imgErode,
    width: imgErode.cols,
    height: imgErode.rows,
  };
}

registry.register("erode", erode, defaultOptions);
