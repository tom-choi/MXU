import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const projectRoot = path.join(repoRoot, 'projects', 'golden_spatula_mumu');
const mainPipelinePath = path.join(projectRoot, 'resource', 'pipeline', 'main.json');
const interfacePath = path.join(projectRoot, 'interface.json');
const cropRecipesPath = path.join(projectRoot, 'tooling', 'crop-recipes.json');
const videoAnalysisPath = path.join(projectRoot, 'analysis', 'video', '1', 'analysis.json');

const shopRefreshGuard = {
  template: ['ingame/shop_refresh_button_idle.png', 'ingame/shop_refresh_button_active.png'],
  threshold: [0.76, 0.7],
  roi: [180, 640, 140, 80],
  target: [286, 681, 2, 2],
};

const buyXpGuard = {
  template: ['ingame/buy_xp_button_idle.png', 'ingame/buy_xp_button_active.png'],
  threshold: [0.76, 0.7],
  roi: [180, 575, 140, 80],
  target: [286, 615, 2, 2],
};

const ingameTemplateRecipes = [
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

const rollTaskCases = [
  { suffix: 'Once', count: 1 },
  { suffix: 'Three', count: 3 },
  { suffix: 'Five', count: 5 },
];

const buyXpTaskCases = [
  { suffix: 'Once', count: 1, clickPrefix: 'AutoBuyExperienceOnce_Click' },
  { suffix: 'Three', count: 3, clickPrefix: 'AutoBuyExperienceThree_Click' },
  { suffix: 'Five', count: 5, clickPrefix: 'AutoBuyExperienceFive_Click' },
];

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

function getNode(nodes, nodeName) {
  const node = nodes[nodeName];
  assert.ok(node, `missing node ${nodeName}`);
  return node;
}

function getTask(interfaceJson, taskName) {
  const task = interfaceJson.task?.find((item) => item.name === taskName);
  assert.ok(task, `missing interface task ${taskName}`);
  return task;
}

function assertArrayIncludesAll(actual, expected, label) {
  for (const item of expected) {
    assert.ok(actual?.includes(item), `${label} missing ${item}`);
  }
}

function assertTemplateGuard(node, guard, nodeName) {
  assert.equal(node.recognition, 'TemplateMatch', `${nodeName}: must guard with TemplateMatch`);
  assert.deepEqual(node.template, guard.template, `${nodeName}: unexpected template`);
  assert.deepEqual(node.threshold, guard.threshold, `${nodeName}: unexpected threshold`);
  assert.deepEqual(node.roi, guard.roi, `${nodeName}: unexpected roi`);
  assert.deepEqual(node.target, guard.target, `${nodeName}: unexpected click target`);
  assert.equal(node.action, 'Click', `${nodeName}: unexpected action`);
  assert.equal(node.timeout, 1500, `${nodeName}: unexpected timeout`);
  assert.equal(node.post_delay, 900, `${nodeName}: unexpected post_delay`);
}

function getFocus(node, message, nodeName) {
  const focus = node.focus?.[message];
  assert.ok(focus, `${nodeName}: missing focus ${message}`);
  return focus;
}

function assertXpFocus(payload, event, extra, nodeName) {
  assert.equal(payload.scope, 'goldenSpatula.xp', `${nodeName}: unexpected focus scope`);
  assert.equal(payload.display, 'log', `${nodeName}: unexpected focus display`);
  assert.equal(payload.event, event, `${nodeName}: unexpected focus event`);
  for (const [key, value] of Object.entries(extra)) {
    assert.deepEqual(payload[key], value, `${nodeName}: unexpected focus.${key}`);
  }
}

function readPngSize(buffer, filePath) {
  assert.equal(buffer.toString('ascii', 1, 4), 'PNG', `${filePath}: not a PNG file`);
  assert.equal(buffer.toString('ascii', 12, 16), 'IHDR', `${filePath}: missing IHDR chunk`);
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

async function assertPngSize(filePath, expectedWidth, expectedHeight) {
  assert.ok(existsSync(filePath), `${filePath}: missing PNG`);
  const size = readPngSize(await fs.readFile(filePath), filePath);
  assert.equal(size.width, expectedWidth, `${filePath}: unexpected width`);
  assert.equal(size.height, expectedHeight, `${filePath}: unexpected height`);
}

async function validateVideoAndCropAssets(cropRecipes) {
  const analysis = await readJson(videoAnalysisPath);
  assert.equal(analysis.metadata?.relativePath, 'docs/mp4s/金铲铲之战(1).mp4');
  assert.equal(analysis.metadata?.width, 1280);
  assert.equal(analysis.metadata?.height, 720);
  assert.equal(analysis.logicalScreen?.width, 1280);
  assert.equal(analysis.logicalScreen?.height, 720);
  assert.ok(
    analysis.metadata?.durationSeconds > 280 && analysis.metadata?.durationSeconds < 285,
    'unexpected video duration',
  );

  for (const expected of ingameTemplateRecipes) {
    const recipe = cropRecipes.find(
      (item) => item.source === expected.source && item.output === expected.output,
    );
    assert.ok(recipe, `missing crop recipe for ${expected.output}`);
    assert.deepEqual(recipe.rect, expected.rect, `${expected.output}: unexpected crop rect`);

    const sourcePath = path.join(projectRoot, expected.source);
    const outputPath = path.join(projectRoot, expected.output);
    assert.ok(existsSync(sourcePath), `${expected.source}: missing crop source`);
    await assertPngSize(sourcePath, 1280, 720);
    await assertPngSize(outputPath, expected.rect[2], expected.rect[3]);
  }
}

function validateInterfaceTasks(interfaceJson) {
  for (const { suffix } of rollTaskCases) {
    const taskName = `AutoRollShop${suffix}`;
    const task = getTask(interfaceJson, taskName);
    assert.equal(task.entry, taskName);
    assert.equal(task.default_check, false);
    assertArrayIncludesAll(task.group, ['automation'], `${taskName}.group`);
    assertArrayIncludesAll(task.controller, ['MuMuAdb'], `${taskName}.controller`);
    assertArrayIncludesAll(
      task.resource,
      ['GoldenSpatula', 'GoldenSpatulaKnowledge'],
      `${taskName}.resource`,
    );
  }

  for (const { suffix } of buyXpTaskCases) {
    const taskName = `AutoBuyExperience${suffix}`;
    const task = getTask(interfaceJson, taskName);
    assert.equal(task.entry, taskName);
    assert.equal(task.default_check, false);
    assertArrayIncludesAll(task.group, ['automation'], `${taskName}.group`);
    assertArrayIncludesAll(task.controller, ['MuMuAdb'], `${taskName}.controller`);
    assertArrayIncludesAll(
      task.resource,
      ['GoldenSpatula', 'GoldenSpatulaKnowledge'],
      `${taskName}.resource`,
    );
  }

  for (const taskName of ['AutoRollAndBuyTargets', 'AutoLevelRollAndBuyTargets']) {
    const task = getTask(interfaceJson, taskName);
    assert.equal(task.entry, taskName);
    assert.equal(task.default_check, false);
    assertArrayIncludesAll(task.group, ['automation'], `${taskName}.group`);
    assertArrayIncludesAll(task.controller, ['MuMuAdb'], `${taskName}.controller`);
    assertArrayIncludesAll(task.resource, ['GoldenSpatulaKnowledge'], `${taskName}.resource`);
  }
}

function validateRollShopChain(nodes) {
  for (const { suffix, count } of rollTaskCases) {
    const entryName = `AutoRollShop${suffix}`;
    assert.deepEqual(getNode(nodes, entryName).next, [`${entryName}_Click1`]);

    for (let index = 1; index <= count; index += 1) {
      const nodeName = `${entryName}_Click${index}`;
      const node = getNode(nodes, nodeName);
      const next = index < count ? `${entryName}_Click${index + 1}` : `${entryName}_After`;
      assertTemplateGuard(node, shopRefreshGuard, nodeName);
      assert.deepEqual(node.next, [next], `${nodeName}: unexpected next`);
      assert.deepEqual(
        node.on_error,
        ['AutoRollShopRefreshNotReady'],
        `${nodeName}: unexpected error path`,
      );
    }

    const afterNode = getNode(nodes, `${entryName}_After`);
    assert.equal(afterNode.action, 'Screencap');
    assert.equal(afterNode.filename, `auto_roll_shop_after_${count}`);
  }

  const notReadyNode = getNode(nodes, 'AutoRollShopRefreshNotReady');
  assert.equal(notReadyNode.action, 'Screencap');
  assert.equal(notReadyNode.filename, 'auto_roll_shop_refresh_not_ready');
}

function validateBuyExperienceChain(nodes) {
  for (const { suffix, count, clickPrefix } of buyXpTaskCases) {
    const entryName = `AutoBuyExperience${suffix}`;
    const entryNode = getNode(nodes, entryName);
    assert.deepEqual(entryNode.next, [count === 1 ? clickPrefix : `${clickPrefix}1`]);
    assertXpFocus(
      getFocus(entryNode, 'Node.PipelineNode.Succeeded', entryName),
      'started',
      { total: count },
      entryName,
    );

    for (let index = 1; index <= count; index += 1) {
      const nodeName = count === 1 ? clickPrefix : `${clickPrefix}${index}`;
      const next = index < count ? `${clickPrefix}${index + 1}` : `${entryName}_After`;
      const node = getNode(nodes, nodeName);
      assertTemplateGuard(node, buyXpGuard, nodeName);
      assert.deepEqual(node.next, [next], `${nodeName}: unexpected next`);
      assert.deepEqual(
        node.on_error,
        ['AutoBuyExperienceNotReady'],
        `${nodeName}: unexpected error path`,
      );
      assertXpFocus(
        getFocus(node, 'Node.Action.Succeeded', nodeName),
        'clicked',
        { current: index, total: count },
        nodeName,
      );
    }

    const afterNode = getNode(nodes, `${entryName}_After`);
    assert.equal(afterNode.action, 'Screencap');
    assert.equal(afterNode.filename, `auto_buy_xp_after_${count}`);
    assertXpFocus(
      getFocus(afterNode, 'Node.PipelineNode.Succeeded', `${entryName}_After`),
      'completed',
      { total: count },
      `${entryName}_After`,
    );
  }

  const notReadyNode = getNode(nodes, 'AutoBuyExperienceNotReady');
  assert.equal(notReadyNode.action, 'Screencap');
  assert.equal(notReadyNode.filename, 'auto_buy_xp_not_ready');
  assertXpFocus(
    getFocus(notReadyNode, 'Node.PipelineNode.Succeeded', 'AutoBuyExperienceNotReady'),
    'notReady',
    {},
    'AutoBuyExperienceNotReady',
  );
}

function validateDynamicTaskPlaceholders(nodes) {
  const rollBuyPlaceholder = getNode(nodes, 'AutoRollAndBuyTargets');
  assert.equal(rollBuyPlaceholder.action, 'Screencap');
  assert.equal(rollBuyPlaceholder.filename, 'auto_roll_buy_not_configured');

  const levelRollBuyPlaceholder = getNode(nodes, 'AutoLevelRollAndBuyTargets');
  assert.equal(levelRollBuyPlaceholder.action, 'Screencap');
  assert.equal(levelRollBuyPlaceholder.filename, 'auto_level_roll_buy_not_configured');
}

async function main() {
  const [nodes, interfaceJson, cropRecipes] = await Promise.all([
    readJson(mainPipelinePath),
    readJson(interfacePath),
    readJson(cropRecipesPath),
  ]);

  await validateVideoAndCropAssets(cropRecipes);
  validateInterfaceTasks(interfaceJson);
  validateRollShopChain(nodes);
  validateBuyExperienceChain(nodes);
  validateDynamicTaskPlaceholders(nodes);

  console.log('Golden Spatula battle automation test');
  console.log(`Static roll tasks checked: ${rollTaskCases.length}`);
  console.log(`Static buy XP tasks checked: ${buyXpTaskCases.length}`);
  console.log('Dynamic level + roll placeholders checked.');
  console.log(`In-game template crops checked: ${ingameTemplateRecipes.length}`);
  console.log('OK: battle automation pipeline and video-derived assets are valid.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
