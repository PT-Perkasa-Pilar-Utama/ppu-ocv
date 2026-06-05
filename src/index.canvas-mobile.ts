// SPDX-License-Identifier: MIT
// Copyright (c) 2026 PT Perkasa Pilar Utama

/**
 * Canvas-only entry point — React Native, no OpenCV dependency.
 *
 * Use this in React Native apps (iOS / Android) when you only need canvas I/O
 * and the image-processing helpers exposed by `CanvasProcessor`. OpenCV is
 * **never imported or initialised**, so the bundle is lighter and WASM-free.
 *
 * Requires `@shopify/react-native-skia` (≥ 1.0.0) and React Native ≥ 0.74 /
 * Expo SDK ≥ 51 to be installed in the consuming project. `react-native-skia`
 * must be initialised before calling any `ppu-ocv` APIs (follow the
 * `@shopify/react-native-skia` setup guide for your RN version).
 *
 * Functionally equivalent to `ppu-ocv/canvas-web` but binds the Skia-backed
 * mobile platform instead of `HTMLCanvasElement` / `OffscreenCanvas`.
 *
 * @example
 * ```ts
 * import { CanvasProcessor } from "ppu-ocv/canvas-mobile";
 *
 * // Load from a URI (e.g. from expo-image-picker or Camera Roll)
 * const canvas = await CanvasProcessor.prepareCanvas("file:///path/to/image.jpg");
 *
 * const regions = new CanvasProcessor(canvas)
 *   .grayscale()
 *   .threshold({ thresh: 127 })
 *   .findRegions({ foreground: "light", minArea: 20 });
 * ```
 *
 * @module
 */
import { setPlatform } from "./canvas-factory.js";
import { mobilePlatform } from "./platform/mobile.js";
setPlatform(mobilePlatform);

export type { BoundingBox, Coordinate, Points } from "./index.interface.js";
export { getPlatform, setPlatform } from "./canvas-factory.js";
export type { CanvasLike, CanvasPlatform, Context2DLike } from "./canvas-factory.js";
export { mobilePlatform } from "./platform/mobile.js";
export {
  CanvasToolkitBase as CanvasToolkit,
  CanvasToolkitBase,
  type ContourLike,
} from "./canvas-toolkit.base.js";
export { CanvasProcessor, type DetectedRegion } from "./canvas-processor.js";
