import { afterAll, beforeAll, expect, test } from "bun:test";
import { existsSync, readdirSync, rmdirSync, unlinkSync } from "fs";
import { join } from "path";
import { CanvasToolkit, createCanvas, cv, ImageProcessor } from "../src/index";

const outDir = "test-out";

beforeAll(async () => {
  await ImageProcessor.initRuntime();
});

afterAll(() => {
  if (existsSync(join(process.cwd(), outDir))) {
    const files = readdirSync(join(process.cwd(), outDir));

    for (const file of files) {
      unlinkSync(join(process.cwd(), outDir, file));
    }
    rmdirSync(join(process.cwd(), outDir));
  }
});

test("crop returns correct sub-canvas", () => {
  const canvas = createCanvas(10, 10);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "red";
  ctx.fillRect(2, 3, 4, 5);

  const toolkit = CanvasToolkit.getInstance();
  const cropped = toolkit.crop({
    bbox: { x0: 2, y0: 3, x1: 6, y1: 8 },
    canvas,
  });

  expect(cropped.width).toBe(4);
  expect(cropped.height).toBe(5);

  const data = cropped.getContext("2d").getImageData(0, 0, 4, 5).data;

  expect(data[0]).toBe(255);
  expect(data[1]).toBe(0);
  expect(data[2]).toBe(0);
});

test("isDirty returns false for uniform canvas and true for checkerboard", () => {
  const size = 10;
  const canvas1 = createCanvas(size, size);
  const ctx1 = canvas1.getContext("2d");

  ctx1.fillStyle = "white";
  ctx1.fillRect(0, 0, size, size);

  const toolkit = CanvasToolkit.getInstance();
  expect(toolkit.isDirty({ canvas: canvas1 })).toBe(false);

  const canvas2 = createCanvas(10, 10);
  const ctx2 = canvas2.getContext("2d");

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      ctx2.fillStyle = (x + y) % 2 === 0 ? "black" : "white";
      ctx2.fillRect(x, y, 1, 1);
    }
  }

  expect(toolkit.isDirty({ canvas: canvas2 })).toBe(true);
});

test("saveImage and clearOutput manage files correctly", async () => {
  const canvas = createCanvas(4, 4);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "green";
  ctx.fillRect(0, 0, 4, 4);

  const toolkit = CanvasToolkit.getInstance();

  await toolkit.saveImage({
    canvas,
    filename: "first",
    path: outDir,
  });

  await toolkit.saveImage({
    canvas,
    filename: "second",
    path: outDir,
  });

  const files = readdirSync(join(process.cwd(), outDir));

  expect(files).toContain("3. first.png");
  expect(files).toContain("4. second.png");

  toolkit.clearOutput(outDir);
  const afterClear = readdirSync(join(process.cwd(), outDir));

  expect(afterClear).toEqual([]);
});

test("drawLine draws a rectangle stroke on canvas", () => {
  const canvas = createCanvas(10, 10);
  const ctx = canvas.getContext("2d");
  const toolkit = CanvasToolkit.getInstance();

  toolkit.drawLine({
    ctx,
    x: 1,
    y: 1,
    width: 8,
    height: 6,
    lineWidth: 2,
    color: "blue",
  });

  const data = ctx.getImageData(1, 1, 8, 6).data;
  let hasNonBackground = false;

  for (let i = 0; i < data.length; i += 4) {
    if (!(data[i] === 0 && data[i + 1] === 0 && data[i + 2] === 0)) {
      hasNonBackground = true;
      break;
    }
  }

  expect(hasNonBackground).toBe(true);
});

test("drawContour draws given contour", () => {
  const pts = new Int32Array([0, 0, 5, 0, 5, 5, 0, 5]);
  const contour = cv.matFromArray(4, 1, cv.CV_32SC2, pts);
  const canvas = createCanvas(6, 6);

  const ctx = canvas.getContext("2d");
  const toolkit = CanvasToolkit.getInstance();

  toolkit.drawContour({ ctx, contour, strokeStyle: "red", lineWidth: 1 });

  const data = ctx.getImageData(0, 0, 6, 6).data;
  let hasRed = false;

  for (let i = 0; i < data.length; i += 4) {
    if (data[i] === 255 && data[i + 1] === 0 && data[i + 2] === 0) {
      hasRed = true;
      break;
    }
  }

  contour.delete();
  expect(hasRed).toBe(true);
});
