// SPDX-License-Identifier: MIT
// Copyright (c) 2026 PT Perkasa Pilar Utama

import type { OperationResult, PartialOptions } from "../pipeline/types.js";
import { cv } from "../cv-provider.js";
import { registry } from "../pipeline/registry.js";
import { writeToNewMat } from "../write-to-new-mat.js";

/** Options for the Canny edge-detection operation. */
export type CannyOptions = PartialOptions & {
  /** Lower threshold for the hysteresis procedure (0-255) */
  lower: number;
  /** Upper threshold for the hysteresis procedure (0-255) */
  upper: number;
};

function defaultOptions(): CannyOptions {
  return {
    lower: 50,
    upper: 150,
  };
}

/** Detect edges using the Canny algorithm. */
export function canny(img: cv.Mat, options: CannyOptions): OperationResult {
  const imgCanny = writeToNewMat((out) => cv.Canny(img, out, options.lower, options.upper));
  img.delete();

  return {
    img: imgCanny,
    width: imgCanny.cols,
    height: imgCanny.rows,
  };
}

registry.register("canny", canny, defaultOptions);
