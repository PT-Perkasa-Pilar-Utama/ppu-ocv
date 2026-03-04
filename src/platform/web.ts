import type { CanvasLike, CanvasPlatform } from "../canvas-factory.js";

/** Browser canvas platform using native DOM / OffscreenCanvas APIs */
export const webPlatform: CanvasPlatform = {
  createCanvas(width: number, height: number): CanvasLike {
    if (typeof OffscreenCanvas !== "undefined") {
      return new OffscreenCanvas(width, height) as unknown as CanvasLike;
    }
    if (typeof document !== "undefined") {
      const c = document.createElement("canvas");
      c.width = width;
      c.height = height;
      return c as unknown as CanvasLike;
    }
    throw new Error("No canvas implementation available in this environment.");
  },

  async loadImage(source: ArrayBuffer | string): Promise<CanvasLike> {
    let blob: Blob;
    if (source instanceof ArrayBuffer) {
      blob = new Blob([source]);
    } else if (typeof source === "string") {
      const res = await fetch(source);
      blob = await res.blob();
    } else {
      throw new Error("loadImage: unsupported source type");
    }

    const bitmap = await createImageBitmap(blob);
    const canvas = webPlatform.createCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap as CanvasImageSource, 0, 0);
    bitmap.close();
    return canvas;
  },

  isCanvas(value: unknown): value is CanvasLike {
    if (
      typeof HTMLCanvasElement !== "undefined" &&
      value instanceof HTMLCanvasElement
    ) {
      return true;
    }
    if (
      typeof OffscreenCanvas !== "undefined" &&
      value instanceof OffscreenCanvas
    ) {
      return true;
    }
    return false;
  },
};
