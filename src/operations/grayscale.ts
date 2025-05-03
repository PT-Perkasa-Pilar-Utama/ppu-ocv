import type { OperationResult, PartialOptions } from "../index";
import { cv, registry } from "../index";

declare module "../index" {
  interface RegisteredOperations {
    grayscale: GrayscaleOptions;
  }
}

export interface GrayscaleOptions extends PartialOptions {}

function defaultOptions(): GrayscaleOptions {
  return {};
}

export function grayscale(
  img: cv.Mat,
  options: GrayscaleOptions
): OperationResult {
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
