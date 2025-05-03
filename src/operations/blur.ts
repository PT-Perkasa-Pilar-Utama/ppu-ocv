import type { OperationResult, PartialOptions } from "../index";
import { cv, registry } from "../index";

declare module "../index" {
  interface RegisteredOperations {
    blur: BlurOptions;
  }
}

export interface BlurOptions extends PartialOptions {
  /** Size of the blur [x, y] */
  size: [number, number];
  /** Gaussian kernel standard deviation on x axis */
  sigma: number;
}

function defaultOptions(): BlurOptions {
  return { size: [5, 5], sigma: 0 };
}

export function blur(img: cv.Mat, options: BlurOptions): OperationResult {
  const imgBlur = new cv.Mat();

  cv.GaussianBlur(
    img,
    imgBlur,
    new cv.Size(options.size[0], options.size[1]),
    options.sigma
  );
  img.delete();

  return {
    img: imgBlur,
    width: imgBlur.cols,
    height: imgBlur.rows,
  };
}

registry.register("blur", blur, defaultOptions);
