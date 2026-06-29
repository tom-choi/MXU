import type {
  GoldenSpatulaDecisionReason,
  GoldenSpatulaEconomyDecisionAction,
  GoldenSpatulaEconomyDecisionAdvice,
  GoldenSpatulaEconomyRunState,
  GoldenSpatulaFormationBalanceAdvice,
  GoldenSpatulaHandRunState,
  GoldenSpatulaLineupVariant,
  GoldenSpatulaPickRecommendation,
  GoldenSpatulaStopLossAdvice,
} from '@/types/goldenSpatula';
import { getGoldenSpatulaProjectedRollBudget } from './goldenSpatulaAcquisitionModel';
import { buildGoldenSpatulaBenchInterestAdvice } from './goldenSpatulaBenchDecisionModel';
import { sortGoldenSpatulaDecisionReasons } from './goldenSpatulaDecisionReasonModel';
import {
  buildGoldenSpatulaRollDecisionScore,
  getGoldenSpatulaHealthPressureDecision,
} from './goldenSpatulaRollDecisionScoreModel';
import { buildGoldenSpatulaRoundPolicy } from './goldenSpatulaRoundPolicyModel';
import type { GoldenSpatulaTempoContext } from './goldenSpatulaTempoModel';

const GOLDEN_SPATULA_XP_PER_PURCHASE = 4;
const GOLDEN_SPATULA_XP_PURCHASE_COST = 4;

function findMissingInterestGold(gold: number | undefined): number | undefined {
  if (gold === undefined || gold >= 50) return undefined;
  const nextTier = Math.min(50, Math.ceil((gold + 1) / 10) * 10);
  return Math.max(0, nextTier - gold);
}

interface GoldenSpatulaLevelUpCostEstimate {
  xpNeeded: number;
  purchaseCount: number;
  goldNeeded: number;
}

function estimateLevelUpCost(
  economyState: GoldenSpatulaEconomyRunState | undefined,
): GoldenSpatulaLevelUpCostEstimate | undefined {
  const level = economyState?.level;
  if (level === undefined || level >= 11) return undefined;
  const experience = economyState?.experience;
  const experienceMax = economyState?.experienceMax;
  if (
    experience === undefined ||
    experienceMax === undefined ||
    !Number.isFinite(experience) ||
    !Number.isFinite(experienceMax) ||
    experienceMax <= 0 ||
    experience > experienceMax
  ) {
    return undefined;
  }

  const xpNeeded = Math.max(0, experienceMax - experience);
  const purchaseCount = Math.ceil(xpNeeded / GOLDEN_SPATULA_XP_PER_PURCHASE);
  return {
    xpNeeded,
    purchaseCount,
    goldNeeded: purchaseCount * GOLDEN_SPATULA_XP_PURCHASE_COST,
  };
}

function isLevelUpValuePick(pick: GoldenSpatulaPickRecommendation): boolean {
  if (pick.copiesNeeded <= 0) return false;
  if ((pick.levelUpShopOddsGain ?? 0) <= 0) return false;
  if ((pick.nextLevelShopOdds ?? 0) <= 0) return false;
  return (
    pick.tier === 'core' ||
    pick.tier === 'high' ||
    pick.reasons.includes('activeCarry') ||
    pick.reasons.includes('activeFrontline') ||
    pick.reasons.includes('recommendedCarry') ||
    pick.reasons.includes('highCostPower') ||
    pick.reasons.includes('nearUpgrade')
  );
}

function compareLevelUpValuePicks(
  a: GoldenSpatulaPickRecommendation,
  b: GoldenSpatulaPickRecommendation,
): number {
  const aUnlock = a.shopOddsAvailability === 'unavailable' ? 1 : 0;
  const bUnlock = b.shopOddsAvailability === 'unavailable' ? 1 : 0;
  return (
    bUnlock - aUnlock ||
    (b.levelUpShopOddsRatio ?? 0) - (a.levelUpShopOddsRatio ?? 0) ||
    (b.levelUpShopOddsGain ?? 0) - (a.levelUpShopOddsGain ?? 0) ||
    b.score - a.score ||
    (b.nextLevelShopOdds ?? 0) - (a.nextLevelShopOdds ?? 0) ||
    (b.cost ?? 0) - (a.cost ?? 0)
  );
}

function isLevelUpOddsJump(pick: GoldenSpatulaPickRecommendation | undefined): boolean {
  if (!pick) return false;
  if ((pick.levelUpShopOddsGain ?? 0) <= 0) return false;
  return (pick.levelUpShopOddsRatio ?? 0) >= 1.5;
}

function getVariantUnitCount(variant: GoldenSpatulaLineupVariant | undefined): number | undefined {
  const unitNames = variant?.units
    ?.map((unit) => unit.name.trim())
    .filter((name) => name.length > 0);
  if (!unitNames || unitNames.length === 0) return undefined;
  return new Set(unitNames).size;
}

function isRerollWindowPick(pick: GoldenSpatulaPickRecommendation | undefined): boolean {
  return pick?.cost !== undefined && pick.cost <= 3 && pick.targetCount >= 6;
}

function isLevelUpAnchorPick(pick: GoldenSpatulaPickRecommendation): boolean {
  return (
    pick.role === 'carry' ||
    pick.role === 'frontline' ||
    pick.reasons.includes('activeCarry') ||
    pick.reasons.includes('activeFrontline') ||
    pick.reasons.includes('recommendedCarry') ||
    pick.reasons.includes('highCostPower')
  );
}

function getLevelUpAnchorPick(
  picks: GoldenSpatulaPickRecommendation[],
): GoldenSpatulaPickRecommendation | undefined {
  return (
    picks.find(
      (pick) =>
        pick.role === 'carry' ||
        pick.reasons.includes('activeCarry') ||
        pick.reasons.includes('recommendedCarry'),
    ) ??
    picks.find(
      (pick) =>
        pick.role === 'frontline' ||
        pick.reasons.includes('activeFrontline') ||
        pick.reasons.includes('highCostPower'),
    ) ??
    picks.find(isLevelUpAnchorPick)
  );
}

function getSurvivalAdjustedBankFloor(
  policyBankFloor: number | undefined,
  healthBankFloor: number | undefined,
  survivalPressure: boolean,
): number | undefined {
  if (!survivalPressure || healthBankFloor === undefined) return policyBankFloor;
  if (policyBankFloor === undefined) return healthBankFloor;
  return Math.min(policyBankFloor, healthBankFloor);
}

function getLevelUpOddsGainThreshold(
  pick: GoldenSpatulaPickRecommendation | undefined,
  tempoContext: GoldenSpatulaTempoContext,
): number {
  if (pick?.cost !== undefined && pick.cost >= 5 && tempoContext.tempoPhase === 'late') {
    return 0.08;
  }
  return 0.1;
}

function isRollStopLinePick(pick: GoldenSpatulaPickRecommendation): boolean {
  return (
    pick.tier === 'core' ||
    pick.role === 'carry' ||
    pick.role === 'frontline' ||
    pick.reasons.includes('nearUpgrade') ||
    pick.reasons.includes('activeCarry') ||
    pick.reasons.includes('activeFrontline') ||
    pick.reasons.includes('recommendedCarry') ||
    pick.reasons.includes('itemFit')
  );
}

function isCoreStopLossPick(pick: GoldenSpatulaPickRecommendation): boolean {
  return (
    pick.role === 'carry' ||
    pick.role === 'frontline' ||
    pick.role === 'power' ||
    pick.reasons.includes('activeCarry') ||
    pick.reasons.includes('activeFrontline') ||
    pick.reasons.includes('recommendedCarry') ||
    pick.reasons.includes('itemFit')
  );
}

function isAtOrAfterRound(
  tempoContext: GoldenSpatulaTempoContext,
  stage: number,
  phase: number,
): boolean {
  if (tempoContext.stage === undefined || tempoContext.phase === undefined) return false;
  return (
    tempoContext.stage > stage || (tempoContext.stage === stage && tempoContext.phase >= phase)
  );
}

function isStableCorePick(pick: GoldenSpatulaPickRecommendation | undefined): boolean {
  if (!pick) return true;
  const twoStarThreshold = pick.cost !== undefined && pick.cost >= 4 ? 2 : 3;
  return pick.ownedCount >= Math.min(pick.targetCount, twoStarThreshold);
}

function isStableFormationPick(pick: GoldenSpatulaPickRecommendation | undefined): boolean {
  if (!pick) return false;
  return isStableCorePick(pick);
}

function hasStableFastNineCore(allPicks: GoldenSpatulaPickRecommendation[]): boolean {
  const activeCarryPick = allPicks.find(
    (pick) => pick.reasons.includes('activeCarry') && isCoreStopLossPick(pick),
  );
  const activeFrontlinePick = allPicks.find(
    (pick) => pick.reasons.includes('activeFrontline') && isCoreStopLossPick(pick),
  );
  return Boolean(
    activeCarryPick &&
      activeFrontlinePick &&
      isStableCorePick(activeCarryPick) &&
      isStableCorePick(activeFrontlinePick),
  );
}

function isCommittedRerollPick(pick: GoldenSpatulaPickRecommendation): boolean {
  return (
    isCoreStopLossPick(pick) && pick.cost !== undefined && pick.cost <= 3 && pick.targetCount >= 6
  );
}

function isSideUnitChasePick(pick: GoldenSpatulaPickRecommendation): boolean {
  if (isCoreStopLossPick(pick) || pick.role === 'carry' || pick.role === 'frontline') {
    return false;
  }
  if (pick.cost === undefined || pick.cost > 3 || pick.copiesNeeded <= 0) return false;
  return pick.reasons.includes('nearUpgrade') || (pick.targetCount >= 6 && pick.ownedCount >= 3);
}

function isFourCostStabilizePick(pick: GoldenSpatulaPickRecommendation): boolean {
  return pick.cost === 4 && pick.copiesNeeded > 0 && isCoreStopLossPick(pick);
}

function isModeratelyContested(pick: GoldenSpatulaPickRecommendation | undefined): boolean {
  if (!pick) return false;
  return (pick.contestPoolShare ?? 0) >= 0.18 || (pick.externalContestCopies ?? 0) >= 4;
}

function isHeavilyContested(pick: GoldenSpatulaPickRecommendation | undefined): boolean {
  if (!pick) return false;
  return (pick.contestPoolShare ?? 0) >= 0.25 || (pick.externalContestCopies ?? 0) >= 6;
}

function getPrimaryPickByRole(
  allPicks: GoldenSpatulaPickRecommendation[],
  role: 'carry' | 'frontline',
): GoldenSpatulaPickRecommendation | undefined {
  const getRoleAffinity = (pick: GoldenSpatulaPickRecommendation): number => {
    const reasonSet = new Set(pick.reasons);
    const hasCurrentCopy = pick.ownedCount > 0 || (pick.shopVisibleCount ?? 0) > 0;
    const reachableAtCurrentLevel = pick.shopOddsAvailability !== 'unavailable';
    if (role === 'carry') {
      if (reasonSet.has('activeCarry')) {
        return hasCurrentCopy ? 3 : reachableAtCurrentLevel ? 2 : 0;
      }
      if (reasonSet.has('activeLineup')) {
        return hasCurrentCopy ? 2 : reachableAtCurrentLevel ? 1 : 0;
      }
      if (reasonSet.has('recommendedCarry')) return 1;
      if (pick.role === 'carry' && reasonSet.has('itemFit')) return 1;
      return 0;
    }
    if (reasonSet.has('activeFrontline')) {
      return hasCurrentCopy ? 3 : reachableAtCurrentLevel ? 2 : 0;
    }
    if (pick.role === 'frontline' && reasonSet.has('activeLineup')) {
      return hasCurrentCopy ? 2 : reachableAtCurrentLevel ? 1 : 0;
    }
    if (pick.role === 'frontline' &&
      (reasonSet.has('recommendedOverlap') ||
        reasonSet.has('highCostPower') ||
        reasonSet.has('traitBridge') ||
        reasonSet.has('cheapTransition') ||
        reasonSet.has('itemFit'))
    ) {
      return 1;
    }
    return 0;
  };

  return allPicks
    .filter((pick) => getRoleAffinity(pick) > 0)
    .sort(
      (a, b) =>
        getRoleAffinity(b) - getRoleAffinity(a) ||
        b.rollTargetPriority - a.rollTargetPriority ||
        b.score - a.score ||
        b.ownedCount - a.ownedCount,
    )[0];
}

function uniquePickNames(picks: Array<GoldenSpatulaPickRecommendation | undefined>): string[] {
  return Array.from(new Set(picks.map((pick) => pick?.name).filter(Boolean) as string[]));
}

function buildStopLossAdvicePatch(patch: GoldenSpatulaStopLossAdvice): GoldenSpatulaStopLossAdvice {
  return {
    ...patch,
    targetNames: Array.from(new Set(patch.targetNames.filter(Boolean))),
    reasonNames: sortGoldenSpatulaDecisionReasons(patch.reasonNames),
  };
}

function buildFormationBalanceAdvicePatch(
  patch: GoldenSpatulaFormationBalanceAdvice,
): GoldenSpatulaFormationBalanceAdvice {
  return {
    ...patch,
    priorityTargetNames: Array.from(new Set(patch.priorityTargetNames.filter(Boolean))),
    deprioritizedTargetNames: Array.from(new Set(patch.deprioritizedTargetNames.filter(Boolean))),
    reasonNames: sortGoldenSpatulaDecisionReasons(patch.reasonNames),
  };
}

function buildGoldenSpatulaFormationBalanceAdvice(
  allPicks: GoldenSpatulaPickRecommendation[],
): GoldenSpatulaFormationBalanceAdvice | undefined {
  const carryPick = getPrimaryPickByRole(allPicks, 'carry');
  const frontlinePick = getPrimaryPickByRole(allPicks, 'frontline');
  if (!carryPick || !frontlinePick) return undefined;

  const carryStable = isStableFormationPick(carryPick);
  const frontlineStable = isStableFormationPick(frontlinePick);
  if (!carryStable && !frontlineStable && carryPick.copiesNeeded > 0) {
    return buildFormationBalanceAdvicePatch({
      kind: 'carryBeforeFrontline',
      carryName: carryPick.name,
      frontlineName: frontlinePick.name,
      carryStable,
      frontlineStable,
      priorityTargetNames: [carryPick.name],
      deprioritizedTargetNames: frontlinePick.copiesNeeded > 0 ? [frontlinePick.name] : [],
      reasonNames: [...carryPick.reasons, ...frontlinePick.reasons],
    });
  }

  if (carryStable && frontlineStable) {
    return buildFormationBalanceAdvicePatch({
      kind: 'balanced',
      carryName: carryPick.name,
      frontlineName: frontlinePick.name,
      carryStable,
      frontlineStable,
      priorityTargetNames: [],
      deprioritizedTargetNames: [],
      reasonNames: [],
    });
  }

  if (carryStable && !frontlineStable && frontlinePick.copiesNeeded > 0) {
    return buildFormationBalanceAdvicePatch({
      kind: 'frontlineFirst',
      carryName: carryPick.name,
      frontlineName: frontlinePick.name,
      carryStable,
      frontlineStable,
      priorityTargetNames: [frontlinePick.name],
      deprioritizedTargetNames: carryPick.copiesNeeded > 0 ? [carryPick.name] : [],
      reasonNames: [...frontlinePick.reasons, ...carryPick.reasons],
    });
  }

  if (frontlineStable && !carryStable && carryPick.copiesNeeded > 0) {
    return buildFormationBalanceAdvicePatch({
      kind: 'carryFirst',
      carryName: carryPick.name,
      frontlineName: frontlinePick.name,
      carryStable,
      frontlineStable,
      priorityTargetNames: [carryPick.name],
      deprioritizedTargetNames: frontlinePick.copiesNeeded > 0 ? [frontlinePick.name] : [],
      reasonNames: [...carryPick.reasons, ...frontlinePick.reasons],
    });
  }

  return undefined;
}

function buildGoldenSpatulaStopLossAdvice({
  allPicks,
  tempoPriorityPicks,
  topEconomyPick,
  economyState,
  tempoContext,
}: {
  allPicks: GoldenSpatulaPickRecommendation[];
  tempoPriorityPicks: GoldenSpatulaPickRecommendation[];
  topEconomyPick: GoldenSpatulaPickRecommendation | undefined;
  economyState: GoldenSpatulaEconomyRunState | undefined;
  tempoContext: GoldenSpatulaTempoContext;
}): GoldenSpatulaStopLossAdvice | undefined {
  const health = economyState?.health;
  const level = economyState?.level;
  const carryPick = getPrimaryPickByRole(allPicks, 'carry');
  const frontlinePick = getPrimaryPickByRole(allPicks, 'frontline');
  const carryStable = isStableCorePick(carryPick);
  const frontlineStable = isStableCorePick(frontlinePick);
  const coreStable = carryStable && frontlineStable;
  const healthSafe = health === undefined || health >= 50;
  const rerollPick =
    tempoPriorityPicks.find(isCommittedRerollPick) ??
    allPicks.find((pick) => pick.copiesNeeded > 0 && isCommittedRerollPick(pick));
  const fourCostStabilizePick =
    tempoPriorityPicks.find(isFourCostStabilizePick) ?? allPicks.find(isFourCostStabilizePick);
  const focusPick = rerollPick ?? topEconomyPick;
  if (!focusPick) return undefined;
  const focusCost = focusPick?.cost;
  const focusTargetNames = uniquePickNames([focusPick, carryPick, frontlinePick]);

  const sideChasePick = tempoPriorityPicks.find(isSideUnitChasePick);
  if (
    coreStable &&
    healthSafe &&
    sideChasePick &&
    (economyState?.gold === undefined ||
      economyState.gold < 50 ||
      tempoContext.tempoPhase !== 'late')
  ) {
    return buildStopLossAdvicePatch({
      kind: 'stopRollingSideUnits',
      severity: 'warning',
      action: 'stopRolling',
      targetNames: uniquePickNames([sideChasePick, carryPick, frontlinePick]),
      reasonNames: sideChasePick.reasons,
      bankFloor: 30,
    });
  }

  if (
    focusCost === 1 &&
    isAtOrAfterRound(tempoContext, 3, 5) &&
    (focusPick.ownedCount < 5 || isHeavilyContested(focusPick))
  ) {
    return buildStopLossAdvicePatch({
      kind: 'oneCostRerollAbandon',
      severity: isHeavilyContested(focusPick) ? 'critical' : 'warning',
      action: 'pivot',
      targetNames: focusTargetNames,
      reasonNames: focusPick.reasons,
      pivotPreferred: true,
      bankFloor: 20,
    });
  }

  if (
    focusCost === 2 &&
    level !== undefined &&
    level >= 6 &&
    isAtOrAfterRound(tempoContext, 3, 2) &&
    health !== undefined &&
    health < 50 &&
    (!carryStable || !frontlineStable)
  ) {
    return buildStopLossAdvicePatch({
      kind: 'twoCostRerollStabilize',
      severity: health < 35 ? 'critical' : 'warning',
      action: 'stabilize',
      targetNames: focusTargetNames,
      reasonNames: focusPick.reasons,
      bankFloor: health < 35 ? 10 : 20,
    });
  }

  if (
    focusCost === 3 &&
    isAtOrAfterRound(tempoContext, 4, 1) &&
    focusPick.ownedCount < 5 &&
    isModeratelyContested(focusPick)
  ) {
    return buildStopLossAdvicePatch({
      kind: 'threeCostPivotFourCost',
      severity: isHeavilyContested(focusPick) ? 'critical' : 'warning',
      action: 'pivot',
      targetNames: focusTargetNames,
      reasonNames: focusPick.reasons,
      pivotPreferred: true,
      bankFloor: 20,
    });
  }

  const fourCostFocusPick = focusCost === 4 ? focusPick : fourCostStabilizePick;
  if (
    fourCostFocusPick &&
    level !== undefined &&
    level >= 8 &&
    isAtOrAfterRound(tempoContext, 4, 2)
  ) {
    return buildStopLossAdvicePatch({
      kind: 'fourCostStabilize',
      severity:
        health !== undefined && health < 35
          ? 'critical'
          : health !== undefined && health < 50
            ? 'warning'
            : 'watch',
      action: 'stabilize',
      targetNames: uniquePickNames([fourCostFocusPick, carryPick, frontlinePick]),
      reasonNames: fourCostFocusPick.reasons,
      bankFloor:
        health !== undefined && health < 35 ? 10 : health !== undefined && health < 50 ? 20 : 30,
    });
  }

  if (
    focusCost !== undefined &&
    focusCost >= 5 &&
    level === 8 &&
    isAtOrAfterRound(tempoContext, 5, 1) &&
    (!carryStable || !frontlineStable || (health !== undefined && health < 50))
  ) {
    return buildStopLossAdvicePatch({
      kind: 'fastNineAvoidGreed',
      severity: health !== undefined && health < 35 ? 'critical' : 'warning',
      action: 'avoidLevel',
      targetNames: focusTargetNames,
      reasonNames: focusPick.reasons,
      bankFloor: 20,
    });
  }

  return undefined;
}

export function buildGoldenSpatulaEconomyAdvice(
  actionablePicks: GoldenSpatulaPickRecommendation[],
  allPicks: GoldenSpatulaPickRecommendation[],
  economyState: GoldenSpatulaEconomyRunState | undefined,
  tempoContext: GoldenSpatulaTempoContext,
  handState?: GoldenSpatulaHandRunState,
  activeVariant?: GoldenSpatulaLineupVariant,
): GoldenSpatulaEconomyDecisionAdvice {
  const highPriorityPicks = actionablePicks
    .filter((pick) => pick.tier === 'core' || pick.tier === 'high')
    .filter((pick) => pick.copiesNeeded > 0)
    .slice(0, 3);
  const urgentPicks = highPriorityPicks.filter(
    (pick) => pick.shopOddsAvailability !== 'unavailable',
  );
  const tempoPriorityPicks = actionablePicks
    .filter((pick) => pick.copiesNeeded > 0)
    .filter((pick) => pick.shopOddsAvailability !== 'unavailable')
    .slice(0, 3);
  const rollStopLinePicks = tempoPriorityPicks.filter(isRollStopLinePick);
  const urgentRollStopLinePicks = urgentPicks.filter(isRollStopLinePick);
  const hasRollStopLine = rollStopLinePicks.length > 0;
  const levelLockedPicks = allPicks
    .filter((pick) => pick.shopOddsAvailability === 'unavailable')
    .filter(
      (pick) =>
        pick.reasons.includes('activeCarry') ||
        pick.reasons.includes('recommendedCarry') ||
        pick.reasons.includes('highCostPower'),
    )
    .slice(0, 3);
  const gold = economyState?.gold;
  const level = economyState?.level;
  const healthPressure = getGoldenSpatulaHealthPressureDecision(economyState);
  const interestGoldNeeded = findMissingInterestGold(gold);
  const benchInterestAdvice = buildGoldenSpatulaBenchInterestAdvice({
    handState,
    allPicks,
    interestGoldNeeded,
    stage: tempoContext.stage,
    gold,
  });
  const hasNearUpgrade = urgentPicks.some((pick) => pick.reasons.includes('nearUpgrade'));
  const highCostPlan =
    urgentPicks.some((pick) => (pick.cost ?? 0) >= 4) ||
    allPicks.some(
      (pick) =>
        (pick.cost ?? 0) >= 4 &&
        pick.copiesNeeded > 0 &&
        pick.shopOddsAvailability !== 'unavailable' &&
        (pick.tier === 'core' ||
          pick.tier === 'high' ||
          pick.role === 'carry' ||
          pick.role === 'frontline' ||
          pick.reasons.includes('activeCarry') ||
          pick.reasons.includes('activeFrontline') ||
          pick.reasons.includes('recommendedCarry')),
    );
  const hasPushStreak = tempoContext.streakPressure === 'push';
  const hasPreserveStreak = tempoContext.streakPressure === 'preserve';
  const topEconomyPick = urgentPicks[0] ?? tempoPriorityPicks[0];
  const variantUnitCount = getVariantUnitCount(activeVariant);
  const levelUpBoardSlotPressure =
    level !== undefined && variantUnitCount !== undefined && variantUnitCount > level;
  const levelUpStreakValue = hasPushStreak ? Math.min(4, 1 + tempoContext.streakValue) : 0;
  const levelUpCost = estimateLevelUpCost(economyState);
  const levelUpPick = allPicks.filter(isLevelUpValuePick).sort(compareLevelUpValuePicks)[0];
  const levelUpOddsGain = levelUpPick?.levelUpShopOddsGain ?? 0;
  const levelUpOddsJump = isLevelUpOddsJump(levelUpPick);
  const canCompleteLevelUp =
    levelUpCost === undefined ||
    gold === undefined ||
    (Number.isFinite(gold) && gold >= levelUpCost.goldNeeded);
  const levelUpUnlocksTarget =
    levelUpPick !== undefined &&
    (levelUpPick.shopOdds ?? 0) <= 0 &&
    (levelUpPick.nextLevelShopOdds ?? 0) > 0;
  const levelUpInvestmentAffordable =
    gold === undefined
      ? true
      : levelUpCost !== undefined
        ? gold >= levelUpCost.goldNeeded + (hasNearUpgrade ? 4 : 8)
        : gold >= 24;
  const levelUpBoardSlotAffordable =
    gold === undefined
      ? true
      : levelUpCost !== undefined
        ? gold >= levelUpCost.goldNeeded &&
          (hasPushStreak || highCostPlan || gold >= levelUpCost.goldNeeded + 8)
        : gold >= (hasPushStreak ? 8 : 24);
  const levelUpHasOddsValue =
    levelUpPick !== undefined &&
    levelUpInvestmentAffordable &&
    (levelUpUnlocksTarget ||
      levelUpOddsJump ||
      levelUpOddsGain >= getLevelUpOddsGainThreshold(levelUpPick, tempoContext));
  const levelUpHasBoardSlotValue =
    levelUpBoardSlotPressure &&
    levelUpBoardSlotAffordable &&
    !healthPressure.survivalPressure &&
    !isRerollWindowPick(topEconomyPick) &&
    (hasPushStreak || highCostPlan || tempoContext.tempoPhase === 'late');
  const levelUpAnchorPick =
    levelUpPick ?? (levelUpHasBoardSlotValue ? getLevelUpAnchorPick(allPicks) : undefined);
  const hasMeaningfulLevelUpValue =
    level !== undefined &&
    level < 11 &&
    (levelUpHasOddsValue || levelUpHasBoardSlotValue);
  const isEarlyTempo = tempoContext.tempoPhase === 'early';
  const isLateTempo = tempoContext.tempoPhase === 'late';
  const shouldSaveForFastNineCap =
    level === 8 &&
    isLateTempo &&
    levelUpPick?.cost !== undefined &&
    levelUpPick.cost >= 5 &&
    hasStableFastNineCore(allPicks) &&
    !canCompleteLevelUp &&
    !hasNearUpgrade;
  const projectedRollBudget = getGoldenSpatulaProjectedRollBudget(gold);
  const rollDecisionScore = buildGoldenSpatulaRollDecisionScore({
    actionablePicks,
    economyState,
    tempoContext,
  });
  const formationBalanceAdvice = buildGoldenSpatulaFormationBalanceAdvice(allPicks);
  const roundPolicy = buildGoldenSpatulaRoundPolicy({
    actionablePicks,
    allPicks,
    economyState,
    tempoContext,
    rollDecisionScore,
    hasNearUpgrade,
    highCostPlan,
  });
  const stopLossAdvice = buildGoldenSpatulaStopLossAdvice({
    allPicks,
    tempoPriorityPicks,
    topEconomyPick,
    economyState,
    tempoContext,
  });
  const hasCriticalLockedNeed = levelLockedPicks.some(
    (pick) => pick.tier === 'core' || pick.tier === 'high' || pick.reasons.includes('nearUpgrade'),
  );
  const reasons = new Set<GoldenSpatulaDecisionReason>();
  for (const pick of [...urgentPicks, ...tempoPriorityPicks, ...levelLockedPicks]) {
    for (const reason of pick.reasons) reasons.add(reason);
  }
  if (hasPushStreak || hasPreserveStreak) reasons.add('streakPressure');
  if (stopLossAdvice) {
    for (const reason of stopLossAdvice.reasonNames) reasons.add(reason);
  }
  if (formationBalanceAdvice) {
    for (const reason of formationBalanceAdvice.reasonNames) reasons.add(reason);
  }

  let action: GoldenSpatulaEconomyDecisionAction = 'hold';
  let confidence: GoldenSpatulaEconomyDecisionAdvice['confidence'] =
    urgentPicks.length > 0 ? 'medium' : 'low';
  let recommendedRollCount = 0;

  if (hasMeaningfulLevelUpValue && !hasNearUpgrade) {
    action = 'level';
    confidence =
      levelUpUnlocksTarget ||
      levelUpOddsJump ||
      levelUpOddsGain >= 0.1 ||
      (levelUpHasBoardSlotValue && hasPushStreak)
        ? 'high'
        : 'medium';
    recommendedRollCount = 0;
  } else if (
    (urgentPicks.length === 0 && levelLockedPicks.length > 0 && level !== undefined && level < 8) ||
    (hasCriticalLockedNeed &&
      level !== undefined &&
      level < 8 &&
      (gold === undefined || gold >= 24))
  ) {
    action = gold === undefined || gold >= 24 ? 'level' : 'save';
    confidence = 'high';
    recommendedRollCount = 0;
  } else if (
    healthPressure.survivalPressure &&
    healthPressure.recommendedRollCount > 0 &&
    tempoPriorityPicks.length > 0 &&
    (hasRollStopLine || healthPressure.deathPressure)
  ) {
    action = 'roll';
    confidence =
      healthPressure.deathPressure || (healthPressure.health ?? 100) < 35 ? 'high' : 'medium';
    recommendedRollCount = healthPressure.recommendedRollCount;
  } else if (
    hasPreserveStreak &&
    !hasNearUpgrade &&
    tempoPriorityPicks.length > 0 &&
    gold !== undefined &&
    gold < 50
  ) {
    action = 'save';
    confidence = 'high';
    recommendedRollCount = 0;
  } else if (hasNearUpgrade && (gold === undefined || gold >= 20)) {
    action = 'roll';
    confidence = 'high';
    recommendedRollCount = gold !== undefined && gold >= 50 ? 5 : 3;
  } else if (
    hasPushStreak &&
    hasRollStopLine &&
    tempoPriorityPicks.length > 0 &&
    (gold === undefined || gold >= 24)
  ) {
    action = 'roll';
    confidence = 'high';
    recommendedRollCount = gold !== undefined && gold >= 40 ? 4 : 2;
  } else if (
    highCostPlan &&
    level !== undefined &&
    level < 8 &&
    (gold === undefined || gold >= 32)
  ) {
    action = 'level';
    confidence = 'medium';
    recommendedRollCount = 1;
  } else if (shouldSaveForFastNineCap) {
    action = 'save';
    confidence = 'high';
    recommendedRollCount = 0;
  } else if (urgentRollStopLinePicks.length >= 2 && (gold === undefined || gold >= 30)) {
    action = 'roll';
    confidence = 'medium';
    recommendedRollCount = gold !== undefined && gold >= 50 ? 5 : 2;
  } else if (
    isLateTempo &&
    urgentRollStopLinePicks.length > 0 &&
    (gold === undefined || gold >= 20)
  ) {
    action = 'roll';
    confidence = 'medium';
    recommendedRollCount = gold !== undefined && gold >= 40 ? 3 : 2;
  } else if (
    rollDecisionScore.band === 'rollToQuality' &&
    tempoPriorityPicks.length > 0 &&
    hasRollStopLine &&
    (gold === undefined || gold >= 24)
  ) {
    action = 'roll';
    confidence = 'medium';
    recommendedRollCount = gold !== undefined && gold >= 40 ? 4 : 3;
  } else if (
    rollDecisionScore.band === 'smallRoll' &&
    tempoPriorityPicks.length > 0 &&
    hasRollStopLine &&
    (gold === undefined || gold >= 30)
  ) {
    action = 'roll';
    confidence = 'medium';
    recommendedRollCount = 2;
  } else if (isEarlyTempo && !hasNearUpgrade && gold !== undefined && gold < 30) {
    action = 'save';
    confidence = urgentPicks.length > 0 ? 'medium' : 'high';
    recommendedRollCount = 0;
  } else if (
    gold !== undefined &&
    (gold < 30 || (interestGoldNeeded !== undefined && interestGoldNeeded <= 2))
  ) {
    action = 'save';
    confidence = urgentPicks.length > 0 ? 'medium' : 'high';
    recommendedRollCount = 0;
  }

  if (
    benchInterestAdvice?.canReachNextInterest &&
    action === 'hold' &&
    interestGoldNeeded !== undefined &&
    interestGoldNeeded <= 3
  ) {
    action = 'save';
    confidence = 'high';
    recommendedRollCount = 0;
  }

  const shouldApplyRoundPolicyRoll =
    roundPolicy?.action === 'roll' &&
    (roundPolicy.kind !== 'rerollWindow' || hasNearUpgrade || hasRollStopLine) &&
    !shouldSaveForFastNineCap &&
    action !== 'level';

  const canCompleteRoundPolicyLevel =
    roundPolicy?.action !== 'level' || levelUpCost === undefined || gold === undefined
      ? true
      : Number.isFinite(gold) && gold >= levelUpCost.goldNeeded;

  const shouldApplyRoundPolicyLevel =
    roundPolicy?.action === 'level' &&
    tempoContext.streakPressure !== 'preserve' &&
    canCompleteRoundPolicyLevel &&
    (action !== 'roll' ||
      (roundPolicy.focusCost === 3 &&
        roundPolicy.targetLevel === 7 &&
        !healthPressure.survivalPressure));

  if (shouldApplyRoundPolicyRoll) {
    if (action === 'hold' || action === 'save') {
      action = 'roll';
      confidence = roundPolicy.confidence;
    } else if (action === 'roll' && roundPolicy.confidence === 'high') {
      confidence = 'high';
    }
    const policyRollCount = roundPolicy.recommendedRollCount ?? 2;
    const policyBankFloor = getSurvivalAdjustedBankFloor(
      roundPolicy.bankFloor,
      healthPressure.bankFloor,
      healthPressure.survivalPressure,
    );
    const bankFloorRollCount =
      gold !== undefined && policyBankFloor !== undefined
        ? Math.max(0, Math.floor((gold - policyBankFloor) / 2))
        : undefined;
    recommendedRollCount =
      bankFloorRollCount !== undefined && bankFloorRollCount > 0
        ? Math.min(Math.max(recommendedRollCount, policyRollCount), bankFloorRollCount)
        : Math.max(recommendedRollCount, policyRollCount);
  } else if (shouldApplyRoundPolicyLevel) {
    action = 'level';
    confidence = roundPolicy.confidence;
    recommendedRollCount = 0;
  } else if (
    roundPolicy?.action === 'save' &&
    (action === 'hold' ||
      (action === 'roll' &&
        roundPolicy.bankFloor !== undefined &&
        gold !== undefined &&
        gold <= roundPolicy.bankFloor &&
        tempoContext.streakPressure !== 'push' &&
        !healthPressure.survivalPressure))
  ) {
    action = 'save';
    confidence = roundPolicy.confidence;
    recommendedRollCount = 0;
  }

  if (stopLossAdvice) {
    if (stopLossAdvice.action === 'stopRolling' && action === 'roll') {
      action = 'save';
      confidence = stopLossAdvice.severity === 'critical' ? 'high' : 'medium';
      recommendedRollCount = 0;
    } else if (stopLossAdvice.action === 'pivot') {
      action =
        level !== undefined && level < 8 && (gold === undefined || gold >= 32) ? 'level' : 'save';
      confidence = stopLossAdvice.severity === 'critical' ? 'high' : 'medium';
      recommendedRollCount = 0;
    } else if (
      stopLossAdvice.action === 'stabilize' &&
      (action === 'level' ||
        action === 'hold' ||
        (action === 'save' &&
          (gold === undefined ||
            stopLossAdvice.bankFloor === undefined ||
            gold > stopLossAdvice.bankFloor)))
    ) {
      action = 'roll';
      confidence = stopLossAdvice.severity === 'critical' ? 'high' : 'medium';
      recommendedRollCount = Math.max(
        recommendedRollCount,
        stopLossAdvice.bankFloor === 10 ? 5 : stopLossAdvice.bankFloor === 20 ? 3 : 2,
      );
    } else if (stopLossAdvice.action === 'avoidLevel' && action === 'level') {
      action = hasRollStopLine ? 'roll' : 'hold';
      confidence = stopLossAdvice.severity === 'critical' ? 'high' : 'medium';
      recommendedRollCount = hasRollStopLine ? Math.max(recommendedRollCount, 3) : 0;
    }
  }

  if (formationBalanceAdvice?.kind === 'frontlineFirst') {
    const health = economyState?.health;
    if (action === 'roll') {
      recommendedRollCount = Math.max(
        recommendedRollCount,
        health !== undefined && health < 50 ? 3 : 2,
      );
    } else if (
      action === 'level' &&
      health !== undefined &&
      health < 50 &&
      formationBalanceAdvice.priorityTargetNames.length > 0
    ) {
      action = 'roll';
      confidence = health < 35 ? 'high' : 'medium';
      recommendedRollCount = Math.max(recommendedRollCount, health < 35 ? 4 : 3);
    }
  }

  const policyRollBankFloor =
    roundPolicy?.bankFloor !== undefined || stopLossAdvice?.bankFloor !== undefined
      ? Math.max(roundPolicy?.bankFloor ?? 0, stopLossAdvice?.bankFloor ?? 0)
      : undefined;
  const rollBankFloor = getSurvivalAdjustedBankFloor(
    policyRollBankFloor,
    healthPressure.bankFloor,
    healthPressure.survivalPressure,
  );
  if (action === 'roll' && rollBankFloor !== undefined && gold !== undefined) {
    const bankFloorRollCount = Math.max(0, Math.floor((gold - rollBankFloor) / 2));
    if (bankFloorRollCount > 0) {
      recommendedRollCount = Math.min(recommendedRollCount, bankFloorRollCount);
    }
  }

  const baseUrgentPickNames = (urgentPicks.length > 0 ? urgentPicks : tempoPriorityPicks).map(
    (pick) => pick.name,
  );
  const formationPriorityNames = new Set(formationBalanceAdvice?.priorityTargetNames ?? []);
  const formationDeprioritizedNames = new Set(
    formationBalanceAdvice?.deprioritizedTargetNames ?? [],
  );
  const urgentPickNames =
    formationPriorityNames.size > 0
      ? [
          ...formationPriorityNames,
          ...baseUrgentPickNames.filter(
            (name) => !formationDeprioritizedNames.has(name) || formationPriorityNames.has(name),
          ),
        ]
      : baseUrgentPickNames;

  return {
    action,
    confidence,
    recommendedRollCount,
    recommendedXpPurchaseCount: action === 'level' ? levelUpCost?.purchaseCount : undefined,
    breakdown: {
      urgentPickCount: urgentPicks.length,
      tempoPickCount: tempoPriorityPicks.length,
      levelLockedPickCount: levelLockedPicks.length,
      topPickScore: topEconomyPick?.score,
      topRollTargetPriority: topEconomyPick?.rollTargetPriority,
      nearUpgrade: hasNearUpgrade,
      highCostPlan,
      criticalLevelLockedNeed: hasCriticalLockedNeed,
      levelUpTargetName: levelUpAnchorPick?.name,
      levelUpLevel: levelUpAnchorPick?.nextLevel,
      levelUpXpNeeded: levelUpCost?.xpNeeded,
      levelUpGoldNeeded: levelUpCost?.goldNeeded,
      levelUpShopOddsGain: levelUpAnchorPick?.levelUpShopOddsGain,
      levelUpNextShopOdds: levelUpAnchorPick?.nextLevelShopOdds,
      levelUpShopOddsRatio: levelUpAnchorPick?.levelUpShopOddsRatio,
      levelUpBoardSlotPressure,
      levelUpProjectedUnitCount: variantUnitCount,
      levelUpStreakValue,
      rollDecisionScore,
      roundPolicy,
      stopLoss: stopLossAdvice,
      formationBalance: formationBalanceAdvice,
      tempoPhase: tempoContext.tempoPhase,
      streakPressure: tempoContext.streakPressure,
      projectedRollBudget,
    },
    benchInterestAdvice,
    gold,
    level,
    interestGoldNeeded,
    urgentPickNames: Array.from(new Set(urgentPickNames)).slice(0, 4),
    reasons: sortGoldenSpatulaDecisionReasons(reasons).slice(0, 4),
  };
}
