import { mapAnthropic } from './providers/anthropic.ts';
import { mapGemini } from './providers/gemini.ts';
import { mapOpenAI } from './providers/openai.ts';
import { sseData } from './sse.ts';
import type { ChunkSource, Provider, StreamEvent } from './types.ts';

/** Shared SSE-to-events driver for the stateless providers. */
async function* parseWith(
  source: ChunkSource,
  map: (payload: any) => StreamEvent[],
): AsyncGenerator<StreamEvent> {
  for await (const data of sseData(source)) {
    if (data === '[DONE]') {
      return;
    }
    let payload: unknown;
    try {
      payload = JSON.parse(data);
    } catch {
      continue; // ignore keep-alive / non-JSON data lines
    }
    for (const event of map(payload)) {
      yield event;
    }
  }
}

/** Parse an OpenAI Chat Completions stream into normalized events. */
export function parseOpenAIStream(
  source: ChunkSource,
): AsyncGenerator<StreamEvent> {
  return parseWith(source, mapOpenAI);
}

/** Parse an Anthropic Messages stream into normalized events. */
export function parseAnthropicStream(
  source: ChunkSource,
): AsyncGenerator<StreamEvent> {
  return parseWith(source, mapAnthropic);
}

/** Parse a Gemini `streamGenerateContent` (SSE) stream into normalized events. */
export async function* parseGeminiStream(
  source: ChunkSource,
): AsyncGenerator<StreamEvent> {
  const state = { toolIndex: 0 };
  for await (const data of sseData(source)) {
    if (data === '[DONE]') {
      return;
    }
    let payload: unknown;
    try {
      payload = JSON.parse(data);
    } catch {
      continue;
    }
    for (const event of mapGemini(payload, state)) {
      yield event;
    }
  }
}

/** Parse a provider stream into normalized events, dispatching on `provider`. */
export function parseStream(
  source: ChunkSource,
  provider: Provider,
): AsyncGenerator<StreamEvent> {
  switch (provider) {
    case 'openai':
      return parseOpenAIStream(source);
    case 'anthropic':
      return parseAnthropicStream(source);
    case 'gemini':
      return parseGeminiStream(source);
  }
}
