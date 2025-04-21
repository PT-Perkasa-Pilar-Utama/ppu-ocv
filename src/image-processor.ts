import { Canvas, createCanvas, loadImage } from "@napi-rs/canvas";
import cv from "@techstark/opencv-js";
import { Contours } from "./contours";
import type { BoundingBox, Points } from "./index.interface";

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

  static async bufferToCanvas(file: ArrayBuffer): Promise<Canvas> {
    const img = await loadImage(file);

    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext("2d");

    ctx.drawImage(img, 0, 0);
    return canvas;
  }

  /**
   * Convert image to grayscale mode
   */
  grayscale(): ImageProcessor {
    const img = this.img;
    const imgGrayscale = new cv.Mat();

    cv.cvtColor(img, imgGrayscale, cv.COLOR_RGBA2GRAY);
    img.delete();

    this.img = imgGrayscale;
    return this;
  }

  /**
   * Inverse the image color
   */
  invert(): ImageProcessor {
    const img = this.img;
    const imgInverse = new cv.Mat();

    cv.bitwise_not(img, imgInverse);
    img.delete();

    this.img = imgInverse;
    return this;
  }

  /**
   *
   * @param size size of the border
   * @param borderType cv.BORDER_...
   * @param borderColor [B, G, R, A]
   */
  border(
    size = 10,
    borderType: cv.int = cv.BORDER_CONSTANT,
    borderColor: [cv.int, cv.int, cv.int, cv.int] = [255, 255, 255, 255]
  ): ImageProcessor {
    const img = this.img;
    const imgBorder = new cv.Mat();

    cv.copyMakeBorder(
      img,
      imgBorder,
      size,
      size,
      size,
      size,
      borderType,
      borderColor
    );
    img.delete();

    this.img = imgBorder;
    return this;
  }

  /**
   * Use adaptive threshold algorithm
   * @param maxVal 0-255
   * @param method threshold method (cv.ADAPTIVE_THRESH_...)
   * @param type threhold type (cv.THRESH_...)
   * @param size size of the block
   * @param C constant subtracted
   */
  adaptiveThreshold(
    maxVal = 255,
    method: cv.int = cv.ADAPTIVE_THRESH_GAUSSIAN_C,
    type: cv.int = cv.THRESH_BINARY_INV,
    size = 7,
    C = 2
  ): ImageProcessor {
    const img = this.img;
    const imgAdaptiveThreshold = new cv.Mat();

    cv.adaptiveThreshold(
      img,
      imgAdaptiveThreshold,
      maxVal,
      method,
      type,
      size,
      C
    );
    img.delete();

    this.img = imgAdaptiveThreshold;
    return this;
  }

  /**
   * Bluring image to reduce noise using Gaussian Blur
   * @param size Size of the blur
   * @param sigma Gaussian kernel standard deviation on x axis
   */
  blur(size = 5, sigma = 0): ImageProcessor {
    const img = this.img;
    const imgBlur = new cv.Mat();

    cv.GaussianBlur(img, imgBlur, new cv.Size(size, size), sigma);
    img.delete();

    this.img = imgBlur;
    return this;
  }

  /**
   * Canny edge detection to detect edges
   * @param threshold1 threshold number for first hysteries
   * @param threshold2 threshold number for second hysteries
   */
  canny(threshold1 = 50, threshold2 = 150): ImageProcessor {
    const img = this.img;
    const imgCanny = new cv.Mat();

    cv.Canny(img, imgCanny, threshold1, threshold2);
    img.delete();

    this.img = imgCanny;
    return this;
  }

  /** Sobel edge detection */
  sobel(ksize = 3): ImageProcessor {
    const img = this.img;

    const gradX = new cv.Mat();
    const gradY = new cv.Mat();

    cv.Sobel(img, gradX, cv.CV_16S, 1, 0, ksize, 1, 0, cv.BORDER_DEFAULT);
    cv.Sobel(img, gradY, cv.CV_16S, 0, 1, ksize, 1, 0, cv.BORDER_DEFAULT);

    const absX = new cv.Mat();
    const absY = new cv.Mat();

    cv.convertScaleAbs(gradX, absX);
    cv.convertScaleAbs(gradY, absY);

    const out = new cv.Mat();
    cv.addWeighted(absX, 0.5, absY, 0.5, 0, out);

    img.delete();
    gradX.delete();
    gradY.delete();

    absX.delete();
    absY.delete();

    this.img = out;
    return this;
  }

  /** Laplacian edge detection */
  laplacian(ksize = 3): ImageProcessor {
    const img = this.img;
    const lap = new cv.Mat();

    cv.Laplacian(img, lap, cv.CV_16S, ksize, 1, 0, cv.BORDER_DEFAULT);
    const out = new cv.Mat();
    cv.convertScaleAbs(lap, out);

    img.delete();
    lap.delete();

    this.img = out;
    return this;
  }

  /** Scharr edge detection */
  scharr(): ImageProcessor {
    const img = this.img;

    const schX = new cv.Mat();
    const schY = new cv.Mat();

    cv.Scharr(img, schX, cv.CV_16S, 1, 0, 1, 0, cv.BORDER_DEFAULT);
    cv.Scharr(img, schY, cv.CV_16S, 0, 1, 1, 0, cv.BORDER_DEFAULT);

    const absX = new cv.Mat();
    const absY = new cv.Mat();

    cv.convertScaleAbs(schX, absX);
    cv.convertScaleAbs(schY, absY);

    const out = new cv.Mat();
    cv.addWeighted(absX, 0.5, absY, 0.5, 0, out);

    img.delete();
    schX.delete();
    schY.delete();

    absX.delete();
    absY.delete();

    this.img = out;
    return this;
  }

  /** Prewitt edge detection */
  prewitt(): ImageProcessor {
    const img = this.img;

    const kernelX = cv.matFromArray(
      3,
      3,
      cv.CV_32F,
      [-1, 0, 1, -1, 0, 1, -1, 0, 1]
    );

    const kernelY = cv.matFromArray(
      3,
      3,
      cv.CV_32F,
      [1, 1, 1, 0, 0, 0, -1, -1, -1]
    );

    const preX = new cv.Mat();
    const preY = new cv.Mat();

    cv.filter2D(img, preX, cv.CV_8U, kernelX);
    cv.filter2D(img, preY, cv.CV_8U, kernelY);

    const out = new cv.Mat();
    cv.addWeighted(preX, 0.5, preY, 0.5, 0, out);

    img.delete();
    kernelX.delete();
    kernelY.delete();

    preX.delete();
    preY.delete();

    this.img = out;
    return this;
  }

  /** Morphological Gradient */
  morphologicalGradient(size: [number, number] = [3, 3]): ImageProcessor {
    const img = this.img;

    const kernel = cv.getStructuringElement(
      cv.MORPH_RECT,
      new cv.Size(size[0], size[1])
    );

    const out = new cv.Mat();
    cv.morphologyEx(img, out, cv.MORPH_GRADIENT, kernel);
    img.delete();

    this.img = out;
    return this;
  }

  /** Difference of Gaussians */
  differenceOfGaussians(
    ksize1: [number, number] = [5, 5],
    sigma1 = 0,
    ksize2: [number, number] = [9, 9],
    sigma2 = 0
  ): ImageProcessor {
    const img = this.img;

    const g1 = new cv.Mat();
    const g2 = new cv.Mat();

    cv.GaussianBlur(img, g1, new cv.Size(ksize1[0], ksize1[1]), sigma1);
    cv.GaussianBlur(img, g2, new cv.Size(ksize2[0], ksize2[1]), sigma2);

    const out = new cv.Mat();
    cv.absdiff(g1, g2, out);

    img.delete();
    g1.delete();
    g2.delete();

    this.img = out;
    return this;
  }

  /**
   * Erode image
   * @param size Size of the block [width, height]
   * @param iter How many iterations
   */
  erode(size: [number, number] = [20, 20], iter = 1): ImageProcessor {
    const img = this.img;
    const kernel = cv.getStructuringElement(
      cv.MORPH_RECT,
      new cv.Size(size[0], size[1])
    );

    const imgErode = new cv.Mat();
    cv.erode(img, imgErode, kernel, new cv.Point(-1, -1), iter);
    img.delete();

    this.img = imgErode;
    return this;
  }

  /**
   * Dilate the image
   * @param size Size of the block [width,height]
   * @param iter How many iterations
   */
  dilate(size: [number, number] = [20, 20], iter = 1): ImageProcessor {
    const img = this.img;
    const kernel = cv.getStructuringElement(
      cv.MORPH_RECT,
      new cv.Size(size[0], size[1])
    );

    const imgDilate = new cv.Mat();
    cv.dilate(img, imgDilate, kernel, new cv.Point(-1, -1), iter);
    img.delete();

    this.img = imgDilate;
    return this;
  }

  /**
   * Thresholding an image
   * @param minVal 0-255
   * @param maxVal 0-255
   * @param type threshold type (cv.THRESH_...)
   */
  threshold(
    minVal = 0,
    maxVal = 255,
    type: cv.int = cv.THRESH_BINARY_INV + cv.THRESH_OTSU
  ): ImageProcessor {
    const img = this.img;
    const imgThreshold = new cv.Mat();

    cv.threshold(img, imgThreshold, minVal, maxVal, type);
    img.delete();

    this.img = imgThreshold;
    return this;
  }

  /**
   * Morph the image using morpologhyEx (dilate & erode)
   * @param size Size of the block [width,height]
   * @param op Morphological operation type (cv.MORPH_...)
   * @param iter Number of iterations
   */
  morph(
    size: [number, number] = [5, 5],
    op: cv.MorphTypes = cv.MORPH_OPEN,
    iter = 2
  ): ImageProcessor {
    const img = this.img;
    const kernel = cv.getStructuringElement(
      cv.MORPH_RECT,
      new cv.Size(size[0], size[1])
    );

    const imgMorph = new cv.Mat();
    cv.morphologyEx(img, imgMorph, op, kernel, new cv.Point(-1, -1), iter);
    img.delete();

    this.img = imgMorph;
    return this;
  }

  /**
   * Resize the image
   * @param width width of the image
   * @param height height of the image
   */

  resize(width: number, height: number): ImageProcessor {
    const img = this.img;
    const imgResize = new cv.Mat();

    cv.resize(img, imgResize, new cv.Size(width, height));
    img.delete();

    this.img = imgResize;
    return this;
  }

  /**
   * Straigthen an image perspective (box)
   * @param points Points containing x and y point in topLeft, topRight, bottomLeft and BottomRight
   * @param canvasBbox a new canvas bounding box for cropping the original canvas
   */
  correctBoxPerspective(
    points: Points,
    canvasBbox: BoundingBox
  ): ImageProcessor {
    const img = this.img;
    const imgWarp = new cv.Mat();

    const targetWidth = canvasBbox.x1 - canvasBbox.x0;
    const targetHeight = canvasBbox.y1 - canvasBbox.y0;

    const destArray = [
      0,
      0,
      targetWidth - 1,
      0,
      targetWidth - 1,
      targetHeight - 1,
      0,
      targetHeight - 1,
    ];

    const srcArray: number[] = [
      points.topLeft.x,
      points.topLeft.y,
      points.topRight.x,
      points.topRight.y,
      points.bottomRight.x,
      points.bottomRight.y,
      points.bottomLeft.x,
      points.bottomLeft.y,
    ];

    const dest = cv.matFromArray(4, 1, cv.CV_32FC2, destArray);
    const src = cv.matFromArray(4, 1, cv.CV_32FC2, srcArray);

    let M = cv.getPerspectiveTransform(src, dest);
    let dsize = new cv.Size(targetWidth, targetHeight);
    cv.warpPerspective(img, imgWarp, M, dsize);

    M.delete();
    src.delete();
    dest.delete();

    img.delete();
    this.img = imgWarp;
    return this;
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
  toMat(): cv.Mat {
    return this.img;
  }

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
   * Get all avaliable contours, the img is not destroyed
   * @param mode cv.RETR_...
   * @param method cv.CHAIN_...
   * @returns contours (cv.Mat)
   */
  getContours(
    mode: cv.int = cv.RETR_EXTERNAL,
    method: cv.int = cv.CHAIN_APPROX_SIMPLE
  ): Contours {
    const img = this.img;
    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();

    try {
      cv.findContours(img, contours, hierarchy, mode, method);
    } catch (error) {
      console.log(error);
    }

    hierarchy.delete();
    return new Contours(contours);
  }
}
