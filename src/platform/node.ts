import {
  Canvas,
  createCanvas as napiCreateCanvas,
  loadImage as napiLoadImage,
} from "@napi-rs/canvas";
import type { CanvasLike, CanvasPlatform } from "../canvas-factory.js";

/** Node.js canvas platform backed by @napi-rs/canvas */
export const nodePlatform: CanvasPlatform = {
  createCanvas(width: number, height: number): CanvasLike {
    return napiCreateCanvas(width, height) as unknown as CanvasLike;
  },

  async loadImage(source: ArrayBuffer | string): Promise<CanvasLike> {
    const img = await napiLoadImage(source);
    const canvas = napiCreateCanvas(img.width, img.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    return canvas as unknown as CanvasLike;
  },

  isCanvas(value: unknown): value is CanvasLike {
    return value instanceof Canvas;
  },
};
