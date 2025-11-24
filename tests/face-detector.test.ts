import { afterAll, beforeAll, expect, test } from "bun:test";
import { existsSync, readdirSync, rmdirSync, unlinkSync } from "fs";
import { join } from "path";
import {
  CanvasToolkit,
  createCanvas,
  FaceDetector,
  ImageProcessor,
  loadImage,
} from "../src/index";

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

test("FaceDetector is a singleton", async () => {
  const instance1 = await FaceDetector.getInstance();
  const instance2 = await FaceDetector.getInstance();

  expect(instance1).toBe(instance2);
});

test("detectFace detects faces in komeng-person.jpg", async () => {
  const faceDetector = await FaceDetector.getInstance();
  const img = await loadImage("./assets/komeng-person.jpg");
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);

  const result = await faceDetector.detectFace(canvas);

  expect(result.faces).toBeDefined();
  expect(result.faces.length).toBeGreaterThan(0);

  // Verify bounding box structure
  for (const face of result.faces) {
    expect(face.x0).toBeDefined();
    expect(face.y0).toBeDefined();
    expect(face.x1).toBeDefined();
    expect(face.y1).toBeDefined();
    expect(face.x1).toBeGreaterThan(face.x0);
    expect(face.y1).toBeGreaterThan(face.y0);
  }

  // Save debug image with face rectangles
  const toolkit = CanvasToolkit.getInstance();
  for (const face of result.faces) {
    toolkit.drawLine({
      ctx,
      x: face.x0,
      y: face.y0,
      width: face.x1 - face.x0,
      height: face.y1 - face.y0,
      color: "red",
      lineWidth: 3,
    });
  }

  await toolkit.saveImage({
    canvas,
    filename: "komeng-face-detection",
    path: outDir,
  });
});

test("detectEye detects eyes in haaland.jpg", async () => {
  const faceDetector = await FaceDetector.getInstance();

  // Check if haaland.jpg exists, otherwise try haaland-face.png
  let imagePath = "./assets/haaland.jpg";
  if (!existsSync(imagePath)) {
    imagePath = "./assets/haaland-face.png";
  }

  const img = await loadImage(imagePath);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);

  const result = await faceDetector.detectEye(canvas);

  expect(result.eyes).toBeDefined();
  expect(result.eyes.length).toBeGreaterThan(0);

  // Verify eye pair structure
  for (const eyePair of result.eyes) {
    expect(eyePair.left).toBeDefined();
    expect(eyePair.right).toBeDefined();

    // Left eye
    expect(eyePair.left.x0).toBeDefined();
    expect(eyePair.left.y0).toBeDefined();
    expect(eyePair.left.x1).toBeGreaterThan(eyePair.left.x0);
    expect(eyePair.left.y1).toBeGreaterThan(eyePair.left.y0);

    // Right eye
    expect(eyePair.right.x0).toBeDefined();
    expect(eyePair.right.y0).toBeDefined();
    expect(eyePair.right.x1).toBeGreaterThan(eyePair.right.x0);
    expect(eyePair.right.y1).toBeGreaterThan(eyePair.right.y0);

    // Right eye should be to the right of left eye
    expect(eyePair.right.x0).toBeGreaterThan(eyePair.left.x0);
  }

  // Save debug image with eye rectangles
  const toolkit = CanvasToolkit.getInstance();
  for (const eyePair of result.eyes) {
    // Draw left eye in green
    toolkit.drawLine({
      ctx,
      x: eyePair.left.x0,
      y: eyePair.left.y0,
      width: eyePair.left.x1 - eyePair.left.x0,
      height: eyePair.left.y1 - eyePair.left.y0,
      color: "green",
      lineWidth: 2,
    });

    // Draw right eye in blue
    toolkit.drawLine({
      ctx,
      x: eyePair.right.x0,
      y: eyePair.right.y0,
      width: eyePair.right.x1 - eyePair.right.x0,
      height: eyePair.right.y1 - eyePair.right.y0,
      color: "blue",
      lineWidth: 2,
    });
  }

  await toolkit.saveImage({
    canvas,
    filename: "haaland-eye-detection",
    path: outDir,
  });
});

test("detectFace with custom options", async () => {
  const faceDetector = await FaceDetector.getInstance();
  const img = await loadImage("./assets/komeng-person.jpg");
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);

  const result = await faceDetector.detectFace(canvas, {
    scaleFactor: 1.2,
    minNeighbors: 5,
    minSize: { width: 50, height: 50 },
  });

  expect(result.faces).toBeDefined();
  expect(Array.isArray(result.faces)).toBe(true);
});

test("detectEye with useFallback disabled", async () => {
  const faceDetector = await FaceDetector.getInstance();
  const canvas = createCanvas(100, 100);

  const result = await faceDetector.detectEye(canvas, {
    useFallback: false,
  });

  expect(result.eyes).toBeDefined();
  expect(Array.isArray(result.eyes)).toBe(true);
});

test("alignFace aligns face based on eye positions", async () => {
  const faceDetector = await FaceDetector.getInstance();

  // Check if haaland.jpg exists, otherwise try haaland-face.png
  let imagePath = "./assets/haaland.jpg";
  if (!existsSync(imagePath)) {
    imagePath = "./assets/haaland-face.png";
  }

  const img = await loadImage(imagePath);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);

  // First detect eyes
  const eyeResult = await faceDetector.detectEye(canvas);

  if (eyeResult.eyes.length > 0) {
    const firstEyePair = eyeResult.eyes[0]!;

    // Align face
    const alignedCanvas = await faceDetector.alignFace(canvas, [
      firstEyePair.left,
      firstEyePair.right,
    ]);

    expect(alignedCanvas).toBeDefined();
    expect(alignedCanvas.width).toBe(canvas.width);
    expect(alignedCanvas.height).toBe(canvas.height);

    // Save aligned face
    const toolkit = CanvasToolkit.getInstance();
    await toolkit.saveImage({
      canvas: alignedCanvas,
      filename: "haaland-aligned-face",
      path: outDir,
    });
  }
});

test("detectFace returns empty array for blank canvas", async () => {
  const faceDetector = await FaceDetector.getInstance();
  const canvas = createCanvas(200, 200);
  const ctx = canvas.getContext("2d");

  // Fill with white
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, 200, 200);

  const result = await faceDetector.detectFace(canvas);

  expect(result.faces).toBeDefined();
  expect(result.faces.length).toBe(0);
});

test("detectEye returns empty array for blank canvas", async () => {
  const faceDetector = await FaceDetector.getInstance();
  const canvas = createCanvas(200, 200);
  const ctx = canvas.getContext("2d");

  // Fill with white
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, 200, 200);

  const result = await faceDetector.detectEye(canvas);

  expect(result.eyes).toBeDefined();
  expect(result.eyes.length).toBe(0);
});
