import cv, {
  type ContourApproximationModes,
  type RetrievalModes,
} from "@techstark/opencv-js";

export type ContoursCallbackFn = (contour: cv.Mat) => any;

export interface ContoursOptions {
  /** The contour retrieval mode. (cv.RETR_...) */
  mode: RetrievalModes;
  /** The contour approximation method. (cv.CHAIN_...) */
  method: ContourApproximationModes;
}

export const defaultOptions: ContoursOptions = {
  mode: cv.RETR_EXTERNAL,
  method: cv.CHAIN_APPROX_SIMPLE,
};

export class Contours {
  private contours!: cv.MatVector;

  constructor(img: cv.Mat, options: Partial<ContoursOptions> = {}) {
    const opts: ContoursOptions = {
      ...defaultOptions,
      ...options,
    };

    if (img instanceof cv.Mat) {
      const contours = new cv.MatVector();
      const hierarchy = new cv.Mat();

      try {
        cv.findContours(img, contours, hierarchy, opts.mode, opts.method);
      } catch (error) {
        throw error;
      }

      hierarchy.delete();

      this.contours = contours;
    } else {
      throw new Error("Invalid img type. Must be cv.Mat.");
    }
  }

  getAll(): cv.MatVector {
    return this.contours;
  }

  get(index: number): cv.Mat {
    if (index < this.contours.size()) {
      return this.contours.get(index);
    }

    return new cv.Mat();
  }

  getRect(c: cv.Mat): cv.Rect {
    return cv.boundingRect(c);
  }

  iterate(callback: ContoursCallbackFn): Contours {
    for (
      let i = 0, len = this.contours.size() as unknown as number;
      i < len;
      i++
    ) {
      const contour = this.contours.get(i);
      callback(contour);
    }

    return this;
  }

  getLargestContourArea(): cv.Mat | null {
    let maxArea = 0;
    let largestContour: cv.Mat | null = null;

    this.iterate((contour) => {
      const area = cv.contourArea(contour);
      if (area > maxArea) {
        maxArea = area;
        largestContour = contour;
      }
    });

    return largestContour;
  }

  destroy(): void {
    try {
      this.contours.delete();
    } catch (error) {}
  }
}
