import type {
  BoundingBox,
  OperationResult,
  Points,
  RequiredOptions,
} from "@/index";
import { cv, registry } from "@/index";

declare module "@/pipeline/types" {
  interface RegisteredOperations {
    warp: WarpOptions;
  }
}

export interface WarpOptions extends RequiredOptions {
  /** Four points of the source image containing x and y point in
   * topLeft, topRight, bottomLeft and BottomRight.
   * Use Contours class instance to get the points
   */
  points: Points;

  /** A destination canvas bounding box for cropping the original canvas */
  bbox: BoundingBox;
}

export function warp(img: cv.Mat, options: WarpOptions): OperationResult {
  if (!options.points || !options.bbox) {
    throw new Error("Invalid options: points and bbox are required");
  }

  const { points, bbox } = options;
  const imgWarp = new cv.Mat();

  const targetWidth = bbox.x1 - bbox.x0;
  const targetHeight = bbox.y1 - bbox.y0;

  const destArray = [
    0,
    0,
    targetWidth - 1,
    0,
    targetWidth - 1,
    targetHeight - 1,
    0,
    targetHeight - 1,
  ];

  const srcArray: number[] = [
    points.topLeft.x,
    points.topLeft.y,
    points.topRight.x,
    points.topRight.y,
    points.bottomRight.x,
    points.bottomRight.y,
    points.bottomLeft.x,
    points.bottomLeft.y,
  ];

  const dest = cv.matFromArray(4, 1, cv.CV_32FC2, destArray);
  const src = cv.matFromArray(4, 1, cv.CV_32FC2, srcArray);

  let M = cv.getPerspectiveTransform(src, dest);
  let dsize = new cv.Size(targetWidth, targetHeight);
  cv.warpPerspective(img, imgWarp, M, dsize);

  M.delete();
  src.delete();
  dest.delete();

  img.delete();

  return {
    img: imgWarp,
    width: imgWarp.cols,
    height: imgWarp.rows,
  };
}

registry.register("warp", warp);
