import type { CanvasLike } from "../../src/canvas-factory.js";
import { cv, ImageProcessor } from "../../src/index.js";

export function makeMono(value: number, w = 4, h = 4): cv.Mat {
  const mat = new cv.Mat(h, w, cv.CV_8UC1);
  mat.data.fill(value);
  return mat;
}

export function pixels(mat: cv.Mat): number[] {
  return Array.from(new Uint8Array(mat.data));
}

export async function loadDibco(): Promise<CanvasLike> {
  const { CanvasProcessor } = await import("../../src/canvas-processor.js");
  const buffer = await Bun.file("./assets/dibco_cropped.png").arrayBuffer();
  return CanvasProcessor.prepareCanvas(buffer);
}

export async function initRuntime(): Promise<void> {
  await ImageProcessor.initRuntime();
}
