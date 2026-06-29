# llm-sse

[![npm version](https://img.shields.io/npm/v/llm-sse.svg)](https://www.npmjs.com/package/llm-sse)
[![npm downloads](https://img.shields.io/npm/dm/llm-sse?logo=npm&label=downloads)](https://www.npmjs.com/package/llm-sse)
[![CI](https://github.com/slegarraga/llm-sse/actions/workflows/ci.yml/badge.svg)](https://github.com/slegarraga/llm-sse/actions/workflows/ci.yml)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/slegarraga/llm-sse/badge)](https://scorecard.dev/viewer/?uri=github.com/slegarraga/llm-sse)
[![install size](https://packagephobia.com/badge?p=llm-sse)](https://packagephobia.com/result?p=llm-sse)
[![bundle size](https://img.shields.io/bundlephobia/minzip/llm-sse?label=min%2Bgzip)](https://bundlephobia.com/package/llm-sse)
[![license](https://img.shields.io/npm/l/llm-sse.svg)](./LICENSE)
[![zero dependencies](https://img.shields.io/badge/dependencies-0-brightgreen.svg)](./package.json)

> Zero-dependency SSE parser that turns OpenAI, Anthropic, Gemini and any OpenAI-compatible stream into one unified event shape: text deltas, reasoning, tool-call fragments and finish reasons, handled the same way regardless of provider.

Security posture is tracked in [docs/security-posture.md](https://github.com/slegarraga/llm-sse/blob/main/docs/security-posture.md),
including CodeQL, OpenSSF Scorecard, Dependabot and branch rules.

Each provider streams differently. OpenAI sends `choices[].delta` chunks, Anthropic sends typed `content_block_*` / `message_*` events, Gemini sends `candidates[].content.parts` — and the SSE framing, tool-call argument fragments and stop reasons are all shaped differently. `llm-sse` turns any of them into the same small set of events, so your streaming UI or agent loop stays provider-agnostic.

## Quickstart

### OpenAI

```ts
import { parseOpenAIStream } from 'llm-sse';

const res = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${key}`,
    'content-type': 'application/json',
  },
  body: JSON.stringify({ model: 'gpt-4o', messages, stream: true }),
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

- **One event shape, three providers.** `text`, `tool_call_start`, `tool_call_delta`, `finish`, `error` — the same whether the bytes came from OpenAI, Anthropic or Gemini.
- **Tool calls just accumulate.** Streamed JSON argument fragments carry an `index`; concatenate by index (or let `collectStream` do it) to get the full call.
- **Correct SSE framing.** Robust to chunk boundaries splitting a line or event mid-way, CRLF, multi-line `data:` fields, comments and keep-alives.
- **Fixture-backed provider coverage.** Public OpenAI, Anthropic and Gemini `.sse` fixtures exercise text, reasoning, tool-call arguments and finish reasons.
- **Bytes or strings.** Feed it a `fetch()` `ReadableStream<Uint8Array>`, a Node stream, or an async iterable of strings — multibyte UTF-8 split across chunks is handled.
- **Zero dependencies**, ESM + CJS, fully typed.

## Why not the provider SDK?

The official SDKs (openai, @anthropic-ai/sdk, @google/generative-ai) each ship their own streaming abstraction, so combining two providers means learning two APIs and writing two adapter paths in your agent or UI. `llm-sse` is a thin, zero-dependency layer that normalizes the wire format only. You keep your own fetch/retry/auth logic, and every provider becomes the same three event types. If you are already using a provider SDK exclusively and do not plan to switch, the SDK's streaming helpers may be sufficient; this library is most useful when you need provider portability, a minimal footprint, or control over the HTTP layer.

## Install

```sh
npm install llm-sse
```

## API

### `parseOpenAIStream(source)` · `parseAnthropicStream(source)` · `parseGeminiStream(source)`

Each takes a `source` (`AsyncIterable<Uint8Array | string>` — `fetch().body` satisfies this) and returns an `AsyncGenerator<StreamEvent>`.

> Gemini: use the SSE form of the streaming endpoint (`streamGenerateContent?alt=sse`).

> **OpenAI-compatible providers** (Groq, DeepSeek, OpenRouter, Together, Fireworks, Ollama, ...) emit the same chunk format; use `parseOpenAIStream` for them. Reasoning models that stream `reasoning_content` (e.g. DeepSeek R1) surface as `reasoning` events.

### `parseStream(source, provider)`

Same thing, dispatching on `provider` (`'openai' | 'anthropic' | 'gemini'`).

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

> `reasoning` carries the model's thinking (Anthropic extended thinking `thinking_delta` and Gemini `thought` parts) separately from `text`, so you can render it in its own affordance or drop it.

### `collectStream(events)`

Drains an event stream into a single message:

```ts
const { text, reasoning, toolCalls, finishReason } = await collectStream(
  parseAnthropicStream(res.body),
);
// toolCalls: { index, id?, name?, arguments }[]  — arguments is the joined JSON string
```

### `toAssistantMessage(collected)`

Turn a collected stream into a standard OpenAI-shape assistant message — the format `llm-messages` treats as canonical — so a streamed response composes straight back into your history or into a different provider:

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

All three providers are normalized to the same pattern: a `tool_call_start` (with `index`, and `id` / `name` when available) followed by one or more `tool_call_delta`s whose `argumentsDelta` strings concatenate into the call's JSON arguments. OpenAI and Anthropic fragment the arguments; Gemini sends them whole in a single delta. `collectStream` joins them for you.

## Fixture corpus

The package includes a small public fixture corpus under [`fixtures/`](https://github.com/slegarraga/llm-sse/tree/main/fixtures):

- `openai-weather-tool.sse`
- `anthropic-weather-tool.sse`
- `gemini-weather-tool.sse`
- expected normalized events and collected messages under `fixtures/expected/`

Each fixture describes the same semantic turn: reasoning, visible text, a
`get_weather` tool call, JSON arguments and provider-specific finish reason.
The tests parse the fixtures directly, including byte-split stream boundaries,
so contributors can change parsers with a stable cross-provider contract.

## Related

- [`json-from-llm`](https://www.npmjs.com/package/json-from-llm): extract valid JSON from an LLM response, even inside reasoning tags, fenced blocks or prose
- [`tool-schema`](https://www.npmjs.com/package/tool-schema): convert a JSON Schema into a provider tool / function-calling schema for OpenAI, Anthropic, Gemini and MCP
- [`llm-messages`](https://www.npmjs.com/package/llm-messages): convert chat messages between OpenAI, Anthropic and Gemini formats
- [`llm-errors`](https://www.npmjs.com/package/llm-errors): normalize provider errors (rate limits, retries, status) into one shape

## License

MIT © Sebastian Legarraga
