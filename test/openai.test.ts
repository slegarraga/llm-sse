import { describe, expect, it } from 'vitest';
import { collectStream, parseOpenAIStream } from '../src/index.ts';
import { chunks, drain, sseBody } from './helpers.ts';

const STREAM = sseBody(
  [
    { choices: [{ delta: { role: 'assistant', content: '' }, index: 0 }] },
    { choices: [{ delta: { content: 'Hello' }, index: 0 }] },
    { choices: [{ delta: { content: ' world' }, index: 0 }] },
    {
      choices: [
        {
          delta: {
            tool_calls: [
              {
                index: 0,
                id: 'call_1',
                function: { name: 'get_weather', arguments: '' },
              },
            ],
          },
        },
      ],
    },
    {
      choices: [
        {
          delta: {
            tool_calls: [{ index: 0, function: { arguments: '{"city":' } }],
          },
        },
      ],
    },
    {
      choices: [
        {
          delta: {
            tool_calls: [{ index: 0, function: { arguments: '"SF"}' } }],
          },
        },
      ],
    },
    { choices: [{ delta: {}, finish_reason: 'tool_calls' }] },
  ],
  { done: true },
);

describe('openai stream', () => {
  it('emits text, tool-call and finish events', async () => {
    const events = await drain(parseOpenAIStream(chunks(STREAM)));
    expect(events).toEqual([
      { type: 'text', text: 'Hello' },
      { type: 'text', text: ' world' },
      { type: 'tool_call_start', index: 0, id: 'call_1', name: 'get_weather' },
      { type: 'tool_call_delta', index: 0, argumentsDelta: '{"city":' },
      { type: 'tool_call_delta', index: 0, argumentsDelta: '"SF"}' },
      { type: 'finish', reason: 'tool_calls' },
    ]);
  });

  it('emits events for every choice and skips malformed tool-call entries', async () => {
    const body = sseBody([
      {
        choices: [
          {
            delta: {
              content: 'first',
              tool_calls: [
                null,
                {
                  index: 0,
                  id: 'call_1',
                  function: { name: 'lookup', arguments: '{"a":1}' },
                },
              ],
            },
            finish_reason: 'stop',
          },
          {
            delta: { content: 'second', tool_calls: [false] },
            finish_reason: 'length',
          },
        ],
      },
    ]);

    const events = await drain(parseOpenAIStream(chunks(body)));
    expect(events).toEqual([
      { type: 'text', text: 'first' },
      { type: 'tool_call_start', index: 0, id: 'call_1', name: 'lookup' },
      { type: 'tool_call_delta', index: 0, argumentsDelta: '{"a":1}' },
      { type: 'finish', reason: 'stop' },
      { type: 'text', text: 'second' },
      { type: 'finish', reason: 'length' },
    ]);
  });

  it('collects into a message with joined tool arguments', async () => {
    const message = await collectStream(parseOpenAIStream(chunks(STREAM)));
    expect(message.text).toBe('Hello world');
    expect(message.finishReason).toBe('tool_calls');
    expect(message.toolCalls).toEqual([
      {
        index: 0,
        id: 'call_1',
        name: 'get_weather',
        arguments: '{"city":"SF"}',
      },
    ]);
  });

  it('is robust to arbitrary chunk boundaries', async () => {
    const events = await drain(parseOpenAIStream(chunks(STREAM, 1)));
    const text = events
      .filter((e) => e.type === 'text')
      .map((e) => (e as { text: string }).text)
      .join('');
    expect(text).toBe('Hello world');
    expect(events.at(-1)).toEqual({ type: 'finish', reason: 'tool_calls' });
  });
});
