import cv from "@techstark/opencv-js";

import { registry } from "@/pipeline/registry";
import type { BaseOperationOptions, OperationResult } from "@/pipeline/types";

export interface DilateOptions extends BaseOperationOptions {
  /** Size of the block [x, y] */
  size: [number, number];
  /** Number of iterations for the dilation operation */
  iter: number;
}

export const defaultOptions: DilateOptions = {
  size: [20, 20],
  iter: 1,
};

export function dilate(
  img: cv.Mat,
  options: Partial<DilateOptions> = {}
): OperationResult {
  const opts: DilateOptions = {
    ...defaultOptions,
    ...options,
  };

  const imgDilate = new cv.Mat();
  const kernel = cv.getStructuringElement(
    cv.MORPH_RECT,
    new cv.Size(opts.size[0], opts.size[1])
  );

  cv.dilate(img, imgDilate, kernel, new cv.Point(-1, -1), opts.iter);
  img.delete();

  return {
    img: imgDilate,
    width: imgDilate.cols,
    height: imgDilate.rows,
  };
}

registry.register("dilate", dilate, defaultOptions);
