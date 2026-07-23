import { describe, expect, it } from 'vitest';
import {
  collectStream,
  parseOpenAIResponsesStream,
  parseStream,
} from '../src/index.ts';
import { chunks, drain, sseBody } from './helpers.ts';

const STREAM = sseBody([
  {
    type: 'response.reasoning_summary_text.delta',
    item_id: 'rs_1',
    output_index: 0,
    summary_index: 0,
    delta: 'I should check the weather.',
    sequence_number: 1,
  },
  {
    type: 'response.output_text.delta',
    item_id: 'msg_1',
    output_index: 1,
    content_index: 0,
    delta: 'I will check.',
    sequence_number: 2,
  },
  {
    type: 'response.output_item.added',
    output_index: 2,
    item: {
      id: 'fc_1',
      type: 'function_call',
      call_id: 'call_1',
      name: 'get_weather',
      arguments: '',
      status: 'in_progress',
    },
    sequence_number: 3,
  },
  {
    type: 'response.function_call_arguments.delta',
    item_id: 'fc_1',
    output_index: 2,
    delta: '{"city":',
    sequence_number: 4,
  },
  {
    type: 'response.function_call_arguments.delta',
    item_id: 'fc_1',
    output_index: 2,
    delta: '"Santiago"}',
    sequence_number: 5,
  },
  {
    type: 'response.completed',
    response: { id: 'resp_1', status: 'completed' },
    sequence_number: 6,
  },
]);

describe('OpenAI Responses stream', () => {
  it('normalizes text, reasoning, function calls and completion', async () => {
    const events = await drain(parseOpenAIResponsesStream(chunks(STREAM)));

    expect(events).toEqual([
      { type: 'reasoning', text: 'I should check the weather.' },
      { type: 'text', text: 'I will check.' },
      {
        type: 'tool_call_start',
        index: 2,
        id: 'call_1',
        name: 'get_weather',
      },
      {
        type: 'tool_call_delta',
        index: 2,
        argumentsDelta: '{"city":',
      },
      {
        type: 'tool_call_delta',
        index: 2,
        argumentsDelta: '"Santiago"}',
      },
      { type: 'finish', reason: 'completed' },
    ]);
  });

  it('collects a Responses stream through the generic dispatcher', async () => {
    const message = await collectStream(
      parseStream(chunks(STREAM, 1), 'openai-responses'),
    );

    expect(message).toEqual({
      text: 'I will check.',
      reasoning: 'I should check the weather.',
      toolCalls: [
        {
          index: 2,
          id: 'call_1',
          name: 'get_weather',
          arguments: '{"city":"Santiago"}',
        },
      ],
      finishReason: 'completed',
    });
  });

  it('surfaces incomplete, failed and protocol error events', async () => {
    const body = sseBody([
      {
        type: 'response.incomplete',
        response: {
          status: 'incomplete',
          incomplete_details: { reason: 'max_output_tokens' },
        },
      },
      {
        type: 'response.failed',
        response: {
          status: 'failed',
          error: { code: 'server_error', message: 'Upstream failed.' },
        },
      },
      {
        type: 'error',
        code: 'invalid_request',
        message: 'Bad request.',
        param: 'input',
      },
    ]);

    expect(await drain(parseOpenAIResponsesStream(chunks(body)))).toEqual([
      { type: 'finish', reason: 'max_output_tokens' },
      {
        type: 'error',
        error: { code: 'server_error', message: 'Upstream failed.' },
      },
      { type: 'finish', reason: 'failed' },
      {
        type: 'error',
        error: {
          type: 'error',
          code: 'invalid_request',
          message: 'Bad request.',
          param: 'input',
        },
      },
    ]);
  });

  it('preserves refusal deltas as user-visible text', async () => {
    const body = sseBody([
      {
        type: 'response.refusal.delta',
        item_id: 'msg_1',
        output_index: 0,
        content_index: 0,
        delta: 'I cannot help with that.',
      },
      {
        type: 'response.completed',
        response: { status: 'completed' },
      },
    ]);

    expect(await drain(parseOpenAIResponsesStream(chunks(body)))).toEqual([
      { type: 'text', text: 'I cannot help with that.' },
      { type: 'finish', reason: 'completed' },
    ]);
  });

  it('ignores unrelated events and malformed function-call shapes', async () => {
    const body = sseBody([
      { type: 'response.created', response: { id: 'resp_1' } },
      { type: 'response.output_item.added', output_index: 0, item: null },
      {
        type: 'response.output_item.added',
        output_index: 1,
        item: { type: 'message', id: 'msg_1' },
      },
      {
        type: 'response.output_text.delta',
        output_index: 1,
        delta: '',
      },
      {
        type: 'response.function_call_arguments.delta',
        output_index: 'bad',
        delta: '',
      },
    ]);

    expect(await drain(parseOpenAIResponsesStream(chunks(body)))).toEqual([]);
  });
});
