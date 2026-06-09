import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { execFile, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const projectRoot = path.join(repoRoot, 'projects', 'golden_spatula_mumu');
const defaultOutRoot = path.join(projectRoot, 'analysis', 'video');
const supportedVideoExtensions = new Set(['.mp4', '.mov', '.mkv', '.avi', '.webm', '.m4v']);
const ignoredSearchDirs = new Set(['.git', 'node_modules', 'dist', 'target']);

const logicalScreen = {
  width: 1280,
  height: 720,
};

const logicalRegions = [
  {
    key: 'top',
    label: 'top HUD',
    rect: [0, 0, 1280, 110],
  },
  {
    key: 'board',
    label: 'board and combat area',
    rect: [0, 90, 1280, 410],
  },
  {
    key: 'shop',
    label: 'shop cards',
    rect: [120, 500, 1040, 145],
  },
  {
    key: 'bottom',
    label: 'bottom controls',
    rect: [0, 610, 1280, 110],
  },
  {
    key: 'right',
    label: 'right stage panel',
    rect: [1040, 0, 240, 720],
  },
];

function usage() {
  return `Usage:
  pnpm golden:analyze-video -- <video-path> [options]

Options:
  --out <dir>              Output directory. Default: projects/golden_spatula_mumu/analysis/video/<video-name>
  --fps <number>           Analysis samples per second. Default: 1
  --width <number>         Analysis width for grayscale diff. Default: 128
  --height <number>        Analysis height for grayscale diff. Default: 72
  --scene-threshold <num>  Full-frame diff threshold. Default: 18
  --region-threshold <num> Region diff threshold. Default: 16
  --min-gap <seconds>      Merge nearby events closer than this. Default: 0.75
  --max-frames <number>    Max event screenshots to extract. Default: 40
  --no-extract             Do not write event screenshots
  --help                   Show this help
`;
}

function parseArgs(args) {
  const options = {
    videoPath: '',
    outDir: '',
    fps: 1,
    width: 128,
    height: 72,
    sceneThreshold: 18,
    regionThreshold: 16,
    minGapSeconds: 0.75,
    maxFrames: 40,
    extractFrames: true,
    help: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }
    if (arg === '--no-extract') {
      options.extractFrames = false;
      continue;
    }
    if (arg === '--out' && next) {
      options.outDir = path.resolve(repoRoot, next);
      index += 1;
      continue;
    }
    if (arg === '--fps' && next) {
      options.fps = Number(next);
      index += 1;
      continue;
    }
    if (arg === '--width' && next) {
      options.width = Number(next);
      index += 1;
      continue;
    }
    if (arg === '--height' && next) {
      options.height = Number(next);
      index += 1;
      continue;
    }
    if (arg === '--scene-threshold' && next) {
      options.sceneThreshold = Number(next);
      index += 1;
      continue;
    }
    if (arg === '--region-threshold' && next) {
      options.regionThreshold = Number(next);
      index += 1;
      continue;
    }
    if (arg === '--min-gap' && next) {
      options.minGapSeconds = Number(next);
      index += 1;
      continue;
    }
    if (arg === '--max-frames' && next) {
      options.maxFrames = Number(next);
      index += 1;
      continue;
    }
    if (!arg.startsWith('-') && !options.videoPath) {
      options.videoPath = path.resolve(repoRoot, arg);
      continue;
    }

    throw new Error(`Unknown or incomplete argument: ${arg}`);
  }

  const numericFields = [
    'fps',
    'width',
    'height',
    'sceneThreshold',
    'regionThreshold',
    'minGapSeconds',
    'maxFrames',
  ];
  for (const field of numericFields) {
    if (!Number.isFinite(options[field]) || options[field] <= 0) {
      throw new Error(`${field} must be a positive number`);
    }
  }

  options.width = Math.round(options.width);
  options.height = Math.round(options.height);
  options.maxFrames = Math.round(options.maxFrames);
  return options;
}

function formatPath(filePath) {
  return path.relative(repoRoot, filePath).replaceAll(path.sep, '/');
}

function sanitizeFileName(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);
}

function formatTime(seconds) {
  const totalMs = Math.max(0, Math.round(seconds * 1000));
  const minutes = Math.floor(totalMs / 60000);
  const secs = Math.floor((totalMs % 60000) / 1000);
  const ms = totalMs % 1000;
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

function formatTimeForFile(seconds) {
  return formatTime(seconds).replace(/[:.]/g, '-');
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function writeJson(filePath, value) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function walkVideoFiles(dir, output = []) {
  if (!existsSync(dir)) return output;
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (ignoredSearchDirs.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkVideoFiles(fullPath, output);
    } else if (
      entry.isFile() &&
      supportedVideoExtensions.has(path.extname(entry.name).toLowerCase())
    ) {
      const stat = await fs.stat(fullPath);
      output.push({ path: fullPath, mtimeMs: stat.mtimeMs, size: stat.size });
    }
  }
  return output;
}

async function findNewestVideo() {
  const candidates = await walkVideoFiles(repoRoot);
  return candidates.sort((a, b) => b.mtimeMs - a.mtimeMs)[0]?.path ?? '';
}

function parseRate(value) {
  if (!value || value === '0/0') return 0;
  const [numerator, denominator] = String(value).split('/').map(Number);
  if (!Number.isFinite(numerator)) return 0;
  if (!Number.isFinite(denominator) || denominator === 0) return numerator;
  return numerator / denominator;
}

async function probeVideo(videoPath) {
  const { stdout } = await execFileAsync(
    'ffprobe',
    ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', videoPath],
    { maxBuffer: 4 * 1024 * 1024 },
  );
  const probe = JSON.parse(stdout);
  const videoStream = (probe.streams ?? []).find((stream) => stream.codec_type === 'video') ?? {};
  return {
    path: videoPath,
    relativePath: formatPath(videoPath),
    durationSeconds: Number(probe.format?.duration ?? videoStream.duration ?? 0),
    sizeBytes: Number(probe.format?.size ?? 0),
    width: Number(videoStream.width ?? 0),
    height: Number(videoStream.height ?? 0),
    codec: videoStream.codec_name ?? '',
    frameRate: parseRate(videoStream.avg_frame_rate ?? videoStream.r_frame_rate),
  };
}

function mapLogicalRect(rect, options) {
  const [x, y, width, height] = rect;
  const mappedX = Math.max(0, Math.floor((x / logicalScreen.width) * options.width));
  const mappedY = Math.max(0, Math.floor((y / logicalScreen.height) * options.height));
  const mappedRight = Math.min(
    options.width,
    Math.ceil(((x + width) / logicalScreen.width) * options.width),
  );
  const mappedBottom = Math.min(
    options.height,
    Math.ceil(((y + height) / logicalScreen.height) * options.height),
  );
  return [
    mappedX,
    mappedY,
    Math.max(1, mappedRight - mappedX),
    Math.max(1, mappedBottom - mappedY),
  ];
}

function computeRegionStats(frame, previousFrame, rect, options) {
  const [x, y, width, height] = rect;
  let sum = 0;
  let diff = 0;
  let count = 0;

  for (let row = y; row < y + height; row += 1) {
    const rowOffset = row * options.width;
    for (let column = x; column < x + width; column += 1) {
      const offset = rowOffset + column;
      const value = frame[offset];
      sum += value;
      if (previousFrame) {
        diff += Math.abs(value - previousFrame[offset]);
      }
      count += 1;
    }
  }

  return {
    mean: count > 0 ? sum / count : 0,
    diff: previousFrame && count > 0 ? diff / count : 0,
  };
}

function computeFrameStats(frame, previousFrame, index, options, mappedRegions) {
  let sum = 0;
  let diff = 0;
  for (let offset = 0; offset < frame.length; offset += 1) {
    sum += frame[offset];
    if (previousFrame) {
      diff += Math.abs(frame[offset] - previousFrame[offset]);
    }
  }

  const regions = {};
  for (const region of mappedRegions) {
    const stats = computeRegionStats(frame, previousFrame, region.rect, options);
    regions[region.key] = {
      label: region.label,
      mean: Number(stats.mean.toFixed(2)),
      diff: Number(stats.diff.toFixed(2)),
    };
  }

  const dominantRegion = Object.entries(regions)
    .sort((a, b) => b[1].diff - a[1].diff)
    .map(([key, value]) => ({ key, ...value }))[0];

  return {
    index,
    timeSeconds: Number((index / options.fps).toFixed(3)),
    time: formatTime(index / options.fps),
    mean: Number((sum / frame.length).toFixed(2)),
    diff: Number((previousFrame ? diff / frame.length : 0).toFixed(2)),
    dominantRegion: dominantRegion?.key ?? '',
    dominantRegionLabel: dominantRegion?.label ?? '',
    dominantRegionDiff: dominantRegion?.diff ?? 0,
    regions,
  };
}

async function runRawFrameAnalysis(videoPath, options) {
  const frameSize = options.width * options.height;
  const mappedRegions = logicalRegions.map((region) => ({
    ...region,
    rect: mapLogicalRect(region.rect, options),
  }));
  const args = [
    '-hide_banner',
    '-loglevel',
    'error',
    '-i',
    videoPath,
    '-vf',
    `fps=${options.fps},scale=${options.width}:${options.height}:flags=fast_bilinear,format=gray`,
    '-f',
    'rawvideo',
    'pipe:1',
  ];

  return new Promise((resolve, reject) => {
    const child = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    const frames = [];
    const stderr = [];
    let pending = Buffer.alloc(0);
    let previousFrame = null;

    child.stdout.on('data', (chunk) => {
      pending = Buffer.concat([pending, chunk]);
      while (pending.length >= frameSize) {
        const frame = Buffer.from(pending.subarray(0, frameSize));
        pending = pending.subarray(frameSize);
        frames.push(computeFrameStats(frame, previousFrame, frames.length, options, mappedRegions));
        previousFrame = frame;
      }
    });

    child.stderr.on('data', (chunk) => {
      stderr.push(chunk.toString('utf8'));
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(
          new Error(`ffmpeg raw analysis failed with code ${code}: ${stderr.join('').trim()}`),
        );
        return;
      }
      if (frames.length === 0) {
        reject(new Error('ffmpeg produced no analysis frames'));
        return;
      }
      resolve({ frames, regions: mappedRegions });
    });
  });
}

function eventReasons(frame, options) {
  const reasons = [];
  if (frame.index === 0) {
    reasons.push('first_frame');
  }
  if (frame.diff >= options.sceneThreshold) {
    reasons.push('scene_change');
  }
  for (const [key, region] of Object.entries(frame.regions)) {
    if (region.diff >= options.regionThreshold) {
      reasons.push(`${key}_change`);
    }
  }
  return reasons;
}

function selectEvents(frames, options) {
  const candidates = frames
    .map((frame) => ({
      ...frame,
      reasons: eventReasons(frame, options),
    }))
    .filter((frame) => frame.reasons.length > 0);

  const merged = [];
  for (const candidate of candidates) {
    const last = merged[merged.length - 1];
    if (!last || candidate.timeSeconds - last.timeSeconds >= options.minGapSeconds) {
      merged.push(candidate);
      continue;
    }
    if (candidate.diff > last.diff || candidate.dominantRegionDiff > last.dominantRegionDiff) {
      merged[merged.length - 1] = candidate;
    }
  }
  return merged;
}

function describeAutomationHint(event) {
  if (event.reasons.includes('shop_change')) {
    return 'Inspect shop cards; likely useful for D roll recognition, buy success, or post-refresh state.';
  }
  if (event.reasons.includes('bottom_change')) {
    return 'Inspect bottom controls; likely useful for refresh, buy, XP, or confirm button timing.';
  }
  if (event.reasons.includes('board_change')) {
    return 'Inspect board area; likely useful for deploy, upgrade, drag, or combat transition timing.';
  }
  if (event.reasons.includes('top_change') || event.reasons.includes('right_change')) {
    return 'Inspect HUD/stage panel; likely useful for round, gold, level, or phase detection.';
  }
  return 'General scene transition; inspect before adding a pipeline guard.';
}

async function extractEventFrames(videoPath, outDir, events, options) {
  const framesDir = path.join(outDir, 'frames');
  await ensureDir(framesDir);

  const selectedEvents = events.slice(0, options.maxFrames);
  for (let index = 0; index < selectedEvents.length; index += 1) {
    const event = selectedEvents[index];
    const name = `${String(index + 1).padStart(3, '0')}_${formatTimeForFile(event.timeSeconds)}_${event.dominantRegion || 'scene'}.png`;
    const outputPath = path.join(framesDir, name);
    await execFileAsync('ffmpeg', [
      '-hide_banner',
      '-loglevel',
      'error',
      '-ss',
      String(Math.max(0, event.timeSeconds)),
      '-i',
      videoPath,
      '-frames:v',
      '1',
      '-vf',
      'scale=1280:-1',
      '-y',
      outputPath,
    ]);
    event.screenshot = formatPath(outputPath);
  }
}

function buildReportMarkdown({ metadata, options, events, outputJsonPath }) {
  const lines = [
    '# Golden Spatula Video Analysis',
    '',
    `Video: \`${metadata.relativePath}\``,
    `Duration: ${Number(metadata.durationSeconds || 0).toFixed(2)}s`,
    `Source: ${metadata.width}x${metadata.height} ${metadata.codec || ''}`.trim(),
    `Analysis: ${options.fps} fps, ${options.width}x${options.height} grayscale diff`,
    `JSON: \`${formatPath(outputJsonPath)}\``,
    '',
    '## Candidate Timeline',
    '',
    '| # | Time | Diff | Dominant | Reasons | Screenshot | Hint |',
    '| - | - | -: | - | - | - | - |',
  ];

  for (const [index, event] of events.entries()) {
    lines.push(
      `| ${index + 1} | ${event.time} | ${event.diff} | ${event.dominantRegionLabel || event.dominantRegion} (${event.dominantRegionDiff}) | ${event.reasons.join(', ')} | ${event.screenshot ? `\`${event.screenshot}\`` : ''} | ${describeAutomationHint(event)} |`,
    );
  }

  lines.push(
    '',
    '## Region Notes',
    '',
    '- `shop_change`: use this to tune shop champion ROI and D roll buy attempts.',
    '- `bottom_change`: use this to tune refresh, XP, and confirm-button click timing.',
    '- `board_change`: use this to tune drag/deploy/upgrade waits.',
    '- `top_change` / `right_change`: use this to add phase, round, gold, or level guards before risky clicks.',
  );

  return `${lines.join('\n')}\n`;
}

async function writeReports({ metadata, options, frames, regions, events, outDir }) {
  await ensureDir(outDir);
  const outputJsonPath = path.join(outDir, 'analysis.json');
  const outputMdPath = path.join(outDir, 'analysis.md');
  const topChanges = [...frames].sort((a, b) => b.diff - a.diff).slice(0, 30);

  await writeJson(outputJsonPath, {
    generatedAt: new Date().toISOString(),
    metadata,
    options: {
      fps: options.fps,
      width: options.width,
      height: options.height,
      sceneThreshold: options.sceneThreshold,
      regionThreshold: options.regionThreshold,
      minGapSeconds: options.minGapSeconds,
      maxFrames: options.maxFrames,
    },
    logicalScreen,
    regions: regions.map((region) => ({
      key: region.key,
      label: region.label,
      logicalRect: logicalRegions.find((candidate) => candidate.key === region.key)?.rect,
      analysisRect: region.rect,
    })),
    frameCount: frames.length,
    events,
    topChanges,
  });

  await fs.writeFile(
    outputMdPath,
    buildReportMarkdown({ metadata, options, events, outputJsonPath }),
    'utf8',
  );

  return { outputJsonPath, outputMdPath };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }

  if (!options.videoPath) {
    options.videoPath = await findNewestVideo();
  }
  if (!options.videoPath || !existsSync(options.videoPath)) {
    throw new Error(
      `${usage()}\nNo video path was provided and no video file was found in the workspace.`,
    );
  }

  if (!options.outDir) {
    const videoName = sanitizeFileName(
      path.basename(options.videoPath, path.extname(options.videoPath)),
    );
    options.outDir = path.join(defaultOutRoot, videoName || 'recording');
  }

  const metadata = await probeVideo(options.videoPath);
  console.log(`Analyzing ${metadata.relativePath}`);
  console.log(
    `Video: ${metadata.width}x${metadata.height}, ${Number(metadata.durationSeconds || 0).toFixed(2)}s, ${metadata.codec || 'unknown codec'}`,
  );

  const { frames, regions } = await runRawFrameAnalysis(options.videoPath, options);
  const events = selectEvents(frames, options).map((event) => ({
    ...event,
    hint: describeAutomationHint(event),
  }));

  if (options.extractFrames) {
    await extractEventFrames(options.videoPath, options.outDir, events, options);
  }

  const { outputJsonPath, outputMdPath } = await writeReports({
    metadata,
    options,
    frames,
    regions,
    events,
    outDir: options.outDir,
  });

  console.log(`Frames sampled: ${frames.length}`);
  console.log(`Candidate events: ${events.length}`);
  console.log(`Report: ${formatPath(outputMdPath)}`);
  console.log(`Data: ${formatPath(outputJsonPath)}`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
