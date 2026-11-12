// SPDX-License-Identifier: MIT
// Copyright (c) 2026 PT Perkasa Pilar Utama

import { cv } from "./cv-provider.js";

/**
 * Allocates a Mat for an OpenCV call to write into and returns it.
 *
 * OpenCV.js Mats live on the WASM heap and the garbage collector never frees
 * them, so when `write` throws, the Mat is deleted before the error is
 * rethrown. On success the caller owns the returned Mat.
 */
export function writeToNewMat(write: (out: cv.Mat) => void): cv.Mat {
  const out = new cv.Mat();

  try {
    write(out);
  } catch (error) {
    out.delete();
    throw error;
  }

  return out;
}
