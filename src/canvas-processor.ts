import type { CanvasLike } from "./canvas-factory.js";
import { getPlatform } from "./canvas-factory.js";

/**
 * Canvas I/O utilities that work without OpenCV.
 * Safe to use in constrained environments (e.g. Browser Extensions)
 * where OpenCV cannot be initialized.
 */
export class CanvasProcessor {
  /**
   * Convert an ArrayBuffer (image file bytes) to a CanvasLike.
   * If the value is already a CanvasLike it is returned as-is.
   */
  static async prepareCanvas(file: ArrayBuffer): Promise<CanvasLike> {
    if (getPlatform().isCanvas(file)) return file as unknown as CanvasLike;

    return getPlatform().loadImage(file);
  }

  /**
   * Convert a CanvasLike to an ArrayBuffer (PNG bytes).
   * If the value is already an ArrayBuffer it is returned as-is.
   */
  static async prepareBuffer(canvas: CanvasLike): Promise<ArrayBuffer> {
    if (canvas instanceof ArrayBuffer) return canvas;

    if (typeof canvas.toBuffer === "function") {
      const buffer = canvas.toBuffer("image/png");
      const arrayBuffer = new ArrayBuffer(buffer.byteLength);

      new Uint8Array(arrayBuffer).set(new Uint8Array(buffer));
      return arrayBuffer;
    }

    if (typeof canvas.toDataURL === "function") {
      const dataURL = canvas.toDataURL("image/png");
      const base64Data = dataURL.replace(/^data:image\/png;base64,/, "");

      const binaryString = atob(base64Data);
      const arrayBuffer = new ArrayBuffer(binaryString.length);
      const bytes = new Uint8Array(arrayBuffer);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return arrayBuffer;
    }

    const ctx = canvas.getContext("2d");
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let canvasBuffer = new ArrayBuffer(imageData.data.byteLength);

    new Uint8Array(canvasBuffer).set(
      new Uint8Array(
        imageData.data.buffer,
        imageData.data.byteOffset,
        imageData.data.byteLength,
      ),
    );

    return canvasBuffer;
  }
}
