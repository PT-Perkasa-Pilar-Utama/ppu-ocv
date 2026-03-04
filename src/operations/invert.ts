import type { OperationResult, PartialOptions } from "../pipeline/types.js";
import { cv } from "../cv-provider.js";
import { registry } from "../pipeline/registry.js";

declare module "../pipeline/types" {
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
