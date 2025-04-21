import cv from "@techstark/opencv-js";

export type ContoursCallbackFn = (contour: cv.Mat) => any;

export class Contours {
  private contours!: cv.MatVector;

  constructor(contours: cv.MatVector) {
    this.contours = contours;
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
