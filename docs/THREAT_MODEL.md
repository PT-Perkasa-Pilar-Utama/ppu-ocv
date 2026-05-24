# Threat model

This is a security assessment of ppu-ocv: where untrusted data enters, what
could go wrong on the critical paths, and how the design limits the damage. It
extends the scope section in [SECURITY.md](../SECURITY.md). Read
[DESIGN.md](DESIGN.md) first for the actors and data flow.

## Scope and assets

ppu-ocv is an in-process library. It holds no secrets, no credentials, and no
persistent state. The asset worth protecting is the **availability and
integrity of the host application** that embeds it: a bug here should not crash
the host, corrupt its memory, or let an attacker influence it through a crafted
image.

Publish credentials (npm, JSR) live only in CI and are issued per-release
through OIDC. No human or library code holds them, so they are out of scope for
the runtime threat model and covered instead by the release pipeline.

## Trust boundaries

1. **Image input → decoder.** The bytes or path the caller passes are
   untrusted. They cross into native code (OpenCV WASM, `@napi-rs/canvas`) at
   decode time.
2. **File path → filesystem (Node only).** `ImageProcessor.prepareCanvas` /
   `loadImage` can take a path. If the host application forwards an
   attacker-controlled string, that string reaches the filesystem.
3. **Dependency code → process.** The OpenCV WASM and native canvas run inside
   the host process with its privileges.

## Critical paths and threats

| #   | Path              | Threat                                                                                                               | Mitigation                                                                                                                                                                                                                          |
| :-- | :---------------- | :------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Image decode      | A malformed or hostile image triggers a crash, hang, or out-of-memory in the WASM/native decoder (denial of service) | Decoding runs in the upstream OpenCV/canvas libraries, which are pinned and updated via Dependabot. Callers should bound input size and run untrusted decoding off the main thread. Documented in SECURITY.md.                      |
| 2   | File path on Node | A host that passes untrusted input as a path enables path traversal or reading an unintended file                    | The library treats paths as opaque and does not sanitize them; SECURITY.md tells integrators never to pass untrusted strings as paths. This is the host's responsibility, stated explicitly.                                        |
| 3   | Pixel-buffer math | An operation mishandles dimensions and reads or writes past a buffer                                                 | Operations stay within OpenCV/canvas APIs that bound their own access; behavior is covered by the test suite, and changes require new tests.                                                                                        |
| 4   | Supply chain      | A compromised dependency or action injects code into the build or the published package                              | Dependencies and GitHub Actions are pinned (Scorecard Pinned-Dependencies and Token-Permissions at 10), releases carry npm provenance, the published tarball runs no install scripts, and CI gates on an SCA scan. See SECURITY.md. |

## What is explicitly out of scope

- Attacks that require write access to the host filesystem or the developer's
  machine.
- Vulnerabilities inside `@techstark/opencv-js` or `@napi-rs/canvas`
  themselves. Report those upstream; we track and bump them via Dependabot.
- Misuse by the host application, such as forwarding untrusted user input as a
  file path. The boundary and the host's duty are documented, but enforcement
  belongs to the host.

## Review cadence

The maintainer revisits this model when a new entry point, a new class of
operation, or a new runtime dependency changes the boundaries above. Material
changes land through a pull request like any other.
