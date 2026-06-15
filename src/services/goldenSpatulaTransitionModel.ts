import type {
  GoldenSpatulaChampionAssetIndex,
  GoldenSpatulaDecisionRole,
  GoldenSpatulaEconomyRunState,
  GoldenSpatulaHandRunState,
  GoldenSpatulaKnowledgeScanState,
  GoldenSpatulaLineupUnit,
  GoldenSpatulaLineupVariant,
  GoldenSpatulaTransitionLineupRecommendation,
} from '@/types/goldenSpatula';
import {
  estimateGoldenSpatulaAcquisition,
  type GoldenSpatulaChampionCostDensityProfile,
} from './goldenSpatulaAcquisitionModel';
import {
  collectGoldenSpatulaVariantUnits,
  extractGoldenSpatulaTraitTags,
  getGoldenSpatulaChampionAssetCost,
  getGoldenSpatulaObservedShopOdds,
  getGoldenSpatulaOwnedCount,
  getGoldenSpatulaShopOdds,
  getGoldenSpatulaShopOddsAvailability,
  getGoldenSpatulaShopVisibleCount,
  isGoldenSpatulaCarryUnit,
  isGoldenSpatulaFrontlineUnit,
  normalizeDecisionText,
} from './goldenSpatulaDecisionContext';
import {
  getGoldenSpatulaRecommendedItemFitSignal,
  type GoldenSpatulaObservedItemSignal,
} from './goldenSpatulaObservationModel';
import {
  getGoldenSpatulaTempoPickAdjustment,
  type GoldenSpatulaTempoContext,
} from './goldenSpatulaTempoModel';

export interface GoldenSpatulaTransitionSourceVariant {
  lineupId: string;
  variantId: string;
  name: string;
  quality?: string;
  version?: string;
  variant: GoldenSpatulaLineupVariant;
  weight: number;
}

export interface GoldenSpatulaTransitionRankInput {
  sources: GoldenSpatulaTransitionSourceVariant[];
  activeVariant: GoldenSpatulaLineupVariant | undefined;
  handState: GoldenSpatulaHandRunState | undefined;
  economyState: GoldenSpatulaEconomyRunState | undefined;
  knowledgeState: GoldenSpatulaKnowledgeScanState | undefined;
  championAssets: GoldenSpatulaChampionAssetIndex | undefined;
  observedItems: Map<string, GoldenSpatulaObservedItemSignal>;
  costDensity: GoldenSpatulaChampionCostDensityProfile;
  tempoContext: GoldenSpatulaTempoContext;
  maxTransitions: number;
}

export interface GoldenSpatulaTransitionUnitScoreInput {
  role: GoldenSpatulaDecisionRole;
  isCoreUnit: boolean;
  activeMatch: boolean;
  ownedCount: number;
  shopVisibleCount: number;
  shopOdds: number | undefined;
  shopOddsAvailability: ReturnType<typeof getGoldenSpatulaShopOddsAvailability>;
  itemFit: ReturnType<typeof getGoldenSpatulaRecommendedItemFitSignal>;
  acquisition: ReturnType<typeof estimateGoldenSpatulaAcquisition>;
  tempo: ReturnType<typeof getGoldenSpatulaTempoPickAdjustment>;
}

export interface GoldenSpatulaTransitionUnitScoreResult {
  score: number;
  blocked: boolean;
  reachableCore: boolean;
}

function getTransitionUnitRole(
  unit: GoldenSpatulaLineupUnit,
  variant: GoldenSpatulaLineupVariant,
  sharedTraitCount: number,
  cost: number | undefined,
): GoldenSpatulaDecisionRole {
  if (isGoldenSpatulaCarryUnit(unit, variant)) return 'carry';
  if (isGoldenSpatulaFrontlineUnit(unit, variant)) return 'frontline';
  if (sharedTraitCount > 0) return 'trait';
  if (cost !== undefined && cost >= 4) return 'power';
  return 'transition';
}

function getTransitionCoreTargetCount(
  role: GoldenSpatulaDecisionRole,
  cost: number | undefined,
): number {
  if (role === 'carry') return cost !== undefined && cost >= 4 ? 2 : 3;
  if (role === 'frontline') return cost !== undefined && cost <= 2 ? 3 : 2;
  if (role === 'power') return 2;
  return 1;
}

export function scoreGoldenSpatulaTransitionUnit({
  role,
  isCoreUnit,
  activeMatch,
  ownedCount,
  shopVisibleCount,
  shopOdds,
  shopOddsAvailability,
  itemFit,
  acquisition,
  tempo,
}: GoldenSpatulaTransitionUnitScoreInput): GoldenSpatulaTransitionUnitScoreResult {
  const unavailable =
    shopOddsAvailability === 'unavailable' && ownedCount <= 0 && shopVisibleCount <= 0;
  if (unavailable) {
    return {
      score: -(isCoreUnit ? 34 : 12),
      blocked: true,
      reachableCore: false,
    };
  }

  const roleBase =
    role === 'carry'
      ? 14
      : role === 'frontline'
        ? 10
        : role === 'power'
          ? 9
          : role === 'trait'
            ? 6
            : 4;
  const ownedBonus = ownedCount > 0 ? 13 + Math.min(ownedCount * 3, 15) : 0;
  const activeBonus = activeMatch ? 9 : 0;
  const visibleBonus = shopVisibleCount > 0 ? 15 + shopVisibleCount * 8 : 0;
  const itemBonus =
    itemFit.count > 0 ? Math.min(isCoreUnit ? 36 : 18, 8 + itemFit.score * 0.45) : 0;
  const oddsBonus =
    shopOdds !== undefined
      ? Math.round(shopOdds * (isCoreUnit ? 20 : 12))
      : shopOddsAvailability === 'unknown'
        ? 3
        : 0;
  const rarityPenalty =
    shopOddsAvailability === 'rare' && ownedCount <= 0 && shopVisibleCount <= 0
      ? isCoreUnit
        ? 8
        : 4
      : 0;
  const completionBonus =
    acquisition.completionChance !== undefined
      ? Math.round(acquisition.completionChance * (isCoreUnit ? 16 : 8))
      : 0;

  return {
    score:
      (roleBase +
        ownedBonus +
        activeBonus +
        visibleBonus +
        itemBonus +
        oddsBonus +
        completionBonus -
        rarityPenalty +
        tempo.rollPriorityBonus * 0.35) *
      tempo.scoreMultiplier,
    blocked: false,
    reachableCore: isCoreUnit,
  };
}

export function rankGoldenSpatulaTransitionLineups({
  sources,
  activeVariant,
  handState,
  economyState,
  knowledgeState,
  championAssets,
  observedItems,
  costDensity,
  tempoContext,
  maxTransitions,
}: GoldenSpatulaTransitionRankInput): GoldenSpatulaTransitionLineupRecommendation[] {
  const activeUnitNames = new Set(
    (activeVariant ? collectGoldenSpatulaVariantUnits(activeVariant) : []).map((unit) =>
      normalizeDecisionText(unit.name),
    ),
  );
  const activeTraitTags = new Set(extractGoldenSpatulaTraitTags(activeVariant?.traitsSummary));
  const currentLevel = economyState?.level;

  return sources
    .map((source) => {
      const units = collectGoldenSpatulaVariantUnits(source.variant);
      const matchedUnitNames: string[] = [];
      const shopVisibleUnitNames: string[] = [];
      const itemFitNames: string[] = [];
      const blockedUnitNames: string[] = [];
      const traitTags = extractGoldenSpatulaTraitTags(source.variant.traitsSummary);
      const sharedTraits = traitTags.filter((tag) => activeTraitTags.has(tag));
      let coreUnitCount = 0;
      let reachableCoreUnitCount = 0;
      let accumulatedExpectedSpend = 0;
      let unitScore = 0;

      for (const unit of units) {
        const key = normalizeDecisionText(unit.name);
        const cost = getGoldenSpatulaChampionAssetCost(unit.name, championAssets);
        const role = getTransitionUnitRole(unit, source.variant, sharedTraits.length, cost);
        const isCoreUnit = role === 'carry' || role === 'frontline' || role === 'power';
        const activeMatch = activeUnitNames.has(key);
        const ownedCount = getGoldenSpatulaOwnedCount(unit.name, handState);
        const shopVisibleCount = getGoldenSpatulaShopVisibleCount(unit.name, knowledgeState);
        const observedShopOdds = getGoldenSpatulaObservedShopOdds(economyState, cost);
        const shopOdds = getGoldenSpatulaShopOdds(currentLevel, cost, observedShopOdds);
        const shopOddsAvailability = getGoldenSpatulaShopOddsAvailability(
          currentLevel,
          cost,
          observedShopOdds,
        );
        const itemFit = getGoldenSpatulaRecommendedItemFitSignal(unit.items ?? [], observedItems);
        const nearUpgrade = ownedCount > 0 && ownedCount % 3 === 2;
        const targetCount = getTransitionCoreTargetCount(role, cost);
        const copiesNeededAfterShop = Math.max(0, targetCount - ownedCount - shopVisibleCount);
        const tempo = getGoldenSpatulaTempoPickAdjustment(tempoContext, {
          cost,
          role,
          activeTarget: isCoreUnit,
          nearUpgrade,
          ownedCount,
        });

        if (activeMatch || ownedCount > 0) matchedUnitNames.push(unit.name);
        if (shopVisibleCount > 0) shopVisibleUnitNames.push(unit.name);
        if (itemFit.names.length > 0) itemFitNames.push(...itemFit.names);
        if (isCoreUnit) coreUnitCount += 1;

        const acquisition = estimateGoldenSpatulaAcquisition({
          shopOdds,
          shopOddsAvailability,
          cost,
          copiesNeeded: copiesNeededAfterShop,
          gold: economyState?.gold,
          costDensity,
        });
        const unitScoreResult = scoreGoldenSpatulaTransitionUnit({
          role,
          isCoreUnit,
          activeMatch,
          ownedCount,
          shopVisibleCount,
          shopOdds,
          shopOddsAvailability,
          itemFit,
          acquisition,
          tempo,
        });
        unitScore += unitScoreResult.score;

        if (unitScoreResult.blocked) {
          if (isCoreUnit) blockedUnitNames.push(unit.name);
          continue;
        }

        if (unitScoreResult.reachableCore) reachableCoreUnitCount += 1;

        if (Number.isFinite(acquisition.expectedSpend)) {
          accumulatedExpectedSpend += acquisition.expectedSpend;
        }
      }

      const coreReachRatio =
        coreUnitCount > 0 ? reachableCoreUnitCount / Math.max(1, coreUnitCount) : 1;
      const spendPressurePenalty = Math.min(22, accumulatedExpectedSpend / 8);
      const sharedTraitScore = sharedTraits.length * 12;
      const unitCountScore = units.length * 1.5;
      const sourceWeightScore = source.weight * 10;
      const reachabilityMultiplier = 0.68 + coreReachRatio * 0.32;
      const beforePenalty =
        (sharedTraitScore + unitCountScore + sourceWeightScore + unitScore) *
        reachabilityMultiplier;
      const finalScore = Math.max(0, Math.round(beforePenalty - spendPressurePenalty));

      return {
        lineupId: source.lineupId,
        variantId: source.variantId,
        name: source.name,
        score: finalScore,
        scoreBreakdown: {
          sharedTraitScore,
          unitCountScore,
          sourceWeightScore,
          unitScore,
          coreReachRatio,
          spendPressurePenalty,
          beforePenalty,
          final: finalScore,
        },
        quality: source.quality,
        version: source.version,
        matchedUnitNames: Array.from(new Set(matchedUnitNames)).slice(0, 5),
        shopVisibleUnitNames: Array.from(new Set(shopVisibleUnitNames)).slice(0, 5),
        itemFitNames: Array.from(new Set(itemFitNames)).slice(0, 5),
        blockedUnitNames: Array.from(new Set(blockedUnitNames)).slice(0, 4),
        traitTags: sharedTraits.length > 0 ? sharedTraits.slice(0, 4) : traitTags.slice(0, 4),
      };
    })
    .filter(
      (lineup) =>
        lineup.score > 18 &&
        (lineup.matchedUnitNames.length > 0 ||
          (lineup.shopVisibleUnitNames?.length ?? 0) > 0 ||
          (lineup.itemFitNames?.length ?? 0) > 0 ||
          (lineup.blockedUnitNames?.length ?? 0) === 0),
    )
    .sort((a, b) => b.score - a.score)
    .slice(0, maxTransitions);
}
