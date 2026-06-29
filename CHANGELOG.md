# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.4.9] - 2026-06-29

### Changed

- Documentation: replace em dashes with standard punctuation for consistent house style.

## [0.4.8] - 2026-06-29

### Changed

- Documentation: add provider-SDK recipes (OpenAI, Anthropic, Vercel AI SDK), a "why not alternatives" section, complete cross-links to the sibling packages, and install / bundle-size badges. No code changes.

## [0.4.7] - 2026-06-29

### Fixed

- The npm package page showed a broken "resource not found" downloads badge after the self-hosted badge JSON was removed. The README now uses shields.io's native `npm/dm` badge, which renders the live download count directly on npm.

## [0.4.6] - 2026-06-12

### Fixed

- Parse SSE streams that use bare carriage-return line endings, and preserve
  correct CRLF handling when line endings are split across chunks.
- Strip a leading byte-order mark from string chunk sources, as the SSE spec
  requires (byte sources were already covered by `TextDecoder`).

## [0.4.5] - 2026-06-11

### Changed

- Published README download badge updates so the npm package page shows the refreshed 30-day download badge.

## [0.4.4] - 2026-06-07

### Changed

- Hardened streaming parsers around malformed JSON-like events, whitespace-padded
  `[DONE]` sentinels, malformed Anthropic/OpenAI tool-call entries, malformed
  Gemini parts and OpenAI chunks containing multiple choices.
- Documented parser caveats for non-JSON keep-alives, malformed JSON recovery,
  malformed provider event shapes and OpenAI multi-choice chunks.

## [0.4.3] - 2026-06-05

### Added

- Added a public cross-provider stream fixture corpus for OpenAI, Anthropic and
  Gemini weather-tool calls.
- Added tests that parse the corpus and compare normalized `StreamEvent[]` and
  collected message outputs, including byte-split stream boundaries.
- Published the `fixtures/` directory in the npm package for downstream parser
  and agent-loop tests.

## [0.4.2] - 2026-06-04

### Changed

- Updated vulnerable development tooling and added CodeQL, OpenSSF Scorecard,
  pinned GitHub Actions, least-privilege workflow permissions, Dependabot config
  and a Scorecard README badge.

## [0.4.1] - 2026-06-04

### Changed

- Published README package-status badges, download visibility and release notes
  to the npm package page.

## [0.4.0] - 2026-06-03

### Added

- Map OpenAI-compatible `reasoning_content` / `reasoning` deltas to `reasoning`
  events, so `parseOpenAIStream` works with reasoning models on OpenAI-compatible
  endpoints (DeepSeek R1, etc.).
- Documented that the OpenAI parser works with any OpenAI-compatible streaming
  endpoint (Groq, DeepSeek, OpenRouter, Together, Fireworks, Ollama, …).

## [0.3.0] - 2026-06-03

### Added

- `toAssistantMessage(collected)` — turn a collected stream into a standard
  OpenAI-shape assistant message (the canonical hub format), so a streamed
  response composes directly with `llm-messages`' `toAnthropic` / `toGemini`.
  Synthesizes ids for tool calls that lack one.

## [0.2.0] - 2026-06-03

### Added

- `reasoning` stream event for model thinking, kept separate from `text`. Maps
  Anthropic `thinking_delta` and Gemini `thought` parts.
- `CollectedMessage.reasoning` — reasoning deltas accumulated by `collectStream`.

## [0.1.0] - 2026-06-03

### Added

- `parseOpenAIStream`, `parseAnthropicStream`, `parseGeminiStream` and the
  `parseStream(source, provider)` dispatcher — parse a provider stream into a
  unified `AsyncGenerator<StreamEvent>`.
- `StreamEvent` model: `text`, `tool_call_start`, `tool_call_delta`, `finish`,
  `error`.
- `collectStream(events)` — drain a stream into `{ text, toolCalls, finishReason }`.
- `sseData(source)` — a robust SSE parser exported for advanced use.
- Handles chunk-boundary splitting, CRLF, multi-line `data:` fields, comments,
  and `Uint8Array` or string sources.
- Zero runtime dependencies; ESM + CJS builds with type declarations.

[0.4.0]: https://github.com/slegarraga/llm-sse/releases/tag/v0.4.0
[0.3.0]: https://github.com/slegarraga/llm-sse/releases/tag/v0.3.0
[0.2.0]: https://github.com/slegarraga/llm-sse/releases/tag/v0.2.0
[0.1.0]: https://github.com/slegarraga/llm-sse/releases/tag/v0.1.0
