import { beforeAll, describe, expect, test } from "bun:test";
import { CanvasProcessor, createCanvas, cv, DeskewService, ImageProcessor } from "../src";
import { calculateHoughAngles } from "../src/deskew-angles";
import { recordKernels } from "./support/record-kernels.js";

beforeAll(async () => {
  await ImageProcessor.initRuntime();
});

describe("DeskewService", () => {
  test("can create DeskewService instance with default options", () => {
    const service = new DeskewService();
    expect(service).toBeDefined();
  });

  test("can create DeskewService instance with custom options", () => {
    const service = new DeskewService({
      verbose: true,
      minimumAreaThreshold: 50,
    });
    expect(service).toBeDefined();
  });

  test("calculateSkewAngle returns a number", async () => {
    const service = new DeskewService();

    // Create a simple test canvas with some text-like regions
    const canvas = createCanvas(200, 100);
    const processor = new ImageProcessor(canvas);
    const processedCanvas = processor
      .grayscale()
      .threshold({ lower: 127, upper: 255, type: cv.THRESH_BINARY })
      .toCanvas();

    const angle = await service.calculateSkewAngle(processedCanvas);
    processor.destroy();

    expect(typeof angle).toBe("number");
    expect(angle).toBeGreaterThanOrEqual(-20);
    expect(angle).toBeLessThanOrEqual(20);
  });

  test("calculateSkewAngle returns 0 for images with no text regions", async () => {
    const service = new DeskewService({ verbose: false });

    // Create an empty canvas
    const canvas = createCanvas(100, 100);
    const processor = new ImageProcessor(canvas);
    const processedCanvas = processor.toCanvas();

    const angle = await service.calculateSkewAngle(processedCanvas);
    processor.destroy();

    expect(angle).toBe(0);
  });

  test("deskewImage returns a canvas", async () => {
    const service = new DeskewService();

    const canvas = createCanvas(200, 100);
    const processor = new ImageProcessor(canvas);
    const inputCanvas = processor.toCanvas();

    const result = await service.deskewImage(inputCanvas);
    processor.destroy();

    expect(result).toBeDefined();
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
  });

  test("deskewImage with actual tilted image", async () => {
    const service = new DeskewService({ verbose: true });

    // This test requires the tilted.png asset
    try {
      const imagePath = `${import.meta.dir}/../assets/tilted.png`;
      const imgFile = Bun.file(imagePath);
      const fileBuffer = await imgFile.arrayBuffer();
      const canvas = await CanvasProcessor.prepareCanvas(fileBuffer);

      const startTime = Date.now();
      const angle = await service.calculateSkewAngle(canvas);
      const deskewedCanvas = await service.deskewImage(canvas);
      const duration = Date.now() - startTime;

      expect(angle).toBeDefined();
      expect(typeof angle).toBe("number");
      expect(deskewedCanvas).toBeDefined();
      expect(deskewedCanvas.width).toBeGreaterThan(0);
      expect(deskewedCanvas.height).toBeGreaterThan(0);

      console.log(`Deskew test completed in ${duration}ms with angle ${angle.toFixed(2)}°`);
    } catch {
      console.warn("Skipping tilted image test - asset not found");
    }
  });

  test("handles verbose logging option", async () => {
    const serviceVerbose = new DeskewService({ verbose: true });
    const serviceSilent = new DeskewService({ verbose: false });

    expect(serviceVerbose).toBeDefined();
    expect(serviceSilent).toBeDefined();
  });

  test("respects minimumAreaThreshold option", async () => {
    const serviceHighThreshold = new DeskewService({
      minimumAreaThreshold: 1000,
    });
    const serviceLowThreshold = new DeskewService({
      minimumAreaThreshold: 1,
    });

    expect(serviceHighThreshold).toBeDefined();
    expect(serviceLowThreshold).toBeDefined();

    // Both should work with the same image, but might produce different results
    const canvas = createCanvas(200, 100);
    const processor = new ImageProcessor(canvas);
    const processedCanvas = processor.toCanvas();

    const angle1 = await serviceHighThreshold.calculateSkewAngle(processedCanvas);
    const angle2 = await serviceLowThreshold.calculateSkewAngle(processedCanvas);

    processor.destroy();

    expect(typeof angle1).toBe("number");
    expect(typeof angle2).toBe("number");
  });
});

// calculateSkewAngle keeps some contours past iterate() and drops others;
// both kinds are Mats on the WASM heap that the GC never frees.
test("calculateSkewAngle frees every contour it reads", async () => {
  const canvas = createCanvas(200, 100);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, 200, 100);
  ctx.fillStyle = "white";
  ctx.fillRect(10, 10, 60, 8); // text-like line, kept for the angle
  ctx.fillRect(10, 40, 60, 8); // text-like line, kept for the angle
  ctx.fillRect(150, 70, 2, 2); // below minimumAreaThreshold, dropped
  ctx.fillRect(170, 10, 4, 80); // aspect ratio below 0.2, dropped

  const handedOut: cv.Mat[] = [];
  const get = cv.MatVector.prototype.get;
  cv.MatVector.prototype.get = function (this: cv.MatVector, index: number) {
    const contour: cv.Mat = Reflect.apply(get, this, [index]);
    handedOut.push(contour);
    return contour;
  };

  try {
    await new DeskewService().calculateSkewAngle(canvas);
  } finally {
    cv.MatVector.prototype.get = get;
  }

  expect(handedOut.length).toBe(4);
  expect(handedOut.every((contour) => contour.isDeleted())).toBe(true);
});

// The Hough step swallows its own errors, so a failing call must still free
// its Mats. A deleted input Mat makes morphologyEx throw.
test("calculateHoughAngles frees its kernel when the transform fails", () => {
  const deleted = new cv.Mat(10, 10, cv.CV_8UC1);
  deleted.delete();

  let angles: unknown[] = [];
  const kernels = recordKernels(() => {
    angles = calculateHoughAngles(deleted, -20, 20, () => {});
  });

  expect(angles).toEqual([]);
  expect(kernels).toHaveLength(1);
  expect(kernels.every((kernel) => kernel.isDeleted())).toBe(true);
});
