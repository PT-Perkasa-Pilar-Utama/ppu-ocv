# ppu-ocv Expo Demo

An interactive, showcase of `ppu-ocv/canvas-mobile` in a React Native app powered by Expo and [React Native Skia (`@shopify/react-native-skia`)](https://shopify.github.io/react-native-skia/).

This demo exercises the canvas-only entry point of `ppu-ocv` designed specifically for mobile environments, running completely on the GPU via Skia without any OpenCV dependencies or heavy WebAssembly bundles.

## Features Demonstrated

1. **Procedural Shapes Generator**: Instantly draws canvas test patterns offline with `Context2DLike` for clean region-detection testing.
2. **Remote Image Fetching**: Fetches and downscales any web image dynamically using React Native Skia.
3. **Chainable Canvas Pipeline**: Exposes switches and step-selectors to control:
   - Grayscale BT.601 conversion.
   - Per-channel bitwise inversion (`invert`).
   - Binary Thresholding (`threshold`) with active sliders.
   - Margin addition (`border`).
   - Image center rotation (`rotate`).
4. **8-Connected Component Flood-fill**: Runs `findRegions` in real-time to locate and draw bounding boxes on detected shapes.
5. **GPU Crop Preview**: Directly extracts crops for the first 8 detected bounding boxes using `CanvasToolkit.getInstance().crop()` and previews them dynamically under low-latency Skia canvases.

## Getting Started

### Prerequisites

Ensure you have a mobile phone with the **Expo Go** app installed:

- [Expo Go for iOS (App Store)](https://apps.apple.com/us/app/expo-go/id984023020)
- [Expo Go for Android (Google Play)](https://play.google.com/store/apps/details?id=host.exp.exponent)

### Setup & Run

1. Navigate to this directory:

   ```bash
   cd examples/expo-demo
   ```

2. Make sure the parent project is built:

   ```bash
   # From root project directory
   bun run build
   bun scripts/prepare-publish.ts
   ```

3. Install dependencies in this folder (installs local `ppu-ocv` and Skia):

   ```bash
   npm install
   ```

4. Start the Expo development server:

   ```bash
   npm run start
   ```

5. Scan the QR code displayed in the terminal with your phone camera (iOS) or the Expo Go app (Android) to open the app!
