import { Canvas, createCanvas, cv, loadImage } from "./index";

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
  OperationName,
  OperationOptions,
  RequiredOptions,
  ResizeOptions,
  RotateOptions,
  ThresholdOptions,
  WarpOptions,
} from "./index";
import { executeOperation, registry } from "./index";
import type { ConvertOptions } from "./pipeline";

type NameWithRequiredOptions = {
  [N in OperationName]: OperationOptions<N> extends RequiredOptions ? N : never;
}[OperationName];

type NameWithOptionalOptions = Exclude<OperationName, NameWithRequiredOptions>;

export class ImageProcessor {
  img: cv.Mat;
  width: number;
  height: number;

  /**
   * Create an ImageProcessor instance from a Canvas or cv.Mat
   * @param source Source image as Canvas or cv.Mat
   */
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
   * Execute a registered pipeline operation that requires options.
   * @param operationName Name of the operation (e.g., "resize")
   * @param options Required options for the operation
   */
  execute<Name extends NameWithRequiredOptions>(
    operationName: Name,
    options: OperationOptions<Name>
  ): this;

  /**
   * Execute a registered pipeline operation where options are optional or have defaults.
   * @param operationName Name of the operation (e.g., "blur", "grayscale")
   * @param options Optional or partial options for the operation
   */
  execute<Name extends NameWithOptionalOptions>(
    operationName: Name,
    options?: Partial<OperationOptions<Name>>
  ): this;

  /**
   * Execute a registered pipeline operation.
   * @param operationName Name of the operation (e.g., "blur", "grayscale")
   * @param options Options for the operation
   */
  execute<Name extends OperationName>(
    operationName: Name,
    options?: OperationOptions<Name> | Partial<OperationOptions<Name>>
  ): this {
    if (!registry.hasOperation(operationName)) {
      throw new Error(`Operation "${operationName}" not found`);
    }

    try {
      const result = executeOperation(
        operationName,
        this.img,
        options as Partial<OperationOptions<Name>> | undefined
      );

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
   * @description Usage order: independent
   * @param options Optional configuration for grayscale conversion
   */
  grayscale(options: Partial<GrayscaleOptions> = {}): this {
    return this.execute("grayscale", options);
  }

  /**
   * Invert image colors
   * @description Usage order: ideally (after) threshold or adaptiveThreshold
   * @param options Optional configuration for inversion
   */
  invert(options: Partial<InvertOptions> = {}): this {
    return this.execute("invert", options);
  }

  /**
   * Add border to image
   * @description Usage order: independent
   * @param options Border configuration options
   */
  border(options: Partial<BorderOptions> = {}): this {
    return this.execute("border", options);
  }

  /**
   * Bluring image to reduce noise using Gaussian Blur
   * @description Usage order: (ideally after) grayscale
   * @param options Blur configuration options
   */
  blur(options: Partial<BlurOptions> = {}): this {
    return this.execute("blur", options);
  }

  /** Thresholding to convert image to binary
   * @description Usage order: (after) grayscale (and optionally blur)
   * @param options Thresholding configuration options
   */
  threshold(options: Partial<ThresholdOptions> = {}): this {
    return this.execute("threshold", options);
  }

  /** Adaptive thresholding to convert image to binary
   * @description Usage order: (after) grayscale (and optionally blur)
   * @param options Adaptive thresholding configuration options
   */
  adaptiveThreshold(options: Partial<AdaptiveThresholdOptions> = {}): this {
    return this.execute("adaptiveThreshold", options);
  }

  /**
   * Canny edge detection to detect edges in the image
   * @description Usage order: (after) grayscale + blur
   * @param options Canny edge detection configuration options
   */
  canny(options: Partial<CannyOptions> = {}): this {
    return this.execute("canny", options);
  }

  /**
   * Morphological gradient to highlight the edges in the image
   * @description Usage order: (after) dilation + erosion (or threshold)
   * @param options Morphological gradient configuration options
   */

  morphologicalGradient(
    options: Partial<MorphologicalGradientOptions> = {}
  ): this {
    return this.execute("morphologicalGradient", options);
  }

  /**
   * Erode image to reduce noise
   * @description Usage order: (after) threshold or edge detection
   * @param options Erosion configuration options
   */
  erode(options: Partial<ErodeOptions> = {}): this {
    return this.execute("erode", options);
  }

  /**
   * Dilate image to increase the size of the foreground object
   * @description Usage order: (after) threshold or edge detection
   * @param options Dilation configuration options
   */
  dilate(options: Partial<DilateOptions> = {}): this {
    return this.execute("dilate", options);
  }

  /**
   * Resize image to a new width and height
   * @description Usage order: independent
   *  @param options Resize configuration options
   */
  resize(options: ResizeOptions): this {
    return this.execute("resize", options);
  }

  /**
   * Warp image to a new perspective
   * @description Usage order: independent
   * @param options Warp configuration options
   */
  warp(options: WarpOptions): this {
    return this.execute("warp", options);
  }

  /**
   * Rotate image by a given angle
   * @description Usage order: independent
   * @param options Rotate configuration options
   */
  rotate(options: RotateOptions): this {
    return this.execute("rotate", options);
  }

  /**
   * Convert image matrix into new matrix type
   * @description Usage order: independent
   * @param options Convert configuration options
   */
  convert(options: ConvertOptions): this {
    return this.execute("convert", options);
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
