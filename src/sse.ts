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
  // The SSE spec strips one leading BOM. TextDecoder already does this for
  // byte chunks; this covers sources that yield strings.
  let atStart = true;

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

  const processLine = (line: string): string | undefined => {
    if (line === '') {
      return finishEvent();
    }
    addLine(line);
    return undefined;
  };

  for await (const text of decodeChunks(source)) {
    if (atStart && text.length > 0) {
      atStart = false;
      buffer += text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
    } else {
      buffer += text;
    }

    while (buffer.length > 0) {
      const cr = buffer.indexOf('\r');
      const lf = buffer.indexOf('\n');
      let newline: number;

      if (cr === -1) {
        newline = lf;
      } else if (lf === -1) {
        newline = cr;
      } else {
        newline = Math.min(cr, lf);
      }

      if (newline === -1) {
        break;
      }

      const newlineChar = buffer[newline];
      if (newlineChar === '\r' && newline === buffer.length - 1) {
        break;
      }

      const line = buffer.slice(0, newline);
      const nextIsLf = newlineChar === '\r' && buffer[newline + 1] === '\n';
      buffer = buffer.slice(newline + (nextIsLf ? 2 : 1));

      const data = processLine(line);
      if (data !== undefined) {
        yield data;
      }
    }
  }

  // A final event may arrive without a trailing blank line.
  const last = buffer.endsWith('\r') ? buffer.slice(0, -1) : buffer;
  if (last !== '') {
    addLine(last);
  }
  const data = finishEvent();
  if (data !== undefined) {
    yield data;
  }
}
