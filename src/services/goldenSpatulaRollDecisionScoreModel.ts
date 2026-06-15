import type {
  GoldenSpatulaEconomyRunState,
  GoldenSpatulaPickRecommendation,
  GoldenSpatulaRollDecisionBand,
  GoldenSpatulaRollDecisionFactor,
  GoldenSpatulaRollDecisionFactorScore,
  GoldenSpatulaRollDecisionScoreBreakdown,
} from '@/types/goldenSpatula';
import { clampGoldenSpatulaDecisionValue } from './goldenSpatulaAcquisitionModel';
import type { GoldenSpatulaTempoContext } from './goldenSpatulaTempoModel';

function buildFactor(score: number, available = true): GoldenSpatulaRollDecisionFactorScore {
  return {
    score: clampGoldenSpatulaDecisionValue(Math.round(score), 0, 2),
    available,
  };
}

function getRollDecisionBand(total: number): GoldenSpatulaRollDecisionBand {
  if (total >= 8) return 'rollToQuality';
  if (total >= 5) return 'smallRoll';
  return 'none';
}

function scoreCombatGap(
  picks: GoldenSpatulaPickRecommendation[],
  tempoContext: GoldenSpatulaTempoContext,
): GoldenSpatulaRollDecisionFactorScore {
  const topScore = picks[0]?.score ?? 0;
  const urgentCount = picks.filter((pick) => pick.tier === 'core' || pick.tier === 'high').length;
  if (tempoContext.streakPressure === 'push' && urgentCount > 0) return buildFactor(2);
  if (topScore >= 82 || urgentCount >= 2) return buildFactor(2);
  if (topScore >= 62 || urgentCount >= 1 || tempoContext.streakPressure !== 'neutral') {
    return buildFactor(1);
  }
  return buildFactor(0);
}

function scoreTargetClarity(picks: GoldenSpatulaPickRecommendation[]): GoldenSpatulaRollDecisionFactorScore {
  const top = picks[0];
  if (!top) return buildFactor(0);
  if (
    top.tier === 'core' ||
    top.reasons.includes('activeCarry') ||
    top.reasons.includes('activeFrontline') ||
    top.reasons.includes('recommendedCarry') ||
    top.reasons.includes('itemFit')
  ) {
    return buildFactor(2);
  }
  return buildFactor(1);
}

function scorePairsAndOuts(picks: GoldenSpatulaPickRecommendation[]): GoldenSpatulaRollDecisionFactorScore {
  const nearUpgradeCount = picks.filter((pick) => pick.reasons.includes('nearUpgrade')).length;
  const visibleCount = picks.filter((pick) => (pick.shopVisibleCount ?? 0) > 0).length;
  const ownedCount = picks.filter((pick) => pick.ownedCount > 0).length;
  if (nearUpgradeCount >= 2 || (nearUpgradeCount >= 1 && visibleCount >= 1)) return buildFactor(2);
  if (nearUpgradeCount >= 1 || visibleCount >= 1 || ownedCount >= 2) return buildFactor(1);
  return buildFactor(0);
}

function scoreEconomyMargin(economyState: GoldenSpatulaEconomyRunState | undefined): GoldenSpatulaRollDecisionFactorScore {
  const gold = economyState?.gold;
  if (gold === undefined || !Number.isFinite(gold)) return buildFactor(1, false);
  const afterSmallRoll = gold - 6;
  if (afterSmallRoll >= 30) return buildFactor(2);
  if (afterSmallRoll >= 20) return buildFactor(1);
  return buildFactor(0);
}

function getStopLineTargetNames(picks: GoldenSpatulaPickRecommendation[]): string[] {
  return picks
    .filter(
      (pick) =>
        pick.reasons.includes('nearUpgrade') ||
        (pick.shopVisibleCount ?? 0) > 0 ||
        pick.role === 'carry' ||
        pick.role === 'frontline',
    )
    .slice(0, 3)
    .map((pick) => pick.name);
}

export interface GoldenSpatulaRollDecisionScoreInput {
  actionablePicks: GoldenSpatulaPickRecommendation[];
  economyState?: GoldenSpatulaEconomyRunState;
  tempoContext: GoldenSpatulaTempoContext;
}

export function buildGoldenSpatulaRollDecisionScore({
  actionablePicks,
  economyState,
  tempoContext,
}: GoldenSpatulaRollDecisionScoreInput): GoldenSpatulaRollDecisionScoreBreakdown {
  const factors: Record<
    GoldenSpatulaRollDecisionFactor,
    GoldenSpatulaRollDecisionFactorScore
  > = {
    healthPressure: buildFactor(0, false),
    combatGap: scoreCombatGap(actionablePicks, tempoContext),
    targetClarity: scoreTargetClarity(actionablePicks),
    pairsAndOuts: scorePairsAndOuts(actionablePicks),
    economyMargin: scoreEconomyMargin(economyState),
  };
  const total = Object.values(factors).reduce((sum, factor) => sum + factor.score, 0);
  const unknownFactors = Object.entries(factors)
    .filter(([, factor]) => !factor.available)
    .map(([factor]) => factor as GoldenSpatulaRollDecisionFactor);

  return {
    total,
    band: getRollDecisionBand(total),
    factors,
    topTargetName: actionablePicks[0]?.name,
    stopLineTargetNames: getStopLineTargetNames(actionablePicks),
    unknownFactors,
  };
}
