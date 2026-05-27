// SPDX-License-Identifier: MIT
// Copyright (c) 2026 PT Perkasa Pilar Utama

import type { OperationResult, RequiredOptions } from "../pipeline/types.js";
import { cv } from "../cv-provider.js";
import { registry } from "../pipeline/registry.js";

/** Options for resizing the image to exact pixel dimensions. */
export type ResizeOptions = RequiredOptions & {
  /** Width of the resized image */
  width: number;
  /** Height of the resized image */
  height: number;
};

/** Resize the image to the given width and height. */
export function resize(img: cv.Mat, options: ResizeOptions): OperationResult {
  if (!options.width || !options.height) {
    throw new Error("Invalid options: width and height are required");
  }

  const imgResize = new cv.Mat();
  cv.resize(img, imgResize, new cv.Size(options.width, options.height));
  img.delete();

  return {
    img: imgResize,
    width: imgResize.cols,
    height: imgResize.rows,
  };
}

registry.register("resize", resize);
