import type { OperationResult, PartialOptions } from "../pipeline/types.js";
import { cv } from "../cv-provider.js";
import { registry } from "../pipeline/registry.js";

/** Options for the grayscale conversion operation (no configurable fields). */
export interface GrayscaleOptions extends PartialOptions {}

function defaultOptions(): GrayscaleOptions {
  return {};
}

/** Convert the image to grayscale using `COLOR_RGBA2GRAY`. */
export function grayscale(img: cv.Mat, _options: GrayscaleOptions): OperationResult {
  const imgGrayscale = new cv.Mat();

  cv.cvtColor(img, imgGrayscale, cv.COLOR_RGBA2GRAY);
  img.delete();

  return {
    img: imgGrayscale,
    width: imgGrayscale.cols,
    height: imgGrayscale.rows,
  };
}

registry.register("grayscale", grayscale, defaultOptions);
