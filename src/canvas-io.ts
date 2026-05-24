// SPDX-License-Identifier: MIT
// Copyright (c) 2026 PT Perkasa Pilar Utama

/**
 * Canvas <-> ArrayBuffer conversion helpers, shared by `CanvasProcessor`'s
 * static `prepareCanvas` / `prepareBuffer`. Kept separate so the processor
 * class stays focused on the pixel pipeline.
 */
import type { CanvasLike } from "./canvas-factory.js";
import { getPlatform, isCanvasLike } from "./canvas-factory.js";

/**
 * Convert an ArrayBuffer (image file bytes) to a CanvasLike. If the value is
 * already a CanvasLike it is returned as-is.
 */
export async function bufferToCanvas(file: ArrayBuffer): Promise<CanvasLike> {
  if (isCanvasLike(file)) return file as unknown as CanvasLike;

  return getPlatform().loadImage(file);
}

/**
 * Convert a CanvasLike to an ArrayBuffer (PNG bytes). If the value is already
 * an ArrayBuffer it is returned as-is.
 */
export async function canvasToBuffer(canvas: CanvasLike): Promise<ArrayBuffer> {
  if (canvas instanceof ArrayBuffer) return canvas;

  if (typeof canvas.toBuffer === "function") {
    const buffer = canvas.toBuffer("image/png");
    const arrayBuffer = new ArrayBuffer(buffer.byteLength);

    new Uint8Array(arrayBuffer).set(new Uint8Array(buffer));
    return arrayBuffer;
  }

  // Browser HTMLCanvasElement: native async PNG encode, no base64 detour.
  const toBlob = canvas.toBlob;
  if (typeof toBlob === "function") {
    const blob = await new Promise<Blob>((resolve, reject) => {
      toBlob.call(
        canvas,
        (b: Blob | null) => (b ? resolve(b) : reject(new Error("toBlob returned null"))),
        "image/png"
      );
    });
    return blob.arrayBuffer();
  }

  // OffscreenCanvas (workers, browser extensions): no toDataURL; use convertToBlob.
  if (typeof canvas.convertToBlob === "function") {
    const blob = await canvas.convertToBlob({ type: "image/png" });
    return blob.arrayBuffer();
  }

  // Legacy fallback for canvases exposing only toDataURL.
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
  const canvasBuffer = new ArrayBuffer(imageData.data.byteLength);

  new Uint8Array(canvasBuffer).set(
    new Uint8Array(imageData.data.buffer, imageData.data.byteOffset, imageData.data.byteLength)
  );

  return canvasBuffer;
}
