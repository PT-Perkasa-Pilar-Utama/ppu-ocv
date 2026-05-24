// SPDX-License-Identifier: MIT
// Copyright (c) 2026 PT Perkasa Pilar Utama

import type { OperationResult, PartialOptions } from "../pipeline/types.js";
import { cv } from "../cv-provider.js";
import { registry } from "../pipeline/registry.js";

/** Options for the Canny edge-detection operation. */
export interface CannyOptions extends PartialOptions {
  /** Lower threshold for the hysteresis procedure (0-255) */
  lower: number;
  /** Upper threshold for the hysteresis procedure (0-255) */
  upper: number;
}

function defaultOptions(): CannyOptions {
  return {
    lower: 50,
    upper: 150,
  };
}

/** Detect edges using the Canny algorithm. */
export function canny(img: cv.Mat, options: CannyOptions): OperationResult {
  const imgCanny = new cv.Mat();
  cv.Canny(img, imgCanny, options.lower, options.upper);
  img.delete();

  return {
    img: imgCanny,
    width: imgCanny.cols,
    height: imgCanny.rows,
  };
}

registry.register("canny", canny, defaultOptions);
