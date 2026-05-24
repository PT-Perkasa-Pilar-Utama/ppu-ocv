// SPDX-License-Identifier: MIT
// Copyright (c) 2026 PT Perkasa Pilar Utama

import { describe, expect, test } from "bun:test";
import type { CanvasLike } from "../src/canvas-factory.js";
import { canvasToBuffer } from "../src/canvas-io.js";

// Distinctive non-RGBA byte pattern so a raw-getImageData fallback would not match.
const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function baseCanvas(): CanvasLike {
  return {
    width: 1,
    height: 1,
    getContext: () => {
      throw new Error("getContext (raw RGBA fallback) should not be reached");
    },
  };
}

describe("canvasToBuffer: cross-runtime serialization", () => {
  test("OffscreenCanvas path uses convertToBlob (workers / browser extensions)", async () => {
    const canvas: CanvasLike = {
      ...baseCanvas(),
      convertToBlob: async (options = {}) => {
        expect(options.type).toBe("image/png");
        return new Blob([PNG_BYTES], { type: "image/png" });
      },
    };

    const buf = await canvasToBuffer(canvas);
    expect(new Uint8Array(buf)).toEqual(PNG_BYTES);
  });

  test("HTMLCanvasElement path uses toBlob, not base64", async () => {
    const canvas: CanvasLike = {
      ...baseCanvas(),
      toBlob: (cb, type) => {
        expect(type).toBe("image/png");
        cb(new Blob([PNG_BYTES], { type: "image/png" }));
      },
    };

    const buf = await canvasToBuffer(canvas);
    expect(new Uint8Array(buf)).toEqual(PNG_BYTES);
  });

  test("toBlob is preferred over the legacy toDataURL path", async () => {
    let dataUrlCalled = false;
    const canvas: CanvasLike = {
      ...baseCanvas(),
      toBlob: (cb) => cb(new Blob([PNG_BYTES])),
      toDataURL: () => {
        dataUrlCalled = true;
        return "";
      },
    };

    await canvasToBuffer(canvas);
    expect(dataUrlCalled).toBe(false);
  });

  test("rejects when toBlob yields a null blob", async () => {
    const canvas: CanvasLike = {
      ...baseCanvas(),
      toBlob: (cb) => cb(null),
    };

    await expect(canvasToBuffer(canvas)).rejects.toThrow("toBlob returned null");
  });
});
