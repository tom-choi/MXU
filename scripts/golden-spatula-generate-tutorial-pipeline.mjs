import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import prettier from 'prettier';

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const outputPath = path.join(
  repoRoot,
  'projects',
  'golden_spatula_mumu',
  'resource',
  'pipeline',
  'tutorial.json',
);

const target = {
  dialogueLeft: [730, 630, 2, 2],
  dialogueArrow: [936, 676, 2, 2],
  dialogueText: [936, 644, 2, 2],
  modeBeginner: [729, 444, 2, 2],
  modeStart: [1122, 640, 2, 2],
  introNewPlayer: [640, 465, 2, 2],
  introConfirm: [640, 650, 2, 2],
  buyXp: [286, 615, 2, 2],
  trainingContinue: [640, 584, 2, 2],
  traitButton: [160, 111, 2, 2],
  traitEffectHint: [790, 216, 2, 2],
  traitMemberHint: [714, 407, 2, 2],
  orb: [706, 247, 2, 2],
  itemIconTop: [103, 101, 2, 2],
  itemIconSword: [102, 104],
  itemCarrier: [708, 369],
  carouselPick: [612, 394, 2, 2],
  goldBag: [355, 352, 2, 2],
  shopSlot3Price: [720, 692, 2, 2],
  shopSlot3WidePrice: [756, 692, 2, 2],
  shopSlot4Price: [878, 692, 2, 2],
  shopSlot4WidePrice: [914, 692, 2, 2],
  shopRefresh: [286, 681, 2, 2],
  finalExit: [640, 590, 2, 2],
};

const guard = {
  buyXpButton: {
    template: ['ingame/buy_xp_button_idle.png', 'ingame/buy_xp_button_active.png'],
    threshold: [0.76, 0.7],
    roi: [180, 575, 140, 80],
    timeout: 1500,
  },
  shopRefreshButton: {
    template: ['ingame/shop_refresh_button_idle.png', 'ingame/shop_refresh_button_active.png'],
    threshold: [0.76, 0.7],
    roi: [180, 640, 140, 80],
    timeout: 1500,
  },
};

const MAX_STABLE_ADB_SWIPE_DURATION = 800;

function cap(name, filename) {
  return { name, body: { action: 'Screencap', filename } };
}

function click(name, clickTarget, postDelay, guardConfig = null) {
  return {
    name,
    body: {
      recognition: guardConfig ? 'TemplateMatch' : 'DirectHit',
      ...(guardConfig ?? {}),
      action: 'Click',
      target: clickTarget,
      post_delay: postDelay,
    },
  };
}

function swipe(name, begin, end, duration, postDelay) {
  const stableDuration = Math.min(duration, MAX_STABLE_ADB_SWIPE_DURATION);
  return {
    name,
    body: {
      recognition: 'DirectHit',
      action: 'Swipe',
      begin,
      end,
      duration: stableDuration,
      post_delay: postDelay,
    },
  };
}

function dialogPair(prefix, options = {}) {
  const firstTarget = options.firstTarget || target.dialogueArrow;
  const secondTarget = options.secondTarget || target.dialogueText;
  const firstDelay = options.firstDelay ?? 700;
  const secondDelay = options.secondDelay ?? 2500;
  return [
    click(`${prefix}A`, firstTarget, firstDelay),
    click(`${prefix}B`, secondTarget, secondDelay),
  ];
}

function buildPipeline(steps) {
  const entries = {};
  for (let index = 0; index < steps.length; index += 1) {
    const current = steps[index];
    const next = steps[index + 1];
    entries[current.name] = next ? { ...current.body, next: [next.name] } : current.body;
  }
  return entries;
}

const steps = [
  cap('BeginnerTutorialFullRun', 'tutorial_full_00_mode_page'),
  click('Tutorial_SelectBeginnerMode', target.modeBeginner, 1000),
  click('Tutorial_StartBeginnerMode', target.modeStart, 5000),
  cap('Tutorial_IntroScreencap', 'tutorial_full_01_intro'),
  click('Tutorial_IntroPickNewPlayer', target.introNewPlayer, 1200),
  click('Tutorial_IntroConfirm', target.introConfirm, 16000),

  cap('Tutorial_Stage1Loaded', 'tutorial_full_02_stage1_loaded'),
  ...dialogPair('Tutorial_Stage1Dialog', {
    firstTarget: target.dialogueLeft,
    secondDelay: 2500,
  }),
  click('Tutorial_Stage1BuyXp', target.buyXp, 2500, guard.buyXpButton),
  cap('Tutorial_Stage1AfterXp', 'tutorial_full_03_stage1_after_xp'),
  ...dialogPair('Tutorial_Stage1DeployDialog', {
    firstTarget: target.dialogueLeft,
    secondDelay: 1200,
  }),
  swipe('Tutorial_Stage1DragBenchUnit', [340, 500], [735, 388], 800, 3500),
  cap('Tutorial_Stage1DeployScreencap', 'tutorial_full_04_stage1_deployed'),
  ...dialogPair('Tutorial_Stage1BattleDialog', { secondDelay: 38000 }),

  cap('Tutorial_Stage2AfterBattle1', 'tutorial_full_05_after_battle1'),
  ...dialogPair('Tutorial_Stage2WinDialog', { secondDelay: 4000 }),
  ...dialogPair('Tutorial_Stage2StartDialog', { secondDelay: 2500 }),
  cap('Tutorial_Stage2ShopScreencap', 'tutorial_full_06_stage2_shop'),
  click('Tutorial_Stage2BuyFirstCopy', target.shopSlot3WidePrice, 900),
  click('Tutorial_Stage2BuySecondCopy', target.shopSlot4WidePrice, 4500),
  cap('Tutorial_Stage2StarScreencap', 'tutorial_full_07_stage2_two_star'),
  click('Tutorial_Stage2ContinueTraining', target.trainingContinue, 2500),
  ...dialogPair('Tutorial_Stage2BattleDialog', { secondDelay: 38000 }),

  cap('Tutorial_Stage3AfterBattle2', 'tutorial_full_08_after_battle2'),
  ...dialogPair('Tutorial_Stage3WinDialog', { secondDelay: 3000 }),
  ...dialogPair('Tutorial_Stage3IntroDialog', { secondDelay: 2500 }),
  click('Tutorial_Stage3BuyGuard', target.shopSlot3Price, 2500),
  ...dialogPair('Tutorial_Stage3DeployDialog', { secondDelay: 1200 }),
  swipe('Tutorial_Stage3DragGuard', [337, 496], [640, 282], 900, 3500),
  ...dialogPair('Tutorial_Stage3TraitDialog', { secondDelay: 8000 }),
  click('Tutorial_Stage3OpenTraitButton', target.traitButton, 1500),
  click('Tutorial_Stage3TraitEffectHint', target.traitEffectHint, 1000),
  click('Tutorial_Stage3TraitMemberHint', target.traitMemberHint, 1000),
  swipe('Tutorial_Stage3SellExtra', [335, 500], [640, 641], 1200, 3500),
  cap('Tutorial_Stage3SellScreencap', 'tutorial_full_09_stage3_after_sell'),
  ...dialogPair('Tutorial_Stage3BattleDialog', { secondDelay: 35000 }),

  cap('Tutorial_Stage4AfterBattle3', 'tutorial_full_10_after_battle3'),
  ...dialogPair('Tutorial_Stage4StartDialog', { secondDelay: 4000 }),
  ...dialogPair('Tutorial_Stage4OrbDialog', { secondDelay: 2000 }),
  click('Tutorial_Stage4MoveToOrbFirstTap', target.orb, 1500),
  click('Tutorial_Stage4MoveToOrbSecondTap', target.orb, 4500),
  cap('Tutorial_Stage4ItemScreencap', 'tutorial_full_11_stage4_item_ready'),
  swipe('Tutorial_Stage4EquipSword', target.itemIconSword, target.itemCarrier, 1200, 3500),
  ...dialogPair('Tutorial_Stage4CarouselDialog', { secondDelay: 9000 }),
  cap('Tutorial_CarouselScreencap', 'tutorial_full_12_carousel'),
  ...dialogPair('Tutorial_CarouselHint', { secondDelay: 2500 }),
  click('Tutorial_CarouselPick', target.carouselPick, 10000),
  swipe('Tutorial_Stage4SellCarouselUnit', [640, 504], [579, 642], 1400, 3500),
  ...dialogPair('Tutorial_Stage4CombineHint', { secondDelay: 1500 }),
  swipe('Tutorial_Stage4CombineItem', [102, 101], target.itemCarrier, 1200, 3500),
  click('Tutorial_Stage4RecipeTap', target.itemIconTop, 24000),

  cap('Tutorial_Stage5AfterBattle4', 'tutorial_full_13_after_battle4'),
  ...dialogPair('Tutorial_Stage5Dialog', { secondDelay: 5000 }),
  click('Tutorial_Stage5OpenGoldAndShop', target.goldBag, 3500),
  cap('Tutorial_Stage5ShopScreencap', 'tutorial_full_14_stage5_shop'),
  click('Tutorial_Stage5BuyA', target.shopSlot3Price, 900),
  click('Tutorial_Stage5BuyB', target.shopSlot4Price, 3500),
  click('Tutorial_Stage5RefreshA', target.shopRefresh, 3000, guard.shopRefreshButton),
  click('Tutorial_Stage5BuyC', target.shopSlot3Price, 3500),
  click('Tutorial_Stage5RefreshB', target.shopRefresh, 3000, guard.shopRefreshButton),
  click('Tutorial_Stage5RefreshC', target.shopRefresh, 3000, guard.shopRefreshButton),
  click('Tutorial_Stage5BuyD', target.shopSlot3Price, 900),
  click('Tutorial_Stage5BuyE', target.shopSlot4Price, 3500),
  click('Tutorial_Stage5RefreshD', target.shopRefresh, 3000, guard.shopRefreshButton),
  click('Tutorial_Stage5BuyF', target.shopSlot3Price, 8000),
  cap('Tutorial_Stage5ThreeStarScreencap', 'tutorial_full_15_three_star'),
  ...dialogPair('Tutorial_Stage5FinalBattleDialog', { secondDelay: 25000 }),

  cap('Tutorial_FinalVictoryScreencap', 'tutorial_full_16_victory'),
  click('Tutorial_FinalExitButton', target.finalExit, 8000),
  ...dialogPair('Tutorial_FinalCongratsDialog', { secondDelay: 8000 }),
  ...dialogPair('Tutorial_FinalEncourageDialog', { secondDelay: 15000 }),
  cap('Tutorial_CompleteLobbyScreencap', 'tutorial_full_17_complete_lobby'),
];

async function serializePipeline() {
  return prettier.format(JSON.stringify(buildPipeline(steps)), { parser: 'json' });
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const serialized = await serializePipeline();

  if (args.has('--check')) {
    const current = await fs.readFile(outputPath, 'utf8');
    const currentCanonical = await prettier.format(JSON.stringify(JSON.parse(current)), {
      parser: 'json',
    });
    if (currentCanonical !== serialized) {
      throw new Error(
        `${path.relative(repoRoot, outputPath)} is out of date. Run pnpm golden:generate-tutorial.`,
      );
    }
    console.log(`Tutorial pipeline is up to date (${steps.length} nodes).`);
    return;
  }

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, serialized);
  console.log(`Wrote ${path.relative(repoRoot, outputPath)} (${steps.length} nodes).`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
