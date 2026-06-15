import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const servicePath = path.join(repoRoot, 'src', 'services', 'goldenSpatulaAugmentDecisionModel.ts');

async function importAugmentDecisionModule() {
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

const augmentAssets = {
  不计代价: {
    id: 3904,
    name: '不计代价',
    level: 3,
    description: '立即升到6级并获得8经验值。你无法选择之后的强化符文。',
    aliases: ['不计代价', 'atwhatcost3'],
  },
  来个好伙计: {
    id: 3852,
    name: '来个好伙计！',
    level: 3,
    description: '获得1个随机3星1费弈子和8金币。',
    aliases: ['来个好伙计！', '来个好伙计', 'buildabud3'],
  },
  值得等待: {
    id: 30021,
    name: '值得等待 II',
    level: 3,
    description: '获得一个随机1费或2费弈子。数个回合后获得该弈子的三星版本。',
    aliases: ['值得等待 II', '值得等待', 'worththewait3'],
  },
  潘朵拉的装备: {
    id: 1007,
    name: '潘朵拉的装备',
    level: 1,
    description: '获得1件基础装备。每回合装备会随机变化。',
    aliases: ['潘朵拉装备', 'pandora1'],
  },
  便携锻炉: {
    id: 10570,
    name: '便携锻炉',
    level: 2,
    description: '开启一个武器库，并选择1件神器装备。',
    aliases: ['便携锻炉', 'portableforge2'],
  },
  打捞桶: {
    id: 1008,
    name: '打捞桶',
    level: 2,
    description: '出售携带装备的弈子时会拆卸装备。获得1件基础装备。',
    aliases: ['打捞桶', 'salvage2'],
  },
  部分飞升: {
    id: 1021,
    name: '部分飞升',
    level: 1,
    description: '战斗开始15秒后，你的弈子们造成更多伤害。',
    aliases: ['部分飞升', 'ascension1'],
  },
  清晰头脑: {
    id: 1011,
    name: '清晰头脑',
    level: 2,
    description: '如果回合结束时备战席没有弈子，获得经验值。',
    aliases: ['清晰头脑', 'clearmind2'],
  },
  并肩作战: {
    id: 1019,
    name: '并肩作战 I',
    level: 1,
    description: '每个激活羁绊都会让你的弈子获得攻击力和法术强度。',
    aliases: ['并肩作战 I', '并肩作战', 'standunited1'],
  },
  内瑟斯恩赐: {
    id: 3065,
    name: '内瑟斯的恩赐',
    level: 3,
    description: '获得1个内瑟斯。内瑟斯获得战士装备时更强。',
    aliases: ['内瑟斯的恩赐', 'godaugmentnasus3'],
  },
  棱彩门票: {
    id: 20625,
    name: '棱彩门票',
    level: 3,
    description: '每次刷新商店都有概率获得免费刷新。',
    aliases: ['棱彩门票', 'ticket3'],
  },
  珠光莲花: {
    id: 20242,
    name: '珠光莲花',
    level: 2,
    description: '你的弈子们的技能可以暴击并造成更多伤害。',
    aliases: ['珠光莲花', 'jeweledlotus2'],
  },
};

function choice(slotIndex, titleText, descriptionText = '') {
  return { slotIndex, slotLabel: String(slotIndex), titleText, descriptionText };
}

function variant({
  priorityIds = [],
  alternativeIds = [],
  ids = [],
  note = '最好2经济1战力，优先考虑推荐的战力海克斯',
  traitsSummary = '6重装战士3太空律动3牧羊人',
  units = ['提莫', '内瑟斯', '薇古丝'],
} = {}) {
  return {
    id: 'variant-test',
    slot: 'A',
    name: '测试阵容',
    code: '',
    traitsSummary,
    mainCarries: units.slice(0, 1).map((name) => ({ name, isCarry: true })),
    frontliners: units.slice(1, 2).map((name) => ({ name })),
    units: units.map((name) => ({ name })),
    augmentRecommendations: {
      priorityIds,
      alternativeIds,
      ids: ids.length > 0 ? ids : [...priorityIds, ...alternativeIds],
      note,
    },
  };
}

function referenceChoices() {
  return [
    choice(1, '值得等待 II', '获得一个随机1费或2费弈子。'),
    choice(2, '来个好伙计!', '获得1个随机3星1费弈子和8金币。'),
    choice(3, '不计代价', '立即升到6级并获得8经验值。你无法选择之后的强化符文。'),
  ];
}

function makePriorityCase(id, title, expectedSlot = 2) {
  const slotTitles = {
    1: title === '部分飞升' ? '潘朵拉的装备' : '部分飞升',
    2: title === '清晰头脑' ? '并肩作战 I' : '清晰头脑',
    3: '不计代价',
  };
  slotTitles[expectedSlot] = title;
  return {
    name: `priority ${title}`,
    variant: variant({ priorityIds: [id] }),
    choices: [choice(1, slotTitles[1]), choice(2, slotTitles[2]), choice(3, slotTitles[3])],
    expectedSlot,
  };
}

function makeAlternativeCase(id, title, expectedSlot = 1) {
  return {
    name: `alternative ${title}`,
    variant: variant({ alternativeIds: [id], note: '一个经济保证质量，其他多拿战力提上限' }),
    choices: [choice(expectedSlot, title), choice(2, '不计代价'), choice(3, '值得等待 II')],
    expectedSlot,
  };
}

function makeDangerCase(priorityDanger) {
  return {
    name: priorityDanger ? 'danger can win when explicitly priority' : 'danger is penalized',
    variant: variant({
      priorityIds: priorityDanger ? [3904] : [],
      alternativeIds: priorityDanger ? [] : [3852],
      note: '最好2经济1战力',
    }),
    choices: referenceChoices(),
    expectedSlot: priorityDanger ? 3 : 2,
  };
}

const explicitCases = [
  {
    name: 'reference screenshot prefers recommended buddy',
    variant: variant({ priorityIds: [3852], note: '最好2经济1战力' }),
    choices: referenceChoices(),
    expectedSlot: 2,
  },
  {
    name: 'worth the wait wins when priority',
    variant: variant({ priorityIds: [30021], note: '需要经济和弈子质量' }),
    choices: referenceChoices(),
    expectedSlot: 1,
  },
  makeDangerCase(false),
  makeDangerCase(true),
  {
    name: 'item note boosts portable forge',
    variant: variant({ note: '缺装备，优先装备和神器' }),
    choices: [choice(1, '便携锻炉'), choice(2, '部分飞升'), choice(3, '清晰头脑')],
    expectedSlot: 1,
  },
  {
    name: 'combat note boosts jeweled lotus',
    variant: variant({ note: '补战力提上限，技能伤害更重要' }),
    choices: [choice(1, '清晰头脑'), choice(2, '珠光莲花'), choice(3, '潘朵拉的装备')],
    expectedSlot: 2,
  },
  {
    name: 'economy note boosts clear mind',
    variant: variant({ note: '需要经济和经验，保证质量' }),
    choices: [choice(1, '清晰头脑'), choice(2, '部分飞升'), choice(3, '潘朵拉的装备')],
    expectedSlot: 1,
  },
  {
    name: 'lineup keyword boosts nasus augment',
    variant: variant({ note: '多拿战力', units: ['提莫', '内瑟斯', '薇古丝'] }),
    choices: [choice(1, '部分飞升'), choice(2, '内瑟斯的恩赐'), choice(3, '潘朵拉的装备')],
    expectedSlot: 2,
  },
];

const generatedCases = [
  makePriorityCase(3852, '来个好伙计!'),
  makePriorityCase(30021, '值得等待 II', 1),
  makePriorityCase(10570, '便携锻炉'),
  makePriorityCase(1007, '潘朵拉装备'),
  makePriorityCase(1008, '打捞桶'),
  makePriorityCase(1021, '部分飞升'),
  makePriorityCase(1011, '清晰头脑'),
  makePriorityCase(1019, '并肩作战'),
  makePriorityCase(3065, '内瑟斯的恩赐'),
  makePriorityCase(20625, '棱彩门票'),
  makePriorityCase(20242, '珠光莲花'),
  makeAlternativeCase(3852, '来个好伙计'),
  makeAlternativeCase(30021, '值得等待'),
  makeAlternativeCase(10570, '便携锻炉'),
  makeAlternativeCase(1007, '潘朵拉的装备'),
  makeAlternativeCase(1008, '打捞桶'),
  makeAlternativeCase(1021, '部分飞升'),
  makeAlternativeCase(1011, '清晰头脑'),
  makeAlternativeCase(1019, '并肩作战 I'),
  makeAlternativeCase(3065, '内瑟斯的恩赐'),
  makeAlternativeCase(20625, '棱彩门票'),
  makeAlternativeCase(20242, '珠光莲花'),
  {
    name: 'fuzzy missing punctuation buddy',
    variant: variant({ priorityIds: [3852] }),
    choices: [choice(1, '来个好伙计'), choice(2, '部分飞升'), choice(3, '不计代价')],
    expectedSlot: 1,
  },
  {
    name: 'fuzzy alias buildabud',
    variant: variant({ priorityIds: [3852] }),
    choices: [choice(1, 'buildabud3'), choice(2, '值得等待'), choice(3, '不计代价')],
    expectedSlot: 1,
  },
  {
    name: 'fuzzy roman worth wait',
    variant: variant({ priorityIds: [30021] }),
    choices: [choice(1, '值得等待 Ⅱ'), choice(2, '部分飞升'), choice(3, '不计代价')],
    expectedSlot: 1,
  },
  {
    name: 'fuzzy pandora short name',
    variant: variant({ priorityIds: [1007] }),
    choices: [choice(1, '潘朵拉装备'), choice(2, '部分飞升'), choice(3, '不计代价')],
    expectedSlot: 1,
  },
  {
    name: 'description-only buddy match',
    variant: variant({ priorityIds: [3852] }),
    choices: [
      choice(1, '未知', '获得1个随机3星1费弈子和8金币。'),
      choice(2, '部分飞升'),
      choice(3, '不计代价'),
    ],
    expectedSlot: 1,
  },
  {
    name: 'description-only forge match',
    variant: variant({ priorityIds: [10570] }),
    choices: [
      choice(1, '未知', '开启一个武器库，并选择1件神器装备。'),
      choice(2, '部分飞升'),
      choice(3, '不计代价'),
    ],
    expectedSlot: 1,
  },
  {
    name: 'priority beats better generic fit',
    variant: variant({ priorityIds: [1021], note: '需要经济和经验' }),
    choices: [choice(1, '清晰头脑'), choice(2, '部分飞升'), choice(3, '潘朵拉的装备')],
    expectedSlot: 2,
  },
  {
    name: 'alternative beats nonrecommended economy',
    variant: variant({ alternativeIds: [1021], note: '需要经济和经验' }),
    choices: [choice(1, '清晰头脑'), choice(2, '部分飞升'), choice(3, '潘朵拉的装备')],
    expectedSlot: 2,
  },
  {
    name: 'recommended id beats nonrecommended',
    variant: variant({ ids: [1019], note: '需要战力' }),
    choices: [choice(1, '清晰头脑'), choice(2, '并肩作战 I'), choice(3, '潘朵拉的装备')],
    expectedSlot: 2,
  },
  {
    name: 'item alternative beats combat',
    variant: variant({ alternativeIds: [1008], note: '装备不够' }),
    choices: [choice(1, '珠光莲花'), choice(2, '打捞桶'), choice(3, '部分飞升')],
    expectedSlot: 2,
  },
  {
    name: 'ticket priority wins economy screen',
    variant: variant({ priorityIds: [20625], note: '需要刷新和经济' }),
    choices: [choice(1, '清晰头脑'), choice(2, '棱彩门票'), choice(3, '不计代价')],
    expectedSlot: 2,
  },
  {
    name: 'danger loses to weak recognized option',
    variant: variant({ note: '需要经济' }),
    choices: [choice(1, '不计代价'), choice(2, '清晰头脑'), choice(3, '未知')],
    expectedSlot: 2,
  },
  {
    name: 'combat generic beats unknown text',
    variant: variant({ note: '补战力' }),
    choices: [choice(1, '未知'), choice(2, '部分飞升'), choice(3, '')],
    expectedSlot: 2,
  },
  {
    name: 'item generic beats unknown text',
    variant: variant({ note: '需要装备' }),
    choices: [choice(1, '未知'), choice(2, '潘朵拉的装备'), choice(3, '')],
    expectedSlot: 2,
  },
  {
    name: 'economy generic beats unknown text',
    variant: variant({ note: '需要经济' }),
    choices: [choice(1, '未知'), choice(2, '清晰头脑'), choice(3, '')],
    expectedSlot: 2,
  },
  {
    name: 'lineup keyword can break equal score',
    variant: variant({ note: '补战力', units: ['提莫', '内瑟斯'] }),
    choices: [choice(1, '珠光莲花'), choice(2, '内瑟斯的恩赐'), choice(3, '部分飞升')],
    expectedSlot: 2,
  },
  {
    name: 'priority first reference card',
    variant: variant({ priorityIds: [30021], note: '需要弈子质量' }),
    choices: referenceChoices(),
    expectedSlot: 1,
  },
  {
    name: 'priority third danger still allowed',
    variant: variant({ priorityIds: [3904], note: '特殊策略需要速升' }),
    choices: referenceChoices(),
    expectedSlot: 3,
  },
  {
    name: 'nonpriority third danger rejected',
    variant: variant({ alternativeIds: [30021], note: '需要弈子质量' }),
    choices: referenceChoices(),
    expectedSlot: 1,
  },
  {
    name: 'exact match outranks typo when both recommended',
    variant: variant({ priorityIds: [10570, 1007], note: '需要装备' }),
    choices: [choice(1, '便携锻炉'), choice(2, '潘朵拉装各'), choice(3, '不计代价')],
    expectedSlot: 1,
  },
  {
    name: 'higher priority weight beats alternative',
    variant: variant({ priorityIds: [1011], alternativeIds: [10570], note: '需要装备' }),
    choices: [choice(1, '便携锻炉'), choice(2, '清晰头脑'), choice(3, '不计代价')],
    expectedSlot: 2,
  },
  {
    name: 'alternative beats recommended id',
    variant: variant({ alternativeIds: [10570], ids: [1011], note: '需要经济' }),
    choices: [choice(1, '清晰头脑'), choice(2, '便携锻炉'), choice(3, '不计代价')],
    expectedSlot: 2,
  },
  {
    name: 'recommended id beats danger',
    variant: variant({ ids: [1011], note: '需要经济' }),
    choices: [choice(1, '不计代价'), choice(2, '清晰头脑'), choice(3, '未知')],
    expectedSlot: 2,
  },
  {
    name: 'empty choices produce no best',
    variant: variant(),
    choices: [choice(1, ''), choice(2, ''), choice(3, '')],
    expectedSlot: undefined,
  },
];

const cases = [...explicitCases, ...generatedCases];

async function main() {
  const { buildGoldenSpatulaAugmentDecision, normalizeGoldenSpatulaAugmentText } =
    await importAugmentDecisionModule();

  assert.ok(cases.length >= 50, `expected at least 50 cases, got ${cases.length}`);
  assert.equal(normalizeGoldenSpatulaAugmentText('值得等待 Ⅱ!'), '值得等待ii');

  for (const testCase of cases) {
    const decision = buildGoldenSpatulaAugmentDecision({
      choices: testCase.choices,
      activeVariant: testCase.variant,
      augmentAssets,
    });
    assert.equal(
      decision.bestOption?.slotIndex,
      testCase.expectedSlot,
      `${testCase.name}: unexpected best slot`,
    );
    assert.equal(decision.options.length, testCase.choices.length, `${testCase.name}: option count`);
    if (testCase.expectedSlot !== undefined) {
      assert.ok(decision.bestOption.score >= 45, `${testCase.name}: best score too low`);
    }
  }

  console.log('Golden Spatula augment decision model test');
  console.log(`Unit cases checked: ${cases.length}`);
  console.log('OK: augment OCR matching and scoring rules are stable.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
