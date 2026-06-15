import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const servicePath = path.join(repoRoot, 'src', 'services', 'goldenSpatulaRollPipeline.ts');

async function importRollPipelineModule() {
  const source = await fs.readFile(servicePath, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2020,
      sourceMap: false,
    },
    fileName: servicePath,
  });

  const moduleUrl = `data:text/javascript;base64,${Buffer.from(transpiled.outputText).toString(
    'base64',
  )}`;
  return import(moduleUrl);
}

function parsePipeline(pipelineJson) {
  const parsed = JSON.parse(pipelineJson);
  assert.equal(typeof parsed, 'object');
  assert.ok(parsed && !Array.isArray(parsed));
  return parsed;
}

function getNode(nodes, nodeName) {
  const node = nodes[nodeName];
  assert.ok(node, `missing node ${nodeName}`);
  return node;
}

function getFocus(node, message) {
  assert.ok(node.focus, 'node is missing focus');
  const payload = node.focus[message];
  assert.ok(payload, `missing focus message ${message}`);
  return payload;
}

function assertFocus(payload, event, extra = {}) {
  assert.equal(payload.scope, 'goldenSpatula.roll');
  assert.equal(payload.display, 'log');
  assert.equal(payload.event, event);
  for (const [key, value] of Object.entries(extra)) {
    assert.deepEqual(payload[key], value, `unexpected focus.${key}`);
  }
}

function assertXpFocus(payload, event, extra = {}) {
  assert.equal(payload.scope, 'goldenSpatula.xp');
  assert.equal(payload.display, 'log');
  assert.equal(payload.event, event);
  for (const [key, value] of Object.entries(extra)) {
    assert.deepEqual(payload[key], value, `unexpected xp focus.${key}`);
  }
}

function assertHandFocus(payload, event, extra = {}) {
  assert.equal(payload.scope, 'goldenSpatula.hand');
  assert.equal(payload.display, 'log');
  assert.equal(payload.event, event);
  for (const [key, value] of Object.entries(extra)) {
    assert.deepEqual(payload[key], value, `unexpected hand focus.${key}`);
  }
}

function assertEconomyFocus(payload, event, extra = {}) {
  assert.equal(payload.scope, 'goldenSpatula.economy');
  assert.equal(payload.display, 'log');
  assert.equal(payload.event, event);
  for (const [key, value] of Object.entries(extra)) {
    assert.deepEqual(payload[key], value, `unexpected economy focus.${key}`);
  }
}

function assertAugmentFocus(payload, event, extra = {}) {
  assert.equal(payload.scope, 'goldenSpatula.augment');
  assert.equal(payload.display, 'log');
  assert.equal(payload.event, event);
  for (const [key, value] of Object.entries(extra)) {
    assert.deepEqual(payload[key], value, `unexpected augment focus.${key}`);
  }
}

function assertRefreshNode(node, constants) {
  assert.equal(node.recognition, 'TemplateMatch');
  assert.deepEqual(node.template, [
    'ingame/shop_refresh_button_idle.png',
    'ingame/shop_refresh_button_active.png',
  ]);
  assert.deepEqual(node.threshold, [0.76, 0.7]);
  assert.deepEqual(node.roi, [180, 640, 140, 80]);
  assert.deepEqual(node.target, [286, 681, 2, 2]);
  assert.equal(node.timeout, constants.goldenSpatulaShopRefreshTimeoutMs);
  assert.equal(node.post_delay, constants.goldenSpatulaShopRefreshPostDelayMs);
  assert.equal(node.action, 'Click');
}

function assertShopReadyNode(node, constants) {
  assert.equal(node.recognition, 'TemplateMatch');
  assert.deepEqual(node.template, [
    'ingame/shop_refresh_button_idle.png',
    'ingame/shop_refresh_button_active.png',
  ]);
  assert.deepEqual(node.threshold, [0.76, 0.7]);
  assert.deepEqual(node.roi, [180, 640, 140, 80]);
  assert.equal(node.timeout, constants.goldenSpatulaShopReadyTimeoutMs);
  assert.equal(node.action, 'DoNothing');
  assert.deepEqual(node.next, ['AutoRollBuy_C0_Buy1_T0_S1']);
  assert.deepEqual(node.on_error, ['AutoRollBuy_InitialShopNotReady']);
}

function assertXpClickNode(node, nextNode, constants) {
  assert.equal(node.recognition, 'TemplateMatch');
  assert.deepEqual(node.template, [
    'ingame/buy_xp_button_idle.png',
    'ingame/buy_xp_button_active.png',
  ]);
  assert.deepEqual(node.threshold, [0.76, 0.7]);
  assert.deepEqual(node.roi, [180, 575, 140, 80]);
  assert.deepEqual(node.target, [286, 615, 2, 2]);
  assert.equal(node.timeout, constants.goldenSpatulaBuyXpTimeoutMs);
  assert.equal(node.post_delay, constants.goldenSpatulaBuyXpPostDelayMs);
  assert.equal(node.action, 'Click');
  assert.deepEqual(node.next, [nextNode]);
  assert.deepEqual(node.on_error, ['AutoLevelRollBuy_XpNotReady']);
}

function assertBuyNode(node, templatePath, roi, target, nextNode, onErrorNode, constants) {
  assert.equal(node.recognition, 'TemplateMatch');
  assert.equal(node.template, templatePath);
  assert.equal(node.threshold, 0.72);
  assert.deepEqual(node.roi, roi);
  assert.equal(node.timeout, constants.goldenSpatulaAutoBuyRecognitionTimeoutMs);
  assert.equal(node.post_delay, constants.goldenSpatulaAutoBuyClickPostDelayMs);
  assert.equal(node.action, 'Click');
  assert.deepEqual(node.target, target);
  assert.deepEqual(node.next, [nextNode]);
  assert.deepEqual(node.on_error, [onErrorNode]);
}

function assertVerifyNode(node, templatePath, roi, nextNode, unconfirmedNode, constants) {
  assert.equal(node.recognition, 'TemplateMatch');
  assert.equal(node.template, templatePath);
  assert.equal(node.threshold, 0.72);
  assert.deepEqual(node.roi, roi);
  assert.equal(node.inverse, true);
  assert.equal(node.timeout, constants.goldenSpatulaAutoBuyVerifyTimeoutMs);
  assert.equal(node.post_delay, constants.goldenSpatulaAutoBuyVerifyPostDelayMs);
  assert.equal(node.action, 'DoNothing');
  assert.deepEqual(node.next, [nextNode]);
  assert.deepEqual(node.on_error, [unconfirmedNode]);
}

async function main() {
  const {
    buildAugmentOcrPipelineOverride,
    buildAutoPickAugmentPipelineOverride,
    buildAutoLevelRollBuyPipelineOverride,
    buildAutoRollBuyPipelineOverride,
    buildEconomyOcrPipelineOverride,
    goldenSpatulaAugmentChoiceSlots,
    goldenSpatulaAugmentOcrEntry,
    goldenSpatulaAutoPickAugmentEntry,
    goldenSpatulaAutoLevelRollBuyEntry,
    goldenSpatulaAutoBuyAttemptsPerShop,
    goldenSpatulaAutoRollBuyEntry,
    goldenSpatulaBenchChampionSlots,
    goldenSpatulaEconomyOcrEntry,
    goldenSpatulaLogicalScreenSize,
    goldenSpatulaShopChampionSlots,
    scaleGoldenSpatulaLogicalRectToScreen,
    scaleGoldenSpatulaLogicalTargetToScreen,
    ...timingConstants
  } = await importRollPipelineModule();

  const scaledScreen = { width: 1600, height: 900 };
  assert.equal(goldenSpatulaAutoBuyAttemptsPerShop, 5);
  assert.equal(goldenSpatulaShopChampionSlots.length, 5);
  assert.equal(goldenSpatulaBenchChampionSlots.length, 9);
  assert.equal(goldenSpatulaAugmentChoiceSlots.length, 3);
  assert.deepEqual(goldenSpatulaLogicalScreenSize, { width: 1280, height: 720, shortSide: 720 });
  assert.deepEqual(scaleGoldenSpatulaLogicalTargetToScreen([640, 360], scaledScreen), [800, 450]);
  assert.deepEqual(scaleGoldenSpatulaLogicalTargetToScreen([404, 642, 2, 2], scaledScreen), [
    505,
    803,
    3,
    3,
  ]);
  assert.deepEqual(scaleGoldenSpatulaLogicalRectToScreen([325, 580, 158, 125], scaledScreen), [
    406,
    725,
    198,
    156,
  ]);
  assert.deepEqual(
    scaleGoldenSpatulaLogicalTargetToScreen(goldenSpatulaAugmentChoiceSlots[1].target, scaledScreen),
    [800, 398, 3, 3],
  );

  function assertEconomyOcrNode(node, field, nextNode) {
    const expectedByField = {
      round: String.raw`\d{1,2}\s*-\s*\d{1,2}`,
      gold: String.raw`\d{1,3}`,
      level: String.raw`\d{1,3}`,
      experience: String.raw`\d{1,2}\s*/\s*\d{1,2}`,
      streak: String.raw`\d{1}`,
    };
    const roiByField = {
      round: [...timingConstants.goldenSpatulaEconomyRoundRoi],
      gold: [...timingConstants.goldenSpatulaEconomyGoldRoi],
      level: [...timingConstants.goldenSpatulaEconomyLevelRoi],
      experience: [...timingConstants.goldenSpatulaEconomyExperienceRoi],
      streak: [...timingConstants.goldenSpatulaEconomyStreakRoi],
    };

    assert.equal(node.recognition, 'OCR');
    assert.equal(node.expected, expectedByField[field]);
    assert.equal(node.threshold, timingConstants.goldenSpatulaEconomyOcrThreshold);
    assert.deepEqual(node.replace, timingConstants.goldenSpatulaEconomyOcrReplace);
    assert.equal(node.order_by, 'Expected');
    assert.deepEqual(node.roi, roiByField[field]);
    assert.equal(node.timeout, timingConstants.goldenSpatulaEconomyOcrTimeoutMs);
    assert.equal(node.action, 'DoNothing');
    assert.deepEqual(node.next, [nextNode]);
    assert.deepEqual(node.on_error, [nextNode]);
    assertEconomyFocus(getFocus(node, 'Node.Recognition.Succeeded'), 'recognized', {
      field,
      ...(field === 'streak' ? { streakKind: 'unknown' } : {}),
    });
    assertEconomyFocus(getFocus(node, 'Node.Recognition.Failed'), 'scanFailed', { field });
  }

  const targets = [
    { name: '薇古丝', templatePath: 'champions/vex.png' },
    { name: '波比', templatePath: 'champions/poppy.png' },
  ];
  const nodes = parsePipeline(buildAutoRollBuyPipelineOverride(targets, 1));
  const expectedNodeCount =
    5 +
    4 +
    targets.length * goldenSpatulaBenchChampionSlots.length +
    (1 + 1) *
      goldenSpatulaAutoBuyAttemptsPerShop *
      (targets.length * goldenSpatulaShopChampionSlots.length * 3 + 1) +
    4;

  assert.equal(Object.keys(nodes).length, expectedNodeCount);
  assert.deepEqual(getNode(nodes, 'AutoRollAndBuyTargets').next, ['AutoRollBuy_Hand_T0_B1']);
  assertFocus(
    getFocus(getNode(nodes, 'AutoRollAndBuyTargets'), 'Node.PipelineNode.Succeeded'),
    'started',
    {
      cycle: 1,
      totalCycles: 2,
      rollCount: 1,
      targetNames: targets.map((target) => target.name),
    },
  );

  const firstBenchNode = getNode(nodes, 'AutoRollBuy_Hand_T0_B1');
  assert.equal(firstBenchNode.recognition, 'TemplateMatch');
  assert.equal(firstBenchNode.template, 'champions/vex.png');
  assert.deepEqual(firstBenchNode.roi, [...goldenSpatulaBenchChampionSlots[0].roi]);
  assert.deepEqual(firstBenchNode.next, ['AutoRollBuy_Hand_T0_B2']);
  assert.deepEqual(firstBenchNode.on_error, ['AutoRollBuy_Hand_T0_B2']);
  assertHandFocus(getFocus(firstBenchNode, 'Node.Recognition.Succeeded'), 'benchHit', {
    targetName: targets[0].name,
    targetNames: targets.map((target) => target.name),
    slotIndex: 1,
    slotLabel: '1',
  });

  const economyScanNode = getNode(nodes, 'AutoRollBuy_EconomyScan');
  assert.equal(economyScanNode.action, 'Screencap');
  assert.equal(economyScanNode.filename, 'auto_roll_buy_economy_before');
  assert.deepEqual(economyScanNode.next, ['AutoRollBuy_PreShop_EconomyOcr_Round']);
  assertEconomyFocus(getFocus(economyScanNode, 'Node.PipelineNode.Succeeded'), 'started');
  assertEconomyOcrNode(
    getNode(nodes, 'AutoRollBuy_PreShop_EconomyOcr_Round'),
    'round',
    'AutoRollBuy_PreShop_EconomyOcr_Gold',
  );
  assertEconomyOcrNode(
    getNode(nodes, 'AutoRollBuy_PreShop_EconomyOcr_Gold'),
    'gold',
    'AutoRollBuy_PreShop_EconomyOcr_Level',
  );
  assertEconomyOcrNode(
    getNode(nodes, 'AutoRollBuy_PreShop_EconomyOcr_Level'),
    'level',
    'AutoRollBuy_PreShop_EconomyOcr_Experience',
  );
  assertEconomyOcrNode(
    getNode(nodes, 'AutoRollBuy_PreShop_EconomyOcr_Experience'),
    'experience',
    'AutoRollBuy_PreShop_EconomyOcr_Streak',
  );
  assertEconomyOcrNode(
    getNode(nodes, 'AutoRollBuy_PreShop_EconomyOcr_Streak'),
    'streak',
    'AutoRollBuy_PreShop_EconomyOcr_Done',
  );
  const economyDoneNode = getNode(nodes, 'AutoRollBuy_PreShop_EconomyOcr_Done');
  assert.equal(economyDoneNode.action, 'DoNothing');
  assert.deepEqual(economyDoneNode.next, ['AutoRollBuy_ShopReady']);
  assertEconomyFocus(getFocus(economyDoneNode, 'Node.PipelineNode.Succeeded'), 'scanned');

  assertShopReadyNode(getNode(nodes, 'AutoRollBuy_ShopReady'), timingConstants);

  const initialNotReadyNode = getNode(nodes, 'AutoRollBuy_InitialShopNotReady');
  assert.equal(initialNotReadyNode.action, 'Screencap');
  assert.equal(initialNotReadyNode.filename, 'auto_roll_buy_initial_shop_not_ready');
  assertFocus(getFocus(initialNotReadyNode, 'Node.PipelineNode.Succeeded'), 'notReady', {
    cycle: 1,
    totalCycles: 2,
    rollCount: 1,
    targetNames: targets.map((target) => target.name),
  });

  const firstSlotRoi = [...goldenSpatulaShopChampionSlots[0].roi];
  const firstSlotTarget = [...goldenSpatulaShopChampionSlots[0].target];
  const buyNode = getNode(nodes, 'AutoRollBuy_C0_Buy1_T0_S1');
  assertBuyNode(
    buyNode,
    'champions/vex.png',
    firstSlotRoi,
    firstSlotTarget,
    'AutoRollBuy_C0_Buy1_T0_S1_Verify',
    'AutoRollBuy_C0_Buy1_T0_S2',
    timingConstants,
  );
  assertFocus(getFocus(buyNode, 'Node.Action.Succeeded'), 'bought', {
    cycle: 1,
    totalCycles: 2,
    rollCount: 1,
    targetName: '薇古丝',
    targetNames: targets.map((target) => target.name),
    slotIndex: 1,
    slotLabel: '1',
  });

  const verifyNode = getNode(nodes, 'AutoRollBuy_C0_Buy1_T0_S1_Verify');
  assertVerifyNode(
    verifyNode,
    'champions/vex.png',
    firstSlotRoi,
    'AutoRollBuy_C0_Buy2_T0_S1',
    'AutoRollBuy_C0_Buy1_T0_S1_Unconfirmed',
    timingConstants,
  );
  assertFocus(getFocus(verifyNode, 'Node.Recognition.Succeeded'), 'buyConfirmed', {
    cycle: 1,
    totalCycles: 2,
    rollCount: 1,
    targetName: '薇古丝',
    targetNames: targets.map((target) => target.name),
    slotIndex: 1,
    slotLabel: '1',
  });

  const unconfirmedNode = getNode(nodes, 'AutoRollBuy_C0_Buy1_T0_S1_Unconfirmed');
  assert.equal(unconfirmedNode.action, 'Screencap');
  assert.equal(unconfirmedNode.filename, 'auto_roll_buy_c0_buy1_t0_s1_unconfirmed');
  assert.deepEqual(unconfirmedNode.next, ['AutoRollBuy_C0_Buy2_T0_S1']);
  assertFocus(getFocus(unconfirmedNode, 'Node.PipelineNode.Succeeded'), 'buyUnconfirmed', {
    cycle: 1,
    totalCycles: 2,
    rollCount: 1,
    targetName: '薇古丝',
    targetNames: targets.map((target) => target.name),
    slotIndex: 1,
    slotLabel: '1',
  });

  assert.deepEqual(getNode(nodes, 'AutoRollBuy_C0_Buy1_T0_S5').on_error, [
    'AutoRollBuy_C0_Buy1_T1_S1',
  ]);
  assert.deepEqual(getNode(nodes, 'AutoRollBuy_C0_Buy1_T1_S5').on_error, [
    'AutoRollBuy_C0_Buy1_Miss',
  ]);
  assert.deepEqual(getNode(nodes, 'AutoRollBuy_C0_Buy1_Miss').next, ['AutoRollBuy_Roll1']);
  assertFocus(
    getFocus(getNode(nodes, 'AutoRollBuy_C0_Buy1_Miss'), 'Node.PipelineNode.Succeeded'),
    'missed',
    {
      cycle: 1,
      totalCycles: 2,
      rollCount: 1,
      targetNames: targets.map((target) => target.name),
    },
  );

  const rollNode = getNode(nodes, 'AutoRollBuy_Roll1');
  assertRefreshNode(rollNode, timingConstants);
  assert.deepEqual(rollNode.next, ['AutoRollBuy_C1_Buy1_T0_S1']);
  assert.deepEqual(rollNode.on_error, ['AutoRollBuy_Roll1_NotReady']);
  assertFocus(getFocus(rollNode, 'Node.Action.Succeeded'), 'refreshed', {
    cycle: 2,
    totalCycles: 2,
    rollCount: 1,
    targetNames: targets.map((target) => target.name),
  });

  const refreshNotReadyNode = getNode(nodes, 'AutoRollBuy_Roll1_NotReady');
  assert.equal(refreshNotReadyNode.action, 'Screencap');
  assert.equal(refreshNotReadyNode.filename, 'auto_roll_buy_roll1_refresh_not_ready');
  assertFocus(getFocus(refreshNotReadyNode, 'Node.PipelineNode.Succeeded'), 'notReady', {
    cycle: 1,
    totalCycles: 2,
    rollCount: 1,
    targetNames: targets.map((target) => target.name),
  });

  assert.deepEqual(getNode(nodes, 'AutoRollBuy_C0_Buy5_T0_S1_Verify').next, ['AutoRollBuy_Roll1']);
  assert.deepEqual(getNode(nodes, 'AutoRollBuy_C1_Buy5_T0_S1_Verify').next, ['AutoRollBuy_Done']);
  assertFocus(
    getFocus(getNode(nodes, 'AutoRollBuy_Done'), 'Node.PipelineNode.Succeeded'),
    'completed',
    {
      cycle: 2,
      totalCycles: 2,
      rollCount: 1,
      targetNames: targets.map((target) => target.name),
    },
  );

  const combinedNodes = parsePipeline(buildAutoLevelRollBuyPipelineOverride(targets, 1, 3));
  const combinedEntry = getNode(combinedNodes, goldenSpatulaAutoLevelRollBuyEntry);
  assert.deepEqual(combinedEntry.next, ['AutoLevelRollBuy_XpClick1']);
  assertXpFocus(getFocus(combinedEntry, 'Node.PipelineNode.Succeeded'), 'started', {
    total: 3,
  });

  for (let index = 1; index <= 3; index += 1) {
    const nodeName = `AutoLevelRollBuy_XpClick${index}`;
    const nextNode = index < 3 ? `AutoLevelRollBuy_XpClick${index + 1}` : 'AutoLevelRollBuy_XpDone';
    const node = getNode(combinedNodes, nodeName);
    assertXpClickNode(node, nextNode, timingConstants);
    assertXpFocus(getFocus(node, 'Node.Action.Succeeded'), 'clicked', {
      current: index,
      total: 3,
    });
  }

  const xpDoneNode = getNode(combinedNodes, 'AutoLevelRollBuy_XpDone');
  assert.equal(xpDoneNode.action, 'Screencap');
  assert.equal(xpDoneNode.filename, 'auto_level_roll_buy_xp_done');
  assert.deepEqual(xpDoneNode.next, [goldenSpatulaAutoRollBuyEntry]);
  assertXpFocus(getFocus(xpDoneNode, 'Node.PipelineNode.Succeeded'), 'completed', {
    total: 3,
  });

  const xpNotReadyNode = getNode(combinedNodes, 'AutoLevelRollBuy_XpNotReady');
  assert.equal(xpNotReadyNode.action, 'Screencap');
  assert.equal(xpNotReadyNode.filename, 'auto_level_roll_buy_xp_not_ready');
  assertXpFocus(getFocus(xpNotReadyNode, 'Node.PipelineNode.Succeeded'), 'notReady');

  assert.deepEqual(getNode(combinedNodes, goldenSpatulaAutoRollBuyEntry).next, [
    'AutoRollBuy_Hand_T0_B1',
  ]);

  const emptyNodes = parsePipeline(buildAutoRollBuyPipelineOverride([], 3));
  assert.deepEqual(Object.keys(emptyNodes).sort(), ['AutoRollAndBuyTargets', 'AutoRollBuy_Done']);
  assert.deepEqual(getNode(emptyNodes, 'AutoRollAndBuyTargets').next, ['AutoRollBuy_Done']);

  const economyNodes = parsePipeline(buildEconomyOcrPipelineOverride());
  assert.deepEqual(getNode(economyNodes, goldenSpatulaEconomyOcrEntry).next, ['EconomyOcr_Round']);
  assertEconomyFocus(
    getFocus(getNode(economyNodes, goldenSpatulaEconomyOcrEntry), 'Node.PipelineNode.Succeeded'),
    'started',
  );
  assertEconomyOcrNode(getNode(economyNodes, 'EconomyOcr_Round'), 'round', 'EconomyOcr_Gold');
  assertEconomyOcrNode(getNode(economyNodes, 'EconomyOcr_Gold'), 'gold', 'EconomyOcr_Level');
  assertEconomyOcrNode(getNode(economyNodes, 'EconomyOcr_Level'), 'level', 'EconomyOcr_Experience');
  assertEconomyOcrNode(
    getNode(economyNodes, 'EconomyOcr_Experience'),
    'experience',
    'EconomyOcr_Streak',
  );
  assertEconomyOcrNode(getNode(economyNodes, 'EconomyOcr_Streak'), 'streak', 'EconomyOcr_Done');
  assert.deepEqual(getNode(economyNodes, 'EconomyOcr_Done').next, []);
  assertEconomyFocus(
    getFocus(getNode(economyNodes, 'EconomyOcr_Done'), 'Node.PipelineNode.Succeeded'),
    'scanned',
  );

  function assertAugmentOcrNode(node, slot, field, nextNode) {
    assert.equal(node.recognition, 'OCR');
    assert.equal(node.expected, '.{1,120}');
    assert.equal(node.threshold, timingConstants.goldenSpatulaAugmentOcrThreshold);
    assert.equal(node.order_by, 'Horizontal');
    assert.deepEqual(node.roi, field === 'title' ? [...slot.titleRoi] : [...slot.descriptionRoi]);
    assert.equal(node.timeout, timingConstants.goldenSpatulaAugmentOcrTimeoutMs);
    assert.equal(node.action, 'DoNothing');
    assert.deepEqual(node.next, [nextNode]);
    assert.deepEqual(node.on_error, [nextNode]);
    assertAugmentFocus(getFocus(node, 'Node.Recognition.Succeeded'), 'recognized', {
      slotIndex: slot.index,
      slotLabel: slot.label,
      field,
    });
    assertAugmentFocus(getFocus(node, 'Node.Recognition.Failed'), 'scanFailed', {
      slotIndex: slot.index,
      slotLabel: slot.label,
      field,
    });
  }

  const augmentNodes = parsePipeline(buildAugmentOcrPipelineOverride());
  assert.deepEqual(getNode(augmentNodes, goldenSpatulaAugmentOcrEntry).next, ['AugmentOcr_S1_Title']);
  assertAugmentFocus(
    getFocus(getNode(augmentNodes, goldenSpatulaAugmentOcrEntry), 'Node.PipelineNode.Succeeded'),
    'started',
  );
  assertAugmentOcrNode(
    getNode(augmentNodes, 'AugmentOcr_S1_Title'),
    goldenSpatulaAugmentChoiceSlots[0],
    'title',
    'AugmentOcr_S1_Description',
  );
  assertAugmentOcrNode(
    getNode(augmentNodes, 'AugmentOcr_S1_Description'),
    goldenSpatulaAugmentChoiceSlots[0],
    'description',
    'AugmentOcr_S2_Title',
  );
  assertAugmentOcrNode(
    getNode(augmentNodes, 'AugmentOcr_S2_Title'),
    goldenSpatulaAugmentChoiceSlots[1],
    'title',
    'AugmentOcr_S2_Description',
  );
  assertAugmentOcrNode(
    getNode(augmentNodes, 'AugmentOcr_S2_Description'),
    goldenSpatulaAugmentChoiceSlots[1],
    'description',
    'AugmentOcr_S3_Title',
  );
  assertAugmentOcrNode(
    getNode(augmentNodes, 'AugmentOcr_S3_Title'),
    goldenSpatulaAugmentChoiceSlots[2],
    'title',
    'AugmentOcr_S3_Description',
  );
  assertAugmentOcrNode(
    getNode(augmentNodes, 'AugmentOcr_S3_Description'),
    goldenSpatulaAugmentChoiceSlots[2],
    'description',
    'AugmentOcr_Done',
  );
  assertAugmentFocus(
    getFocus(getNode(augmentNodes, 'AugmentOcr_Done'), 'Node.PipelineNode.Succeeded'),
    'scanned',
  );

  const pickNodes = parsePipeline(
    buildAutoPickAugmentPipelineOverride(2, {
      title: '来个好伙计！',
      matchedName: '来个好伙计！',
      score: 83,
    }),
  );
  assert.deepEqual(getNode(pickNodes, goldenSpatulaAutoPickAugmentEntry).next, [
    'AutoPickRecommendedAugment_Click',
  ]);
  assertAugmentFocus(
    getFocus(getNode(pickNodes, goldenSpatulaAutoPickAugmentEntry), 'Node.PipelineNode.Succeeded'),
    'started',
    { slotIndex: 2, slotLabel: '2', title: '来个好伙计！', matchedName: '来个好伙计！', score: 83 },
  );
  const pickClickNode = getNode(pickNodes, 'AutoPickRecommendedAugment_Click');
  assert.equal(pickClickNode.action, 'Click');
  assert.deepEqual(pickClickNode.target, [...goldenSpatulaAugmentChoiceSlots[1].target]);
  assert.ok(pickClickNode.target[1] < 450, 'augment pick target must avoid refresh buttons');
  assert.equal(pickClickNode.post_delay, timingConstants.goldenSpatulaAugmentPickPostDelayMs);
  assert.deepEqual(pickClickNode.next, ['AutoPickRecommendedAugment_After']);
  assertAugmentFocus(getFocus(pickClickNode, 'Node.Action.Succeeded'), 'picked', {
    slotIndex: 2,
    slotLabel: '2',
    title: '来个好伙计！',
    matchedName: '来个好伙计！',
    score: 83,
  });
  assertAugmentFocus(
    getFocus(getNode(pickNodes, 'AutoPickRecommendedAugment_After'), 'Node.PipelineNode.Succeeded'),
    'completed',
    { slotIndex: 2, slotLabel: '2', title: '来个好伙计！', matchedName: '来个好伙计！', score: 83 },
  );

  console.log('Golden Spatula roll-buy pipeline test');
  console.log(`Targets checked: ${targets.length}`);
  console.log(`Generated nodes checked: ${Object.keys(nodes).length}`);
  console.log(`Combined level + roll nodes checked: ${Object.keys(combinedNodes).length}`);
  console.log('OK: roll-buy pipeline structure is valid.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
