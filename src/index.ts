import cv from "@techstark/opencv-js";
export { cv };

export { Canvas, createCanvas, ImageData, loadImage } from "@napi-rs/canvas";
export type { SKRSContext2D } from "@napi-rs/canvas";
export type { BoundingBox, Coordinate, Points, EyesDetectorResult, FaceDetectorResult } from "./index.interface";
export { executeOperation, OperationRegistry, registry } from "./pipeline";

export { CanvasToolkit } from "./canvas-toolkit";
export { Contours } from "./contours";
export {
  calculateMeanGrayscaleValue,
  calculateMeanNormalizedLabLightness,
  type CalculateMeanLightnessOptions,
} from "./image-analysis";
export { ImageProcessor } from "./image-processor";
export { FaceDetector } from "./face-detector";

export type {
  AdaptiveThresholdOptions,
  BlurOptions,
  BorderOptions,
  CannyOptions,
  DilateOptions,
  ErodeOptions,
  GrayscaleOptions,
  InvertOptions,
  MorphologicalGradientOptions,
  OperationFunction,
  OperationName,
  OperationOptions,
  OperationResult,
  PartialOptions,
  RegisteredOperations,
  RequiredOptions,
  ResizeOptions,
  RotateOptions,
  ThresholdOptions,
  WarpOptions,
} from "./pipeline";
