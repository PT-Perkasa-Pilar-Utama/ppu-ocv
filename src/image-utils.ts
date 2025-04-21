import { Canvas } from "@napi-rs/canvas";
import cv from "@techstark/opencv-js";
import type { BoundingBox, Points } from "./index.interface";

export class ImageUtil {
  constructor() {}

  /**
   * Calculate a rect new points and new canvas based on contour
   * @param contour cv.Mat contour
   * @param srcCanvas Canvas source
   */
  calculateRectPointsAndCanvas(
    contour: cv.Mat,
    srcCanvas: Canvas
  ): { points: Points; canvasBbox: BoundingBox } {
    const canvasBbox: BoundingBox = {
      x0: 0,
      y0: 0,
      x1: srcCanvas.width,
      y1: srcCanvas.height,
    };

    // For a rotated rectangle, we should use minAreaRect
    const rect = cv.minAreaRect(contour) as any;
    const vertices = (cv.RotatedRect as any).points(rect) as {
      x: number;
      y: number;
    }[];

    // Sort vertices to get the corners in correct order
    // We'll sort by the sum and difference of x and y coordinates
    // This works because:
    // - topLeft has the smallest sum of x+y
    // - topRight has the smallest difference of y-x
    // - bottomRight has the largest sum of x+y
    // - bottomLeft has the largest difference of y-x
    const points = {
      topLeft: { x: 0, y: 0 },
      topRight: { x: 0, y: 0 },
      bottomRight: { x: 0, y: 0 },
      bottomLeft: { x: 0, y: 0 },
    };

    // Calculate sums and differences
    const sums = vertices.map((pt) => pt.x + pt.y);
    const diffs = vertices.map((pt) => pt.y - pt.x);

    // Find indices
    const topLeftIdx = sums.indexOf(Math.min(...sums));
    const topRightIdx = diffs.indexOf(Math.min(...diffs));

    const bottomRightIdx = sums.indexOf(Math.max(...sums));
    const bottomLeftIdx = diffs.indexOf(Math.max(...diffs));

    // Assign points
    if (
      !vertices[topLeftIdx] ||
      !vertices[topRightIdx] ||
      !vertices[bottomRightIdx] ||
      !vertices[bottomLeftIdx]
    ) {
      return {
        points: {
          topLeft: {
            x: canvasBbox.x0,
            y: canvasBbox.y0,
          },
          topRight: {
            x: canvasBbox.x1,
            y: canvasBbox.y0,
          },
          bottomLeft: {
            x: canvasBbox.x0,
            y: canvasBbox.y1,
          },
          bottomRight: {
            x: canvasBbox.x1,
            y: canvasBbox.y1,
          },
        },
        canvasBbox,
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

    // Ensure points are within canvas bounds
    const ensureInBounds = (p: { x: number; y: number }) => {
      p.x = Math.max(0, Math.min(srcCanvas.width, p.x));
      p.y = Math.max(0, Math.min(srcCanvas.height, p.y));
      return p;
    };

    points.topLeft = ensureInBounds(points.topLeft);
    points.topRight = ensureInBounds(points.topRight);

    points.bottomLeft = ensureInBounds(points.bottomLeft);
    points.bottomRight = ensureInBounds(points.bottomRight);

    return {
      points,
      canvasBbox,
    };
  }
}
