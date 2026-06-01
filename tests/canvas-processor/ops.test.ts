import { beforeAll, expect, test, describe } from "bun:test";
import { setPlatform } from "../../src/canvas-factory.js";
import { nodePlatform } from "../../src/platform/node.js";

// Critical: set only the canvas platform — NO OpenCV initialization
beforeAll(() => {
  setPlatform(nodePlatform);
});

describe("CanvasProcessor (canvas-only, no OpenCV)", () => {
  test("can import CanvasProcessor without initializing OpenCV", async () => {
    // This import must not throw even though OpenCV has never been initialized
    const { CanvasProcessor } = await import("../../src/canvas-processor.js");
    expect(typeof CanvasProcessor.prepareCanvas).toBe("function");
    expect(typeof CanvasProcessor.prepareBuffer).toBe("function");
  });

  test("prepareCanvas loads ArrayBuffer into CanvasLike", async () => {
    const { CanvasProcessor } = await import("../../src/canvas-processor.js");
    const { createCanvas } = await import("@napi-rs/canvas");

    const c = createCanvas(8, 6);
    const buf = c.toBuffer("image/png");
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;

    const canvas = await CanvasProcessor.prepareCanvas(ab);
    expect(canvas.width).toBe(8);
    expect(canvas.height).toBe(6);
  });

  test("prepareCanvas returns CanvasLike as-is when already a canvas", async () => {
    const { CanvasProcessor } = await import("../../src/canvas-processor.js");
    const { createCanvas } = await import("@napi-rs/canvas");

    const c = createCanvas(4, 4);
    const result = await CanvasProcessor.prepareCanvas(c);
    expect(result).toBe(c);
  });

  test("prepareBuffer returns ArrayBuffer as-is when input is already ArrayBuffer", async () => {
    const { CanvasProcessor } = await import("../../src/canvas-processor.js");
    const ab = new ArrayBuffer(16);
    // @ts-expect-error - passing ArrayBuffer where CanvasLike is expected to test pass-through
    const result = await CanvasProcessor.prepareBuffer(ab);
    expect(result).toBe(ab);
  });

  test("prepareBuffer converts CanvasLike to ArrayBuffer via toBuffer", async () => {
    const { CanvasProcessor } = await import("../../src/canvas-processor.js");
    const { createCanvas } = await import("@napi-rs/canvas");

    const c = createCanvas(4, 4);
    const result = await CanvasProcessor.prepareBuffer(c);

    expect(result).toBeInstanceOf(ArrayBuffer);
    expect(result.byteLength).toBeGreaterThan(0);
  });

  test("canvas-only entry point (index.canvas.ts) does not trigger OpenCV", async () => {
    // Import from the canvas-only entry point - must not throw
    const canvasModule = await import("../../src/index.canvas.js");
    expect(typeof canvasModule.CanvasProcessor).toBe("function");
    expect(typeof canvasModule.CanvasToolkit).toBe("function");
    expect(typeof canvasModule.CanvasToolkitBase).toBe("function");
    // Ensure OpenCV-dependent classes are NOT exported
    // oxlint-disable-next-line typescript/no-explicit-any -- testing that runtime export is absent
    expect((canvasModule as any).ImageProcessor).toBeUndefined();
    // oxlint-disable-next-line typescript/no-explicit-any -- testing that runtime export is absent
    expect((canvasModule as any).DeskewService).toBeUndefined();
    // oxlint-disable-next-line typescript/no-explicit-any -- testing that runtime export is absent
    expect((canvasModule as any).Contours).toBeUndefined();
  });
});

describe("CanvasProcessor — chainable instance operations", () => {
  test("constructor exposes width and height", async () => {
    const { CanvasProcessor } = await import("../../src/canvas-processor.js");
    const { createCanvas } = await import("@napi-rs/canvas");

    const processor = new CanvasProcessor(createCanvas(12, 8));
    expect(processor.width).toBe(12);
    expect(processor.height).toBe(8);
  });

  test("resize changes dimensions and returns this", async () => {
    const { CanvasProcessor } = await import("../../src/canvas-processor.js");
    const { createCanvas } = await import("@napi-rs/canvas");

    const processor = new CanvasProcessor(createCanvas(100, 80));
    const returned = processor.resize({ width: 50, height: 40 });

    expect(returned).toBe(processor);
    expect(processor.width).toBe(50);
    expect(processor.height).toBe(40);
  });

  test("grayscale sets R=G=B to luma and returns this", async () => {
    const { CanvasProcessor } = await import("../../src/canvas-processor.js");
    const { createCanvas } = await import("@napi-rs/canvas");

    const c = createCanvas(1, 1);
    // Pure red pixel: R=255, G=0, B=0
    c.getContext("2d").fillStyle = "red";
    c.getContext("2d").fillRect(0, 0, 1, 1);

    const processor = new CanvasProcessor(c);
    const returned = processor.grayscale();

    expect(returned).toBe(processor);

    const pixel = processor.toCanvas().getContext("2d").getImageData(0, 0, 1, 1).data;
    // BT.601 luma for pure red: round(0.299*255) = 76
    const expected = Math.round(0.299 * 255);
    expect(pixel[0]).toBe(expected); // R
    expect(pixel[1]).toBe(expected); // G == R (grayscale)
    expect(pixel[2]).toBe(expected); // B == R (grayscale)
    expect(pixel[3]).toBe(255); // alpha unchanged
  });

  test("convert with alpha=0 produces black image", async () => {
    const { CanvasProcessor } = await import("../../src/canvas-processor.js");
    const { createCanvas } = await import("@napi-rs/canvas");

    const c = createCanvas(2, 2);
    c.getContext("2d").fillStyle = "white";
    c.getContext("2d").fillRect(0, 0, 2, 2);

    const processor = new CanvasProcessor(c);
    processor.convert({ alpha: 0, beta: 0 });

    const pixel = processor.toCanvas().getContext("2d").getImageData(0, 0, 1, 1).data;
    expect(pixel[0]).toBe(0);
    expect(pixel[1]).toBe(0);
    expect(pixel[2]).toBe(0);
    expect(pixel[3]).toBe(255); // alpha channel unchanged
  });

  test("convert with beta=255 clamps to white", async () => {
    const { CanvasProcessor } = await import("../../src/canvas-processor.js");
    const { createCanvas } = await import("@napi-rs/canvas");

    // Fill with opaque black (alpha=255) — transparent pixels have undefined
    // premultiplied RGB values, which would make the assertion meaningless.
    const c = createCanvas(2, 2);
    c.getContext("2d").fillStyle = "black";
    c.getContext("2d").fillRect(0, 0, 2, 2);

    const processor = new CanvasProcessor(c);
    processor.convert({ alpha: 1, beta: 255 });

    const pixel = processor.toCanvas().getContext("2d").getImageData(0, 0, 1, 1).data;
    expect(pixel[0]).toBe(255);
    expect(pixel[1]).toBe(255);
    expect(pixel[2]).toBe(255);
    expect(pixel[3]).toBe(255); // alpha unchanged
  });

  test("convert is a no-op when alpha=1 beta=0", async () => {
    const { CanvasProcessor } = await import("../../src/canvas-processor.js");
    const { createCanvas } = await import("@napi-rs/canvas");

    const processor = new CanvasProcessor(createCanvas(4, 4));
    const canvasBefore = processor.toCanvas();
    processor.convert({ alpha: 1, beta: 0 });

    expect(processor.toCanvas()).toBe(canvasBefore); // no new canvas allocated
  });

  test("operations chain and toCanvas returns CanvasLike", async () => {
    const { CanvasProcessor } = await import("../../src/canvas-processor.js");
    const { createCanvas } = await import("@napi-rs/canvas");

    const result = new CanvasProcessor(createCanvas(100, 100))
      .resize({ width: 50, height: 50 })
      .grayscale()
      .convert({ alpha: 1.2, beta: -10 })
      .toCanvas();

    expect(result.width).toBe(50);
    expect(result.height).toBe(50);
    expect(typeof result.getContext).toBe("function");
  });
});

describe("CanvasProcessor — invert", () => {
  test("inverts all RGB channels, preserves alpha", async () => {
    const { CanvasProcessor } = await import("../../src/canvas-processor.js");
    const { createCanvas } = await import("@napi-rs/canvas");

    const c = createCanvas(1, 1);
    c.getContext("2d").fillStyle = "rgb(100, 150, 200)";
    c.getContext("2d").fillRect(0, 0, 1, 1);

    const pixel = new CanvasProcessor(c)
      .invert()
      .toCanvas()
      .getContext("2d")
      .getImageData(0, 0, 1, 1).data;

    expect(pixel[0]).toBe(155); // 255 - 100
    expect(pixel[1]).toBe(105); // 255 - 150
    expect(pixel[2]).toBe(55); // 255 - 200
    expect(pixel[3]).toBe(255); // alpha unchanged
  });

  test("double invert returns to original", async () => {
    const { CanvasProcessor } = await import("../../src/canvas-processor.js");
    const { createCanvas } = await import("@napi-rs/canvas");

    const c = createCanvas(1, 1);
    c.getContext("2d").fillStyle = "rgb(80, 120, 200)";
    c.getContext("2d").fillRect(0, 0, 1, 1);

    const orig = c.getContext("2d").getImageData(0, 0, 1, 1).data;
    const pixel = new CanvasProcessor(c)
      .invert()
      .invert()
      .toCanvas()
      .getContext("2d")
      .getImageData(0, 0, 1, 1).data;

    expect(pixel[0]).toBe(orig[0]);
    expect(pixel[1]).toBe(orig[1]);
    expect(pixel[2]).toBe(orig[2]);
  });

  test("returns this for chaining", async () => {
    const { CanvasProcessor } = await import("../../src/canvas-processor.js");
    const { createCanvas } = await import("@napi-rs/canvas");
    const p = new CanvasProcessor(createCanvas(4, 4));
    expect(p.invert()).toBe(p);
  });
});
