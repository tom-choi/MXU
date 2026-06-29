import type {
  GoldenSpatulaChampionAssetIndex,
  GoldenSpatulaShopOddsAvailability,
} from '@/types/goldenSpatula';

export const GOLDEN_SPATULA_UNKNOWN_SHOP_ODDS_FALLBACK = 0.06;
export const GOLDEN_SPATULA_ROLL_SLOT_COUNT = 5;
export const GOLDEN_SPATULA_ROLL_REFRESH_COST = 2;
export const GOLDEN_SPATULA_GOLD_KEEP_BUFFER = 10;
export const GOLDEN_SPATULA_POOL_COPIES_BY_COST: Record<number, number> = {
  1: 29,
  2: 22,
  3: 18,
  4: 10,
  5: 9,
};

const COST_DENSITY_MIN_FALLBACK = 1;

export interface GoldenSpatulaChampionCostDensityProfile {
  byCost: Record<number, number>;
  fallbackDensity: number;
}

export interface GoldenSpatulaAcquisitionEstimate {
  targetSlotOdds: number;
  expectedCopiesPerRoll: number;
  expectedRollsToFindCopies: number;
  expectedRollHitRate: number;
  expectedSpend: number;
  completionChance?: number;
  acquisitionEfficiencyMultiplier: number;
  acquisitionFeasibilityMultiplier: number;
  goldPressureMultiplier: number;
  completionChanceMultiplier: number;
}

export interface GoldenSpatulaAcquisitionEstimateInput {
  shopOdds?: number;
  shopOddsAvailability: GoldenSpatulaShopOddsAvailability;
  cost?: number;
  copiesNeeded: number;
  ownedCount?: number;
  externalCopies?: number;
  gold?: number;
  costDensity: GoldenSpatulaChampionCostDensityProfile;
}

export function clampGoldenSpatulaDecisionValue(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function normalizeGoldenSpatulaOdds(value: number | undefined): number | undefined {
  if (value === undefined || !Number.isFinite(value)) return undefined;
  if (value < 0) return 0;
  if (value <= 1) return value;
  return clampGoldenSpatulaDecisionValue(value / 100, 0, 1);
}

export function getGoldenSpatulaPoolCopiesForCost(cost: number | undefined): number | undefined {
  if (cost === undefined || !Number.isFinite(cost)) return undefined;
  return GOLDEN_SPATULA_POOL_COPIES_BY_COST[Math.trunc(cost)];
}

export function buildGoldenSpatulaChampionCostDensity(
  championAssets: GoldenSpatulaChampionAssetIndex | undefined,
): GoldenSpatulaChampionCostDensityProfile {
  const byCost: Record<number, number> = {};
  let total = 0;
  let knownBucketCount = 0;

  if (!championAssets) {
    return {
      byCost: {},
      fallbackDensity: COST_DENSITY_MIN_FALLBACK,
    };
  }

  for (const asset of Object.values(championAssets)) {
    if (asset?.cost === undefined) continue;
    const cost = Math.trunc(asset.cost);
    if (!Number.isFinite(cost) || cost < 1 || cost > 5) continue;
    const before = byCost[cost] ?? 0;
    byCost[cost] = before + 1;
    total += 1;
    if (before === 0) knownBucketCount += 1;
  }

  return {
    byCost,
    fallbackDensity: Math.max(
      COST_DENSITY_MIN_FALLBACK,
      Math.round(total / Math.max(1, knownBucketCount)),
    ),
  };
}

export function getGoldenSpatulaProjectedRollBudget(gold: number | undefined): number | undefined {
  if (gold === undefined || !Number.isFinite(gold)) return undefined;
  const effectiveGold = Math.max(0, gold - GOLDEN_SPATULA_GOLD_KEEP_BUFFER);
  return Math.floor(effectiveGold / GOLDEN_SPATULA_ROLL_REFRESH_COST);
}

function getChampionCostDensityFallback(
  profile: GoldenSpatulaChampionCostDensityProfile,
  cost: number | undefined,
): number {
  if (cost === undefined) return COST_DENSITY_MIN_FALLBACK;

  const normalizedCost = Math.trunc(cost);
  const exact = profile.byCost[normalizedCost];
  if (exact !== undefined && exact > 0) return exact;

  const neighbors: number[] = [];
  for (const offset of [1, -1, 2, -2, 3, -3]) {
    const candidate = profile.byCost[normalizedCost + offset];
    if (candidate !== undefined && candidate > 0) neighbors.push(candidate);
  }

  if (neighbors.length > 0) {
    return Math.max(
      COST_DENSITY_MIN_FALLBACK,
      Math.round(neighbors.reduce((sum, candidate) => sum + candidate, 0) / neighbors.length),
    );
  }

  return Math.max(COST_DENSITY_MIN_FALLBACK, profile.fallbackDensity);
}

function getTargetSlotOdds(
  shopOdds: number | undefined,
  availability: GoldenSpatulaShopOddsAvailability,
  cost: number | undefined,
  ownedCount: number | undefined,
  externalCopies: number | undefined,
  costDensity: GoldenSpatulaChampionCostDensityProfile,
): number {
  if (availability === 'unavailable' || cost === undefined) return 0;
  const sourceOdds =
    availability === 'unknown' ? GOLDEN_SPATULA_UNKNOWN_SHOP_ODDS_FALLBACK : shopOdds;
  if (sourceOdds === undefined || sourceOdds <= 0) return 0;
  const championChoices = getChampionCostDensityFallback(costDensity, cost);
  if (championChoices <= 0) return 0;

  const normalizedCost = Math.trunc(cost);
  const copiesPerChampion = getGoldenSpatulaPoolCopiesForCost(normalizedCost);
  const normalizedOwnedCount =
    ownedCount !== undefined && Number.isFinite(ownedCount) ? Math.max(0, ownedCount) : 0;
  const normalizedExternalCopies =
    externalCopies !== undefined && Number.isFinite(externalCopies)
      ? Math.max(0, externalCopies)
      : 0;
  if (copiesPerChampion === undefined || copiesPerChampion <= 0) {
    return clampGoldenSpatulaDecisionValue(sourceOdds / championChoices, 0, 1);
  }

  const removedTargetCopies = normalizedOwnedCount + normalizedExternalCopies;
  const remainingTargetCopies = Math.max(0, copiesPerChampion - removedTargetCopies);
  const remainingCostCopies = Math.max(
    remainingTargetCopies,
    championChoices * copiesPerChampion - removedTargetCopies,
  );
  if (remainingTargetCopies <= 0 || remainingCostCopies <= 0) return 0;
  return clampGoldenSpatulaDecisionValue(
    sourceOdds * (remainingTargetCopies / remainingCostCopies),
    0,
    1,
  );
}

function getExpectedRollsToFindCopies(expectedCopiesPerRoll: number, copiesNeeded: number): number {
  if (copiesNeeded <= 0) return 0;
  if (expectedCopiesPerRoll <= 0) return Number.POSITIVE_INFINITY;
  return Math.max(0, copiesNeeded) / expectedCopiesPerRoll;
}

function getExpectedCopiesPerRoll(targetSlotOdds: number): number {
  if (targetSlotOdds <= 0) return 0;
  return clampGoldenSpatulaDecisionValue(targetSlotOdds, 0, 1) * GOLDEN_SPATULA_ROLL_SLOT_COUNT;
}

function getExpectedAcquisitionSpend(
  expectedRolls: number,
  copiesNeeded: number,
  cost: number | undefined,
): number {
  if (!Number.isFinite(expectedRolls) || copiesNeeded <= 0) return Number.POSITIVE_INFINITY;
  if (expectedRolls <= 0) return 0;
  const buyCost = typeof cost === 'number' ? cost : 1;
  return Math.max(0, expectedRolls * GOLDEN_SPATULA_ROLL_REFRESH_COST + copiesNeeded * buyCost);
}

function getAcquisitionEfficiencyMultiplier(expectedSpend: number, maxTarget = 35): number {
  if (!Number.isFinite(expectedSpend) || expectedSpend <= 0) return 0.22;
  return clampGoldenSpatulaDecisionValue(1.6 / (1 + expectedSpend / maxTarget), 0.22, 1);
}

function getAcquisitionFeasibilityMultiplier(
  expectedRollsToFindCopies: number,
  projectedRollBudget: number | undefined,
  expectedCopiesPerRoll: number,
  copiesNeeded: number,
): number {
  if (projectedRollBudget === undefined) return 1;
  if (!Number.isFinite(expectedRollsToFindCopies) || expectedRollsToFindCopies <= 0) return 0.58;
  if (copiesNeeded <= 0) return 0.62;
  if (projectedRollBudget <= 0 || expectedCopiesPerRoll <= 0) return 0.58;
  const expectedCopiesByBudget = projectedRollBudget * expectedCopiesPerRoll;
  const nearRollGoal = clampGoldenSpatulaDecisionValue(expectedCopiesByBudget / copiesNeeded, 0, 1);
  return clampGoldenSpatulaDecisionValue(0.62 + nearRollGoal * 0.22, 0.62, 0.84);
}

function getGoldPressureMultiplier(gold: number | undefined, expectedRolls: number): number {
  if (gold === undefined || !Number.isFinite(expectedRolls) || expectedRolls <= 0) return 1;
  const keepGold = Math.max(GOLDEN_SPATULA_GOLD_KEEP_BUFFER, GOLDEN_SPATULA_ROLL_REFRESH_COST * 2);
  const effectiveGold = Math.max(0, gold - keepGold);
  if (effectiveGold <= 0) return 0.6;
  const availableRolls = Math.floor(effectiveGold / GOLDEN_SPATULA_ROLL_REFRESH_COST);
  return clampGoldenSpatulaDecisionValue((availableRolls + 1) / (expectedRolls + 1), 0.55, 1);
}

function getExpectedShopHitRate(
  targetSlotOdds: number,
  availability: GoldenSpatulaShopOddsAvailability,
): number {
  if (availability === 'unavailable') return 0;
  const slotOdds = clampGoldenSpatulaDecisionValue(targetSlotOdds, 0, 1);
  return Math.min(0.98, 1 - Math.pow(1 - slotOdds, GOLDEN_SPATULA_ROLL_SLOT_COUNT));
}

function getCompletionChanceWithinRollBudget(
  rollBudget: number | undefined,
  copiesNeeded: number,
  targetSlotOdds: number,
): number | undefined {
  if (copiesNeeded <= 0) return 1;
  if (rollBudget === undefined) return undefined;
  if (targetSlotOdds <= 0 || rollBudget <= 0) return 0;

  const p = clampGoldenSpatulaDecisionValue(targetSlotOdds, 0, 1);
  const totalSlots = rollBudget * GOLDEN_SPATULA_ROLL_SLOT_COUNT;
  if (p >= 1) return copiesNeeded <= totalSlots ? 1 : 0;

  const q = 1 - p;
  const maxHits = Math.min(copiesNeeded - 1, totalSlots);
  let cumulative = Math.pow(q, totalSlots);
  let term = cumulative;

  for (let hits = 1; hits <= maxHits; hits += 1) {
    term *= ((totalSlots - hits + 1) * p) / (hits * q);
    cumulative += term;
    if (cumulative >= 1) {
      cumulative = 1;
      break;
    }
    if (cumulative <= 0) cumulative = 0;
  }

  return clampGoldenSpatulaDecisionValue(1 - cumulative, 0, 1);
}

function getCompletionChanceMultiplier(completionChance: number | undefined): number {
  if (completionChance === undefined) return 1;
  return clampGoldenSpatulaDecisionValue(0.62 + completionChance * 0.38, 0.62, 1);
}

export function getGoldenSpatulaCopiesUrgencyMultiplier(copiesNeeded: number): number {
  if (copiesNeeded <= 0) return 0;
  return clampGoldenSpatulaDecisionValue(1.3 - copiesNeeded * 0.08, 0.5, 1.25);
}

export function estimateGoldenSpatulaAcquisition(
  input: GoldenSpatulaAcquisitionEstimateInput,
): GoldenSpatulaAcquisitionEstimate {
  const targetSlotOdds = getTargetSlotOdds(
    input.shopOdds,
    input.shopOddsAvailability,
    input.cost,
    input.ownedCount,
    input.externalCopies,
    input.costDensity,
  );
  const expectedCopiesPerRoll = getExpectedCopiesPerRoll(targetSlotOdds);
  const expectedRollsToFindCopies = getExpectedRollsToFindCopies(
    expectedCopiesPerRoll,
    input.copiesNeeded,
  );
  const expectedRollHitRate = getExpectedShopHitRate(targetSlotOdds, input.shopOddsAvailability);
  const projectedRollBudget = getGoldenSpatulaProjectedRollBudget(input.gold);
  const completionChance = getCompletionChanceWithinRollBudget(
    projectedRollBudget,
    input.copiesNeeded,
    targetSlotOdds,
  );
  const expectedSpend = getExpectedAcquisitionSpend(
    expectedRollsToFindCopies,
    input.copiesNeeded,
    input.cost,
  );

  return {
    targetSlotOdds,
    expectedCopiesPerRoll,
    expectedRollsToFindCopies,
    expectedRollHitRate,
    expectedSpend,
    completionChance,
    acquisitionEfficiencyMultiplier: getAcquisitionEfficiencyMultiplier(expectedSpend),
    acquisitionFeasibilityMultiplier: getAcquisitionFeasibilityMultiplier(
      expectedRollsToFindCopies,
      projectedRollBudget,
      expectedCopiesPerRoll,
      input.copiesNeeded,
    ),
    goldPressureMultiplier: getGoldPressureMultiplier(input.gold, expectedRollsToFindCopies),
    completionChanceMultiplier: getCompletionChanceMultiplier(completionChance),
  };
}
