// SPDX-License-Identifier: MIT
// Copyright (c) 2026 PT Perkasa Pilar Utama

/**
 * Dynamic analysis (fuzzing) of the untrusted-input boundary. `fast-check`
 * generates many random inputs at runtime and exercises the image decoder; a
 * crash, hang, or non-Error throw is a finding. Assertions are enabled
 * throughout (the property uses `expect`).
 */
import { describe, expect, test } from "bun:test";
import fc from "fast-check";

import { CanvasProcessor } from "../src/index.canvas.js";

describe("fuzz: image decoding is robust to malformed input", () => {
  test("prepareCanvas never crashes on arbitrary bytes", async () => {
    await fc.assert(
      fc.asyncProperty(fc.uint8Array({ maxLength: 8192 }), async (bytes) => {
        try {
          const canvas = await CanvasProcessor.prepareCanvas(bytes.buffer as ArrayBuffer);
          // If a random buffer happened to decode, the result must be sane.
          expect(canvas.width).toBeGreaterThanOrEqual(0);
          expect(canvas.height).toBeGreaterThanOrEqual(0);
        } catch (error) {
          // Malformed input must fail gracefully with a normal Error — never a
          // native crash, hang, or non-Error throw.
          expect(error).toBeInstanceOf(Error);
        }
      }),
      { numRuns: 250 }
    );
  }, 60000);

  test("prepareCanvas rejects an empty buffer gracefully", async () => {
    await expect(CanvasProcessor.prepareCanvas(new ArrayBuffer(0))).rejects.toBeInstanceOf(Error);
  });
});
