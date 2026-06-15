import {
  goldenSpatulaAugmentFocusScope,
  type GoldenSpatulaAugmentOcrField,
  type GoldenSpatulaAugmentPipelineEvent,
} from '@/services/goldenSpatulaRollPipeline';

export const goldenSpatulaMaxAugmentEvents = 20;
const goldenSpatulaDuplicateAugmentMissSuppressMs = 2500;

export interface GoldenSpatulaAugmentCallbackDetails {
  focus?: unknown;
  name?: unknown;
  recognition_detail?: unknown;
  recognition_text?: unknown;
  ocr_text?: unknown;
  text?: unknown;
  rawText?: unknown;
  value?: unknown;
}

export type GoldenSpatulaAugmentEventTranslator = (
  key: string,
  values?: Record<string, unknown>,
) => string;

export interface GoldenSpatulaAugmentScanEvent {
  id: string;
  timestamp: number;
  kind: GoldenSpatulaAugmentPipelineEvent;
  slotIndex?: number;
  slotLabel?: string;
  field?: GoldenSpatulaAugmentOcrField;
  rawText?: string;
  title?: string;
  matchedName?: string;
  score?: number;
  message: string;
  nodeName?: string;
}

export type GoldenSpatulaAugmentOcrStatus = 'recognized' | 'miss' | 'unknown';

export interface GoldenSpatulaAugmentChoiceObservation {
  slotIndex: number;
  slotLabel?: string;
  titleText?: string;
  descriptionText?: string;
  titleStatus: GoldenSpatulaAugmentOcrStatus;
  descriptionStatus: GoldenSpatulaAugmentOcrStatus;
  updatedAt: number;
}

export interface GoldenSpatulaAugmentScanState {
  active: boolean;
  startedAt?: number;
  updatedAt?: number;
  choices: Record<number, GoldenSpatulaAugmentChoiceObservation>;
  lastEvent?: GoldenSpatulaAugmentScanEvent;
  events: GoldenSpatulaAugmentScanEvent[];
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

function getRecognitionText(details: GoldenSpatulaAugmentCallbackDetails): string | undefined {
  const record = asCallbackRecord(details);
  return record ? extractRecognitionTextFromRecord(record) : undefined;
}

function getFocusPayload(
  message: string,
  details: GoldenSpatulaAugmentCallbackDetails,
): Record<string, unknown> | undefined {
  const focus = asCallbackRecord(details.focus);
  return asCallbackRecord(focus?.[message]);
}

function isAugmentEventKind(value: unknown): value is GoldenSpatulaAugmentPipelineEvent {
  return (
    value === 'started' ||
    value === 'recognized' ||
    value === 'scanFailed' ||
    value === 'scanned' ||
    value === 'picked' ||
    value === 'completed' ||
    value === 'notReady'
  );
}

function asAugmentOcrField(value: unknown): GoldenSpatulaAugmentOcrField | undefined {
  return value === 'title' || value === 'description' ? value : undefined;
}

export function createEmptyAugmentScanState(): GoldenSpatulaAugmentScanState {
  return {
    active: false,
    choices: {},
    events: [],
  };
}

export function buildAugmentScanEvent(
  message: string,
  details: GoldenSpatulaAugmentCallbackDetails,
  t: GoldenSpatulaAugmentEventTranslator,
): GoldenSpatulaAugmentScanEvent | null {
  const payload = getFocusPayload(message, details);
  if (payload?.scope !== goldenSpatulaAugmentFocusScope || !isAugmentEventKind(payload.event)) {
    return null;
  }

  const kind = payload.event;
  const slotIndex = asCallbackNumber(payload.slotIndex);
  const field = asAugmentOcrField(payload.field);
  const rawText = kind === 'recognized' ? getRecognitionText(details) : undefined;
  const title = asCallbackString(payload.title);
  const matchedName = asCallbackString(payload.matchedName);
  const score = asCallbackNumber(payload.score);

  return {
    id: `${Date.now()}-${asCallbackString(details.name) ?? kind}`,
    timestamp: Date.now(),
    kind,
    slotIndex,
    slotLabel: asCallbackString(payload.slotLabel),
    field,
    rawText,
    title,
    matchedName,
    score,
    nodeName: asCallbackString(details.name),
    message: t(`goldenSpatula.lineups.augmentStatusEvent.${kind}`, {
      slot: slotIndex,
      field: field ? t(`goldenSpatula.lineups.augmentField.${field}`) : undefined,
      text: rawText,
      title,
      matchedName,
      score,
    }),
  };
}

export function mergeAugmentScanEvent(
  previous: GoldenSpatulaAugmentScanState,
  event: GoldenSpatulaAugmentScanEvent,
  maxEvents = goldenSpatulaMaxAugmentEvents,
): GoldenSpatulaAugmentScanState {
  if (
    event.kind === 'scanFailed' &&
    previous.lastEvent?.kind === 'scanFailed' &&
    previous.lastEvent.slotIndex === event.slotIndex &&
    previous.lastEvent.field === event.field &&
    event.timestamp - previous.lastEvent.timestamp < goldenSpatulaDuplicateAugmentMissSuppressMs
  ) {
    return previous;
  }

  const updatedAt = event.timestamp;
  const choices = { ...previous.choices };

  if (event.slotIndex !== undefined) {
    const current = choices[event.slotIndex] ?? {
      slotIndex: event.slotIndex,
      slotLabel: event.slotLabel,
      titleStatus: 'unknown' as const,
      descriptionStatus: 'unknown' as const,
      updatedAt,
    };
    const nextChoice: GoldenSpatulaAugmentChoiceObservation = {
      ...current,
      slotLabel: event.slotLabel ?? current.slotLabel,
      updatedAt,
    };

    if (event.field === 'title') {
      nextChoice.titleStatus = event.kind === 'recognized' ? 'recognized' : 'miss';
      if (event.rawText) nextChoice.titleText = event.rawText;
    }
    if (event.field === 'description') {
      nextChoice.descriptionStatus = event.kind === 'recognized' ? 'recognized' : 'miss';
      if (event.rawText) nextChoice.descriptionText = event.rawText;
    }

    choices[event.slotIndex] = nextChoice;
  }

  return {
    active:
      event.kind === 'started'
        ? true
        : event.kind === 'scanned' ||
            event.kind === 'picked' ||
            event.kind === 'completed' ||
            event.kind === 'notReady'
          ? false
          : previous.active,
    startedAt: event.kind === 'started' ? event.timestamp : previous.startedAt,
    updatedAt,
    choices,
    lastEvent: event,
    events: [event, ...previous.events].slice(0, maxEvents),
  };
}
