import type { StreamEvent } from '../types.ts';

/**
 * Map one OpenAI Responses API streaming event into normalized events.
 *
 * Responses streams are typed events rather than Chat Completions
 * `choices[].delta` chunks. Text, reasoning summaries, function calls,
 * completion state and errors are normalized here while unrelated built-in
 * tool events pass through without producing an event.
 *
 * @see https://platform.openai.com/docs/api-reference/responses-streaming
 */
export function mapOpenAIResponses(event: any): StreamEvent[] {
  if (!event || typeof event !== 'object') {
    return [];
  }

  switch (event.type) {
    case 'response.output_text.delta':
      return stringDelta(event.delta, 'text');

    // The normalized model has one user-visible text channel. Preserve refusal
    // text there so a provider-agnostic UI never drops the model's response.
    case 'response.refusal.delta':
      return stringDelta(event.delta, 'text');

    case 'response.reasoning_summary_text.delta':
    case 'response.reasoning_text.delta':
      return stringDelta(event.delta, 'reasoning');

    case 'response.output_item.added': {
      const item = event.item;
      if (!item || typeof item !== 'object' || item.type !== 'function_call') {
        return [];
      }

      const index = numericIndex(event.output_index);
      const id =
        typeof item.call_id === 'string'
          ? item.call_id
          : typeof item.id === 'string'
            ? item.id
            : undefined;
      const name = typeof item.name === 'string' ? item.name : undefined;

      return [{ type: 'tool_call_start', index, id, name }];
    }

    case 'response.function_call_arguments.delta':
      if (typeof event.delta !== 'string' || event.delta.length === 0) {
        return [];
      }
      return [
        {
          type: 'tool_call_delta',
          index: numericIndex(event.output_index),
          argumentsDelta: event.delta,
        },
      ];

    case 'response.completed':
      return [{ type: 'finish', reason: 'completed' }];

    case 'response.incomplete': {
      const reason = event.response?.incomplete_details?.reason;
      return [
        {
          type: 'finish',
          reason: typeof reason === 'string' ? reason : 'incomplete',
        },
      ];
    }

    case 'response.failed':
      return [
        {
          type: 'error',
          error: event.response?.error ?? {
            type: 'response_failed',
            message: 'The OpenAI response failed.',
          },
        },
        { type: 'finish', reason: 'failed' },
      ];

    case 'error':
      return [{ type: 'error', error: event }];

    default:
      return [];
  }
}

function numericIndex(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
    ? value
    : 0;
}

function stringDelta(
  value: unknown,
  type: 'text' | 'reasoning',
): StreamEvent[] {
  return typeof value === 'string' && value.length > 0
    ? [{ type, text: value }]
    : [];
}
