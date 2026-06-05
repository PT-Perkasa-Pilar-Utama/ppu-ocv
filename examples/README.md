# Examples

This directory contains example scripts demonstrating various features of ppu-ocv.

## Running Examples

All examples can be run using Bun:

```bash
bun run examples/<example-name>.ts
```

## Available Examples

### 1. Perspective Correction with Debug

**File:** `perspective-correction-with-debug.ts`

Demonstrates document scanning and perspective correction using contour detection and warping.

**Usage:**

```bash
bun run examples/perspective-correction-with-debug.ts
```

### 2. Expo React Native / Skia Interactive Demo

**Directory:** [expo-demo](./expo-demo/)

A complete mobile application demonstrating the `ppu-ocv/canvas-mobile` platform, featuring real-time image rendering, chainable filters, 8-connected flood fill region bounding-box tracking, and GPU crop previews using React Native Skia.

**Usage:**
Follow instructions in [expo-demo/README.md](./expo-demo/README.md).

## Output Directory

All examples save their output to the `out/` directory in the project root. This directory is automatically created if it doesn't exist.
