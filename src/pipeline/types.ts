// SPDX-License-Identifier: MIT
// Copyright (c) 2026 PT Perkasa Pilar Utama

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

/** The output produced by every pipeline operation: the transformed Mat plus its dimensions. */
export interface OperationResult {
  /** Resulting OpenCV Mat after the operation. The caller is responsible for deleting it. */
  img: cv.Mat;
  /** Width of the resulting image in pixels. */
  width: number;
  /** Height of the resulting image in pixels. */
  height: number;
}

declare const RequiredBrand: unique symbol;
/**
 * Marker interface for operation options that have no usable defaults and
 * must be supplied by the caller. Operation option types that extend this
 * cannot be omitted when calling {@link ImageProcessor.execute}.
 */
export interface RequiredOptions {
  [RequiredBrand]?: never;
}
declare const PartialBrand: unique symbol;
/**
 * Marker interface for operation options that have sensible defaults.
 * Operation option types that extend this may be omitted or partially supplied.
 */
export interface PartialOptions {
  [PartialBrand]?: never;
}

/** Signature every registered operation function must conform to. */
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
  /** Adaptive (windowed) thresholding. See {@link AdaptiveThresholdOptions}. */
  adaptiveThreshold: AdaptiveThresholdOptions;
  /** Gaussian blur. See {@link BlurOptions}. */
  blur: BlurOptions;
  /** Constant-color border around the image. See {@link BorderOptions}. */
  border: BorderOptions;
  /** Canny edge detection. See {@link CannyOptions}. */
  canny: CannyOptions;
  /** Convert Mat depth/channel type. See {@link ConvertOptions}. */
  convert: ConvertOptions;
  /** Morphological dilation. See {@link DilateOptions}. */
  dilate: DilateOptions;
  /** Morphological erosion. See {@link ErodeOptions}. */
  erode: ErodeOptions;
  /** Convert to grayscale via `COLOR_RGBA2GRAY`. See {@link GrayscaleOptions}. */
  grayscale: GrayscaleOptions;
  /** Bitwise-NOT color inversion. See {@link InvertOptions}. */
  invert: InvertOptions;
  /** Morphological gradient (dilation minus erosion). See {@link MorphologicalGradientOptions}. */
  morphologicalGradient: MorphologicalGradientOptions;
  /** Resize to absolute pixel dimensions. See {@link ResizeOptions}. */
  resize: ResizeOptions;
  /** Affine rotation around a pivot point. See {@link RotateOptions}. */
  rotate: RotateOptions;
  /** Global threshold (including Otsu). See {@link ThresholdOptions}. */
  threshold: ThresholdOptions;
  /** Four-point perspective warp. See {@link WarpOptions}. */
  warp: WarpOptions;
}

/** Union of all registered operation names. Extend {@link RegisteredOperations} to add new ones. */
export type OperationName = keyof RegisteredOperations;

/** Resolve the options type for a given operation name. */
export type OperationOptions<N extends OperationName> = RegisteredOperations[N];
