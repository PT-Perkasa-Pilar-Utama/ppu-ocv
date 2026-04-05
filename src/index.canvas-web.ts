import { setPlatform } from "./canvas-factory.js";
import { webPlatform } from "./platform/web.js";
setPlatform(webPlatform);

export type { BoundingBox, Coordinate, Points } from "./index.interface.js";
export { getPlatform, setPlatform } from "./canvas-factory.js";
export type {
  CanvasLike,
  CanvasPlatform,
  Context2DLike,
} from "./canvas-factory.js";
export { webPlatform } from "./platform/web.js";
export {
  CanvasToolkitBase as CanvasToolkit,
  CanvasToolkitBase,
  type ContourLike,
} from "./canvas-toolkit.base.js";
export { CanvasProcessor } from "./canvas-processor.js";
