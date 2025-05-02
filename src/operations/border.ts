import cv, { type BorderTypes } from "@techstark/opencv-js";

import { registry } from "@/pipeline/registry";
import type { BaseOperationOptions, OperationResult } from "@/pipeline/types";

export interface BorderOptions extends BaseOperationOptions {
  /** Size of the border in pixels */
  size: number;
  /** Border type (e.g., cv.BORDER_CONSTANT) */
  borderType: BorderTypes;
  /** Border color in [B, G, R, A] format */
  borderColor: [cv.int, cv.int, cv.int, cv.int];
}

export const defaultOptions: BorderOptions = {
  size: 10,
  borderType: cv.BORDER_CONSTANT,
  borderColor: [255, 255, 255, 255],
};

export function border(
  img: cv.Mat,
  options: Partial<BorderOptions> = {}
): OperationResult {
  const opts: BorderOptions = {
    ...defaultOptions,
    ...options,
  };

  const imgBorder = new cv.Mat();

  cv.copyMakeBorder(
    img,
    imgBorder,
    opts.size,
    opts.size,
    opts.size,
    opts.size,
    opts.borderType,
    opts.borderColor
  );
  img.delete();

  return {
    img: imgBorder,
    width: imgBorder.cols,
    height: imgBorder.rows,
  };
}

registry.register("border", border, defaultOptions);
