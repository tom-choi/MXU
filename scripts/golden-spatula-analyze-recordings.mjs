import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const projectRoot = path.join(repoRoot, 'projects', 'golden_spatula_mumu');
const defaultVideoDir = path.join(repoRoot, 'docs', 'mp4s');
const defaultMmorDir = path.join(repoRoot, 'docs', 'mmors');
const defaultAnalysisRoot = path.join(projectRoot, 'analysis', 'video');
const analyzeVideoScript = path.join(repoRoot, 'scripts', 'golden-spatula-analyze-video.mjs');
const analyzeMmorScript = path.join(repoRoot, 'scripts', 'golden-spatula-analyze-mmor.mjs');
const regressionScript = path.join(repoRoot, 'scripts', 'golden-spatula-recording-regression.mjs');
const supportedVideoExtensions = new Set(['.mp4', '.mov', '.mkv', '.avi', '.webm', '.m4v']);
const defaultMaxCapturedOutputChars = 12000;

function parseArgs(args) {
  const options = {
    analysisRoot: defaultAnalysisRoot,
    coordTransform: 'auto',
    force: false,
    fps: 2,
    maxCapturedOutputChars: defaultMaxCapturedOutputChars,
    maxEvents: 180,
    maxFrames: 80,
    minGapSeconds: 0.75,
    mmorDir: defaultMmorDir,
    noRegression: false,
    regionThreshold: 12,
    sceneThreshold: 14,
    videoDir: defaultVideoDir,
    help: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--force') {
      options.force = true;
    } else if (arg === '--no-regression') {
      options.noRegression = true;
    } else if (arg === '--video-dir' && next) {
      options.videoDir = path.resolve(repoRoot, next);
      index += 1;
    } else if (arg === '--mmor-dir' && next) {
      options.mmorDir = path.resolve(repoRoot, next);
      index += 1;
    } else if (arg === '--analysis-root' && next) {
      options.analysisRoot = path.resolve(repoRoot, next);
      index += 1;
    } else if (arg === '--fps' && next) {
      options.fps = Number(next);
      index += 1;
    } else if (arg === '--scene-threshold' && next) {
      options.sceneThreshold = Number(next);
      index += 1;
    } else if (arg === '--region-threshold' && next) {
      options.regionThreshold = Number(next);
      index += 1;
    } else if (arg === '--min-gap' && next) {
      options.minGapSeconds = Number(next);
      index += 1;
    } else if (arg === '--max-frames' && next) {
      options.maxFrames = Number(next);
      index += 1;
    } else if (arg === '--max-events' && next) {
      options.maxEvents = Number(next);
      index += 1;
    } else if (arg === '--coord-transform' && next) {
      options.coordTransform = next;
      index += 1;
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
  }

  for (const key of [
    'fps',
    'sceneThreshold',
    'regionThreshold',
    'minGapSeconds',
    'maxFrames',
    'maxEvents',
  ]) {
    if (!Number.isFinite(options[key]) || options[key] <= 0) {
      throw new Error(`${key} must be a positive number`);
    }
  }

  options.maxFrames = Math.round(options.maxFrames);
  options.maxEvents = Math.round(options.maxEvents);
  return options;
}

function usage() {
  return `Usage:
  pnpm golden:analyze-recordings [options]

Options:
  --video-dir <dir>          Video directory. Default: docs/mp4s
  --mmor-dir <dir>           MMOR directory. Default: docs/mmors
  --analysis-root <dir>      Output root. Default: projects/golden_spatula_mumu/analysis/video
  --force                    Re-analyze even when analysis.json/operations.json already exist
  --no-regression            Do not run golden:recording-regression after analysis
  --fps <number>             Video samples per second. Default: 2
  --scene-threshold <num>    Video scene threshold. Default: 14
  --region-threshold <num>   Video region threshold. Default: 12
  --min-gap <seconds>        Video event merge gap. Default: 0.75
  --max-frames <number>      Max extracted event screenshots. Default: 80
  --max-events <number>      Max MMOR rows in markdown. Default: 180
  --coord-transform <name>   MMOR coordinate transform. Default: auto
  --help                     Show this help
`;
}

function formatPath(filePath) {
  return path.relative(repoRoot, filePath).replaceAll(path.sep, '/');
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function listFiles(dir, predicate) {
  if (!existsSync(dir)) return [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(fullPath, predicate)));
    } else if (entry.isFile() && predicate(fullPath)) {
      const stat = await fs.stat(fullPath);
      files.push({ path: fullPath, mtimeMs: stat.mtimeMs, size: stat.size });
    }
  }
  return files.sort((a, b) => a.path.localeCompare(b.path, 'en'));
}

function sanitizeKey(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);
}

function deriveRecordingKey(filePath) {
  const base = path.basename(filePath, path.extname(filePath));
  const numericMatch =
    base.match(/[(_-]([0-9]+)[)]?$/u) ?? base.match(/(?:第)?([0-9]+)(?:段|集|次)?$/u);
  if (numericMatch) return numericMatch[1];

  const sanitized = sanitizeKey(base);
  if (sanitized) return sanitized;

  return `recording_${createHash('sha1').update(base).digest('hex').slice(0, 8)}`;
}

function selectNewest(files) {
  if (files.length <= 1) return files[0] ?? null;
  return [...files].sort((a, b) => b.mtimeMs - a.mtimeMs)[0];
}

async function discoverRecordings(options) {
  const videos = await listFiles(options.videoDir, (filePath) =>
    supportedVideoExtensions.has(path.extname(filePath).toLowerCase()),
  );
  const mmors = await listFiles(options.mmorDir, (filePath) =>
    filePath.toLowerCase().endsWith('.mmor'),
  );
  const byKey = new Map();

  for (const file of videos) {
    const key = deriveRecordingKey(file.path);
    const record = byKey.get(key) ?? { key, videos: [], mmors: [] };
    record.videos.push(file);
    byKey.set(key, record);
  }
  for (const file of mmors) {
    const key = deriveRecordingKey(file.path);
    const record = byKey.get(key) ?? { key, videos: [], mmors: [] };
    record.mmors.push(file);
    byKey.set(key, record);
  }

  return [...byKey.values()]
    .map((record) => ({
      key: record.key,
      video: selectNewest(record.videos),
      mmor: selectNewest(record.mmors),
      duplicateVideoCount: Math.max(0, record.videos.length - 1),
      duplicateMmorCount: Math.max(0, record.mmors.length - 1),
      outDir: path.join(options.analysisRoot, record.key),
    }))
    .sort((a, b) => a.key.localeCompare(b.key, 'en', { numeric: true }));
}

function trimOutput(value, maxLength) {
  if (!value || value.length <= maxLength) return value || '';
  return value.slice(value.length - maxLength);
}

function runNodeScript(scriptPath, args, options) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const stdout = [];
    const stderr = [];
    const startedAt = Date.now();

    child.stdout.on('data', (chunk) => stdout.push(chunk.toString('utf8')));
    child.stderr.on('data', (chunk) => stderr.push(chunk.toString('utf8')));
    child.on('close', (code) => {
      resolve({
        code,
        durationMs: Date.now() - startedAt,
        stdout: trimOutput(stdout.join(''), options.maxCapturedOutputChars),
        stderr: trimOutput(stderr.join(''), options.maxCapturedOutputChars),
      });
    });
    child.on('error', (error) => {
      resolve({
        code: 1,
        durationMs: Date.now() - startedAt,
        stdout: trimOutput(stdout.join(''), options.maxCapturedOutputChars),
        stderr: trimOutput(
          `${stderr.join('')}\n${error.stack || error.message}`,
          options.maxCapturedOutputChars,
        ),
      });
    });
  });
}

function analysisJsonPath(recording) {
  return path.join(recording.outDir, 'analysis.json');
}

function operationsJsonPath(recording) {
  return path.join(recording.outDir, 'operations.json');
}

async function analyzeVideo(recording, options) {
  if (!recording.video) {
    return { status: 'skipped', reason: 'missing-video' };
  }
  if (!options.force && existsSync(analysisJsonPath(recording))) {
    return { status: 'skipped', reason: 'analysis-exists' };
  }

  await ensureDir(recording.outDir);
  const args = [
    recording.video.path,
    '--out',
    recording.outDir,
    '--fps',
    String(options.fps),
    '--scene-threshold',
    String(options.sceneThreshold),
    '--region-threshold',
    String(options.regionThreshold),
    '--min-gap',
    String(options.minGapSeconds),
    '--max-frames',
    String(options.maxFrames),
  ];
  const result = await runNodeScript(analyzeVideoScript, args, options);
  return {
    status: result.code === 0 ? 'succeeded' : 'failed',
    ...result,
  };
}

async function analyzeMmor(recording, options) {
  if (!recording.mmor) {
    return { status: 'skipped', reason: 'missing-mmor' };
  }
  if (!options.force && existsSync(operationsJsonPath(recording))) {
    return { status: 'skipped', reason: 'operations-exists' };
  }

  await ensureDir(recording.outDir);
  const args = [
    recording.mmor.path,
    '--out',
    recording.outDir,
    '--coord-transform',
    options.coordTransform,
    '--max-events',
    String(options.maxEvents),
  ];
  if (existsSync(analysisJsonPath(recording))) {
    args.push('--video-analysis', analysisJsonPath(recording));
  }

  const result = await runNodeScript(analyzeMmorScript, args, options);
  return {
    status: result.code === 0 ? 'succeeded' : 'failed',
    ...result,
  };
}

async function runRegression(options) {
  if (options.noRegression) {
    return { status: 'skipped', reason: 'disabled' };
  }
  const result = await runNodeScript(
    regressionScript,
    ['--analysis-root', options.analysisRoot],
    options,
  );
  return {
    status: result.code === 0 ? 'succeeded' : 'failed',
    ...result,
  };
}

function stepFailed(result) {
  return result?.status === 'failed';
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }

  const recordings = await discoverRecordings(options);
  if (recordings.length === 0) {
    throw new Error(
      `No recordings found in ${formatPath(options.videoDir)} or ${formatPath(options.mmorDir)}`,
    );
  }

  const report = {
    type: 'mxu.goldenSpatula.recordingBatchAnalysis',
    version: 1,
    generatedAt: new Date().toISOString(),
    options: {
      videoDir: formatPath(options.videoDir),
      mmorDir: formatPath(options.mmorDir),
      analysisRoot: formatPath(options.analysisRoot),
      force: options.force,
      fps: options.fps,
      sceneThreshold: options.sceneThreshold,
      regionThreshold: options.regionThreshold,
      minGapSeconds: options.minGapSeconds,
      maxFrames: options.maxFrames,
      maxEvents: options.maxEvents,
      coordTransform: options.coordTransform,
      noRegression: options.noRegression,
    },
    recordings: [],
    regression: null,
  };

  console.log(`Golden Spatula recording batch analysis`);
  console.log(`Recordings discovered: ${recordings.length}`);

  for (const recording of recordings) {
    console.log(`\n[${recording.key}]`);
    console.log(`Video: ${recording.video ? formatPath(recording.video.path) : 'missing'}`);
    console.log(`MMOR: ${recording.mmor ? formatPath(recording.mmor.path) : 'missing'}`);

    const videoResult = await analyzeVideo(recording, options);
    console.log(
      `Video analysis: ${videoResult.status}${videoResult.reason ? ` (${videoResult.reason})` : ''}`,
    );
    const mmorResult = await analyzeMmor(recording, options);
    console.log(
      `MMOR analysis: ${mmorResult.status}${mmorResult.reason ? ` (${mmorResult.reason})` : ''}`,
    );

    report.recordings.push({
      key: recording.key,
      outDir: formatPath(recording.outDir),
      video: recording.video ? formatPath(recording.video.path) : null,
      mmor: recording.mmor ? formatPath(recording.mmor.path) : null,
      duplicateVideoCount: recording.duplicateVideoCount,
      duplicateMmorCount: recording.duplicateMmorCount,
      videoResult,
      mmorResult,
    });
  }

  console.log('\nRegression');
  report.regression = await runRegression(options);
  console.log(
    `Recording regression: ${report.regression.status}${report.regression.reason ? ` (${report.regression.reason})` : ''}`,
  );

  await ensureDir(path.join(projectRoot, 'analysis'));
  const reportPath = path.join(projectRoot, 'analysis', 'recording-batch-analysis.json');
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`Batch report: ${formatPath(reportPath)}`);

  const hasFailure =
    report.recordings.some(
      (recording) => stepFailed(recording.videoResult) || stepFailed(recording.mmorResult),
    ) || stepFailed(report.regression);
  if (hasFailure) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
