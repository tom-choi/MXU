import type { GoldenSpatulaDecisionReason } from '@/types/goldenSpatula';

export const GOLDEN_SPATULA_DECISION_REASON_ORDER: GoldenSpatulaDecisionReason[] = [
  'levelLocked',
  'levelOdds',
  'nearUpgrade',
  'shopVisible',
  'itemFit',
  'stageFit',
  'streakPressure',
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

const reasonPriority = new Map(
  GOLDEN_SPATULA_DECISION_REASON_ORDER.map((reason, index) => [reason, index]),
);

export function sortGoldenSpatulaDecisionReasons(
  reasons: Iterable<GoldenSpatulaDecisionReason>,
): GoldenSpatulaDecisionReason[] {
  return Array.from(reasons).sort(
    (a, b) => (reasonPriority.get(a) ?? 999) - (reasonPriority.get(b) ?? 999),
  );
}
