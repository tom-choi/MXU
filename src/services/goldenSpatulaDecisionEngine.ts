import type {
  GoldenSpatulaChampionAssetIndex,
  GoldenSpatulaDecisionPlan,
  GoldenSpatulaEconomyRunState,
  GoldenSpatulaHandRunState,
  GoldenSpatulaItemAssetIndex,
  GoldenSpatulaKnowledgeScanState,
  GoldenSpatulaLineupVariant,
  GoldenSpatulaManagedLineup,
  GoldenSpatulaRecommendedLineup,
} from '@/types/goldenSpatula';
import { buildGoldenSpatulaChampionCostDensity } from './goldenSpatulaAcquisitionModel';
export {
  extractGoldenSpatulaTraitTags,
  getGoldenSpatulaShopOdds,
} from './goldenSpatulaDecisionContext';
import {
  buildGoldenSpatulaCandidateSet,
  buildGoldenSpatulaTransitionSources,
} from './goldenSpatulaCandidateModel';
import {
  getGoldenSpatulaObservedItemSignals as getObservedItemSignals,
} from './goldenSpatulaObservationModel';
import { buildGoldenSpatulaEconomyAdvice } from './goldenSpatulaEconomyDecisionModel';
import {
  isGoldenSpatulaActionablePick,
  compareGoldenSpatulaActionablePicks,
  isGoldenSpatulaActionableRollPick,
} from './goldenSpatulaPickDecisionModel';
import { buildGoldenSpatulaPickRecommendation } from './goldenSpatulaPickRecommendationModel';
import { getGoldenSpatulaTempoContext } from './goldenSpatulaTempoModel';
import { rankGoldenSpatulaTransitionLineups } from './goldenSpatulaTransitionModel';

export interface GoldenSpatulaDecisionInput {
  activeVariant?: GoldenSpatulaLineupVariant;
  managedLineups?: GoldenSpatulaManagedLineup[];
  recommendedLineups?: GoldenSpatulaRecommendedLineup[];
  championAssets?: GoldenSpatulaChampionAssetIndex;
  itemAssets?: GoldenSpatulaItemAssetIndex;
  handState?: GoldenSpatulaHandRunState;
  economyState?: GoldenSpatulaEconomyRunState;
  knowledgeState?: GoldenSpatulaKnowledgeScanState;
  maxPicks?: number;
  maxTransitions?: number;
}

export function buildGoldenSpatulaDecisionPlan(
  input: GoldenSpatulaDecisionInput,
): GoldenSpatulaDecisionPlan {
  const maxPicks = input.maxPicks ?? 8;
  const maxTransitions = input.maxTransitions ?? 3;
  const sources = buildGoldenSpatulaTransitionSources({
    managedLineups: input.managedLineups,
    recommendedLineups: input.recommendedLineups,
  });
  const activeVariant = input.activeVariant;
  const currentLevel = input.economyState?.level;
  const { candidates, activeTargets, explicitTargets } = buildGoldenSpatulaCandidateSet({
    activeVariant,
    sources,
    championAssets: input.championAssets,
  });
  const costDensity = buildGoldenSpatulaChampionCostDensity(input.championAssets);
  const observedItems = getObservedItemSignals(input.knowledgeState, input.itemAssets);
  const tempoContext = getGoldenSpatulaTempoContext(input.economyState);

  const allPicks = Array.from(candidates.values())
    .map((candidate) =>
      buildGoldenSpatulaPickRecommendation({
        candidate,
        activeTargets,
        explicitTargets,
        championAssets: input.championAssets,
        handState: input.handState,
        economyState: input.economyState,
        knowledgeState: input.knowledgeState,
        currentLevel,
        observedItems,
        costDensity,
        tempoContext,
      }),
    )
    .sort((a, b) => b.score - a.score || a.copiesNeeded - b.copiesNeeded);

  const actionablePicks = allPicks
    .filter(isGoldenSpatulaActionablePick)
    .sort(compareGoldenSpatulaActionablePicks);
  const actionableRollPicks = allPicks
    .filter(isGoldenSpatulaActionableRollPick)
    .sort(compareGoldenSpatulaActionablePicks);
  const picks = actionablePicks.slice(0, maxPicks);
  const recommendedRollTargetNames = actionableRollPicks
    .filter((pick) => pick.rollTargetPriority > 0)
    .sort(compareGoldenSpatulaActionablePicks)
    .slice(0, Math.max(3, Math.min(maxPicks, 8)))
    .map((pick) => pick.name);

  return {
    generatedAt: Date.now(),
    evaluatedCandidates: candidates.size,
    evaluatedLineups: sources.length,
    picks,
    recommendedRollTargetNames,
    transitionLineups: rankGoldenSpatulaTransitionLineups({
      sources,
      activeVariant,
      handState: input.handState,
      economyState: input.economyState,
      knowledgeState: input.knowledgeState,
      championAssets: input.championAssets,
      observedItems,
      costDensity,
      tempoContext,
      maxTransitions,
    }),
    economyAdvice: buildGoldenSpatulaEconomyAdvice(
      picks,
      allPicks,
      input.economyState,
      tempoContext,
      input.handState,
    ),
  };
}
