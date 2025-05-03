// src/image-analysis.ts

/**
 * This module provides utility functions for analyzing image properties.
 * !IMPORTANT: Ensure ImageProcessor.initRuntime() has been called successfully
 * once before using any functions from this module.
 */

import { ImageProcessor } from "@/index";
import type { Canvas } from "@napi-rs/canvas";
import cv from "@techstark/opencv-js";

/**
 * Options for calculating mean Lab lightness.
 */
export interface CalculateMeanLightnessOptions {
  /** The canvas containing the image to be processed. */
  canvas: Canvas;
  /** The target dimensions for analysis (resizes internally). */
  dimension: { width: number; height: number };
}

/**
 * Calculates the mean normalized lightness of an image using the L channel of the Lab color space.
 * Lightness is normalized based on the image's own maximum lightness value before averaging.
 *
 * @param options - Configuration options.
 * @returns A promise resolving to the mean normalized lightness (0-1).
 * @throws Error if OpenCV operations fail.
 */
export async function calculateMeanNormalizedLabLightness(
  options: CalculateMeanLightnessOptions
): Promise<number> {
  const { canvas, dimension } = options;

  let processor: ImageProcessor | null = null;
  let resized: cv.Mat | null = null;
  let labImg: cv.Mat | null = null;
  let channels: cv.MatVector | null = null;
  let L: cv.Mat | null = null;
  let mask: cv.Mat | null = null;
  let scalarMat: cv.Mat | null = null;

  try {
    processor = new ImageProcessor(canvas);

    resized = processor
      .execute("resize", {
        width: dimension.width,
        height: dimension.height,
      })
      .toMat();

    labImg = new cv.Mat();
    cv.cvtColor(resized, labImg, cv.COLOR_BGR2Lab);

    channels = new cv.MatVector();
    cv.split(labImg, channels);

    L = channels.get(0);

    mask = new cv.Mat();
    const maxLocResult = cv.minMaxLoc(L, mask);
    const maxPixelValue = maxLocResult.maxVal;

    if (maxPixelValue === 0) {
      return 0;
    }

    scalarMat = new cv.Mat(
      L.rows,
      L.cols,
      L.type(),
      new cv.Scalar(maxPixelValue)
    );
    cv.divide(L, scalarMat, L, 1.0, -1);

    const meanL = cv.mean(L)[0];
    return meanL ?? 0;
  } finally {
    processor?.destroy();
    labImg?.delete();
    channels?.delete();
    L?.delete();
    mask?.delete();
    scalarMat?.delete();
  }
}

/**
 * Calculates the mean pixel value of the image after converting it to grayscale.
 *
 * @param canvas - The source canvas to be processed.
 * @returns A promise resolving to the mean grayscale value (typically 0-255).
 * @throws Error if OpenCV operations fail.
 */
export async function calculateMeanGrayscaleValue(
  canvas: Canvas
): Promise<number> {
  let processor: ImageProcessor | null = null;
  let grayscaleImg: cv.Mat | null = null;

  try {
    processor = new ImageProcessor(canvas);
    grayscaleImg = processor.blur().grayscale().toMat();

    const mean = cv.mean(grayscaleImg)[0];
    return mean ?? 0;
  } finally {
    processor?.destroy();
  }
}
