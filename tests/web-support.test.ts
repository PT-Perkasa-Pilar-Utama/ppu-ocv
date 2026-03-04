import { beforeAll, describe, expect, test } from "bun:test";
import {
  getPlatform,
  setPlatform,
  type CanvasLike,
  type CanvasPlatform,
} from "../src/canvas-factory.js";
import { CanvasToolkitBase } from "../src/canvas-toolkit.base.js";
import { nodePlatform } from "../src/platform/node.js";

// Ensure nodePlatform is set before any tests
beforeAll(async () => {
  setPlatform(nodePlatform);
  const { ImageProcessor } = await import("../src/index.js");
  await ImageProcessor.initRuntime();
});

// Test canvas-factory registration
describe("canvas-factory", () => {
  test("getPlatform throws when no platform is registered", () => {
    const saved = getPlatform();
    setPlatform(null as unknown as CanvasPlatform);

    expect(() => getPlatform()).toThrow("No canvas platform registered");

    // Restore immediately
    setPlatform(saved as unknown as CanvasPlatform);
  });

  test("setPlatform / getPlatform round-trip", () => {
    const saved = getPlatform();

    const mockPlatform: CanvasPlatform = {
      createCanvas: () => ({ width: 0, height: 0, getContext: () => ({}) }) as unknown as CanvasLike,
      loadImage: async () => ({ width: 0, height: 0, getContext: () => ({}) }) as unknown as CanvasLike,
      isCanvas: (value: unknown): value is CanvasLike => false,
    };

    setPlatform(mockPlatform);
    expect(getPlatform()).toBe(mockPlatform);

    // Restore real platform
    setPlatform(saved as unknown as CanvasPlatform);
  });
});

// Test that Node platform works correctly
describe("Node platform", () => {
  test("getPlatform returns a valid platform", () => {
    const platform = getPlatform();
    expect(platform).toBeDefined();
    expect(typeof platform.createCanvas).toBe("function");
    expect(typeof platform.loadImage).toBe("function");
    expect(typeof platform.isCanvas).toBe("function");
  });

  test("platform.createCanvas creates a canvas with expected dimensions", () => {
    const platform = getPlatform();
    const canvas = platform.createCanvas(100, 50);

    expect(canvas.width).toBe(100);
    expect(canvas.height).toBe(50);
  });

  test("platform.isCanvas returns true for platform-created canvas", () => {
    const platform = getPlatform();
    const canvas = platform.createCanvas(10, 10);
    expect(platform.isCanvas(canvas)).toBe(true);
  });

  test("platform.isCanvas returns false for plain objects", () => {
    const platform = getPlatform();
    expect(platform.isCanvas({})).toBe(false);
    expect(platform.isCanvas(null)).toBe(false);
    expect(platform.isCanvas("string")).toBe(false);
  });

  test("platform.loadImage loads from ArrayBuffer", async () => {
    const platform = getPlatform();
    const { createCanvas } = await import("@napi-rs/canvas");
    const c = createCanvas(1, 1);
    const ctx = c.getContext("2d");
    ctx.fillStyle = "red";
    ctx.fillRect(0, 0, 1, 1);
    const buffer = c.toBuffer("image/png");
    const ab = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    ) as ArrayBuffer;

    const loaded = await platform.loadImage(ab);
    expect(loaded.width).toBe(1);
    expect(loaded.height).toBe(1);
  });
});

// Test CanvasToolkitBase works through the platform abstraction
describe("CanvasToolkitBase via platform", () => {
  test("CanvasToolkitBase.getInstance returns singleton", () => {
    const a = CanvasToolkitBase.getInstance();
    const b = CanvasToolkitBase.getInstance();
    expect(a).toBe(b);
  });

  test("crop returns correct sub-canvas via platform", () => {
    const platform = getPlatform();
    const canvas = platform.createCanvas(10, 10);
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "red";
    ctx.fillRect(2, 3, 4, 5);

    const toolkit = CanvasToolkitBase.getInstance();
    const cropped = toolkit.crop({
      bbox: { x0: 2, y0: 3, x1: 6, y1: 8 },
      canvas,
    });

    expect(cropped.width).toBe(4);
    expect(cropped.height).toBe(5);
  });

  test("isDirty returns false for uniform canvas", () => {
    const platform = getPlatform();
    const canvas = platform.createCanvas(10, 10);
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, 10, 10);

    const toolkit = CanvasToolkitBase.getInstance();
    expect(toolkit.isDirty({ canvas })).toBe(false);
  });
});

// Test ImageProcessor uses platform abstraction correctly
describe("ImageProcessor with platform abstraction", () => {
  test("ImageProcessor constructor accepts platform canvas", async () => {
    const { ImageProcessor } = await import("../src/index.js");
    const platform = getPlatform();
    const canvas = platform.createCanvas(5, 5);

    const processor = new ImageProcessor(canvas);
    expect(processor.width).toBe(5);
    expect(processor.height).toBe(5);
    processor.destroy();
  });

  test("toCanvas returns a CanvasLike via platform", async () => {
    const { ImageProcessor } = await import("../src/index.js");
    const platform = getPlatform();
    const canvas = platform.createCanvas(8, 8);

    const processor = new ImageProcessor(canvas);
    const result = processor.toCanvas();

    expect(result.width).toBe(8);
    expect(result.height).toBe(8);
    expect(platform.isCanvas(result)).toBe(true);
    processor.destroy();
  });

  test("prepareCanvas returns CanvasLike from ArrayBuffer", async () => {
    const { ImageProcessor } = await import("../src/index.js");
    const { createCanvas } = await import("@napi-rs/canvas");

    const c = createCanvas(4, 4);
    const ctx = c.getContext("2d");
    ctx.fillStyle = "blue";
    ctx.fillRect(0, 0, 4, 4);
    const buf = c.toBuffer("image/png");
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;

    const prepared = await ImageProcessor.prepareCanvas(ab);
    expect(prepared.width).toBe(4);
    expect(prepared.height).toBe(4);
  });

  test("prepareBuffer returns ArrayBuffer from CanvasLike", async () => {
    const { ImageProcessor } = await import("../src/index.js");
    const platform = getPlatform();
    const canvas = platform.createCanvas(4, 4);

    const buffer = await ImageProcessor.prepareBuffer(canvas);
    expect(buffer).toBeInstanceOf(ArrayBuffer);
    expect(buffer.byteLength).toBeGreaterThan(0);
  });
});
