import { Canvas, createCanvas } from "@napi-rs/canvas";
import cv from "@techstark/opencv-js";
import { createWriteStream, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { ImageProcessor } from "./image-processor-bak";
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

  /**
   * Crop a part of canvas and return a new canvas of the cropped part
   * @param box Box/bounding box containing x0, y0, x1, and y1
   * @param sourceCanvas Canvas source
   */
  cropBox(box: BoundingBox, sourceCanvas: Canvas): Canvas {
    const croppedCanvas = createCanvas(box.x1 - box.x0, box.y1 - box.y0);
    const croppedCtx = croppedCanvas.getContext("2d");

    croppedCtx.drawImage(
      sourceCanvas,
      box.x0,
      box.y0,
      box.x1 - box.x0,
      box.y1 - box.y0,
      0,
      0,
      croppedCanvas.width,
      croppedCanvas.height
    );

    return croppedCanvas;
  }

  /**
   * Check wether a canvas is dirty (full of major color either black or white) or not
   * @param canvas Canvas to check
   * @param threshold Black and white threshold value
   * @param majorColorThreshold Threshold for deciding canvas is clean/dirty {0-1}
   * @returns boolean
   */
  isCanvasDirty(
    canvas: Canvas,
    threshold = 127.5,
    majorColorThreshold = 0.97
  ): boolean {
    let whiteCount = 0;
    let blackCount = 0;

    const borderlessCanvas = this.cropBox(
      {
        x0: canvas.width * 0.1,
        y0: canvas.height * 0.1,
        x1: canvas.width * 0.9,
        y1: canvas.height * 0.9,
      },
      canvas
    );
    const ctx = borderlessCanvas.getContext("2d");
    const colorData = ctx.getImageData(
      0,
      0,
      borderlessCanvas.width,
      borderlessCanvas.height
    ).data;

    for (let i = 0; i < colorData.length; i += 4) {
      const red = colorData[i] as number;
      const green = colorData[i + 1] as number;
      const blue = colorData[i + 2] as number;

      if (red >= threshold && green >= threshold && blue >= threshold) {
        whiteCount++;
      } else {
        blackCount++;
      }
    }

    const majorColorRatio =
      Math.max(whiteCount, blackCount) / (blackCount + whiteCount);

    return majorColorRatio < majorColorThreshold ? true : false;
  }

  /**
   *
   * @param src  Source image
   * @param dimension  Dimension of the image to be resized
   * @returns  Brightness value (0-1)
   */

  calculateBrightness(
    src: Canvas,
    dimension: { width: number; height: number } = { width: 10, height: 10 }
  ): number {
    const imageProcessor = new ImageProcessor(src);
    const resized = imageProcessor
      .resize(dimension.width, dimension.height)
      .toMat();

    const labImg = new cv.Mat();
    cv.cvtColor(resized, labImg, cv.COLOR_BGR2Lab);

    const channels = new cv.MatVector();
    cv.split(labImg, channels);

    const L = channels.get(0);
    const mask = new cv.Mat();
    const maxPixelValue = cv.minMaxLoc(L, mask).maxVal;
    const scalarMat = new cv.Mat(
      L.rows,
      L.cols,
      L.type(),
      new cv.Scalar(maxPixelValue)
    );

    cv.divide(L, scalarMat, L);
    const meanL = cv.mean(L)[0];

    imageProcessor.destroy();
    labImg.delete();
    channels.delete();
    L.delete();
    mask.delete();
    scalarMat.delete();

    return meanL ?? 0;
  }

  /**
   *
   * @param src  Source image
   * @returns pixel mean color value (number)
   */
  getPixelMeanValue(src: Canvas): number {
    const imageProcessor = new ImageProcessor(src);
    const grayscaleImg = imageProcessor.blur().grayscale().toMat();

    const mean = cv.mean(grayscaleImg)[0];

    return mean ?? 0;
  }

  /**
   * Save a canvas to an image file
   * @param canvas Canvas to save
   * @param filename Filename to save as (with file extension)
   * @param path Path to save the image (default: "out")
   */
  saveCanvasToImage(
    canvas: Canvas,
    filename: string,
    path: string = "out"
  ): Promise<void> {
    const folderPath = join(process.cwd(), path);
    if (!existsSync(folderPath)) {
      mkdirSync(folderPath, { recursive: true });
    }

    const filePath = join(folderPath, filename);
    const out = createWriteStream(filePath);
    const buffer = canvas.toBuffer("image/png");

    return new Promise<void>((res, rej) => {
      out.write(buffer, (err) => {
        if (err) {
          rej(err);
        } else {
          res();
        }
      });
    });
  }

  drawLine(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    color = "blue"
  ): void {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;

    ctx.strokeRect(x, y, width, height);
    ctx.closePath();
  }

  drawContour(
    ctx: CanvasRenderingContext2D,
    contour: cv.Mat,
    strokeStyle = "red",
    lineWidth = 2
  ): void {
    // contour.data32S is a flat Int32Array: [x0, y0, x1, y1, …]
    const pts = contour.data32S as Int32Array;
    if (pts.length < 4) return; // need at least two points to draw

    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    // move to first point
    ctx.moveTo(pts[0]!, pts[1]!);
    // draw lines to each subsequent point
    for (let i = 2; i < pts.length; i += 2) {
      ctx.lineTo(pts[i]!, pts[i + 1]!);
    }
    ctx.closePath(); // connect back to start
    ctx.stroke();
  }
}
