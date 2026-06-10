import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const servicePath = path.join(repoRoot, 'src', 'services', 'goldenSpatulaDecisionEngine.ts');

async function importDecisionModule() {
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
  const tempDir = path.join(repoRoot, 'node_modules', '.cache', 'mxu-golden-tests');
  await fs.mkdir(tempDir, { recursive: true });
  const modulePath = path.join(tempDir, `goldenSpatulaDecisionEngine-${Date.now()}.mjs`);
  await fs.writeFile(modulePath, transpiled.outputText);
  return import(`file://${modulePath.replaceAll('\\', '/')}`);
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
    extractGoldenSpatulaTraitTags,
    getGoldenSpatulaShopOdds,
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
  assert.equal(rollPlan.economyAdvice.action, 'roll');
  assert.equal(rollPlan.transitionLineups[0].name, '木灵小法');

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
  assert.ok(savePlan.picks.length > 0);

  assert.equal(getGoldenSpatulaShopOdds(5, 5), 0);
  assert.equal(getGoldenSpatulaShopOdds(7, 5), 0.01);

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
  const fiveCostPick = levelLockedPlan.picks.find((pick) => pick.name === '薇古丝');
  assert.equal(fiveCostPick?.shopOddsAvailability, 'unavailable');
  assert.equal(fiveCostPick?.shopOdds, 0);
  assert.equal(fiveCostPick?.reasons.includes('levelLocked'), true);
  assert.equal(levelLockedPlan.economyAdvice.action, 'level');

  console.log(`Decision picks checked: ${rollPlan.picks.length}`);
  console.log(`Transition lineups checked: ${rollPlan.transitionLineups.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
