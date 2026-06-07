import type { ChunkSource } from './types.ts';

/**
 * Decode a mixed byte/string chunk source into text. `Uint8Array` chunks are
 * decoded with a streaming `TextDecoder` so a multibyte UTF-8 character split
 * across two chunks is reassembled correctly.
 */
async function* decodeChunks(source: ChunkSource): AsyncGenerator<string> {
  const decoder = new TextDecoder();
  for await (const chunk of source) {
    if (typeof chunk === 'string') {
      yield chunk;
    } else {
      const text = decoder.decode(chunk, { stream: true });
      if (text) {
        yield text;
      }
    }
  }
  const tail = decoder.decode();
  if (tail) {
    yield tail;
  }
}

/**
 * Parse a Server-Sent Events stream and yield the `data` payload of each event.
 *
 * Robust to the realities of streamed HTTP: events and lines split across
 * chunk boundaries are buffered until complete, multi-line `data:` fields are
 * joined with `\n` (per the SSE spec), and comments (`:`) and other fields
 * (`event:`, `id:`, `retry:`) are ignored — the payload's own `type` field is
 * what the provider parsers key on.
 */
export async function* sseData(source: ChunkSource): AsyncGenerator<string> {
  let buffer = '';
  let dataLines: string[] = [];

  const addLine = (line: string): void => {
    if (line[0] === ':') {
      return; // comment
    }

    const separator = line.indexOf(':');
    const field = separator === -1 ? line : line.slice(0, separator);
    let value = separator === -1 ? '' : line.slice(separator + 1);
    if (value.startsWith(' ')) {
      value = value.slice(1);
    }

    if (field === 'data') {
      dataLines.push(value);
    }
  };

  const finishEvent = (): string | undefined => {
    if (dataLines.length === 0) {
      return undefined;
    }
    const data = dataLines.join('\n');
    dataLines = [];
    return data;
  };

  for await (const text of decodeChunks(source)) {
    buffer += text;

    let newline: number;
    while ((newline = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, newline).replace(/\r$/, '');
      buffer = buffer.slice(newline + 1);

      if (line === '') {
        // Blank line terminates an event.
        const data = finishEvent();
        if (data !== undefined) {
          yield data;
        }
        continue;
      }
      addLine(line);
    }
  }

  // A final event may arrive without a trailing blank line.
  const last = buffer.replace(/\r$/, '');
  if (last !== '') {
    addLine(last);
  }
  const data = finishEvent();
  if (data !== undefined) {
    yield data;
  }
}
