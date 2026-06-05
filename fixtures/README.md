# Stream Fixture Corpus

This corpus contains small, deterministic Server-Sent Events streams for the
same semantic turn across providers:

- OpenAI / OpenAI-compatible chat completions
- Anthropic Messages streaming
- Gemini `streamGenerateContent?alt=sse`

Each `.sse` file is paired with expected normalized `StreamEvent[]` and
`CollectedMessage` JSON. The fixtures are safe for public CI: they contain no
API keys, no user data and no live provider responses.

Use them when changing parsers, comparing providers or writing downstream tests
that need stable examples of text, reasoning, tool-call arguments and finish
reasons.
