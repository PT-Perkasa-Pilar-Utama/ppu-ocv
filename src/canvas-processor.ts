import type { BoundingBox } from "./index.interface.js";
import type { CanvasLike } from "./canvas-factory.js";
import { getPlatform } from "./canvas-factory.js";

/**
 * A detected region returned by {@link CanvasProcessor.findRegions}.
 */
export interface DetectedRegion {
  /** Axis-aligned bounding box of the region (x1/y1 are exclusive). */
  bbox: BoundingBox;
  /** Number of foreground pixels in the region. */
  area: number;
}

/**
 * Canvas-native image processing with no OpenCV dependency.
 *
 * Provides two distinct APIs:
 * - **Static I/O** (`prepareCanvas`, `prepareBuffer`) — format conversion helpers.
 * - **Chainable instance operations** (`resize`, `grayscale`, `convert`) — lightweight
 *   canvas-native pipeline, usable in constrained environments where OpenCV cannot run.
 *
 * @example
 * ```ts
 * import { CanvasProcessor } from "ppu-ocv/canvas";
 *
 * const canvas = await CanvasProcessor.prepareCanvas(arrayBuffer);
 *
 * const result = new CanvasProcessor(canvas)
 *   .resize({ width: 800, height: 600 })
 *   .grayscale()
 *   .convert({ alpha: 1.2, beta: -10 })
 *   .toCanvas();
 * ```
 */
export class CanvasProcessor {
  private _canvas: CanvasLike;

  constructor(source: CanvasLike) {
    this._canvas = source;
  }

  get width(): number {
    return this._canvas.width;
  }

  get height(): number {
    return this._canvas.height;
  }

  /**
   * Scale the canvas to new dimensions.
   * Uses the platform's native drawImage interpolation (bilinear in most runtimes).
   */
  resize(options: { width: number; height: number }): this {
    const { width, height } = options;
    const dst = getPlatform().createCanvas(width, height);
    dst.getContext("2d").drawImage(this._canvas, 0, 0, width, height);
    this._canvas = dst;
    return this;
  }

  /**
   * Convert to grayscale using BT.601 luma coefficients
   * (matches OpenCV's COLOR_RGBA2GRAY: 0.299R + 0.587G + 0.114B).
   *
   * The result is still RGBA — R, G, and B channels all equal the luma value.
   * The alpha channel is preserved unchanged.
   */
  grayscale(): this {
    const { width, height } = this._canvas;
    const imageData = this._canvas
      .getContext("2d")
      .getImageData(0, 0, width, height);
    const d = imageData.data;

    for (let i = 0; i < d.length; i += 4) {
      const luma = Math.round(
        0.299 * d[i]! + 0.587 * d[i + 1]! + 0.114 * d[i + 2]!,
      );
      d[i] = luma;
      d[i + 1] = luma;
      d[i + 2] = luma;
      // d[i + 3]: alpha unchanged
    }

    const dst = getPlatform().createCanvas(width, height);
    dst.getContext("2d").putImageData(imageData, 0, 0);
    this._canvas = dst;
    return this;
  }

  /**
   * Apply a linear per-pixel transformation: `dst = clamp(alpha * src + beta)`.
   * Applies independently to R, G, and B channels; alpha channel is unchanged.
   *
   * This is the canvas-native equivalent of OpenCV's `Mat.convertTo(dst, rtype, alpha, beta)`,
   * limited to the pixel-math aspect. `rtype` is not applicable here — canvas ImageData
   * is always 8-bit RGBA (`Uint8ClampedArray`), so type conversion has no meaning.
   *
   * Useful for brightness/contrast adjustment:
   * - `alpha > 1` increases contrast
   * - `beta > 0` increases brightness
   * - `alpha = 0.5, beta = 0` halves contrast
   */
  convert(options: { alpha?: number; beta?: number } = {}): this {
    const { alpha = 1, beta = 0 } = options;
    if (alpha === 1 && beta === 0) return this;

    const { width, height } = this._canvas;
    const imageData = this._canvas
      .getContext("2d")
      .getImageData(0, 0, width, height);
    const d = imageData.data;

    for (let i = 0; i < d.length; i += 4) {
      d[i] = Math.round(d[i]! * alpha + beta);
      d[i + 1] = Math.round(d[i + 1]! * alpha + beta);
      d[i + 2] = Math.round(d[i + 2]! * alpha + beta);
      // d[i + 3]: alpha channel unchanged
      // Uint8ClampedArray automatically clamps to [0, 255]
    }

    const dst = getPlatform().createCanvas(width, height);
    dst.getContext("2d").putImageData(imageData, 0, 0);
    this._canvas = dst;
    return this;
  }

  /**
   * Invert all RGB channels: `dst = 255 - src`.
   * Alpha channel is preserved unchanged.
   * Equivalent to OpenCV's `cv.bitwise_not`.
   */
  invert(): this {
    const { width, height } = this._canvas;
    const imageData = this._canvas
      .getContext("2d")
      .getImageData(0, 0, width, height);
    const d = imageData.data;

    for (let i = 0; i < d.length; i += 4) {
      d[i] = 255 - d[i]!;
      d[i + 1] = 255 - d[i + 1]!;
      d[i + 2] = 255 - d[i + 2]!;
      // d[i + 3]: alpha unchanged
    }

    const dst = getPlatform().createCanvas(width, height);
    dst.getContext("2d").putImageData(imageData, 0, 0);
    this._canvas = dst;
    return this;
  }

  /**
   * Apply binary threshold: pixels with luma above `thresh` become `maxValue`,
   * all others become 0.
   *
   * Equivalent to OpenCV's `cv.threshold(src, dst, thresh, maxval, THRESH_BINARY)`.
   * Operates on the luma of each pixel (R channel is used directly when the
   * image is already grayscale, i.e. R === G === B).
   *
   * Note: Otsu's automatic threshold (`THRESH_OTSU`) is not supported
   * canvas-natively — use a fixed `thresh` value instead.
   */
  threshold(options: { thresh?: number; maxValue?: number } = {}): this {
    const { thresh = 127, maxValue = 255 } = options;
    const { width, height } = this._canvas;
    const imageData = this._canvas
      .getContext("2d")
      .getImageData(0, 0, width, height);
    const d = imageData.data;

    for (let i = 0; i < d.length; i += 4) {
      const luma =
        d[i] === d[i + 1] && d[i + 1] === d[i + 2]
          ? d[i]!
          : Math.round(0.299 * d[i]! + 0.587 * d[i + 1]! + 0.114 * d[i + 2]!);
      const val = luma > thresh ? maxValue : 0;
      d[i] = val;
      d[i + 1] = val;
      d[i + 2] = val;
      // d[i + 3]: alpha unchanged
    }

    const dst = getPlatform().createCanvas(width, height);
    dst.getContext("2d").putImageData(imageData, 0, 0);
    this._canvas = dst;
    return this;
  }

  /**
   * Add a uniform border around the canvas.
   * Equivalent to OpenCV's `cv.copyMakeBorder` with `BORDER_CONSTANT`.
   *
   * @param options.size Border width in pixels (default 10)
   * @param options.color CSS color string for the border fill (default "white")
   */
  border(options: { size?: number; color?: string } = {}): this {
    const { size = 10, color = "white" } = options;
    const { width, height } = this._canvas;

    const dst = getPlatform().createCanvas(width + size * 2, height + size * 2);
    const ctx = dst.getContext("2d");

    ctx.fillStyle = color;
    ctx.fillRect(0, 0, dst.width, dst.height);
    ctx.drawImage(this._canvas, size, size);

    this._canvas = dst;
    return this;
  }

  /**
   * Rotate the canvas around its centre (or a custom pivot) while keeping the
   * original canvas dimensions. Pixels that fall outside the bounds after
   * rotation are clipped (transparent).
   *
   * Positive `angle` rotates counter-clockwise, matching the convention used
   * by OpenCV's `getRotationMatrix2D`.
   *
   * @param options.angle Rotation angle in degrees
   * @param options.cx    Pivot X (default: canvas centre)
   * @param options.cy    Pivot Y (default: canvas centre)
   */
  rotate(options: { angle: number; cx?: number; cy?: number }): this {
    const {
      angle,
      cx = this._canvas.width / 2,
      cy = this._canvas.height / 2,
    } = options;
    if (angle === 0) return this;

    const { width, height } = this._canvas;
    const dst = getPlatform().createCanvas(width, height);
    const ctx = dst.getContext("2d");

    // OpenCV rotates CCW for positive angles in image coords (Y-down).
    // canvas ctx.rotate is CW for positive values, so we negate.
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((-angle * Math.PI) / 180);
    ctx.drawImage(this._canvas, -cx, -cy);
    ctx.restore();

    this._canvas = dst;
    return this;
  }

  /**
   * Detect connected regions on a binary (black-and-white) canvas and return
   * their bounding boxes and pixel areas.
   *
   * Uses an 8-connected DFS flood-fill — equivalent to OpenCV's
   * `findContours` with `RETR_LIST + CHAIN_APPROX_SIMPLE` on a binary image,
   * returning bounding-box level information.
   *
   * Best called after `.grayscale().threshold()` to ensure a clean binary input.
   *
   * @param options.foreground  Which pixel tone is the foreground to detect:
   *                            `"light"` (white regions, default) or `"dark"` (black regions).
   * @param options.minArea     Ignore regions smaller than this many pixels (default 1).
   * @param options.maxArea     Ignore regions larger than this many pixels (default unlimited).
   * @param options.padding     Expand each detected bbox by a fraction of its **height**.
   *                            Mirrors `extractBoxesFromContours` padding logic:
   *                            `vertical` and `horizontal` are both applied as
   *                            `Math.round(bboxHeight × factor)` and clamped to the canvas bounds.
   *                            Default: no padding.
   * @param options.scale       Multiply all bbox coordinates by this factor after padding.
   *                            Use `originalWidth / processedWidth` (i.e. `1 / resizeRatio`)
   *                            to convert from a resized canvas back to original image coordinates.
   *                            Default: 1 (no scaling).
   *
   * @example
   * ```ts
   * // Direct equivalent of extractBoxesFromContours with default padding:
   * const regions = new CanvasProcessor(binaryCanvas).findRegions({
   *   foreground: "light",
   *   minArea: 20,
   *   padding: { vertical: 0.4, horizontal: 0.6 },
   *   scale: originalWidth / processedWidth,
   * });
   * ```
   */
  findRegions(
    options: {
      foreground?: "light" | "dark";
      minArea?: number;
      maxArea?: number;
      padding?: { vertical?: number; horizontal?: number };
      scale?: number;
    } = {},
  ): DetectedRegion[] {
    const {
      foreground = "light",
      minArea = 1,
      maxArea = Infinity,
      padding,
      scale = 1,
    } = options;

    const { width, height } = this._canvas;
    const data = this._canvas
      .getContext("2d")
      .getImageData(0, 0, width, height).data;

    // visited[y * width + x] = 1 once a pixel has been assigned to a region
    const visited = new Uint8Array(width * height);
    const regions: DetectedRegion[] = [];

    // 8-connected neighbour offsets: [dx, dy]
    const neighbours = [
      [-1, -1],
      [0, -1],
      [1, -1],
      [-1, 0],
      [1, 0],
      [-1, 1],
      [0, 1],
      [1, 1],
    ] as const;

    const isForeground = (pixelIdx: number): boolean => {
      const r = data[pixelIdx]!;
      return foreground === "light" ? r > 127 : r <= 127;
    };

    for (let startY = 0; startY < height; startY++) {
      for (let startX = 0; startX < width; startX++) {
        const startFlat = startY * width + startX;
        if (visited[startFlat]) continue;
        visited[startFlat] = 1;

        if (!isForeground(startFlat * 4)) continue;

        // DFS stack — stores flat index
        const stack: number[] = [startFlat];
        let minX = startX,
          maxX = startX;
        let minY = startY,
          maxY = startY;
        let area = 0;

        while (stack.length > 0) {
          const flat = stack.pop()!;
          area++;

          const x = flat % width;
          const y = (flat - x) / width;

          if (x < minX) minX = x;
          else if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          else if (y > maxY) maxY = y;

          for (const [dx, dy] of neighbours) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
            const nFlat = ny * width + nx;
            if (visited[nFlat]) continue;
            visited[nFlat] = 1;
            if (isForeground(nFlat * 4)) stack.push(nFlat);
          }
        }

        if (area >= minArea && area <= maxArea) {
          let x0 = minX;
          let y0 = minY;
          let x1 = maxX + 1;
          let y1 = maxY + 1;

          // Apply padding relative to bbox height (mirrors extractBoxesFromContours)
          if (padding) {
            const bboxH = y1 - y0;
            const vPad = Math.round(bboxH * (padding.vertical ?? 0));
            const hPad = Math.round(bboxH * (padding.horizontal ?? 0));
            x0 = Math.max(0, x0 - hPad);
            y0 = Math.max(0, y0 - vPad);
            x1 = Math.min(width, x1 + hPad);
            y1 = Math.min(height, y1 + vPad);
          }

          // Scale coordinates (e.g. processed → original image space)
          if (scale !== 1) {
            x0 = Math.max(0, Math.round(x0 * scale));
            y0 = Math.max(0, Math.round(y0 * scale));
            x1 = Math.round(x1 * scale);
            y1 = Math.round(y1 * scale);
          }

          regions.push({ bbox: { x0, y0, x1, y1 }, area });
        }
      }
    }

    return regions;
  }

  /**
   * Return the current canvas state.
   */
  toCanvas(): CanvasLike {
    return this._canvas;
  }

  // -------------------------------------------------------------------------
  // Static I/O helpers
  // -------------------------------------------------------------------------

  /**
   * Convert an ArrayBuffer (image file bytes) to a CanvasLike.
   * If the value is already a CanvasLike it is returned as-is.
   */
  static async prepareCanvas(file: ArrayBuffer): Promise<CanvasLike> {
    if (getPlatform().isCanvas(file)) return file as unknown as CanvasLike;

    return getPlatform().loadImage(file);
  }

  /**
   * Convert a CanvasLike to an ArrayBuffer (PNG bytes).
   * If the value is already an ArrayBuffer it is returned as-is.
   */
  static async prepareBuffer(canvas: CanvasLike): Promise<ArrayBuffer> {
    if (canvas instanceof ArrayBuffer) return canvas;

    if (typeof canvas.toBuffer === "function") {
      const buffer = canvas.toBuffer("image/png");
      const arrayBuffer = new ArrayBuffer(buffer.byteLength);

      new Uint8Array(arrayBuffer).set(new Uint8Array(buffer));
      return arrayBuffer;
    }

    if (typeof canvas.toDataURL === "function") {
      const dataURL = canvas.toDataURL("image/png");
      const base64Data = dataURL.replace(/^data:image\/png;base64,/, "");

      const binaryString = atob(base64Data);
      const arrayBuffer = new ArrayBuffer(binaryString.length);
      const bytes = new Uint8Array(arrayBuffer);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return arrayBuffer;
    }

    const ctx = canvas.getContext("2d");
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let canvasBuffer = new ArrayBuffer(imageData.data.byteLength);

    new Uint8Array(canvasBuffer).set(
      new Uint8Array(
        imageData.data.buffer,
        imageData.data.byteOffset,
        imageData.data.byteLength,
      ),
    );

    return canvasBuffer;
  }
}
