# llm-sse

> Parse streaming responses from OpenAI, Anthropic and Gemini into one unified event format. Text and tool-call deltas, handled. **Zero dependencies.**

Each provider streams differently. OpenAI sends `choices[].delta` chunks, Anthropic sends typed `content_block_*` / `message_*` events, Gemini sends `candidates[].content.parts` — and the SSE framing, tool-call argument fragments and stop reasons are all shaped differently. `llm-sse` turns any of them into the same small set of events, so your streaming UI or agent loop stays provider-agnostic.

```ts
import { parseOpenAIStream, collectStream } from 'llm-sse';

const res = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${key}`,
    'content-type': 'application/json',
  },
  body: JSON.stringify({ model, messages, stream: true }),
});

for await (const event of parseOpenAIStream(res.body)) {
  if (event.type === 'text') process.stdout.write(event.text);
}
```

## Why

- **One event shape, three providers.** `text`, `tool_call_start`, `tool_call_delta`, `finish`, `error` — the same whether the bytes came from OpenAI, Anthropic or Gemini.
- **Tool calls just accumulate.** Streamed JSON argument fragments carry an `index`; concatenate by index (or let `collectStream` do it) to get the full call.
- **Correct SSE framing.** Robust to chunk boundaries splitting a line or event mid-way, CRLF, multi-line `data:` fields, comments and keep-alives.
- **Bytes or strings.** Feed it a `fetch()` `ReadableStream<Uint8Array>`, a Node stream, or an async iterable of strings — multibyte UTF-8 split across chunks is handled.
- **Zero dependencies**, ESM + CJS, fully typed.

## Install

```sh
npm install llm-sse
```

## API

### `parseOpenAIStream(source)` · `parseAnthropicStream(source)` · `parseGeminiStream(source)`

Each takes a `source` (`AsyncIterable<Uint8Array | string>` — `fetch().body` satisfies this) and returns an `AsyncGenerator<StreamEvent>`.

> Gemini: use the SSE form of the streaming endpoint (`streamGenerateContent?alt=sse`).

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

> `reasoning` carries the model's thinking — Anthropic extended thinking (`thinking_delta`) and Gemini `thought` parts — separately from `text`, so you can render it in its own affordance or drop it.

### `collectStream(events)`

Drains an event stream into a single message:

```ts
const { text, toolCalls, finishReason } = await collectStream(
  parseAnthropicStream(res.body),
);
// toolCalls: { index, id?, name?, arguments }[]  — arguments is the joined JSON string
```

### `sseData(source)`

The underlying SSE parser, exported for advanced use: yields the `data` payload of each event as a string.

## Tool calls

All three providers are normalized to the same pattern: a `tool_call_start` (with `index`, and `id` / `name` when available) followed by one or more `tool_call_delta`s whose `argumentsDelta` strings concatenate into the call's JSON arguments. OpenAI and Anthropic fragment the arguments; Gemini sends them whole in a single delta. `collectStream` joins them for you.

## Related

- [`tool-schema`](https://www.npmjs.com/package/tool-schema) — convert a JSON Schema into OpenAI / Anthropic / Gemini / MCP tool schemas.
- [`llm-messages`](https://www.npmjs.com/package/llm-messages) — convert conversations and responses between providers.
- [`llm-errors`](https://www.npmjs.com/package/llm-errors) — normalize provider errors into one shape.

## License

MIT © Sebastian Legarraga
