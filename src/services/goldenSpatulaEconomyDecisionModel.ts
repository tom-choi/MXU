import type {
  GoldenSpatulaDecisionReason,
  GoldenSpatulaEconomyDecisionAction,
  GoldenSpatulaEconomyDecisionAdvice,
  GoldenSpatulaEconomyRunState,
  GoldenSpatulaHandRunState,
  GoldenSpatulaPickRecommendation,
} from '@/types/goldenSpatula';
import { getGoldenSpatulaProjectedRollBudget } from './goldenSpatulaAcquisitionModel';
import { buildGoldenSpatulaBenchInterestAdvice } from './goldenSpatulaBenchDecisionModel';
import { sortGoldenSpatulaDecisionReasons } from './goldenSpatulaDecisionReasonModel';
import { buildGoldenSpatulaRollDecisionScore } from './goldenSpatulaRollDecisionScoreModel';
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
    (b.levelUpShopOddsGain ?? 0) - (a.levelUpShopOddsGain ?? 0) ||
    b.score - a.score ||
    (b.nextLevelShopOdds ?? 0) - (a.nextLevelShopOdds ?? 0) ||
    (b.cost ?? 0) - (a.cost ?? 0)
  );
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

export function buildGoldenSpatulaEconomyAdvice(
  actionablePicks: GoldenSpatulaPickRecommendation[],
  allPicks: GoldenSpatulaPickRecommendation[],
  economyState: GoldenSpatulaEconomyRunState | undefined,
  tempoContext: GoldenSpatulaTempoContext,
  handState?: GoldenSpatulaHandRunState,
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
  const interestGoldNeeded = findMissingInterestGold(gold);
  const benchInterestAdvice = buildGoldenSpatulaBenchInterestAdvice({
    handState,
    allPicks,
    interestGoldNeeded,
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
  const levelUpCost = estimateLevelUpCost(economyState);
  const levelUpPick = allPicks.filter(isLevelUpValuePick).sort(compareLevelUpValuePicks)[0];
  const levelUpOddsGain = levelUpPick?.levelUpShopOddsGain ?? 0;
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
  const hasMeaningfulLevelUpValue =
    levelUpPick !== undefined &&
    level !== undefined &&
    level < 11 &&
    levelUpInvestmentAffordable &&
    (levelUpUnlocksTarget ||
      levelUpOddsGain >= getLevelUpOddsGainThreshold(levelUpPick, tempoContext));
  const hasPushStreak = tempoContext.streakPressure === 'push';
  const hasPreserveStreak = tempoContext.streakPressure === 'preserve';
  const isEarlyTempo = tempoContext.tempoPhase === 'early';
  const isLateTempo = tempoContext.tempoPhase === 'late';
  const topEconomyPick = urgentPicks[0] ?? tempoPriorityPicks[0];
  const projectedRollBudget = getGoldenSpatulaProjectedRollBudget(gold);
  const rollDecisionScore = buildGoldenSpatulaRollDecisionScore({
    actionablePicks,
    economyState,
    tempoContext,
  });
  const roundPolicy = buildGoldenSpatulaRoundPolicy({
    actionablePicks,
    allPicks,
    economyState,
    tempoContext,
    rollDecisionScore,
    hasNearUpgrade,
    highCostPlan,
  });
  const hasCriticalLockedNeed = levelLockedPicks.some(
    (pick) => pick.tier === 'core' || pick.tier === 'high' || pick.reasons.includes('nearUpgrade'),
  );
  const reasons = new Set<GoldenSpatulaDecisionReason>();
  for (const pick of [...urgentPicks, ...tempoPriorityPicks, ...levelLockedPicks]) {
    for (const reason of pick.reasons) reasons.add(reason);
  }
  if (hasPushStreak || hasPreserveStreak) reasons.add('streakPressure');

  let action: GoldenSpatulaEconomyDecisionAction = 'hold';
  let confidence: GoldenSpatulaEconomyDecisionAdvice['confidence'] =
    urgentPicks.length > 0 ? 'medium' : 'low';
  let recommendedRollCount = 0;

  if (hasMeaningfulLevelUpValue && !hasNearUpgrade) {
    action = 'level';
    confidence = levelUpUnlocksTarget || levelUpOddsGain >= 0.1 ? 'high' : 'medium';
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
  } else if (hasPushStreak && tempoPriorityPicks.length > 0 && (gold === undefined || gold >= 24)) {
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
  } else if (urgentPicks.length >= 2 && (gold === undefined || gold >= 30)) {
    action = 'roll';
    confidence = 'medium';
    recommendedRollCount = gold !== undefined && gold >= 50 ? 5 : 2;
  } else if (isLateTempo && urgentPicks.length > 0 && (gold === undefined || gold >= 20)) {
    action = 'roll';
    confidence = 'medium';
    recommendedRollCount = gold !== undefined && gold >= 40 ? 3 : 2;
  } else if (
    rollDecisionScore.band === 'rollToQuality' &&
    tempoPriorityPicks.length > 0 &&
    (gold === undefined || gold >= 24)
  ) {
    action = 'roll';
    confidence = 'medium';
    recommendedRollCount = gold !== undefined && gold >= 40 ? 4 : 3;
  } else if (
    rollDecisionScore.band === 'smallRoll' &&
    tempoPriorityPicks.length > 0 &&
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

  if (roundPolicy?.action === 'roll' && (action === 'hold' || action === 'save')) {
    action = 'roll';
    confidence = roundPolicy.confidence;
    recommendedRollCount = Math.max(recommendedRollCount, roundPolicy.recommendedRollCount ?? 2);
  } else if (
    roundPolicy?.action === 'level' &&
    action !== 'roll' &&
    tempoContext.streakPressure !== 'preserve'
  ) {
    action = 'level';
    confidence = roundPolicy.confidence;
    recommendedRollCount = 0;
  } else if (roundPolicy?.action === 'save' && action === 'hold') {
    action = 'save';
    confidence = roundPolicy.confidence;
    recommendedRollCount = 0;
  }

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
      levelUpTargetName: levelUpPick?.name,
      levelUpLevel: levelUpPick?.nextLevel,
      levelUpXpNeeded: levelUpCost?.xpNeeded,
      levelUpGoldNeeded: levelUpCost?.goldNeeded,
      levelUpShopOddsGain: levelUpPick?.levelUpShopOddsGain,
      levelUpNextShopOdds: levelUpPick?.nextLevelShopOdds,
      rollDecisionScore,
      roundPolicy,
      tempoPhase: tempoContext.tempoPhase,
      streakPressure: tempoContext.streakPressure,
      projectedRollBudget,
    },
    benchInterestAdvice,
    gold,
    level,
    interestGoldNeeded,
    urgentPickNames: (urgentPicks.length > 0 ? urgentPicks : tempoPriorityPicks).map(
      (pick) => pick.name,
    ),
    reasons: sortGoldenSpatulaDecisionReasons(reasons).slice(0, 4),
  };
}
