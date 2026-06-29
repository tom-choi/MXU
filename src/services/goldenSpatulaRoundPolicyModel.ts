import type {
  GoldenSpatulaEconomyRunState,
  GoldenSpatulaPickRecommendation,
  GoldenSpatulaRollDecisionScoreBreakdown,
  GoldenSpatulaRoundPolicyCheckpoint,
  GoldenSpatulaRoundPolicyKind,
  GoldenSpatulaRoundPolicyRecommendation,
  GoldenSpatulaShopCost,
} from '@/types/goldenSpatula';
import type { GoldenSpatulaTempoContext } from './goldenSpatulaTempoModel';

export interface GoldenSpatulaRoundPolicyInput {
  actionablePicks: GoldenSpatulaPickRecommendation[];
  allPicks: GoldenSpatulaPickRecommendation[];
  economyState?: GoldenSpatulaEconomyRunState;
  tempoContext: GoldenSpatulaTempoContext;
  rollDecisionScore: GoldenSpatulaRollDecisionScoreBreakdown;
  hasNearUpgrade: boolean;
  highCostPlan: boolean;
}

function getRoundCheckpoint(
  stage: number | undefined,
  phase: number | undefined,
): GoldenSpatulaRoundPolicyCheckpoint | undefined {
  if (stage === undefined || phase === undefined) return undefined;
  if (stage === 2 && phase === 1) return '2-1';
  if (stage === 2 && phase === 5) return '2-5';
  if (stage === 3 && phase === 2) return '3-2';
  if (stage === 3 && phase === 5) return '3-5';
  if (stage === 4 && phase === 1) return '4-1';
  if (stage === 4 && phase === 2) return '4-2';
  if (stage === 5 && phase === 1) return '5-1';
  return undefined;
}

function getTopRelevantPick(
  actionablePicks: GoldenSpatulaPickRecommendation[],
  allPicks: GoldenSpatulaPickRecommendation[],
): GoldenSpatulaPickRecommendation | undefined {
  return actionablePicks[0] ?? allPicks[0];
}

function getFocusCost(
  pick: GoldenSpatulaPickRecommendation | undefined,
): GoldenSpatulaShopCost | undefined {
  const cost = pick?.cost;
  if (cost === undefined || cost < 1 || cost > 5) return undefined;
  return Math.trunc(cost) as GoldenSpatulaShopCost;
}

function isOneCostRerollFocus(pick: GoldenSpatulaPickRecommendation | undefined): boolean {
  if (!pick || pick.cost !== 1 || pick.targetCount < 6) return false;
  return (
    pick.ownedCount >= 2 ||
    pick.role === 'carry' ||
    pick.role === 'frontline' ||
    pick.reasons.includes('activeCarry') ||
    pick.reasons.includes('activeFrontline') ||
    pick.reasons.includes('recommendedCarry') ||
    pick.reasons.includes('nearUpgrade')
  );
}

function isTwoCostRerollFocus(pick: GoldenSpatulaPickRecommendation | undefined): boolean {
  if (!pick || pick.cost !== 2 || pick.targetCount < 6) return false;
  return (
    pick.ownedCount >= 2 ||
    pick.role === 'carry' ||
    pick.role === 'frontline' ||
    pick.reasons.includes('activeCarry') ||
    pick.reasons.includes('activeFrontline') ||
    pick.reasons.includes('recommendedCarry') ||
    pick.reasons.includes('nearUpgrade') ||
    pick.reasons.includes('itemFit')
  );
}

function needsTwoCostStabilizeRoll(pick: GoldenSpatulaPickRecommendation | undefined): boolean {
  return pick?.cost === 2 && pick.ownedCount < 3;
}

function isThreeCostRerollFocus(pick: GoldenSpatulaPickRecommendation | undefined): boolean {
  if (!pick || pick.cost !== 3 || pick.targetCount < 6) return false;
  return (
    pick.ownedCount >= 2 ||
    pick.role === 'carry' ||
    pick.role === 'frontline' ||
    pick.reasons.includes('activeCarry') ||
    pick.reasons.includes('activeFrontline') ||
    pick.reasons.includes('recommendedCarry') ||
    pick.reasons.includes('nearUpgrade') ||
    pick.reasons.includes('itemFit')
  );
}

function needsThreeCostStabilizeRoll(pick: GoldenSpatulaPickRecommendation | undefined): boolean {
  return pick?.cost === 3 && pick.ownedCount < 3;
}

function buildPolicy(
  checkpoint: GoldenSpatulaRoundPolicyCheckpoint,
  kind: GoldenSpatulaRoundPolicyKind,
  patch: Omit<GoldenSpatulaRoundPolicyRecommendation, 'checkpoint' | 'kind'>,
): GoldenSpatulaRoundPolicyRecommendation {
  return { checkpoint, kind, ...patch };
}

function canSpendToLevel(gold: number | undefined, minimumGold = 12): boolean {
  return gold === undefined || gold >= minimumGold;
}

export function buildGoldenSpatulaRoundPolicy(
  input: GoldenSpatulaRoundPolicyInput,
): GoldenSpatulaRoundPolicyRecommendation | undefined {
  const checkpoint = getRoundCheckpoint(input.tempoContext.stage, input.tempoContext.phase);
  if (!checkpoint) return undefined;

  const gold = input.economyState?.gold;
  const level = input.economyState?.level;
  const topPick = getTopRelevantPick(input.actionablePicks, input.allPicks);
  const focusCost = getFocusCost(topPick);
  const oneCostRerollFocus = isOneCostRerollFocus(topPick);
  const twoCostRerollFocus = isTwoCostRerollFocus(topPick);
  const twoCostNeedsStabilize = needsTwoCostStabilizeRoll(topPick);
  const threeCostRerollFocus = isThreeCostRerollFocus(topPick);
  const threeCostNeedsStabilize = needsThreeCostStabilizeRoll(topPick);
  const hasRollSignal =
    input.hasNearUpgrade ||
    input.rollDecisionScore.band === 'rollToQuality' ||
    input.rollDecisionScore.band === 'smallRoll';
  const isStreakPush = input.tempoContext.streakPressure === 'push';
  const isStreakPreserve = input.tempoContext.streakPressure === 'preserve';

  if (checkpoint === '2-1') {
    if (oneCostRerollFocus) {
      return buildPolicy(checkpoint, 'interest', {
        action: 'hold',
        confidence: 'medium',
        bankFloor: 50,
        focusCost,
      });
    }
    if (isStreakPush && (level ?? 0) < 4 && canSpendToLevel(gold, 4)) {
      return buildPolicy(checkpoint, 'streakPush', {
        action: 'level',
        confidence: 'medium',
        targetLevel: 4,
      });
    }
    return buildPolicy(checkpoint, 'interest', {
      action: 'hold',
      confidence: 'low',
      bankFloor: 10,
      focusCost,
    });
  }

  if (checkpoint === '2-5') {
    if (oneCostRerollFocus) {
      return buildPolicy(checkpoint, 'interest', {
        action: isStreakPreserve ? 'save' : 'hold',
        confidence: 'medium',
        bankFloor: 50,
        focusCost,
      });
    }
    if (isStreakPush && (level ?? 0) < 5 && canSpendToLevel(gold, 8)) {
      return buildPolicy(checkpoint, 'streakPush', {
        action: 'level',
        confidence: 'medium',
        targetLevel: 5,
      });
    }
    return buildPolicy(checkpoint, 'interest', {
      action: isStreakPreserve ? 'save' : 'hold',
      confidence: isStreakPreserve ? 'medium' : 'low',
      bankFloor: 20,
      focusCost,
    });
  }

  if (checkpoint === '3-2') {
    if (oneCostRerollFocus && (level ?? 0) <= 5) {
      if (hasRollSignal && (gold === undefined || gold >= 52)) {
        return buildPolicy(checkpoint, 'rerollWindow', {
          action: 'roll',
          confidence: input.hasNearUpgrade ? 'high' : 'medium',
          bankFloor: 50,
          recommendedRollCount: input.hasNearUpgrade ? 2 : 1,
          focusCost,
        });
      }
      return buildPolicy(checkpoint, 'interest', {
        action: 'save',
        confidence: 'high',
        bankFloor: 50,
        focusCost,
      });
    }
    if (twoCostRerollFocus && (level ?? 0) >= 6) {
      if (twoCostNeedsStabilize && hasRollSignal) {
        return buildPolicy(checkpoint, 'rerollWindow', {
          action: 'roll',
          confidence: input.hasNearUpgrade ? 'high' : 'medium',
          bankFloor: 20,
          recommendedRollCount: input.hasNearUpgrade ? 3 : 2,
          focusCost,
        });
      }
      if (hasRollSignal && (gold === undefined || gold >= 52)) {
        return buildPolicy(checkpoint, 'rerollWindow', {
          action: 'roll',
          confidence: input.hasNearUpgrade ? 'high' : 'medium',
          bankFloor: 50,
          recommendedRollCount: input.hasNearUpgrade ? 2 : 1,
          focusCost,
        });
      }
      return buildPolicy(checkpoint, 'interest', {
        action: 'save',
        confidence: 'high',
        bankFloor: 50,
        focusCost,
      });
    }
    if (threeCostRerollFocus) {
      if ((level ?? 0) < 7) {
        return buildPolicy(checkpoint, 'interest', {
          action: 'save',
          confidence: 'medium',
          targetLevel: 7,
          bankFloor: 30,
          focusCost,
        });
      }
      if (threeCostNeedsStabilize && hasRollSignal) {
        return buildPolicy(checkpoint, 'rerollWindow', {
          action: 'roll',
          confidence: input.hasNearUpgrade ? 'high' : 'medium',
          bankFloor: 30,
          recommendedRollCount: input.hasNearUpgrade ? 3 : 2,
          focusCost,
        });
      }
      if (hasRollSignal && (gold === undefined || gold >= 52)) {
        return buildPolicy(checkpoint, 'rerollWindow', {
          action: 'roll',
          confidence: input.hasNearUpgrade ? 'high' : 'medium',
          bankFloor: 50,
          recommendedRollCount: input.hasNearUpgrade ? 2 : 1,
          focusCost,
        });
      }
      return buildPolicy(checkpoint, 'interest', {
        action: 'save',
        confidence: 'high',
        targetLevel: 7,
        bankFloor: 50,
        focusCost,
      });
    }
    if ((level ?? 0) < 6 && canSpendToLevel(gold, 16)) {
      return buildPolicy(checkpoint, 'standardLevel', {
        action: 'level',
        confidence: 'high',
        targetLevel: 6,
        focusCost,
      });
    }
    if ((level ?? 0) >= 6 && hasRollSignal && !isStreakPreserve) {
      return buildPolicy(checkpoint, 'rerollWindow', {
        action: 'roll',
        confidence: input.hasNearUpgrade ? 'high' : 'medium',
        bankFloor: 20,
        recommendedRollCount: input.hasNearUpgrade ? 3 : 2,
        focusCost,
      });
    }
    return buildPolicy(checkpoint, 'interest', {
      action: 'save',
      confidence: isStreakPreserve ? 'high' : 'medium',
      bankFloor: 20,
      focusCost,
    });
  }

  if (checkpoint === '3-5' || checkpoint === '4-1') {
    if (oneCostRerollFocus && (level ?? 0) <= 5) {
      if (hasRollSignal && (gold === undefined || gold >= 52)) {
        return buildPolicy(checkpoint, 'rerollWindow', {
          action: 'roll',
          confidence: input.hasNearUpgrade ? 'high' : 'medium',
          bankFloor: 50,
          recommendedRollCount: input.hasNearUpgrade ? 3 : 1,
          focusCost,
        });
      }
      return buildPolicy(checkpoint, 'interest', {
        action: 'save',
        confidence: 'high',
        bankFloor: 50,
        focusCost,
      });
    }
    if (twoCostRerollFocus) {
      if ((level ?? 0) < 6 && canSpendToLevel(gold, 16)) {
        return buildPolicy(checkpoint, 'standardLevel', {
          action: 'level',
          confidence: 'high',
          targetLevel: 6,
          bankFloor: 20,
          focusCost,
        });
      }
      if ((level ?? 0) >= 6) {
        if (twoCostNeedsStabilize && hasRollSignal) {
          return buildPolicy(checkpoint, 'rerollWindow', {
            action: 'roll',
            confidence: input.hasNearUpgrade ? 'high' : 'medium',
            bankFloor: 20,
            recommendedRollCount: input.hasNearUpgrade ? 3 : 2,
            focusCost,
          });
        }
        if (hasRollSignal && (gold === undefined || gold >= 52)) {
          return buildPolicy(checkpoint, 'rerollWindow', {
            action: 'roll',
            confidence: input.hasNearUpgrade ? 'high' : 'medium',
            bankFloor: 50,
            recommendedRollCount: input.hasNearUpgrade ? 2 : 1,
            focusCost,
          });
        }
        return buildPolicy(checkpoint, 'interest', {
          action: 'save',
          confidence: 'high',
          bankFloor: 50,
          focusCost,
        });
      }
    }
    if (threeCostRerollFocus) {
      if ((level ?? 0) < 7) {
        if (canSpendToLevel(gold, 20)) {
          return buildPolicy(checkpoint, 'standardLevel', {
            action: 'level',
            confidence: 'high',
            targetLevel: 7,
            bankFloor: 30,
            focusCost,
          });
        }
        return buildPolicy(checkpoint, 'interest', {
          action: 'save',
          confidence: 'high',
          targetLevel: 7,
          bankFloor: 30,
          focusCost,
        });
      }
      if (threeCostNeedsStabilize && hasRollSignal) {
        return buildPolicy(checkpoint, 'rerollWindow', {
          action: 'roll',
          confidence: input.hasNearUpgrade ? 'high' : 'medium',
          bankFloor: 30,
          recommendedRollCount: input.hasNearUpgrade ? 3 : 2,
          focusCost,
        });
      }
      if (hasRollSignal && (gold === undefined || gold >= 52)) {
        return buildPolicy(checkpoint, 'rerollWindow', {
          action: 'roll',
          confidence: input.hasNearUpgrade ? 'high' : 'medium',
          bankFloor: 50,
          recommendedRollCount: input.hasNearUpgrade ? 2 : 1,
          focusCost,
        });
      }
      return buildPolicy(checkpoint, 'interest', {
        action: 'save',
        confidence: 'high',
        targetLevel: 7,
        bankFloor: 50,
        focusCost,
      });
    }
    if (input.highCostPlan && (level ?? 0) < 8 && canSpendToLevel(gold, 30)) {
      return buildPolicy(checkpoint, 'standardLevel', {
        action: 'level',
        confidence: 'medium',
        targetLevel: 8,
        bankFloor: 30,
        focusCost,
      });
    }
    if ((level ?? 0) < 7 && canSpendToLevel(gold, 20)) {
      return buildPolicy(checkpoint, 'standardLevel', {
        action: 'level',
        confidence: 'medium',
        targetLevel: 7,
        bankFloor: 20,
        focusCost,
      });
    }
    if ((focusCost ?? 0) <= 3 && (level ?? 0) >= 7 && hasRollSignal) {
      return buildPolicy(checkpoint, 'rerollWindow', {
        action: 'roll',
        confidence: input.hasNearUpgrade ? 'high' : 'medium',
        bankFloor: 30,
        recommendedRollCount: input.hasNearUpgrade ? 3 : 2,
        focusCost,
      });
    }
    return buildPolicy(checkpoint, 'interest', {
      action: 'save',
      confidence: isStreakPreserve ? 'high' : 'medium',
      bankFloor: 30,
      focusCost,
    });
  }

  if (checkpoint === '4-2') {
    if (input.highCostPlan && (level ?? 0) < 8 && canSpendToLevel(gold, 24)) {
      return buildPolicy(checkpoint, 'fourCostLaunch', {
        action: 'level',
        confidence: 'high',
        targetLevel: 8,
        bankFloor: 30,
        focusCost,
      });
    }
    if (input.highCostPlan && (level ?? 0) >= 8) {
      return buildPolicy(checkpoint, 'fourCostLaunch', {
        action: 'roll',
        confidence: 'high',
        bankFloor: 30,
        recommendedRollCount: gold !== undefined && gold >= 50 ? 5 : 4,
        focusCost,
      });
    }
    if (hasRollSignal) {
      return buildPolicy(checkpoint, 'rerollWindow', {
        action: 'roll',
        confidence: input.hasNearUpgrade ? 'high' : 'medium',
        bankFloor: 20,
        recommendedRollCount: input.hasNearUpgrade ? 4 : 2,
        focusCost,
      });
    }
    return buildPolicy(checkpoint, 'interest', {
      action: 'save',
      confidence: 'medium',
      bankFloor: 30,
      focusCost,
    });
  }

  if (checkpoint === '5-1') {
    if ((focusCost ?? 0) >= 5 && (level ?? 0) < 9 && canSpendToLevel(gold, 40)) {
      return buildPolicy(checkpoint, 'lateCap', {
        action: 'level',
        confidence: 'medium',
        targetLevel: 9,
        bankFloor: 20,
        focusCost,
      });
    }
    if (topPick && topPick.tier !== 'watch') {
      return buildPolicy(checkpoint, 'lateCap', {
        action: 'roll',
        confidence: topPick.tier === 'core' ? 'high' : 'medium',
        bankFloor: 20,
        recommendedRollCount: gold !== undefined && gold >= 40 ? 4 : 2,
        focusCost,
      });
    }
    return buildPolicy(checkpoint, 'lateCap', {
      action: 'hold',
      confidence: 'low',
      bankFloor: 30,
      focusCost,
    });
  }

  return undefined;
}
