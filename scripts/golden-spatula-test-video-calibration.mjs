import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const projectRoot = path.join(repoRoot, 'projects', 'golden_spatula_mumu');
const analysisPath = path.join(projectRoot, 'analysis', 'video', '1', 'analysis.json');
const cropRecipesPath = path.join(projectRoot, 'tooling', 'crop-recipes.json');
const mainPipelinePath = path.join(projectRoot, 'resource', 'pipeline', 'main.json');
const rollPipelinePath = path.join(repoRoot, 'src', 'services', 'goldenSpatulaRollPipeline.ts');

const expectedVideo = {
  width: 1280,
  height: 720,
  minDuration: 280,
  maxDuration: 285,
  minEvents: 50,
  keyTimes: ['02:24.500', '03:11.000'],
};

const expectedShopSlots = [
  { index: 1, label: '1', roi: [325, 580, 158, 125], target: [404, 642, 2, 2] },
  { index: 2, label: '2', roi: [483, 580, 158, 125], target: [562, 642, 2, 2] },
  { index: 3, label: '3', roi: [641, 580, 158, 125], target: [720, 642, 2, 2] },
  { index: 4, label: '4', roi: [799, 580, 158, 125], target: [878, 642, 2, 2] },
  { index: 5, label: '5', roi: [957, 580, 158, 125], target: [1036, 642, 2, 2] },
];

const expectedShopRegion = {
  key: 'shop',
  logicalRect: [120, 500, 1040, 145],
};

const expectedBottomRegion = {
  key: 'bottom',
  logicalRect: [0, 610, 1280, 110],
};

const expectedRefresh = {
  template: ['ingame/shop_refresh_button_idle.png', 'ingame/shop_refresh_button_active.png'],
  threshold: [0.76, 0.7],
  roi: [180, 640, 140, 80],
  target: [286, 681, 2, 2],
};

const expectedBuyXp = {
  template: ['ingame/buy_xp_button_idle.png', 'ingame/buy_xp_button_active.png'],
  threshold: [0.76, 0.7],
  roi: [180, 575, 140, 80],
  target: [286, 615, 2, 2],
};

const expectedCropRecipes = [
  {
    source: 'samples/screenshots/source_in_game_shop_idle.png',
    output: 'resource/image/ingame/buy_xp_button_idle.png',
    rect: [188, 586, 124, 56],
  },
  {
    source: 'samples/screenshots/source_in_game_shop_active.png',
    output: 'resource/image/ingame/buy_xp_button_active.png',
    rect: [188, 586, 124, 56],
  },
  {
    source: 'samples/screenshots/source_in_game_shop_idle.png',
    output: 'resource/image/ingame/shop_refresh_button_idle.png',
    rect: [188, 652, 124, 56],
  },
  {
    source: 'samples/screenshots/source_in_game_shop_active.png',
    output: 'resource/image/ingame/shop_refresh_button_active.png',
    rect: [188, 652, 124, 56],
  },
];

const staticRefreshNodes = [
  'AutoRollShopOnce_Click1',
  'AutoRollShopThree_Click1',
  'AutoRollShopThree_Click2',
  'AutoRollShopThree_Click3',
  'AutoRollShopFive_Click1',
  'AutoRollShopFive_Click2',
  'AutoRollShopFive_Click3',
  'AutoRollShopFive_Click4',
  'AutoRollShopFive_Click5',
];

const staticBuyXpNodes = [
  'AutoBuyExperienceOnce_Click',
  'AutoBuyExperienceThree_Click1',
  'AutoBuyExperienceThree_Click2',
  'AutoBuyExperienceThree_Click3',
  'AutoBuyExperienceFive_Click1',
  'AutoBuyExperienceFive_Click2',
  'AutoBuyExperienceFive_Click3',
  'AutoBuyExperienceFive_Click4',
  'AutoBuyExperienceFive_Click5',
];

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

function getNode(nodes, nodeName) {
  const node = nodes[nodeName];
  assert.ok(node, `missing node ${nodeName}`);
  return node;
}

function assertTemplateClickNode(node, expected, nodeName) {
  assert.equal(node.recognition, 'TemplateMatch', `${nodeName}: unexpected recognition`);
  assert.deepEqual(node.template, expected.template, `${nodeName}: unexpected template`);
  assert.deepEqual(node.threshold, expected.threshold, `${nodeName}: unexpected threshold`);
  assert.deepEqual(node.roi, expected.roi, `${nodeName}: unexpected roi`);
  assert.deepEqual(node.target, expected.target, `${nodeName}: unexpected target`);
  assert.equal(node.action, 'Click', `${nodeName}: unexpected action`);
}

function readPngSize(buffer, filePath) {
  assert.equal(buffer.toString('ascii', 1, 4), 'PNG', `${filePath}: not a PNG`);
  assert.equal(buffer.toString('ascii', 12, 16), 'IHDR', `${filePath}: missing IHDR`);
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

async function assertPngSize(filePath, width, height) {
  assert.ok(existsSync(filePath), `${filePath}: missing PNG`);
  const size = readPngSize(await fs.readFile(filePath), filePath);
  assert.equal(size.width, width, `${filePath}: unexpected width`);
  assert.equal(size.height, height, `${filePath}: unexpected height`);
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

function assertVideoAnalysis(analysis) {
  assert.equal(analysis.metadata?.width, expectedVideo.width);
  assert.equal(analysis.metadata?.height, expectedVideo.height);
  assert.equal(analysis.logicalScreen?.width, expectedVideo.width);
  assert.equal(analysis.logicalScreen?.height, expectedVideo.height);
  assert.ok(
    analysis.metadata?.durationSeconds >= expectedVideo.minDuration &&
      analysis.metadata?.durationSeconds <= expectedVideo.maxDuration,
    `unexpected duration ${analysis.metadata?.durationSeconds}`,
  );
  assert.ok(analysis.events?.length >= expectedVideo.minEvents, 'too few candidate events');

  const relativePath = String(analysis.metadata?.relativePath ?? '').replaceAll('\\', '/');
  assert.ok(relativePath.startsWith('docs/mp4s/'), `unexpected video path ${relativePath}`);
  assert.ok(relativePath.endsWith('.mp4'), `unexpected video extension ${relativePath}`);

  for (const expected of [expectedShopRegion, expectedBottomRegion]) {
    const region = analysis.regions?.find((item) => item.key === expected.key);
    assert.ok(region, `missing analysis region ${expected.key}`);
    assert.deepEqual(region.logicalRect, expected.logicalRect, `${expected.key}: bad region`);
  }

  for (const time of expectedVideo.keyTimes) {
    const event = analysis.events?.find((item) => item.time === time);
    assert.ok(event, `missing key video event ${time}`);
    assert.ok(
      event.reasons?.includes('shop_change') || event.reasons?.includes('bottom_change'),
      `${time}: expected shop or bottom change`,
    );
  }
}

async function assertCropRecipes(cropRecipes) {
  for (const expected of expectedCropRecipes) {
    const recipe = cropRecipes.find(
      (item) => item.source === expected.source && item.output === expected.output,
    );
    assert.ok(recipe, `missing crop recipe ${expected.output}`);
    assert.deepEqual(recipe.rect, expected.rect, `${expected.output}: unexpected rect`);

    await assertPngSize(path.join(projectRoot, expected.source), 1280, 720);
    await assertPngSize(
      path.join(projectRoot, expected.output),
      expected.rect[2],
      expected.rect[3],
    );
  }
}

function assertRollPipelineConstants(module) {
  assert.deepEqual([...module.goldenSpatulaBuyXpButtonTemplates], expectedBuyXp.template);
  assert.deepEqual([...module.goldenSpatulaBuyXpButtonThresholds], expectedBuyXp.threshold);
  assert.deepEqual([...module.goldenSpatulaBuyXpButtonRoi], expectedBuyXp.roi);
  assert.deepEqual([...module.goldenSpatulaBuyXpTarget], expectedBuyXp.target);

  assert.deepEqual([...module.goldenSpatulaShopRefreshButtonTemplates], expectedRefresh.template);
  assert.deepEqual([...module.goldenSpatulaShopRefreshButtonThresholds], expectedRefresh.threshold);
  assert.deepEqual([...module.goldenSpatulaShopRefreshButtonRoi], expectedRefresh.roi);
  assert.deepEqual([...module.goldenSpatulaShopRefreshTarget], expectedRefresh.target);

  assert.deepEqual(
    module.goldenSpatulaShopChampionSlots.map((slot) => ({
      index: slot.index,
      label: slot.label,
      roi: [...slot.roi],
      target: [...slot.target],
    })),
    expectedShopSlots,
  );
}

function assertStaticPipelineCalibration(nodes) {
  for (const nodeName of staticRefreshNodes) {
    assertTemplateClickNode(getNode(nodes, nodeName), expectedRefresh, nodeName);
  }

  for (const nodeName of staticBuyXpNodes) {
    assertTemplateClickNode(getNode(nodes, nodeName), expectedBuyXp, nodeName);
  }
}

async function main() {
  const [analysis, cropRecipes, mainPipeline, rollPipelineModule] = await Promise.all([
    readJson(analysisPath),
    readJson(cropRecipesPath),
    readJson(mainPipelinePath),
    importRollPipelineModule(),
  ]);

  assertVideoAnalysis(analysis);
  await assertCropRecipes(cropRecipes);
  assertRollPipelineConstants(rollPipelineModule);
  assertStaticPipelineCalibration(mainPipeline);

  console.log('Golden Spatula video calibration test');
  console.log(`Video events checked: ${analysis.events.length}`);
  console.log(`Crop recipes checked: ${expectedCropRecipes.length}`);
  console.log(`Shop slots checked: ${expectedShopSlots.length}`);
  console.log(`Static click nodes checked: ${staticRefreshNodes.length + staticBuyXpNodes.length}`);
  console.log('OK: video calibration is synchronized with static and dynamic automation.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
