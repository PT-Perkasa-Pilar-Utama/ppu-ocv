/**
 * Platform abstraction layer for canvas operations.
 * Allows ppu-ocv to work with both @napi-rs/canvas (Node) and browser canvas APIs.
 */

/** Structural type satisfied by both @napi-rs/canvas Canvas and HTMLCanvasElement/OffscreenCanvas */
export interface CanvasLike {
  width: number;
  height: number;
  getContext(contextId: "2d"): any;
  toBuffer?: (...args: any[]) => Buffer;
  toDataURL?: (...args: any[]) => string;
}

/** Structural type for 2D rendering context */
export interface Context2DLike {
  canvas: any;
  drawImage(...args: any[]): void;
  getImageData(
    sx: number,
    sy: number,
    sw: number,
    sh: number,
  ): { data: Uint8ClampedArray; width: number; height: number };
  putImageData(imageData: any, dx: number, dy: number): void;
  createImageData(width: number, height: number): any;
  beginPath(): void;
  closePath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  stroke(): void;
  strokeRect(x: number, y: number, w: number, h: number): void;
  strokeStyle: string | CanvasGradient | CanvasPattern;
  lineWidth: number;
}

/** Platform-specific canvas operations */
export interface CanvasPlatform {
  createCanvas(width: number, height: number): CanvasLike;
  loadImage(source: ArrayBuffer | string): Promise<CanvasLike>;
  isCanvas(value: unknown): value is CanvasLike;
}

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
        '"ppu-ocv/canvas" (Node canvas-only), or "ppu-ocv/canvas-web" (browser canvas-only) to auto-register.',
    );
  }
  return _platform;
}
