import type { BoundingBox, Canvas, Coordinate, Points } from "@/index";
import { cv } from "@/index";

export interface ContoursOptions {
  /** The contour retrieval mode. (cv.RETR_...) */
  mode: cv.RetrievalModes;
  /** The contour approximation method. (cv.CHAIN_...) */
  method: cv.ContourApproximationModes;
}

function defaultOptions(): ContoursOptions {
  return {
    mode: cv.RETR_EXTERNAL,
    method: cv.CHAIN_APPROX_SIMPLE,
  };
}

export class Contours {
  private contours: cv.MatVector;

  /** The constructor for the Contours class. It takes an image and options as parameters. */
  /**
   * @param img - The image to find contours in.
   * @param options.mode - The contour retrieval mode. (cv.RETR_...)
   * @param options.method - The contour approximation method. (cv.CHAIN_...)
   * @example
   * const contours = new Contours(image, {
   *   mode: cv.RETR_EXTERNAL,
   *   method: cv.CHAIN_APPROX_SIMPLE,
   * });
   */
  constructor(img: cv.Mat, options: Partial<ContoursOptions> = {}) {
    const opts: ContoursOptions = {
      ...defaultOptions(),
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

  /**
   *  Get the all of contours found in the image.
   * @returns The number of contours found in the image (cv.MatVector).
   */
  getAll(): cv.MatVector {
    return this.contours;
  }

  /**
   * Get contour at a specific index.
   * @param index - The index of the contour to get.
   * @returns The contour at the specified index (cv.Mat).
   */
  getFromIndex(index: number): cv.Mat {
    if (index < this.contours.size()) {
      return this.contours.get(index);
    }

    return new cv.Mat();
  }

  /**
   * Get the rectangle that bounds the contour.
   * @param contour - The contour to get the bounding rectangle for.
   * @returns The bounding rectangle for the contour (cv.Rect).
   */
  getRect(contour: cv.Mat): cv.Rect {
    return cv.boundingRect(contour);
  }

  /**
   * Iterate over all contours and call the callback function for each contour.
   * @param callback - The callback function to call for each contour.
   * The callback function takes a contour as a parameter.
   * @returns void
   */
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

  /**
   * Get the largest contour area.
   * @returns The largest contour area (cv.Mat).
   */
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

  /**
   * Get four corner points for a given contour.
   * Useful for perspective transformation (warp).
   * @param options.canvas - The canvas to get the corner points for.
   * @param options.contour - The contour to get the corner points for. If not provided, the largest contour area will be used.
   * @returns The four corner points of the contour (topLeft, topRight, bottomLeft, bottomRight) and the bounding box.
   */
  getCornerPoints(options: { canvas: Canvas; contour?: cv.Mat }): {
    points: Points;
    bbox: BoundingBox;
  } {
    const { canvas, contour = this.getLargestContourArea() } = options;

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

  /**
   * Delete the contours object.
   */
  destroy(): void {
    try {
      this.contours.delete();
    } catch (error) {}
  }
}
