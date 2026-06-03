import type {
  CollectedMessage,
  CollectedToolCall,
  StreamEvent,
} from './types.ts';

/**
 * Drain a normalized event stream into a single assistant message: all text
 * concatenated, tool calls accumulated by `index` (arguments joined into one
 * JSON string), and the final stop reason.
 *
 * `error` events are not accumulated here — iterate the events directly if you
 * need to react to them mid-stream.
 *
 * @example
 * ```ts
 * const { text, toolCalls } = await collectStream(parseOpenAIStream(res.body));
 * ```
 */
export async function collectStream(
  events: AsyncIterable<StreamEvent>,
): Promise<CollectedMessage> {
  let text = '';
  let finishReason: string | undefined;
  const byIndex = new Map<number, CollectedToolCall>();
  const order: number[] = [];

  const ensure = (index: number): CollectedToolCall => {
    let call = byIndex.get(index);
    if (!call) {
      call = { index, arguments: '' };
      byIndex.set(index, call);
      order.push(index);
    }
    return call;
  };

  for await (const event of events) {
    switch (event.type) {
      case 'text':
        text += event.text;
        break;
      case 'tool_call_start': {
        const call = ensure(event.index);
        if (event.id !== undefined) {
          call.id = event.id;
        }
        if (event.name !== undefined) {
          call.name = event.name;
        }
        break;
      }
      case 'tool_call_delta':
        ensure(event.index).arguments += event.argumentsDelta;
        break;
      case 'finish':
        finishReason = event.reason;
        break;
      case 'error':
        break;
    }
  }

  return {
    text,
    toolCalls: order.map((index) => byIndex.get(index)!),
    finishReason,
  };
}
