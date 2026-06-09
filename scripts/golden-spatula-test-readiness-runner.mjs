import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const readinessPath = path.join(repoRoot, 'scripts', 'golden-spatula-readiness.mjs');
const tempDir = path.join(
  repoRoot,
  'src-tauri',
  'target',
  'debug',
  'golden-spatula-readiness-test',
);

function runReadiness(args, expectedStatus = 0) {
  const result = spawnSync(process.execPath, [readinessPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
  });

  assert.equal(
    result.status,
    expectedStatus,
    `readiness status mismatch\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );

  return result;
}

async function main() {
  await fs.rm(tempDir, { recursive: true, force: true });
  await fs.mkdir(tempDir, { recursive: true });

  const reportPath = path.join(tempDir, 'unreachable-report.json');
  const result = runReadiness(
    [
      '--api-base',
      'http://127.0.0.1:9/api',
      '--no-start-mxu',
      '--skip-prepare',
      '--report-file',
      reportPath,
      '--screenshot-file',
      path.join(tempDir, 'unreachable.png'),
    ],
    1,
  );

  assert.match(result.stdout, /Readiness: fail/);
  assert.match(result.stdout, /Wrote readiness report:/);

  const report = JSON.parse(await fs.readFile(reportPath, 'utf8'));
  assert.equal(report.type, 'mxu.goldenSpatula.readinessReport');
  assert.equal(report.version, 1);
  assert.equal(report.status, 'fail');
  assert.equal(report.apiBase, 'http://127.0.0.1:9/api');
  assert.equal(report.screenshot, null);
  assert.ok(report.error.includes('MXU API is not reachable'));
  assert.ok(
    report.checks.some(
      (check) =>
        check.key === 'readiness:exception' &&
        check.status === 'fail' &&
        check.message.includes('MXU API is not reachable'),
    ),
    'readiness report should include the unreachable API failure',
  );

  console.log('Golden Spatula readiness runner test');
  console.log('Checked unreachable API failure report without starting MXU or touching MuMu.');
  console.log('OK: readiness runner writes actionable reports for pre-real-run checks.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
