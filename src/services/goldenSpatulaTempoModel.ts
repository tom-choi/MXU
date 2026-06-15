import type {
  GoldenSpatulaDecisionReason,
  GoldenSpatulaDecisionRole,
  GoldenSpatulaEconomyRunState,
  GoldenSpatulaStreakPressure,
  GoldenSpatulaTempoPhase,
} from '@/types/goldenSpatula';
import { clampGoldenSpatulaDecisionValue } from './goldenSpatulaAcquisitionModel';

export interface GoldenSpatulaTempoContext {
  round?: string;
  stage?: number;
  phase?: number;
  tempoPhase: GoldenSpatulaTempoPhase;
  streakKind?: GoldenSpatulaEconomyRunState['streakKind'];
  streakInterest?: number;
  streakPressure: GoldenSpatulaStreakPressure;
  streakValue: number;
}

export interface GoldenSpatulaTempoPickInput {
  cost?: number;
  role: GoldenSpatulaDecisionRole;
  activeTarget: boolean;
  nearUpgrade: boolean;
  ownedCount: number;
}

export interface GoldenSpatulaTempoPickAdjustment {
  scoreMultiplier: number;
  rollPriorityBonus: number;
  reasons: GoldenSpatulaDecisionReason[];
}

export function parseGoldenSpatulaRound(
  round: string | undefined,
): { stage: number; phase: number } | undefined {
  const match = round?.trim().match(/(\d+)\D+(\d+)/);
  if (!match) return undefined;
  const stage = Number(match[1]);
  const phase = Number(match[2]);
  if (!Number.isFinite(stage) || !Number.isFinite(phase)) return undefined;
  return { stage, phase };
}

export function getGoldenSpatulaTempoPhase(stage: number | undefined): GoldenSpatulaTempoPhase {
  if (stage === undefined) return 'unknown';
  if (stage <= 2) return 'early';
  if (stage <= 4) return 'mid';
  return 'late';
}

export function getGoldenSpatulaTempoContext(
  economyState: GoldenSpatulaEconomyRunState | undefined,
): GoldenSpatulaTempoContext {
  const parsedRound = parseGoldenSpatulaRound(economyState?.round);
  const streakInterest =
    typeof economyState?.streakInterest === 'number' && Number.isFinite(economyState.streakInterest)
      ? economyState.streakInterest
      : undefined;
  const streakValue = streakInterest ?? 0;
  const streakPressure: GoldenSpatulaStreakPressure =
    economyState?.streakKind === 'win' && streakValue >= 2
      ? 'push'
      : economyState?.streakKind === 'loss' && streakValue >= 2
        ? 'preserve'
        : 'neutral';

  return {
    round: economyState?.round,
    stage: parsedRound?.stage,
    phase: parsedRound?.phase,
    tempoPhase: getGoldenSpatulaTempoPhase(parsedRound?.stage),
    streakKind: economyState?.streakKind,
    streakInterest,
    streakPressure,
    streakValue,
  };
}

function isCoreTempoRole(role: GoldenSpatulaDecisionRole): boolean {
  return role === 'carry' || role === 'frontline' || role === 'power';
}

export function getGoldenSpatulaTempoPickAdjustment(
  context: GoldenSpatulaTempoContext,
  input: GoldenSpatulaTempoPickInput,
): GoldenSpatulaTempoPickAdjustment {
  let multiplier = 1;
  let rollPriorityBonus = 0;
  const reasons: GoldenSpatulaDecisionReason[] = [];
  const cost = input.cost;

  if (context.tempoPhase === 'early') {
    if (cost !== undefined && cost <= 2 && (isCoreTempoRole(input.role) || input.activeTarget)) {
      multiplier += 0.1;
      rollPriorityBonus += 8;
      reasons.push('stageFit');
    }
    if (cost !== undefined && cost >= 4) {
      multiplier -= 0.14;
      rollPriorityBonus -= 8;
    }
  } else if (context.tempoPhase === 'mid') {
    if (cost === 3 || cost === 4) {
      multiplier += cost === 3 ? 0.08 : 0.05;
      rollPriorityBonus += cost === 3 ? 7 : 4;
      reasons.push('stageFit');
    }
    if (cost !== undefined && cost <= 1 && !input.nearUpgrade && !input.activeTarget) {
      multiplier -= 0.08;
      rollPriorityBonus -= 5;
    }
  } else if (context.tempoPhase === 'late') {
    if (cost !== undefined && cost >= 4) {
      multiplier += 0.12;
      rollPriorityBonus += 10;
      reasons.push('stageFit');
    }
    if (cost !== undefined && cost <= 2 && !input.nearUpgrade && !input.activeTarget) {
      multiplier -= 0.12;
      rollPriorityBonus -= 8;
    }
  }

  if (context.streakPressure === 'push') {
    if (input.nearUpgrade || input.activeTarget || isCoreTempoRole(input.role)) {
      multiplier += input.nearUpgrade ? 0.1 : 0.04;
      rollPriorityBonus += input.nearUpgrade ? 18 : 8;
      reasons.push('streakPressure');
    }
  } else if (context.streakPressure === 'preserve') {
    if (input.nearUpgrade) {
      multiplier += 0.04;
      rollPriorityBonus += 4;
      reasons.push('streakPressure');
    } else if (!input.activeTarget || input.ownedCount === 0) {
      multiplier -= 0.08;
      rollPriorityBonus -= 12;
      reasons.push('streakPressure');
    }
  }

  return {
    scoreMultiplier: clampGoldenSpatulaDecisionValue(multiplier, 0.75, 1.24),
    rollPriorityBonus,
    reasons: Array.from(new Set(reasons)),
  };
}
