# Contributing to llm-sse

Thanks for taking the time to contribute. This project aims to be a small,
dependable, zero-dependency building block, so the bar for changes is clarity
and correctness over breadth.

## Getting started

```sh
git clone https://github.com/slegarraga/llm-sse.git
cd llm-sse
npm install
```

## Development workflow

Every change should keep the full check suite green:

```sh
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm test            # vitest
npm run build       # tsup (ESM + CJS + types)
npm run format      # prettier --write
```

Run `npm run test:watch` while developing.

## Pull requests

1. Fork the repo and create a branch from `main` (e.g. `fix/gemini-tool-index`).
2. Add or update tests. New behaviour without a test will not be merged.
3. Make sure `typecheck`, `lint`, `test` and `build` all pass.
4. Keep the public API surface small and documented with JSDoc.
5. Open a pull request describing the provider stream shape you are handling.

## Commit messages

This project uses [Conventional Commits](https://www.conventionalcommits.org/).
Examples:

```
feat(anthropic): handle thinking_delta blocks
fix(sse): join multi-line data fields per spec
docs: clarify the tool-call delta model
test: cover chunk boundaries splitting an event
chore: bump dev dependencies
```

The type drives the next version bump (`fix` -> patch, `feat` -> minor, a
`!` or `BREAKING CHANGE` footer -> major).

## Reporting bugs

Open an issue with a minimal reproduction: the raw stream bytes (or the `data:`
lines) from the provider, which provider produced them, and the `StreamEvent`s
you expected. A failing test case is the most useful form a bug report can take.

## Scope and philosophy

- Zero runtime dependencies. A dependency needs an exceptional justification.
- Parsing is total: malformed or non-JSON `data:` lines are skipped, never
  thrown, so one bad keep-alive can't break a stream.
- Event mapping is grounded in official provider documentation. When you add or
  change a rule, link the source in the PR.
