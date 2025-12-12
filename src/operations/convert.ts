import type { OperationResult, RequiredOptions } from "../index.js";
import { cv, registry } from "../index.js";

declare module "../index" {
  interface RegisteredOperations {
    convert: ConvertOptions;
  }
}

export interface ConvertOptions extends RequiredOptions {
  /** Desired matrix type (cv.CV_...) if negative, it will be the same as input */
  rtype: number;
}

export function convert(img: cv.Mat, options: ConvertOptions): OperationResult {
  if (options.rtype === undefined) {
    throw new Error("Invalid options: rtype is required");
  }

  const imgConvert = new cv.Mat();
  img.convertTo(imgConvert, options.rtype);
  img.delete();

  return {
    img: imgConvert,
    width: imgConvert.cols,
    height: imgConvert.rows,
  };
}

registry.register("convert", convert);
