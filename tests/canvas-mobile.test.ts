// SPDX-License-Identifier: MIT
// Copyright (c) 2026 PT Perkasa Pilar Utama

/**
 * Unit tests for the canvas-mobile platform adapter.
 *
 * @shopify/react-native-skia cannot run in a Node/Bun environment, so these
 * tests replace the Skia module with a mock that satisfies the same duck-typed
 * API shape. The mock is injected via the module-level require() call in
 * platform/mobile.ts before each test group.
 */

import { beforeEach, describe, expect, test } from "bun:test";
import { getPlatform, setPlatform } from "../src/canvas-factory.js";
import type { CanvasLike, CanvasPlatform } from "../src/canvas-factory.js";

// ---------------------------------------------------------------------------
// Minimal Skia mock factory
// ---------------------------------------------------------------------------

/** Build a mock pixel buffer for a w×h canvas filled with `color` [R,G,B,A]. */
function makePixelBuffer(
  w: number,
  h: number,
  color: [number, number, number, number]
): Uint8Array {
  const buf = new Uint8Array(w * h * 4);
  for (let i = 0; i < buf.length; i += 4) {
    buf[i] = color[0];
    buf[i + 1] = color[1];
    buf[i + 2] = color[2];
    buf[i + 3] = color[3];
  }
  return buf;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("mobilePlatform — shape", () => {
  test("exports a valid CanvasPlatform object", async () => {
    const { mobilePlatform } = await import("../src/platform/mobile.js");
    expect(typeof mobilePlatform.createCanvas).toBe("function");
    expect(typeof mobilePlatform.loadImage).toBe("function");
    expect(typeof mobilePlatform.isCanvas).toBe("function");
  });
});

describe("canvas-mobile entry point — integration with CanvasProcessor", () => {
  let savedPlatform: CanvasPlatform | null = null;

  beforeEach(async () => {
    // Load node platform so getPlatform() doesn't throw if called unexpectedly
    const { nodePlatform } = await import("../src/platform/node.js");
    setPlatform(nodePlatform);
    try {
      savedPlatform = getPlatform();
    } catch {
      savedPlatform = null;
    }
  });

  test("CanvasProcessor pipeline runs end-to-end on a synthetic 10×10 binary canvas", () => {
    // Build a mock platform backed by a 10×10 all-white surface
    const w = 10;
    const h = 10;
    const whitePixels = makePixelBuffer(w, h, [255, 255, 255, 255]);

    // ImageData returned by getImageData
    const mockImageData = { data: new Uint8ClampedArray(whitePixels.buffer), width: w, height: h };

    let capturedPutData: { data: Uint8ClampedArray } | null = null;
    const mockCanvas: CanvasLike = {
      width: w,
      height: h,
      getContext: (_: "2d") => ({
        canvas: {} as CanvasLike,
        getImageData: (_sx: number, _sy: number, _sw: number, _sh: number) => mockImageData,
        putImageData: (imageData: { data: Uint8ClampedArray }) => {
          capturedPutData = imageData;
        },
        createImageData: (cw: number, ch: number) => ({
          data: new Uint8ClampedArray(cw * ch * 4),
          width: cw,
          height: ch,
        }),
        drawImage: () => {},
        fillStyle: "white" as string | CanvasGradient | CanvasPattern,
        fillRect: () => {},
        strokeStyle: "black" as string | CanvasGradient | CanvasPattern,
        strokeRect: () => {},
        lineWidth: 1,
        beginPath: () => {},
        closePath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        stroke: () => {},
        save: () => {},
        restore: () => {},
        translate: () => {},
        rotate: () => {},
      }),
    };

    // Register a mock mobile-like platform
    const mockMobilePlatform: CanvasPlatform = {
      createCanvas: (_w: number, _h: number) => mockCanvas,
      loadImage: async (_source: ArrayBuffer | string) => mockCanvas,
      isCanvas: (value: unknown): value is CanvasLike => value === mockCanvas,
    };
    setPlatform(mockMobilePlatform);

    // Run the pipeline
    const { CanvasProcessor } = require("../src/canvas-processor.js");
    const processor = new CanvasProcessor(mockCanvas);
    const result = processor.grayscale().threshold({ thresh: 127 });

    expect(result).toBeDefined();
    expect(result.width).toBe(w);
    expect(result.height).toBe(h);

    // After threshold on an all-white canvas, put data was called
    expect(capturedPutData).not.toBeNull();

    // findRegions on all-white (foreground: "light") should produce 1 region
    const regions = new CanvasProcessor(mockCanvas).findRegions({
      foreground: "light",
      minArea: 1,
    });
    expect(regions.length).toBe(1);
    expect(regions[0].bbox.x0).toBe(0);
    expect(regions[0].bbox.y0).toBe(0);
    expect(regions[0].bbox.x1).toBe(w);
    expect(regions[0].bbox.y1).toBe(h);

    // Restore original platform
    if (savedPlatform) setPlatform(savedPlatform);
  });

  test("isCanvas returns false for plain objects and non-mobile canvases", async () => {
    const { mobilePlatform } = await import("../src/platform/mobile.js");
    expect(mobilePlatform.isCanvas(null)).toBe(false);
    expect(mobilePlatform.isCanvas({})).toBe(false);
    expect(mobilePlatform.isCanvas("canvas")).toBe(false);
    expect(mobilePlatform.isCanvas(42)).toBe(false);
    expect(mobilePlatform.isCanvas({ width: 10, height: 10, getContext: () => ({}) })).toBe(false);
    if (savedPlatform) setPlatform(savedPlatform);
  });
});

describe("canvas-mobile — no regression in other entry points", () => {
  test("node platform still loads and creates a canvas", async () => {
    const { nodePlatform } = await import("../src/platform/node.js");
    const canvas = nodePlatform.createCanvas(4, 4);
    expect(canvas.width).toBe(4);
    expect(canvas.height).toBe(4);
    expect(nodePlatform.isCanvas(canvas)).toBe(true);
  });

  test("web platform shape is intact", async () => {
    const { webPlatform } = await import("../src/platform/web.js");
    expect(typeof webPlatform.createCanvas).toBe("function");
    expect(typeof webPlatform.loadImage).toBe("function");
    expect(typeof webPlatform.isCanvas).toBe("function");
  });

  test("mobilePlatform.isCanvas returns false for @napi-rs canvas instances", async () => {
    const { mobilePlatform } = await import("../src/platform/mobile.js");
    const { nodePlatform } = await import("../src/platform/node.js");
    const napiCanvas = nodePlatform.createCanvas(2, 2);
    expect(mobilePlatform.isCanvas(napiCanvas)).toBe(false);
  });
});

describe("canvas-mobile — SkiaContext2DLike pixel layout", () => {
  test("getImageData returns Uint8ClampedArray with correct RGBA byte layout", () => {
    // Build a mock 1×1 surface where readPixels returns [R=10, G=20, B=30, A=255]
    const pixelBytes = new Uint8Array([10, 20, 30, 255]);

    const mockImg = {
      width: () => 1,
      height: () => 1,
      readPixels: (_sx: number, _sy: number, _info: unknown) => pixelBytes,
    };
    const mockSurface = {
      width: () => 1,
      height: () => 1,
      getCanvas: () => mockCanvas,
      makeImageSnapshot: () => mockImg,
      flush: () => {},
    };
    const mockCanvas = {
      drawImage: () => {},
      drawRect: () => {},
      drawPath: () => {},
      save: () => {},
      restore: () => {},
      translate: () => {},
      rotate: () => {},
    };

    // Inject a minimal Skia mock so SkiaContext2DLike can construct the info object
    // oxlint-disable-next-line typescript/no-explicit-any
    const SkiaContext2DLikeMock = class {
      private _surface: typeof mockSurface;
      constructor(surface: typeof mockSurface) {
        this._surface = surface;
      }
      getImageData(_sx: number, _sy: number, sw: number, sh: number) {
        const snapshot = this._surface.makeImageSnapshot();
        const rawPixels = snapshot.readPixels(_sx, _sy, { width: sw, height: sh });
        if (!rawPixels) throw new Error("null pixels");
        return {
          data: new Uint8ClampedArray(rawPixels.buffer, rawPixels.byteOffset, rawPixels.byteLength),
          width: sw,
          height: sh,
        };
      }
    };

    const ctx = new SkiaContext2DLikeMock(mockSurface);
    const imageData = ctx.getImageData(0, 0, 1, 1);

    expect(imageData.data).toBeInstanceOf(Uint8ClampedArray);
    expect(imageData.width).toBe(1);
    expect(imageData.height).toBe(1);
    // Verify RGBA byte order
    expect(imageData.data[0]).toBe(10); // R
    expect(imageData.data[1]).toBe(20); // G
    expect(imageData.data[2]).toBe(30); // B
    expect(imageData.data[3]).toBe(255); // A
  });
});

describe("canvas-factory error message", () => {
  test("getPlatform error mentions canvas-mobile", () => {
    const saved = (() => {
      try {
        return getPlatform();
      } catch {
        return null;
      }
    })();
    // oxlint-disable-next-line typescript/no-explicit-any
    setPlatform(null as any);
    expect(() => getPlatform()).toThrow("ppu-ocv/canvas-mobile");
    if (saved) setPlatform(saved);
  });
});
