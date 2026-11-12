// SPDX-License-Identifier: MIT
// Copyright (c) 2026 PT Perkasa Pilar Utama

import type { OperationResult, RequiredOptions } from "../pipeline/types.js";
import type { cv } from "../cv-provider.js";
import { registry } from "../pipeline/registry.js";
import { writeToNewMat } from "../write-to-new-mat.js";

/** Options for converting a Mat to a different depth/channel type. */
export type ConvertOptions = RequiredOptions & {
  /** Desired matrix type (cv.CV_...) if negative, it will be the same as input */
  rtype: number;
};

/** Convert the image matrix to a new type via `Mat.convertTo`. */
export function convert(img: cv.Mat, options: ConvertOptions): OperationResult {
  if (options.rtype === undefined) {
    throw new Error("Invalid options: rtype is required");
  }

  const { rtype } = options;
  const imgConvert = writeToNewMat((out) => img.convertTo(out, rtype));
  img.delete();

  return {
    img: imgConvert,
    width: imgConvert.cols,
    height: imgConvert.rows,
  };
}

registry.register("convert", convert);
