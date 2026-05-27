<!--
Thanks for opening a PR against ppu-ocv! Please fill out the three
sections below. Keep it short — a couple of sentences each is fine for
small changes. Bigger changes deserve a bit more context.
-->

## What

<!--
What does this PR change? One or two sentences, in plain language.
If this fixes an issue, link it: "Fixes #123".

Examples:
- Adds a new `morphologicalGradient` operation to the pipeline.
- Fixes crash in `findRegions` when the input canvas is 1px wide.
- Bumps `@techstark/opencv-js` peer from ^4.9 to ^4.10.
-->

## Why

<!--
Why is this change worth making?

If it's a bug fix, describe the symptom the user was seeing and what the
root cause turned out to be. If it's a feature, explain the use case that
motivated it. If it's a performance change, include numbers.

Avoid restating *what* you did — focus on *why* it's worth merging.
-->

## How

<!--
How does the change work? Point readers at the key files and the design
choices that aren't obvious from reading the diff. If you considered
other approaches, say why you picked this one.

For performance PRs, include before/after numbers from `bun task bench`.
-->

### Checklist

- [ ] Tests pass locally (`bun test`)
- [ ] Types are clean (`bun run type-check`)
- [ ] Format is clean (`bun run fmt`)
- [ ] Lint output reviewed (`bun run lint`)
- [ ] Benchmark run if this touches a hot operation (`bun task bench`)
- [ ] CHANGELOG updated under `## [Unreleased]` (or bump version if cutting a release)
- [ ] README updated if the public API or setup changed
- [ ] New tests added for bugs fixed or features added

### Compatibility

<!--
Tick the entries you've verified manually. Leave the rest unticked if you
haven't exercised them — reviewers will know what still needs checking.
-->

- [ ] Node.js entry (`ppu-ocv`) — `@napi-rs/canvas`
- [ ] Web entry (`ppu-ocv/web`) — browser OpenCV.js + Canvas
- [ ] Canvas entry (`ppu-ocv/canvas`) — Node canvas, no OpenCV
- [ ] Canvas-web entry (`ppu-ocv/canvas-web`) — browser canvas, no OpenCV
- [ ] macOS
- [ ] Linux
- [ ] Windows
- [ ] Android
- [ ] iOS

### Related

<!--
Optional: link related PRs, upstream issues, or docs.

- Closes #123
- Part of the operations registry rework in #45
-->
