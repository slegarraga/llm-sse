import { describe, expect, it } from 'vitest';
import { parseStream, sseData } from '../src/index.ts';
import { chunks, drain } from './helpers.ts';

describe('sseData framing', () => {
  it('yields each event data payload', async () => {
    const body = 'data: a\n\ndata: b\n\n';
    expect(await drain(sseData(chunks(body)))).toEqual(['a', 'b']);
  });

  it('reassembles events split across chunk boundaries', async () => {
    const body = 'data: hello\n\ndata: world\n\n';
    expect(await drain(sseData(chunks(body, 1)))).toEqual(['hello', 'world']);
  });

  it('handles CRLF line endings', async () => {
    const body = 'data: a\r\n\r\ndata: b\r\n\r\n';
    expect(await drain(sseData(chunks(body)))).toEqual(['a', 'b']);
  });

  it('joins multi-line data fields with newlines', async () => {
    const body = 'data: line1\ndata: line2\n\n';
    expect(await drain(sseData(chunks(body)))).toEqual(['line1\nline2']);
  });

  it('ignores comments and other SSE fields', async () => {
    const body = ': keep-alive\nevent: ping\ndata: x\nid: 1\n\n';
    expect(await drain(sseData(chunks(body)))).toEqual(['x']);
  });

  it('emits a final event without a trailing blank line', async () => {
    expect(await drain(sseData(chunks('data: last')))).toEqual(['last']);
  });

  it('produces nothing for an empty stream', async () => {
    expect(await drain(sseData(chunks('')))).toEqual([]);
  });
});

describe('parseStream dispatcher', () => {
  it('routes to the openai parser and stops at [DONE]', async () => {
    const body =
      'data: {"choices":[{"delta":{"content":"hi"}}]}\n\ndata: [DONE]\n\ndata: {"choices":[{"delta":{"content":"ignored"}}]}\n\n';
    const events = await drain(parseStream(chunks(body), 'openai'));
    expect(events).toEqual([{ type: 'text', text: 'hi' }]);
  });

  it('skips non-JSON data lines without throwing', async () => {
    const body =
      'data: not-json\n\ndata: {"choices":[{"delta":{"content":"ok"}}]}\n\n';
    const events = await drain(parseStream(chunks(body), 'openai'));
    expect(events).toEqual([{ type: 'text', text: 'ok' }]);
  });
});
