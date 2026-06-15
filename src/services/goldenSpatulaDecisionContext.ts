import type {
  GoldenSpatulaChampionAssetIndex,
  GoldenSpatulaEconomyRunState,
  GoldenSpatulaHandRunState,
  GoldenSpatulaKnowledgeScanState,
  GoldenSpatulaLineupUnit,
  GoldenSpatulaLineupVariant,
  GoldenSpatulaOwnedChampionState,
  GoldenSpatulaShopOddsAvailability,
  GoldenSpatulaShopOddsSource,
} from '@/types/goldenSpatula';
import { normalizeGoldenSpatulaOdds } from './goldenSpatulaAcquisitionModel';
import { getGoldenSpatulaShopOddsForCost } from './goldenSpatulaShopOdds';

export function normalizeDecisionText(value: string): string {
  return value.trim().toLocaleLowerCase();
}

export function isGoldenSpatulaDisplayableUnit(unit: GoldenSpatulaLineupUnit): boolean {
  if (!unit.name) return false;
  if (unit.type && unit.type !== 'hero') return false;
  if (unit.needsReview) return false;
  if (
    /^\u00e6\u0153\u00aa\u00e8\u00a7\u00a3\u00e6\u017e\u0090\u00e6\u00a3\u2039\u00e5\u00ad\u0090\s*\d+/u.test(
      unit.name,
    ) ||
    unit.name === '\u00e5\u0153\u00a3\u00e7\u2030\u00a9' ||
    unit.name === '\u00e8\u0081\u2013\u00e7\u2030\u00a9'
  ) {
    return false;
  }
  return true;
}

export function collectGoldenSpatulaVariantUnits(
  variant: GoldenSpatulaLineupVariant,
): GoldenSpatulaLineupUnit[] {
  const unitIndexes = new Map<string, number>();
  const units: GoldenSpatulaLineupUnit[] = [];

  for (const unit of [...variant.frontliners, ...variant.mainCarries, ...variant.units]) {
    const key = normalizeDecisionText(unit.name);
    if (!key || !isGoldenSpatulaDisplayableUnit(unit)) continue;

    const existingIndex = unitIndexes.get(key);
    if (existingIndex === undefined) {
      unitIndexes.set(key, units.length);
      units.push(unit);
      continue;
    }

    units[existingIndex] = preferCompleteLineupUnit(units[existingIndex], unit);
  }

  return units;
}

function lineupUnitCompletenessScore(unit: GoldenSpatulaLineupUnit): number {
  return (
    (unit.items?.length ?? 0) * 10 +
    (unit.isCarry ? 4 : 0) +
    (unit.location ? 2 : 0) +
    (unit.type ? 1 : 0)
  );
}

function preferCompleteLineupUnit(
  current: GoldenSpatulaLineupUnit,
  candidate: GoldenSpatulaLineupUnit,
): GoldenSpatulaLineupUnit {
  const currentScore = lineupUnitCompletenessScore(current);
  const candidateScore = lineupUnitCompletenessScore(candidate);
  const preferred = candidateScore > currentScore ? candidate : current;
  const fallback = preferred === candidate ? current : candidate;

  return {
    ...fallback,
    ...preferred,
    items:
      (preferred.items?.length ?? 0) > 0
        ? preferred.items
        : (fallback.items?.length ?? 0) > 0
          ? fallback.items
          : preferred.items,
    isCarry: Boolean(current.isCarry || candidate.isCarry),
    location: preferred.location ?? fallback.location,
  };
}

function unitInList(unit: GoldenSpatulaLineupUnit, list: GoldenSpatulaLineupUnit[]): boolean {
  const key = normalizeDecisionText(unit.name);
  return list.some((item) => normalizeDecisionText(item.name) === key);
}

export function isGoldenSpatulaCarryUnit(
  unit: GoldenSpatulaLineupUnit,
  variant: GoldenSpatulaLineupVariant,
): boolean {
  return Boolean(unit.isCarry) || unitInList(unit, variant.mainCarries);
}

export function isGoldenSpatulaFrontlineUnit(
  unit: GoldenSpatulaLineupUnit,
  variant: GoldenSpatulaLineupVariant,
): boolean {
  return unitInList(unit, variant.frontliners);
}

export function getGoldenSpatulaActiveRollTargetNames(
  variant: GoldenSpatulaLineupVariant,
): string[] {
  if (Array.isArray(variant.rollTargetNames)) return variant.rollTargetNames;
  const seen = new Set<string>();
  return [...variant.mainCarries, ...variant.frontliners, ...variant.units]
    .filter((unit) => {
      const key = normalizeDecisionText(unit.name);
      if (!key || seen.has(key) || !isGoldenSpatulaDisplayableUnit(unit)) return false;
      const priority =
        isGoldenSpatulaCarryUnit(unit, variant) ||
        isGoldenSpatulaFrontlineUnit(unit, variant) ||
        Boolean(unit.isCarry) ||
        (unit.items?.length ?? 0) > 0;
      if (!priority) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 8)
    .map((unit) => unit.name);
}

export function extractGoldenSpatulaTraitTags(value: string | undefined): string[] {
  if (!value) return [];
  const tags = new Set<string>();
  for (const match of value.matchAll(/\d+([\p{Script=Han}A-Za-z\u00b7]{2,12})/gu)) {
    const tag = match[1]?.trim();
    if (tag) tags.add(tag);
  }
  return Array.from(tags).slice(0, 8);
}

export function getGoldenSpatulaChampionAssetCost(
  name: string,
  championAssets: GoldenSpatulaChampionAssetIndex | undefined,
): number | undefined {
  return championAssets?.[normalizeDecisionText(name)]?.cost;
}

export function getGoldenSpatulaChampionAssetTraits(
  name: string,
  championAssets: GoldenSpatulaChampionAssetIndex | undefined,
): string[] {
  return championAssets?.[normalizeDecisionText(name)]?.traits ?? [];
}

export function getGoldenSpatulaOwnedState(
  name: string,
  handState: GoldenSpatulaHandRunState | undefined,
): GoldenSpatulaOwnedChampionState | undefined {
  const key = normalizeDecisionText(name);
  return Object.values(handState?.owned ?? {}).find(
    (item) => normalizeDecisionText(item.name) === key,
  );
}

export function getGoldenSpatulaOwnedCount(
  name: string,
  handState: GoldenSpatulaHandRunState | undefined,
): number {
  const owned = getGoldenSpatulaOwnedState(name, handState);
  return owned?.count ?? 0;
}

export function getGoldenSpatulaShopVisibleCount(
  name: string,
  knowledgeState: GoldenSpatulaKnowledgeScanState | undefined,
): number {
  const key = normalizeDecisionText(name);
  if (!key) return 0;
  return Object.values(knowledgeState?.shopSlots ?? {}).filter(
    (slot) =>
      slot.confidence === 'matched' && normalizeDecisionText(slot.championName ?? '') === key,
  ).length;
}

export function getGoldenSpatulaShopOdds(
  level: number | undefined,
  cost: number | undefined,
  observedOdds?: number,
): number | undefined {
  const normalizedObservedOdds = normalizeGoldenSpatulaOdds(observedOdds);
  if (normalizedObservedOdds !== undefined) return normalizedObservedOdds;
  if (level === undefined || cost === undefined || cost < 1 || cost > 5) return undefined;
  return getGoldenSpatulaShopOddsForCost(level, cost as 1 | 2 | 3 | 4 | 5);
}

export function getGoldenSpatulaShopOddsAvailability(
  level: number | undefined,
  cost: number | undefined,
  observedOdds?: number,
): GoldenSpatulaShopOddsAvailability {
  const odds = getGoldenSpatulaShopOdds(level, cost, observedOdds);
  if (odds === undefined) return 'unknown';
  if (odds <= 0) return 'unavailable';
  if (odds <= 0.03) return 'rare';
  return 'available';
}

export function getGoldenSpatulaObservedShopOdds(
  economyState: GoldenSpatulaEconomyRunState | undefined,
  cost: number | undefined,
): number | undefined {
  if (cost === undefined || cost < 1 || cost > 5) return undefined;
  return normalizeGoldenSpatulaOdds(economyState?.shopOdds?.[cost as 1 | 2 | 3 | 4 | 5]);
}

export function getGoldenSpatulaShopOddsSource(
  level: number | undefined,
  observedOdds: number | undefined,
  observedSource: GoldenSpatulaShopOddsSource | undefined,
): GoldenSpatulaShopOddsSource | undefined {
  if (observedOdds !== undefined) return observedSource ?? 'ocr';
  if (level !== undefined) return 'levelTable';
  return undefined;
}

export function getGoldenSpatulaObservedShopOddsSource(
  economyState: GoldenSpatulaEconomyRunState | undefined,
  cost: number | undefined,
): GoldenSpatulaShopOddsSource | undefined {
  if (getGoldenSpatulaObservedShopOdds(economyState, cost) === undefined) return undefined;
  return economyState?.shopOddsSource ?? 'ocr';
}
