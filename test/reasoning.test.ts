import { describe, expect, it } from 'vitest';
import {
  collectStream,
  parseAnthropicStream,
  parseGeminiStream,
} from '../src/index.ts';
import { anthropicBody, chunks, drain, sseBody } from './helpers.ts';

describe('reasoning / thinking', () => {
  it('maps Anthropic thinking_delta to reasoning, kept apart from text', async () => {
    const body = anthropicBody([
      {
        type: 'content_block_start',
        index: 0,
        content_block: { type: 'thinking' },
      },
      {
        type: 'content_block_delta',
        index: 0,
        delta: { type: 'thinking_delta', thinking: 'Let me think. ' },
      },
      {
        type: 'content_block_delta',
        index: 0,
        delta: { type: 'thinking_delta', thinking: 'OK.' },
      },
      { type: 'content_block_stop', index: 0 },
      {
        type: 'content_block_start',
        index: 1,
        content_block: { type: 'text', text: '' },
      },
      {
        type: 'content_block_delta',
        index: 1,
        delta: { type: 'text_delta', text: 'The answer.' },
      },
      { type: 'message_delta', delta: { stop_reason: 'end_turn' } },
    ]);

    const events = await drain(parseAnthropicStream(chunks(body)));
    expect(events).toEqual([
      { type: 'reasoning', text: 'Let me think. ' },
      { type: 'reasoning', text: 'OK.' },
      { type: 'text', text: 'The answer.' },
      { type: 'finish', reason: 'end_turn' },
    ]);

    const message = await collectStream(parseAnthropicStream(chunks(body)));
    expect(message.reasoning).toBe('Let me think. OK.');
    expect(message.text).toBe('The answer.');
  });

  it('maps Gemini thought parts to reasoning', async () => {
    const body = sseBody([
      {
        candidates: [
          {
            content: {
              parts: [
                { text: 'Considering options', thought: true },
                { text: 'Final answer.' },
              ],
            },
            finishReason: 'STOP',
          },
        ],
      },
    ]);

    const events = await drain(parseGeminiStream(chunks(body)));
    expect(events).toEqual([
      { type: 'reasoning', text: 'Considering options' },
      { type: 'text', text: 'Final answer.' },
      { type: 'finish', reason: 'STOP' },
    ]);

    const message = await collectStream(parseGeminiStream(chunks(body)));
    expect(message.reasoning).toBe('Considering options');
    expect(message.text).toBe('Final answer.');
  });
});
