import type {
  GoldenSpatulaChampionAssetIndex,
  GoldenSpatulaContestState,
  GoldenSpatulaDecisionPlan,
  GoldenSpatulaEconomyDecisionAdvice,
  GoldenSpatulaEconomyRunState,
  GoldenSpatulaHandRunState,
  GoldenSpatulaItemAssetIndex,
  GoldenSpatulaKnowledgeScanState,
  GoldenSpatulaLineupVariant,
  GoldenSpatulaManagedLineup,
  GoldenSpatulaPickRecommendation,
  GoldenSpatulaStopLossAdvice,
  GoldenSpatulaRecommendedLineup,
  GoldenSpatulaTransitionLineupRecommendation,
} from '@/types/goldenSpatula';
import { buildGoldenSpatulaChampionCostDensity } from './goldenSpatulaAcquisitionModel';
export {
  extractGoldenSpatulaTraitTags,
  getGoldenSpatulaShopOdds,
} from './goldenSpatulaDecisionContext';
import { normalizeDecisionText } from './goldenSpatulaDecisionContext';
import {
  buildGoldenSpatulaCandidateSet,
  buildGoldenSpatulaTransitionSources,
} from './goldenSpatulaCandidateModel';
import { getGoldenSpatulaObservedItemSignals as getObservedItemSignals } from './goldenSpatulaObservationModel';
import { buildGoldenSpatulaEconomyAdvice } from './goldenSpatulaEconomyDecisionModel';
import {
  isGoldenSpatulaActionablePick,
  compareGoldenSpatulaActionablePicks,
  isGoldenSpatulaActionableRollPick,
} from './goldenSpatulaPickDecisionModel';
import { buildGoldenSpatulaPickRecommendation } from './goldenSpatulaPickRecommendationModel';
import {
  getGoldenSpatulaTempoContext,
  type GoldenSpatulaTempoContext,
} from './goldenSpatulaTempoModel';
import { rankGoldenSpatulaTransitionLineups } from './goldenSpatulaTransitionModel';

export interface GoldenSpatulaDecisionInput {
  activeVariant?: GoldenSpatulaLineupVariant;
  managedLineups?: GoldenSpatulaManagedLineup[];
  recommendedLineups?: GoldenSpatulaRecommendedLineup[];
  championAssets?: GoldenSpatulaChampionAssetIndex;
  itemAssets?: GoldenSpatulaItemAssetIndex;
  handState?: GoldenSpatulaHandRunState;
  economyState?: GoldenSpatulaEconomyRunState;
  knowledgeState?: GoldenSpatulaKnowledgeScanState;
  contestState?: GoldenSpatulaContestState;
  maxPicks?: number;
  maxTransitions?: number;
}

function getScoringVariant(
  variant: GoldenSpatulaLineupVariant | undefined,
): GoldenSpatulaLineupVariant | undefined {
  if (!variant?.rollTargetNames) return variant;

  // UI-selected roll targets should not feed back into pick scoring.
  return {
    ...variant,
    rollTargetNames: undefined,
  };
}

function getFormationTargetRank(
  name: string,
  priorityNames: Set<string>,
  deprioritizedNames: Set<string>,
): number {
  const key = normalizeDecisionText(name);
  if (priorityNames.has(key)) return 0;
  if (deprioritizedNames.has(key)) return 2;
  return 1;
}

function getStopLossBlockedRollTargetNames(
  stopLossAdvice: GoldenSpatulaStopLossAdvice | undefined,
): Set<string> {
  const blockedNames = new Set<string>();
  if (!stopLossAdvice) return blockedNames;

  const focusTargetName = normalizeDecisionText(stopLossAdvice.targetNames[0] ?? '');
  if (!focusTargetName) return blockedNames;

  if (stopLossAdvice.kind === 'stopRollingSideUnits') {
    blockedNames.add(focusTargetName);
  }
  if (stopLossAdvice.action === 'pivot' && stopLossAdvice.pivotPreferred) {
    blockedNames.add(focusTargetName);
  }

  return blockedNames;
}

function isStopLossSideUnitRollTarget(
  pick: GoldenSpatulaPickRecommendation,
  stopLossAdvice: GoldenSpatulaStopLossAdvice | undefined,
): boolean {
  if (stopLossAdvice?.kind !== 'stopRollingSideUnits') return false;
  if (isPrimaryCoreRollTarget(pick) || isAuxiliaryCoreRollTarget(pick)) return false;
  if (pick.role === 'carry' || pick.role === 'frontline') return false;
  if (pick.cost === undefined || pick.cost > 3 || pick.copiesNeeded <= 0) return false;
  return pick.reasons.includes('nearUpgrade') || (pick.targetCount >= 6 && pick.ownedCount >= 3);
}

function isStopLossStabilizeCoreRollTarget(
  pick: GoldenSpatulaPickRecommendation,
  stopLossAdvice: GoldenSpatulaStopLossAdvice | undefined,
): boolean {
  if (stopLossAdvice?.action !== 'stabilize') return false;
  if (!isPrimaryCoreRollTarget(pick) || isStableCoreRollTarget(pick)) return false;
  const key = normalizeDecisionText(pick.name);
  return stopLossAdvice.targetNames.map(normalizeDecisionText).includes(key);
}

function isStopLossStabilizeKeyFunctionRollTarget(
  pick: GoldenSpatulaPickRecommendation,
  stopLossAdvice: GoldenSpatulaStopLossAdvice | undefined,
): boolean {
  if (stopLossAdvice?.kind !== 'fourCostStabilize' || stopLossAdvice.action !== 'stabilize') {
    return false;
  }
  if (pick.cost !== 4 || pick.copiesNeeded <= 0 || isStableCoreRollTarget(pick)) return false;
  if (isPrimaryCoreRollTarget(pick)) return false;
  return pick.reasons.includes('activeLineup');
}

function isOneCostAbandonStableCoreRollTarget(
  pick: GoldenSpatulaPickRecommendation,
  stopLossAdvice: GoldenSpatulaStopLossAdvice | undefined,
): boolean {
  if (stopLossAdvice?.kind !== 'oneCostRerollAbandon') return false;
  if (pick.cost !== 1 || pick.targetCount < 6 || pick.copiesNeeded <= 0) return false;
  if (!isPrimaryCoreRollTarget(pick) || !isStableCoreRollTarget(pick)) return false;
  const key = normalizeDecisionText(pick.name);
  return stopLossAdvice.targetNames.map(normalizeDecisionText).includes(key);
}

function canFormPairFromVisibleShop(pick: GoldenSpatulaPickRecommendation): boolean {
  const shopVisibleCount = pick.shopVisibleCount ?? 0;
  return shopVisibleCount >= 2 || (pick.ownedCount > 0 && shopVisibleCount > 0);
}

function isLowEconomyStrongDenyTransitionRollTarget(
  pick: GoldenSpatulaPickRecommendation,
  economyState: GoldenSpatulaEconomyRunState | undefined,
): boolean {
  const gold = economyState?.gold;
  if (gold === undefined || !Number.isFinite(gold) || gold >= 20) return false;
  if (hasSurvivalHealthPressure(economyState)) return false;
  if ((pick.shopVisibleCount ?? 0) <= 0 || pick.copiesNeeded <= 0) return false;

  const reasonSet = new Set(pick.reasons);
  const hasTransitionValue =
    reasonSet.has('traitBridge') || reasonSet.has('cheapTransition');
  const hasStrongDenyValue =
    (pick.externalContestCopies ?? 0) >= 6 || (pick.contestPoolShare ?? 0) >= 0.25;

  return hasTransitionValue && hasStrongDenyValue;
}

function isLowEconomyWeakSingleRollTarget(
  pick: GoldenSpatulaPickRecommendation,
  economyState: GoldenSpatulaEconomyRunState | undefined,
): boolean {
  const gold = economyState?.gold;
  if (gold === undefined || !Number.isFinite(gold) || gold >= 20) return false;
  if (pick.cost === undefined) return false;

  const reasonSet = new Set(pick.reasons);
  if (reasonSet.has('nearUpgrade')) return false;
  if (isLowEconomyStrongDenyTransitionRollTarget(pick, economyState)) return false;

  const canFieldNow =
    reasonSet.has('activeLineup') ||
    reasonSet.has('activeCarry') ||
    reasonSet.has('activeFrontline');

  return !canFieldNow && !canFormPairFromVisibleShop(pick);
}

function getInterestIncome(gold: number): number {
  return Math.min(Math.floor(Math.max(0, gold) / 10), 5);
}

function getPotentialInterestTax(gold: number | undefined, spend: number | undefined): number {
  if (
    gold === undefined ||
    spend === undefined ||
    !Number.isFinite(gold) ||
    !Number.isFinite(spend) ||
    spend <= 0
  ) {
    return 0;
  }
  return Math.max(0, getInterestIncome(gold) - getInterestIncome(gold - spend));
}

function isPrimaryCoreRollTarget(pick: GoldenSpatulaPickRecommendation): boolean {
  const reasonSet = new Set(pick.reasons);
  return (
    reasonSet.has('activeCarry') ||
    reasonSet.has('activeFrontline') ||
    (reasonSet.has('activeLineup') && (pick.role === 'carry' || pick.role === 'frontline'))
  );
}

function isAuxiliaryCoreRollTarget(pick: GoldenSpatulaPickRecommendation): boolean {
  if (isPrimaryCoreRollTarget(pick)) return false;
  const reasonSet = new Set(pick.reasons);
  return (
    pick.role === 'power' ||
    reasonSet.has('recommendedCarry') ||
    reasonSet.has('itemFit') ||
    reasonSet.has('highCostPower')
  );
}

function isPriorityBeforeSidecarRollTarget(pick: GoldenSpatulaPickRecommendation): boolean {
  return isPrimaryCoreRollTarget(pick) || isAuxiliaryCoreRollTarget(pick);
}

function getCoreStabilityThreshold(pick: GoldenSpatulaPickRecommendation): number {
  const twoStarThreshold = pick.cost !== undefined && pick.cost >= 4 ? 2 : 3;
  return Math.min(pick.targetCount, twoStarThreshold);
}

function isStableCoreRollTarget(pick: GoldenSpatulaPickRecommendation): boolean {
  return pick.ownedCount >= getCoreStabilityThreshold(pick);
}

function isUnstablePriorityBeforeSidecarRollTarget(
  pick: GoldenSpatulaPickRecommendation,
): boolean {
  return isPriorityBeforeSidecarRollTarget(pick) && !isStableCoreRollTarget(pick);
}

function isCoreSlowRollWindowTarget(pick: GoldenSpatulaPickRecommendation): boolean {
  if (!isPrimaryCoreRollTarget(pick)) return false;
  if (!isStableCoreRollTarget(pick) || pick.ownedCount >= pick.targetCount) return false;
  if (pick.cost === undefined || pick.cost > 3 || pick.targetCount < 6) return false;
  return pick.copiesNeeded > 0;
}

function hasSurvivalHealthPressure(economyState: GoldenSpatulaEconomyRunState | undefined): boolean {
  const health = economyState?.health;
  return health !== undefined && Number.isFinite(health) && health < 50;
}

function isSurvivalGatedFutureSingleRollTarget(
  pick: GoldenSpatulaPickRecommendation,
  economyState: GoldenSpatulaEconomyRunState | undefined,
): boolean {
  if (!hasSurvivalHealthPressure(economyState)) return false;
  if (pick.ownedCount > 1 || pick.copiesNeeded <= 0) return false;

  const reasonSet = new Set(pick.reasons);
  if (reasonSet.has('activeLineup') || isPrimaryCoreRollTarget(pick)) return false;
  if (canFormPairFromVisibleShop(pick)) return false;

  return true;
}

function isLossStreakPreserveFutureSingleRollTarget(
  pick: GoldenSpatulaPickRecommendation,
  tempoContext: GoldenSpatulaTempoContext,
): boolean {
  if (tempoContext.streakPressure !== 'preserve') return false;
  if (pick.ownedCount > 1 || pick.copiesNeeded <= 0) return false;

  const reasonSet = new Set(pick.reasons);
  if (reasonSet.has('activeLineup') || isPrimaryCoreRollTarget(pick)) return false;
  if (canFormPairFromVisibleShop(pick)) return false;

  return true;
}

function isStageFourPrepDeadSingleRollTarget(
  pick: GoldenSpatulaPickRecommendation,
  tempoContext: GoldenSpatulaTempoContext,
): boolean {
  const stage = tempoContext.stage;
  const phase = tempoContext.phase;
  const stageFourPrep =
    stage !== undefined &&
    (stage === 4 || (stage === 3 && phase !== undefined && phase >= 5));
  if (!stageFourPrep) return false;
  if (pick.ownedCount > 1 || pick.copiesNeeded <= 0) return false;
  if (pick.cost === undefined) return false;

  const reasonSet = new Set(pick.reasons);
  if (reasonSet.has('activeLineup') || isPrimaryCoreRollTarget(pick)) return false;
  if (canFormPairFromVisibleShop(pick)) return false;

  return true;
}

function isHeavilyContestedRerollChaseTarget(pick: GoldenSpatulaPickRecommendation): boolean {
  if (pick.cost === undefined || pick.cost > 3 || pick.targetCount < 6) return false;
  if (pick.copiesNeeded <= 0) return false;
  const externallyCrowded =
    (pick.contestPoolShare ?? 0) >= 0.25 || (pick.externalContestCopies ?? 0) >= 6;
  if (!externallyCrowded) return false;

  const visibleCopies = pick.shopVisibleCount ?? 0;
  if (pick.ownedCount + visibleCopies >= pick.targetCount) return false;
  if (pick.reasons.includes('nearUpgrade') && !isStableCoreRollTarget(pick)) return false;
  return true;
}

function isModeratelyContestedRerollChaseTarget({
  pick,
  lateralTransitionRollTargetNames,
}: {
  pick: GoldenSpatulaPickRecommendation;
  lateralTransitionRollTargetNames: Set<string>;
}): boolean {
  if (lateralTransitionRollTargetNames.size === 0) return false;
  const key = normalizeDecisionText(pick.name);
  if (key && lateralTransitionRollTargetNames.has(key)) return false;
  if (pick.cost === undefined || pick.cost > 3 || pick.targetCount < 6) return false;
  if (pick.copiesNeeded <= 0) return false;
  const moderatelyCrowded =
    (pick.contestPoolShare ?? 0) >= 0.18 || (pick.externalContestCopies ?? 0) >= 4;
  if (!moderatelyCrowded) return false;

  const visibleCopies = pick.shopVisibleCount ?? 0;
  if (pick.ownedCount + visibleCopies >= pick.targetCount) return false;
  if (pick.reasons.includes('nearUpgrade') && !isStableCoreRollTarget(pick)) return false;
  return true;
}

function isEconomyGatedStableAuxiliaryRollTarget(
  pick: GoldenSpatulaPickRecommendation,
  economyState: GoldenSpatulaEconomyRunState | undefined,
): boolean {
  if (!isAuxiliaryCoreRollTarget(pick)) return false;
  if (!isStableCoreRollTarget(pick) || pick.ownedCount >= pick.targetCount) return false;
  if (!pick.reasons.includes('nearUpgrade')) return true;
  if (hasSurvivalHealthPressure(economyState)) return true;
  const gold = economyState?.gold;
  if (gold === undefined || !Number.isFinite(gold)) return true;
  return gold < 60;
}

function isEconomyGatedStablePrimaryCoreRollTarget(
  pick: GoldenSpatulaPickRecommendation,
  economyState: GoldenSpatulaEconomyRunState | undefined,
): boolean {
  if (!isPrimaryCoreRollTarget(pick)) return false;
  if (!isStableCoreRollTarget(pick) || pick.ownedCount >= pick.targetCount) return false;
  if (pick.cost === undefined || pick.cost > 3 || pick.targetCount < 6) return false;

  const reasonSet = new Set(pick.reasons);
  if (reasonSet.has('nearUpgrade')) return false;
  if (pick.ownedCount >= 5) return false;
  if (hasSurvivalHealthPressure(economyState)) return true;

  const gold = economyState?.gold;
  if (gold === undefined || !Number.isFinite(gold)) return true;
  return gold < 50;
}

function isRareWindowGatedRollTarget(
  pick: GoldenSpatulaPickRecommendation,
  levelFollowUpRollTargetNames: Set<string>,
): boolean {
  if (pick.shopOddsAvailability !== 'rare') return false;
  if ((pick.shopVisibleCount ?? 0) > 0) return false;
  if (pick.reasons.includes('nearUpgrade')) return false;
  if (levelFollowUpRollTargetNames.has(normalizeDecisionText(pick.name))) return false;
  return true;
}

function getLateralTransitionRollTargetNames(
  transitionLineups: GoldenSpatulaTransitionLineupRecommendation[],
  stopLossAdvice: GoldenSpatulaStopLossAdvice | undefined,
): Set<string> {
  const targetNames = new Set<string>();
  const pivotRecovery = stopLossAdvice?.action === 'pivot' && stopLossAdvice.pivotPreferred;
  const actionableLineups = transitionLineups.filter(
    (lineup) => {
      if (lineup.riskLevel === 'greedy' || lineup.readiness === 'tooGreedy') return false;
      if (['holdBridge', 'itemHolder', 'pivotSoon'].includes(lineup.nextAction)) return true;
      return (
        pivotRecovery &&
        lineup.scoreBreakdown.pivotBlockedPenalty <= 0 &&
        ((lineup.matchedUnitNames?.length ?? 0) > 0 ||
          (lineup.bridgeUnitNames?.length ?? 0) > 0)
      );
    },
  );
  const bestScore = actionableLineups[0]?.score;
  if (bestScore === undefined) return targetNames;

  for (const lineup of actionableLineups) {
    if (lineup.score < bestScore - 12) continue;
    const shellPivotTargetNames =
      pivotRecovery &&
      lineup.scoreBreakdown.pivotBlockedPenalty <= 0 &&
      ((lineup.matchedUnitNames?.length ?? 0) > 0 ||
        (lineup.bridgeUnitNames?.length ?? 0) > 0)
        ? (lineup.missingKeyUnitNames ?? [])
        : [];
    for (const name of [
      ...(lineup.itemBridgeUnitNames ?? []),
      ...(lineup.itemFamilyUnitNames ?? []),
      ...shellPivotTargetNames,
    ]) {
      const key = normalizeDecisionText(name);
      if (key) targetNames.add(key);
    }
  }

  return targetNames;
}

function isFullResetGatedByLateralTransitionTarget(
  pick: GoldenSpatulaPickRecommendation,
  lateralTransitionRollTargetNames: Set<string>,
  levelFollowUpRollTargetNames: Set<string>,
): boolean {
  if (lateralTransitionRollTargetNames.size === 0) return false;
  const key = normalizeDecisionText(pick.name);
  if (!key || lateralTransitionRollTargetNames.has(key)) return false;
  if (levelFollowUpRollTargetNames.has(key)) return false;
  if ((pick.shopVisibleCount ?? 0) > 0 || canFormPairFromVisibleShop(pick)) return false;

  const reasonSet = new Set(pick.reasons);
  if (reasonSet.has('nearUpgrade')) return false;
  if (reasonSet.has('activeLineup') || isPrimaryCoreRollTarget(pick)) return false;
  if (
    reasonSet.has('traitBridge') ||
    reasonSet.has('cheapTransition') ||
    reasonSet.has('itemFit') ||
    (pick.observedItemMatchCount ?? 0) > 0
  ) {
    return false;
  }

  return (
    pick.role === 'power' ||
    reasonSet.has('recommendedCarry') ||
    reasonSet.has('highCostPower')
  );
}

function isInterestLineGatedRollTarget(
  pick: GoldenSpatulaPickRecommendation,
  economyState: GoldenSpatulaEconomyRunState | undefined,
): boolean {
  const gold = economyState?.gold;
  if (gold === undefined || !Number.isFinite(gold) || gold < 20 || gold >= 40) return false;
  const currentInterestTax = pick.scoreBreakdown.penalties.interestTax ?? 0;
  const potentialInterestTax = getPotentialInterestTax(gold, pick.cost);
  if (currentInterestTax <= 0 && potentialInterestTax <= 0) return false;
  if (hasSurvivalHealthPressure(economyState)) return false;

  const reasonSet = new Set(pick.reasons);
  if (reasonSet.has('nearUpgrade')) return false;
  if (reasonSet.has('activeLineup')) return false;
  if (isPrimaryCoreRollTarget(pick)) return false;
  const hasTransitionOrAuxiliaryValue =
    isAuxiliaryCoreRollTarget(pick) ||
    reasonSet.has('traitBridge') ||
    reasonSet.has('cheapTransition') ||
    (pick.observedItemMatchCount ?? 0) > 0;
  if (
    canFormPairFromVisibleShop(pick) &&
    hasTransitionOrAuxiliaryValue
  ) {
    return false;
  }

  return true;
}

function isNonBridgePairBaitRollTarget(
  pick: GoldenSpatulaPickRecommendation,
  tempoContext: GoldenSpatulaTempoContext,
): boolean {
  if (tempoContext.stage === undefined || tempoContext.stage < 2) return false;
  if (pick.ownedCount <= 0 || pick.copiesNeeded <= 0) return false;

  const reasonSet = new Set(pick.reasons);
  const directPairChase = reasonSet.has('nearUpgrade') || pick.ownedCount % 3 === 2;
  if (!directPairChase) return false;
  if (isPrimaryCoreRollTarget(pick) || isAuxiliaryCoreRollTarget(pick)) return false;
  if (reasonSet.has('activeLineup')) return false;
  if (
    reasonSet.has('traitBridge') ||
    reasonSet.has('cheapTransition') ||
    reasonSet.has('itemFit') ||
    (pick.observedItemMatchCount ?? 0) > 0
  ) {
    return false;
  }

  return true;
}

function isPreStageCoreTraitPairRollTarget(
  pick: GoldenSpatulaPickRecommendation,
  tempoContext: GoldenSpatulaTempoContext,
): boolean {
  if (tempoContext.stage === undefined || tempoContext.stage >= 4) return false;
  if (pick.ownedCount <= 0 || pick.copiesNeeded <= 0) return false;
  if (!canFormPairFromVisibleShop(pick)) return false;

  const reasonSet = new Set(pick.reasons);
  return reasonSet.has('traitBridge') && (pick.role === 'trait' || pick.role === 'transition');
}

function isVisibleActionableBuyTarget(pick: GoldenSpatulaPickRecommendation): boolean {
  if ((pick.shopVisibleCount ?? 0) <= 0 || pick.copiesNeeded <= 0) return false;

  const reasonSet = new Set(pick.reasons);
  return (
    reasonSet.has('nearUpgrade') ||
    reasonSet.has('activeLineup') ||
    isPrimaryCoreRollTarget(pick) ||
    isAuxiliaryCoreRollTarget(pick) ||
    reasonSet.has('traitBridge') ||
    reasonSet.has('cheapTransition')
  );
}

function isSidecarRollTarget(pick: GoldenSpatulaPickRecommendation): boolean {
  if (isPriorityBeforeSidecarRollTarget(pick)) return false;
  const reasonSet = new Set(pick.reasons);
  if (reasonSet.has('nearUpgrade') || reasonSet.has('itemFit')) return false;
  return pick.role === 'trait' || pick.role === 'transition';
}

function isEconomyGatedSidecarRollTarget({
  pick,
  economyState,
  hasUnstablePriorityBeforeSidecarRollTarget,
}: {
  pick: GoldenSpatulaPickRecommendation;
  economyState: GoldenSpatulaEconomyRunState | undefined;
  hasUnstablePriorityBeforeSidecarRollTarget: boolean;
}): boolean {
  if (!isSidecarRollTarget(pick)) return false;
  if (hasSurvivalHealthPressure(economyState)) return true;
  const gold = economyState?.gold;
  if (gold === undefined || !Number.isFinite(gold)) return false;
  if (hasUnstablePriorityBeforeSidecarRollTarget) return true;
  if (gold >= 40) return false;
  return true;
}

function getNearUpgradeFocusedRollTargetNames({
  economyAdvice,
  targetCandidates,
  economyState,
  formationPriorityNames,
  tempoContext,
}: {
  economyAdvice: GoldenSpatulaEconomyDecisionAdvice;
  targetCandidates: GoldenSpatulaPickRecommendation[];
  economyState: GoldenSpatulaEconomyRunState | undefined;
  formationPriorityNames: Set<string>;
  tempoContext: GoldenSpatulaTempoContext;
}): Set<string> {
  const focusedNames = new Set<string>();
  if (economyAdvice.action === 'level') return focusedNames;
  if (!economyAdvice.breakdown.nearUpgrade) return focusedNames;
  if (formationPriorityNames.size > 0) return focusedNames;
  if (hasSurvivalHealthPressure(economyState)) return focusedNames;

  const nearUpgradePicks = targetCandidates.filter(
    (pick) =>
      pick.reasons.includes('nearUpgrade') && !isNonBridgePairBaitRollTarget(pick, tempoContext),
  );
  const gold = economyState?.gold;
  const coreSlowRollWindow =
    economyAdvice.breakdown.roundPolicy?.kind === 'rerollWindow' &&
    economyAdvice.breakdown.formationBalance?.kind === 'balanced' &&
    gold !== undefined &&
    Number.isFinite(gold) &&
    gold >= 50;
  const hasPriorityNearUpgrade = nearUpgradePicks.some(isPriorityBeforeSidecarRollTarget);
  if (coreSlowRollWindow && !hasPriorityNearUpgrade) {
    for (const pick of targetCandidates.filter(isCoreSlowRollWindowTarget)) {
      const key = normalizeDecisionText(pick.name);
      if (key) focusedNames.add(key);
    }
    if (focusedNames.size > 0) return focusedNames;
  }

  const focusRanks = nearUpgradePicks.map((pick) =>
    isPrimaryCoreRollTarget(pick)
      ? 0
      : isAuxiliaryCoreRollTarget(pick)
        ? 1
        : pick.reasons.includes('activeLineup')
          ? 2
          : 3,
  );
  const bestRank = Math.min(...focusRanks);
  if (!Number.isFinite(bestRank)) return focusedNames;

  for (const pick of nearUpgradePicks) {
    const rank = isPrimaryCoreRollTarget(pick)
      ? 0
      : isAuxiliaryCoreRollTarget(pick)
        ? 1
        : pick.reasons.includes('activeLineup')
          ? 2
          : 3;
    if (rank !== bestRank) continue;
    const key = normalizeDecisionText(pick.name);
    if (key) focusedNames.add(key);
  }

  return focusedNames;
}

function getLevelFollowUpRollTargetNames({
  economyAdvice,
  allPicks,
}: {
  economyAdvice: GoldenSpatulaEconomyDecisionAdvice;
  allPicks: GoldenSpatulaPickRecommendation[];
}): Set<string> {
  const followUpNames = new Set<string>();
  if (economyAdvice.action !== 'level') return followUpNames;

  const targetName = normalizeDecisionText(economyAdvice.breakdown.levelUpTargetName ?? '');
  if (!targetName) return followUpNames;

  const targetPick = allPicks.find((pick) => normalizeDecisionText(pick.name) === targetName);
  if (!targetPick || targetPick.copiesNeeded <= 0) return followUpNames;
  if (targetPick.shopOddsAvailability === 'unavailable' && targetPick.shopOddsSource === 'ocr') {
    return followUpNames;
  }
  if ((targetPick.nextLevelShopOdds ?? 0) <= 0) return followUpNames;
  if ((targetPick.levelUpShopOddsGain ?? 0) <= 0) return followUpNames;

  followUpNames.add(targetName);
  return followUpNames;
}

function collectRecommendedRollTargetCandidates({
  actionableRollPicks,
  allPicks,
  levelFollowUpRollTargetNames,
  lateralTransitionRollTargetNames,
}: {
  actionableRollPicks: GoldenSpatulaPickRecommendation[];
  allPicks: GoldenSpatulaPickRecommendation[];
  levelFollowUpRollTargetNames: Set<string>;
  lateralTransitionRollTargetNames: Set<string>;
}): GoldenSpatulaPickRecommendation[] {
  const candidates = new Map<string, GoldenSpatulaPickRecommendation>();
  for (const pick of actionableRollPicks) {
    const key = normalizeDecisionText(pick.name);
    if (key) candidates.set(key, pick);
  }
  for (const pick of allPicks) {
    const key = normalizeDecisionText(pick.name);
    if (candidates.has(key)) continue;
    if (
      !levelFollowUpRollTargetNames.has(key) &&
      !lateralTransitionRollTargetNames.has(key) &&
      !isVisibleActionableBuyTarget(pick)
    ) {
      continue;
    }
    candidates.set(key, pick);
  }
  return Array.from(candidates.values());
}

export function buildGoldenSpatulaDecisionPlan(
  input: GoldenSpatulaDecisionInput,
): GoldenSpatulaDecisionPlan {
  const maxPicks = input.maxPicks ?? 8;
  const maxTransitions = input.maxTransitions ?? 3;
  const sources = buildGoldenSpatulaTransitionSources({
    managedLineups: input.managedLineups,
    recommendedLineups: input.recommendedLineups,
  });
  const activeVariant = input.activeVariant;
  const scoringVariant = getScoringVariant(activeVariant);
  const currentLevel = input.economyState?.level;
  const { candidates, activeTargets, explicitTargets } = buildGoldenSpatulaCandidateSet({
    activeVariant: scoringVariant,
    sources,
    championAssets: input.championAssets,
  });
  const costDensity = buildGoldenSpatulaChampionCostDensity(input.championAssets);
  const observedItems = getObservedItemSignals(input.knowledgeState, input.itemAssets);
  const tempoContext = getGoldenSpatulaTempoContext(input.economyState);

  const allPicks = Array.from(candidates.values())
    .map((candidate) =>
      buildGoldenSpatulaPickRecommendation({
        candidate,
        activeTargets,
        explicitTargets,
        championAssets: input.championAssets,
        handState: input.handState,
        economyState: input.economyState,
        knowledgeState: input.knowledgeState,
        contestState: input.contestState,
        currentLevel,
        observedItems,
        costDensity,
        tempoContext,
      }),
    )
    .sort((a, b) => b.score - a.score || a.copiesNeeded - b.copiesNeeded);

  const actionablePicks = allPicks
    .filter(isGoldenSpatulaActionablePick)
    .sort(compareGoldenSpatulaActionablePicks);
  const actionableRollPicks = allPicks
    .filter(isGoldenSpatulaActionableRollPick)
    .sort(compareGoldenSpatulaActionablePicks);
  const economyActionablePicks = actionablePicks.filter(
    (pick) =>
      !isNonBridgePairBaitRollTarget(pick, tempoContext) &&
      !isStageFourPrepDeadSingleRollTarget(pick, tempoContext) &&
      !isLossStreakPreserveFutureSingleRollTarget(pick, tempoContext) &&
      !isSurvivalGatedFutureSingleRollTarget(pick, input.economyState),
  );
  const targetActionableRollPicks = actionableRollPicks.filter(
    (pick) =>
      !isNonBridgePairBaitRollTarget(pick, tempoContext) &&
      !isStageFourPrepDeadSingleRollTarget(pick, tempoContext) &&
      !isLossStreakPreserveFutureSingleRollTarget(pick, tempoContext) &&
      !isHeavilyContestedRerollChaseTarget(pick) &&
      !isSurvivalGatedFutureSingleRollTarget(pick, input.economyState),
  );
  const economyAllPicks = allPicks.filter(
    (pick) =>
      !isStageFourPrepDeadSingleRollTarget(pick, tempoContext) &&
      !isLossStreakPreserveFutureSingleRollTarget(pick, tempoContext) &&
      !isSurvivalGatedFutureSingleRollTarget(pick, input.economyState),
  );
  const picks = actionablePicks.slice(0, maxPicks);
  const economyAdvice = buildGoldenSpatulaEconomyAdvice(
    economyActionablePicks.slice(0, maxPicks),
    economyAllPicks,
    input.economyState,
    tempoContext,
    input.handState,
    scoringVariant,
  );
  const formationPriorityNames = new Set(
    (economyAdvice.breakdown.formationBalance?.priorityTargetNames ?? []).map(
      normalizeDecisionText,
    ),
  );
  const formationDeprioritizedNames = new Set(
    (economyAdvice.breakdown.formationBalance?.deprioritizedTargetNames ?? []).map(
      normalizeDecisionText,
    ),
  );
  const formationBalanceKind = economyAdvice.breakdown.formationBalance?.kind;
  const stopLossBlockedRollTargetNames = getStopLossBlockedRollTargetNames(
    economyAdvice.breakdown.stopLoss,
  );
  const levelFollowUpRollTargetNames = getLevelFollowUpRollTargetNames({
    economyAdvice,
    allPicks,
  });
  const transitionLineups = rankGoldenSpatulaTransitionLineups({
    sources,
    activeVariant,
    handState: input.handState,
    economyState: input.economyState,
    knowledgeState: input.knowledgeState,
    championAssets: input.championAssets,
    observedItems,
    costDensity,
    tempoContext,
    stopLossAdvice: economyAdvice.breakdown.stopLoss,
    maxTransitions,
  });
  const lateralTransitionRollTargetNames =
    getLateralTransitionRollTargetNames(transitionLineups, economyAdvice.breakdown.stopLoss);
  const recommendedRollTargetCandidates = collectRecommendedRollTargetCandidates({
    actionableRollPicks: targetActionableRollPicks,
    allPicks,
    levelFollowUpRollTargetNames,
    lateralTransitionRollTargetNames,
  });
  const nearUpgradeFocusedRollTargetNames = getNearUpgradeFocusedRollTargetNames({
    economyAdvice,
    targetCandidates: recommendedRollTargetCandidates,
    economyState: input.economyState,
    formationPriorityNames,
    tempoContext,
  });
  const hasUnstablePriorityBeforeSidecarRollTarget = targetActionableRollPicks.some(
    (pick) =>
      pick.rollTargetPriority > 0 &&
      !stopLossBlockedRollTargetNames.has(normalizeDecisionText(pick.name)) &&
      !isLowEconomyWeakSingleRollTarget(pick, input.economyState) &&
      isUnstablePriorityBeforeSidecarRollTarget(pick),
  );
  const recommendedRollTargetNames = recommendedRollTargetCandidates
    .filter(
      (pick) =>
        pick.rollTargetPriority > 0 ||
        isVisibleActionableBuyTarget(pick) ||
        levelFollowUpRollTargetNames.has(normalizeDecisionText(pick.name)) ||
        lateralTransitionRollTargetNames.has(normalizeDecisionText(pick.name)),
    )
    .filter((pick) => !stopLossBlockedRollTargetNames.has(normalizeDecisionText(pick.name)))
    .filter((pick) => !isStopLossSideUnitRollTarget(pick, economyAdvice.breakdown.stopLoss))
    .filter(
      (pick) =>
        !isOneCostAbandonStableCoreRollTarget(pick, economyAdvice.breakdown.stopLoss),
    )
    .filter(
      (pick) =>
        nearUpgradeFocusedRollTargetNames.size === 0 ||
        nearUpgradeFocusedRollTargetNames.has(normalizeDecisionText(pick.name)),
    )
    .filter((pick) => !isLowEconomyWeakSingleRollTarget(pick, input.economyState))
    .filter((pick) => !isSurvivalGatedFutureSingleRollTarget(pick, input.economyState))
    .filter((pick) => !isLossStreakPreserveFutureSingleRollTarget(pick, tempoContext))
    .filter(
      (pick) =>
        lateralTransitionRollTargetNames.has(normalizeDecisionText(pick.name)) ||
        !isStageFourPrepDeadSingleRollTarget(pick, tempoContext),
    )
    .filter((pick) => !isHeavilyContestedRerollChaseTarget(pick))
    .filter(
      (pick) =>
        !isModeratelyContestedRerollChaseTarget({
          pick,
          lateralTransitionRollTargetNames,
        }),
    )
    .filter((pick) => !isNonBridgePairBaitRollTarget(pick, tempoContext))
    .filter((pick) => !isRareWindowGatedRollTarget(pick, levelFollowUpRollTargetNames))
    .filter(
      (pick) =>
        !isFullResetGatedByLateralTransitionTarget(
          pick,
          lateralTransitionRollTargetNames,
          levelFollowUpRollTargetNames,
        ),
    )
    .filter(
      (pick) =>
        levelFollowUpRollTargetNames.has(normalizeDecisionText(pick.name)) ||
        !isInterestLineGatedRollTarget(pick, input.economyState),
    )
    .filter((pick) => !isEconomyGatedStablePrimaryCoreRollTarget(pick, input.economyState))
    .filter((pick) => !isEconomyGatedStableAuxiliaryRollTarget(pick, input.economyState))
    .filter(
      (pick) =>
        isStopLossStabilizeKeyFunctionRollTarget(pick, economyAdvice.breakdown.stopLoss) ||
        isPreStageCoreTraitPairRollTarget(pick, tempoContext) ||
        isLowEconomyStrongDenyTransitionRollTarget(pick, input.economyState) ||
        !isEconomyGatedSidecarRollTarget({
          pick,
          economyState: input.economyState,
          hasUnstablePriorityBeforeSidecarRollTarget,
        }),
    )
    .filter(
      (pick) =>
        formationPriorityNames.size === 0 ||
        formationPriorityNames.has(normalizeDecisionText(pick.name)) ||
        isStopLossStabilizeCoreRollTarget(pick, economyAdvice.breakdown.stopLoss) ||
        isStopLossStabilizeKeyFunctionRollTarget(pick, economyAdvice.breakdown.stopLoss) ||
        isPreStageCoreTraitPairRollTarget(pick, tempoContext) ||
        lateralTransitionRollTargetNames.has(normalizeDecisionText(pick.name)) ||
        (formationBalanceKind === 'carryBeforeFrontline' &&
          isPriorityBeforeSidecarRollTarget(pick) &&
          canFormPairFromVisibleShop(pick)),
    )
    .sort((a, b) => {
      const levelFollowUpDiff =
        Number(levelFollowUpRollTargetNames.has(normalizeDecisionText(b.name))) -
        Number(levelFollowUpRollTargetNames.has(normalizeDecisionText(a.name)));
      if (levelFollowUpDiff !== 0) return levelFollowUpDiff;
      const rankDiff =
        getFormationTargetRank(a.name, formationPriorityNames, formationDeprioritizedNames) -
        getFormationTargetRank(b.name, formationPriorityNames, formationDeprioritizedNames);
      return rankDiff || compareGoldenSpatulaActionablePicks(a, b);
    })
    .slice(0, Math.max(3, Math.min(maxPicks, 8)))
    .map((pick) => pick.name);

  return {
    generatedAt: Date.now(),
    evaluatedCandidates: candidates.size,
    evaluatedLineups: sources.length,
    picks,
    recommendedRollTargetNames,
    transitionLineups,
    economyAdvice,
  };
}
