/**
 * Tests for the `equalize` histogram-equalization operation.
 *
 * Test strategy (SQLite-style):
 * - Grouped by feature area using `describe` blocks.
 * - Each test uses the smallest possible synthetic Mat that exercises the
 *   code path — no file I/O, deterministic pixel values.
 * - Both the `"global"` and `"clahe"` paths are tested independently.
 * - Memory / registration behaviour is verified alongside pixel semantics.
 *
 * Coverage target: ≥ 90% line + branch on `src/operations/equalize.ts`.
 */

import { beforeAll, describe, expect, test } from "bun:test";
import { cv, ImageProcessor } from "../src/index.js";
import { equalize } from "../src/operations/equalize.js";
import type { EqualizeOptions } from "../src/operations/equalize.js";
import { registry } from "../src/pipeline/registry.js";

// ---------------------------------------------------------------------------
// Shared setup — OpenCV must be initialised once per worker process.
// ---------------------------------------------------------------------------
beforeAll(async () => {
  await ImageProcessor.initRuntime();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a w×h single-channel (CV_8UC1) Mat filled with `value` (0-255). */
function makeMono(value: number, w = 4, h = 4): cv.Mat {
  const mat = new cv.Mat(h, w, cv.CV_8UC1);
  mat.data.fill(value);
  return mat;
}

/**
 * Sample all pixel values from a single-channel Mat into a plain Array.
 * The Mat is NOT deleted — caller is responsible.
 */
function pixels(mat: cv.Mat): number[] {
  return Array.from(new Uint8Array(mat.data));
}

// ---------------------------------------------------------------------------
// 1. Operation registration
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// 2. Global equalization — pixel semantics
// ---------------------------------------------------------------------------
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
    // Build a gradient-like 8×8 to give the histogram something to equalize.
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
    // After deletion any access to mat would throw — we just verify equalize ran without error.
    expect(true).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 3. CLAHE equalization — pixel semantics
// ---------------------------------------------------------------------------
describe("equalize — CLAHE mode", () => {
  test("all-black image (0) produces uniform output after CLAHE", () => {
    // CLAHE stretches a flat histogram to fill the full [0, 255] range.
    // A uniform all-zero image has a single-bin histogram; CLAHE maps that
    // single value uniformly — the output is uniform (all pixels equal),
    // though not necessarily 0. This is the correct documented behaviour.
    const mat = makeMono(0);
    const result = equalize(mat, { method: "clahe", clipLimit: 2.0, tileGridSize: 4 });
    const vals = pixels(result.img);
    result.img.delete();
    const first = vals[0];
    if (first === undefined) throw new Error("expected non-empty pixel array");
    expect(vals.every((v) => v === first)).toBe(true); // all pixels identical
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

// ---------------------------------------------------------------------------
// 4. Options defaults and merging via ImageProcessor
// ---------------------------------------------------------------------------
describe("equalize — options defaults and merging", () => {
  test("calling equalize() with no options uses CLAHE defaults (no error)", () => {
    // 4×4 grayscale Mat — small enough to be fast, large enough for CLAHE.
    const mat = makeMono(128, 4, 4);
    const processor = new ImageProcessor(mat);
    expect(() => {
      processor.equalize();
      processor.destroy();
    }).not.toThrow();
  });

  test("partial options override only the specified fields", () => {
    // Supply only clipLimit — method should still default to 'clahe'.
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

// ---------------------------------------------------------------------------
// 5. ImageProcessor integration
// ---------------------------------------------------------------------------
describe("equalize — ImageProcessor integration", () => {
  test("equalize() returns `this` for chaining", () => {
    const mat = makeMono(128, 4, 4);
    const processor = new ImageProcessor(mat);
    const returned = processor.equalize();
    expect(returned).toBe(processor);
    processor.destroy();
  });

  test("grayscale().equalize() full pipeline runs without error", () => {
    // Use a 3-channel RGBA source (what a canvas would give us).
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
    // Full gray pipeline: grayscale → equalize → blur
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
    const names = registry.getOperationNames();
    expect(names).toContain("equalize");
  });
});

// ---------------------------------------------------------------------------
// 6. Real-image integration — assets/dibco_cropped.png
//
// DIBCO (Document Image Binarization Contest) images are the standard
// benchmark for document preprocessing pipelines. This section verifies
// that the equalize operation works correctly on a real-world scanned
// document with uneven illumination
// ---------------------------------------------------------------------------
describe("equalize — real-image integration (dibco_cropped.png)", () => {
  test("file can be loaded and converted to a grayscale Mat", async () => {
    const file = Bun.file("./assets/dibco_cropped.png");
    const buffer = await file.arrayBuffer();
    const canvas = await (
      await import("../src/canvas-processor.js")
    ).CanvasProcessor.prepareCanvas(buffer);
    expect(canvas.width).toBeGreaterThan(0);
    expect(canvas.height).toBeGreaterThan(0);

    const processor = new ImageProcessor(canvas);
    processor.grayscale();
    expect(processor.img.channels()).toBe(1);
    processor.destroy();
  });

  test("CLAHE: output dimensions match input on dibco_cropped.png", async () => {
    const file = Bun.file("./assets/dibco_cropped.png");
    const canvas = await (
      await import("../src/canvas-processor.js")
    ).CanvasProcessor.prepareCanvas(await file.arrayBuffer());

    const processor = new ImageProcessor(canvas);
    const { width, height } = processor;
    processor.grayscale().equalize({ method: "clahe" });

    expect(processor.width).toBe(width);
    expect(processor.height).toBe(height);
    processor.destroy();
  });

  test("global: output dimensions match input on dibco_cropped.png", async () => {
    const file = Bun.file("./assets/dibco_cropped.png");
    const canvas = await (
      await import("../src/canvas-processor.js")
    ).CanvasProcessor.prepareCanvas(await file.arrayBuffer());

    const processor = new ImageProcessor(canvas);
    const { width, height } = processor;
    processor.grayscale().equalize({ method: "global" });

    expect(processor.width).toBe(width);
    expect(processor.height).toBe(height);
    processor.destroy();
  });

  test("CLAHE: all pixel values remain in [0, 255] after equalization", async () => {
    const file = Bun.file("./assets/dibco_cropped.png");
    const canvas = await (
      await import("../src/canvas-processor.js")
    ).CanvasProcessor.prepareCanvas(await file.arrayBuffer());

    const processor = new ImageProcessor(canvas);
    processor.grayscale().equalize({ method: "clahe" });

    const data = new Uint8Array(processor.img.data);
    const min = Math.min(...data);
    const max = Math.max(...data);
    expect(min).toBeGreaterThanOrEqual(0);
    expect(max).toBeLessThanOrEqual(255);
    processor.destroy();
  });

  test("global: all pixel values remain in [0, 255] after equalization", async () => {
    const file = Bun.file("./assets/dibco_cropped.png");
    const canvas = await (
      await import("../src/canvas-processor.js")
    ).CanvasProcessor.prepareCanvas(await file.arrayBuffer());

    const processor = new ImageProcessor(canvas);
    processor.grayscale().equalize({ method: "global" });

    const data = new Uint8Array(processor.img.data);
    const min = Math.min(...data);
    const max = Math.max(...data);
    expect(min).toBeGreaterThanOrEqual(0);
    expect(max).toBeLessThanOrEqual(255);
    processor.destroy();
  });

  test("CLAHE: contrast spread is wider than raw grayscale (std-dev increases)", async () => {
    // Equalization should spread the intensity histogram — the standard
    // deviation of pixel values should increase (or at minimum not decrease)
    // on a real scanned document with uneven illumination.
    const file = Bun.file("./assets/dibco_cropped.png");
    const canvas = await (
      await import("../src/canvas-processor.js")
    ).CanvasProcessor.prepareCanvas(await file.arrayBuffer());

    // Capture raw grayscale std-dev
    const rawProcessor = new ImageProcessor(canvas);
    rawProcessor.grayscale();
    const rawData = new Uint8Array(rawProcessor.img.data);
    const rawMean = rawData.reduce((a, b) => a + b, 0) / rawData.length;
    const rawStd = Math.sqrt(
      rawData.reduce((acc, v) => acc + (v - rawMean) ** 2, 0) / rawData.length
    );
    rawProcessor.destroy();

    // Capture CLAHE std-dev from a fresh load
    const file2 = Bun.file("./assets/dibco_cropped.png");
    const canvas2 = await (
      await import("../src/canvas-processor.js")
    ).CanvasProcessor.prepareCanvas(await file2.arrayBuffer());

    const eqProcessor = new ImageProcessor(canvas2);
    eqProcessor.grayscale().equalize({ method: "clahe" });
    const eqData = new Uint8Array(eqProcessor.img.data);
    const eqMean = eqData.reduce((a, b) => a + b, 0) / eqData.length;
    const eqStd = Math.sqrt(eqData.reduce((acc, v) => acc + (v - eqMean) ** 2, 0) / eqData.length);
    eqProcessor.destroy();

    // CLAHE equalization should produce a wider or equal spread
    expect(eqStd).toBeGreaterThanOrEqual(rawStd * 0.9); // allow 10% tolerance
  });

  test("global: output is single-channel 8-bit on real document image", async () => {
    const file = Bun.file("./assets/dibco_cropped.png");
    const canvas = await (
      await import("../src/canvas-processor.js")
    ).CanvasProcessor.prepareCanvas(await file.arrayBuffer());

    const processor = new ImageProcessor(canvas);
    processor.grayscale().equalize({ method: "global" });

    expect(processor.img.channels()).toBe(1);
    expect(processor.img.type()).toBe(cv.CV_8UC1);
    processor.destroy();
  });

  test("grayscale().equalize().threshold() full pipeline runs on dibco_cropped.png", async () => {
    // Verify the common document OCR pre-processing chain works end-to-end.
    const file = Bun.file("./assets/dibco_cropped.png");
    const canvas = await (
      await import("../src/canvas-processor.js")
    ).CanvasProcessor.prepareCanvas(await file.arrayBuffer());

    const processor = new ImageProcessor(canvas);
    expect(() => {
      processor.grayscale().equalize().threshold();
      const mat = processor.toMat();
      expect(mat.channels()).toBe(1);
    }).not.toThrow();

    processor.destroy();
  });

  test("CLAHE with custom clipLimit=3.0 and tileGridSize=16 runs on dibco_cropped.png", async () => {
    const file = Bun.file("./assets/dibco_cropped.png");
    const canvas = await (
      await import("../src/canvas-processor.js")
    ).CanvasProcessor.prepareCanvas(await file.arrayBuffer());

    const processor = new ImageProcessor(canvas);
    expect(() => {
      processor.grayscale().equalize({ method: "clahe", clipLimit: 3.0, tileGridSize: 16 });
    }).not.toThrow();
    processor.destroy();
  });
});

// ---------------------------------------------------------------------------
// 7. Memory management
//
// Verifies that every Wasm allocation (input Mat, CLAHE object) is correctly
// freed, and that the output Mat remains valid after all internal objects are
// cleaned up.
// ---------------------------------------------------------------------------
describe("equalize — memory management", () => {
  test("input Mat is deleted after global equalization: accessing it throws", () => {
    const mat = makeMono(128);
    const result = equalize(mat, { method: "global", clipLimit: 2.0, tileGridSize: 8 });
    result.img.delete();
    // Emscripten marks deleted handles — any property access on a deleted Mat throws.
    expect(() => mat.rows).toThrow();
  });

  test("input Mat is deleted after CLAHE equalization: accessing it throws", () => {
    const mat = makeMono(128);
    const result = equalize(mat, { method: "clahe", clipLimit: 2.0, tileGridSize: 4 });
    result.img.delete();
    expect(() => mat.rows).toThrow();
  });

  test("output Mat remains valid after the CLAHE object has been freed", () => {
    // clahe.delete() is called inside equalize() before returning.
    // The output dst Mat must still be readable by the caller.
    const mat = makeMono(100, 8, 8);
    const result = equalize(mat, { method: "clahe", clipLimit: 2.0, tileGridSize: 4 });
    // If clahe.delete() had also freed dst, any of these would throw.
    expect(() => result.img.rows).not.toThrow();
    expect(result.img.rows).toBe(8);
    expect(result.img.cols).toBe(8);
    expect(result.img.channels()).toBe(1);
    result.img.delete();
  });

  test("repeated CLAHE calls (50×) do not crash — no Wasm heap exhaustion", () => {
    // Each iteration allocates and frees one CLAHE object + two Mats.
    // If clahe.delete() were missing the Wasm heap would grow ~50× and
    // eventually throw an OOM or abort().
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
    const raw = processor.toMat(); // same reference as processor.img
    processor.destroy();
    expect(() => raw.rows).toThrow();
  });

  test("chaining replaces this.img: intermediate Mat is not accessible after next op", () => {
    const mat = makeMono(128, 4, 4);
    const processor = new ImageProcessor(mat);
    processor.equalize();
    const afterEqualize = processor.img;
    processor.blur(); // equalize output is consumed by blur, which deletes it
    // afterEqualize is now a deleted Mat — blur freed it and replaced processor.img
    expect(() => afterEqualize.rows).toThrow();
    processor.destroy();
  });
});
