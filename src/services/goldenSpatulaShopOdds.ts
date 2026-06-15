import type {
  GoldenSpatulaShopCost,
  GoldenSpatulaShopOddsByCost,
  GoldenSpatulaShopOddsSource,
} from '@/types/goldenSpatula';

export type GoldenSpatulaShopOddsSourceByCost = Partial<
  Record<GoldenSpatulaShopCost, GoldenSpatulaShopOddsSource>
>;

export interface GoldenSpatulaResolvedShopOdds {
  odds?: GoldenSpatulaShopOddsByCost;
  source?: GoldenSpatulaShopOddsSource;
  sourceByCost: GoldenSpatulaShopOddsSourceByCost;
}

export const goldenSpatulaShopOddsCosts = [1, 2, 3, 4, 5] as const;

export const goldenSpatulaShopOddsByLevel: Record<number, GoldenSpatulaShopOddsByCost> = {
  1: { 1: 1, 2: 0, 3: 0, 4: 0, 5: 0 },
  2: { 1: 1, 2: 0, 3: 0, 4: 0, 5: 0 },
  3: { 1: 0.75, 2: 0.25, 3: 0, 4: 0, 5: 0 },
  4: { 1: 0.55, 2: 0.3, 3: 0.15, 4: 0, 5: 0 },
  5: { 1: 0.45, 2: 0.33, 3: 0.2, 4: 0.02, 5: 0 },
  6: { 1: 0.3, 2: 0.4, 3: 0.25, 4: 0.05, 5: 0 },
  7: { 1: 0.19, 2: 0.3, 3: 0.4, 4: 0.1, 5: 0.01 },
  8: { 1: 0.15, 2: 0.2, 3: 0.32, 4: 0.3, 5: 0.03 },
  9: { 1: 0.15, 2: 0.18, 3: 0.25, 4: 0.3, 5: 0.12 },
  10: { 1: 0.05, 2: 0.1, 3: 0.2, 4: 0.4, 5: 0.25 },
  11: { 1: 0.01, 2: 0.02, 3: 0.12, 4: 0.5, 5: 0.35 },
};

export function normalizeGoldenSpatulaShopLevel(level: number | undefined): number | undefined {
  if (level === undefined || !Number.isFinite(level)) return undefined;
  return Math.max(1, Math.min(11, Math.trunc(level)));
}

export function getGoldenSpatulaShopOddsByLevel(
  level: number | undefined,
): GoldenSpatulaShopOddsByCost | undefined {
  const normalizedLevel = normalizeGoldenSpatulaShopLevel(level);
  const odds =
    normalizedLevel === undefined ? undefined : goldenSpatulaShopOddsByLevel[normalizedLevel];
  return odds ? { ...odds } : undefined;
}

export function getGoldenSpatulaShopOddsForCost(
  level: number | undefined,
  cost: GoldenSpatulaShopCost,
): number | undefined {
  return getGoldenSpatulaShopOddsByLevel(level)?.[cost] ?? 0;
}

export interface GoldenSpatulaNextLevelShopOdds {
  nextLevel?: number;
  currentOdds?: number;
  nextOdds?: number;
  gain?: number;
}

export function getGoldenSpatulaNextLevelShopOddsGain(
  level: number | undefined,
  cost: number | undefined,
): GoldenSpatulaNextLevelShopOdds {
  const normalizedLevel = normalizeGoldenSpatulaShopLevel(level);
  if (
    normalizedLevel === undefined ||
    normalizedLevel >= 11 ||
    cost === undefined ||
    cost < 1 ||
    cost > 5
  ) {
    return {};
  }

  const normalizedCost = Math.trunc(cost) as GoldenSpatulaShopCost;
  const nextLevel = normalizedLevel + 1;
  const currentOdds = getGoldenSpatulaShopOddsForCost(normalizedLevel, normalizedCost);
  const nextOdds = getGoldenSpatulaShopOddsForCost(nextLevel, normalizedCost);
  if (currentOdds === undefined || nextOdds === undefined) {
    return { nextLevel, currentOdds, nextOdds };
  }

  return {
    nextLevel,
    currentOdds,
    nextOdds,
    gain: Math.max(0, nextOdds - currentOdds),
  };
}

export function isGoldenSpatulaShopOddsOcrValuePlausible(
  ocrValue: number,
  levelValue: number | undefined,
): boolean {
  if (levelValue === undefined) return true;
  if (levelValue <= 0) return ocrValue <= 0.01;

  const tolerance = Math.max(0.04, levelValue * 0.3);
  return Math.abs(ocrValue - levelValue) <= tolerance;
}

function resolveGoldenSpatulaShopOddsValue(
  ocrValue: number | undefined,
  levelValue: number | undefined,
): { value?: number; source?: GoldenSpatulaShopOddsSource } {
  if (levelValue !== undefined) {
    if (ocrValue !== undefined && Math.abs(ocrValue - levelValue) <= 0.005) {
      return { value: levelValue, source: 'ocr' };
    }
    return { value: levelValue, source: 'levelTable' };
  }
  if (
    ocrValue !== undefined &&
    isGoldenSpatulaShopOddsOcrValuePlausible(ocrValue, levelValue)
  ) {
    return { value: ocrValue, source: 'ocr' };
  }
  if (ocrValue !== undefined) return { value: ocrValue, source: 'ocr' };
  return {};
}

export function resolveGoldenSpatulaShopOdds(
  ocrOdds: GoldenSpatulaShopOddsByCost | undefined,
  levelOdds: GoldenSpatulaShopOddsByCost | undefined,
): GoldenSpatulaResolvedShopOdds {
  if (!ocrOdds && !levelOdds) return { sourceByCost: {} };

  const odds: GoldenSpatulaShopOddsByCost = {};
  const sourceByCost: GoldenSpatulaShopOddsSourceByCost = {};
  let ocrCount = 0;
  let levelTableCount = 0;

  for (const cost of goldenSpatulaShopOddsCosts) {
    const resolved = resolveGoldenSpatulaShopOddsValue(ocrOdds?.[cost], levelOdds?.[cost]);
    if (resolved.value === undefined || resolved.source === undefined) continue;

    odds[cost] = resolved.value;
    sourceByCost[cost] = resolved.source;
    if (resolved.source === 'ocr') ocrCount += 1;
    if (resolved.source === 'levelTable') levelTableCount += 1;
  }

  const source =
    ocrCount > 0 && levelTableCount > 0
      ? 'mixed'
      : ocrCount > 0
        ? 'ocr'
        : levelTableCount > 0
          ? 'levelTable'
          : undefined;

  return { odds, source, sourceByCost };
}

export function getGoldenSpatulaShopOddsDisplayText(
  ocrRawText: Partial<Record<GoldenSpatulaShopCost, string>> | undefined,
  levelOdds: GoldenSpatulaShopOddsByCost | undefined,
  sourceByCost?: GoldenSpatulaShopOddsSourceByCost,
): Partial<Record<GoldenSpatulaShopCost, string>> | undefined {
  if (!ocrRawText && !levelOdds) return undefined;

  const rawText: Partial<Record<GoldenSpatulaShopCost, string>> = {};
  for (const cost of goldenSpatulaShopOddsCosts) {
    if (sourceByCost?.[cost] === 'ocr' && ocrRawText?.[cost] !== undefined) {
      rawText[cost] = ocrRawText[cost];
    } else if (levelOdds?.[cost] !== undefined) {
      rawText[cost] = `${Math.round((levelOdds[cost] ?? 0) * 100)}%`;
    } else if (ocrRawText?.[cost] !== undefined) {
      rawText[cost] = ocrRawText[cost];
    }
  }

  return rawText;
}
