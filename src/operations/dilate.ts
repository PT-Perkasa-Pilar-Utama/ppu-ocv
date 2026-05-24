// SPDX-License-Identifier: MIT
// Copyright (c) 2026 PT Perkasa Pilar Utama

import type { OperationResult, PartialOptions } from "../pipeline/types.js";
import { cv } from "../cv-provider.js";
import { registry } from "../pipeline/registry.js";

/** Options for the morphological dilation operation. */
export type DilateOptions = PartialOptions & {
  /** Size of the block [x, y] */
  size: [number, number];
  /** Number of iterations for the dilation operation */
  iter: number;
};

function defaultOptions(): DilateOptions {
  return {
    size: [5, 5],
    iter: 1,
  };
}

/** Dilate the image to expand foreground regions. */
export function dilate(img: cv.Mat, options: DilateOptions): OperationResult {
  const imgDilate = new cv.Mat();
  const kernel = cv.getStructuringElement(
    cv.MORPH_RECT,
    new cv.Size(options.size[0], options.size[1])
  );

  cv.dilate(img, imgDilate, kernel, new cv.Point(-1, -1), options.iter);
  img.delete();

  return {
    img: imgDilate,
    width: imgDilate.cols,
    height: imgDilate.rows,
  };
}

registry.register("dilate", dilate, defaultOptions);
