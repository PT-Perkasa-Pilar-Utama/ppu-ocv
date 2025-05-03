import { beforeAll, expect, test } from "bun:test";
import { Contours, createCanvas, cv, ImageProcessor } from "../src/index";

beforeAll(async () => {
  await ImageProcessor.initRuntime();
});

test("Contours finds one contour for a drawn rectangle", () => {
  const mat = new cv.Mat(10, 10, cv.CV_8UC1);
  mat.setTo(new cv.Scalar(0));
  cv.rectangle(mat, { x: 2, y: 2 }, { x: 7, y: 5 }, new cv.Scalar(255), -1);

  const contours = new Contours(mat);
  const all = contours.getAll();

  expect(all.size()).toBe(1);

  const c0 = contours.getFromIndex(0);
  expect(cv.contourArea(c0)).toBeGreaterThan(0);

  const empty = contours.getFromIndex(5);
  expect(empty.rows).toBe(0);

  const rect = contours.getRect(c0);
  expect(rect.x).toBe(2);
  expect(rect.y).toBe(2);
  expect(rect.width).toBe(6);
  expect(rect.height).toBe(4);

  let count = 0;
  contours.iterate(() => count++);

  expect(count).toBe(1);

  const largest = contours.getLargestContourArea();
  expect(largest).toBeInstanceOf(cv.Mat);

  contours.destroy();
});

test("getCornerPoints returns full canvas corners when no contours", () => {
  const mat = new cv.Mat(8, 6, cv.CV_8UC1);
  mat.setTo(new cv.Scalar(0));

  const contours = new Contours(mat);
  expect(contours.getAll().size()).toBe(0);

  const canvas = createCanvas(6, 8);
  const result = contours.getCornerPoints({ canvas });

  expect(result.bbox).toEqual({ x0: 0, y0: 0, x1: 6, y1: 8 });
  expect(result.points.topLeft).toEqual({ x: 0, y: 0 });
  expect(result.points.topRight).toEqual({ x: 6, y: 0 });
  expect(result.points.bottomLeft).toEqual({ x: 0, y: 8 });
  expect(result.points.bottomRight).toEqual({ x: 6, y: 8 });

  contours.destroy();
});
