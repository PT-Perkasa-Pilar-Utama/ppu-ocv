import cv from "@techstark/opencv-js";

export interface OperationResult {
  img: cv.Mat;
  width: number;
  height: number;
}

declare const RequiredBrand: unique symbol;
export interface RequiredOptions {
  [RequiredBrand]?: never;
}
declare const PartialBrand: unique symbol;
export interface PartialOptions {
  [PartialBrand]?: never;
}

export type OperationFunction<T> = (img: cv.Mat, options: T) => OperationResult;

/**
 * @description
 * Central registry mapping operation names to their specific option types.
 * Operation modules MUST augment this interface.
 */

export interface RegisteredOperations {
  // Augmented by operation modules (e.g., blur: BlurOptions;)
  // Leave it blank
}

export type OperationName = keyof RegisteredOperations;

export type OperationOptions<N extends OperationName> = RegisteredOperations[N];
