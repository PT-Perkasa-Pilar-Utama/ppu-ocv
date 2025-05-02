import { Canvas, createCanvas, loadImage } from "@napi-rs/canvas";
import cv from "@techstark/opencv-js";

import type {
  AdaptiveThresholdOptions,
  BlurOptions,
  BorderOptions,
  CannyOptions,
  DilateOptions,
  ErodeOptions,
  GrayscaleOptions,
  InvertOptions,
  MorphologicalGradientOptions,
  ResizeOptions,
  ThresholdOptions,
  WarpOptions,
} from "@/pipeline";
import { executeOperation, registry } from "@/pipeline";
import type { OperationName, OperationOptions } from "@/pipeline/types";

export class ImageProcessor {
  img: cv.Mat;
  width: number;
  height: number;

  constructor(source: Canvas | cv.Mat) {
    if (source instanceof Canvas) {
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

  static async prepareCanvas(file: ArrayBuffer): Promise<Canvas> {
    const img = await loadImage(file);

    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext("2d");

    ctx.drawImage(img, 0, 0);
    return canvas;
  }

  /**
   * Initialize OpenCV runtime, this is recommended to be called before any image processing
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
   * Execute any registered pipeline operation
   * @param operationName Name of the operation to execute
   * @param options Options for the operation
   */
  executeOperation<Name extends OperationName>(
    operationName: Name,
    options?: Partial<OperationOptions<Name>>
  ): this {
    if (!registry.hasOperation(operationName)) {
      throw new Error(`Operation "${operationName}" not found`);
    }

    try {
      const result = executeOperation(operationName, this.img, options);

      this.img = result.img;
      this.width = result.width;
      this.height = result.height;
    } catch (error) {
      console.error(`Error executing operation "${operationName}":`, error);
      throw error;
    }

    return this;
  }

  /**
   * Convert image to grayscale
   * @param options Optional configuration for grayscale conversion
   */
  grayscale(options: Partial<GrayscaleOptions> = {}): this {
    return this.executeOperation("grayscale", options);
  }

  /**
   * Invert image colors
   * @param options Optional configuration for inversion
   */
  invert(options: Partial<InvertOptions> = {}): this {
    return this.executeOperation("invert", options);
  }

  /**
   * Add border to image
   * @param options Border configuration options
   */
  border(options: Partial<BorderOptions> = {}): this {
    return this.executeOperation("border", options);
  }

  /**
   * Bluring image to reduce noise using Gaussian Blur
   * @param options Blur configuration options
   */
  blur(options: Partial<BlurOptions> = {}): this {
    return this.executeOperation("blur", options);
  }

  /** Thresholding to convert image to binary
   * @param options Thresholding configuration options
   */
  threshold(options: Partial<ThresholdOptions> = {}): this {
    return this.executeOperation("threshold", options);
  }

  /** Adaptive thresholding to convert image to binary
   * @param options Adaptive thresholding configuration options
   */
  adaptiveThreshold(
    options: Partial<AdaptiveThresholdOptions> = {}
  ): this {
    return this.executeOperation("adaptiveThreshold", options);
  }

  /**
   * Canny edge detection to detect edges in the image
   * @param options Canny edge detection configuration options
   */
  canny(options: Partial<CannyOptions> = {}) : this {
    return this.executeOperation("canny", options);
  }

  /**
   * Morphological gradient to highlight the edges in the image
   * @param options Morphological gradient configuration options
   */

  morphologicalGradient(
    options: Partial<MorphologicalGradientOptions> = {}
  ): this {
    return this.executeOperation("morphologicalGradient", options);
  }

  /**
   * Erode image to reduce noise
   * @param options Erosion configuration options
   */
  erode(options: Partial<ErodeOptions> = {}): this {
    return this.executeOperation("erode", options);
  }

  /**
   * Dilate image to increase the size of the foreground object
   * @param options Dilation configuration options
   */
  dilate(options: Partial<DilateOptions> = {}) : this {
    return this.executeOperation("dilate", options);
  }

  /**
   * Resize image to a new width and height
   *  @param options Resize configuration options
   */
  resize(options: ResizeOptions): this {
    return this.executeOperation("resize", options);
  }

  /**
   * Warp image to a new perspective
   * @param options Warp configuration options
   */
  warp(options: WarpOptions): this {
    return this.executeOperation("warp", options);
  }

  // --- Output and Cleanup Methods ---

  /**
   * Destroy the image (cv.Mat) stored in image processor state
   * @kind non-chainable
   * @returns void
   */
  destroy(): void {
    this.img.delete();
  }

  /**
   * Convert image to cv.Mat
   * @kind non-chainable
   * @returns cv.Mat
   */
  toMat(): cv.Mat {
    return this.img;
  }

  /**
   * Convert image (cv.Mat) to Canvas
   * @kind non-chainable
   * @returns Canvas
   */
  toCanvas(): Canvas {
    const canvas = createCanvas(this.width, this.height);
    const ctx = canvas.getContext("2d");

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
    return canvas;
  }
}

