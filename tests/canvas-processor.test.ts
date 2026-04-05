import { beforeAll, expect, test, describe } from "bun:test";
import { setPlatform } from "../src/canvas-factory.js";
import { nodePlatform } from "../src/platform/node.js";

// Critical: set only the canvas platform — NO OpenCV initialization
beforeAll(() => {
  setPlatform(nodePlatform);
});

describe("CanvasProcessor (canvas-only, no OpenCV)", () => {
  test("can import CanvasProcessor without initializing OpenCV", async () => {
    // This import must not throw even though OpenCV has never been initialized
    const { CanvasProcessor } = await import("../src/canvas-processor.js");
    expect(typeof CanvasProcessor.prepareCanvas).toBe("function");
    expect(typeof CanvasProcessor.prepareBuffer).toBe("function");
  });

  test("prepareCanvas loads ArrayBuffer into CanvasLike", async () => {
    const { CanvasProcessor } = await import("../src/canvas-processor.js");
    const { createCanvas } = await import("@napi-rs/canvas");

    const c = createCanvas(8, 6);
    const buf = c.toBuffer("image/png");
    const ab = buf.buffer.slice(
      buf.byteOffset,
      buf.byteOffset + buf.byteLength,
    ) as ArrayBuffer;

    const canvas = await CanvasProcessor.prepareCanvas(ab);
    expect(canvas.width).toBe(8);
    expect(canvas.height).toBe(6);
  });

  test("prepareCanvas returns CanvasLike as-is when already a canvas", async () => {
    const { CanvasProcessor } = await import("../src/canvas-processor.js");
    const { createCanvas } = await import("@napi-rs/canvas");

    const c = createCanvas(4, 4);
    // @ts-expect-error - passing CanvasLike where ArrayBuffer is expected to test pass-through
    const result = await CanvasProcessor.prepareCanvas(c);
    expect(result).toBe(c);
  });

  test("prepareBuffer returns ArrayBuffer as-is when input is already ArrayBuffer", async () => {
    const { CanvasProcessor } = await import("../src/canvas-processor.js");
    const ab = new ArrayBuffer(16);
    // @ts-expect-error - passing ArrayBuffer where CanvasLike is expected to test pass-through
    const result = await CanvasProcessor.prepareBuffer(ab);
    expect(result).toBe(ab);
  });

  test("prepareBuffer converts CanvasLike to ArrayBuffer via toBuffer", async () => {
    const { CanvasProcessor } = await import("../src/canvas-processor.js");
    const { createCanvas } = await import("@napi-rs/canvas");

    const c = createCanvas(4, 4);
    const result = await CanvasProcessor.prepareBuffer(c);

    expect(result).toBeInstanceOf(ArrayBuffer);
    expect(result.byteLength).toBeGreaterThan(0);
  });

  test("canvas-only entry point (index.canvas.ts) does not trigger OpenCV", async () => {
    // Import from the canvas-only entry point - must not throw
    const canvasModule = await import("../src/index.canvas.js");
    expect(typeof canvasModule.CanvasProcessor).toBe("function");
    expect(typeof canvasModule.CanvasToolkit).toBe("function");
    expect(typeof canvasModule.CanvasToolkitBase).toBe("function");
    // Ensure OpenCV-dependent classes are NOT exported
    expect((canvasModule as any).ImageProcessor).toBeUndefined();
    expect((canvasModule as any).DeskewService).toBeUndefined();
    expect((canvasModule as any).Contours).toBeUndefined();
  });
});
