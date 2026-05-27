// SPDX-License-Identifier: MIT
// Copyright (c) 2026 PT Perkasa Pilar Utama

import type { OperationResult, PartialOptions } from "../pipeline/types.js";
import { cv } from "../cv-provider.js";
import { registry } from "../pipeline/registry.js";

/** Options for the morphological erosion operation. */
export type ErodeOptions = PartialOptions & {
  /** Size of the block [x, y] */
  size: [number, number];
  /** Number of iterations for the erosion operation */
  iter: number;
};

function defaultOptions(): ErodeOptions {
  return {
    size: [5, 5],
    iter: 1,
  };
}

/** Erode the image to shrink foreground regions and remove small noise. */
export function erode(img: cv.Mat, options: ErodeOptions): OperationResult {
  const imgErode = new cv.Mat();
  const kernel = cv.getStructuringElement(
    cv.MORPH_RECT,
    new cv.Size(options.size[0], options.size[1])
  );

  cv.erode(img, imgErode, kernel, new cv.Point(-1, -1), options.iter);
  img.delete();

  return {
    img: imgErode,
    width: imgErode.cols,
    height: imgErode.rows,
  };
}

registry.register("erode", erode, defaultOptions);
