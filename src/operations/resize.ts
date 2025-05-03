import type { OperationResult, RequiredOptions } from "../index";
import { cv, registry } from "../index";

declare module "../index" {
  interface RegisteredOperations {
    resize: ResizeOptions;
  }
}

export interface ResizeOptions extends RequiredOptions {
  /** Width of the resized image */
  width: number;
  /** Height of the resized image */
  height: number;
}

export function resize(img: cv.Mat, options: ResizeOptions): OperationResult {
  if (!options.width || !options.height) {
    throw new Error("Invalid options: width and height are required");
  }

  const imgResize = new cv.Mat();
  cv.resize(img, imgResize, new cv.Size(options.width, options.height));
  img.delete();

  return {
    img: imgResize,
    width: imgResize.cols,
    height: imgResize.rows,
  };
}

registry.register("resize", resize);
