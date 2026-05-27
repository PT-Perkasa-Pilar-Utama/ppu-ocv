# Security Policy

## Supported Versions

Only the latest release on npm and JSR is actively maintained. Security fixes are not backported to older major versions.

| Version | Supported |
| :------ | :-------- |
| Latest  | Yes       |
| Older   | No        |

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Email the maintainer at **awalariansyah7@gmail.com** with:

- A description of the vulnerability and its potential impact
- Steps to reproduce or a minimal proof-of-concept
- The version(s) of ppu-ocv affected
- Any suggested remediation, if you have one

You will receive an acknowledgment within **72 hours**. We aim to assess and respond to valid reports within **7 days**, and to publish a fix and advisory within **30 days** of confirmation.

## Scope

This library wraps OpenCV.js and `@napi-rs/canvas` for cross-platform image processing. The attack surface is narrow but includes:

- **Image input** — malformed image buffers passed to canvas decoders or OpenCV
- **Path traversal** — user-supplied paths to `ImageProcessor.prepareCanvas` / `loadImage` on the Node side
- **Dependency vulnerabilities** — issues in `@techstark/opencv-js`, `@napi-rs/canvas`, or browser canvas APIs

Out-of-scope reports:

- Vulnerabilities in `@techstark/opencv-js` or `@napi-rs/canvas` themselves — report those upstream
- Issues that require an attacker to already have write access to the host filesystem
- General questions or feature requests

## Dependency scanner notes

Static scanners (e.g. Socket) may flag an **"obfuscated code"** alert on this
package's dependencies. These are false positives on minified or
machine-generated artifacts, not malicious code:

- `@techstark/opencv-js` — ships the OpenCV WASM/asm.js build, a large
  **minified, machine-emitted** bundle that trips dense-code heuristics.
- `@napi-rs/canvas` — ships prebuilt **native binaries** per platform; these
  are compiled artifacts, not readable source.

These originate from the upstream packages, not from this SDK, and their deeper
analysis rates them low-risk with no evidence of exfiltration or tampering. No
action is required.

This package itself ships with **npm provenance** (a signed SLSA attestation
linking each release to the exact source commit and CI run) and runs **no
install scripts**.

## Verifying a release

Every release is published from CI with npm provenance, a signed SLSA
attestation that ties the tarball to the exact commit and workflow run that
built it. To verify what you installed:

```bash
# Check the provenance/signature of installed packages
npm audit signatures
```

On the package page at npmjs.com, the **Provenance** section links the release
to its source commit and the GitHub Actions run. A release artifact that lacks
a matching attestation should be treated as untrusted. Report it through the
process above.

## Dependencies

We keep the dependency tree small and deliberate. A new runtime dependency is
added only when it is necessary, actively maintained, and carries an OSI- or
FSF-approved license. The current runtime dependencies are
`@techstark/opencv-js` and `@napi-rs/canvas`.

Dependencies are declared in `package.json` and pinned in `bun.lock`. GitHub
Actions are pinned to commit SHAs. Dependabot opens update pull requests weekly
for both npm packages and Actions, and CI re-verifies the lockfile on every
pull request.

## Vulnerability remediation policy

We gate releases on automated analysis and act on findings against fixed
thresholds:

- **Dependency (SCA) findings.** CI runs a software-composition scan
  (`osv-scanner`) on every push and pull request. A **High or Critical**
  advisory in a dependency blocks the release until it is fixed, upgraded, or
  documented as non-exploitable (see VEX below). Lower-severity advisories are
  fixed within **30 days**.
- **Code (SAST) findings.** CodeQL runs on every push and pull request. Any
  **error-severity** finding blocks merge to `main`. Warning- and
  note-severity findings are triaged and fixed or dismissed with a recorded
  reason.

## VEX

When a scanner flags a vulnerability in a dependency that does **not** affect
ppu-ocv (the vulnerable code path is never reached), we record that with a
[VEX](https://www.cisa.gov/sites/default/files/2023-04/minimum-requirements-for-vex-508c.pdf)
statement in [`docs/vex/`](docs/vex/), in [OpenVEX](https://github.com/openvex)
format. This lets downstream users distinguish a real exposure from noise. As
of the current release there are no outstanding non-exploitable findings.

## Disclosure Policy

We follow responsible disclosure. Once a fix is released we will publish a GitHub Security Advisory describing the issue, affected versions, and the fix.
