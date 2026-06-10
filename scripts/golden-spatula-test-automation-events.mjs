import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const eventsServicePath = path.join(
  repoRoot,
  'src',
  'services',
  'goldenSpatulaAutomationEvents.ts',
);

async function importEventsModule() {
  const source = await fs.readFile(eventsServicePath, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2020,
      sourceMap: false,
      paths: {},
    },
    fileName: eventsServicePath,
  });

  const output = transpiled.outputText
    .replace(
      /from ['"]@\/services\/goldenSpatulaRollPipeline['"];?/g,
      "from './goldenSpatulaRollPipeline.js';",
    )
    .replace(/from ['"]@\/types\/goldenSpatula['"];?/g, "from './goldenSpatulaTypes.js';");
  const tempDir = path.join(repoRoot, 'node_modules', '.cache', 'mxu-golden-tests');
  await fs.mkdir(tempDir, { recursive: true });
  await fs.writeFile(
    path.join(tempDir, 'goldenSpatulaRollPipeline.js'),
    [
      'export const goldenSpatulaAutoRollBuyFocusScope = "goldenSpatula.roll";',
      'export const goldenSpatulaHandFocusScope = "goldenSpatula.hand";',
      'export const goldenSpatulaEconomyFocusScope = "goldenSpatula.economy";',
      'export const goldenSpatulaXpFocusScope = "goldenSpatula.xp";',
      '',
    ].join('\n'),
  );
  await fs.writeFile(path.join(tempDir, 'goldenSpatulaTypes.js'), 'export {};\n');
  const modulePath = path.join(tempDir, `goldenSpatulaAutomationEvents-${Date.now()}.mjs`);
  await fs.writeFile(modulePath, output);
  return import(`file://${modulePath.replaceAll('\\', '/')}`);
}

function makeTranslator() {
  return (key, values = {}) => {
    if (key.includes('rollStatusEvent.bought')) return `bought ${values.target}`;
    if (key.includes('rollStatusEvent.buyConfirmed')) return `confirmed ${values.target}`;
    if (key.includes('rollStatusEvent.refreshed')) {
      return `refreshed ${values.current}/${values.total}`;
    }
    if (key.includes('rollStatusEvent.completed')) return 'roll completed';
    if (key.includes('rollStatusEvent.started')) return 'roll started';
    if (key.includes('rollStatusEvent.notReady')) return 'roll not ready';
    if (key.includes('xpStatusEvent.started')) return 'xp started';
    if (key.includes('xpStatusEvent.clicked')) {
      return `xp clicked ${values.current}/${values.total}`;
    }
    if (key.includes('xpStatusEvent.completed')) return 'xp completed';
    if (key.includes('xpStatusEvent.notReady')) return 'xp not ready';
    if (key.includes('handStatusEvent.benchHit')) return `bench ${values.target}`;
    if (key.includes('handStatusEvent.bought')) return `owned ${values.target}`;
    if (key.includes('handStatusEvent.completed')) return 'hand completed';
    if (key.includes('handStatusEvent.started')) return 'hand started';
    if (key.includes('handStatusEvent.notReady')) return 'hand not ready';
    if (key.includes('economyStatusEvent.buyChampion')) return `gold champion ${values.cost}`;
    if (key.includes('economyStatusEvent.refresh')) return 'gold refresh';
    if (key.includes('economyStatusEvent.buyXp')) return 'gold xp';
    if (key.includes('economyStatusEvent.recognized')) {
      return `economy recognized ${values.fieldLabel} ${values.value}`;
    }
    if (key.includes('economyStatusEvent.scanFailed')) {
      return `economy missed ${values.fieldLabel}`;
    }
    if (key.includes('economyStatusEvent.scanned')) return 'economy scanned';
    if (key.includes('economyStatusEvent.completed')) return 'economy completed';
    if (key.includes('economyStatusEvent.started')) return 'economy started';
    if (key.includes('economyStatusEvent.notReady')) return 'economy not ready';
    if (key.includes('economyField.gold')) return 'gold';
    if (key.includes('economyField.level')) return 'level';
    if (key.includes('economyField.experience')) return 'xp';
    if (key.includes('economyField.round')) return 'round';
    if (key.includes('economyField.streak')) return 'streak';
    if (key.includes('knowledgeEvent.shopScanStarted')) return 'shop scan started';
    if (key.includes('knowledgeEvent.shopChampionHit')) return `shop ${values.slot}`;
    if (key.includes('knowledgeEvent.shopSlotMiss')) return `shop miss ${values.slot}`;
    if (key.includes('knowledgeEvent.shopScanCompleted')) return 'shop scan completed';
    if (key.includes('knowledgeEvent.itemScanStarted')) return `item scan ${values.itemKind}`;
    if (key.includes('knowledgeEvent.itemHit')) {
      return `item ${values.itemKind} ${values.zone}`;
    }
    if (key.includes('knowledgeEvent.itemScanCompleted'))
      return `item scan completed ${values.itemKind}`;
    if (key.includes('knowledgeEvent.streakScanStarted')) return 'streak scan started';
    if (key.includes('knowledgeEvent.streakRecognized')) {
      return `streak ${values.streakKind} ${values.count}`;
    }
    if (key.includes('knowledgeEvent.streakScanFailed')) {
      return `streak missed ${values.streakKind}`;
    }
    if (key.includes('knowledgeEvent.streakScanCompleted')) return 'streak scan completed';
    if (key.includes('itemKind.basicItems')) return 'basic';
    if (key.includes('itemKind.completedItems')) return 'completed';
    if (key.includes('itemKind.specialItems')) return 'special';
    if (key.includes('zone.inventory')) return 'inventory';
    if (key.includes('zone.bench')) return 'bench';
    if (key.includes('zone.boardLower')) return 'board lower';
    if (key.includes('streakKind.win')) return 'win';
    if (key.includes('streakKind.loss')) return 'loss';
    return key;
  };
}

function makeFocus(message, payload) {
  return {
    focus: {
      [message]: payload,
    },
  };
}

function assertNull(value, label) {
  assert.equal(value, null, label);
}

async function main() {
  const {
    buildRollEvent,
    buildEconomyEvent,
    buildEconomyEventFromRollEvent,
    buildEconomyEventFromXpEvent,
    buildHandEvent,
    buildHandEventFromRollEvent,
    buildKnowledgeEvent,
    buildXpEvent,
    createEmptyEconomyRunState,
    createEmptyHandRunState,
    createEmptyKnowledgeScanState,
    createEmptyRollRunState,
    createEmptyXpRunState,
    mergeEconomyEvent,
    mergeHandEvent,
    mergeKnowledgeEvent,
    mergeRollEvent,
    mergeXpEvent,
  } = await importEventsModule();
  const t = makeTranslator();

  assert.deepEqual(createEmptyRollRunState(), {
    active: false,
    targetNames: [],
    rollCount: 0,
    currentCycle: 0,
    totalCycles: 0,
    events: [],
  });
  assert.deepEqual(createEmptyXpRunState(), {
    active: false,
    current: 0,
    total: 0,
    events: [],
  });
  assert.deepEqual(createEmptyHandRunState(), {
    active: false,
    targetNames: [],
    owned: {},
    events: [],
  });
  assert.deepEqual(createEmptyEconomyRunState(), {
    active: false,
    estimatedGoldDelta: 0,
    boughtChampionGold: 0,
    refreshGold: 0,
    xpGold: 0,
    xpPurchases: 0,
    events: [],
  });
  assert.deepEqual(createEmptyKnowledgeScanState(), {
    active: false,
    shopSlots: {},
    items: {},
    streak: {},
    events: [],
  });

  const started = buildRollEvent(
    'Node.PipelineNode.Succeeded',
    {
      name: 'AutoRollAndBuyTargets',
      ...makeFocus('Node.PipelineNode.Succeeded', {
        scope: 'goldenSpatula.roll',
        event: 'started',
        cycle: 1,
        totalCycles: 4,
        rollCount: 3,
        targetNames: ['薇古丝', '波比'],
      }),
    },
    t,
    1000,
  );
  assert.equal(started.kind, 'started');
  assert.equal(started.message, 'roll started');
  let rollState = mergeRollEvent(createEmptyRollRunState(), started);
  assert.equal(rollState.active, true);
  assert.deepEqual(rollState.targetNames, ['薇古丝', '波比']);
  assert.equal(rollState.currentCycle, 1);
  assert.equal(rollState.totalCycles, 4);

  const bought = buildRollEvent(
    'Node.Action.Succeeded',
    {
      name: 'AutoRollBuy_C0_Buy1_T0_S3',
      ...makeFocus('Node.Action.Succeeded', {
        scope: 'goldenSpatula.roll',
        event: 'bought',
        cycle: '1',
        totalCycles: '4',
        rollCount: '3',
        targetName: '薇古丝',
        targetNames: ['薇古丝', '波比'],
        slotIndex: '3',
        slotLabel: '3',
      }),
    },
    t,
    1100,
  );
  assert.equal(bought.kind, 'bought');
  assert.equal(bought.message, 'bought 薇古丝 #3');
  assert.equal(bought.slotIndex, 3);
  rollState = mergeRollEvent(rollState, bought);
  assert.equal(rollState.active, true);
  assert.equal(rollState.events.length, 2);

  const confirmed = buildRollEvent(
    'Node.Recognition.Succeeded',
    {
      name: 'AutoRollBuy_C0_Buy1_T0_S3_Verify',
      ...makeFocus('Node.Recognition.Succeeded', {
        scope: 'goldenSpatula.roll',
        event: 'buyConfirmed',
        cycle: 1,
        totalCycles: 4,
        rollCount: 3,
        targetName: '薇古丝',
        targetNames: ['薇古丝', '波比'],
        slotIndex: 3,
        slotLabel: '3',
      }),
    },
    t,
    1200,
  );
  assert.equal(confirmed.message, 'confirmed 薇古丝 #3');
  rollState = mergeRollEvent(rollState, confirmed);
  assert.equal(rollState.lastEvent.kind, 'buyConfirmed');
  const confirmedTargetName = confirmed.targetName;
  assert.ok(confirmedTargetName);

  const handBought = buildHandEventFromRollEvent(
    {
      ...confirmed,
      cost: 3,
    },
    t,
  );
  let handState = mergeHandEvent(createEmptyHandRunState(), {
    ...handBought,
    targetNames: confirmed.targetNames,
  });
  assert.equal(handState.owned[confirmedTargetName].count, 1);
  assert.equal(handState.owned[confirmedTargetName].boughtCount, 1);

  const economyChampion = buildEconomyEventFromRollEvent(
    {
      ...confirmed,
      cost: 3,
    },
    t,
  );
  let economyState = mergeEconomyEvent(createEmptyEconomyRunState(), economyChampion);
  assert.equal(economyState.estimatedGoldDelta, -3);
  assert.equal(economyState.boughtChampionGold, 3);

  const refreshed = buildRollEvent(
    'Node.Action.Succeeded',
    {
      name: 'AutoRollBuy_Roll1',
      ...makeFocus('Node.Action.Succeeded', {
        scope: 'goldenSpatula.roll',
        event: 'refreshed',
        cycle: 2,
        totalCycles: 4,
        rollCount: 3,
        targetNames: ['薇古丝', '波比'],
      }),
    },
    t,
    1300,
  );
  assert.equal(refreshed.message, 'refreshed 2/4');
  rollState = mergeRollEvent(rollState, refreshed);
  assert.equal(rollState.currentCycle, 2);
  economyState = mergeEconomyEvent(economyState, buildEconomyEventFromRollEvent(refreshed, t));
  assert.equal(economyState.estimatedGoldDelta, -5);
  assert.equal(economyState.refreshGold, 2);

  const benchHit = buildHandEvent(
    'Node.Recognition.Succeeded',
    {
      name: 'AutoRollBuy_Hand_T0_B2',
      ...makeFocus('Node.Recognition.Succeeded', {
        scope: 'goldenSpatula.hand',
        event: 'benchHit',
        targetName: confirmedTargetName,
        targetNames: confirmed.targetNames,
        slotIndex: 2,
        slotLabel: '2',
        cost: 3,
      }),
    },
    t,
    1350,
  );
  handState = mergeHandEvent(handState, benchHit);
  assert.equal(handState.owned[confirmedTargetName].benchCount, 1);
  assert.equal(handState.owned[confirmedTargetName].count, 2);

  const economyScanned = buildEconomyEvent(
    'Node.Action.Succeeded',
    {
      name: 'AutoRollBuy_EconomyScan',
      ...makeFocus('Node.Action.Succeeded', {
        scope: 'goldenSpatula.economy',
        event: 'scanned',
      }),
    },
    t,
    1360,
  );
  economyState = mergeEconomyEvent(economyState, economyScanned);
  assert.equal(economyState.lastEvent.kind, 'scanned');

  const economyGoldRecognized = buildEconomyEvent(
    'Node.Recognition.Succeeded',
    {
      name: 'AutoRollBuy_PreShop_EconomyOcr_Gold',
      recognition_text: '12',
      ...makeFocus('Node.Recognition.Succeeded', {
        scope: 'goldenSpatula.economy',
        event: 'recognized',
        field: 'gold',
      }),
    },
    t,
    1361,
  );
  assert.equal(economyGoldRecognized.kind, 'recognized');
  assert.equal(economyGoldRecognized.gold, 12);
  assert.equal(economyGoldRecognized.rawText, '12');
  assert.equal(economyGoldRecognized.message, 'economy recognized gold 12');
  economyState = mergeEconomyEvent(economyState, economyGoldRecognized);
  assert.equal(economyState.gold, 12);

  const economyLevelRecognized = buildEconomyEvent(
    'Node.Recognition.Succeeded',
    {
      name: 'AutoRollBuy_PreShop_EconomyOcr_Level',
      recognition_detail: { detail: { text: '4级' } },
      ...makeFocus('Node.Recognition.Succeeded', {
        scope: 'goldenSpatula.economy',
        event: 'recognized',
        field: 'level',
      }),
    },
    t,
    1362,
  );
  assert.equal(economyLevelRecognized.kind, 'recognized');
  assert.equal(economyLevelRecognized.level, 4);
  economyState = mergeEconomyEvent(economyState, economyLevelRecognized);
  assert.equal(economyState.level, 4);

  const economyExperienceRecognized = buildEconomyEvent(
    'Node.Recognition.Succeeded',
    {
      name: 'AutoRollBuy_PreShop_EconomyOcr_Experience',
      recognition_detail: { detail: { text: '0/6' } },
      ...makeFocus('Node.Recognition.Succeeded', {
        scope: 'goldenSpatula.economy',
        event: 'recognized',
        field: 'experience',
      }),
    },
    t,
    1363,
  );
  assert.equal(economyExperienceRecognized.kind, 'recognized');
  assert.equal(economyExperienceRecognized.experience, 0);
  assert.equal(economyExperienceRecognized.experienceMax, 6);
  economyState = mergeEconomyEvent(economyState, economyExperienceRecognized);
  assert.equal(economyState.experience, 0);
  assert.equal(economyState.experienceMax, 6);

  const economyScanFailed = buildEconomyEvent(
    'Node.Recognition.Failed',
    {
      name: 'AutoRollBuy_PreShop_EconomyOcr_Gold',
      ...makeFocus('Node.Recognition.Failed', {
        scope: 'goldenSpatula.economy',
        event: 'scanFailed',
        field: 'gold',
      }),
    },
    t,
    1364,
  );
  assert.equal(economyScanFailed.kind, 'scanFailed');
  assert.equal(economyScanFailed.field, 'gold');
  assert.equal(economyScanFailed.message, 'economy missed gold');
  economyState = mergeEconomyEvent(economyState, economyScanFailed);
  assert.equal(economyState.gold, 12);

  const economyRoundRecognized = buildEconomyEvent(
    'Node.Recognition.Succeeded',
    {
      name: 'AutoRollBuy_PreShop_EconomyOcr_Round',
      recognition_text: '2-1',
      ...makeFocus('Node.Recognition.Succeeded', {
        scope: 'goldenSpatula.economy',
        event: 'recognized',
        field: 'round',
      }),
    },
    t,
    1365,
  );
  assert.equal(economyRoundRecognized.kind, 'recognized');
  assert.equal(economyRoundRecognized.round, '2-1');
  assert.equal(economyRoundRecognized.message, 'economy recognized round 2-1');
  economyState = mergeEconomyEvent(economyState, economyRoundRecognized);
  assert.equal(economyState.round, '2-1');

  const economyStreakRecognized = buildEconomyEvent(
    'Node.Recognition.Succeeded',
    {
      name: 'AutoRollBuy_PreShop_EconomyOcr_Streak',
      recognition_text: '1',
      ...makeFocus('Node.Recognition.Succeeded', {
        scope: 'goldenSpatula.economy',
        event: 'recognized',
        field: 'streak',
        streakKind: 'win',
      }),
    },
    t,
    1366,
  );
  assert.equal(economyStreakRecognized.kind, 'recognized');
  assert.equal(economyStreakRecognized.streakKind, 'win');
  assert.equal(economyStreakRecognized.streakInterest, 1);
  assert.equal(economyStreakRecognized.message, 'economy recognized streak 1');
  economyState = mergeEconomyEvent(economyState, economyStreakRecognized);
  assert.equal(economyState.streakKind, 'win');
  assert.equal(economyState.streakInterest, 1);

  const shopScanStarted = buildKnowledgeEvent(
    'Node.PipelineNode.Succeeded',
    {
      name: 'RecognizeShopChampions',
      ...makeFocus('Node.PipelineNode.Succeeded', {
        scope: 'goldenSpatula.knowledge',
        event: 'shopScanStarted',
        scanKind: 'champions',
      }),
    },
    t,
    1370,
  );
  assert.equal(shopScanStarted.kind, 'shopScanStarted');
  let knowledgeState = mergeKnowledgeEvent(createEmptyKnowledgeScanState(), shopScanStarted);
  assert.equal(knowledgeState.active, true);

  const shopChampionHit = buildKnowledgeEvent(
    'Node.Recognition.Succeeded',
    {
      name: 'KnowledgeShopChampions_S3_T1',
      ...makeFocus('Node.Recognition.Succeeded', {
        scope: 'goldenSpatula.knowledge',
        event: 'shopChampionHit',
        scanKind: 'champions',
        slotIndex: 3,
        slotLabel: '3',
        templatePath: 'image/champion/4/vex.png',
      }),
    },
    t,
    1371,
  );
  assert.equal(shopChampionHit.kind, 'shopChampionHit');
  assert.equal(shopChampionHit.message, 'shop 3');
  knowledgeState = mergeKnowledgeEvent(knowledgeState, shopChampionHit);
  assert.equal(knowledgeState.shopSlots[3].confidence, 'matched');
  assert.equal(knowledgeState.shopSlots[3].templatePath, 'image/champion/4/vex.png');

  const shopSlotMiss = buildKnowledgeEvent(
    'Node.Recognition.Failed',
    {
      name: 'KnowledgeShopChampions_S4_NoMatch',
      ...makeFocus('Node.Recognition.Failed', {
        scope: 'goldenSpatula.knowledge',
        event: 'shopSlotMiss',
        scanKind: 'champions',
        slotIndex: '4',
        slotLabel: '4',
      }),
    },
    t,
    1372,
  );
  knowledgeState = mergeKnowledgeEvent(knowledgeState, shopSlotMiss);
  assert.equal(knowledgeState.shopSlots[4].confidence, 'empty');

  const itemScanStarted = buildKnowledgeEvent(
    'Node.PipelineNode.Succeeded',
    {
      name: 'RecognizeBasicItems',
      ...makeFocus('Node.PipelineNode.Succeeded', {
        scope: 'goldenSpatula.knowledge',
        event: 'itemScanStarted',
        scanKind: 'basicItems',
        itemKind: 'basicItems',
      }),
    },
    t,
    1380,
  );
  knowledgeState = mergeKnowledgeEvent(knowledgeState, itemScanStarted);
  assert.equal(knowledgeState.active, true);

  const inventoryItemHit = buildKnowledgeEvent(
    'Node.Recognition.Succeeded',
    {
      name: 'KnowledgeBasicItems_Inventory_T1',
      ...makeFocus('Node.Recognition.Succeeded', {
        scope: 'goldenSpatula.knowledge',
        event: 'itemHit',
        scanKind: 'basicItems',
        itemKind: 'basicItems',
        zone: 'inventory',
        templatePath: 'image/item/basic/recurve_bow.png',
      }),
    },
    t,
    1381,
  );
  assert.equal(inventoryItemHit.message, 'item basic inventory');
  knowledgeState = mergeKnowledgeEvent(knowledgeState, inventoryItemHit);

  const benchItemHit = buildKnowledgeEvent(
    'Node.Recognition.Succeeded',
    {
      name: 'KnowledgeBasicItems_Bench_T1',
      ...makeFocus('Node.Recognition.Succeeded', {
        scope: 'goldenSpatula.knowledge',
        event: 'itemHit',
        scanKind: 'basicItems',
        itemKind: 'basicItems',
        zone: 'bench',
        templatePath: 'IMAGE/ITEM/BASIC/RECURVE_BOW.PNG',
      }),
    },
    t,
    1382,
  );
  knowledgeState = mergeKnowledgeEvent(knowledgeState, benchItemHit);
  const itemKey = 'basicItems:image/item/basic/recurve_bow.png';
  assert.deepEqual(knowledgeState.items[itemKey].zones, ['inventory', 'bench']);

  const streakRecognized = buildKnowledgeEvent(
    'Node.Recognition.Succeeded',
    {
      name: 'KnowledgeStreak_Win',
      recognition_text: '3连胜',
      ...makeFocus('Node.Recognition.Succeeded', {
        scope: 'goldenSpatula.knowledge',
        event: 'streakRecognized',
        scanKind: 'streak',
        streakKind: 'win',
      }),
    },
    t,
    1390,
  );
  assert.equal(streakRecognized.kind, 'streakRecognized');
  assert.equal(streakRecognized.streakCount, 3);
  assert.equal(streakRecognized.message, 'streak win 3');
  knowledgeState = mergeKnowledgeEvent(knowledgeState, streakRecognized);
  assert.equal(knowledgeState.streak.win.count, 3);
  assert.equal(knowledgeState.streak.win.status, 'recognized');

  assertNull(
    buildKnowledgeEvent(
      'Node.Recognition.Succeeded',
      {
        name: 'KnowledgeShopChampions_S1_T1',
        ...makeFocus('Node.Recognition.Succeeded', {
          scope: 'goldenSpatula.roll',
          event: 'shopChampionHit',
        }),
      },
      t,
      1395,
    ),
    'wrong scope must not become knowledge event',
  );

  const completed = buildRollEvent(
    'Node.PipelineNode.Succeeded',
    {
      name: 'AutoRollBuy_Done',
      ...makeFocus('Node.PipelineNode.Succeeded', {
        scope: 'goldenSpatula.roll',
        event: 'completed',
        cycle: 4,
        totalCycles: 4,
        rollCount: 3,
        targetNames: ['薇古丝', '波比'],
      }),
    },
    t,
    1400,
  );
  rollState = mergeRollEvent(rollState, completed);
  assert.equal(rollState.active, false);
  assert.equal(rollState.updatedAt, 1400);

  const rollNotReady = buildRollEvent(
    'Node.PipelineNode.Succeeded',
    {
      name: 'AutoRollBuy_Roll1_NotReady',
      ...makeFocus('Node.PipelineNode.Succeeded', {
        scope: 'goldenSpatula.roll',
        event: 'notReady',
        cycle: 2,
        totalCycles: 4,
        rollCount: 3,
        targetNames: ['è–‡å¤ä¸', 'æ³¢æ¯”'],
      }),
    },
    t,
    1450,
  );
  assert.equal(rollNotReady.kind, 'notReady');
  assert.equal(rollNotReady.message, 'roll not ready');
  rollState = mergeRollEvent({ ...rollState, active: true }, rollNotReady);
  assert.equal(rollState.active, false);
  assert.equal(rollState.lastEvent.kind, 'notReady');

  assertNull(
    buildRollEvent(
      'Node.Action.Succeeded',
      {
        name: 'AutoRollBuy_C0_Buy1_T0_S1',
        ...makeFocus('Node.Action.Succeeded', {
          scope: 'goldenSpatula.xp',
          event: 'clicked',
        }),
      },
      t,
      1500,
    ),
    'wrong scope must not become roll event',
  );

  const xpStarted = buildXpEvent(
    'Node.PipelineNode.Succeeded',
    {
      name: 'AutoBuyExperienceThree',
      ...makeFocus('Node.PipelineNode.Succeeded', {
        scope: 'goldenSpatula.xp',
        event: 'started',
        total: 3,
      }),
    },
    t,
    2000,
  );
  assert.equal(xpStarted.message, 'xp started');
  let xpState = mergeXpEvent(createEmptyXpRunState(), xpStarted);
  assert.equal(xpState.active, true);
  assert.equal(xpState.total, 3);

  const xpClicked = buildXpEvent(
    'Node.Action.Succeeded',
    {
      name: 'AutoBuyExperienceThree_Click2',
      ...makeFocus('Node.Action.Succeeded', {
        scope: 'goldenSpatula.xp',
        event: 'clicked',
        current: '2',
        total: '3',
      }),
    },
    t,
    2100,
  );
  assert.equal(xpClicked.message, 'xp clicked 2/3');
  xpState = mergeXpEvent(xpState, xpClicked);
  assert.equal(xpState.current, 2);
  assert.equal(xpState.active, true);
  economyState = mergeEconomyEvent(economyState, buildEconomyEventFromXpEvent(xpClicked, t));
  assert.equal(economyState.xpGold, 4);

  const xpCompleted = buildXpEvent(
    'Node.PipelineNode.Succeeded',
    {
      name: 'AutoBuyExperienceThree_After',
      ...makeFocus('Node.PipelineNode.Succeeded', {
        scope: 'goldenSpatula.xp',
        event: 'completed',
        total: 3,
      }),
    },
    t,
    2200,
  );
  xpState = mergeXpEvent(xpState, xpCompleted);
  assert.equal(xpState.active, false);
  assert.equal(xpState.current, 3);

  const notReady = buildXpEvent(
    'Node.PipelineNode.Succeeded',
    {
      name: 'AutoBuyExperienceNotReady',
      ...makeFocus('Node.PipelineNode.Succeeded', {
        scope: 'goldenSpatula.xp',
        event: 'notReady',
      }),
    },
    t,
    2300,
  );
  xpState = mergeXpEvent({ ...xpState, active: true }, notReady);
  assert.equal(xpState.active, false);
  assert.equal(xpState.lastEvent.kind, 'notReady');

  assertNull(
    buildXpEvent(
      'Node.PipelineNode.Succeeded',
      {
        name: 'AutoRollBuy_Done',
        ...makeFocus('Node.PipelineNode.Succeeded', {
          scope: 'goldenSpatula.roll',
          event: 'completed',
        }),
      },
      t,
      2400,
    ),
    'wrong scope must not become xp event',
  );

  console.log('Golden Spatula automation event test');
  console.log(`Roll events checked: ${rollState.events.length}`);
  console.log(`XP events checked: ${xpState.events.length}`);
  console.log(`Knowledge events checked: ${knowledgeState.events.length}`);
  console.log('OK: callback event parsing and state merging are valid.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
