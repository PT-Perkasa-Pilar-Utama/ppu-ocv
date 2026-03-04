import type { CanvasLike } from "./canvas-factory.js";
import { CanvasToolkitBase } from "./canvas-toolkit.base.js";

import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readdirSync,
  unlinkSync,
} from "fs";
import { join } from "path";

/**
 * Node.js canvas toolkit with file-system operations.
 * Extends CanvasToolkitBase with saveImage() and clearOutput().
 */
export class CanvasToolkit extends CanvasToolkitBase {
  private static _nodeInstance: CanvasToolkit | null = null;

  protected constructor() {
    super();
  }

  public static override getInstance(): CanvasToolkit {
    if (!CanvasToolkit._nodeInstance) {
      CanvasToolkit._nodeInstance = new CanvasToolkit();
    }
    return CanvasToolkit._nodeInstance;
  }

  /**
   * Save a canvas to an image file
   * @param options
   * @param options.canvas Source canvas
   * @param options.filename Filename of the image file
   * @param options.path Path to save the image file (default: "out")
   * @returns A promise that resolves when the image is saved
   * @example
   * await CanvasToolkit.getInstance().saveImage({
   *   canvas: sourceCanvas,
   *   filename: "output.png",
   * });
   */
  saveImage(options: {
    canvas: CanvasLike;
    filename: string;
    path: string;
  }): Promise<void> {
    const { canvas, filename, path = "out" } = options;

    const folderPath = join(process.cwd(), path);
    if (!existsSync(folderPath)) {
      mkdirSync(folderPath, { recursive: true });
    }

    const filePath = join(folderPath, `${this.step++}. ${filename}.png`);
    const out = createWriteStream(filePath);
    const buffer = canvas.toBuffer!("image/png");

    return new Promise<void>((res, rej) => {
      out.write(buffer, (err) => {
        if (err) {
          rej(err);
        } else {
          res();
        }
      });
    });
  }

  /**
   * Clear the output folder
   * @param path Path to the output folder (default: "out")
   */
  clearOutput(path: string = "out"): void {
    const folderPath = join(process.cwd(), path);
    if (existsSync(folderPath)) {
      const files = readdirSync(folderPath);
      for (const file of files) {
        if (file === ".gitignore") continue;

        const filePath = join(folderPath, file);
        unlinkSync(filePath);
      }
    }
  }
}
