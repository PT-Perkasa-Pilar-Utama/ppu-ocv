import type { cv } from "../cv-provider.js";
import type { AdaptiveThresholdOptions } from "../operations/adaptive-threshold.js";
import type { BlurOptions } from "../operations/blur.js";
import type { BorderOptions } from "../operations/border.js";
import type { CannyOptions } from "../operations/canny.js";
import type { ConvertOptions } from "../operations/convert.js";
import type { DilateOptions } from "../operations/dilate.js";
import type { ErodeOptions } from "../operations/erode.js";
import type { GrayscaleOptions } from "../operations/grayscale.js";
import type { InvertOptions } from "../operations/invert.js";
import type { MorphologicalGradientOptions } from "../operations/morphological-gradient.js";
import type { ResizeOptions } from "../operations/resize.js";
import type { RotateOptions } from "../operations/rotate.js";
import type { ThresholdOptions } from "../operations/threshold.js";
import type { WarpOptions } from "../operations/warp.js";

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
 * Central registry mapping operation names to their option types. Each entry
 * is the options type exported by the corresponding `src/operations/*.ts`
 * file. Adding a new operation requires three changes: create the file,
 * export the Options type, and add the entry below.
 *
 * Previously this used `declare module` augmentation so each operation file
 * could register itself. JSR rejects that pattern because it modifies global
 * types, so the registry is now explicit. Consumers can still extend this
 * interface from their own code via `declare module "ppu-ocv"` — that's why
 * it stays an interface rather than a type alias.
 */
// oxlint-disable-next-line typescript/consistent-type-definitions -- consumers augment this via declare module
export interface RegisteredOperations {
  adaptiveThreshold: AdaptiveThresholdOptions;
  blur: BlurOptions;
  border: BorderOptions;
  canny: CannyOptions;
  convert: ConvertOptions;
  dilate: DilateOptions;
  erode: ErodeOptions;
  grayscale: GrayscaleOptions;
  invert: InvertOptions;
  morphologicalGradient: MorphologicalGradientOptions;
  resize: ResizeOptions;
  rotate: RotateOptions;
  threshold: ThresholdOptions;
  warp: WarpOptions;
}

export type OperationName = keyof RegisteredOperations;

export type OperationOptions<N extends OperationName> = RegisteredOperations[N];
