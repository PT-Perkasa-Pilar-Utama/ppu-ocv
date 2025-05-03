import type { OperationResult, PartialOptions } from "@/index";
import { cv, registry } from "@/index";

declare module "@/pipeline/types" {
  interface RegisteredOperations {
    border: BorderOptions;
  }
}

export interface BorderOptions extends PartialOptions {
  /** Size of the border in pixels */
  size: number;
  /** Border type (e.g., cv.BORDER_CONSTANT) */
  borderType: cv.BorderTypes;
  /** Border color in [B, G, R, A] format */
  borderColor: [cv.int, cv.int, cv.int, cv.int];
}

function defaultOptions(): BorderOptions {
  return {
    size: 10,
    borderType: cv.BORDER_CONSTANT,
    borderColor: [255, 255, 255, 255],
  };
}

export function border(img: cv.Mat, options: BorderOptions): OperationResult {
  const imgBorder = new cv.Mat();

  cv.copyMakeBorder(
    img,
    imgBorder,
    options.size,
    options.size,
    options.size,
    options.size,
    options.borderType,
    options.borderColor
  );
  img.delete();

  return {
    img: imgBorder,
    width: imgBorder.cols,
    height: imgBorder.rows,
  };
}

registry.register("border", border, defaultOptions);
