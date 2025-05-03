## How to extend ppu-ocv operations

Let say in this case, I want to add `sobel` operation for image edge-detection alternative.  
There are two ways you can extend `ppu-ocv`.

#### Method 1: Augmentation + runtime prototype injection (more "magic")

| Pros                                                                      | Cons                                                                |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Allows calling `.sobel()` directly on the base `ImageProcessor` instances | Requires more boilerplate (type augmentation + prototype injection) |
| Feels integrated into the existing API                                    | Path sensitivity in the `declare module` setup                      |
|                                                                           | Feels a bit like “monkey patching”                                  |

### 1. Create `sobel.ts`

```ts
import type { OperationResult, PartialOptions } from "ppu-ocv";
import { cv, registry } from "ppu-ocv";

declare module "ppu-ocv" {
  interface RegisteredOperations {
    sobel: SobelOptions;
  }
}

// You can decide to use PartialOptions or RequiredOptions
export interface SobelOptions extends PartialOptions {
  /** Order of the derivative x (0, 1, or 2) */
  dx: number;
  /** Order of the derivative y (0, 1, or 2) */
  dy: number;
  /** Aperture size of the Sobel kernel (must be 1, 3, 5, or 7) */
  ksize: number;
}

function defaultOptions(): SobelOptions {
  return {
    dx: 1,
    dy: 0,
    ksize: 3,
  };
}

export function sobel(img: cv.Mat, options: SobelOptions): OperationResult {
  const imgSobel = new cv.Mat();
  cv.Sobel(img, imgSobel, cv.CV_8U, options.dx, options.dy, options.ksize);
  img.delete();

  return {
    img: imgSobel,
    width: imgSobel.cols,
    height: imgSobel.rows,
  };
}

registry.register("sobel", sobel, defaultOptions);
```

### 2. Create `extender.ts`

```ts
import { ImageProcessor } from "ppu-ocv";
import type { SobelOptions } from "./sobel";

// Augment the ImageProcessor class itself
declare module "ppu-ocv" {
  interface ImageProcessor {
    /**
     * Applies Sobel edge detection (Custom Method).
     * Requires SobelOptions.
     */
    sobel(options?: Partial<SobelOptions>): this;
  }
}

// Inject the implementation onto the prototype
// IMPORTANT: This MUST run *after* the ImageProcessor class is defined but *before*
// you try to call .sobel() on an instance. Usually run once at app startup.

if (!(ImageProcessor.prototype as any).sobel) {
  // Check if already added
  (ImageProcessor.prototype as any).sobel = function (
    this: ImageProcessor,
    options?: Partial<SobelOptions>
  ): ImageProcessor {
    // Delegate to the type-safe execute method internally
    return this.execute("sobel", options);
  };

  // Optional logging
  console.log("Enhanced ImageProcessor prototype with .sobel()");
}
```

### 3. Use it by importing the operation and extender

```ts
import { createCanvas, ImageProcessor } from "ppu-ocv";
import "./extender";
import "./sobel";

const dummyCanvas = createCanvas(1, 1);
await ImageProcessor.initRuntime();

const processor = new ImageProcessor(dummyCanvas);
processor.sobel();
```

#### Method 2: User subclass / wrapper (cleaner OOP approach)

| Pros                                                          | Cons                                                                                           |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Easy to implement                                             | User needs to instantiate `MyImageProcessor` instead of `ImageProcessor`                       |
| Cleaner separation of concerns                                | Cannot directly call `.sobel()` on a base `ImageProcessor` instance if received from elsewhere |
| No prototype manipulation                                     |                                                                                                |
| Standard OOP pattern                                          |                                                                                                |
| Less sensitive to exact declaration file paths in the library |                                                                                                |

### 1. Create `sobel.ts` the same as before

### 2. Create `MyImageProcessor.ts`

```ts
import { ImageProcessor as BaseImageProcessor } from "ppu-ocv";
import type { SobelOptions } from "./sobel";

// Import the registration files (run once)
import "./sobel";
// import "./another-custom-op";

export class MyImageProcessor extends BaseImageProcessor {
  /**
   * Applies Sobel edge detection (Custom Method).
   */
  sobel(options?: Partial<SobelOptions>): this {
    return this.execute("sobel", options);
  }

  // Add other custom methods here
  // anotherCustomOp(options?: Partial<AnotherOptions>): this {
  //     return this.execute("anotherCustomOp", options);
  // }

  // You can even override base methods if necessary, but be careful
  // blur(options?: Partial<BlurOptions>): this {
  //    console.log("Custom blur logic before calling base");
  //    super.blur(options); // Call base implementation
  //    return this;
  // }
}
```

### 3. Use it by importing the custom `MyImageProcessor.ts`

```ts
import { ImageProcessor as BaseImageProcessor } from "ppu-ocv";
import type { SobelOptions } from "./sobel";

// Import the registration files (run once)
import "./sobel";
// import "./another-custom-op";

export class MyImageProcessor extends BaseImageProcessor {
  /**
   * Applies Sobel edge detection (Custom Method).
   */
  sobel(options?: Partial<SobelOptions>): this {
    return this.execute("sobel", options);
  }

  // Add other custom methods here
  // anotherCustomOp(options?: Partial<AnotherOptions>): this {
  //     return this.execute("anotherCustomOp", options);
  // }

  // You can even override base methods if necessary, but be careful
  // blur(options?: Partial<BlurOptions>): this {
  //    console.log("Custom blur logic before calling base");
  //    super.blur(options); // Call base implementation
  //    return this;
  // }
}
```
