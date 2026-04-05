import { mkdirSync, writeFileSync } from "fs";
import { CanvasProcessor, DeskewService, ImageProcessor } from "../src";
// import { CanvasProcessor, DeskewService, ImageProcessor } from "ppu-ocv";

/**
 * Example: Deskewing a tilted image
 *
 * This example demonstrates how to use the DeskewService to automatically
 * detect and correct skewed text in an image.
 */

// Initialize OpenCV runtime first
await ImageProcessor.initRuntime();

const service = new DeskewService({
  verbose: true,
  minimumAreaThreshold: 20,
});

// Load a tilted image
const imagePath = import.meta.dir + "/../assets/tilted.png";
const imgFile = Bun.file(imagePath);
const fileBuffer = await imgFile.arrayBuffer();
const canvas = await CanvasProcessor.prepareCanvas(fileBuffer);

const startTime = Date.now();

// Method 1: Calculate skew angle only
const angle = await service.calculateSkewAngle(canvas);
console.log(`\nDetected skew angle: ${angle.toFixed(2)}°`);

// Method 2: Deskew the image directly
const deskewedCanvas = await service.deskewImage(canvas);

const speed = Date.now() - startTime;

// Save the result
const outDir = "./out";
mkdirSync(outDir, { recursive: true });

// Convert canvas to buffer
const buffer = await CanvasProcessor.prepareBuffer(deskewedCanvas);
writeFileSync(`${outDir}/deskewed.png`, new Uint8Array(buffer));

console.log(`\nDeskewed image saved to ${outDir}/deskewed.png`);
console.log(`Operation completed in ${speed} ms`);
