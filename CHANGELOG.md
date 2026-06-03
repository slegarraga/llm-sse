# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[0.1.0]: https://github.com/slegarraga/llm-stream/releases/tag/v0.1.0
