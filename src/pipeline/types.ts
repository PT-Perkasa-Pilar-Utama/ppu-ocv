import cv from "@techstark/opencv-js";

export interface BaseOperationOptions {
  [key: string]: any;
}

export interface OperationResult {
  img: cv.Mat;
  width: number;
  height: number;
}

export type OperationFunction<T extends BaseOperationOptions> = (
  img: cv.Mat,
  options: Partial<T>
) => OperationResult;

export interface OperationModule<T extends BaseOperationOptions> {
  operation: OperationFunction<T>;
  defaultOptions: T;
}
