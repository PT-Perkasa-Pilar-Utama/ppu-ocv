import { mkdirSync, writeFileSync } from "fs";
import {
  CanvasProcessor,
  CanvasToolkitBase,
  getPlatform,
} from "../src/index.canvas.js";
import { Contours, cv, ImageProcessor } from "../src/index.js";
// import { CanvasProcessor, CanvasToolkitBase, getPlatform } from "ppu-ocv/canvas";
// import { ImageProcessor, Contours, cv } from "ppu-ocv";

/**
 * Example: canvas findRegions vs OpenCV get contours
 * Two output images are saved:
 *   out/receipt-bboxes-opencv.png  — bboxes from OpenCV Contours
 *   out/receipt-bboxes-canvas.png  — bboxes from CanvasProcessor.findRegions
 *
 * Run with: bun examples/find-region-vs-get-contours.ts
 */

await ImageProcessor.initRuntime();

const outDir = "./out";
mkdirSync(outDir, { recursive: true });

const MIN_BOX_AREA = 20;
const PADDING_VERTICAL = 0.4;
const PADDING_HORIZONTAL = 0.6;

// ─── helpers ───────────────────────────────

type Rect = { x: number; y: number; width: number; height: number };

function applyPaddingToRect(
  rect: Rect,
  maxWidth: number,
  maxHeight: number,
  paddingVertical: number,
  paddingHorizontal: number,
): Rect {
  const verticalPadding = Math.round(rect.height * paddingVertical);
  const horizontalPadding = Math.round(rect.height * paddingHorizontal);

  const x = Math.max(0, rect.x - horizontalPadding);
  const y = Math.max(0, rect.y - verticalPadding);
  const rightEdge = Math.min(maxWidth, rect.x + rect.width + horizontalPadding);
  const bottomEdge = Math.min(
    maxHeight,
    rect.y + rect.height + verticalPadding,
  );

  return { x, y, width: rightEdge - x, height: bottomEdge - y };
}

// ─── load images ─────────────────────────────────────────────────────────────

const binaryFile = Bun.file("./assets/binary-text-detection.png");
const detectionCanvas = await CanvasProcessor.prepareCanvas(
  await binaryFile.arrayBuffer(),
);

const receiptFile = Bun.file("./assets/receipt.jpg");
const receiptCanvas = await CanvasProcessor.prepareCanvas(
  await receiptFile.arrayBuffer(),
);

// Detection canvas dimensions (processed / model output space)
const detW = detectionCanvas.width;
const detH = detectionCanvas.height;

// Receipt dimensions (original image space)
const origW = receiptCanvas.width;
const origH = receiptCanvas.height;

// The detection model resizes the input by HEIGHT to fill detH, maintaining
// aspect ratio. Content width = origW × (detH / origH) ≤ detW, left-aligned.
// Both axes use the same uniform scale derived from the height ratio.
const uniformScale = origH / detH;
const scaleX = uniformScale;
const scaleY = uniformScale;

console.log(`Detection canvas: ${detW}×${detH}`);
console.log(`Receipt:          ${origW}×${origH}`);
console.log(`Uniform scale (height-based): ${uniformScale.toFixed(4)}`);
console.log(
  `Content width in mask: ${(origW / uniformScale).toFixed(1)}px (of ${detW}px)`,
);

// ─── OpenCV pipeline (postprocessDetection) ──────────────────────────────────

const platform = getPlatform();
const ocvSrc = platform.createCanvas(detW, detH);
ocvSrc.getContext("2d").drawImage(detectionCanvas, 0, 0);

const processor = new ImageProcessor(ocvSrc);
processor.grayscale().convert({ rtype: cv.CV_8UC1 });

const contours = new Contours(processor.toMat(), {
  mode: cv.RETR_LIST,
  method: cv.CHAIN_APPROX_SIMPLE,
});

// Keep bboxes in detection-canvas space
const ocvBoxes: Rect[] = [];
contours.iterate((contour) => {
  const rect = contours.getRect(contour);
  if (rect.width * rect.height <= MIN_BOX_AREA) return;

  const padded = applyPaddingToRect(
    rect,
    detW,
    detH,
    PADDING_VERTICAL,
    PADDING_HORIZONTAL,
  );

  if (padded.width > 5 && padded.height > 5) {
    ocvBoxes.push(padded);
  }
});

contours.destroy();
processor.destroy();

console.log(`\nOpenCV boxes: ${ocvBoxes.length}`);

// ─── Canvas pipeline (findRegions equivalent) ────────────────────────────────

// Keep bboxes in detection-canvas space (no scale option)
const canvasBoxes = new CanvasProcessor(detectionCanvas)
  .findRegions({
    foreground: "light",
    thresh: 0, // any non-zero pixel = foreground (matches OpenCV)
    minArea: MIN_BOX_AREA + 1,
    padding: { vertical: PADDING_VERTICAL, horizontal: PADDING_HORIZONTAL },
  })
  .map((r) => ({
    x: r.bbox.x0,
    y: r.bbox.y0,
    width: r.bbox.x1 - r.bbox.x0,
    height: r.bbox.y1 - r.bbox.y0,
  }))
  .filter((b) => b.width > 5 && b.height > 5);

console.log(`Canvas boxes:  ${canvasBoxes.length}`);

// ─── draw & save ─────────────────────────────────────────────────────────────

const toolkit = CanvasToolkitBase.getInstance();

function drawBoxes(boxes: Rect[], color: string, lineWidth: number) {
  const output = platform.createCanvas(origW, origH);
  const ctx = output.getContext("2d");
  ctx.drawImage(receiptCanvas, 0, 0);

  for (const box of boxes) {
    // Scale each bbox from detection space → receipt space
    toolkit.drawLine({
      ctx,
      x: Math.round(box.x * scaleX),
      y: Math.round(box.y * scaleY),
      width: Math.round(box.width * scaleX),
      height: Math.round(box.height * scaleY),
      color,
      lineWidth,
    });
  }

  return output;
}

const ocvOutput = drawBoxes(ocvBoxes, "blue", 3);
const ocvBuffer = await CanvasProcessor.prepareBuffer(ocvOutput);
writeFileSync(`${outDir}/receipt-bboxes-opencv.png`, Buffer.from(ocvBuffer));

const canvasOutput = drawBoxes(canvasBoxes, "red", 3);
const canvasBuffer = await CanvasProcessor.prepareBuffer(canvasOutput);
writeFileSync(`${outDir}/receipt-bboxes-canvas.png`, Buffer.from(canvasBuffer));

console.log(`\nSaved:`);
console.log(
  `  out/receipt-bboxes-opencv.png  (blue, ${ocvBoxes.length} boxes)`,
);
console.log(
  `  out/receipt-bboxes-canvas.png  (red,  ${canvasBoxes.length} boxes)`,
);
