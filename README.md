# ppu-ocv

Open-cv.js-based image processor for leveraging easy pipeline processing such as thresholding, contours, canny edge, and so on even perspective correction.

This work is based on https://github.com/TechStark/opencv-js.

Image manipulation as easy as

```ts
new ImageProcessor(canvas)
  .grayscale()
  .blur(5)
  .threshold()
  .invert()
  .dilate([20, 20], 5);
```

# Features

- [ ] Extendable pipeline plugin system (WIP)
