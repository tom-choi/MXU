import {
  goldenSpatulaAutoRollBuyFocusScope,
  goldenSpatulaXpFocusScope,
  type GoldenSpatulaAutoRollCount,
} from '@/services/goldenSpatulaRollPipeline';
import type {
  GoldenSpatulaRollEvent,
  GoldenSpatulaRollEventKind,
  GoldenSpatulaRollRunState,
  GoldenSpatulaXpEvent,
  GoldenSpatulaXpEventKind,
  GoldenSpatulaXpRunState,
} from '@/types/goldenSpatula';

export const goldenSpatulaMaxRollEvents = 20;
export const goldenSpatulaMaxXpEvents = 20;

export interface GoldenSpatulaAutomationCallbackDetails {
  focus?: unknown;
  name?: unknown;
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
