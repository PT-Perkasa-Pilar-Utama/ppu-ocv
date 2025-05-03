import type { OperationResult, PartialOptions } from "../index";
import { cv, registry } from "../index";

declare module "../index" {
  interface RegisteredOperations {
    morphologicalGradient: MorphologicalGradientOptions;
  }
}

export interface MorphologicalGradientOptions extends PartialOptions {
  /** Kernel size for the morphological gradient operation [x, y] */
  size: [number, number];
}

function defaultOptions(): MorphologicalGradientOptions {
  return {
    size: [3, 3],
  };
}

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
