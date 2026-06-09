export type GoldenSpatulaAutoRollCount = 1 | 3 | 5;

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

export interface GoldenSpatulaRollBuyTargetTemplate {
  name: string;
  templatePath: string;
}

export const goldenSpatulaAutoRollBuyEntry = 'AutoRollAndBuyTargets';
export const goldenSpatulaAutoLevelRollBuyEntry = 'AutoLevelRollAndBuyTargets';
export const goldenSpatulaAutoRollBuyFocusScope = 'goldenSpatula.roll';
export const goldenSpatulaXpFocusScope = 'goldenSpatula.xp';
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

function getAutoRollBuyAttemptStartNode(cycle: number, attempt: number): string {
  return getAutoRollBuyTargetNode(cycle, attempt, 0, 0);
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
      next: targets.length > 0 ? ['AutoRollBuy_ShopReady'] : ['AutoRollBuy_Done'],
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
