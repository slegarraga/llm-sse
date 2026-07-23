# Roadmap

`llm-sse` exists to make provider streaming predictable without requiring a
provider SDK or adding runtime dependencies. The roadmap prioritizes correctness,
interoperability, and evidence-backed support over adding providers by name.

## Current priorities

### 1. Streaming conformance

- Keep the public fixture corpus aligned with documented OpenAI Responses,
  OpenAI Chat Completions, Anthropic Messages, and Gemini event shapes.
- Add regression fixtures for real provider edge cases after removing secrets
  and user content.
- Preserve byte-boundary, line-ending, malformed-event, and multi-tool coverage.

### 2. Provider portability

- Keep normalized text, reasoning, tool-call, finish, and error events stable.
- Document unavoidable information loss between provider formats.
- Improve composition with
  [`llm-messages`](https://github.com/slegarraga/llm-messages),
  [`tool-schema`](https://github.com/slegarraga/tool-schema), and
  [`llm-errors`](https://github.com/slegarraga/llm-errors).

### 3. Maintainer workflows

- Make provider-behavior changes reviewable through small fixtures and explicit
  links to primary documentation.
- Automate compatibility reports, release notes, and routine issue triage while
  keeping release decisions human-reviewed.
- Publish enough project context for contributors to reproduce and own an area
  of the parser.

### 4. Sustainable community

- Grow usage through real integrations and examples rather than synthetic stars
  or low-value promotion.
- Welcome additional reviewers and maintainers through the path described in
  [GOVERNANCE.md](./GOVERNANCE.md).
- Track breaking proposals in public issues before implementation.

## API credit use

If the project receives sponsored API credits, they will be used for opt-in
conformance checks against official provider endpoints, fixture refreshes,
regression reproduction, and maintainer automation. Secrets and user prompts
will not be committed. Pull requests will continue to run deterministically
against sanitized offline fixtures.

## Non-goals

- Replacing full provider SDKs.
- Managing authentication, retries, billing, or network requests.
- Claiming compatibility with an endpoint without a documented event format or
  reproducible fixture.
- Adding runtime dependencies for convenience.

## Propose an item

Open a [GitHub Discussion](https://github.com/slegarraga/llm-sse/discussions)
for design exploration or a
[feature request](https://github.com/slegarraga/llm-sse/issues/new?template=feature_request.yml)
for a scoped, testable change.
