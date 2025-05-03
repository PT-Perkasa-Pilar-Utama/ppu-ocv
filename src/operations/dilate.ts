import type { OperationResult, PartialOptions } from "@/index";
import { cv, registry } from "@/index";

declare module "@/pipeline/types" {
  interface RegisteredOperations {
    dilate: DilateOptions;
  }
}

export interface DilateOptions extends PartialOptions {
  /** Size of the block [x, y] */
  size: [number, number];
  /** Number of iterations for the dilation operation */
  iter: number;
}

function defaultOptions(): DilateOptions {
  return {
    size: [5, 5],
    iter: 1,
  };
}

export function dilate(img: cv.Mat, options: DilateOptions): OperationResult {
  const imgDilate = new cv.Mat();
  const kernel = cv.getStructuringElement(
    cv.MORPH_RECT,
    new cv.Size(options.size[0], options.size[1])
  );

  cv.dilate(img, imgDilate, kernel, new cv.Point(-1, -1), options.iter);
  img.delete();

  return {
    img: imgDilate,
    width: imgDilate.cols,
    height: imgDilate.rows,
  };
}

registry.register("dilate", dilate, defaultOptions);
