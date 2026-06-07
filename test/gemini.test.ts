import { describe, expect, it } from 'vitest';
import { collectStream, parseGeminiStream } from '../src/index.ts';
import { chunks, drain, sseBody } from './helpers.ts';

const STREAM = sseBody([
  { candidates: [{ content: { parts: [{ text: 'Hello' }], role: 'model' } }] },
  { candidates: [{ content: { parts: [{ text: ' world' }] } }] },
  {
    candidates: [
      {
        content: {
          parts: [
            { functionCall: { name: 'get_weather', args: { city: 'SF' } } },
          ],
        },
        finishReason: 'STOP',
      },
    ],
  },
]);

describe('gemini stream', () => {
  it('emits text, a complete tool call, and finish', async () => {
    const events = await drain(parseGeminiStream(chunks(STREAM)));
    expect(events).toEqual([
      { type: 'text', text: 'Hello' },
      { type: 'text', text: ' world' },
      { type: 'tool_call_start', index: 0, name: 'get_weather' },
      { type: 'tool_call_delta', index: 0, argumentsDelta: '{"city":"SF"}' },
      { type: 'finish', reason: 'STOP' },
    ]);
  });

  it('collects into a message', async () => {
    const message = await collectStream(parseGeminiStream(chunks(STREAM)));
    expect(message.text).toBe('Hello world');
    expect(message.finishReason).toBe('STOP');
    expect(message.toolCalls).toEqual([
      { index: 0, name: 'get_weather', arguments: '{"city":"SF"}' },
    ]);
  });

  it('numbers multiple tool calls in order of appearance', async () => {
    const body = sseBody([
      {
        candidates: [
          {
            content: {
              parts: [
                { functionCall: { name: 'a', args: {} } },
                { functionCall: { name: 'b', args: { x: 1 } } },
              ],
            },
          },
        ],
      },
    ]);
    const message = await collectStream(parseGeminiStream(chunks(body)));
    expect(message.toolCalls).toEqual([
      { index: 0, name: 'a', arguments: '{}' },
      { index: 1, name: 'b', arguments: '{"x":1}' },
    ]);
  });

  it('ignores malformed parts and function calls without losing valid parts', async () => {
    const body = sseBody([
      {
        candidates: [
          {
            content: {
              parts: [
                null,
                { functionCall: true },
                { functionCall: { args: { ignored: true } } },
                { functionCall: { name: 'valid', args: { ok: true } } },
                { text: ' done' },
              ],
            },
            finishReason: 'STOP',
          },
        ],
      },
    ]);

    const events = await drain(parseGeminiStream(chunks(body)));
    expect(events).toEqual([
      { type: 'tool_call_start', index: 0, name: 'valid' },
      { type: 'tool_call_delta', index: 0, argumentsDelta: '{"ok":true}' },
      { type: 'text', text: ' done' },
      { type: 'finish', reason: 'STOP' },
    ]);
  });
});
