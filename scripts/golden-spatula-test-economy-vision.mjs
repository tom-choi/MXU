import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const visionSource = path.join(repoRoot, 'src', 'services', 'goldenSpatulaEconomyVision.ts');
const shopOddsSource = path.join(repoRoot, 'src', 'services', 'goldenSpatulaShopOdds.ts');
const stabilizerSource = path.join(
  repoRoot,
  'src',
  'services',
  'goldenSpatulaEconomyStabilizer.ts',
);
const verifiedSamplesPath = path.join(
  repoRoot,
  'scripts',
  'fixtures',
  'golden-spatula-economy-video4-samples.json',
);
const video4 = path.join(repoRoot, 'docs', 'mp4s', '金铲铲之战(4).mp4');

const strictSamples = [
  {
    label: 'video-4 01:20.000 pre-economy false positive guard',
    video: video4,
    at: '00:01:20.000',
    expected: {
      experience: undefined,
      experienceMax: undefined,
      streakKind: 'unknown',
      streakInterest: undefined,
      shopOdds: undefined,
      shopOddsSource: undefined,
    },
  },
  {
    label: 'video-4 02:20.000 first shop HUD',
    video: video4,
    at: '00:02:20.000',
    expected: {
      round: '1-3',
      gold: 2,
      level: 2,
      experience: 0,
      experienceMax: 2,
      streakKind: 'none',
      streakInterest: 0,
    },
  },
  {
    label: 'video-4 03:00.000 stage 1-4 economy HUD',
    video: video4,
    at: '00:03:00.000',
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
    label: 'video-4 04:00.000 stage 2-1 with partial XP',
    video: video4,
    at: '00:04:00.000',
    expected: { round: '2-1', gold: 15, level: 3, experience: 2, experienceMax: 6 },
  },
  {
    label: 'video-4 05:40.000 level 4 win streak',
    video: video4,
    at: '00:05:40.000',
    expected: {
      gold: 20,
      level: 4,
      experience: 2,
      experienceMax: 10,
      streakKind: 'win',
      streakInterest: 1,
    },
  },
  {
    label: 'video-4 06:40.000 level 4 two-streak economy HUD',
    video: video4,
    at: '00:06:40.000',
    expected: {
      gold: 29,
      level: 4,
      experience: 4,
      experienceMax: 10,
      streakKind: 'win',
      streakInterest: 2,
    },
  },
  {
    label: 'video-4 08:00.000 transition ignores stray shop odds',
    video: video4,
    at: '00:08:00.000',
    expected: {
      gold: undefined,
      level: undefined,
      experience: undefined,
      experienceMax: undefined,
      shopOdds: undefined,
      shopOddsSource: undefined,
    },
  },
  {
    label: 'video-4 08:40.000 level 5 economy HUD',
    video: video4,
    at: '00:08:40.000',
    expected: {
      gold: 32,
      level: 5,
      experience: 0,
      experienceMax: 20,
      streakKind: 'win',
      streakInterest: 3,
    },
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

function buildVerifiedSamples(fixture) {
  return fixture.ranges.flatMap((range, rangeIndex) =>
    Array.from({ length: range.count }, (_, index) => {
      const seconds = range.startSeconds + index;
      return {
        label: `video-4 verified #${String(rangeIndex + 1).padStart(3, '0')}.${String(
          index + 1,
        ).padStart(2, '0')}`,
        video: video4,
        at: formatTimestamp(seconds),
        expected: range.expected,
      };
    }),
  );
}

const verifiedFixture = JSON.parse(await fs.readFile(verifiedSamplesPath, 'utf8'));
const verifiedSamples = buildVerifiedSamples(verifiedFixture);

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

function cloneImageDataWithObscuredRect(imageData, rect) {
  const data = Buffer.from(imageData.data);
  for (let y = rect.y; y < rect.y + rect.height; y += 1) {
    for (let x = rect.x; x < rect.x + rect.width; x += 1) {
      const offset = (y * imageData.width + x) * 4;
      data[offset] = 0;
      data[offset + 1] = 0;
      data[offset + 2] = 0;
      data[offset + 3] = 255;
    }
  }

  return {
    ...imageData,
    data,
  };
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
      result.streakInterest >= 0 && result.streakInterest <= 99,
      `${sample.label}: invalid streak interest ${result.streakInterest}`,
    );
    assert.ok(
      ['win', 'loss', 'none', 'unknown'].includes(result.streakKind),
      `${sample.label}: invalid streak kind ${result.streakKind}`,
    );
  }

  return true;
}

function createAccuracyMetrics() {
  return {
    round: { total: 0, passed: 0, failures: [] },
    gold: { total: 0, passed: 0, failures: [] },
    level: { total: 0, passed: 0, failures: [] },
    experience: { total: 0, passed: 0, failures: [] },
    streak: { total: 0, passed: 0, failures: [] },
    shopOdds: { total: 0, passed: 0, failures: [] },
  };
}

function recordMetric(metrics, key, sample, passed, expected, actual) {
  const metric = metrics[key];
  metric.total += 1;
  if (passed) {
    metric.passed += 1;
    return;
  }

  metric.failures.push({
    label: sample.label,
    at: sample.at,
    expected,
    actual,
  });
}

function sameShopOdds(expected, actual) {
  if (!expected || !actual) return false;
  for (const cost of [1, 2, 3, 4, 5]) {
    const expectedValue = expected[cost];
    const actualValue = actual[cost];
    if (expectedValue === undefined && actualValue === undefined) continue;
    if (expectedValue === undefined || actualValue === undefined) return false;
    if (Math.abs(expectedValue - actualValue) > 0.0001) return false;
  }
  return true;
}

function evaluateVerifiedResult(sample, result, metrics) {
  const { expected } = sample;

  if (expected.round !== undefined) {
    recordMetric(metrics, 'round', sample, result.round === expected.round, expected.round, result.round);
  }

  if (expected.gold !== undefined) {
    recordMetric(metrics, 'gold', sample, result.gold === expected.gold, expected.gold, result.gold);
  }

  if (expected.level !== undefined) {
    recordMetric(
      metrics,
      'level',
      sample,
      result.level === expected.level,
      expected.level,
      result.level,
    );
  }

  if (expected.experience !== undefined && expected.experienceMax !== undefined) {
    recordMetric(
      metrics,
      'experience',
      sample,
      result.experience === expected.experience && result.experienceMax === expected.experienceMax,
      `${expected.experience}/${expected.experienceMax}`,
      `${result.experience}/${result.experienceMax}`,
    );
  }

  if (expected.streakKind !== undefined && expected.streakInterest !== undefined) {
    recordMetric(
      metrics,
      'streak',
      sample,
      result.streakKind === expected.streakKind && result.streakInterest === expected.streakInterest,
      `${expected.streakKind}:${expected.streakInterest}`,
      `${result.streakKind}:${result.streakInterest}`,
    );
  }

  if (expected.shopOdds !== undefined) {
    recordMetric(
      metrics,
      'shopOdds',
      sample,
      sameShopOdds(expected.shopOdds, result.shopOdds),
      expected.shopOdds,
      result.shopOdds,
    );
  }
}

function getMetricAccuracy(metric) {
  return metric.total > 0 ? metric.passed / metric.total : 0;
}

function assertVerifiedMetrics(metrics, fixture, sampleCount) {
  const { minSamples, minPerClassAccuracy, minPerClassSamples } = fixture.requirements;
  assert.ok(sampleCount >= minSamples, `Expected at least ${minSamples} samples, got ${sampleCount}`);

  for (const [key, metric] of Object.entries(metrics)) {
    const accuracy = getMetricAccuracy(metric);
    assert.ok(
      metric.total >= minPerClassSamples,
      `Expected at least ${minPerClassSamples} ${key} samples, got ${metric.total}`,
    );
    assert.ok(
      accuracy >= minPerClassAccuracy,
      `${key} accuracy ${formatNumber(accuracy * 100)}% is below ${formatNumber(
        minPerClassAccuracy * 100,
      )}% (${metric.passed}/${metric.total}). First failures: ${JSON.stringify(
        metric.failures.slice(0, 5),
      )}`,
    );
  }
}

function assertShopOddsMatchLevelTable(label, result, getShopOddsByLevel) {
  const expectedOdds = getShopOddsByLevel(result.level);
  if (!expectedOdds) return;

  for (const cost of [1, 2, 3, 4, 5]) {
    assert.equal(
      result.shopOdds?.[cost],
      expectedOdds[cost],
      `${label}: expected ${cost}-cost shop odds ${expectedOdds[cost]}, got ${result.shopOdds?.[cost]}`,
    );
  }
}

function assertShopOddsResolverBehavior(resolveShopOdds, getShopOddsByLevel) {
  const level3Odds = getShopOddsByLevel(3);
  const resolvedMixed = resolveShopOdds({ 1: 0.75, 2: 0.02, 5: 0.11 }, level3Odds);
  assert.equal(resolvedMixed.source, 'mixed');
  assert.equal(resolvedMixed.odds?.[1], 0.75);
  assert.equal(resolvedMixed.sourceByCost?.[1], 'ocr');
  assert.equal(resolvedMixed.odds?.[2], 0.25);
  assert.equal(resolvedMixed.sourceByCost?.[2], 'levelTable');
  assert.equal(resolvedMixed.odds?.[5], 0);
  assert.equal(resolvedMixed.sourceByCost?.[5], 'levelTable');

  const resolvedOcrOnly = resolveShopOdds({ 1: 0.74, 2: 0.26 }, undefined);
  assert.equal(resolvedOcrOnly.source, 'ocr');
  assert.equal(resolvedOcrOnly.odds?.[1], 0.74);
  assert.equal(resolvedOcrOnly.odds?.[2], 0.26);

  const resolvedLevelOnly = resolveShopOdds(undefined, level3Odds);
  assert.equal(resolvedLevelOnly.source, 'levelTable');
  assert.equal(resolvedLevelOnly.odds?.[3], 0);
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

const { getGoldenSpatulaShopOddsByLevel, resolveGoldenSpatulaShopOdds } = await importTsModule(
  shopOddsSource,
  'goldenSpatulaShopOdds',
);
const { recognizeGoldenSpatulaEconomyFromImageData } = await importTsModule(
  visionSource,
  'goldenSpatulaEconomyVision.mjs',
);
const stabilizerModule = await importTsModule(
  stabilizerSource,
  'goldenSpatulaEconomyStabilizer.mjs',
);
assertStabilizerBehavior(stabilizerModule);
assertShopOddsResolverBehavior(resolveGoldenSpatulaShopOdds, getGoldenSpatulaShopOddsByLevel);

const strictImages = [];
const benchmarkImages = [];
const decodeTimes = [];

for (const sample of strictSamples) {
  const imageData = await readVideoFrame(sample);
  decodeTimes.push(imageData.decodeMs);
  const result = recognizeGoldenSpatulaEconomyFromImageData(imageData);
  assertStrictResult(sample, result);
  assertShopOddsMatchLevelTable(sample.label, result, getGoldenSpatulaShopOddsByLevel);
  strictImages.push(imageData);
  benchmarkImages.push(imageData);
  console.log(`${sample.label}: ${JSON.stringify(result.rawText)}`);
}

const partialShopOddsFrame = cloneImageDataWithObscuredRect(strictImages[2], {
  x: 362,
  y: 548,
  width: 30,
  height: 22,
});
const partialShopOddsResult = recognizeGoldenSpatulaEconomyFromImageData(partialShopOddsFrame);
assert.equal(partialShopOddsResult.level, 3);
assert.equal(partialShopOddsResult.shopOddsSource, 'mixed');
assert.equal(partialShopOddsResult.shopOdds?.[1], 0.75);
assert.equal(partialShopOddsResult.shopOdds?.[2], 0.25);
assert.equal(partialShopOddsResult.shopOdds?.[3], 0);
assert.equal(partialShopOddsResult.rawText.shopOdds?.[2], '25%');

const accuracyMetrics = createAccuracyMetrics();

for (const sample of verifiedSamples) {
  const imageData = await readVideoFrame(sample);
  decodeTimes.push(imageData.decodeMs);
  const result = recognizeGoldenSpatulaEconomyFromImageData(imageData);
  assertCoverageResult(sample, result);
  evaluateVerifiedResult(sample, result, accuracyMetrics);
  if (benchmarkImages.length < 96) benchmarkImages.push(imageData);
}

assertVerifiedMetrics(accuracyMetrics, verifiedFixture, verifiedSamples.length);

const benchmark = measureRecognition(benchmarkImages, recognizeGoldenSpatulaEconomyFromImageData);
const decodeTotalMs = decodeTimes.reduce((sum, value) => sum + value, 0);
assert.ok(
  benchmark.averageMs < 5,
  `Expected average recognition under 5ms/frame, got ${formatNumber(benchmark.averageMs)}ms`,
);
assert.ok(
  benchmark.p95Ms < 8,
  `Expected p95 recognition under 8ms/frame, got ${formatNumber(benchmark.p95Ms)}ms`,
);

console.log(`Verified samples checked: ${verifiedSamples.length}`);
for (const [key, metric] of Object.entries(accuracyMetrics)) {
  console.log(
    `${key} accuracy: ${formatNumber(getMetricAccuracy(metric) * 100)}% ` +
      `(${metric.passed}/${metric.total})`,
  );
}
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
  `Golden Spatula economy vision samples passed: ${strictSamples.length + verifiedSamples.length}`,
);
