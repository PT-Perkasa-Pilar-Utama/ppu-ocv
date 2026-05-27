---
title: "OpenCV.js Without the Memory Leaks: Chainable Image Processing for Every JavaScript Runtime"
published: false
description: "ppu-ocv wraps OpenCV.js in a chainable TypeScript pipeline that handles Mat lifecycle for you, with four entry points that let you drop OpenCV entirely when you don't need it. Runs in Node, Bun, browsers, browser extensions, and service workers."
tags: opencv, javascript, typescript, webdev
cover_image: https://raw.githubusercontent.com/PT-Perkasa-Pilar-Utama/ppu-ocv/main/assets/article-cover.png
canonical_url:
series: ppu-ocv
---

![ppu-ocv cover](https://raw.githubusercontent.com/PT-Perkasa-Pilar-Utama/ppu-ocv/main/assets/article-cover.png)

If you have ever used OpenCV.js in production, you already know the bug. A user uploads ten images in a row. The third one throws inside your blur step. Your `mat.delete()` line at the bottom of the function never runs. The WASM heap creeps up. By image six the tab is sluggish. By image nine it crashes. You add a try/finally. You forget one Mat in a helper function. The bug comes back.

OpenCV.js is the most capable image-processing toolkit in the browser. It is also a manual-memory C++ port wearing a thin JavaScript jacket. Every operation allocates one or more `Mat` objects on the WASM heap, and every `Mat` is yours to free. Miss one and you leak. Miss enough and you crash.

I maintain [`ppu-ocv`](https://www.npmjs.com/package/ppu-ocv), an open-source TypeScript wrapper that takes the memory tax off your plate, gives you a chainable pipeline, and ships four entry points so you can opt out of OpenCV entirely when your runtime cannot afford the 8 MB WASM blob. It powers the preprocessing path inside [`ppu-paddle-ocr`](https://www.npmjs.com/package/ppu-paddle-ocr) and a handful of receipt and document pipelines in production.

## The OpenCV.js memory tax

![Memory tax comparison](https://raw.githubusercontent.com/PT-Perkasa-Pilar-Utama/ppu-ocv/main/assets/article-memory.png)

Here is a four-step pipeline (grayscale, blur, threshold) in raw OpenCV.js:

```ts
const src = cv.imread(canvas);
const gray = new cv.Mat();
cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

const blurred = new cv.Mat();
cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);

const binary = new cv.Mat();
cv.threshold(blurred, binary, 127, 255, cv.THRESH_BINARY);

// you remember every one of these. always.
src.delete();
gray.delete();
blurred.delete();
binary.delete();
```

Four operations, four Mat objects, four `.delete()` calls. Add a `try/catch` because the user might upload a corrupt JPEG and `cv.threshold` will throw. Now wrap every one of those `delete()` calls in `finally`. Add another operation. Realize you forgot to delete the new Mat. Wonder why memory grows in production but not in your test.

Same pipeline in `ppu-ocv`:

```ts
import { ImageProcessor } from "ppu-ocv";

await ImageProcessor.initRuntime();

const processor = new ImageProcessor(canvas);
processor
  .grayscale()
  .blur({ size: [5, 5] })
  .threshold();
const result = processor.toCanvas();
processor.destroy();
```

One `destroy()` at the end. The pipeline owns every intermediate Mat and frees them when you tear it down. If an operation throws midway, the next `destroy()` still walks the same list. Adding `.dilate()` next month does not introduce a new Mat for you to track.

The chainable API is the visible win. The memory contract is the load-bearing one.

## Type safety and operation order

Every operation is typed. Options have inferred shapes. The chain compiles only if your call sites match:

```ts
processor
  .grayscale() // no options
  .blur({ size: [5, 5] }) // tuple is required
  .threshold({ type: cv.THRESH_BINARY }) // OpenCV enum reused
  .canny({ low: 50, high: 150 });
```

Operation order matters with OpenCV. `cv.threshold` expects single-channel input. `canny` expects a smoothed gray image. The library does not reorder your steps for you, but the operations table in the README documents which step expects what, and the types push you toward correct compositions instead of letting you stack `dilate` on a color image and get garbage out.

For custom operations, the `registry.register(...)` hook lets you add a pipeline step from your app code without forking the library. The new operation gets the same Mat-lifecycle treatment as the built-ins.

## Four entry points: OpenCV is opt-in

![Four entry points](https://raw.githubusercontent.com/PT-Perkasa-Pilar-Utama/ppu-ocv/main/assets/article-entrypoints.png)

OpenCV.js is roughly 8 MB of WebAssembly. That is fine for a server, painful for a tab, and impossible for a Manifest V3 browser extension service worker, which caps script size and forbids `eval` paths used by some Emscripten builds. Plenty of real image jobs do not need OpenCV at all: crop a rectangle, resize to 360×640, threshold a binary image, draw a bounding box, save the result as a PNG. Canvas APIs handle that natively.

`ppu-ocv` exposes four entry points so you load OpenCV only when the workload needs it:

| Import path          | OpenCV | Canvas backend                   | Use case                          |
| -------------------- | ------ | -------------------------------- | --------------------------------- |
| `ppu-ocv`            | Yes    | `@napi-rs/canvas`                | Full pipeline, Node / Bun         |
| `ppu-ocv/web`        | Yes    | `HTMLCanvas` / `OffscreenCanvas` | Full pipeline, browser            |
| `ppu-ocv/canvas`     | No     | `@napi-rs/canvas`                | Edge runtimes, lean Node services |
| `ppu-ocv/canvas-web` | No     | `HTMLCanvas` / `OffscreenCanvas` | MV3 extensions, service workers   |

The `/canvas` and `/canvas-web` entries never import or initialize OpenCV. `CanvasProcessor` and `CanvasToolkit` cover resize, grayscale, threshold, invert, border, rotate, region detection (connected-components flood-fill), crop, and image I/O. On binary images the bounding boxes returned by `findRegions` match OpenCV's `findContours(RETR_EXTERNAL) + boundingRect` within 1 pixel, and full-pipeline IoU against OpenCV measured at **98.4%** across 21/21 boxes.

In practice that means a browser extension that scans receipts can ship under a few hundred KB instead of dragging 8 MB of WASM into every page load. A service worker that wants to crop and threshold an image before passing it to a recognition model can run with zero OpenCV initialization.

When you do need OpenCV (perspective warp, deskew, Canny edges, morphological gradient, contour analysis), swap the import path. The chainable API is the same.

## Powering the OCR stack

![Stack diagram](https://raw.githubusercontent.com/PT-Perkasa-Pilar-Utama/ppu-ocv/main/assets/article-stack.png)

`ppu-ocv` is the preprocessing engine underneath `ppu-paddle-ocr`. The detection step inside the OCR library calls `ppu-ocv` to normalize input images, resize to the model's expected dimensions, and crop detected text regions for the recognition pass. The OCR library exposes a `processing.engine` option that flips between `"opencv"` (uses `ImageProcessor` from `ppu-ocv`) and `"canvas-native"` (uses `CanvasProcessor` from `ppu-ocv/canvas-web`). Same author, same testing surface, no version-drift surprises.

Other workloads that ride the same pipeline:

- **Document scanners**: deskew via the bundled `DeskewService` (multi-method consensus: minAreaRect, baseline analysis, Hough transform). Then perspective warp via OpenCV.
- **Receipt pipelines**: grayscale plus adaptive threshold before OCR. The OCR step gets a clean binary image instead of a noisy JPEG.
- **PII redaction**: detect text regions, draw filled rectangles over them with `CanvasToolkit.drawLine` and friends, serialize the masked canvas back to a buffer.
- **Browser-extension capture tools**: crop the visible viewport, run a threshold to find tappable regions, return geometry to the content script. `canvas-web` entry, zero OpenCV.

The shape is always the same: instantiate a processor, chain operations, call `toCanvas()` or `toMat()`, call `destroy()`. Whether OpenCV is loaded depends only on which import path you used.

## A worked example: receipt preprocessing

```ts
import { CanvasProcessor, ImageProcessor } from "ppu-ocv";

const file = Bun.file("./receipt.jpg");
const buffer = await file.arrayBuffer();

await ImageProcessor.initRuntime();
const canvas = await CanvasProcessor.prepareCanvas(buffer);

const processor = new ImageProcessor(canvas);
processor
  .grayscale()
  .blur({ size: [5, 5] })
  .threshold()
  .invert()
  .dilate({ size: [20, 20], iter: 5 });

const cleaned = processor.toCanvas();
processor.destroy();

// hand cleaned canvas to ppu-paddle-ocr, or save it
const out = await CanvasProcessor.prepareBuffer(cleaned);
await Bun.write("./out/cleaned.png", out);
```

`initRuntime()` is the one-time cost. After that, every `new ImageProcessor(canvas)` is cheap. In Node / Bun the canvas backend is `@napi-rs/canvas`, which gives you a real `Canvas` object on the server side without a headless browser.

For the no-OpenCV path:

```ts
import { CanvasProcessor, CanvasToolkit } from "ppu-ocv/canvas";

const canvas = await CanvasProcessor.prepareCanvas(buffer);
const toolkit = CanvasToolkit.getInstance();

const cropped = toolkit.crop({
  canvas,
  bbox: { x0: 100, y0: 50, x1: 500, y1: 400 },
});

const binary = new CanvasProcessor(cropped).grayscale().threshold({ thresh: 127 }).toCanvas();

const regions = new CanvasProcessor(binary).findRegions({
  foreground: "light",
  minArea: 20,
});
```

Zero WASM downloaded. Zero `mat.delete()` calls. Runs in a service worker.

## What's next: React Native Canvas Skia

React Native is the next entry point. The plan is a `ppu-ocv/native` import that registers a custom `CanvasPlatform` adapter backed by [`@shopify/react-native-skia`](https://shopify.github.io/react-native-skia/). Skia exposes `SkImage` and `SkSurface` objects that map cleanly to the `CanvasLike` interface `ppu-ocv` already accepts, so the chainable API stays identical. The first cut targets the canvas-only path (no OpenCV on mobile), which is the right default for on-device receipt scanning and ID capture in a React Native shell.

After Skia:

- A worker-pool wrapper so multi-page document jobs fan out across cores without you wiring up `worker_threads`.
- More built-in operations on the canvas-native path so the OpenCV/no-OpenCV feature gap keeps shrinking.
- Streaming pipelines for video frames, with reusable Mat pools to amortize allocation across frames.

## Get started

```bash
npm install ppu-ocv
```

```ts
import { CanvasProcessor, ImageProcessor } from "ppu-ocv";

await ImageProcessor.initRuntime();
const canvas = await CanvasProcessor.prepareCanvas(buffer);

const out = new ImageProcessor(canvas).grayscale().threshold().toCanvas();

// remember the one delete() that replaces all the others:
// (the processor instance, not out)
```

Repo: <https://github.com/PT-Perkasa-Pilar-Utama/ppu-ocv>
npm: <https://www.npmjs.com/package/ppu-ocv>
JSR: <https://jsr.io/@snowfluke/ppu-ocv>

The OCR companion piece on `ppu-paddle-ocr` is here: [Deterministic OCR in JavaScript](https://dev.to/awalariansyah/deterministic-ocr-in-javascript-paddleocr-for-node-bun-deno-and-the-browser-2bgn).

If you have ever fought OpenCV.js memory in production, give the four-step pipeline above a try on your own sample, and open an issue if it leaks. The whole point of this library is that it should not.
