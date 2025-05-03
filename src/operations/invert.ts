import type { OperationResult, PartialOptions } from "../index";
import { cv, registry } from "../index";

declare module "../index" {
  interface RegisteredOperations {
    invert: InvertOptions;
  }
}

export interface InvertOptions extends PartialOptions {}

function defaultOptions(): InvertOptions {
  return {};
}

export function invert(img: cv.Mat, options: InvertOptions): OperationResult {
  const imgInvert = new cv.Mat();

  cv.bitwise_not(img, imgInvert);
  img.delete();

  return {
    img: imgInvert,
    width: imgInvert.cols,
    height: imgInvert.rows,
  };
}

registry.register("invert", invert, defaultOptions);
