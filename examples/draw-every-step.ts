// import { ImageProcessor } from "ppu-ocv"
import { CanvasToolkit, ImageProcessor, cv } from "@/index";

const file = Bun.file("./assets/receipt.jpg");
const image = await file.arrayBuffer();
const DEBUG_FOLDER = "out";

const canvas = await ImageProcessor.prepareCanvas(image);
await ImageProcessor.initRuntime();

const canvasToolkit = new CanvasToolkit();
const processor = new ImageProcessor(canvas);
canvasToolkit.clearOutput(DEBUG_FOLDER);

const grayscaleImg = processor.grayscale().toCanvas();
await canvasToolkit.saveImage({
  canvas: grayscaleImg,
  filename: "grayscale",
  path: DEBUG_FOLDER,
});

const blurImg = processor.blur({ size: [5, 5] }).toCanvas();
await canvasToolkit.saveImage({
  canvas: blurImg,
  filename: "blur",
  path: DEBUG_FOLDER,
});

// or you can continue to use execute

const thresholdImg = processor
  .execute("threshold", { type: cv.THRESH_BINARY_INV + cv.THRESH_OTSU })
  .toCanvas();
await canvasToolkit.saveImage({
  canvas: thresholdImg,
  filename: "threshold",
  path: DEBUG_FOLDER,
});

const invertImg = processor.execute("canny").toCanvas();
await canvasToolkit.saveImage({
  canvas: invertImg,
  filename: "canny",
  path: DEBUG_FOLDER,
});

const dilateImg = processor.execute("dilate", { size: [5, 5] }).toCanvas();
await canvasToolkit.saveImage({
  canvas: dilateImg,
  filename: "dilate",
  path: DEBUG_FOLDER,
});

processor.destroy();

// bun run examples/draw-every-step.ts
