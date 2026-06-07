import type { StreamEvent } from '../types.ts';

/** Per-stream state for Gemini, which does not number its tool calls. */
export interface GeminiState {
  toolIndex: number;
}

/**
 * Map one Gemini `GenerateContentResponse` chunk into normalized events.
 *
 * Gemini streams `candidates[0].content.parts[]`: a part is either `text` or a
 * complete `functionCall` (`{ name, args }`) — it does not fragment arguments,
 * so the whole `args` object is emitted as a single tool-call delta. Calls are
 * numbered in the order they appear via `state`.
 */
export function mapGemini(chunk: any, state: GeminiState): StreamEvent[] {
  const events: StreamEvent[] = [];
  const candidate = chunk?.candidates?.[0];
  if (!candidate) {
    return events;
  }

  const parts = candidate.content?.parts;
  if (Array.isArray(parts)) {
    for (const part of parts) {
      if (!part || typeof part !== 'object') {
        continue;
      }

      if (typeof part.text === 'string' && part.text.length > 0) {
        // Gemini flags a thinking part with `thought: true`.
        events.push({
          type: part.thought === true ? 'reasoning' : 'text',
          text: part.text,
        });
      }
      const functionCall = part.functionCall;
      if (
        functionCall &&
        typeof functionCall === 'object' &&
        !Array.isArray(functionCall) &&
        typeof functionCall.name === 'string' &&
        functionCall.name.length > 0
      ) {
        const index = state.toolIndex++;
        events.push({
          type: 'tool_call_start',
          index,
          name: functionCall.name,
        });
        events.push({
          type: 'tool_call_delta',
          index,
          argumentsDelta: JSON.stringify(functionCall.args ?? {}),
        });
      }
    }
  }

  if (
    typeof candidate.finishReason === 'string' &&
    candidate.finishReason.length > 0
  ) {
    events.push({ type: 'finish', reason: candidate.finishReason });
  }
  return events;
}
