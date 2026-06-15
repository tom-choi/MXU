import type { GoldenSpatulaDecisionRole } from '@/types/goldenSpatula';
import type { GoldenSpatulaTempoContext } from './goldenSpatulaTempoModel';

export interface GoldenSpatulaTargetPlanInput {
  role: GoldenSpatulaDecisionRole;
  cost?: number;
  priorityTarget: boolean;
  explicitTarget: boolean;
  ownedCount: number;
  tempoContext: GoldenSpatulaTempoContext;
}

function nextStarTarget(ownedCount: number): number {
  if (ownedCount >= 6) return 9;
  if (ownedCount >= 3) return 6;
  return 3;
}

function lowCostCarryTarget(input: GoldenSpatulaTargetPlanInput): number {
  const cost = input.cost ?? 0;
  if (input.explicitTarget) return 9;

  if (input.tempoContext.tempoPhase === 'late') {
    return input.ownedCount >= 6 ? 9 : nextStarTarget(input.ownedCount);
  }

  if (input.tempoContext.tempoPhase === 'mid') {
    if (cost <= 2) return input.priorityTarget ? 9 : Math.max(3, nextStarTarget(input.ownedCount));
    return input.ownedCount >= 6 ? 9 : 6;
  }

  if (cost <= 2) return input.priorityTarget ? 9 : 3;
  return input.ownedCount >= 6 ? 9 : 6;
}

export function getGoldenSpatulaTargetCount(input: GoldenSpatulaTargetPlanInput): number {
  const cost = input.cost;

  if (cost !== undefined && cost >= 4) return 2;

  if (cost !== undefined && cost <= 3 && input.role === 'carry') {
    return lowCostCarryTarget(input);
  }

  if (cost !== undefined && cost <= 2 && input.role === 'frontline') {
    if (input.explicitTarget) return 9;
    if (input.tempoContext.tempoPhase === 'late') {
      return input.ownedCount >= 6 ? 9 : nextStarTarget(input.ownedCount);
    }
    return input.priorityTarget ? 9 : 3;
  }

  if (input.explicitTarget) return cost !== undefined && cost <= 3 ? 9 : 6;
  if (input.priorityTarget) return 6;
  return 3;
}
