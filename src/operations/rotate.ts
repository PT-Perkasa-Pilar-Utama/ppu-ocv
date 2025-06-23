import type { OperationResult, PartialOptions, RequiredOptions } from "../index.interface";
import { cv } from "../index";

export interface RotateOptions extends PartialOptions {
  /** Angle of rotation in degrees (positive for counter-clockwise) */
  angle: number;
  /** Optional center of rotation. Defaults to the image center. */
  center?: cv.Point;
}

function defaultOptions(): RotateOptions {
  return {
    angle: 0,
  };
}

export function rotate(
  img: cv.Mat,
  options: RotateOptions
): OperationResult {
  const center = options.center || new cv.Point(img.cols / 2, img.rows / 2);
  const M = cv.getRotationMatrix2D(center, options.angle, 1);
  const dsize = new cv.Size(img.cols, img.rows);
  const rotatedImg = new cv.Mat();

  cv.warpAffine(
    img,
    rotatedImg,
    M,
    dsize,
    cv.INTER_LINEAR,
    cv.BORDER_CONSTANT,
    new cv.Scalar()
  );

  img.delete(); // delete original image to free memory
  M.delete(); // delete rotation matrix

  return {
    img: rotatedImg,
    width: rotatedImg.cols,
    height: rotatedImg.rows,
  };
}

import { registry } from "../pipeline/registry";
registry.register("rotate", rotate, defaultOptions);
