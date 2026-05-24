# Design

This document describes what ppu-ocv does, the actors it interacts with, and
how image data flows through it. It complements the API reference in the
[README](../README.md).

## What it is

ppu-ocv is a library, not a service. A developer imports it into their own
Node, Bun, or browser code and calls it in-process. It never starts a server,
opens a socket, or phones home. All work happens in the caller's memory.

## Actors

| Actor                  | Role                                                         | Trust                            |
| :--------------------- | :----------------------------------------------------------- | :------------------------------- |
| Consuming application  | Calls the API, supplies image data and options               | Trusted (it is the host)         |
| Image input            | Bytes or a path the application passes in                    | **Untrusted** (may be malformed) |
| JavaScript runtime     | Node, Bun, or a browser engine that hosts the code           | Trusted                          |
| `@techstark/opencv-js` | OpenCV WASM build used by `ImageProcessor`                   | Third-party, pinned              |
| `@napi-rs/canvas`      | Native canvas decoder/encoder on the Node side               | Third-party, pinned              |
| Browser canvas / WASM  | The platform's own canvas and the OpenCV WASM in the browser | Provided by the runtime          |

## Entry points

Four entry points let the caller pull in only what they need:

| Import               | Backend                 | Runtime   |
| :------------------- | :---------------------- | :-------- |
| `ppu-ocv`            | OpenCV + native canvas  | Node, Bun |
| `ppu-ocv/web`        | OpenCV + browser canvas | Browser   |
| `ppu-ocv/canvas`     | Canvas only, no OpenCV  | Node, Bun |
| `ppu-ocv/canvas-web` | Canvas only, no OpenCV  | Browser   |

A caller who only needs cropping, resizing, or format conversion takes a
`canvas` entry point and never loads the OpenCV WASM at all.

## Components

- **`ImageProcessor`** wraps OpenCV. It decodes an image into a `Mat`, applies
  a chain of operations, and returns the result.
- **`CanvasProcessor`** does the same work for operations that need only the
  canvas 2D context, with no OpenCV dependency.
- **Pipeline registry** holds the named operations (`blur`, `threshold`,
  `warp`, `canny`, `deskew`, and the rest under `src/operations/`) and runs them
  in order.
- **Platform abstraction** (`src/platform/`) hides the difference between the
  Node native canvas and the browser canvas behind one interface, so the
  operations do not branch on runtime.
- **`cv-provider`** loads and initializes the OpenCV WASM once and hands the
  ready instance to the processors.

## Data flow

```
image bytes / path
        │
        ▼
  decode (canvas or OpenCV)
        │
        ▼
  in-memory bitmap (Mat or canvas)
        │
        ▼
  pipeline operations (ordered, chainable)
        │
        ▼
  encode → bytes / canvas / Mat back to the caller
```

The library reads its input, transforms a bitmap in memory, and returns the
result. On the Node side it may read a file path the caller supplies. It does
not write files, and it makes no network requests.

## Why it is split this way

Keeping OpenCV behind `ImageProcessor` and canvas work behind
`CanvasProcessor` lets the two backends evolve and ship independently, and lets
the canvas-only entry points stay small. The pipeline registry keeps each
operation isolated and individually testable, which is what the contribution
guide's test requirement leans on.
