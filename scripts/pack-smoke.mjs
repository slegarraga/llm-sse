import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const temp = mkdtempSync(join(tmpdir(), 'llm-sse-pack-'));

const run = (command, args, cwd) =>
  execFileSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

try {
  run(
    'npm',
    ['pack', '--pack-destination', temp, '--foreground-scripts=false'],
    root,
  );

  const tarballs = readdirSync(temp).filter((name) => name.endsWith('.tgz'));
  if (tarballs.length !== 1) {
    throw new Error(`Expected one tarball, found ${tarballs.length}.`);
  }

  const installDir = join(temp, 'install');
  mkdirSync(installDir);
  writeFileSync(
    join(installDir, 'package.json'),
    JSON.stringify({ private: true, type: 'module' }),
  );
  run(
    'npm',
    ['install', '--ignore-scripts', join(temp, tarballs[0])],
    installDir,
  );

  const packageDir = join(installDir, 'node_modules', 'llm-sse');
  const expectedFiles = [
    'README.md',
    'ROADMAP.md',
    'GOVERNANCE.md',
    'SUPPORT.md',
    'CONTRIBUTING.md',
    'CODE_OF_CONDUCT.md',
    'SECURITY.md',
    'CHANGELOG.md',
    'LICENSE',
    'docs/security-posture.md',
    'fixtures/openai-responses-weather-tool.sse',
  ];
  const missing = expectedFiles.filter(
    (file) => !existsSync(join(packageDir, file)),
  );
  if (missing.length > 0) {
    throw new Error(`Package is missing public files: ${missing.join(', ')}`);
  }

  const packageJson = JSON.parse(
    readFileSync(join(packageDir, 'package.json'), 'utf8'),
  );
  const probe = `
    import { parseOpenAIResponsesStream } from 'llm-sse';
    async function* source() {
      yield 'data: {"type":"response.output_text.delta","delta":"ok"}\\n\\n';
      yield 'data: {"type":"response.completed","response":{"status":"completed"}}\\n\\n';
    }
    const events = [];
    for await (const event of parseOpenAIResponsesStream(source())) events.push(event);
    const expected = [
      { type: 'text', text: 'ok' },
      { type: 'finish', reason: 'completed' },
    ];
    if (JSON.stringify(events) !== JSON.stringify(expected)) {
      throw new Error('Installed Responses parser produced unexpected events.');
    }
  `;
  run(process.execPath, ['--input-type=module', '-e', probe], installDir);

  console.log(
    `Pack smoke passed: llm-sse@${packageJson.version} installed with public docs and Responses parsing.`,
  );
} finally {
  rmSync(temp, { recursive: true, force: true });
}
