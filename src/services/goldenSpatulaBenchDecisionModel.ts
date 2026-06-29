import type {
  GoldenSpatulaBenchCleanupReason,
  GoldenSpatulaBenchDecisionKind,
  GoldenSpatulaBenchInterestAdvice,
  GoldenSpatulaBenchSellCandidate,
  GoldenSpatulaHandRunState,
  GoldenSpatulaOwnedChampionState,
  GoldenSpatulaPickRecommendation,
} from '@/types/goldenSpatula';
import { normalizeDecisionText } from './goldenSpatulaDecisionContext';

interface GoldenSpatulaBenchInterestAdviceInput {
  handState?: GoldenSpatulaHandRunState;
  allPicks: GoldenSpatulaPickRecommendation[];
  interestGoldNeeded?: number;
  stage?: number;
  gold?: number;
}

interface GoldenSpatulaBenchCandidateContext {
  owned: GoldenSpatulaOwnedChampionState;
  pick?: GoldenSpatulaPickRecommendation;
  explicitTarget: boolean;
  stage?: number;
  gold?: number;
}

interface GoldenSpatulaBenchCleanupSignal {
  cleanupPriority?: number;
  cleanupReason?: GoldenSpatulaBenchCleanupReason;
}

function getSellGold(
  owned: GoldenSpatulaOwnedChampionState,
  pick: GoldenSpatulaPickRecommendation | undefined,
): number {
  const cost = owned.cost ?? pick?.cost ?? 1;
  if (!Number.isFinite(cost) || cost <= 0) return Math.max(1, owned.benchCount);
  return Math.max(1, owned.benchCount * cost);
}

function isDirectUpgradeContext({ owned, pick }: GoldenSpatulaBenchCandidateContext): boolean {
  if (owned.count > 0 && owned.count % 3 === 2) return true;
  return pick?.reasons.includes('nearUpgrade') ?? false;
}

function isCoreContext({ pick, explicitTarget }: GoldenSpatulaBenchCandidateContext): boolean {
  if (explicitTarget) return true;
  if (!pick) return false;
  return (
    pick.tier === 'core' ||
    pick.tier === 'high' ||
    pick.role === 'carry' ||
    pick.role === 'frontline' ||
    pick.reasons.includes('activeCarry') ||
    pick.reasons.includes('activeFrontline') ||
    pick.reasons.includes('recommendedCarry') ||
    pick.reasons.includes('itemFit') ||
    pick.reasons.includes('highCostPower')
  );
}

function classifyBenchCandidate(
  context: GoldenSpatulaBenchCandidateContext,
): GoldenSpatulaBenchDecisionKind {
  const directUpgrade = isDirectUpgradeContext(context);
  const core = isCoreContext(context);
  const coreTraitPair =
    directUpgrade &&
    context.pick !== undefined &&
    context.pick.role === 'trait' &&
    context.pick.reasons.includes('traitBridge') &&
    context.pick.score >= 34;

  if (directUpgrade && (core || coreTraitPair)) return 'directUpgrade';
  if (core) return 'core';
  if (directUpgrade) return 'pairBait';
  if (context.pick) return 'transition';
  return 'fantasy';
}

function canSellBenchCandidate(kind: GoldenSpatulaBenchDecisionKind): boolean {
  return kind === 'fantasy' || kind === 'pairBait' || kind === 'transition';
}

function hasBenchTransitionBridgeValue(
  pick: GoldenSpatulaPickRecommendation | undefined,
): boolean {
  if (!pick) return false;
  return (
    pick.reasons.includes('traitBridge') ||
    pick.reasons.includes('cheapTransition') ||
    pick.reasons.includes('itemFit') ||
    pick.reasons.includes('nearUpgrade') ||
    pick.role === 'carry' ||
    pick.role === 'frontline'
  );
}

function getBenchCleanupSignal(
  context: GoldenSpatulaBenchCandidateContext,
  kind: GoldenSpatulaBenchDecisionKind,
): GoldenSpatulaBenchCleanupSignal {
  if (!canSellBenchCandidate(kind)) return {};

  const lateCleanup = context.stage !== undefined && context.stage >= 4;
  if (lateCleanup && kind === 'pairBait') {
    return { cleanupPriority: 90, cleanupReason: 'stageFourPairBait' };
  }
  if (lateCleanup && kind === 'fantasy') {
    return {
      cleanupPriority: context.owned.count >= 2 ? 80 : 70,
      cleanupReason: 'stageFourDeadSingle',
    };
  }
  if (
    lateCleanup &&
    kind === 'transition' &&
    !hasBenchTransitionBridgeValue(context.pick) &&
    (context.pick?.score ?? 0) < 34
  ) {
    return {
      cleanupPriority: context.owned.count >= 2 ? 62 : 52,
      cleanupReason: 'stageFourDeadSingle',
    };
  }
  if (
    context.gold !== undefined &&
    context.gold < 20 &&
    kind === 'fantasy' &&
    context.owned.count <= 1
  ) {
    return { cleanupPriority: 35, cleanupReason: 'lowEconomyBenchTax' };
  }

  return {};
}

function buildBenchCandidate(
  context: GoldenSpatulaBenchCandidateContext,
): GoldenSpatulaBenchSellCandidate | undefined {
  const { owned, pick } = context;
  if (!owned.name || owned.benchCount <= 0 || owned.count <= 0) return undefined;

  const kind = classifyBenchCandidate(context);
  const cleanupSignal = getBenchCleanupSignal(context, kind);
  return {
    name: owned.name,
    count: owned.count,
    benchCount: owned.benchCount,
    sellGold: getSellGold(owned, pick),
    kind,
    ...cleanupSignal,
    score: pick?.score,
    reasons: pick?.reasons ?? [],
  };
}

function compareBenchSellCandidates(
  a: GoldenSpatulaBenchSellCandidate,
  b: GoldenSpatulaBenchSellCandidate,
): number {
  const kindPriority: Record<GoldenSpatulaBenchDecisionKind, number> = {
    fantasy: 0,
    pairBait: 1,
    transition: 2,
    directUpgrade: 3,
    core: 4,
  };
  return (
    kindPriority[a.kind] - kindPriority[b.kind] ||
    (a.score ?? 0) - (b.score ?? 0) ||
    b.sellGold - a.sellGold ||
    a.name.localeCompare(b.name)
  );
}

function compareBenchCleanupCandidates(
  a: GoldenSpatulaBenchSellCandidate,
  b: GoldenSpatulaBenchSellCandidate,
): number {
  return (b.cleanupPriority ?? 0) - (a.cleanupPriority ?? 0) || compareBenchSellCandidates(a, b);
}

function selectInterestSellCandidates(
  candidates: GoldenSpatulaBenchSellCandidate[],
  interestGoldNeeded: number | undefined,
): GoldenSpatulaBenchSellCandidate[] {
  const sellable = candidates.filter((candidate) => canSellBenchCandidate(candidate.kind));
  if (interestGoldNeeded === undefined || interestGoldNeeded <= 0) {
    const cleanupCandidates = sellable
      .filter((candidate) => (candidate.cleanupPriority ?? 0) > 0)
      .sort(compareBenchCleanupCandidates);
    return (cleanupCandidates.length > 0 ? cleanupCandidates : sellable).slice(0, 3);
  }

  const selected: GoldenSpatulaBenchSellCandidate[] = [];
  let accumulatedGold = 0;
  for (const candidate of sellable) {
    selected.push(candidate);
    accumulatedGold += candidate.sellGold;
    if (accumulatedGold >= interestGoldNeeded) break;
  }
  return selected;
}

export function buildGoldenSpatulaBenchInterestAdvice({
  handState,
  allPicks,
  interestGoldNeeded,
  stage,
  gold,
}: GoldenSpatulaBenchInterestAdviceInput): GoldenSpatulaBenchInterestAdvice | undefined {
  if (!handState) return undefined;

  const pickByName = new Map(
    allPicks.map((pick) => [normalizeDecisionText(pick.name), pick] as const),
  );
  const targetNames = new Set(handState.targetNames.map(normalizeDecisionText));
  const candidates = Object.values(handState.owned)
    .map((owned) =>
      buildBenchCandidate({
        owned,
        pick: pickByName.get(normalizeDecisionText(owned.name)),
        explicitTarget: targetNames.has(normalizeDecisionText(owned.name)),
        stage,
        gold,
      }),
    )
    .filter((candidate): candidate is GoldenSpatulaBenchSellCandidate => candidate !== undefined)
    .sort(compareBenchSellCandidates);

  const sellable = candidates.filter((candidate) => canSellBenchCandidate(candidate.kind));
  const cleanupCandidates = sellable
    .filter((candidate) => (candidate.cleanupPriority ?? 0) > 0)
    .sort(compareBenchCleanupCandidates);
  const sellGoldAvailable = sellable.reduce((sum, candidate) => sum + candidate.sellGold, 0);
  const canReachNextInterest =
    interestGoldNeeded !== undefined &&
    interestGoldNeeded > 0 &&
    sellGoldAvailable >= interestGoldNeeded;

  return {
    interestGoldNeeded,
    sellGoldAvailable,
    canReachNextInterest,
    cleanupRecommended: cleanupCandidates.length > 0,
    cleanupCandidateNames: cleanupCandidates.slice(0, 5).map((candidate) => candidate.name),
    decisionTaxCount: cleanupCandidates.filter(
      (candidate) =>
        candidate.cleanupReason === 'stageFourDeadSingle' ||
        candidate.cleanupReason === 'stageFourPairBait',
    ).length,
    benchTaxGold: cleanupCandidates.reduce((sum, candidate) => sum + candidate.sellGold, 0),
    sellCandidates: selectInterestSellCandidates(candidates, interestGoldNeeded),
    preservedNames: candidates
      .filter((candidate) => !canSellBenchCandidate(candidate.kind))
      .slice(0, 4)
      .map((candidate) => candidate.name),
  };
}
