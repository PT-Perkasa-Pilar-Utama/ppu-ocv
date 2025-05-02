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

export class ImageProcessor {
  img!: cv.Mat;
  width!: number;
  height!: number;

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
  executeOperation(operationName: string, options: any = {}): ImageProcessor {
    if (!registry.hasOperation(operationName)) {
      throw new Error(`Operation "${operationName}" not found`);
    }

    const result = executeOperation(operationName, this.img, options);
    this.img = result.img;
    this.width = result.width;
    this.height = result.height;

    return this;
  }

  /**
   * Convert image to grayscale
   * @param options Optional configuration for grayscale conversion
   */
  grayscale(options: Partial<GrayscaleOptions> = {}): ImageProcessor {
    return this.executeOperation("grayscale", options);
  }

  /**
   * Invert image colors
   * @param options Optional configuration for inversion
   */
  invert(options: Partial<InvertOptions> = {}): ImageProcessor {
    return this.executeOperation("invert", options);
  }

  /**
   * Add border to image
   * @param options Border configuration options
   */
  border(options: Partial<BorderOptions> = {}): ImageProcessor {
    return this.executeOperation("border", options);
  }

  /**
   * Bluring image to reduce noise using Gaussian Blur
   * @param options Blur configuration options
   */
  blur(options: Partial<BlurOptions> = {}): ImageProcessor {
    return this.executeOperation("blur", options);
  }

  /** Thresholding to convert image to binary
   * @param options Thresholding configuration options
   */
  threshold(options: Partial<ThresholdOptions> = {}): ImageProcessor {
    return this.executeOperation("threshold", options);
  }

  /** Adaptive thresholding to convert image to binary
   * @param options Adaptive thresholding configuration options
   */
  adaptiveThreshold(
    options: Partial<AdaptiveThresholdOptions> = {}
  ): ImageProcessor {
    return this.executeOperation("adaptiveThreshold", options);
  }

  /**
   * Canny edge detection to detect edges in the image
   * @param options Canny edge detection configuration options
   */
  canny(options: Partial<CannyOptions> = {}): ImageProcessor {
    return this.executeOperation("canny", options);
  }

  /**
   * Morphological gradient to highlight the edges in the image
   * @param options Morphological gradient configuration options
   */

  morphologicalGradient(
    options: Partial<MorphologicalGradientOptions> = {}
  ): ImageProcessor {
    return this.executeOperation("morphologicalGradient", options);
  }

  /**
   * Erode image to reduce noise
   * @param options Erosion configuration options
   */
  erode(options: Partial<ErodeOptions> = {}): ImageProcessor {
    return this.executeOperation("erode", options);
  }

  /**
   * Dilate image to increase the size of the foreground object
   * @param options Dilation configuration options
   */
  dilate(options: Partial<DilateOptions> = {}): ImageProcessor {
    return this.executeOperation("dilate", options);
  }

  /**
   * Resize image to a new width and height
   *  @param options Resize configuration options
   */
  resize(options: Partial<ResizeOptions> = {}): ImageProcessor {
    return this.executeOperation("resize", options);
  }

  /**
   * Warp image to a new perspective
   * @param options Warp configuration options
   */
  warp(options: WarpOptions): ImageProcessor {
    return this.executeOperation("warp", options);
  }

  /**
   * Destroy the image (cv.Mat) stored in image processor state
   */
  destroy(): void {
    this.img.delete();
  }

  /**
   * Outputs, non-chainable method
   */

  /**
   * #[Output method]
   * Convert image to cv.Mat
   * @returns cv.Mat
   */
  toMat(): cv.Mat {
    return this.img;
  }

  /**
   * #[Output method]
   * Convert image (cv.Mat) to Canvas
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

  /**
   * Dynamically generate methods for all registered operations
   * This allows for easy addition of new operations without modifying this class
   */
  static createProcessorWithAllOperations(): typeof ImageProcessor {
    const operationNames = registry.getOperationNames();
    const existingMethods = new Set(
      Object.getOwnPropertyNames(ImageProcessor.prototype)
    );

    operationNames.forEach((name) => {
      if (!existingMethods.has(name)) {
        // Use proper type indexing with type assertion
        (ImageProcessor.prototype as any)[name] = function (options: any = {}) {
          return this.executeOperation(name, options);
        };
      }
    });

    return ImageProcessor;
  }
}

ImageProcessor.createProcessorWithAllOperations();
