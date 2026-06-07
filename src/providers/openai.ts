import type { StreamEvent } from '../types.ts';

/**
 * Map one OpenAI `chat.completion.chunk` into normalized events.
 *
 * OpenAI streams `choices[].delta`: `content` carries text, and
 * `tool_calls[]` carry an `index`, an `id` + `function.name` on the first
 * fragment, then `function.arguments` fragments thereafter.
 */
export function mapOpenAI(chunk: any): StreamEvent[] {
  const events: StreamEvent[] = [];
  const choices = Array.isArray(chunk?.choices) ? chunk.choices : [];
  if (choices.length === 0) {
    return events;
  }

  for (const choice of choices) {
    if (!choice || typeof choice !== 'object') {
      continue;
    }

    const delta = choice.delta;
    if (delta && typeof delta === 'object') {
      // Reasoning models on OpenAI-compatible endpoints (e.g. DeepSeek R1)
      // stream their thinking in `reasoning_content` (some use `reasoning`).
      const reasoning = delta.reasoning_content ?? delta.reasoning;
      if (typeof reasoning === 'string' && reasoning.length > 0) {
        events.push({ type: 'reasoning', text: reasoning });
      }
      if (typeof delta.content === 'string' && delta.content.length > 0) {
        events.push({ type: 'text', text: delta.content });
      }
      if (Array.isArray(delta.tool_calls)) {
        for (const call of delta.tool_calls) {
          if (!call || typeof call !== 'object') {
            continue;
          }

          const index = typeof call.index === 'number' ? call.index : 0;
          const fn =
            call.function && typeof call.function === 'object'
              ? call.function
              : undefined;
          const id = typeof call.id === 'string' ? call.id : undefined;
          const name = typeof fn?.name === 'string' ? fn.name : undefined;

          if (id !== undefined || name !== undefined) {
            events.push({
              type: 'tool_call_start',
              index,
              id,
              name,
            });
          }
          const args = fn?.arguments;
          if (typeof args === 'string' && args.length > 0) {
            events.push({
              type: 'tool_call_delta',
              index,
              argumentsDelta: args,
            });
          }
        }
      }
    }

    if (
      typeof choice.finish_reason === 'string' &&
      choice.finish_reason.length > 0
    ) {
      events.push({ type: 'finish', reason: choice.finish_reason });
    }
  }
  return events;
}
