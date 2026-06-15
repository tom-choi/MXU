import type {
  GoldenSpatulaChampionAssetIndex,
  GoldenSpatulaDecisionReason,
  GoldenSpatulaDecisionRole,
  GoldenSpatulaLineupUnit,
  GoldenSpatulaLineupVariant,
  GoldenSpatulaManagedLineup,
  GoldenSpatulaRecommendedLineup,
} from '@/types/goldenSpatula';
import {
  collectGoldenSpatulaVariantUnits,
  extractGoldenSpatulaTraitTags,
  getGoldenSpatulaActiveRollTargetNames,
  getGoldenSpatulaChampionAssetCost,
  getGoldenSpatulaChampionAssetTraits,
  isGoldenSpatulaCarryUnit,
  isGoldenSpatulaFrontlineUnit,
  normalizeDecisionText,
} from './goldenSpatulaDecisionContext';
import type { GoldenSpatulaTransitionSourceVariant } from './goldenSpatulaTransitionModel';

export interface GoldenSpatulaCandidateAccumulator {
  name: string;
  score: number;
  roleScore: Record<GoldenSpatulaDecisionRole, number>;
  sourceLineupNames: Set<string>;
  recommendedItemNames: Set<string>;
  traitTags: Set<string>;
  reasons: Set<GoldenSpatulaDecisionReason>;
}

export interface GoldenSpatulaCandidateBuildInput {
  activeVariant?: GoldenSpatulaLineupVariant;
  sources: GoldenSpatulaTransitionSourceVariant[];
  championAssets?: GoldenSpatulaChampionAssetIndex;
}

export interface GoldenSpatulaCandidateBuildResult {
  candidates: Map<string, GoldenSpatulaCandidateAccumulator>;
  activeTargets: Set<string>;
  explicitTargets: Set<string>;
}

export interface GoldenSpatulaTransitionSourceBuildInput {
  managedLineups?: GoldenSpatulaManagedLineup[];
  recommendedLineups?: GoldenSpatulaRecommendedLineup[];
}

const roleOrder: GoldenSpatulaDecisionRole[] = [
  'carry',
  'frontline',
  'power',
  'trait',
  'transition',
];

function qualityWeight(quality: string | undefined): number {
  if (!quality) return 1;
  if (/s|t0|顶|强/u.test(quality)) return 1.22;
  if (/a|t1|优/u.test(quality)) return 1.12;
  if (/b|t2/u.test(quality)) return 1.04;
  return 1;
}

function addCandidateScore(
  candidates: Map<string, GoldenSpatulaCandidateAccumulator>,
  unit: GoldenSpatulaLineupUnit,
  amount: number,
  role: GoldenSpatulaDecisionRole,
  sourceName: string,
  reasons: GoldenSpatulaDecisionReason[],
  traitTags: string[],
  itemNames: string[] = [],
): GoldenSpatulaCandidateAccumulator {
  const key = normalizeDecisionText(unit.name);
  const candidate =
    candidates.get(key) ??
    ({
      name: unit.name,
      score: 0,
      roleScore: {
        carry: 0,
        frontline: 0,
        trait: 0,
        transition: 0,
        power: 0,
      },
      sourceLineupNames: new Set<string>(),
      recommendedItemNames: new Set<string>(),
      traitTags: new Set<string>(),
      reasons: new Set<GoldenSpatulaDecisionReason>(),
    } satisfies GoldenSpatulaCandidateAccumulator);

  candidate.score += amount;
  candidate.roleScore[role] += amount;
  candidate.sourceLineupNames.add(sourceName);
  for (const itemName of itemNames) {
    const normalizedItemName = normalizeDecisionText(itemName);
    if (normalizedItemName) candidate.recommendedItemNames.add(itemName);
  }
  for (const reason of reasons) candidate.reasons.add(reason);
  for (const tag of traitTags) candidate.traitTags.add(tag);
  candidates.set(key, candidate);
  return candidate;
}

export function decideGoldenSpatulaCandidateRole(
  candidate: GoldenSpatulaCandidateAccumulator,
): GoldenSpatulaDecisionRole {
  return [...roleOrder].sort((a, b) => candidate.roleScore[b] - candidate.roleScore[a])[0];
}

export function buildGoldenSpatulaTransitionSources({
  managedLineups,
  recommendedLineups,
}: GoldenSpatulaTransitionSourceBuildInput): GoldenSpatulaTransitionSourceVariant[] {
  const sources: GoldenSpatulaTransitionSourceVariant[] = [];

  for (const lineup of managedLineups ?? []) {
    for (const variant of lineup.variants) {
      if (collectGoldenSpatulaVariantUnits(variant).length === 0) continue;
      sources.push({
        lineupId: lineup.id,
        variantId: variant.id,
        name: lineup.name,
        quality: variant.quality,
        version: variant.version ?? lineup.source?.version,
        variant,
        weight: 0.9 * qualityWeight(variant.quality),
      });
    }
  }

  for (const lineup of recommendedLineups ?? []) {
    if (collectGoldenSpatulaVariantUnits(lineup.variant).length === 0) continue;
    sources.push({
      lineupId: lineup.id,
      variantId: lineup.variant.id,
      name: lineup.name,
      quality: lineup.quality,
      version: lineup.version,
      variant: lineup.variant,
      weight: 1.05 * qualityWeight(lineup.quality),
    });
  }

  return sources;
}

export function buildGoldenSpatulaCandidateSet({
  activeVariant,
  sources,
  championAssets,
}: GoldenSpatulaCandidateBuildInput): GoldenSpatulaCandidateBuildResult {
  const candidates = new Map<string, GoldenSpatulaCandidateAccumulator>();
  const activeUnits = activeVariant ? collectGoldenSpatulaVariantUnits(activeVariant) : [];
  const activeTargets = new Set(
    (activeVariant ? getGoldenSpatulaActiveRollTargetNames(activeVariant) : []).map(
      normalizeDecisionText,
    ),
  );
  const explicitTargets = new Set(
    (activeVariant && Array.isArray(activeVariant.rollTargetNames)
      ? activeVariant.rollTargetNames
      : []
    ).map(normalizeDecisionText),
  );
  const activeTraitTags = extractGoldenSpatulaTraitTags(activeVariant?.traitsSummary);

  if (activeVariant) {
    for (const unit of activeUnits) {
      const isCarry = isGoldenSpatulaCarryUnit(unit, activeVariant);
      const isFrontline = isGoldenSpatulaFrontlineUnit(unit, activeVariant);
      const role: GoldenSpatulaDecisionRole = isCarry
        ? 'carry'
        : isFrontline
          ? 'frontline'
          : 'trait';
      const reasons: GoldenSpatulaDecisionReason[] = ['activeLineup'];
      if (isCarry) reasons.push('activeCarry');
      if (isFrontline) reasons.push('activeFrontline');
      addCandidateScore(
        candidates,
        unit,
        isCarry ? 54 : isFrontline ? 42 : 28,
        role,
        activeVariant.name,
        reasons,
        activeTraitTags,
        unit.items,
      );
    }
  }

  for (const source of sources) {
    const sourceTraitTags = extractGoldenSpatulaTraitTags(source.variant.traitsSummary);
    for (const unit of collectGoldenSpatulaVariantUnits(source.variant)) {
      const key = normalizeDecisionText(unit.name);
      const isActive = activeUnits.some(
        (activeUnit) => normalizeDecisionText(activeUnit.name) === key,
      );
      const isCarry = isGoldenSpatulaCarryUnit(unit, source.variant);
      const isFrontline = isGoldenSpatulaFrontlineUnit(unit, source.variant);
      const sharedTraits = sourceTraitTags.filter((tag) => activeTraitTags.includes(tag));
      const cost = getGoldenSpatulaChampionAssetCost(unit.name, championAssets);
      const powerBonus = cost !== undefined && cost >= 4 ? 12 + cost * 2 : 0;
      const cheapBonus = cost !== undefined && cost <= 2 ? 8 : 0;
      const role: GoldenSpatulaDecisionRole = isCarry
        ? 'carry'
        : isFrontline
          ? 'frontline'
          : sharedTraits.length > 0
            ? 'trait'
            : cost !== undefined && cost >= 4
              ? 'power'
              : 'transition';
      const reasons: GoldenSpatulaDecisionReason[] = ['recommendedOverlap'];
      if (isCarry) reasons.push('recommendedCarry');
      if (sharedTraits.length > 0) reasons.push('traitBridge');
      if (cost !== undefined && cost >= 4) reasons.push('highCostPower');
      if (cost !== undefined && cost <= 2) reasons.push('cheapTransition');

      addCandidateScore(
        candidates,
        unit,
        (isActive ? 10 : 0) +
          (isCarry ? 22 : 0) +
          (isFrontline ? 16 : 0) +
          sharedTraits.length * 10 +
          powerBonus +
          cheapBonus +
          12 * source.weight,
        role,
        source.name,
        reasons,
        [...sourceTraitTags, ...getGoldenSpatulaChampionAssetTraits(unit.name, championAssets)].slice(
          0,
          6,
        ),
        unit.items,
      );
    }
  }

  return {
    candidates,
    activeTargets,
    explicitTargets,
  };
}
