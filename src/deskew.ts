// SPDX-License-Identifier: MIT
// Copyright (c) 2026 PT Perkasa Pilar Utama

import type { CanvasLike } from "./canvas-factory.js";
import { Contours } from "./contours.js";
import { cv } from "./cv-provider.js";
import {
  calculateBaselineAngles,
  calculateConsensusAngle,
  calculateHoughAngles,
  calculateMinRectAngles,
} from "./deskew-angles.js";
import type { WeightedAngle } from "./deskew-angles.js";
import { ImageProcessor } from "./image-processor.js";

/**
 * Options for configuring the deskew service
 */
export type DeskewOptions = {
  /**
   * Enable detailed logging of each processing step.
   * @default false
   */
  verbose?: boolean;

  /**
   * Remove detected boxes with area below this threshold, in pixels.
   * Used to filter out noise when detecting text regions.
   * @default 20
   */
  minimumAreaThreshold?: number;
};

/**
 * Service for calculating the skew angle of an image containing text.
 *
 * This service analyzes text regions in an image to determine its skew angle
 * using multiple methods (minAreaRect, baseline analysis, and Hough transform)
 * to robustly calculate the average text orientation.
 *
 * @example
 * ```ts
 * import { DeskewService } from 'ppu-ocv';
 *
 * const service = new DeskewService({ verbose: true });
 * const canvas = ...; // your canvas with text
 * const angle = await service.calculateSkewAngle(canvas);
 * console.log(`Skew angle: ${angle}°`);
 *
 * // Or deskew the image directly
 * const deskewed = await service.deskewImage(canvas);
 * ```
 */
export class DeskewService {
  private readonly verbose: boolean;
  private readonly minimumAreaThreshold: number;

  /**
   * Create a DeskewService.
   * @param options - Configuration. See {@link DeskewOptions}.
   */
  constructor(options: DeskewOptions = {}) {
    this.verbose = options.verbose ?? false;
    this.minimumAreaThreshold = options.minimumAreaThreshold ?? 20;
  }

  private log(message: string): void {
    if (this.verbose) {
      console.log(`[DeskewService] ${message}`);
    }
  }

  /**
   * Calculate the skew angle of text in a probability map or binary image.
   *
   * This method processes the input image to detect text regions and calculates
   * the average skew angle using multiple robust methods.
   *
   * @param canvas - Canvas containing a probability map or binary image of text regions
   * @returns The calculated skew angle in degrees (positive = clockwise, negative = counter-clockwise)
   */
  async calculateSkewAngle(canvas: CanvasLike): Promise<number> {
    const processor = new ImageProcessor(canvas);
    const mat = processor
      .grayscale()
      .threshold({
        lower: 0,
        upper: 255,
        type: cv.THRESH_BINARY + cv.THRESH_OTSU,
      })
      .toMat();

    const contours = new Contours(mat, {
      mode: cv.RETR_LIST,
      method: cv.CHAIN_APPROX_SIMPLE,
    });

    processor.destroy();

    const minAngle = -20;
    const maxAngle = 20;
    const minArea = this.minimumAreaThreshold;

    const textRegions: Array<{
      rect: { x: number; y: number; width: number; height: number };
      contour: cv.Mat;
      area: number;
      aspectRatio: number;
    }> = [];

    let minRectAngles: WeightedAngle[];
    let baselineAngles: WeightedAngle[];
    let houghAngles: WeightedAngle[];

    // Each contour from iterate() is a Mat the GC never frees: dropped ones
    // are deleted in the callback, kept ones in the finally.
    try {
      contours.iterate((contour: cv.Mat) => {
        const rect = contours.getRect(contour);
        const area = rect.width * rect.height;
        const aspectRatio = rect.width / rect.height;

        if (area >= minArea && aspectRatio > 0.2 && aspectRatio < 10) {
          textRegions.push({
            rect,
            contour,
            area,
            aspectRatio,
          });
        } else {
          contour.delete();
        }
      });

      if (textRegions.length === 0) {
        this.log("No valid text regions found for skew calculation.");
        return 0;
      }

      const averageHeight =
        textRegions.reduce((sum, region) => sum + region.rect.height, 0) / textRegions.length;

      const filteredRegions = textRegions.filter((region) => {
        return region.rect.height <= averageHeight * 1.5;
      });

      this.log(`Found ${filteredRegions.length} text regions for skew analysis.`);

      minRectAngles = calculateMinRectAngles(filteredRegions);

      baselineAngles = calculateBaselineAngles(filteredRegions);

      houghAngles = calculateHoughAngles(mat, minAngle, maxAngle, (m) => this.log(m));
    } finally {
      for (const region of textRegions) region.contour.delete();
      contours.destroy();
    }

    const allAngles: Array<{ angle: number; weight: number; method: string }> = [
      ...minRectAngles.map((a: { angle: number; weight: number }) => ({
        ...a,
        method: "minRect",
      })),
      ...baselineAngles.map((a: { angle: number; weight: number }) => ({
        ...a,
        method: "baseline",
      })),
      ...houghAngles.map((a: { angle: number; weight: number }) => ({
        ...a,
        method: "hough",
      })),
    ];

    if (allAngles.length === 0) {
      this.log("No angles detected from any method.");
      return 0;
    }

    const consensusAngle = calculateConsensusAngle(allAngles, minAngle, maxAngle, (m) =>
      this.log(m)
    );

    this.log(
      `Calculated skew angle: ${consensusAngle.toFixed(3)}° (from ${allAngles.length} measurements)`
    );

    return consensusAngle;
  }

  /**
   * Deskew an image by detecting its skew angle and rotating it.
   *
   * This is a convenience method that combines `calculateSkewAngle()`
   * with rotation to produce a straightened image.
   *
   * @param canvas - Canvas containing the image to deskew
   * @returns A new canvas with the deskewed image
   */
  async deskewImage(canvas: CanvasLike): Promise<CanvasLike> {
    this.log("Starting image deskewing process");

    const angle = await this.calculateSkewAngle(canvas);

    this.log(
      `Detected skew angle: ${angle.toFixed(2)}°. Rotating image by ${-angle.toFixed(2)}°...`
    );

    const processor = new ImageProcessor(canvas);
    try {
      const rotatedCanvas = processor.rotate({ angle }).toCanvas();
      return rotatedCanvas;
    } finally {
      processor.destroy();
    }
  }
}
