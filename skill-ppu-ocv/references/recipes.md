# `ppu-ocv` recipes

Copy-paste-ready patterns for the most common tasks. Each recipe names the entry point it assumes — swap to `/web`, `/canvas`, or `/canvas-web` to match the runtime.

## Recipe 1: OCR preprocess (binarize for text recognition)

Goal: take a photo of a document and produce a clean black-on-white binary image suitable for an OCR engine.

```ts
import { CanvasProcessor, ImageProcessor, cv } from "ppu-ocv";

await ImageProcessor.initRuntime();

const canvas = await CanvasProcessor.prepareCanvas(buffer);
const processor = new ImageProcessor(canvas);

try {
  const binarized = processor
    .grayscale()
    .blur({ size: [3, 3] })
    .adaptiveThreshold({
      method: cv.ADAPTIVE_THRESH_GAUSSIAN_C,
      type: cv.THRESH_BINARY,
      size: 15, // ≈ stroke width × 3 — tune for your input
      constant: 4,
    })
    .toCanvas();

  // pass binarized to your OCR engine
} finally {
  processor.destroy();
}
```

If the document is back-lit or unevenly exposed, `adaptiveThreshold` beats global `threshold` reliably. Tune `size` to roughly 3× the stroke width of your typical text.

## Recipe 2: Find and warp a document quadrilateral

Goal: locate the four corners of a receipt/page in a photo and flatten it.

```ts
import { CanvasProcessor, CanvasToolkit, Contours, ImageProcessor, cv } from "ppu-ocv";

await ImageProcessor.initRuntime();

const canvas = await CanvasProcessor.prepareCanvas(buffer);
const processor = new ImageProcessor(canvas);

try {
  const edges = processor
    .grayscale()
    .blur({ size: [5, 5] })
    .canny({ lower: 75, upper: 200 })
    .dilate({ size: [3, 3], iter: 2 })
    .toMat();

  const contours = new Contours(edges, {
    mode: cv.RETR_EXTERNAL,
    method: cv.CHAIN_APPROX_SIMPLE,
  });

  try {
    const approx = contours.getApproximateRectangleContour({ threshold: 0.02 });
    if (!approx || approx.rows !== 4) {
      // fall back: use the whole image bbox
    }

    const { points, bbox } = contours.getCornerPoints({ canvas });
    const flattened = processor.warp({ points, bbox }).toCanvas();

    await CanvasToolkit.getInstance().saveImage({
      canvas: flattened,
      filename: "flattened",
      path: "out",
    });
  } finally {
    contours.destroy();
  }
} finally {
  processor.destroy();
}
```

`getApproximateRectangleContour` returns a 4-point approximation when the dominant contour is rectangle-ish. If it doesn't, `getCornerPoints` still returns something usable by falling back to the largest contour's `minAreaRect`.

## Recipe 3: Deskew before OCR

Goal: rotate a scanned page so text lines are horizontal.

```ts
import { CanvasProcessor, DeskewService, ImageProcessor } from "ppu-ocv";

await ImageProcessor.initRuntime();

const canvas = await CanvasProcessor.prepareCanvas(buffer);
const service = new DeskewService({ minimumAreaThreshold: 30 });

const straightened = await service.deskewImage(canvas);
// hand straightened to the OCR engine
```

If you want manual control over the rotation step (e.g., to chain with other ops):

```ts
const angle = await service.calculateSkewAngle(canvas);
const processor = new ImageProcessor(canvas);
try {
  const rotated = processor.rotate({ angle }).toCanvas();
} finally {
  processor.destroy();
}
```

Pre-binarize the input if it's a raw photo — `DeskewService` assumes a probability/binary map of text regions.

## Recipe 4: Detect text-line bounding boxes without OpenCV

Goal: in a Chrome Manifest V3 service worker (no OpenCV), find text-line bboxes on a screenshot.

```ts
import { CanvasProcessor } from "ppu-ocv/canvas-web";

const canvas = await CanvasProcessor.prepareCanvas(buffer);

// Step 1: produce a binary canvas (text = white)
const binary = new CanvasProcessor(canvas)
  .resize({ width: 720, height: 1280 })
  .grayscale()
  .threshold({ thresh: 127 })
  .invert()
  .toCanvas();

// Step 2: flood-fill connected components
const regions = new CanvasProcessor(binary).findRegions({
  foreground: "light",
  thresh: 0, // resized binary — include anti-aliased border pixels
  minArea: 30,
  padding: { vertical: 0.4, horizontal: 0.6 },
  scale: canvas.width / 720, // map bboxes back to original coords
});

regions.sort((a, b) => b.area - a.area);
// regions[0] is the largest text blob; iterate to crop each
```

This runs without `new Function`, so it works under MV3 CSP. The IoU vs an OpenCV `findContours` pipeline on the same input is ~98%.

## Recipe 5: Quick "is the scan too dark?" gate

Goal: refuse low-quality captures upstream.

```ts
import { calculateMeanNormalizedLabLightness, ImageProcessor } from "ppu-ocv";

await ImageProcessor.initRuntime();

const meanL = calculateMeanNormalizedLabLightness({
  canvas,
  dimension: { width: 256, height: 256 },
});

if (meanL < 0.35) {
  return { ok: false, reason: "image too dark — re-capture" };
}
```

`meanL` is in `[0, 1]` after normalization against the image's own maximum L. Empirically, well-lit documents land around `0.45–0.75`.

## Recipe 6: Custom operation registration with full type safety

Goal: add a `topHat` morphology op to the pipeline.

```ts
import { registry, type OperationResult, cv } from "ppu-ocv";

interface TopHatOptions {
  size: [number, number];
}

declare module "ppu-ocv" {
  interface RegisteredOperations {
    topHat: TopHatOptions;
  }
}

registry.register(
  "topHat",
  (img: cv.Mat, options: TopHatOptions): OperationResult => {
    const kernel = cv.getStructuringElement(
      cv.MORPH_RECT,
      new cv.Size(options.size[0], options.size[1])
    );
    const out = new cv.Mat();
    cv.morphologyEx(img, out, cv.MORPH_TOPHAT, kernel);
    kernel.delete();
    img.delete();
    return { img: out, width: out.cols, height: out.rows };
  },
  () => ({ size: [15, 15] })
);

// Now fully typed:
processor.execute("topHat", { size: [21, 21] });
```

Three rules for a well-behaved custom op:

1. **Delete the input Mat** at the end — the pipeline counts on this.
2. **Delete any intermediate Mats / kernels** you allocate yourself.
3. **Return `{ img, width, height }`** — the pipeline reads `width`/`height` from your result to keep `processor.width`/`height` in sync.

## Recipe 7: Saving every step for debugging

When debugging a pipeline, dump each intermediate canvas:

```ts
import { CanvasProcessor, CanvasToolkit, ImageProcessor } from "ppu-ocv";

await ImageProcessor.initRuntime();
const toolkit = CanvasToolkit.getInstance();
toolkit.clearOutput(); // wipe ./out from the previous run

const canvas = await CanvasProcessor.prepareCanvas(buffer);
const processor = new ImageProcessor(canvas);

try {
  await toolkit.saveImage({ canvas: processor.toCanvas(), filename: "0-input", path: "out" });

  processor.grayscale();
  await toolkit.saveImage({ canvas: processor.toCanvas(), filename: "1-gray", path: "out" });

  processor.blur();
  await toolkit.saveImage({ canvas: processor.toCanvas(), filename: "2-blur", path: "out" });

  processor.threshold();
  await toolkit.saveImage({ canvas: processor.toCanvas(), filename: "3-threshold", path: "out" });
} finally {
  processor.destroy();
}
```

`saveImage` auto-prefixes each filename with a monotonic step counter, so the files sort naturally in your file manager. Node-only — won't work from `ppu-ocv/web` or `ppu-ocv/canvas-web`.
