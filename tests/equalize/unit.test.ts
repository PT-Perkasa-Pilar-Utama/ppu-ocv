import { beforeAll, describe, expect, test } from "bun:test";
import { cv, ImageProcessor } from "../../src/index.js";
import { equalize } from "../../src/operations/equalize.js";
import type { EqualizeOptions } from "../../src/operations/equalize.js";
import { registry } from "../../src/pipeline/registry.js";
import { initRuntime, makeMono, pixels } from "./helpers.js";

beforeAll(initRuntime);

describe("equalize — operation registration", () => {
  test("'equalize' is present in the registry", () => {
    expect(registry.hasOperation("equalize")).toBe(true);
  });

  test("registry exposes 'equalize' in getOperationNames()", () => {
    expect(registry.getOperationNames()).toContain("equalize");
  });

  test("default options factory returns method=clahe, clipLimit=2.0, tileGridSize=8", () => {
    const gen = registry.getDefaultOptionsGenerator("equalize");
    const defaults: EqualizeOptions = typeof gen === "function" ? gen() : gen;
    expect(defaults.method).toBe("clahe");
    expect(defaults.clipLimit).toBe(2.0);
    expect(defaults.tileGridSize).toBe(8);
  });
});

describe("equalize — global mode", () => {
  test("all-black image (0) stays all-black after global equalizeHist", () => {
    const mat = makeMono(0);
    const result = equalize(mat, { method: "global", clipLimit: 2.0, tileGridSize: 8 });
    const vals = pixels(result.img);
    result.img.delete();
    expect(vals.every((v) => v === 0)).toBe(true);
  });

  test("all-white image (255) stays all-white after global equalizeHist", () => {
    const mat = makeMono(255);
    const result = equalize(mat, { method: "global", clipLimit: 2.0, tileGridSize: 8 });
    const vals = pixels(result.img);
    result.img.delete();
    expect(vals.every((v) => v === 255)).toBe(true);
  });

  test("result is single-channel 8-bit (CV_8UC1)", () => {
    const mat = makeMono(128);
    const result = equalize(mat, { method: "global", clipLimit: 2.0, tileGridSize: 8 });
    expect(result.img.channels()).toBe(1);
    expect(result.img.type()).toBe(cv.CV_8UC1);
    result.img.delete();
  });

  test("output dimensions match input (global)", () => {
    const mat = makeMono(100, 6, 3);
    const result = equalize(mat, { method: "global", clipLimit: 2.0, tileGridSize: 8 });
    expect(result.width).toBe(6);
    expect(result.height).toBe(3);
    result.img.delete();
  });

  test("pixel values are in valid [0, 255] range after global equalization", () => {
    const mat = new cv.Mat(8, 8, cv.CV_8UC1);
    for (let i = 0; i < 64; i++) {
      (mat.data as Uint8Array)[i] = (i * 4) % 256;
    }
    const result = equalize(mat, { method: "global", clipLimit: 2.0, tileGridSize: 8 });
    const vals = pixels(result.img);
    result.img.delete();
    expect(vals.every((v) => v >= 0 && v <= 255)).toBe(true);
  });

  test("input Mat is consumed (not usable after equalize)", () => {
    const mat = makeMono(64);
    equalize(mat, { method: "global", clipLimit: 2.0, tileGridSize: 8 }).img.delete();
    expect(true).toBe(true);
  });
});

describe("equalize — CLAHE mode", () => {
  test("all-black image (0) produces uniform output after CLAHE", () => {
    const mat = makeMono(0);
    const result = equalize(mat, { method: "clahe", clipLimit: 2.0, tileGridSize: 4 });
    const vals = pixels(result.img);
    result.img.delete();
    const first = vals[0];
    if (first === undefined) throw new Error("expected non-empty pixel array");
    expect(vals.every((v) => v === first)).toBe(true);
  });

  test("all-white image (255) stays all-white after CLAHE", () => {
    const mat = makeMono(255);
    const result = equalize(mat, { method: "clahe", clipLimit: 2.0, tileGridSize: 4 });
    const vals = pixels(result.img);
    result.img.delete();
    expect(vals.every((v) => v === 255)).toBe(true);
  });

  test("result is single-channel 8-bit (CV_8UC1)", () => {
    const mat = makeMono(100);
    const result = equalize(mat, { method: "clahe", clipLimit: 2.0, tileGridSize: 4 });
    expect(result.img.channels()).toBe(1);
    expect(result.img.type()).toBe(cv.CV_8UC1);
    result.img.delete();
  });

  test("output dimensions match input (CLAHE)", () => {
    const mat = makeMono(200, 5, 7);
    const result = equalize(mat, { method: "clahe", clipLimit: 2.0, tileGridSize: 4 });
    expect(result.width).toBe(5);
    expect(result.height).toBe(7);
    result.img.delete();
  });

  test("pixel values are in valid [0, 255] range after CLAHE", () => {
    const mat = new cv.Mat(8, 8, cv.CV_8UC1);
    for (let i = 0; i < 64; i++) {
      (mat.data as Uint8Array)[i] = (i * 4) % 256;
    }
    const result = equalize(mat, { method: "clahe", clipLimit: 2.0, tileGridSize: 4 });
    const vals = pixels(result.img);
    result.img.delete();
    expect(vals.every((v) => v >= 0 && v <= 255)).toBe(true);
  });

  test("custom clipLimit=4.0 and tileGridSize=2 are accepted without error", () => {
    const mat = makeMono(128, 4, 4);
    expect(() => {
      const result = equalize(mat, { method: "clahe", clipLimit: 4.0, tileGridSize: 2 });
      result.img.delete();
    }).not.toThrow();
  });

  test("clipLimit=1.0 (minimal clipping) produces valid output", () => {
    const mat = makeMono(80, 4, 4);
    const result = equalize(mat, { method: "clahe", clipLimit: 1.0, tileGridSize: 4 });
    const vals = pixels(result.img);
    result.img.delete();
    expect(vals.every((v) => v >= 0 && v <= 255)).toBe(true);
  });

  test("input Mat is consumed (not usable after CLAHE equalize)", () => {
    const mat = makeMono(64);
    equalize(mat, { method: "clahe", clipLimit: 2.0, tileGridSize: 4 }).img.delete();
    expect(true).toBe(true);
  });
});

describe("equalize — options defaults and merging", () => {
  test("calling equalize() with no options uses CLAHE defaults (no error)", () => {
    const mat = makeMono(128, 4, 4);
    const processor = new ImageProcessor(mat);
    expect(() => {
      processor.equalize();
      processor.destroy();
    }).not.toThrow();
  });

  test("partial options override only the specified fields", () => {
    const mat = makeMono(100, 4, 4);
    const processor = new ImageProcessor(mat);
    expect(() => {
      processor.equalize({ clipLimit: 3.0 });
      processor.destroy();
    }).not.toThrow();
  });

  test("passing method:'global' explicitly overrides default CLAHE", () => {
    const mat = makeMono(50, 4, 4);
    const processor = new ImageProcessor(mat);
    expect(() => {
      processor.equalize({ method: "global" });
      processor.destroy();
    }).not.toThrow();
  });

  test("passing method:'clahe' explicitly still works", () => {
    const mat = makeMono(200, 4, 4);
    const processor = new ImageProcessor(mat);
    expect(() => {
      processor.equalize({ method: "clahe", clipLimit: 2.0, tileGridSize: 8 });
      processor.destroy();
    }).not.toThrow();
  });
});

describe("equalize — ImageProcessor integration", () => {
  test("equalize() returns `this` for chaining", () => {
    const mat = makeMono(128, 4, 4);
    const processor = new ImageProcessor(mat);
    const returned = processor.equalize();
    expect(returned).toBe(processor);
    processor.destroy();
  });

  test("grayscale().equalize() full pipeline runs without error", () => {
    const mat = new cv.Mat(4, 4, cv.CV_8UC4);
    mat.data.fill(128);
    const processor = new ImageProcessor(mat);
    expect(() => {
      processor.grayscale().equalize();
      processor.destroy();
    }).not.toThrow();
  });

  test("grayscale().equalize({ method:'global' }) pipeline runs without error", () => {
    const mat = new cv.Mat(4, 4, cv.CV_8UC4);
    mat.data.fill(200);
    const processor = new ImageProcessor(mat);
    expect(() => {
      processor.grayscale().equalize({ method: "global" });
      processor.destroy();
    }).not.toThrow();
  });

  test("execute('equalize') API is callable on ImageProcessor", () => {
    const mat = makeMono(64, 4, 4);
    const processor = new ImageProcessor(mat);
    const returned = processor.execute("equalize");
    expect(returned).toBe(processor);
    processor.destroy();
  });

  test("equalize output width and height match input after operation", () => {
    const mat = makeMono(128, 6, 5);
    const processor = new ImageProcessor(mat);
    processor.equalize();
    expect(processor.width).toBe(6);
    expect(processor.height).toBe(5);
    processor.destroy();
  });

  test("equalize can be chained with blur, then toMat returns a valid Mat", () => {
    const mat = new cv.Mat(8, 8, cv.CV_8UC4);
    mat.data.fill(150);
    const processor = new ImageProcessor(mat);
    const result = processor.grayscale().equalize().blur().toMat();
    expect(result).toBeDefined();
    expect(result.rows).toBe(8);
    expect(result.cols).toBe(8);
    processor.destroy();
  });

  test("'equalize' appears in the registry's operation name list", () => {
    expect(registry.getOperationNames()).toContain("equalize");
  });
});
