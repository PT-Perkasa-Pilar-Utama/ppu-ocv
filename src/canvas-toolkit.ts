import type { BoundingBox, SKRSContext2D } from "./index.js";
import { Canvas, createCanvas, cv } from "./index.js";

import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readdirSync,
  unlinkSync,
} from "fs";
import { join } from "path";

/**
 * Singleton class for canvas manipulation utilities
 */
export class CanvasToolkit {
  private static instance: CanvasToolkit | null = null;
  private step: number = 0;

  /**
   * Private constructor to prevent direct instantiation
   */
  private constructor() {}

  /**
   * Get the singleton instance of CanvasToolkit
   * @returns The singleton instance
   * @example
   * const canvasToolkit = CanvasToolkit.getInstance();
   */
  public static getInstance(): CanvasToolkit {
    if (!CanvasToolkit.instance) {
      CanvasToolkit.instance = new CanvasToolkit();
    }
    return CanvasToolkit.instance;
  }

  /**
   * Crop a part of source canvas and return a new canvas of the cropped part
   * @param options
   * @param options.bbox Bounding box of the cropped part
   * @param options.canvas Source canvas
   * @returns A new canvas of the cropped part
   * @example
   * const croppedCanvas = CanvasToolkit.getInstance().crop({
   *   bbox: { x0: 10, y0: 10, x1: 100, y1: 100 },
   *   canvas: sourceCanvas,
   * });
   */
  crop(options: { bbox: BoundingBox; canvas: Canvas }): Canvas {
    const { bbox, canvas } = options;

    const croppedCanvas = createCanvas(bbox.x1 - bbox.x0, bbox.y1 - bbox.y0);
    const croppedCtx = croppedCanvas.getContext("2d");

    croppedCtx.drawImage(
      canvas,
      bbox.x0,
      bbox.y0,
      bbox.x1 - bbox.x0,
      bbox.y1 - bbox.y0,
      0,
      0,
      croppedCanvas.width,
      croppedCanvas.height
    );

    return croppedCanvas;
  }

  /**
   * Check whether a binary canvas is dirty (full of major color either black or white) or not
   * @param options
   * @param options.canvas Source canvas
   * @param options.threshold Threshold for color detection (default: 127.5)
   * @param options.majorColorThreshold Major color threshold (default: 0.97)
   * @returns true if the canvas is dirty, false otherwise
   * @example
   * const isDirty = CanvasToolkit.getInstance().isDirty({
   *   canvas: sourceCanvas,
   *   threshold: 127.5,
   *   majorColorThreshold: 0.97,
   * });
   * console.log(isDirty); // true or false
   */
  isDirty(options: {
    canvas: Canvas;
    threshold?: number;
    majorColorThreshold?: number;
  }): boolean {
    const { canvas, threshold = 127.5, majorColorThreshold = 0.97 } = options;

    let whiteCount = 0;
    let blackCount = 0;

    const borderlessCanvas = this.crop({
      bbox: {
        x0: canvas.width * 0.1,
        y0: canvas.height * 0.1,
        x1: canvas.width * 0.9,
        y1: canvas.height * 0.9,
      },
      canvas,
    });

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

    return majorColorRatio < majorColorThreshold;
  }

  /**
   * Save a canvas to an image file
   * @param options
   * @param options.canvas Source canvas
   * @param options.filename Filename of the image file
   * @param options.path Path to save the image file (default: "out")
   * @returns A promise that resolves when the image is saved
   * @example
   * await CanvasToolkit.getInstance().saveImage({
   *   canvas: sourceCanvas,
   *   filename: "output.png",
   * });
   */
  saveImage(options: {
    canvas: Canvas;
    filename: string;
    path: string;
  }): Promise<void> {
    const { canvas, filename, path = "out" } = options;

    const folderPath = join(process.cwd(), path);
    if (!existsSync(folderPath)) {
      mkdirSync(folderPath, { recursive: true });
    }

    const filePath = join(folderPath, `${this.step++}. ${filename}.png`);
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

  /**
   * Clear the output folder
   * @param path Path to the output folder (default: "out")
   */
  clearOutput(path: string = "out"): void {
    const folderPath = join(process.cwd(), path);
    if (existsSync(folderPath)) {
      const files = readdirSync(folderPath);
      for (const file of files) {
        if (file === ".gitignore") continue;

        const filePath = join(folderPath, file);
        unlinkSync(filePath);
      }
    }
  }

  /**
   * Draw a non-filled rectangle on the canvas
   * @param options
   * @param options.ctx Canvas rendering context
   * @param options.x X coordinate of the top-left corner
   * @param options.y Y coordinate of the top-left corner
   * @param options.width Width of the rectangle
   * @param options.height Height of the rectangle
   * @param options.lineWidth Line width (default: 2)
   * @param options.color Color of the rectangle (default: "blue")
   */
  drawLine(options: {
    ctx: SKRSContext2D;
    x: number;
    y: number;
    width: number;
    height: number;
    lineWidth?: number;
    color?: string;
  }): void {
    const { ctx, x, y, width, height, lineWidth = 2, color = "blue" } = options;
    ctx.beginPath();

    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;

    ctx.strokeRect(x, y, width, height);
    ctx.closePath();
  }

  /**
   * Draw a contour on the canvas
   * @param options
   * @param options.ctx Canvas rendering context
   * @param options.contour Contour to be drawn
   * @param options.strokeStyle Stroke color (default: "red")
   * @param options.lineWidth Line width (default: 2)
   */
  drawContour(options: {
    ctx: SKRSContext2D;
    contour: cv.Mat;
    strokeStyle?: string;
    lineWidth?: number;
  }): void {
    const { ctx, contour, strokeStyle = "red", lineWidth = 2 } = options;

    const pts = contour.data32S as Int32Array;
    if (pts.length < 4) return;

    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;

    ctx.beginPath();
    ctx.moveTo(pts[0]!, pts[1]!);

    for (let i = 2; i < pts.length; i += 2) {
      ctx.lineTo(pts[i]!, pts[i + 1]!);
    }

    ctx.closePath();
    ctx.stroke();
  }
}
