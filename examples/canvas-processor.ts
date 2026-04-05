import { mkdirSync, writeFileSync } from "fs";
import { CanvasProcessor } from "../src/index.canvas.js";
// import { CanvasProcessor } from "ppu-ocv/canvas";

/**
 * Example: CanvasProcessor — canvas-native operations (no OpenCV required)
 *
 * Demonstrates all CanvasProcessor capabilities:
 *   - Static I/O: prepareCanvas, prepareBuffer
 *   - Chainable instance ops: resize, grayscale, convert
 *
 * Run with: bun examples/canvas-processor.ts
 */

const outDir = "./out";
mkdirSync(outDir, { recursive: true });

// ─── helpers ────────────────────────────────────────────────────────────────

function save(buffer: ArrayBuffer, filename: string) {
  writeFileSync(`${outDir}/${filename}`, new Uint8Array(buffer));
  console.log(`  saved → ${outDir}/${filename}`);
}

// ─── 1. Load image via prepareCanvas ────────────────────────────────────────

console.log("\n1. Loading image with CanvasProcessor.prepareCanvas()");

const imagePath = import.meta.dir + "/../assets/receipt.jpg";
const fileBuffer = await Bun.file(imagePath).arrayBuffer();

const canvas = await CanvasProcessor.prepareCanvas(fileBuffer);
console.log(`   loaded: ${canvas.width}×${canvas.height}`);

// ─── 2. Export back to ArrayBuffer via prepareBuffer ────────────────────────

console.log("\n2. Exporting canvas with CanvasProcessor.prepareBuffer()");

const exportedBuffer = await CanvasProcessor.prepareBuffer(canvas);
console.log(`   exported: ${exportedBuffer.byteLength} bytes`);
save(exportedBuffer, "original.png");

// ─── 3. resize ──────────────────────────────────────────────────────────────

console.log("\n3. resize({ width: 360, height: 640 })");

const resized = new CanvasProcessor(canvas)
  .resize({ width: 360, height: 640 })
  .toCanvas();

console.log(`   result: ${resized.width}×${resized.height}`);
save(await CanvasProcessor.prepareBuffer(resized), "resized.png");

// ─── 4. grayscale ───────────────────────────────────────────────────────────

console.log("\n4. grayscale()  [BT.601 luma: 0.299R + 0.587G + 0.114B]");

const grayscaled = new CanvasProcessor(canvas).grayscale().toCanvas();
save(await CanvasProcessor.prepareBuffer(grayscaled), "grayscale.png");

// ─── 5. convert — brighten (alpha > 1, beta > 0) ────────────────────────────

console.log("\n5. convert({ alpha: 1.4, beta: 20 })  — increase brightness/contrast");

const brightened = new CanvasProcessor(canvas)
  .convert({ alpha: 1.4, beta: 20 })
  .toCanvas();

save(await CanvasProcessor.prepareBuffer(brightened), "brightened.png");

// ─── 6. convert — darken (alpha < 1, beta < 0) ──────────────────────────────

console.log("\n6. convert({ alpha: 0.6, beta: -20 })  — reduce brightness/contrast");

const darkened = new CanvasProcessor(canvas)
  .convert({ alpha: 0.6, beta: -20 })
  .toCanvas();

save(await CanvasProcessor.prepareBuffer(darkened), "darkened.png");

// ─── 7. chain: resize → grayscale → convert ─────────────────────────────────

console.log("\n7. Chained: resize → grayscale → convert");

const chained = new CanvasProcessor(canvas)
  .resize({ width: 360, height: 640 })
  .grayscale()
  .convert({ alpha: 1.3, beta: 10 })
  .toCanvas();

console.log(`   result: ${chained.width}×${chained.height}`);
save(await CanvasProcessor.prepareBuffer(chained), "chained.png");

// ─── 8. pass-through guard: prepareCanvas with an existing canvas ────────────

console.log("\n8. prepareCanvas() with an existing canvas (pass-through)");

// @ts-expect-error — intentional: testing runtime pass-through
const sameCanvas = await CanvasProcessor.prepareCanvas(canvas);
console.log(`   same reference: ${sameCanvas === canvas}`);

// ─── 9. pass-through guard: prepareBuffer with an existing ArrayBuffer ───────

console.log("\n9. prepareBuffer() with an existing ArrayBuffer (pass-through)");

// @ts-expect-error — intentional: testing runtime pass-through
const sameBuffer = await CanvasProcessor.prepareBuffer(fileBuffer);
console.log(`   same reference: ${sameBuffer === fileBuffer}`);

// ─── done ────────────────────────────────────────────────────────────────────

console.log(`\nAll outputs written to ${outDir}/`);
