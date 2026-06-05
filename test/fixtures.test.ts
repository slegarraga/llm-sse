import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { collectStream, parseStream } from '../src/index.ts';
import type { CollectedMessage, Provider, StreamEvent } from '../src/index.ts';
import { byteChunks, chunks, drain } from './helpers.ts';

interface FixtureCase {
  provider: Provider;
  name: string;
}

const cases: FixtureCase[] = [
  { provider: 'openai', name: 'openai-weather-tool' },
  { provider: 'anthropic', name: 'anthropic-weather-tool' },
  { provider: 'gemini', name: 'gemini-weather-tool' },
];

async function fixtureText(name: string): Promise<string> {
  return readFile(new URL(`../fixtures/${name}.sse`, import.meta.url), 'utf8');
}

async function expectedJson<T>(name: string, suffix: string): Promise<T> {
  const text = await readFile(
    new URL(`../fixtures/expected/${name}.${suffix}.json`, import.meta.url),
    'utf8',
  );
  return JSON.parse(text) as T;
}

describe('stream fixture corpus', () => {
  for (const item of cases) {
    it(`matches normalized events for ${item.provider}`, async () => {
      const body = await fixtureText(item.name);
      const expected = await expectedJson<StreamEvent[]>(item.name, 'events');

      expect(await drain(parseStream(chunks(body), item.provider))).toEqual(
        expected,
      );
    });

    it(`collects the expected message for ${item.provider}`, async () => {
      const body = await fixtureText(item.name);
      const expected = await expectedJson<CollectedMessage>(
        item.name,
        'message',
      );

      expect(
        await collectStream(parseStream(byteChunks(body, 7), item.provider)),
      ).toEqual(expected);
    });
  }
});
