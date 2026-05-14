---
name: skill-ppu-ocv
description: Use this skill whenever the user is writing TypeScript/JavaScript code that imports `ppu-ocv`, `ppu-ocv/web`, `ppu-ocv/canvas`, or `ppu-ocv/canvas-web`, or asks about chainable image processing, OpenCV.js, document/receipt preprocessing, perspective warp, deskew, contour detection, or running OpenCV in browsers / browser extensions / Bun / Node. Trigger even when the user says "image processing in TypeScript" or "OpenCV.js wrapper" without naming ppu-ocv, as long as the codebase imports it. This skill encodes the four entry points, which classes each unlocks, when to pick `ImageProcessor` (OpenCV) vs `CanvasProcessor` (canvas-native), the chainable pipeline order, and the runtime-init dance.
---

# Writing code with `ppu-ocv`

`ppu-ocv` is a type-safe, chainable image-processing library built on `@techstark/opencv-js`. Canvas I/O is decoupled from OpenCV, so the same package ships **four entry points** that trade off capability vs runtime constraints. Picking the right one is the single most common source of "why does my import throw?" — get it right first, everything else follows.

## The two-class mental model

There are exactly two image-processing classes the agent will reach for:

| Class             | Needs OpenCV? | What it gives you                                                                                                                          |
| ----------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `ImageProcessor`  | **Yes**       | Full OpenCV pipeline — `grayscale`, `blur`, `threshold`, `adaptiveThreshold`, `canny`, `dilate`, `erode`, `morphologicalGradient`, `warp`, etc. Chainable. Wraps a `cv.Mat`. |
| `CanvasProcessor` | **No**        | Lightweight canvas-native pipeline — `resize`, `grayscale`, `convert`, `invert`, `threshold`, `border`, `rotate`, `findRegions`. Also the static I/O helpers `prepareCanvas` / `prepareBuffer`. |

**Rule of thumb:** if the user only needs to load/save images, crop, threshold, or find connected regions on a binary mask, prefer `CanvasProcessor`. If they need real OpenCV — adaptive thresholding, Canny edges, morphology beyond a single pass, perspective warp, Hough lines, contours — they need `ImageProcessor` and a runtime that allows it.

## Picking the right entry point

This is the table to internalize. Always confirm the runtime before suggesting an import:

| Import path          | OpenCV    | Canvas backend                          | When to recommend                                                                                       |
| -------------------- | --------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `ppu-ocv`            | available | `@napi-rs/canvas` (native)              | **Node.js or Bun servers / CLIs.** Full pipeline. Includes Node-only `CanvasToolkit` with file I/O.     |
| `ppu-ocv/web`        | available | `HTMLCanvasElement` / `OffscreenCanvas` | **Browsers with a normal CSP.** Full pipeline. `CanvasToolkit` is aliased to the base (no `saveImage`). |
| `ppu-ocv/canvas`     | not available | `@napi-rs/canvas` (native)          | **Node / Bun, but you only want canvas ops.** Smaller bundle, never touches OpenCV WASM.                |
| `ppu-ocv/canvas-web` | not available | `HTMLCanvasElement` / `OffscreenCanvas` | **Chrome MV3 extensions, service workers, edge runtimes.** Anywhere OpenCV.js can't run because Emscripten's embind needs `new Function`. |

A few hard rules:

- `ImageProcessor` and `cv` exist only on `ppu-ocv` and `ppu-ocv/web`. Importing them from a `/canvas*` entry point will fail at type-check time.
- `CanvasToolkit.saveImage` and `clearOutput` only exist on the Node side (`ppu-ocv` / `ppu-ocv/canvas`) — they use `fs`. The web entry points export `CanvasToolkit` as an alias of `CanvasToolkitBase`, which does **not** include file I/O.
- `CanvasProcessor`, `Contours`, `DeskewService`, `calculateMeanGrayscaleValue`, and `calculateMeanNormalizedLabLightness` are all OpenCV-backed and live on the OpenCV-aware entry points (with the exception of `CanvasProcessor`, which is canvas-native and exists everywhere).

When the user describes their runtime in even general terms ("I'm in a Chrome extension service worker", "this runs on Cloudflare Workers", "it's a Bun CLI"), bind the entry-point choice to that constraint immediately rather than copy-pasting a generic example.

## The runtime-init contract

OpenCV.js is a WASM module. It must finish initializing **once** before any `cv.*` call. The library exposes one async gate:

```ts
import { ImageProcessor } from "ppu-ocv"; // or "ppu-ocv/web"
await ImageProcessor.initRuntime();
```

Call `initRuntime` exactly once per process / page load, at the top of your async entry point. After it resolves, `cv.Mat`, `cv.threshold`, `Contours`, `DeskewService`, and all `ImageProcessor` operations are safe to use. The `/canvas*` entry points don't require this step because they never touch OpenCV.

Forgetting `initRuntime` produces errors like `OpenCV is not loaded. Call ImageProcessor.initRuntime() first.` — when the user reports that, the fix is always to await it before the first OpenCV-touching line.

## Canonical Node / Bun pipeline

```ts
import { CanvasProcessor, ImageProcessor, CanvasToolkit } from "ppu-ocv";

await ImageProcessor.initRuntime();

const file = Bun.file("./assets/receipt.jpg");
const canvas = await CanvasProcessor.prepareCanvas(await file.arrayBuffer());

const processor = new ImageProcessor(canvas);
const out = processor
  .grayscale()
  .blur({ size: [5, 5] })
  .threshold()
  .invert()
  .dilate({ size: [20, 20], iter: 5 })
  .toCanvas();

await CanvasToolkit.getInstance().saveImage({
  canvas: out,
  filename: "receipt-binarized",
  path: "out",
});

processor.destroy(); // free the underlying cv.Mat
```

`processor.destroy()` matters — `ImageProcessor` owns a `cv.Mat`, and OpenCV.js does not garbage-collect WASM allocations. Pair every `new ImageProcessor(...)` with a `destroy()` in a `finally`, or write a helper that does it. Forgetting leaks WASM memory and eventually crashes long-running processes.

## Canonical browser pipeline (with bundler)

```ts
import { CanvasProcessor, ImageProcessor } from "ppu-ocv/web";

await ImageProcessor.initRuntime();

const buffer = await (await fetch("/my-image.jpg")).arrayBuffer();
const canvas = await CanvasProcessor.prepareCanvas(buffer);

const processor = new ImageProcessor(canvas);
processor.grayscale().blur({ size: [5, 5] }).threshold();
document.body.appendChild(processor.toCanvas() as HTMLCanvasElement);
processor.destroy();
```

For vanilla HTML with no bundler, import the published ESM build directly:

```html
<script type="module">
  import {
    CanvasProcessor,
    ImageProcessor,
  } from "https://cdn.jsdelivr.net/npm/ppu-ocv@3/index.web.js";
  await ImageProcessor.initRuntime();
  // ...
</script>
```

`initRuntime` lazy-loads `@techstark/opencv-js` from npm CDN if no bundle is in play.

## Canonical CSP-restricted pipeline (no OpenCV)

For Chrome Manifest V3 background scripts, service workers, or any runtime that blocks `new Function`:

```ts
import { CanvasProcessor } from "ppu-ocv/canvas-web";

const response = await fetch(imageUrl);
const canvas = await CanvasProcessor.prepareCanvas(await response.arrayBuffer());

const binary = new CanvasProcessor(canvas)
  .resize({ width: 720, height: 1280 })
  .grayscale()
  .threshold({ thresh: 127 })
  .toCanvas();

const regions = new CanvasProcessor(binary).findRegions({
  foreground: "light",
  minArea: 20,
  padding: { vertical: 0.4, horizontal: 0.6 },
});
regions.sort((a, b) => b.area - a.area);
```

This whole snippet runs without OpenCV. `findRegions` uses an 8-connected DFS flood-fill and matches `cv.findContours(RETR_EXTERNAL) + boundingRect` to ~98% IoU on binary inputs.

## Chaining order matters

Operation order is enforced by physics, not the type system. The pipeline lets you call anything in any order, but most operations need a specific predecessor. The cheat sheet:

- `grayscale` → always first when going binary
- `blur` → after `grayscale` (noise reduction works on 1-channel)
- `threshold` / `adaptiveThreshold` → after `grayscale` (and optionally `blur`)
- `invert` → after `threshold` / `adaptiveThreshold` (flips a binary mask)
- `canny` → after `grayscale` + `blur` (edge detector expects smoothed gray)
- `dilate` / `erode` → after `threshold` or edge detection (works on binary)
- `morphologicalGradient` → after a binary mask (dilation minus erosion)
- `warp`, `resize`, `border`, `rotate` → geometric, position-independent

When the user describes their goal ("I want to extract receipt regions", "I want to deskew a document"), pick the order from this cheat sheet rather than echoing the snippet they pasted.

A full reference of every operation's options is in `references/operations.md`. Read it before authoring code that uses an option you don't recognize.

## Perspective warp with `Contours`

`Contours` wraps `cv.findContours` and adds helpers for the most common follow-up: finding the four corners of the dominant shape and warping it flat. Available from `ppu-ocv` / `ppu-ocv/web`.

```ts
import {
  CanvasProcessor,
  Contours,
  ImageProcessor,
  cv,
} from "ppu-ocv";

await ImageProcessor.initRuntime();
const canvas = await CanvasProcessor.prepareCanvas(await file.arrayBuffer());

const processor = new ImageProcessor(canvas);
const mask = processor.grayscale().blur().canny().dilate().toMat();

const contours = new Contours(mask, {
  mode: cv.RETR_EXTERNAL,
  method: cv.CHAIN_APPROX_SIMPLE,
});

const { points, bbox } = contours.getCornerPoints({ canvas });
const flattened = processor.warp({ points, bbox }).toCanvas();

contours.destroy();
processor.destroy();
```

`getCornerPoints` returns `{ topLeft, topRight, bottomLeft, bottomRight }` already sorted, plus the canvas-size `bbox` ready to pass to `warp` as the destination rectangle. `warp` expects exactly that shape — don't try to hand it a `cv.Mat` of points.

`contours.destroy()` is the equivalent of `processor.destroy()` for the contour `MatVector` — always pair it.

## Deskewing a document

`DeskewService` consensuses three independent angle estimators (`minAreaRect` per text region, baseline regression, Hough lines) and returns the agreed-on skew. Lives on `ppu-ocv` / `ppu-ocv/web`.

```ts
import { CanvasProcessor, DeskewService, ImageProcessor } from "ppu-ocv";

await ImageProcessor.initRuntime();
const canvas = await CanvasProcessor.prepareCanvas(await file.arrayBuffer());

const service = new DeskewService({ verbose: false, minimumAreaThreshold: 20 });

// Either get the angle and rotate yourself…
const angle = await service.calculateSkewAngle(canvas);

// …or let the service rotate for you:
const straightened = await service.deskewImage(canvas);
```

The input should be a probability map or a binary image of text regions for `calculateSkewAngle` to be accurate. If you only have a raw photo, run `new ImageProcessor(canvas).grayscale().threshold().toCanvas()` first.

## Image analysis helpers

Two small utilities for global stats — both require OpenCV:

```ts
import {
  calculateMeanGrayscaleValue,
  calculateMeanNormalizedLabLightness,
} from "ppu-ocv";

const meanGray = calculateMeanGrayscaleValue(canvas);
const meanL = calculateMeanNormalizedLabLightness({
  canvas,
  dimension: { width: 256, height: 256 },
});
```

Use `calculateMeanGrayscaleValue` for cheap "is this image mostly dark or light?" decisions (e.g., picking `THRESH_BINARY` vs `THRESH_BINARY_INV`). Use the Lab variant when you need a perceptually-uniform lightness number — e.g., flagging too-dark scans for re-capture.

## `CanvasToolkit` — file I/O and drawing

A singleton with `getInstance()`. Two flavors:

- `CanvasToolkit.getInstance()` from `ppu-ocv` / `ppu-ocv/canvas` — Node-only, includes `saveImage(...)` and `clearOutput(...)` that touch the filesystem.
- The web entry points export `CanvasToolkit` as an alias of `CanvasToolkitBase` — same `crop`, `isDirty`, `drawLine`, `drawContour` methods, no filesystem.

```ts
const toolkit = CanvasToolkit.getInstance();

const cropped = toolkit.crop({
  canvas,
  bbox: { x0: 50, y0: 50, x1: 450, y1: 800 },
});

if (toolkit.isDirty({ canvas: binary })) {
  // mostly black or mostly white — skip OCR
}

await toolkit.saveImage({
  canvas: cropped,
  filename: "step-3",
  path: "out", // Node only
});
```

Don't try to construct `CanvasToolkit` with `new` — the constructor is protected. Always go through `getInstance()`.

## Extending the pipeline with a custom operation

The pipeline is open. To add an operation, register it on the singleton `registry` and (optionally) augment `RegisteredOperations` via TypeScript declaration merging so `processor.execute("yourOp", { ... })` is fully typed.

```ts
import { registry, type OperationResult } from "ppu-ocv";
import { cv } from "ppu-ocv";

interface InvertedThresholdOptions {
  thresh: number;
}

declare module "ppu-ocv" {
  interface RegisteredOperations {
    invertedThreshold: InvertedThresholdOptions;
  }
}

registry.register(
  "invertedThreshold",
  (img: cv.Mat, options: InvertedThresholdOptions): OperationResult => {
    const out = new cv.Mat();
    cv.threshold(img, out, options.thresh, 255, cv.THRESH_BINARY_INV);
    img.delete();
    return { img: out, width: out.cols, height: out.rows };
  },
  () => ({ thresh: 127 })
);

// usage:
processor.execute("invertedThreshold", { thresh: 100 });
```

The third arg is a default-options factory; pass it whenever your op has sensible defaults so callers can omit options. Every operation **must delete its input Mat** (`img.delete()`) — that's how the pipeline avoids leaks.

## Memory model cheat sheet

OpenCV.js holds WASM-allocated memory that JS GC doesn't free. The library minimizes this with `delete()` calls inside each operation, but you own the lifecycle of the top-level objects:

- `new ImageProcessor(...)` → call `.destroy()` when done.
- `new Contours(...)` → call `.destroy()` when done.
- Intermediate `cv.Mat` you allocate yourself (e.g. inside a custom operation) → `.delete()` when done.
- `CanvasProcessor`, `CanvasToolkit`, `DeskewService` → no manual cleanup; they don't hold long-lived Mats.

Forgetting this is the second most common bug, after picking the wrong entry point. Wrap pipelines in `try/finally` when running in a hot loop.

## Common mistakes to flag

When reviewing or writing ppu-ocv code, watch for these:

- **Importing `ImageProcessor` from `ppu-ocv/canvas` or `ppu-ocv/canvas-web`.** It doesn't exist there. Switch entry points or remove the OpenCV step.
- **Calling a `cv.*` constant before `await ImageProcessor.initRuntime()`.** Throws "OpenCV is not loaded". Move the `await` to the top of the async entry point.
- **Building a long-running server that never calls `.destroy()`.** WASM heap grows until the process dies. Wrap pipelines in `try/finally`.
- **Calling `toolkit.saveImage` from `ppu-ocv/web` or `ppu-ocv/canvas-web`.** Those entry points export `CanvasToolkit` as the base class — `saveImage` is not defined. Use `CanvasProcessor.prepareBuffer` + a manual write, or move that step to a Node worker.
- **Passing a raw photo to `DeskewService.calculateSkewAngle`.** It assumes a probability/binary map of text. Threshold first.
- **Re-using a `cv.Mat` after passing it to a pipeline operation.** Operations call `img.delete()` internally. The reference is dead afterwards — chain through `.toMat()` or `.toCanvas()` instead.

## Further reading

- `references/operations.md` — every built-in operation with full options, defaults, and chaining notes.
- `references/recipes.md` — copy-pasteable recipes for OCR preprocess, receipt extraction, deskew, perspective warp, and CSP-restricted pipelines.
