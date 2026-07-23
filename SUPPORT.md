# Support

`llm-sse` is maintained in public on a best-effort basis.

## Questions and design discussions

Use [GitHub Discussions](https://github.com/slegarraga/llm-sse/discussions) for
integration questions, design exploration, and help choosing the right parser.

## Bugs

Open a
[bug report](https://github.com/slegarraga/llm-sse/issues/new?template=bug_report.yml)
with:

- the provider and API surface;
- a minimal, sanitized sequence of SSE `data:` payloads;
- the normalized events you expected and received;
- the `llm-sse`, Node.js, and runtime versions;
- a reproduction or failing test when possible.

Please do not include API keys, private prompts, personal data, or proprietary
model output.

## Security

Do not open a public issue for a vulnerability. Follow
[SECURITY.md](./SECURITY.md) to use GitHub private vulnerability reporting or
the listed security email.

## Scope

The project can help with parsing and normalization behavior. Provider account
access, billing, rate limits, model availability, and general SDK support belong
with the relevant provider.

No response-time guarantee is offered, but well-scoped reproductions and pull
requests are prioritized.
