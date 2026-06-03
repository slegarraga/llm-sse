import type { CollectedMessage } from './types.ts';

/**
 * An assistant message in OpenAI Chat Completions shape — the canonical "hub"
 * format. Append it to your message history to continue the conversation, or
 * pass it to `llm-messages` to port it to Anthropic or Gemini.
 */
export interface AssistantMessage {
  role: 'assistant';
  /** The assistant text, or `null` when the turn was only tool calls. */
  content: string | null;
  /** Present only when the turn produced tool calls. */
  tool_calls?: AssistantToolCall[];
}

export interface AssistantToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

/**
 * Turn a {@link CollectedMessage} (from {@link collectStream}) into a standard
 * assistant message you can put back into a conversation.
 *
 * Output is the OpenAI Chat Completions shape, which is the format `llm-messages`
 * treats as canonical — so this composes directly with its `toAnthropic` /
 * `toGemini` converters. Tool calls without an id (e.g. from Gemini) get a
 * stable synthetic `call_<n>` id. Reasoning is intentionally omitted: it is not
 * part of the portable assistant message.
 *
 * @example
 * ```ts
 * const collected = await collectStream(parseOpenAIStream(res.body));
 * const message = toAssistantMessage(collected);
 * history.push(message); // or: toAnthropic([...history, message])
 * ```
 */
export function toAssistantMessage(
  collected: CollectedMessage,
): AssistantMessage {
  const message: AssistantMessage = {
    role: 'assistant',
    content: collected.text.length > 0 ? collected.text : null,
  };

  if (collected.toolCalls.length > 0) {
    message.tool_calls = collected.toolCalls.map((call, position) => ({
      id: call.id ?? `call_${position}`,
      type: 'function',
      function: {
        name: call.name ?? '',
        arguments: call.arguments.length > 0 ? call.arguments : '{}',
      },
    }));
  }

  return message;
}
