// SPDX-License-Identifier: MIT
// Copyright (c) 2026 PT Perkasa Pilar Utama

import type { OperationResult, RequiredOptions } from "../pipeline/types.js";
import { cv } from "../cv-provider.js";
import { registry } from "../pipeline/registry.js";

/** Options for rotating the image around a pivot point. */
export type RotateOptions = RequiredOptions & {
  /** Angle of rotation in degrees (positive for counter-clockwise) */
  angle: number;
  /** Optional center of rotation. Defaults to the image center. */
  center?: cv.Point;
};

/** Rotate the image by the given angle around its centre (or a custom pivot). */
export function rotate(img: cv.Mat, options: RotateOptions): OperationResult {
  const center = options.center || new cv.Point(img.cols / 2, img.rows / 2);
  const M = cv.getRotationMatrix2D(center, options.angle, 1);
  const dsize = new cv.Size(img.cols, img.rows);
  const rotatedImg = new cv.Mat();

  cv.warpAffine(img, rotatedImg, M, dsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());

  img.delete();
  M.delete();

  return {
    img: rotatedImg,
    width: rotatedImg.cols,
    height: rotatedImg.rows,
  };
}

registry.register("rotate", rotate);
