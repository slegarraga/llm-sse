import { describe, expect, it } from 'vitest';
import { collectStream, parseAnthropicStream } from '../src/index.ts';
import { anthropicBody, byteChunks, chunks, drain } from './helpers.ts';

const STREAM = anthropicBody([
  { type: 'message_start', message: { id: 'msg_1', role: 'assistant' } },
  {
    type: 'content_block_start',
    index: 0,
    content_block: { type: 'text', text: '' },
  },
  {
    type: 'content_block_delta',
    index: 0,
    delta: { type: 'text_delta', text: 'Hello' },
  },
  {
    type: 'content_block_delta',
    index: 0,
    delta: { type: 'text_delta', text: ' world' },
  },
  { type: 'content_block_stop', index: 0 },
  {
    type: 'content_block_start',
    index: 1,
    content_block: {
      type: 'tool_use',
      id: 'toolu_1',
      name: 'get_weather',
      input: {},
    },
  },
  {
    type: 'content_block_delta',
    index: 1,
    delta: { type: 'input_json_delta', partial_json: '{"city":' },
  },
  {
    type: 'content_block_delta',
    index: 1,
    delta: { type: 'input_json_delta', partial_json: '"SF"}' },
  },
  { type: 'content_block_stop', index: 1 },
  { type: 'message_delta', delta: { stop_reason: 'tool_use' } },
  { type: 'message_stop' },
]);

describe('anthropic stream', () => {
  it('emits text, tool-call and finish events, ignoring event: lines', async () => {
    const events = await drain(parseAnthropicStream(chunks(STREAM)));
    expect(events).toEqual([
      { type: 'text', text: 'Hello' },
      { type: 'text', text: ' world' },
      { type: 'tool_call_start', index: 1, id: 'toolu_1', name: 'get_weather' },
      { type: 'tool_call_delta', index: 1, argumentsDelta: '{"city":' },
      { type: 'tool_call_delta', index: 1, argumentsDelta: '"SF"}' },
      { type: 'finish', reason: 'tool_use' },
    ]);
  });

  it('collects into a message, preserving the tool block index', async () => {
    const message = await collectStream(
      parseAnthropicStream(byteChunks(STREAM)),
    );
    expect(message.text).toBe('Hello world');
    expect(message.finishReason).toBe('tool_use');
    expect(message.toolCalls).toEqual([
      {
        index: 1,
        id: 'toolu_1',
        name: 'get_weather',
        arguments: '{"city":"SF"}',
      },
    ]);
  });

  it('is robust to byte chunk boundaries', async () => {
    const message = await collectStream(
      parseAnthropicStream(byteChunks(STREAM, 3)),
    );
    expect(message.text).toBe('Hello world');
    expect(message.toolCalls[0]?.arguments).toBe('{"city":"SF"}');
  });

  it('surfaces an error event', async () => {
    const body = anthropicBody([
      {
        type: 'error',
        error: { type: 'overloaded_error', message: 'Overloaded' },
      },
    ]);
    const events = await drain(parseAnthropicStream(chunks(body)));
    expect(events).toEqual([
      {
        type: 'error',
        error: { type: 'overloaded_error', message: 'Overloaded' },
      },
    ]);
  });

  it('ignores malformed tool events without losing valid deltas', async () => {
    const body = anthropicBody([
      {
        type: 'content_block_start',
        index: 'bad',
        content_block: { type: 'tool_use', id: 12, name: { bad: true } },
      },
      {
        type: 'content_block_delta',
        index: 'bad',
        delta: { type: 'input_json_delta', partial_json: '{"bad":true}' },
      },
      {
        type: 'content_block_delta',
        index: 0,
        delta: { type: 'unknown_delta', text: 'ignored' },
      },
      {
        type: 'content_block_delta',
        index: 0,
        delta: { type: 'text_delta', text: 'ok' },
      },
      {
        type: 'content_block_delta',
        index: 0,
        delta: { type: 'thinking_delta', thinking: ' thoughts' },
      },
      {
        type: 'content_block_start',
        index: 1,
        content_block: { type: 'tool_use', id: 'toolu_valid', name: 'lookup' },
      },
      {
        type: 'content_block_delta',
        index: 1,
        delta: { type: 'input_json_delta', partial_json: '{"city":"SF"}' },
      },
      { type: 'message_delta', delta: { stop_reason: { bad: true } } },
      { type: 'message_delta', delta: { stop_reason: 'tool_use' } },
    ]);

    const events = await drain(parseAnthropicStream(chunks(body)));
    expect(events).toEqual([
      { type: 'text', text: 'ok' },
      { type: 'reasoning', text: ' thoughts' },
      { type: 'tool_call_start', index: 1, id: 'toolu_valid', name: 'lookup' },
      { type: 'tool_call_delta', index: 1, argumentsDelta: '{"city":"SF"}' },
      { type: 'finish', reason: 'tool_use' },
    ]);
  });
});
