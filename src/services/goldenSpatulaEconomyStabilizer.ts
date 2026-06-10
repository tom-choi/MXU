import type { GoldenSpatulaEconomyVisionResult } from '@/services/goldenSpatulaEconomyVision';

export type GoldenSpatulaEconomyStableField = 'round' | 'gold' | 'level' | 'experience' | 'streak';

interface PendingEconomyValue {
  count: number;
  firstSeenAt: number;
  lastSeenAt: number;
  signature: string;
}

export interface GoldenSpatulaEconomyStableSnapshot {
  round?: string;
  gold?: number;
  level?: number;
  experience?: number;
  experienceMax?: number;
  streakKind?: GoldenSpatulaEconomyVisionResult['streakKind'];
  streakInterest?: number;
  updatedAt?: number;
}

export interface GoldenSpatulaEconomyStabilizerState {
  snapshot: GoldenSpatulaEconomyStableSnapshot;
  pending: Partial<Record<GoldenSpatulaEconomyStableField, PendingEconomyValue>>;
}

export interface GoldenSpatulaEconomyStabilizedResult {
  result: GoldenSpatulaEconomyVisionResult;
  state: GoldenSpatulaEconomyStabilizerState;
  acceptedFields: GoldenSpatulaEconomyStableField[];
  heldFields: GoldenSpatulaEconomyStableField[];
  missingFields: GoldenSpatulaEconomyStableField[];
}

interface EconomyValueDecision {
  accept: boolean;
  pending?: PendingEconomyValue;
}

const suspiciousConfirmationCount = 2;

export function createGoldenSpatulaEconomyStabilizerState(): GoldenSpatulaEconomyStabilizerState {
  return {
    snapshot: {},
    pending: {},
  };
}

function updatePending(
  previous: PendingEconomyValue | undefined,
  signature: string,
  timestamp: number,
): PendingEconomyValue {
  if (previous?.signature === signature) {
    return {
      ...previous,
      count: previous.count + 1,
      lastSeenAt: timestamp,
    };
  }

  return {
    count: 1,
    firstSeenAt: timestamp,
    lastSeenAt: timestamp,
    signature,
  };
}

function decideSuspiciousValue(
  previousPending: PendingEconomyValue | undefined,
  signature: string,
  reliable: boolean,
  timestamp: number,
): EconomyValueDecision {
  if (reliable) {
    return { accept: true };
  }

  const pending = updatePending(previousPending, signature, timestamp);
  return {
    accept: pending.count >= suspiciousConfirmationCount,
    pending,
  };
}

function isReliableGold(value: number, previous: GoldenSpatulaEconomyStableSnapshot): boolean {
  if (value < 0 || value > 99) return false;
  if (previous.gold === undefined) return true;
  if (value === previous.gold) return true;
  return Math.abs(value - previous.gold) <= 20;
}

function isReliableRound(value: string): boolean {
  return /^[1-9]\d?-[1-9]\d?$/u.test(value);
}

function isReliableLevel(value: number, previous: GoldenSpatulaEconomyStableSnapshot): boolean {
  if (value < 1 || value > 10) return false;
  if (previous.level === undefined) return true;
  if (value === previous.level) return true;
  return value === previous.level + 1;
}

function isReliableExperience(
  experience: number,
  experienceMax: number | undefined,
  previous: GoldenSpatulaEconomyStableSnapshot,
  acceptedLevel: number | undefined,
): boolean {
  if (experience < 0 || experienceMax === undefined || experienceMax <= 0 || experienceMax > 100) {
    return false;
  }
  if (experience > experienceMax) return false;
  if (previous.experience === undefined || previous.experienceMax === undefined) return true;
  if (experience === previous.experience && experienceMax === previous.experienceMax) return true;

  const levelIncreased =
    acceptedLevel !== undefined &&
    previous.level !== undefined &&
    acceptedLevel > previous.level &&
    acceptedLevel <= previous.level + 1;
  if (levelIncreased) return true;

  if (experienceMax === previous.experienceMax) {
    const delta = experience - previous.experience;
    return delta >= 0 && delta <= 8;
  }

  return false;
}

function isReliableStreakInterest(value: number | undefined): boolean {
  return value !== undefined && value >= 0 && value <= 3;
}

function stableRawText(
  rawText: GoldenSpatulaEconomyVisionResult['rawText'],
): GoldenSpatulaEconomyVisionResult['rawText'] {
  return {
    round: rawText.round,
    gold: rawText.gold,
    level: rawText.level,
    experience: rawText.experience,
    streak: rawText.streak,
  };
}

export function stabilizeGoldenSpatulaEconomyResult(
  previousState: GoldenSpatulaEconomyStabilizerState,
  input: GoldenSpatulaEconomyVisionResult,
  timestamp = Date.now(),
): GoldenSpatulaEconomyStabilizedResult {
  const previousSnapshot: GoldenSpatulaEconomyStableSnapshot = { ...previousState.snapshot };
  const snapshot: GoldenSpatulaEconomyStableSnapshot = { ...previousState.snapshot };
  const pending: GoldenSpatulaEconomyStabilizerState['pending'] = { ...previousState.pending };
  const acceptedFields: GoldenSpatulaEconomyStableField[] = [];
  const heldFields: GoldenSpatulaEconomyStableField[] = [];
  const missingFields: GoldenSpatulaEconomyStableField[] = [];
  const result: GoldenSpatulaEconomyVisionResult = {
    rawText: stableRawText(input.rawText),
  };

  if (input.round === undefined) {
    missingFields.push('round');
  } else {
    const signature = input.round;
    const decision = decideSuspiciousValue(
      pending.round,
      signature,
      isReliableRound(input.round),
      timestamp,
    );
    if (decision.accept) {
      result.round = input.round;
      snapshot.round = input.round;
      snapshot.updatedAt = timestamp;
      delete pending.round;
      acceptedFields.push('round');
    } else {
      pending.round = decision.pending;
      heldFields.push('round');
    }
  }

  if (input.gold === undefined) {
    missingFields.push('gold');
  } else {
    const signature = String(input.gold);
    const decision = decideSuspiciousValue(
      pending.gold,
      signature,
      isReliableGold(input.gold, snapshot),
      timestamp,
    );
    if (decision.accept) {
      result.gold = input.gold;
      snapshot.gold = input.gold;
      snapshot.updatedAt = timestamp;
      delete pending.gold;
      acceptedFields.push('gold');
    } else {
      pending.gold = decision.pending;
      heldFields.push('gold');
    }
  }

  if (input.level === undefined) {
    missingFields.push('level');
  } else {
    const signature = String(input.level);
    const decision = decideSuspiciousValue(
      pending.level,
      signature,
      isReliableLevel(input.level, snapshot),
      timestamp,
    );
    if (decision.accept) {
      result.level = input.level;
      snapshot.level = input.level;
      snapshot.updatedAt = timestamp;
      delete pending.level;
      acceptedFields.push('level');
    } else {
      pending.level = decision.pending;
      heldFields.push('level');
    }
  }

  if (input.experience === undefined) {
    missingFields.push('experience');
  } else {
    const signature = `${input.experience}/${input.experienceMax ?? ''}`;
    const decision = decideSuspiciousValue(
      pending.experience,
      signature,
      isReliableExperience(input.experience, input.experienceMax, previousSnapshot, result.level),
      timestamp,
    );
    if (decision.accept) {
      result.experience = input.experience;
      result.experienceMax = input.experienceMax;
      snapshot.experience = input.experience;
      snapshot.experienceMax = input.experienceMax;
      snapshot.updatedAt = timestamp;
      delete pending.experience;
      acceptedFields.push('experience');
    } else {
      pending.experience = decision.pending;
      heldFields.push('experience');
    }
  }

  if (input.streakInterest === undefined) {
    missingFields.push('streak');
  } else {
    const signature = `${input.streakKind ?? 'unknown'}:${input.streakInterest}`;
    const decision = decideSuspiciousValue(
      pending.streak,
      signature,
      isReliableStreakInterest(input.streakInterest),
      timestamp,
    );
    if (decision.accept) {
      result.streakKind = input.streakKind;
      result.streakInterest = input.streakInterest;
      snapshot.streakKind = input.streakKind;
      snapshot.streakInterest = input.streakInterest;
      snapshot.updatedAt = timestamp;
      delete pending.streak;
      acceptedFields.push('streak');
    } else {
      pending.streak = decision.pending;
      heldFields.push('streak');
    }
  }

  return {
    result,
    state: { snapshot, pending },
    acceptedFields,
    heldFields,
    missingFields,
  };
}
