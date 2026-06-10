import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const visionSource = path.join(repoRoot, 'src', 'services', 'goldenSpatulaEconomyVision.ts');
const stabilizerSource = path.join(
  repoRoot,
  'src',
  'services',
  'goldenSpatulaEconomyStabilizer.ts',
);
const video1 = path.join(repoRoot, 'docs', 'mp4s', '金铲铲之战(1).mp4');
const video2 = path.join(repoRoot, 'docs', 'mp4s', '金铲铲之战(2).mp4');

const strictSamples = [
  {
    label: 'video-1 02:24.500 shop HUD',
    video: video1,
    at: '00:02:24.500',
    expected: {
      round: '1-4',
      gold: 12,
      level: 3,
      experience: 0,
      experienceMax: 6,
      streakKind: 'none',
      streakInterest: 0,
    },
  },
  {
    label: 'video-1 03:11.000 level 4 with 0/10 XP',
    video: video1,
    at: '00:03:11.000',
    expected: { gold: 0, level: 4, experience: 0, experienceMax: 10 },
  },
  {
    label: 'video-2 02:06.500 board planning HUD',
    video: video2,
    at: '00:02:06.500',
    expected: {
      round: '1-4',
      gold: 3,
      level: 3,
      experience: 0,
      experienceMax: 6,
      streakKind: 'none',
      streakInterest: 0,
    },
  },
  {
    label: 'video-2 03:00.500 XP partially filled',
    video: video2,
    at: '00:03:00.500',
    expected: { gold: 6, level: 3, experience: 2, experienceMax: 6 },
  },
  {
    label: 'video-2 05:35.500 level 4 with 17 gold',
    video: video2,
    at: '00:05:35.500',
    expected: { gold: 17, level: 4, experience: 0, experienceMax: 10 },
  },
  {
    label: 'video-2 05:41.500 level 4 with 15 gold',
    video: video2,
    at: '00:05:41.500',
    expected: { gold: 15, level: 4, experience: 0, experienceMax: 10 },
  },
];

function formatTimestamp(seconds) {
  const totalMs = Math.round(seconds * 1000);
  const hours = Math.floor(totalMs / 3600000);
  const minutes = Math.floor((totalMs % 3600000) / 60000);
  const secs = Math.floor((totalMs % 60000) / 1000);
  const ms = totalMs % 1000;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(
    secs,
  ).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

function buildCoverageSamples() {
  const ranges = [
    {
      label: 'video-1 mid game shop/economy HUD',
      video: video1,
      startSeconds: 125.5,
      count: 34,
      stepSeconds: 2.5,
    },
    {
      label: 'video-2 early planning/economy HUD',
      video: video2,
      startSeconds: 126.5,
      count: 26,
      stepSeconds: 2.5,
    },
    {
      label: 'video-2 level-4 shop/economy HUD',
      video: video2,
      startSeconds: 331.5,
      count: 10,
      stepSeconds: 1.25,
    },
  ];

  return ranges.flatMap((range) =>
    Array.from({ length: range.count }, (_, index) => {
      const seconds = range.startSeconds + index * range.stepSeconds;
      return {
        label: `${range.label} #${String(index + 1).padStart(2, '0')}`,
        video: range.video,
        at: formatTimestamp(seconds),
      };
    }),
  );
}

const coverageSamples = buildCoverageSamples();

async function importTsModule(sourcePath, outputName) {
  const source = await fs.readFile(sourcePath, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: sourcePath,
  });
  const tempDir = path.join(repoRoot, 'node_modules', '.cache', 'mxu-tests');
  const tempFile = path.join(tempDir, outputName);
  await fs.mkdir(tempDir, { recursive: true });
  await fs.writeFile(tempFile, outputText, 'utf8');
  return import(`${pathToFileURL(tempFile).href}?t=${Date.now()}`);
}

function readVideoFrame(sample) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const errors = [];
    const startedAt = performance.now();
    const child = spawn(
      'ffmpeg',
      [
        '-v',
        'error',
        '-ss',
        sample.at,
        '-i',
        sample.video,
        '-frames:v',
        '1',
        '-vf',
        'scale=1280:720',
        '-f',
        'rawvideo',
        '-pix_fmt',
        'rgba',
        'pipe:1',
      ],
      { cwd: repoRoot, stdio: ['ignore', 'pipe', 'pipe'] },
    );

    child.stdout.on('data', (chunk) => chunks.push(chunk));
    child.stderr.on('data', (chunk) => errors.push(chunk));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(Buffer.concat(errors).toString('utf8') || `ffmpeg exited with ${code}`));
        return;
      }
      const data = Buffer.concat(chunks);
      assert.equal(data.length, 1280 * 720 * 4, `${sample.label}: unexpected frame size`);
      resolve({
        data,
        width: 1280,
        height: 720,
        decodeMs: performance.now() - startedAt,
      });
    });
  });
}

function assertStrictResult(sample, result) {
  for (const [key, value] of Object.entries(sample.expected)) {
    assert.equal(
      result[key],
      value,
      `${sample.label}: expected ${key}=${value}, got ${result[key]}`,
    );
  }
}

function assertCoverageResult(sample, result) {
  const hasAnyValue =
    result.gold !== undefined ||
    result.level !== undefined ||
    result.experience !== undefined ||
    result.experienceMax !== undefined;
  if (!hasAnyValue) return false;

  if (result.gold !== undefined) {
    assert.ok(
      result.gold >= 0 && result.gold <= 99,
      `${sample.label}: invalid gold ${result.gold}`,
    );
  }

  if (result.round !== undefined) {
    assert.match(result.round, /^\d{1,2}-\d{1,2}$/u, `${sample.label}: invalid round`);
  }

  if (result.level !== undefined) {
    assert.ok(
      result.level >= 1 && result.level <= 10,
      `${sample.label}: invalid level ${result.level}`,
    );
  }

  if (result.experience !== undefined || result.experienceMax !== undefined) {
    assert.ok(
      result.experience !== undefined && result.experienceMax !== undefined,
      `${sample.label}: incomplete experience ${JSON.stringify(result.rawText)}`,
    );
    assert.ok(
      result.experience >= 0 && result.experience <= result.experienceMax,
      `${sample.label}: invalid experience ${result.experience}/${result.experienceMax}`,
    );
    assert.ok(
      result.experienceMax >= 1 && result.experienceMax <= 100,
      `${sample.label}: invalid experience max ${result.experienceMax}`,
    );
    assert.match(
      result.rawText.experience ?? '',
      /^\d+\/\d+$/u,
      `${sample.label}: invalid experience text ${result.rawText.experience}`,
    );
  }

  if (result.streakInterest !== undefined) {
    assert.ok(
      result.streakInterest >= 0 && result.streakInterest <= 3,
      `${sample.label}: invalid streak interest ${result.streakInterest}`,
    );
    assert.ok(
      ['win', 'loss', 'none', 'unknown'].includes(result.streakKind),
      `${sample.label}: invalid streak kind ${result.streakKind}`,
    );
  }

  return true;
}

function measureRecognition(images, recognize, passes = 10) {
  const warmupImages = images.slice(0, Math.min(8, images.length));
  for (const image of warmupImages) {
    recognize(image);
  }

  const times = [];
  const startedAt = performance.now();
  for (let pass = 0; pass < passes; pass += 1) {
    for (const image of images) {
      const itemStartedAt = performance.now();
      recognize(image);
      times.push(performance.now() - itemStartedAt);
    }
  }
  const totalMs = performance.now() - startedAt;
  const sorted = [...times].sort((a, b) => a - b);
  const percentile = (value) =>
    sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * value))] ?? 0;
  const measuredFrames = images.length * passes;

  return {
    measuredFrames,
    totalMs,
    averageMs: totalMs / Math.max(1, measuredFrames),
    minMs: sorted[0] ?? 0,
    p50Ms: percentile(0.5),
    p95Ms: percentile(0.95),
    maxMs: sorted[sorted.length - 1] ?? 0,
    fps: measuredFrames / Math.max(totalMs / 1000, 0.001),
  };
}

function formatNumber(value) {
  return value.toFixed(3);
}

function assertStabilizerBehavior(stabilizerModule) {
  const { createGoldenSpatulaEconomyStabilizerState, stabilizeGoldenSpatulaEconomyResult } =
    stabilizerModule;
  let state = createGoldenSpatulaEconomyStabilizerState();

  let stabilized = stabilizeGoldenSpatulaEconomyResult(
    state,
    {
      round: '2-1',
      gold: 10,
      level: 4,
      experience: 0,
      experienceMax: 10,
      streakKind: 'win',
      streakInterest: 1,
      rawText: { round: '2-1', gold: '10', level: '4', experience: '0/10', streak: '1' },
    },
    1000,
  );
  state = stabilized.state;
  assert.deepEqual(stabilized.acceptedFields, ['round', 'gold', 'level', 'experience', 'streak']);
  assert.equal(state.snapshot.round, '2-1');
  assert.equal(state.snapshot.streakKind, 'win');
  assert.equal(state.snapshot.streakInterest, 1);

  stabilized = stabilizeGoldenSpatulaEconomyResult(
    state,
    {
      level: 4,
      rawText: { gold: '', level: '4', experience: '' },
    },
    2000,
  );
  state = stabilized.state;
  assert.equal(stabilized.result.gold, undefined);
  assert.equal(state.snapshot.gold, 10);
  assert.ok(stabilized.missingFields.includes('gold'));
  assert.ok(stabilized.missingFields.includes('experience'));
  assert.ok(stabilized.missingFields.includes('round'));
  assert.ok(stabilized.missingFields.includes('streak'));

  stabilized = stabilizeGoldenSpatulaEconomyResult(
    state,
    {
      gold: 77,
      level: 4,
      experience: 0,
      experienceMax: 10,
      rawText: { gold: '77', level: '4', experience: '0/10' },
    },
    3000,
  );
  state = stabilized.state;
  assert.equal(stabilized.result.gold, undefined);
  assert.ok(stabilized.heldFields.includes('gold'));
  assert.equal(state.snapshot.gold, 10);

  stabilized = stabilizeGoldenSpatulaEconomyResult(
    state,
    {
      gold: 77,
      level: 4,
      experience: 0,
      experienceMax: 10,
      rawText: { gold: '77', level: '4', experience: '0/10' },
    },
    4000,
  );
  state = stabilized.state;
  assert.equal(stabilized.result.gold, 77);
  assert.equal(state.snapshot.gold, 77);

  stabilized = stabilizeGoldenSpatulaEconomyResult(
    state,
    {
      gold: 77,
      level: 1,
      experience: 8,
      experienceMax: 6,
      rawText: { gold: '77', level: '1', experience: '8/6' },
    },
    5000,
  );
  state = stabilized.state;
  assert.equal(stabilized.result.level, undefined);
  assert.equal(stabilized.result.experience, undefined);
  assert.ok(stabilized.heldFields.includes('level'));
  assert.ok(stabilized.heldFields.includes('experience'));
  assert.equal(state.snapshot.level, 4);
  assert.equal(state.snapshot.experience, 0);

  stabilized = stabilizeGoldenSpatulaEconomyResult(
    state,
    {
      gold: 77,
      level: 5,
      experience: 0,
      experienceMax: 20,
      rawText: { gold: '77', level: '5', experience: '0/20' },
    },
    6000,
  );
  assert.equal(stabilized.result.level, 5);
  assert.equal(stabilized.result.experience, 0);
  assert.equal(stabilized.result.experienceMax, 20);
}

const { recognizeGoldenSpatulaEconomyFromImageData } = await importTsModule(
  visionSource,
  'goldenSpatulaEconomyVision.mjs',
);
const stabilizerModule = await importTsModule(
  stabilizerSource,
  'goldenSpatulaEconomyStabilizer.mjs',
);
assertStabilizerBehavior(stabilizerModule);

const decodedImages = [];
const decodeTimes = [];

for (const sample of strictSamples) {
  const imageData = await readVideoFrame(sample);
  decodeTimes.push(imageData.decodeMs);
  const result = recognizeGoldenSpatulaEconomyFromImageData(imageData);
  assertStrictResult(sample, result);
  decodedImages.push(imageData);
  console.log(`${sample.label}: ${JSON.stringify(result.rawText)}`);
}

let coverageWithGold = 0;
let coverageWithLevel = 0;
let coverageWithExperience = 0;
let coveragePassed = 0;
let coverageSkipped = 0;

for (const sample of coverageSamples) {
  const imageData = await readVideoFrame(sample);
  decodeTimes.push(imageData.decodeMs);
  const result = recognizeGoldenSpatulaEconomyFromImageData(imageData);
  const hasEconomyFields = assertCoverageResult(sample, result);
  if (!hasEconomyFields) {
    coverageSkipped += 1;
    continue;
  }

  coveragePassed += 1;
  decodedImages.push(imageData);
  if (result.gold !== undefined) coverageWithGold += 1;
  if (result.level !== undefined) coverageWithLevel += 1;
  if (result.experience !== undefined && result.experienceMax !== undefined)
    coverageWithExperience += 1;
}

assert.ok(
  coveragePassed >= 50,
  `Expected at least 50 valid coverage samples, got ${coveragePassed} valid and ${coverageSkipped} skipped`,
);
assert.ok(
  coverageWithGold >= 50,
  `Expected at least 50 gold coverage samples, got ${coverageWithGold}`,
);
assert.ok(
  coverageWithLevel >= 50,
  `Expected at least 50 level coverage samples, got ${coverageWithLevel}`,
);
assert.ok(
  coverageWithExperience >= 50,
  `Expected at least 50 experience coverage samples, got ${coverageWithExperience}`,
);

const benchmark = measureRecognition(decodedImages, recognizeGoldenSpatulaEconomyFromImageData);
const decodeTotalMs = decodeTimes.reduce((sum, value) => sum + value, 0);
assert.ok(
  benchmark.averageMs < 2,
  `Expected average recognition under 2ms/frame, got ${formatNumber(benchmark.averageMs)}ms`,
);
assert.ok(
  benchmark.p95Ms < 5,
  `Expected p95 recognition under 5ms/frame, got ${formatNumber(benchmark.p95Ms)}ms`,
);

console.log(
  `Coverage samples passed: ${coveragePassed}/${coverageSamples.length} ` +
    `(skipped ${coverageSkipped}, gold ${coverageWithGold}, level ${coverageWithLevel}, ` +
    `xp ${coverageWithExperience})`,
);
console.log(`Strict samples passed: ${strictSamples.length}`);
console.log('Economy stabilizer scenarios passed');
console.log(
  `Recognition speed: avg ${formatNumber(benchmark.averageMs)} ms/frame, ` +
    `p50 ${formatNumber(benchmark.p50Ms)} ms, p95 ${formatNumber(benchmark.p95Ms)} ms, ` +
    `max ${formatNumber(benchmark.maxMs)} ms, ~${formatNumber(benchmark.fps)} fps ` +
    `(${benchmark.measuredFrames} recognition runs)`,
);
console.log(
  `Test frame extraction: avg ${formatNumber(decodeTotalMs / decodeTimes.length)} ms/frame ` +
    `(ffmpeg only, not used by the app polling path)`,
);
console.log(
  `Golden Spatula economy vision samples passed: ${strictSamples.length + coveragePassed}`,
);
