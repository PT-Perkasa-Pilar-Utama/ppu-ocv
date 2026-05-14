# Built-in pipeline operations

Every operation below is a method on `ImageProcessor` (from `ppu-ocv` / `ppu-ocv/web`). They are also reachable via `processor.execute("<name>", options)` with full TS inference.

Each operation takes the current `cv.Mat`, returns a new `OperationResult` (`{ img, width, height }`), and **deletes the input Mat**. The chainable methods on `ImageProcessor` handle that for you — only worry about Mat lifecycle if you call `executeOperation` directly.

## Order of operations (predecessor rules)

| Operation                 | Run after…                                  | Why                                                             |
| ------------------------- | ------------------------------------------- | --------------------------------------------------------------- |
| `grayscale`               | –                                           | Converts to single channel; most binary/edge ops expect gray.   |
| `blur`                    | _(ideally after)_ `grayscale`               | Noise reduction works best on 1-channel data.                   |
| `threshold`               | _(after)_ `grayscale`                       | Produces a binary image; needs gray levels.                     |
| `adaptiveThreshold`       | _(after)_ `grayscale` (and optionally blur) | Local thresholding on gray values.                              |
| `invert`                  | _(after)_ `threshold` / `adaptiveThreshold` | Inverts a binary mask.                                          |
| `canny`                   | _(after)_ `grayscale` + `blur`              | Edge detection expects smoothed gray.                           |
| `dilate`                  | _(after)_ binary / edge                     | Expands foreground regions.                                     |
| `erode`                   | _(after)_ binary / edge                     | Shrinks / cleans up binary regions.                             |
| `morphologicalGradient`   | _(after)_ binary                            | Highlights boundaries (dilation minus erosion).                 |
| `warp`, `resize`, `border`, `rotate` | – (geometric, position-independent) | Can be applied any time.                                        |
| `convert`                 | – (Mat-type cast)                           | Changes depth/channels; rarely needed outside custom ops.       |

## Options reference

### `grayscale()`

No options. Calls `cv.cvtColor(img, dst, cv.COLOR_RGBA2GRAY)`. Result is single-channel.

```ts
processor.grayscale();
```

### `blur({ size?, sigma? })`

`cv.GaussianBlur`. Defaults: `size: [5, 5]`, `sigma: 0` (OpenCV computes σ from kernel size).

```ts
processor.blur({ size: [7, 7], sigma: 1.4 });
```

### `threshold({ lower?, upper?, type? })`

`cv.threshold`. Defaults: `lower: 0`, `upper: 255`, `type: cv.THRESH_BINARY_INV + cv.THRESH_OTSU` (Otsu auto-pick + inverted mask — text becomes white, background black).

```ts
processor.threshold({
  lower: 0,
  upper: 255,
  type: cv.THRESH_BINARY + cv.THRESH_OTSU, // dark text on light background
});
```

### `adaptiveThreshold({ upper?, method?, type?, size?, constant? })`

`cv.adaptiveThreshold`. Defaults: `upper: 255`, `method: cv.ADAPTIVE_THRESH_GAUSSIAN_C`, `type: cv.THRESH_BINARY_INV`, `size: 7`, `constant: 2`.

`size` must be odd. Larger `size` smooths over wider neighbourhoods; smaller picks up fine detail and noise.

```ts
processor.adaptiveThreshold({ size: 15, constant: 4 });
```

### `invert()`

`cv.bitwise_not`. No options. Use after a binary threshold to flip foreground/background.

### `canny({ lower?, upper? })`

`cv.Canny`. Defaults: `lower: 50`, `upper: 150`. The ratio `upper / lower` between 2:1 and 3:1 is the conventional range.

```ts
processor.canny({ lower: 80, upper: 200 });
```

### `dilate({ size?, iter? })`

`cv.dilate` with a rectangular structuring element. Defaults: `size: [5, 5]`, `iter: 1`.

```ts
processor.dilate({ size: [20, 20], iter: 5 }); // aggressive — connects nearby text into blobs
```

### `erode({ size?, iter? })`

`cv.erode` with a rectangular structuring element. Defaults: `size: [5, 5]`, `iter: 1`.

### `morphologicalGradient({ size? })`

`cv.morphologyEx` with `MORPH_GRADIENT`. Default `size: [3, 3]`. Highlights edges as the boundary between dilation and erosion.

### `resize({ width, height })` — required

`cv.resize` with `INTER_LINEAR`. Both fields are required; passing `0` for either throws.

```ts
processor.resize({ width: 720, height: 1280 });
```

### `rotate({ angle, center? })` — required

`cv.getRotationMatrix2D` + `cv.warpAffine`. `angle` in degrees, positive counter-clockwise. `center` defaults to the image centre.

```ts
processor.rotate({ angle: -3.7 });
```

### `border({ size?, borderType?, borderColor? })`

`cv.copyMakeBorder`. Defaults: `size: 10`, `borderType: cv.BORDER_CONSTANT`, `borderColor: [255, 255, 255, 255]` (white, BGRA).

```ts
processor.border({ size: 20, borderColor: [0, 0, 0, 255] }); // 20-px black border
```

### `warp({ points, bbox })` — required

`cv.getPerspectiveTransform` + `cv.warpPerspective`. `points` is a `{ topLeft, topRight, bottomLeft, bottomRight }` object — pass `Contours.getCornerPoints({ canvas }).points` directly. `bbox` defines the destination rectangle size; pass the matching `bbox` returned by `getCornerPoints`.

```ts
const { points, bbox } = contours.getCornerPoints({ canvas });
processor.warp({ points, bbox });
```

### `convert({ rtype })` — required

`Mat.convertTo`. `rtype` is an OpenCV CV_* constant (e.g. `cv.CV_8UC1`). Negative means "same as input". Rarely needed outside custom operations.

## Canvas-native operations (on `CanvasProcessor`)

`CanvasProcessor` has its own chainable pipeline that requires no OpenCV. Fidelity vs the OpenCV equivalent is noted.

| Method      | Options                                | OpenCV equivalent        | Fidelity                                                   |
| ----------- | -------------------------------------- | ------------------------ | ---------------------------------------------------------- |
| `resize`    | `{ width, height }`                    | `cv.resize` INTER_LINEAR | 1:1 downscale, ≈ on upscale (anti-aliased)                 |
| `grayscale` | —                                      | `COLOR_RGBA2GRAY`        | 1:1 (BT.601 luma; alpha preserved)                         |
| `convert`   | `{ alpha?, beta? }`                    | `Mat.convertTo`          | 1:1 on RGB; alpha untouched                                |
| `invert`    | —                                      | `cv.bitwise_not`         | 1:1 on opaque images (canvas leaves alpha intact)          |
| `threshold` | `{ thresh? = 127, maxValue? = 255 }`   | `THRESH_BINARY`          | 1:1 (no Otsu support — pass a fixed `thresh`)              |
| `border`    | `{ size? = 10, color? = "white" }`     | `BORDER_CONSTANT`        | 1:1; color is a CSS string, not a `[B, G, R, A]` array     |
| `rotate`    | `{ angle, cx?, cy? }`                  | `warpAffine`             | ≈ (≤6 px difference at 15°; visually indistinguishable)    |
| `toCanvas`  | —                                      | —                        | Returns the underlying `CanvasLike`.                       |

Plus the data-returning op:

### `findRegions({ foreground?, thresh?, minArea?, maxArea?, padding?, scale? })`

8-connected DFS flood-fill on a binary canvas. Returns `DetectedRegion[]` where each region is `{ bbox: { x0, y0, x1, y1 }, area }`.

Key options:

- `foreground: "light" | "dark"` — defaults to `"light"`. Decides which side of `thresh` counts as foreground.
- `thresh: number` — defaults to `127`. **Use `thresh: 0` on a resized binary image** so anti-aliased gray border pixels (values 1–127) are still treated as foreground. Matches OpenCV's `findContours` semantics.
- `minArea`, `maxArea` — filter out regions outside this pixel-count range.
- `padding: { vertical?, horizontal? }` — expand each bbox by `Math.round(bboxHeight × factor)` on the named axes. Mirrors the padding pattern used by `extractBoxesFromContours` in document OCR pipelines.
- `scale: number` — multiply all bbox coordinates by this factor *after* padding. Use `originalWidth / processedWidth` (i.e. `1 / resizeRatio`) to map back from a resized canvas into the original image's coordinate space.

Equivalent at the bbox level to `cv.findContours(RETR_EXTERNAL) + boundingRect`. With `thresh: 0` + matching `padding` + `scale`, end-to-end IoU vs OpenCV is ~98.4% on receipt-style inputs.

## Static I/O helpers

Both live on `CanvasProcessor` and are available from every entry point:

| Method                                  | Signature                                              | Use when…                                                              |
| --------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------- |
| `CanvasProcessor.prepareCanvas(buffer)` | `(ArrayBuffer) => Promise<CanvasLike>`                 | You have image file bytes and need a canvas to feed the pipeline.      |
| `CanvasProcessor.prepareBuffer(canvas)` | `(CanvasLike) => Promise<ArrayBuffer>` (PNG-encoded)   | You finished the pipeline and need to ship the result somewhere.       |

Both are async because the underlying platform `loadImage` / `toBuffer` calls may be async, depending on runtime.
