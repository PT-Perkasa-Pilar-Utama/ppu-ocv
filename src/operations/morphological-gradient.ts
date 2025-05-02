import cv from "@techstark/opencv-js";

import { registry } from "@/pipeline/registry";
import type { BaseOperationOptions, OperationResult } from "@/pipeline/types";

declare module '@/pipeline/types' {
  interface RegisteredOperations {
    morphologicalGradient: MorphologicalGradientOptions;
  }
}

export interface MorphologicalGradientOptions extends BaseOperationOptions {
  /** Kernel size for the morphological gradient operation [x, y] */
  size: [number, number];
}

export const defaultOptions: MorphologicalGradientOptions = {
  size: [3, 3],
};

export function morphologicalGradient(
  img: cv.Mat,
  options: MorphologicalGradientOptions
): OperationResult {

  const imgMorphologicalGradient = new cv.Mat();
  const kernel = cv.getStructuringElement(
    cv.MORPH_RECT,
    new cv.Size(options.size[0], options.size[1])
  );

  cv.morphologyEx(img, imgMorphologicalGradient, cv.MORPH_GRADIENT, kernel);
  img.delete();

  return {
    img: imgMorphologicalGradient,
    width: imgMorphologicalGradient.cols,
    height: imgMorphologicalGradient.rows,
  };
}

registry.register(
  "morphologicalGradient",
  morphologicalGradient,
  defaultOptions
);
