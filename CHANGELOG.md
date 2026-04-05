# Changelog

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
