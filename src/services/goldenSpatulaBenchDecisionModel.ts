import type {
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
}

interface GoldenSpatulaBenchCandidateContext {
  owned: GoldenSpatulaOwnedChampionState;
  pick?: GoldenSpatulaPickRecommendation;
  explicitTarget: boolean;
}

function getSellGold(
  owned: GoldenSpatulaOwnedChampionState,
  pick: GoldenSpatulaPickRecommendation | undefined,
): number {
  const cost = owned.cost ?? pick?.cost ?? 1;
  if (!Number.isFinite(cost) || cost <= 0) return Math.max(1, owned.benchCount);
  return Math.max(1, owned.benchCount * cost);
}

function isDirectUpgradeContext({
  owned,
  pick,
}: GoldenSpatulaBenchCandidateContext): boolean {
  if (owned.count > 0 && owned.count % 3 === 2) return true;
  return pick?.reasons.includes('nearUpgrade') ?? false;
}

function isCoreContext({
  pick,
  explicitTarget,
}: GoldenSpatulaBenchCandidateContext): boolean {
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
  if (isDirectUpgradeContext(context)) return 'directUpgrade';
  if (isCoreContext(context)) return 'core';
  if (context.pick) return 'transition';
  return 'fantasy';
}

function canSellBenchCandidate(kind: GoldenSpatulaBenchDecisionKind): boolean {
  return kind === 'fantasy' || kind === 'transition';
}

function buildBenchCandidate(
  context: GoldenSpatulaBenchCandidateContext,
): GoldenSpatulaBenchSellCandidate | undefined {
  const { owned, pick } = context;
  if (!owned.name || owned.benchCount <= 0 || owned.count <= 0) return undefined;

  const kind = classifyBenchCandidate(context);
  return {
    name: owned.name,
    count: owned.count,
    benchCount: owned.benchCount,
    sellGold: getSellGold(owned, pick),
    kind,
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
    transition: 1,
    directUpgrade: 2,
    core: 3,
  };
  return (
    kindPriority[a.kind] - kindPriority[b.kind] ||
    (a.score ?? 0) - (b.score ?? 0) ||
    b.sellGold - a.sellGold ||
    a.name.localeCompare(b.name)
  );
}

function selectInterestSellCandidates(
  candidates: GoldenSpatulaBenchSellCandidate[],
  interestGoldNeeded: number | undefined,
): GoldenSpatulaBenchSellCandidate[] {
  const sellable = candidates.filter((candidate) => canSellBenchCandidate(candidate.kind));
  if (interestGoldNeeded === undefined || interestGoldNeeded <= 0) return sellable.slice(0, 3);

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
      }),
    )
    .filter(
      (candidate): candidate is GoldenSpatulaBenchSellCandidate => candidate !== undefined,
    )
    .sort(compareBenchSellCandidates);

  const sellable = candidates.filter((candidate) => canSellBenchCandidate(candidate.kind));
  const sellGoldAvailable = sellable.reduce((sum, candidate) => sum + candidate.sellGold, 0);
  const canReachNextInterest =
    interestGoldNeeded !== undefined &&
    interestGoldNeeded > 0 &&
    sellGoldAvailable >= interestGoldNeeded;

  return {
    interestGoldNeeded,
    sellGoldAvailable,
    canReachNextInterest,
    sellCandidates: selectInterestSellCandidates(candidates, interestGoldNeeded),
    preservedNames: candidates
      .filter((candidate) => !canSellBenchCandidate(candidate.kind))
      .slice(0, 4)
      .map((candidate) => candidate.name),
  };
}
