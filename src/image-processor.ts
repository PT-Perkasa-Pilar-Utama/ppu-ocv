// SPDX-License-Identifier: MIT
// Copyright (c) 2026 PT Perkasa Pilar Utama

import type { CanvasLike } from "./canvas-factory.js";
import { getPlatform, isCanvasLike } from "./canvas-factory.js";
import { cv } from "./cv-provider.js";

import type {
  AdaptiveThresholdOptions,
  BlurOptions,
  BorderOptions,
  CannyOptions,
  ConvertOptions,
  DilateOptions,
  ErodeOptions,
  GrayscaleOptions,
  InvertOptions,
  MorphologicalGradientOptions,
  OperationName,
  OperationOptions,
  RequiredOptions,
  ResizeOptions,
  RotateOptions,
  ThresholdOptions,
  WarpOptions,
} from "./pipeline/index.js";
import { executeOperation } from "./pipeline/index.js";

type NameWithRequiredOptions = {
  [N in OperationName]: OperationOptions<N> extends RequiredOptions ? N : never;
}[OperationName];

type NameWithOptionalOptions = Exclude<OperationName, NameWithRequiredOptions>;

/**
 * OpenCV-powered image processing pipeline.
 *
 * Wraps a `cv.Mat` and exposes a chainable API of named operations
 * (grayscale, blur, threshold, etc.).  Each method mutates the internal
 * state and returns `this`, so operations can be chained fluently.
 *
 * Call {@link ImageProcessor.initRuntime} once before creating any instances.
 *
 * @example
 * ```ts
 * await ImageProcessor.initRuntime();
 * const result = new ImageProcessor(canvas)
 *   .grayscale()
 *   .blur()
 *   .threshold()
 *   .toCanvas();
 * ```
 */
export class ImageProcessor {
  /** Underlying OpenCV Mat. Each operation deletes the previous Mat and replaces this reference. */
  img: cv.Mat;
  /** Current image width in pixels, kept in sync with `img.cols`. */
  width: number;
  /** Current image height in pixels, kept in sync with `img.rows`. */
  height: number;

  /**
   * Create an ImageProcessor instance from a Canvas or cv.Mat
   * @param source Source image as CanvasLike or cv.Mat
   */
  constructor(source: CanvasLike | cv.Mat) {
    if (isCanvasLike(source)) {
      const ctx = source.getContext("2d");
      const imageData = ctx.getImageData(0, 0, source.width, source.height);
      this.img = cv.matFromImageData(imageData);
      this.width = source.width;
      this.height = source.height;
    } else if (source instanceof cv.Mat) {
      this.img = source;
      this.width = source.cols;
      this.height = source.rows;
    } else {
      throw new Error("Invalid source type. Must be either Canvas or cv.Mat.");
    }
  }

  /**
   * Initialize OpenCV runtime. This is recommended to be called before any
   * image processing.
   */
  static async initRuntime(): Promise<void> {
    return new Promise((res) => {
      if (cv && cv.Mat) {
        res();
      } else {
        cv["onRuntimeInitialized"] = () => {
          res();
        };
      }
    });
  }

  /**
   * Execute a registered pipeline operation that requires options.
   * @param operationName Name of the operation (e.g., "resize")
   * @param options Required options for the operation
   */
  execute<N extends NameWithRequiredOptions>(operationName: N, options: OperationOptions<N>): this;

  /**
   * Execute a registered pipeline operation that has default options.
   * @param operationName Name of the operation (e.g., "blur")
   * @param options Optional override of the default options
   */
  execute<N extends NameWithOptionalOptions>(
    operationName: N,
    options?: Partial<OperationOptions<N>>
  ): this;

  /**
   * Execute a registered pipeline operation.
   * @param operationName Name of the operation (e.g., "blur", "grayscale")
   * @param options Options for the operation
   */
  execute<N extends OperationName>(operationName: N, options?: Partial<OperationOptions<N>>): this {
    const result = executeOperation(operationName, this.img, options);
    this.img = result.img;
    this.width = result.width;
    this.height = result.height;
    return this;
  }

  /**
   * Convert image to grayscale
   * @description Usage order: independent
   * @param options Optional configuration for grayscale conversion
   */
  grayscale(options?: Partial<GrayscaleOptions>): this {
    return this.execute<"grayscale">("grayscale", options);
  }

  /**
   * Bluring image to reduce noise using Gaussian Blur
   * @description Usage order: (ideally after) grayscale
   * @param options Blur configuration options
   */
  blur(options?: Partial<BlurOptions>): this {
    return this.execute<"blur">("blur", options);
  }

  /**
   * Thresholding to convert image to binary
   * @description Usage order: (after) grayscale (and optionally blur)
   * @param options Thresholding configuration options
   */
  threshold(options?: Partial<ThresholdOptions>): this {
    return this.execute<"threshold">("threshold", options);
  }

  /**
   * Adaptive thresholding to convert image to binary
   * @description Usage order: (after) grayscale (and optionally blur)
   * @param options Adaptive thresholding configuration options
   */
  adaptiveThreshold(options?: Partial<AdaptiveThresholdOptions>): this {
    return this.execute<"adaptiveThreshold">("adaptiveThreshold", options);
  }

  /**
   * Invert image colors
   * @description Usage order: ideally (after) threshold or adaptiveThreshold
   * @param options Optional configuration for inversion
   */
  invert(options?: Partial<InvertOptions>): this {
    return this.execute<"invert">("invert", options);
  }

  /**
   * Canny edge detection to detect edges in the image
   * @description Usage order: (after) grayscale + blur
   * @param options Canny edge detection configuration options
   */
  canny(options?: Partial<CannyOptions>): this {
    return this.execute<"canny">("canny", options);
  }

  /**
   * Dilate image to increase the size of the foreground object
   * @description Usage order: (after) threshold or edge detection
   * @param options Dilation configuration options
   */
  dilate(options?: Partial<DilateOptions>): this {
    return this.execute<"dilate">("dilate", options);
  }

  /**
   * Erode image to reduce noise
   * @description Usage order: (after) threshold or edge detection
   * @param options Erosion configuration options
   */
  erode(options?: Partial<ErodeOptions>): this {
    return this.execute<"erode">("erode", options);
  }

  /**
   * Add border to image
   * @description Usage order: independent
   * @param options Border configuration options
   */
  border(options?: Partial<BorderOptions>): this {
    return this.execute<"border">("border", options);
  }

  /**
   * Resize image to a new width and height
   * @description Usage order: independent
   * @param options Resize configuration options
   */
  resize(options: ResizeOptions): this {
    return this.execute<"resize">("resize", options);
  }

  /**
   * Rotate image by a given angle
   * @description Usage order: independent
   * @param options Rotate configuration options
   */
  rotate(options: RotateOptions): this {
    return this.execute<"rotate">("rotate", options);
  }

  /**
   * Warp image to a new perspective
   * @description Usage order: independent
   * @param options Warp configuration options
   */
  warp(options: WarpOptions): this {
    return this.execute<"warp">("warp", options);
  }

  /**
   * Convert image matrix into new matrix type
   * @description Usage order: independent
   * @param options Convert configuration options
   */
  convert(options: ConvertOptions): this {
    return this.execute<"convert">("convert", options);
  }

  /**
   * Morphological gradient to highlight the edges in the image
   * @description Usage order: (after) dilation + erosion (or threshold)
   * @param options Morphological gradient configuration options
   */
  morphologicalGradient(options?: Partial<MorphologicalGradientOptions>): this {
    return this.execute<"morphologicalGradient">("morphologicalGradient", options);
  }

  /**
   * Get the result as a cv.Mat
   */
  toMat(): cv.Mat {
    return this.img;
  }

  /**
   * Get the result canvas
   */
  toCanvas(): CanvasLike {
    const platform = getPlatform();
    const canvas = platform.createCanvas(this.width, this.height);

    try {
      cv.imshow(canvas as unknown as HTMLElement, this.img);
    } catch {
      // Fallback for Node (napi-rs/canvas)
      const ctx = (canvas as unknown as HTMLCanvasElement).getContext("2d");
      if (!ctx) throw new Error("Could not get 2d context from canvas");
      const imgData = ctx.createImageData(this.width, this.height);

      if (this.img.channels() === 1) {
        const data = imgData.data;
        const gray = new Uint8Array(this.img.data);

        for (let i = 0; i < gray.length; i++) {
          data[i * 4] = gray[i] as number;
          data[i * 4 + 1] = gray[i] as number;
          data[i * 4 + 2] = gray[i] as number;
          data[i * 4 + 3] = 255;
        }
      } else {
        imgData.data.set(new Uint8ClampedArray(this.img.data));
      }

      ctx.putImageData(imgData, 0, 0);
    }

    return canvas;
  }

  /**
   * Clean up cv.Mat to free memory
   */
  destroy(): void {
    try {
      this.img.delete();
    } catch {
      // already deleted
    }
  }
}
