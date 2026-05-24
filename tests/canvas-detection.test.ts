// SPDX-License-Identifier: MIT
// Copyright (c) 2026 PT Perkasa Pilar Utama

import { describe, expect, test } from "bun:test";

import { isCanvasLike } from "../src/canvas-factory.js";

describe("isCanvasLike (platform-independent canvas detection)", () => {
  test("accepts a Node-style canvas (@napi-rs: width/height/getContext/toBuffer)", () => {
    const canvas = {
      width: 10,
      height: 10,
      getContext: () => ({}),
      toBuffer: () => Buffer.alloc(0),
    };
    expect(isCanvasLike(canvas)).toBe(true);
  });

  test("accepts a web-style canvas (width/height/getContext/toDataURL)", () => {
    const canvas = { width: 10, height: 10, getContext: () => ({}), toDataURL: () => "" };
    expect(isCanvasLike(canvas)).toBe(true);
  });

  test("rejects a cv.Mat-like object (rows/cols, no getContext)", () => {
    expect(isCanvasLike({ rows: 10, cols: 10, data: new Uint8Array() })).toBe(false);
  });

  test("rejects ImageData-like, null, and primitives", () => {
    expect(isCanvasLike({ width: 10, height: 10, data: new Uint8ClampedArray() })).toBe(false);
    expect(isCanvasLike(null)).toBe(false);
    expect(isCanvasLike("canvas")).toBe(false);
    expect(isCanvasLike(undefined)).toBe(false);
  });
});
