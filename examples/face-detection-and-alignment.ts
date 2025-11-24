import { CanvasToolkit, FaceDetector, ImageProcessor } from "../src/index";

/**
 * Example: Face Detection and Alignment
 *
 * This example demonstrates:
 * 1. Detecting faces in an image
 * 2. Detecting eyes in the detected face
 * 3. Aligning the face based on eye positions
 */

const file = Bun.file("./assets/komeng-person.jpg");
const image = await file.arrayBuffer();
const DEBUG_FOLDER = "out";

let canvas = await ImageProcessor.prepareCanvas(image);
let originalCanvas = canvas;

await ImageProcessor.initRuntime();

const canvasToolkit = CanvasToolkit.getInstance();
const faceDetector = await FaceDetector.getInstance();

canvasToolkit.clearOutput(DEBUG_FOLDER);

// Step 1: Detect faces
console.log("\n--- Step 1: Detecting Faces ---");
const faceResult = await faceDetector.detectFace(canvas);
console.log(`Found ${faceResult.faces.length} face(s)`);

if (faceResult.faces.length === 0) {
  console.log("No faces detected. Exiting.");
  process.exit(0);
}

// Draw detected faces on the original canvas
let ctx = canvas.getContext("2d");
for (const face of faceResult.faces) {
  console.log(
    `  Face at: (${face.x0}, ${face.y0}) to (${face.x1}, ${face.y1})`,
  );
  canvasToolkit.drawLine({
    ctx,
    x: face.x0,
    y: face.y0,
    width: face.x1 - face.x0,
    height: face.y1 - face.y0,
    color: "red",
    lineWidth: 3,
  });
}

await canvasToolkit.saveImage({
  canvas,
  filename: "detected-faces",
  path: DEBUG_FOLDER,
});
console.log("Saved: out/detected-faces.png");

canvas = canvasToolkit.crop({
  canvas: originalCanvas,
  bbox: faceResult.faces[0],
});
ctx = canvas.getContext("2d");
let eyeCanvas = canvas;

await canvasToolkit.saveImage({
  canvas,
  filename: "face-cropped",
  path: DEBUG_FOLDER,
});
console.log("Saved: out/face-cropped.png");

// Step 2: Detect eyes
console.log("\n--- Step 2: Detecting Eyes ---");
// Adjust detection parameters for cropped face (smaller image requires smaller minSize)
const eyeResult = await faceDetector.detectEye(canvas, {
  scaleFactor: 1.05, // More sensitive scale factor for smaller faces
  minNeighbors: 3, // Lower threshold for detection
  minSize: { width: 10, height: 10 }, // Much smaller minimum size for cropped face
});
console.log(`Found ${eyeResult.eyes.length} eye pair(s)`);

if (eyeResult.eyes.length === 0) {
  console.log("No eyes detected. Cannot align face.");
  process.exit(0);
}

// Draw detected eyes
for (const eyePair of eyeResult.eyes) {
  console.log(
    `  Left eye: (${eyePair.left.x0}, ${eyePair.left.y0}) to (${eyePair.left.x1}, ${eyePair.left.y1})`,
  );
  console.log(
    `  Right eye: (${eyePair.right.x0}, ${eyePair.right.y0}) to (${eyePair.right.x1}, ${eyePair.right.y1})`,
  );

  // Draw left eye in green
  canvasToolkit.drawLine({
    ctx,
    x: eyePair.left.x0,
    y: eyePair.left.y0,
    width: eyePair.left.x1 - eyePair.left.x0,
    height: eyePair.left.y1 - eyePair.left.y0,
    color: "green",
    lineWidth: 2,
  });

  // Draw right eye in blue
  canvasToolkit.drawLine({
    ctx,
    x: eyePair.right.x0,
    y: eyePair.right.y0,
    width: eyePair.right.x1 - eyePair.right.x0,
    height: eyePair.right.y1 - eyePair.right.y0,
    color: "blue",
    lineWidth: 2,
  });
}

await canvasToolkit.saveImage({
  canvas,
  filename: "detected-eyes",
  path: DEBUG_FOLDER,
});
console.log("Saved: out/detected-eyes.png");

// Step 3: Align face based on first eye pair
console.log("\n--- Step 3: Aligning Face ---");
const firstEyePair = eyeResult.eyes[0]!;

// Calculate eye centers for display
const leftEyeCenter = {
  x: (firstEyePair.left.x0 + firstEyePair.left.x1) / 2,
  y: (firstEyePair.left.y0 + firstEyePair.left.y1) / 2,
};
const rightEyeCenter = {
  x: (firstEyePair.right.x0 + firstEyePair.right.x1) / 2,
  y: (firstEyePair.right.y0 + firstEyePair.right.y1) / 2,
};

const deltaX = rightEyeCenter.x - leftEyeCenter.x;
const deltaY = rightEyeCenter.y - leftEyeCenter.y;
const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

console.log(`  Eye angle: ${angle.toFixed(2)}°`);
console.log(`  Rotating to align eyes horizontally...`);

// Reload original image for alignment (without drawn rectangles)
const alignedCanvas = await faceDetector.alignFace(eyeCanvas, [
  firstEyePair.left,
  firstEyePair.right,
]);

await canvasToolkit.saveImage({
  canvas: alignedCanvas,
  filename: "aligned-face",
  path: DEBUG_FOLDER,
});
console.log("Saved: out/aligned-face.png");

console.log("\n✅ Complete! Check the 'out' directory for results.");
console.log("\nGenerated files:");
console.log("  - detected-faces.png (faces marked with red rectangles)");
console.log("  - detected-eyes.png (left eye in green, right eye in blue)");
console.log("  - aligned-face.png (face aligned based on eye positions)");
