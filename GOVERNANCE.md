# Governance

`llm-sse` is an independent open-source project. Governance is designed to keep
the parser small and dependable while making it possible for trusted
contributors to take real ownership.

## Current maintainer

- [Sebastian Legarraga](https://github.com/slegarraga) — project direction,
  releases, security response, and repository administration.

The project currently has a single maintainer. Expanding the maintainer group is
an explicit goal, not a prerequisite contributors must wait for.

## How decisions are made

- Bug fixes and small, backward-compatible improvements are decided through
  pull-request review.
- New provider formats, normalized event variants, and breaking changes should
  start with a public issue or discussion.
- Decisions prioritize primary provider documentation, reproducible fixtures,
  interoperability, security, and maintenance cost.
- If reasonable contributors disagree, the maintainer records the tradeoff and
  decision publicly rather than moving the discussion to a private channel.

## Roles

### Contributor

Anyone who reports a reproducible issue, improves documentation, supplies a
sanitized fixture, or lands a code change.

### Reviewer

A contributor who understands an area of the project and regularly helps review
changes or triage issues. Reviewers may be listed in the repository and invited
to relevant reviews.

### Maintainer

A trusted reviewer with sustained, constructive involvement who can merge
changes, manage issues, and help prepare releases. Maintainers are expected to:

- uphold the code of conduct and security policy;
- require tests and primary-source evidence for provider behavior changes;
- disclose conflicts of interest;
- avoid merging their own substantial changes without another review when a
  second maintainer is available;
- preserve the project's zero-dependency and compatibility commitments.

Maintainer access is offered based on demonstrated judgment, reliability,
project need, and mutual agreement. It is never exchanged for sponsorship,
stars, or a fixed number of pull requests.

## Releases

Releases follow Semantic Versioning. The release workflow reruns type checking,
linting, tests, and the build before publishing with npm provenance. Breaking
changes require a migration note.

## Security and conduct

Security reports follow [SECURITY.md](./SECURITY.md). Community behavior follows
[CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md). A maintainer involved in a conduct
or security concern should recuse themselves when another trusted reviewer is
available.

## Changes to governance

Governance changes use the same public pull-request process as code changes and
should explain the problem they solve.
