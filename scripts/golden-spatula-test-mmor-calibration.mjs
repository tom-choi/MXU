import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const projectRoot = path.join(repoRoot, 'projects', 'golden_spatula_mumu');
const videoAnalysisPath = path.join(projectRoot, 'analysis', 'video', '2', 'analysis.json');
const mmorAnalysisPath = path.join(projectRoot, 'analysis', 'video', '2', 'operations.json');
const rollPipelinePath = path.join(repoRoot, 'src', 'services', 'goldenSpatulaRollPipeline.ts');

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
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

function getRegion(report, key) {
  const region = report.regionStats?.find((item) => item.key === key);
  assert.ok(region, `missing region ${key}`);
  return region;
}

function getTarget(report, key) {
  const target = report.targetValidation?.find((item) => item.key === key);
  assert.ok(target, `missing target validation ${key}`);
  return target;
}

function assertVideoAnalysis(analysis) {
  assert.equal(analysis.metadata?.width, 1280);
  assert.equal(analysis.metadata?.height, 720);
  assert.ok(
    analysis.metadata?.durationSeconds >= 850 && analysis.metadata?.durationSeconds <= 865,
    `unexpected video duration ${analysis.metadata?.durationSeconds}`,
  );
  assert.ok(analysis.events?.length >= 200, 'too few candidate video events');
}

function pointInRect(point, rect) {
  const [x, y] = point;
  const [rectX, rectY, width, height] = rect;
  return x >= rectX && x <= rectX + width && y >= rectY && y <= rectY + height;
}

function distance(pointA, pointB) {
  return Number(Math.hypot(pointA[0] - pointB[0], pointA[1] - pointB[1]).toFixed(2));
}

function assertMmorAnalysis(report, rollPipelineModule) {
  assert.equal(report.metadata?.actionCount, 3498);
  assert.equal(report.metadata?.gestureCount, 365);
  assert.ok(
    report.metadata?.durationSeconds >= 850 && report.metadata?.durationSeconds <= 865,
    `unexpected MMOR duration ${report.metadata?.durationSeconds}`,
  );
  assert.equal(report.coordinateTransform?.selected, 'rotatedClockwise');
  assert.equal(report.videoAnalysis?.eventCount, 223);

  assert.ok(getRegion(report, 'shop').count >= 80, 'shop operation count regressed');
  assert.ok(getRegion(report, 'slot1').count >= 20, 'slot 1 operation count regressed');
  assert.ok(getRegion(report, 'slot2').count >= 20, 'slot 2 operation count regressed');
  assert.ok(getRegion(report, 'slot3').count >= 15, 'slot 3 operation count regressed');
  assert.ok(getRegion(report, 'slot4').count >= 5, 'slot 4 operation count regressed');
  assert.ok(getRegion(report, 'slot5').count >= 5, 'slot 5 operation count regressed');
  assert.ok(getRegion(report, 'refresh').count >= 3, 'refresh operation count regressed');
  assert.ok(getRegion(report, 'buyXp').count >= 1, 'buy XP operation count regressed');

  assert.ok(getTarget(report, 'buyXp').distance <= 25, 'buy XP target drift is too large');
  assert.ok(getTarget(report, 'refresh').distance <= 55, 'refresh target drift is too large');

  const timing = report.timingAnalysis;
  assert.ok(timing, 'missing MMOR timing analysis');
  assert.equal(timing.slotGestureCount, 87);
  assert.ok(
    timing.closeSlotIntervalStats?.median >= 0.8 && timing.closeSlotIntervalStats?.median <= 1.1,
    `unexpected close slot interval median ${timing.closeSlotIntervalStats?.median}`,
  );
  assert.ok(
    timing.refreshToNextShopStats?.min >= 1.5,
    `unexpected refresh-to-shop min ${timing.refreshToNextShopStats?.min}`,
  );
  assert.ok(
    timing.xpToNextShopStats?.min >= 0.5,
    `unexpected XP-to-shop min ${timing.xpToNextShopStats?.min}`,
  );

  assert.ok(
    rollPipelineModule.goldenSpatulaAutoBuyClickPostDelayMs >= 600,
    'buy click post_delay should preserve observed shop tap cadence',
  );
  assert.ok(
    rollPipelineModule.goldenSpatulaBuyXpPostDelayMs >=
      Math.floor(timing.xpToNextShopStats.min * 1000) - 150,
    'XP post_delay is shorter than recorded XP-to-shop cadence',
  );
  assert.ok(
    rollPipelineModule.goldenSpatulaShopRefreshPostDelayMs +
      rollPipelineModule.goldenSpatulaAutoBuyRecognitionTimeoutMs >=
      Math.floor(timing.refreshToNextShopStats.min * 1000) - 150,
    'refresh post_delay plus first recognition window is shorter than recorded refresh cadence',
  );
  assert.ok(
    rollPipelineModule.goldenSpatulaShopRefreshPostDelayMs <=
      Math.ceil(timing.refreshToNextShopStats.median * 1000),
    'refresh post_delay should not exceed recorded median refresh cadence',
  );

  for (const slot of rollPipelineModule.goldenSpatulaShopChampionSlots) {
    const target = [...slot.target];
    const region = getRegion(report, `slot${slot.index}`);
    assert.ok(pointInRect(target, slot.roi), `slot ${slot.index}: target outside slot ROI`);
    assert.ok(
      distance(target, region.medianPoint) <= 70,
      `slot ${slot.index}: target too far from recorded taps`,
    );
  }
}

async function main() {
  const [videoAnalysis, mmorAnalysis, rollPipelineModule] = await Promise.all([
    readJson(videoAnalysisPath),
    readJson(mmorAnalysisPath),
    importRollPipelineModule(),
  ]);

  assertVideoAnalysis(videoAnalysis);
  assertMmorAnalysis(mmorAnalysis, rollPipelineModule);

  console.log('Golden Spatula MMOR calibration test');
  console.log(`Video events checked: ${videoAnalysis.events.length}`);
  console.log(`MMOR gestures checked: ${mmorAnalysis.metadata.gestureCount}`);
  console.log(`Shop operations checked: ${getRegion(mmorAnalysis, 'shop').count}`);
  console.log(
    `Fixed shop buy targets checked: ${rollPipelineModule.goldenSpatulaShopChampionSlots.length}`,
  );
  console.log(
    `Timing evidence checked: shop median ${mmorAnalysis.timingAnalysis.closeSlotIntervalStats.median}s, refresh min ${mmorAnalysis.timingAnalysis.refreshToNextShopStats.min}s`,
  );
  console.log('OK: second recording operations align with current D/XP calibration.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
