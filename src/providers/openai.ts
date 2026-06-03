import type { StreamEvent } from '../types.ts';

/**
 * Map one OpenAI `chat.completion.chunk` into normalized events.
 *
 * OpenAI streams a `choices[0].delta`: `content` carries text, and
 * `tool_calls[]` carry an `index`, an `id` + `function.name` on the first
 * fragment, then `function.arguments` fragments thereafter.
 */
export function mapOpenAI(chunk: any): StreamEvent[] {
  const events: StreamEvent[] = [];
  const choice = chunk?.choices?.[0];
  if (!choice) {
    return events;
  }

  const delta = choice.delta;
  if (delta) {
    if (typeof delta.content === 'string' && delta.content.length > 0) {
      events.push({ type: 'text', text: delta.content });
    }
    if (Array.isArray(delta.tool_calls)) {
      for (const call of delta.tool_calls) {
        const index = typeof call.index === 'number' ? call.index : 0;
        if (call.id !== undefined || call.function?.name !== undefined) {
          events.push({
            type: 'tool_call_start',
            index,
            id: call.id,
            name: call.function?.name,
          });
        }
        const args = call.function?.arguments;
        if (typeof args === 'string' && args.length > 0) {
          events.push({ type: 'tool_call_delta', index, argumentsDelta: args });
        }
      }
    }
  }

  if (choice.finish_reason) {
    events.push({ type: 'finish', reason: choice.finish_reason });
  }
  return events;
}
