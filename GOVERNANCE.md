# Governance

This document describes who maintains ppu-ocv, what each role may do, and how a
contributor earns more access.

## Maintainers

ppu-ocv is maintained by [PT Perkasa Pilar Utama](https://github.com/PT-Perkasa-Pilar-Utama).

| Role            | GitHub                                     | Responsibilities                                                       |
| :-------------- | :----------------------------------------- | :--------------------------------------------------------------------- |
| Lead maintainer | [@snowfluke](https://github.com/snowfluke) | Releases, security response, final review, repository and org settings |

The lead maintainer holds admin on the repository. No one else has write access
to `main`; outside contributions arrive through pull requests from forks.

## Roles and permissions

| Role        | Access                                   | Granted to                                 |
| :---------- | :--------------------------------------- | :----------------------------------------- |
| Contributor | Fork + open PRs                          | Anyone                                     |
| Triager     | Label and triage issues                  | Trusted contributors, by maintainer invite |
| Maintainer  | Merge PRs, cut releases, change settings | By maintainer decision (see below)         |

"Sensitive resources" for this project are: the npm and JSR publish
credentials (held only by CI via OIDC, never by a person), the GitHub
repository admin settings, and the org membership. Only the lead maintainer can
change any of these.

## Granting escalated permissions

Write access and any role above Contributor are not automatic. Before a
contributor receives merge rights, the lead maintainer reviews their track
record: merged pull requests, code-review quality, and adherence to the
[contribution guide](CONTRIBUTING.md). The decision and the new permission are
recorded by updating this file in a pull request, so the change is itself
reviewed and auditable.

Permissions are removed the same way when someone steps back.

## Decision making

Day-to-day changes go through the normal pull-request flow: open a PR, pass CI,
get a maintainer review. Disagreements are resolved in the pull request or
issue thread. The lead maintainer has the final call on scope, API design, and
release timing.

## Changing this document

Amend governance by opening a pull request against this file. The lead
maintainer must approve it before it merges.
