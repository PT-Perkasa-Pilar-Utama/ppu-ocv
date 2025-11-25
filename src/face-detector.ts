import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { Canvas, cv, ImageProcessor } from "./index";
import type {
  BoundingBox,
  EyesDetectorResult,
  FaceDetectorResult,
} from "./index.interface";

export class FaceDetector {
  private static instance: FaceDetector | null = null;
  private frontalFaceCascade: cv.CascadeClassifier;
  private eyeCascade: cv.CascadeClassifier;
  private eyeGlassCascade: cv.CascadeClassifier;

  /**
   * Private constructor to prevent direct instantiation
   */
  private constructor() {
    const __dirname = dirname(fileURLToPath(import.meta.url));

    const frontalFaceData = readFileSync(
      join(__dirname, "haarcascade_frontalface_default.xml")
    );
    const eyeData = readFileSync(join(__dirname, "haarcascade_eye.xml"));
    const eyeGlassData = readFileSync(
      join(__dirname, "haarcascade_eye_tree_eyeglasses.xml")
    );

    // Write files to Emscripten virtual file system
    // @ts-expect-error - FS exists in opencv.js runtime but not in type definitions
    cv.FS.writeFile("haarcascade_frontalface_default.xml", frontalFaceData);
    // @ts-expect-error - FS exists in opencv.js runtime but not in type definitions
    cv.FS.writeFile("haarcascade_eye.xml", eyeData);
    // @ts-expect-error - FS exists in opencv.js runtime but not in type definitions
    cv.FS.writeFile("haarcascade_eye_tree_eyeglasses.xml", eyeGlassData);

    this.frontalFaceCascade = new cv.CascadeClassifier();
    this.eyeCascade = new cv.CascadeClassifier();
    this.eyeGlassCascade = new cv.CascadeClassifier();

    this.frontalFaceCascade.load("haarcascade_frontalface_default.xml");
    this.eyeCascade.load("haarcascade_eye.xml");
    this.eyeGlassCascade.load("haarcascade_eye_tree_eyeglasses.xml");
  }

  /**
   * Get the singleton instance of FaceDetector
   * @returns The singleton instance
   * @example
   * const faceDetector = await FaceDetector.getInstance();
   */
  public static async getInstance(): Promise<FaceDetector> {
    await ImageProcessor.initRuntime();

    if (!FaceDetector.instance) {
      FaceDetector.instance = new FaceDetector();
    }
    return FaceDetector.instance;
  }

  /**
   * Detect faces in the given canvas
   * @param canvas Source canvas containing the image
   * @param options Detection options
   * @returns Promise resolving to detected faces
   * @example
   * const result = await faceDetector.detectFace(canvas);
   * console.log(`Found ${result.faces.length} faces`);
   */
  async detectFace(
    canvas: Canvas,
    options: {
      scaleFactor?: number;
      minNeighbors?: number;
      minSize?: { width: number; height: number };
    } = {}
  ): Promise<FaceDetectorResult> {
    const {
      scaleFactor = 1.1,
      minNeighbors = 3,
      minSize = { width: 30, height: 30 },
    } = options;

    const processor = new ImageProcessor(canvas);

    const faces = new cv.RectVector();
    const minSizeMat = new cv.Size(minSize.width, minSize.height);

    const detectedFaces: BoundingBox[] = [];

    try {
      const grayScaled = processor.grayscale().toMat();

      this.frontalFaceCascade.detectMultiScale(
        grayScaled,
        faces,
        scaleFactor,
        minNeighbors,
        0,
        minSizeMat
      );

      for (let i = 0; i < faces.size(); i++) {
        const face = faces.get(i);
        detectedFaces.push({
          x0: face.x,
          y0: face.y,
          x1: face.x + face.width,
          y1: face.y + face.height,
        });
      }
    } catch (error) {
    } finally {
      faces.delete();
      processor.destroy();
    }

    return { faces: detectedFaces };
  }

  /**
   * Detect eyes in the given canvas
   * @param canvas Source canvas containing the image
   * @param options Detection options
   * @returns Promise resolving to detected eyes
   * @example
   * const result = await faceDetector.detectEye(canvas);
   * console.log(`Found ${result.eyes.length} eye pairs`);
   */
  async detectEye(
    canvas: Canvas,
    options: {
      scaleFactor?: number;
      minNeighbors?: number;
      minSize?: { width: number; height: number };
      useFallback?: boolean;
    } = {}
  ): Promise<EyesDetectorResult> {
    const {
      scaleFactor = 1.05,
      minNeighbors = 3,
      minSize = { width: 10, height: 10 },
      useFallback = true,
    } = options;

    const processor = new ImageProcessor(canvas);
    const grayscaled = processor.grayscale().toMat();

    const eyes = new cv.RectVector();
    const minSizeMat = new cv.Size(minSize.width, minSize.height);

    let result: EyesDetectorResult;

    try {
      this.eyeCascade.detectMultiScale(
        grayscaled,
        eyes,
        scaleFactor,
        minNeighbors,
        0,
        minSizeMat
      );

      if (eyes.size() === 0 && useFallback) {
        const eyesWithGlasses = this.detectEyeSunglass(grayscaled, {
          scaleFactor,
          minNeighbors,
          minSize,
        });

        result = eyesWithGlasses;
      } else {
        const detectedEyes: { left: BoundingBox; right: BoundingBox }[] = [];

        const eyeArray: BoundingBox[] = [];
        for (let i = 0; i < eyes.size(); i++) {
          const eye = eyes.get(i);
          eyeArray.push({
            x0: eye.x,
            y0: eye.y,
            x1: eye.x + eye.width,
            y1: eye.y + eye.height,
          });
        }

        eyeArray.sort((a, b) => a.x0 - b.x0);
        for (let i = 0; i < eyeArray.length - 1; i += 2) {
          detectedEyes.push({
            left: eyeArray[i]!,
            right: eyeArray[i + 1]!,
          });
        }

        result = { eyes: detectedEyes };
      }
    } catch (error) {
      console.error(`[detectEyes error]: `, error);
      result = { eyes: [] };
    } finally {
      eyes.delete();
      processor.destroy();
    }

    return result;
  }

  /**
   * Detect eyes with glasses/sunglasses
   * @param gray Grayscale cv.Mat image
   * @param options Detection options
   * @returns Detected eyes result
   */
  private detectEyeSunglass(
    grayscale: cv.Mat,
    options: {
      scaleFactor: number;
      minNeighbors: number;
      minSize: { width: number; height: number };
    }
  ): EyesDetectorResult {
    const { scaleFactor, minNeighbors, minSize } = options;

    const eyes = new cv.RectVector();
    const minSizeMat = new cv.Size(minSize.width, minSize.height);

    this.eyeGlassCascade.detectMultiScale(
      grayscale,
      eyes,
      scaleFactor,
      minNeighbors,
      0,
      minSizeMat
    );

    const detectedEyes: { left: BoundingBox; right: BoundingBox }[] = [];

    const eyeArray: BoundingBox[] = [];
    for (let i = 0; i < eyes.size(); i++) {
      const eye = eyes.get(i);
      eyeArray.push({
        x0: eye.x,
        y0: eye.y,
        x1: eye.x + eye.width,
        y1: eye.y + eye.height,
      });
    }

    eyeArray.sort((a, b) => a.x0 - b.x0);
    for (let i = 0; i < eyeArray.length - 1; i += 2) {
      detectedEyes.push({
        left: eyeArray[i]!,
        right: eyeArray[i + 1]!,
      });
    }

    return { eyes: detectedEyes };
  }

  /**
   * Align face based on eye positions
   * @param canvas Source canvas containing the face
   * @param eyes Tuple of left and right eye bounding boxes
   * @returns Promise resolving to aligned face canvas
   * @example
   * const aligned = await faceDetector.alignFace(canvas, [leftEye, rightEye]);
   */
  async alignFace(
    canvas: Canvas,
    eyes: [BoundingBox, BoundingBox]
  ): Promise<Canvas> {
    const [leftEye, rightEye] = eyes;

    // Calculate eye centers
    const leftEyeCenter = {
      x: (leftEye.x0 + leftEye.x1) / 2,
      y: (leftEye.y0 + leftEye.y1) / 2,
    };

    const rightEyeCenter = {
      x: (rightEye.x0 + rightEye.x1) / 2,
      y: (rightEye.y0 + rightEye.y1) / 2,
    };

    const deltaX = rightEyeCenter.x - leftEyeCenter.x;
    const deltaY = rightEyeCenter.y - leftEyeCenter.y;
    const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

    const centerX = (leftEyeCenter.x + rightEyeCenter.x) / 2;
    const centerY = (leftEyeCenter.y + rightEyeCenter.y) / 2;
    const center = new cv.Point(centerX, centerY);

    const processor = new ImageProcessor(canvas);
    const rotated = processor
      .rotate({
        angle,
        center,
      })
      .toCanvas();

    return rotated;
  }
}
