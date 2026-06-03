/** The provider whose streaming format is being parsed. */
export type Provider = 'openai' | 'anthropic' | 'gemini';

/**
 * A single normalized event emitted while parsing a provider stream.
 *
 * The three providers stream very differently — OpenAI sends `choices[].delta`
 * chunks, Anthropic sends typed `content_block_*` / `message_*` events, Gemini
 * sends `candidates[].content.parts` — but they all reduce to the same handful
 * of things: text arrived, a tool call started, tool-call arguments arrived,
 * the turn finished, or the provider reported an error.
 */
export type StreamEvent =
  /** A chunk of assistant text. */
  | { type: 'text'; text: string }
  /**
   * A chunk of the model's reasoning / "thinking" (Anthropic extended thinking,
   * Gemini thought parts). Kept separate from `text` so callers can show it in a
   * distinct UI affordance, or drop it, without it polluting the answer.
   */
  | { type: 'reasoning'; text: string }
  /**
   * A tool/function call began. `index` identifies the call within the turn so
   * later {@link ToolCallDeltaEvent}s can be matched to it.
   */
  | { type: 'tool_call_start'; index: number; id?: string; name?: string }
  /** A fragment of a tool call's JSON arguments (concatenate by `index`). */
  | { type: 'tool_call_delta'; index: number; argumentsDelta: string }
  /** The turn finished. `reason` is the provider's stop reason, if any. */
  | { type: 'finish'; reason?: string }
  /** The provider emitted an error event mid-stream. */
  | { type: 'error'; error: unknown };

/** A fully accumulated tool call, produced by {@link collectStream}. */
export interface CollectedToolCall {
  index: number;
  id?: string;
  name?: string;
  /** The concatenated raw JSON arguments string. */
  arguments: string;
}

/** The result of draining a stream with {@link collectStream}. */
export interface CollectedMessage {
  /** All text deltas concatenated in order. */
  text: string;
  /** All reasoning / thinking deltas concatenated in order. */
  reasoning: string;
  /** Tool calls accumulated in order of first appearance. */
  toolCalls: CollectedToolCall[];
  /** The stop reason from the final `finish` event, if any. */
  finishReason?: string;
}

/** A source of stream bytes or text: the shape `fetch().body` and Node streams satisfy. */
export type ChunkSource = AsyncIterable<Uint8Array | string>;
