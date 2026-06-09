import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import prettier from 'prettier';
import ts from 'typescript';

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const projectRoot = path.join(repoRoot, 'projects', 'golden_spatula_mumu');
const analysisRoot = path.join(projectRoot, 'analysis', 'video');
const rollPipelinePath = path.join(repoRoot, 'src', 'services', 'goldenSpatulaRollPipeline.ts');
const defaultJsonPath = path.join(projectRoot, 'analysis', 'recording-regression.json');
const defaultMarkdownPath = path.join(projectRoot, 'analysis', 'recording-regression.md');

function parseArgs(args) {
  const options = {
    analysisRoot,
    jsonOut: defaultJsonPath,
    markdownOut: defaultMarkdownPath,
    minVideoEvents: 20,
    minShopGestures: 20,
    maxTargetDrift: 70,
    help: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--analysis-root' && next) {
      options.analysisRoot = path.resolve(repoRoot, next);
      index += 1;
    } else if (arg === '--json-out' && next) {
      options.jsonOut = path.resolve(repoRoot, next);
      index += 1;
    } else if (arg === '--markdown-out' && next) {
      options.markdownOut = path.resolve(repoRoot, next);
      index += 1;
    } else if (arg === '--min-video-events' && next) {
      options.minVideoEvents = Number(next);
      index += 1;
    } else if (arg === '--min-shop-gestures' && next) {
      options.minShopGestures = Number(next);
      index += 1;
    } else if (arg === '--max-target-drift' && next) {
      options.maxTargetDrift = Number(next);
      index += 1;
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
  }

  for (const key of ['minVideoEvents', 'minShopGestures', 'maxTargetDrift']) {
    if (!Number.isFinite(options[key]) || options[key] < 0) {
      throw new Error(`${key} must be a non-negative number`);
    }
  }

  return options;
}

function usage() {
  return `Usage:
  pnpm golden:recording-regression [options]

Options:
  --analysis-root <dir>       Analysis directory. Default: projects/golden_spatula_mumu/analysis/video
  --json-out <path>           JSON report path. Default: projects/golden_spatula_mumu/analysis/recording-regression.json
  --markdown-out <path>       Markdown report path. Default: projects/golden_spatula_mumu/analysis/recording-regression.md
  --min-video-events <count>  Minimum candidate events for a video analysis. Default: 20
  --min-shop-gestures <count> Minimum shop gestures for MMOR calibration. Default: 20
  --max-target-drift <px>     Max allowed target drift for current click points. Default: 70
  --help                      Show this help
`;
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function maybeReadJson(filePath) {
  if (!existsSync(filePath)) return null;
  return readJson(filePath);
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function writeJson(filePath, value) {
  await writeFormattedText(filePath, JSON.stringify(value, null, 2), 'json');
}

async function writeFormattedText(filePath, value, parser) {
  const formatted = await prettier.format(value, { parser });
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, formatted, 'utf8');
}

function formatPath(filePath) {
  return path.relative(repoRoot, filePath).replaceAll(path.sep, '/');
}

function pointInRect(point, rect) {
  if (!Array.isArray(point) || !Array.isArray(rect)) return false;
  const [x, y] = point;
  const [rectX, rectY, width, height] = rect;
  return x >= rectX && x <= rectX + width && y >= rectY && y <= rectY + height;
}

function distance(pointA, pointB) {
  if (!Array.isArray(pointA) || !Array.isArray(pointB)) return Number.POSITIVE_INFINITY;
  return Number(Math.hypot(pointA[0] - pointB[0], pointA[1] - pointB[1]).toFixed(2));
}

function statusRank(status) {
  if (status === 'fail') return 3;
  if (status === 'warn') return 2;
  return 1;
}

function addCheck(checks, status, key, message, details = undefined) {
  checks.push({ status, key, message, ...(details === undefined ? {} : { details }) });
}

function summarizeStatus(checks) {
  return checks.reduce((current, check) => {
    if (statusRank(check.status) > statusRank(current)) return check.status;
    return current;
  }, 'pass');
}

function getRegion(report, key) {
  return report?.regionStats?.find((item) => item.key === key) ?? null;
}

function getTarget(report, key) {
  return report?.targetValidation?.find((item) => item.key === key) ?? null;
}

async function listRecordingDirs(root) {
  if (!existsSync(root)) return [];
  const entries = await fs.readdir(root, { withFileTypes: true });
  const dirs = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const dir = path.join(root, entry.name);
    const hasAnalysis = existsSync(path.join(dir, 'analysis.json'));
    const hasOperations = existsSync(path.join(dir, 'operations.json'));
    if (hasAnalysis || hasOperations) {
      dirs.push(dir);
    }
  }
  return dirs.sort((a, b) => a.localeCompare(b, 'en'));
}

async function importRollPipelineModule() {
  const source = await fs.readFile(rollPipelinePath, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2020,
      sourceMap: false,
    },
    fileName: rollPipelinePath,
  });
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(transpiled.outputText).toString(
    'base64',
  )}`;
  return import(moduleUrl);
}

function validateVideoAnalysis(checks, analysis, options) {
  if (!analysis) {
    addCheck(checks, 'warn', 'video:analysis-missing', 'No video analysis.json was found');
    return;
  }

  const width = Number(analysis.metadata?.width);
  const height = Number(analysis.metadata?.height);
  const durationSeconds = Number(analysis.metadata?.durationSeconds);
  const eventCount = Array.isArray(analysis.events) ? analysis.events.length : 0;

  addCheck(
    checks,
    width === 1280 && height === 720 ? 'pass' : 'fail',
    'video:resolution',
    `Video resolution is ${width}x${height}`,
  );
  addCheck(
    checks,
    durationSeconds > 0 ? 'pass' : 'fail',
    'video:duration',
    `Video duration is ${Number.isFinite(durationSeconds) ? durationSeconds.toFixed(2) : 'NaN'}s`,
  );
  addCheck(
    checks,
    eventCount >= options.minVideoEvents ? 'pass' : 'warn',
    'video:event-coverage',
    `Video candidate event count is ${eventCount}`,
    { minVideoEvents: options.minVideoEvents },
  );
}

function validateCoordinateTransform(checks, operations) {
  const selected = operations.coordinateTransform?.selected;
  const candidates = operations.coordinateTransform?.candidates ?? [];
  const selectedCandidate = candidates.find((candidate) => candidate.transform === selected);
  const bestCandidate = candidates.reduce((best, candidate) => {
    if (!best || Number(candidate.score) > Number(best.score)) return candidate;
    return best;
  }, null);

  addCheck(
    checks,
    selected && selectedCandidate ? 'pass' : 'fail',
    'mmor:coordinate-transform',
    `Selected coordinate transform is ${selected || 'missing'}`,
    { selectedScore: selectedCandidate?.score ?? null },
  );

  if (selectedCandidate && bestCandidate) {
    addCheck(
      checks,
      selectedCandidate.transform === bestCandidate.transform ? 'pass' : 'warn',
      'mmor:coordinate-transform-score',
      `Selected transform score ${selectedCandidate.score}, best score ${bestCandidate.score}`,
      { bestTransform: bestCandidate.transform },
    );
  }
}

function validateOperationCoverage(checks, operations, options) {
  const actionCount = Number(operations.metadata?.actionCount ?? 0);
  const gestureCount = Number(operations.metadata?.gestureCount ?? 0);
  const shopCount = Number(getRegion(operations, 'shop')?.count ?? 0);
  const refreshCount = Number(getRegion(operations, 'refresh')?.count ?? 0);
  const buyXpCount = Number(getRegion(operations, 'buyXp')?.count ?? 0);

  addCheck(checks, actionCount > 0 ? 'pass' : 'fail', 'mmor:actions', `${actionCount} actions`);
  addCheck(checks, gestureCount > 0 ? 'pass' : 'fail', 'mmor:gestures', `${gestureCount} gestures`);
  addCheck(
    checks,
    shopCount >= options.minShopGestures ? 'pass' : 'warn',
    'mmor:shop-coverage',
    `${shopCount} shop gestures`,
    { minShopGestures: options.minShopGestures },
  );
  addCheck(
    checks,
    refreshCount > 0 ? 'pass' : 'warn',
    'mmor:refresh-coverage',
    `${refreshCount} refresh gestures`,
  );
  addCheck(
    checks,
    buyXpCount > 0 ? 'pass' : 'warn',
    'mmor:xp-coverage',
    `${buyXpCount} buy XP gestures`,
  );

  for (let index = 1; index <= 5; index += 1) {
    const count = Number(getRegion(operations, `slot${index}`)?.count ?? 0);
    addCheck(
      checks,
      count > 0 ? 'pass' : 'warn',
      `mmor:slot${index}-coverage`,
      `Slot ${index} has ${count} recorded gestures`,
    );
  }
}

function validateTargets(checks, operations, roll, options) {
  const targetChecks = [
    {
      key: 'buyXp',
      label: 'buy XP',
      current: roll.goldenSpatulaBuyXpTarget,
      maxDistance: Math.min(options.maxTargetDrift, 35),
    },
    {
      key: 'refresh',
      label: 'refresh',
      current: roll.goldenSpatulaShopRefreshTarget,
      maxDistance: options.maxTargetDrift,
    },
  ];

  for (const item of targetChecks) {
    const target = getTarget(operations, item.key);
    const current = Array.isArray(item.current) ? item.current.slice(0, 2) : null;
    const recorded = target?.recordedMedian ?? null;
    const drift = target?.distance ?? distance(current, recorded);
    addCheck(
      checks,
      Number.isFinite(drift) && drift <= item.maxDistance ? 'pass' : 'fail',
      `target:${item.key}`,
      `${item.label} target drift is ${Number.isFinite(drift) ? drift : 'missing'}px`,
      { current, recorded, maxDistance: item.maxDistance },
    );
  }

  for (const slot of roll.goldenSpatulaShopChampionSlots ?? []) {
    const region = getRegion(operations, `slot${slot.index}`);
    const current = Array.isArray(slot.target) ? slot.target.slice(0, 2) : null;
    const recorded = region?.medianPoint ?? null;
    const drift = distance(current, recorded);
    const insideRoi = pointInRect(current, slot.roi);
    addCheck(
      checks,
      insideRoi && Number.isFinite(drift) && drift <= options.maxTargetDrift ? 'pass' : 'fail',
      `target:slot${slot.index}`,
      `Slot ${slot.index} target drift is ${Number.isFinite(drift) ? drift : 'missing'}px`,
      { current, recorded, insideRoi, maxDistance: options.maxTargetDrift },
    );
  }
}

function validateTiming(checks, operations, roll) {
  const timing = operations.timingAnalysis;
  if (!timing) {
    addCheck(checks, 'warn', 'timing:missing', 'No MMOR timing analysis was found');
    return;
  }

  const closeMedian = timing.closeSlotIntervalStats?.median;
  const refreshMin = timing.refreshToNextShopStats?.min;
  const refreshMedian = timing.refreshToNextShopStats?.median;
  const xpMin = timing.xpToNextShopStats?.min;

  addCheck(
    checks,
    roll.goldenSpatulaAutoBuyClickPostDelayMs >= 600 ? 'pass' : 'fail',
    'timing:buy-click-delay',
    `Buy click post_delay is ${roll.goldenSpatulaAutoBuyClickPostDelayMs}ms`,
    { recordedCloseSlotMedianSeconds: closeMedian ?? null },
  );

  if (Number.isFinite(refreshMin)) {
    const refreshWindow =
      roll.goldenSpatulaShopRefreshPostDelayMs + roll.goldenSpatulaAutoBuyRecognitionTimeoutMs;
    addCheck(
      checks,
      refreshWindow >= Math.floor(refreshMin * 1000) - 150 ? 'pass' : 'fail',
      'timing:refresh-window',
      `Refresh window is ${refreshWindow}ms`,
      { recordedRefreshMinSeconds: refreshMin },
    );
  } else {
    addCheck(checks, 'warn', 'timing:refresh-window', 'No refresh-to-shop timing samples');
  }

  if (Number.isFinite(refreshMedian)) {
    addCheck(
      checks,
      roll.goldenSpatulaShopRefreshPostDelayMs <= Math.ceil(refreshMedian * 1000) ? 'pass' : 'warn',
      'timing:refresh-delay-cap',
      `Refresh post_delay is ${roll.goldenSpatulaShopRefreshPostDelayMs}ms`,
      { recordedRefreshMedianSeconds: refreshMedian },
    );
  }

  if (Number.isFinite(xpMin)) {
    addCheck(
      checks,
      roll.goldenSpatulaBuyXpPostDelayMs >= Math.floor(xpMin * 1000) - 150 ? 'pass' : 'fail',
      'timing:xp-delay',
      `XP post_delay is ${roll.goldenSpatulaBuyXpPostDelayMs}ms`,
      { recordedXpMinSeconds: xpMin },
    );
  } else {
    addCheck(checks, 'warn', 'timing:xp-delay', 'No XP-to-shop timing samples');
  }
}

function buildRecordingSummary(dir, analysis, operations, checks) {
  const video = analysis
    ? {
        path: analysis.metadata?.relativePath ?? '',
        durationSeconds: analysis.metadata?.durationSeconds ?? null,
        eventCount: Array.isArray(analysis.events) ? analysis.events.length : 0,
      }
    : null;
  const mmor = operations
    ? {
        path: operations.metadata?.relativePath ?? '',
        actionCount: operations.metadata?.actionCount ?? 0,
        gestureCount: operations.metadata?.gestureCount ?? 0,
        shopGestures: getRegion(operations, 'shop')?.count ?? 0,
        transform: operations.coordinateTransform?.selected ?? '',
      }
    : null;

  return {
    name: path.basename(dir),
    directory: formatPath(dir),
    status: summarizeStatus(checks),
    video,
    mmor,
    checks,
  };
}

async function validateRecordingDir(dir, roll, options) {
  const analysis = await maybeReadJson(path.join(dir, 'analysis.json'));
  const operations = await maybeReadJson(path.join(dir, 'operations.json'));
  const checks = [];

  validateVideoAnalysis(checks, analysis, options);

  if (!operations) {
    addCheck(checks, 'warn', 'mmor:analysis-missing', 'No operations.json was found');
    return buildRecordingSummary(dir, analysis, operations, checks);
  }

  validateCoordinateTransform(checks, operations);
  validateOperationCoverage(checks, operations, options);
  validateTargets(checks, operations, roll, options);
  validateTiming(checks, operations, roll);

  return buildRecordingSummary(dir, analysis, operations, checks);
}

function buildMarkdown(report) {
  const lines = [
    '# Golden Spatula Recording Regression',
    '',
    `Generated: ${report.generatedAt}`,
    `Analysis root: \`${report.analysisRoot}\``,
    `Overall status: **${report.status}**`,
    '',
    '## Recordings',
    '',
    '| Recording | Status | Video events | MMOR gestures | Shop gestures | Transform |',
    '| - | - | -: | -: | -: | - |',
  ];

  for (const recording of report.recordings) {
    lines.push(
      `| ${recording.name} | ${recording.status} | ${recording.video?.eventCount ?? '-'} | ${recording.mmor?.gestureCount ?? '-'} | ${recording.mmor?.shopGestures ?? '-'} | ${recording.mmor?.transform || '-'} |`,
    );
  }

  for (const recording of report.recordings) {
    lines.push('', `## ${recording.name}`, '', `Directory: \`${recording.directory}\``, '');
    lines.push('| Status | Key | Message |');
    lines.push('| - | - | - |');
    for (const check of recording.checks) {
      lines.push(`| ${check.status} | \`${check.key}\` | ${check.message} |`);
    }
  }

  lines.push('');
  return lines.join('\n');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }

  const roll = await importRollPipelineModule();
  const dirs = await listRecordingDirs(options.analysisRoot);
  assert.ok(dirs.length > 0, `No recording analysis directories found in ${options.analysisRoot}`);

  const recordings = [];
  for (const dir of dirs) {
    recordings.push(await validateRecordingDir(dir, roll, options));
  }

  const status = summarizeStatus(recordings.map((recording) => ({ status: recording.status })));
  const report = {
    type: 'mxu.goldenSpatula.recordingRegression',
    version: 1,
    generatedAt: new Date().toISOString(),
    analysisRoot: formatPath(options.analysisRoot),
    status,
    options: {
      minVideoEvents: options.minVideoEvents,
      minShopGestures: options.minShopGestures,
      maxTargetDrift: options.maxTargetDrift,
    },
    recordings,
  };

  await writeJson(options.jsonOut, report);
  await writeFormattedText(options.markdownOut, buildMarkdown(report), 'markdown');

  console.log('Golden Spatula recording regression');
  console.log(`Recordings checked: ${recordings.length}`);
  console.log(`Status: ${status}`);
  console.log(`JSON: ${formatPath(options.jsonOut)}`);
  console.log(`Markdown: ${formatPath(options.markdownOut)}`);

  if (status === 'fail') {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
