import type {
  GoldenSpatulaChampionAssetIndex,
  GoldenSpatulaDecisionRole,
  GoldenSpatulaEconomyRunState,
  GoldenSpatulaHandRunState,
  GoldenSpatulaKnowledgeScanState,
  GoldenSpatulaLineupUnit,
  GoldenSpatulaLineupVariant,
  GoldenSpatulaStopLossAdvice,
  GoldenSpatulaTransitionCostCurve,
  GoldenSpatulaTransitionLineupRecommendation,
  GoldenSpatulaTransitionNextAction,
  GoldenSpatulaTransitionPlanKind,
  GoldenSpatulaTransitionRiskLevel,
  GoldenSpatulaTransitionRouteUnitTag,
  GoldenSpatulaTransitionTempoStep,
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
  getGoldenSpatulaRecommendedItemFamilyFitSignal,
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
  stopLossAdvice?: GoldenSpatulaStopLossAdvice;
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
  itemFamilyFit?: ReturnType<typeof getGoldenSpatulaRecommendedItemFamilyFitSignal>;
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

function getNaturalAccessLevelForCost(cost: number | undefined): number | undefined {
  if (cost === undefined) return undefined;
  if (cost <= 1) return 3;
  if (cost === 2) return 4;
  if (cost === 3) return 6;
  if (cost === 4) return 7;
  return 8;
}

function isStableActiveTransitionUnit(
  unit: GoldenSpatulaLineupUnit | undefined,
  handState: GoldenSpatulaHandRunState | undefined,
  championAssets: GoldenSpatulaChampionAssetIndex | undefined,
): boolean {
  if (!unit) return false;
  const cost = getGoldenSpatulaChampionAssetCost(unit.name, championAssets);
  const ownedCount = getGoldenSpatulaOwnedCount(unit.name, handState);
  const twoStarThreshold = cost !== undefined && cost >= 4 ? 2 : 3;
  return ownedCount >= twoStarThreshold;
}

function hasStableActiveTransitionShell({
  activeVariant,
  handState,
  championAssets,
}: Pick<
  GoldenSpatulaTransitionRankInput,
  'activeVariant' | 'handState' | 'championAssets'
>): boolean {
  if (!activeVariant) return false;
  const carryStable = activeVariant.mainCarries.some((unit) =>
    isStableActiveTransitionUnit(unit, handState, championAssets),
  );
  const frontlineStable = activeVariant.frontliners.some((unit) =>
    isStableActiveTransitionUnit(unit, handState, championAssets),
  );
  return carryStable && frontlineStable;
}

function hasSpellCycleItemFamily(families: readonly string[]): boolean {
  return families.includes('ap') || families.includes('mana');
}

function getLateralPivotBonus({
  stopLossAdvice,
  units,
  sharedTraitCount,
  matchedUnitNames,
  bridgeUnitNames,
  itemBridgeScore,
  itemFamilyScore,
  itemFamilyNames,
  itemBridgeUnitNames,
  itemFamilyUnitNames,
}: {
  stopLossAdvice: GoldenSpatulaStopLossAdvice | undefined;
  units: GoldenSpatulaLineupUnit[];
  sharedTraitCount: number;
  matchedUnitNames: string[];
  bridgeUnitNames: string[];
  itemBridgeScore: number;
  itemFamilyScore: number;
  itemFamilyNames: string[];
  itemBridgeUnitNames: string[];
  itemFamilyUnitNames: string[];
}): number {
  if (!stopLossAdvice?.pivotPreferred || stopLossAdvice.action !== 'pivot') return 0;

  const blockedTargetNames = new Set(
    stopLossAdvice.targetNames.slice(0, 1).map(normalizeDecisionText),
  );
  const keepsBlockedCore = units.some((unit) =>
    blockedTargetNames.has(normalizeDecisionText(unit.name)),
  );
  if (keepsBlockedCore) return 0;

  const resourceReuseScore =
    itemBridgeScore +
    itemFamilyScore +
    itemFamilyNames.length * 2 +
    (itemBridgeUnitNames.length + itemFamilyUnitNames.length) * 4;
  const shellReuseScore =
    matchedUnitNames.length * 4 + bridgeUnitNames.length * 3 + sharedTraitCount * 3;
  if (resourceReuseScore <= 0 || shellReuseScore <= 0) return 0;

  const severityBonus =
    stopLossAdvice.severity === 'critical' ? 6 : stopLossAdvice.severity === 'warning' ? 3 : 0;
  return Math.min(34, Math.round(10 + resourceReuseScore * 0.25 + shellReuseScore + severityBonus));
}

function getPivotBlockedPenalty({
  stopLossAdvice,
  units,
  carryUnitNames,
  matchedUnitNames,
}: {
  stopLossAdvice: GoldenSpatulaStopLossAdvice | undefined;
  units: GoldenSpatulaLineupUnit[];
  carryUnitNames: string[];
  matchedUnitNames: string[];
}): number {
  if (!stopLossAdvice?.pivotPreferred || stopLossAdvice.action !== 'pivot') return 0;

  const blockedTargetName = normalizeDecisionText(stopLossAdvice.targetNames[0] ?? '');
  if (!blockedTargetName) return 0;

  const keepsBlockedFocus = units.some(
    (unit) => normalizeDecisionText(unit.name) === blockedTargetName,
  );
  if (!keepsBlockedFocus) return 0;

  const severityPenalty =
    stopLossAdvice.severity === 'critical' ? 18 : stopLossAdvice.severity === 'warning' ? 12 : 8;
  const carryPenalty = carryUnitNames.some(
    (name) => normalizeDecisionText(name) === blockedTargetName,
  )
    ? 8
    : 0;
  const sunkCostPenalty = matchedUnitNames.some(
    (name) => normalizeDecisionText(name) === blockedTargetName,
  )
    ? 6
    : 0;

  return severityPenalty + carryPenalty + sunkCostPenalty;
}

function scoreTransitionStageReach({
  role,
  cost,
  currentLevel,
  ownedCount,
  shopVisibleCount,
  shopOddsAvailability,
  tempoContext,
}: {
  role: GoldenSpatulaDecisionRole;
  cost: number | undefined;
  currentLevel: number | undefined;
  ownedCount: number;
  shopVisibleCount: number;
  shopOddsAvailability: ReturnType<typeof getGoldenSpatulaShopOddsAvailability>;
  tempoContext: GoldenSpatulaTempoContext;
}): number {
  if (cost === undefined) return 0;
  const isCoreRole = role === 'carry' || role === 'frontline' || role === 'power';
  const alreadyConnected = ownedCount > 0 || shopVisibleCount > 0;
  if (alreadyConnected) return isCoreRole ? 12 : 7;
  if (shopOddsAvailability === 'unavailable') return isCoreRole ? -24 : -10;
  if (shopOddsAvailability === 'rare') return isCoreRole ? -9 : -4;

  const naturalLevel = getNaturalAccessLevelForCost(cost);
  if (currentLevel !== undefined && naturalLevel !== undefined) {
    if (currentLevel >= naturalLevel) return isCoreRole ? 10 : 5;
    if (naturalLevel - currentLevel === 1) return isCoreRole ? 4 : 2;
  }

  if (tempoContext.tempoPhase === 'early' && cost >= 4) return isCoreRole ? -18 : -8;
  if (tempoContext.tempoPhase === 'mid' && cost >= 5) return isCoreRole ? -14 : -6;
  return 0;
}

function getHighCostPressurePenalty({
  role,
  cost,
  currentLevel,
  ownedCount,
  shopVisibleCount,
  shopOddsAvailability,
  tempoContext,
}: {
  role: GoldenSpatulaDecisionRole;
  cost: number | undefined;
  currentLevel: number | undefined;
  ownedCount: number;
  shopVisibleCount: number;
  shopOddsAvailability: ReturnType<typeof getGoldenSpatulaShopOddsAvailability>;
  tempoContext: GoldenSpatulaTempoContext;
}): number {
  if (cost === undefined || cost < 4 || ownedCount > 0 || shopVisibleCount > 0) return 0;
  const isCoreRole = role === 'carry' || role === 'frontline' || role === 'power';
  const naturalLevel = getNaturalAccessLevelForCost(cost) ?? 8;
  const levelGap = currentLevel === undefined ? 2 : Math.max(0, naturalLevel - currentLevel);
  const phasePenalty =
    tempoContext.tempoPhase === 'early' ? 8 : tempoContext.tempoPhase === 'mid' ? 4 : 0;
  const availabilityPenalty =
    shopOddsAvailability === 'unavailable' ? 10 : shopOddsAvailability === 'rare' ? 5 : 0;
  return Math.min(24, levelGap * (isCoreRole ? 5 : 3) + phasePenalty + availabilityPenalty);
}

function uniqueTransitionNames(names: string[], limit: number): string[] {
  return Array.from(new Set(names.filter(Boolean))).slice(0, limit);
}

function compactTransitionHint(text: string | undefined): string | undefined {
  const normalized = text?.replace(/\s+/g, ' ').trim();
  if (!normalized) return undefined;
  return normalized.length > 72 ? `${normalized.slice(0, 72)}...` : normalized;
}

function getTransitionHint(
  variant: GoldenSpatulaLineupVariant,
  tempoContext: GoldenSpatulaTempoContext,
): string | undefined {
  const notes = (
    variant as GoldenSpatulaLineupVariant & {
      notes?: {
        early?: string;
        economy?: string;
        matchup?: string;
      };
    }
  ).notes;
  if (!notes) return undefined;

  if (tempoContext.tempoPhase === 'early') {
    return compactTransitionHint(notes.early ?? notes.economy);
  }
  if (tempoContext.tempoPhase === 'mid') {
    return compactTransitionHint(notes.economy ?? notes.early);
  }
  return compactTransitionHint(notes.economy ?? notes.matchup ?? notes.early);
}

function getTransitionGuideScore(
  transitionHint: string | undefined,
  tempoContext: GoldenSpatulaTempoContext,
): number {
  if (!transitionHint) return 0;
  if (tempoContext.tempoPhase === 'early') return 6;
  if (tempoContext.tempoPhase === 'mid') return 5;
  return 3;
}

function getTransitionPlanKind({
  tempoContext,
  targetLevel,
  averageCost,
  itemBridgeScore,
  lowCostBridgeScore,
  highCostPressurePenalty,
}: {
  tempoContext: GoldenSpatulaTempoContext;
  targetLevel: number;
  averageCost: number | undefined;
  itemBridgeScore: number;
  lowCostBridgeScore: number;
  highCostPressurePenalty: number;
}): GoldenSpatulaTransitionPlanKind {
  if (itemBridgeScore >= 16 && lowCostBridgeScore > 0) return 'itemCarrier';
  if (tempoContext.tempoPhase === 'early' || targetLevel <= 6 || lowCostBridgeScore >= 14) {
    return 'earlyBridge';
  }
  if (
    tempoContext.tempoPhase === 'late' ||
    targetLevel >= 8 ||
    (averageCost !== undefined && averageCost >= 3.8 && highCostPressurePenalty < 12)
  ) {
    return 'lateCap';
  }
  return 'midPivot';
}

function getTransitionPlanKindScore(
  kind: GoldenSpatulaTransitionPlanKind,
  tempoContext: GoldenSpatulaTempoContext,
): number {
  if (tempoContext.tempoPhase === 'early') {
    if (kind === 'earlyBridge') return 14;
    if (kind === 'itemCarrier') return 12;
    if (kind === 'midPivot') return 2;
    return -14;
  }
  if (tempoContext.tempoPhase === 'mid') {
    if (kind === 'midPivot') return 12;
    if (kind === 'itemCarrier') return 10;
    if (kind === 'earlyBridge') return 4;
    return -4;
  }
  if (tempoContext.tempoPhase === 'late') {
    if (kind === 'lateCap') return 12;
    if (kind === 'midPivot') return 5;
    if (kind === 'itemCarrier') return 2;
    return -6;
  }
  return kind === 'lateCap' ? -3 : 4;
}

function getTransitionCostCurve({
  lowCostCount,
  midCostCount,
  highCostCount,
  unknownCostCount,
  lowCostBridgeScore,
  highCostPressurePenalty,
}: {
  lowCostCount: number;
  midCostCount: number;
  highCostCount: number;
  unknownCostCount: number;
  lowCostBridgeScore: number;
  highCostPressurePenalty: number;
}): GoldenSpatulaTransitionCostCurve {
  const knownCount = lowCostCount + midCostCount + highCostCount;
  if (knownCount === 0 && unknownCostCount > 0) return 'balanced';
  if (highCostCount >= 3 && lowCostBridgeScore <= 0 && highCostPressurePenalty >= 10)
    return 'spike';
  if (highCostCount >= Math.max(2, lowCostCount + midCostCount)) return 'expensive';
  if (lowCostCount >= Math.max(2, midCostCount + highCostCount)) return 'low';
  return 'balanced';
}

function getTransitionCostCurveScore(
  costCurve: GoldenSpatulaTransitionCostCurve,
  tempoContext: GoldenSpatulaTempoContext,
): number {
  if (tempoContext.tempoPhase === 'early') {
    if (costCurve === 'low') return 12;
    if (costCurve === 'balanced') return 6;
    if (costCurve === 'expensive') return -8;
    return -18;
  }
  if (tempoContext.tempoPhase === 'mid') {
    if (costCurve === 'balanced') return 12;
    if (costCurve === 'low') return 2;
    if (costCurve === 'expensive') return 4;
    return -12;
  }
  if (tempoContext.tempoPhase === 'late') {
    if (costCurve === 'expensive') return 10;
    if (costCurve === 'balanced') return 6;
    if (costCurve === 'low') return -5;
    return -8;
  }
  if (costCurve === 'spike') return -10;
  return 4;
}

function getTransitionNextAction({
  transitionPlanKind,
  costCurve,
  itemBridgeScore,
  lowCostBridgeScore,
  stageReachScore,
  highCostPressurePenalty,
  coreReachRatio,
}: {
  transitionPlanKind: GoldenSpatulaTransitionPlanKind;
  costCurve: GoldenSpatulaTransitionCostCurve;
  itemBridgeScore: number;
  lowCostBridgeScore: number;
  stageReachScore: number;
  highCostPressurePenalty: number;
  coreReachRatio: number;
}): GoldenSpatulaTransitionNextAction {
  if (costCurve === 'spike' || (highCostPressurePenalty >= 14 && stageReachScore < 0)) {
    return 'saveForLevel';
  }
  if (itemBridgeScore >= 16) return 'itemHolder';
  if (lowCostBridgeScore > 0 || transitionPlanKind === 'earlyBridge') return 'holdBridge';
  if (transitionPlanKind === 'lateCap' && coreReachRatio >= 0.75) return 'pushCap';
  return 'pivotSoon';
}

function getTransitionRiskLevel({
  costCurve,
  hasActionableBridge,
  itemBridgeScore,
  lowCostBridgeScore,
  coreReachRatio,
  highCostPressurePenalty,
}: {
  costCurve: GoldenSpatulaTransitionCostCurve;
  hasActionableBridge: boolean;
  itemBridgeScore: number;
  lowCostBridgeScore: number;
  coreReachRatio: number;
  highCostPressurePenalty: number;
}): GoldenSpatulaTransitionRiskLevel {
  if (
    costCurve === 'spike' ||
    highCostPressurePenalty >= 16 ||
    (coreReachRatio < 0.55 && !hasActionableBridge)
  ) {
    return 'greedy';
  }
  if (
    hasActionableBridge &&
    coreReachRatio >= 0.75 &&
    highCostPressurePenalty < 8 &&
    (lowCostBridgeScore > 0 ||
      itemBridgeScore >= 12 ||
      costCurve === 'low' ||
      costCurve === 'balanced')
  ) {
    return 'safe';
  }
  return 'conditional';
}

function getTransitionRiskScore(riskLevel: GoldenSpatulaTransitionRiskLevel): number {
  if (riskLevel === 'safe') return 6;
  if (riskLevel === 'greedy') return -8;
  return 0;
}

function getTransitionTempoSteps({
  nextAction,
  transitionPlanKind,
}: {
  nextAction: GoldenSpatulaTransitionNextAction;
  transitionPlanKind: GoldenSpatulaTransitionPlanKind;
}): GoldenSpatulaTransitionTempoStep[] {
  if (nextAction === 'saveForLevel') return ['saveLevel', 'pivot', 'capBoard'];
  if (nextAction === 'itemHolder') return ['itemHold', 'pivot', 'capBoard'];
  if (nextAction === 'holdBridge') return ['nowBridge', 'pivot', 'capBoard'];
  if (nextAction === 'pushCap' || transitionPlanKind === 'lateCap') return ['pivot', 'capBoard'];
  return ['nowBridge', 'pivot', 'capBoard'];
}

function getTransitionEconomyPlan({
  nextAction,
  riskLevel,
  costCurve,
  shopHitCount,
  itemBridgeCount,
}: {
  nextAction: GoldenSpatulaTransitionNextAction;
  riskLevel: GoldenSpatulaTransitionRiskLevel;
  costCurve: GoldenSpatulaTransitionCostCurve;
  shopHitCount: number;
  itemBridgeCount: number;
}): GoldenSpatulaTransitionLineupRecommendation['economyPlan'] {
  if (riskLevel === 'greedy' || costCurve === 'spike') return 'avoidOverroll';
  if (nextAction === 'pushCap' || nextAction === 'saveForLevel') return 'pushLevel';
  if (shopHitCount > 0) return 'buyShopHits';
  if (nextAction === 'pivotSoon' || itemBridgeCount === 0) return 'smallRoll';
  return 'holdInterest';
}

function getTransitionReadiness({
  nextAction,
  riskLevel,
  costCurve,
  shopHitCount,
  itemBridgeCount,
  missingKeyCount,
}: {
  nextAction: GoldenSpatulaTransitionNextAction;
  riskLevel: GoldenSpatulaTransitionRiskLevel;
  costCurve: GoldenSpatulaTransitionCostCurve;
  shopHitCount: number;
  itemBridgeCount: number;
  missingKeyCount: number;
}): GoldenSpatulaTransitionLineupRecommendation['readiness'] {
  if (riskLevel === 'greedy' || costCurve === 'spike') return 'tooGreedy';
  if (nextAction === 'pushCap' || nextAction === 'saveForLevel') return 'needLevel';
  if (itemBridgeCount === 0 && nextAction === 'itemHolder') return 'needItems';
  if (shopHitCount === 0 && missingKeyCount > 1) return 'needShopHit';
  return 'ready';
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
  itemFamilyFit,
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
  const itemFamilyBonus =
    itemFit.count <= 0 && itemFamilyFit !== undefined && itemFamilyFit.count > 0
      ? Math.min(isCoreUnit ? 20 : 10, 4 + itemFamilyFit.score * 0.32)
      : 0;
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
        itemFamilyBonus +
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
  stopLossAdvice,
  maxTransitions,
}: GoldenSpatulaTransitionRankInput): GoldenSpatulaTransitionLineupRecommendation[] {
  const activeUnitNames = new Set(
    (activeVariant ? collectGoldenSpatulaVariantUnits(activeVariant) : []).map((unit) =>
      normalizeDecisionText(unit.name),
    ),
  );
  const activeTraitTags = new Set(extractGoldenSpatulaTraitTags(activeVariant?.traitsSummary));
  const currentLevel = economyState?.level;
  const activeShellStable = hasStableActiveTransitionShell({
    activeVariant,
    handState,
    championAssets,
  });

  return sources
    .map((source) => {
      const units = collectGoldenSpatulaVariantUnits(source.variant);
      const matchedUnitNames: string[] = [];
      const shopVisibleUnitNames: string[] = [];
      const itemFitNames: string[] = [];
      const itemFamilyNames: string[] = [];
      const blockedUnitNames: string[] = [];
      const carryUnitNames: string[] = [];
      const frontlineUnitNames: string[] = [];
      const bridgeUnitNames: string[] = [];
      const itemBridgeUnitNames: string[] = [];
      const itemFamilyUnitNames: string[] = [];
      const lowCostUnitNames: string[] = [];
      const traitTags = extractGoldenSpatulaTraitTags(source.variant.traitsSummary);
      const sharedTraits = traitTags.filter((tag) => activeTraitTags.has(tag));
      let coreUnitCount = 0;
      let reachableCoreUnitCount = 0;
      let reachableCarryCount = 0;
      let reachableFrontlineCount = 0;
      let accumulatedExpectedSpend = 0;
      let unitScore = 0;
      let stageReachScore = 0;
      let itemBridgeScore = 0;
      let itemFamilyScore = 0;
      let spellCycleFamilySignal = 0;
      let actionableFrontlineShellScore = 0;
      let lowCostBridgeScore = 0;
      let highCostPressurePenalty = 0;
      let knownCostCount = 0;
      let totalKnownCost = 0;
      let lowCostCount = 0;
      let midCostCount = 0;
      let highCostCount = 0;
      let unknownCostCount = 0;
      let targetLevel = Math.max(4, Math.min(10, units.length));

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
        const itemFamilyFit = getGoldenSpatulaRecommendedItemFamilyFitSignal(
          unit.items ?? [],
          observedItems,
        );
        const nearUpgrade = ownedCount > 0 && ownedCount % 3 === 2;
        const targetCount = getTransitionCoreTargetCount(role, cost);
        const copiesNeededAfterShop = Math.max(0, targetCount - ownedCount - shopVisibleCount);
        const naturalAccessLevel = getNaturalAccessLevelForCost(cost);
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
        if (itemFit.count <= 0 && itemFamilyFit.names.length > 0) {
          itemFamilyNames.push(...itemFamilyFit.names);
        }
        if (role === 'carry') carryUnitNames.push(unit.name);
        if (role === 'frontline') frontlineUnitNames.push(unit.name);
        if (isCoreUnit) coreUnitCount += 1;
        if (cost !== undefined) {
          knownCostCount += 1;
          totalKnownCost += cost;
          if (cost <= 2) {
            lowCostCount += 1;
          } else if (cost <= 3) {
            midCostCount += 1;
          } else {
            highCostCount += 1;
          }
        } else {
          unknownCostCount += 1;
        }
        if (naturalAccessLevel !== undefined && isCoreUnit) {
          targetLevel = Math.max(targetLevel, naturalAccessLevel);
        }

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
          itemFamilyFit,
          acquisition,
          tempo,
        });
        unitScore += unitScoreResult.score;
        stageReachScore += scoreTransitionStageReach({
          role,
          cost,
          currentLevel,
          ownedCount,
          shopVisibleCount,
          shopOddsAvailability,
          tempoContext,
        });
        highCostPressurePenalty += getHighCostPressurePenalty({
          role,
          cost,
          currentLevel,
          ownedCount,
          shopVisibleCount,
          shopOddsAvailability,
          tempoContext,
        });

        const lowCostBridge =
          cost !== undefined &&
          cost <= 2 &&
          (activeMatch ||
            ownedCount > 0 ||
            shopVisibleCount > 0 ||
            sharedTraits.length > 0 ||
            itemFit.count > 0 ||
            itemFamilyFit.count > 0);
        if (lowCostBridge) {
          lowCostUnitNames.push(unit.name);
          lowCostBridgeScore +=
            8 +
            Math.min(6, itemFit.count * 2 + itemFamilyFit.count) +
            Math.min(6, sharedTraits.length * 2);
        }
        if (
          role === 'frontline' &&
          (activeMatch ||
            ownedCount > 0 ||
            shopVisibleCount > 0 ||
            lowCostBridge ||
            (cost !== undefined && cost <= 3 && sharedTraits.length > 0))
        ) {
          actionableFrontlineShellScore += cost !== undefined && cost <= 2 ? 2 : 1;
        }
        const actionableItemFamilyHolder =
          itemFamilyFit.count > 0 &&
          (lowCostBridge ||
            activeMatch ||
            ownedCount > 0 ||
            shopVisibleCount > 0 ||
            (cost !== undefined && cost <= 3));

        const bridgeCandidate =
          activeMatch ||
          ownedCount > 0 ||
          shopVisibleCount > 0 ||
          lowCostBridge ||
          ((itemFit.count > 0 || itemFamilyFit.count > 0) && cost !== undefined && cost <= 3);
        if (bridgeCandidate) bridgeUnitNames.push(unit.name);

        if (itemFit.count > 0) {
          const itemScore = Math.min(
            role === 'carry' || role === 'frontline' ? 22 : 12,
            5 + itemFit.score * 0.28 + itemFit.count * 3,
          );
          itemBridgeScore += itemScore;
          if (role === 'carry' || role === 'frontline' || lowCostBridge) {
            itemBridgeUnitNames.push(unit.name);
          }
        }

        if (itemFit.count <= 0 && itemFamilyFit.count > 0) {
          if (hasSpellCycleItemFamily(itemFamilyFit.families)) {
            spellCycleFamilySignal +=
              role === 'carry' || role === 'power' || role === 'transition'
                ? itemFamilyFit.count + 1
                : itemFamilyFit.count;
          }
          const familyScore = Math.min(
            role === 'carry' || role === 'frontline' ? 14 : 8,
            3 + itemFamilyFit.score * 0.22 + itemFamilyFit.count * 2,
          );
          itemFamilyScore += familyScore;
          if (
            actionableItemFamilyHolder &&
            (role === 'carry' || role === 'frontline' || lowCostBridge)
          ) {
            itemFamilyUnitNames.push(unit.name);
          }
        }

        if (unitScoreResult.blocked) {
          if (isCoreUnit) blockedUnitNames.push(unit.name);
          continue;
        }

        if (unitScoreResult.reachableCore) reachableCoreUnitCount += 1;
        if (role === 'carry') reachableCarryCount += 1;
        if (role === 'frontline') reachableFrontlineCount += 1;

        if (Number.isFinite(acquisition.expectedSpend)) {
          accumulatedExpectedSpend += acquisition.expectedSpend;
        }
      }

      const coreReachRatio =
        coreUnitCount > 0 ? reachableCoreUnitCount / Math.max(1, coreUnitCount) : 1;
      const spendPressurePenalty = Math.min(22, accumulatedExpectedSpend / 8);
      const sharedTraitScore = sharedTraits.length * 12;
      const unitCountScore = units.length * 1.5;
      const sourceWeightScore = source.weight * 16;
      const structureScore =
        carryUnitNames.length > 0 && frontlineUnitNames.length > 0
          ? reachableCarryCount > 0 && reachableFrontlineCount > 0
            ? 22
            : reachableCarryCount > 0 || reachableFrontlineCount > 0
              ? 6
              : -12
          : -16;
      const reachabilityMultiplier = 0.68 + coreReachRatio * 0.32;
      const beforePenalty =
        (sharedTraitScore +
          unitCountScore +
          sourceWeightScore +
          unitScore +
          stageReachScore +
          itemBridgeScore +
          itemFamilyScore +
          structureScore +
          lowCostBridgeScore) *
        reachabilityMultiplier;
      const averageCost =
        knownCostCount > 0 ? Math.round((totalKnownCost / knownCostCount) * 10) / 10 : undefined;
      const spellCyclePenalty =
        spellCycleFamilySignal > 0 && !activeShellStable && actionableFrontlineShellScore <= 0
          ? Math.min(
              18,
              8 + spellCycleFamilySignal * 3 + (frontlineUnitNames.length === 0 ? 4 : 0),
            )
          : 0;
      const lateralPivotBonus = getLateralPivotBonus({
        stopLossAdvice,
        units,
        sharedTraitCount: sharedTraits.length,
        matchedUnitNames,
        bridgeUnitNames,
        itemBridgeScore,
        itemFamilyScore,
        itemFamilyNames,
        itemBridgeUnitNames,
        itemFamilyUnitNames,
      });
      const pivotBlockedPenalty = getPivotBlockedPenalty({
        stopLossAdvice,
        units,
        carryUnitNames,
        matchedUnitNames,
      });
      const effectiveItemBridgeScore = itemBridgeScore + Math.min(12, itemFamilyScore * 0.65);
      const effectiveLowCostBridgeScore = lowCostBridgeScore + Math.min(8, itemFamilyScore * 0.4);
      const effectiveItemBridgeCount = itemBridgeUnitNames.length + itemFamilyUnitNames.length;
      const transitionPlanKind = getTransitionPlanKind({
        tempoContext,
        targetLevel: Math.min(10, targetLevel),
        averageCost,
        itemBridgeScore: effectiveItemBridgeScore,
        lowCostBridgeScore: effectiveLowCostBridgeScore,
        highCostPressurePenalty,
      });
      const planKindScore = getTransitionPlanKindScore(transitionPlanKind, tempoContext);
      const costCurve = getTransitionCostCurve({
        lowCostCount,
        midCostCount,
        highCostCount,
        unknownCostCount,
        lowCostBridgeScore: effectiveLowCostBridgeScore,
        highCostPressurePenalty,
      });
      const costCurveScore = getTransitionCostCurveScore(costCurve, tempoContext);
      const transitionHint = getTransitionHint(source.variant, tempoContext);
      const guideScore = getTransitionGuideScore(transitionHint, tempoContext);
      const hasActionableBridge =
        matchedUnitNames.length > 0 ||
        shopVisibleUnitNames.length > 0 ||
        itemFitNames.length > 0 ||
        itemFamilyUnitNames.length > 0 ||
        bridgeUnitNames.length > 0;
      let nextAction = getTransitionNextAction({
        transitionPlanKind,
        costCurve,
        itemBridgeScore: effectiveItemBridgeScore,
        lowCostBridgeScore: effectiveLowCostBridgeScore,
        stageReachScore,
        highCostPressurePenalty,
        coreReachRatio,
      });
      const dreamPivotPenalty =
        activeShellStable &&
        !hasActionableBridge &&
        transitionPlanKind !== 'earlyBridge' &&
        (coreReachRatio < 0.75 || highCostPressurePenalty >= 12 || stageReachScore < 0)
          ? 18
          : 0;
      if (dreamPivotPenalty > 0 && nextAction === 'pivotSoon') {
        nextAction = 'saveForLevel';
      }
      if (lateralPivotBonus > 0 && nextAction === 'holdBridge') {
        nextAction = 'pivotSoon';
      }
      let riskLevel = getTransitionRiskLevel({
        costCurve,
        hasActionableBridge,
        itemBridgeScore: effectiveItemBridgeScore,
        lowCostBridgeScore: effectiveLowCostBridgeScore,
        coreReachRatio,
        highCostPressurePenalty,
      });
      if (dreamPivotPenalty > 0) riskLevel = 'greedy';
      const riskScore = getTransitionRiskScore(riskLevel);
      const tempoSteps = getTransitionTempoSteps({
        nextAction,
        transitionPlanKind,
      });
      const finalScore = Math.max(
        0,
        Math.round(
          beforePenalty +
            planKindScore +
            costCurveScore -
            spendPressurePenalty -
            highCostPressurePenalty +
            guideScore +
            riskScore -
            dreamPivotPenalty -
            spellCyclePenalty +
            lateralPivotBonus -
            pivotBlockedPenalty,
        ),
      );
      const primaryReasonNames =
        transitionPlanKind === 'lateCap'
          ? uniqueTransitionNames(
              [
                ...carryUnitNames,
                ...frontlineUnitNames,
                ...shopVisibleUnitNames,
                ...matchedUnitNames,
              ],
              4,
            )
          : transitionPlanKind === 'itemCarrier'
            ? uniqueTransitionNames(
                [
                  ...itemBridgeUnitNames,
                  ...lowCostUnitNames,
                  ...shopVisibleUnitNames,
                  ...matchedUnitNames,
                  ...itemFamilyUnitNames,
                ],
                4,
              )
            : uniqueTransitionNames(
                [
                  ...bridgeUnitNames,
                  ...lowCostUnitNames,
                  ...shopVisibleUnitNames,
                  ...matchedUnitNames,
                  ...itemBridgeUnitNames,
                  ...itemFamilyUnitNames,
                ],
                4,
              );
      const routeUnitNames = uniqueTransitionNames(
        [
          ...primaryReasonNames,
          ...itemBridgeUnitNames,
          ...itemFamilyUnitNames,
          ...carryUnitNames,
          ...frontlineUnitNames,
        ],
        6,
      );
      const routeUnitNameSet = new Set(routeUnitNames.map(normalizeDecisionText));
      const shopPriorityUnitNames = uniqueTransitionNames(
        [
          ...shopVisibleUnitNames.filter((name) =>
            routeUnitNameSet.has(normalizeDecisionText(name)),
          ),
          ...shopVisibleUnitNames,
        ],
        4,
      );
      const economyPlan = getTransitionEconomyPlan({
        nextAction,
        riskLevel,
        costCurve,
        shopHitCount: shopPriorityUnitNames.length,
        itemBridgeCount: effectiveItemBridgeCount,
      });
      const resolvedKeyUnitNames = new Set(
        [...matchedUnitNames, ...shopVisibleUnitNames].map(normalizeDecisionText),
      );
      const missingKeyUnitNames = uniqueTransitionNames(
        [...carryUnitNames, ...frontlineUnitNames, ...bridgeUnitNames].filter(
          (name) => !resolvedKeyUnitNames.has(normalizeDecisionText(name)),
        ),
        4,
      );
      const readiness = getTransitionReadiness({
        nextAction,
        riskLevel,
        costCurve,
        shopHitCount: shopPriorityUnitNames.length,
        itemBridgeCount: effectiveItemBridgeCount,
        missingKeyCount: missingKeyUnitNames.length,
      });
      const matchedRouteUnitNames = new Set(matchedUnitNames.map(normalizeDecisionText));
      const shopRouteUnitNames = new Set(shopVisibleUnitNames.map(normalizeDecisionText));
      const itemBridgeRouteUnitNames = new Set(
        [...itemBridgeUnitNames, ...itemFamilyUnitNames].map(normalizeDecisionText),
      );
      const carryRouteUnitNames = new Set(carryUnitNames.map(normalizeDecisionText));
      const frontlineRouteUnitNames = new Set(frontlineUnitNames.map(normalizeDecisionText));
      const routeUnits = routeUnitNames.map((name) => {
        const normalizedName = normalizeDecisionText(name);
        const unit = units.find(
          (item) => normalizeDecisionText(item.name) === normalizeDecisionText(name),
        );
        const tags: GoldenSpatulaTransitionRouteUnitTag[] = [
          matchedRouteUnitNames.has(normalizedName) ? 'owned' : undefined,
          shopRouteUnitNames.has(normalizedName) ? 'shop' : undefined,
          itemBridgeRouteUnitNames.has(normalizedName) ? 'item' : undefined,
          carryRouteUnitNames.has(normalizedName) ? 'carry' : undefined,
          frontlineRouteUnitNames.has(normalizedName) ? 'frontline' : undefined,
        ].filter((tag): tag is GoldenSpatulaTransitionRouteUnitTag => Boolean(tag));
        return {
          name,
          itemNames: unit?.items?.slice(0, 3),
          tags,
        };
      });

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
          stageReachScore,
          itemBridgeScore,
          itemFamilyScore,
          structureScore,
          lowCostBridgeScore,
          costCurveScore,
          guideScore,
          coreReachRatio,
          spendPressurePenalty,
          highCostPressurePenalty,
          dreamPivotPenalty,
          spellCyclePenalty,
          lateralPivotBonus,
          pivotBlockedPenalty,
          beforePenalty,
          final: finalScore,
        },
        quality: source.quality,
        version: source.version,
        matchedUnitNames: Array.from(new Set(matchedUnitNames)).slice(0, 5),
        shopVisibleUnitNames: Array.from(new Set(shopVisibleUnitNames)).slice(0, 5),
        itemFitNames: Array.from(new Set(itemFitNames)).slice(0, 5),
        itemFamilyNames: Array.from(new Set(itemFamilyNames)).slice(0, 5),
        blockedUnitNames: Array.from(new Set(blockedUnitNames)).slice(0, 4),
        carryUnitNames: Array.from(new Set(carryUnitNames)).slice(0, 3),
        frontlineUnitNames: Array.from(new Set(frontlineUnitNames)).slice(0, 3),
        bridgeUnitNames: Array.from(new Set(bridgeUnitNames)).slice(0, 5),
        itemBridgeUnitNames: Array.from(new Set(itemBridgeUnitNames)).slice(0, 4),
        itemFamilyUnitNames: Array.from(new Set(itemFamilyUnitNames)).slice(0, 4),
        lowCostUnitNames: Array.from(new Set(lowCostUnitNames)).slice(0, 4),
        transitionPlanKind,
        costCurve,
        nextAction,
        riskLevel,
        economyPlan,
        readiness,
        primaryReasonNames,
        shopPriorityUnitNames,
        missingKeyUnitNames,
        routeUnitNames,
        routeUnits,
        tempoSteps,
        transitionHint,
        targetLevel: Math.min(10, targetLevel),
        averageCost,
        traitTags: sharedTraits.length > 0 ? sharedTraits.slice(0, 4) : traitTags.slice(0, 4),
      };
    })
    .filter((lineup) => {
      const hasActionableBridge =
        lineup.matchedUnitNames.length > 0 ||
        (lineup.shopVisibleUnitNames?.length ?? 0) > 0 ||
        (lineup.itemFitNames?.length ?? 0) > 0 ||
        (lineup.itemFamilyUnitNames?.length ?? 0) > 0 ||
        (lineup.bridgeUnitNames?.length ?? 0) > 0;
      const hasSafeReach =
        lineup.scoreBreakdown.coreReachRatio >= 0.7 &&
        lineup.scoreBreakdown.highCostPressurePenalty < 14;
      const earlyLateCapFantasy =
        tempoContext.tempoPhase === 'early' &&
        lineup.transitionPlanKind === 'lateCap' &&
        !hasActionableBridge;
      const costSpikeFantasy =
        (tempoContext.tempoPhase === 'early' || tempoContext.tempoPhase === 'mid') &&
        lineup.costCurve === 'spike' &&
        !hasActionableBridge;

      return (
        lineup.score > 24 &&
        !earlyLateCapFantasy &&
        !costSpikeFantasy &&
        (hasActionableBridge || lineup.scoreBreakdown.sharedTraitScore > 0 || hasSafeReach)
      );
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, maxTransitions);
}
