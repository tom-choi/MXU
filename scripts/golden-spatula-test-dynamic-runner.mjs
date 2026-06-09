import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const runnerPath = path.join(repoRoot, 'scripts', 'golden-spatula-run-auto-roll-buy.mjs');
const tempDir = path.join(repoRoot, 'src-tauri', 'target', 'debug', 'golden-spatula-runner-test');

function runRunner(args, expectedStatus = 0) {
  const result = spawnSync(process.execPath, [runnerPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
  });

  assert.equal(
    result.status,
    expectedStatus,
    `runner status mismatch\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );

  return result;
}

function findFocusPayload(nodes, predicate) {
  for (const node of Object.values(nodes)) {
    const focus = node?.focus;
    if (!focus || typeof focus !== 'object') continue;
    for (const payload of Object.values(focus)) {
      if (payload && typeof payload === 'object' && predicate(payload)) {
        return payload;
      }
    }
  }
  return null;
}

async function main() {
  await fs.rm(tempDir, { recursive: true, force: true });
  await fs.mkdir(tempDir, { recursive: true });

  const rollOverride = path.join(tempDir, 'roll.json');
  const rollRun = runRunner([
    '--dry-run',
    '--roll-count',
    '1',
    '--champion',
    '薇古丝',
    '--champion',
    '布里茨',
    '--write-override',
    rollOverride,
  ]);
  assert.match(rollRun.stdout, /Mode: dry-run/);
  assert.match(rollRun.stdout, /Entry: AutoRollAndBuyTargets/);
  assert.match(rollRun.stdout, /Targets: 薇古丝, 布里茨/);
  assert.match(rollRun.stdout, /Preflight: pass/);
  const rollNodes = JSON.parse(await fs.readFile(rollOverride, 'utf8'));
  assert.ok(rollNodes.AutoRollAndBuyTargets, 'roll override missing entry');
  assert.ok(rollNodes.AutoRollBuy_ShopReady, 'roll override missing initial shop ready guard');
  assert.ok(rollNodes.AutoRollBuy_Roll1, 'roll override missing refresh node');
  assert.ok(
    findFocusPayload(
      rollNodes,
      (payload) =>
        payload.scope === 'goldenSpatula.roll' && payload.targetNames?.includes('薇古丝'),
    ),
    'roll override missing target focus payload',
  );

  const lineupOverride = path.join(tempDir, 'lineup-roll.json');
  const lineupReport = path.join(tempDir, 'lineup-roll-report.json');
  const lineupRun = runRunner([
    '--dry-run',
    '--roll-count',
    '1',
    '--lineup',
    '4341',
    '--write-override',
    lineupOverride,
    '--report-file',
    lineupReport,
  ]);
  assert.match(lineupRun.stdout, /Lineups: 【木灵薇古丝九五】3旅人3木灵族2暗星 \(core\)/);
  assert.match(lineupRun.stdout, /Targets: 薇古丝, 布里茨, 拉莫斯/);
  assert.match(lineupRun.stdout, /Wrote report:/);
  const lineupNodes = JSON.parse(await fs.readFile(lineupOverride, 'utf8'));
  assert.ok(lineupNodes.AutoRollAndBuyTargets, 'lineup override missing entry');
  assert.ok(
    lineupNodes.AutoRollBuy_InitialShopNotReady,
    'lineup override missing initial not-ready node',
  );
  assert.ok(
    findFocusPayload(
      lineupNodes,
      (payload) =>
        payload.scope === 'goldenSpatula.roll' && payload.targetNames?.includes('拉莫斯'),
    ),
    'lineup override missing resolved target focus payload',
  );
  const report = JSON.parse(await fs.readFile(lineupReport, 'utf8'));
  assert.equal(report.type, 'mxu.goldenSpatula.autoRollReport');
  assert.equal(report.version, 1);
  assert.equal(report.status, 'dry-run-succeeded');
  assert.equal(report.mode, 'dry-run');
  assert.equal(report.entry, 'AutoRollAndBuyTargets');
  assert.equal(report.lineupTargetMode, 'core');
  assert.deepEqual(
    report.targets.map((target) => target.name),
    ['薇古丝', '布里茨', '拉莫斯'],
  );
  assert.match(report.override.sha256, /^[0-9a-f]{64}$/);
  assert.equal(report.override.summary.nodes, Object.keys(lineupNodes).length);
  assert.equal(report.override.writtenPath.replace(/\\/g, '/').endsWith('lineup-roll.json'), true);
  assert.equal(report.preflight.status, 'pass');
  assert.ok(report.preflight.checks.length >= 15, 'report preflight checks are missing');
  assert.ok(
    report.preflight.checks.some((check) => check.key === 'override:fixed-buy-targets'),
    'report preflight missing fixed buy target check',
  );
  assert.ok(
    report.preflight.checks.some((check) => check.key === 'override:initial-shop-ready-guard'),
    'report preflight missing initial shop-ready guard check',
  );

  const preflightOverride = path.join(tempDir, 'preflight-only.json');
  const preflightReport = path.join(tempDir, 'preflight-only-report.json');
  const preflightOnlyRun = runRunner([
    '--preflight-only',
    '--roll-count',
    '1',
    '--lineup',
    '4341',
    '--write-override',
    preflightOverride,
    '--report-file',
    preflightReport,
  ]);
  assert.match(preflightOnlyRun.stdout, /Mode: preflight-only/);
  assert.match(preflightOnlyRun.stdout, /Preflight-only complete/);
  assert.doesNotMatch(preflightOnlyRun.stdout, /Starting MXU runner/);
  const preflightOnlyReport = JSON.parse(await fs.readFile(preflightReport, 'utf8'));
  assert.equal(preflightOnlyReport.status, 'preflight-succeeded');
  assert.equal(preflightOnlyReport.mode, 'preflight-only');
  assert.equal(preflightOnlyReport.preflight.mode, 'preflight-only');
  assert.equal(preflightOnlyReport.preflight.status, 'pass');
  assert.equal(preflightOnlyReport.runner, undefined);
  assert.ok(
    preflightOnlyReport.override.writtenPath,
    'preflight-only report should keep override path',
  );
  const preflightOnlyNodes = JSON.parse(await fs.readFile(preflightOverride, 'utf8'));
  assert.ok(
    preflightOnlyNodes.AutoRollBuy_ShopReady,
    'preflight-only override missing initial shop ready guard',
  );

  const levelOverride = path.join(tempDir, 'level-roll.json');
  const levelRun = runRunner([
    '--dry-run',
    '--level-first',
    '--xp-count',
    '3',
    '--roll-count',
    '1',
    '--champion',
    '薇古絲',
    '--write-override',
    levelOverride,
  ]);
  assert.match(levelRun.stdout, /Entry: AutoLevelRollAndBuyTargets/);
  assert.match(levelRun.stdout, /XP clicks: 3/);
  const levelNodes = JSON.parse(await fs.readFile(levelOverride, 'utf8'));
  assert.ok(levelNodes.AutoLevelRollAndBuyTargets, 'level override missing entry');
  assert.ok(levelNodes.AutoLevelRollBuy_XpClick3, 'level override missing third XP click');
  assert.ok(levelNodes.AutoRollAndBuyTargets, 'level override missing roll entry');
  assert.ok(
    findFocusPayload(levelNodes, (payload) => payload.scope === 'goldenSpatula.xp'),
    'level override missing XP focus payload',
  );

  const missingTargetRun = runRunner(['--dry-run', '--roll-count', '1'], 1);
  assert.match(missingTargetRun.stderr, /No D roll targets/);

  const missingTemplateReport = path.join(tempDir, 'missing-template-report.json');
  const missingTemplateRun = runRunner(
    [
      '--dry-run',
      '--roll-count',
      '1',
      '--target',
      '不存在=champion/not_here.png',
      '--report-file',
      missingTemplateReport,
    ],
    1,
  );
  assert.match(missingTemplateRun.stdout, /Preflight: fail/);
  assert.match(missingTemplateRun.stderr, /Preflight failed/);
  const missingReport = JSON.parse(await fs.readFile(missingTemplateReport, 'utf8'));
  assert.equal(missingReport.status, 'preflight-failed');
  assert.equal(missingReport.preflight.status, 'fail');
  assert.ok(
    missingReport.preflight.checks.some(
      (check) => check.key === 'target-template:不存在' && check.status === 'fail',
    ),
    'missing template report should contain failed target-template check',
  );

  const failedRunReport = path.join(tempDir, 'failed-real-run-report.json');
  const failedRun = runRunner(
    [
      '--run',
      '--roll-count',
      '1',
      '--lineup',
      '4341',
      '--api-base',
      'http://127.0.0.1:9/api',
      '--no-start-mxu',
      '--skip-prepare',
      '--selected-task-id',
      'golden-real-run-report-test',
      '--report-file',
      failedRunReport,
    ],
    1,
  );
  assert.match(failedRun.stdout, /Starting MXU runner/);
  assert.match(failedRun.stdout, /Wrote report:/);
  const failedReport = JSON.parse(await fs.readFile(failedRunReport, 'utf8'));
  assert.equal(failedReport.status, 'real-run-failed');
  assert.equal(failedReport.mode, 'real-run');
  assert.equal(failedReport.runner.exitCode, 1);
  assert.match(failedReport.runner.stderrTail, /MXU API is not reachable/);
  assert.match(failedReport.runner.stdoutTail, /Loaded pipeline override/);
  assert.equal(failedReport.runnerSummary.type, 'mxu.goldenSpatula.runnerSummary');
  assert.equal(failedReport.runnerSummary.status, 'failed');
  assert.equal(failedReport.runnerSummary.entry, 'AutoRollAndBuyTargets');
  assert.equal(failedReport.runnerSummary.artifacts.mode, 'recent');
  assert.equal(failedReport.preflight.status, 'pass');
  assert.match(
    failedReport.override.writtenPath.replace(/\\/g, '/'),
    /golden-spatula-overrides\/golden-real-run-report-test\.json$/,
  );

  console.log('Golden Spatula dynamic runner test');
  console.log(
    'Checked dry-run roll override, level+roll override, preflight report output, failed real-run report, and missing-target guard.',
  );
  console.log('OK: auto roll runner produces submit-ready pipeline overrides.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
