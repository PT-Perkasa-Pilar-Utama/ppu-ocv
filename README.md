# ppu-ocv

A type-safe, modular, chainable image processing library built on top of OpenCV.js with a fluent API leveraging pipeline processing.

Image manipulation as easy as:

```ts
// Simple usage
const processor = new ImageProcessor(canvas);
processor
  .grayscale()
  .blur({ size: 5 })
  .threshold()
  .invert()
  .dilate({ size: [20, 20], iter: 5 });

// Get the processed image
const resultCanvas = processor.toCanvas();

// Memory cleanup
processor.destroy();
```

This work is based on https://github.com/TechStark/opencv-js.

## Features

- [x] Type Safety: Full TypeScript typing for operations and options
- [x] Truly Modular: Each operation is in its own file with clean separation of concerns
- [x] Customizable: Easily create your own pipeline operations without modifying core code
- [x] Fluent API: Chain multiple operations together for complex transformations
- [x] Auto-Registration: Operations register themselves in the pipeline registry
- [x] Minimal Boilerplate: Create new operations with just a few lines of code
- [x] Parameter Objects: All operations use structured parameter objects for clean APIs
- [x] Dynamic Method Generation: Methods are automatically added to the ImageProcessor
- [x] Memory Management: Proper cleanup of OpenCV resources to prevent memory leaks
- [x] Canvas Integration: Seamlessly works with `@napi-rs/canvas`

## Why Use This Library?

OpenCV is powerful but can be cumbersome to use directly. This library provides:

1. **Simplified API**: Transform complex OpenCV calls into simple chainable methods
2. **Reduced Boilerplate**: No need to manage memory, conversions, or dimensions manually
3. **Development Speed**: Add image processing to your app in minutes, not hours
4. **Extensibility**: Custom operations for your specific needs without library modifications
5. **TypeScript Integration**: Full IntelliSense support with parameter validation

## Built-in Operations

To avoid bloat, we only ship essential operations, however you can easily adds your own operations. Currently shipped operations are:

Grayscale | Invert | Blur | Threshold
