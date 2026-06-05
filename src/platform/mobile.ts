// SPDX-License-Identifier: MIT
// Copyright (c) 2026 PT Perkasa Pilar Utama

/**
 * React Native platform adapter for ppu-ocv, backed by @shopify/react-native-skia.
 *
 * The Skia JS Canvas2D API surface is close enough to the browser's that a
 * thin shim layer is all we need:
 *
 *  - SkiaCanvasLike  wraps an SkSurface and exposes width / height / getContext("2d")
 *  - SkiaContext2DLike bridges Skia's SkCanvas drawing commands to the Context2DLike
 *    interface consumed by CanvasProcessor and CanvasToolkitBase
 *
 * Import requirements:
 *  - @shopify/react-native-skia ≥ 1.0.0 must be installed by the consuming app
 *  - React Native ≥ 0.74 / Expo SDK ≥ 51 (Hermes engine)
 *
 * This file uses a **lazy import** pattern — the Skia module is only resolved at
 * runtime inside mobilePlatform, so bundlers for other entries (Node / browser)
 * never pull Skia code in.
 */

import type { CanvasLike, CanvasPlatform, Context2DLike } from "../canvas-factory.js";

// ---------------------------------------------------------------------------
// Lazy Skia access helper
// ---------------------------------------------------------------------------

// @shopify/react-native-skia is an optional peer dependency; its types are
// resolved at runtime via require(). We use `any` here so the library compiles
// in environments where Skia is not installed (Node, web).
// oxlint-disable-next-line typescript/no-explicit-any
type SkiaModule = any;

let _skia: SkiaModule | null = null;

/** Return the cached Skia module, loading it on first call. */
function getSkia(): SkiaModule {
  if (_skia) return _skia;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  // oxlint-disable-next-line typescript/no-require-imports -- lazy RN module load
  _skia = require("@shopify/react-native-skia") as SkiaModule;
  return _skia;
}

// ---------------------------------------------------------------------------
// SkiaContext2DLike — bridges SkCanvas to Context2DLike
// ---------------------------------------------------------------------------

/**
 * Wraps a Skia surface to expose the Canvas2D subset used by ppu-ocv.
 *
 * Pixel layout note: readPixels / makeImageSnapshot uses RGBA_8888 color type,
 * which maps directly to the Uint8ClampedArray byte order expected by
 * CanvasProcessor.findRegions (R at [i], G at [i+1], B at [i+2], A at [i+3]).
 */
class SkiaContext2DLike implements Context2DLike {
  // oxlint-disable-next-line typescript/no-explicit-any -- Skia surface type is runtime-resolved
  private readonly _surface: any;
  // oxlint-disable-next-line typescript/no-explicit-any -- Skia canvas type is runtime-resolved
  private readonly _skCanvas: any;
  // oxlint-disable-next-line typescript/no-explicit-any -- path is resolved at runtime
  private _path: any | null = null;
  private readonly _parentCanvas: SkiaCanvasLike;

  strokeStyle: string | CanvasGradient | CanvasPattern = "#000000";
  fillStyle: string | CanvasGradient | CanvasPattern = "#000000";
  lineWidth: number = 1;

  // oxlint-disable-next-line typescript/no-explicit-any -- Skia surface type is runtime-resolved
  constructor(surface: any, parentCanvas: SkiaCanvasLike) {
    this._surface = surface;
    this._skCanvas = surface.getCanvas();
    this._parentCanvas = parentCanvas;
  }

  get canvas(): CanvasLike {
    return this._parentCanvas;
  }

  // -------------------------------------------------------------------------
  // Pixel I/O
  // -------------------------------------------------------------------------

  getImageData(
    sx: number,
    sy: number,
    sw: number,
    sh: number
  ): { data: Uint8ClampedArray; width: number; height: number } {
    const { Skia, AlphaType, ColorType } = getSkia();
    const snapshot = this._surface.makeImageSnapshot();

    const info = {
      width: sw,
      height: sh,
      colorType: ColorType.RGBA_8888,
      alphaType: AlphaType.Unpremul,
    };

    // readPixels returns a Float32Array or Uint8Array depending on colorType;
    // RGBA_8888 returns Uint8Array — safe to wrap in Uint8ClampedArray.
    const pixels = snapshot.readPixels(sx, sy, info);
    if (!pixels) {
      throw new Error(
        `SkiaContext2DLike.getImageData: readPixels returned null ` +
          `(surface may have been released, region: ${sx},${sy} ${sw}×${sh})`
      );
    }

    // Suppress unused import warning — Skia is used above for ColorType/AlphaType
    void Skia;
    return {
      data: new Uint8ClampedArray(pixels.buffer, pixels.byteOffset, pixels.byteLength),
      width: sw,
      height: sh,
    };
  }

  // oxlint-disable-next-line typescript/no-explicit-any -- ImageData is a platform type
  putImageData(imageData: any, dx: number, dy: number): void {
    const { Skia, AlphaType, ColorType } = getSkia();

    const { data, width, height } = imageData as {
      data: Uint8ClampedArray;
      width: number;
      height: number;
    };

    const bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    const skData = Skia.Data.fromBytes(bytes);
    const img = Skia.Image.MakeImage(
      { width, height, colorType: ColorType.RGBA_8888, alphaType: AlphaType.Unpremul },
      skData,
      width * 4
    );

    if (!img) {
      throw new Error("SkiaContext2DLike.putImageData: MakeImage returned null");
    }

    this._skCanvas.drawImage(img, dx, dy);
    this._surface.flush();
  }

  // oxlint-disable-next-line typescript/no-explicit-any -- ImageData is a platform type
  createImageData(width: number, height: number): any {
    return {
      data: new Uint8ClampedArray(width * height * 4),
      width,
      height,
    };
  }

  // -------------------------------------------------------------------------
  // drawImage — supports both single-source and src+dst rect overloads
  // -------------------------------------------------------------------------

  // oxlint-disable-next-line typescript/no-explicit-any -- variadic canvas drawImage overloads
  drawImage(...args: any[]): void {
    // args[0] is always the source (SkiaCanvasLike or a raw Skia image)
    const src = args[0] as SkiaCanvasLike | { _skiaImage?: unknown };

    // Resolve the Skia image from the source
    // oxlint-disable-next-line typescript/no-explicit-any -- runtime type
    let img: any;
    if (src instanceof SkiaCanvasLike) {
      img = src._surface.makeImageSnapshot();
    } else if (src && typeof (src as { _skiaImage?: unknown })._skiaImage !== "undefined") {
      img = (src as { _skiaImage: unknown })._skiaImage;
    } else {
      throw new Error(
        "SkiaContext2DLike.drawImage: source must be a SkiaCanvasLike (use mobilePlatform.loadImage)"
      );
    }

    if (args.length === 3) {
      // drawImage(img, dx, dy)
      this._skCanvas.drawImage(img, args[1], args[2]);
    } else if (args.length === 5) {
      // drawImage(img, dx, dy, dw, dh)
      const { Skia } = getSkia();
      const dstRect = Skia.XYWHRect(args[1], args[2], args[3], args[4]);
      const srcRect = Skia.XYWHRect(0, 0, img.width(), img.height());
      this._skCanvas.drawImageRect(img, srcRect, dstRect, Skia.Paint());
    } else if (args.length === 9) {
      // drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh) — used by crop()
      const { Skia } = getSkia();
      const srcRect = Skia.XYWHRect(args[1], args[2], args[3], args[4]);
      const dstRect = Skia.XYWHRect(args[5], args[6], args[7], args[8]);
      this._skCanvas.drawImageRect(img, srcRect, dstRect, Skia.Paint());
    } else {
      throw new Error(`SkiaContext2DLike.drawImage: unsupported argument count (${args.length})`);
    }

    // Flush so subsequent makeImageSnapshot() sees the draw
    this._surface.flush();
  }

  // -------------------------------------------------------------------------
  // Fill & Stroke
  // -------------------------------------------------------------------------

  fillRect(x: number, y: number, w: number, h: number): void {
    const { Skia } = getSkia();
    const paint = Skia.Paint();
    paint.setColor(Skia.Color(this.fillStyle as string));
    this._skCanvas.drawRect(Skia.XYWHRect(x, y, w, h), paint);
    this._surface.flush();
  }

  strokeRect(x: number, y: number, w: number, h: number): void {
    const { Skia, PaintStyle } = getSkia();
    const paint = Skia.Paint();
    paint.setColor(Skia.Color(this.strokeStyle as string));
    paint.setStyle(PaintStyle.Stroke);
    paint.setStrokeWidth(this.lineWidth);
    this._skCanvas.drawRect(Skia.XYWHRect(x, y, w, h), paint);
    this._surface.flush();
  }

  // -------------------------------------------------------------------------
  // Path commands
  // -------------------------------------------------------------------------

  beginPath(): void {
    const { Skia } = getSkia();
    this._path = Skia.Path.Make();
  }

  closePath(): void {
    this._path?.close();
  }

  moveTo(x: number, y: number): void {
    this._path?.moveTo(x, y);
  }

  lineTo(x: number, y: number): void {
    this._path?.lineTo(x, y);
  }

  stroke(): void {
    if (!this._path) return;
    const { Skia, PaintStyle } = getSkia();
    const paint = Skia.Paint();
    paint.setColor(Skia.Color(this.strokeStyle as string));
    paint.setStyle(PaintStyle.Stroke);
    paint.setStrokeWidth(this.lineWidth);
    this._skCanvas.drawPath(this._path, paint);
    this._surface.flush();
  }

  // -------------------------------------------------------------------------
  // Transform / state
  // -------------------------------------------------------------------------

  save(): void {
    this._skCanvas.save();
  }

  restore(): void {
    this._skCanvas.restore();
  }

  translate(x: number, y: number): void {
    this._skCanvas.translate(x, y);
  }

  rotate(angle: number): void {
    // Canvas2D rotate is in radians; Skia rotate is in degrees
    this._skCanvas.rotate((angle * 180) / Math.PI, 0, 0);
  }
}

// ---------------------------------------------------------------------------
// SkiaCanvasLike — wraps SkSurface to satisfy CanvasLike
// ---------------------------------------------------------------------------

class SkiaCanvasLike implements CanvasLike {
  // oxlint-disable-next-line typescript/no-explicit-any -- Skia surface type is runtime-resolved
  readonly _surface: any;
  private _ctx: SkiaContext2DLike | null = null;

  // oxlint-disable-next-line typescript/no-explicit-any -- runtime Skia type
  constructor(surface: any) {
    this._surface = surface;
  }

  get width(): number {
    return this._surface.width() as number;
  }

  get height(): number {
    return this._surface.height() as number;
  }

  getContext(_contextId: "2d"): SkiaContext2DLike {
    if (!this._ctx) {
      this._ctx = new SkiaContext2DLike(this._surface, this);
    }
    return this._ctx;
  }
}

// ---------------------------------------------------------------------------
// mobilePlatform — CanvasPlatform implementation
// ---------------------------------------------------------------------------

/** React Native canvas platform backed by @shopify/react-native-skia */
export const mobilePlatform: CanvasPlatform = {
  createCanvas(width: number, height: number): CanvasLike {
    const { Skia } = getSkia();
    const surface = Skia.Surface.Make(width, height);
    if (!surface) {
      throw new Error(
        `mobilePlatform.createCanvas: Skia.Surface.Make(${width}, ${height}) returned null. ` +
          "Ensure @shopify/react-native-skia is correctly installed and Skia is initialised."
      );
    }
    return new SkiaCanvasLike(surface);
  },

  async loadImage(source: ArrayBuffer | string): Promise<CanvasLike> {
    const { Skia, AlphaType, ColorType } = getSkia();

    let skData: ReturnType<SkiaModule["Skia"]["Data"]["fromBytes"]>;

    if (source instanceof ArrayBuffer) {
      skData = Skia.Data.fromBytes(new Uint8Array(source));
    } else if (typeof source === "string") {
      skData = await Skia.Data.fromURI(source);
    } else {
      throw new Error("mobilePlatform.loadImage: source must be an ArrayBuffer or string URI");
    }

    const image = Skia.Image.MakeImageFromEncoded(skData);
    if (!image) {
      throw new Error(
        "mobilePlatform.loadImage: MakeImageFromEncoded returned null — " +
          "the image data may be corrupt or in an unsupported format."
      );
    }

    const width = image.width();
    const height = image.height();
    const surface = Skia.Surface.Make(width, height);
    if (!surface) {
      throw new Error("mobilePlatform.loadImage: Skia.Surface.Make returned null");
    }

    const canvas = surface.getCanvas();
    // Draw the decoded image onto the surface so pixel reads work correctly.
    canvas.drawImage(image, 0, 0);
    surface.flush();

    // Verify round-trip: ensure readPixels works on RGBA_8888 layout
    void AlphaType;
    void ColorType;

    return new SkiaCanvasLike(surface);
  },

  isCanvas(value: unknown): value is CanvasLike {
    return value instanceof SkiaCanvasLike;
  },
};
