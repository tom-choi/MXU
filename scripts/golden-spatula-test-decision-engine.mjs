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
const candidateModelPath = path.join(
  repoRoot,
  'src',
  'services',
  'goldenSpatulaCandidateModel.ts',
);
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
  await fs.writeFile(
    rollTargetsModulePath,
    `export * from './goldenSpatulaRollTargets';\n`,
  );
  const transitionModulePath = path.join(tempDir, `goldenSpatulaTransitionModel-${Date.now()}.mjs`);
  await fs.writeFile(
    transitionModulePath,
    `export * from './goldenSpatulaTransitionModel';\n`,
  );
  const acquisitionModulePath = path.join(tempDir, `goldenSpatulaAcquisitionModel-${Date.now()}.mjs`);
  await fs.writeFile(
    acquisitionModulePath,
    `export * from './goldenSpatulaAcquisitionModel';\n`,
  );
  const [decisionModule, rollTargetsModule, transitionModule, acquisitionModule] = await Promise.all([
    import(`file://${modulePath.replaceAll('\\', '/')}`),
    import(`file://${rollTargetsModulePath.replaceAll('\\', '/')}`),
    import(`file://${transitionModulePath.replaceAll('\\', '/')}`),
    import(`file://${acquisitionModulePath.replaceAll('\\', '/')}`),
  ]);
  return { ...decisionModule, ...rollTargetsModule, ...transitionModule, ...acquisitionModule };
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
    scoreGoldenSpatulaTransitionUnit,
    estimateGoldenSpatulaAcquisition,
  } = await importDecisionModule();

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
  assert.equal(rollPlan.transitionLineups[0].scoreBreakdown.final, rollPlan.transitionLineups[0].score);

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
  assert.equal(
    savePlan.economyAdvice.breakdown.rollDecisionScore.factors.economyMargin.score,
    0,
  );
  assert.ok(savePlan.picks.length > 0);

  assert.equal(getGoldenSpatulaShopOdds(5, 5), 0);
  assert.equal(getGoldenSpatulaShopOdds(7, 5), 0.01);
  assert.equal(getGoldenSpatulaShopOdds(8, 1), 0.17);
  assert.equal(getGoldenSpatulaShopOdds(8, 2), 0.24);
  assert.equal(getGoldenSpatulaShopOdds(8, 4), 0.24);
  assert.equal(getGoldenSpatulaShopOdds(9, 1), 0.15);
  assert.equal(getGoldenSpatulaShopOdds(9, 2), 0.18);
  assert.equal(getGoldenSpatulaShopOdds(9, 4), 0.3);
  assert.equal(getGoldenSpatulaShopOdds(9, 5), 0.12);

  const targetSpecificAcquisition = estimateGoldenSpatulaAcquisition({
    shopOdds: 0.4,
    shopOddsAvailability: 'available',
    cost: 2,
    copiesNeeded: 1,
    gold: 40,
    costDensity: { byCost: { 2: 5 }, fallbackDensity: 5 },
  });
  assert.equal(targetSpecificAcquisition.targetSlotOdds, 0.08);
  assert.ok(targetSpecificAcquisition.expectedRollHitRate > 0.33);
  assert.ok(targetSpecificAcquisition.expectedRollHitRate < 0.35);
  assert.ok(targetSpecificAcquisition.expectedRollHitRate < 0.4);

  const unknownAcquisition = estimateGoldenSpatulaAcquisition({
    shopOddsAvailability: 'unknown',
    cost: 3,
    copiesNeeded: 1,
    gold: 40,
    costDensity: { byCost: { 3: 6 }, fallbackDensity: 6 },
  });
  assert.equal(unknownAcquisition.targetSlotOdds, 0.01);
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
  assert.equal(visibleZeroOddsPlan.recommendedRollTargetNames.includes('dragon'), false);

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
      (lineup) => lineup.name === 'Locked Dragon' && lineup.score > transitionSignalPlan.transitionLineups[0].score,
    ),
    false,
  );

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
  assert.equal(explicitLowCostTargetPlan.picks[0].targetCount, 9);
  assert.equal(explicitLowCostTargetPlan.picks[0].copiesNeeded, 9);

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

  const levelUpValuePlan = buildGoldenSpatulaDecisionPlan({
    activeVariant: {
      id: 'level-up-value-variant',
      slot: 'C',
      name: 'Level Up Value',
      code: '',
      traitsSummary: '4probe',
      mainCarries: [{ name: 'dragon', isCarry: true }],
      frontliners: [],
      units: [{ name: 'dragon' }, { name: 'scout' }],
    },
    championAssets: {
      dragon: { name: 'dragon', cost: 4 },
      sentinel: { name: 'sentinel', cost: 4 },
      knight: { name: 'knight', cost: 4 },
      scout: { name: 'scout', cost: 2 },
      page: { name: 'page', cost: 2 },
    },
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
  assert.equal(Math.round((levelUpDragon.levelUpShopOddsGain ?? 0) * 100), 14);
  assert.equal(levelUpValuePlan.economyAdvice.action, 'level');
  assert.equal(levelUpValuePlan.economyAdvice.breakdown.levelUpTargetName, 'dragon');
  assert.equal(levelUpValuePlan.economyAdvice.breakdown.levelUpLevel, 8);
  assert.equal(levelUpValuePlan.economyAdvice.breakdown.levelUpXpNeeded, 18);
  assert.equal(levelUpValuePlan.economyAdvice.breakdown.levelUpGoldNeeded, 20);
  assert.equal(levelUpValuePlan.economyAdvice.recommendedXpPurchaseCount, 5);
  assert.equal(
    Math.round((levelUpValuePlan.economyAdvice.breakdown.levelUpShopOddsGain ?? 0) * 100),
    14,
  );

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
