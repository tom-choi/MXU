import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const servicePath = path.join(repoRoot, 'src', 'services', 'goldenSpatulaDecisionEngine.ts');
const shopOddsPath = path.join(repoRoot, 'src', 'services', 'goldenSpatulaShopOdds.ts');
const acquisitionModelPath = path.join(
  repoRoot,
  'src',
  'services',
  'goldenSpatulaAcquisitionModel.ts',
);
const pickDecisionModelPath = path.join(
  repoRoot,
  'src',
  'services',
  'goldenSpatulaPickDecisionModel.ts',
);
const pickRecommendationModelPath = path.join(
  repoRoot,
  'src',
  'services',
  'goldenSpatulaPickRecommendationModel.ts',
);
const tempoModelPath = path.join(repoRoot, 'src', 'services', 'goldenSpatulaTempoModel.ts');
const targetModelPath = path.join(repoRoot, 'src', 'services', 'goldenSpatulaTargetModel.ts');
const decisionContextPath = path.join(
  repoRoot,
  'src',
  'services',
  'goldenSpatulaDecisionContext.ts',
);
const rollTargetsPath = path.join(repoRoot, 'src', 'services', 'goldenSpatulaRollTargets.ts');
const candidateModelPath = path.join(repoRoot, 'src', 'services', 'goldenSpatulaCandidateModel.ts');
const decisionReasonModelPath = path.join(
  repoRoot,
  'src',
  'services',
  'goldenSpatulaDecisionReasonModel.ts',
);
const economyDecisionModelPath = path.join(
  repoRoot,
  'src',
  'services',
  'goldenSpatulaEconomyDecisionModel.ts',
);
const benchDecisionModelPath = path.join(
  repoRoot,
  'src',
  'services',
  'goldenSpatulaBenchDecisionModel.ts',
);
const observationModelPath = path.join(
  repoRoot,
  'src',
  'services',
  'goldenSpatulaObservationModel.ts',
);
const transitionModelPath = path.join(
  repoRoot,
  'src',
  'services',
  'goldenSpatulaTransitionModel.ts',
);
const rollDecisionScoreModelPath = path.join(
  repoRoot,
  'src',
  'services',
  'goldenSpatulaRollDecisionScoreModel.ts',
);
const roundPolicyModelPath = path.join(
  repoRoot,
  'src',
  'services',
  'goldenSpatulaRoundPolicyModel.ts',
);

async function importDecisionModule() {
  const tempDir = path.join(repoRoot, 'node_modules', '.cache', 'mxu-golden-tests');
  await fs.mkdir(tempDir, { recursive: true });
  for (const [sourcePath, outputName] of [
    [shopOddsPath, 'goldenSpatulaShopOdds'],
    [acquisitionModelPath, 'goldenSpatulaAcquisitionModel'],
    [pickDecisionModelPath, 'goldenSpatulaPickDecisionModel'],
    [pickRecommendationModelPath, 'goldenSpatulaPickRecommendationModel'],
    [decisionContextPath, 'goldenSpatulaDecisionContext'],
    [rollTargetsPath, 'goldenSpatulaRollTargets'],
    [candidateModelPath, 'goldenSpatulaCandidateModel'],
    [decisionReasonModelPath, 'goldenSpatulaDecisionReasonModel'],
    [benchDecisionModelPath, 'goldenSpatulaBenchDecisionModel'],
    [economyDecisionModelPath, 'goldenSpatulaEconomyDecisionModel'],
    [observationModelPath, 'goldenSpatulaObservationModel'],
    [tempoModelPath, 'goldenSpatulaTempoModel'],
    [targetModelPath, 'goldenSpatulaTargetModel'],
    [transitionModelPath, 'goldenSpatulaTransitionModel'],
    [rollDecisionScoreModelPath, 'goldenSpatulaRollDecisionScoreModel'],
    [roundPolicyModelPath, 'goldenSpatulaRoundPolicyModel'],
  ]) {
    const source = await fs.readFile(sourcePath, 'utf8');
    const transpiled = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ES2022,
        target: ts.ScriptTarget.ES2020,
        sourceMap: false,
        paths: {},
      },
      fileName: sourcePath,
    });
    await fs.writeFile(path.join(tempDir, outputName), transpiled.outputText);
  }

  const source = await fs.readFile(servicePath, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2020,
      sourceMap: false,
      paths: {},
    },
    fileName: servicePath,
  });
  const modulePath = path.join(tempDir, `goldenSpatulaDecisionEngine-${Date.now()}.mjs`);
  await fs.writeFile(modulePath, transpiled.outputText);
  const rollTargetsModulePath = path.join(tempDir, `goldenSpatulaRollTargets-${Date.now()}.mjs`);
  await fs.writeFile(rollTargetsModulePath, `export * from './goldenSpatulaRollTargets';\n`);
  const transitionModulePath = path.join(tempDir, `goldenSpatulaTransitionModel-${Date.now()}.mjs`);
  await fs.writeFile(transitionModulePath, `export * from './goldenSpatulaTransitionModel';\n`);
  const acquisitionModulePath = path.join(
    tempDir,
    `goldenSpatulaAcquisitionModel-${Date.now()}.mjs`,
  );
  await fs.writeFile(acquisitionModulePath, `export * from './goldenSpatulaAcquisitionModel';\n`);
  const observationModulePath = path.join(
    tempDir,
    `goldenSpatulaObservationModel-${Date.now()}.mjs`,
  );
  await fs.writeFile(observationModulePath, `export * from './goldenSpatulaObservationModel';\n`);
  const rollDecisionScoreModulePath = path.join(
    tempDir,
    `goldenSpatulaRollDecisionScoreModel-${Date.now()}.mjs`,
  );
  await fs.writeFile(
    rollDecisionScoreModulePath,
    `export * from './goldenSpatulaRollDecisionScoreModel';\n`,
  );
  const [
    decisionModule,
    rollTargetsModule,
    transitionModule,
    acquisitionModule,
    observationModule,
    rollDecisionScoreModule,
  ] = await Promise.all([
    import(`file://${modulePath.replaceAll('\\', '/')}`),
    import(`file://${rollTargetsModulePath.replaceAll('\\', '/')}`),
    import(`file://${transitionModulePath.replaceAll('\\', '/')}`),
    import(`file://${acquisitionModulePath.replaceAll('\\', '/')}`),
    import(`file://${observationModulePath.replaceAll('\\', '/')}`),
    import(`file://${rollDecisionScoreModulePath.replaceAll('\\', '/')}`),
  ]);
  return {
    ...decisionModule,
    ...rollTargetsModule,
    ...transitionModule,
    ...acquisitionModule,
    ...observationModule,
    ...rollDecisionScoreModule,
  };
}

function makeVariant(patch = {}) {
  return {
    id: 'variant-a',
    slot: 'A',
    name: 'Option A',
    code: '',
    traitsSummary: '5木灵族3牧羊人2魔术师',
    mainCarries: [{ name: '维迦', items: ['蓝霸符'], isCarry: true }],
    frontliners: [{ name: '波比' }],
    units: [{ name: '维迦' }, { name: '波比' }, { name: '阿狸' }, { name: '拉莫斯' }],
    ...patch,
  };
}

async function main() {
  const {
    buildGoldenSpatulaDecisionPlan,
    collectGoldenSpatulaDecisionRollTargetTemplates,
    collectGoldenSpatulaRollTargetTemplates,
    extractGoldenSpatulaTraitTags,
    getGoldenSpatulaShopOdds,
    getGoldenSpatulaItemFamilies,
    getGoldenSpatulaHealthPressureDecision,
    scoreGoldenSpatulaTransitionUnit,
    estimateGoldenSpatulaAcquisition,
  } = await importDecisionModule();

  assert.deepEqual(getGoldenSpatulaItemFamilies('infinity edge'), ['ad']);
  assert.deepEqual(getGoldenSpatulaItemFamilies('blue buff'), ['mana']);
  assert.deepEqual(getGoldenSpatulaItemFamilies('tank vest'), ['tank']);
  assert.deepEqual(getGoldenSpatulaItemFamilies('adaptive helm'), ['ap', 'mana']);

  assert.deepEqual(extractGoldenSpatulaTraitTags('5木灵族3牧羊人2魔术师'), [
    '木灵族',
    '牧羊人',
    '魔术师',
  ]);

  const championAssets = {
    维迦: { name: '维迦', cost: 1, traits: ['木灵族', '魔术师'] },
    波比: { name: '波比', cost: 1, traits: ['木灵族'] },
    阿狸: { name: '阿狸', cost: 2, traits: ['牧羊人'] },
    拉莫斯: { name: '拉莫斯', cost: 4, traits: ['重装战士'] },
    薇古丝: { name: '薇古丝', cost: 5, traits: ['新星特攻队'] },
  };

  const activeVariant = makeVariant();
  const recommendedLineups = [
    {
      id: 'rec-1',
      slug: 'rec-1',
      name: '木灵小法',
      path: 'lineup_1.json',
      quality: 'S',
      variant: makeVariant({
        id: 'rec-v1',
        name: 'Recommended A',
        mainCarries: [{ name: '维迦', isCarry: true }],
        frontliners: [{ name: '波比' }],
      }),
    },
    {
      id: 'rec-2',
      slug: 'rec-2',
      name: '新星九五',
      path: 'lineup_2.json',
      quality: 'A',
      variant: makeVariant({
        id: 'rec-v2',
        traitsSummary: '3新星特攻队2堡垒卫士2斗士',
        mainCarries: [{ name: '薇古丝', isCarry: true }],
        frontliners: [{ name: '拉莫斯' }],
        units: [{ name: '薇古丝' }, { name: '拉莫斯' }, { name: '阿狸' }],
      }),
    },
  ];

  const rollPlan = buildGoldenSpatulaDecisionPlan({
    activeVariant,
    recommendedLineups,
    championAssets,
    handState: {
      active: true,
      targetNames: ['维迦'],
      owned: {
        维迦: {
          name: '维迦',
          count: 2,
          boughtCount: 2,
          benchCount: 0,
          cost: 1,
          updatedAt: 1000,
        },
      },
      events: [],
    },
    economyState: {
      active: true,
      gold: 36,
      level: 5,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
  });

  assert.equal(rollPlan.picks[0].name, '维迦');
  assert.equal(rollPlan.picks[0].reasons.includes('nearUpgrade'), true);
  assert.equal(rollPlan.picks[0].scoreBreakdown.final, rollPlan.picks[0].score);
  assert.ok(rollPlan.picks[0].scoreBreakdown.base > 0);
  assert.ok(rollPlan.picks[0].scoreBreakdown.bonuses.nearUpgrade > 0);
  assert.ok(rollPlan.picks[0].scoreBreakdown.multipliers.shopOdds > 0);
  assert.equal(rollPlan.economyAdvice.action, 'roll');
  assert.ok(rollPlan.economyAdvice.breakdown.urgentPickCount > 0);
  assert.equal(rollPlan.economyAdvice.breakdown.projectedRollBudget, 13);
  assert.equal(rollPlan.economyAdvice.breakdown.nearUpgrade, true);
  assert.equal(rollPlan.economyAdvice.breakdown.topPickScore, rollPlan.picks[0].score);
  assert.ok(rollPlan.economyAdvice.breakdown.rollDecisionScore.total >= 5);
  assert.notEqual(rollPlan.economyAdvice.breakdown.rollDecisionScore.band, 'none');
  assert.equal(
    rollPlan.economyAdvice.breakdown.rollDecisionScore.unknownFactors.includes('healthPressure'),
    true,
  );
  assert.equal(
    rollPlan.economyAdvice.breakdown.rollDecisionScore.stopLineTargetNames.includes(
      rollPlan.picks[0].name,
    ),
    true,
  );
  assert.equal(rollPlan.transitionLineups[0].name, '木灵小法');
  assert.equal(
    rollPlan.transitionLineups[0].scoreBreakdown.final,
    rollPlan.transitionLineups[0].score,
  );

  const savePlan = buildGoldenSpatulaDecisionPlan({
    activeVariant,
    recommendedLineups: [],
    championAssets,
    handState: { active: false, targetNames: [], owned: {}, events: [] },
    economyState: {
      active: true,
      gold: 18,
      level: 5,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
  });

  assert.equal(savePlan.economyAdvice.action, 'save');
  assert.equal(savePlan.economyAdvice.interestGoldNeeded, 2);
  assert.equal(savePlan.economyAdvice.breakdown.projectedRollBudget, 4);
  assert.equal(savePlan.economyAdvice.breakdown.rollDecisionScore.factors.economyMargin.score, 0);
  assert.ok(savePlan.picks.length > 0);

  assert.equal(
    getGoldenSpatulaHealthPressureDecision({ active: true, health: 72, gold: 50 }).bankFloor,
    40,
  );
  assert.equal(
    getGoldenSpatulaHealthPressureDecision({ active: true, health: 62, gold: 40 }).bankFloor,
    30,
  );
  assert.equal(
    getGoldenSpatulaHealthPressureDecision({ active: true, health: 42, gold: 40 })
      .recommendedRollCount,
    4,
  );
  assert.equal(
    getGoldenSpatulaHealthPressureDecision({ active: true, health: 28, gold: 30 })
      .recommendedRollCount,
    10,
  );
  assert.equal(
    getGoldenSpatulaHealthPressureDecision({ active: true, health: 18, gold: 18 })
      .recommendedRollCount,
    9,
  );

  const lowHealthPlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'low-health-variant',
      slot: 'A',
      name: 'Low Health',
      code: '',
      traitsSummary: '2probe',
      mainCarries: [{ name: 'eagle', isCarry: true }],
      frontliners: [{ name: 'bear' }],
      units: [{ name: 'eagle' }, { name: 'bear' }],
    },
    championAssets: {
      eagle: {
        name: 'eagle',
        cost: 2,
        imagePath: 'resource_knowledge/image/champion/2/eagle.png',
      },
      bear: { name: 'bear', cost: 2 },
      tiger: { name: 'tiger', cost: 2 },
      lynx: { name: 'lynx', cost: 2 },
    },
    handState: { active: false, targetNames: [], owned: {}, events: [] },
    economyState: {
      active: true,
      round: '3-2',
      gold: 18,
      health: 28,
      level: 6,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
  });
  assert.equal(lowHealthPlan.economyAdvice.action, 'roll');
  assert.equal(lowHealthPlan.economyAdvice.confidence, 'high');
  assert.equal(lowHealthPlan.economyAdvice.recommendedRollCount, 4);
  assert.equal(
    lowHealthPlan.economyAdvice.breakdown.rollDecisionScore.factors.healthPressure.score,
    2,
  );
  assert.equal(
    lowHealthPlan.economyAdvice.breakdown.rollDecisionScore.unknownFactors.includes(
      'healthPressure',
    ),
    false,
  );

  const dangerHealthPlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'danger-health-variant',
      slot: 'A',
      name: 'Danger Health',
      code: '',
      traitsSummary: '2probe',
      mainCarries: [{ name: 'eagle', isCarry: true }],
      frontliners: [{ name: 'bear' }],
      units: [{ name: 'eagle' }, { name: 'bear' }],
    },
    championAssets: {
      eagle: {
        name: 'eagle',
        cost: 2,
        imagePath: 'resource_knowledge/image/champion/2/eagle.png',
      },
      bear: { name: 'bear', cost: 2 },
      tiger: { name: 'tiger', cost: 2 },
      lynx: { name: 'lynx', cost: 2 },
    },
    handState: { active: false, targetNames: [], owned: {}, events: [] },
    economyState: {
      active: true,
      round: '3-2',
      gold: 30,
      health: 28,
      level: 6,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
  });
  assert.equal(dangerHealthPlan.economyAdvice.action, 'roll');
  assert.equal(dangerHealthPlan.economyAdvice.recommendedRollCount, 10);

  const deathZonePlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'death-zone-variant',
      slot: 'A',
      name: 'Death Zone',
      code: '',
      traitsSummary: '2probe',
      mainCarries: [{ name: 'eagle', isCarry: true }],
      frontliners: [{ name: 'bear' }],
      units: [{ name: 'eagle' }, { name: 'bear' }],
    },
    championAssets: {
      eagle: { name: 'eagle', cost: 2 },
      bear: { name: 'bear', cost: 2 },
      tiger: { name: 'tiger', cost: 2 },
      lynx: { name: 'lynx', cost: 2 },
    },
    handState: { active: false, targetNames: [], owned: {}, events: [] },
    economyState: {
      active: true,
      round: '3-2',
      gold: 22,
      health: 18,
      level: 6,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
  });
  assert.equal(deathZonePlan.economyAdvice.action, 'roll');
  assert.equal(deathZonePlan.economyAdvice.confidence, 'high');
  assert.equal(deathZonePlan.economyAdvice.recommendedRollCount, 11);

  const liquidityTaxPlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'liquidity-tax-variant',
      slot: 'A',
      name: 'Liquidity Tax',
      code: '',
      traitsSummary: '2core',
      mainCarries: [{ name: 'eagle', isCarry: true }],
      frontliners: [{ name: 'bear' }],
      units: [{ name: 'eagle' }, { name: 'bear' }],
    },
    recommendedLineups: [
      {
        id: 'liquidity-tax-rec',
        slug: 'liquidity-tax-rec',
        name: 'Future Pivot',
        path: 'future-pivot.json',
        quality: 'A',
        variant: {
          id: 'future-pivot-variant',
          slot: 'B',
          name: 'Future Pivot',
          code: '',
          traitsSummary: '2future',
          mainCarries: [],
          frontliners: [],
          units: [{ name: 'fox' }],
        },
      },
    ],
    championAssets: {
      eagle: { name: 'eagle', cost: 2 },
      bear: { name: 'bear', cost: 2 },
      fox: { name: 'fox', cost: 3 },
      tiger: { name: 'tiger', cost: 3 },
      lynx: { name: 'lynx', cost: 3 },
    },
    handState: { active: false, targetNames: [], owned: {}, events: [] },
    economyState: {
      active: true,
      round: '2-5',
      gold: 32,
      level: 6,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
    knowledgeState: {
      active: false,
      shopSlots: {
        1: {
          slotIndex: 1,
          championName: 'fox',
          confidence: 'matched',
          updatedAt: 1000,
        },
      },
      items: {},
      streak: {},
      events: [],
    },
  });
  const deadSingleFox = liquidityTaxPlan.picks.find((pick) => pick.name === 'fox');
  assert.ok(deadSingleFox);
  assert.equal(deadSingleFox.shopVisibleCount, 1);
  assert.equal(deadSingleFox.scoreBreakdown.penalties.interestTax >= 50, true);
  assert.equal(
    deadSingleFox.scoreBreakdown.penalty >= deadSingleFox.scoreBreakdown.penalties.interestTax,
    true,
  );

  const weakFutureCarryLiquidityPlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'weak-future-carry-liquidity-variant',
      slot: 'A',
      name: 'Weak Future Carry Liquidity',
      code: '',
      traitsSummary: '2core',
      mainCarries: [{ name: 'eagle', isCarry: true }],
      frontliners: [{ name: 'bear' }],
      units: [{ name: 'eagle' }, { name: 'bear' }],
    },
    recommendedLineups: [
      {
        id: 'weak-future-carry-rec',
        slug: 'weak-future-carry-rec',
        name: 'Future Carry',
        path: 'future-carry.json',
        quality: 'A',
        variant: {
          id: 'future-carry-variant',
          slot: 'B',
          name: 'Future Carry',
          code: '',
          traitsSummary: '2future',
          mainCarries: [{ name: 'phoenix', isCarry: true }],
          frontliners: [],
          units: [{ name: 'phoenix' }],
        },
      },
    ],
    championAssets: {
      eagle: { name: 'eagle', cost: 2 },
      bear: { name: 'bear', cost: 2 },
      phoenix: {
        name: 'phoenix',
        cost: 3,
        imagePath: 'resource_knowledge/image/champion/3/phoenix.png',
      },
    },
    handState: { active: false, targetNames: [], owned: {}, events: [] },
    economyState: {
      active: true,
      round: '2-5',
      gold: 18,
      level: 6,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
    knowledgeState: {
      active: false,
      shopSlots: {
        1: {
          slotIndex: 1,
          championName: 'phoenix',
          confidence: 'matched',
          updatedAt: 1000,
        },
      },
      items: {},
      streak: {},
      events: [],
    },
  });
  const weakFutureCarryPhoenix = weakFutureCarryLiquidityPlan.picks.find(
    (pick) => pick.name === 'phoenix',
  );
  assert.ok(weakFutureCarryPhoenix);
  assert.equal(weakFutureCarryPhoenix.reasons.includes('recommendedCarry'), true);
  assert.equal(weakFutureCarryPhoenix.reasons.includes('nearUpgrade'), false);
  assert.equal(weakFutureCarryPhoenix.scoreBreakdown.penalties.interestTax >= 32, true);
  assert.equal(weakFutureCarryLiquidityPlan.recommendedRollTargetNames.includes('phoenix'), false);
  const weakFutureCarryDecisionTargets = collectGoldenSpatulaDecisionRollTargetTemplates({
    variant: {
      id: 'weak-future-carry-liquidity-variant',
      slot: 'A',
      name: 'Weak Future Carry Liquidity',
      code: '',
      traitsSummary: '2core',
      mainCarries: [{ name: 'eagle', isCarry: true }],
      frontliners: [{ name: 'bear' }],
      units: [{ name: 'eagle' }, { name: 'bear' }],
    },
    championAssets: {
      eagle: { name: 'eagle', cost: 2 },
      bear: { name: 'bear', cost: 2 },
      phoenix: {
        name: 'phoenix',
        cost: 3,
        imagePath: 'resource_knowledge/image/champion/3/phoenix.png',
      },
    },
    decisionPlan: weakFutureCarryLiquidityPlan,
  });
  assert.equal(
    weakFutureCarryDecisionTargets.some((target) => target.name === 'phoenix'),
    false,
  );

  const weakFutureCarryRollTargetPlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'weak-future-carry-roll-target-variant',
      slot: 'A',
      name: 'Weak Future Carry Roll Target',
      code: '',
      traitsSummary: '2core',
      mainCarries: [{ name: 'eagle', isCarry: true }],
      frontliners: [{ name: 'bear' }],
      units: [{ name: 'eagle' }, { name: 'bear' }],
    },
    recommendedLineups: [
      {
        id: 'weak-future-carry-roll-target-rec',
        slug: 'weak-future-carry-roll-target-rec',
        name: 'Future Carry Roll Target',
        path: 'future-carry-roll-target.json',
        quality: 'A',
        variant: {
          id: 'future-carry-roll-target-variant',
          slot: 'B',
          name: 'Future Carry Roll Target',
          code: '',
          traitsSummary: '2future',
          mainCarries: [{ name: 'phoenix', isCarry: true }],
          frontliners: [],
          units: [{ name: 'phoenix' }],
        },
      },
    ],
    championAssets: {
      eagle: { name: 'eagle', cost: 2 },
      bear: { name: 'bear', cost: 2 },
      phoenix: {
        name: 'phoenix',
        cost: 3,
        imagePath: 'resource_knowledge/image/champion/3/phoenix.png',
      },
    },
    handState: { active: false, targetNames: [], owned: {}, events: [] },
    economyState: {
      active: true,
      round: '2-5',
      gold: 18,
      level: 6,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
    knowledgeState: {
      active: false,
      shopSlots: {},
      items: {},
      streak: {},
      events: [],
    },
  });
  const weakFutureCarryRollPhoenix = weakFutureCarryRollTargetPlan.picks.find(
    (pick) => pick.name === 'phoenix',
  );
  assert.ok(weakFutureCarryRollPhoenix);
  assert.equal(weakFutureCarryRollPhoenix.reasons.includes('recommendedCarry'), true);
  assert.equal(weakFutureCarryRollPhoenix.reasons.includes('activeLineup'), false);
  assert.equal(weakFutureCarryRollTargetPlan.recommendedRollTargetNames.includes('phoenix'), false);
  const weakFutureCarryRollTargets = collectGoldenSpatulaDecisionRollTargetTemplates({
    variant: {
      id: 'weak-future-carry-roll-target-variant',
      slot: 'A',
      name: 'Weak Future Carry Roll Target',
      code: '',
      traitsSummary: '2core',
      mainCarries: [{ name: 'eagle', isCarry: true }],
      frontliners: [{ name: 'bear' }],
      units: [{ name: 'eagle' }, { name: 'bear' }],
    },
    championAssets: {
      eagle: { name: 'eagle', cost: 2 },
      bear: { name: 'bear', cost: 2 },
      phoenix: {
        name: 'phoenix',
        cost: 3,
        imagePath: 'resource_knowledge/image/champion/3/phoenix.png',
      },
    },
    decisionPlan: weakFutureCarryRollTargetPlan,
  });
  assert.equal(
    weakFutureCarryRollTargets.some((target) => target.name === 'phoenix'),
    false,
  );

  const buildLowEconomyOwnedFutureCarryPlan = ({ id, name, shopVisible }) =>
    buildGoldenSpatulaDecisionPlan({
      activeVariant: {
        id,
        slot: 'A',
        name,
        code: '',
        traitsSummary: '2core',
        mainCarries: [{ name: 'eagle', isCarry: true }],
        frontliners: [{ name: 'bear' }],
        units: [{ name: 'eagle' }, { name: 'bear' }],
      },
      recommendedLineups: [
        {
          id: `${id}-rec`,
          slug: `${id}-rec`,
          name: `${name} Rec`,
          path: `${id}-rec.json`,
          quality: 'A',
          variant: {
            id: `${id}-rec-variant`,
            slot: 'B',
            name: `${name} Rec`,
            code: '',
            traitsSummary: '2future',
            mainCarries: [{ name: 'phoenix', isCarry: true }],
            frontliners: [],
            units: [{ name: 'phoenix' }],
          },
        },
      ],
      championAssets: {
        eagle: { name: 'eagle', cost: 2 },
        bear: { name: 'bear', cost: 2 },
        phoenix: {
          name: 'phoenix',
          cost: 3,
          imagePath: 'resource_knowledge/image/champion/3/phoenix.png',
        },
      },
      handState: {
        active: false,
        targetNames: [],
        owned: {
          phoenix: {
            name: 'phoenix',
            count: 1,
            boughtCount: 1,
            benchCount: 1,
            cost: 3,
            updatedAt: 1000,
          },
        },
        events: [],
      },
      economyState: {
        active: true,
        round: '2-5',
        gold: 18,
        health: 72,
        level: 6,
        estimatedGoldDelta: 0,
        boughtChampionGold: 0,
        refreshGold: 0,
        xpGold: 0,
        xpPurchases: 0,
        events: [],
      },
      knowledgeState: {
        active: false,
        shopSlots: shopVisible
          ? {
              1: {
                slotIndex: 1,
                championName: 'phoenix',
                confidence: 'matched',
                updatedAt: 1000,
              },
            }
          : {},
        items: {},
        streak: {},
        events: [],
      },
    });

  const lowEconomyOwnedFutureCarryRollTargetPlan = buildLowEconomyOwnedFutureCarryPlan({
    id: 'low-economy-owned-future-carry-roll-target-variant',
    name: 'Low Economy Owned Future Carry Roll Target',
    shopVisible: false,
  });
  const lowEconomyOwnedFutureCarryRollPhoenix =
    lowEconomyOwnedFutureCarryRollTargetPlan.picks.find((pick) => pick.name === 'phoenix');
  assert.ok(lowEconomyOwnedFutureCarryRollPhoenix);
  assert.equal(lowEconomyOwnedFutureCarryRollPhoenix.ownedCount, 1);
  assert.equal(lowEconomyOwnedFutureCarryRollPhoenix.shopVisibleCount, undefined);
  assert.equal(lowEconomyOwnedFutureCarryRollPhoenix.reasons.includes('recommendedCarry'), true);
  assert.equal(lowEconomyOwnedFutureCarryRollPhoenix.reasons.includes('nearUpgrade'), false);
  assert.equal(
    lowEconomyOwnedFutureCarryRollTargetPlan.recommendedRollTargetNames.includes('phoenix'),
    false,
  );
  const lowEconomyOwnedFutureCarryRollTargets =
    collectGoldenSpatulaDecisionRollTargetTemplates({
      variant: {
        id: 'low-economy-owned-future-carry-roll-target-variant',
        slot: 'A',
        name: 'Low Economy Owned Future Carry Roll Target',
        code: '',
        traitsSummary: '2core',
        mainCarries: [{ name: 'eagle', isCarry: true }],
        frontliners: [{ name: 'bear' }],
        units: [{ name: 'eagle' }, { name: 'bear' }],
      },
      championAssets: {
        eagle: { name: 'eagle', cost: 2 },
        bear: { name: 'bear', cost: 2 },
        phoenix: {
          name: 'phoenix',
          cost: 3,
          imagePath: 'resource_knowledge/image/champion/3/phoenix.png',
        },
      },
      decisionPlan: lowEconomyOwnedFutureCarryRollTargetPlan,
    });
  assert.equal(
    lowEconomyOwnedFutureCarryRollTargets.some((target) => target.name === 'phoenix'),
    false,
  );

  const lowEconomyOwnedFutureCarryPairPlan = buildLowEconomyOwnedFutureCarryPlan({
    id: 'low-economy-owned-future-carry-pair-variant',
    name: 'Low Economy Owned Future Carry Pair',
    shopVisible: true,
  });
  const lowEconomyOwnedFutureCarryPairPhoenix =
    lowEconomyOwnedFutureCarryPairPlan.picks.find((pick) => pick.name === 'phoenix');
  assert.ok(lowEconomyOwnedFutureCarryPairPhoenix);
  assert.equal(lowEconomyOwnedFutureCarryPairPhoenix.ownedCount, 1);
  assert.equal(lowEconomyOwnedFutureCarryPairPhoenix.shopVisibleCount, 1);
  assert.equal(lowEconomyOwnedFutureCarryPairPhoenix.reasons.includes('recommendedCarry'), true);
  assert.equal(lowEconomyOwnedFutureCarryPairPhoenix.reasons.includes('nearUpgrade'), false);
  assert.equal(
    lowEconomyOwnedFutureCarryPairPlan.recommendedRollTargetNames.includes('phoenix'),
    true,
  );
  const lowEconomyOwnedFutureCarryPairTargets = collectGoldenSpatulaDecisionRollTargetTemplates({
    variant: {
      id: 'low-economy-owned-future-carry-pair-variant',
      slot: 'A',
      name: 'Low Economy Owned Future Carry Pair',
      code: '',
      traitsSummary: '2core',
      mainCarries: [{ name: 'eagle', isCarry: true }],
      frontliners: [{ name: 'bear' }],
      units: [{ name: 'eagle' }, { name: 'bear' }],
    },
    championAssets: {
      eagle: { name: 'eagle', cost: 2 },
      bear: { name: 'bear', cost: 2 },
      phoenix: {
        name: 'phoenix',
        cost: 3,
        imagePath: 'resource_knowledge/image/champion/3/phoenix.png',
      },
    },
    decisionPlan: lowEconomyOwnedFutureCarryPairPlan,
  });
  assert.equal(
    lowEconomyOwnedFutureCarryPairTargets.some((target) => target.name === 'phoenix'),
    true,
  );

  const lowEconomyItemFitDeadSinglePlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'low-economy-item-fit-dead-single-variant',
      slot: 'A',
      name: 'Low Economy Item Fit Dead Single',
      code: '',
      traitsSummary: '2probe',
      mainCarries: [],
      frontliners: [],
      units: [],
    },
    recommendedLineups: [
      {
        id: 'low-economy-item-fit-dead-single-rec',
        slug: 'low-economy-item-fit-dead-single-rec',
        name: 'Low Economy Item Fit Dead Single Rec',
        path: 'low-economy-item-fit-dead-single.json',
        quality: 'A',
        variant: {
          id: 'low-economy-item-fit-dead-single-rec-variant',
          slot: 'B',
          name: 'Low Economy Item Fit Dead Single Rec',
          code: '',
          traitsSummary: '2probe',
          mainCarries: [],
          frontliners: [],
          units: [{ name: 'sage', items: ['utility charm'] }],
        },
      },
    ],
    championAssets: {
      sage: {
        name: 'sage',
        cost: 3,
        imagePath: 'resource_knowledge/image/champion/3/sage.png',
      },
    },
    itemAssets: {
      'utility charm': {
        name: 'utility charm',
        imagePath: 'resource_knowledge/image/item/completed/utility_charm.png',
      },
    },
    handState: { active: false, targetNames: [], owned: {}, events: [] },
    economyState: {
      active: true,
      round: '2-5',
      gold: 18,
      health: 72,
      level: 7,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
    knowledgeState: {
      active: false,
      shopSlots: {
        1: {
          slotIndex: 1,
          championName: 'sage',
          confidence: 'matched',
          updatedAt: 1000,
        },
      },
      items: {
        'completedItems:item/completed/utility_charm.png': {
          templatePath: 'item/completed/utility_charm.png',
          itemKind: 'completedItems',
          zones: ['inventory'],
          updatedAt: 1000,
        },
      },
      streak: {},
      events: [],
    },
  });
  const lowEconomyItemFitSage = lowEconomyItemFitDeadSinglePlan.picks.find(
    (pick) => pick.name === 'sage',
  );
  assert.ok(lowEconomyItemFitSage);
  assert.equal(lowEconomyItemFitSage.reasons.includes('itemFit'), true);
  assert.equal(lowEconomyItemFitSage.shopVisibleCount, 1);
  assert.equal(lowEconomyItemFitSage.ownedCount, 0);
  assert.equal(lowEconomyItemFitDeadSinglePlan.recommendedRollTargetNames.includes('sage'), false);
  const lowEconomyItemFitTargets = collectGoldenSpatulaDecisionRollTargetTemplates({
    variant: {
      id: 'low-economy-item-fit-dead-single-variant',
      slot: 'A',
      name: 'Low Economy Item Fit Dead Single',
      code: '',
      traitsSummary: '2probe',
      mainCarries: [],
      frontliners: [],
      units: [],
    },
    championAssets: {
      sage: {
        name: 'sage',
        cost: 3,
        imagePath: 'resource_knowledge/image/champion/3/sage.png',
      },
    },
    decisionPlan: lowEconomyItemFitDeadSinglePlan,
  });
  assert.equal(
    lowEconomyItemFitTargets.some((target) => target.name === 'sage'),
    false,
  );

  const lowEconomyBridgeBlockDeadSinglePlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'low-economy-bridge-block-dead-single-variant',
      slot: 'A',
      name: 'Low Economy Bridge Block Dead Single',
      code: '',
      traitsSummary: '2core',
      mainCarries: [{ name: 'eagle', isCarry: true }],
      frontliners: [{ name: 'bear' }],
      units: [{ name: 'eagle' }, { name: 'bear' }],
    },
    recommendedLineups: [
      {
        id: 'low-economy-bridge-block-dead-single-rec',
        slug: 'low-economy-bridge-block-dead-single-rec',
        name: 'Low Economy Bridge Block Dead Single Rec',
        path: 'low-economy-bridge-block-dead-single.json',
        quality: 'A',
        variant: {
          id: 'low-economy-bridge-block-dead-single-rec-variant',
          slot: 'B',
          name: 'Low Economy Bridge Block Dead Single Rec',
          code: '',
          traitsSummary: '2core',
          mainCarries: [],
          frontliners: [],
          units: [{ name: 'fox' }],
        },
      },
    ],
    championAssets: {
      eagle: { name: 'eagle', cost: 2 },
      bear: { name: 'bear', cost: 2 },
      fox: { name: 'fox', cost: 3 },
    },
    handState: { active: false, targetNames: [], owned: {}, events: [] },
    economyState: {
      active: true,
      round: '2-5',
      gold: 18,
      health: 72,
      level: 6,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
    knowledgeState: {
      active: false,
      shopSlots: {
        1: {
          slotIndex: 1,
          championName: 'fox',
          confidence: 'matched',
          updatedAt: 1000,
        },
      },
      items: {},
      streak: {},
      events: [],
    },
    contestState: {
      active: true,
      champions: {
        fox: {
          championName: 'fox',
          externalCopies: 2,
          playerCount: 1,
          confidence: 'observed',
          updatedAt: 1000,
        },
      },
    },
  });
  const lowEconomyBridgeBlockFox = lowEconomyBridgeBlockDeadSinglePlan.picks.find(
    (pick) => pick.name === 'fox',
  );
  assert.ok(lowEconomyBridgeBlockFox);
  assert.equal(lowEconomyBridgeBlockFox.reasons.includes('traitBridge'), true);
  assert.equal(lowEconomyBridgeBlockFox.reasons.includes('contested'), true);
  assert.equal(lowEconomyBridgeBlockFox.reasons.includes('activeLineup'), false);
  assert.equal(lowEconomyBridgeBlockFox.reasons.includes('nearUpgrade'), false);
  assert.equal(lowEconomyBridgeBlockFox.shopVisibleCount, 1);
  assert.equal(
    lowEconomyBridgeBlockDeadSinglePlan.recommendedRollTargetNames.includes('fox'),
    false,
  );
  const lowEconomyBridgeBlockTargets = collectGoldenSpatulaDecisionRollTargetTemplates({
    variant: {
      id: 'low-economy-bridge-block-dead-single-variant',
      slot: 'A',
      name: 'Low Economy Bridge Block Dead Single',
      code: '',
      traitsSummary: '2core',
      mainCarries: [{ name: 'eagle', isCarry: true }],
      frontliners: [{ name: 'bear' }],
      units: [{ name: 'eagle' }, { name: 'bear' }],
    },
    championAssets: {
      eagle: { name: 'eagle', cost: 2 },
      bear: { name: 'bear', cost: 2 },
      fox: { name: 'fox', cost: 3 },
    },
    decisionPlan: lowEconomyBridgeBlockDeadSinglePlan,
  });
  assert.equal(
    lowEconomyBridgeBlockTargets.some((target) => target.name === 'fox'),
    false,
  );

  const lowEconomyBridgeStrongDenyPlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'low-economy-bridge-strong-deny-variant',
      slot: 'A',
      name: 'Low Economy Bridge Strong Deny',
      code: '',
      traitsSummary: '2core',
      mainCarries: [{ name: 'eagle', isCarry: true }],
      frontliners: [{ name: 'bear' }],
      units: [{ name: 'eagle' }, { name: 'bear' }],
    },
    recommendedLineups: [
      {
        id: 'low-economy-bridge-strong-deny-rec',
        slug: 'low-economy-bridge-strong-deny-rec',
        name: 'Low Economy Bridge Strong Deny Rec',
        path: 'low-economy-bridge-strong-deny.json',
        quality: 'A',
        variant: {
          id: 'low-economy-bridge-strong-deny-rec-variant',
          slot: 'B',
          name: 'Low Economy Bridge Strong Deny Rec',
          code: '',
          traitsSummary: '2core',
          mainCarries: [],
          frontliners: [],
          units: [{ name: 'fox' }],
        },
      },
    ],
    championAssets: {
      eagle: {
        name: 'eagle',
        cost: 2,
        imagePath: 'resource_knowledge/image/champion/2/eagle.png',
      },
      bear: {
        name: 'bear',
        cost: 2,
        imagePath: 'resource_knowledge/image/champion/2/bear.png',
      },
      fox: {
        name: 'fox',
        cost: 3,
        imagePath: 'resource_knowledge/image/champion/3/fox.png',
      },
    },
    handState: {
      active: false,
      targetNames: [],
      owned: {
        eagle: {
          name: 'eagle',
          count: 3,
          boughtCount: 3,
          benchCount: 0,
          cost: 2,
          updatedAt: 1000,
        },
        bear: {
          name: 'bear',
          count: 3,
          boughtCount: 3,
          benchCount: 0,
          cost: 2,
          updatedAt: 1000,
        },
      },
      events: [],
    },
    economyState: {
      active: true,
      round: '2-5',
      gold: 18,
      health: 72,
      level: 6,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
    knowledgeState: {
      active: false,
      shopSlots: {
        1: {
          slotIndex: 1,
          championName: 'fox',
          confidence: 'matched',
          updatedAt: 1000,
        },
      },
      items: {},
      streak: {},
      events: [],
    },
    contestState: {
      active: true,
      champions: {
        fox: {
          championName: 'fox',
          externalCopies: 6,
          playerCount: 2,
          confidence: 'observed',
          updatedAt: 1000,
        },
      },
    },
  });
  const lowEconomyBridgeStrongDenyFox = lowEconomyBridgeStrongDenyPlan.picks.find(
    (pick) => pick.name === 'fox',
  );
  assert.ok(lowEconomyBridgeStrongDenyFox);
  assert.equal(lowEconomyBridgeStrongDenyFox.reasons.includes('traitBridge'), true);
  assert.equal(lowEconomyBridgeStrongDenyFox.reasons.includes('contested'), true);
  assert.equal(lowEconomyBridgeStrongDenyFox.externalContestCopies, 6);
  assert.equal(lowEconomyBridgeStrongDenyFox.shopVisibleCount, 1);
  assert.equal(
    lowEconomyBridgeStrongDenyPlan.economyAdvice.breakdown.formationBalance?.kind,
    'balanced',
  );
  assert.equal(
    lowEconomyBridgeStrongDenyPlan.recommendedRollTargetNames.includes('fox'),
    true,
  );
  const lowEconomyBridgeStrongDenyTargets = collectGoldenSpatulaDecisionRollTargetTemplates({
    variant: {
      id: 'low-economy-bridge-strong-deny-variant',
      slot: 'A',
      name: 'Low Economy Bridge Strong Deny',
      code: '',
      traitsSummary: '2core',
      mainCarries: [{ name: 'eagle', isCarry: true }],
      frontliners: [{ name: 'bear' }],
      units: [{ name: 'eagle' }, { name: 'bear' }],
    },
    championAssets: {
      fox: {
        name: 'fox',
        cost: 3,
        imagePath: 'resource_knowledge/image/champion/3/fox.png',
      },
    },
    decisionPlan: lowEconomyBridgeStrongDenyPlan,
  });
  assert.deepEqual(
    lowEconomyBridgeStrongDenyTargets.map((target) => target.name),
    ['fox'],
  );

  const lowEconomyCarryBridgeBlockDeadSinglePlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'low-economy-carry-bridge-block-dead-single-variant',
      slot: 'A',
      name: 'Low Economy Carry Bridge Block Dead Single',
      code: '',
      traitsSummary: '2core',
      mainCarries: [{ name: 'eagle', isCarry: true }],
      frontliners: [{ name: 'bear' }],
      units: [{ name: 'eagle' }, { name: 'bear' }],
    },
    recommendedLineups: [
      {
        id: 'low-economy-carry-bridge-block-dead-single-rec',
        slug: 'low-economy-carry-bridge-block-dead-single-rec',
        name: 'Low Economy Carry Bridge Block Dead Single Rec',
        path: 'low-economy-carry-bridge-block-dead-single.json',
        quality: 'A',
        variant: {
          id: 'low-economy-carry-bridge-block-dead-single-rec-variant',
          slot: 'B',
          name: 'Low Economy Carry Bridge Block Dead Single Rec',
          code: '',
          traitsSummary: '2core',
          mainCarries: [{ name: 'fox', isCarry: true }],
          frontliners: [],
          units: [{ name: 'fox' }],
        },
      },
    ],
    championAssets: {
      eagle: { name: 'eagle', cost: 2 },
      bear: { name: 'bear', cost: 2 },
      fox: { name: 'fox', cost: 3 },
    },
    handState: { active: false, targetNames: [], owned: {}, events: [] },
    economyState: {
      active: true,
      round: '2-5',
      gold: 18,
      health: 72,
      level: 6,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
    knowledgeState: {
      active: false,
      shopSlots: {
        1: {
          slotIndex: 1,
          championName: 'fox',
          confidence: 'matched',
          updatedAt: 1000,
        },
      },
      items: {},
      streak: {},
      events: [],
    },
    contestState: {
      active: true,
      champions: {
        fox: {
          championName: 'fox',
          externalCopies: 2,
          playerCount: 1,
          confidence: 'observed',
          updatedAt: 1000,
        },
      },
    },
  });
  const lowEconomyCarryBridgeBlockFox = lowEconomyCarryBridgeBlockDeadSinglePlan.picks.find(
    (pick) => pick.name === 'fox',
  );
  assert.ok(lowEconomyCarryBridgeBlockFox);
  assert.equal(lowEconomyCarryBridgeBlockFox.reasons.includes('recommendedCarry'), true);
  assert.equal(lowEconomyCarryBridgeBlockFox.reasons.includes('traitBridge'), true);
  assert.equal(lowEconomyCarryBridgeBlockFox.reasons.includes('contested'), true);
  assert.equal(lowEconomyCarryBridgeBlockFox.reasons.includes('activeLineup'), false);
  assert.equal(lowEconomyCarryBridgeBlockFox.reasons.includes('nearUpgrade'), false);
  assert.equal(lowEconomyCarryBridgeBlockFox.shopVisibleCount, 1);
  assert.equal(lowEconomyCarryBridgeBlockFox.ownedCount, 0);
  assert.equal(
    lowEconomyCarryBridgeBlockDeadSinglePlan.recommendedRollTargetNames.includes('fox'),
    false,
  );
  const lowEconomyCarryBridgeBlockTargets = collectGoldenSpatulaDecisionRollTargetTemplates({
    variant: {
      id: 'low-economy-carry-bridge-block-dead-single-variant',
      slot: 'A',
      name: 'Low Economy Carry Bridge Block Dead Single',
      code: '',
      traitsSummary: '2core',
      mainCarries: [{ name: 'eagle', isCarry: true }],
      frontliners: [{ name: 'bear' }],
      units: [{ name: 'eagle' }, { name: 'bear' }],
    },
    championAssets: {
      eagle: { name: 'eagle', cost: 2 },
      bear: { name: 'bear', cost: 2 },
      fox: { name: 'fox', cost: 3 },
    },
    decisionPlan: lowEconomyCarryBridgeBlockDeadSinglePlan,
  });
  assert.equal(
    lowEconomyCarryBridgeBlockTargets.some((target) => target.name === 'fox'),
    false,
  );

  const lowEconomyFieldableTargetPlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'low-economy-fieldable-target-variant',
      slot: 'A',
      name: 'Low Economy Fieldable Target',
      code: '',
      traitsSummary: '2core',
      mainCarries: [{ name: 'eagle', isCarry: true }],
      frontliners: [],
      units: [{ name: 'eagle' }],
    },
    championAssets: {
      eagle: {
        name: 'eagle',
        cost: 2,
        imagePath: 'resource_knowledge/image/champion/2/eagle.png',
      },
    },
    handState: { active: false, targetNames: [], owned: {}, events: [] },
    economyState: {
      active: true,
      round: '2-5',
      gold: 18,
      health: 72,
      level: 6,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
    knowledgeState: {
      active: false,
      shopSlots: {
        1: {
          slotIndex: 1,
          championName: 'eagle',
          confidence: 'matched',
          updatedAt: 1000,
        },
      },
      items: {},
      streak: {},
      events: [],
    },
  });
  const lowEconomyFieldableEagle = lowEconomyFieldableTargetPlan.picks.find(
    (pick) => pick.name === 'eagle',
  );
  assert.ok(lowEconomyFieldableEagle);
  assert.equal(lowEconomyFieldableEagle.reasons.includes('activeLineup'), true);
  assert.equal(lowEconomyFieldableEagle.shopVisibleCount, 1);
  assert.equal(lowEconomyFieldableTargetPlan.recommendedRollTargetNames.includes('eagle'), true);
  const lowEconomyFieldableTargets = collectGoldenSpatulaDecisionRollTargetTemplates({
    variant: {
      id: 'low-economy-fieldable-target-variant',
      slot: 'A',
      name: 'Low Economy Fieldable Target',
      code: '',
      traitsSummary: '2core',
      mainCarries: [{ name: 'eagle', isCarry: true }],
      frontliners: [],
      units: [{ name: 'eagle' }],
    },
    championAssets: {
      eagle: {
        name: 'eagle',
        cost: 2,
        imagePath: 'resource_knowledge/image/champion/2/eagle.png',
      },
    },
    decisionPlan: lowEconomyFieldableTargetPlan,
  });
  assert.deepEqual(
    lowEconomyFieldableTargets.map((target) => target.name),
    ['eagle'],
  );

  const traitBridgeLiquidityPlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'trait-bridge-liquidity-variant',
      slot: 'A',
      name: 'Trait Bridge Liquidity',
      code: '',
      traitsSummary: '2core',
      mainCarries: [{ name: 'eagle', isCarry: true }],
      frontliners: [{ name: 'bear' }],
      units: [{ name: 'eagle' }, { name: 'bear' }],
    },
    recommendedLineups: [
      {
        id: 'trait-bridge-liquidity-rec',
        slug: 'trait-bridge-liquidity-rec',
        name: 'Trait Bridge Pivot',
        path: 'trait-bridge-pivot.json',
        quality: 'A',
        variant: {
          id: 'trait-bridge-pivot-variant',
          slot: 'B',
          name: 'Trait Bridge Pivot',
          code: '',
          traitsSummary: '2core',
          mainCarries: [],
          frontliners: [],
          units: [{ name: 'fox' }],
        },
      },
    ],
    championAssets: {
      eagle: { name: 'eagle', cost: 2 },
      bear: { name: 'bear', cost: 2 },
      fox: { name: 'fox', cost: 3 },
      tiger: { name: 'tiger', cost: 3 },
      lynx: { name: 'lynx', cost: 3 },
    },
    handState: { active: false, targetNames: [], owned: {}, events: [] },
    economyState: {
      active: true,
      round: '2-5',
      gold: 32,
      level: 6,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
    knowledgeState: {
      active: false,
      shopSlots: {
        1: {
          slotIndex: 1,
          championName: 'fox',
          confidence: 'matched',
          updatedAt: 1000,
        },
      },
      items: {},
      streak: {},
      events: [],
    },
  });
  const traitBridgeFox = traitBridgeLiquidityPlan.picks.find((pick) => pick.name === 'fox');
  assert.ok(traitBridgeFox);
  assert.equal(traitBridgeFox.reasons.includes('traitBridge'), true);
  assert.equal(traitBridgeFox.scoreBreakdown.penalties.interestTax > 0, true);
  assert.equal(
    traitBridgeFox.scoreBreakdown.penalties.interestTax <
      deadSingleFox.scoreBreakdown.penalties.interestTax,
    true,
  );

  const buildOwnedTraitBridgeInterestPlan = ({ id, name, shopVisible }) =>
    buildGoldenSpatulaDecisionPlan({
      activeVariant: {
        id,
        slot: 'A',
        name,
        code: '',
        traitsSummary: '2core',
        mainCarries: [{ name: 'eagle', isCarry: true }],
        frontliners: [{ name: 'bear' }],
        units: [{ name: 'eagle' }, { name: 'bear' }],
      },
      recommendedLineups: [
        {
          id: `${id}-rec`,
          slug: `${id}-rec`,
          name: `${name} Rec`,
          path: `${id}-rec.json`,
          quality: 'A',
          variant: {
            id: `${id}-rec-variant`,
            slot: 'B',
            name: `${name} Rec`,
            code: '',
            traitsSummary: '2core',
            mainCarries: [{ name: 'fox', isCarry: true }],
            frontliners: [],
            units: [{ name: 'fox' }],
          },
        },
      ],
      championAssets: {
        eagle: { name: 'eagle', cost: 2 },
        bear: { name: 'bear', cost: 2 },
        fox: {
          name: 'fox',
          cost: 3,
          imagePath: 'resource_knowledge/image/champion/3/fox.png',
        },
      },
      handState: {
        active: false,
        targetNames: [],
        owned: {
          fox: {
            name: 'fox',
            count: 1,
            boughtCount: 1,
            benchCount: 1,
            cost: 3,
            updatedAt: 1000,
          },
        },
        events: [],
      },
      economyState: {
        active: true,
        round: '2-5',
        gold: 32,
        health: 72,
        level: 7,
        estimatedGoldDelta: 0,
        boughtChampionGold: 0,
        refreshGold: 0,
        xpGold: 0,
        xpPurchases: 0,
        events: [],
      },
      knowledgeState: {
        active: false,
        shopSlots: shopVisible
          ? {
              1: {
                slotIndex: 1,
                championName: 'fox',
                confidence: 'matched',
                updatedAt: 1000,
              },
            }
          : {},
        items: {},
        streak: {},
        events: [],
      },
    });

  const ownedTraitBridgeInterestGatePlan = buildOwnedTraitBridgeInterestPlan({
    id: 'owned-trait-bridge-interest-gate-variant',
    name: 'Owned Trait Bridge Interest Gate',
    shopVisible: false,
  });
  const ownedTraitBridgeGateFox = ownedTraitBridgeInterestGatePlan.picks.find(
    (pick) => pick.name === 'fox',
  );
  assert.ok(ownedTraitBridgeGateFox);
  assert.equal(ownedTraitBridgeGateFox.ownedCount, 1);
  assert.equal(ownedTraitBridgeGateFox.shopVisibleCount, undefined);
  assert.equal(ownedTraitBridgeGateFox.reasons.includes('recommendedCarry'), true);
  assert.equal(ownedTraitBridgeGateFox.reasons.includes('traitBridge'), true);
  assert.equal(ownedTraitBridgeGateFox.reasons.includes('nearUpgrade'), false);
  assert.equal(ownedTraitBridgeGateFox.rollTargetPriority > 0, true);
  assert.equal(
    ownedTraitBridgeInterestGatePlan.recommendedRollTargetNames.includes('fox'),
    false,
  );
  const ownedTraitBridgeGateTargets = collectGoldenSpatulaDecisionRollTargetTemplates({
    variant: {
      id: 'owned-trait-bridge-interest-gate-variant',
      slot: 'A',
      name: 'Owned Trait Bridge Interest Gate',
      code: '',
      traitsSummary: '2core',
      mainCarries: [{ name: 'eagle', isCarry: true }],
      frontliners: [{ name: 'bear' }],
      units: [{ name: 'eagle' }, { name: 'bear' }],
    },
    championAssets: {
      eagle: { name: 'eagle', cost: 2 },
      bear: { name: 'bear', cost: 2 },
      fox: {
        name: 'fox',
        cost: 3,
        imagePath: 'resource_knowledge/image/champion/3/fox.png',
      },
    },
    decisionPlan: ownedTraitBridgeInterestGatePlan,
  });
  assert.equal(
    ownedTraitBridgeGateTargets.some((target) => target.name === 'fox'),
    false,
  );

  const ownedTraitBridgePairInterestPlan = buildOwnedTraitBridgeInterestPlan({
    id: 'owned-trait-bridge-pair-interest-variant',
    name: 'Owned Trait Bridge Pair Interest',
    shopVisible: true,
  });
  const ownedTraitBridgePairFox = ownedTraitBridgePairInterestPlan.picks.find(
    (pick) => pick.name === 'fox',
  );
  assert.ok(ownedTraitBridgePairFox);
  assert.equal(ownedTraitBridgePairFox.ownedCount, 1);
  assert.equal(ownedTraitBridgePairFox.shopVisibleCount, 1);
  assert.equal(ownedTraitBridgePairFox.reasons.includes('recommendedCarry'), true);
  assert.equal(ownedTraitBridgePairFox.reasons.includes('traitBridge'), true);
  assert.equal(ownedTraitBridgePairFox.reasons.includes('nearUpgrade'), false);
  assert.equal(ownedTraitBridgePairFox.scoreBreakdown.penalties.interestTax > 0, true);
  assert.equal(
    ownedTraitBridgePairInterestPlan.recommendedRollTargetNames.includes('fox'),
    true,
  );
  const ownedTraitBridgePairTargets = collectGoldenSpatulaDecisionRollTargetTemplates({
    variant: {
      id: 'owned-trait-bridge-pair-interest-variant',
      slot: 'A',
      name: 'Owned Trait Bridge Pair Interest',
      code: '',
      traitsSummary: '2core',
      mainCarries: [{ name: 'eagle', isCarry: true }],
      frontliners: [{ name: 'bear' }],
      units: [{ name: 'eagle' }, { name: 'bear' }],
    },
    championAssets: {
      eagle: { name: 'eagle', cost: 2 },
      bear: { name: 'bear', cost: 2 },
      fox: {
        name: 'fox',
        cost: 3,
        imagePath: 'resource_knowledge/image/champion/3/fox.png',
      },
    },
    decisionPlan: ownedTraitBridgePairInterestPlan,
  });
  assert.deepEqual(
    ownedTraitBridgePairTargets.map((target) => target.name),
    ['fox'],
  );

  const pureTraitBridgePairInterestPlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'pure-trait-bridge-pair-interest-variant',
      slot: 'A',
      name: 'Pure Trait Bridge Pair Interest',
      code: '',
      traitsSummary: '2core',
      mainCarries: [{ name: 'eagle', isCarry: true }],
      frontliners: [{ name: 'bear' }],
      units: [{ name: 'eagle' }, { name: 'bear' }],
    },
    recommendedLineups: [
      {
        id: 'pure-trait-bridge-pair-interest-rec',
        slug: 'pure-trait-bridge-pair-interest-rec',
        name: 'Pure Trait Bridge Pair Interest Rec',
        path: 'pure-trait-bridge-pair-interest.json',
        quality: 'A',
        variant: {
          id: 'pure-trait-bridge-pair-interest-rec-variant',
          slot: 'B',
          name: 'Pure Trait Bridge Pair Interest Rec',
          code: '',
          traitsSummary: '2core',
          mainCarries: [],
          frontliners: [],
          units: [{ name: 'owl' }],
        },
      },
    ],
    championAssets: {
      eagle: { name: 'eagle', cost: 2 },
      bear: { name: 'bear', cost: 2 },
      owl: {
        name: 'owl',
        cost: 3,
        imagePath: 'resource_knowledge/image/champion/3/owl.png',
      },
    },
    handState: {
      active: false,
      targetNames: [],
      owned: {
        owl: {
          name: 'owl',
          count: 1,
          boughtCount: 1,
          benchCount: 1,
          cost: 3,
          updatedAt: 1000,
        },
      },
      events: [],
    },
    economyState: {
      active: true,
      round: '3-2',
      gold: 32,
      health: 72,
      level: 7,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
    knowledgeState: {
      active: false,
      shopSlots: {
        1: {
          slotIndex: 1,
          championName: 'owl',
          confidence: 'matched',
          updatedAt: 1000,
        },
      },
      items: {},
      streak: {},
      events: [],
    },
  });
  const pureTraitBridgePairOwl = pureTraitBridgePairInterestPlan.picks.find(
    (pick) => pick.name === 'owl',
  );
  assert.ok(pureTraitBridgePairOwl);
  assert.equal(pureTraitBridgePairOwl.role, 'trait');
  assert.equal(pureTraitBridgePairOwl.ownedCount, 1);
  assert.equal(pureTraitBridgePairOwl.shopVisibleCount, 1);
  assert.equal(pureTraitBridgePairOwl.reasons.includes('recommendedCarry'), false);
  assert.equal(pureTraitBridgePairOwl.reasons.includes('traitBridge'), true);
  assert.equal(pureTraitBridgePairOwl.scoreBreakdown.penalties.interestTax > 0, true);
  assert.equal(
    pureTraitBridgePairInterestPlan.recommendedRollTargetNames.includes('owl'),
    true,
  );
  const pureTraitBridgePairTargets = collectGoldenSpatulaDecisionRollTargetTemplates({
    variant: {
      id: 'pure-trait-bridge-pair-interest-variant',
      slot: 'A',
      name: 'Pure Trait Bridge Pair Interest',
      code: '',
      traitsSummary: '2core',
      mainCarries: [{ name: 'eagle', isCarry: true }],
      frontliners: [{ name: 'bear' }],
      units: [{ name: 'eagle' }, { name: 'bear' }],
    },
    championAssets: {
      owl: {
        name: 'owl',
        cost: 3,
        imagePath: 'resource_knowledge/image/champion/3/owl.png',
      },
    },
    decisionPlan: pureTraitBridgePairInterestPlan,
  });
  assert.deepEqual(
    pureTraitBridgePairTargets.map((target) => target.name),
    ['owl'],
  );

  const itemFitInterestGatePlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'item-fit-interest-gate-variant',
      slot: 'A',
      name: 'Item Fit Interest Gate',
      code: '',
      traitsSummary: '2probe',
      mainCarries: [],
      frontliners: [],
      units: [],
    },
    recommendedLineups: [
      {
        id: 'item-fit-interest-gate-rec',
        slug: 'item-fit-interest-gate-rec',
        name: 'Item Fit Interest Gate Rec',
        path: 'item-fit-interest-gate.json',
        quality: 'A',
        variant: {
          id: 'item-fit-interest-gate-rec-variant',
          slot: 'B',
          name: 'Item Fit Interest Gate Rec',
          code: '',
          traitsSummary: '2probe',
          mainCarries: [],
          frontliners: [],
          units: [{ name: 'sage', items: ['utility charm'] }],
        },
      },
    ],
    championAssets: {
      sage: {
        name: 'sage',
        cost: 3,
        imagePath: 'resource_knowledge/image/champion/3/sage.png',
      },
    },
    itemAssets: {
      'utility charm': {
        name: 'utility charm',
        imagePath: 'resource_knowledge/image/item/completed/utility_charm.png',
      },
    },
    handState: { active: false, targetNames: [], owned: {}, events: [] },
    economyState: {
      active: true,
      round: '2-5',
      gold: 32,
      health: 72,
      level: 7,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
    knowledgeState: {
      active: false,
      shopSlots: {
        1: {
          slotIndex: 1,
          championName: 'sage',
          confidence: 'matched',
          updatedAt: 1000,
        },
      },
      items: {
        'completedItems:item/completed/utility_charm.png': {
          templatePath: 'item/completed/utility_charm.png',
          itemKind: 'completedItems',
          zones: ['inventory'],
          updatedAt: 1000,
        },
      },
      streak: {},
      events: [],
    },
  });
  const itemFitInterestGateSage = itemFitInterestGatePlan.picks.find(
    (pick) => pick.name === 'sage',
  );
  assert.ok(itemFitInterestGateSage);
  assert.equal(itemFitInterestGateSage.reasons.includes('itemFit'), true);
  assert.equal(itemFitInterestGateSage.shopVisibleCount, 1);
  assert.equal(itemFitInterestGateSage.scoreBreakdown.penalties.interestTax > 0, true);
  assert.equal(itemFitInterestGateSage.rollTargetPriority > 0, true);
  assert.equal(itemFitInterestGatePlan.recommendedRollTargetNames.includes('sage'), false);
  const itemFitInterestGateTargets = collectGoldenSpatulaDecisionRollTargetTemplates({
    variant: {
      id: 'item-fit-interest-gate-variant',
      slot: 'A',
      name: 'Item Fit Interest Gate',
      code: '',
      traitsSummary: '2probe',
      mainCarries: [],
      frontliners: [],
      units: [],
    },
    championAssets: {
      sage: {
        name: 'sage',
        cost: 3,
        imagePath: 'resource_knowledge/image/champion/3/sage.png',
      },
    },
    decisionPlan: itemFitInterestGatePlan,
  });
  assert.equal(
    itemFitInterestGateTargets.some((target) => target.name === 'sage'),
    false,
  );

  const itemFitInterestRollTargetGatePlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'item-fit-interest-roll-target-gate-variant',
      slot: 'A',
      name: 'Item Fit Interest Roll Target Gate',
      code: '',
      traitsSummary: '2probe',
      mainCarries: [],
      frontliners: [],
      units: [],
    },
    recommendedLineups: [
      {
        id: 'item-fit-interest-roll-target-gate-rec',
        slug: 'item-fit-interest-roll-target-gate-rec',
        name: 'Item Fit Interest Roll Target Gate Rec',
        path: 'item-fit-interest-roll-target-gate.json',
        quality: 'A',
        variant: {
          id: 'item-fit-interest-roll-target-gate-rec-variant',
          slot: 'B',
          name: 'Item Fit Interest Roll Target Gate Rec',
          code: '',
          traitsSummary: '2probe',
          mainCarries: [],
          frontliners: [],
          units: [{ name: 'sage', items: ['utility charm'] }],
        },
      },
    ],
    championAssets: {
      sage: {
        name: 'sage',
        cost: 3,
        imagePath: 'resource_knowledge/image/champion/3/sage.png',
      },
    },
    itemAssets: {
      'utility charm': {
        name: 'utility charm',
        imagePath: 'resource_knowledge/image/item/completed/utility_charm.png',
      },
    },
    handState: { active: false, targetNames: [], owned: {}, events: [] },
    economyState: {
      active: true,
      round: '2-5',
      gold: 32,
      health: 72,
      level: 7,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
    knowledgeState: {
      active: false,
      shopSlots: {},
      items: {
        'completedItems:item/completed/utility_charm.png': {
          templatePath: 'item/completed/utility_charm.png',
          itemKind: 'completedItems',
          zones: ['inventory'],
          updatedAt: 1000,
        },
      },
      streak: {},
      events: [],
    },
  });
  const itemFitInterestRollTargetSage = itemFitInterestRollTargetGatePlan.picks.find(
    (pick) => pick.name === 'sage',
  );
  assert.ok(itemFitInterestRollTargetSage);
  assert.equal(itemFitInterestRollTargetSage.reasons.includes('itemFit'), true);
  assert.equal(itemFitInterestRollTargetSage.shopVisibleCount, undefined);
  assert.equal(
    itemFitInterestRollTargetGatePlan.recommendedRollTargetNames.includes('sage'),
    false,
  );
  const itemFitInterestRollTargets = collectGoldenSpatulaDecisionRollTargetTemplates({
    variant: {
      id: 'item-fit-interest-roll-target-gate-variant',
      slot: 'A',
      name: 'Item Fit Interest Roll Target Gate',
      code: '',
      traitsSummary: '2probe',
      mainCarries: [],
      frontliners: [],
      units: [],
    },
    championAssets: {
      sage: {
        name: 'sage',
        cost: 3,
        imagePath: 'resource_knowledge/image/champion/3/sage.png',
      },
    },
    decisionPlan: itemFitInterestRollTargetGatePlan,
  });
  assert.equal(
    itemFitInterestRollTargets.some((target) => target.name === 'sage'),
    false,
  );

  const lowEconomyItemFitRollTargetGatePlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'low-economy-item-fit-roll-target-gate-variant',
      slot: 'A',
      name: 'Low Economy Item Fit Roll Target Gate',
      code: '',
      traitsSummary: '2probe',
      mainCarries: [],
      frontliners: [],
      units: [],
    },
    recommendedLineups: [
      {
        id: 'low-economy-item-fit-roll-target-gate-rec',
        slug: 'low-economy-item-fit-roll-target-gate-rec',
        name: 'Low Economy Item Fit Roll Target Gate Rec',
        path: 'low-economy-item-fit-roll-target-gate.json',
        quality: 'A',
        variant: {
          id: 'low-economy-item-fit-roll-target-gate-rec-variant',
          slot: 'B',
          name: 'Low Economy Item Fit Roll Target Gate Rec',
          code: '',
          traitsSummary: '2probe',
          mainCarries: [],
          frontliners: [],
          units: [{ name: 'sage', items: ['utility charm'] }],
        },
      },
    ],
    championAssets: {
      sage: {
        name: 'sage',
        cost: 3,
        imagePath: 'resource_knowledge/image/champion/3/sage.png',
      },
    },
    itemAssets: {
      'utility charm': {
        name: 'utility charm',
        imagePath: 'resource_knowledge/image/item/completed/utility_charm.png',
      },
    },
    handState: { active: false, targetNames: [], owned: {}, events: [] },
    economyState: {
      active: true,
      round: '2-5',
      gold: 18,
      health: 72,
      level: 7,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
    knowledgeState: {
      active: false,
      shopSlots: {},
      items: {
        'completedItems:item/completed/utility_charm.png': {
          templatePath: 'item/completed/utility_charm.png',
          itemKind: 'completedItems',
          zones: ['inventory'],
          updatedAt: 1000,
        },
      },
      streak: {},
      events: [],
    },
  });
  const lowEconomyItemFitRollTargetSage = lowEconomyItemFitRollTargetGatePlan.picks.find(
    (pick) => pick.name === 'sage',
  );
  assert.ok(lowEconomyItemFitRollTargetSage);
  assert.equal(lowEconomyItemFitRollTargetSage.reasons.includes('itemFit'), true);
  assert.equal(lowEconomyItemFitRollTargetSage.shopVisibleCount, undefined);
  assert.equal(
    lowEconomyItemFitRollTargetGatePlan.recommendedRollTargetNames.includes('sage'),
    false,
  );
  const lowEconomyItemFitRollTargets = collectGoldenSpatulaDecisionRollTargetTemplates({
    variant: {
      id: 'low-economy-item-fit-roll-target-gate-variant',
      slot: 'A',
      name: 'Low Economy Item Fit Roll Target Gate',
      code: '',
      traitsSummary: '2probe',
      mainCarries: [],
      frontliners: [],
      units: [],
    },
    championAssets: {
      sage: {
        name: 'sage',
        cost: 3,
        imagePath: 'resource_knowledge/image/champion/3/sage.png',
      },
    },
    decisionPlan: lowEconomyItemFitRollTargetGatePlan,
  });
  assert.equal(
    lowEconomyItemFitRollTargets.some((target) => target.name === 'sage'),
    false,
  );

  const itemFitPairInterestExceptionPlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'item-fit-pair-interest-exception-variant',
      slot: 'A',
      name: 'Item Fit Pair Interest Exception',
      code: '',
      traitsSummary: '2probe',
      mainCarries: [],
      frontliners: [],
      units: [],
    },
    recommendedLineups: [
      {
        id: 'item-fit-pair-interest-exception-rec',
        slug: 'item-fit-pair-interest-exception-rec',
        name: 'Item Fit Pair Interest Exception Rec',
        path: 'item-fit-pair-interest-exception.json',
        quality: 'A',
        variant: {
          id: 'item-fit-pair-interest-exception-rec-variant',
          slot: 'B',
          name: 'Item Fit Pair Interest Exception Rec',
          code: '',
          traitsSummary: '2probe',
          mainCarries: [],
          frontliners: [],
          units: [{ name: 'sage', items: ['utility charm'] }],
        },
      },
    ],
    championAssets: {
      sage: {
        name: 'sage',
        cost: 3,
        imagePath: 'resource_knowledge/image/champion/3/sage.png',
      },
    },
    itemAssets: {
      'utility charm': {
        name: 'utility charm',
        imagePath: 'resource_knowledge/image/item/completed/utility_charm.png',
      },
    },
    handState: {
      active: false,
      targetNames: [],
      owned: {
        sage: {
          name: 'sage',
          count: 1,
          boughtCount: 1,
          benchCount: 1,
          cost: 3,
          updatedAt: 1000,
        },
      },
      events: [],
    },
    economyState: {
      active: true,
      round: '2-5',
      gold: 32,
      health: 72,
      level: 7,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
    knowledgeState: {
      active: false,
      shopSlots: {
        1: {
          slotIndex: 1,
          championName: 'sage',
          confidence: 'matched',
          updatedAt: 1000,
        },
      },
      items: {
        'completedItems:item/completed/utility_charm.png': {
          templatePath: 'item/completed/utility_charm.png',
          itemKind: 'completedItems',
          zones: ['inventory'],
          updatedAt: 1000,
        },
      },
      streak: {},
      events: [],
    },
  });
  const itemFitPairInterestSage = itemFitPairInterestExceptionPlan.picks.find(
    (pick) => pick.name === 'sage',
  );
  assert.ok(itemFitPairInterestSage);
  assert.equal(itemFitPairInterestSage.reasons.includes('itemFit'), true);
  assert.equal(itemFitPairInterestSage.reasons.includes('nearUpgrade'), false);
  assert.equal(itemFitPairInterestSage.ownedCount, 1);
  assert.equal(itemFitPairInterestSage.shopVisibleCount, 1);
  assert.equal(itemFitPairInterestSage.scoreBreakdown.penalties.interestTax > 0, true);
  assert.equal(
    itemFitPairInterestExceptionPlan.recommendedRollTargetNames.includes('sage'),
    true,
  );
  const itemFitPairInterestTargets = collectGoldenSpatulaDecisionRollTargetTemplates({
    variant: {
      id: 'item-fit-pair-interest-exception-variant',
      slot: 'A',
      name: 'Item Fit Pair Interest Exception',
      code: '',
      traitsSummary: '2probe',
      mainCarries: [],
      frontliners: [],
      units: [],
    },
    championAssets: {
      sage: {
        name: 'sage',
        cost: 3,
        imagePath: 'resource_knowledge/image/champion/3/sage.png',
      },
    },
    decisionPlan: itemFitPairInterestExceptionPlan,
  });
  assert.deepEqual(
    itemFitPairInterestTargets.map((target) => target.name),
    ['sage'],
  );

  const itemFitNearUpgradeInterestPlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'item-fit-near-upgrade-interest-variant',
      slot: 'A',
      name: 'Item Fit Near Upgrade Interest',
      code: '',
      traitsSummary: '2probe',
      mainCarries: [],
      frontliners: [],
      units: [],
    },
    recommendedLineups: [
      {
        id: 'item-fit-near-upgrade-interest-rec',
        slug: 'item-fit-near-upgrade-interest-rec',
        name: 'Item Fit Near Upgrade Interest Rec',
        path: 'item-fit-near-upgrade-interest.json',
        quality: 'A',
        variant: {
          id: 'item-fit-near-upgrade-interest-rec-variant',
          slot: 'B',
          name: 'Item Fit Near Upgrade Interest Rec',
          code: '',
          traitsSummary: '2probe',
          mainCarries: [],
          frontliners: [],
          units: [{ name: 'sage', items: ['utility charm'] }],
        },
      },
    ],
    championAssets: {
      sage: {
        name: 'sage',
        cost: 3,
        imagePath: 'resource_knowledge/image/champion/3/sage.png',
      },
    },
    itemAssets: {
      'utility charm': {
        name: 'utility charm',
        imagePath: 'resource_knowledge/image/item/completed/utility_charm.png',
      },
    },
    handState: {
      active: false,
      targetNames: [],
      owned: {
        sage: {
          name: 'sage',
          count: 2,
          boughtCount: 2,
          benchCount: 0,
          cost: 3,
          updatedAt: 1000,
        },
      },
      events: [],
    },
    economyState: {
      active: true,
      round: '2-5',
      gold: 32,
      health: 72,
      level: 7,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
    knowledgeState: {
      active: false,
      shopSlots: {
        1: {
          slotIndex: 1,
          championName: 'sage',
          confidence: 'matched',
          updatedAt: 1000,
        },
      },
      items: {
        'completedItems:item/completed/utility_charm.png': {
          templatePath: 'item/completed/utility_charm.png',
          itemKind: 'completedItems',
          zones: ['inventory'],
          updatedAt: 1000,
        },
      },
      streak: {},
      events: [],
    },
  });
  const itemFitNearUpgradeSage = itemFitNearUpgradeInterestPlan.picks.find(
    (pick) => pick.name === 'sage',
  );
  assert.ok(itemFitNearUpgradeSage);
  assert.equal(itemFitNearUpgradeSage.reasons.includes('itemFit'), true);
  assert.equal(itemFitNearUpgradeSage.reasons.includes('nearUpgrade'), true);
  assert.equal(itemFitNearUpgradeInterestPlan.recommendedRollTargetNames.includes('sage'), true);
  const itemFitNearUpgradeTargets = collectGoldenSpatulaDecisionRollTargetTemplates({
    variant: {
      id: 'item-fit-near-upgrade-interest-variant',
      slot: 'A',
      name: 'Item Fit Near Upgrade Interest',
      code: '',
      traitsSummary: '2probe',
      mainCarries: [],
      frontliners: [],
      units: [],
    },
    championAssets: {
      sage: {
        name: 'sage',
        cost: 3,
        imagePath: 'resource_knowledge/image/champion/3/sage.png',
      },
    },
    decisionPlan: itemFitNearUpgradeInterestPlan,
  });
  assert.deepEqual(
    itemFitNearUpgradeTargets.map((target) => target.name),
    ['sage'],
  );

  const nearUpgradeLiquidityPlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'near-upgrade-liquidity-variant',
      slot: 'A',
      name: 'Near Upgrade Liquidity',
      code: '',
      traitsSummary: '2core',
      mainCarries: [{ name: 'eagle', isCarry: true }],
      frontliners: [],
      units: [{ name: 'eagle' }],
    },
    championAssets: {
      eagle: { name: 'eagle', cost: 2 },
      bear: { name: 'bear', cost: 2 },
      tiger: { name: 'tiger', cost: 2 },
    },
    handState: {
      active: false,
      targetNames: [],
      owned: {
        eagle: {
          name: 'eagle',
          count: 2,
          boughtCount: 2,
          benchCount: 0,
          cost: 2,
          updatedAt: 1000,
        },
      },
      events: [],
    },
    economyState: {
      active: true,
      round: '2-5',
      gold: 31,
      level: 6,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
    knowledgeState: {
      active: false,
      shopSlots: {
        1: {
          slotIndex: 1,
          championName: 'eagle',
          confidence: 'matched',
          updatedAt: 1000,
        },
      },
      items: {},
      streak: {},
      events: [],
    },
  });
  const nearUpgradeEagle = nearUpgradeLiquidityPlan.picks.find((pick) => pick.name === 'eagle');
  assert.ok(nearUpgradeEagle);
  assert.equal(nearUpgradeEagle.reasons.includes('nearUpgrade'), true);
  assert.equal(nearUpgradeEagle.shopVisibleCount, 1);
  assert.equal(nearUpgradeEagle.scoreBreakdown.penalties.interestTax, 0);
  assert.equal(nearUpgradeLiquidityPlan.recommendedRollTargetNames.includes('eagle'), true);

  const nearUpgradeFrontlineInterestPlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'near-upgrade-frontline-interest-variant',
      slot: 'A',
      name: 'Near Upgrade Frontline Interest',
      code: '',
      traitsSummary: '2core',
      mainCarries: [{ name: 'eagle', isCarry: true }],
      frontliners: [{ name: 'bear' }],
      units: [{ name: 'eagle' }, { name: 'bear' }],
    },
    championAssets: {
      eagle: { name: 'eagle', cost: 2 },
      bear: {
        name: 'bear',
        cost: 2,
        imagePath: 'resource_knowledge/image/champion/2/bear.png',
      },
      tiger: { name: 'tiger', cost: 2 },
      lynx: { name: 'lynx', cost: 2 },
    },
    handState: {
      active: false,
      targetNames: [],
      owned: {
        bear: {
          name: 'bear',
          count: 2,
          boughtCount: 2,
          benchCount: 0,
          cost: 2,
          updatedAt: 1000,
        },
      },
      events: [],
    },
    economyState: {
      active: true,
      round: '2-5',
      gold: 31,
      health: 72,
      level: 6,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
    knowledgeState: {
      active: false,
      shopSlots: {
        1: {
          slotIndex: 1,
          championName: 'bear',
          confidence: 'matched',
          updatedAt: 1000,
        },
      },
      items: {},
      streak: {},
      events: [],
    },
  });
  const nearUpgradeFrontlineBear = nearUpgradeFrontlineInterestPlan.picks.find(
    (pick) => pick.name === 'bear',
  );
  assert.ok(nearUpgradeFrontlineBear);
  assert.equal(nearUpgradeFrontlineBear.role, 'frontline');
  assert.equal(nearUpgradeFrontlineBear.reasons.includes('nearUpgrade'), true);
  assert.equal(nearUpgradeFrontlineBear.shopVisibleCount, 1);
  assert.equal(nearUpgradeFrontlineBear.scoreBreakdown.penalties.interestTax, 0);
  assert.equal(nearUpgradeFrontlineInterestPlan.recommendedRollTargetNames.includes('bear'), true);
  const nearUpgradeFrontlineTargets = collectGoldenSpatulaDecisionRollTargetTemplates({
    variant: {
      id: 'near-upgrade-frontline-interest-variant',
      slot: 'A',
      name: 'Near Upgrade Frontline Interest',
      code: '',
      traitsSummary: '2core',
      mainCarries: [{ name: 'eagle', isCarry: true }],
      frontliners: [{ name: 'bear' }],
      units: [{ name: 'eagle' }, { name: 'bear' }],
    },
    championAssets: {
      bear: {
        name: 'bear',
        cost: 2,
        imagePath: 'resource_knowledge/image/champion/2/bear.png',
      },
    },
    decisionPlan: nearUpgradeFrontlineInterestPlan,
  });
  assert.deepEqual(
    nearUpgradeFrontlineTargets.map((target) => target.name),
    ['bear'],
  );

  const nearUpgradeFocusPlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'near-upgrade-focus-variant',
      slot: 'A',
      name: 'Near Upgrade Focus',
      code: '',
      traitsSummary: '2core',
      mainCarries: [{ name: 'eagle', isCarry: true }],
      frontliners: [],
      units: [{ name: 'eagle' }, { name: 'sage', items: ['utility charm'] }],
    },
    championAssets: {
      eagle: {
        name: 'eagle',
        cost: 2,
        imagePath: 'resource_knowledge/image/champion/2/eagle.png',
      },
      sage: {
        name: 'sage',
        cost: 2,
        imagePath: 'resource_knowledge/image/champion/2/sage.png',
      },
      bear: { name: 'bear', cost: 2 },
    },
    itemAssets: {
      'utility charm': {
        name: 'utility charm',
        imagePath: 'resource_knowledge/image/item/completed/utility_charm.png',
      },
    },
    handState: {
      active: false,
      targetNames: [],
      owned: {
        eagle: {
          name: 'eagle',
          count: 2,
          boughtCount: 2,
          benchCount: 0,
          cost: 2,
          updatedAt: 1000,
        },
      },
      events: [],
    },
    economyState: {
      active: true,
      round: '2-5',
      gold: 50,
      health: 72,
      level: 6,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
    knowledgeState: {
      active: false,
      shopSlots: {
        1: {
          slotIndex: 1,
          championName: 'eagle',
          confidence: 'matched',
          updatedAt: 1000,
        },
      },
      items: {
        'completedItems:item/completed/utility_charm.png': {
          templatePath: 'item/completed/utility_charm.png',
          itemKind: 'completedItems',
          zones: ['inventory'],
          updatedAt: 1000,
        },
      },
      streak: {},
      events: [],
    },
  });
  const nearUpgradeFocusEagle = nearUpgradeFocusPlan.picks.find((pick) => pick.name === 'eagle');
  const nearUpgradeFocusSage = nearUpgradeFocusPlan.picks.find((pick) => pick.name === 'sage');
  assert.ok(nearUpgradeFocusEagle);
  assert.ok(nearUpgradeFocusSage);
  assert.equal(nearUpgradeFocusPlan.economyAdvice.action, 'roll');
  assert.equal(nearUpgradeFocusPlan.economyAdvice.breakdown.nearUpgrade, true);
  assert.equal(nearUpgradeFocusEagle.reasons.includes('nearUpgrade'), true);
  assert.equal(nearUpgradeFocusSage.reasons.includes('itemFit'), true);
  assert.equal(nearUpgradeFocusSage.rollTargetPriority > 0, true);
  assert.equal(nearUpgradeFocusPlan.recommendedRollTargetNames.includes('eagle'), true);
  assert.equal(nearUpgradeFocusPlan.recommendedRollTargetNames.includes('sage'), false);
  const nearUpgradeFocusDecisionTargets = collectGoldenSpatulaDecisionRollTargetTemplates({
    variant: {
      id: 'near-upgrade-focus-variant',
      slot: 'A',
      name: 'Near Upgrade Focus',
      code: '',
      traitsSummary: '2core',
      mainCarries: [{ name: 'eagle', isCarry: true }],
      frontliners: [],
      units: [{ name: 'eagle' }, { name: 'sage', items: ['utility charm'] }],
    },
    championAssets: {
      eagle: {
        name: 'eagle',
        cost: 2,
        imagePath: 'resource_knowledge/image/champion/2/eagle.png',
      },
      sage: {
        name: 'sage',
        cost: 2,
        imagePath: 'resource_knowledge/image/champion/2/sage.png',
      },
      bear: { name: 'bear', cost: 2 },
    },
    decisionPlan: nearUpgradeFocusPlan,
  });
  assert.deepEqual(
    nearUpgradeFocusDecisionTargets.map((target) => target.name),
    ['eagle'],
  );

  const nearUpgradeCoreBeforeSidePairPlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'near-upgrade-core-before-side-pair-variant',
      slot: 'A',
      name: 'Near Upgrade Core Before Side Pair',
      code: '',
      traitsSummary: '2core',
      mainCarries: [{ name: 'eagle', isCarry: true }],
      frontliners: [],
      units: [{ name: 'eagle' }, { name: 'sage', items: ['utility charm'] }, { name: 'fox' }],
    },
    championAssets: {
      eagle: {
        name: 'eagle',
        cost: 2,
        imagePath: 'resource_knowledge/image/champion/2/eagle.png',
      },
      fox: {
        name: 'fox',
        cost: 2,
        imagePath: 'resource_knowledge/image/champion/2/fox.png',
      },
      sage: { name: 'sage', cost: 2 },
    },
    itemAssets: {
      'utility charm': {
        name: 'utility charm',
        imagePath: 'resource_knowledge/image/item/completed/utility_charm.png',
      },
    },
    handState: {
      active: false,
      targetNames: [],
      owned: {
        eagle: {
          name: 'eagle',
          count: 2,
          boughtCount: 2,
          benchCount: 0,
          cost: 2,
          updatedAt: 1000,
        },
        fox: {
          name: 'fox',
          count: 2,
          boughtCount: 2,
          benchCount: 2,
          cost: 2,
          updatedAt: 1000,
        },
      },
      events: [],
    },
    economyState: {
      active: true,
      round: '2-5',
      gold: 50,
      health: 72,
      level: 6,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
    knowledgeState: {
      active: false,
      shopSlots: {
        1: {
          slotIndex: 1,
          championName: 'eagle',
          confidence: 'matched',
          updatedAt: 1000,
        },
        2: {
          slotIndex: 2,
          championName: 'fox',
          confidence: 'matched',
          updatedAt: 1000,
        },
      },
      items: {
        'completedItems:item/completed/utility_charm.png': {
          templatePath: 'item/completed/utility_charm.png',
          itemKind: 'completedItems',
          zones: ['inventory'],
          updatedAt: 1000,
        },
      },
      streak: {},
      events: [],
    },
  });
  const nearUpgradeCoreEagle = nearUpgradeCoreBeforeSidePairPlan.picks.find(
    (pick) => pick.name === 'eagle',
  );
  const nearUpgradeSideFox = nearUpgradeCoreBeforeSidePairPlan.picks.find(
    (pick) => pick.name === 'fox',
  );
  assert.ok(nearUpgradeCoreEagle);
  assert.ok(nearUpgradeSideFox);
  assert.equal(nearUpgradeCoreBeforeSidePairPlan.economyAdvice.breakdown.nearUpgrade, true);
  assert.equal(nearUpgradeCoreEagle.reasons.includes('nearUpgrade'), true);
  assert.equal(nearUpgradeSideFox.reasons.includes('nearUpgrade'), true);
  assert.equal(
    nearUpgradeCoreBeforeSidePairPlan.recommendedRollTargetNames.includes('eagle'),
    true,
  );
  assert.equal(
    nearUpgradeCoreBeforeSidePairPlan.recommendedRollTargetNames.includes('fox'),
    false,
  );
  const nearUpgradeCoreBeforeSidePairTargets = collectGoldenSpatulaDecisionRollTargetTemplates({
    variant: {
      id: 'near-upgrade-core-before-side-pair-variant',
      slot: 'A',
      name: 'Near Upgrade Core Before Side Pair',
      code: '',
      traitsSummary: '2core',
      mainCarries: [{ name: 'eagle', isCarry: true }],
      frontliners: [],
      units: [{ name: 'eagle' }, { name: 'sage', items: ['utility charm'] }, { name: 'fox' }],
    },
    championAssets: {
      eagle: {
        name: 'eagle',
        cost: 2,
        imagePath: 'resource_knowledge/image/champion/2/eagle.png',
      },
      fox: {
        name: 'fox',
        cost: 2,
        imagePath: 'resource_knowledge/image/champion/2/fox.png',
      },
    },
    decisionPlan: nearUpgradeCoreBeforeSidePairPlan,
  });
  assert.deepEqual(
    nearUpgradeCoreBeforeSidePairTargets.map((target) => target.name),
    ['eagle'],
  );

  const sidePieceRollWindowPlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'side-piece-roll-window-variant',
      slot: 'A',
      name: 'Side Piece Roll Window',
      code: '',
      traitsSummary: '2probe',
      mainCarries: [],
      frontliners: [],
      units: [{ name: 'fox' }, { name: 'wolf' }],
    },
    recommendedLineups: [
      {
        id: 'side-piece-rec',
        slug: 'side-piece-rec',
        name: 'Side Piece Rec',
        path: 'side-piece-rec.json',
        quality: 'B',
        variant: {
          id: 'side-piece-rec-variant',
          slot: 'A',
          name: 'Side Piece Rec',
          code: '',
          traitsSummary: '2probe',
          mainCarries: [],
          frontliners: [],
          units: [{ name: 'fox' }, { name: 'wolf' }],
        },
      },
    ],
    championAssets: {
      fox: { name: 'fox', cost: 2 },
      wolf: { name: 'wolf', cost: 2 },
      tiger: { name: 'tiger', cost: 2 },
      lynx: { name: 'lynx', cost: 2 },
    },
    handState: { active: false, targetNames: [], owned: {}, events: [] },
    economyState: {
      active: true,
      round: '3-2',
      gold: 40,
      level: 6,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
  });
  assert.equal(sidePieceRollWindowPlan.picks[0].role, 'trait');
  assert.equal(sidePieceRollWindowPlan.picks[0].tier, 'high');
  assert.equal(sidePieceRollWindowPlan.economyAdvice.breakdown.rollDecisionScore.band, 'smallRoll');
  assert.equal(sidePieceRollWindowPlan.economyAdvice.breakdown.roundPolicy?.kind, 'rerollWindow');
  assert.equal(sidePieceRollWindowPlan.economyAdvice.breakdown.roundPolicy?.action, 'roll');
  assert.notEqual(sidePieceRollWindowPlan.economyAdvice.action, 'roll');

  const coreBeforeSidecarVariant = {
    id: 'core-before-sidecar-variant',
    slot: 'A',
    name: 'Core Before Sidecar',
    code: '',
    traitsSummary: '2probe',
    mainCarries: [{ name: 'eagle', isCarry: true }],
    frontliners: [{ name: 'bear' }],
    units: [{ name: 'eagle' }, { name: 'bear' }],
    rollTargetNames: ['eagle', 'bear', 'fox'],
  };
  const coreBeforeSidecarChampionAssets = {
    eagle: {
      name: 'eagle',
      cost: 2,
      imagePath: 'resource_knowledge/image/champion/2/eagle.png',
    },
    bear: {
      name: 'bear',
      cost: 2,
      imagePath: 'resource_knowledge/image/champion/2/bear.png',
    },
    fox: {
      name: 'fox',
      cost: 2,
      imagePath: 'resource_knowledge/image/champion/2/fox.png',
    },
    wolf: { name: 'wolf', cost: 2 },
  };
  const buildCoreBeforeSidecarPlan = ({ gold, health = 72, owned = {} }) =>
    buildGoldenSpatulaDecisionPlan({
      activeVariant: coreBeforeSidecarVariant,
      recommendedLineups: [
        {
          id: 'core-before-sidecar-rec',
          slug: 'core-before-sidecar-rec',
          name: 'Sidecar Trait Rec',
          path: 'sidecar-trait-rec.json',
          quality: 'A',
          variant: {
            id: 'sidecar-trait-rec-variant',
            slot: 'B',
            name: 'Sidecar Trait Rec',
            code: '',
            traitsSummary: '2probe',
            mainCarries: [],
            frontliners: [],
            units: [{ name: 'fox' }],
          },
        },
      ],
      championAssets: coreBeforeSidecarChampionAssets,
      handState: { active: false, targetNames: [], owned, events: [] },
      economyState: {
        active: true,
        round: '3-2',
        gold,
        health,
        level: 6,
        estimatedGoldDelta: 0,
        boughtChampionGold: 0,
        refreshGold: 0,
        xpGold: 0,
        xpPurchases: 0,
        events: [],
      },
    });
  const gatedSidecarPlan = buildCoreBeforeSidecarPlan({ gold: 40 });
  const gatedSidecarFox = gatedSidecarPlan.picks.find((pick) => pick.name === 'fox');
  assert.ok(gatedSidecarFox);
  assert.equal(gatedSidecarFox.role, 'trait');
  assert.equal(gatedSidecarFox.reasons.includes('traitBridge'), true);
  assert.equal(gatedSidecarFox.rollTargetPriority > 0, true);
  assert.equal(
    gatedSidecarPlan.economyAdvice.breakdown.formationBalance?.kind,
    'carryBeforeFrontline',
  );
  assert.deepEqual(gatedSidecarPlan.economyAdvice.breakdown.formationBalance?.priorityTargetNames, [
    'eagle',
  ]);
  assert.equal(gatedSidecarPlan.recommendedRollTargetNames.includes('eagle'), true);
  assert.equal(gatedSidecarPlan.recommendedRollTargetNames.includes('bear'), false);
  assert.equal(gatedSidecarPlan.recommendedRollTargetNames.includes('fox'), false);
  const gatedSidecarDecisionTargets = collectGoldenSpatulaDecisionRollTargetTemplates({
    variant: coreBeforeSidecarVariant,
    championAssets: coreBeforeSidecarChampionAssets,
    decisionPlan: gatedSidecarPlan,
  });
  assert.deepEqual(
    gatedSidecarDecisionTargets.map((target) => target.name),
    ['eagle'],
  );

  const bankedSidecarPlan = buildCoreBeforeSidecarPlan({
    gold: 50,
    owned: {
      eagle: {
        name: 'eagle',
        count: 3,
        boughtCount: 3,
        benchCount: 0,
        cost: 2,
        updatedAt: 1000,
      },
      bear: {
        name: 'bear',
        count: 3,
        boughtCount: 3,
        benchCount: 0,
        cost: 2,
        updatedAt: 1000,
      },
    },
  });
  const bankedSidecarFox = bankedSidecarPlan.picks.find((pick) => pick.name === 'fox');
  assert.ok(bankedSidecarFox);
  assert.equal(bankedSidecarFox.rollTargetPriority > 0, true);
  assert.equal(bankedSidecarPlan.economyAdvice.breakdown.formationBalance?.kind, 'balanced');
  assert.equal(bankedSidecarPlan.recommendedRollTargetNames.includes('fox'), true);
  const bankedSidecarDecisionTargets = collectGoldenSpatulaDecisionRollTargetTemplates({
    variant: coreBeforeSidecarVariant,
    championAssets: coreBeforeSidecarChampionAssets,
    decisionPlan: bankedSidecarPlan,
  });
  assert.equal(
    bankedSidecarDecisionTargets.some((target) => target.name === 'fox'),
    true,
  );

  const lowHealthBankedSidecarPlan = buildCoreBeforeSidecarPlan({
    gold: 50,
    health: 42,
    owned: {
      eagle: {
        name: 'eagle',
        count: 3,
        boughtCount: 3,
        benchCount: 0,
        cost: 2,
        updatedAt: 1000,
      },
      bear: {
        name: 'bear',
        count: 3,
        boughtCount: 3,
        benchCount: 0,
        cost: 2,
        updatedAt: 1000,
      },
    },
  });
  const lowHealthBankedFox = lowHealthBankedSidecarPlan.picks.find(
    (pick) => pick.name === 'fox',
  );
  assert.ok(lowHealthBankedFox);
  assert.equal(lowHealthBankedFox.rollTargetPriority > 0, true);
  assert.equal(lowHealthBankedSidecarPlan.recommendedRollTargetNames.includes('fox'), false);
  const lowHealthBankedDecisionTargets = collectGoldenSpatulaDecisionRollTargetTemplates({
    variant: coreBeforeSidecarVariant,
    championAssets: coreBeforeSidecarChampionAssets,
    decisionPlan: lowHealthBankedSidecarPlan,
  });
  assert.equal(
    lowHealthBankedDecisionTargets.some((target) => target.name === 'fox'),
    false,
  );

  const auxiliaryBeforeSidecarVariant = {
    ...coreBeforeSidecarVariant,
    id: 'auxiliary-before-sidecar-variant',
    name: 'Auxiliary Before Sidecar',
    units: [{ name: 'eagle' }, { name: 'bear' }, { name: 'sage', items: ['utility charm'] }],
    rollTargetNames: ['eagle', 'bear', 'sage', 'fox'],
  };
  const auxiliaryBeforeSidecarChampionAssets = {
    ...coreBeforeSidecarChampionAssets,
    sage: {
      name: 'sage',
      cost: 2,
      imagePath: 'resource_knowledge/image/champion/2/sage.png',
    },
  };
  const auxiliaryBeforeSidecarPlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: auxiliaryBeforeSidecarVariant,
    recommendedLineups: [
      {
        id: 'auxiliary-before-sidecar-rec',
        slug: 'auxiliary-before-sidecar-rec',
        name: 'Auxiliary Sidecar Rec',
        path: 'auxiliary-sidecar-rec.json',
        quality: 'A',
        variant: {
          id: 'auxiliary-sidecar-rec-variant',
          slot: 'B',
          name: 'Auxiliary Sidecar Rec',
          code: '',
          traitsSummary: '2probe',
          mainCarries: [],
          frontliners: [],
          units: [{ name: 'fox' }],
        },
      },
    ],
    championAssets: auxiliaryBeforeSidecarChampionAssets,
    itemAssets: {
      'utility charm': {
        name: 'utility charm',
        imagePath: 'resource_knowledge/image/item/completed/utility_charm.png',
      },
    },
    handState: {
      active: false,
      targetNames: [],
      owned: {
        eagle: {
          name: 'eagle',
          count: 3,
          boughtCount: 3,
          benchCount: 0,
          cost: 2,
          updatedAt: 1000,
        },
        bear: {
          name: 'bear',
          count: 3,
          boughtCount: 3,
          benchCount: 0,
          cost: 2,
          updatedAt: 1000,
        },
      },
      events: [],
    },
    economyState: {
      active: true,
      round: '3-2',
      gold: 50,
      health: 72,
      level: 6,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
    knowledgeState: {
      active: false,
      shopSlots: {},
      items: {
        'completedItems:item/completed/utility_charm.png': {
          templatePath: 'item/completed/utility_charm.png',
          itemKind: 'completedItems',
          zones: ['inventory'],
          updatedAt: 1000,
        },
      },
      streak: {},
      events: [],
    },
  });
  const auxiliarySage = auxiliaryBeforeSidecarPlan.picks.find((pick) => pick.name === 'sage');
  const auxiliaryFox = auxiliaryBeforeSidecarPlan.picks.find((pick) => pick.name === 'fox');
  assert.ok(auxiliarySage);
  assert.ok(auxiliaryFox);
  assert.equal(auxiliarySage.reasons.includes('itemFit'), true);
  assert.equal(auxiliarySage.rollTargetPriority > 0, true);
  assert.equal(auxiliaryFox.rollTargetPriority > 0, true);
  assert.equal(auxiliaryBeforeSidecarPlan.recommendedRollTargetNames.includes('sage'), true);
  assert.equal(auxiliaryBeforeSidecarPlan.recommendedRollTargetNames.includes('fox'), false);
  const auxiliaryBeforeSidecarDecisionTargets = collectGoldenSpatulaDecisionRollTargetTemplates({
    variant: auxiliaryBeforeSidecarVariant,
    championAssets: auxiliaryBeforeSidecarChampionAssets,
    decisionPlan: auxiliaryBeforeSidecarPlan,
  });
  assert.equal(
    auxiliaryBeforeSidecarDecisionTargets.some((target) => target.name === 'sage'),
    true,
  );
  assert.equal(
    auxiliaryBeforeSidecarDecisionTargets.some((target) => target.name === 'fox'),
    false,
  );

  const stableAuxiliaryOwned = {
    eagle: {
      name: 'eagle',
      count: 3,
      boughtCount: 3,
      benchCount: 0,
      cost: 2,
      updatedAt: 1000,
    },
    bear: {
      name: 'bear',
      count: 3,
      boughtCount: 3,
      benchCount: 0,
      cost: 2,
      updatedAt: 1000,
    },
    sage: {
      name: 'sage',
      count: 3,
      boughtCount: 3,
      benchCount: 0,
      cost: 2,
      updatedAt: 1000,
    },
  };
  const stableAuxiliaryChasePlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: auxiliaryBeforeSidecarVariant,
    championAssets: auxiliaryBeforeSidecarChampionAssets,
    itemAssets: {
      'utility charm': {
        name: 'utility charm',
        imagePath: 'resource_knowledge/image/item/completed/utility_charm.png',
      },
    },
    handState: {
      active: false,
      targetNames: [],
      owned: stableAuxiliaryOwned,
      events: [],
    },
    economyState: {
      active: true,
      round: '3-5',
      gold: 50,
      health: 72,
      level: 6,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
    knowledgeState: {
      active: false,
      shopSlots: {},
      items: {
        'completedItems:item/completed/utility_charm.png': {
          templatePath: 'item/completed/utility_charm.png',
          itemKind: 'completedItems',
          zones: ['inventory'],
          updatedAt: 1000,
        },
      },
      streak: {},
      events: [],
    },
  });
  const stableAuxiliarySage = stableAuxiliaryChasePlan.picks.find((pick) => pick.name === 'sage');
  assert.ok(stableAuxiliarySage);
  assert.equal(stableAuxiliarySage.targetCount, 6);
  assert.equal(stableAuxiliarySage.ownedCount, 3);
  assert.equal(stableAuxiliarySage.rollTargetPriority > 0, true);
  assert.equal(stableAuxiliaryChasePlan.recommendedRollTargetNames.includes('sage'), false);
  const stableAuxiliaryDecisionTargets = collectGoldenSpatulaDecisionRollTargetTemplates({
    variant: auxiliaryBeforeSidecarVariant,
    championAssets: auxiliaryBeforeSidecarChampionAssets,
    decisionPlan: stableAuxiliaryChasePlan,
  });
  assert.equal(
    stableAuxiliaryDecisionTargets.some((target) => target.name === 'sage'),
    false,
  );

  const highEconomyAuxiliaryChasePlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: auxiliaryBeforeSidecarVariant,
    championAssets: auxiliaryBeforeSidecarChampionAssets,
    itemAssets: {
      'utility charm': {
        name: 'utility charm',
        imagePath: 'resource_knowledge/image/item/completed/utility_charm.png',
      },
    },
    handState: {
      active: false,
      targetNames: [],
      owned: stableAuxiliaryOwned,
      events: [],
    },
    economyState: {
      active: true,
      round: '3-5',
      gold: 60,
      health: 72,
      level: 6,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
    knowledgeState: {
      active: false,
      shopSlots: {},
      items: {
        'completedItems:item/completed/utility_charm.png': {
          templatePath: 'item/completed/utility_charm.png',
          itemKind: 'completedItems',
          zones: ['inventory'],
          updatedAt: 1000,
        },
      },
      streak: {},
      events: [],
    },
  });
  const highEconomyAuxiliarySage = highEconomyAuxiliaryChasePlan.picks.find(
    (pick) => pick.name === 'sage',
  );
  assert.ok(highEconomyAuxiliarySage);
  assert.equal(highEconomyAuxiliarySage.targetCount, 6);
  assert.equal(highEconomyAuxiliarySage.ownedCount, 3);
  assert.equal(highEconomyAuxiliarySage.reasons.includes('nearUpgrade'), false);
  assert.equal(highEconomyAuxiliaryChasePlan.recommendedRollTargetNames.includes('sage'), false);

  const nearUpgradeAuxiliaryOwned = {
    ...stableAuxiliaryOwned,
    sage: {
      name: 'sage',
      count: 5,
      boughtCount: 5,
      benchCount: 2,
      cost: 2,
      updatedAt: 1000,
    },
  };
  const nearUpgradeAuxiliaryChasePlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: auxiliaryBeforeSidecarVariant,
    championAssets: auxiliaryBeforeSidecarChampionAssets,
    itemAssets: {
      'utility charm': {
        name: 'utility charm',
        imagePath: 'resource_knowledge/image/item/completed/utility_charm.png',
      },
    },
    handState: {
      active: false,
      targetNames: [],
      owned: nearUpgradeAuxiliaryOwned,
      events: [],
    },
    economyState: {
      active: true,
      round: '3-5',
      gold: 60,
      health: 72,
      level: 6,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
    knowledgeState: {
      active: false,
      shopSlots: {},
      items: {
        'completedItems:item/completed/utility_charm.png': {
          templatePath: 'item/completed/utility_charm.png',
          itemKind: 'completedItems',
          zones: ['inventory'],
          updatedAt: 1000,
        },
      },
      streak: {},
      events: [],
    },
  });
  const nearUpgradeAuxiliarySage = nearUpgradeAuxiliaryChasePlan.picks.find(
    (pick) => pick.name === 'sage',
  );
  assert.ok(nearUpgradeAuxiliarySage);
  assert.equal(nearUpgradeAuxiliarySage.ownedCount, 5);
  assert.equal(nearUpgradeAuxiliarySage.reasons.includes('nearUpgrade'), true);
  assert.equal(nearUpgradeAuxiliaryChasePlan.recommendedRollTargetNames.includes('sage'), true);

  const lowHealthHighEconomyAuxiliaryChasePlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: auxiliaryBeforeSidecarVariant,
    championAssets: auxiliaryBeforeSidecarChampionAssets,
    itemAssets: {
      'utility charm': {
        name: 'utility charm',
        imagePath: 'resource_knowledge/image/item/completed/utility_charm.png',
      },
    },
    handState: {
      active: false,
      targetNames: [],
      owned: stableAuxiliaryOwned,
      events: [],
    },
    economyState: {
      active: true,
      round: '3-5',
      gold: 60,
      health: 42,
      level: 6,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
    knowledgeState: {
      active: false,
      shopSlots: {},
      items: {
        'completedItems:item/completed/utility_charm.png': {
          templatePath: 'item/completed/utility_charm.png',
          itemKind: 'completedItems',
          zones: ['inventory'],
          updatedAt: 1000,
        },
      },
      streak: {},
      events: [],
    },
  });
  assert.equal(
    lowHealthHighEconomyAuxiliaryChasePlan.recommendedRollTargetNames.includes('sage'),
    false,
  );

  assert.equal(getGoldenSpatulaShopOdds(5, 5), 0);
  assert.equal(getGoldenSpatulaShopOdds(7, 5), 0.01);
  assert.equal(getGoldenSpatulaShopOdds(8, 1), 0.15);
  assert.equal(getGoldenSpatulaShopOdds(8, 2), 0.2);
  assert.equal(getGoldenSpatulaShopOdds(8, 4), 0.3);
  assert.equal(getGoldenSpatulaShopOdds(9, 1), 0.1);
  assert.equal(getGoldenSpatulaShopOdds(9, 2), 0.17);
  assert.equal(getGoldenSpatulaShopOdds(9, 4), 0.33);
  assert.equal(getGoldenSpatulaShopOdds(9, 5), 0.15);

  const targetSpecificAcquisition = estimateGoldenSpatulaAcquisition({
    shopOdds: 0.4,
    shopOddsAvailability: 'available',
    cost: 2,
    copiesNeeded: 1,
    gold: 40,
    costDensity: { byCost: { 2: 5 }, fallbackDensity: 5 },
  });
  assert.equal(Math.round(targetSpecificAcquisition.targetSlotOdds * 1000), 80);
  assert.ok(targetSpecificAcquisition.expectedRollHitRate > 0.33);
  assert.ok(targetSpecificAcquisition.expectedRollHitRate < 0.35);
  assert.ok(targetSpecificAcquisition.expectedRollHitRate < 0.4);

  const ownedCopiesAcquisition = estimateGoldenSpatulaAcquisition({
    shopOdds: 0.4,
    shopOddsAvailability: 'available',
    cost: 2,
    copiesNeeded: 4,
    ownedCount: 5,
    gold: 50,
    costDensity: { byCost: { 2: 5 }, fallbackDensity: 5 },
  });
  assert.equal(Math.round(ownedCopiesAcquisition.targetSlotOdds * 1000), 65);
  assert.equal(
    ownedCopiesAcquisition.targetSlotOdds < targetSpecificAcquisition.targetSlotOdds,
    true,
  );

  const uncontestedRerollPlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'uncontested-reroll-variant',
      slot: 'A',
      name: 'Uncontested Reroll',
      code: '',
      traitsSummary: '2probe',
      mainCarries: [{ name: 'eagle', isCarry: true }],
      frontliners: [],
      units: [{ name: 'eagle' }],
    },
    championAssets: {
      eagle: { name: 'eagle', cost: 2 },
      bear: { name: 'bear', cost: 2 },
      tiger: { name: 'tiger', cost: 2 },
      lynx: { name: 'lynx', cost: 2 },
    },
    handState: {
      active: false,
      targetNames: [],
      owned: {
        eagle: {
          name: 'eagle',
          count: 5,
          boughtCount: 5,
          benchCount: 0,
          cost: 2,
          updatedAt: 1000,
        },
      },
      events: [],
    },
    economyState: {
      active: true,
      round: '3-2',
      gold: 50,
      level: 6,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
  });
  const contestedRerollPlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'contested-reroll-variant',
      slot: 'A',
      name: 'Contested Reroll',
      code: '',
      traitsSummary: '2probe',
      mainCarries: [{ name: 'eagle', isCarry: true }],
      frontliners: [],
      units: [{ name: 'eagle' }],
    },
    championAssets: {
      eagle: { name: 'eagle', cost: 2 },
      bear: { name: 'bear', cost: 2 },
      tiger: { name: 'tiger', cost: 2 },
      lynx: { name: 'lynx', cost: 2 },
    },
    handState: {
      active: false,
      targetNames: [],
      owned: {
        eagle: {
          name: 'eagle',
          count: 5,
          boughtCount: 5,
          benchCount: 0,
          cost: 2,
          updatedAt: 1000,
        },
      },
      events: [],
    },
    economyState: {
      active: true,
      round: '3-2',
      gold: 50,
      level: 6,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
    contestState: {
      active: true,
      champions: {
        eagle: {
          championName: 'eagle',
          externalCopies: 6,
          playerCount: 2,
          confidence: 'observed',
          updatedAt: 1000,
        },
      },
    },
  });
  const uncontestedEagle = uncontestedRerollPlan.picks.find((pick) => pick.name === 'eagle');
  const contestedEagle = contestedRerollPlan.picks.find((pick) => pick.name === 'eagle');
  assert.ok(uncontestedEagle);
  assert.ok(contestedEagle);
  assert.equal(contestedEagle.externalContestCopies, 6);
  assert.equal(Math.round((contestedEagle.contestPoolShare ?? 0) * 100), 27);
  assert.equal(contestedEagle.reasons.includes('contested'), true);
  assert.equal(contestedEagle.scoreBreakdown.penalties.contest > 0, true);
  assert.equal(contestedEagle.score < uncontestedEagle.score, true);
  assert.equal(contestedEagle.rollTargetPriority < uncontestedEagle.rollTargetPriority, true);
  assert.equal(
    (contestedEagle.acquisitionExpectedRolls ?? 0) >
      (uncontestedEagle.acquisitionExpectedRolls ?? 0),
    true,
  );
  assert.equal(
    (contestedEagle.acquisitionCompletionChance ?? 0) <
      (uncontestedEagle.acquisitionCompletionChance ?? 0),
    true,
  );
  assert.equal(uncontestedRerollPlan.recommendedRollTargetNames.includes('eagle'), true);
  assert.equal(contestedRerollPlan.recommendedRollTargetNames.includes('eagle'), false);
  const contestedRerollDecisionTargets = collectGoldenSpatulaDecisionRollTargetTemplates({
    variant: {
      id: 'contested-reroll-variant',
      slot: 'A',
      name: 'Contested Reroll',
      code: '',
      traitsSummary: '2probe',
      mainCarries: [{ name: 'eagle', isCarry: true }],
      frontliners: [],
      units: [{ name: 'eagle' }],
    },
    championAssets: {
      eagle: {
        name: 'eagle',
        cost: 2,
        imagePath: 'resource_knowledge/image/champion/2/eagle.png',
      },
    },
    decisionPlan: contestedRerollPlan,
  });
  assert.equal(
    contestedRerollDecisionTargets.some((target) => target.name === 'eagle'),
    false,
  );

  const moderatelyContestedLateralPlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'moderately-contested-lateral-variant',
      slot: 'A',
      name: 'Moderately Contested Lateral',
      code: '',
      traitsSummary: '2probe',
      mainCarries: [{ name: 'eagle', isCarry: true, items: ['deathblade'] }],
      frontliners: [{ name: 'bear' }],
      units: [{ name: 'eagle' }, { name: 'bear' }],
    },
    recommendedLineups: [
      {
        id: 'same-ad-family-lateral',
        slug: 'same-ad-family-lateral',
        name: 'Same AD Family Lateral',
        path: 'same-ad-family-lateral.json',
        quality: 'A',
        variant: {
          id: 'same-ad-family-lateral-variant',
          slot: 'B',
          name: 'Same AD Family Lateral',
          code: '',
          traitsSummary: '2probe',
          mainCarries: [{ name: 'tiger', isCarry: true, items: ['deathblade'] }],
          frontliners: [{ name: 'bear' }],
          units: [{ name: 'tiger' }, { name: 'bear' }],
        },
      },
    ],
    championAssets: {
      eagle: { name: 'eagle', cost: 2 },
      bear: { name: 'bear', cost: 2 },
      tiger: { name: 'tiger', cost: 2 },
      lynx: { name: 'lynx', cost: 2 },
    },
    itemAssets: {
      'infinity edge': {
        name: 'infinity edge',
        imagePath: 'resource_knowledge/image/item/completed/infinity_edge.png',
      },
      deathblade: {
        name: 'deathblade',
        imagePath: 'resource_knowledge/image/item/completed/deathblade.png',
      },
    },
    handState: {
      active: false,
      targetNames: [],
      owned: {
        eagle: {
          name: 'eagle',
          count: 5,
          boughtCount: 5,
          benchCount: 2,
          cost: 2,
          updatedAt: 1000,
        },
        bear: {
          name: 'bear',
          count: 3,
          boughtCount: 3,
          benchCount: 0,
          cost: 2,
          updatedAt: 1000,
        },
      },
      events: [],
    },
    economyState: {
      active: true,
      round: '3-2',
      gold: 50,
      health: 78,
      level: 6,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
    knowledgeState: {
      active: false,
      shopSlots: {},
      items: {
        'completedItems:item/completed/infinity_edge.png': {
          templatePath: 'item/completed/infinity_edge.png',
          itemKind: 'completedItems',
          zones: ['inventory'],
          updatedAt: 1000,
        },
      },
      streak: {},
      events: [],
    },
    contestState: {
      active: true,
      champions: {
        eagle: {
          championName: 'eagle',
          externalCopies: 4,
          playerCount: 2,
          confidence: 'observed',
          updatedAt: 1000,
        },
      },
    },
  });
  const moderatelyContestedEagle = moderatelyContestedLateralPlan.picks.find(
    (pick) => pick.name === 'eagle',
  );
  assert.ok(moderatelyContestedEagle);
  assert.equal(moderatelyContestedEagle.externalContestCopies, 4);
  assert.equal(Math.round((moderatelyContestedEagle.contestPoolShare ?? 0) * 100), 18);
  assert.equal(moderatelyContestedEagle.reasons.includes('contested'), true);
  assert.equal(
    moderatelyContestedLateralPlan.transitionLineups[0].itemFamilyUnitNames.includes('tiger'),
    true,
  );
  assert.equal(
    moderatelyContestedLateralPlan.recommendedRollTargetNames.includes('eagle'),
    false,
  );
  assert.equal(
    moderatelyContestedLateralPlan.recommendedRollTargetNames.includes('tiger'),
    true,
  );

  const shallowContestedRerollPlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'shallow-contested-reroll-variant',
      slot: 'A',
      name: 'Shallow Contested Reroll',
      code: '',
      traitsSummary: '2probe',
      mainCarries: [{ name: 'eagle', isCarry: true }],
      frontliners: [],
      units: [{ name: 'eagle' }],
    },
    championAssets: {
      eagle: {
        name: 'eagle',
        cost: 2,
        imagePath: 'resource_knowledge/image/champion/2/eagle.png',
      },
      bear: { name: 'bear', cost: 2 },
      tiger: { name: 'tiger', cost: 2 },
      lynx: { name: 'lynx', cost: 2 },
    },
    handState: {
      active: false,
      targetNames: [],
      owned: {
        eagle: {
          name: 'eagle',
          count: 1,
          boughtCount: 1,
          benchCount: 0,
          cost: 2,
          updatedAt: 1000,
        },
      },
      events: [],
    },
    economyState: {
      active: true,
      round: '3-2',
      gold: 50,
      level: 6,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
    contestState: {
      active: true,
      champions: {
        eagle: {
          championName: 'eagle',
          externalCopies: 6,
          playerCount: 2,
          confidence: 'observed',
          updatedAt: 1000,
        },
      },
    },
  });
  const shallowContestedEagle = shallowContestedRerollPlan.picks.find(
    (pick) => pick.name === 'eagle',
  );
  assert.ok(shallowContestedEagle);
  assert.equal(shallowContestedEagle.ownedCount, 1);
  assert.equal(shallowContestedEagle.targetCount, 9);
  assert.equal(shallowContestedEagle.reasons.includes('nearUpgrade'), false);
  assert.equal(shallowContestedEagle.reasons.includes('contested'), true);
  assert.equal(
    shallowContestedRerollPlan.recommendedRollTargetNames.includes('eagle'),
    false,
  );
  const shallowContestedRerollTargets = collectGoldenSpatulaDecisionRollTargetTemplates({
    variant: {
      id: 'shallow-contested-reroll-variant',
      slot: 'A',
      name: 'Shallow Contested Reroll',
      code: '',
      traitsSummary: '2probe',
      mainCarries: [{ name: 'eagle', isCarry: true }],
      frontliners: [],
      units: [{ name: 'eagle' }],
    },
    championAssets: {
      eagle: {
        name: 'eagle',
        cost: 2,
        imagePath: 'resource_knowledge/image/champion/2/eagle.png',
      },
    },
    decisionPlan: shallowContestedRerollPlan,
  });
  assert.equal(
    shallowContestedRerollTargets.some((target) => target.name === 'eagle'),
    false,
  );

  const contestedFirstTwoStarPlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'contested-first-two-star-variant',
      slot: 'A',
      name: 'Contested First Two Star',
      code: '',
      traitsSummary: '2probe',
      mainCarries: [{ name: 'eagle', isCarry: true }],
      frontliners: [],
      units: [{ name: 'eagle' }],
    },
    championAssets: {
      eagle: {
        name: 'eagle',
        cost: 2,
        imagePath: 'resource_knowledge/image/champion/2/eagle.png',
      },
      bear: { name: 'bear', cost: 2 },
      tiger: { name: 'tiger', cost: 2 },
      lynx: { name: 'lynx', cost: 2 },
    },
    handState: {
      active: false,
      targetNames: [],
      owned: {
        eagle: {
          name: 'eagle',
          count: 2,
          boughtCount: 2,
          benchCount: 0,
          cost: 2,
          updatedAt: 1000,
        },
      },
      events: [],
    },
    economyState: {
      active: true,
      round: '3-2',
      gold: 50,
      level: 6,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
    contestState: {
      active: true,
      champions: {
        eagle: {
          championName: 'eagle',
          externalCopies: 6,
          playerCount: 2,
          confidence: 'observed',
          updatedAt: 1000,
        },
      },
    },
  });
  const contestedFirstTwoStarEagle = contestedFirstTwoStarPlan.picks.find(
    (pick) => pick.name === 'eagle',
  );
  assert.ok(contestedFirstTwoStarEagle);
  assert.equal(contestedFirstTwoStarEagle.ownedCount, 2);
  assert.equal(contestedFirstTwoStarEagle.reasons.includes('nearUpgrade'), true);
  assert.equal(contestedFirstTwoStarEagle.reasons.includes('contested'), true);
  assert.equal(contestedFirstTwoStarPlan.recommendedRollTargetNames.includes('eagle'), true);
  const contestedFirstTwoStarTargets = collectGoldenSpatulaDecisionRollTargetTemplates({
    variant: {
      id: 'contested-first-two-star-variant',
      slot: 'A',
      name: 'Contested First Two Star',
      code: '',
      traitsSummary: '2probe',
      mainCarries: [{ name: 'eagle', isCarry: true }],
      frontliners: [],
      units: [{ name: 'eagle' }],
    },
    championAssets: {
      eagle: {
        name: 'eagle',
        cost: 2,
        imagePath: 'resource_knowledge/image/champion/2/eagle.png',
      },
    },
    decisionPlan: contestedFirstTwoStarPlan,
  });
  assert.deepEqual(
    contestedFirstTwoStarTargets.map((target) => target.name),
    ['eagle'],
  );

  const oneCostAbandonPivotPlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'one-cost-abandon-pivot-variant',
      slot: 'A',
      name: 'One Cost Abandon Pivot',
      code: '',
      traitsSummary: '2probe',
      mainCarries: [{ name: 'sprout', isCarry: true }],
      frontliners: [{ name: 'shield' }],
      units: [{ name: 'sprout' }, { name: 'shield' }],
    },
    recommendedLineups: [
      {
        id: 'one-cost-next-tempo-line',
        slug: 'one-cost-next-tempo-line',
        name: 'One Cost Next Tempo Line',
        path: 'one-cost-next-tempo-line.json',
        quality: 'A',
        variant: {
          id: 'one-cost-next-tempo-line-variant',
          slot: 'B',
          name: 'One Cost Next Tempo Line',
          code: '',
          traitsSummary: '2probe',
          mainCarries: [{ name: 'eagle', isCarry: true }],
          frontliners: [{ name: 'shield' }],
          units: [{ name: 'eagle' }, { name: 'shield' }],
        },
      },
    ],
    championAssets: {
      sprout: { name: 'sprout', cost: 1 },
      shield: { name: 'shield', cost: 1 },
      eagle: { name: 'eagle', cost: 2 },
      cub: { name: 'cub', cost: 1 },
      moth: { name: 'moth', cost: 1 },
      tiger: { name: 'tiger', cost: 2 },
      lynx: { name: 'lynx', cost: 2 },
    },
    handState: {
      active: false,
      targetNames: [],
      owned: {
        sprout: {
          name: 'sprout',
          count: 4,
          boughtCount: 4,
          benchCount: 1,
          cost: 1,
          updatedAt: 1000,
        },
        shield: {
          name: 'shield',
          count: 3,
          boughtCount: 3,
          benchCount: 0,
          cost: 1,
          updatedAt: 1000,
        },
      },
      events: [],
    },
    economyState: {
      active: true,
      round: '3-5',
      gold: 60,
      health: 80,
      level: 5,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
    knowledgeState: {
      active: false,
      shopSlots: {},
      items: {},
      streak: {},
      events: [],
    },
    maxTransitions: 4,
  });
  assert.equal(
    oneCostAbandonPivotPlan.economyAdvice.breakdown.stopLoss?.kind,
    'oneCostRerollAbandon',
  );
  assert.equal(oneCostAbandonPivotPlan.economyAdvice.action, 'level');
  assert.equal(oneCostAbandonPivotPlan.recommendedRollTargetNames.includes('sprout'), false);
  assert.equal(oneCostAbandonPivotPlan.recommendedRollTargetNames.includes('shield'), false);
  assert.equal(oneCostAbandonPivotPlan.recommendedRollTargetNames.includes('eagle'), true);

  const oneCostExternalContestAbandonPlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'one-cost-external-contest-abandon-variant',
      slot: 'A',
      name: 'One Cost External Contest Abandon',
      code: '',
      traitsSummary: '2probe',
      mainCarries: [{ name: 'sprout', isCarry: true }],
      frontliners: [{ name: 'shield' }],
      units: [{ name: 'sprout' }, { name: 'shield' }],
    },
    recommendedLineups: [
      {
        id: 'one-cost-external-contest-next-tempo-line',
        slug: 'one-cost-external-contest-next-tempo-line',
        name: 'One Cost External Contest Next Tempo Line',
        path: 'one-cost-external-contest-next-tempo-line.json',
        quality: 'A',
        variant: {
          id: 'one-cost-external-contest-next-tempo-line-variant',
          slot: 'B',
          name: 'One Cost External Contest Next Tempo Line',
          code: '',
          traitsSummary: '2probe',
          mainCarries: [{ name: 'eagle', isCarry: true }],
          frontliners: [{ name: 'shield' }],
          units: [{ name: 'eagle' }, { name: 'shield' }],
        },
      },
    ],
    championAssets: {
      sprout: { name: 'sprout', cost: 1 },
      shield: { name: 'shield', cost: 1 },
      eagle: { name: 'eagle', cost: 2 },
      cub: { name: 'cub', cost: 1 },
      moth: { name: 'moth', cost: 1 },
      tiger: { name: 'tiger', cost: 2 },
      lynx: { name: 'lynx', cost: 2 },
    },
    handState: {
      active: false,
      targetNames: [],
      owned: {
        sprout: {
          name: 'sprout',
          count: 6,
          boughtCount: 6,
          benchCount: 3,
          cost: 1,
          updatedAt: 1000,
        },
        shield: {
          name: 'shield',
          count: 3,
          boughtCount: 3,
          benchCount: 0,
          cost: 1,
          updatedAt: 1000,
        },
      },
      events: [],
    },
    economyState: {
      active: true,
      round: '3-5',
      gold: 60,
      health: 80,
      level: 5,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
    knowledgeState: {
      active: false,
      shopSlots: {},
      items: {},
      streak: {},
      events: [],
    },
    contestState: {
      active: true,
      champions: {
        sprout: {
          championName: 'sprout',
          externalCopies: 6,
          playerCount: 2,
          confidence: 'observed',
          updatedAt: 1000,
        },
      },
      updatedAt: 1000,
    },
    maxTransitions: 4,
  });
  assert.equal(
    oneCostExternalContestAbandonPlan.economyAdvice.breakdown.stopLoss?.kind,
    'oneCostRerollAbandon',
  );
  assert.equal(
    oneCostExternalContestAbandonPlan.economyAdvice.breakdown.stopLoss?.severity,
    'critical',
  );
  assert.equal(oneCostExternalContestAbandonPlan.economyAdvice.action, 'level');
  assert.equal(
    oneCostExternalContestAbandonPlan.recommendedRollTargetNames.includes('sprout'),
    false,
  );
  assert.equal(
    oneCostExternalContestAbandonPlan.recommendedRollTargetNames.includes('eagle'),
    true,
  );
  assert.equal(
    oneCostExternalContestAbandonPlan.picks.find((pick) => pick.name === 'sprout')
      ?.externalContestCopies,
    6,
  );

  const contestedThreeCostStopLossPlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'contested-three-cost-stop-loss-variant',
      slot: 'A',
      name: 'Contested Three Cost',
      code: '',
      traitsSummary: '2probe',
      mainCarries: [{ name: 'mantis', isCarry: true, items: ['deathblade'] }],
      frontliners: [{ name: 'guard' }],
      units: [{ name: 'mantis' }, { name: 'guard' }],
    },
    recommendedLineups: [
      {
        id: 'same-contested-reroll',
        slug: 'same-contested-reroll',
        name: 'Same Contested Reroll',
        path: 'same-contested-reroll.json',
        quality: 'A',
        variant: {
          id: 'same-contested-reroll-variant',
          slot: 'A',
          name: 'Same Contested Reroll',
          code: '',
          traitsSummary: '2probe',
          mainCarries: [{ name: 'mantis', isCarry: true, items: ['deathblade'] }],
          frontliners: [{ name: 'guard' }],
          units: [{ name: 'mantis' }, { name: 'guard' }],
        },
      },
      {
        id: 'lateral-four-cost-shell',
        slug: 'lateral-four-cost-shell',
        name: 'Lateral Four Cost Shell',
        path: 'lateral-four-cost-shell.json',
        quality: 'B',
        variant: {
          id: 'lateral-four-cost-shell-variant',
          slot: 'B',
          name: 'Lateral Four Cost Shell',
          code: '',
          traitsSummary: '2probe',
          mainCarries: [{ name: 'dragon', isCarry: true, items: ['deathblade'] }],
          frontliners: [{ name: 'guard' }],
          units: [{ name: 'dragon' }, { name: 'guard' }],
        },
      },
    ],
    championAssets: {
      mantis: { name: 'mantis', cost: 3 },
      guard: { name: 'guard', cost: 2 },
      scout: { name: 'scout', cost: 3 },
      knight: { name: 'knight', cost: 3 },
      dragon: { name: 'dragon', cost: 4 },
    },
    itemAssets: {
      'infinity edge': {
        name: 'infinity edge',
        imagePath: 'resource_knowledge/image/item/completed/infinity_edge.png',
      },
    },
    handState: {
      active: false,
      targetNames: [],
      owned: {
        mantis: {
          name: 'mantis',
          count: 3,
          boughtCount: 3,
          benchCount: 0,
          cost: 3,
          updatedAt: 1000,
        },
        guard: {
          name: 'guard',
          count: 3,
          boughtCount: 3,
          benchCount: 0,
          cost: 2,
          updatedAt: 1000,
        },
      },
      events: [],
    },
    economyState: {
      active: true,
      round: '4-1',
      gold: 40,
      health: 52,
      level: 7,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
    knowledgeState: {
      active: false,
      shopSlots: {},
      items: {
        'completedItems:item/completed/infinity_edge.png': {
          templatePath: 'item/completed/infinity_edge.png',
          itemKind: 'completedItems',
          zones: ['inventory'],
          updatedAt: 1000,
        },
      },
      streak: {},
      events: [],
    },
    contestState: {
      active: true,
      champions: {
        mantis: {
          championName: 'mantis',
          externalCopies: 5,
          playerCount: 2,
          confidence: 'observed',
          updatedAt: 1000,
        },
      },
    },
    maxTransitions: 4,
  });
  assert.equal(
    contestedThreeCostStopLossPlan.economyAdvice.breakdown.stopLoss?.kind,
    'threeCostPivotFourCost',
  );
  assert.equal(contestedThreeCostStopLossPlan.economyAdvice.breakdown.stopLoss?.action, 'pivot');
  assert.equal(contestedThreeCostStopLossPlan.economyAdvice.action, 'level');
  assert.equal(contestedThreeCostStopLossPlan.economyAdvice.recommendedRollCount, 0);
  assert.equal(contestedThreeCostStopLossPlan.recommendedRollTargetNames.includes('mantis'), false);
  assert.equal(contestedThreeCostStopLossPlan.transitionLineups[0].name, 'Lateral Four Cost Shell');
  assert.equal(
    contestedThreeCostStopLossPlan.transitionLineups[0].scoreBreakdown.lateralPivotBonus > 0,
    true,
  );
  assert.equal(contestedThreeCostStopLossPlan.transitionLineups[0].nextAction, 'pivotSoon');
  assert.equal(
    contestedThreeCostStopLossPlan.transitionLineups[0].matchedUnitNames.includes('guard'),
    true,
  );
  assert.equal(
    contestedThreeCostStopLossPlan.transitionLineups.some(
      (lineup) =>
        lineup.name === 'Same Contested Reroll' &&
        lineup.scoreBreakdown.lateralPivotBonus > 0,
    ),
    false,
  );
  assert.equal(
    contestedThreeCostStopLossPlan.transitionLineups.some(
      (lineup) =>
        lineup.name === 'Same Contested Reroll' &&
        lineup.scoreBreakdown.pivotBlockedPenalty > 0,
    ),
    true,
  );

  const contestedThreeCostShellOnlyStopLossPlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'contested-three-cost-shell-only-stop-loss-variant',
      slot: 'A',
      name: 'Contested Three Cost Shell Only',
      code: '',
      traitsSummary: '2probe',
      mainCarries: [{ name: 'mantis', isCarry: true }],
      frontliners: [{ name: 'sentinel' }],
      units: [{ name: 'mantis' }, { name: 'sentinel' }],
    },
    recommendedLineups: [
      {
        id: 'shell-only-four-cost-line',
        slug: 'shell-only-four-cost-line',
        name: 'Shell Only Four Cost Line',
        path: 'shell-only-four-cost-line.json',
        quality: 'B',
        variant: {
          id: 'shell-only-four-cost-line-variant',
          slot: 'B',
          name: 'Shell Only Four Cost Line',
          code: '',
          traitsSummary: '2probe',
          mainCarries: [{ name: 'dragon', isCarry: true }],
          frontliners: [{ name: 'sentinel' }],
          units: [{ name: 'dragon' }, { name: 'sentinel' }],
        },
      },
    ],
    championAssets: {
      mantis: { name: 'mantis', cost: 3 },
      sentinel: { name: 'sentinel', cost: 4 },
      scout: { name: 'scout', cost: 3 },
      knight: { name: 'knight', cost: 3 },
      dragon: { name: 'dragon', cost: 4 },
    },
    handState: {
      active: false,
      targetNames: [],
      owned: {
        mantis: {
          name: 'mantis',
          count: 3,
          boughtCount: 3,
          benchCount: 0,
          cost: 3,
          updatedAt: 1000,
        },
        sentinel: {
          name: 'sentinel',
          count: 2,
          boughtCount: 2,
          benchCount: 0,
          cost: 4,
          updatedAt: 1000,
        },
      },
      events: [],
    },
    economyState: {
      active: true,
      round: '4-1',
      gold: 40,
      health: 52,
      level: 7,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
    knowledgeState: {
      active: false,
      shopSlots: {},
      items: {},
      streak: {},
      events: [],
    },
    contestState: {
      active: true,
      champions: {
        mantis: {
          championName: 'mantis',
          externalCopies: 5,
          playerCount: 2,
          confidence: 'observed',
          updatedAt: 1000,
        },
      },
    },
    maxTransitions: 4,
  });
  assert.equal(
    contestedThreeCostShellOnlyStopLossPlan.economyAdvice.breakdown.stopLoss?.kind,
    'threeCostPivotFourCost',
  );
  assert.equal(
    contestedThreeCostShellOnlyStopLossPlan.transitionLineups[0].name,
    'Shell Only Four Cost Line',
  );
  assert.equal(
    contestedThreeCostShellOnlyStopLossPlan.transitionLineups[0].matchedUnitNames.includes(
      'sentinel',
    ),
    true,
  );
  assert.equal(
    contestedThreeCostShellOnlyStopLossPlan.recommendedRollTargetNames.includes('mantis'),
    false,
  );
  assert.equal(
    contestedThreeCostShellOnlyStopLossPlan.recommendedRollTargetNames.includes('dragon'),
    true,
  );

  const twoCostLowHealthStabilizePlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'two-cost-low-health-stabilize-variant',
      slot: 'A',
      name: 'Two Cost Low Health Stabilize',
      code: '',
      traitsSummary: '2probe',
      mainCarries: [{ name: 'eagle', isCarry: true, items: ['blue buff'] }],
      frontliners: [{ name: 'bear' }],
      units: [{ name: 'eagle' }, { name: 'bear' }, { name: 'fox' }],
    },
    recommendedLineups: [
      {
        id: 'two-cost-mid-stabilize',
        slug: 'two-cost-mid-stabilize',
        name: 'Two Cost Mid Stabilize',
        path: 'two-cost-mid-stabilize.json',
        quality: 'A',
        variant: {
          id: 'two-cost-mid-stabilize-variant',
          slot: 'B',
          name: 'Two Cost Mid Stabilize',
          code: '',
          traitsSummary: '2probe',
          mainCarries: [{ name: 'sage', isCarry: true, items: ['blue buff'] }],
          frontliners: [{ name: 'bear' }],
          units: [{ name: 'sage' }, { name: 'bear' }],
        },
      },
    ],
    championAssets: {
      eagle: { name: 'eagle', cost: 2 },
      bear: { name: 'bear', cost: 2 },
      fox: { name: 'fox', cost: 2 },
      sage: { name: 'sage', cost: 3 },
      tiger: { name: 'tiger', cost: 2 },
      lynx: { name: 'lynx', cost: 2 },
    },
    itemAssets: {
      'blue buff': {
        name: 'blue buff',
        imagePath: 'resource_knowledge/image/item/completed/blue_buff.png',
      },
    },
    handState: {
      active: false,
      targetNames: [],
      owned: {
        eagle: {
          name: 'eagle',
          count: 1,
          boughtCount: 1,
          benchCount: 0,
          cost: 2,
          updatedAt: 1000,
        },
        bear: {
          name: 'bear',
          count: 1,
          boughtCount: 1,
          benchCount: 0,
          cost: 2,
          updatedAt: 1000,
        },
        fox: {
          name: 'fox',
          count: 2,
          boughtCount: 2,
          benchCount: 0,
          cost: 2,
          updatedAt: 1000,
        },
      },
      events: [],
    },
    economyState: {
      active: true,
      round: '3-2',
      gold: 32,
      health: 42,
      level: 6,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
    knowledgeState: {
      active: false,
      shopSlots: {},
      items: {
        'completedItems:item/completed/blue_buff.png': {
          templatePath: 'item/completed/blue_buff.png',
          itemKind: 'completedItems',
          zones: ['inventory'],
          updatedAt: 1000,
        },
      },
      streak: {},
      events: [],
    },
    maxTransitions: 4,
  });
  assert.equal(
    twoCostLowHealthStabilizePlan.economyAdvice.breakdown.stopLoss?.kind,
    'twoCostRerollStabilize',
  );
  assert.equal(twoCostLowHealthStabilizePlan.economyAdvice.action, 'roll');
  assert.equal(
    twoCostLowHealthStabilizePlan.economyAdvice.breakdown.formationBalance?.kind,
    'carryBeforeFrontline',
  );
  assert.equal(twoCostLowHealthStabilizePlan.recommendedRollTargetNames.includes('eagle'), true);
  assert.equal(twoCostLowHealthStabilizePlan.recommendedRollTargetNames.includes('bear'), true);
  assert.equal(twoCostLowHealthStabilizePlan.recommendedRollTargetNames.includes('fox'), false);
  assert.equal(twoCostLowHealthStabilizePlan.recommendedRollTargetNames.includes('sage'), false);

  const sideUnitStopLossPlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'side-unit-stop-loss-variant',
      slot: 'A',
      name: 'Side Unit Stop Loss',
      code: '',
      traitsSummary: '2probe',
      mainCarries: [{ name: 'eagle', isCarry: true }],
      frontliners: [{ name: 'bear' }],
      units: [{ name: 'eagle' }, { name: 'bear' }, { name: 'fox' }],
    },
    championAssets: {
      eagle: { name: 'eagle', cost: 2 },
      bear: { name: 'bear', cost: 2 },
      fox: { name: 'fox', cost: 2 },
      tiger: { name: 'tiger', cost: 2 },
    },
    handState: {
      active: false,
      targetNames: [],
      owned: {
        eagle: {
          name: 'eagle',
          count: 3,
          boughtCount: 3,
          benchCount: 0,
          cost: 2,
          updatedAt: 1000,
        },
        bear: {
          name: 'bear',
          count: 3,
          boughtCount: 3,
          benchCount: 0,
          cost: 2,
          updatedAt: 1000,
        },
        fox: {
          name: 'fox',
          count: 2,
          boughtCount: 2,
          benchCount: 0,
          cost: 2,
          updatedAt: 1000,
        },
      },
      events: [],
    },
    economyState: {
      active: true,
      round: '3-2',
      gold: 40,
      health: 68,
      level: 6,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
  });
  assert.equal(sideUnitStopLossPlan.economyAdvice.breakdown.stopLoss?.kind, 'stopRollingSideUnits');
  assert.equal(sideUnitStopLossPlan.economyAdvice.breakdown.stopLoss?.action, 'stopRolling');
  assert.equal(sideUnitStopLossPlan.economyAdvice.action, 'save');
  assert.equal(sideUnitStopLossPlan.economyAdvice.recommendedRollCount, 0);
  assert.equal(sideUnitStopLossPlan.recommendedRollTargetNames.includes('fox'), false);
  assert.equal(sideUnitStopLossPlan.recommendedRollTargetNames.includes('eagle'), false);
  assert.equal(sideUnitStopLossPlan.recommendedRollTargetNames.includes('bear'), false);

  const stableCoreSaveTargetPlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'stable-core-save-target-variant',
      slot: 'A',
      name: 'Stable Core Save Target',
      code: '',
      traitsSummary: '2probe',
      mainCarries: [{ name: 'eagle', isCarry: true }],
      frontliners: [{ name: 'bear' }],
      units: [{ name: 'eagle' }, { name: 'bear' }],
    },
    championAssets: {
      eagle: {
        name: 'eagle',
        cost: 2,
        imagePath: 'resource_knowledge/image/champion/2/eagle.png',
      },
      bear: {
        name: 'bear',
        cost: 2,
        imagePath: 'resource_knowledge/image/champion/2/bear.png',
      },
    },
    handState: {
      active: false,
      targetNames: [],
      owned: {
        eagle: {
          name: 'eagle',
          count: 3,
          boughtCount: 3,
          benchCount: 0,
          cost: 2,
          updatedAt: 1000,
        },
        bear: {
          name: 'bear',
          count: 3,
          boughtCount: 3,
          benchCount: 0,
          cost: 2,
          updatedAt: 1000,
        },
      },
      events: [],
    },
    economyState: {
      active: true,
      round: '3-2',
      gold: 40,
      health: 68,
      level: 6,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
  });
  const stableCoreSaveEagle = stableCoreSaveTargetPlan.picks.find((pick) => pick.name === 'eagle');
  const stableCoreSaveBear = stableCoreSaveTargetPlan.picks.find((pick) => pick.name === 'bear');
  assert.ok(stableCoreSaveEagle);
  assert.ok(stableCoreSaveBear);
  assert.equal(stableCoreSaveEagle.ownedCount, 3);
  assert.equal(stableCoreSaveBear.ownedCount, 3);
  assert.equal(stableCoreSaveTargetPlan.recommendedRollTargetNames.includes('eagle'), false);
  assert.equal(stableCoreSaveTargetPlan.recommendedRollTargetNames.includes('bear'), false);
  const stableCoreSaveTargets = collectGoldenSpatulaDecisionRollTargetTemplates({
    variant: {
      id: 'stable-core-save-target-variant',
      slot: 'A',
      name: 'Stable Core Save Target',
      code: '',
      traitsSummary: '2probe',
      mainCarries: [{ name: 'eagle', isCarry: true }],
      frontliners: [{ name: 'bear' }],
      units: [{ name: 'eagle' }, { name: 'bear' }],
    },
    championAssets: {
      eagle: {
        name: 'eagle',
        cost: 2,
        imagePath: 'resource_knowledge/image/champion/2/eagle.png',
      },
      bear: {
        name: 'bear',
        cost: 2,
        imagePath: 'resource_knowledge/image/champion/2/bear.png',
      },
    },
    decisionPlan: stableCoreSaveTargetPlan,
  });
  assert.equal(stableCoreSaveTargets.some((target) => target.name === 'eagle'), false);
  assert.equal(stableCoreSaveTargets.some((target) => target.name === 'bear'), false);

  const sideUnitThreeStarChaseStopLossPlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'side-unit-three-star-chase-stop-loss-variant',
      slot: 'A',
      name: 'Side Unit Three Star Chase Stop Loss',
      code: '',
      traitsSummary: '2probe',
      mainCarries: [{ name: 'eagle', isCarry: true }],
      frontliners: [{ name: 'bear' }],
      units: [
        { name: 'eagle' },
        { name: 'bear' },
        { name: 'fox', items: ['utility charm'] },
      ],
    },
    championAssets: {
      eagle: { name: 'eagle', cost: 2 },
      bear: { name: 'bear', cost: 2 },
      fox: { name: 'fox', cost: 2 },
      tiger: { name: 'tiger', cost: 2 },
    },
    handState: {
      active: false,
      targetNames: [],
      owned: {
        eagle: {
          name: 'eagle',
          count: 3,
          boughtCount: 3,
          benchCount: 0,
          cost: 2,
          updatedAt: 1000,
        },
        bear: {
          name: 'bear',
          count: 3,
          boughtCount: 3,
          benchCount: 0,
          cost: 2,
          updatedAt: 1000,
        },
        fox: {
          name: 'fox',
          count: 4,
          boughtCount: 4,
          benchCount: 1,
          cost: 2,
          updatedAt: 1000,
        },
      },
      events: [],
    },
    economyState: {
      active: true,
      round: '3-2',
      gold: 40,
      health: 68,
      level: 6,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
  });
  const sideChaseFox = sideUnitThreeStarChaseStopLossPlan.picks.find(
    (pick) => pick.name === 'fox',
  );
  assert.ok(sideChaseFox);
  assert.equal(sideChaseFox.targetCount, 6);
  assert.equal(sideChaseFox.reasons.includes('nearUpgrade'), false);
  assert.equal(
    sideUnitThreeStarChaseStopLossPlan.economyAdvice.breakdown.stopLoss?.kind,
    'stopRollingSideUnits',
  );
  assert.equal(sideUnitThreeStarChaseStopLossPlan.economyAdvice.action, 'save');
  assert.equal(sideUnitThreeStarChaseStopLossPlan.economyAdvice.recommendedRollCount, 0);
  assert.equal(sideUnitThreeStarChaseStopLossPlan.recommendedRollTargetNames.includes('fox'), false);

  const multipleSideUnitChaseStopLossPlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'multiple-side-unit-chase-stop-loss-variant',
      slot: 'A',
      name: 'Multiple Side Unit Chase Stop Loss',
      code: '',
      traitsSummary: '2probe',
      mainCarries: [{ name: 'eagle', isCarry: true }],
      frontliners: [{ name: 'bear' }],
      units: [
        { name: 'eagle' },
        { name: 'bear' },
        { name: 'fox', items: ['utility charm'] },
        { name: 'tiger', items: ['utility charm'] },
      ],
    },
    championAssets: {
      eagle: { name: 'eagle', cost: 2 },
      bear: { name: 'bear', cost: 2 },
      fox: { name: 'fox', cost: 2 },
      tiger: { name: 'tiger', cost: 2 },
    },
    handState: {
      active: false,
      targetNames: [],
      owned: {
        eagle: {
          name: 'eagle',
          count: 3,
          boughtCount: 3,
          benchCount: 0,
          cost: 2,
          updatedAt: 1000,
        },
        bear: {
          name: 'bear',
          count: 3,
          boughtCount: 3,
          benchCount: 0,
          cost: 2,
          updatedAt: 1000,
        },
        fox: {
          name: 'fox',
          count: 4,
          boughtCount: 4,
          benchCount: 1,
          cost: 2,
          updatedAt: 1000,
        },
        tiger: {
          name: 'tiger',
          count: 4,
          boughtCount: 4,
          benchCount: 1,
          cost: 2,
          updatedAt: 1000,
        },
      },
      events: [],
    },
    economyState: {
      active: true,
      round: '3-2',
      gold: 40,
      health: 68,
      level: 6,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
  });
  const multipleSideChaseFox = multipleSideUnitChaseStopLossPlan.picks.find(
    (pick) => pick.name === 'fox',
  );
  const multipleSideChaseTiger = multipleSideUnitChaseStopLossPlan.picks.find(
    (pick) => pick.name === 'tiger',
  );
  assert.ok(multipleSideChaseFox);
  assert.ok(multipleSideChaseTiger);
  assert.equal(multipleSideChaseFox.targetCount, 6);
  assert.equal(multipleSideChaseTiger.targetCount, 6);
  assert.equal(
    multipleSideUnitChaseStopLossPlan.economyAdvice.breakdown.stopLoss?.kind,
    'stopRollingSideUnits',
  );
  assert.equal(multipleSideUnitChaseStopLossPlan.economyAdvice.action, 'save');
  assert.equal(
    multipleSideUnitChaseStopLossPlan.recommendedRollTargetNames.includes('fox'),
    false,
  );
  assert.equal(
    multipleSideUnitChaseStopLossPlan.recommendedRollTargetNames.includes('tiger'),
    false,
  );

  const lowHealthSideUnitChasePlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'low-health-side-unit-chase-variant',
      slot: 'A',
      name: 'Low Health Side Unit Chase',
      code: '',
      traitsSummary: '2probe',
      mainCarries: [{ name: 'eagle', isCarry: true }],
      frontliners: [{ name: 'bear' }],
      units: [
        { name: 'eagle' },
        { name: 'bear' },
        { name: 'fox', items: ['utility charm'] },
      ],
    },
    championAssets: {
      eagle: { name: 'eagle', cost: 2 },
      bear: { name: 'bear', cost: 2 },
      fox: { name: 'fox', cost: 2 },
      tiger: { name: 'tiger', cost: 2 },
    },
    handState: {
      active: false,
      targetNames: [],
      owned: {
        eagle: {
          name: 'eagle',
          count: 3,
          boughtCount: 3,
          benchCount: 0,
          cost: 2,
          updatedAt: 1000,
        },
        bear: {
          name: 'bear',
          count: 3,
          boughtCount: 3,
          benchCount: 0,
          cost: 2,
          updatedAt: 1000,
        },
        fox: {
          name: 'fox',
          count: 4,
          boughtCount: 4,
          benchCount: 1,
          cost: 2,
          updatedAt: 1000,
        },
      },
      events: [],
    },
    economyState: {
      active: true,
      round: '3-2',
      gold: 30,
      health: 28,
      level: 6,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
  });
  assert.notEqual(
    lowHealthSideUnitChasePlan.economyAdvice.breakdown.stopLoss?.kind,
    'stopRollingSideUnits',
  );

  const frontlineFirstPlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'frontline-first-variant',
      slot: 'A',
      name: 'Frontline First',
      code: '',
      traitsSummary: '2probe',
      mainCarries: [{ name: 'eagle', isCarry: true }],
      frontliners: [{ name: 'bear' }],
      units: [{ name: 'eagle' }, { name: 'bear' }],
    },
    championAssets: {
      eagle: { name: 'eagle', cost: 2 },
      bear: { name: 'bear', cost: 2 },
      tiger: { name: 'tiger', cost: 2 },
      lynx: { name: 'lynx', cost: 2 },
    },
    handState: {
      active: false,
      targetNames: [],
      owned: {
        eagle: {
          name: 'eagle',
          count: 3,
          boughtCount: 3,
          benchCount: 0,
          cost: 2,
          updatedAt: 1000,
        },
        bear: {
          name: 'bear',
          count: 1,
          boughtCount: 1,
          benchCount: 0,
          cost: 2,
          updatedAt: 1000,
        },
      },
      events: [],
    },
    economyState: {
      active: true,
      round: '3-2',
      gold: 40,
      health: 42,
      level: 6,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
  });
  assert.equal(frontlineFirstPlan.economyAdvice.breakdown.formationBalance?.kind, 'frontlineFirst');
  assert.deepEqual(
    frontlineFirstPlan.economyAdvice.breakdown.formationBalance?.priorityTargetNames,
    ['bear'],
  );
  assert.equal(frontlineFirstPlan.economyAdvice.urgentPickNames[0], 'bear');
  assert.equal(frontlineFirstPlan.recommendedRollTargetNames[0], 'bear');
  assert.equal(frontlineFirstPlan.economyAdvice.action, 'roll');

  const frontlineBeforeCarryChasePlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'frontline-before-carry-chase-variant',
      slot: 'A',
      name: 'Frontline Before Carry Chase',
      code: '',
      traitsSummary: '2probe',
      mainCarries: [{ name: 'eagle', isCarry: true }],
      frontliners: [{ name: 'bear' }],
      units: [{ name: 'eagle' }, { name: 'bear' }],
    },
    championAssets: {
      eagle: { name: 'eagle', cost: 2 },
      bear: { name: 'bear', cost: 2 },
      tiger: { name: 'tiger', cost: 2 },
      lynx: { name: 'lynx', cost: 2 },
    },
    handState: {
      active: false,
      targetNames: [],
      owned: {
        eagle: {
          name: 'eagle',
          count: 5,
          boughtCount: 5,
          benchCount: 2,
          cost: 2,
          updatedAt: 1000,
        },
        bear: {
          name: 'bear',
          count: 1,
          boughtCount: 1,
          benchCount: 0,
          cost: 2,
          updatedAt: 1000,
        },
      },
      events: [],
    },
    economyState: {
      active: true,
      round: '3-5',
      gold: 42,
      health: 44,
      level: 6,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
    knowledgeState: {
      active: false,
      shopSlots: {
        1: {
          slotIndex: 1,
          championName: 'eagle',
          confidence: 'matched',
          updatedAt: 1000,
        },
      },
      items: {},
      streak: {},
      events: [],
    },
  });
  const carryChaseEagle = frontlineBeforeCarryChasePlan.picks.find(
    (pick) => pick.name === 'eagle',
  );
  assert.ok(carryChaseEagle);
  assert.equal(carryChaseEagle.reasons.includes('nearUpgrade'), true);
  assert.equal(
    frontlineBeforeCarryChasePlan.economyAdvice.breakdown.formationBalance?.kind,
    'frontlineFirst',
  );
  assert.deepEqual(
    frontlineBeforeCarryChasePlan.economyAdvice.breakdown.formationBalance
      ?.deprioritizedTargetNames,
    ['eagle'],
  );
  assert.equal(frontlineBeforeCarryChasePlan.economyAdvice.urgentPickNames.includes('eagle'), false);
  assert.equal(frontlineBeforeCarryChasePlan.recommendedRollTargetNames.includes('eagle'), false);
  assert.equal(frontlineBeforeCarryChasePlan.recommendedRollTargetNames[0], 'bear');

  const carryFirstPlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'carry-first-variant',
      slot: 'A',
      name: 'Carry First',
      code: '',
      traitsSummary: '2probe',
      mainCarries: [{ name: 'eagle', isCarry: true, items: ['blue buff'] }],
      frontliners: [{ name: 'bear' }],
      units: [{ name: 'eagle' }, { name: 'bear' }],
    },
    championAssets: {
      eagle: { name: 'eagle', cost: 2 },
      bear: { name: 'bear', cost: 2 },
      tiger: { name: 'tiger', cost: 2 },
      lynx: { name: 'lynx', cost: 2 },
    },
    itemAssets: {
      'blue buff': {
        name: 'blue buff',
        imagePath: 'resource_knowledge/image/item/completed/blue_buff.png',
      },
    },
    handState: {
      active: false,
      targetNames: [],
      owned: {
        eagle: {
          name: 'eagle',
          count: 1,
          boughtCount: 1,
          benchCount: 0,
          cost: 2,
          updatedAt: 1000,
        },
        bear: {
          name: 'bear',
          count: 3,
          boughtCount: 3,
          benchCount: 0,
          cost: 2,
          updatedAt: 1000,
        },
      },
      events: [],
    },
    economyState: {
      active: true,
      round: '3-2',
      gold: 40,
      health: 70,
      level: 6,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
    knowledgeState: {
      active: false,
      shopSlots: {},
      items: {
        'completedItems:item/completed/blue_buff.png': {
          templatePath: 'item/completed/blue_buff.png',
          itemKind: 'completedItems',
          zones: ['inventory'],
          updatedAt: 1000,
        },
      },
      streak: {},
      events: [],
    },
  });
  assert.equal(carryFirstPlan.economyAdvice.breakdown.formationBalance?.kind, 'carryFirst');
  assert.deepEqual(carryFirstPlan.economyAdvice.breakdown.formationBalance?.priorityTargetNames, [
    'eagle',
  ]);
  assert.equal(carryFirstPlan.economyAdvice.urgentPickNames[0], 'eagle');
  assert.equal(carryFirstPlan.recommendedRollTargetNames[0], 'eagle');

  const unknownAcquisition = estimateGoldenSpatulaAcquisition({
    shopOddsAvailability: 'unknown',
    cost: 3,
    copiesNeeded: 1,
    gold: 40,
    costDensity: { byCost: { 3: 6 }, fallbackDensity: 6 },
  });
  assert.equal(Math.round(unknownAcquisition.targetSlotOdds * 1000), 10);
  assert.ok(Number.isFinite(unknownAcquisition.expectedRollsToFindCopies));

  const blockedTransitionUnit = scoreGoldenSpatulaTransitionUnit({
    role: 'carry',
    isCoreUnit: true,
    activeMatch: false,
    ownedCount: 0,
    shopVisibleCount: 0,
    shopOdds: 0,
    shopOddsAvailability: 'unavailable',
    itemFit: { score: 0, count: 0, names: [] },
    acquisition: {},
    tempo: { rollPriorityBonus: 0, scoreMultiplier: 1, reasons: [] },
  });
  assert.equal(blockedTransitionUnit.blocked, true);
  assert.equal(blockedTransitionUnit.reachableCore, false);
  assert.equal(blockedTransitionUnit.score, -34);

  const visibleTransitionUnit = scoreGoldenSpatulaTransitionUnit({
    role: 'carry',
    isCoreUnit: true,
    activeMatch: true,
    ownedCount: 2,
    shopVisibleCount: 1,
    shopOdds: 0.25,
    shopOddsAvailability: 'available',
    itemFit: { score: 40, count: 1, names: ['blue buff'] },
    acquisition: { completionChance: 0.5 },
    tempo: { rollPriorityBonus: 10, scoreMultiplier: 1.1, reasons: [] },
  });
  assert.equal(visibleTransitionUnit.blocked, false);
  assert.equal(visibleTransitionUnit.reachableCore, true);
  assert.ok(visibleTransitionUnit.score > 80);

  const levelLockedPlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: makeVariant({
      id: 'variant-five-cost',
      traitsSummary: '3新星特攻队2堡垒卫士',
      mainCarries: [{ name: '薇古丝', isCarry: true }],
      frontliners: [{ name: '拉莫斯' }],
      units: [{ name: '薇古丝' }, { name: '拉莫斯' }],
    }),
    recommendedLineups,
    championAssets,
    handState: { active: false, targetNames: [], owned: {}, events: [] },
    economyState: {
      active: true,
      gold: 40,
      level: 5,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
  });
  assert.equal(
    levelLockedPlan.picks.some((pick) => pick.name === '薇古丝'),
    false,
  );
  assert.equal(levelLockedPlan.recommendedRollTargetNames.includes('薇古丝'), false);
  assert.equal(levelLockedPlan.economyAdvice.urgentPickNames.includes('薇古丝'), false);
  assert.ok(levelLockedPlan.economyAdvice.breakdown.levelLockedPickCount > 0);

  const lockedAsciiPlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'locked-ascii',
      slot: 'A',
      name: 'Locked ASCII',
      code: '',
      traitsSummary: '1dragon',
      mainCarries: [{ name: 'dragon', isCarry: true, items: ['mythic staff'] }],
      frontliners: [],
      units: [{ name: 'dragon' }],
    },
    championAssets: {
      dragon: { name: 'dragon', cost: 5, traits: ['dragon'] },
    },
    itemAssets: {
      'mythic staff': {
        name: 'mythic staff',
        imagePath: 'resource_knowledge/image/item/special/mythic_staff.png',
      },
    },
    handState: { active: false, targetNames: [], owned: {}, events: [] },
    economyState: {
      active: true,
      gold: 40,
      level: 5,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
    knowledgeState: {
      active: false,
      shopSlots: {},
      items: {
        'specialItems:item/special/mythic_staff.png': {
          templatePath: 'item/special/mythic_staff.png',
          itemKind: 'specialItems',
          zones: ['inventory'],
          updatedAt: 1000,
        },
      },
      streak: {},
      events: [],
    },
  });
  assert.equal(
    lockedAsciiPlan.picks.some((pick) => pick.name === 'dragon'),
    false,
  );
  assert.equal(lockedAsciiPlan.recommendedRollTargetNames.includes('dragon'), false);
  assert.equal(lockedAsciiPlan.economyAdvice.action, 'level');
  assert.ok(lockedAsciiPlan.economyAdvice.breakdown.levelLockedPickCount > 0);

  const observedZeroOddsPlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'observed-zero-odds',
      slot: 'A',
      name: 'Observed Zero Odds',
      code: '',
      traitsSummary: '2probe',
      mainCarries: [{ name: 'dragon', isCarry: true }],
      frontliners: [],
      units: [{ name: 'dragon' }, { name: 'eagle' }],
    },
    championAssets: {
      dragon: {
        name: 'dragon',
        cost: 4,
        imagePath: 'resource_knowledge/image/champion/4/dragon.png',
      },
      eagle: {
        name: 'eagle',
        cost: 2,
        imagePath: 'resource_knowledge/image/champion/2/eagle.png',
      },
      bear: {
        name: 'bear',
        cost: 2,
        imagePath: 'resource_knowledge/image/champion/2/bear.png',
      },
    },
    handState: { active: false, targetNames: [], owned: {}, events: [] },
    economyState: {
      active: true,
      gold: 40,
      level: 8,
      shopOdds: { 2: 25, 4: 0 },
      shopOddsSource: 'ocr',
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
  });
  assert.equal(
    observedZeroOddsPlan.picks.some((pick) => pick.name === 'dragon'),
    false,
  );
  assert.equal(observedZeroOddsPlan.recommendedRollTargetNames.includes('dragon'), false);
  assert.equal(observedZeroOddsPlan.economyAdvice.urgentPickNames.includes('dragon'), false);
  assert.equal(
    observedZeroOddsPlan.picks.some((pick) => pick.name === 'eagle'),
    true,
  );
  const visibleZeroOddsPlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'visible-zero-odds',
      slot: 'A',
      name: 'Visible Zero Odds',
      code: '',
      traitsSummary: '2probe',
      mainCarries: [{ name: 'dragon', isCarry: true }],
      frontliners: [],
      units: [{ name: 'dragon' }, { name: 'eagle' }],
    },
    championAssets: {
      dragon: {
        name: 'dragon',
        cost: 4,
        imagePath: 'resource_knowledge/image/champion/4/dragon.png',
      },
      eagle: {
        name: 'eagle',
        cost: 2,
        imagePath: 'resource_knowledge/image/champion/2/eagle.png',
      },
      bear: {
        name: 'bear',
        cost: 2,
        imagePath: 'resource_knowledge/image/champion/2/bear.png',
      },
    },
    handState: { active: false, targetNames: [], owned: {}, events: [] },
    economyState: {
      active: true,
      gold: 40,
      level: 8,
      shopOdds: { 2: 25, 4: 0 },
      shopOddsSource: 'ocr',
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
    knowledgeState: {
      active: false,
      shopSlots: {
        1: {
          slotIndex: 1,
          slotLabel: '1',
          championName: 'dragon',
          templatePath: 'champion/4/dragon.png',
          confidence: 'matched',
          updatedAt: 1000,
        },
      },
      items: {},
      streak: {},
      events: [],
    },
  });
  const visibleZeroOddsDragon = visibleZeroOddsPlan.picks.find((pick) => pick.name === 'dragon');
  assert.ok(visibleZeroOddsDragon);
  assert.equal(visibleZeroOddsDragon.shopOddsAvailability, 'unavailable');
  assert.equal(visibleZeroOddsDragon.shopVisibleCount, 1);
  assert.equal(visibleZeroOddsDragon.reasons.includes('shopVisible'), true);
  assert.ok(visibleZeroOddsDragon.score > 0);
  assert.equal(visibleZeroOddsDragon.rollTargetPriority, 0);
  assert.equal(visibleZeroOddsPlan.recommendedRollTargetNames.includes('dragon'), true);
  const visibleZeroOddsDecisionTargets = collectGoldenSpatulaDecisionRollTargetTemplates({
    variant: {
      id: 'visible-zero-odds',
      slot: 'A',
      name: 'Visible Zero Odds',
      code: '',
      traitsSummary: '2probe',
      mainCarries: [{ name: 'dragon', isCarry: true }],
      frontliners: [],
      units: [{ name: 'dragon' }, { name: 'eagle' }],
    },
    championAssets: {
      dragon: {
        name: 'dragon',
        cost: 4,
        imagePath: 'resource_knowledge/image/champion/4/dragon.png',
      },
      eagle: {
        name: 'eagle',
        cost: 2,
        imagePath: 'resource_knowledge/image/champion/2/eagle.png',
      },
    },
    decisionPlan: visibleZeroOddsPlan,
  });
  assert.equal(
    visibleZeroOddsDecisionTargets.some((target) => target.name === 'dragon'),
    true,
  );

  const observedZeroOddsTargets = collectGoldenSpatulaRollTargetTemplates({
    variant: {
      id: 'observed-zero-odds',
      slot: 'A',
      name: 'Observed Zero Odds',
      code: '',
      traitsSummary: '2probe',
      mainCarries: [{ name: 'dragon', isCarry: true }],
      frontliners: [],
      units: [{ name: 'dragon' }, { name: 'eagle' }, { name: 'bear' }],
      rollTargetNames: ['dragon', 'bear'],
    },
    championAssets: {
      dragon: {
        name: 'dragon',
        cost: 4,
        imagePath: 'resource_knowledge/image/champion/4/dragon.png',
      },
      eagle: {
        name: 'eagle',
        cost: 2,
        imagePath: 'resource_knowledge/image/champion/2/eagle.png',
      },
      bear: {
        name: 'bear',
        cost: 2,
        imagePath: 'resource_knowledge/image/champion/2/bear.png',
      },
    },
    preferredNames: observedZeroOddsPlan.recommendedRollTargetNames,
    includeVariantTargets: false,
  });
  assert.deepEqual(
    observedZeroOddsTargets.map((target) => target.name),
    ['eagle'],
  );
  assert.deepEqual(
    observedZeroOddsTargets.map((target) => target.templatePath),
    ['champion/2/eagle.png'],
  );
  const observedZeroOddsDecisionTargets = collectGoldenSpatulaDecisionRollTargetTemplates({
    variant: {
      id: 'observed-zero-odds',
      slot: 'A',
      name: 'Observed Zero Odds',
      code: '',
      traitsSummary: '2probe',
      mainCarries: [{ name: 'dragon', isCarry: true }],
      frontliners: [],
      units: [{ name: 'dragon' }, { name: 'eagle' }, { name: 'bear' }],
      rollTargetNames: ['dragon', 'bear'],
    },
    championAssets: {
      dragon: {
        name: 'dragon',
        cost: 4,
        imagePath: 'resource_knowledge/image/champion/4/dragon.png',
      },
      eagle: {
        name: 'eagle',
        cost: 2,
        imagePath: 'resource_knowledge/image/champion/2/eagle.png',
      },
      bear: {
        name: 'bear',
        cost: 2,
        imagePath: 'resource_knowledge/image/champion/2/bear.png',
      },
    },
    decisionPlan: observedZeroOddsPlan,
  });
  assert.deepEqual(
    observedZeroOddsDecisionTargets.map((target) => target.name),
    ['eagle'],
  );
  const manualFallbackTargets = collectGoldenSpatulaRollTargetTemplates({
    variant: {
      id: 'manual-fallback',
      slot: 'A',
      name: 'Manual Fallback',
      code: '',
      traitsSummary: '2probe',
      mainCarries: [],
      frontliners: [],
      units: [{ name: 'dragon' }, { name: 'bear' }],
      rollTargetNames: ['dragon', 'bear'],
    },
    championAssets: {
      dragon: {
        name: 'dragon',
        cost: 4,
        imagePath: 'resource_knowledge/image/champion/4/dragon.png',
      },
      bear: {
        name: 'bear',
        cost: 2,
        imagePath: 'resource_knowledge/image/champion/2/bear.png',
      },
    },
  });
  assert.deepEqual(
    manualFallbackTargets.map((target) => target.name),
    ['dragon', 'bear'],
  );
  const emptyDecisionFallbackTargets = collectGoldenSpatulaDecisionRollTargetTemplates({
    variant: {
      id: 'empty-decision-fallback',
      slot: 'A',
      name: 'Empty Decision Fallback',
      code: '',
      traitsSummary: '2probe',
      mainCarries: [],
      frontliners: [],
      units: [{ name: 'dragon' }, { name: 'bear' }],
      rollTargetNames: ['dragon', 'bear'],
    },
    championAssets: {
      dragon: {
        name: 'dragon',
        cost: 4,
        imagePath: 'resource_knowledge/image/champion/4/dragon.png',
      },
      bear: {
        name: 'bear',
        cost: 2,
        imagePath: 'resource_knowledge/image/champion/2/bear.png',
      },
    },
    decisionPlan: {
      evaluatedCandidates: 0,
      recommendedRollTargetNames: [],
    },
  });
  assert.deepEqual(
    emptyDecisionFallbackTargets.map((target) => target.name),
    ['dragon', 'bear'],
  );

  const fastPathPlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'probe-variant',
      slot: 'A',
      name: 'Probe',
      code: '',
      traitsSummary: '2probe',
      mainCarries: [],
      frontliners: [],
      units: [{ name: 'eagle' }, { name: 'bear' }],
    },
    championAssets: {
      eagle: { name: 'eagle', cost: 2 },
      bear: { name: 'bear', cost: 2 },
      tiger: { name: 'tiger', cost: 2 },
      lynx: { name: 'lynx', cost: 2 },
      rhino: { name: 'rhino', cost: 2 },
    },
    handState: {
      active: false,
      targetNames: [],
      owned: {
        eagle: {
          name: 'eagle',
          count: 1,
          boughtCount: 1,
          benchCount: 0,
          cost: 2,
          updatedAt: 1000,
        },
      },
      events: [],
    },
    economyState: {
      active: true,
      gold: 40,
      level: 7,
      shopOdds: { 2: 0.4, 5: 0.01 },
      shopOddsSource: 'ocr',
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
  });

  assert.equal(fastPathPlan.picks[0].name, 'eagle');
  assert.equal(fastPathPlan.picks[0].copiesNeeded, 2);
  assert.equal(fastPathPlan.picks[0].shopOdds, 0.4);

  const visibleShopPlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'shop-visible-variant',
      slot: 'A',
      name: 'Shop Visible',
      code: '',
      traitsSummary: '2probe',
      mainCarries: [],
      frontliners: [],
      units: [{ name: 'eagle' }, { name: 'bear' }],
    },
    championAssets: {
      eagle: { name: 'eagle', cost: 2 },
      bear: { name: 'bear', cost: 2 },
      tiger: { name: 'tiger', cost: 2 },
      lynx: { name: 'lynx', cost: 2 },
      rhino: { name: 'rhino', cost: 2 },
    },
    handState: { active: false, targetNames: [], owned: {}, events: [] },
    economyState: {
      active: true,
      gold: 40,
      level: 7,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
    knowledgeState: {
      active: false,
      shopSlots: {
        1: {
          slotIndex: 1,
          championName: 'eagle',
          confidence: 'matched',
          updatedAt: 1000,
        },
      },
      items: {},
      streak: {},
      events: [],
    },
  });
  assert.equal(visibleShopPlan.picks[0].name, 'eagle');
  assert.equal(visibleShopPlan.picks[0].shopVisibleCount, 1);
  assert.equal(visibleShopPlan.picks[0].reasons.includes('shopVisible'), true);
  assert.equal(
    visibleShopPlan.picks[0].acquisitionExpectedRolls <
      visibleShopPlan.picks[1].acquisitionExpectedRolls,
    true,
  );

  const itemFitPlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'item-fit-variant',
      slot: 'A',
      name: 'Item Fit',
      code: '',
      traitsSummary: '2probe',
      mainCarries: [
        { name: 'eagle', isCarry: true, items: ['blue buff'] },
        { name: 'bear', isCarry: true, items: ['tank vest'] },
      ],
      frontliners: [],
      units: [{ name: 'eagle' }, { name: 'bear' }],
    },
    championAssets: {
      eagle: { name: 'eagle', cost: 2 },
      bear: { name: 'bear', cost: 2 },
      tiger: { name: 'tiger', cost: 2 },
      lynx: { name: 'lynx', cost: 2 },
      rhino: { name: 'rhino', cost: 2 },
    },
    itemAssets: {
      'blue buff': {
        name: 'blue buff',
        imagePath: 'resource_knowledge/image/item/completed/blue_buff.png',
      },
    },
    handState: { active: false, targetNames: [], owned: {}, events: [] },
    economyState: {
      active: true,
      gold: 40,
      level: 7,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
    knowledgeState: {
      active: false,
      shopSlots: {},
      items: {
        'completedItems:item/completed/blue_buff.png': {
          templatePath: 'item/completed/blue_buff.png',
          itemKind: 'completedItems',
          zones: ['inventory'],
          updatedAt: 1000,
        },
      },
      streak: {},
      events: [],
    },
  });
  assert.equal(itemFitPlan.picks[0].name, 'eagle');
  assert.equal(itemFitPlan.picks[0].observedItemMatchCount, 1);
  assert.deepEqual(itemFitPlan.picks[0].matchedItemNames, ['blue buff']);
  assert.equal(itemFitPlan.picks[0].reasons.includes('itemFit'), true);
  assert.equal(itemFitPlan.picks[0].score > itemFitPlan.picks[1].score, true);

  const transitionSignalPlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'transition-source',
      slot: 'A',
      name: 'Transition Source',
      code: '',
      traitsSummary: '2probe',
      mainCarries: [],
      frontliners: [],
      units: [{ name: 'bear' }],
    },
    recommendedLineups: [
      {
        id: 'locked-dragon',
        slug: 'locked-dragon',
        name: 'Locked Dragon',
        path: 'locked-dragon.json',
        quality: 'S',
        variant: {
          id: 'locked-dragon-variant',
          slot: 'A',
          name: 'Locked Dragon',
          code: '',
          traitsSummary: '2dragon',
          mainCarries: [{ name: 'dragon', isCarry: true }],
          frontliners: [{ name: 'rhino' }],
          units: [{ name: 'dragon' }, { name: 'rhino' }],
        },
      },
      {
        id: 'shop-item-bridge',
        slug: 'shop-item-bridge',
        name: 'Shop Item Bridge',
        path: 'shop-item-bridge.json',
        quality: 'A',
        variant: {
          id: 'shop-item-bridge-variant',
          slot: 'B',
          name: 'Shop Item Bridge',
          code: '',
          traitsSummary: '2probe',
          mainCarries: [{ name: 'eagle', isCarry: true, items: ['blue buff'] }],
          frontliners: [{ name: 'bear' }],
          units: [{ name: 'eagle' }, { name: 'bear' }],
        },
      },
    ],
    championAssets: {
      dragon: { name: 'dragon', cost: 5 },
      rhino: { name: 'rhino', cost: 4 },
      eagle: { name: 'eagle', cost: 2 },
      bear: { name: 'bear', cost: 2 },
      tiger: { name: 'tiger', cost: 2 },
      lynx: { name: 'lynx', cost: 2 },
    },
    itemAssets: {
      'blue buff': {
        name: 'blue buff',
        imagePath: 'resource_knowledge/image/item/completed/blue_buff.png',
      },
    },
    handState: {
      active: false,
      targetNames: [],
      owned: {
        bear: {
          name: 'bear',
          count: 1,
          boughtCount: 1,
          benchCount: 0,
          cost: 2,
          updatedAt: 1000,
        },
      },
      events: [],
    },
    economyState: {
      active: true,
      round: '3-2',
      gold: 32,
      level: 5,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
    knowledgeState: {
      active: false,
      shopSlots: {
        1: {
          slotIndex: 1,
          championName: 'eagle',
          confidence: 'matched',
          updatedAt: 1000,
        },
      },
      items: {
        'completedItems:item/completed/blue_buff.png': {
          templatePath: 'item/completed/blue_buff.png',
          itemKind: 'completedItems',
          zones: ['inventory'],
          updatedAt: 1000,
        },
      },
      streak: {},
      events: [],
    },
  });
  assert.equal(transitionSignalPlan.transitionLineups[0].name, 'Shop Item Bridge');
  assert.equal(
    transitionSignalPlan.transitionLineups[0].scoreBreakdown.final,
    transitionSignalPlan.transitionLineups[0].score,
  );
  assert.ok(transitionSignalPlan.transitionLineups[0].scoreBreakdown.unitScore > 0);
  assert.ok(transitionSignalPlan.transitionLineups[0].scoreBreakdown.coreReachRatio > 0);
  assert.deepEqual(transitionSignalPlan.transitionLineups[0].shopVisibleUnitNames, ['eagle']);
  assert.deepEqual(transitionSignalPlan.transitionLineups[0].itemFitNames, ['blue buff']);
  assert.equal(
    transitionSignalPlan.transitionLineups.some(
      (lineup) =>
        lineup.name === 'Locked Dragon' &&
        lineup.score > transitionSignalPlan.transitionLineups[0].score,
    ),
    false,
  );

  const itemFamilyTransitionPlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'item-family-source',
      slot: 'A',
      name: 'Item Family Source',
      code: '',
      traitsSummary: '2probe',
      mainCarries: [],
      frontliners: [],
      units: [{ name: 'bear' }],
    },
    recommendedLineups: [
      {
        id: 'expensive-no-bridge',
        slug: 'expensive-no-bridge',
        name: 'Expensive No Bridge',
        path: 'expensive-no-bridge.json',
        quality: 'S',
        variant: {
          id: 'expensive-no-bridge-variant',
          slot: 'A',
          name: 'Expensive No Bridge',
          code: '',
          traitsSummary: '2dragon',
          mainCarries: [{ name: 'dragon', isCarry: true }],
          frontliners: [{ name: 'rhino' }],
          units: [{ name: 'dragon' }, { name: 'rhino' }],
        },
      },
      {
        id: 'terminal-ad-cap',
        slug: 'terminal-ad-cap',
        name: 'Terminal AD Cap',
        path: 'terminal-ad-cap.json',
        quality: 'S',
        variant: {
          id: 'terminal-ad-cap-variant',
          slot: 'A',
          name: 'Terminal AD Cap',
          code: '',
          traitsSummary: '2dragon',
          mainCarries: [{ name: 'dragon', isCarry: true, items: ['deathblade'] }],
          frontliners: [{ name: 'rhino' }],
          units: [{ name: 'dragon' }, { name: 'rhino' }, { name: 'phoenix' }],
        },
      },
      {
        id: 'ad-family-bridge',
        slug: 'ad-family-bridge',
        name: 'AD Family Bridge',
        path: 'ad-family-bridge.json',
        quality: 'A',
        variant: {
          id: 'ad-family-bridge-variant',
          slot: 'B',
          name: 'AD Family Bridge',
          code: '',
          traitsSummary: '2probe',
          mainCarries: [{ name: 'eagle', isCarry: true, items: ['deathblade'] }],
          frontliners: [{ name: 'bear' }],
          units: [{ name: 'eagle' }, { name: 'bear' }],
        },
      },
    ],
    championAssets: {
      dragon: { name: 'dragon', cost: 5 },
      rhino: { name: 'rhino', cost: 4 },
      eagle: { name: 'eagle', cost: 2 },
      bear: { name: 'bear', cost: 2 },
      tiger: { name: 'tiger', cost: 2 },
      lynx: { name: 'lynx', cost: 2 },
      phoenix: { name: 'phoenix', cost: 4 },
    },
    itemAssets: {
      'infinity edge': {
        name: 'infinity edge',
        imagePath: 'resource_knowledge/image/item/completed/infinity_edge.png',
      },
    },
    handState: {
      active: false,
      targetNames: [],
      owned: {
        bear: {
          name: 'bear',
          count: 1,
          boughtCount: 1,
          benchCount: 0,
          cost: 2,
          updatedAt: 1000,
        },
      },
      events: [],
    },
    economyState: {
      active: true,
      round: '3-2',
      gold: 32,
      level: 6,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
    knowledgeState: {
      active: false,
      shopSlots: {},
      items: {
        'completedItems:item/completed/infinity_edge.png': {
          templatePath: 'item/completed/infinity_edge.png',
          itemKind: 'completedItems',
          zones: ['inventory'],
          updatedAt: 1000,
        },
      },
      streak: {},
      events: [],
    },
  });
  assert.equal(itemFamilyTransitionPlan.transitionLineups[0].name, 'AD Family Bridge');
  assert.deepEqual(itemFamilyTransitionPlan.transitionLineups[0].itemFitNames, []);
  assert.deepEqual(itemFamilyTransitionPlan.transitionLineups[0].itemFamilyNames, [
    'infinity edge',
  ]);
  assert.deepEqual(itemFamilyTransitionPlan.transitionLineups[0].itemFamilyUnitNames, ['eagle']);
  assert.ok(itemFamilyTransitionPlan.transitionLineups[0].scoreBreakdown.itemFamilyScore > 0);
  assert.equal(itemFamilyTransitionPlan.transitionLineups[0].scoreBreakdown.itemBridgeScore, 0);
  assert.equal(itemFamilyTransitionPlan.transitionLineups[0].nextAction, 'holdBridge');
  assert.equal(
    itemFamilyTransitionPlan.transitionLineups[0].routeUnits
      ?.find((unit) => unit.name === 'eagle')
      ?.tags?.includes('item'),
    true,
  );
  assert.equal(
    itemFamilyTransitionPlan.transitionLineups.some(
      (lineup) =>
        lineup.name === 'Expensive No Bridge' &&
        lineup.score > itemFamilyTransitionPlan.transitionLineups[0].score,
    ),
    false,
  );
  assert.equal(
    itemFamilyTransitionPlan.transitionLineups.some(
      (lineup) => lineup.name === 'Terminal AD Cap',
    ),
    false,
  );
  assert.equal(itemFamilyTransitionPlan.recommendedRollTargetNames.includes('eagle'), true);
  assert.equal(itemFamilyTransitionPlan.recommendedRollTargetNames.includes('dragon'), false);

  const spellCycleFrontlinePlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'spell-cycle-source',
      slot: 'A',
      name: 'Spell Cycle Source',
      code: '',
      traitsSummary: '2mage',
      mainCarries: [],
      frontliners: [{ name: 'bear' }],
      units: [{ name: 'bear' }],
    },
    recommendedLineups: [
      {
        id: 'ap-no-front',
        slug: 'ap-no-front',
        name: 'AP No Front',
        path: 'ap-no-front.json',
        quality: 'S',
        variant: {
          id: 'ap-no-front-variant',
          slot: 'A',
          name: 'AP No Front',
          code: '',
          traitsSummary: '2mage',
          mainCarries: [{ name: 'mage', isCarry: true, items: ['spear of shojin'] }],
          frontliners: [],
          units: [{ name: 'mage' }],
        },
      },
      {
        id: 'ap-protected-shell',
        slug: 'ap-protected-shell',
        name: 'AP Protected Shell',
        path: 'ap-protected-shell.json',
        quality: 'A',
        variant: {
          id: 'ap-protected-shell-variant',
          slot: 'B',
          name: 'AP Protected Shell',
          code: '',
          traitsSummary: '2mage',
          mainCarries: [{ name: 'mage', isCarry: true, items: ['spear of shojin'] }],
          frontliners: [{ name: 'bear' }],
          units: [{ name: 'mage' }, { name: 'bear' }],
        },
      },
    ],
    championAssets: {
      mage: { name: 'mage', cost: 2 },
      bear: { name: 'bear', cost: 2 },
      tiger: { name: 'tiger', cost: 2 },
      lynx: { name: 'lynx', cost: 2 },
    },
    itemAssets: {
      'blue buff': {
        name: 'blue buff',
        imagePath: 'resource_knowledge/image/item/completed/blue_buff.png',
      },
    },
    handState: {
      active: false,
      targetNames: [],
      owned: {
        bear: {
          name: 'bear',
          count: 1,
          boughtCount: 1,
          benchCount: 0,
          cost: 2,
          updatedAt: 1000,
        },
      },
      events: [],
    },
    economyState: {
      active: true,
      round: '3-2',
      gold: 32,
      level: 6,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
    knowledgeState: {
      active: false,
      shopSlots: {},
      items: {
        'completedItems:item/completed/blue_buff.png': {
          templatePath: 'item/completed/blue_buff.png',
          itemKind: 'completedItems',
          zones: ['inventory'],
          updatedAt: 1000,
        },
      },
      streak: {},
      events: [],
    },
  });
  const apProtectedShell = spellCycleFrontlinePlan.transitionLineups.find(
    (lineup) => lineup.name === 'AP Protected Shell',
  );
  const apNoFront = spellCycleFrontlinePlan.transitionLineups.find(
    (lineup) => lineup.name === 'AP No Front',
  );
  assert.ok(apProtectedShell);
  assert.ok(apNoFront);
  assert.equal(spellCycleFrontlinePlan.transitionLineups[0].name, 'AP Protected Shell');
  assert.equal(apProtectedShell.scoreBreakdown.spellCyclePenalty, 0);
  assert.equal(apNoFront.scoreBreakdown.spellCyclePenalty > 0, true);
  assert.equal(apProtectedShell.score > apNoFront.score, true);
  assert.deepEqual(apProtectedShell.itemFamilyNames, ['blue buff']);
  assert.deepEqual(apProtectedShell.itemFamilyUnitNames, ['mage']);

  const stableShellDreamPivotPlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'stable-shell-source',
      slot: 'A',
      name: 'Stable Shell Source',
      code: '',
      traitsSummary: '2probe',
      mainCarries: [{ name: 'eagle', isCarry: true }],
      frontliners: [{ name: 'bear' }],
      units: [{ name: 'eagle' }, { name: 'bear' }],
    },
    recommendedLineups: [
      {
        id: 'dream-pivot',
        slug: 'dream-pivot',
        name: 'Dream Pivot',
        path: 'dream-pivot.json',
        quality: 'S',
        variant: {
          id: 'dream-pivot-variant',
          slot: 'A',
          name: 'Dream Pivot',
          code: '',
          traitsSummary: '2probe',
          mainCarries: [{ name: 'dragon', isCarry: true }],
          frontliners: [{ name: 'rhino' }],
          units: [{ name: 'dragon' }, { name: 'rhino' }],
        },
      },
    ],
    championAssets: {
      dragon: { name: 'dragon', cost: 4 },
      rhino: { name: 'rhino', cost: 4 },
      eagle: { name: 'eagle', cost: 2 },
      bear: { name: 'bear', cost: 2 },
    },
    handState: {
      active: false,
      targetNames: [],
      owned: {
        eagle: {
          name: 'eagle',
          count: 3,
          boughtCount: 3,
          benchCount: 0,
          cost: 2,
          updatedAt: 1000,
        },
        bear: {
          name: 'bear',
          count: 3,
          boughtCount: 3,
          benchCount: 0,
          cost: 2,
          updatedAt: 1000,
        },
      },
      events: [],
    },
    economyState: {
      active: true,
      round: '3-2',
      gold: 40,
      level: 6,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
    knowledgeState: {
      active: false,
      shopSlots: {},
      items: {},
      streak: {},
      events: [],
    },
  });
  const dreamPivot = stableShellDreamPivotPlan.transitionLineups.find(
    (lineup) => lineup.name === 'Dream Pivot',
  );
  assert.ok(dreamPivot);
  assert.equal(dreamPivot.scoreBreakdown.dreamPivotPenalty > 0, true);
  assert.equal(dreamPivot.nextAction, 'saveForLevel');
  assert.equal(dreamPivot.riskLevel, 'greedy');
  assert.equal(dreamPivot.readiness, 'tooGreedy');
  assert.equal(dreamPivot.economyPlan, 'avoidOverroll');
  assert.equal(dreamPivot.shopPriorityUnitNames.length, 0);
  assert.equal(dreamPivot.itemFamilyNames.length, 0);

  const winStreakPlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'win-streak-variant',
      slot: 'A',
      name: 'Win Streak',
      code: '',
      traitsSummary: '2probe',
      mainCarries: [{ name: 'eagle', isCarry: true }],
      frontliners: [],
      units: [{ name: 'eagle' }],
    },
    championAssets: {
      eagle: { name: 'eagle', cost: 2 },
      bear: { name: 'bear', cost: 2 },
      tiger: { name: 'tiger', cost: 2 },
      lynx: { name: 'lynx', cost: 2 },
      rhino: { name: 'rhino', cost: 2 },
    },
    handState: { active: false, targetNames: [], owned: {}, events: [] },
    economyState: {
      active: true,
      round: '3-2',
      gold: 28,
      level: 6,
      streakKind: 'win',
      streakInterest: 3,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
  });
  assert.equal(winStreakPlan.economyAdvice.action, 'roll');
  assert.equal(winStreakPlan.economyAdvice.reasons.includes('streakPressure'), true);
  assert.equal(winStreakPlan.economyAdvice.breakdown.streakPressure, 'push');
  assert.equal(winStreakPlan.picks[0].reasons.includes('streakPressure'), true);

  const softWinStreakPlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'soft-win-streak-variant',
      slot: 'A',
      name: 'Soft Win Streak',
      code: '',
      traitsSummary: '2probe',
      mainCarries: [{ name: 'eagle', isCarry: true }],
      frontliners: [],
      units: [{ name: 'eagle' }],
    },
    championAssets: {
      eagle: { name: 'eagle', cost: 2 },
      bear: { name: 'bear', cost: 2 },
      tiger: { name: 'tiger', cost: 2 },
      lynx: { name: 'lynx', cost: 2 },
      rhino: { name: 'rhino', cost: 2 },
    },
    handState: { active: false, targetNames: [], owned: {}, events: [] },
    economyState: {
      active: true,
      round: '2-5',
      gold: 31,
      level: 6,
      streakKind: 'win',
      streakInterest: 1,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
    knowledgeState: {
      active: false,
      shopSlots: {
        1: {
          slotIndex: 1,
          championName: 'eagle',
          confidence: 'matched',
          updatedAt: 1000,
        },
      },
      items: {},
      streak: {},
      events: [],
    },
  });
  const softWinStreakEagle = softWinStreakPlan.picks.find((pick) => pick.name === 'eagle');
  assert.ok(softWinStreakEagle);
  assert.equal(softWinStreakPlan.economyAdvice.action, 'roll');
  assert.equal(softWinStreakPlan.economyAdvice.breakdown.streakPressure, 'push');
  assert.equal(softWinStreakEagle.reasons.includes('streakPressure'), true);
  assert.equal(softWinStreakEagle.shopVisibleCount, 1);
  assert.equal(softWinStreakEagle.scoreBreakdown.penalties.interestTax, 0);

  const lossStreakPlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'loss-streak-variant',
      slot: 'A',
      name: 'Loss Streak',
      code: '',
      traitsSummary: '2probe',
      mainCarries: [
        { name: 'eagle', isCarry: true },
        { name: 'bear', isCarry: true },
      ],
      frontliners: [],
      units: [{ name: 'eagle' }, { name: 'bear' }],
    },
    championAssets: {
      eagle: { name: 'eagle', cost: 2 },
      bear: { name: 'bear', cost: 2 },
      tiger: { name: 'tiger', cost: 2 },
      lynx: { name: 'lynx', cost: 2 },
      rhino: { name: 'rhino', cost: 2 },
    },
    handState: { active: false, targetNames: [], owned: {}, events: [] },
    economyState: {
      active: true,
      round: '3-2',
      gold: 34,
      level: 6,
      streakKind: 'loss',
      streakInterest: 3,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
  });
  assert.equal(lossStreakPlan.economyAdvice.action, 'save');
  assert.equal(lossStreakPlan.economyAdvice.reasons.includes('streakPressure'), true);
  assert.equal(lossStreakPlan.economyAdvice.breakdown.streakPressure, 'preserve');

  const softLossStreakPlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'soft-loss-streak-variant',
      slot: 'A',
      name: 'Soft Loss Streak',
      code: '',
      traitsSummary: '2probe',
      mainCarries: [{ name: 'eagle', isCarry: true }],
      frontliners: [],
      units: [{ name: 'eagle' }],
    },
    recommendedLineups: [
      {
        id: 'soft-loss-future-carry',
        slug: 'soft-loss-future-carry',
        name: 'Soft Loss Future Carry',
        path: 'soft-loss-future-carry.json',
        quality: 'B',
        variant: {
          id: 'soft-loss-future-carry-variant',
          slot: 'B',
          name: 'Soft Loss Future Carry',
          code: '',
          traitsSummary: '1wing',
          mainCarries: [{ name: 'phoenix', isCarry: true }],
          frontliners: [],
          units: [{ name: 'phoenix' }],
        },
      },
    ],
    championAssets: {
      eagle: { name: 'eagle', cost: 2 },
      phoenix: {
        name: 'phoenix',
        cost: 3,
        imagePath: 'resource_knowledge/image/champion/3/phoenix.png',
      },
      bear: { name: 'bear', cost: 2 },
      tiger: { name: 'tiger', cost: 2 },
      lynx: { name: 'lynx', cost: 2 },
      rhino: { name: 'rhino', cost: 2 },
    },
    handState: { active: false, targetNames: [], owned: {}, events: [] },
    economyState: {
      active: true,
      round: '3-2',
      gold: 34,
      level: 6,
      streakKind: 'loss',
      streakInterest: 1,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
    knowledgeState: {
      active: true,
      shopSlots: {
        1: {
          slotIndex: 1,
          championName: 'phoenix',
          confidence: 'matched',
          updatedAt: 1000,
        },
      },
      items: {},
      streak: {},
      events: [],
    },
  });
  const softLossStreakPhoenix = softLossStreakPlan.picks.find(
    (pick) => pick.name === 'phoenix',
  );
  assert.ok(softLossStreakPhoenix);
  assert.equal(softLossStreakPhoenix.ownedCount, 0);
  assert.equal(softLossStreakPhoenix.shopVisibleCount, 1);
  assert.equal(softLossStreakPhoenix.reasons.includes('recommendedCarry'), true);
  assert.equal(softLossStreakPlan.economyAdvice.action, 'save');
  assert.equal(softLossStreakPlan.economyAdvice.breakdown.streakPressure, 'preserve');
  assert.equal(softLossStreakPlan.economyAdvice.urgentPickNames.includes('phoenix'), false);
  assert.equal(softLossStreakPlan.recommendedRollTargetNames.includes('phoenix'), false);
  const softLossStreakDecisionTargets = collectGoldenSpatulaDecisionRollTargetTemplates({
    variant: {
      id: 'soft-loss-streak-variant',
      slot: 'A',
      name: 'Soft Loss Streak',
      code: '',
      traitsSummary: '2probe',
      mainCarries: [{ name: 'eagle', isCarry: true }],
      frontliners: [],
      units: [{ name: 'eagle' }],
    },
    championAssets: {
      eagle: { name: 'eagle', cost: 2 },
      phoenix: {
        name: 'phoenix',
        cost: 3,
        imagePath: 'resource_knowledge/image/champion/3/phoenix.png',
      },
    },
    decisionPlan: softLossStreakPlan,
  });
  assert.equal(
    softLossStreakDecisionTargets.some((target) => target.name === 'phoenix'),
    false,
  );

  const softLossStreakRollTargetPlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'soft-loss-streak-roll-target-variant',
      slot: 'A',
      name: 'Soft Loss Streak Roll Target',
      code: '',
      traitsSummary: '2probe',
      mainCarries: [{ name: 'eagle', isCarry: true }],
      frontliners: [],
      units: [{ name: 'eagle' }],
    },
    recommendedLineups: [
      {
        id: 'soft-loss-roll-target-future-carry',
        slug: 'soft-loss-roll-target-future-carry',
        name: 'Soft Loss Roll Target Future Carry',
        path: 'soft-loss-roll-target-future-carry.json',
        quality: 'B',
        variant: {
          id: 'soft-loss-roll-target-future-carry-variant',
          slot: 'B',
          name: 'Soft Loss Roll Target Future Carry',
          code: '',
          traitsSummary: '1wing',
          mainCarries: [{ name: 'phoenix', isCarry: true }],
          frontliners: [],
          units: [{ name: 'phoenix' }],
        },
      },
    ],
    championAssets: {
      eagle: { name: 'eagle', cost: 2 },
      phoenix: {
        name: 'phoenix',
        cost: 3,
        imagePath: 'resource_knowledge/image/champion/3/phoenix.png',
      },
      bear: { name: 'bear', cost: 2 },
      tiger: { name: 'tiger', cost: 2 },
      lynx: { name: 'lynx', cost: 2 },
      rhino: { name: 'rhino', cost: 2 },
    },
    handState: { active: false, targetNames: [], owned: {}, events: [] },
    economyState: {
      active: true,
      round: '3-2',
      gold: 34,
      level: 6,
      streakKind: 'loss',
      streakInterest: 1,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
    knowledgeState: {
      active: true,
      shopSlots: {},
      items: {},
      streak: {},
      events: [],
    },
  });
  assert.equal(softLossStreakRollTargetPlan.economyAdvice.action, 'save');
  assert.equal(
    softLossStreakRollTargetPlan.economyAdvice.breakdown.streakPressure,
    'preserve',
  );
  assert.equal(
    softLossStreakRollTargetPlan.recommendedRollTargetNames.includes('phoenix'),
    false,
  );
  const softLossStreakRollTargets = collectGoldenSpatulaDecisionRollTargetTemplates({
    variant: {
      id: 'soft-loss-streak-roll-target-variant',
      slot: 'A',
      name: 'Soft Loss Streak Roll Target',
      code: '',
      traitsSummary: '2probe',
      mainCarries: [{ name: 'eagle', isCarry: true }],
      frontliners: [],
      units: [{ name: 'eagle' }],
    },
    championAssets: {
      eagle: { name: 'eagle', cost: 2 },
      phoenix: {
        name: 'phoenix',
        cost: 3,
        imagePath: 'resource_knowledge/image/champion/3/phoenix.png',
      },
    },
    decisionPlan: softLossStreakRollTargetPlan,
  });
  assert.equal(
    softLossStreakRollTargets.some((target) => target.name === 'phoenix'),
    false,
  );

  const lateStagePlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'late-stage-variant',
      slot: 'A',
      name: 'Late Stage',
      code: '',
      traitsSummary: '2probe',
      mainCarries: [
        { name: 'dragon', isCarry: true },
        { name: 'eagle', isCarry: true },
      ],
      frontliners: [],
      units: [{ name: 'dragon' }, { name: 'eagle' }],
    },
    championAssets: {
      dragon: { name: 'dragon', cost: 4 },
      eagle: { name: 'eagle', cost: 2 },
      bear: { name: 'bear', cost: 2 },
      tiger: { name: 'tiger', cost: 2 },
      lynx: { name: 'lynx', cost: 2 },
      rhino: { name: 'rhino', cost: 2 },
    },
    handState: { active: false, targetNames: [], owned: {}, events: [] },
    economyState: {
      active: true,
      round: '5-1',
      gold: 40,
      level: 8,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
  });
  assert.equal(lateStagePlan.picks[0].name, 'dragon');
  assert.equal(lateStagePlan.picks[0].reasons.includes('stageFit'), true);

  const lateLowCostPlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'late-low-cost-variant',
      slot: 'A',
      name: 'Late Low Cost',
      code: '',
      traitsSummary: '2probe',
      mainCarries: [{ name: 'eagle', isCarry: true }],
      frontliners: [],
      units: [{ name: 'eagle' }],
    },
    championAssets: {
      eagle: { name: 'eagle', cost: 2 },
      bear: { name: 'bear', cost: 2 },
      tiger: { name: 'tiger', cost: 2 },
      lynx: { name: 'lynx', cost: 2 },
      rhino: { name: 'rhino', cost: 2 },
    },
    handState: { active: false, targetNames: [], owned: {}, events: [] },
    economyState: {
      active: true,
      round: '5-1',
      gold: 40,
      level: 8,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
  });
  assert.equal(lateLowCostPlan.picks[0].name, 'eagle');
  assert.equal(lateLowCostPlan.picks[0].targetCount, 3);
  assert.equal(lateLowCostPlan.picks[0].copiesNeeded, 3);

  const lateCommittedLowCostPlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'late-committed-low-cost-variant',
      slot: 'A',
      name: 'Late Committed Low Cost',
      code: '',
      traitsSummary: '2probe',
      mainCarries: [{ name: 'eagle', isCarry: true }],
      frontliners: [],
      units: [{ name: 'eagle' }],
    },
    championAssets: {
      eagle: { name: 'eagle', cost: 2 },
      bear: { name: 'bear', cost: 2 },
      tiger: { name: 'tiger', cost: 2 },
      lynx: { name: 'lynx', cost: 2 },
      rhino: { name: 'rhino', cost: 2 },
    },
    handState: {
      active: false,
      targetNames: [],
      owned: {
        eagle: {
          name: 'eagle',
          count: 6,
          boughtCount: 6,
          benchCount: 0,
          cost: 2,
          updatedAt: 1000,
        },
      },
      events: [],
    },
    economyState: {
      active: true,
      round: '5-1',
      gold: 40,
      level: 8,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
  });
  assert.equal(lateCommittedLowCostPlan.picks[0].targetCount, 9);
  assert.equal(lateCommittedLowCostPlan.picks[0].copiesNeeded, 3);

  const explicitLowCostTargetPlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'explicit-low-cost-target-variant',
      slot: 'A',
      name: 'Explicit Low Cost',
      code: '',
      traitsSummary: '2probe',
      mainCarries: [{ name: 'eagle', isCarry: true }],
      frontliners: [],
      units: [{ name: 'eagle' }],
      rollTargetNames: ['eagle'],
    },
    championAssets: {
      eagle: { name: 'eagle', cost: 2 },
      bear: { name: 'bear', cost: 2 },
      tiger: { name: 'tiger', cost: 2 },
      lynx: { name: 'lynx', cost: 2 },
      rhino: { name: 'rhino', cost: 2 },
    },
    handState: { active: false, targetNames: [], owned: {}, events: [] },
    economyState: {
      active: true,
      round: '5-1',
      gold: 40,
      level: 8,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
  });
  assert.equal(explicitLowCostTargetPlan.picks[0].targetCount, 3);
  assert.equal(explicitLowCostTargetPlan.picks[0].copiesNeeded, 3);

  const scaledOddsPlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'probe-variant-2',
      slot: 'B',
      name: 'Probe 2',
      code: '',
      traitsSummary: '2probe',
      mainCarries: [],
      frontliners: [],
      units: [{ name: 'eagle' }, { name: 'bear' }],
    },
    championAssets: {
      eagle: { name: 'eagle', cost: 2 },
      bear: { name: 'bear', cost: 2 },
      tiger: { name: 'tiger', cost: 2 },
      lynx: { name: 'lynx', cost: 2 },
      rhino: { name: 'rhino', cost: 2 },
    },
    handState: {
      active: false,
      targetNames: [],
      owned: {},
      events: [],
    },
    economyState: {
      active: true,
      gold: 40,
      level: 7,
      shopOdds: { 2: 40 },
      shopOddsSource: 'ocr',
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
  });
  assert.equal(scaledOddsPlan.picks[0].shopOdds, 0.4);

  const feasiblePlan = buildGoldenSpatulaDecisionPlan({
    championAssets: {
      eagle: { name: 'eagle', cost: 2 },
      bear: { name: 'bear', cost: 2 },
    },
    recommendedLineups: [
      {
        id: 'feasible-plan-rec',
        slug: 'feasible-plan-rec',
        name: 'Feasible Plan',
        path: 'feasible-plan.json',
        quality: 'A',
        variant: {
          id: 'feasible-variant',
          slot: 'A',
          name: 'Feasible',
          code: '',
          traitsSummary: '2probe',
          mainCarries: [],
          frontliners: [],
          units: [{ name: 'eagle' }, { name: 'bear' }],
        },
      },
    ],
    handState: {
      active: false,
      targetNames: [],
      owned: {
        eagle: {
          name: 'eagle',
          count: 2,
          boughtCount: 2,
          benchCount: 0,
          cost: 2,
          updatedAt: 1000,
        },
        bear: {
          name: 'bear',
          count: 0,
          boughtCount: 0,
          benchCount: 0,
          cost: 2,
          updatedAt: 1000,
        },
      },
      events: [],
    },
    economyState: {
      active: true,
      gold: 25,
      level: 7,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
  });
  assert.equal(feasiblePlan.picks[0].name, 'eagle');
  assert.equal(feasiblePlan.picks[0].copiesNeeded, 1);
  assert.equal(feasiblePlan.picks[1].copiesNeeded, 3);
  assert.equal(
    feasiblePlan.picks[0].acquisitionCompletionChance !== undefined &&
      feasiblePlan.picks[1].acquisitionCompletionChance !== undefined,
    true,
  );
  assert.equal(
    feasiblePlan.picks[0].acquisitionCompletionChance >
      feasiblePlan.picks[1].acquisitionCompletionChance,
    true,
  );

  const levelUpValueVariant = {
    id: 'level-up-value-variant',
    slot: 'C',
    name: 'Level Up Value',
    code: '',
    traitsSummary: '4probe',
    mainCarries: [{ name: 'dragon', isCarry: true }],
    frontliners: [],
    units: [{ name: 'dragon' }, { name: 'scout' }],
  };
  const levelUpValueChampionAssets = {
    dragon: {
      name: 'dragon',
      cost: 4,
      imagePath: 'resource_knowledge/image/champion/4/dragon.png',
    },
    sentinel: { name: 'sentinel', cost: 4 },
    knight: { name: 'knight', cost: 4 },
    scout: { name: 'scout', cost: 2 },
    page: { name: 'page', cost: 2 },
  };
  const levelUpValuePlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: levelUpValueVariant,
    championAssets: levelUpValueChampionAssets,
    handState: { active: false, targetNames: [], owned: {}, events: [] },
    economyState: {
      active: true,
      round: '4-2',
      gold: 40,
      level: 7,
      experience: 2,
      experienceMax: 20,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
  });
  const levelUpDragon = levelUpValuePlan.picks.find((pick) => pick.name === 'dragon');
  assert.ok(levelUpDragon);
  assert.equal(levelUpDragon.nextLevel, 8);
  assert.equal(Math.round((levelUpDragon.levelUpShopOddsGain ?? 0) * 100), 20);
  assert.equal(Math.round((levelUpDragon.levelUpShopOddsRatio ?? 0) * 10), 30);
  assert.equal(levelUpValuePlan.economyAdvice.action, 'level');
  assert.equal(levelUpValuePlan.economyAdvice.breakdown.levelUpTargetName, 'dragon');
  assert.equal(levelUpValuePlan.economyAdvice.breakdown.levelUpLevel, 8);
  assert.equal(levelUpValuePlan.economyAdvice.breakdown.levelUpXpNeeded, 18);
  assert.equal(levelUpValuePlan.economyAdvice.breakdown.levelUpGoldNeeded, 20);
  assert.equal(levelUpValuePlan.economyAdvice.recommendedXpPurchaseCount, 5);
  assert.equal(
    Math.round((levelUpValuePlan.economyAdvice.breakdown.levelUpShopOddsGain ?? 0) * 100),
    20,
  );
  assert.equal(
    Math.round((levelUpValuePlan.economyAdvice.breakdown.levelUpShopOddsRatio ?? 0) * 10),
    30,
  );
  assert.deepEqual(levelUpValuePlan.recommendedRollTargetNames, ['dragon']);
  const levelUpValueDecisionTargets = collectGoldenSpatulaDecisionRollTargetTemplates({
    variant: levelUpValueVariant,
    championAssets: levelUpValueChampionAssets,
    decisionPlan: levelUpValuePlan,
  });
  assert.equal(
    levelUpValueDecisionTargets.some((target) => target.name === 'dragon'),
    true,
  );

  const levelUnlockFiveCostPlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'level-unlock-five-cost-variant',
      slot: 'C',
      name: 'Level Unlock Five Cost',
      code: '',
      traitsSummary: '1legend',
      mainCarries: [{ name: 'legend', isCarry: true }],
      frontliners: [],
      units: [{ name: 'legend' }],
    },
    championAssets: {
      legend: {
        name: 'legend',
        cost: 5,
        imagePath: 'resource_knowledge/image/champion/5/legend.png',
      },
      scout: { name: 'scout', cost: 2 },
    },
    handState: { active: false, targetNames: [], owned: {}, events: [] },
    economyState: {
      active: true,
      round: '4-5',
      gold: 48,
      level: 7,
      experience: 18,
      experienceMax: 20,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
  });
  const levelUnlockLegend = levelUnlockFiveCostPlan.picks.find((pick) => pick.name === 'legend');
  assert.ok(levelUnlockLegend);
  assert.equal(levelUnlockLegend.shopOddsAvailability, 'rare');
  assert.equal(Math.round((levelUnlockLegend.levelUpShopOddsGain ?? 0) * 100), 2);
  assert.equal(levelUnlockFiveCostPlan.economyAdvice.action, 'level');
  assert.equal(levelUnlockFiveCostPlan.economyAdvice.breakdown.levelUpTargetName, 'legend');
  assert.deepEqual(levelUnlockFiveCostPlan.recommendedRollTargetNames, ['legend']);
  const levelUnlockDecisionTargets = collectGoldenSpatulaDecisionRollTargetTemplates({
    variant: {
      id: 'level-unlock-five-cost-variant',
      slot: 'C',
      name: 'Level Unlock Five Cost',
      code: '',
      traitsSummary: '1legend',
      mainCarries: [{ name: 'legend', isCarry: true }],
      frontliners: [],
      units: [{ name: 'legend' }],
    },
    championAssets: {
      legend: {
        name: 'legend',
        cost: 5,
        imagePath: 'resource_knowledge/image/champion/5/legend.png',
      },
      scout: { name: 'scout', cost: 2 },
    },
    decisionPlan: levelUnlockFiveCostPlan,
  });
  assert.deepEqual(
    levelUnlockDecisionTargets.map((target) => target.name),
    ['legend'],
  );

  const rareFiveCostOffWindowPlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'rare-five-cost-off-window-variant',
      slot: 'C',
      name: 'Rare Five Cost Off Window',
      code: '',
      traitsSummary: '1legend',
      mainCarries: [{ name: 'legend', isCarry: true }],
      frontliners: [],
      units: [{ name: 'legend' }],
    },
    championAssets: {
      legend: {
        name: 'legend',
        cost: 5,
        imagePath: 'resource_knowledge/image/champion/5/legend.png',
      },
      scout: { name: 'scout', cost: 2 },
    },
    handState: { active: false, targetNames: [], owned: {}, events: [] },
    economyState: {
      active: true,
      round: '4-5',
      gold: 30,
      level: 7,
      experience: 0,
      experienceMax: 56,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
  });
  const rareFiveCostLegend = rareFiveCostOffWindowPlan.picks.find(
    (pick) => pick.name === 'legend',
  );
  assert.ok(rareFiveCostLegend);
  assert.equal(rareFiveCostLegend.shopOddsAvailability, 'rare');
  assert.notEqual(rareFiveCostOffWindowPlan.economyAdvice.action, 'level');
  assert.equal(rareFiveCostOffWindowPlan.recommendedRollTargetNames.includes('legend'), false);
  const rareFiveCostOffWindowTargets = collectGoldenSpatulaDecisionRollTargetTemplates({
    variant: {
      id: 'rare-five-cost-off-window-variant',
      slot: 'C',
      name: 'Rare Five Cost Off Window',
      code: '',
      traitsSummary: '1legend',
      mainCarries: [{ name: 'legend', isCarry: true }],
      frontliners: [],
      units: [{ name: 'legend' }],
    },
    championAssets: {
      legend: {
        name: 'legend',
        cost: 5,
        imagePath: 'resource_knowledge/image/champion/5/legend.png',
      },
      scout: { name: 'scout', cost: 2 },
    },
    decisionPlan: rareFiveCostOffWindowPlan,
  });
  assert.equal(
    rareFiveCostOffWindowTargets.some((target) => target.name === 'legend'),
    false,
  );

  const visibleRareFiveCostPlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'visible-rare-five-cost-variant',
      slot: 'C',
      name: 'Visible Rare Five Cost',
      code: '',
      traitsSummary: '1legend',
      mainCarries: [{ name: 'legend', isCarry: true }],
      frontliners: [],
      units: [{ name: 'legend' }],
    },
    championAssets: {
      legend: {
        name: 'legend',
        cost: 5,
        imagePath: 'resource_knowledge/image/champion/5/legend.png',
      },
      scout: { name: 'scout', cost: 2 },
    },
    handState: { active: false, targetNames: [], owned: {}, events: [] },
    economyState: {
      active: true,
      round: '4-5',
      gold: 30,
      level: 7,
      experience: 0,
      experienceMax: 56,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
    knowledgeState: {
      active: false,
      shopSlots: {
        1: {
          slotIndex: 1,
          championName: 'legend',
          confidence: 'matched',
          updatedAt: 1000,
        },
      },
      items: {},
      streak: {},
      events: [],
    },
  });
  const visibleRareFiveCostLegend = visibleRareFiveCostPlan.picks.find(
    (pick) => pick.name === 'legend',
  );
  assert.ok(visibleRareFiveCostLegend);
  assert.equal(visibleRareFiveCostLegend.shopOddsAvailability, 'rare');
  assert.equal(visibleRareFiveCostLegend.shopVisibleCount, 1);
  assert.equal(visibleRareFiveCostPlan.recommendedRollTargetNames.includes('legend'), true);
  const visibleRareFiveCostTargets = collectGoldenSpatulaDecisionRollTargetTemplates({
    variant: {
      id: 'visible-rare-five-cost-variant',
      slot: 'C',
      name: 'Visible Rare Five Cost',
      code: '',
      traitsSummary: '1legend',
      mainCarries: [{ name: 'legend', isCarry: true }],
      frontliners: [],
      units: [{ name: 'legend' }],
    },
    championAssets: {
      legend: {
        name: 'legend',
        cost: 5,
        imagePath: 'resource_knowledge/image/champion/5/legend.png',
      },
      scout: { name: 'scout', cost: 2 },
    },
    decisionPlan: visibleRareFiveCostPlan,
  });
  assert.deepEqual(
    visibleRareFiveCostTargets.map((target) => target.name),
    ['legend'],
  );
  const postLevelValuePlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: levelUpValueVariant,
    championAssets: levelUpValueChampionAssets,
    handState: { active: false, targetNames: [], owned: {}, events: [] },
    economyState: {
      active: true,
      round: '4-2',
      gold: 20,
      level: 8,
      experience: 0,
      experienceMax: 56,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
  });
  assert.notEqual(postLevelValuePlan.economyAdvice.action, 'level');
  assert.equal(postLevelValuePlan.recommendedRollTargetNames.includes('dragon'), true);
  const postLevelValueDecisionTargets = collectGoldenSpatulaDecisionRollTargetTemplates({
    variant: levelUpValueVariant,
    championAssets: levelUpValueChampionAssets,
    decisionPlan: postLevelValuePlan,
  });
  assert.equal(
    postLevelValueDecisionTargets.some((target) => target.name === 'dragon'),
    true,
  );

  const threeCostStayWindowPlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'three-cost-stay-window-variant',
      slot: 'C',
      name: 'Three Cost Stay Window',
      code: '',
      traitsSummary: '4probe',
      mainCarries: [{ name: 'mantis', isCarry: true }],
      frontliners: [{ name: 'bear' }],
      units: [{ name: 'mantis' }, { name: 'bear' }],
    },
    championAssets: {
      mantis: { name: 'mantis', cost: 3 },
      bear: { name: 'bear', cost: 2 },
      scout: { name: 'scout', cost: 3 },
      page: { name: 'page', cost: 2 },
    },
    handState: { active: false, targetNames: [], owned: {}, events: [] },
    economyState: {
      active: true,
      round: '4-1',
      gold: 50,
      level: 7,
      experience: 0,
      experienceMax: 44,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
  });
  const stayWindowMantis = threeCostStayWindowPlan.picks.find((pick) => pick.name === 'mantis');
  assert.ok(stayWindowMantis);
  assert.equal(stayWindowMantis.nextLevel, 8);
  assert.equal(Math.round((stayWindowMantis.nextLevelShopOdds ?? 0) * 100), 32);
  assert.equal(stayWindowMantis.levelUpShopOddsGain, 0);
  assert.equal(Math.round((stayWindowMantis.levelUpShopOddsRatio ?? 0) * 10), 8);
  assert.notEqual(threeCostStayWindowPlan.economyAdvice.action, 'level');

  const threeCostSlotPressureStayWindowPlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'three-cost-slot-pressure-stay-window-variant',
      slot: 'C',
      name: 'Three Cost Slot Pressure Stay Window',
      code: '',
      traitsSummary: '8probe',
      mainCarries: [{ name: 'mantis', isCarry: true }],
      frontliners: [{ name: 'bear' }],
      units: [
        { name: 'mantis' },
        { name: 'bear' },
        { name: 'scout' },
        { name: 'page' },
        { name: 'guard' },
        { name: 'sprite' },
        { name: 'hawk' },
        { name: 'wolf' },
      ],
    },
    championAssets: {
      mantis: { name: 'mantis', cost: 3 },
      bear: { name: 'bear', cost: 2 },
      scout: { name: 'scout', cost: 3 },
      page: { name: 'page', cost: 2 },
      guard: { name: 'guard', cost: 2 },
      sprite: { name: 'sprite', cost: 2 },
      hawk: { name: 'hawk', cost: 3 },
      wolf: { name: 'wolf', cost: 2 },
    },
    handState: { active: false, targetNames: [], owned: {}, events: [] },
    economyState: {
      active: true,
      round: '4-1',
      gold: 80,
      health: 72,
      level: 7,
      experience: 0,
      experienceMax: 44,
      streakKind: 'win',
      streakInterest: 2,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
  });
  assert.notEqual(threeCostSlotPressureStayWindowPlan.economyAdvice.action, 'level');
  assert.equal(
    threeCostSlotPressureStayWindowPlan.economyAdvice.breakdown.levelUpBoardSlotPressure,
    true,
  );
  assert.equal(
    threeCostSlotPressureStayWindowPlan.economyAdvice.breakdown.levelUpProjectedUnitCount,
    8,
  );

  const threeCostPushSevenPlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'three-cost-push-seven-variant',
      slot: 'E',
      name: 'Three Cost Push Seven',
      code: '',
      traitsSummary: '3probe',
      mainCarries: [{ name: 'mantis', isCarry: true }],
      frontliners: [{ name: 'bear' }],
      units: [{ name: 'mantis' }, { name: 'bear' }],
    },
    championAssets: {
      mantis: { name: 'mantis', cost: 3 },
      bear: { name: 'bear', cost: 2 },
      scout: { name: 'scout', cost: 3 },
      page: { name: 'page', cost: 2 },
    },
    handState: {
      active: false,
      targetNames: [],
      owned: {
        mantis: {
          name: 'mantis',
          count: 2,
          boughtCount: 2,
          benchCount: 1,
          cost: 3,
          updatedAt: 1000,
        },
      },
      events: [],
    },
    economyState: {
      active: true,
      round: '4-1',
      gold: 40,
      health: 72,
      level: 6,
      experience: 0,
      experienceMax: 36,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
  });
  assert.equal(threeCostPushSevenPlan.economyAdvice.action, 'level');
  assert.equal(threeCostPushSevenPlan.economyAdvice.breakdown.roundPolicy?.checkpoint, '4-1');
  assert.equal(threeCostPushSevenPlan.economyAdvice.breakdown.roundPolicy?.targetLevel, 7);
  assert.equal(threeCostPushSevenPlan.economyAdvice.breakdown.roundPolicy?.focusCost, 3);

  const threeCostSlowRollPlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'three-cost-slow-roll-variant',
      slot: 'E',
      name: 'Three Cost Slow Roll',
      code: '',
      traitsSummary: '3probe',
      mainCarries: [{ name: 'mantis', isCarry: true }],
      frontliners: [{ name: 'bear' }],
      units: [{ name: 'mantis' }, { name: 'bear' }],
    },
    championAssets: {
      mantis: { name: 'mantis', cost: 3 },
      bear: { name: 'bear', cost: 2 },
      scout: { name: 'scout', cost: 3 },
      page: { name: 'page', cost: 2 },
    },
    handState: {
      active: false,
      targetNames: [],
      owned: {
        mantis: {
          name: 'mantis',
          count: 5,
          boughtCount: 5,
          benchCount: 1,
          cost: 3,
          updatedAt: 1000,
        },
      },
      events: [],
    },
    economyState: {
      active: true,
      round: '4-1',
      gold: 52,
      health: 72,
      level: 7,
      experience: 0,
      experienceMax: 44,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
  });
  assert.notEqual(threeCostSlowRollPlan.economyAdvice.action, 'level');
  assert.equal(threeCostSlowRollPlan.economyAdvice.action, 'roll');
  assert.equal(threeCostSlowRollPlan.economyAdvice.breakdown.roundPolicy?.checkpoint, '4-1');
  assert.equal(threeCostSlowRollPlan.economyAdvice.breakdown.roundPolicy?.kind, 'rerollWindow');
  assert.equal(threeCostSlowRollPlan.economyAdvice.breakdown.roundPolicy?.bankFloor, 50);
  assert.equal(threeCostSlowRollPlan.economyAdvice.recommendedRollCount, 1);

  const threeCostCoreSlowRollAfterStablePlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'three-cost-core-slow-roll-after-stable-variant',
      slot: 'E',
      name: 'Three Cost Core Slow Roll After Stable',
      code: '',
      traitsSummary: '3probe',
      mainCarries: [{ name: 'mantis', isCarry: true }],
      frontliners: [{ name: 'rhino' }],
      units: [{ name: 'mantis' }, { name: 'rhino' }, { name: 'fox' }],
    },
    championAssets: {
      mantis: { name: 'mantis', cost: 3 },
      rhino: { name: 'rhino', cost: 3 },
      fox: { name: 'fox', cost: 2 },
      scout: { name: 'scout', cost: 3 },
      page: { name: 'page', cost: 2 },
    },
    handState: {
      active: false,
      targetNames: [],
      owned: {
        mantis: {
          name: 'mantis',
          count: 3,
          boughtCount: 3,
          benchCount: 0,
          cost: 3,
          updatedAt: 1000,
        },
        rhino: {
          name: 'rhino',
          count: 3,
          boughtCount: 3,
          benchCount: 0,
          cost: 3,
          updatedAt: 1000,
        },
        fox: {
          name: 'fox',
          count: 2,
          boughtCount: 2,
          benchCount: 0,
          cost: 2,
          updatedAt: 1000,
        },
      },
      events: [],
    },
    economyState: {
      active: true,
      round: '4-1',
      gold: 52,
      health: 72,
      level: 7,
      experience: 0,
      experienceMax: 44,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
  });
  assert.notEqual(threeCostCoreSlowRollAfterStablePlan.economyAdvice.action, 'level');
  assert.equal(
    threeCostCoreSlowRollAfterStablePlan.economyAdvice.breakdown.roundPolicy?.kind,
    'rerollWindow',
  );
  assert.equal(
    threeCostCoreSlowRollAfterStablePlan.economyAdvice.breakdown.formationBalance?.kind,
    'balanced',
  );
  assert.equal(
    threeCostCoreSlowRollAfterStablePlan.recommendedRollTargetNames.includes('mantis'),
    true,
  );
  assert.equal(
    threeCostCoreSlowRollAfterStablePlan.recommendedRollTargetNames.includes('rhino'),
    true,
  );
  assert.equal(
    threeCostCoreSlowRollAfterStablePlan.recommendedRollTargetNames.includes('fox'),
    false,
  );

  const threeCostHoldInterestPlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'three-cost-hold-interest-variant',
      slot: 'E',
      name: 'Three Cost Hold Interest',
      code: '',
      traitsSummary: '3probe',
      mainCarries: [{ name: 'mantis', isCarry: true }],
      frontliners: [{ name: 'bear' }],
      units: [{ name: 'mantis' }, { name: 'bear' }],
    },
    championAssets: {
      mantis: { name: 'mantis', cost: 3 },
      bear: { name: 'bear', cost: 2 },
      scout: { name: 'scout', cost: 3 },
      page: { name: 'page', cost: 2 },
    },
    handState: {
      active: false,
      targetNames: [],
      owned: {
        mantis: {
          name: 'mantis',
          count: 5,
          boughtCount: 5,
          benchCount: 1,
          cost: 3,
          updatedAt: 1000,
        },
      },
      events: [],
    },
    economyState: {
      active: true,
      round: '4-1',
      gold: 48,
      health: 72,
      level: 7,
      experience: 0,
      experienceMax: 44,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
  });
  assert.equal(threeCostHoldInterestPlan.economyAdvice.action, 'save');
  assert.equal(threeCostHoldInterestPlan.economyAdvice.breakdown.roundPolicy?.checkpoint, '4-1');
  assert.equal(threeCostHoldInterestPlan.economyAdvice.breakdown.roundPolicy?.action, 'save');
  assert.equal(threeCostHoldInterestPlan.economyAdvice.breakdown.roundPolicy?.bankFloor, 50);

  const oneCostRerollSlowRollPlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'one-cost-reroll-slow-roll-variant',
      slot: 'E',
      name: 'One Cost Reroll Slow Roll',
      code: '',
      traitsSummary: '2probe',
      mainCarries: [{ name: 'sprite', isCarry: true }],
      frontliners: [{ name: 'guard' }],
      units: [{ name: 'sprite' }, { name: 'guard' }],
    },
    championAssets: {
      sprite: { name: 'sprite', cost: 1 },
      guard: { name: 'guard', cost: 1 },
      page: { name: 'page', cost: 1 },
      scout: { name: 'scout', cost: 2 },
    },
    handState: {
      active: false,
      targetNames: [],
      owned: {
        sprite: {
          name: 'sprite',
          count: 4,
          boughtCount: 4,
          benchCount: 1,
          cost: 1,
          updatedAt: 1000,
        },
      },
      events: [],
    },
    economyState: {
      active: true,
      round: '3-2',
      gold: 52,
      level: 5,
      experience: 0,
      experienceMax: 20,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
  });
  assert.notEqual(oneCostRerollSlowRollPlan.economyAdvice.action, 'level');
  assert.equal(oneCostRerollSlowRollPlan.economyAdvice.action, 'roll');
  assert.equal(oneCostRerollSlowRollPlan.economyAdvice.breakdown.roundPolicy?.checkpoint, '3-2');
  assert.equal(oneCostRerollSlowRollPlan.economyAdvice.breakdown.roundPolicy?.kind, 'rerollWindow');
  assert.equal(oneCostRerollSlowRollPlan.economyAdvice.breakdown.roundPolicy?.bankFloor, 50);
  assert.equal(oneCostRerollSlowRollPlan.economyAdvice.recommendedRollCount, 1);

  const oneCostCoreSlowRollAfterStablePlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'one-cost-core-slow-roll-after-stable-variant',
      slot: 'E',
      name: 'One Cost Core Slow Roll After Stable',
      code: '',
      traitsSummary: '2probe',
      mainCarries: [{ name: 'sprite', isCarry: true }],
      frontliners: [{ name: 'guard' }],
      units: [{ name: 'sprite' }, { name: 'guard' }, { name: 'fox' }],
    },
    championAssets: {
      sprite: { name: 'sprite', cost: 1 },
      guard: { name: 'guard', cost: 1 },
      fox: { name: 'fox', cost: 1 },
      page: { name: 'page', cost: 1 },
      scout: { name: 'scout', cost: 2 },
    },
    handState: {
      active: false,
      targetNames: [],
      owned: {
        sprite: {
          name: 'sprite',
          count: 3,
          boughtCount: 3,
          benchCount: 0,
          cost: 1,
          updatedAt: 1000,
        },
        guard: {
          name: 'guard',
          count: 3,
          boughtCount: 3,
          benchCount: 0,
          cost: 1,
          updatedAt: 1000,
        },
        fox: {
          name: 'fox',
          count: 2,
          boughtCount: 2,
          benchCount: 0,
          cost: 1,
          updatedAt: 1000,
        },
      },
      events: [],
    },
    economyState: {
      active: true,
      round: '3-2',
      gold: 52,
      level: 5,
      experience: 0,
      experienceMax: 20,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
  });
  assert.notEqual(oneCostCoreSlowRollAfterStablePlan.economyAdvice.action, 'level');
  assert.equal(
    oneCostCoreSlowRollAfterStablePlan.economyAdvice.breakdown.roundPolicy?.kind,
    'rerollWindow',
  );
  assert.equal(
    oneCostCoreSlowRollAfterStablePlan.economyAdvice.breakdown.formationBalance?.kind,
    'balanced',
  );
  assert.equal(
    oneCostCoreSlowRollAfterStablePlan.recommendedRollTargetNames.includes('sprite'),
    true,
  );
  assert.equal(
    oneCostCoreSlowRollAfterStablePlan.recommendedRollTargetNames.includes('guard'),
    true,
  );
  assert.equal(
    oneCostCoreSlowRollAfterStablePlan.recommendedRollTargetNames.includes('fox'),
    false,
  );

  const twoCostRerollSlowRollPlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'two-cost-reroll-slow-roll-variant',
      slot: 'E',
      name: 'Two Cost Reroll Slow Roll',
      code: '',
      traitsSummary: '2probe',
      mainCarries: [{ name: 'eagle', isCarry: true }],
      frontliners: [{ name: 'bear' }],
      units: [{ name: 'eagle' }, { name: 'bear' }],
    },
    championAssets: {
      eagle: { name: 'eagle', cost: 2 },
      bear: { name: 'bear', cost: 2 },
      page: { name: 'page', cost: 2 },
      scout: { name: 'scout', cost: 3 },
    },
    handState: {
      active: false,
      targetNames: [],
      owned: {
        eagle: {
          name: 'eagle',
          count: 4,
          boughtCount: 4,
          benchCount: 1,
          cost: 2,
          updatedAt: 1000,
        },
      },
      events: [],
    },
    economyState: {
      active: true,
      round: '3-2',
      gold: 52,
      health: 72,
      level: 6,
      experience: 0,
      experienceMax: 36,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
  });
  assert.notEqual(twoCostRerollSlowRollPlan.economyAdvice.action, 'level');
  assert.equal(twoCostRerollSlowRollPlan.economyAdvice.action, 'roll');
  assert.equal(twoCostRerollSlowRollPlan.economyAdvice.breakdown.roundPolicy?.checkpoint, '3-2');
  assert.equal(twoCostRerollSlowRollPlan.economyAdvice.breakdown.roundPolicy?.kind, 'rerollWindow');
  assert.equal(twoCostRerollSlowRollPlan.economyAdvice.breakdown.roundPolicy?.bankFloor, 50);
  assert.equal(twoCostRerollSlowRollPlan.economyAdvice.recommendedRollCount, 1);
  assert.equal(
    twoCostRerollSlowRollPlan.economyAdvice.breakdown.formationBalance?.kind,
    'frontlineFirst',
  );
  assert.equal(twoCostRerollSlowRollPlan.recommendedRollTargetNames.includes('bear'), true);
  assert.equal(twoCostRerollSlowRollPlan.recommendedRollTargetNames.includes('eagle'), false);

  const twoCostVisibleFrontlinePairStabilizePlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'two-cost-visible-frontline-pair-stabilize-variant',
      slot: 'E',
      name: 'Two Cost Visible Frontline Pair Stabilize',
      code: '',
      traitsSummary: '2probe',
      mainCarries: [{ name: 'eagle', isCarry: true }],
      frontliners: [{ name: 'bear' }],
      units: [{ name: 'eagle' }, { name: 'bear' }, { name: 'fox' }],
    },
    championAssets: {
      eagle: { name: 'eagle', cost: 2 },
      bear: { name: 'bear', cost: 2 },
      fox: { name: 'fox', cost: 2 },
      page: { name: 'page', cost: 2 },
      scout: { name: 'scout', cost: 3 },
    },
    handState: {
      active: false,
      targetNames: [],
      owned: {
        eagle: {
          name: 'eagle',
          count: 2,
          boughtCount: 2,
          benchCount: 1,
          cost: 2,
          updatedAt: 1000,
        },
        bear: {
          name: 'bear',
          count: 2,
          boughtCount: 2,
          benchCount: 1,
          cost: 2,
          updatedAt: 1000,
        },
        fox: {
          name: 'fox',
          count: 2,
          boughtCount: 2,
          benchCount: 0,
          cost: 2,
          updatedAt: 1000,
        },
      },
      events: [],
    },
    economyState: {
      active: true,
      round: '3-2',
      gold: 42,
      health: 72,
      level: 6,
      experience: 0,
      experienceMax: 36,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
    knowledgeState: {
      active: false,
      shopSlots: {
        1: {
          slotIndex: 1,
          championName: 'bear',
          confidence: 'matched',
          updatedAt: 1000,
        },
      },
      items: {},
      streak: {},
      events: [],
    },
  });
  assert.equal(twoCostVisibleFrontlinePairStabilizePlan.economyAdvice.action, 'roll');
  assert.equal(
    twoCostVisibleFrontlinePairStabilizePlan.economyAdvice.breakdown.roundPolicy?.bankFloor,
    20,
  );
  assert.equal(
    twoCostVisibleFrontlinePairStabilizePlan.economyAdvice.breakdown.formationBalance?.kind,
    'carryBeforeFrontline',
  );
  assert.equal(
    twoCostVisibleFrontlinePairStabilizePlan.recommendedRollTargetNames.includes('eagle'),
    true,
  );
  assert.equal(
    twoCostVisibleFrontlinePairStabilizePlan.recommendedRollTargetNames.includes('bear'),
    true,
  );
  assert.equal(
    twoCostVisibleFrontlinePairStabilizePlan.recommendedRollTargetNames.includes('fox'),
    false,
  );
  assert.equal(
    twoCostVisibleFrontlinePairStabilizePlan.picks.find((pick) => pick.name === 'bear')
      ?.shopVisibleCount,
    1,
  );

  const twoCostCoreSlowRollAfterStablePlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'two-cost-core-slow-roll-after-stable-variant',
      slot: 'E',
      name: 'Two Cost Core Slow Roll After Stable',
      code: '',
      traitsSummary: '2probe',
      mainCarries: [{ name: 'eagle', isCarry: true }],
      frontliners: [{ name: 'bear' }],
      units: [{ name: 'eagle' }, { name: 'bear' }, { name: 'fox' }],
    },
    championAssets: {
      eagle: { name: 'eagle', cost: 2 },
      bear: { name: 'bear', cost: 2 },
      fox: { name: 'fox', cost: 2 },
      page: { name: 'page', cost: 2 },
      scout: { name: 'scout', cost: 3 },
    },
    handState: {
      active: false,
      targetNames: [],
      owned: {
        eagle: {
          name: 'eagle',
          count: 3,
          boughtCount: 3,
          benchCount: 0,
          cost: 2,
          updatedAt: 1000,
        },
        bear: {
          name: 'bear',
          count: 3,
          boughtCount: 3,
          benchCount: 0,
          cost: 2,
          updatedAt: 1000,
        },
        fox: {
          name: 'fox',
          count: 2,
          boughtCount: 2,
          benchCount: 0,
          cost: 2,
          updatedAt: 1000,
        },
      },
      events: [],
    },
    economyState: {
      active: true,
      round: '3-2',
      gold: 52,
      health: 72,
      level: 6,
      experience: 0,
      experienceMax: 36,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
  });
  assert.notEqual(twoCostCoreSlowRollAfterStablePlan.economyAdvice.action, 'level');
  assert.equal(
    twoCostCoreSlowRollAfterStablePlan.economyAdvice.breakdown.roundPolicy?.kind,
    'rerollWindow',
  );
  assert.equal(
    twoCostCoreSlowRollAfterStablePlan.economyAdvice.breakdown.formationBalance?.kind,
    'balanced',
  );
  assert.equal(
    twoCostCoreSlowRollAfterStablePlan.recommendedRollTargetNames.includes('eagle'),
    true,
  );
  assert.equal(
    twoCostCoreSlowRollAfterStablePlan.recommendedRollTargetNames.includes('bear'),
    true,
  );
  assert.equal(
    twoCostCoreSlowRollAfterStablePlan.recommendedRollTargetNames.includes('fox'),
    false,
  );

  const twoCostRerollStaySixPlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'two-cost-reroll-stay-six-variant',
      slot: 'E',
      name: 'Two Cost Reroll Stay Six',
      code: '',
      traitsSummary: '2probe',
      mainCarries: [{ name: 'eagle', isCarry: true }],
      frontliners: [{ name: 'bear' }],
      units: [{ name: 'eagle' }, { name: 'bear' }],
    },
    championAssets: {
      eagle: { name: 'eagle', cost: 2 },
      bear: { name: 'bear', cost: 2 },
      page: { name: 'page', cost: 2 },
      scout: { name: 'scout', cost: 3 },
    },
    handState: {
      active: false,
      targetNames: [],
      owned: {
        eagle: {
          name: 'eagle',
          count: 4,
          boughtCount: 4,
          benchCount: 1,
          cost: 2,
          updatedAt: 1000,
        },
      },
      events: [],
    },
    economyState: {
      active: true,
      round: '4-1',
      gold: 48,
      health: 70,
      level: 6,
      experience: 0,
      experienceMax: 36,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
  });
  assert.notEqual(twoCostRerollStaySixPlan.economyAdvice.action, 'level');
  assert.equal(twoCostRerollStaySixPlan.economyAdvice.action, 'save');
  assert.equal(twoCostRerollStaySixPlan.economyAdvice.breakdown.roundPolicy?.checkpoint, '4-1');
  assert.equal(twoCostRerollStaySixPlan.economyAdvice.breakdown.roundPolicy?.action, 'save');
  assert.equal(twoCostRerollStaySixPlan.economyAdvice.breakdown.roundPolicy?.bankFloor, 50);

  const fourCostLaunchPlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'four-cost-launch-variant',
      slot: 'E',
      name: 'Four Cost Launch',
      code: '',
      traitsSummary: '4probe',
      mainCarries: [{ name: 'dragon', isCarry: true }],
      frontliners: [{ name: 'sentinel' }],
      units: [{ name: 'dragon' }, { name: 'sentinel' }, { name: 'scout' }],
    },
    championAssets: {
      dragon: { name: 'dragon', cost: 4 },
      sentinel: { name: 'sentinel', cost: 4 },
      scout: { name: 'scout', cost: 2 },
      page: { name: 'page', cost: 2 },
    },
    handState: { active: false, targetNames: [], owned: {}, events: [] },
    economyState: {
      active: true,
      round: '4-2',
      gold: 40,
      level: 8,
      experience: 0,
      experienceMax: 56,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
  });
  assert.equal(fourCostLaunchPlan.economyAdvice.action, 'roll');
  assert.ok(fourCostLaunchPlan.economyAdvice.recommendedRollCount >= 4);
  assert.equal(fourCostLaunchPlan.economyAdvice.breakdown.roundPolicy?.checkpoint, '4-2');
  assert.equal(fourCostLaunchPlan.economyAdvice.breakdown.roundPolicy?.kind, 'fourCostLaunch');
  assert.equal(fourCostLaunchPlan.economyAdvice.breakdown.roundPolicy?.action, 'roll');
  assert.equal(fourCostLaunchPlan.economyAdvice.breakdown.roundPolicy?.bankFloor, 30);
  assert.equal(fourCostLaunchPlan.recommendedRollTargetNames.includes('dragon'), true);
  assert.equal(fourCostLaunchPlan.recommendedRollTargetNames.includes('sentinel'), true);

  const fourCostLaunchKeyFunctionPlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'four-cost-launch-key-function-variant',
      slot: 'E',
      name: 'Four Cost Launch Key Function',
      code: '',
      traitsSummary: '4probe',
      mainCarries: [{ name: 'dragon', isCarry: true }],
      frontliners: [{ name: 'sentinel' }],
      units: [{ name: 'dragon' }, { name: 'sentinel' }, { name: 'oracle' }],
    },
    championAssets: {
      dragon: { name: 'dragon', cost: 4 },
      sentinel: { name: 'sentinel', cost: 4 },
      oracle: { name: 'oracle', cost: 4 },
      page: { name: 'page', cost: 2 },
    },
    handState: { active: false, targetNames: [], owned: {}, events: [] },
    economyState: {
      active: true,
      round: '4-2',
      gold: 40,
      level: 8,
      experience: 0,
      experienceMax: 56,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
  });
  assert.equal(fourCostLaunchKeyFunctionPlan.economyAdvice.action, 'roll');
  assert.equal(
    fourCostLaunchKeyFunctionPlan.economyAdvice.breakdown.stopLoss?.kind,
    'fourCostStabilize',
  );
  assert.equal(fourCostLaunchKeyFunctionPlan.recommendedRollTargetNames.includes('dragon'), true);
  assert.equal(fourCostLaunchKeyFunctionPlan.recommendedRollTargetNames.includes('sentinel'), true);
  assert.equal(fourCostLaunchKeyFunctionPlan.recommendedRollTargetNames.includes('oracle'), true);

  const fourCostAvoidGreedyNinePlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'four-cost-avoid-greedy-nine-variant',
      slot: 'E',
      name: 'Four Cost Avoid Greedy Nine',
      code: '',
      traitsSummary: '4probe',
      mainCarries: [{ name: 'dragon', isCarry: true }],
      frontliners: [{ name: 'sentinel' }],
      units: [{ name: 'dragon' }, { name: 'sentinel' }],
    },
    recommendedLineups: [
      {
        id: 'five-cost-cap-rec',
        slug: 'five-cost-cap-rec',
        name: 'Five Cost Cap',
        path: 'five-cost-cap.json',
        quality: 'S',
        variant: {
          id: 'five-cost-cap-variant',
          slot: 'S',
          name: 'Five Cost Cap',
          code: '',
          traitsSummary: '5probe',
          mainCarries: [{ name: 'titan', isCarry: true }],
          frontliners: [{ name: 'sentinel' }],
          units: [{ name: 'titan' }, { name: 'sentinel' }, { name: 'dragon' }],
        },
      },
    ],
    championAssets: {
      dragon: { name: 'dragon', cost: 4 },
      sentinel: { name: 'sentinel', cost: 4 },
      titan: { name: 'titan', cost: 5 },
      page: { name: 'page', cost: 2 },
    },
    handState: {
      active: false,
      targetNames: [],
      owned: {
        dragon: {
          name: 'dragon',
          count: 1,
          boughtCount: 1,
          benchCount: 0,
          cost: 4,
          updatedAt: 1000,
        },
        sentinel: {
          name: 'sentinel',
          count: 1,
          boughtCount: 1,
          benchCount: 0,
          cost: 4,
          updatedAt: 1000,
        },
      },
      events: [],
    },
    economyState: {
      active: true,
      round: '5-1',
      gold: 80,
      health: 70,
      level: 8,
      experience: 0,
      experienceMax: 80,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
  });
  assert.notEqual(fourCostAvoidGreedyNinePlan.economyAdvice.action, 'level');
  assert.equal(fourCostAvoidGreedyNinePlan.economyAdvice.action, 'roll');
  assert.equal(
    fourCostAvoidGreedyNinePlan.economyAdvice.breakdown.stopLoss?.kind,
    'fourCostStabilize',
  );
  assert.equal(fourCostAvoidGreedyNinePlan.economyAdvice.breakdown.stopLoss?.bankFloor, 30);
  assert.equal(
    fourCostAvoidGreedyNinePlan.economyAdvice.breakdown.levelUpTargetName,
    'titan',
  );
  assert.equal(fourCostAvoidGreedyNinePlan.recommendedRollTargetNames.includes('dragon'), true);
  assert.equal(fourCostAvoidGreedyNinePlan.recommendedRollTargetNames.includes('sentinel'), true);
  assert.equal(fourCostAvoidGreedyNinePlan.recommendedRollTargetNames.includes('titan'), false);

  const fourCostFrontlineBeforeCapPlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'four-cost-frontline-before-cap-variant',
      slot: 'E',
      name: 'Four Cost Frontline Before Cap',
      code: '',
      traitsSummary: '4probe',
      mainCarries: [{ name: 'dragon', isCarry: true }],
      frontliners: [{ name: 'sentinel' }],
      units: [{ name: 'dragon' }, { name: 'sentinel' }],
    },
    recommendedLineups: [
      {
        id: 'five-cost-cap-frontline-rec',
        slug: 'five-cost-cap-frontline-rec',
        name: 'Five Cost Cap Frontline',
        path: 'five-cost-cap-frontline.json',
        quality: 'S',
        variant: {
          id: 'five-cost-cap-frontline-variant',
          slot: 'S',
          name: 'Five Cost Cap Frontline',
          code: '',
          traitsSummary: '5probe',
          mainCarries: [{ name: 'titan', isCarry: true }],
          frontliners: [{ name: 'sentinel' }],
          units: [{ name: 'titan' }, { name: 'sentinel' }, { name: 'dragon' }],
        },
      },
    ],
    championAssets: {
      dragon: { name: 'dragon', cost: 4 },
      sentinel: { name: 'sentinel', cost: 4 },
      titan: { name: 'titan', cost: 5 },
      page: { name: 'page', cost: 2 },
    },
    handState: {
      active: false,
      targetNames: [],
      owned: {
        dragon: {
          name: 'dragon',
          count: 2,
          boughtCount: 2,
          benchCount: 0,
          cost: 4,
          updatedAt: 1000,
        },
        sentinel: {
          name: 'sentinel',
          count: 1,
          boughtCount: 1,
          benchCount: 0,
          cost: 4,
          updatedAt: 1000,
        },
      },
      events: [],
    },
    economyState: {
      active: true,
      round: '5-1',
      gold: 80,
      health: 70,
      level: 8,
      experience: 0,
      experienceMax: 80,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
  });
  assert.equal(
    fourCostFrontlineBeforeCapPlan.economyAdvice.breakdown.formationBalance?.kind,
    'frontlineFirst',
  );
  assert.deepEqual(
    fourCostFrontlineBeforeCapPlan.economyAdvice.breakdown.formationBalance
      ?.priorityTargetNames,
    ['sentinel'],
  );
  assert.equal(fourCostFrontlineBeforeCapPlan.recommendedRollTargetNames.includes('sentinel'), true);
  assert.equal(fourCostFrontlineBeforeCapPlan.recommendedRollTargetNames.includes('titan'), false);

  const fastNineSaveForCapPlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'fast-nine-save-for-cap-variant',
      slot: 'E',
      name: 'Fast Nine Save For Cap',
      code: '',
      traitsSummary: '4probe',
      mainCarries: [{ name: 'dragon', isCarry: true }],
      frontliners: [{ name: 'sentinel' }],
      units: [{ name: 'dragon' }, { name: 'sentinel' }],
    },
    recommendedLineups: [
      {
        id: 'fast-nine-cap-rec',
        slug: 'fast-nine-cap-rec',
        name: 'Fast Nine Cap',
        path: 'fast-nine-cap.json',
        quality: 'S',
        variant: {
          id: 'fast-nine-cap-variant',
          slot: 'S',
          name: 'Fast Nine Cap',
          code: '',
          traitsSummary: '5probe',
          mainCarries: [{ name: 'titan', isCarry: true }],
          frontliners: [{ name: 'sentinel' }],
          units: [{ name: 'titan' }, { name: 'sentinel' }, { name: 'dragon' }],
        },
      },
    ],
    championAssets: {
      dragon: { name: 'dragon', cost: 4 },
      sentinel: { name: 'sentinel', cost: 4 },
      titan: { name: 'titan', cost: 5 },
      page: { name: 'page', cost: 2 },
    },
    handState: {
      active: false,
      targetNames: [],
      owned: {
        dragon: {
          name: 'dragon',
          count: 2,
          boughtCount: 2,
          benchCount: 0,
          cost: 4,
          updatedAt: 1000,
        },
        sentinel: {
          name: 'sentinel',
          count: 2,
          boughtCount: 2,
          benchCount: 0,
          cost: 4,
          updatedAt: 1000,
        },
      },
      events: [],
    },
    economyState: {
      active: true,
      round: '5-1',
      gold: 50,
      health: 70,
      level: 8,
      experience: 0,
      experienceMax: 80,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
  });
  assert.equal(fastNineSaveForCapPlan.economyAdvice.action, 'save');
  assert.equal(fastNineSaveForCapPlan.economyAdvice.breakdown.stopLoss, undefined);
  assert.equal(fastNineSaveForCapPlan.economyAdvice.breakdown.levelUpTargetName, 'titan');
  assert.equal(fastNineSaveForCapPlan.economyAdvice.breakdown.levelUpGoldNeeded, 80);
  assert.equal(fastNineSaveForCapPlan.economyAdvice.breakdown.roundPolicy?.kind, 'lateCap');
  assert.equal(fastNineSaveForCapPlan.economyAdvice.breakdown.roundPolicy?.action, 'level');

  const fourCostStableCapPlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'four-cost-stable-cap-variant',
      slot: 'E',
      name: 'Four Cost Stable Cap',
      code: '',
      traitsSummary: '4probe',
      mainCarries: [{ name: 'dragon', isCarry: true }],
      frontliners: [{ name: 'sentinel' }],
      units: [{ name: 'dragon' }, { name: 'sentinel' }],
    },
    recommendedLineups: [
      {
        id: 'five-cost-cap-stable-rec',
        slug: 'five-cost-cap-stable-rec',
        name: 'Five Cost Cap Stable',
        path: 'five-cost-cap-stable.json',
        quality: 'S',
        variant: {
          id: 'five-cost-cap-stable-variant',
          slot: 'S',
          name: 'Five Cost Cap Stable',
          code: '',
          traitsSummary: '5probe',
          mainCarries: [{ name: 'titan', isCarry: true }],
          frontliners: [{ name: 'sentinel' }],
          units: [{ name: 'titan' }, { name: 'sentinel' }, { name: 'dragon' }],
        },
      },
    ],
    championAssets: {
      dragon: { name: 'dragon', cost: 4 },
      sentinel: { name: 'sentinel', cost: 4 },
      titan: { name: 'titan', cost: 5 },
      page: { name: 'page', cost: 2 },
    },
    handState: {
      active: false,
      targetNames: [],
      owned: {
        dragon: {
          name: 'dragon',
          count: 2,
          boughtCount: 2,
          benchCount: 0,
          cost: 4,
          updatedAt: 1000,
        },
        sentinel: {
          name: 'sentinel',
          count: 2,
          boughtCount: 2,
          benchCount: 0,
          cost: 4,
          updatedAt: 1000,
        },
      },
      events: [],
    },
    economyState: {
      active: true,
      round: '5-1',
      gold: 80,
      health: 70,
      level: 8,
      experience: 0,
      experienceMax: 80,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
  });
  assert.equal(fourCostStableCapPlan.economyAdvice.action, 'level');
  assert.equal(fourCostStableCapPlan.economyAdvice.breakdown.stopLoss, undefined);
  assert.equal(fourCostStableCapPlan.economyAdvice.breakdown.levelUpTargetName, 'titan');
  assert.equal(fourCostStableCapPlan.economyAdvice.breakdown.levelUpLevel, 9);

  const fourCostBoardSlotCapPlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'four-cost-board-slot-cap-variant',
      slot: 'E',
      name: 'Four Cost Board Slot Cap',
      code: '',
      traitsSummary: '9probe',
      mainCarries: [{ name: 'dragon', isCarry: true }],
      frontliners: [{ name: 'sentinel' }],
      units: [
        { name: 'dragon' },
        { name: 'sentinel' },
        { name: 'scout' },
        { name: 'page' },
        { name: 'guard' },
        { name: 'sprite' },
        { name: 'hawk' },
        { name: 'wolf' },
        { name: 'sage' },
      ],
    },
    championAssets: {
      dragon: { name: 'dragon', cost: 4 },
      sentinel: { name: 'sentinel', cost: 4 },
      scout: { name: 'scout', cost: 2 },
      page: { name: 'page', cost: 2 },
      guard: { name: 'guard', cost: 2 },
      sprite: { name: 'sprite', cost: 2 },
      hawk: { name: 'hawk', cost: 3 },
      wolf: { name: 'wolf', cost: 2 },
      sage: { name: 'sage', cost: 3 },
    },
    handState: {
      active: false,
      targetNames: [],
      owned: {
        dragon: {
          name: 'dragon',
          count: 2,
          boughtCount: 2,
          benchCount: 0,
          cost: 4,
          updatedAt: 1000,
        },
        sentinel: {
          name: 'sentinel',
          count: 2,
          boughtCount: 2,
          benchCount: 0,
          cost: 4,
          updatedAt: 1000,
        },
      },
      events: [],
    },
    economyState: {
      active: true,
      round: '5-1',
      gold: 80,
      health: 72,
      level: 8,
      experience: 0,
      experienceMax: 80,
      streakKind: 'win',
      streakInterest: 2,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
  });
  assert.equal(fourCostBoardSlotCapPlan.economyAdvice.action, 'level');
  assert.equal(fourCostBoardSlotCapPlan.economyAdvice.recommendedRollCount, 0);
  assert.equal(fourCostBoardSlotCapPlan.economyAdvice.breakdown.levelUpTargetName, 'dragon');
  assert.equal(fourCostBoardSlotCapPlan.economyAdvice.breakdown.levelUpBoardSlotPressure, true);
  assert.equal(fourCostBoardSlotCapPlan.economyAdvice.breakdown.levelUpProjectedUnitCount, 9);
  assert.equal(fourCostBoardSlotCapPlan.economyAdvice.breakdown.levelUpStreakValue, 3);

  const benchInterestPlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'bench-interest-variant',
      slot: 'D',
      name: 'Bench Interest',
      code: '',
      traitsSummary: '1probe',
      mainCarries: [{ name: 'eagle', isCarry: true }],
      frontliners: [],
      units: [{ name: 'eagle' }],
    },
    championAssets: {
      eagle: { name: 'eagle', cost: 2 },
      moth: { name: 'moth', cost: 2 },
    },
    handState: {
      active: true,
      targetNames: ['eagle'],
      owned: {
        eagle: {
          name: 'eagle',
          count: 1,
          boughtCount: 1,
          benchCount: 1,
          cost: 2,
          updatedAt: 1000,
        },
        moth: {
          name: 'moth',
          count: 1,
          boughtCount: 1,
          benchCount: 1,
          cost: 2,
          updatedAt: 1000,
        },
      },
      events: [],
    },
    economyState: {
      active: true,
      gold: 28,
      level: 6,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
  });
  assert.equal(benchInterestPlan.economyAdvice.action, 'save');
  assert.equal(benchInterestPlan.economyAdvice.interestGoldNeeded, 2);
  assert.ok(benchInterestPlan.economyAdvice.benchInterestAdvice);
  assert.equal(benchInterestPlan.economyAdvice.benchInterestAdvice.canReachNextInterest, true);
  assert.equal(benchInterestPlan.economyAdvice.benchInterestAdvice.sellGoldAvailable, 2);
  assert.deepEqual(
    benchInterestPlan.economyAdvice.benchInterestAdvice.sellCandidates.map(
      (candidate) => candidate.name,
    ),
    ['moth'],
  );
  assert.equal(
    benchInterestPlan.economyAdvice.benchInterestAdvice.sellCandidates[0].kind,
    'fantasy',
  );
  assert.equal(
    benchInterestPlan.economyAdvice.benchInterestAdvice.preservedNames.includes('eagle'),
    true,
  );
  assert.equal(benchInterestPlan.recommendedRollTargetNames.includes('moth'), false);

  const benchPairBaitPlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'bench-pair-bait-variant',
      slot: 'D',
      name: 'Bench Pair Bait',
      code: '',
      traitsSummary: '1probe',
      mainCarries: [{ name: 'eagle', isCarry: true }],
      frontliners: [],
      units: [{ name: 'eagle' }],
    },
    championAssets: {
      eagle: { name: 'eagle', cost: 2 },
      moth: { name: 'moth', cost: 2 },
    },
    handState: {
      active: true,
      targetNames: ['eagle'],
      owned: {
        eagle: {
          name: 'eagle',
          count: 2,
          boughtCount: 2,
          benchCount: 1,
          cost: 2,
          updatedAt: 1000,
        },
        moth: {
          name: 'moth',
          count: 2,
          boughtCount: 2,
          benchCount: 2,
          cost: 2,
          updatedAt: 1000,
        },
      },
      events: [],
    },
    economyState: {
      active: true,
      gold: 28,
      level: 6,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
  });
  assert.ok(benchPairBaitPlan.economyAdvice.benchInterestAdvice);
  assert.equal(benchPairBaitPlan.economyAdvice.benchInterestAdvice.canReachNextInterest, true);
  assert.deepEqual(
    benchPairBaitPlan.economyAdvice.benchInterestAdvice.sellCandidates.map(
      (candidate) => candidate.name,
    ),
    ['moth'],
  );
  assert.equal(
    benchPairBaitPlan.economyAdvice.benchInterestAdvice.sellCandidates[0].kind,
    'pairBait',
  );
  assert.equal(
    benchPairBaitPlan.economyAdvice.benchInterestAdvice.preservedNames.includes('eagle'),
    true,
  );

  const stageFourBenchCleanupPlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'stage-four-bench-cleanup-variant',
      slot: 'D',
      name: 'Stage Four Bench Cleanup',
      code: '',
      traitsSummary: '1probe',
      mainCarries: [{ name: 'eagle', isCarry: true }],
      frontliners: [],
      units: [{ name: 'eagle' }],
    },
    championAssets: {
      eagle: { name: 'eagle', cost: 2 },
      moth: { name: 'moth', cost: 2 },
      owl: { name: 'owl', cost: 3 },
    },
    handState: {
      active: true,
      targetNames: ['eagle'],
      owned: {
        eagle: {
          name: 'eagle',
          count: 1,
          boughtCount: 1,
          benchCount: 1,
          cost: 2,
          updatedAt: 1000,
        },
        moth: {
          name: 'moth',
          count: 2,
          boughtCount: 2,
          benchCount: 2,
          cost: 2,
          updatedAt: 1000,
        },
        owl: {
          name: 'owl',
          count: 1,
          boughtCount: 1,
          benchCount: 1,
          cost: 3,
          updatedAt: 1000,
        },
      },
      events: [],
    },
    economyState: {
      active: true,
      round: '4-1',
      gold: 50,
      level: 7,
      estimatedGoldDelta: 0,
      boughtChampionGold: 0,
      refreshGold: 0,
      xpGold: 0,
      xpPurchases: 0,
      events: [],
    },
  });
  assert.ok(stageFourBenchCleanupPlan.economyAdvice.benchInterestAdvice);
  assert.equal(stageFourBenchCleanupPlan.economyAdvice.interestGoldNeeded, undefined);
  assert.equal(
    stageFourBenchCleanupPlan.economyAdvice.benchInterestAdvice.cleanupRecommended,
    true,
  );
  assert.deepEqual(
    stageFourBenchCleanupPlan.economyAdvice.benchInterestAdvice.cleanupCandidateNames,
    ['moth', 'owl'],
  );
  assert.equal(stageFourBenchCleanupPlan.economyAdvice.benchInterestAdvice.decisionTaxCount, 2);
  assert.equal(stageFourBenchCleanupPlan.economyAdvice.benchInterestAdvice.benchTaxGold, 7);
  assert.deepEqual(
    stageFourBenchCleanupPlan.economyAdvice.benchInterestAdvice.sellCandidates.map(
      (candidate) => [candidate.name, candidate.kind, candidate.cleanupReason],
    ),
    [
      ['moth', 'pairBait', 'stageFourPairBait'],
      ['owl', 'fantasy', 'stageFourDeadSingle'],
    ],
  );
  assert.equal(
    stageFourBenchCleanupPlan.economyAdvice.benchInterestAdvice.preservedNames.includes('eagle'),
    true,
  );

  const pairBaitTargetVariant = {
    id: 'pair-bait-target-variant',
    slot: 'D',
    name: 'Pair Bait Target',
    code: '',
    traitsSummary: '1probe',
    mainCarries: [{ name: 'eagle', isCarry: true }],
    frontliners: [],
    units: [{ name: 'eagle' }],
  };
  const pairBaitTargetChampionAssets = {
    eagle: {
      name: 'eagle',
      cost: 2,
      imagePath: 'resource_knowledge/image/champion/2/eagle.png',
    },
    moth: {
      name: 'moth',
      cost: 3,
      imagePath: 'resource_knowledge/image/champion/3/moth.png',
    },
  };
  const buildPairBaitTargetPlan = (round) =>
    buildGoldenSpatulaDecisionPlan({
      activeVariant: pairBaitTargetVariant,
      recommendedLineups: [
        {
          id: 'pair-bait-target-rec',
          slug: 'pair-bait-target-rec',
          name: 'Pair Bait Target Rec',
          path: 'pair-bait-target-rec.json',
          quality: 'B',
          variant: {
            id: 'pair-bait-target-rec-variant',
            slot: 'A',
            name: 'Pair Bait Target Rec',
            code: '',
            traitsSummary: '1wing',
            mainCarries: [],
            frontliners: [],
            units: [{ name: 'moth' }],
          },
        },
      ],
      championAssets: pairBaitTargetChampionAssets,
      handState: {
        active: true,
        targetNames: ['eagle'],
        owned: {
          eagle: {
            name: 'eagle',
            count: 1,
            boughtCount: 1,
            benchCount: 1,
            cost: 2,
            updatedAt: 1000,
          },
          moth: {
            name: 'moth',
            count: 2,
            boughtCount: 2,
            benchCount: 2,
            cost: 3,
            updatedAt: 1000,
          },
        },
        events: [],
      },
      economyState: {
        active: true,
        round,
        gold: 50,
        health: 72,
        level: 7,
        estimatedGoldDelta: 0,
        boughtChampionGold: 0,
        refreshGold: 0,
        xpGold: 0,
        xpPurchases: 0,
        events: [],
      },
      knowledgeState: {
        active: true,
        shopSlots: {
          1: {
            slotIndex: 1,
            championName: 'moth',
            confidence: 'matched',
            updatedAt: 1000,
          },
        },
        items: {},
        streak: {},
        events: [],
      },
    });

  const preStagePairBaitTargetPlan = buildPairBaitTargetPlan('3-2');
  const stageFourPairBaitTargetPlan = buildPairBaitTargetPlan('4-1');
  const preStagePairBaitMoth = preStagePairBaitTargetPlan.picks.find(
    (pick) => pick.name === 'moth',
  );
  assert.ok(preStagePairBaitMoth);
  assert.equal(preStagePairBaitMoth.reasons.includes('nearUpgrade'), true);
  assert.equal(preStagePairBaitTargetPlan.economyAdvice.breakdown.nearUpgrade, false);
  assert.equal(preStagePairBaitTargetPlan.economyAdvice.urgentPickNames.includes('moth'), false);
  assert.equal(preStagePairBaitTargetPlan.recommendedRollTargetNames.includes('moth'), false);
  const stageFourPairBaitMoth = stageFourPairBaitTargetPlan.picks.find(
    (pick) => pick.name === 'moth',
  );
  assert.ok(stageFourPairBaitMoth);
  assert.equal(stageFourPairBaitMoth.reasons.includes('nearUpgrade'), true);
  assert.equal(stageFourPairBaitMoth.reasons.includes('activeLineup'), false);
  assert.equal(stageFourPairBaitMoth.reasons.includes('traitBridge'), false);
  assert.equal(stageFourPairBaitMoth.reasons.includes('cheapTransition'), false);
  assert.equal(
    stageFourPairBaitTargetPlan.economyAdvice.benchInterestAdvice?.cleanupCandidateNames.includes(
      'moth',
    ),
    true,
  );
  assert.equal(stageFourPairBaitTargetPlan.recommendedRollTargetNames.includes('moth'), false);
  const stageFourPairBaitDecisionTargets = collectGoldenSpatulaDecisionRollTargetTemplates({
    variant: pairBaitTargetVariant,
    championAssets: pairBaitTargetChampionAssets,
    decisionPlan: stageFourPairBaitTargetPlan,
  });
  assert.equal(
    stageFourPairBaitDecisionTargets.some((target) => target.name === 'moth'),
    false,
  );

  const futureCarryDeadSingleVariant = {
    id: 'future-carry-dead-single-target-variant',
    slot: 'D',
    name: 'Future Carry Dead Single Target',
    code: '',
    traitsSummary: '1probe',
    mainCarries: [{ name: 'eagle', isCarry: true }],
    frontliners: [],
    units: [{ name: 'eagle' }],
  };
  const futureCarryDeadSingleChampionAssets = {
    eagle: {
      name: 'eagle',
      cost: 2,
      imagePath: 'resource_knowledge/image/champion/2/eagle.png',
    },
    phoenix: {
      name: 'phoenix',
      cost: 3,
      imagePath: 'resource_knowledge/image/champion/3/phoenix.png',
    },
    dragon: {
      name: 'dragon',
      cost: 4,
      imagePath: 'resource_knowledge/image/champion/4/dragon.png',
    },
  };
  const buildFutureCarryDeadSingleTargetPlan = ({
    id,
    name,
    round,
    gold,
    health,
    shopVisible = true,
    futureName = 'phoenix',
    ownedFutureCount = 0,
    contestExternalCopies = 0,
    itemFit = false,
    traitBridge = false,
    economyPatch = {},
  }) =>
    buildGoldenSpatulaDecisionPlan({
      activeVariant: { ...futureCarryDeadSingleVariant, id, name },
      recommendedLineups: [
        {
          id: `${id}-rec`,
          slug: `${id}-rec`,
          name: `${name} Rec`,
          path: `${id}-rec.json`,
          quality: 'B',
          variant: {
            id: `${id}-rec-variant`,
            slot: 'A',
            name: `${name} Rec`,
            code: '',
            traitsSummary: traitBridge ? '1probe' : '1wing',
            mainCarries: [{ name: futureName, isCarry: true }],
            frontliners: [],
            units: [
              itemFit
                ? { name: futureName, items: ['utility charm'] }
                : { name: futureName },
            ],
          },
        },
      ],
      championAssets: futureCarryDeadSingleChampionAssets,
      itemAssets: itemFit
        ? {
            'utility charm': {
              name: 'utility charm',
              imagePath: 'resource_knowledge/image/item/completed/utility_charm.png',
            },
          }
        : undefined,
      handState: {
        active: true,
        targetNames: ['eagle'],
        owned: {
          eagle: {
            name: 'eagle',
            count: 1,
            boughtCount: 1,
            benchCount: 1,
            cost: 2,
            updatedAt: 1000,
          },
          ...(ownedFutureCount > 0
            ? {
                [futureName]: {
                  name: futureName,
                  count: ownedFutureCount,
                  boughtCount: ownedFutureCount,
                  benchCount: ownedFutureCount,
                  cost: futureCarryDeadSingleChampionAssets[futureName]?.cost,
                  updatedAt: 1000,
                },
              }
            : {}),
        },
        events: [],
      },
      economyState: {
        active: true,
        round,
        gold,
        health,
        level: 7,
        estimatedGoldDelta: 0,
        boughtChampionGold: 0,
        refreshGold: 0,
        xpGold: 0,
        xpPurchases: 0,
        ...economyPatch,
        events: [],
      },
      knowledgeState: {
        active: true,
        shopSlots: shopVisible
          ? {
              1: {
                slotIndex: 1,
                championName: futureName,
                confidence: 'matched',
                updatedAt: 1000,
              },
            }
          : {},
        items: itemFit
          ? {
              'completedItems:item/completed/utility_charm.png': {
                templatePath: 'item/completed/utility_charm.png',
                itemKind: 'completedItems',
                zones: ['inventory'],
                updatedAt: 1000,
              },
            }
          : {},
        streak: {},
        events: [],
      },
      contestState:
        contestExternalCopies > 0
          ? {
              active: true,
              champions: {
                [futureName]: {
                  championName: futureName,
                  externalCopies: contestExternalCopies,
                  playerCount: 1,
                  confidence: 'observed',
                  updatedAt: 1000,
                },
              },
            }
          : undefined,
    });

  const preStageFutureCarryTargetPlan = buildFutureCarryDeadSingleTargetPlan({
    id: 'pre-stage-future-carry-target-variant',
    name: 'Pre Stage Future Carry Target',
    round: '3-5',
    gold: 50,
    health: 72,
  });
  const preStageFutureCarryPhoenix = preStageFutureCarryTargetPlan.picks.find(
    (pick) => pick.name === 'phoenix',
  );
  assert.ok(preStageFutureCarryPhoenix);
  assert.equal(preStageFutureCarryPhoenix.ownedCount, 0);
  assert.equal(preStageFutureCarryPhoenix.shopVisibleCount, 1);
  assert.equal(preStageFutureCarryPhoenix.reasons.includes('recommendedCarry'), true);
  assert.equal(preStageFutureCarryPhoenix.reasons.includes('activeLineup'), false);
  assert.equal(preStageFutureCarryPhoenix.reasons.includes('traitBridge'), false);
  assert.equal(preStageFutureCarryPhoenix.reasons.includes('cheapTransition'), false);
  assert.equal(
    preStageFutureCarryTargetPlan.economyAdvice.urgentPickNames.includes('phoenix'),
    false,
  );
  assert.equal(
    preStageFutureCarryTargetPlan.recommendedRollTargetNames.includes('phoenix'),
    false,
  );

  const preStageFutureCarryRollTargetPlan = buildFutureCarryDeadSingleTargetPlan({
    id: 'pre-stage-future-carry-roll-target-variant',
    name: 'Pre Stage Future Carry Roll Target',
    round: '3-5',
    gold: 50,
    health: 72,
    shopVisible: false,
  });
  assert.equal(
    preStageFutureCarryRollTargetPlan.recommendedRollTargetNames.includes('phoenix'),
    false,
  );
  const preStageFutureCarryRollTargets = collectGoldenSpatulaDecisionRollTargetTemplates({
    variant: {
      ...futureCarryDeadSingleVariant,
      id: 'pre-stage-future-carry-roll-target-variant',
      name: 'Pre Stage Future Carry Roll Target',
    },
    championAssets: futureCarryDeadSingleChampionAssets,
    decisionPlan: preStageFutureCarryRollTargetPlan,
  });
  assert.equal(
    preStageFutureCarryRollTargets.some((target) => target.name === 'phoenix'),
    false,
  );

  const preStageTraitBridgeFutureCarryDeadSinglePlan = buildFutureCarryDeadSingleTargetPlan({
    id: 'pre-stage-trait-bridge-future-carry-dead-single-variant',
    name: 'Pre Stage Trait Bridge Future Carry Dead Single',
    round: '3-5',
    gold: 50,
    health: 72,
    shopVisible: false,
    traitBridge: true,
  });
  const preStageTraitBridgeFutureCarryPhoenix =
    preStageTraitBridgeFutureCarryDeadSinglePlan.picks.find(
      (pick) => pick.name === 'phoenix',
    );
  assert.ok(preStageTraitBridgeFutureCarryPhoenix);
  assert.equal(
    preStageTraitBridgeFutureCarryPhoenix.reasons.includes('recommendedCarry'),
    true,
  );
  assert.equal(
    preStageTraitBridgeFutureCarryPhoenix.reasons.includes('traitBridge'),
    true,
  );
  assert.equal(
    preStageTraitBridgeFutureCarryDeadSinglePlan.recommendedRollTargetNames.includes(
      'phoenix',
    ),
    false,
  );
  const preStageTraitBridgeFutureCarryTargets =
    collectGoldenSpatulaDecisionRollTargetTemplates({
      variant: {
        ...futureCarryDeadSingleVariant,
        id: 'pre-stage-trait-bridge-future-carry-dead-single-variant',
        name: 'Pre Stage Trait Bridge Future Carry Dead Single',
      },
      championAssets: futureCarryDeadSingleChampionAssets,
      decisionPlan: preStageTraitBridgeFutureCarryDeadSinglePlan,
    });
  assert.equal(
    preStageTraitBridgeFutureCarryTargets.some((target) => target.name === 'phoenix'),
    false,
  );

  const preStageTraitBridgePairPlan = buildFutureCarryDeadSingleTargetPlan({
    id: 'pre-stage-trait-bridge-pair-variant',
    name: 'Pre Stage Trait Bridge Pair',
    round: '3-5',
    gold: 50,
    health: 72,
    shopVisible: true,
    ownedFutureCount: 1,
    traitBridge: true,
  });
  const preStageTraitBridgePairPhoenix = preStageTraitBridgePairPlan.picks.find(
    (pick) => pick.name === 'phoenix',
  );
  assert.ok(preStageTraitBridgePairPhoenix);
  assert.equal(preStageTraitBridgePairPhoenix.ownedCount, 1);
  assert.equal(preStageTraitBridgePairPhoenix.shopVisibleCount, 1);
  assert.equal(preStageTraitBridgePairPhoenix.reasons.includes('traitBridge'), true);
  assert.equal(
    preStageTraitBridgePairPlan.recommendedRollTargetNames.includes('phoenix'),
    true,
  );
  const preStageTraitBridgePairTargets = collectGoldenSpatulaDecisionRollTargetTemplates({
    variant: {
      ...futureCarryDeadSingleVariant,
      id: 'pre-stage-trait-bridge-pair-variant',
      name: 'Pre Stage Trait Bridge Pair',
    },
    championAssets: futureCarryDeadSingleChampionAssets,
    decisionPlan: preStageTraitBridgePairPlan,
  });
  assert.equal(
    preStageTraitBridgePairTargets.some((target) => target.name === 'phoenix'),
    true,
  );

  const preStageOwnedFutureCarryDeadSinglePlan = buildFutureCarryDeadSingleTargetPlan({
    id: 'pre-stage-owned-future-carry-dead-single-variant',
    name: 'Pre Stage Owned Future Carry Dead Single',
    round: '3-5',
    gold: 50,
    health: 72,
    shopVisible: false,
    ownedFutureCount: 1,
  });
  const preStageOwnedFutureCarryPhoenix = preStageOwnedFutureCarryDeadSinglePlan.picks.find(
    (pick) => pick.name === 'phoenix',
  );
  assert.ok(preStageOwnedFutureCarryPhoenix);
  assert.equal(preStageOwnedFutureCarryPhoenix.ownedCount, 1);
  assert.equal(preStageOwnedFutureCarryPhoenix.reasons.includes('recommendedCarry'), true);
  assert.equal(preStageOwnedFutureCarryPhoenix.reasons.includes('activeLineup'), false);
  assert.equal(preStageOwnedFutureCarryPhoenix.reasons.includes('traitBridge'), false);
  assert.equal(preStageOwnedFutureCarryPhoenix.reasons.includes('cheapTransition'), false);
  assert.equal(
    preStageOwnedFutureCarryDeadSinglePlan.recommendedRollTargetNames.includes('phoenix'),
    false,
  );
  const preStageOwnedFutureCarryTargets = collectGoldenSpatulaDecisionRollTargetTemplates({
    variant: {
      ...futureCarryDeadSingleVariant,
      id: 'pre-stage-owned-future-carry-dead-single-variant',
      name: 'Pre Stage Owned Future Carry Dead Single',
    },
    championAssets: futureCarryDeadSingleChampionAssets,
    decisionPlan: preStageOwnedFutureCarryDeadSinglePlan,
  });
  assert.equal(
    preStageOwnedFutureCarryTargets.some((target) => target.name === 'phoenix'),
    false,
  );

  const preStageFutureFourCostDeadSinglePlan = buildFutureCarryDeadSingleTargetPlan({
    id: 'pre-stage-future-four-cost-dead-single-variant',
    name: 'Pre Stage Future Four Cost Dead Single',
    round: '3-5',
    gold: 50,
    health: 72,
    shopVisible: false,
    futureName: 'dragon',
  });
  const preStageFutureFourCostDragon = preStageFutureFourCostDeadSinglePlan.picks.find(
    (pick) => pick.name === 'dragon',
  );
  assert.ok(preStageFutureFourCostDragon);
  assert.equal(preStageFutureFourCostDragon.ownedCount, 0);
  assert.equal(preStageFutureFourCostDragon.reasons.includes('recommendedCarry'), true);
  assert.equal(preStageFutureFourCostDragon.reasons.includes('activeLineup'), false);
  assert.equal(preStageFutureFourCostDragon.reasons.includes('traitBridge'), false);
  assert.equal(preStageFutureFourCostDragon.reasons.includes('cheapTransition'), false);
  assert.equal(
    preStageFutureFourCostDeadSinglePlan.recommendedRollTargetNames.includes('dragon'),
    false,
  );
  const preStageFutureFourCostTargets = collectGoldenSpatulaDecisionRollTargetTemplates({
    variant: {
      ...futureCarryDeadSingleVariant,
      id: 'pre-stage-future-four-cost-dead-single-variant',
      name: 'Pre Stage Future Four Cost Dead Single',
    },
    championAssets: futureCarryDeadSingleChampionAssets,
    decisionPlan: preStageFutureFourCostDeadSinglePlan,
  });
  assert.equal(
    preStageFutureFourCostTargets.some((target) => target.name === 'dragon'),
    false,
  );

  const lowHealthFutureCarryRollTargetPlan = buildFutureCarryDeadSingleTargetPlan({
    id: 'low-health-future-carry-roll-target-variant',
    name: 'Low Health Future Carry Roll Target',
    round: '3-2',
    gold: 32,
    health: 42,
    shopVisible: false,
  });
  assert.equal(
    lowHealthFutureCarryRollTargetPlan.recommendedRollTargetNames.includes('phoenix'),
    false,
  );
  const lowHealthFutureCarryRollTargets = collectGoldenSpatulaDecisionRollTargetTemplates({
    variant: {
      ...futureCarryDeadSingleVariant,
      id: 'low-health-future-carry-roll-target-variant',
      name: 'Low Health Future Carry Roll Target',
    },
    championAssets: futureCarryDeadSingleChampionAssets,
    decisionPlan: lowHealthFutureCarryRollTargetPlan,
  });
  assert.equal(
    lowHealthFutureCarryRollTargets.some((target) => target.name === 'phoenix'),
    false,
  );

  const lowHealthItemFitFutureCarryRollTargetPlan = buildFutureCarryDeadSingleTargetPlan({
    id: 'low-health-item-fit-future-carry-roll-target-variant',
    name: 'Low Health Item Fit Future Carry Roll Target',
    round: '3-2',
    gold: 32,
    health: 42,
    shopVisible: false,
    itemFit: true,
  });
  const lowHealthItemFitFutureCarryPhoenix =
    lowHealthItemFitFutureCarryRollTargetPlan.picks.find((pick) => pick.name === 'phoenix');
  assert.ok(lowHealthItemFitFutureCarryPhoenix);
  assert.equal(lowHealthItemFitFutureCarryPhoenix.reasons.includes('recommendedCarry'), true);
  assert.equal(lowHealthItemFitFutureCarryPhoenix.reasons.includes('itemFit'), true);
  assert.equal(lowHealthItemFitFutureCarryPhoenix.reasons.includes('activeLineup'), false);
  assert.equal(
    lowHealthItemFitFutureCarryRollTargetPlan.recommendedRollTargetNames.includes('phoenix'),
    false,
  );
  const lowHealthItemFitFutureCarryTargets = collectGoldenSpatulaDecisionRollTargetTemplates({
    variant: {
      ...futureCarryDeadSingleVariant,
      id: 'low-health-item-fit-future-carry-roll-target-variant',
      name: 'Low Health Item Fit Future Carry Roll Target',
    },
    championAssets: futureCarryDeadSingleChampionAssets,
    decisionPlan: lowHealthItemFitFutureCarryRollTargetPlan,
  });
  assert.equal(
    lowHealthItemFitFutureCarryTargets.some((target) => target.name === 'phoenix'),
    false,
  );

  const lowHealthContestedFutureCarryDeadSinglePlan = buildFutureCarryDeadSingleTargetPlan({
    id: 'low-health-contested-future-carry-dead-single-variant',
    name: 'Low Health Contested Future Carry Dead Single',
    round: '3-2',
    gold: 32,
    health: 42,
    shopVisible: false,
    contestExternalCopies: 2,
  });
  const lowHealthContestedFutureCarryPhoenix =
    lowHealthContestedFutureCarryDeadSinglePlan.picks.find((pick) => pick.name === 'phoenix');
  assert.ok(lowHealthContestedFutureCarryPhoenix);
  assert.equal(lowHealthContestedFutureCarryPhoenix.reasons.includes('recommendedCarry'), true);
  assert.equal(lowHealthContestedFutureCarryPhoenix.reasons.includes('contested'), true);
  assert.equal(lowHealthContestedFutureCarryPhoenix.reasons.includes('activeLineup'), false);
  assert.equal(lowHealthContestedFutureCarryPhoenix.reasons.includes('traitBridge'), false);
  assert.equal(lowHealthContestedFutureCarryPhoenix.reasons.includes('cheapTransition'), false);
  assert.equal(
    lowHealthContestedFutureCarryDeadSinglePlan.recommendedRollTargetNames.includes('phoenix'),
    false,
  );
  const lowHealthContestedFutureCarryTargets = collectGoldenSpatulaDecisionRollTargetTemplates({
    variant: {
      ...futureCarryDeadSingleVariant,
      id: 'low-health-contested-future-carry-dead-single-variant',
      name: 'Low Health Contested Future Carry Dead Single',
    },
    championAssets: futureCarryDeadSingleChampionAssets,
    decisionPlan: lowHealthContestedFutureCarryDeadSinglePlan,
  });
  assert.equal(
    lowHealthContestedFutureCarryTargets.some((target) => target.name === 'phoenix'),
    false,
  );

  const lowHealthOwnedFutureCarryDeadSinglePlan = buildFutureCarryDeadSingleTargetPlan({
    id: 'low-health-owned-future-carry-dead-single-variant',
    name: 'Low Health Owned Future Carry Dead Single',
    round: '3-2',
    gold: 32,
    health: 42,
    shopVisible: false,
    ownedFutureCount: 1,
  });
  const lowHealthOwnedFutureCarryPhoenix = lowHealthOwnedFutureCarryDeadSinglePlan.picks.find(
    (pick) => pick.name === 'phoenix',
  );
  assert.ok(lowHealthOwnedFutureCarryPhoenix);
  assert.equal(lowHealthOwnedFutureCarryPhoenix.ownedCount, 1);
  assert.equal(lowHealthOwnedFutureCarryPhoenix.reasons.includes('recommendedCarry'), true);
  assert.equal(lowHealthOwnedFutureCarryPhoenix.reasons.includes('activeLineup'), false);
  assert.equal(
    lowHealthOwnedFutureCarryDeadSinglePlan.recommendedRollTargetNames.includes('phoenix'),
    false,
  );
  const lowHealthOwnedFutureCarryTargets = collectGoldenSpatulaDecisionRollTargetTemplates({
    variant: {
      ...futureCarryDeadSingleVariant,
      id: 'low-health-owned-future-carry-dead-single-variant',
      name: 'Low Health Owned Future Carry Dead Single',
    },
    championAssets: futureCarryDeadSingleChampionAssets,
    decisionPlan: lowHealthOwnedFutureCarryDeadSinglePlan,
  });
  assert.equal(
    lowHealthOwnedFutureCarryTargets.some((target) => target.name === 'phoenix'),
    false,
  );

  const lossStreakOwnedFutureCarryDeadSinglePlan = buildFutureCarryDeadSingleTargetPlan({
    id: 'loss-streak-owned-future-carry-dead-single-variant',
    name: 'Loss Streak Owned Future Carry Dead Single',
    round: '3-2',
    gold: 34,
    health: 72,
    shopVisible: false,
    ownedFutureCount: 1,
    economyPatch: {
      streakKind: 'loss',
      streakInterest: 1,
    },
  });
  const lossStreakOwnedFutureCarryPhoenix = lossStreakOwnedFutureCarryDeadSinglePlan.picks.find(
    (pick) => pick.name === 'phoenix',
  );
  assert.ok(lossStreakOwnedFutureCarryPhoenix);
  assert.equal(lossStreakOwnedFutureCarryPhoenix.ownedCount, 1);
  assert.equal(lossStreakOwnedFutureCarryPhoenix.reasons.includes('recommendedCarry'), true);
  assert.equal(lossStreakOwnedFutureCarryPhoenix.reasons.includes('activeLineup'), false);
  assert.equal(lossStreakOwnedFutureCarryDeadSinglePlan.economyAdvice.action, 'save');
  assert.equal(
    lossStreakOwnedFutureCarryDeadSinglePlan.economyAdvice.breakdown.streakPressure,
    'preserve',
  );
  assert.equal(
    lossStreakOwnedFutureCarryDeadSinglePlan.recommendedRollTargetNames.includes('phoenix'),
    false,
  );
  const lossStreakOwnedFutureCarryTargets = collectGoldenSpatulaDecisionRollTargetTemplates({
    variant: {
      ...futureCarryDeadSingleVariant,
      id: 'loss-streak-owned-future-carry-dead-single-variant',
      name: 'Loss Streak Owned Future Carry Dead Single',
    },
    championAssets: futureCarryDeadSingleChampionAssets,
    decisionPlan: lossStreakOwnedFutureCarryDeadSinglePlan,
  });
  assert.equal(
    lossStreakOwnedFutureCarryTargets.some((target) => target.name === 'phoenix'),
    false,
  );

  const lossStreakTraitBridgeFutureCarryDeadSinglePlan =
    buildFutureCarryDeadSingleTargetPlan({
      id: 'loss-streak-trait-bridge-future-carry-dead-single-variant',
      name: 'Loss Streak Trait Bridge Future Carry Dead Single',
      round: '3-2',
      gold: 34,
      health: 72,
      shopVisible: false,
      traitBridge: true,
      economyPatch: {
        streakKind: 'loss',
        streakInterest: 1,
      },
    });
  const lossStreakTraitBridgeFutureCarryPhoenix =
    lossStreakTraitBridgeFutureCarryDeadSinglePlan.picks.find(
      (pick) => pick.name === 'phoenix',
    );
  assert.ok(lossStreakTraitBridgeFutureCarryPhoenix);
  assert.equal(
    lossStreakTraitBridgeFutureCarryPhoenix.reasons.includes('recommendedCarry'),
    true,
  );
  assert.equal(
    lossStreakTraitBridgeFutureCarryPhoenix.reasons.includes('traitBridge'),
    true,
  );
  assert.equal(
    lossStreakTraitBridgeFutureCarryPhoenix.reasons.includes('activeLineup'),
    false,
  );
  assert.equal(
    lossStreakTraitBridgeFutureCarryDeadSinglePlan.economyAdvice.breakdown.streakPressure,
    'preserve',
  );
  assert.equal(
    lossStreakTraitBridgeFutureCarryDeadSinglePlan.recommendedRollTargetNames.includes(
      'phoenix',
    ),
    false,
  );
  const lossStreakTraitBridgeFutureCarryTargets =
    collectGoldenSpatulaDecisionRollTargetTemplates({
      variant: {
        ...futureCarryDeadSingleVariant,
        id: 'loss-streak-trait-bridge-future-carry-dead-single-variant',
        name: 'Loss Streak Trait Bridge Future Carry Dead Single',
      },
      championAssets: futureCarryDeadSingleChampionAssets,
      decisionPlan: lossStreakTraitBridgeFutureCarryDeadSinglePlan,
    });
  assert.equal(
    lossStreakTraitBridgeFutureCarryTargets.some((target) => target.name === 'phoenix'),
    false,
  );

  const lossStreakTraitBridgePairPlan = buildFutureCarryDeadSingleTargetPlan({
    id: 'loss-streak-trait-bridge-pair-variant',
    name: 'Loss Streak Trait Bridge Pair',
    round: '3-2',
    gold: 34,
    health: 72,
    shopVisible: true,
    ownedFutureCount: 1,
    traitBridge: true,
    economyPatch: {
      streakKind: 'loss',
      streakInterest: 1,
    },
  });
  const lossStreakTraitBridgePairPhoenix = lossStreakTraitBridgePairPlan.picks.find(
    (pick) => pick.name === 'phoenix',
  );
  assert.ok(lossStreakTraitBridgePairPhoenix);
  assert.equal(lossStreakTraitBridgePairPhoenix.ownedCount, 1);
  assert.equal(lossStreakTraitBridgePairPhoenix.shopVisibleCount, 1);
  assert.equal(lossStreakTraitBridgePairPhoenix.reasons.includes('traitBridge'), true);
  assert.equal(
    lossStreakTraitBridgePairPlan.recommendedRollTargetNames.includes('phoenix'),
    true,
  );
  const lossStreakTraitBridgePairTargets = collectGoldenSpatulaDecisionRollTargetTemplates({
    variant: {
      ...futureCarryDeadSingleVariant,
      id: 'loss-streak-trait-bridge-pair-variant',
      name: 'Loss Streak Trait Bridge Pair',
    },
    championAssets: futureCarryDeadSingleChampionAssets,
    decisionPlan: lossStreakTraitBridgePairPlan,
  });
  assert.equal(
    lossStreakTraitBridgePairTargets.some((target) => target.name === 'phoenix'),
    true,
  );

  const lowHealthFutureFourCostLevelPollutionPlan = buildFutureCarryDeadSingleTargetPlan({
    id: 'low-health-future-four-cost-level-pollution-variant',
    name: 'Low Health Future Four Cost Level Pollution',
    round: '3-2',
    gold: 32,
    health: 42,
    shopVisible: false,
    futureName: 'dragon',
  });
  assert.notEqual(lowHealthFutureFourCostLevelPollutionPlan.economyAdvice.action, 'level');
  assert.notEqual(
    lowHealthFutureFourCostLevelPollutionPlan.economyAdvice.breakdown.levelUpTargetName,
    'dragon',
  );
  assert.equal(
    lowHealthFutureFourCostLevelPollutionPlan.recommendedRollTargetNames.includes('dragon'),
    false,
  );
  const lowHealthFutureFourCostTargets = collectGoldenSpatulaDecisionRollTargetTemplates({
    variant: {
      ...futureCarryDeadSingleVariant,
      id: 'low-health-future-four-cost-level-pollution-variant',
      name: 'Low Health Future Four Cost Level Pollution',
    },
    championAssets: futureCarryDeadSingleChampionAssets,
    decisionPlan: lowHealthFutureFourCostLevelPollutionPlan,
  });
  assert.equal(
    lowHealthFutureFourCostTargets.some((target) => target.name === 'dragon'),
    false,
  );

  const lowHealthFutureCarryTargetPlan = buildFutureCarryDeadSingleTargetPlan({
    id: 'low-health-future-carry-target-variant',
    name: 'Low Health Future Carry Target',
    round: '3-5',
    gold: 32,
    health: 42,
  });
  const lowHealthFutureCarryPhoenix = lowHealthFutureCarryTargetPlan.picks.find(
    (pick) => pick.name === 'phoenix',
  );
  assert.ok(lowHealthFutureCarryPhoenix);
  assert.equal(lowHealthFutureCarryPhoenix.ownedCount, 0);
  assert.equal(lowHealthFutureCarryPhoenix.shopVisibleCount, 1);
  assert.equal(lowHealthFutureCarryPhoenix.reasons.includes('recommendedCarry'), true);
  assert.equal(lowHealthFutureCarryPhoenix.reasons.includes('activeLineup'), false);
  assert.equal(lowHealthFutureCarryPhoenix.reasons.includes('traitBridge'), false);
  assert.equal(lowHealthFutureCarryPhoenix.reasons.includes('cheapTransition'), false);
  assert.equal(
    lowHealthFutureCarryTargetPlan.economyAdvice.urgentPickNames.includes('phoenix'),
    false,
  );
  assert.equal(
    lowHealthFutureCarryTargetPlan.recommendedRollTargetNames.includes('phoenix'),
    false,
  );
  const lowHealthFutureCarryDecisionTargets = collectGoldenSpatulaDecisionRollTargetTemplates({
    variant: {
      ...futureCarryDeadSingleVariant,
      id: 'low-health-future-carry-target-variant',
      name: 'Low Health Future Carry Target',
    },
    championAssets: futureCarryDeadSingleChampionAssets,
    decisionPlan: lowHealthFutureCarryTargetPlan,
  });
  assert.equal(
    lowHealthFutureCarryDecisionTargets.some((target) => target.name === 'phoenix'),
    false,
  );

  assert.equal(getGoldenSpatulaShopOdds(6, 4, 40), 0.4);
  assert.equal(getGoldenSpatulaShopOdds(6, 4, 0), 0);
  assert.equal(getGoldenSpatulaShopOdds(undefined, 4, 200), 1);
  assert.equal(getGoldenSpatulaShopOdds(6, 4, -20), 0);

  console.log(`Decision picks checked: ${rollPlan.picks.length}`);
  console.log(`Transition lineups checked: ${rollPlan.transitionLineups.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
