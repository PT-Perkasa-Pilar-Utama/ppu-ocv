// SPDX-License-Identifier: MIT
// Copyright (c) 2026 PT Perkasa Pilar Utama

import type { OperationResult, PartialOptions } from "../pipeline/types.js";
import { cv } from "../cv-provider.js";
import { registry } from "../pipeline/registry.js";

/** Options for the bitwise-NOT color inversion operation (no configurable fields). */
export type InvertOptions = PartialOptions;

function defaultOptions(): InvertOptions {
  return {};
}

/** Invert all pixel values using `cv.bitwise_not`. */
export function invert(img: cv.Mat, _options: InvertOptions): OperationResult {
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
