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
  options: T 
) => OperationResult;

/**
 * @description
 * Central registry mapping operation names to their specific option types.
 * Operation modules MUST augment this interface.
 */
export interface RegisteredOperations {
  // Augmented by operation modules (e.g., blur: BlurOptions;)
}

export type OperationName = keyof RegisteredOperations;

export type OperationOptions<N extends OperationName> = RegisteredOperations[N];