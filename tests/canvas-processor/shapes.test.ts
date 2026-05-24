import { beforeAll, expect, test, describe } from "bun:test";
import { setPlatform } from "../../src/canvas-factory.js";
import { nodePlatform } from "../../src/platform/node.js";

// Critical: set only the canvas platform — NO OpenCV initialization
beforeAll(() => {
  setPlatform(nodePlatform);
});

describe("CanvasProcessor — threshold", () => {
  test("pixel above thresh becomes maxValue", async () => {
    const { CanvasProcessor } = await import("../../src/canvas-processor.js");
    const { createCanvas } = await import("@napi-rs/canvas");

    // Gray=200, thresh=127 → should become 255
    const c = createCanvas(1, 1);
    c.getContext("2d").fillStyle = "rgb(200, 200, 200)";
    c.getContext("2d").fillRect(0, 0, 1, 1);

    const pixel = new CanvasProcessor(c)
      .threshold({ thresh: 127, maxValue: 255 })
      .toCanvas()
      .getContext("2d")
      .getImageData(0, 0, 1, 1).data;

    expect(pixel[0]).toBe(255);
    expect(pixel[1]).toBe(255);
    expect(pixel[2]).toBe(255);
  });

  test("pixel at or below thresh becomes 0", async () => {
    const { CanvasProcessor } = await import("../../src/canvas-processor.js");
    const { createCanvas } = await import("@napi-rs/canvas");

    // Gray=50, thresh=127 → should become 0
    const c = createCanvas(1, 1);
    c.getContext("2d").fillStyle = "rgb(50, 50, 50)";
    c.getContext("2d").fillRect(0, 0, 1, 1);

    const pixel = new CanvasProcessor(c)
      .threshold({ thresh: 127 })
      .toCanvas()
      .getContext("2d")
      .getImageData(0, 0, 1, 1).data;

    expect(pixel[0]).toBe(0);
    expect(pixel[1]).toBe(0);
    expect(pixel[2]).toBe(0);
  });

  test("returns this for chaining", async () => {
    const { CanvasProcessor } = await import("../../src/canvas-processor.js");
    const { createCanvas } = await import("@napi-rs/canvas");
    const p = new CanvasProcessor(createCanvas(4, 4));
    expect(p.threshold()).toBe(p);
  });
});

describe("CanvasProcessor — border", () => {
  test("increases dimensions by 2×size", async () => {
    const { CanvasProcessor } = await import("../../src/canvas-processor.js");
    const { createCanvas } = await import("@napi-rs/canvas");

    const p = new CanvasProcessor(createCanvas(100, 80));
    const returned = p.border({ size: 10 });

    expect(returned).toBe(p);
    expect(p.width).toBe(120);
    expect(p.height).toBe(100);
  });

  test("border pixels are the requested colour", async () => {
    const { CanvasProcessor } = await import("../../src/canvas-processor.js");
    const { createCanvas } = await import("@napi-rs/canvas");

    const result = new CanvasProcessor(createCanvas(10, 10))
      .border({ size: 5, color: "red" })
      .toCanvas();

    // Top-left corner is in the border area
    const pixel = result.getContext("2d").getImageData(0, 0, 1, 1).data;
    expect(pixel[0]).toBe(255); // R
    expect(pixel[1]).toBe(0); // G
    expect(pixel[2]).toBe(0); // B
  });

  test("original image is preserved at offset", async () => {
    const { CanvasProcessor } = await import("../../src/canvas-processor.js");
    const { createCanvas } = await import("@napi-rs/canvas");

    const c = createCanvas(4, 4);
    c.getContext("2d").fillStyle = "blue";
    c.getContext("2d").fillRect(0, 0, 4, 4);

    const size = 3;
    const result = new CanvasProcessor(c).border({ size, color: "white" }).toCanvas();

    // Centre pixel should still be blue
    const pixel = result.getContext("2d").getImageData(size + 2, size + 2, 1, 1).data;
    expect(pixel[2]).toBe(255); // B channel = blue
  });
});

describe("CanvasProcessor — findRegions", () => {
  test("empty canvas returns no regions", async () => {
    const { CanvasProcessor } = await import("../../src/canvas-processor.js");
    const { createCanvas } = await import("@napi-rs/canvas");

    // All-black canvas — no light foreground
    const regions = new CanvasProcessor(createCanvas(20, 20)).findRegions();
    expect(regions).toHaveLength(0);
  });

  test("single white rect detected with correct bbox and area", async () => {
    const { CanvasProcessor } = await import("../../src/canvas-processor.js");
    const { createCanvas } = await import("@napi-rs/canvas");

    const c = createCanvas(20, 20);
    // Draw a 4×3 white rectangle at (5, 6)
    c.getContext("2d").fillStyle = "white";
    c.getContext("2d").fillRect(5, 6, 4, 3);

    const regions = new CanvasProcessor(c).findRegions();
    expect(regions).toHaveLength(1);
    const region0 = regions[0];
    if (region0 === undefined) throw new Error("unreachable");
    expect(region0.bbox).toEqual({ x0: 5, y0: 6, x1: 9, y1: 9 });
    expect(region0.area).toBe(12); // 4 × 3
  });

  test("two separate regions are counted independently", async () => {
    const { CanvasProcessor } = await import("../../src/canvas-processor.js");
    const { createCanvas } = await import("@napi-rs/canvas");

    const c = createCanvas(30, 10);
    const ctx = c.getContext("2d");
    ctx.fillStyle = "white";
    ctx.fillRect(2, 2, 4, 4); // region A
    ctx.fillRect(20, 2, 4, 4); // region B (no pixel touches A)

    const regions = new CanvasProcessor(c).findRegions();
    expect(regions).toHaveLength(2);
  });

  test("minArea filter excludes small regions", async () => {
    const { CanvasProcessor } = await import("../../src/canvas-processor.js");
    const { createCanvas } = await import("@napi-rs/canvas");

    const c = createCanvas(30, 10);
    const ctx = c.getContext("2d");
    ctx.fillStyle = "white";
    ctx.fillRect(2, 2, 1, 1); // 1 px — too small
    ctx.fillRect(20, 2, 4, 4); // 16 px — passes filter

    const regions = new CanvasProcessor(c).findRegions({ minArea: 5 });
    expect(regions).toHaveLength(1);
    const region0 = regions[0];
    if (region0 === undefined) throw new Error("unreachable");
    expect(region0.area).toBe(16);
  });

  test("foreground=dark detects black regions on white background", async () => {
    const { CanvasProcessor } = await import("../../src/canvas-processor.js");
    const { createCanvas } = await import("@napi-rs/canvas");

    const c = createCanvas(20, 20);
    const ctx = c.getContext("2d");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, 20, 20); // white background
    ctx.fillStyle = "black";
    ctx.fillRect(5, 5, 6, 6); // black region in centre

    const regions = new CanvasProcessor(c).findRegions({ foreground: "dark" });
    expect(regions).toHaveLength(1);
    const region0 = regions[0];
    if (region0 === undefined) throw new Error("unreachable");
    expect(region0.area).toBe(36); // 6 × 6
  });

  test("works correctly after grayscale + threshold pipeline", async () => {
    const { CanvasProcessor } = await import("../../src/canvas-processor.js");
    const file = Bun.file("./assets/receipt.jpg");
    const src = await CanvasProcessor.prepareCanvas(await file.arrayBuffer());

    const regions = new CanvasProcessor(src)
      .grayscale()
      .threshold({ thresh: 127 })
      .findRegions({ minArea: 20 });

    // A receipt image with thresholding should produce a meaningful number
    // of text regions — just validate it's non-trivial and sorted by area works
    expect(regions.length).toBeGreaterThan(10);

    const sorted = [...regions].sort((a, b) => b.area - a.area);
    const sorted0 = sorted[0];
    const sorted1 = sorted[1];
    if (sorted0 === undefined || sorted1 === undefined) throw new Error("unreachable");
    expect(sorted0.area).toBeGreaterThanOrEqual(sorted1.area);
  });
});

describe("CanvasProcessor — rotate", () => {
  test("0° is a no-op (same canvas reference)", async () => {
    const { CanvasProcessor } = await import("../../src/canvas-processor.js");
    const { createCanvas } = await import("@napi-rs/canvas");

    const p = new CanvasProcessor(createCanvas(50, 50));
    const before = p.toCanvas();
    p.rotate({ angle: 0 });
    expect(p.toCanvas()).toBe(before);
  });

  test("preserves dimensions after rotation", async () => {
    const { CanvasProcessor } = await import("../../src/canvas-processor.js");
    const { createCanvas } = await import("@napi-rs/canvas");

    const p = new CanvasProcessor(createCanvas(60, 40));
    p.rotate({ angle: 45 });
    expect(p.width).toBe(60);
    expect(p.height).toBe(40);
  });

  test("180° rotation inverts pixel position", async () => {
    const { CanvasProcessor } = await import("../../src/canvas-processor.js");
    const { createCanvas } = await import("@napi-rs/canvas");

    // Put a red pixel at top-left
    const c = createCanvas(10, 10);
    c.getContext("2d").fillStyle = "black";
    c.getContext("2d").fillRect(0, 0, 10, 10);
    c.getContext("2d").fillStyle = "red";
    c.getContext("2d").fillRect(0, 0, 1, 1);

    const result = new CanvasProcessor(c).rotate({ angle: 180 }).toCanvas();

    // After 180° the red pixel should be at bottom-right (9, 9)
    const cornerPixel = result.getContext("2d").getImageData(9, 9, 1, 1).data;
    expect(cornerPixel[0]).toBeGreaterThan(200); // red channel dominant
  });

  test("returns this for chaining", async () => {
    const { CanvasProcessor } = await import("../../src/canvas-processor.js");
    const { createCanvas } = await import("@napi-rs/canvas");
    const p = new CanvasProcessor(createCanvas(20, 20));
    expect(p.rotate({ angle: 30 })).toBe(p);
  });
});
