# Roadmap

ppu-ocv is stable and in active maintenance. This roadmap states the direction
and the near-term priorities. It is a statement of intent, not a contract;
dates are deliberately omitted because a small team sets pace by capacity.

## Now (maintenance)

- Keep dependencies current and the supply chain hardened: Dependabot updates,
  pinned actions, npm provenance, the SCA and SAST gates in CI.
- Fix reported bugs and answer issues within the timeframes in
  [SECURITY.md](SECURITY.md).
- Hold test coverage at or above 90% (enforced in CI).

## Next

- Broaden the built-in operation set in `src/operations/` where there is clear
  demand (driven by issues), keeping each operation isolated and tested.
- Tighten the canvas-only path so more workflows can skip the OpenCV WASM and
  ship smaller bundles.
- Expand the browser and browser-extension usage docs and examples.

## Later

- Performance work on the hottest pipeline operations, with before/after
  benchmarks (`bun task bench`).
- Evaluate newer OpenCV.js builds as upstream releases them.

## Out of scope

- Turning ppu-ocv into a service, CLI, or model runner. It stays a library.
- Features outside image processing (OCR, layout analysis, and similar live in
  sibling packages).

## Proposing changes

Open an issue to discuss direction, or a pull request for a concrete change.
See [CONTRIBUTING.md](CONTRIBUTING.md) and [GOVERNANCE.md](GOVERNANCE.md).
