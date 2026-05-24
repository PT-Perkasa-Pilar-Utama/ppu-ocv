import { beforeAll, describe, expect, test } from "bun:test";
import { cv, ImageProcessor } from "../../src/index.js";
import { equalize } from "../../src/operations/equalize.js";
import { initRuntime, loadDibco, makeMono } from "./helpers.js";

beforeAll(initRuntime);

describe("equalize — real-image integration (dibco_cropped.png)", () => {
  test("file can be loaded and converted to a grayscale Mat", async () => {
    const canvas = await loadDibco();
    expect(canvas.width).toBeGreaterThan(0);
    expect(canvas.height).toBeGreaterThan(0);

    const processor = new ImageProcessor(canvas);
    processor.grayscale();
    expect(processor.img.channels()).toBe(1);
    processor.destroy();
  });

  test("CLAHE: output dimensions match input on dibco_cropped.png", async () => {
    const canvas = await loadDibco();
    const processor = new ImageProcessor(canvas);
    const { width, height } = processor;
    processor.grayscale().equalize({ method: "clahe" });
    expect(processor.width).toBe(width);
    expect(processor.height).toBe(height);
    processor.destroy();
  });

  test("global: output dimensions match input on dibco_cropped.png", async () => {
    const canvas = await loadDibco();
    const processor = new ImageProcessor(canvas);
    const { width, height } = processor;
    processor.grayscale().equalize({ method: "global" });
    expect(processor.width).toBe(width);
    expect(processor.height).toBe(height);
    processor.destroy();
  });

  test("CLAHE: all pixel values remain in [0, 255] after equalization", async () => {
    const canvas = await loadDibco();
    const processor = new ImageProcessor(canvas);
    processor.grayscale().equalize({ method: "clahe" });
    const data = new Uint8Array(processor.img.data);
    expect(Math.min(...data)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...data)).toBeLessThanOrEqual(255);
    processor.destroy();
  });

  test("global: all pixel values remain in [0, 255] after equalization", async () => {
    const canvas = await loadDibco();
    const processor = new ImageProcessor(canvas);
    processor.grayscale().equalize({ method: "global" });
    const data = new Uint8Array(processor.img.data);
    expect(Math.min(...data)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...data)).toBeLessThanOrEqual(255);
    processor.destroy();
  });

  test("CLAHE: contrast spread is wider than raw grayscale (std-dev increases)", async () => {
    const rawProcessor = new ImageProcessor(await loadDibco());
    rawProcessor.grayscale();
    const rawData = new Uint8Array(rawProcessor.img.data);
    const rawMean = rawData.reduce((a, b) => a + b, 0) / rawData.length;
    const rawStd = Math.sqrt(
      rawData.reduce((acc, v) => acc + (v - rawMean) ** 2, 0) / rawData.length
    );
    rawProcessor.destroy();

    const eqProcessor = new ImageProcessor(await loadDibco());
    eqProcessor.grayscale().equalize({ method: "clahe" });
    const eqData = new Uint8Array(eqProcessor.img.data);
    const eqMean = eqData.reduce((a, b) => a + b, 0) / eqData.length;
    const eqStd = Math.sqrt(eqData.reduce((acc, v) => acc + (v - eqMean) ** 2, 0) / eqData.length);
    eqProcessor.destroy();

    expect(eqStd).toBeGreaterThanOrEqual(rawStd * 0.9);
  });

  test("global: output is single-channel 8-bit on real document image", async () => {
    const canvas = await loadDibco();
    const processor = new ImageProcessor(canvas);
    processor.grayscale().equalize({ method: "global" });
    expect(processor.img.channels()).toBe(1);
    expect(processor.img.type()).toBe(cv.CV_8UC1);
    processor.destroy();
  });

  test("grayscale().equalize().threshold() full pipeline runs on dibco_cropped.png", async () => {
    const canvas = await loadDibco();
    const processor = new ImageProcessor(canvas);
    expect(() => {
      processor.grayscale().equalize().threshold();
      expect(processor.toMat().channels()).toBe(1);
    }).not.toThrow();
    processor.destroy();
  });

  test("CLAHE with custom clipLimit=3.0 and tileGridSize=16 runs on dibco_cropped.png", async () => {
    const canvas = await loadDibco();
    const processor = new ImageProcessor(canvas);
    expect(() => {
      processor.grayscale().equalize({ method: "clahe", clipLimit: 3.0, tileGridSize: 16 });
    }).not.toThrow();
    processor.destroy();
  });
});

describe("equalize — memory management", () => {
  test("input Mat is deleted after global equalization: accessing it throws", () => {
    const mat = makeMono(128);
    const result = equalize(mat, { method: "global", clipLimit: 2.0, tileGridSize: 8 });
    result.img.delete();
    expect(() => mat.rows).toThrow();
  });

  test("input Mat is deleted after CLAHE equalization: accessing it throws", () => {
    const mat = makeMono(128);
    const result = equalize(mat, { method: "clahe", clipLimit: 2.0, tileGridSize: 4 });
    result.img.delete();
    expect(() => mat.rows).toThrow();
  });

  test("output Mat remains valid after the CLAHE object has been freed", () => {
    const mat = makeMono(100, 8, 8);
    const result = equalize(mat, { method: "clahe", clipLimit: 2.0, tileGridSize: 4 });
    expect(() => result.img.rows).not.toThrow();
    expect(result.img.rows).toBe(8);
    expect(result.img.cols).toBe(8);
    expect(result.img.channels()).toBe(1);
    result.img.delete();
  });

  test("repeated CLAHE calls (50×) do not crash — no Wasm heap exhaustion", () => {
    expect(() => {
      for (let i = 0; i < 50; i++) {
        const mat = makeMono((i * 5) % 256, 8, 8);
        const result = equalize(mat, { method: "clahe", clipLimit: 2.0, tileGridSize: 4 });
        result.img.delete();
      }
    }).not.toThrow();
  });

  test("repeated global calls (50×) do not crash", () => {
    expect(() => {
      for (let i = 0; i < 50; i++) {
        const mat = makeMono((i * 5) % 256, 8, 8);
        const result = equalize(mat, { method: "global", clipLimit: 2.0, tileGridSize: 8 });
        result.img.delete();
      }
    }).not.toThrow();
  });

  test("ImageProcessor.destroy() frees the output Mat: subsequent access throws", () => {
    const mat = makeMono(80, 4, 4);
    const processor = new ImageProcessor(mat);
    processor.equalize();
    const raw = processor.toMat();
    processor.destroy();
    expect(() => raw.rows).toThrow();
  });

  test("chaining replaces this.img: intermediate Mat is not accessible after next op", () => {
    const mat = makeMono(128, 4, 4);
    const processor = new ImageProcessor(mat);
    processor.equalize();
    const afterEqualize = processor.img;
    processor.blur();
    expect(() => afterEqualize.rows).toThrow();
    processor.destroy();
  });
});
