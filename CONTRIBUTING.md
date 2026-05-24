# Contributing to ppu-ocv

Thank you for taking the time to contribute. This document covers how to set up your environment, what checks are required before opening a PR, and the conventions we follow.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Code Quality](#code-quality)
- [How tests run](#how-tests-run)
- [Developer Certificate of Origin](#developer-certificate-of-origin)
- [Submitting a Pull Request](#submitting-a-pull-request)
- [Reporting Issues](#reporting-issues)

## Getting Started

1. **Fork** the repository on GitHub.
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/<your-username>/ppu-ocv.git
   cd ppu-ocv
   ```
3. **Install dependencies** (requires [Bun](https://bun.sh)):
   ```bash
   bun install
   ```
4. **Create a feature branch** off `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```

## Development Setup

The recommended development environment is Linux-based. macOS works fine too; Windows users may encounter path differences in some scripts.

Bun is the primary runtime and package manager. The CI pipeline pins Bun at **1.2.23** to dodge a known SIGILL/segfault in the 1.3.x test runner — use the same version locally to avoid false failures:

```bash
curl -fsSL https://bun.sh/install | bash -s "bun-v1.2.23"
```

Pre-commit hooks are set up via Husky and run automatically after `bun install`. They enforce formatting and run lint-staged before every commit.

## Making Changes

- Keep changes focused. One feature or bug fix per PR makes review faster.
- **Any change to behavior must add or update tests.** New operations, bug
  fixes, and changes to the public API or pipeline all require test coverage in
  the same PR. A reviewer will ask for tests before merging if they are missing.
- Update `README.md` if you change public-facing options, defaults, or the setup steps.
- Add an entry under `## [Unreleased]` in `CHANGELOG.md` for user-visible changes.

### What we accept

A pull request is ready to merge when it:

- solves one clearly described problem and links its issue (if any);
- passes every check in [Code Quality](#code-quality) and the required CI run;
- adds or updates tests for the behavior it changes;
- keeps the public API stable, or documents the break and bumps the version
  accordingly;
- carries a signed-off commit (see [Developer Certificate of Origin](#developer-certificate-of-origin)).

Maintainers may decline changes that broaden scope beyond image processing,
add heavy dependencies, or regress performance without justification.

## How tests run

`bun test` runs the suite locally. CI runs the same suite on every push and
pull request to `main`, and the `Quality Checks and Tests` job is a **required
status check**: a pull request cannot merge until it passes. Coverage is
collected on each run (`bun run test --coverage`). Run the tests locally before
pushing so CI only confirms what you already know.

## Developer Certificate of Origin

Every commit must be signed off under the [Developer Certificate of Origin
(DCO)](https://developercertificate.org/). The sign-off is your statement that
you wrote the change, or have the right to submit it under the project's MIT
license.

Add it with `-s`:

```bash
git commit -s -m "fix: correct deskew angle on portrait images"
```

This appends a trailer to your commit message:

```
Signed-off-by: Your Name <you@example.com>
```

Commits without a sign-off will be asked to amend before merge
(`git commit --amend -s`).

## Code Quality

All of the following must pass before a PR can be merged. CI enforces them automatically (lint is currently non-blocking while legacy violations are cleaned up), but run them locally first:

| Check           | Command              |
| :-------------- | :------------------- |
| Tests           | `bun test`           |
| Build + Tests   | `bun run build:test` |
| Linting         | `bun run lint`       |
| Auto-fix lint   | `bun run lint:fix`   |
| Formatting      | `bun run fmt`        |
| Auto-fix format | `bun run fmt:fix`    |
| Type check      | `bun run type-check` |

If your change touches OpenCV operations, the canvas processor, or pipeline registry, run the benchmark and include before/after numbers in your PR:

```bash
bun task bench
```

## Submitting a Pull Request

1. Push your branch to your fork.
2. Open a pull request against `main` on the upstream repo.
3. Fill out the PR template completely — the "What / Why / How" sections and checklist.
4. CI will run automatically. Fix any failures before requesting review.
5. A maintainer will review your PR. Address feedback, then request a re-review.

PRs are squash-merged. Write a clean commit message for the squash — the PR title becomes the commit subject. Conventional Commits format is enforced by the commit-msg hook (`feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`, `perf:`).

## Reporting Issues

Use the [GitHub issue tracker](https://github.com/PT-Perkasa-Pilar-Utama/ppu-ocv/issues). Issue templates are available for bug reports, feature requests, and documentation gaps.

For security vulnerabilities, **do not open a public issue** — see [SECURITY.md](SECURITY.md) instead.

Please follow our [Code of Conduct](CODE_OF_CONDUCT.md) in all interactions.
