// SPDX-License-Identifier: MIT
// Copyright (c) 2026 PT Perkasa Pilar Utama

/**
 * Platform abstraction layer for canvas operations.
 * Allows ppu-ocv to work with both @napi-rs/canvas (Node) and browser canvas APIs.
 */

/** Structural type satisfied by both @napi-rs/canvas Canvas and HTMLCanvasElement/OffscreenCanvas. */
export type CanvasLike = {
  /** Canvas width in pixels. */
  width: number;
  /** Canvas height in pixels. */
  height: number;
  /** Return a 2D rendering context for drawing on the canvas. */
  // oxlint-disable-next-line typescript/no-explicit-any -- platform bridging type
  getContext(contextId: "2d"): any;
  /** Serialize the canvas to a binary buffer (Node-side `@napi-rs/canvas`). Absent on browser canvases. */
  // oxlint-disable-next-line typescript/no-explicit-any -- platform bridging type
  toBuffer?: (...args: any[]) => Buffer;
  /** Serialize the canvas to a data-URL string (browser canvases). Absent on Node-side `@napi-rs/canvas`. */
  // oxlint-disable-next-line typescript/no-explicit-any -- platform bridging type
  toDataURL?: (...args: any[]) => string;
};

/** Structural type for 2D rendering context, matching the cross-runtime subset used by ppu-ocv. */
export type Context2DLike = {
  /** The canvas this context is bound to. */
  // oxlint-disable-next-line typescript/no-explicit-any -- platform bridging type
  canvas: any;
  /** Draw an image, canvas, or bitmap onto the context. Signature follows the standard Canvas2D `drawImage`. */
  // oxlint-disable-next-line typescript/no-explicit-any -- platform bridging type
  drawImage(...args: any[]): void;
  /** Read raw RGBA pixel data from a rectangular region of the canvas. */
  getImageData(
    sx: number,
    sy: number,
    sw: number,
    sh: number
  ): { data: Uint8ClampedArray; width: number; height: number };
  /** Write raw RGBA pixel data back to the canvas at `(dx, dy)`. */
  // oxlint-disable-next-line typescript/no-explicit-any, typescript/explicit-module-boundary-types -- platform bridging type
  putImageData(imageData: any, dx: number, dy: number): void;
  /** Allocate a blank `ImageData` of the given size. */
  // oxlint-disable-next-line typescript/no-explicit-any -- platform bridging type
  createImageData(width: number, height: number): any;
  /** Start a new path for stroke/fill commands. */
  beginPath(): void;
  /** Close the current sub-path by connecting the last point to the first. */
  closePath(): void;
  /** Move the path cursor to `(x, y)` without drawing. */
  moveTo(x: number, y: number): void;
  /** Draw a straight line from the current path point to `(x, y)`. */
  lineTo(x: number, y: number): void;
  /** Stroke the current path with the current `strokeStyle` and `lineWidth`. */
  stroke(): void;
  /** Stroke an axis-aligned rectangle outline. */
  strokeRect(x: number, y: number, w: number, h: number): void;
  /** Color, gradient, or pattern used by `stroke` and `strokeRect`. */
  strokeStyle: string | CanvasGradient | CanvasPattern;
  /** Width in pixels of the line drawn by `stroke` / `strokeRect`. */
  lineWidth: number;
  /** Color, gradient, or pattern used by `fill` and `fillRect`. */
  fillStyle: string | CanvasGradient | CanvasPattern;
  /** Fill an axis-aligned rectangle with the current `fillStyle`. */
  fillRect(x: number, y: number, w: number, h: number): void;
  /** Save the current drawing state (transform, styles) onto the state stack. */
  save(): void;
  /** Restore the most recently saved drawing state. */
  restore(): void;
  /** Translate the coordinate system by `(x, y)`. */
  translate(x: number, y: number): void;
  /** Rotate the coordinate system clockwise by `angle` radians. */
  rotate(angle: number): void;
};

/** Platform-specific canvas operations. Each runtime entry point registers an implementation via {@link setPlatform}. */
export type CanvasPlatform = {
  /** Create a blank canvas of the given width and height. */
  createCanvas(width: number, height: number): CanvasLike;
  /** Decode an image from a buffer or URL and draw it onto a fresh canvas. */
  loadImage(source: ArrayBuffer | string): Promise<CanvasLike>;
  /** Type guard for "is this value a canvas of this platform?". */
  isCanvas(value: unknown): value is CanvasLike;
};

let _platform: CanvasPlatform | null = null;

/** Register the platform-specific canvas implementation */
export function setPlatform(platform: CanvasPlatform): void {
  _platform = platform;
}

/** Get the registered platform. Throws if none has been set. */
export function getPlatform(): CanvasPlatform {
  if (!_platform) {
    throw new Error(
      "No canvas platform registered. " +
        'Import "ppu-ocv" (Node), "ppu-ocv/web" (browser), ' +
        '"ppu-ocv/canvas" (Node canvas-only), "ppu-ocv/canvas-web" (browser canvas-only), ' +
        'or "ppu-ocv/canvas-mobile" (React Native / Skia) to auto-register.'
    );
  }
  return _platform;
}

/**
 * Structural ("duck-typed") canvas check, independent of the registered
 * platform. A value is canvas-like if it exposes `width`/`height` numbers and a
 * `getContext` function — true for both `@napi-rs/canvas` (Node) and browser
 * `HTMLCanvasElement`/`OffscreenCanvas`.
 *
 * Unlike {@link CanvasPlatform.isCanvas}, this does not depend on which platform
 * is globally registered, so it stays correct when the Node and web entry
 * points are loaded in the same process (e.g. a dual-target test suite).
 */
export function isCanvasLike(value: unknown): value is CanvasLike {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as CanvasLike).getContext === "function" &&
    typeof (value as CanvasLike).width === "number" &&
    typeof (value as CanvasLike).height === "number"
  );
}
