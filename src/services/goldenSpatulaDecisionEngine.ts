import type {
  GoldenSpatulaChampionAssetIndex,
  GoldenSpatulaDecisionConfidence,
  GoldenSpatulaDecisionPlan,
  GoldenSpatulaDecisionReason,
  GoldenSpatulaDecisionRole,
  GoldenSpatulaDecisionTier,
  GoldenSpatulaEconomyDecisionAction,
  GoldenSpatulaEconomyDecisionAdvice,
  GoldenSpatulaEconomyRunState,
  GoldenSpatulaHandRunState,
  GoldenSpatulaLineupUnit,
  GoldenSpatulaLineupVariant,
  GoldenSpatulaManagedLineup,
  GoldenSpatulaOwnedChampionState,
  GoldenSpatulaPickRecommendation,
  GoldenSpatulaRecommendedLineup,
  GoldenSpatulaShopOddsAvailability,
  GoldenSpatulaTransitionLineupRecommendation,
} from '@/types/goldenSpatula';

export interface GoldenSpatulaDecisionInput {
  activeVariant?: GoldenSpatulaLineupVariant;
  managedLineups?: GoldenSpatulaManagedLineup[];
  recommendedLineups?: GoldenSpatulaRecommendedLineup[];
  championAssets?: GoldenSpatulaChampionAssetIndex;
  handState?: GoldenSpatulaHandRunState;
  economyState?: GoldenSpatulaEconomyRunState;
  maxPicks?: number;
  maxTransitions?: number;
}

interface SourceVariant {
  lineupId: string;
  variantId: string;
  name: string;
  quality?: string;
  version?: string;
  variant: GoldenSpatulaLineupVariant;
  weight: number;
}

interface CandidateAccumulator {
  name: string;
  score: number;
  roleScore: Record<GoldenSpatulaDecisionRole, number>;
  sourceLineupNames: Set<string>;
  traitTags: Set<string>;
  reasons: Set<GoldenSpatulaDecisionReason>;
}

const roleOrder: GoldenSpatulaDecisionRole[] = [
  'carry',
  'frontline',
  'power',
  'trait',
  'transition',
];

const reasonOrder: GoldenSpatulaDecisionReason[] = [
  'levelLocked',
  'levelOdds',
  'nearUpgrade',
  'activeCarry',
  'activeFrontline',
  'recommendedCarry',
  'traitBridge',
  'highCostPower',
  'cheapTransition',
  'owned',
  'activeLineup',
  'recommendedOverlap',
];

const shopOddsByLevel: Record<number, Record<number, number>> = {
  1: { 1: 1, 2: 0, 3: 0, 4: 0, 5: 0 },
  2: { 1: 1, 2: 0, 3: 0, 4: 0, 5: 0 },
  3: { 1: 0.75, 2: 0.25, 3: 0, 4: 0, 5: 0 },
  4: { 1: 0.55, 2: 0.3, 3: 0.15, 4: 0, 5: 0 },
  5: { 1: 0.45, 2: 0.33, 3: 0.2, 4: 0.02, 5: 0 },
  6: { 1: 0.3, 2: 0.4, 3: 0.25, 4: 0.05, 5: 0 },
  7: { 1: 0.19, 2: 0.3, 3: 0.4, 4: 0.1, 5: 0.01 },
  8: { 1: 0.18, 2: 0.25, 3: 0.32, 4: 0.22, 5: 0.03 },
  9: { 1: 0.1, 2: 0.2, 3: 0.25, 4: 0.35, 5: 0.1 },
  10: { 1: 0.05, 2: 0.1, 3: 0.2, 4: 0.4, 5: 0.25 },
  11: { 1: 0.01, 2: 0.02, 3: 0.12, 4: 0.5, 5: 0.35 },
};

function normalizeDecisionText(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function isDisplayableUnit(unit: GoldenSpatulaLineupUnit): boolean {
  if (!unit.name) return false;
  if (unit.type && unit.type !== 'hero') return false;
  if (unit.needsReview) return false;
  if (/^æœªè§£æžæ£‹å­\s*\d+/u.test(unit.name) || unit.name === 'åœ£ç‰©' || unit.name === 'è–ç‰©') {
    return false;
  }
  return true;
}

function collectVariantUnits(variant: GoldenSpatulaLineupVariant): GoldenSpatulaLineupUnit[] {
  const seen = new Set<string>();
  return [...variant.frontliners, ...variant.mainCarries, ...variant.units].filter((unit) => {
    const key = normalizeDecisionText(unit.name);
    if (!key || seen.has(key) || !isDisplayableUnit(unit)) return false;
    seen.add(key);
    return true;
  });
}

function unitInList(unit: GoldenSpatulaLineupUnit, list: GoldenSpatulaLineupUnit[]): boolean {
  const key = normalizeDecisionText(unit.name);
  return list.some((item) => normalizeDecisionText(item.name) === key);
}

function isCarryUnit(unit: GoldenSpatulaLineupUnit, variant: GoldenSpatulaLineupVariant): boolean {
  return Boolean(unit.isCarry) || unitInList(unit, variant.mainCarries);
}

function isFrontlineUnit(
  unit: GoldenSpatulaLineupUnit,
  variant: GoldenSpatulaLineupVariant,
): boolean {
  return unitInList(unit, variant.frontliners);
}

function getActiveRollTargetNames(variant: GoldenSpatulaLineupVariant): string[] {
  if (Array.isArray(variant.rollTargetNames)) return variant.rollTargetNames;
  const seen = new Set<string>();
  return [...variant.mainCarries, ...variant.frontliners, ...variant.units]
    .filter((unit) => {
      const key = normalizeDecisionText(unit.name);
      if (!key || seen.has(key) || !isDisplayableUnit(unit)) return false;
      const priority =
        isCarryUnit(unit, variant) ||
        isFrontlineUnit(unit, variant) ||
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
  for (const match of value.matchAll(/\d+([\p{Script=Han}A-Za-z·]{2,12})/gu)) {
    const tag = match[1]?.trim();
    if (tag) tags.add(tag);
  }
  return Array.from(tags).slice(0, 8);
}

function getChampionAssetCost(
  name: string,
  championAssets: GoldenSpatulaChampionAssetIndex | undefined,
): number | undefined {
  return championAssets?.[normalizeDecisionText(name)]?.cost;
}

function getChampionAssetTraits(
  name: string,
  championAssets: GoldenSpatulaChampionAssetIndex | undefined,
): string[] {
  return championAssets?.[normalizeDecisionText(name)]?.traits ?? [];
}

function getOwnedState(
  name: string,
  handState: GoldenSpatulaHandRunState | undefined,
): GoldenSpatulaOwnedChampionState | undefined {
  const key = normalizeDecisionText(name);
  return Object.values(handState?.owned ?? {}).find(
    (item) => normalizeDecisionText(item.name) === key,
  );
}

function getOwnedCount(name: string, handState: GoldenSpatulaHandRunState | undefined): number {
  const owned = getOwnedState(name, handState);
  return owned?.count ?? 0;
}

function qualityWeight(quality: string | undefined): number {
  if (!quality) return 1;
  if (/s|t0|顶|强/u.test(quality)) return 1.22;
  if (/a|t1|优/u.test(quality)) return 1.12;
  if (/b|t2/u.test(quality)) return 1.04;
  return 1;
}

function addCandidateScore(
  candidates: Map<string, CandidateAccumulator>,
  unit: GoldenSpatulaLineupUnit,
  amount: number,
  role: GoldenSpatulaDecisionRole,
  sourceName: string,
  reasons: GoldenSpatulaDecisionReason[],
  traitTags: string[],
): CandidateAccumulator {
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
      traitTags: new Set<string>(),
      reasons: new Set<GoldenSpatulaDecisionReason>(),
    } satisfies CandidateAccumulator);

  candidate.score += amount;
  candidate.roleScore[role] += amount;
  candidate.sourceLineupNames.add(sourceName);
  for (const reason of reasons) candidate.reasons.add(reason);
  for (const tag of traitTags) candidate.traitTags.add(tag);
  candidates.set(key, candidate);
  return candidate;
}

function decideRole(candidate: CandidateAccumulator): GoldenSpatulaDecisionRole {
  return [...roleOrder].sort((a, b) => candidate.roleScore[b] - candidate.roleScore[a])[0];
}

function decideTier(score: number): GoldenSpatulaDecisionTier {
  if (score >= 82) return 'core';
  if (score >= 62) return 'high';
  if (score >= 42) return 'medium';
  return 'watch';
}

function sortReasons(
  reasons: Iterable<GoldenSpatulaDecisionReason>,
): GoldenSpatulaDecisionReason[] {
  const priority = new Map(reasonOrder.map((reason, index) => [reason, index]));
  return Array.from(reasons).sort((a, b) => (priority.get(a) ?? 999) - (priority.get(b) ?? 999));
}

function targetCopiesForUnit(
  role: GoldenSpatulaDecisionRole,
  cost: number | undefined,
  activeTarget: boolean,
): number {
  if (activeTarget && cost !== undefined && cost <= 3) return 9;
  if (role === 'carry' && cost !== undefined && cost <= 3) return 9;
  if (role === 'frontline' && cost !== undefined && cost <= 2) return 9;
  if (cost !== undefined && cost >= 4) return 2;
  return activeTarget ? 6 : 3;
}

export function getGoldenSpatulaShopOdds(
  level: number | undefined,
  cost: number | undefined,
): number | undefined {
  if (level === undefined || cost === undefined || cost < 1 || cost > 5) return undefined;
  const normalizedLevel = Math.max(1, Math.min(11, Math.trunc(level)));
  return shopOddsByLevel[normalizedLevel]?.[cost] ?? 0;
}

function getShopOddsAvailability(
  level: number | undefined,
  cost: number | undefined,
): GoldenSpatulaShopOddsAvailability {
  const odds = getGoldenSpatulaShopOdds(level, cost);
  if (odds === undefined) return 'unknown';
  if (odds <= 0) return 'unavailable';
  if (odds <= 0.03) return 'rare';
  return 'available';
}

function getShopOddsScoreMultiplier(
  availability: GoldenSpatulaShopOddsAvailability,
  odds: number | undefined,
): number {
  if (availability === 'unknown') return 1;
  if (availability === 'unavailable') return 0.12;
  if (availability === 'rare') return 0.55;
  if (odds === undefined) return 1;
  return Math.min(1.18, 0.72 + odds);
}

function getRollTargetPriority({
  score,
  role,
  cost,
  ownedCount,
  targetCount,
  copiesNeeded,
  currentLevel,
  shopOdds,
  shopOddsAvailability,
  activeTarget,
  reasons,
}: {
  score: number;
  role: GoldenSpatulaDecisionRole;
  cost?: number;
  ownedCount: number;
  targetCount: number;
  copiesNeeded: number;
  currentLevel?: number;
  shopOdds?: number;
  shopOddsAvailability: GoldenSpatulaShopOddsAvailability;
  activeTarget: boolean;
  reasons: GoldenSpatulaDecisionReason[];
}): number {
  if (copiesNeeded <= 0 || ownedCount >= targetCount) return 0;
  if (shopOddsAvailability === 'unavailable') return 0;

  const reasonSet = new Set(reasons);
  let priority = score;

  if (role === 'carry') priority += 38;
  if (role === 'frontline') priority += 24;
  if (role === 'power') priority += 14;
  if (activeTarget) priority += 18;
  if (reasonSet.has('nearUpgrade')) priority += 36;
  if (reasonSet.has('activeCarry')) priority += 24;
  if (reasonSet.has('activeFrontline')) priority += 14;
  if (reasonSet.has('recommendedCarry')) priority += 18;
  if (reasonSet.has('traitBridge')) priority += 8;
  if (ownedCount > 0) priority += Math.min(ownedCount * 4, 18);
  if (copiesNeeded <= 1) priority += 24;
  else if (copiesNeeded <= 2) priority += 16;
  else if (copiesNeeded <= 3) priority += 8;
  if (shopOdds !== undefined) priority += Math.round(shopOdds * 30);
  if (shopOddsAvailability === 'rare') priority -= 24;
  if (cost !== undefined && cost >= 4 && currentLevel !== undefined && currentLevel < 8) {
    priority -= 14;
  }

  return Math.max(0, Math.round(priority));
}

function sourceVariantsFromInput(input: GoldenSpatulaDecisionInput): SourceVariant[] {
  const sources: SourceVariant[] = [];

  for (const lineup of input.managedLineups ?? []) {
    for (const variant of lineup.variants) {
      if (collectVariantUnits(variant).length === 0) continue;
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

  for (const lineup of input.recommendedLineups ?? []) {
    if (collectVariantUnits(lineup.variant).length === 0) continue;
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

function findMissingInterestGold(gold: number | undefined): number | undefined {
  if (gold === undefined || gold >= 50) return undefined;
  const nextTier = Math.min(50, Math.ceil((gold + 1) / 10) * 10);
  return Math.max(0, nextTier - gold);
}

function buildEconomyAdvice(
  picks: GoldenSpatulaPickRecommendation[],
  economyState: GoldenSpatulaEconomyRunState | undefined,
): GoldenSpatulaEconomyDecisionAdvice {
  const highPriorityPicks = picks
    .filter((pick) => pick.tier === 'core' || pick.tier === 'high')
    .filter((pick) => pick.copiesNeeded > 0)
    .slice(0, 3);
  const urgentPicks = highPriorityPicks.filter(
    (pick) => pick.shopOddsAvailability !== 'unavailable',
  );
  const levelLockedPicks = picks
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
  const hasNearUpgrade = urgentPicks.some((pick) => pick.reasons.includes('nearUpgrade'));
  const highCostPlan = urgentPicks.some((pick) => (pick.cost ?? 0) >= 4);
  const reasons = new Set<GoldenSpatulaDecisionReason>();
  for (const pick of [...urgentPicks, ...levelLockedPicks]) {
    for (const reason of pick.reasons) reasons.add(reason);
  }

  let action: GoldenSpatulaEconomyDecisionAction = 'hold';
  let confidence: GoldenSpatulaDecisionConfidence = urgentPicks.length > 0 ? 'medium' : 'low';
  let recommendedRollCount = 0;

  if (urgentPicks.length === 0 && levelLockedPicks.length > 0 && level !== undefined && level < 8) {
    action = gold === undefined || gold >= 24 ? 'level' : 'save';
    confidence = 'high';
    recommendedRollCount = 0;
  } else if (hasNearUpgrade && (gold === undefined || gold >= 20)) {
    action = 'roll';
    confidence = 'high';
    recommendedRollCount = gold !== undefined && gold >= 50 ? 5 : 3;
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
  } else if (
    gold !== undefined &&
    (gold < 30 || (interestGoldNeeded !== undefined && interestGoldNeeded <= 2))
  ) {
    action = 'save';
    confidence = urgentPicks.length > 0 ? 'medium' : 'high';
    recommendedRollCount = 0;
  }

  return {
    action,
    confidence,
    recommendedRollCount,
    gold,
    level,
    interestGoldNeeded,
    urgentPickNames:
      urgentPicks.length > 0
        ? urgentPicks.map((pick) => pick.name)
        : levelLockedPicks.map((pick) => pick.name),
    reasons: sortReasons(reasons).slice(0, 4),
  };
}

function rankTransitionLineups(
  sources: SourceVariant[],
  activeVariant: GoldenSpatulaLineupVariant | undefined,
  handState: GoldenSpatulaHandRunState | undefined,
  maxTransitions: number,
): GoldenSpatulaTransitionLineupRecommendation[] {
  const activeUnitNames = new Set(
    (activeVariant ? collectVariantUnits(activeVariant) : []).map((unit) =>
      normalizeDecisionText(unit.name),
    ),
  );
  const activeTraitTags = new Set(extractGoldenSpatulaTraitTags(activeVariant?.traitsSummary));

  return sources
    .map((source) => {
      const units = collectVariantUnits(source.variant);
      const matchedUnitNames = units
        .filter((unit) => {
          const key = normalizeDecisionText(unit.name);
          return activeUnitNames.has(key) || getOwnedCount(unit.name, handState) > 0;
        })
        .map((unit) => unit.name);
      const traitTags = extractGoldenSpatulaTraitTags(source.variant.traitsSummary);
      const sharedTraits = traitTags.filter((tag) => activeTraitTags.has(tag));
      const carryBonus = source.variant.mainCarries.some(
        (unit) =>
          activeUnitNames.has(normalizeDecisionText(unit.name)) ||
          getOwnedCount(unit.name, handState) > 0,
      )
        ? 18
        : 0;
      const score =
        matchedUnitNames.length * 18 +
        sharedTraits.length * 12 +
        carryBonus +
        units.length * 1.5 +
        source.weight * 10;

      return {
        lineupId: source.lineupId,
        variantId: source.variantId,
        name: source.name,
        score: Math.round(score),
        quality: source.quality,
        version: source.version,
        matchedUnitNames: Array.from(new Set(matchedUnitNames)).slice(0, 5),
        traitTags: sharedTraits.length > 0 ? sharedTraits.slice(0, 4) : traitTags.slice(0, 4),
      };
    })
    .filter((lineup) => lineup.score > 18)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxTransitions);
}

export function buildGoldenSpatulaDecisionPlan(
  input: GoldenSpatulaDecisionInput,
): GoldenSpatulaDecisionPlan {
  const maxPicks = input.maxPicks ?? 8;
  const maxTransitions = input.maxTransitions ?? 3;
  const candidates = new Map<string, CandidateAccumulator>();
  const sources = sourceVariantsFromInput(input);
  const activeVariant = input.activeVariant;
  const currentLevel = input.economyState?.level;
  const activeUnits = activeVariant ? collectVariantUnits(activeVariant) : [];
  const activeTargets = new Set(
    (activeVariant ? getActiveRollTargetNames(activeVariant) : []).map(normalizeDecisionText),
  );
  const activeTraitTags = extractGoldenSpatulaTraitTags(activeVariant?.traitsSummary);

  if (activeVariant) {
    for (const unit of activeUnits) {
      const isCarry = isCarryUnit(unit, activeVariant);
      const isFrontline = isFrontlineUnit(unit, activeVariant);
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
      );
    }
  }

  for (const source of sources) {
    const sourceTraitTags = extractGoldenSpatulaTraitTags(source.variant.traitsSummary);
    for (const unit of collectVariantUnits(source.variant)) {
      const key = normalizeDecisionText(unit.name);
      const isActive = activeUnits.some(
        (activeUnit) => normalizeDecisionText(activeUnit.name) === key,
      );
      const isCarry = isCarryUnit(unit, source.variant);
      const isFrontline = isFrontlineUnit(unit, source.variant);
      const sharedTraits = sourceTraitTags.filter((tag) => activeTraitTags.includes(tag));
      const cost = getChampionAssetCost(unit.name, input.championAssets);
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
        [...sourceTraitTags, ...getChampionAssetTraits(unit.name, input.championAssets)].slice(
          0,
          6,
        ),
      );
    }
  }

  const allPicks = Array.from(candidates.values())
    .map((candidate): GoldenSpatulaPickRecommendation => {
      const cost = getChampionAssetCost(candidate.name, input.championAssets);
      const shopOdds = getGoldenSpatulaShopOdds(currentLevel, cost);
      const shopOddsAvailability = getShopOddsAvailability(currentLevel, cost);
      const ownedState = getOwnedState(candidate.name, input.handState);
      const ownedCount = ownedState?.count ?? 0;
      const activeTarget = activeTargets.has(normalizeDecisionText(candidate.name));
      const role = decideRole(candidate);
      const targetCount = targetCopiesForUnit(role, cost, activeTarget);
      const nearUpgrade = ownedCount > 0 && ownedCount < targetCount && ownedCount % 3 === 2;
      const completePenalty = ownedCount >= targetCount ? 26 : 0;
      const ownedBonus = ownedCount > 0 ? Math.min(ownedCount * 4, 18) : 0;
      const nearUpgradeBonus = nearUpgrade ? 24 : 0;
      if (ownedCount > 0) candidate.reasons.add('owned');
      if (nearUpgrade) candidate.reasons.add('nearUpgrade');
      if (shopOddsAvailability === 'unavailable') candidate.reasons.add('levelLocked');
      if (shopOddsAvailability === 'rare') candidate.reasons.add('levelOdds');
      const oddsMultiplier = getShopOddsScoreMultiplier(shopOddsAvailability, shopOdds);

      const finalScore = Math.max(
        0,
        Math.round(
          (candidate.score + ownedBonus + nearUpgradeBonus - completePenalty) * oddsMultiplier,
        ),
      );
      const reasons = sortReasons(candidate.reasons).slice(0, 5);
      const rollTargetPriority = getRollTargetPriority({
        score: finalScore,
        role,
        cost,
        ownedCount,
        targetCount,
        copiesNeeded: Math.max(0, targetCount - ownedCount),
        currentLevel,
        shopOdds,
        shopOddsAvailability,
        activeTarget,
        reasons,
      });

      return {
        name: candidate.name,
        score: finalScore,
        tier: decideTier(finalScore),
        role,
        cost,
        ownedCount,
        ownedConfidence: ownedState?.confidence,
        targetCount,
        copiesNeeded: Math.max(0, targetCount - ownedCount),
        rollTargetPriority,
        currentLevel,
        shopOdds,
        shopOddsAvailability,
        traitTags: Array.from(candidate.traitTags).slice(0, 4),
        sourceLineupNames: Array.from(candidate.sourceLineupNames).slice(0, 3),
        reasons,
      };
    })
    .sort((a, b) => b.score - a.score || a.copiesNeeded - b.copiesNeeded);

  const picks = allPicks.slice(0, maxPicks);
  const recommendedRollTargetNames = allPicks
    .filter((pick) => pick.rollTargetPriority > 0)
    .sort(
      (a, b) =>
        b.rollTargetPriority - a.rollTargetPriority ||
        b.score - a.score ||
        a.copiesNeeded - b.copiesNeeded,
    )
    .slice(0, Math.max(3, Math.min(maxPicks, 8)))
    .map((pick) => pick.name);

  return {
    generatedAt: Date.now(),
    evaluatedCandidates: candidates.size,
    evaluatedLineups: sources.length,
    picks,
    recommendedRollTargetNames,
    transitionLineups: rankTransitionLineups(
      sources,
      activeVariant,
      input.handState,
      maxTransitions,
    ),
    economyAdvice: buildEconomyAdvice(picks, input.economyState),
  };
}
