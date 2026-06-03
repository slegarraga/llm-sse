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

  for await (const text of decodeChunks(source)) {
    buffer += text;

    let newline: number;
    while ((newline = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, newline).replace(/\r$/, '');
      buffer = buffer.slice(newline + 1);

      if (line === '') {
        // Blank line terminates an event.
        if (dataLines.length > 0) {
          yield dataLines.join('\n');
          dataLines = [];
        }
        continue;
      }
      if (line[0] === ':') {
        continue; // comment
      }
      if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).replace(/^ /, ''));
      }
    }
  }

  // A final event may arrive without a trailing blank line.
  const last = buffer.replace(/\r$/, '');
  if (last.startsWith('data:')) {
    dataLines.push(last.slice(5).replace(/^ /, ''));
  }
  if (dataLines.length > 0) {
    yield dataLines.join('\n');
  }
}
