import type {
  GoldenSpatulaChampionAssetIndex,
  GoldenSpatulaEconomyRunState,
  GoldenSpatulaHandRunState,
  GoldenSpatulaKnowledgeScanState,
  GoldenSpatulaPickRecommendation,
} from '@/types/goldenSpatula';
import {
  estimateGoldenSpatulaAcquisition,
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

export function buildGoldenSpatulaPickRecommendation({
  candidate,
  activeTargets,
  explicitTargets,
  championAssets,
  handState,
  economyState,
  knowledgeState,
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
    gold: economyState?.gold,
    costDensity,
  });
  const visibleShopSpend = visibleCopiesToBuy * (typeof cost === 'number' ? cost : 1);
  const totalExpectedSpend = acquisition.expectedSpend + visibleShopSpend;
  const scoreBreakdown = getGoldenSpatulaPickScoreBreakdown({
    baseScore: candidate.score,
    ownedBonus,
    nearUpgradeBonus,
    shopVisibleBonus,
    itemFitBonus,
    completePenalty,
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
    shopVisibleCount: shopVisibleCount > 0 ? shopVisibleCount : undefined,
    observedItemMatchCount: itemFit.count > 0 ? itemFit.count : undefined,
    matchedItemNames: itemFit.names.length > 0 ? itemFit.names : undefined,
    acquisitionExpectedRolls: Number.isFinite(acquisition.expectedRollsToFindCopies)
      ? acquisition.expectedRollsToFindCopies
      : undefined,
    acquisitionExpectedSpend: Number.isFinite(totalExpectedSpend) ? totalExpectedSpend : undefined,
    acquisitionCompletionChance: acquisition.completionChance,
    traitTags: Array.from(candidate.traitTags).slice(0, 4),
    sourceLineupNames: Array.from(candidate.sourceLineupNames).slice(0, 3),
    reasons,
  };
}
