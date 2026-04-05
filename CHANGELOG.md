# Changelog

## [3.1.1] — 2026-04-06

### Improvements

#### `findRegions()` — new `thresh` option for resized binary images

The default `thresh: 127` caused accuracy loss when `findRegions` was called on a
**resized** binary image. Resizing introduces anti-aliased border pixels with
grayscale values in the 1–127 range that the old threshold ignored, while
OpenCV's `findContours` treats any non-zero pixel as foreground. The new `thresh`
option lets you match that behaviour:

```ts
// Use thresh: 0 so any non-zero pixel is treated as foreground,
// matching OpenCV findContours on resized binary images.
const regions = new CanvasProcessor(resizedBinaryCanvas).findRegions({
  foreground: "light",
  thresh: 0,
  minArea: 20,
  padding: { vertical: 0.4, horizontal: 0.6 },
  scale: 1 / resizeRatio,
});
```

With `thresh: 0`, `padding`, and `scale`, the full pipeline matches the
production `extractBoxesFromContours()` output at **mean IoU 98.4%**
(all 21/21 boxes matched).

#### Example script

`examples/find-region-vs-get-contours.ts` — side-by-side comparison of
`CanvasProcessor.findRegions` vs OpenCV contours on a real receipt image,
producing annotated PNG output files.

---

## [3.1.0] — 2026-04-06

### New Features

#### `CanvasProcessor` — canvas-native operations and region detection

All operations are available without any OpenCV dependency via `ppu-ocv/canvas` / `ppu-ocv/canvas-web`.

**Four new pixel-level operations** (matching `ImageProcessor`/OpenCV equivalents):

| Method | Fidelity vs OpenCV | Notes |
|---|---|---|
| `invert()` | **1:1** (on opaque images) | `255 - channel`; OpenCV also inverts alpha — compare after grayscale for exact match |
| `threshold(options?)` | **1:1** | `THRESH_BINARY` at a fixed value; Otsu automatic threshold not supported canvas-natively |
| `border(options?)` | **1:1** | Uniform `BORDER_CONSTANT`; color as CSS string instead of `[B,G,R,A]` array |
| `rotate(options)` | **≈** (max ±6 at 15°) | Canvas uses anti-aliased bilinear; OpenCV uses plain bilinear — visually indistinguishable |

**New `findRegions()` — canvas-native bbox detection on binary images:**

```ts
const regions = new CanvasProcessor(binaryCanvas).findRegions({
  foreground: "light", // detect white regions (default)
  minArea: 20,         // ignore regions smaller than N pixels
});
// regions: DetectedRegion[] → { bbox: { x0, y0, x1, y1 }, area }
```

Uses 8-connected DFS flood-fill. No OpenCV required. Comparable to:
```ts
const contours = new Contours(mat, { mode: cv.RETR_EXTERNAL, method: cv.CHAIN_APPROX_SIMPLE });
contours.iterate(c => { const r = contours.getRect(c); /* r.x, r.y, r.width, r.height */ });
```
On `binary-text-detection.png`: 21 of 23 OpenCV contours matched, mean IoU 88.7%.

#### `Context2DLike` interface extended

Added `save`, `restore`, `translate`, `rotate`, `fillStyle`, `fillRect` to the
`Context2DLike` structural interface in `canvas-factory.ts`. These are standard
Canvas2D API methods used by the new operations. No consumer code changes needed.

### Comparison test results (v3.1.0)

| Operation | Exact match | Max diff |
|---|---|---|
| grayscale | 100.00% | 0 |
| invert (after grayscale) | 100.00% | 0 |
| threshold (THRESH_BINARY=127) | 100.00% | 0 |
| border (size=10, white) | 100.00% | 0 |
| resize downscale 2× | 100.00% | 0 |
| resize upscale 2× | 89.98% | ±1 |
| rotate 0° | 100.00% | 0 |
| rotate 15° (inner region) | 36.76% | ±6 |
| findRegions (binary image) | 21/23 matched | IoU 88.7% |

---

## [3.0.0] — 2026-04-05

### Breaking Changes

- **`ImageProcessor.prepareCanvas()` removed** — use `CanvasProcessor.prepareCanvas()` instead.
- **`ImageProcessor.prepareBuffer()` removed** — use `CanvasProcessor.prepareBuffer()` instead.
- **`CanvasToolkitBase.drawContour()` parameter type changed** — the `contour` option now accepts `ContourLike` (`{ data32S: Int32Array | number[] }`) instead of `cv.Mat`. Existing code passing a `cv.Mat` continues to work at runtime since `cv.Mat` satisfies the duck type.

### New Features

#### `CanvasProcessor` class

A new class that groups canvas I/O utilities with **zero dependency on OpenCV**. Safe to use in constrained environments (Browser Extensions, Service Workers, etc.) where OpenCV cannot be initialised.

```typescript
import { CanvasProcessor } from "ppu-ocv";

const canvas = await CanvasProcessor.prepareCanvas(arrayBuffer);
const buffer = await CanvasProcessor.prepareBuffer(canvas);
```

#### `ppu-ocv/canvas` entry point (Node.js, canvas-only)

Imports the Node.js canvas platform and exposes `CanvasProcessor`, `CanvasToolkit`, and `CanvasToolkitBase` **without touching OpenCV**. Importing this entry point will never throw due to a missing or un-initialised OpenCV runtime.

```typescript
import { CanvasProcessor, CanvasToolkit } from "ppu-ocv/canvas";
```

Exports: `CanvasProcessor`, `CanvasToolkit`, `CanvasToolkitBase`, `ContourLike`, canvas factory types, and `@napi-rs/canvas` re-exports (`Canvas`, `createCanvas`, `ImageData`, `loadImage`).

#### `ppu-ocv/canvas-web` entry point (Browser, canvas-only)

Browser counterpart of `ppu-ocv/canvas`. Uses `HTMLCanvasElement` / `OffscreenCanvas` and exports the same canvas-only surface (`CanvasToolkitBase` aliased as `CanvasToolkit`).

```typescript
import { CanvasProcessor, CanvasToolkit } from "ppu-ocv/canvas-web";
```

#### `ContourLike` interface

Exported from all entry points. Describes the structural shape expected by `CanvasToolkitBase.drawContour()`:

```typescript
interface ContourLike {
  data32S: Int32Array | number[];
}
```

### Internal Changes

- `CanvasToolkitBase` no longer imports `cv-provider` — it is now truly OpenCV-free.
- `CanvasProcessor` is a pure leaf module that only depends on `canvas-factory`.

---

## [2.0.0] — previous

Web / browser support via `ppu-ocv/web` entry point. Lazy OpenCV loading via Proxy pattern.

## [1.x] — previous

Initial release with Node.js-only support.
