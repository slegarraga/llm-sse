# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
