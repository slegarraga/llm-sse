# llm-sse

[![npm version](https://img.shields.io/npm/v/llm-sse.svg)](https://www.npmjs.com/package/llm-sse)
[![npm downloads](https://img.shields.io/npm/dm/llm-sse?logo=npm&label=downloads)](https://www.npmjs.com/package/llm-sse)
[![CI](https://github.com/slegarraga/llm-sse/actions/workflows/ci.yml/badge.svg)](https://github.com/slegarraga/llm-sse/actions/workflows/ci.yml)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/slegarraga/llm-sse/badge)](https://scorecard.dev/viewer/?uri=github.com/slegarraga/llm-sse)
[![install size](https://packagephobia.com/badge?p=llm-sse)](https://packagephobia.com/result?p=llm-sse)
[![bundle size](https://img.shields.io/bundlephobia/minzip/llm-sse?label=min%2Bgzip)](https://bundlephobia.com/package/llm-sse)
[![license](https://img.shields.io/npm/l/llm-sse.svg)](./LICENSE)
[![zero dependencies](https://img.shields.io/badge/dependencies-0-brightgreen.svg)](./package.json)

> Zero-dependency SSE parser that turns OpenAI Responses, OpenAI Chat Completions, Anthropic, Gemini and OpenAI-compatible streams into one unified event shape: text deltas, reasoning, tool-call fragments and finish reasons, handled the same way regardless of provider.

Security posture is tracked in [docs/security-posture.md](https://github.com/slegarraga/llm-sse/blob/main/docs/security-posture.md),
including CodeQL, OpenSSF Scorecard, Dependabot and branch rules.

Each API streams differently. OpenAI Responses sends typed `response.*` events,
OpenAI Chat Completions sends `choices[].delta` chunks, Anthropic sends typed
`content_block_*` / `message_*` events, and Gemini sends
`candidates[].content.parts`. `llm-sse` turns all of them into the same small
set of events, so your streaming UI or agent loop stays provider-agnostic.

## Project

- [Roadmap](./ROADMAP.md): compatibility, conformance, and sustainability priorities
- [Contributing](./CONTRIBUTING.md): local setup, tests, and pull-request expectations
- [Governance](./GOVERNANCE.md): decision process and the path to reviewer or maintainer
- [Support](./SUPPORT.md): where to ask questions or report reproducible bugs
- [Security](./SECURITY.md): private vulnerability reporting and supported versions
- [Changelog](./CHANGELOG.md): release history and migration notes
- [Code of Conduct](./CODE_OF_CONDUCT.md): community standards

## Quickstart

### OpenAI Responses API

```ts
import { parseOpenAIResponsesStream } from 'llm-sse';

const res = await fetch('https://api.openai.com/v1/responses', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${key}`,
    'content-type': 'application/json',
  },
  body: JSON.stringify({
    model: process.env.OPENAI_MODEL,
    input: 'What is the weather in Santiago?',
    tools,
    stream: true,
  }),
});

for await (const event of parseOpenAIResponsesStream(res.body)) {
  if (event.type === 'text') process.stdout.write(event.text);
  if (event.type === 'tool_call_delta') {
    process.stderr.write(event.argumentsDelta);
  }
}
```

The parser follows the official
[Responses streaming event reference](https://platform.openai.com/docs/api-reference/responses-streaming),
including output text, reasoning summaries, function-call arguments,
refusal text, completion, incomplete responses, and errors. Refusal deltas use
the normalized `text` channel so provider-agnostic UIs do not drop the model's
response.

### OpenAI Chat Completions

```ts
import { parseOpenAIStream } from 'llm-sse';

const res = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${key}`,
    'content-type': 'application/json',
  },
  body: JSON.stringify({
    model: process.env.OPENAI_MODEL,
    messages,
    stream: true,
  }),
});

for await (const event of parseOpenAIStream(res.body)) {
  if (event.type === 'text') process.stdout.write(event.text);
}
```

### Anthropic

```ts
import { parseAnthropicStream } from 'llm-sse';

const res = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'x-api-key': key,
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json',
  },
  body: JSON.stringify({
    model: 'claude-opus-4-8',
    max_tokens: 1024,
    stream: true,
    messages,
  }),
});

for await (const event of parseAnthropicStream(res.body)) {
  if (event.type === 'text') process.stdout.write(event.text);
  if (event.type === 'reasoning') process.stderr.write(event.text); // extended thinking
}
```

### Gemini

```ts
import { parseGeminiStream } from 'llm-sse';

// Use the SSE endpoint: streamGenerateContent?alt=sse
const res = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${key}`,
  {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    }),
  },
);

for await (const event of parseGeminiStream(res.body)) {
  if (event.type === 'text') process.stdout.write(event.text);
}
```

### OpenAI-compatible providers (Groq, DeepSeek, Ollama, OpenRouter...)

Any provider that speaks the OpenAI chunk format works with `parseOpenAIStream`. DeepSeek R1 reasoning tokens surface as `reasoning` events automatically.

```ts
import { parseOpenAIStream } from 'llm-sse';

const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${key}`,
    'content-type': 'application/json',
  },
  body: JSON.stringify({
    model: 'llama-3.3-70b-versatile',
    messages,
    stream: true,
  }),
});

for await (const event of parseOpenAIStream(res.body)) {
  if (event.type === 'text') process.stdout.write(event.text);
}
```

## Why

- **One event shape, four streaming formats.** `text`, `reasoning`, `tool_call_start`, `tool_call_delta`, `finish`, and `error`, whether the bytes came from OpenAI Responses, OpenAI Chat Completions, Anthropic, or Gemini.
- **Tool calls just accumulate.** Streamed JSON argument fragments carry an `index`; concatenate by index (or let `collectStream` do it) to get the full call.
- **Correct SSE framing.** Robust to chunk boundaries splitting a line or event mid-way, CRLF, multi-line `data:` fields, comments and keep-alives.
- **Fixture-backed provider coverage.** Public OpenAI, Anthropic and Gemini `.sse` fixtures exercise text, reasoning, tool-call arguments and finish reasons.
- **Bytes or strings.** Feed it a `fetch()` `ReadableStream<Uint8Array>`, a Node stream, or an async iterable of strings. Multibyte UTF-8 split across chunks is handled.
- **Zero dependencies**, ESM + CJS, fully typed.

| Streaming source               | Parser                       | Text |     Reasoning     | Function calls | Finish and errors |
| ------------------------------ | ---------------------------- | :--: | :---------------: | :------------: | :---------------: |
| OpenAI Responses API           | `parseOpenAIResponsesStream` |  ✓   |         ✓         |       ✓        |         ✓         |
| OpenAI Chat Completions        | `parseOpenAIStream`          |  ✓   | compatible fields |       ✓        |         ✓         |
| Anthropic Messages             | `parseAnthropicStream`       |  ✓   |         ✓         |       ✓        |         ✓         |
| Gemini `streamGenerateContent` | `parseGeminiStream`          |  ✓   |         ✓         |       ✓        |         ✓         |

## Why not the provider SDK?

The official SDKs each ship their own streaming abstraction, so combining APIs
means learning multiple event models and writing multiple adapter paths in your
agent or UI. `llm-sse` is a thin, zero-dependency layer that normalizes the wire
format only. You keep your own fetch, retry, and authentication logic. If you
use one provider exclusively, its SDK helpers may be sufficient; this library is
most useful when you need provider portability, a minimal footprint, or control
over the HTTP layer.

## Install

```sh
npm install llm-sse
```

## API

### `parseOpenAIResponsesStream(source)`

Parses typed OpenAI Responses API SSE events. It maps
`response.output_text.delta`, reasoning deltas, function-call item and argument
events, and terminal response states into normalized events. The Responses
`output_index` is used as the normalized tool-call index.

### `parseOpenAIStream(source)` · `parseAnthropicStream(source)` · `parseGeminiStream(source)`

Each takes a `source` (`AsyncIterable<Uint8Array | string>`, `fetch().body` satisfies this) and returns an `AsyncGenerator<StreamEvent>`.

> Gemini: use the SSE form of the streaming endpoint (`streamGenerateContent?alt=sse`).

> **OpenAI-compatible providers** (Groq, DeepSeek, OpenRouter, Together, Fireworks, Ollama, ...) emit the same chunk format; use `parseOpenAIStream` for them. Reasoning models that stream `reasoning_content` (e.g. DeepSeek R1) surface as `reasoning` events.

### `parseStream(source, provider)`

Same thing, dispatching on `provider`
(`'openai-responses' | 'openai' | 'anthropic' | 'gemini'`).

### `StreamEvent`

```ts
type StreamEvent =
  | { type: 'text'; text: string }
  | { type: 'reasoning'; text: string } // extended thinking, kept apart from text
  | { type: 'tool_call_start'; index: number; id?: string; name?: string }
  | { type: 'tool_call_delta'; index: number; argumentsDelta: string }
  | { type: 'finish'; reason?: string }
  | { type: 'error'; error: unknown };
```

> `reasoning` carries OpenAI reasoning text or summaries, Anthropic extended
> thinking, and Gemini thought parts separately from `text`, so you can render
> it in its own affordance or drop it.

### `collectStream(events)`

Drains an event stream into a single message:

```ts
const { text, reasoning, toolCalls, finishReason } = await collectStream(
  parseAnthropicStream(res.body),
);
// toolCalls: { index, id?, name?, arguments }[], arguments is the joined JSON string
```

### `toAssistantMessage(collected)`

Turn a collected stream into a standard OpenAI-shape assistant message, the format `llm-messages` treats as canonical, so a streamed response composes straight back into your history or into a different provider:

```ts
import { collectStream, toAssistantMessage } from 'llm-sse';
import { toAnthropic } from 'llm-messages';

const message = toAssistantMessage(
  await collectStream(parseOpenAIStream(res.body)),
);
const claudeBody = toAnthropic([...history, message]); // continue on Claude
```

### `sseData(source)`

The underlying SSE parser, exported for advanced use: yields the `data` payload of each event as a string.

## Recipes

### Consume a Node.js `http` / `https` response body

Node `IncomingMessage` is an async iterable of `Buffer`, which satisfies `AsyncIterable<Uint8Array>`:

```ts
import https from 'node:https';
import { parseOpenAIStream } from 'llm-sse';

function streamCompletion(options: https.RequestOptions, body: string) {
  return new Promise<void>((resolve, reject) => {
    const req = https.request(options, async (res) => {
      for await (const event of parseOpenAIStream(res)) {
        if (event.type === 'text') process.stdout.write(event.text);
      }
      resolve();
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}
```

### Agent tool-call loop

```ts
import { parseOpenAIStream, collectStream, toAssistantMessage } from 'llm-sse';

async function agentLoop(messages: unknown[]) {
  while (true) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ model: 'gpt-4o', messages, tools, stream: true }),
    });

    const collected = await collectStream(parseOpenAIStream(res.body));
    messages.push(toAssistantMessage(collected));

    if (!collected.toolCalls.length) {
      console.log(collected.text);
      break;
    }

    for (const call of collected.toolCalls) {
      const result = await dispatch(call.name, JSON.parse(call.arguments));
      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        content: JSON.stringify(result),
      });
    }
  }
}
```

### Provider-agnostic wrapper

```ts
import { parseStream, collectStream, type Provider } from 'llm-sse';

async function complete(provider: Provider, fetchBody: Response) {
  return collectStream(parseStream(fetchBody.body, provider));
}

// same call site for any provider
const result = await complete('anthropic', anthropicResponse);
const result2 = await complete('openai', openaiResponse);
```

## Caveats

- Non-JSON `data:` payloads are treated as keep-alives and skipped by provider parsers.
- JSON-looking malformed payloads surface as `error` events and parsing continues with later events.
- Provider parsers ignore SSE `event:` names and key off the JSON `data:` payload shape.
- Malformed provider event shapes are skipped when they cannot produce a valid normalized event.
- OpenAI chunks with multiple `choices` are emitted in provider order, but normalized events do not carry a choice index.

## Tool calls

All supported APIs are normalized to the same pattern: a `tool_call_start`
(with `index`, and `id` / `name` when available) followed by one or more
`tool_call_delta`s whose `argumentsDelta` strings concatenate into the call's
JSON arguments. OpenAI Responses uses its stable `output_index`; Chat
Completions and Anthropic stream argument fragments; Gemini sends arguments
whole in a single delta. `collectStream` joins them for you.

## Fixture corpus

The package includes a small public fixture corpus under [`fixtures/`](https://github.com/slegarraga/llm-sse/tree/main/fixtures):

- `openai-weather-tool.sse`
- `openai-responses-weather-tool.sse`
- `anthropic-weather-tool.sse`
- `gemini-weather-tool.sse`
- expected normalized events and collected messages under `fixtures/expected/`

Each fixture describes the same semantic turn: reasoning, visible text, a
`get_weather` tool call, JSON arguments and provider-specific finish reason.
The tests parse the fixtures directly, including byte-split stream boundaries,
so contributors can change parsers with a stable cross-provider contract.

## Community

Contributions are welcome, especially sanitized provider fixtures, reproducible
edge cases, interoperability examples, and review help. Start with
[CONTRIBUTING.md](./CONTRIBUTING.md), use
[Discussions](https://github.com/slegarraga/llm-sse/discussions) for design
questions, and see [GOVERNANCE.md](./GOVERNANCE.md) for how sustained
contributors can become reviewers or maintainers.

## Related

- [`json-from-llm`](https://www.npmjs.com/package/json-from-llm): extract valid JSON from an LLM response, even inside reasoning tags, fenced blocks or prose
- [`tool-schema`](https://www.npmjs.com/package/tool-schema): convert a JSON Schema into a provider tool / function-calling schema for OpenAI, Anthropic, Gemini and MCP
- [`llm-messages`](https://www.npmjs.com/package/llm-messages): convert chat messages between OpenAI, Anthropic and Gemini formats
- [`llm-errors`](https://www.npmjs.com/package/llm-errors): normalize provider errors (rate limits, retries, status) into one shape

## License

MIT © Sebastian Legarraga
