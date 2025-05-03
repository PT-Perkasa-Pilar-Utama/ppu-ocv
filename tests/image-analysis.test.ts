import { beforeAll, expect, test } from "bun:test";
import {
  calculateMeanGrayscaleValue,
  calculateMeanNormalizedLabLightness,
  createCanvas,
  ImageProcessor,
} from "../src/index";

beforeAll(async () => {
  await ImageProcessor.initRuntime();
});

test("calculateMeanGrayscaleValue on uniform gray image", async () => {
  const canvas = createCanvas(4, 4);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "rgb(120,120,120)";
  ctx.fillRect(0, 0, 4, 4);

  const mean = await calculateMeanGrayscaleValue(canvas);
  expect(mean).toBeCloseTo(120, 0);
});

test("calculateMeanGrayscaleValue on black and white halves", async () => {
  const canvas = createCanvas(2, 2);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "rgb(0,0,0)";
  ctx.fillRect(0, 0, 1, 2);

  ctx.fillStyle = "rgb(255,255,255)";
  ctx.fillRect(1, 0, 1, 2);

  const mean = await calculateMeanGrayscaleValue(canvas);
  expect(mean).toBeCloseTo(128, 1);
});

test("calculateMeanNormalizedLabLightness returns 1 for white image", async () => {
  const canvas = createCanvas(5, 5);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "rgb(255,255,255)";
  ctx.fillRect(0, 0, 5, 5);

  const mean = await calculateMeanNormalizedLabLightness({
    canvas,
    dimension: { width: 5, height: 5 },
  });

  expect(mean).toBeCloseTo(1, 2);
});

test("calculateMeanNormalizedLabLightness returns 0 for black image", async () => {
  const canvas = createCanvas(3, 3);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "rgb(0,0,0)";
  ctx.fillRect(0, 0, 3, 3);

  const mean = await calculateMeanNormalizedLabLightness({
    canvas,
    dimension: { width: 3, height: 3 },
  });
  expect(mean).toBe(0);
});
