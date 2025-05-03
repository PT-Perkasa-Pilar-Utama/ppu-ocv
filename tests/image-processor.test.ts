import { beforeAll, expect, test } from "bun:test";
import { Canvas, createCanvas, cv, ImageProcessor } from "../src/index";

beforeAll(async () => {
  await ImageProcessor.initRuntime();
});

test("prepareCanvas creates a canvas from an image file", async () => {
  const file = Bun.file("./assets/receipt.jpg");
  const image = await file.arrayBuffer();
  const canvas = await ImageProcessor.prepareCanvas(image);

  expect(canvas).toBeInstanceOf(Canvas);
  expect(canvas.width).toBe(720);
  expect(canvas.height).toBe(1280);
});

test("constructor with Canvas source initializes width, height, and toCanvas output", () => {
  const canvas = createCanvas(2, 3);
  const processor = new ImageProcessor(canvas);

  expect(processor.width).toBe(2);
  expect(processor.height).toBe(3);

  const output = processor.toCanvas();

  expect(output.width).toBe(2);
  expect(output.height).toBe(3);

  processor.destroy();
});

test("constructor with cv.Mat source initializes width and height", () => {
  const mat = new cv.Mat(4, 5, cv.CV_8UC3);
  const processor = new ImageProcessor(mat);

  expect(processor.width).toBe(5);
  expect(processor.height).toBe(4);

  processor.destroy();
});

test("constructor throws on invalid source type", () => {
  expect(() => {
    // @ts-expect-error
    new ImageProcessor({ invalid: true });
  }).toThrow("Invalid source type. Must be either Canvas or cv.Mat.");
});

test("resize operation updates dimensions and returns this for chaining", () => {
  const canvas = createCanvas(10, 10);
  const processor = new ImageProcessor(canvas);
  const returned = processor.resize({ width: 3, height: 4 });

  expect(returned).toBe(processor);
  expect(processor.width).toBe(3);
  expect(processor.height).toBe(4);

  processor.destroy();
});

test("all pipeline operations can run and return this", () => {
  const canvas = createCanvas(8, 8);
  const processor = new ImageProcessor(canvas);

  // Order matters see the table in the README
  expect(processor.grayscale()).toBe(processor);
  expect(processor.blur()).toBe(processor);
  expect(processor.threshold()).toBe(processor);
  expect(processor.invert()).toBe(processor);
  expect(processor.adaptiveThreshold()).toBe(processor);
  expect(processor.canny()).toBe(processor);
  expect(processor.dilate()).toBe(processor);
  expect(processor.erode()).toBe(processor);
  expect(processor.morphologicalGradient()).toBe(processor);
  expect(
    processor.warp({
      points: {
        topLeft: {
          x: 0,
          y: 0,
        },
        topRight: {
          x: 4,
          y: 0,
        },
        bottomLeft: {
          x: 0,
          y: 4,
        },
        bottomRight: {
          x: 4,
          y: 4,
        },
      },
      bbox: {
        x0: 0,
        y0: 0,
        x1: 4,
        y1: 4,
      },
    })
  ).toBe(processor);

  expect(processor.border()).toBe(processor);

  processor.destroy();
});

test("execute throws for unknown operation", () => {
  const canvas = createCanvas(2, 2);
  const processor = new ImageProcessor(canvas);
  expect(() => {
    // @ts-expect-error
    processor.execute("unknownOperation", {});
  }).toThrow(/^Operation "unknownOperation" not found$/);
});
