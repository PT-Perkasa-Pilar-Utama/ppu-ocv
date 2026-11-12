// SPDX-License-Identifier: MIT
// Copyright (c) 2026 PT Perkasa Pilar Utama

import type { OperationResult, PartialOptions } from "../pipeline/types.js";
import { cv } from "../cv-provider.js";
import { registry } from "../pipeline/registry.js";
import { writeToNewMat } from "../write-to-new-mat.js";

/** Options for the morphological gradient operation. */
export type MorphologicalGradientOptions = PartialOptions & {
  /** Kernel size for the morphological gradient operation [x, y] */
  size: [number, number];
};

function defaultOptions(): MorphologicalGradientOptions {
  return {
    size: [3, 3],
  };
}

/** Apply morphological gradient to highlight edges (dilation minus erosion). */
export function morphologicalGradient(
  img: cv.Mat,
  options: MorphologicalGradientOptions
): OperationResult {
  const kernel = cv.getStructuringElement(
    cv.MORPH_RECT,
    new cv.Size(options.size[0], options.size[1])
  );

  let imgMorphologicalGradient: cv.Mat;
  try {
    imgMorphologicalGradient = writeToNewMat((out) =>
      cv.morphologyEx(img, out, cv.MORPH_GRADIENT, kernel)
    );
  } finally {
    kernel.delete();
  }
  img.delete();

  return {
    img: imgMorphologicalGradient,
    width: imgMorphologicalGradient.cols,
    height: imgMorphologicalGradient.rows,
  };
}

registry.register("morphologicalGradient", morphologicalGradient, defaultOptions);
