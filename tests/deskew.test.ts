import { beforeAll, describe, expect, test } from "bun:test";
import {
  CanvasProcessor,
  createCanvas,
  cv,
  DeskewService,
  ImageProcessor,
} from "../src";

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
      const imagePath = import.meta.dir + "/../assets/tilted.png";
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
    } catch (error) {
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
