// Parse a provider stream into unified events, then collect a final message.
//
//   node examples/collect.mjs
//
// Uses a canned Anthropic SSE body so it runs offline; swap in `res.body` from
// a real fetch() to a provider and it works the same way.
import { parseAnthropicStream, collectStream } from '../dist/index.js';

const body = [
  {
    type: 'content_block_start',
    index: 0,
    content_block: { type: 'text', text: '' },
  },
  {
    type: 'content_block_delta',
    index: 0,
    delta: { type: 'text_delta', text: 'The weather ' },
  },
  {
    type: 'content_block_delta',
    index: 0,
    delta: { type: 'text_delta', text: 'in SF is sunny.' },
  },
  {
    type: 'content_block_start',
    index: 1,
    content_block: { type: 'tool_use', id: 'toolu_1', name: 'get_weather' },
  },
  {
    type: 'content_block_delta',
    index: 1,
    delta: { type: 'input_json_delta', partial_json: '{"city":"SF"}' },
  },
  { type: 'message_delta', delta: { stop_reason: 'tool_use' } },
]
  .map((p) => `event: ${p.type}\ndata: ${JSON.stringify(p)}\n\n`)
  .join('');

async function* source() {
  // Emit the body in small slices to mimic a real chunked HTTP stream.
  for (let i = 0; i < body.length; i += 8) {
    yield body.slice(i, i + 8);
  }
}

console.log('--- live events ---');
for await (const event of parseAnthropicStream(source())) {
  console.log(event);
}

const message = await collectStream(parseAnthropicStream(source()));
console.log('\n--- collected message ---');
console.log('text:', JSON.stringify(message.text));
console.log('toolCalls:', JSON.stringify(message.toolCalls));
console.log('finishReason:', message.finishReason);
