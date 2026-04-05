import type { BoundingBox } from "./index.interface.js";
import type { CanvasLike, Context2DLike } from "./canvas-factory.js";
import { getPlatform } from "./canvas-factory.js";

/** Structural interface for contour-like objects with 32-bit signed integer point data */
export interface ContourLike {
  data32S: Int32Array | number[];
}

/**
 * Cross-platform base class for canvas manipulation utilities.
 * Contains only methods that work in both Node and browser environments.
 */
export class CanvasToolkitBase {
  protected static _baseInstance: CanvasToolkitBase | null = null;
  protected step: number = 0;

  protected constructor() {}

  public static getInstance(): CanvasToolkitBase {
    if (!CanvasToolkitBase._baseInstance) {
      CanvasToolkitBase._baseInstance = new CanvasToolkitBase();
    }
    return CanvasToolkitBase._baseInstance;
  }

  /**
   * Crop a part of source canvas and return a new canvas of the cropped part
   */
  crop(options: { bbox: BoundingBox; canvas: CanvasLike }): CanvasLike {
    const { bbox, canvas } = options;

    const croppedCanvas = getPlatform().createCanvas(
      bbox.x1 - bbox.x0,
      bbox.y1 - bbox.y0,
    );
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
      croppedCanvas.height,
    );

    return croppedCanvas;
  }

  /**
   * Check whether a binary canvas is dirty (full of major color either black or white) or not
   */
  isDirty(options: {
    canvas: CanvasLike;
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
      borderlessCanvas.height,
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
   * Draw a non-filled rectangle on the canvas
   */
  drawLine(options: {
    ctx: Context2DLike;
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
   */
  drawContour(options: {
    ctx: Context2DLike;
    contour: ContourLike;
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
