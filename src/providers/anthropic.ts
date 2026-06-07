import type { StreamEvent } from '../types.ts';

/**
 * Map one Anthropic Messages stream event into normalized events.
 *
 * Anthropic uses typed events: `content_block_start` opens a text or `tool_use`
 * block at an `index`, `content_block_delta` carries `text_delta` /
 * `input_json_delta` fragments, and `message_delta` carries the `stop_reason`.
 */
export function mapAnthropic(event: any): StreamEvent[] {
  const events: StreamEvent[] = [];

  switch (event?.type) {
    case 'content_block_start': {
      const block = event.content_block;
      if (block?.type === 'tool_use') {
        const index = blockIndex(event.index);
        if (index === undefined) {
          break;
        }
        events.push({
          type: 'tool_call_start',
          index,
          id: typeof block.id === 'string' ? block.id : undefined,
          name: typeof block.name === 'string' ? block.name : undefined,
        });
      }
      break;
    }
    case 'content_block_delta': {
      const delta = event.delta;
      if (delta?.type === 'text_delta' && typeof delta.text === 'string') {
        events.push({ type: 'text', text: delta.text });
      } else if (
        delta?.type === 'thinking_delta' &&
        typeof delta.thinking === 'string'
      ) {
        events.push({ type: 'reasoning', text: delta.thinking });
      } else if (
        delta?.type === 'input_json_delta' &&
        typeof delta.partial_json === 'string'
      ) {
        const index = blockIndex(event.index);
        if (index === undefined) {
          break;
        }
        events.push({
          type: 'tool_call_delta',
          index,
          argumentsDelta: delta.partial_json,
        });
      }
      break;
    }
    case 'message_delta': {
      const reason = event.delta?.stop_reason;
      if (typeof reason === 'string' && reason.length > 0) {
        events.push({ type: 'finish', reason });
      }
      break;
    }
    case 'error': {
      events.push({ type: 'error', error: event.error ?? event });
      break;
    }
  }

  return events;
}

function blockIndex(index: unknown): number | undefined {
  return typeof index === 'number' && Number.isInteger(index) && index >= 0
    ? index
    : undefined;
}
