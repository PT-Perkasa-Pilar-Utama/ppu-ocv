# Examples

This directory contains example scripts demonstrating various features of ppu-ocv.

## Running Examples

All examples can be run using Bun:

```bash
bun run examples/<example-name>.ts
```

## Available Examples

### 1. Face Detection and Alignment

**File:** `face-detection-and-alignment.ts`

Demonstrates how to:
- Detect faces in an image using Haar Cascade classifiers
- Detect eyes with automatic fallback to eyeglasses detection
- Align faces based on eye positions

**Usage:**
```bash
bun run examples/face-detection-and-alignment.ts
```

**Output:**
- `out/0. 1-detected-faces.png` - Original image with detected faces marked in red
- `out/1. 2-detected-eyes.png` - Image with detected eyes (left in green, right in blue)
- `out/2. 3-aligned-face.png` - Face aligned based on eye positions

**Key Features:**
- Uses `FaceDetector.getInstance()` singleton pattern
- Demonstrates face detection with `detectFace()`
- Shows eye detection with `detectEye()`
- Illustrates face alignment with `alignFace()`
- Generates debug images with bounding boxes

### 2. Perspective Correction with Debug

**File:** `perspective-correction-with-debug.ts`

Demonstrates document scanning and perspective correction using contour detection and warping.

**Usage:**
```bash
bun run examples/perspective-correction-with-debug.ts
```

## Output Directory

All examples save their output to the `out/` directory in the project root. This directory is automatically created if it doesn't exist.
