import type { BoundingBox, Coordinate, Points } from "@/index";
import type { Canvas } from "@napi-rs/canvas";
import cv, {
  type ContourApproximationModes,
  type RetrievalModes,
} from "@techstark/opencv-js";

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
  private contours: cv.MatVector;

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

  getIndex(index: number): cv.Mat {
    if (index < this.contours.size()) {
      return this.contours.get(index);
    }

    return new cv.Mat();
  }

  getRect(c: cv.Mat): cv.Rect {
    return cv.boundingRect(c);
  }

  iterate(callback: (contour: cv.Mat) => any): Contours {
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

  getCornerPoints(canvas: Canvas): { points: Points; bbox: BoundingBox } {
    const contour = this.getLargestContourArea();
    const bbox: BoundingBox = {
      x0: 0,
      y0: 0,
      x1: canvas.width,
      y1: canvas.height,
    };

    if (!contour) {
      return {
        points: {
          topLeft: { x: bbox.x0, y: bbox.y0 },
          topRight: { x: bbox.x1, y: bbox.y0 },
          bottomLeft: { x: bbox.x0, y: bbox.y1 },
          bottomRight: { x: bbox.x1, y: bbox.y1 },
        },
        bbox,
      };
    }

    const rect = cv.minAreaRect(contour) as any;
    const vertices = (cv.RotatedRect as any).points(rect) as Coordinate[];

    const points = {
      topLeft: { x: 0, y: 0 },
      topRight: { x: 0, y: 0 },
      bottomRight: { x: 0, y: 0 },
      bottomLeft: { x: 0, y: 0 },
    };

    const sums = vertices.map((pt) => pt.x + pt.y);
    const diffs = vertices.map((pt) => pt.y - pt.x);

    const topLeftIdx = sums.indexOf(Math.min(...sums));
    const topRightIdx = diffs.indexOf(Math.min(...diffs));

    const bottomRightIdx = sums.indexOf(Math.max(...sums));
    const bottomLeftIdx = diffs.indexOf(Math.max(...diffs));

    if (
      !vertices[topLeftIdx] ||
      !vertices[topRightIdx] ||
      !vertices[bottomRightIdx] ||
      !vertices[bottomLeftIdx]
    ) {
      return {
        points: {
          topLeft: {
            x: bbox.x0,
            y: bbox.y0,
          },
          topRight: {
            x: bbox.x1,
            y: bbox.y0,
          },
          bottomLeft: {
            x: bbox.x0,
            y: bbox.y1,
          },
          bottomRight: {
            x: bbox.x1,
            y: bbox.y1,
          },
        },
        bbox,
      };
    }

    points.topLeft = { x: vertices[topLeftIdx].x, y: vertices[topLeftIdx].y };
    points.topRight = {
      x: vertices[topRightIdx].x,
      y: vertices[topRightIdx].y,
    };
    points.bottomRight = {
      x: vertices[bottomRightIdx].x,
      y: vertices[bottomRightIdx].y,
    };
    points.bottomLeft = {
      x: vertices[bottomLeftIdx].x,
      y: vertices[bottomLeftIdx].y,
    };

    contour.delete();

    const ensureInBounds = (p: { x: number; y: number }) => {
      p.x = Math.max(0, Math.min(canvas.width, p.x));
      p.y = Math.max(0, Math.min(canvas.height, p.y));
      return p;
    };

    points.topLeft = ensureInBounds(points.topLeft);
    points.topRight = ensureInBounds(points.topRight);

    points.bottomLeft = ensureInBounds(points.bottomLeft);
    points.bottomRight = ensureInBounds(points.bottomRight);

    return {
      points,
      bbox,
    };
  }

  destroy(): void {
    try {
      this.contours.delete();
    } catch (error) {}
  }
}
