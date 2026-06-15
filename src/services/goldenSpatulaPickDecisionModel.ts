import type {
  GoldenSpatulaDecisionReason,
  GoldenSpatulaDecisionRole,
  GoldenSpatulaDecisionTier,
  GoldenSpatulaPickRecommendation,
  GoldenSpatulaPickScoreBreakdown,
  GoldenSpatulaShopOddsAvailability,
} from '@/types/goldenSpatula';
import {
  clampGoldenSpatulaDecisionValue,
  getGoldenSpatulaCopiesUrgencyMultiplier,
  type GoldenSpatulaAcquisitionEstimate,
} from './goldenSpatulaAcquisitionModel';
import type { GoldenSpatulaTempoPickAdjustment } from './goldenSpatulaTempoModel';

const rolePriorityMultiplier: Record<GoldenSpatulaDecisionRole, number> = {
  carry: 1.22,
  frontline: 1.12,
  power: 1.06,
  trait: 1,
  transition: 0.94,
};

export interface GoldenSpatulaPickScoreInput {
  baseScore: number;
  ownedBonus: number;
  nearUpgradeBonus: number;
  shopVisibleBonus: number;
  itemFitBonus: number;
  completePenalty: number;
  role: GoldenSpatulaDecisionRole;
  copiesNeeded: number;
  cost?: number;
  currentLevel?: number;
  shopOdds?: number;
  shopOddsAvailability: GoldenSpatulaShopOddsAvailability;
  acquisition: GoldenSpatulaAcquisitionEstimate;
  tempo: GoldenSpatulaTempoPickAdjustment;
}

export interface GoldenSpatulaRollTargetPriorityInput {
  score: number;
  role: GoldenSpatulaDecisionRole;
  cost?: number;
  ownedCount: number;
  targetCount: number;
  copiesNeeded: number;
  currentLevel?: number;
  shopOdds?: number;
  shopOddsAvailability: GoldenSpatulaShopOddsAvailability;
  expectedRollsToFindCopies: number;
  expectedRollHitRate: number;
  completionChance: number | undefined;
  tempoRollPriorityBonus: number;
  activeTarget: boolean;
  reasons: GoldenSpatulaDecisionReason[];
}

export function getGoldenSpatulaDecisionTier(score: number): GoldenSpatulaDecisionTier {
  if (score >= 82) return 'core';
  if (score >= 62) return 'high';
  if (score >= 42) return 'medium';
  return 'watch';
}

export function compareGoldenSpatulaActionablePicks(
  a: GoldenSpatulaPickRecommendation,
  b: GoldenSpatulaPickRecommendation,
): number {
  const aCompletion = a.acquisitionCompletionChance ?? 0.55;
  const bCompletion = b.acquisitionCompletionChance ?? 0.55;
  const aRolls = a.acquisitionExpectedRolls ?? Number.POSITIVE_INFINITY;
  const bRolls = b.acquisitionExpectedRolls ?? Number.POSITIVE_INFINITY;
  return (
    b.rollTargetPriority - a.rollTargetPriority ||
    b.score - a.score ||
    bCompletion - aCompletion ||
    (aRolls !== bRolls ? aRolls - bRolls : 0) ||
    a.copiesNeeded - b.copiesNeeded
  );
}

export function isGoldenSpatulaActionableRollPick(
  pick: GoldenSpatulaPickRecommendation,
): boolean {
  if (pick.shopOddsAvailability === 'unavailable') return false;
  if (pick.shopOdds !== undefined && pick.shopOdds <= 0) return false;
  if (pick.copiesNeeded <= 0) return false;
  return pick.score > 0 || pick.rollTargetPriority > 0;
}

export function isGoldenSpatulaActionablePick(
  pick: GoldenSpatulaPickRecommendation,
): boolean {
  if (pick.copiesNeeded <= 0) return false;
  if ((pick.shopVisibleCount ?? 0) > 0) return pick.score > 0;
  return isGoldenSpatulaActionableRollPick(pick);
}

export function getGoldenSpatulaShopOddsScoreMultiplier(
  availability: GoldenSpatulaShopOddsAvailability,
  odds: number | undefined,
): number {
  if (availability === 'unknown') return 1;
  if (availability === 'unavailable') return 0;
  if (availability === 'rare') return 0.55;
  if (odds === undefined) return 1;
  return Math.min(1.18, 0.72 + odds);
}

export function getGoldenSpatulaPickFinalScore(input: GoldenSpatulaPickScoreInput): number {
  return getGoldenSpatulaPickScoreBreakdown(input).final;
}

export function getGoldenSpatulaPickScoreBreakdown(
  input: GoldenSpatulaPickScoreInput,
): GoldenSpatulaPickScoreBreakdown {
  const copiesUrgencyMultiplier = getGoldenSpatulaCopiesUrgencyMultiplier(input.copiesNeeded);
  const roleWeight = rolePriorityMultiplier[input.role];
  const oddsMultiplier =
    input.shopVisibleBonus > 0 && input.shopOddsAvailability === 'unavailable'
      ? 1
      : getGoldenSpatulaShopOddsScoreMultiplier(input.shopOddsAvailability, input.shopOdds);
  const levelPenalty =
    input.cost !== undefined && input.cost >= 4 && input.currentLevel !== undefined && input.currentLevel < 8
      ? 0.9
      : 1;
  const beforeMultipliers =
    input.baseScore +
    input.ownedBonus +
    input.nearUpgradeBonus +
    input.shopVisibleBonus +
    input.itemFitBonus -
    input.completePenalty;
  const expectedHitRateMultiplier = 0.78 + input.acquisition.expectedRollHitRate * 0.38;
  const final = Math.max(
    0,
    Math.round(
      beforeMultipliers *
        oddsMultiplier *
        roleWeight *
        copiesUrgencyMultiplier *
        input.acquisition.acquisitionEfficiencyMultiplier *
        input.acquisition.acquisitionFeasibilityMultiplier *
        input.acquisition.goldPressureMultiplier *
        input.acquisition.completionChanceMultiplier *
        expectedHitRateMultiplier *
        input.tempo.scoreMultiplier *
        levelPenalty,
    ),
  );

  return {
    base: input.baseScore,
    bonuses: {
      owned: input.ownedBonus,
      nearUpgrade: input.nearUpgradeBonus,
      shopVisible: input.shopVisibleBonus,
      itemFit: input.itemFitBonus,
    },
    penalty: input.completePenalty,
    beforeMultipliers,
    multipliers: {
      role: roleWeight,
      shopOdds: oddsMultiplier,
      copiesUrgency: copiesUrgencyMultiplier,
      acquisitionEfficiency: input.acquisition.acquisitionEfficiencyMultiplier,
      acquisitionFeasibility: input.acquisition.acquisitionFeasibilityMultiplier,
      goldPressure: input.acquisition.goldPressureMultiplier,
      completionChance: input.acquisition.completionChanceMultiplier,
      expectedHitRate: expectedHitRateMultiplier,
      tempo: input.tempo.scoreMultiplier,
      level: levelPenalty,
    },
    final,
  };
}

export function getGoldenSpatulaRollTargetPriority({
  score,
  role,
  cost,
  ownedCount,
  targetCount,
  copiesNeeded,
  currentLevel,
  shopOdds,
  shopOddsAvailability,
  expectedRollsToFindCopies,
  expectedRollHitRate,
  completionChance,
  tempoRollPriorityBonus,
  activeTarget,
  reasons,
}: GoldenSpatulaRollTargetPriorityInput): number {
  if (copiesNeeded <= 0 || ownedCount >= targetCount) return 0;
  if (shopOddsAvailability === 'unavailable') return 0;
  if (shopOdds !== undefined && shopOdds <= 0) return 0;

  const reasonSet = new Set(reasons);
  let priority = Math.round(score * 0.62);

  if (role === 'carry') priority += 38;
  if (role === 'frontline') priority += 24;
  if (role === 'power') priority += 14;
  priority += tempoRollPriorityBonus;
  if (activeTarget) priority += 18;
  if (reasonSet.has('nearUpgrade')) priority += 36;
  if (reasonSet.has('itemFit')) priority += 20;
  if (reasonSet.has('activeCarry')) priority += 24;
  if (reasonSet.has('activeFrontline')) priority += 14;
  if (reasonSet.has('recommendedCarry')) priority += 18;
  if (reasonSet.has('traitBridge')) priority += 8;
  if (ownedCount > 0) priority += Math.min(ownedCount * 4, 18);
  if (copiesNeeded <= 1) priority += 24;
  else if (copiesNeeded <= 2) priority += 16;
  else if (copiesNeeded <= 3) priority += 8;
  if (shopOdds !== undefined) priority += Math.round(shopOdds * 30);
  priority += Math.round(expectedRollHitRate * 40);
  if (completionChance !== undefined) {
    priority += Math.max(0, Math.round(completionChance * 28));
  } else {
    priority += 10;
  }
  if (shopOddsAvailability === 'rare') priority -= 24;
  if (Number.isFinite(expectedRollsToFindCopies)) {
    priority += Math.max(
      0,
      Math.round((1 - clampGoldenSpatulaDecisionValue(expectedRollsToFindCopies / 28, 0, 1)) * 28),
    );
  }
  if (cost !== undefined && cost >= 4 && currentLevel !== undefined && currentLevel < 8) {
    priority -= 10;
  }

  return Math.max(0, Math.round(priority));
}
