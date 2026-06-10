import {
  goldenSpatulaAutoRollBuyFocusScope,
  goldenSpatulaEconomyFocusScope,
  goldenSpatulaHandFocusScope,
  goldenSpatulaXpFocusScope,
  type GoldenSpatulaAutoRollCount,
} from '@/services/goldenSpatulaRollPipeline';
import type {
  GoldenSpatulaEconomyEvent,
  GoldenSpatulaEconomyField,
  GoldenSpatulaEconomyEventKind,
  GoldenSpatulaEconomyRunState,
  GoldenSpatulaEconomyStreakKind,
  GoldenSpatulaHandEvent,
  GoldenSpatulaHandEventKind,
  GoldenSpatulaHandRunState,
  GoldenSpatulaKnowledgeEvent,
  GoldenSpatulaKnowledgeEventKind,
  GoldenSpatulaKnowledgeItemKind,
  GoldenSpatulaKnowledgeItemZone,
  GoldenSpatulaKnowledgeScanState,
  GoldenSpatulaKnowledgeStreakKind,
  GoldenSpatulaOwnedConfidence,
  GoldenSpatulaRecognitionKind,
  GoldenSpatulaRollEvent,
  GoldenSpatulaRollEventKind,
  GoldenSpatulaRollRunState,
  GoldenSpatulaXpEvent,
  GoldenSpatulaXpEventKind,
  GoldenSpatulaXpRunState,
} from '@/types/goldenSpatula';

export const goldenSpatulaMaxRollEvents = 20;
export const goldenSpatulaMaxXpEvents = 20;
export const goldenSpatulaMaxHandEvents = 20;
export const goldenSpatulaMaxEconomyEvents = 20;
export const goldenSpatulaMaxKnowledgeEvents = 30;
export const goldenSpatulaKnowledgeFocusScope = 'goldenSpatula.knowledge';

export interface GoldenSpatulaAutomationCallbackDetails {
  focus?: unknown;
  name?: unknown;
  recognition_detail?: unknown;
  recognition_text?: unknown;
  reco_id?: unknown;
}

export type GoldenSpatulaEventTranslator = (
  key: string,
  values?: Record<string, unknown>,
) => string;

export function createEmptyRollRunState(): GoldenSpatulaRollRunState {
  return {
    active: false,
    targetNames: [],
    rollCount: 0,
    currentCycle: 0,
    totalCycles: 0,
    events: [],
  };
}

export function createEmptyXpRunState(): GoldenSpatulaXpRunState {
  return {
    active: false,
    current: 0,
    total: 0,
    events: [],
  };
}

export function createEmptyHandRunState(): GoldenSpatulaHandRunState {
  return {
    active: false,
    targetNames: [],
    owned: {},
    events: [],
  };
}

export function createEmptyEconomyRunState(): GoldenSpatulaEconomyRunState {
  return {
    active: false,
    estimatedGoldDelta: 0,
    boughtChampionGold: 0,
    refreshGold: 0,
    xpGold: 0,
    xpPurchases: 0,
    events: [],
  };
}

export function createEmptyKnowledgeScanState(): GoldenSpatulaKnowledgeScanState {
  return {
    active: false,
    shopSlots: {},
    items: {},
    streak: {},
    events: [],
  };
}

function asCallbackRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function asCallbackString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function asCallbackNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function asCallbackStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => asCallbackString(item)).filter((item): item is string => Boolean(item))
    : [];
}

function asEconomyField(value: unknown): GoldenSpatulaEconomyField | undefined {
  return value === 'round' ||
    value === 'gold' ||
    value === 'level' ||
    value === 'experience' ||
    value === 'streak'
    ? value
    : undefined;
}

function asEconomyStreakKind(value: unknown): GoldenSpatulaEconomyStreakKind | undefined {
  return value === 'win' || value === 'loss' || value === 'none' || value === 'unknown'
    ? value
    : undefined;
}

function asKnowledgeEventKind(value: unknown): GoldenSpatulaKnowledgeEventKind | undefined {
  return isKnowledgeEventKind(value) ? value : undefined;
}

function asKnowledgeItemKind(value: unknown): GoldenSpatulaKnowledgeItemKind | undefined {
  return value === 'basicItems' || value === 'completedItems' || value === 'specialItems'
    ? value
    : undefined;
}

function asKnowledgeItemZone(value: unknown): GoldenSpatulaKnowledgeItemZone | undefined {
  return value === 'inventory' || value === 'bench' || value === 'boardLower' ? value : undefined;
}

function asKnowledgeStreakKind(value: unknown): GoldenSpatulaKnowledgeStreakKind | undefined {
  return value === 'win' || value === 'loss' ? value : undefined;
}

function asRecognitionKind(value: unknown): GoldenSpatulaRecognitionKind | undefined {
  return value === 'champions' ||
    value === 'basicItems' ||
    value === 'completedItems' ||
    value === 'specialItems' ||
    value === 'streak' ||
    value === 'traits' ||
    value === 'smoke'
    ? value
    : undefined;
}

function extractRecognitionTextFromRecord(record: Record<string, unknown>): string | undefined {
  for (const key of ['recognition_text', 'ocr_text', 'text', 'rawText', 'value']) {
    const text = asCallbackString(record[key]);
    if (text) return text;
  }

  for (const key of ['detail', 'recognition_detail']) {
    const nested = asCallbackRecord(record[key]);
    if (!nested) continue;
    const text = extractRecognitionTextFromRecord(nested);
    if (text) return text;
  }

  const subDetails = record.sub_details;
  if (Array.isArray(subDetails)) {
    for (const subDetail of subDetails) {
      const nested = asCallbackRecord(subDetail);
      if (!nested) continue;
      const text = extractRecognitionTextFromRecord(nested);
      if (text) return text;
    }
  }

  return undefined;
}

function getRecognitionText(details: GoldenSpatulaAutomationCallbackDetails): string | undefined {
  const record = asCallbackRecord(details);
  return record ? extractRecognitionTextFromRecord(record) : undefined;
}

function normalizeEconomyOcrText(text: string): string {
  return text
    .replace(/[Oo]/g, '0')
    .replace(/[Il|]/g, '1')
    .replace(/[Ss]/g, '5')
    .replace(/B/g, '8')
    .trim();
}

function parseFirstOcrInteger(text: string): number | undefined {
  const match = normalizeEconomyOcrText(text).match(/\d+/);
  if (!match) return undefined;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseRoundOcrText(text: string): string | undefined {
  const normalized = normalizeEconomyOcrText(text).replace(/[–—_]/gu, '-');
  const match = normalized.match(/(\d{1,2})\s*[-]\s*(\d{1,2})/u);
  if (match?.[1] && match[2]) return `${Number(match[1])}-${Number(match[2])}`;
  const compact = normalized.replace(/\D/gu, '');
  if (compact.length >= 2) return `${Number(compact[0])}-${Number(compact.slice(1, 3))}`;
  return undefined;
}

function parseExperienceOcrText(
  text: string,
): { experience?: number; experienceMax?: number } | undefined {
  const normalized = normalizeEconomyOcrText(text);
  const progress = normalized.match(/(\d{1,2})\s*[/／]\s*(\d{1,2})/);
  if (progress) {
    const experience = Number(progress[1]);
    const experienceMax = Number(progress[2]);
    return Number.isFinite(experience) && Number.isFinite(experienceMax)
      ? { experience, experienceMax }
      : undefined;
  }

  const experience = parseFirstOcrInteger(normalized);
  return experience === undefined ? undefined : { experience };
}

function getFocusPayload(
  message: string,
  details: GoldenSpatulaAutomationCallbackDetails,
): Record<string, unknown> | undefined {
  const focus = asCallbackRecord(details.focus);
  return asCallbackRecord(focus?.[message]);
}

function isRollEventKind(value: unknown): value is GoldenSpatulaRollEventKind {
  return (
    value === 'started' ||
    value === 'bought' ||
    value === 'buyConfirmed' ||
    value === 'buyUnconfirmed' ||
    value === 'missed' ||
    value === 'refreshed' ||
    value === 'completed' ||
    value === 'notReady'
  );
}

function isXpEventKind(value: unknown): value is GoldenSpatulaXpEventKind {
  return (
    value === 'started' || value === 'clicked' || value === 'completed' || value === 'notReady'
  );
}

function isHandEventKind(value: unknown): value is GoldenSpatulaHandEventKind {
  return (
    value === 'started' ||
    value === 'benchHit' ||
    value === 'benchMiss' ||
    value === 'bought' ||
    value === 'completed' ||
    value === 'notReady'
  );
}

function isEconomyEventKind(value: unknown): value is GoldenSpatulaEconomyEventKind {
  return (
    value === 'started' ||
    value === 'scanned' ||
    value === 'recognized' ||
    value === 'scanFailed' ||
    value === 'buyChampion' ||
    value === 'refresh' ||
    value === 'buyXp' ||
    value === 'completed' ||
    value === 'notReady'
  );
}

function isKnowledgeEventKind(value: unknown): value is GoldenSpatulaKnowledgeEventKind {
  return (
    value === 'shopScanStarted' ||
    value === 'shopChampionHit' ||
    value === 'shopSlotMiss' ||
    value === 'shopScanCompleted' ||
    value === 'itemScanStarted' ||
    value === 'itemHit' ||
    value === 'itemScanCompleted' ||
    value === 'streakScanStarted' ||
    value === 'streakRecognized' ||
    value === 'streakScanFailed' ||
    value === 'streakScanCompleted'
  );
}

export function buildRollEvent(
  message: string,
  details: GoldenSpatulaAutomationCallbackDetails,
  t: GoldenSpatulaEventTranslator,
  timestamp = Date.now(),
): GoldenSpatulaRollEvent | null {
  const payload = getFocusPayload(message, details);
  if (payload?.scope !== goldenSpatulaAutoRollBuyFocusScope || !isRollEventKind(payload.event)) {
    return null;
  }

  const kind = payload.event;
  const targetName = asCallbackString(payload.targetName);
  const targetNames = asCallbackStringArray(payload.targetNames);
  const cycle = asCallbackNumber(payload.cycle);
  const totalCycles = asCallbackNumber(payload.totalCycles);
  const rollCount = asCallbackNumber(payload.rollCount) as GoldenSpatulaAutoRollCount | undefined;
  const slotIndex = asCallbackNumber(payload.slotIndex);
  const slotLabel = asCallbackString(payload.slotLabel);
  const cost = asCallbackNumber(payload.cost);
  const nodeName = typeof details.name === 'string' ? details.name : undefined;
  const baseMessage = t(`goldenSpatula.lineups.rollStatusEvent.${kind}`, {
    target: targetName,
    current: cycle,
    total: totalCycles,
  });
  const slotText =
    (kind === 'bought' || kind === 'buyConfirmed' || kind === 'buyUnconfirmed') &&
    (slotLabel || slotIndex)
      ? ` #${slotLabel ?? slotIndex}`
      : '';

  return {
    id: `${timestamp}-${nodeName ?? kind}`,
    timestamp,
    kind,
    cycle,
    totalCycles,
    rollCount,
    targetName,
    targetNames,
    slotIndex,
    slotLabel,
    cost,
    message: `${baseMessage}${slotText}`,
    nodeName,
  };
}

export function mergeRollEvent(
  previous: GoldenSpatulaRollRunState,
  event: GoldenSpatulaRollEvent,
  maxEvents = goldenSpatulaMaxRollEvents,
): GoldenSpatulaRollRunState {
  const started = event.kind === 'started';
  const completed = event.kind === 'completed' || event.kind === 'notReady';
  const targetNames = event.targetNames?.length ? event.targetNames : previous.targetNames;

  return {
    active: started ? true : completed ? false : previous.active,
    targetNames,
    rollCount: event.rollCount ?? previous.rollCount,
    currentCycle: event.cycle ?? previous.currentCycle,
    totalCycles: event.totalCycles ?? previous.totalCycles,
    startedAt: started ? event.timestamp : previous.startedAt,
    updatedAt: event.timestamp,
    lastEvent: event,
    events: [event, ...previous.events].slice(0, maxEvents),
  };
}

export function buildXpEvent(
  message: string,
  details: GoldenSpatulaAutomationCallbackDetails,
  t: GoldenSpatulaEventTranslator,
  timestamp = Date.now(),
): GoldenSpatulaXpEvent | null {
  const payload = getFocusPayload(message, details);
  if (payload?.scope !== goldenSpatulaXpFocusScope || !isXpEventKind(payload.event)) return null;

  const kind = payload.event;
  const current = asCallbackNumber(payload.current);
  const total = asCallbackNumber(payload.total);
  const nodeName = typeof details.name === 'string' ? details.name : undefined;

  return {
    id: `${timestamp}-${nodeName ?? kind}`,
    timestamp,
    kind,
    current,
    total,
    message: t(`goldenSpatula.lineups.xpStatusEvent.${kind}`, {
      current,
      total,
    }),
    nodeName,
  };
}

export function mergeXpEvent(
  previous: GoldenSpatulaXpRunState,
  event: GoldenSpatulaXpEvent,
  maxEvents = goldenSpatulaMaxXpEvents,
): GoldenSpatulaXpRunState {
  const started = event.kind === 'started';
  const completed = event.kind === 'completed' || event.kind === 'notReady';
  const total = event.total ?? previous.total;
  const current =
    event.kind === 'completed'
      ? (event.total ?? previous.total)
      : (event.current ?? previous.current);

  return {
    active: started ? true : completed ? false : previous.active,
    current,
    total,
    startedAt: started ? event.timestamp : previous.startedAt,
    updatedAt: event.timestamp,
    lastEvent: event,
    events: [event, ...previous.events].slice(0, maxEvents),
  };
}

export function buildHandEvent(
  message: string,
  details: GoldenSpatulaAutomationCallbackDetails,
  t: GoldenSpatulaEventTranslator,
  timestamp = Date.now(),
): GoldenSpatulaHandEvent | null {
  const payload = getFocusPayload(message, details);
  if (payload?.scope !== goldenSpatulaHandFocusScope || !isHandEventKind(payload.event)) {
    return null;
  }

  const kind = payload.event;
  const targetName = asCallbackString(payload.targetName);
  const targetNames = asCallbackStringArray(payload.targetNames);
  const slotIndex = asCallbackNumber(payload.slotIndex);
  const slotLabel = asCallbackString(payload.slotLabel);
  const cost = asCallbackNumber(payload.cost);
  const count = asCallbackNumber(payload.count);
  const nodeName = typeof details.name === 'string' ? details.name : undefined;
  const baseMessage = t(`goldenSpatula.lineups.handStatusEvent.${kind}`, {
    target: targetName,
    count,
    slot: slotLabel ?? slotIndex,
  });
  const slotText = slotLabel || slotIndex ? ` #${slotLabel ?? slotIndex}` : '';

  return {
    id: `${timestamp}-${nodeName ?? kind}`,
    timestamp,
    kind,
    targetName,
    targetNames,
    slotIndex,
    slotLabel,
    cost,
    count,
    message: `${baseMessage}${kind === 'benchHit' ? slotText : ''}`,
    nodeName,
  };
}

export function buildHandEventFromRollEvent(
  event: GoldenSpatulaRollEvent,
  t: GoldenSpatulaEventTranslator,
): GoldenSpatulaHandEvent | null {
  const kind: GoldenSpatulaHandEventKind | null =
    event.kind === 'started'
      ? 'started'
      : event.kind === 'buyConfirmed'
        ? 'bought'
        : event.kind === 'completed'
          ? 'completed'
          : event.kind === 'notReady'
            ? 'notReady'
            : null;
  if (!kind) return null;

  return {
    id: `${event.id}-hand`,
    timestamp: event.timestamp,
    kind,
    targetName: event.targetName,
    targetNames: event.targetNames,
    slotIndex: event.slotIndex,
    slotLabel: event.slotLabel,
    cost: event.cost,
    message: t(`goldenSpatula.lineups.handStatusEvent.${kind}`, {
      target: event.targetName,
      slot: event.slotLabel ?? event.slotIndex,
    }),
    nodeName: event.nodeName,
  };
}

function getOwnedConfidence(
  benchCount: number,
  boughtCount: number,
  previous?: { confidence?: GoldenSpatulaOwnedConfidence },
): GoldenSpatulaOwnedConfidence {
  if (benchCount > 0) return 'confirmed';
  if (boughtCount > 0) return 'estimated';
  return previous?.confidence ?? 'stale';
}

export function mergeHandEvent(
  previous: GoldenSpatulaHandRunState,
  event: GoldenSpatulaHandEvent,
  maxEvents = goldenSpatulaMaxHandEvents,
): GoldenSpatulaHandRunState {
  const started = event.kind === 'started';
  const completed = event.kind === 'completed' || event.kind === 'notReady';
  const targetNames = event.targetNames?.length ? event.targetNames : previous.targetNames;
  const owned = started ? {} : { ...previous.owned };
  const targetName = event.targetName?.trim();

  if (targetName && (event.kind === 'benchHit' || event.kind === 'bought')) {
    const previousChampion = owned[targetName] ?? {
      name: targetName,
      count: 0,
      boughtCount: 0,
      benchCount: 0,
      benchSlots: [],
      cost: event.cost,
      updatedAt: event.timestamp,
    };
    const benchSlots = new Set(previousChampion.benchSlots ?? []);
    if (event.kind === 'benchHit') {
      const slotKey = `${event.slotLabel ?? event.slotIndex ?? 'unknown'}`;
      benchSlots.add(slotKey);
    }
    const boughtCount =
      event.kind === 'bought' ? previousChampion.boughtCount + 1 : previousChampion.boughtCount;
    const benchCount = event.kind === 'benchHit' ? benchSlots.size : previousChampion.benchCount;

    owned[targetName] = {
      ...previousChampion,
      count: benchCount + boughtCount,
      boughtCount,
      benchCount,
      benchSlots: [...benchSlots],
      cost: event.cost ?? previousChampion.cost,
      confidence: getOwnedConfidence(benchCount, boughtCount, previousChampion),
      updatedAt: event.timestamp,
    };
  }

  return {
    active: started ? true : completed ? false : previous.active,
    targetNames,
    owned,
    startedAt: started ? event.timestamp : previous.startedAt,
    updatedAt: event.timestamp,
    lastEvent: event,
    events: [event, ...previous.events].slice(0, maxEvents),
  };
}

export function buildEconomyEvent(
  message: string,
  details: GoldenSpatulaAutomationCallbackDetails,
  t: GoldenSpatulaEventTranslator,
  timestamp = Date.now(),
): GoldenSpatulaEconomyEvent | null {
  const payload = getFocusPayload(message, details);
  if (payload?.scope !== goldenSpatulaEconomyFocusScope || !isEconomyEventKind(payload.event)) {
    return null;
  }

  const kind = payload.event;
  const field = asEconomyField(payload.field);
  const rawText = asCallbackString(payload.rawText) ?? getRecognitionText(details);
  let gold = asCallbackNumber(payload.gold);
  let level = asCallbackNumber(payload.level);
  let experience = asCallbackNumber(payload.experience);
  let experienceMax = asCallbackNumber(payload.experienceMax);
  let round = asCallbackString(payload.round);
  let streakKind = asEconomyStreakKind(payload.streakKind);
  let streakInterest = asCallbackNumber(payload.streakInterest);
  const goldDelta = asCallbackNumber(payload.goldDelta);
  const targetName = asCallbackString(payload.targetName);
  const cost = asCallbackNumber(payload.cost);
  const nodeName = typeof details.name === 'string' ? details.name : undefined;

  if (kind === 'recognized' && field && rawText) {
    if (field === 'round') {
      round = round ?? parseRoundOcrText(rawText);
    } else if (field === 'gold') {
      gold = gold ?? parseFirstOcrInteger(rawText);
    } else if (field === 'level') {
      level = level ?? parseFirstOcrInteger(rawText);
    } else if (field === 'experience') {
      const parsedExperience = parseExperienceOcrText(rawText);
      experience = experience ?? parsedExperience?.experience;
      experienceMax = experienceMax ?? parsedExperience?.experienceMax;
    } else if (field === 'streak') {
      streakInterest = streakInterest ?? parseFirstOcrInteger(rawText);
      streakKind = streakKind ?? (streakInterest === 0 ? 'none' : 'unknown');
    }
  }

  const value =
    rawText ??
    (field === 'round'
      ? round
      : field === 'gold'
        ? gold
        : field === 'level'
          ? level
          : field === 'experience'
            ? experience !== undefined
              ? experienceMax !== undefined
                ? `${experience}/${experienceMax}`
                : experience
              : undefined
            : field === 'streak'
              ? streakInterest
              : undefined);

  return {
    id: `${timestamp}-${nodeName ?? kind}`,
    timestamp,
    kind,
    field,
    round,
    gold,
    level,
    experience,
    experienceMax,
    streakKind,
    streakInterest,
    goldDelta,
    rawText,
    targetName,
    cost,
    message: t(`goldenSpatula.lineups.economyStatusEvent.${kind}`, {
      field,
      fieldLabel: field ? t(`goldenSpatula.lineups.economyField.${field}`) : undefined,
      value,
      rawText,
      gold,
      level,
      experience,
      experienceMax,
      round,
      streakKind,
      streakInterest,
      delta: goldDelta,
      target: targetName,
      cost,
    }),
    nodeName,
  };
}

export function buildEconomyEventFromRollEvent(
  event: GoldenSpatulaRollEvent,
  t: GoldenSpatulaEventTranslator,
): GoldenSpatulaEconomyEvent | null {
  const kind: GoldenSpatulaEconomyEventKind | null =
    event.kind === 'started'
      ? 'started'
      : event.kind === 'buyConfirmed'
        ? 'buyChampion'
        : event.kind === 'refreshed'
          ? 'refresh'
          : event.kind === 'completed'
            ? 'completed'
            : event.kind === 'notReady'
              ? 'notReady'
              : null;
  if (!kind) return null;

  const goldDelta =
    kind === 'buyChampion' && event.cost ? -event.cost : kind === 'refresh' ? -2 : undefined;

  return {
    id: `${event.id}-economy`,
    timestamp: event.timestamp,
    kind,
    goldDelta,
    targetName: event.targetName,
    cost: event.cost,
    message: t(`goldenSpatula.lineups.economyStatusEvent.${kind}`, {
      delta: goldDelta,
      target: event.targetName,
      cost: event.cost,
    }),
    nodeName: event.nodeName,
  };
}

export function buildEconomyEventFromXpEvent(
  event: GoldenSpatulaXpEvent,
  t: GoldenSpatulaEventTranslator,
): GoldenSpatulaEconomyEvent | null {
  const kind: GoldenSpatulaEconomyEventKind | null =
    event.kind === 'started'
      ? 'started'
      : event.kind === 'clicked'
        ? 'buyXp'
        : event.kind === 'completed'
          ? 'completed'
          : event.kind === 'notReady'
            ? 'notReady'
            : null;
  if (!kind) return null;

  const goldDelta = kind === 'buyXp' ? -4 : undefined;

  return {
    id: `${event.id}-economy`,
    timestamp: event.timestamp,
    kind,
    goldDelta,
    message: t(`goldenSpatula.lineups.economyStatusEvent.${kind}`, {
      delta: goldDelta,
    }),
    nodeName: event.nodeName,
  };
}

export function mergeEconomyEvent(
  previous: GoldenSpatulaEconomyRunState,
  event: GoldenSpatulaEconomyEvent,
  maxEvents = goldenSpatulaMaxEconomyEvents,
): GoldenSpatulaEconomyRunState {
  const started = event.kind === 'started';
  const completed =
    event.kind === 'completed' || event.kind === 'notReady' || event.kind === 'scanned';
  const goldDelta = event.goldDelta ?? 0;
  const boughtChampionGold =
    event.kind === 'buyChampion'
      ? previous.boughtChampionGold + (event.cost ?? 0)
      : previous.boughtChampionGold;
  const refreshGold = event.kind === 'refresh' ? previous.refreshGold + 2 : previous.refreshGold;
  const xpGold = event.kind === 'buyXp' ? previous.xpGold + 4 : previous.xpGold;
  const xpPurchases = event.kind === 'buyXp' ? previous.xpPurchases + 1 : previous.xpPurchases;
  const previousGold = started ? undefined : previous.gold;
  const gold =
    event.gold ??
    (previousGold !== undefined && goldDelta !== 0
      ? Math.max(0, previousGold + goldDelta)
      : previousGold);

  return {
    active: started ? true : completed ? false : previous.active,
    round: event.round ?? (started ? undefined : previous.round),
    gold,
    level: event.level ?? (started ? undefined : previous.level),
    experience: event.experience ?? (started ? undefined : previous.experience),
    experienceMax: event.experienceMax ?? (started ? undefined : previous.experienceMax),
    streakKind: event.streakKind ?? (started ? undefined : previous.streakKind),
    streakInterest: event.streakInterest ?? (started ? undefined : previous.streakInterest),
    estimatedGoldDelta: started ? 0 : previous.estimatedGoldDelta + goldDelta,
    boughtChampionGold: started ? 0 : boughtChampionGold,
    refreshGold: started ? 0 : refreshGold,
    xpGold: started ? 0 : xpGold,
    xpPurchases: started ? 0 : xpPurchases,
    startedAt: started ? event.timestamp : previous.startedAt,
    updatedAt: event.timestamp,
    lastEvent: event,
    events: [event, ...previous.events].slice(0, maxEvents),
  };
}

export function buildKnowledgeEvent(
  message: string,
  details: GoldenSpatulaAutomationCallbackDetails,
  t: GoldenSpatulaEventTranslator,
  timestamp = Date.now(),
): GoldenSpatulaKnowledgeEvent | null {
  const payload = getFocusPayload(message, details);
  if (payload?.scope !== goldenSpatulaKnowledgeFocusScope) return null;

  const kind = asKnowledgeEventKind(payload.event);
  if (!kind) return null;

  const fieldText = asCallbackString(payload.rawText) ?? getRecognitionText(details);
  const streakKind = asKnowledgeStreakKind(payload.streakKind);
  const itemKind = asKnowledgeItemKind(payload.itemKind);
  const zone = asKnowledgeItemZone(payload.zone);
  const slotIndex = asCallbackNumber(payload.slotIndex);
  const slotLabel = asCallbackString(payload.slotLabel);
  const championName = asCallbackString(payload.championName);
  const streakCount =
    kind === 'streakRecognized' && fieldText
      ? (asCallbackNumber(payload.streakCount) ?? parseFirstOcrInteger(fieldText))
      : asCallbackNumber(payload.streakCount);
  const nodeName = typeof details.name === 'string' ? details.name : undefined;

  return {
    id: `${timestamp}-${nodeName ?? kind}`,
    timestamp,
    kind,
    scanKind: asRecognitionKind(payload.scanKind),
    slotIndex,
    slotLabel,
    championName,
    templatePath: asCallbackString(payload.templatePath),
    itemKind,
    zone,
    streakKind,
    streakCount,
    rawText: fieldText,
    message: t(`goldenSpatula.recognition.knowledgeEvent.${kind}`, {
      slot: slotLabel ?? slotIndex,
      itemKind: itemKind ? t(`goldenSpatula.recognition.itemKind.${itemKind}`) : undefined,
      zone: zone ? t(`goldenSpatula.recognition.zone.${zone}`) : undefined,
      streakKind: streakKind ? t(`goldenSpatula.recognition.streakKind.${streakKind}`) : undefined,
      count: streakCount,
      rawText: fieldText,
    }),
    nodeName,
  };
}

function getKnowledgeItemKey(event: GoldenSpatulaKnowledgeEvent): string | undefined {
  if (!event.itemKind || !event.templatePath) return undefined;
  return `${event.itemKind}:${event.templatePath.trim().toLocaleLowerCase()}`;
}

export function mergeKnowledgeEvent(
  previous: GoldenSpatulaKnowledgeScanState,
  event: GoldenSpatulaKnowledgeEvent,
  maxEvents = goldenSpatulaMaxKnowledgeEvents,
): GoldenSpatulaKnowledgeScanState {
  const started =
    event.kind === 'shopScanStarted' ||
    event.kind === 'itemScanStarted' ||
    event.kind === 'streakScanStarted';
  const completed =
    event.kind === 'shopScanCompleted' ||
    event.kind === 'itemScanCompleted' ||
    event.kind === 'streakScanCompleted';
  const shopSlots = event.kind === 'shopScanStarted' ? {} : { ...previous.shopSlots };
  const items =
    event.kind === 'itemScanStarted' && event.itemKind
      ? Object.fromEntries(
          Object.entries(previous.items).filter(([, item]) => item.itemKind !== event.itemKind),
        )
      : { ...previous.items };
  const streak = event.kind === 'streakScanStarted' ? {} : { ...previous.streak };

  if (event.kind === 'shopChampionHit' && event.slotIndex !== undefined) {
    shopSlots[event.slotIndex] = {
      slotIndex: event.slotIndex,
      slotLabel: event.slotLabel,
      championName: event.championName,
      templatePath: event.templatePath,
      confidence: 'matched',
      updatedAt: event.timestamp,
    };
  } else if (event.kind === 'shopSlotMiss' && event.slotIndex !== undefined) {
    shopSlots[event.slotIndex] = {
      slotIndex: event.slotIndex,
      slotLabel: event.slotLabel,
      confidence: 'empty',
      updatedAt: event.timestamp,
    };
  }

  if (event.kind === 'itemHit') {
    const key = getKnowledgeItemKey(event);
    if (key && event.itemKind && event.templatePath && event.zone) {
      const previousItem = items[key];
      const zones = new Set(previousItem?.zones ?? []);
      zones.add(event.zone);
      items[key] = {
        templatePath: event.templatePath,
        itemKind: event.itemKind,
        zones: [...zones],
        updatedAt: event.timestamp,
      };
    }
  }

  if (
    (event.kind === 'streakRecognized' || event.kind === 'streakScanFailed') &&
    event.streakKind
  ) {
    streak[event.streakKind] = {
      kind: event.streakKind,
      count: event.streakCount,
      rawText: event.rawText,
      updatedAt: event.timestamp,
      status: event.kind === 'streakRecognized' ? 'recognized' : 'miss',
    };
  }

  return {
    active: started ? true : completed ? false : previous.active,
    shopSlots,
    items,
    streak,
    startedAt: started ? event.timestamp : previous.startedAt,
    updatedAt: event.timestamp,
    lastEvent: event,
    events: [event, ...previous.events].slice(0, maxEvents),
  };
}
