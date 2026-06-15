export type GoldenSpatulaAutoRollCount = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type GoldenSpatulaRollPipelineEvent =
  | 'started'
  | 'bought'
  | 'buyConfirmed'
  | 'buyUnconfirmed'
  | 'missed'
  | 'refreshed'
  | 'completed'
  | 'notReady';

export type GoldenSpatulaXpPipelineEvent = 'started' | 'clicked' | 'completed' | 'notReady';

export type GoldenSpatulaHandPipelineEvent =
  | 'started'
  | 'benchHit'
  | 'benchMiss'
  | 'bought'
  | 'completed'
  | 'notReady';

export type GoldenSpatulaEconomyPipelineEvent =
  | 'started'
  | 'scanned'
  | 'recognized'
  | 'scanFailed'
  | 'buyChampion'
  | 'refresh'
  | 'buyXp'
  | 'completed'
  | 'notReady';

export type GoldenSpatulaAugmentPipelineEvent =
  | 'started'
  | 'recognized'
  | 'scanFailed'
  | 'scanned'
  | 'picked'
  | 'completed'
  | 'notReady';

export type GoldenSpatulaEconomyField = 'round' | 'gold' | 'level' | 'experience' | 'streak';
export type GoldenSpatulaAugmentOcrField = 'title' | 'description';

export interface GoldenSpatulaScreenSize {
  width: number;
  height: number;
}

export type GoldenSpatulaPipelineRect = readonly [number, number, number, number];
export type GoldenSpatulaPipelineTarget = readonly [number, number] | GoldenSpatulaPipelineRect;

export interface GoldenSpatulaRollBuyTargetTemplate {
  name: string;
  templatePath: string;
  cost?: number;
}

export const goldenSpatulaAutoRollBuyEntry = 'AutoRollAndBuyTargets';
export const goldenSpatulaAutoLevelRollBuyEntry = 'AutoLevelRollAndBuyTargets';
export const goldenSpatulaEconomyOcrEntry = 'RecognizeEconomyState';
export const goldenSpatulaAugmentOcrEntry = 'RecognizeAugmentChoices';
export const goldenSpatulaAutoPickAugmentEntry = 'AutoPickRecommendedAugment';
export const goldenSpatulaAutoRollBuyFocusScope = 'goldenSpatula.roll';
export const goldenSpatulaXpFocusScope = 'goldenSpatula.xp';
export const goldenSpatulaHandFocusScope = 'goldenSpatula.hand';
export const goldenSpatulaEconomyFocusScope = 'goldenSpatula.economy';
export const goldenSpatulaAugmentFocusScope = 'goldenSpatula.augment';
export const goldenSpatulaLogicalScreenSize = {
  width: 1280,
  height: 720,
  shortSide: 720,
} as const;
export const goldenSpatulaAutoBuyAttemptsPerShop = 5;
export const goldenSpatulaAutoBuyTemplateThreshold = 0.72;
export const goldenSpatulaAutoBuyRecognitionTimeoutMs = 500;
export const goldenSpatulaAutoBuyClickPostDelayMs = 650;
export const goldenSpatulaAutoBuyVerifyTimeoutMs = 700;
export const goldenSpatulaAutoBuyVerifyPostDelayMs = 100;
export const goldenSpatulaBuyXpTarget = [286, 615, 2, 2] as const;
export const goldenSpatulaBuyXpButtonTemplates = [
  'ingame/buy_xp_button_idle.png',
  'ingame/buy_xp_button_active.png',
] as const;
export const goldenSpatulaBuyXpButtonThresholds = [0.76, 0.7] as const;
export const goldenSpatulaBuyXpButtonRoi = [180, 575, 140, 80] as const;
export const goldenSpatulaBuyXpTimeoutMs = 1500;
export const goldenSpatulaBuyXpPostDelayMs = 900;
export const goldenSpatulaShopRefreshTarget = [286, 681, 2, 2] as const;
export const goldenSpatulaShopRefreshButtonTemplates = [
  'ingame/shop_refresh_button_idle.png',
  'ingame/shop_refresh_button_active.png',
] as const;
export const goldenSpatulaShopRefreshButtonThresholds = [0.76, 0.7] as const;
export const goldenSpatulaShopRefreshButtonRoi = [180, 640, 140, 80] as const;
export const goldenSpatulaShopReadyTimeoutMs = 1500;
export const goldenSpatulaShopRefreshTimeoutMs = 1500;
export const goldenSpatulaShopRefreshPostDelayMs = 1300;
export const goldenSpatulaShopChampionSlots = [
  { index: 1, label: '1', roi: [325, 580, 158, 125], target: [404, 642, 2, 2] },
  { index: 2, label: '2', roi: [483, 580, 158, 125], target: [562, 642, 2, 2] },
  { index: 3, label: '3', roi: [641, 580, 158, 125], target: [720, 642, 2, 2] },
  { index: 4, label: '4', roi: [799, 580, 158, 125], target: [878, 642, 2, 2] },
  { index: 5, label: '5', roi: [957, 580, 158, 125], target: [1036, 642, 2, 2] },
] as const;
export const goldenSpatulaItemRecognitionZones = [
  { id: 'inventory', label: 'inventory', roi: [8, 72, 58, 230] },
  { id: 'bench', label: 'bench', roi: [270, 405, 620, 140] },
  { id: 'boardLower', label: 'boardLower', roi: [250, 245, 760, 230] },
] as const;
export const goldenSpatulaBenchChampionSlots = [
  { index: 1, label: '1', roi: [285, 420, 76, 115] },
  { index: 2, label: '2', roi: [362, 420, 76, 115] },
  { index: 3, label: '3', roi: [439, 420, 76, 115] },
  { index: 4, label: '4', roi: [516, 420, 76, 115] },
  { index: 5, label: '5', roi: [593, 420, 76, 115] },
  { index: 6, label: '6', roi: [670, 420, 76, 115] },
  { index: 7, label: '7', roi: [747, 420, 76, 115] },
  { index: 8, label: '8', roi: [824, 420, 76, 115] },
  { index: 9, label: '9', roi: [901, 420, 76, 115] },
] as const;
export const goldenSpatulaEconomyOcrTimeoutMs = 900;
export const goldenSpatulaEconomyOcrThreshold = 0.35;
export const goldenSpatulaEconomyRoundRoi = [500, 6, 70, 28] as const;
export const goldenSpatulaEconomyGoldRoi = [610, 535, 105, 45] as const;
export const goldenSpatulaEconomyLevelRoi = [180, 535, 72, 42] as const;
export const goldenSpatulaEconomyExperienceRoi = [246, 535, 86, 42] as const;
export const goldenSpatulaEconomyStreakRoi = [720, 532, 70, 42] as const;
export const goldenSpatulaEconomyOcrReplace = [
  ['O', '0'],
  ['o', '0'],
  ['I', '1'],
  ['l', '1'],
  ['S', '5'],
  ['s', '5'],
  ['B', '8'],
] as const;
export const goldenSpatulaAugmentOcrTimeoutMs = 650;
export const goldenSpatulaAugmentOcrThreshold = 0.18;
export const goldenSpatulaAugmentPickPostDelayMs = 1200;
export const goldenSpatulaAugmentChoiceSlots = [
  {
    index: 1,
    label: '1',
    titleRoi: [170, 235, 270, 48],
    descriptionRoi: [175, 282, 260, 128],
    target: [310, 318, 2, 2],
  },
  {
    index: 2,
    label: '2',
    titleRoi: [505, 235, 270, 48],
    descriptionRoi: [510, 282, 260, 128],
    target: [640, 318, 2, 2],
  },
  {
    index: 3,
    label: '3',
    titleRoi: [840, 235, 270, 48],
    descriptionRoi: [845, 282, 260, 128],
    target: [970, 318, 2, 2],
  },
] as const;

function getGoldenSpatulaLogicalScale(screen: GoldenSpatulaScreenSize): {
  scaleX: number;
  scaleY: number;
} {
  return {
    scaleX: screen.width / goldenSpatulaLogicalScreenSize.width,
    scaleY: screen.height / goldenSpatulaLogicalScreenSize.height,
  };
}

export function scaleGoldenSpatulaLogicalRectToScreen(
  rect: GoldenSpatulaPipelineRect,
  screen: GoldenSpatulaScreenSize,
): [number, number, number, number] {
  const { scaleX, scaleY } = getGoldenSpatulaLogicalScale(screen);
  return [
    Math.round(rect[0] * scaleX),
    Math.round(rect[1] * scaleY),
    Math.max(1, Math.round(rect[2] * scaleX)),
    Math.max(1, Math.round(rect[3] * scaleY)),
  ];
}

export function scaleGoldenSpatulaLogicalTargetToScreen(
  target: GoldenSpatulaPipelineTarget,
  screen: GoldenSpatulaScreenSize,
): number[] {
  const { scaleX, scaleY } = getGoldenSpatulaLogicalScale(screen);
  const scaled = [Math.round(target[0] * scaleX), Math.round(target[1] * scaleY)];
  if (target.length >= 4) {
    const rectTarget = target as GoldenSpatulaPipelineRect;
    scaled.push(Math.max(1, Math.round(rectTarget[2] * scaleX)));
    scaled.push(Math.max(1, Math.round(rectTarget[3] * scaleY)));
  }
  return scaled;
}

function buildAutoRollFocus(
  event: GoldenSpatulaRollPipelineEvent,
  payload: {
    cycle?: number;
    totalCycles: number;
    rollCount: number;
    targetName?: string;
    targetNames?: string[];
    slotIndex?: number;
    slotLabel?: string;
    cost?: number;
  },
): Record<string, unknown> {
  const slotText = payload.slotLabel ? ` #${payload.slotLabel}` : '';
  return {
    scope: goldenSpatulaAutoRollBuyFocusScope,
    event,
    display: 'log',
    content: `MXU D roll ${event}${payload.targetName ? `: ${payload.targetName}${slotText}` : ''}`,
    ...payload,
  };
}

function buildXpFocus(
  event: GoldenSpatulaXpPipelineEvent,
  payload: {
    current?: number;
    total?: number;
  },
): Record<string, unknown> {
  return {
    scope: goldenSpatulaXpFocusScope,
    event,
    display: 'log',
    content: `MXU XP ${event}${payload.current ? `: ${payload.current}/${payload.total}` : ''}`,
    ...payload,
  };
}

function buildHandFocus(
  event: GoldenSpatulaHandPipelineEvent,
  payload: {
    targetName?: string;
    targetNames?: string[];
    slotIndex?: number;
    slotLabel?: string;
    cost?: number;
  },
): Record<string, unknown> {
  const slotText = payload.slotLabel ? ` #${payload.slotLabel}` : '';
  return {
    scope: goldenSpatulaHandFocusScope,
    event,
    display: 'log',
    content: `MXU hand ${event}${payload.targetName ? `: ${payload.targetName}${slotText}` : ''}`,
    ...payload,
  };
}

function buildEconomyFocus(
  event: GoldenSpatulaEconomyPipelineEvent,
  payload: {
    field?: GoldenSpatulaEconomyField;
    gold?: number;
    level?: number;
    experience?: number;
    experienceMax?: number;
    round?: string;
    streakInterest?: number;
    streakKind?: string;
    goldDelta?: number;
    rawText?: string;
    targetName?: string;
    cost?: number;
  },
): Record<string, unknown> {
  return {
    scope: goldenSpatulaEconomyFocusScope,
    event,
    display: 'log',
    content: `MXU economy ${event}`,
    ...payload,
  };
}

function buildAugmentFocus(
  event: GoldenSpatulaAugmentPipelineEvent,
  payload: {
    slotIndex?: number;
    slotLabel?: string;
    field?: GoldenSpatulaAugmentOcrField;
    title?: string;
    matchedName?: string;
    score?: number;
  },
): Record<string, unknown> {
  const slotText = payload.slotLabel ? ` #${payload.slotLabel}` : '';
  return {
    scope: goldenSpatulaAugmentFocusScope,
    event,
    display: 'log',
    content: `MXU augment ${event}${slotText}`,
    ...payload,
  };
}

function getEconomyOcrFieldSuffix(field: GoldenSpatulaEconomyField): string {
  switch (field) {
    case 'round':
      return 'Round';
    case 'gold':
      return 'Gold';
    case 'level':
      return 'Level';
    case 'experience':
      return 'Experience';
    case 'streak':
      return 'Streak';
  }
}

function getEconomyOcrNodeName(prefix: string, field: GoldenSpatulaEconomyField): string {
  return `${prefix}_${getEconomyOcrFieldSuffix(field)}`;
}

function getEconomyOcrDoneNodeName(prefix: string): string {
  return `${prefix}_Done`;
}

function getEconomyOcrRoi(
  field: GoldenSpatulaEconomyField,
): readonly [number, number, number, number] {
  switch (field) {
    case 'round':
      return goldenSpatulaEconomyRoundRoi;
    case 'gold':
      return goldenSpatulaEconomyGoldRoi;
    case 'level':
      return goldenSpatulaEconomyLevelRoi;
    case 'experience':
      return goldenSpatulaEconomyExperienceRoi;
    case 'streak':
      return goldenSpatulaEconomyStreakRoi;
  }
}

function getEconomyOcrExpected(field: GoldenSpatulaEconomyField): string {
  if (field === 'round') return String.raw`\d{1,2}\s*-\s*\d{1,2}`;
  if (field === 'experience') return String.raw`\d{1,2}\s*/\s*\d{1,2}`;
  if (field === 'streak') return String.raw`\d{1}`;
  return String.raw`\d{1,3}`;
}

function appendEconomyOcrNodes(
  nodes: Record<string, Record<string, unknown>>,
  prefix: string,
  nextNode?: string,
): string {
  const fields: GoldenSpatulaEconomyField[] = ['round', 'gold', 'level', 'experience', 'streak'];
  const firstNode = getEconomyOcrNodeName(prefix, fields[0]);

  fields.forEach((field, index) => {
    const nodeName = getEconomyOcrNodeName(prefix, field);
    const next = fields[index + 1]
      ? getEconomyOcrNodeName(prefix, fields[index + 1])
      : getEconomyOcrDoneNodeName(prefix);

    nodes[nodeName] = {
      recognition: 'OCR',
      expected: getEconomyOcrExpected(field),
      threshold: goldenSpatulaEconomyOcrThreshold,
      replace: goldenSpatulaEconomyOcrReplace,
      order_by: 'Expected',
      roi: getEconomyOcrRoi(field),
      timeout: goldenSpatulaEconomyOcrTimeoutMs,
      action: 'DoNothing',
      next: [next],
      on_error: [next],
      focus: {
        'Node.Recognition.Succeeded': buildEconomyFocus('recognized', {
          field,
          ...(field === 'streak' ? { streakKind: 'unknown' } : {}),
        }),
        'Node.Recognition.Failed': buildEconomyFocus('scanFailed', { field }),
      },
    };
  });

  nodes[getEconomyOcrDoneNodeName(prefix)] = {
    action: 'DoNothing',
    next: nextNode ? [nextNode] : [],
    focus: {
      'Node.PipelineNode.Succeeded': buildEconomyFocus('scanned', {}),
    },
  };

  return firstNode;
}

export function buildEconomyOcrPipelineOverride(nextNode?: string): string {
  const prefix = 'EconomyOcr';
  const nodes: Record<string, Record<string, unknown>> = {
    [goldenSpatulaEconomyOcrEntry]: {
      action: 'Screencap',
      filename: 'economy_ocr_before',
      next: [getEconomyOcrNodeName(prefix, 'round')],
      focus: {
        'Node.PipelineNode.Succeeded': buildEconomyFocus('started', {}),
      },
    },
  };

  appendEconomyOcrNodes(nodes, prefix, nextNode);

  return JSON.stringify(nodes);
}

function getAugmentOcrFieldSuffix(field: GoldenSpatulaAugmentOcrField): string {
  return field === 'title' ? 'Title' : 'Description';
}

function getAugmentOcrNodeName(
  prefix: string,
  slot: (typeof goldenSpatulaAugmentChoiceSlots)[number],
  field: GoldenSpatulaAugmentOcrField,
): string {
  return `${prefix}_S${slot.index}_${getAugmentOcrFieldSuffix(field)}`;
}

function getAugmentOcrDoneNodeName(prefix: string): string {
  return `${prefix}_Done`;
}

function getAugmentOcrRoi(
  slot: (typeof goldenSpatulaAugmentChoiceSlots)[number],
  field: GoldenSpatulaAugmentOcrField,
): readonly [number, number, number, number] {
  return field === 'title' ? slot.titleRoi : slot.descriptionRoi;
}

function appendAugmentOcrNodes(
  nodes: Record<string, Record<string, unknown>>,
  prefix: string,
  nextNode?: string,
): string {
  const fields: GoldenSpatulaAugmentOcrField[] = ['title', 'description'];
  const orderedNodes = goldenSpatulaAugmentChoiceSlots.flatMap((slot) =>
    fields.map((field) => ({ slot, field })),
  );
  const firstNode = getAugmentOcrNodeName(
    prefix,
    goldenSpatulaAugmentChoiceSlots[0],
    fields[0],
  );

  orderedNodes.forEach(({ slot, field }, index) => {
    const nodeName = getAugmentOcrNodeName(prefix, slot, field);
    const next = orderedNodes[index + 1]
      ? getAugmentOcrNodeName(prefix, orderedNodes[index + 1].slot, orderedNodes[index + 1].field)
      : getAugmentOcrDoneNodeName(prefix);

    nodes[nodeName] = {
      recognition: 'OCR',
      expected: '.{1,120}',
      threshold: goldenSpatulaAugmentOcrThreshold,
      order_by: 'Horizontal',
      roi: getAugmentOcrRoi(slot, field),
      timeout: goldenSpatulaAugmentOcrTimeoutMs,
      action: 'DoNothing',
      next: [next],
      on_error: [next],
      focus: {
        'Node.Recognition.Succeeded': buildAugmentFocus('recognized', {
          slotIndex: slot.index,
          slotLabel: slot.label,
          field,
        }),
        'Node.Recognition.Failed': buildAugmentFocus('scanFailed', {
          slotIndex: slot.index,
          slotLabel: slot.label,
          field,
        }),
      },
    };
  });

  nodes[getAugmentOcrDoneNodeName(prefix)] = {
    action: 'DoNothing',
    next: nextNode ? [nextNode] : [],
    focus: {
      'Node.PipelineNode.Succeeded': buildAugmentFocus('scanned', {}),
    },
  };

  return firstNode;
}

export function buildAugmentOcrPipelineOverride(nextNode?: string): string {
  const prefix = 'AugmentOcr';
  const nodes: Record<string, Record<string, unknown>> = {
    [goldenSpatulaAugmentOcrEntry]: {
      action: 'Screencap',
      filename: 'augment_ocr_before',
      next: [getAugmentOcrNodeName(prefix, goldenSpatulaAugmentChoiceSlots[0], 'title')],
      focus: {
        'Node.PipelineNode.Succeeded': buildAugmentFocus('started', {}),
      },
    },
  };

  appendAugmentOcrNodes(nodes, prefix, nextNode);

  return JSON.stringify(nodes);
}

export function buildAutoPickAugmentPipelineOverride(
  slotIndex: number,
  payload: {
    title?: string;
    matchedName?: string;
    score?: number;
  } = {},
): string {
  const slot = goldenSpatulaAugmentChoiceSlots.find((item) => item.index === slotIndex);
  if (!slot) {
    throw new Error(`Unknown augment slot: ${slotIndex}`);
  }

  return JSON.stringify({
    [goldenSpatulaAutoPickAugmentEntry]: {
      action: 'Screencap',
      filename: 'augment_pick_before',
      next: ['AutoPickRecommendedAugment_Click'],
      focus: {
        'Node.PipelineNode.Succeeded': buildAugmentFocus('started', {
          slotIndex: slot.index,
          slotLabel: slot.label,
          ...payload,
        }),
      },
    },
    AutoPickRecommendedAugment_Click: {
      action: 'Click',
      target: slot.target,
      post_delay: goldenSpatulaAugmentPickPostDelayMs,
      next: ['AutoPickRecommendedAugment_After'],
      focus: {
        'Node.Action.Succeeded': buildAugmentFocus('picked', {
          slotIndex: slot.index,
          slotLabel: slot.label,
          ...payload,
        }),
      },
    },
    AutoPickRecommendedAugment_After: {
      action: 'Screencap',
      filename: 'augment_pick_after',
      focus: {
        'Node.PipelineNode.Succeeded': buildAugmentFocus('completed', {
          slotIndex: slot.index,
          slotLabel: slot.label,
          ...payload,
        }),
      },
    },
  });
}

function getAutoRollBuyAttemptStartNode(cycle: number, attempt: number): string {
  return getAutoRollBuyTargetNode(cycle, attempt, 0, 0);
}

function getAutoRollBuyBenchScanNode(targetIndex: number, slotPosition: number): string {
  return `AutoRollBuy_Hand_T${targetIndex}_B${slotPosition + 1}`;
}

function getAutoRollBuyTargetNode(
  cycle: number,
  attempt: number,
  targetIndex: number,
  slotPosition: number,
): string {
  return `AutoRollBuy_C${cycle}_Buy${attempt}_T${targetIndex}_S${slotPosition + 1}`;
}

function getAutoRollBuyVerifyNode(
  cycle: number,
  attempt: number,
  targetIndex: number,
  slotPosition: number,
): string {
  return `AutoRollBuy_C${cycle}_Buy${attempt}_T${targetIndex}_S${slotPosition + 1}_Verify`;
}

function getAutoRollBuyUnconfirmedNode(
  cycle: number,
  attempt: number,
  targetIndex: number,
  slotPosition: number,
): string {
  return `AutoRollBuy_C${cycle}_Buy${attempt}_T${targetIndex}_S${slotPosition + 1}_Unconfirmed`;
}

export function buildAutoRollBuyPipelineOverride(
  targets: GoldenSpatulaRollBuyTargetTemplate[],
  rollCount: GoldenSpatulaAutoRollCount,
): string {
  const totalCycles = rollCount + 1;
  const targetNames = targets.map((target) => target.name);
  const nodes: Record<string, Record<string, unknown>> = {
    [goldenSpatulaAutoRollBuyEntry]: {
      action: 'Screencap',
      filename: 'auto_roll_buy_before',
      next: targets.length > 0 ? [getAutoRollBuyBenchScanNode(0, 0)] : ['AutoRollBuy_Done'],
      focus: {
        'Node.PipelineNode.Succeeded': buildAutoRollFocus('started', {
          cycle: 1,
          totalCycles,
          rollCount,
          targetNames,
        }),
      },
    },
    AutoRollBuy_Done: {
      action: 'Screencap',
      filename: 'auto_roll_buy_after',
      focus: {
        'Node.PipelineNode.Succeeded': buildAutoRollFocus('completed', {
          cycle: totalCycles,
          totalCycles,
          rollCount,
          targetNames,
        }),
      },
    },
  };

  if (targets.length === 0) {
    return JSON.stringify(nodes);
  }

  targets.forEach((target, targetIndex) => {
    goldenSpatulaBenchChampionSlots.forEach((slot, slotPosition) => {
      const nodeName = getAutoRollBuyBenchScanNode(targetIndex, slotPosition);
      const nextNode =
        slotPosition < goldenSpatulaBenchChampionSlots.length - 1
          ? getAutoRollBuyBenchScanNode(targetIndex, slotPosition + 1)
          : targetIndex < targets.length - 1
            ? getAutoRollBuyBenchScanNode(targetIndex + 1, 0)
            : 'AutoRollBuy_EconomyScan';

      nodes[nodeName] = {
        recognition: 'TemplateMatch',
        template: target.templatePath,
        threshold: goldenSpatulaAutoBuyTemplateThreshold,
        roi: slot.roi,
        timeout: goldenSpatulaAutoBuyRecognitionTimeoutMs,
        action: 'DoNothing',
        next: [nextNode],
        on_error: [nextNode],
        focus: {
          'Node.Recognition.Succeeded': buildHandFocus('benchHit', {
            targetName: target.name,
            targetNames,
            slotIndex: slot.index,
            slotLabel: slot.label,
            cost: target.cost,
          }),
        },
      };
    });
  });

  nodes.AutoRollBuy_EconomyScan = {
    action: 'Screencap',
    filename: 'auto_roll_buy_economy_before',
    next: [appendEconomyOcrNodes(nodes, 'AutoRollBuy_PreShop_EconomyOcr', 'AutoRollBuy_ShopReady')],
    focus: {
      'Node.PipelineNode.Succeeded': buildEconomyFocus('started', {}),
    },
  };

  nodes.AutoRollBuy_ShopReady = {
    recognition: 'TemplateMatch',
    template: goldenSpatulaShopRefreshButtonTemplates,
    threshold: goldenSpatulaShopRefreshButtonThresholds,
    roi: goldenSpatulaShopRefreshButtonRoi,
    timeout: goldenSpatulaShopReadyTimeoutMs,
    action: 'DoNothing',
    next: [getAutoRollBuyAttemptStartNode(0, 1)],
    on_error: ['AutoRollBuy_InitialShopNotReady'],
  };

  nodes.AutoRollBuy_InitialShopNotReady = {
    action: 'Screencap',
    filename: 'auto_roll_buy_initial_shop_not_ready',
    focus: {
      'Node.PipelineNode.Succeeded': buildAutoRollFocus('notReady', {
        cycle: 1,
        totalCycles,
        rollCount,
        targetNames,
      }),
    },
  };

  for (let cycle = 0; cycle <= rollCount; cycle += 1) {
    const afterShopNode = cycle < rollCount ? `AutoRollBuy_Roll${cycle + 1}` : 'AutoRollBuy_Done';

    for (let attempt = 1; attempt <= goldenSpatulaAutoBuyAttemptsPerShop; attempt += 1) {
      const successNext =
        attempt < goldenSpatulaAutoBuyAttemptsPerShop
          ? getAutoRollBuyAttemptStartNode(cycle, attempt + 1)
          : afterShopNode;
      const missNode = `AutoRollBuy_C${cycle}_Buy${attempt}_Miss`;

      targets.forEach((target, targetIndex) => {
        goldenSpatulaShopChampionSlots.forEach((slot, slotPosition) => {
          const nodeName = getAutoRollBuyTargetNode(cycle, attempt, targetIndex, slotPosition);
          const verifyNodeName = getAutoRollBuyVerifyNode(
            cycle,
            attempt,
            targetIndex,
            slotPosition,
          );
          const unconfirmedNodeName = getAutoRollBuyUnconfirmedNode(
            cycle,
            attempt,
            targetIndex,
            slotPosition,
          );
          const nextOnMiss =
            slotPosition < goldenSpatulaShopChampionSlots.length - 1
              ? getAutoRollBuyTargetNode(cycle, attempt, targetIndex, slotPosition + 1)
              : targetIndex < targets.length - 1
                ? getAutoRollBuyTargetNode(cycle, attempt, targetIndex + 1, 0)
                : missNode;

          nodes[nodeName] = {
            recognition: 'TemplateMatch',
            template: target.templatePath,
            threshold: goldenSpatulaAutoBuyTemplateThreshold,
            roi: slot.roi,
            timeout: goldenSpatulaAutoBuyRecognitionTimeoutMs,
            action: 'Click',
            target: slot.target,
            post_delay: goldenSpatulaAutoBuyClickPostDelayMs,
            next: [verifyNodeName],
            on_error: [nextOnMiss],
            focus: {
              'Node.Action.Succeeded': buildAutoRollFocus('bought', {
                cycle: cycle + 1,
                totalCycles,
                rollCount,
                targetName: target.name,
                targetNames,
                slotIndex: slot.index,
                slotLabel: slot.label,
                cost: target.cost,
              }),
            },
          };

          nodes[verifyNodeName] = {
            recognition: 'TemplateMatch',
            template: target.templatePath,
            threshold: goldenSpatulaAutoBuyTemplateThreshold,
            roi: slot.roi,
            inverse: true,
            timeout: goldenSpatulaAutoBuyVerifyTimeoutMs,
            action: 'DoNothing',
            post_delay: goldenSpatulaAutoBuyVerifyPostDelayMs,
            next: [successNext],
            on_error: [unconfirmedNodeName],
            focus: {
              'Node.Recognition.Succeeded': buildAutoRollFocus('buyConfirmed', {
                cycle: cycle + 1,
                totalCycles,
                rollCount,
                targetName: target.name,
                targetNames,
                slotIndex: slot.index,
                slotLabel: slot.label,
                cost: target.cost,
              }),
            },
          };

          nodes[unconfirmedNodeName] = {
            action: 'Screencap',
            filename: `auto_roll_buy_c${cycle}_buy${attempt}_t${targetIndex}_s${slot.index}_unconfirmed`,
            next: [successNext],
            focus: {
              'Node.PipelineNode.Succeeded': buildAutoRollFocus('buyUnconfirmed', {
                cycle: cycle + 1,
                totalCycles,
                rollCount,
                targetName: target.name,
                targetNames,
                slotIndex: slot.index,
                slotLabel: slot.label,
                cost: target.cost,
              }),
            },
          };
        });
      });

      nodes[missNode] = {
        action: 'Screencap',
        filename: `auto_roll_buy_c${cycle}_buy${attempt}_miss`,
        next: [afterShopNode],
        focus: {
          'Node.PipelineNode.Succeeded': buildAutoRollFocus('missed', {
            cycle: cycle + 1,
            totalCycles,
            rollCount,
            targetNames,
          }),
        },
      };
    }

    if (cycle < rollCount) {
      const refreshNotReadyNode = `${afterShopNode}_NotReady`;
      nodes[afterShopNode] = {
        recognition: 'TemplateMatch',
        template: goldenSpatulaShopRefreshButtonTemplates,
        threshold: goldenSpatulaShopRefreshButtonThresholds,
        roi: goldenSpatulaShopRefreshButtonRoi,
        timeout: goldenSpatulaShopRefreshTimeoutMs,
        action: 'Click',
        target: goldenSpatulaShopRefreshTarget,
        post_delay: goldenSpatulaShopRefreshPostDelayMs,
        next: [getAutoRollBuyAttemptStartNode(cycle + 1, 1)],
        on_error: [refreshNotReadyNode],
        focus: {
          'Node.Action.Succeeded': buildAutoRollFocus('refreshed', {
            cycle: cycle + 2,
            totalCycles,
            rollCount,
            targetNames,
          }),
        },
      };

      nodes[refreshNotReadyNode] = {
        action: 'Screencap',
        filename: `auto_roll_buy_roll${cycle + 1}_refresh_not_ready`,
        focus: {
          'Node.PipelineNode.Succeeded': buildAutoRollFocus('notReady', {
            cycle: cycle + 1,
            totalCycles,
            rollCount,
            targetNames,
          }),
        },
      };
    }
  }

  return JSON.stringify(nodes);
}

export function buildAutoLevelRollBuyPipelineOverride(
  targets: GoldenSpatulaRollBuyTargetTemplate[],
  rollCount: GoldenSpatulaAutoRollCount,
  xpCount: GoldenSpatulaAutoRollCount,
): string {
  const rollNodes = JSON.parse(buildAutoRollBuyPipelineOverride(targets, rollCount)) as Record<
    string,
    Record<string, unknown>
  >;
  const nodes: Record<string, Record<string, unknown>> = {
    [goldenSpatulaAutoLevelRollBuyEntry]: {
      action: 'Screencap',
      filename: 'auto_level_roll_buy_before',
      next: ['AutoLevelRollBuy_XpClick1'],
      focus: {
        'Node.PipelineNode.Succeeded': buildXpFocus('started', {
          total: xpCount,
        }),
      },
    },
  };

  for (let index = 1; index <= xpCount; index += 1) {
    const nodeName = `AutoLevelRollBuy_XpClick${index}`;
    const next =
      index < xpCount ? `AutoLevelRollBuy_XpClick${index + 1}` : 'AutoLevelRollBuy_XpDone';
    nodes[nodeName] = {
      recognition: 'TemplateMatch',
      template: goldenSpatulaBuyXpButtonTemplates,
      threshold: goldenSpatulaBuyXpButtonThresholds,
      roi: goldenSpatulaBuyXpButtonRoi,
      timeout: goldenSpatulaBuyXpTimeoutMs,
      action: 'Click',
      target: goldenSpatulaBuyXpTarget,
      post_delay: goldenSpatulaBuyXpPostDelayMs,
      next: [next],
      on_error: ['AutoLevelRollBuy_XpNotReady'],
      focus: {
        'Node.Action.Succeeded': buildXpFocus('clicked', {
          current: index,
          total: xpCount,
        }),
      },
    };
  }

  nodes.AutoLevelRollBuy_XpDone = {
    action: 'Screencap',
    filename: 'auto_level_roll_buy_xp_done',
    next: [goldenSpatulaAutoRollBuyEntry],
    focus: {
      'Node.PipelineNode.Succeeded': buildXpFocus('completed', {
        total: xpCount,
      }),
    },
  };

  nodes.AutoLevelRollBuy_XpNotReady = {
    action: 'Screencap',
    filename: 'auto_level_roll_buy_xp_not_ready',
    focus: {
      'Node.PipelineNode.Succeeded': buildXpFocus('notReady', {}),
    },
  };

  return JSON.stringify({
    ...nodes,
    ...rollNodes,
  });
}
