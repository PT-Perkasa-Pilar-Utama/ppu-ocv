import type { OperationResult, PartialOptions } from "../index.js";
import { cv, registry } from "../index.js";

declare module "../index" {
  interface RegisteredOperations {
    canny: CannyOptions;
  }
}

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
