import type {
  GoldenSpatulaChampionAssetIndex,
  GoldenSpatulaContestChampionState,
  GoldenSpatulaContestState,
  GoldenSpatulaEconomyRunState,
  GoldenSpatulaHandRunState,
  GoldenSpatulaKnowledgeScanState,
  GoldenSpatulaPickRecommendation,
} from '@/types/goldenSpatula';
import {
  estimateGoldenSpatulaAcquisition,
  getGoldenSpatulaPoolCopiesForCost,
  type GoldenSpatulaChampionCostDensityProfile,
} from './goldenSpatulaAcquisitionModel';
import {
  getGoldenSpatulaChampionAssetCost,
  getGoldenSpatulaObservedShopOdds,
  getGoldenSpatulaObservedShopOddsSource,
  getGoldenSpatulaOwnedState,
  getGoldenSpatulaShopOdds,
  getGoldenSpatulaShopOddsAvailability,
  getGoldenSpatulaShopOddsSource,
  getGoldenSpatulaShopVisibleCount,
  normalizeDecisionText,
} from './goldenSpatulaDecisionContext';
import { sortGoldenSpatulaDecisionReasons } from './goldenSpatulaDecisionReasonModel';
import {
  decideGoldenSpatulaCandidateRole,
  type GoldenSpatulaCandidateAccumulator,
} from './goldenSpatulaCandidateModel';
import {
  getGoldenSpatulaRecommendedItemFitSignal,
  type GoldenSpatulaObservedItemSignal,
} from './goldenSpatulaObservationModel';
import {
  getGoldenSpatulaDecisionTier,
  getGoldenSpatulaPickScoreBreakdown,
  getGoldenSpatulaRollTargetPriority,
} from './goldenSpatulaPickDecisionModel';
import { getGoldenSpatulaNextLevelShopOddsGain } from './goldenSpatulaShopOdds';
import { getGoldenSpatulaTargetCount } from './goldenSpatulaTargetModel';
import {
  getGoldenSpatulaTempoPickAdjustment,
  type GoldenSpatulaTempoContext,
} from './goldenSpatulaTempoModel';

export interface GoldenSpatulaPickRecommendationBuildInput {
  candidate: GoldenSpatulaCandidateAccumulator;
  activeTargets: Set<string>;
  explicitTargets: Set<string>;
  championAssets?: GoldenSpatulaChampionAssetIndex;
  handState?: GoldenSpatulaHandRunState;
  economyState?: GoldenSpatulaEconomyRunState;
  knowledgeState?: GoldenSpatulaKnowledgeScanState;
  contestState?: GoldenSpatulaContestState;
  currentLevel?: number;
  observedItems: Map<string, GoldenSpatulaObservedItemSignal>;
  costDensity: GoldenSpatulaChampionCostDensityProfile;
  tempoContext: GoldenSpatulaTempoContext;
}

function getItemFitSignal(
  candidate: GoldenSpatulaCandidateAccumulator,
  observedItems: Map<string, GoldenSpatulaObservedItemSignal>,
): { score: number; count: number; names: string[] } {
  return getGoldenSpatulaRecommendedItemFitSignal(candidate.recommendedItemNames, observedItems);
}

function getInterestIncome(gold: number): number {
  return Math.min(Math.floor(Math.max(0, gold) / 10), 5);
}

function getImmediateInterestTax(gold: number | undefined, spend: number): number {
  if (gold === undefined || !Number.isFinite(gold) || spend <= 0) return 0;
  return Math.max(0, getInterestIncome(gold) - getInterestIncome(gold - spend));
}

function isLiquidityProtectedPick({
  role,
  activeTarget,
  nearUpgrade,
  ownedCount,
  itemFitCount,
}: {
  role: ReturnType<typeof decideGoldenSpatulaCandidateRole>;
  activeTarget: boolean;
  nearUpgrade: boolean;
  ownedCount: number;
  itemFitCount: number;
}): boolean {
  return (
    nearUpgrade ||
    ownedCount > 0 ||
    activeTarget ||
    role === 'carry' ||
    role === 'frontline' ||
    role === 'power' ||
    itemFitCount > 0
  );
}

function getInterestTaxAllowance({
  protectedPick,
  nearUpgrade,
  tempoContext,
  economyState,
}: {
  protectedPick: boolean;
  nearUpgrade: boolean;
  tempoContext: GoldenSpatulaTempoContext;
  economyState?: GoldenSpatulaEconomyRunState;
}): number {
  let allowance = nearUpgrade ? 1 : 0;
  if (protectedPick && tempoContext.streakPressure === 'push') {
    allowance += Math.min(4, 1 + tempoContext.streakValue);
  }
  if (protectedPick && economyState?.health !== undefined && economyState.health < 50) {
    allowance += economyState.health < 35 ? 2 : 1;
  }
  return allowance;
}

function getLiquidityTaxPenalty({
  economyState,
  visibleShopSpend,
  shopVisibleCount,
  cost,
  protectedPick,
  activeTarget,
  ownedCount,
  itemFitCount,
  nearUpgrade,
  transitionBridge,
  tempoContext,
}: {
  economyState?: GoldenSpatulaEconomyRunState;
  visibleShopSpend: number;
  shopVisibleCount: number;
  cost?: number;
  protectedPick: boolean;
  activeTarget: boolean;
  ownedCount: number;
  itemFitCount: number;
  nearUpgrade: boolean;
  transitionBridge: boolean;
  tempoContext: GoldenSpatulaTempoContext;
}): number {
  if (visibleShopSpend <= 0) return 0;

  const gold = economyState?.gold;
  const immediateInterestTax = getImmediateInterestTax(gold, visibleShopSpend);
  const allowance = getInterestTaxAllowance({
    protectedPick,
    nearUpgrade,
    tempoContext,
    economyState,
  });
  const uncoveredInterestTax = Math.max(0, immediateInterestTax - allowance);
  let penalty = uncoveredInterestTax * 12;
  const deadSingle =
    !protectedPick &&
    !transitionBridge &&
    shopVisibleCount === 1 &&
    visibleShopSpend === (typeof cost === 'number' ? cost : visibleShopSpend);
  const lowEconomyHoldSignalCount =
    (ownedCount > 0 || nearUpgrade ? 1 : 0) +
    (activeTarget ? 1 : 0) +
    (transitionBridge || itemFitCount > 0 ? 1 : 0);
  const weakLowEconomySingle =
    shopVisibleCount === 1 &&
    visibleShopSpend === (typeof cost === 'number' ? cost : visibleShopSpend) &&
    lowEconomyHoldSignalCount < 2 &&
    !(tempoContext.streakPressure === 'push' && activeTarget);

  if (!protectedPick && gold !== undefined && Number.isFinite(gold)) {
    if (gold < 20) penalty += deadSingle ? 48 : 24;
    else if (gold < 40 && immediateInterestTax > 0) penalty += deadSingle ? 38 : 14;
    else if (deadSingle && tempoContext.tempoPhase !== 'early') penalty += 18;
  }
  if (protectedPick && gold !== undefined && Number.isFinite(gold) && weakLowEconomySingle) {
    if (gold < 20) penalty += 32;
    else if (gold < 40 && immediateInterestTax > 0) penalty += 18;
  }

  return Math.max(0, Math.round(penalty));
}

function getContestChampionState(
  name: string,
  contestState: GoldenSpatulaContestState | undefined,
): GoldenSpatulaContestChampionState | undefined {
  if (!contestState || contestState.active === false) return undefined;
  const normalizedName = normalizeDecisionText(name);
  if (!normalizedName) return undefined;
  const direct = contestState.champions[normalizedName] ?? contestState.champions[name];
  if (direct) return direct;
  return Object.values(contestState.champions).find(
    (candidate) => normalizeDecisionText(candidate.championName) === normalizedName,
  );
}

function normalizeContestCopies(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.trunc(value));
}

function getContestPoolShare(cost: number | undefined, externalCopies: number): number | undefined {
  const poolCopies = getGoldenSpatulaPoolCopiesForCost(cost);
  if (poolCopies === undefined || poolCopies <= 0 || externalCopies <= 0) return undefined;
  return Math.min(1, externalCopies / poolCopies);
}

function getContestPenalty({
  externalCopies,
  contestPoolShare,
  role,
  cost,
  targetCount,
  nearUpgrade,
  economyState,
}: {
  externalCopies: number;
  contestPoolShare: number | undefined;
  role: ReturnType<typeof decideGoldenSpatulaCandidateRole>;
  cost: number | undefined;
  targetCount: number;
  nearUpgrade: boolean;
  economyState?: GoldenSpatulaEconomyRunState;
}): number {
  if (externalCopies <= 0) return 0;
  const share = contestPoolShare ?? 0;
  const base = share >= 0.3 ? 34 : share >= 0.25 ? 26 : share >= 0.18 ? 18 : share >= 0.1 ? 10 : 4;
  const roleMultiplier =
    role === 'carry' || role === 'frontline' ? 1 : role === 'power' ? 0.85 : 0.55;
  const rerollMultiplier = cost !== undefined && cost <= 3 && targetCount >= 6 ? 1.25 : 1;
  const finishTwoStarMultiplier = nearUpgrade && targetCount <= 3 ? 0.55 : 1;
  const survivalMultiplier =
    economyState?.health !== undefined && economyState.health < 35 ? 0.72 : 1;
  return Math.round(
    Math.min(
      48,
      base * roleMultiplier * rerollMultiplier * finishTwoStarMultiplier * survivalMultiplier,
    ),
  );
}

export function buildGoldenSpatulaPickRecommendation({
  candidate,
  activeTargets,
  explicitTargets,
  championAssets,
  handState,
  economyState,
  knowledgeState,
  contestState,
  currentLevel,
  observedItems,
  costDensity,
  tempoContext,
}: GoldenSpatulaPickRecommendationBuildInput): GoldenSpatulaPickRecommendation {
  const cost = getGoldenSpatulaChampionAssetCost(candidate.name, championAssets);
  const observedShopOdds = getGoldenSpatulaObservedShopOdds(economyState, cost);
  const observedShopOddsSource = getGoldenSpatulaObservedShopOddsSource(economyState, cost);
  const shopOdds = getGoldenSpatulaShopOdds(currentLevel, cost, observedShopOdds);
  const shopOddsSource = getGoldenSpatulaShopOddsSource(
    currentLevel,
    observedShopOdds,
    observedShopOddsSource,
  );
  const shopOddsAvailability = getGoldenSpatulaShopOddsAvailability(
    currentLevel,
    cost,
    observedShopOdds,
  );
  const levelUpOdds = getGoldenSpatulaNextLevelShopOddsGain(currentLevel, cost);
  const ownedState = getGoldenSpatulaOwnedState(candidate.name, handState);
  const ownedCount = ownedState?.count ?? 0;
  const shopVisibleCount = getGoldenSpatulaShopVisibleCount(candidate.name, knowledgeState);
  const candidateKey = normalizeDecisionText(candidate.name);
  const activeTarget = activeTargets.has(candidateKey);
  const explicitTarget = explicitTargets.has(candidateKey);
  const role = decideGoldenSpatulaCandidateRole(candidate);
  const targetCount = getGoldenSpatulaTargetCount({
    role,
    cost,
    priorityTarget: activeTarget,
    explicitTarget,
    ownedCount,
    tempoContext,
  });
  const nearUpgrade = ownedCount > 0 && ownedCount < targetCount && ownedCount % 3 === 2;
  const completePenalty = ownedCount >= targetCount ? 26 : 0;
  const ownedBonus = ownedCount > 0 ? Math.min(ownedCount * 4, 18) : 0;
  const nearUpgradeBonus = nearUpgrade ? 24 : 0;
  const visibleCopiesToBuy = Math.min(shopVisibleCount, Math.max(0, targetCount - ownedCount));
  const shopVisibleBonus = visibleCopiesToBuy > 0 ? 48 + visibleCopiesToBuy * 16 : 0;
  const itemFit = getItemFitSignal(candidate, observedItems);
  const itemFitBonus = itemFit.count > 0 ? 18 + itemFit.score : 0;
  const visibleShopSpend = visibleCopiesToBuy * (typeof cost === 'number' ? cost : 1);
  const protectedPick = isLiquidityProtectedPick({
    role,
    activeTarget,
    nearUpgrade,
    ownedCount,
    itemFitCount: itemFit.count,
  });
  const transitionBridge =
    candidate.reasons.has('traitBridge') || candidate.reasons.has('cheapTransition');
  const interestTaxPenalty = getLiquidityTaxPenalty({
    economyState,
    visibleShopSpend,
    shopVisibleCount,
    cost,
    protectedPick,
    activeTarget,
    ownedCount,
    itemFitCount: itemFit.count,
    nearUpgrade,
    transitionBridge,
    tempoContext,
  });
  const contestChampionState = getContestChampionState(candidate.name, contestState);
  const externalContestCopies = normalizeContestCopies(contestChampionState?.externalCopies);
  const contestPoolShare = getContestPoolShare(cost, externalContestCopies);
  const contestPenalty = getContestPenalty({
    externalCopies: externalContestCopies,
    contestPoolShare,
    role,
    cost,
    targetCount,
    nearUpgrade,
    economyState,
  });
  const tempo = getGoldenSpatulaTempoPickAdjustment(tempoContext, {
    cost,
    role,
    activeTarget,
    nearUpgrade,
    ownedCount,
  });

  if (ownedCount > 0) candidate.reasons.add('owned');
  if (nearUpgrade) candidate.reasons.add('nearUpgrade');
  if (shopVisibleCount > 0) candidate.reasons.add('shopVisible');
  if (itemFit.count > 0) candidate.reasons.add('itemFit');
  if (externalContestCopies > 0) candidate.reasons.add('contested');
  for (const reason of tempo.reasons) candidate.reasons.add(reason);
  if (shopOddsAvailability === 'unavailable') candidate.reasons.add('levelLocked');
  if (shopOddsAvailability === 'rare') candidate.reasons.add('levelOdds');

  const copiesNeeded = Math.max(0, targetCount - ownedCount);
  const copiesNeededAfterShop = Math.max(0, copiesNeeded - shopVisibleCount);
  const acquisition = estimateGoldenSpatulaAcquisition({
    shopOdds,
    shopOddsAvailability,
    cost,
    copiesNeeded: copiesNeededAfterShop,
    ownedCount,
    externalCopies: externalContestCopies,
    gold: economyState?.gold,
    costDensity,
  });
  const totalExpectedSpend = acquisition.expectedSpend + visibleShopSpend;
  const scoreBreakdown = getGoldenSpatulaPickScoreBreakdown({
    baseScore: candidate.score,
    ownedBonus,
    nearUpgradeBonus,
    shopVisibleBonus,
    itemFitBonus,
    completePenalty,
    interestTaxPenalty,
    contestPenalty,
    role,
    copiesNeeded,
    cost,
    currentLevel,
    shopOdds,
    shopOddsAvailability,
    acquisition,
    tempo,
  });
  const finalScore = scoreBreakdown.final;
  const reasons = sortGoldenSpatulaDecisionReasons(candidate.reasons).slice(0, 5);
  const rollTargetPriority = getGoldenSpatulaRollTargetPriority({
    score: finalScore,
    role,
    cost,
    ownedCount,
    targetCount,
    copiesNeeded: copiesNeededAfterShop,
    currentLevel,
    shopOdds,
    shopOddsAvailability,
    expectedRollsToFindCopies: acquisition.expectedRollsToFindCopies,
    expectedRollHitRate: acquisition.expectedRollHitRate,
    completionChance: acquisition.completionChance,
    tempoRollPriorityBonus: tempo.rollPriorityBonus,
    activeTarget,
    reasons,
  });

  return {
    name: candidate.name,
    score: finalScore,
    scoreBreakdown,
    tier: getGoldenSpatulaDecisionTier(finalScore),
    role,
    cost,
    ownedCount,
    ownedConfidence: ownedState?.confidence,
    targetCount,
    copiesNeeded,
    rollTargetPriority,
    currentLevel,
    shopOdds,
    shopOddsSource,
    shopOddsAvailability,
    nextLevel: levelUpOdds.nextLevel,
    nextLevelShopOdds: levelUpOdds.nextOdds,
    levelUpShopOddsGain: levelUpOdds.gain,
    levelUpShopOddsRatio: levelUpOdds.ratio,
    shopVisibleCount: shopVisibleCount > 0 ? shopVisibleCount : undefined,
    observedItemMatchCount: itemFit.count > 0 ? itemFit.count : undefined,
    matchedItemNames: itemFit.names.length > 0 ? itemFit.names : undefined,
    acquisitionExpectedRolls: Number.isFinite(acquisition.expectedRollsToFindCopies)
      ? acquisition.expectedRollsToFindCopies
      : undefined,
    acquisitionExpectedSpend: Number.isFinite(totalExpectedSpend) ? totalExpectedSpend : undefined,
    acquisitionCompletionChance: acquisition.completionChance,
    externalContestCopies: externalContestCopies > 0 ? externalContestCopies : undefined,
    contestPoolShare,
    traitTags: Array.from(candidate.traitTags).slice(0, 4),
    sourceLineupNames: Array.from(candidate.sourceLineupNames).slice(0, 3),
    reasons,
  };
}
