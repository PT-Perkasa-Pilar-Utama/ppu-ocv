# Migration Guide: v2 → v3

## Overview

v3 decouples canvas utilities from OpenCV so the library can be used in environments where OpenCV cannot be initialised (Browser Extensions, Service Workers, edge runtimes, etc.).

The changes are minimal — most code needs only a one-line import update.

---

## 1. Replace `ImageProcessor.prepareCanvas` / `ImageProcessor.prepareBuffer`

These static methods have moved to the new `CanvasProcessor` class.

**Before (v2)**
```typescript
import { ImageProcessor } from "ppu-ocv";

const canvas = await ImageProcessor.prepareCanvas(arrayBuffer);
const buffer = await ImageProcessor.prepareBuffer(canvas);
```

**After (v3)**
```typescript
import { CanvasProcessor } from "ppu-ocv";

const canvas = await CanvasProcessor.prepareCanvas(arrayBuffer);
const buffer = await CanvasProcessor.prepareBuffer(canvas);
```

`ImageProcessor` is still exported from `ppu-ocv` and `ppu-ocv/web` — only the two static canvas methods have been removed from it.

---

## 2. Canvas-only environments (new in v3)

If you only need canvas utilities and **not** OpenCV (e.g. in a Browser Extension background script), switch to the canvas-only entry point. OpenCV is never imported or initialised.

**Node.js**
```typescript
// Before — forced to load OpenCV
import { ImageProcessor } from "ppu-ocv";
const canvas = await ImageProcessor.prepareCanvas(buffer);

// After — zero OpenCV, works in any Node environment
import { CanvasProcessor, CanvasToolkit } from "ppu-ocv/canvas";
const canvas = await CanvasProcessor.prepareCanvas(buffer);
```

**Browser**
```typescript
// Before — forced to load OpenCV
import { ImageProcessor } from "ppu-ocv/web";
const canvas = await ImageProcessor.prepareCanvas(buffer);

// After — zero OpenCV, works in Browser Extensions / Service Workers
import { CanvasProcessor, CanvasToolkit } from "ppu-ocv/canvas-web";
const canvas = await CanvasProcessor.prepareCanvas(buffer);
```

---

## 3. `drawContour` parameter type change

`CanvasToolkitBase.drawContour()` now accepts a `ContourLike` duck type instead of `cv.Mat`:

```typescript
interface ContourLike {
  data32S: Int32Array | number[];
}
```

**Existing code using `cv.Mat` is unaffected** — `cv.Mat` satisfies `ContourLike` structurally. No runtime change occurs; this is only a type-level loosening that removes the OpenCV type dependency from `CanvasToolkitBase`.

---

## 4. New export: `ContourLike`

If you previously typed a contour variable as `cv.Mat` only because of `drawContour`, you can now use the exported interface instead:

```typescript
import type { ContourLike } from "ppu-ocv"; // or "ppu-ocv/canvas"

function highlight(contour: ContourLike) {
  toolkit.drawContour({ ctx, contour });
}
```

---

## 5. DeskewService — no change

`DeskewService` remains exported from `ppu-ocv` and `ppu-ocv/web`. It is an OpenCV-dependent service and is **not** available from the canvas-only entry points. No migration needed.

---

## Entry point reference

| Import path         | OpenCV? | Node canvas | Browser canvas | Use case                              |
|---------------------|---------|-------------|----------------|---------------------------------------|
| `ppu-ocv`           | yes     | yes         | —              | Full pipeline, Node.js                |
| `ppu-ocv/web`       | yes     | —           | yes            | Full pipeline, browser                |
| `ppu-ocv/canvas`    | **no**  | yes         | —              | Canvas-only, Node (extensions, etc.)  |
| `ppu-ocv/canvas-web`| **no**  | —           | yes            | Canvas-only, browser (extensions, SW) |
