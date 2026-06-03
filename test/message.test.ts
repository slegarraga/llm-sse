import { describe, expect, it } from 'vitest';
import { toAssistantMessage } from '../src/index.ts';
import type { CollectedMessage } from '../src/index.ts';

const base: CollectedMessage = {
  text: '',
  reasoning: '',
  toolCalls: [],
  finishReason: undefined,
};

describe('toAssistantMessage', () => {
  it('produces a text-only assistant message', () => {
    expect(toAssistantMessage({ ...base, text: 'Hello' })).toEqual({
      role: 'assistant',
      content: 'Hello',
    });
  });

  it('uses null content when the turn was only tool calls', () => {
    const message = toAssistantMessage({
      ...base,
      toolCalls: [
        {
          index: 0,
          id: 'call_1',
          name: 'get_weather',
          arguments: '{"city":"SF"}',
        },
      ],
    });
    expect(message).toEqual({
      role: 'assistant',
      content: null,
      tool_calls: [
        {
          id: 'call_1',
          type: 'function',
          function: { name: 'get_weather', arguments: '{"city":"SF"}' },
        },
      ],
    });
  });

  it('synthesizes ids for tool calls that lack one (e.g. Gemini)', () => {
    const message = toAssistantMessage({
      ...base,
      text: 'Done',
      toolCalls: [
        { index: 0, name: 'a', arguments: '{}' },
        { index: 1, name: 'b', arguments: '' },
      ],
    });
    expect(message.content).toBe('Done');
    expect(message.tool_calls).toEqual([
      {
        id: 'call_0',
        type: 'function',
        function: { name: 'a', arguments: '{}' },
      },
      {
        id: 'call_1',
        type: 'function',
        function: { name: 'b', arguments: '{}' },
      },
    ]);
  });

  it('omits reasoning from the portable message', () => {
    const message = toAssistantMessage({
      ...base,
      text: 'Hi',
      reasoning: 'thinking...',
    });
    expect(message).not.toHaveProperty('reasoning');
    expect(message).toEqual({ role: 'assistant', content: 'Hi' });
  });
});
