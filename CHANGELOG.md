# Changelog

## [Unreleased]

### Added

- **Reproducible-build verification.** CI now builds twice and fails if the
  output is not byte-identical; `docs/REPRODUCIBLE_BUILD.md` documents the
  deterministic build and how to verify it (OpenSSF Best Practices Gold).

### Fixed

- **Node and web entry points can now be used in the same process.** Canvas
  detection (`ImageProcessor` constructor, `CanvasProcessor.prepareCanvas`) used
  the globally-registered platform's `isCanvas`, so once `ppu-ocv/web` was
  loaded a Node-created canvas was rejected with "Invalid source type. Must be
  either Canvas or cv.Mat." Detection is now structural (a new exported
  `isCanvasLike`) and platform-independent, unblocking dual-target consumers and
  test suites. ([#16](https://github.com/PT-Perkasa-Pilar-Utama/ppu-ocv/issues/16))

## [3.1.6] — 2026-05-24

### Security

- **Supply-chain hardening.** All GitHub Actions are now pinned to commit SHAs
  (Dependabot keeps them current), `npm publish` passes `--provenance` so each
  release carries a signed SLSA attestation, and a new OpenSSF Scorecard
  workflow publishes a supply-chain health score.
- **Published package runs no install scripts.** The publish manifest is now
  sanitized — `scripts` (including `prepare`) and `devDependencies` are stripped
  before publishing, so an installed copy can execute no lifecycle code.
- **`SECURITY.md`** documents the Socket "obfuscated code" alerts on
  `@techstark/opencv-js` / `@napi-rs/canvas` as false positives on minified and
  prebuilt-native upstream artifacts.
- **LICENSE now ships in the npm tarball** (previously only the SPDX field
  traveled).
- **OpenSSF Security Baseline.** Added CodeQL on every push/PR, an osv-scanner
  SCA gate (CI and pre-release), a CycloneDX SBOM attached to each release, and
  the supporting docs: `GOVERNANCE.md`, `docs/DESIGN.md`,
  `docs/THREAT_MODEL.md`, a release-verification / dependency / remediation /
  VEX policy in `SECURITY.md`, and a DCO sign-off requirement in
  `CONTRIBUTING.md`.
- **`ROADMAP.md`** added, and CI now enforces a 90% line/function coverage
  floor (`bunfig.toml`).

## [3.1.5] — 2026-05-14

### Dependencies

- **`@napi-rs/canvas` 0.1.100 → 1.0.0.** Upstream marked the API stable after ~11M weekly downloads. The maintainer explicitly notes no breaking changes, so this is a drop-in upgrade for everyone using the Node entry points (`ppu-ocv`, `ppu-ocv/canvas`).

### Infrastructure

- Added `.github/dependabot.yml` so npm dependencies and GitHub Actions stay current automatically (weekly schedule).
- Tightened `permissions:` on the CI quality-check workflow.
- Bumped publish workflow Node runtime 20 → 22 (Node 20 reaches EOL April 2026).
- Bumped CI actions to current majors: `actions/checkout` v4 → v6, `actions/setup-node` v4 → v6, `oven-sh/setup-bun` v1 → v2.
- Bumped dev tooling: `lint-staged` 16.4.0 → 17.0.4 (now requires Node ≥22.22.1, matches the new CI baseline), `oxfmt` 0.48.0 → 0.49.0.

### Documentation

- Added launch article and SVG illustrations under `docs/`.
- Added `skill-ppu-ocv/` at the repo root with usage guidance for AI coding assistants.

No public API changes. Drop-in upgrade from 3.1.4.

## [3.1.4] — 2026-05-14

### Documentation

- **JSR symbol-doc coverage** raised from 38% to a much higher score by
  documenting every previously bare interface member. Newly documented:
  all fields of `CanvasLike`, `Context2DLike`, and `CanvasPlatform` in
  `canvas-factory.ts`; `ContourLike.data32S`; every key of
  `RegisteredOperations` in `pipeline/types.ts`; the public `img` /
  `width` / `height` fields on `ImageProcessor`; the `getInstance`
  override on `CanvasToolkit`; the `DeskewService` constructor; and the
  `cv` namespace itself in `cv-provider.ts`.

No public API changes. Drop-in upgrade from 3.1.3.

## [3.1.3] — 2026-05-14

### Documentation

- **JSR documentation coverage** raised from 70% to over 80%. Module-level docs added to all four entrypoints (`ppu-ocv`, `ppu-ocv/web`, `ppu-ocv/canvas`, `ppu-ocv/canvas-web`) and JSDoc added to every exported symbol across the public surface: `index.interface.ts` types, `cv-provider.ts` namespace and proxy, `pipeline/registry.ts` class and helpers, `pipeline/types.ts` types, `Contours`, `ImageProcessor`, and every operation file's options interface and function.

### Internal

- `ImageProcessor.initRuntime` reverted to its original simple form (resolves on `cv.Mat` truthiness or `onRuntimeInitialized`), removing the dynamic-import + race-detection scaffolding that was added in 3.1.2's bundled commit and produced inconsistent behaviour under Bun's worker model.
- Test script switched to `bun test --parallel=N` (N = number of test files). Each test file runs in its own worker process so Emscripten/embind state from `@techstark/opencv-js` is not shared across files — that was the source of `BindingError: Cannot register public name ... twice` when the suite ran sequentially in a single process.
- CI test step now runs in roughly 1 second (was hanging past 20 minutes before this change).

No public API changes. Drop-in upgrade from 3.1.2.

## [3.1.2] — 2026-05-14

### Infrastructure

- **JSR publish is unblocked.** The operations pipeline switched from `declare module` augmentation to a concrete `RegisteredOperations` interface in `pipeline/types.ts`. JSR rejected the augmentation pattern as "modifying global types"; the new layout publishes cleanly. Consumer-side `declare module "ppu-ocv"` augmentation for custom operations continues to work unchanged.
- **Tooling parity with ppu-paddle-ocr.** Replaces prettier with oxlint + oxfmt. Adds husky pre-commit and commit-msg hooks (Conventional Commits, 80-char subject cap) and lint-staged. New scripts: `type-check`, `test`, `lint`, `lint:fix`, `fmt`, `fmt:fix`.
- **CI workflow.** `.github/workflows/ci.yml` runs fmt, lint, type-check, tests, and build on push and PR.
- **Release-triggered publish.** `.github/workflows/publish.yml` now fires on `release: published` and ships to both jsr and npm.
- **Community docs.** Adds `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`, `SECURITY.md`, three issue templates, and a PR template.
- **`jsr.json` exports** gain the `./canvas` and `./canvas-web` entries that were already in `package.json`, so the JSR publish matches what npm ships.
- **README + index.html** refreshed with the current version and the new doc structure.

No public API changes. v3.1.1's `findRegions` `thresh` option (added 2026-04-06) ships in this version as part of the first jsr/npm publish since the registry rewrite.

## [3.1.1] — 2026-04-06

### Improvements

#### `findRegions()` — new `thresh` option for resized binary images

The default `thresh: 127` caused accuracy loss when `findRegions` was called on a
**resized** binary image. Resizing introduces anti-aliased border pixels with
grayscale values in the 1–127 range that the old threshold ignored, while
OpenCV's `findContours` treats any non-zero pixel as foreground. The new `thresh`
option lets you match that behaviour:

```ts
// Use thresh: 0 so any non-zero pixel is treated as foreground,
// matching OpenCV findContours on resized binary images.
const regions = new CanvasProcessor(resizedBinaryCanvas).findRegions({
  foreground: "light",
  thresh: 0,
  minArea: 20,
  padding: { vertical: 0.4, horizontal: 0.6 },
  scale: 1 / resizeRatio,
});
```

With `thresh: 0`, `padding`, and `scale`, the full pipeline matches the
production `extractBoxesFromContours()` output at **mean IoU 98.4%**
(all 21/21 boxes matched).

#### Example script

`examples/find-region-vs-get-contours.ts` — side-by-side comparison of
`CanvasProcessor.findRegions` vs OpenCV contours on a real receipt image,
producing annotated PNG output files.

---

## [3.1.0] — 2026-04-06

### New Features

#### `CanvasProcessor` — canvas-native operations and region detection

All operations are available without any OpenCV dependency via `ppu-ocv/canvas` / `ppu-ocv/canvas-web`.

**Four new pixel-level operations** (matching `ImageProcessor`/OpenCV equivalents):

| Method                | Fidelity vs OpenCV         | Notes                                                                                      |
| --------------------- | -------------------------- | ------------------------------------------------------------------------------------------ |
| `invert()`            | **1:1** (on opaque images) | `255 - channel`; OpenCV also inverts alpha — compare after grayscale for exact match       |
| `threshold(options?)` | **1:1**                    | `THRESH_BINARY` at a fixed value; Otsu automatic threshold not supported canvas-natively   |
| `border(options?)`    | **1:1**                    | Uniform `BORDER_CONSTANT`; color as CSS string instead of `[B,G,R,A]` array                |
| `rotate(options)`     | **≈** (max ±6 at 15°)      | Canvas uses anti-aliased bilinear; OpenCV uses plain bilinear — visually indistinguishable |

**New `findRegions()` — canvas-native bbox detection on binary images:**

```ts
const regions = new CanvasProcessor(binaryCanvas).findRegions({
  foreground: "light", // detect white regions (default)
  minArea: 20, // ignore regions smaller than N pixels
});
// regions: DetectedRegion[] → { bbox: { x0, y0, x1, y1 }, area }
```

Uses 8-connected DFS flood-fill. No OpenCV required. Comparable to:

```ts
const contours = new Contours(mat, { mode: cv.RETR_EXTERNAL, method: cv.CHAIN_APPROX_SIMPLE });
contours.iterate((c) => {
  const r = contours.getRect(c); /* r.x, r.y, r.width, r.height */
});
```

On `binary-text-detection.png`: 21 of 23 OpenCV contours matched, mean IoU 88.7%.

#### `Context2DLike` interface extended

Added `save`, `restore`, `translate`, `rotate`, `fillStyle`, `fillRect` to the
`Context2DLike` structural interface in `canvas-factory.ts`. These are standard
Canvas2D API methods used by the new operations. No consumer code changes needed.

### Comparison test results (v3.1.0)

| Operation                     | Exact match   | Max diff  |
| ----------------------------- | ------------- | --------- |
| grayscale                     | 100.00%       | 0         |
| invert (after grayscale)      | 100.00%       | 0         |
| threshold (THRESH_BINARY=127) | 100.00%       | 0         |
| border (size=10, white)       | 100.00%       | 0         |
| resize downscale 2×           | 100.00%       | 0         |
| resize upscale 2×             | 89.98%        | ±1        |
| rotate 0°                     | 100.00%       | 0         |
| rotate 15° (inner region)     | 36.76%        | ±6        |
| findRegions (binary image)    | 21/23 matched | IoU 88.7% |

---

## [3.0.0] — 2026-04-05

### Breaking Changes

- **`ImageProcessor.prepareCanvas()` removed** — use `CanvasProcessor.prepareCanvas()` instead.
- **`ImageProcessor.prepareBuffer()` removed** — use `CanvasProcessor.prepareBuffer()` instead.
- **`CanvasToolkitBase.drawContour()` parameter type changed** — the `contour` option now accepts `ContourLike` (`{ data32S: Int32Array | number[] }`) instead of `cv.Mat`. Existing code passing a `cv.Mat` continues to work at runtime since `cv.Mat` satisfies the duck type.

### New Features

#### `CanvasProcessor` class

A new class that groups canvas I/O utilities with **zero dependency on OpenCV**. Safe to use in constrained environments (Browser Extensions, Service Workers, etc.) where OpenCV cannot be initialised.

```typescript
import { CanvasProcessor } from "ppu-ocv";

const canvas = await CanvasProcessor.prepareCanvas(arrayBuffer);
const buffer = await CanvasProcessor.prepareBuffer(canvas);
```

#### `ppu-ocv/canvas` entry point (Node.js, canvas-only)

Imports the Node.js canvas platform and exposes `CanvasProcessor`, `CanvasToolkit`, and `CanvasToolkitBase` **without touching OpenCV**. Importing this entry point will never throw due to a missing or un-initialised OpenCV runtime.

```typescript
import { CanvasProcessor, CanvasToolkit } from "ppu-ocv/canvas";
```

Exports: `CanvasProcessor`, `CanvasToolkit`, `CanvasToolkitBase`, `ContourLike`, canvas factory types, and `@napi-rs/canvas` re-exports (`Canvas`, `createCanvas`, `ImageData`, `loadImage`).

#### `ppu-ocv/canvas-web` entry point (Browser, canvas-only)

Browser counterpart of `ppu-ocv/canvas`. Uses `HTMLCanvasElement` / `OffscreenCanvas` and exports the same canvas-only surface (`CanvasToolkitBase` aliased as `CanvasToolkit`).

```typescript
import { CanvasProcessor, CanvasToolkit } from "ppu-ocv/canvas-web";
```

#### `ContourLike` interface

Exported from all entry points. Describes the structural shape expected by `CanvasToolkitBase.drawContour()`:

```typescript
interface ContourLike {
  data32S: Int32Array | number[];
}
```

### Internal Changes

- `CanvasToolkitBase` no longer imports `cv-provider` — it is now truly OpenCV-free.
- `CanvasProcessor` is a pure leaf module that only depends on `canvas-factory`.

---

## [2.0.0] — previous

Web / browser support via `ppu-ocv/web` entry point. Lazy OpenCV loading via Proxy pattern.

## [1.x] — previous

Initial release with Node.js-only support.
