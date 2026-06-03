import type { StreamEvent } from '../src/index.ts';

/** Yield a string as one chunk, or in fixed-size slices to exercise buffering. */
export async function* chunks(text: string, size = 0): AsyncGenerator<string> {
  if (size <= 0) {
    yield text;
    return;
  }
  for (let i = 0; i < text.length; i += size) {
    yield text.slice(i, i + size);
  }
}

/** Same as {@link chunks} but yields `Uint8Array`s, like a real `fetch` body. */
export async function* byteChunks(
  text: string,
  size = 0,
): AsyncGenerator<Uint8Array> {
  const encoded = new TextEncoder().encode(text);
  if (size <= 0) {
    yield encoded;
    return;
  }
  for (let i = 0; i < encoded.length; i += size) {
    yield encoded.subarray(i, i + size);
  }
}

/** Collect an async iterable into an array. */
export async function drain<T>(source: AsyncIterable<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const item of source) {
    out.push(item);
  }
  return out;
}

/** Build an SSE body of `data:` events from JSON payloads. */
export function sseBody(
  payloads: unknown[],
  { done = false }: { done?: boolean } = {},
): string {
  let body = payloads.map((p) => `data: ${JSON.stringify(p)}\n\n`).join('');
  if (done) {
    body += 'data: [DONE]\n\n';
  }
  return body;
}

/** Build an Anthropic-style SSE body with `event:` lines (which parsers ignore). */
export function anthropicBody(payloads: any[]): string {
  return payloads
    .map((p) => `event: ${p.type}\ndata: ${JSON.stringify(p)}\n\n`)
    .join('');
}

export type { StreamEvent };
