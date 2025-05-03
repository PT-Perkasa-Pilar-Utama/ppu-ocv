import type { OperationResult, PartialOptions } from "@/index";
import { cv, registry } from "@/index";

declare module "@/pipeline/types" {
  interface RegisteredOperations {
    erode: ErodeOptions;
  }
}

export interface ErodeOptions extends PartialOptions {
  /** Size of the block [x, y] */
  size: [number, number];
  /** Number of iterations for the erosion operation */
  iter: number;
}

function defaultOptions(): ErodeOptions {
  return {
    size: [5, 5],
    iter: 1,
  };
}

export function erode(img: cv.Mat, options: ErodeOptions): OperationResult {
  const imgErode = new cv.Mat();
  const kernel = cv.getStructuringElement(
    cv.MORPH_RECT,
    new cv.Size(options.size[0], options.size[1])
  );

  cv.erode(img, imgErode, kernel, new cv.Point(-1, -1), options.iter);
  img.delete();

  return {
    img: imgErode,
    width: imgErode.cols,
    height: imgErode.rows,
  };
}

registry.register("erode", erode, defaultOptions);
