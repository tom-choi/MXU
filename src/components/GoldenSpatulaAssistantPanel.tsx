import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  Activity,
  Bot,
  BookOpen,
  CheckCircle2,
  Clipboard,
  ClipboardPaste,
  Coins,
  Copy,
  CopyPlus,
  Crosshair,
  Database,
  Download,
  Droplet,
  FileWarning,
  Heart,
  Import,
  ListChecks,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Route,
  Search,
  Shield,
  ShieldAlert,
  ShoppingCart,
  Sparkles,
  Sword,
  Target,
  Trash2,
  Wrench,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import type { TFunction } from 'i18next';
import clsx from 'clsx';
import { toast } from 'sonner';
import { maaService, type MaaCallbackDetails } from '@/services/maaService';
import { loadIconAsDataUrl } from '@/services/contentResolver';
import {
  buildEconomyEvent,
  buildEconomyEventFromRollEvent,
  buildEconomyEventFromXpEvent,
  buildHandEvent,
  buildHandEventFromRollEvent,
  buildKnowledgeEvent,
  buildRollEvent,
  buildXpEvent,
  createEmptyEconomyRunState,
  createEmptyHandRunState,
  createEmptyKnowledgeScanState,
  createEmptyRollRunState,
  createEmptyXpRunState,
  mergeEconomyEvent,
  mergeHandEvent,
  mergeKnowledgeEvent,
  mergeRollEvent,
  mergeXpEvent,
} from '@/services/goldenSpatulaAutomationEvents';
import {
  buildAugmentScanEvent,
  createEmptyAugmentScanState,
  mergeAugmentScanEvent,
  type GoldenSpatulaAugmentScanEvent,
  type GoldenSpatulaAugmentScanState,
} from '@/services/goldenSpatulaAugmentAutomation';
import {
  preloadGoldenSpatulaAugmentChoiceVisionTemplates,
  recognizeGoldenSpatulaAugmentChoicesFromImageElement,
  recognizeGoldenSpatulaAugmentChoicesFromDataUrl,
  type GoldenSpatulaAugmentChoiceVisionResult,
} from '@/services/goldenSpatulaAugmentChoiceVision';
import {
  buildGoldenSpatulaAugmentDecision,
  type GoldenSpatulaAugmentDecision,
} from '@/services/goldenSpatulaAugmentDecisionModel';
import { buildGoldenSpatulaDecisionPlan } from '@/services/goldenSpatulaDecisionEngine';
import {
  collectGoldenSpatulaVariantUnits,
  getGoldenSpatulaActiveRollTargetNames,
  isGoldenSpatulaCarryUnit,
  isGoldenSpatulaDisplayableUnit,
} from '@/services/goldenSpatulaDecisionContext';
import {
  createManagedLineupFromRecommended,
  createManualLineup,
  exportGoldenSpatulaLineups,
  loadGoldenSpatulaAssistantData,
  loadGoldenSpatulaRecommendedLineups,
  parseGoldenSpatulaLineupImport,
} from '@/services/goldenSpatulaService';
import {
  buildAutoLevelRollBuyPipelineOverride,
  buildAutoRollBuyPipelineOverride,
  buildAutoPickAugmentPipelineOverride,
  goldenSpatulaAugmentFocusScope,
  goldenSpatulaAutoLevelRollBuyEntry as autoLevelRollBuyEntry,
  goldenSpatulaAutoRollBuyEntry as autoRollBuyEntry,
  goldenSpatulaAutoPickAugmentEntry as autoPickAugmentEntry,
  type GoldenSpatulaAutoRollCount,
} from '@/services/goldenSpatulaRollPipeline';
import { collectGoldenSpatulaDecisionRollTargetTemplates } from '@/services/goldenSpatulaRollTargets';
import {
  createGoldenSpatulaEconomyStabilizerState,
  stabilizeGoldenSpatulaEconomyResult,
} from '@/services/goldenSpatulaEconomyStabilizer';
import { recognizeGoldenSpatulaEconomyFromDataUrl } from '@/services/goldenSpatulaEconomyVision';
import {
  recognizeGoldenSpatulaShopFromDataUrl,
  type GoldenSpatulaShopVisionResult,
} from '@/services/goldenSpatulaShopVision';
import {
  findGoldenSpatulaSelectedAugmentDetailPanelTargetsFromDataUrl,
  findGoldenSpatulaSelectedAugmentProbeTargetsFromDataUrl,
  recognizeGoldenSpatulaSelectedAugmentsFromDataUrl,
  recognizeGoldenSpatulaSelectedAugmentDetailFromDataUrl,
  scaleGoldenSpatulaSelectedAugmentTargetFromDataUrl,
  type GoldenSpatulaSelectedAugmentDetailDiagnostics,
  type GoldenSpatulaSelectedAugmentProbeTarget,
  type GoldenSpatulaSelectedAugmentVisionSlotResult,
  type GoldenSpatulaSelectedAugmentVisionResult,
} from '@/services/goldenSpatulaSelectedAugmentVision';
import {
  detectGoldenSpatulaAugmentPresenceFromLoadedImage,
  detectGoldenSpatulaAugmentPresenceFromDataUrl,
  loadGoldenSpatulaAugmentPresenceImage,
  type GoldenSpatulaAugmentPresenceResult,
} from '@/services/goldenSpatulaAugmentPresenceVision';
import {
  detectGoldenSpatulaSpecialEventsFromDataUrl,
  type GoldenSpatulaSpecialEventDetection,
  type GoldenSpatulaSpecialEventType,
} from '@/services/goldenSpatulaSpecialEventVision';
import { useAppStore } from '@/stores/appStore';
import type {
  GoldenSpatulaAssistantData,
  GoldenSpatulaAugmentAsset,
  GoldenSpatulaAugmentAssetIndex,
  GoldenSpatulaChampionAsset,
  GoldenSpatulaChampionAssetIndex,
  GoldenSpatulaChampionStat,
  GoldenSpatulaDecisionPlan,
  GoldenSpatulaPickRecommendation,
  GoldenSpatulaEconomyEvent,
  GoldenSpatulaEconomyRunState,
  GoldenSpatulaHandRunState,
  GoldenSpatulaKnowledgeEvent,
  GoldenSpatulaItemAsset,
  GoldenSpatulaItemAssetIndex,
  GoldenSpatulaKnowledgeScanState,
  GoldenSpatulaKnowledgeSelectedAugmentState,
  GoldenSpatulaKnowledgeShopSlotState,
  GoldenSpatulaLineupAugmentRecommendationDetail,
  GoldenSpatulaLineupAugmentRecommendationGroup,
  GoldenSpatulaLineupAugmentStrengthTier,
  GoldenSpatulaLineupUnit,
  GoldenSpatulaLineupVariant,
  GoldenSpatulaManagedLineup,
  GoldenSpatulaRecognitionKind,
  GoldenSpatulaRecognitionStatus,
  GoldenSpatulaRecognitionSummary,
  GoldenSpatulaRecommendedLineup,
  GoldenSpatulaRecommendedLineupsData,
  GoldenSpatulaRollEvent,
  GoldenSpatulaRollRunState,
  GoldenSpatulaShopOddsSource,
  GoldenSpatulaTemplateCategory,
  GoldenSpatulaTemplateCategoryStatus,
  GoldenSpatulaTraitAsset,
  GoldenSpatulaTraitAssetIndex,
  GoldenSpatulaVariantSlot,
  GoldenSpatulaXpRunState,
} from '@/types/goldenSpatula';

export const GOLDEN_SPATULA_PROJECT = 'GoldenSpatulaMuMu';
const KNOWLEDGE_RESOURCE = 'GoldenSpatulaKnowledge';
const MAX_RECOGNITION_SUMMARIES = 20;
const selectedAugmentCheckIntervalMs = 5000;
const selectedAugmentMissingPassiveCheckIntervalMs = 45000;
const selectedAugmentUnknownRoundCheckIntervalMs = 60000;
const selectedAugmentOneStableCheckIntervalMs = 30000;
const selectedAugmentTwoStableCheckIntervalMs = 45000;
const selectedAugmentThreeStableCheckIntervalMs = 60000;
const selectedAugmentFullStableCheckIntervalMs = 90000;
const selectedAugmentPostChoiceWakeWindowMs = 12000;
const selectedAugmentChoiceWakeMinIntervalMs = 3000;
const selectedAugmentNoPresenceBackoffMs = 45000;
const selectedAugmentNoPresenceMaxBackoffMs = 180000;
const selectedAugmentNoMatchBackoffMs = 15000;
const selectedAugmentMaxScanSlots = 4;
const selectedAugmentRepeatedImageBackoffMs = 30000;
const selectedAugmentVisionEnabled = true;
const selectedAugmentActiveProbeEnabled = true;
const selectedAugmentActiveProbeMissThreshold = 2;
const selectedAugmentActiveProbeMinIntervalMs = 30000;
const selectedAugmentActiveProbeClickDelayMs = 340;
const selectedAugmentActiveProbeScreencapDelayMs = 220;
const selectedAugmentActiveProbeCloseDelayMs = 120;
const selectedAugmentDetailProbeSettleRetryDelayMs = 300;
const selectedAugmentActiveProbeCloseLogicalTarget = [650, 360] as const;
const selectedAugmentProbeReliabilityWindowSize = 20;
const selectedAugmentProbeReliabilityTargetRate = 0.9;
const selectedAugmentProbeCalibrationTargetLimit = 4;
const selectedAugmentProbePanelTargetLimit = 4;
const selectedAugmentProbeMaxClickAttempts = 8;
const selectedAugmentProbeBatchSize = 10;
const selectedAugmentProbeTraceLimit = 10;
const augmentPresenceCheckIntervalMs = 1000;
const specialEventMissingGraceMs = 3000;
const augmentOcrExperimentalEnabled = false;

type SelectedAugmentProbeRunStage =
  | 'matched'
  | 'noTargets'
  | 'noPanelTarget'
  | 'noDetailCard'
  | 'detailUnmatched'
  | 'blocked'
  | 'cancelled'
  | 'noScreenshot'
  | 'error';

interface SelectedAugmentProbeReliabilitySnapshot {
  total: number;
  success: number;
  passRate: number;
  targetRate: number;
  history: boolean[];
  lastStage?: SelectedAugmentProbeRunStage;
  lastAttempts: number;
  lastUpdatedAt?: number;
}

interface SelectedAugmentDetailProbeResult {
  detailMatched: boolean;
  finalImage: string;
  stage: SelectedAugmentProbeRunStage;
  attempts: number;
  match?: GoldenSpatulaSelectedAugmentVisionSlotResult;
  detailDiagnostics?: GoldenSpatulaSelectedAugmentDetailDiagnostics;
  target?: GoldenSpatulaSelectedAugmentProbeTarget;
  panelTarget?: GoldenSpatulaSelectedAugmentProbeTarget;
  panelTargetCount: number;
}

interface SelectedAugmentProbeSequenceResult {
  detailMatched: boolean;
  finalImage: string;
  stage: SelectedAugmentProbeRunStage;
  attempts: number;
  targetCount: number;
  panelTargetCount?: number;
  match?: GoldenSpatulaSelectedAugmentVisionSlotResult;
  detailDiagnostics?: GoldenSpatulaSelectedAugmentDetailDiagnostics;
  target?: GoldenSpatulaSelectedAugmentProbeTarget;
  panelTarget?: GoldenSpatulaSelectedAugmentProbeTarget;
}

interface SelectedAugmentDetailRecognitionResult {
  match?: GoldenSpatulaSelectedAugmentVisionSlotResult;
  diagnostics?: GoldenSpatulaSelectedAugmentDetailDiagnostics;
}

interface SelectedAugmentProbeCandidateStats {
  success: number;
  failure: number;
  lastUpdatedAt: number;
}

interface SelectedAugmentProbeTraceTarget {
  slotIndex: number;
  slotLabel: string;
  source?: GoldenSpatulaSelectedAugmentProbeTarget['source'];
  augmentName?: string;
  score?: number;
  logicalTarget?: readonly [number, number];
  screenTarget?: readonly [number, number];
}

interface SelectedAugmentProbeTraceMatch {
  augmentName?: string;
  score?: number;
  slotIndex: number;
  slotLabel: string;
  templatePath?: string;
  matchKind?: GoldenSpatulaSelectedAugmentVisionSlotResult['matchKind'];
  matchCenter?: readonly [number, number];
  matchSourceLabel?: string;
  matchSide?: GoldenSpatulaSelectedAugmentVisionSlotResult['matchSide'];
  matchMargin?: number;
}

interface SelectedAugmentProbeTraceEntry {
  id: string;
  timestamp: number;
  runKind: 'active' | 'single' | 'batch';
  iteration?: number;
  total?: number;
  success: boolean;
  stage: SelectedAugmentProbeRunStage;
  attempts: number;
  targetCount: number;
  panelTargetCount?: number;
  initialImage?: string;
  finalImage?: string;
  target?: SelectedAugmentProbeTraceTarget;
  panelTarget?: SelectedAugmentProbeTraceTarget;
  match?: SelectedAugmentProbeTraceMatch;
  detailDiagnostics?: GoldenSpatulaSelectedAugmentDetailDiagnostics;
}

function createEmptySelectedAugmentProbeReliability(): SelectedAugmentProbeReliabilitySnapshot {
  return {
    total: 0,
    success: 0,
    passRate: 0,
    targetRate: selectedAugmentProbeReliabilityTargetRate,
    history: [],
    lastAttempts: 0,
  };
}

function updateSelectedAugmentProbeReliability(
  previous: SelectedAugmentProbeReliabilitySnapshot,
  result: {
    success: boolean;
    stage: SelectedAugmentProbeRunStage;
    attempts: number;
  },
): SelectedAugmentProbeReliabilitySnapshot {
  const history = [...previous.history, result.success].slice(
    -selectedAugmentProbeReliabilityWindowSize,
  );
  const success = history.filter(Boolean).length;
  const total = history.length;

  return {
    total,
    success,
    passRate: total > 0 ? success / total : 0,
    targetRate: selectedAugmentProbeReliabilityTargetRate,
    history,
    lastStage: result.stage,
    lastAttempts: result.attempts,
    lastUpdatedAt: Date.now(),
  };
}

function waitMs(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function isSelectedAugmentProbeBlockingSpecialEvent(
  events: Partial<
    Record<
      GoldenSpatulaSpecialEventType,
      {
        visible: boolean;
      }
    >
  >,
): boolean {
  return Boolean(
    events.augmentChoice?.visible ||
    events.deityDuel?.visible ||
    events.rewardBlessing?.visible ||
    events.itemArmory?.visible,
  );
}

function parseGoldenSpatulaRound(
  round: string | undefined,
): { stage: number; turn: number } | undefined {
  const [stageText, turnText] = String(round ?? '').split('-');
  const stage = Number(stageText);
  const turn = Number(turnText);
  if (!Number.isFinite(stage) || !Number.isFinite(turn)) return undefined;

  return { stage, turn };
}

function isSelectedAugmentScanAvailable(
  round: string | undefined,
  matchedSelectedAugmentCount: number,
): boolean {
  const parsed = parseGoldenSpatulaRound(round);
  if (!parsed) return true;
  if (matchedSelectedAugmentCount > 0) return true;
  return parsed.stage >= 2;
}

function isLikelySelectedAugmentUpdateWindow(round: string | undefined): boolean {
  const parsed = parseGoldenSpatulaRound(round);
  if (!parsed) return false;
  const { stage, turn } = parsed;

  return (
    (stage === 2 && turn <= 2) ||
    (stage === 3 && turn >= 2 && turn <= 3) ||
    (stage === 4 && turn >= 2 && turn <= 3) ||
    (stage === 5 && turn >= 2 && turn <= 3)
  );
}

function getExpectedSelectedAugmentCountForRound(round: string | undefined): number {
  const parsed = parseGoldenSpatulaRound(round);
  if (!parsed) return 0;
  const { stage } = parsed;
  if (stage < 2) return 0;
  if (stage === 2) return 1;
  if (stage === 3) return 2;
  if (stage === 4) return 3;
  return 4;
}

function getSelectedAugmentMaxScanSlots(
  round: string | undefined,
  matchedSelectedAugmentCount: number,
): number {
  const expectedSelectedAugmentCount = getExpectedSelectedAugmentCountForRound(round);
  const scanTarget =
    expectedSelectedAugmentCount > 0
      ? Math.max(expectedSelectedAugmentCount, matchedSelectedAugmentCount)
      : Math.max(1, matchedSelectedAugmentCount + 1);
  return Math.max(1, Math.min(selectedAugmentMaxScanSlots, scanTarget));
}

function getStableSelectedAugmentCheckIntervalMs(matchedSelectedAugmentCount: number): number {
  if (matchedSelectedAugmentCount >= 4) return selectedAugmentFullStableCheckIntervalMs;
  if (matchedSelectedAugmentCount >= 3) return selectedAugmentThreeStableCheckIntervalMs;
  if (matchedSelectedAugmentCount >= 2) return selectedAugmentTwoStableCheckIntervalMs;
  if (matchedSelectedAugmentCount >= 1) return selectedAugmentOneStableCheckIntervalMs;
  return selectedAugmentUnknownRoundCheckIntervalMs;
}

function getGoldenSpatulaDataUrlFastFingerprint(dataUrl: string): string {
  if (!dataUrl.startsWith('data:image/')) return '';
  const middle = Math.max(0, Math.floor(dataUrl.length / 2) - 64);
  return [
    dataUrl.length,
    dataUrl.slice(0, 80),
    dataUrl.slice(middle, middle + 128),
    dataUrl.slice(-128),
  ].join(':');
}

function getSelectedAugmentCheckIntervalMs(
  round: string | undefined,
  matchedSelectedAugmentCount: number,
): number {
  const parsed = parseGoldenSpatulaRound(round);
  if (!parsed) {
    return getStableSelectedAugmentCheckIntervalMs(matchedSelectedAugmentCount);
  }

  const expectedSelectedAugmentCount = getExpectedSelectedAugmentCountForRound(round);
  if (
    isLikelySelectedAugmentUpdateWindow(round) &&
    matchedSelectedAugmentCount < expectedSelectedAugmentCount
  ) {
    return selectedAugmentCheckIntervalMs;
  }
  if (matchedSelectedAugmentCount < expectedSelectedAugmentCount) {
    return selectedAugmentMissingPassiveCheckIntervalMs;
  }
  return getStableSelectedAugmentCheckIntervalMs(matchedSelectedAugmentCount);
}

function hasGoldenSpatulaAugmentVisionAssets(
  augmentAssets: GoldenSpatulaAugmentAssetIndex | undefined,
): boolean {
  return Object.values(augmentAssets ?? {}).some(
    (asset) => Boolean(asset.imagePath) && asset.templateAvailable !== false,
  );
}

function waitForSelectedAugmentVisionBackgroundSlot(): Promise<void> {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => {
      const requestIdleCallback = (
        window as Window & {
          requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
        }
      ).requestIdleCallback;
      if (requestIdleCallback) {
        requestIdleCallback(resolve, { timeout: 1200 });
      } else {
        window.setTimeout(resolve, 0);
      }
    });
  });
}

const knowledgeTaskNames = new Set([
  'KnowledgeSmokeTest',
  'RecognizeShopChampions',
  'RecognizeBasicItems',
  'RecognizeCompletedItems',
  'RecognizeSpecialItems',
  'RecognizeStreakState',
  'RecognizeTraitsPanel',
  'RecognizeEconomyState',
]);

type AutoRollCount = GoldenSpatulaAutoRollCount;
type AutoDecisionMode = 'off' | 'roll' | 'level';

const autoRollCounts: AutoRollCount[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const autoRollTaskByCount: Partial<Record<AutoRollCount, string>> = {
  1: 'AutoRollShopOnce',
  3: 'AutoRollShopThree',
  5: 'AutoRollShopFive',
};
const autoBuyExperienceTaskByCount: Partial<Record<AutoRollCount, string>> = {
  1: 'AutoBuyExperienceOnce',
  3: 'AutoBuyExperienceThree',
  5: 'AutoBuyExperienceFive',
};
const autoDecisionRollCost = 2;
const autoDecisionLevelCost = 4;
const autoDecisionInitialDelayMs = 5000;
const autoDecisionRepeatDelayMs = 3000;

function getAutoDecisionActionCost(mode: AutoDecisionMode): number | undefined {
  if (mode === 'roll') return autoDecisionRollCost;
  if (mode === 'level') return autoDecisionLevelCost;
  return undefined;
}

function clampAutoRollCount(value: number | undefined, fallback: number): AutoRollCount {
  const raw = Number.isFinite(value) ? Math.trunc(value as number) : fallback;
  return Math.max(1, Math.min(10, raw)) as AutoRollCount;
}

const battleBoardSlotCount = 28;
const hexClipPath = 'polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0 50%)';

const recognitionNodeMap: Record<
  string,
  { kind: GoldenSpatulaRecognitionKind; status: GoldenSpatulaRecognitionStatus }
> = {
  KnowledgeSmoke_Done: { kind: 'smoke', status: 'success' },
  KnowledgeSmoke_ChampionTemplateLoads: { kind: 'smoke', status: 'error' },
  KnowledgeSmoke_ItemTemplateLoads: { kind: 'smoke', status: 'error' },
  KnowledgeSmoke_TraitTemplateLoads: { kind: 'smoke', status: 'error' },
  KnowledgeSmoke_AugmentTemplateLoads: { kind: 'smoke', status: 'error' },
  KnowledgeShopChampions_MatchAny: { kind: 'champions', status: 'success' },
  KnowledgeShopChampions_NoMatch: { kind: 'champions', status: 'miss' },
  KnowledgeItems_MatchBasic: { kind: 'basicItems', status: 'success' },
  KnowledgeItems_NoBasicMatch: { kind: 'basicItems', status: 'miss' },
  KnowledgeBasicItems_MatchAny: { kind: 'basicItems', status: 'success' },
  KnowledgeBasicItems_NoMatch: { kind: 'basicItems', status: 'miss' },
  KnowledgeCompletedItems_MatchAny: { kind: 'completedItems', status: 'success' },
  KnowledgeCompletedItems_NoMatch: { kind: 'completedItems', status: 'miss' },
  KnowledgeSpecialItems_MatchAny: { kind: 'specialItems', status: 'success' },
  KnowledgeSpecialItems_NoMatch: { kind: 'specialItems', status: 'miss' },
  KnowledgeTraits_MatchAny: { kind: 'traits', status: 'success' },
  KnowledgeTraits_NoMatch: { kind: 'traits', status: 'miss' },
};

type AssistantTab = 'lineups' | 'strategy' | 'recognition' | 'calibration';

function hasFocusForMessage(
  message: string,
  details: MaaCallbackDetails & Record<string, unknown>,
) {
  const focus = details.focus as Record<string, unknown> | undefined;
  return Boolean(focus?.[message]);
}

function getPanelFocusPayload(
  message: string,
  details: MaaCallbackDetails & Record<string, unknown>,
): Record<string, unknown> | undefined {
  const focus = details.focus as Record<string, unknown> | undefined;
  const payload = focus?.[message];
  return payload && typeof payload === 'object' && !Array.isArray(payload)
    ? (payload as Record<string, unknown>)
    : undefined;
}

function getRecognitionMappingFromKnowledgeFocus(
  payload: Record<string, unknown> | undefined,
): { kind: GoldenSpatulaRecognitionKind; status: GoldenSpatulaRecognitionStatus } | null {
  if (payload?.scope !== 'goldenSpatula.knowledge') return null;

  switch (payload.event) {
    case 'shopChampionHit':
      return { kind: 'champions', status: 'success' };
    case 'shopSlotMiss':
      return { kind: 'champions', status: 'miss' };
    case 'selectedAugmentHit':
      return { kind: 'augments', status: 'success' };
    case 'selectedAugmentSlotMiss':
      return { kind: 'augments', status: 'miss' };
    case 'itemHit':
      if (
        payload.itemKind === 'basicItems' ||
        payload.itemKind === 'completedItems' ||
        payload.itemKind === 'specialItems'
      ) {
        return { kind: payload.itemKind, status: 'success' };
      }
      return { kind: 'basicItems', status: 'success' };
    case 'streakRecognized':
      return { kind: 'streak', status: 'success' };
    case 'streakScanFailed':
      return { kind: 'streak', status: 'miss' };
    default:
      return null;
  }
}

function getRecognitionMappingFromAugmentFocus(
  payload: Record<string, unknown> | undefined,
): { kind: GoldenSpatulaRecognitionKind; status: GoldenSpatulaRecognitionStatus } | null {
  if (payload?.scope !== goldenSpatulaAugmentFocusScope) return null;

  switch (payload.event) {
    case 'recognized':
      return { kind: 'augments', status: 'success' };
    case 'scanFailed':
      return { kind: 'augments', status: 'miss' };
    default:
      return null;
  }
}

function buildRecognitionSummary(
  message: string,
  details: MaaCallbackDetails & Record<string, unknown>,
  t: TFunction,
): GoldenSpatulaRecognitionSummary | null {
  if (!hasFocusForMessage(message, details)) return null;

  const nodeName = typeof details.name === 'string' ? details.name : undefined;
  if (!nodeName) return null;

  const mapped =
    getRecognitionMappingFromAugmentFocus(getPanelFocusPayload(message, details)) ??
    getRecognitionMappingFromKnowledgeFocus(getPanelFocusPayload(message, details)) ??
    recognitionNodeMap[nodeName];
  if (!mapped) return null;

  return {
    id: `${Date.now()}-${nodeName}`,
    timestamp: new Date(),
    kind: mapped.kind,
    status: mapped.status,
    message: t(`goldenSpatula.recognition.summary.${mapped.kind}.${mapped.status}`),
    nodeName,
  };
}

function StatusIcon({ ok }: { ok: boolean }) {
  return ok ? (
    <CheckCircle2 className="h-3 w-3 shrink-0 text-success" />
  ) : (
    <XCircle className="h-3 w-3 shrink-0 text-warning" />
  );
}

function StatusPill({
  children,
  tone,
}: {
  children: ReactNode;
  tone: 'success' | 'warning' | 'error' | 'muted';
}) {
  return (
    <span
      className={clsx(
        'shrink-0 rounded-full px-1.5 py-px text-[10px] font-semibold leading-4 ring-1 ring-inset',
        tone === 'success' && 'bg-success/15 text-success ring-success/30',
        tone === 'warning' && 'bg-warning/15 text-warning ring-warning/35',
        tone === 'error' && 'bg-error/15 text-error ring-error/30',
        tone === 'muted' && 'bg-bg-hover text-text-secondary ring-border/70',
      )}
    >
      {children}
    </span>
  );
}

function getRecommendedQualityTone(quality: string | undefined): 's' | 'a' | 'b' | 'default' {
  const grade = quality
    ?.trim()
    .match(/^[A-Za-z]\+?/u)?.[0]
    ?.toUpperCase();
  if (grade?.startsWith('S')) return 's';
  if (grade?.startsWith('A')) return 'a';
  if (grade?.startsWith('B')) return 'b';
  return 'default';
}

const goldenSpatulaNeutralTagClass =
  'inline-flex items-center rounded-full bg-bg-hover px-1.5 py-px text-[10px] font-semibold leading-4 text-text-secondary ring-1 ring-inset ring-border/70';

const goldenSpatulaAccentTagClass =
  'inline-flex items-center rounded-full bg-accent/10 px-1.5 py-px text-[10px] font-semibold leading-4 text-accent ring-1 ring-inset ring-accent/30';

function SectionTitle({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-bg-secondary px-2 py-px text-[10px] font-black uppercase tracking-wide text-text-secondary ring-1 ring-inset ring-border/35">
      <Icon className="h-3 w-3 text-text-muted" />
      <span>{label}</span>
    </div>
  );
}

function formatDate(value: string | undefined, fallback: string) {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

function TemplateCategoryRow({
  item,
  label,
  t,
}: {
  item: GoldenSpatulaTemplateCategoryStatus;
  label: string;
  t: TFunction;
}) {
  const ready = item.status === 'ready';
  const tone = ready ? 'success' : item.status === 'error' ? 'error' : 'warning';

  return (
    <div className="flex h-6 min-w-0 items-center justify-between gap-1.5 rounded-full bg-bg-primary/60 px-1.5 ring-1 ring-inset ring-border/30">
      <div className="flex min-w-0 items-center gap-1.5">
        <span
          className={clsx(
            'h-1.5 w-1.5 shrink-0 rounded-full',
            ready ? 'bg-success' : tone === 'error' ? 'bg-error' : 'bg-warning',
          )}
        />
        <span className="truncate text-[10px] font-bold text-text-secondary">{label}</span>
      </div>
      <StatusPill tone={tone}>
        {ready
          ? t('goldenSpatula.recognition.templateCount', { count: item.count ?? 0 })
          : t(`goldenSpatula.status.${item.status}`)}
      </StatusPill>
    </div>
  );
}

function createClientId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeSearchText(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function hasText(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

function unitLabel(unit: GoldenSpatulaLineupUnit): string {
  const items = unit.items && unit.items.length > 0 ? ` (${unit.items.join(' / ')})` : '';
  return `${unit.name}${items}`;
}

function shortUnitName(name: string): string {
  return name.length <= 2 ? name : name.slice(0, 2);
}

function collectLineupUnits(variant: GoldenSpatulaLineupVariant): GoldenSpatulaLineupUnit[] {
  return collectGoldenSpatulaVariantUnits(variant);
}

function isMainCarryUnit(
  unit: GoldenSpatulaLineupUnit,
  variant: GoldenSpatulaLineupVariant,
): boolean {
  return isGoldenSpatulaCarryUnit(unit, variant);
}

function findChampionAsset(
  unitName: string,
  assets: GoldenSpatulaChampionAssetIndex | undefined,
): GoldenSpatulaChampionAsset | undefined {
  return assets?.[normalizeSearchText(unitName)];
}

function findItemAsset(
  itemName: string,
  assets: GoldenSpatulaItemAssetIndex | undefined,
): GoldenSpatulaItemAsset | undefined {
  return assets?.[normalizeSearchText(itemName)];
}

function findTraitAsset(
  traitName: string,
  assets: GoldenSpatulaTraitAssetIndex | undefined,
): GoldenSpatulaTraitAsset | undefined {
  if (!assets) return undefined;
  const key = normalizeSearchText(traitName);
  return (
    assets[key] ??
    Object.values(assets).find((asset) =>
      asset.aliases?.some((alias) => normalizeSearchText(alias) === key),
    )
  );
}

function collectLineupItemFallbacks(variant: GoldenSpatulaLineupVariant): Map<string, string[]> {
  const itemsByName = new Map<string, string[]>();

  for (const unit of [...variant.mainCarries, ...variant.frontliners, ...variant.units]) {
    const key = normalizeSearchText(unit.name);
    const items = unit.items?.filter(hasText) ?? [];
    if (!key || items.length === 0) continue;

    const existing = itemsByName.get(key);
    if (!existing || items.length > existing.length) {
      itemsByName.set(key, items);
    }
  }

  return itemsByName;
}

function hydrateLineupUnitItems(
  units: GoldenSpatulaLineupUnit[],
  referenceItemsByName: Map<string, string[]>,
): { units: GoldenSpatulaLineupUnit[]; changed: boolean } {
  let changed = false;
  const hydrated = units.map((unit) => {
    if ((unit.items?.length ?? 0) > 0) return unit;

    const referenceItems = referenceItemsByName.get(normalizeSearchText(unit.name));
    if (!referenceItems || referenceItems.length === 0) return unit;

    changed = true;
    return { ...unit, items: referenceItems };
  });

  return { units: changed ? hydrated : units, changed };
}

function hydrateLineupVariantItemsFromReference(
  variant: GoldenSpatulaLineupVariant,
  reference: GoldenSpatulaLineupVariant,
): GoldenSpatulaLineupVariant {
  const referenceItemsByName = collectLineupItemFallbacks(reference);
  if (referenceItemsByName.size === 0 && (reference.equipmentOrder?.length ?? 0) === 0) {
    return variant;
  }

  const mainCarries = hydrateLineupUnitItems(variant.mainCarries, referenceItemsByName);
  const frontliners = hydrateLineupUnitItems(variant.frontliners, referenceItemsByName);
  const units = hydrateLineupUnitItems(variant.units, referenceItemsByName);
  const shouldFillEquipmentOrder =
    (variant.equipmentOrder?.length ?? 0) === 0 && (reference.equipmentOrder?.length ?? 0) > 0;

  if (!mainCarries.changed && !frontliners.changed && !units.changed && !shouldFillEquipmentOrder) {
    return variant;
  }

  return {
    ...variant,
    mainCarries: mainCarries.units,
    frontliners: frontliners.units,
    units: units.units,
    equipmentOrder: shouldFillEquipmentOrder ? reference.equipmentOrder : variant.equipmentOrder,
  };
}

function hydrateRecommendedManagedLineupItems(
  lineup: GoldenSpatulaManagedLineup,
  recommended: GoldenSpatulaRecommendedLineup,
): GoldenSpatulaManagedLineup {
  let changed = false;
  const variants = lineup.variants.map((variant, index) => {
    if (index !== 0) return variant;

    const hydrated = hydrateLineupVariantItemsFromReference(variant, recommended.variant);
    if (hydrated !== variant) changed = true;
    return hydrated;
  });

  return changed ? { ...lineup, variants } : lineup;
}

function normalizeKnowledgeTemplatePath(path: string | undefined): string {
  if (!path) return '';
  const normalized = path.replace(/\\/g, '/').replace(/^\/+/, '').toLocaleLowerCase();
  const marker = 'resource_knowledge/image/';
  const markerIndex = normalized.lastIndexOf(marker);
  return markerIndex >= 0 ? normalized.slice(markerIndex + marker.length) : normalized;
}

function findAssetByTemplatePath<T extends GoldenSpatulaChampionAsset>(
  templatePath: string | undefined,
  assets: Record<string, T> | undefined,
): T | undefined {
  const normalizedTemplate = normalizeKnowledgeTemplatePath(templatePath);
  if (!normalizedTemplate) return undefined;

  return Object.values(assets ?? {}).find((asset) =>
    normalizeKnowledgeTemplatePath(asset.imagePath).endsWith(normalizedTemplate),
  );
}

function formatLineupDisplayName(name: string | undefined): string {
  return name?.trim() || '-';
}

function parseLineupTraitTags(
  summary: string | undefined,
): Array<{ count?: string; name: string }> {
  if (!summary) return [];

  const result: Array<{ count?: string; name: string }> = [];
  const seen = new Set<string>();
  for (const rawPart of summary.split(/[\/,，、|]/u)) {
    const part = rawPart.trim();
    if (!part) continue;
    const match = part.match(/^(\d+)\s*(.+)$/u);
    const count = match?.[1];
    const name = (match?.[2] ?? part).trim();
    const key = normalizeSearchText(name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push({ count, name });
  }

  if (result.length > 0) return result;

  return Array.from(summary.matchAll(/(\d+)\s*([\p{Script=Han}A-Za-z·]{2,16})/gu))
    .map((match) => ({ count: match[1], name: match[2].trim() }))
    .filter((trait) => trait.name);
}

function traitNameMatches(
  candidate: string | undefined,
  traitName: string,
  traitAsset: GoldenSpatulaTraitAsset | undefined,
): boolean {
  if (!candidate) return false;
  const normalizedCandidate = normalizeSearchText(candidate);
  const normalizedTrait = normalizeSearchText(traitName);
  if (normalizedCandidate === normalizedTrait) return true;
  return Boolean(
    traitAsset?.aliases?.some((alias) => normalizeSearchText(alias) === normalizedCandidate),
  );
}

function collectLineupTraitUnits(
  variant: GoldenSpatulaLineupVariant,
  traitName: string,
  championAssets: GoldenSpatulaChampionAssetIndex | undefined,
  traitAssets?: GoldenSpatulaTraitAssetIndex,
): GoldenSpatulaLineupUnit[] {
  const traitAsset = findTraitAsset(traitName, traitAssets);
  return collectLineupUnits(variant).filter((unit) => {
    const asset = findChampionAsset(unit.name, championAssets);
    return asset?.traits?.some((trait) => traitNameMatches(trait, traitName, traitAsset));
  });
}

function parseTraitActiveCount(
  trait: { count?: string; name: string },
  variant: GoldenSpatulaLineupVariant,
  championAssets: GoldenSpatulaChampionAssetIndex | undefined,
): number | undefined {
  const parsed = Number(String(trait.count ?? '').match(/\d+/u)?.[0]);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  const count = collectLineupTraitUnits(variant, trait.name, championAssets).length;
  return count > 0 ? count : undefined;
}

function parseTraitEffectLines(asset: GoldenSpatulaTraitAsset | undefined): string[] {
  const raw = [asset?.effect, asset?.description].filter(hasText).join('\n');
  return raw
    .split(/[\n\r]+|(?<=。)|(?<=；)|(?<=;)/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function parseTraitEffectLine(line: string): { threshold?: number; text: string } {
  const match = line.match(/^\s*(?:\(?(\d{1,2})\)?|(\d{1,2})[：:])/u);
  const threshold = Number(match?.[1] ?? match?.[2]);
  return {
    threshold: Number.isFinite(threshold) && threshold > 0 ? threshold : undefined,
    text: line.replace(/^\s*\(?\d{1,2}\)?\s*[：:.-]?\s*/u, '').trim() || line,
  };
}

function getActiveTraitThreshold(
  thresholds: number[],
  activeCount: number | undefined,
): number | undefined {
  if (activeCount === undefined) return undefined;
  return thresholds
    .filter((threshold) => threshold <= activeCount)
    .sort((left, right) => right - left)[0];
}

function getLineupDisplayLevel(variant: GoldenSpatulaLineupVariant): number {
  return Math.max(1, Math.min(10, collectLineupUnits(variant).length));
}

function getLineupTotalCost(
  variant: GoldenSpatulaLineupVariant,
  championAssets: GoldenSpatulaChampionAssetIndex | undefined,
): number | undefined {
  let total = 0;
  let known = 0;
  for (const unit of collectLineupUnits(variant)) {
    const cost = findChampionAsset(unit.name, championAssets)?.cost;
    if (cost === undefined) continue;
    total += cost;
    known += 1;
  }
  return known > 0 ? total : undefined;
}

function formatShopOddsPercent(value: number | undefined): string {
  return formatOddsValue(value);
}

function mergeShopSlotsFromRollEvent(
  previous: GoldenSpatulaKnowledgeScanState,
  event: GoldenSpatulaRollEvent,
): GoldenSpatulaKnowledgeScanState {
  if (event.slotIndex === undefined) return previous;
  const timestamp = event.timestamp || Date.now();
  const shopSlots = { ...previous.shopSlots };
  if (event.kind === 'buyConfirmed' || event.kind === 'bought' || event.kind === 'missed') {
    shopSlots[event.slotIndex] = {
      slotIndex: event.slotIndex,
      slotLabel: event.slotLabel,
      championName: event.kind === 'missed' ? event.targetName : undefined,
      confidence: event.kind === 'missed' ? 'unknown' : 'empty',
      updatedAt: timestamp,
    };
  }

  return {
    ...previous,
    shopSlots,
    updatedAt: timestamp,
  };
}

function buildShopVisionKnowledgeEvents(
  result: GoldenSpatulaShopVisionResult,
  t: TFunction,
): GoldenSpatulaKnowledgeEvent[] {
  const timestamp = result.scannedAt || Date.now();
  const events: GoldenSpatulaKnowledgeEvent[] = [
    {
      id: `${timestamp}-shop-vision-started`,
      timestamp,
      kind: 'shopScanStarted',
      scanKind: 'champions',
      message: t('goldenSpatula.recognition.knowledgeEvent.shopScanStarted'),
      nodeName: 'ShopVision',
    },
  ];

  for (const slot of result.slots) {
    const hit = slot.confidence === 'matched' && Boolean(slot.championName);
    events.push({
      id: `${timestamp}-shop-vision-${slot.slotIndex}`,
      timestamp,
      kind: hit ? 'shopChampionHit' : 'shopSlotMiss',
      scanKind: 'champions',
      slotIndex: slot.slotIndex,
      slotLabel: slot.slotLabel,
      championName: slot.championName,
      templatePath: slot.templatePath,
      score: slot.score,
      message: t(
        `goldenSpatula.recognition.knowledgeEvent.${hit ? 'shopChampionHit' : 'shopSlotMiss'}`,
        {
          slot: slot.slotLabel ?? slot.slotIndex,
          championName: slot.championName,
        },
      ),
      nodeName: 'ShopVision',
    });
  }

  events.push({
    id: `${timestamp}-shop-vision-completed`,
    timestamp,
    kind: 'shopScanCompleted',
    scanKind: 'champions',
    message: t('goldenSpatula.recognition.knowledgeEvent.shopScanCompleted'),
    nodeName: 'ShopVision',
  });
  return events;
}

function buildSelectedAugmentKnowledgeEvents(
  result: GoldenSpatulaSelectedAugmentVisionResult,
  t: TFunction,
  nodeName = 'SelectedAugmentVision',
): GoldenSpatulaKnowledgeEvent[] {
  if (result.slots.length === 0) return [];

  const timestamp = result.scannedAt || Date.now();
  const events: GoldenSpatulaKnowledgeEvent[] = [
    {
      id: `${timestamp}-selected-augment-started`,
      timestamp,
      kind: 'selectedAugmentScanStarted',
      scanKind: 'augments',
      message: t('goldenSpatula.recognition.knowledgeEvent.selectedAugmentScanStarted'),
      nodeName,
    },
  ];

  for (const slot of result.slots) {
    const hit = slot.confidence === 'matched' && Boolean(slot.augmentName);
    events.push({
      id: `${timestamp}-selected-augment-${slot.slotIndex}`,
      timestamp,
      kind: hit ? 'selectedAugmentHit' : 'selectedAugmentSlotMiss',
      scanKind: 'augments',
      slotIndex: slot.slotIndex,
      slotLabel: slot.slotLabel,
      augmentName: slot.augmentName,
      templatePath: slot.templatePath,
      score: slot.score,
      message: t(
        `goldenSpatula.recognition.knowledgeEvent.${
          hit ? 'selectedAugmentHit' : 'selectedAugmentSlotMiss'
        }`,
        {
          slot: slot.slotLabel ?? slot.slotIndex,
          augmentName: slot.augmentName,
        },
      ),
      nodeName,
    });
  }

  events.push({
    id: `${timestamp}-selected-augment-completed`,
    timestamp,
    kind: 'selectedAugmentScanCompleted',
    scanKind: 'augments',
    message: t('goldenSpatula.recognition.knowledgeEvent.selectedAugmentScanCompleted'),
    nodeName,
  });
  return events;
}

function buildAugmentChoiceVisionScanState(
  result: GoldenSpatulaAugmentChoiceVisionResult,
  t: TFunction,
): GoldenSpatulaAugmentScanState {
  const timestamp = result.scannedAt || Date.now();
  const events: GoldenSpatulaAugmentScanEvent[] = result.slots.map((slot) => {
    const matched = slot.confidence === 'matched' && Boolean(slot.augmentName);
    return {
      id: `${timestamp}-augment-choice-${slot.slotIndex}`,
      timestamp,
      kind: matched ? 'recognized' : 'scanFailed',
      slotIndex: slot.slotIndex,
      slotLabel: slot.slotLabel,
      field: 'title',
      title: slot.augmentName,
      matchedName: slot.augmentName,
      score: slot.score,
      message: t(
        `goldenSpatula.lineups.augmentStatusEvent.${matched ? 'recognized' : 'scanFailed'}`,
        {
          slot: slot.slotLabel ?? slot.slotIndex,
          field: t('goldenSpatula.lineups.augmentField.title'),
          matchedName: slot.augmentName,
          score: slot.score,
        },
      ),
      nodeName: 'AugmentChoiceVision',
    };
  });

  const choices: GoldenSpatulaAugmentScanState['choices'] = {};
  for (const slot of result.slots) {
    choices[slot.slotIndex] = {
      slotIndex: slot.slotIndex,
      slotLabel: slot.slotLabel,
      titleText: slot.augmentName,
      titleStatus: slot.confidence === 'matched' ? 'recognized' : 'miss',
      descriptionStatus: 'unknown',
      updatedAt: timestamp,
    };
  }

  return {
    active: false,
    startedAt: timestamp,
    updatedAt: timestamp,
    choices,
    lastEvent: events[0],
    events,
  };
}

function costColor(cost: number | undefined): string {
  switch (cost) {
    case 1:
      return '#94a3b8';
    case 2:
      return '#22c55e';
    case 3:
      return '#38bdf8';
    case 4:
      return '#a855f7';
    case 5:
      return '#f59e0b';
    default:
      return 'var(--color-border)';
  }
}

function costFrameStyle(cost: number | undefined): CSSProperties {
  const color = costColor(cost);
  return {
    backgroundColor: color,
    boxShadow: `0 0 0 1px ${color}, 0 0 0 3px color-mix(in srgb, ${color} 22%, transparent)`,
  };
}

function costNameClass(cost: number | undefined): string {
  switch (cost) {
    case 2:
      return 'text-emerald-700 dark:text-emerald-300';
    case 3:
      return 'text-sky-700 dark:text-sky-300';
    case 4:
      return 'text-violet-700 dark:text-violet-300';
    case 5:
      return 'text-amber-700 dark:text-amber-300';
    default:
      return 'text-text-secondary';
  }
}

function getUnitCost(
  unitName: string,
  championAssets: GoldenSpatulaChampionAssetIndex | undefined,
): number | undefined {
  return findChampionAsset(unitName, championAssets)?.cost;
}

function getActiveRollTargetNames(variant: GoldenSpatulaLineupVariant): string[] {
  return getGoldenSpatulaActiveRollTargetNames(variant);
}

function hasMeaningfulVariantContent(variant: GoldenSpatulaLineupVariant): boolean {
  return (
    hasText(variant.code) ||
    hasText(variant.sourceUrl) ||
    hasText(variant.sourceId) ||
    hasText(variant.quality) ||
    hasText(variant.version) ||
    hasText(variant.season) ||
    collectLineupUnits(variant).length > 0 ||
    (variant.equipmentOrder?.length ?? 0) > 0 ||
    hasText(variant.traitsSummary) ||
    Object.values(variant.notes ?? {}).some((value) => hasText(value)) ||
    (variant.rollTargetNames?.length ?? 0) > 0
  );
}

function getVisibleVariants(
  lineup: GoldenSpatulaManagedLineup,
  activeVariantId: string | undefined,
): GoldenSpatulaLineupVariant[] {
  const visible = lineup.variants.filter(
    (variant, index) =>
      index === 0 || variant.id === activeVariantId || hasMeaningfulVariantContent(variant),
  );
  return visible.length > 0 ? visible : lineup.variants.slice(0, 1);
}

const lineupAssetImageUrlCache = new Map<string, string>();

function getLineupAssetImageCacheKey(imagePath: string | undefined, basePath: string): string {
  return imagePath ? `${basePath}\u0000${imagePath}` : '';
}

function LineupAssetImage({
  imagePath,
  fallback,
  basePath,
  className,
}: {
  imagePath?: string;
  fallback: string;
  basePath: string;
  className?: string;
}) {
  const cacheKey = getLineupAssetImageCacheKey(imagePath, basePath);
  const [imageUrl, setImageUrl] = useState<string | undefined>(() =>
    cacheKey ? lineupAssetImageUrlCache.get(cacheKey) : undefined,
  );

  useEffect(() => {
    let cancelled = false;

    if (!imagePath || !cacheKey) {
      setImageUrl(undefined);
      return;
    }

    const cachedUrl = lineupAssetImageUrlCache.get(cacheKey);
    if (cachedUrl) {
      setImageUrl(cachedUrl);
      return;
    }

    setImageUrl(undefined);

    loadIconAsDataUrl(imagePath, basePath)
      .then((url) => {
        if (url) lineupAssetImageUrlCache.set(cacheKey, url);
        if (!cancelled) setImageUrl(url);
      })
      .catch(() => {
        if (!cancelled) setImageUrl(undefined);
      });

    return () => {
      cancelled = true;
    };
  }, [imagePath, basePath, cacheKey]);

  return imageUrl ? (
    <img src={imageUrl} alt="" className={clsx('h-full w-full object-cover', className)} />
  ) : (
    <span className="truncate">{fallback}</span>
  );
}

interface FloatingInfoTooltipPosition {
  left: number;
  top: number;
  placement: 'top' | 'bottom';
}

function getFloatingInfoTooltipPosition(
  element: HTMLElement,
  width: number,
): FloatingInfoTooltipPosition {
  const rect = element.getBoundingClientRect();
  const margin = 8;
  const gap = 10;
  const estimatedHeight = 340;
  const viewportWidth = window.innerWidth || width;
  const viewportHeight = window.innerHeight || estimatedHeight;
  const left = Math.min(
    Math.max(margin, rect.left + rect.width / 2 - width / 2),
    Math.max(margin, viewportWidth - width - margin),
  );
  const shouldPlaceAbove =
    rect.bottom + gap + estimatedHeight > viewportHeight && rect.top > estimatedHeight;

  return {
    left,
    top: shouldPlaceAbove ? rect.top - gap : rect.bottom + gap,
    placement: shouldPlaceAbove ? 'top' : 'bottom',
  };
}

function FloatingInfoTooltip({
  children,
  content,
  width = 352,
}: {
  children: ReactNode;
  content: ReactNode;
  width?: number;
}) {
  const [position, setPosition] = useState<FloatingInfoTooltipPosition | null>(null);

  const show = (element: HTMLElement) => {
    setPosition(getFloatingInfoTooltipPosition(element, width));
  };

  useEffect(() => {
    if (!position) return;
    const hide = () => setPosition(null);
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    return () => {
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', hide);
    };
  }, [position]);

  const tooltip =
    position && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="pointer-events-none fixed z-[1000] overflow-hidden rounded-lg border border-border bg-bg-secondary text-text-primary shadow-2xl shadow-black/15"
            style={{
              left: position.left,
              top: position.top,
              width,
              transform: position.placement === 'top' ? 'translateY(-100%)' : undefined,
            }}
          >
            {content}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <span
        className="inline-flex min-w-0"
        onMouseEnter={(event) => show(event.currentTarget)}
        onMouseLeave={() => setPosition(null)}
      >
        {children}
      </span>
      {tooltip}
    </>
  );
}

function TooltipDivider() {
  return <div className="my-2 border-t border-border/70 dark:border-white/15" />;
}

function TooltipSectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-wide text-text-muted dark:text-zinc-500">
      {children}
    </div>
  );
}

function TooltipAssetIcon({
  imagePath,
  fallback,
  basePath,
  className,
}: {
  imagePath?: string;
  fallback: string;
  basePath: string;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        'flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded bg-bg-primary text-[10px] font-bold text-text-muted ring-1 ring-border/70',
        className,
      )}
    >
      <LineupAssetImage imagePath={imagePath} fallback={fallback} basePath={basePath} />
    </div>
  );
}

function getPrimaryChampionStat(
  asset: GoldenSpatulaChampionAsset | undefined,
): GoldenSpatulaChampionStat | undefined {
  return asset?.stats?.find((stat) => stat.level === 1) ?? asset?.stats?.[0];
}

function stripDuplicateAdaptiveSections(text: string): string {
  const parts = text.split(/<active:[^>]+>\s*0?>/gu);
  if (parts.length <= 1) return text;

  const seenLabels = new Set<string>();
  const kept: string[] = [];
  const sectionPattern = /(被动：|主动：|Passive:|Active:)/giu;

  for (const part of parts) {
    const matches = [...part.matchAll(sectionPattern)];
    if (matches.length === 0) {
      if (part.trim()) kept.push(part);
      continue;
    }

    for (let index = 0; index < matches.length; index += 1) {
      const match = matches[index];
      const label = match[1].toLocaleLowerCase();
      if (seenLabels.has(label)) continue;

      const start = match.index ?? 0;
      const end = matches[index + 1]?.index ?? part.length;
      const section = part.slice(start, end).trim();
      if (!section) continue;

      seenLabels.add(label);
      kept.push(section);
    }
  }

  return kept.join(' ');
}

function sanitizeGoldenSpatulaTooltipText(text: string | undefined): string | undefined {
  if (!text) return undefined;
  const withoutAdaptiveDuplicates = stripDuplicateAdaptiveSections(text);
  const cleaned = withoutAdaptiveDuplicates
    .replace(/<[^>]*>/gu, '')
    .replace(/\b0>/gu, '')
    .replace(/~/g, '')
    .replace(
      /[（(]\s*(?:总参与击败数|当前加成|击败追踪器|已吸引的朋友数量)[^）)]*[:：]\s*0\s*[）)]/gu,
      '',
    )
    .replace(/\s*(?:击败追踪器|总参与击败数|已吸引的朋友数量)[:：]\s*0/gu, '')
    .replace(/\s*[^，。；;|]*[:：]\s*0(?:\.0+)?%【[^】]+】(?:[，,]\s*0(?:\.0+)?%【[^】]+】)*/gu, '')
    .split(/(?<=。|！|!|？|\?)\s*/u)
    .filter((sentence) => !/0(?:\.0+)?\(\)/u.test(sentence))
    .join(' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([。！？；，、])/gu, '$1')
    .trim();
  return cleaned || undefined;
}

function cleanChampionTooltipText(text: string | undefined): string | undefined {
  return sanitizeGoldenSpatulaTooltipText(text);
}

function formatTooltipStatNumber(value: number | undefined): string | undefined {
  if (value === undefined || !Number.isFinite(value)) return undefined;
  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(2).replace(/0+$/u, '').replace(/\.$/u, '');
}

function formatTooltipMana(stat: GoldenSpatulaChampionStat | undefined): string | undefined {
  if (!stat) return undefined;
  const initialMana = formatTooltipStatNumber(stat.initialMana);
  const maxMana = formatTooltipStatNumber(stat.maxMana);
  if (initialMana === undefined && maxMana === undefined) return undefined;
  return `${initialMana ?? 0}/${maxMana ?? 0}`;
}

function splitChampionSkillValueLines(text: string | undefined): string[] {
  return (
    cleanChampionTooltipText(text)
      ?.split('|')
      .map((line) => line.trim())
      .filter(Boolean) ?? []
  );
}

function AttackRangeDots({ range }: { range: number | undefined }) {
  const normalizedRange =
    range !== undefined && Number.isFinite(range) ? Math.max(0, Math.min(5, Math.round(range))) : 0;

  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, index) => (
        <span
          key={index}
          className={clsx(
            'h-2 w-2 rounded-full',
            index < normalizedRange
              ? 'bg-stone-500 dark:bg-stone-400'
              : 'bg-bg-active dark:bg-zinc-700',
          )}
        />
      ))}
    </span>
  );
}

function SkillStatToken({ token }: { token: string }) {
  const normalized = token.replace(/[【】]/g, '');
  const lower = normalized.toLocaleLowerCase();
  const isHealth = /生命|health|hp/u.test(lower);
  const isPhysical = /物理|攻击|attack|ad/u.test(lower);
  const isMagic = /法术|魔法|magic|ap/u.test(lower);
  const isShield = /护盾|護盾|shield/u.test(lower);
  const Icon = isHealth ? Heart : isPhysical ? Sword : isShield ? Shield : Sparkles;

  return (
    <span
      title={token}
      className={clsx(
        'mx-0.5 inline-flex h-4 min-w-4 translate-y-[2px] items-center justify-center rounded-full px-0.5 align-baseline ring-1 ring-inset',
        isHealth && 'bg-emerald-400/15 text-emerald-700 ring-emerald-300/25 dark:text-emerald-300',
        isPhysical && 'bg-orange-400/15 text-orange-700 ring-orange-300/25 dark:text-orange-300',
        isMagic && 'bg-sky-400/15 text-sky-700 ring-sky-300/25 dark:text-sky-300',
        isShield && 'bg-violet-400/15 text-violet-700 ring-violet-300/25 dark:text-violet-300',
        !isHealth &&
          !isPhysical &&
          !isMagic &&
          !isShield &&
          'bg-amber-400/15 text-amber-700 ring-amber-300/25 dark:text-amber-300',
      )}
    >
      <Icon className="h-3 w-3" />
    </span>
  );
}

function renderChampionSkillText(text: string | undefined): ReactNode {
  const cleaned = cleanChampionTooltipText(text);
  if (!cleaned) return null;

  const parts = cleaned.split(
    /(【[^】]+】|\d+(?:\.\d+)?(?:\s*\/\s*\d+(?:\.\d+)?)+|[+-]?\d+(?:\.\d+)?%?)/gu,
  );
  return parts.map((part, index) => {
    if (!part) return null;
    if (/^【[^】]+】$/u.test(part)) {
      return <SkillStatToken key={`${part}-${index}`} token={part} />;
    }
    if (/^\d+(?:\.\d+)?(?:\s*\/\s*\d+(?:\.\d+)?)+$/u.test(part.trim())) {
      return (
        <span key={`${part}-${index}`} className="font-bold text-amber-700 dark:text-amber-300">
          {part}
        </span>
      );
    }
    if (/^[+-]?\d+(?:\.\d+)?%?$/u.test(part.trim())) {
      return (
        <span key={`${part}-${index}`} className="font-bold text-text-primary dark:text-zinc-50">
          {part}
        </span>
      );
    }
    return part;
  });
}

function TooltipItemIcon({
  item,
  itemAsset,
  basePath,
}: {
  item: string;
  itemAsset: GoldenSpatulaItemAsset | undefined;
  basePath: string;
}) {
  return (
    <div
      className="group/item relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-md bg-gradient-to-br from-bg-tertiary to-bg-primary p-[1px] shadow-sm ring-1 ring-inset ring-border/70"
      title={item}
    >
      <div className="h-full w-full overflow-hidden rounded bg-bg-primary text-[7px] font-bold text-text-muted">
        <LineupAssetImage
          imagePath={itemAsset?.imagePath}
          fallback={item.slice(0, 1)}
          basePath={basePath}
        />
      </div>
      <div className="pointer-events-none absolute inset-0 rounded-md ring-1 ring-inset ring-border/40 group-hover/item:ring-amber-400/60" />
    </div>
  );
}

function LineupUnitHoverCard({
  unit,
  championAssets,
  itemAssets,
  basePath,
  t,
}: {
  unit: GoldenSpatulaLineupUnit;
  championAssets: GoldenSpatulaChampionAssetIndex | undefined;
  itemAssets: GoldenSpatulaItemAssetIndex | undefined;
  basePath: string;
  t: TFunction;
}) {
  const asset = findChampionAsset(unit.name, championAssets);
  const cost = asset?.cost;
  const traits = asset?.traits?.slice(0, 3) ?? [];
  const items = unit.items?.slice(0, 6) ?? [];
  const primaryStat = getPrimaryChampionStat(asset);
  const rangeLabel = formatTooltipStatNumber(primaryStat?.attackRange);
  const manaLabel = formatTooltipMana(primaryStat);
  const skillName = cleanChampionTooltipText(asset?.skill?.name);
  const skillDescription = cleanChampionTooltipText(asset?.skill?.description);
  const skillValueLines = splitChampionSkillValueLines(asset?.skill?.valueDescription);

  return (
    <div className="p-3 text-xs">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-2.5">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md p-[2px]"
            style={costFrameStyle(cost)}
          >
            <div className="h-full w-full overflow-hidden rounded bg-bg-primary text-[10px] font-bold text-text-muted">
              <LineupAssetImage
                imagePath={asset?.imagePath}
                fallback={shortUnitName(unit.name)}
                basePath={basePath}
              />
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="truncate text-[14px] font-bold leading-tight text-text-primary dark:text-zinc-50">
                {unit.name}
              </span>
              {cost !== undefined && (
                <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-bold text-amber-300">
                  <Coins className="h-3 w-3 fill-amber-300 text-amber-300" />
                  {cost}
                </span>
              )}
            </div>
            {traits.length > 0 && (
              <div className="mt-2 space-y-1">
                {traits.map((trait) => (
                  <div
                    key={trait}
                    className="flex min-w-0 items-center gap-1.5 text-[11px] font-semibold leading-tight text-text-secondary dark:text-zinc-200"
                  >
                    <span className="h-2 w-2 shrink-0 rounded-full bg-amber-300" />
                    <span className="truncate">{trait}</span>
                  </div>
                ))}
              </div>
            )}
            {rangeLabel && (
              <div className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-text-secondary dark:text-zinc-200">
                <span>{t('goldenSpatula.lineups.unitTooltipAttackRange')}</span>
                <AttackRangeDots range={primaryStat?.attackRange} />
                <span>{rangeLabel}</span>
              </div>
            )}
          </div>
        </div>
        <div className="shrink-0 text-right text-[10px] font-bold leading-tight text-amber-300/75">
          MXU
        </div>
      </div>

      {(skillName || skillDescription) && (
        <>
          <TooltipDivider />
          <div className="flex items-start gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded bg-bg-primary text-[10px] font-bold text-text-muted ring-1 ring-border/70">
              {asset?.skill?.icon ? (
                <img src={asset.skill.icon} alt="" className="h-full w-full object-cover" />
              ) : (
                shortUnitName(skillName ?? unit.name)
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                {skillName && (
                  <span className="truncate text-[13px] font-bold text-text-primary dark:text-zinc-50">
                    {skillName}
                  </span>
                )}
                {manaLabel && (
                  <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-bold text-sky-300">
                    <Droplet className="h-3 w-3 fill-sky-300 text-sky-300" />
                    {manaLabel}
                  </span>
                )}
              </div>
              {manaLabel && (
                <div className="mt-0.5 text-[10px] font-semibold text-text-muted dark:text-zinc-500">
                  {t('goldenSpatula.lineups.unitTooltipActive')}
                </div>
              )}
              {skillDescription && (
                <p className="mt-2 text-[11px] font-medium leading-relaxed text-text-secondary dark:text-zinc-300">
                  {renderChampionSkillText(skillDescription)}
                </p>
              )}
              {skillValueLines.length > 0 && (
                <div className="mt-2 space-y-1">
                  {skillValueLines.map((line) => (
                    <div
                      key={line}
                      className="text-[11px] font-semibold leading-relaxed text-text-muted dark:text-zinc-400"
                    >
                      {renderChampionSkillText(line)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {items.length > 0 && (
        <>
          <TooltipDivider />
          <div className="space-y-1.5">
            <TooltipSectionTitle>{t('goldenSpatula.lineups.unitTooltipItems')}</TooltipSectionTitle>
            <div className="flex flex-wrap gap-1.5">
              {items.map((item, index) => {
                const itemAsset = findItemAsset(item, itemAssets);
                return (
                  <TooltipItemIcon
                    key={`${item}-${index}`}
                    item={item}
                    itemAsset={itemAsset}
                    basePath={basePath}
                  />
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

type AugmentRecommendationGroupFilter = 'all' | GoldenSpatulaLineupAugmentRecommendationGroup;
type AugmentRecommendationLevelFilter = 'all' | 'silver' | 'gold' | 'prism';

const augmentRecommendationGroupFilters: AugmentRecommendationGroupFilter[] = [
  'all',
  'priority',
  'alternative',
  'recommended',
];
const augmentRecommendationLevelFilters: AugmentRecommendationLevelFilter[] = [
  'all',
  'silver',
  'gold',
  'prism',
];
const augmentRecommendationGroupOrder: Record<
  GoldenSpatulaLineupAugmentRecommendationGroup,
  number
> = {
  priority: 0,
  alternative: 1,
  recommended: 2,
};
const augmentRecommendationTierOrder: GoldenSpatulaLineupAugmentStrengthTier[] = [
  'OP',
  'S',
  'A',
  'B',
  'C',
  'contextual',
  'unknown',
];
const augmentRecommendationTierRank = new Map(
  augmentRecommendationTierOrder.map((tier, index) => [tier, index]),
);

function getAugmentRecommendationGroup(
  detail: GoldenSpatulaLineupAugmentRecommendationDetail,
): GoldenSpatulaLineupAugmentRecommendationGroup {
  return detail.group ?? 'recommended';
}

function getAugmentRecommendationTier(
  detail: GoldenSpatulaLineupAugmentRecommendationDetail,
): GoldenSpatulaLineupAugmentStrengthTier {
  return detail.strengthTier ?? 'unknown';
}

function getAugmentRecommendationLevelFilter(
  level: number | undefined,
): AugmentRecommendationLevelFilter | undefined {
  switch (level) {
    case 1:
      return 'silver';
    case 2:
      return 'gold';
    case 3:
      return 'prism';
    default:
      return undefined;
  }
}

function compareAugmentRecommendationDetails(
  left: GoldenSpatulaLineupAugmentRecommendationDetail,
  right: GoldenSpatulaLineupAugmentRecommendationDetail,
): number {
  const tierDelta =
    (augmentRecommendationTierRank.get(getAugmentRecommendationTier(left)) ?? 99) -
    (augmentRecommendationTierRank.get(getAugmentRecommendationTier(right)) ?? 99);
  if (tierDelta !== 0) return tierDelta;

  const groupDelta =
    augmentRecommendationGroupOrder[getAugmentRecommendationGroup(left)] -
    augmentRecommendationGroupOrder[getAugmentRecommendationGroup(right)];
  if (groupDelta !== 0) return groupDelta;

  const rankDelta =
    (left.rank ?? Number.MAX_SAFE_INTEGER) - (right.rank ?? Number.MAX_SAFE_INTEGER);
  if (rankDelta !== 0) return rankDelta;

  const indexDelta = (right.recommendationIndex ?? 0) - (left.recommendationIndex ?? 0);
  if (indexDelta !== 0) return indexDelta;

  return (left.name ?? String(left.id)).localeCompare(right.name ?? String(right.id));
}

function findAugmentRecommendationAsset(
  detail: GoldenSpatulaLineupAugmentRecommendationDetail,
  assets: GoldenSpatulaAugmentAssetIndex | undefined,
): GoldenSpatulaAugmentAsset | undefined {
  if (!assets) return undefined;

  const nameKey = detail.name ? normalizeSearchText(detail.name) : '';
  if (nameKey && assets[nameKey]) return assets[nameKey];

  return Object.values(assets).find((asset) => {
    if (asset.id !== undefined && asset.id === detail.id) return true;
    if (detail.name && normalizeSearchText(asset.name) === nameKey) return true;
    return asset.aliases?.some((alias) => normalizeSearchText(alias) === nameKey);
  });
}

function getAugmentRecommendationName(
  detail: GoldenSpatulaLineupAugmentRecommendationDetail,
  assets: GoldenSpatulaAugmentAssetIndex | undefined,
): string {
  return detail.name || findAugmentRecommendationAsset(detail, assets)?.name || String(detail.id);
}

function getAugmentTierRailClass(tier: GoldenSpatulaLineupAugmentStrengthTier): string {
  switch (tier) {
    case 'OP':
      return 'border-rose-500/35 bg-rose-500/10 text-rose-700 dark:text-rose-200';
    case 'S':
      return 'border-violet-500/35 bg-violet-500/10 text-violet-700 dark:text-violet-200';
    case 'A':
      return 'border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-200';
    case 'B':
      return 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-200';
    case 'C':
      return 'border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-200';
    case 'contextual':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200';
    default:
      return 'border-border/70 bg-bg-hover text-text-secondary';
  }
}

function getAugmentLevelFrameClass(level: number | undefined): string {
  switch (level) {
    case 3:
      return 'bg-fuchsia-500/20 text-fuchsia-700 ring-fuchsia-500/45 dark:text-fuchsia-200';
    case 2:
      return 'bg-amber-500/20 text-amber-700 ring-amber-500/45 dark:text-amber-200';
    case 1:
      return 'bg-slate-500/20 text-slate-700 ring-slate-500/35 dark:text-slate-200';
    default:
      return 'bg-bg-hover text-text-secondary ring-border/70';
  }
}

function formatAugmentStrengthTier(
  tier: GoldenSpatulaLineupAugmentStrengthTier,
  t: TFunction,
): string {
  return t(`goldenSpatula.lineups.augmentStrengthTier.${tier}`, {
    defaultValue: tier,
  });
}

function formatAugmentRecommendationGroup(
  group: GoldenSpatulaLineupAugmentRecommendationGroup,
  t: TFunction,
): string {
  return t(`goldenSpatula.lineups.augmentGroup.${group}`, {
    defaultValue: group,
  });
}

function formatAugmentRoleTag(roleTag: string, t: TFunction): string {
  return t(`goldenSpatula.lineups.augmentRole.${roleTag}`, {
    defaultValue: roleTag,
  });
}

function AugmentRecommendationHoverCard({
  detail,
  asset,
  name,
  basePath,
  t,
}: {
  detail: GoldenSpatulaLineupAugmentRecommendationDetail;
  asset: GoldenSpatulaAugmentAsset | undefined;
  name: string;
  basePath: string;
  t: TFunction;
}) {
  const tier = getAugmentRecommendationTier(detail);
  const group = getAugmentRecommendationGroup(detail);
  const roleTags = detail.roleTags ?? [];
  const body = detail.selectionDecision || detail.reason || asset?.description;

  return (
    <div className="space-y-2 p-3 text-xs">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <TooltipAssetIcon
            imagePath={asset?.imagePath}
            fallback={name.slice(0, 2)}
            basePath={basePath}
          />
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="truncate text-sm font-bold text-text-primary dark:text-white">
                {name}
              </span>
              {detail.recommendationIndex !== undefined && (
                <span className="inline-flex items-center gap-1 rounded bg-amber-400/15 px-1.5 py-0.5 text-[11px] font-bold text-amber-300">
                  <Coins className="h-3 w-3" />
                  {detail.recommendationIndex}
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap gap-1">
              <span className="rounded bg-bg-hover px-1.5 py-0.5 text-[11px] text-text-secondary ring-1 ring-inset ring-border/60 dark:bg-white/10 dark:text-zinc-200 dark:ring-transparent">
                {formatAugmentRecommendationGroup(group, t)}
              </span>
              <span className="rounded bg-bg-hover px-1.5 py-0.5 text-[11px] text-text-secondary ring-1 ring-inset ring-border/60 dark:bg-white/10 dark:text-zinc-200 dark:ring-transparent">
                {formatAugmentStrengthTier(tier, t)}
              </span>
              {(detail.level ?? asset?.level) !== undefined && (
                <span className="rounded bg-bg-hover px-1.5 py-0.5 text-[11px] text-text-secondary ring-1 ring-inset ring-border/60 dark:bg-white/10 dark:text-zinc-200 dark:ring-transparent">
                  {t('goldenSpatula.lineups.augmentLevel', {
                    level: detail.level ?? asset?.level,
                  })}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="shrink-0 text-right text-[10px] font-bold leading-tight text-amber-300/80">
          MXU
        </div>
      </div>

      {roleTags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {roleTags.map((roleTag) => (
            <span
              key={roleTag}
              className="rounded bg-bg-hover px-1.5 py-0.5 text-[11px] text-text-secondary ring-1 ring-inset ring-border/60 dark:bg-white/10 dark:text-zinc-200 dark:ring-transparent"
            >
              {formatAugmentRoleTag(roleTag, t)}
            </span>
          ))}
        </div>
      )}

      {body && (
        <>
          <TooltipDivider />
          <div className="text-[12px] leading-relaxed text-text-primary dark:text-zinc-100">
            {body}
          </div>
        </>
      )}

      {asset?.description && body !== asset.description && (
        <div className="text-[11px] leading-relaxed text-text-muted dark:text-zinc-400">
          {asset.description}
        </div>
      )}
    </div>
  );
}

function AugmentRecommendationChip({
  detail,
  augmentAssets,
  basePath,
  t,
}: {
  detail: GoldenSpatulaLineupAugmentRecommendationDetail;
  augmentAssets: GoldenSpatulaAugmentAssetIndex | undefined;
  basePath: string;
  t: TFunction;
}) {
  const asset = findAugmentRecommendationAsset(detail, augmentAssets);
  const name = getAugmentRecommendationName(detail, augmentAssets);
  const group = getAugmentRecommendationGroup(detail);
  const roleTags = detail.roleTags?.slice(0, 4) ?? [];

  return (
    <FloatingInfoTooltip
      content={
        <AugmentRecommendationHoverCard
          detail={detail}
          asset={asset}
          name={name}
          basePath={basePath}
          t={t}
        />
      }
    >
      <div className="min-w-0 rounded-lg border border-border/55 bg-bg-primary/70 px-1.5 py-1 text-left shadow-sm transition-colors hover:border-accent/45 hover:bg-bg-primary">
        <div className="flex min-w-0 items-center gap-1.5">
          <div
            className={clsx(
              'flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md p-[2px] text-[9px] font-bold ring-1 ring-inset',
              getAugmentLevelFrameClass(detail.level ?? asset?.level),
            )}
          >
            <div className="flex h-full w-full items-center justify-center overflow-hidden rounded bg-bg-primary">
              <LineupAssetImage
                imagePath={asset?.imagePath}
                fallback={name.slice(0, 2)}
                basePath={basePath}
              />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="min-w-0 flex-1 truncate text-[11px] font-black leading-none text-text-primary">
                {name}
              </span>
              {detail.recommendationIndex !== undefined && (
                <span
                  className="shrink-0 rounded-full bg-accent/10 px-1.5 py-px text-[9px] font-black tabular-nums text-accent ring-1 ring-inset ring-accent/30"
                  title={t('goldenSpatula.lineups.augmentRecommendationIndex', {
                    score: detail.recommendationIndex,
                  })}
                >
                  {detail.recommendationIndex}
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap gap-1">
              <span
                className={clsx(
                  group === 'priority' ? goldenSpatulaAccentTagClass : goldenSpatulaNeutralTagClass,
                )}
              >
                {formatAugmentRecommendationGroup(group, t)}
              </span>
              {(detail.level ?? asset?.level) !== undefined && (
                <span className={goldenSpatulaNeutralTagClass}>
                  {t('goldenSpatula.lineups.augmentLevel', {
                    level: detail.level ?? asset?.level,
                  })}
                </span>
              )}
            </div>
          </div>
        </div>

        {roleTags.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1 pl-[38px]">
            {roleTags.slice(0, 2).map((roleTag) => (
              <span key={roleTag} className={goldenSpatulaNeutralTagClass}>
                {formatAugmentRoleTag(roleTag, t)}
              </span>
            ))}
          </div>
        )}
      </div>
    </FloatingInfoTooltip>
  );
}

function AugmentRecommendationTierBoard({
  recommendations,
  augmentAssets,
  basePath,
  t,
}: {
  recommendations: GoldenSpatulaLineupAugmentRecommendationDetail[];
  augmentAssets: GoldenSpatulaAugmentAssetIndex | undefined;
  basePath: string;
  t: TFunction;
}) {
  const [levelFilter, setLevelFilter] = useState<AugmentRecommendationLevelFilter>('all');
  const [groupFilter, setGroupFilter] = useState<AugmentRecommendationGroupFilter>('all');
  const sortedRecommendations = useMemo(
    () => [...recommendations].sort(compareAugmentRecommendationDetails),
    [recommendations],
  );
  const groupCounts = useMemo(() => {
    const counts = new Map<AugmentRecommendationGroupFilter, number>();
    counts.set('all', sortedRecommendations.length);
    for (const detail of sortedRecommendations) {
      const group = getAugmentRecommendationGroup(detail);
      counts.set(group, (counts.get(group) ?? 0) + 1);
    }
    return counts;
  }, [sortedRecommendations]);
  const levelCounts = useMemo(() => {
    const counts = new Map<AugmentRecommendationLevelFilter, number>();
    counts.set('all', sortedRecommendations.length);
    for (const detail of sortedRecommendations) {
      const level = getAugmentRecommendationLevelFilter(detail.level);
      if (!level) continue;
      counts.set(level, (counts.get(level) ?? 0) + 1);
    }
    return counts;
  }, [sortedRecommendations]);

  if (sortedRecommendations.length === 0) return null;

  const visibleLevelFilters = augmentRecommendationLevelFilters.filter(
    (item) => item === 'all' || (levelCounts.get(item) ?? 0) > 0,
  );
  const visibleGroupFilters = augmentRecommendationGroupFilters.filter(
    (item) => item === 'all' || (groupCounts.get(item) ?? 0) > 0,
  );
  const filteredRecommendations = sortedRecommendations.filter((detail) => {
    const groupMatched =
      groupFilter === 'all' || getAugmentRecommendationGroup(detail) === groupFilter;
    const levelMatched =
      levelFilter === 'all' || getAugmentRecommendationLevelFilter(detail.level) === levelFilter;
    return groupMatched && levelMatched;
  });
  const tierGroups = augmentRecommendationTierOrder
    .map((tier) => ({
      tier,
      items: filteredRecommendations.filter(
        (detail) => getAugmentRecommendationTier(detail) === tier,
      ),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="space-y-1.5 rounded-lg bg-bg-primary/35 p-1.5 ring-1 ring-inset ring-border/35">
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
        <SectionTitle icon={Sparkles} label={t('goldenSpatula.lineups.augmentMetaTitle')} />
        <div className="flex flex-wrap gap-1 sm:justify-end">
          <div className="flex flex-wrap rounded-full bg-bg-secondary/70 p-0.5 ring-1 ring-inset ring-border/40">
            {visibleLevelFilters.map((item) => {
              const selected = levelFilter === item;
              const count = levelCounts.get(item) ?? 0;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setLevelFilter(item)}
                  className={clsx(
                    'inline-flex h-5 min-w-10 items-center justify-center gap-1 rounded-full px-1.5 text-[10px] font-bold transition-colors',
                    selected
                      ? 'bg-accent/10 text-accent shadow-sm ring-1 ring-inset ring-accent/25'
                      : 'text-text-muted hover:text-text-primary',
                  )}
                >
                  <span>{t(`goldenSpatula.lineups.augmentMetaLevelFilter.${item}`)}</span>
                  <span className="tabular-nums text-[10px] opacity-75">{count}</span>
                </button>
              );
            })}
          </div>
          {visibleGroupFilters.length > 1 && (
            <div className="flex flex-wrap rounded-full bg-bg-secondary/70 p-0.5 ring-1 ring-inset ring-border/40">
              {visibleGroupFilters.map((item) => {
                const selected = groupFilter === item;
                const count = groupCounts.get(item) ?? 0;
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setGroupFilter(item)}
                    className={clsx(
                      'inline-flex h-5 min-w-10 items-center justify-center gap-1 rounded-full px-1.5 text-[10px] font-bold transition-colors',
                      selected
                        ? 'bg-accent/10 text-accent shadow-sm ring-1 ring-inset ring-accent/25'
                        : 'text-text-muted hover:text-text-primary',
                    )}
                  >
                    <span>{t(`goldenSpatula.lineups.augmentMetaFilter.${item}`)}</span>
                    <span className="tabular-nums text-[10px] opacity-75">{count}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-1">
        {tierGroups.length > 0 ? (
          tierGroups.map(({ tier, items }) => (
            <div
              key={tier}
              className={clsx(
                'overflow-hidden rounded-lg border bg-bg-secondary/45',
                getAugmentTierRailClass(tier),
              )}
            >
              <div className="flex flex-col sm:flex-row">
                <div className="flex items-center justify-between gap-1.5 px-2 py-1 sm:w-14 sm:flex-col sm:justify-center">
                  <span className="text-xs font-black leading-none">
                    {formatAugmentStrengthTier(tier, t)}
                  </span>
                  <span className="rounded-full bg-bg-primary/70 px-1.5 py-px text-[9px] font-black tabular-nums">
                    {items.length}
                  </span>
                </div>
                <div className="grid flex-1 gap-1 border-t border-current/15 p-1.5 sm:grid-cols-2 sm:border-l sm:border-t-0 xl:grid-cols-3">
                  {items.map((detail, index) => (
                    <AugmentRecommendationChip
                      key={`${detail.id}-${detail.group ?? 'recommended'}-${detail.rank ?? detail.recommendationIndex ?? index}`}
                      detail={detail}
                      augmentAssets={augmentAssets}
                      basePath={basePath}
                      t={t}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-md border border-dashed border-border bg-bg-primary p-2 text-xs text-text-muted">
            {t('goldenSpatula.lineups.augmentMetaEmpty')}
          </div>
        )}
      </div>
    </div>
  );
}

function LineupTargetCard({
  unit,
  championAssets,
  basePath,
  selected,
  onToggleTarget,
  t,
}: {
  unit: GoldenSpatulaLineupUnit;
  championAssets: GoldenSpatulaChampionAssetIndex | undefined;
  basePath: string;
  selected: boolean;
  onToggleTarget: (name: string) => void;
  t: TFunction;
}) {
  const asset = findChampionAsset(unit.name, championAssets);

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onToggleTarget(unit.name)}
      title={
        selected
          ? t('goldenSpatula.lineups.decisionTargetSelected')
          : t('goldenSpatula.lineups.decisionSetTarget')
      }
      className={clsx(
        'group relative w-[62px] shrink-0 rounded-xl p-1 text-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
        selected
          ? 'bg-accent/10 text-accent ring-2 ring-accent/70 shadow-sm'
          : 'bg-transparent text-text-primary hover:-translate-y-0.5 hover:bg-bg-hover/70 hover:ring-1 hover:ring-border/70',
      )}
    >
      {selected && (
        <span className="absolute -left-0.5 -top-1 z-10 rounded-full bg-accent px-1.5 py-0.5 text-[9px] font-black leading-none text-white shadow-sm ring-1 ring-inset ring-accent">
          D
        </span>
      )}
      <div
        className={clsx(
          'relative mx-auto flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-bg-tertiary p-[2px] text-[10px] text-text-muted shadow-sm transition-transform group-hover:scale-[1.03]',
          selected && 'ring-2 ring-accent ring-offset-1 ring-offset-bg-secondary',
        )}
        style={costFrameStyle(asset?.cost)}
      >
        <div className="h-full w-full overflow-hidden rounded-md bg-bg-primary">
          <LineupAssetImage
            imagePath={asset?.imagePath}
            fallback={shortUnitName(unit.name)}
            basePath={basePath}
            className="scale-105"
          />
        </div>
      </div>
      <span
        className={clsx(
          'mt-1 block max-w-full truncate text-[10px] font-black leading-none',
          selected ? 'text-accent' : 'text-text-primary',
        )}
      >
        {unit.name}
      </span>
    </button>
  );
}
function LineupTraitHoverCard({
  trait,
  variant,
  traitAssets,
  championAssets,
  basePath,
  t,
}: {
  trait: { count?: string; name: string };
  variant: GoldenSpatulaLineupVariant;
  traitAssets: GoldenSpatulaTraitAssetIndex | undefined;
  championAssets: GoldenSpatulaChampionAssetIndex | undefined;
  basePath: string;
  t: TFunction;
}) {
  const asset = findTraitAsset(trait.name, traitAssets);
  const activeCount = parseTraitActiveCount(trait, variant, championAssets);
  const thresholds = asset?.thresholds?.slice(0, 8) ?? [];
  const effectLines = parseTraitEffectLines(asset);
  const effectThresholds = effectLines
    .map((line) => parseTraitEffectLine(line).threshold)
    .filter((threshold): threshold is number => threshold !== undefined);
  const activeThreshold = getActiveTraitThreshold(
    thresholds.length > 0 ? thresholds : effectThresholds,
    activeCount,
  );
  const lineupUnits = collectLineupTraitUnits(variant, trait.name, championAssets).slice(0, 10);

  return (
    <div className="text-xs">
      <div className="relative overflow-hidden border-b border-border/70 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.16),transparent_40%),linear-gradient(135deg,rgba(255,255,255,0.45),transparent)] p-3 dark:border-white/10 dark:bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.24),transparent_40%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent)]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <TooltipAssetIcon
              imagePath={asset?.imagePath}
              fallback={trait.name.slice(0, 1)}
              basePath={basePath}
              className="h-11 w-11 rounded-lg bg-gradient-to-br from-amber-50 via-white to-slate-100 p-1 text-amber-700 shadow-sm ring-amber-200/80 dark:bg-none dark:p-0 dark:text-text-muted dark:ring-border/70"
            />
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate text-base font-bold text-text-primary dark:text-white">
                  {trait.name}
                </span>
                {activeCount !== undefined && (
                  <span className="inline-flex shrink-0 items-center rounded-full bg-amber-400 px-2 py-0.5 text-[11px] font-bold text-slate-950">
                    {activeCount}
                  </span>
                )}
              </div>
              <div className="mt-1 text-[11px] font-medium text-amber-300">
                {activeCount !== undefined
                  ? t('goldenSpatula.lineups.traitActiveCount', { count: activeCount })
                  : t('goldenSpatula.lineups.unitTooltipTraits')}
              </div>
            </div>
          </div>
          <div className="shrink-0 text-right text-[10px] font-bold leading-tight text-amber-300/80">
            MXU
          </div>
        </div>
      </div>

      <div className="space-y-3 p-3">
        {effectLines.length > 0 && (
          <div className="space-y-1.5">
            <TooltipSectionTitle>{t('goldenSpatula.lineups.traitBreakpoints')}</TooltipSectionTitle>
            <div className="space-y-1">
              {effectLines.map((line, index) => {
                const parsed = parseTraitEffectLine(line);
                const active =
                  parsed.threshold !== undefined && parsed.threshold === activeThreshold;
                return (
                  <div
                    key={`${line}-${index}`}
                    className={clsx(
                      'flex items-start gap-2 rounded-md px-2 py-1.5 text-[11px] leading-relaxed ring-1 ring-inset',
                      active
                        ? 'bg-amber-400/12 text-amber-900 ring-amber-300/45 dark:text-zinc-50'
                        : 'bg-bg-tertiary text-text-secondary ring-border/70',
                    )}
                  >
                    {parsed.threshold !== undefined && (
                      <span
                        className={clsx(
                          'mt-0.5 inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1 text-[11px] font-bold ring-1 ring-inset',
                          active
                            ? 'bg-amber-400 text-slate-950 ring-amber-200/80'
                            : 'bg-bg-secondary text-text-muted ring-border/70',
                        )}
                      >
                        {parsed.threshold}
                      </span>
                    )}
                    <span className="min-w-0 flex-1">{renderChampionSkillText(parsed.text)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {lineupUnits.length > 0 && (
          <div className="space-y-1.5">
            <TooltipSectionTitle>{t('goldenSpatula.lineups.traitMembers')}</TooltipSectionTitle>
            <div className="flex flex-wrap gap-1.5">
              {lineupUnits.map((unit, index) => {
                const championAsset = findChampionAsset(unit.name, championAssets);
                return (
                  <TooltipAssetIcon
                    key={`${unit.name}-${unit.location ?? index}`}
                    imagePath={championAsset?.imagePath}
                    fallback={shortUnitName(unit.name)}
                    basePath={basePath}
                    className="h-8 w-8"
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LineupTraitPillRow({
  variant,
  traitAssets,
  championAssets,
  basePath,
  t,
  compact = false,
}: {
  variant: GoldenSpatulaLineupVariant;
  traitAssets: GoldenSpatulaTraitAssetIndex | undefined;
  championAssets: GoldenSpatulaChampionAssetIndex | undefined;
  basePath: string;
  t: TFunction;
  compact?: boolean;
}) {
  const traits = parseLineupTraitTags(variant.traitsSummary);
  if (traits.length === 0) return null;

  return (
    <div className={clsx('flex min-w-0 overflow-hidden', compact ? 'gap-1' : 'gap-1.5')}>
      {traits.slice(0, compact ? 8 : 10).map((trait, index) => {
        const asset = findTraitAsset(trait.name, traitAssets);
        return (
          <FloatingInfoTooltip
            key={`${trait.count ?? 'trait'}-${trait.name}-${index}`}
            width={360}
            content={
              <LineupTraitHoverCard
                trait={trait}
                variant={variant}
                traitAssets={traitAssets}
                championAssets={championAssets}
                basePath={basePath}
                t={t}
              />
            }
          >
            <span
              className={clsx(
                'inline-flex min-w-0 shrink-0 items-center gap-1 rounded-full bg-bg-hover text-text-secondary ring-1 ring-inset ring-border/65',
                compact ? 'h-5 px-1.5 text-[10px]' : 'h-6 px-2 text-[11px]',
              )}
              title={`${trait.count ? `${trait.count} ` : ''}${trait.name}`}
            >
              {asset?.imagePath && (
                <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-bg-primary">
                  <LineupAssetImage
                    imagePath={asset.imagePath}
                    fallback={trait.name.slice(0, 1)}
                    basePath={basePath}
                  />
                </span>
              )}
              {trait.count && (
                <span className="rounded-full bg-amber-400/20 px-1 text-[10px] font-bold tabular-nums text-amber-700 dark:text-amber-200">
                  {trait.count}
                </span>
              )}
              <span className="truncate">{trait.name}</span>
            </span>
          </FloatingInfoTooltip>
        );
      })}
    </div>
  );
}

function LineupDarkTierBadge({
  quality,
  compact = false,
}: {
  quality?: string;
  compact?: boolean;
}) {
  const grade =
    quality
      ?.trim()
      .match(/^[A-Za-z]\+?/u)?.[0]
      ?.toUpperCase() ?? '?';
  const tone = getRecommendedQualityTone(quality);

  return (
    <span
      className={clsx(
        'inline-flex items-center justify-center rounded-md px-2 font-extrabold leading-none text-white shadow-sm ring-1 ring-inset',
        compact ? 'h-7 min-w-7 text-[11px]' : 'h-9 min-w-9 text-sm',
        tone === 's' && 'bg-gradient-to-b from-amber-300 to-amber-600 ring-amber-200/60',
        tone === 'a' && 'bg-gradient-to-b from-violet-300 to-violet-600 ring-violet-200/60',
        tone === 'b' && 'bg-gradient-to-b from-sky-300 to-sky-600 ring-sky-200/50',
        tone === 'default' && 'bg-gradient-to-b from-rose-400 to-rose-600 ring-rose-200/60',
      )}
      title={quality}
    >
      {grade}
    </span>
  );
}

function LineupMetric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0 border-l border-border/70 px-3 first:border-l-0">
      <div className="truncate text-[10px] text-text-muted">{label}</div>
      <div className="mt-0.5 truncate text-sm font-bold tabular-nums text-text-primary">
        {value}
      </div>
    </div>
  );
}

function LineupOpggUnitStrip({
  variant,
  championAssets,
  itemAssets,
  basePath,
  compact = false,
  slotCount = 10,
}: {
  variant: GoldenSpatulaLineupVariant;
  championAssets: GoldenSpatulaChampionAssetIndex | undefined;
  itemAssets: GoldenSpatulaItemAssetIndex | undefined;
  basePath: string;
  compact?: boolean;
  slotCount?: number;
}) {
  const { t } = useTranslation();
  const units = collectLineupUnits(variant)
    .filter(isGoldenSpatulaDisplayableUnit)
    .slice(0, slotCount);
  const emptySlots = Math.max(0, slotCount - units.length);

  return (
    <div
      className={clsx(
        'flex min-w-0 items-start overflow-x-auto overflow-y-visible pb-1 pr-1',
        compact ? 'gap-1.5' : 'gap-2.5',
      )}
    >
      {units.map((unit, index) => {
        const asset = findChampionAsset(unit.name, championAssets);
        const cost = asset?.cost;
        const carry = isMainCarryUnit(unit, variant);
        const items = unit.items?.slice(0, 3) ?? [];

        return (
          <FloatingInfoTooltip
            key={`${unit.name}-${unit.location ?? index}`}
            content={
              <LineupUnitHoverCard
                unit={unit}
                championAssets={championAssets}
                itemAssets={itemAssets}
                basePath={basePath}
                t={t}
              />
            }
          >
            <div className={clsx('min-w-0 shrink-0 text-center', compact ? 'w-12' : 'w-16')}>
              <div
                className={clsx(
                  'relative mx-auto flex shrink-0 items-center justify-center rounded-lg p-[2px] shadow-sm',
                  compact ? 'h-11 w-11' : 'h-14 w-14',
                )}
                style={costFrameStyle(cost)}
              >
                <div className="h-full w-full overflow-hidden rounded-md bg-bg-primary text-[10px] font-bold text-text-muted">
                  <LineupAssetImage
                    imagePath={asset?.imagePath}
                    fallback={shortUnitName(unit.name)}
                    basePath={basePath}
                    className="scale-110"
                  />
                </div>
                {carry && (
                  <span
                    className={clsx(
                      'absolute -right-1 -top-1 flex items-center justify-center rounded-full bg-amber-400 px-1 font-black leading-none text-slate-950 ring-1 ring-white/80',
                      compact ? 'h-4 min-w-4 text-[9px]' : 'h-5 min-w-5 text-[10px]',
                    )}
                  >
                    C
                  </span>
                )}
                {items.length > 0 && (
                  <div
                    className={clsx(
                      'absolute left-1/2 flex -translate-x-1/2 justify-center gap-0.5 rounded-md bg-bg-secondary/95 px-0.5 py-0.5 shadow-sm ring-1 ring-border/60 backdrop-blur-sm',
                      compact ? '-bottom-5' : '-bottom-6',
                    )}
                  >
                    {items.map((item, itemIndex) => (
                      <span
                        key={`${item}-${itemIndex}`}
                        className={clsx(
                          'flex items-center justify-center overflow-hidden rounded bg-bg-primary p-[1px] text-text-muted ring-1 ring-border/70',
                          compact ? 'h-4 w-4 text-[6px]' : 'h-[18px] w-[18px] text-[7px]',
                        )}
                        title={item}
                      >
                        <LineupAssetImage
                          imagePath={findItemAsset(item, itemAssets)?.imagePath}
                          fallback={item.slice(0, 1)}
                          basePath={basePath}
                        />
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div
                className={clsx(
                  'truncate text-center font-bold leading-none text-text-primary dark:text-white',
                  compact ? 'mt-5 text-[10px]' : 'mt-6 text-xs',
                )}
              >
                {unit.name}
              </div>
            </div>
          </FloatingInfoTooltip>
        );
      })}
      {Array.from({ length: emptySlots }).map((_, index) => (
        <div key={`empty-${index}`} className={clsx('shrink-0', compact ? 'w-12' : 'w-16')}>
          <div
            className={clsx(
              'mx-auto rounded-lg',
              compact
                ? 'h-11 w-11 border border-dashed border-border/45 bg-bg-tertiary/35 opacity-60'
                : 'h-14 w-14 border-2 border-border-strong/50 bg-bg-tertiary/80',
            )}
          />
        </div>
      ))}
    </div>
  );
}

function LineupCompositionSummary({
  name,
  variant,
  sourceKind,
  version,
  championAssets,
  traitAssets,
  itemAssets,
  basePath,
  t,
  compact = false,
  selected = false,
}: {
  name: string;
  variant: GoldenSpatulaLineupVariant;
  sourceKind?: NonNullable<GoldenSpatulaManagedLineup['source']>['kind'];
  version?: string;
  championAssets: GoldenSpatulaChampionAssetIndex | undefined;
  traitAssets: GoldenSpatulaTraitAssetIndex | undefined;
  itemAssets: GoldenSpatulaItemAssetIndex | undefined;
  basePath: string;
  t: TFunction;
  compact?: boolean;
  selected?: boolean;
}) {
  const level = getLineupDisplayLevel(variant);
  const totalCost = getLineupTotalCost(variant, championAssets);
  const unitCount = collectLineupUnits(variant).filter(isGoldenSpatulaDisplayableUnit).length;
  const augmentCount = variant.augmentRecommendations?.details?.length ?? 0;
  const metaTags = [
    variant.season,
    version ?? variant.version,
    sourceKind ? t(`goldenSpatula.lineups.source.${sourceKind}`) : undefined,
  ].filter((item): item is string => Boolean(item));

  if (compact) {
    return (
      <div
        className={clsx(
          'min-w-0 overflow-hidden rounded-lg border border-l-4 text-left transition duration-150',
          selected
            ? 'border-accent/55 bg-accent/5 shadow-sm ring-1 ring-inset ring-accent/25 dark:bg-accent/10'
            : 'border-border/70 border-l-transparent bg-bg-primary/65 shadow-sm ring-1 ring-inset ring-border/30',
        )}
      >
        <div className="grid min-w-0 items-center gap-1.5 px-1.5 py-1 lg:grid-cols-[34px_minmax(150px,0.38fr)_minmax(340px,1fr)]">
          <div className="flex justify-center">
            <LineupDarkTierBadge quality={variant.quality} compact />
          </div>

          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-1.5">
              <div className="min-w-0 flex-1 truncate text-xs font-black text-text-primary">
                {name}
              </div>
              <span className="shrink-0 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-black text-emerald-700 dark:text-emerald-200">
                {t('goldenSpatula.lineups.lineupLevel', { level })}
              </span>
            </div>

            <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-0.5">
              {metaTags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-bg-tertiary px-1.5 py-px text-[9px] font-bold text-text-muted ring-1 ring-inset ring-border/30"
                >
                  {tag}
                </span>
              ))}
              <span
                className="inline-flex items-center gap-0.5 rounded-full bg-bg-tertiary px-1.5 py-px text-[9px] font-bold text-text-muted ring-1 ring-inset ring-border/30"
                title={t('goldenSpatula.lineups.lineupUnits')}
              >
                <ListChecks className="h-3 w-3 text-text-muted" />
                {unitCount}
              </span>
              <span
                className="inline-flex items-center gap-0.5 rounded-full bg-bg-tertiary px-1.5 py-px text-[9px] font-bold text-text-muted ring-1 ring-inset ring-border/30"
                title={t('goldenSpatula.lineups.lineupCost')}
              >
                <Coins className="h-3 w-3 text-amber-500 dark:text-amber-400" />
                {totalCost ?? '-'}
              </span>
              <span
                className="inline-flex items-center gap-0.5 rounded-full bg-bg-tertiary px-1.5 py-px text-[9px] font-bold text-text-muted ring-1 ring-inset ring-border/30"
                title={t('goldenSpatula.lineups.lineupAugments')}
              >
                <Sparkles className="h-3 w-3 text-accent" />
                {augmentCount}
              </span>
            </div>

            <div className="mt-1">
              <LineupTraitPillRow
                variant={variant}
                traitAssets={traitAssets}
                championAssets={championAssets}
                basePath={basePath}
                t={t}
                compact
              />
            </div>
          </div>

          <LineupOpggUnitStrip
            variant={variant}
            championAssets={championAssets}
            itemAssets={itemAssets}
            basePath={basePath}
            compact
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'min-w-0 overflow-hidden rounded-md border text-left transition duration-150',
        selected
          ? 'border-accent/70 bg-accent/5 shadow-md ring-2 ring-inset ring-accent/45 dark:bg-accent/10 dark:ring-accent/55'
          : 'border-border bg-bg-secondary shadow-sm ring-1 ring-inset ring-border/35',
        compact ? 'min-h-[116px]' : 'min-h-[126px]',
      )}
    >
      <div
        className={clsx(
          'grid min-w-0',
          compact
            ? 'grid-cols-1 lg:grid-cols-[minmax(340px,0.82fr)_minmax(620px,1.6fr)]'
            : 'grid-cols-1 lg:grid-cols-[minmax(380px,0.88fr)_minmax(660px,1.6fr)]',
        )}
      >
        <div
          className={clsx(
            'grid min-w-0 border-b border-border',
            compact
              ? 'lg:min-h-[116px] lg:grid-cols-[52px_minmax(0,1fr)] lg:border-b-0 lg:border-r'
              : 'lg:min-h-[126px] lg:grid-cols-[56px_minmax(0,1fr)] lg:border-b-0 lg:border-r',
          )}
        >
          <div className="flex items-center justify-center border-b border-border bg-bg-tertiary p-2 lg:border-b-0 lg:border-r">
            <LineupDarkTierBadge quality={variant.quality} />
          </div>

          <div className="flex min-w-0 flex-col justify-center px-3 py-2.5">
            <div className="flex min-w-0 items-start gap-2">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold text-text-primary">{name}</div>
                {metaTags.length > 0 && (
                  <div className="mt-1.5 flex min-w-0 flex-wrap gap-1">
                    {metaTags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded bg-bg-hover px-1.5 py-0.5 text-[10px] font-bold text-text-secondary ring-1 ring-inset ring-border/70"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <span className="inline-flex shrink-0 items-center rounded border border-emerald-500/45 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:border-emerald-400/45 dark:text-emerald-200">
                {t('goldenSpatula.lineups.lineupLevel', { level })}
              </span>
            </div>

            <div className="mt-3 grid min-w-0 grid-cols-3">
              <LineupMetric label={t('goldenSpatula.lineups.lineupUnits')} value={unitCount} />
              <LineupMetric
                label={t('goldenSpatula.lineups.lineupCost')}
                value={
                  totalCost !== undefined ? (
                    <span className="inline-flex items-center gap-1">
                      <Coins className="h-3 w-3 text-amber-500 dark:text-amber-400" />
                      {totalCost}
                    </span>
                  ) : (
                    '-'
                  )
                }
              />
              <LineupMetric
                label={t('goldenSpatula.lineups.lineupAugments')}
                value={augmentCount}
              />
            </div>
          </div>
        </div>

        <div
          className={clsx(
            'flex min-w-0 flex-col justify-center gap-2 px-3 py-2',
            compact ? 'lg:min-h-[116px]' : 'lg:min-h-[126px]',
          )}
        >
          <LineupTraitPillRow
            variant={variant}
            traitAssets={traitAssets}
            championAssets={championAssets}
            basePath={basePath}
            t={t}
            compact={compact}
          />
          <LineupOpggUnitStrip
            variant={variant}
            championAssets={championAssets}
            itemAssets={itemAssets}
            basePath={basePath}
            compact={compact}
          />
        </div>
      </div>
    </div>
  );
}

function LineupTargetList({
  variant,
  championAssets,
  basePath,
  onToggleTarget,
  t,
}: {
  variant: GoldenSpatulaLineupVariant;
  championAssets: GoldenSpatulaChampionAssetIndex | undefined;
  basePath: string;
  onToggleTarget: (name: string) => void;
  t: TFunction;
}) {
  const units = collectLineupUnits(variant)
    .filter(isGoldenSpatulaDisplayableUnit)
    .filter(
      (unit, index, list) =>
        list.findIndex(
          (item) => normalizeSearchText(item.name) === normalizeSearchText(unit.name),
        ) === index,
    );
  const selectedTargetSet = new Set(
    getGoldenSpatulaActiveRollTargetNames(variant).map((name) => normalizeSearchText(name)),
  );
  const selectedCount = units.filter((unit) =>
    selectedTargetSet.has(normalizeSearchText(unit.name)),
  ).length;

  return (
    <div className="rounded-lg bg-bg-primary/35 px-1.5 py-1 ring-1 ring-inset ring-border/30">
      <div className="mb-1 flex items-center justify-between gap-1.5">
        <div className="text-[10px] font-black uppercase tracking-wide text-text-muted">
          {t('goldenSpatula.lineups.targetCandidates')}
        </div>
        <StatusPill tone={selectedCount > 0 ? 'success' : 'muted'}>
          {t('goldenSpatula.lineups.rollStatusTargets')} {selectedCount}
        </StatusPill>
      </div>
      {units.length > 0 ? (
        <div className="flex min-w-0 items-start gap-1.5 overflow-x-auto overflow-y-visible px-0.5 pb-0.5 pt-1.5">
          {units.map((unit) => (
            <LineupTargetCard
              key={unit.name}
              unit={unit}
              championAssets={championAssets}
              basePath={basePath}
              selected={selectedTargetSet.has(normalizeSearchText(unit.name))}
              onToggleTarget={onToggleTarget}
              t={t}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-full bg-bg-tertiary/70 px-2 py-1 text-[10px] font-semibold text-text-muted">
          {t('goldenSpatula.lineups.noRollTargets')}
        </div>
      )}
    </div>
  );
}
function findAugmentAssetByName(
  name: string | undefined,
  assets: GoldenSpatulaAugmentAssetIndex | undefined,
): GoldenSpatulaAugmentAsset | undefined {
  if (!name || !assets) return undefined;
  const key = normalizeSearchText(name);
  return (
    assets[key] ??
    Object.values(assets).find(
      (asset) =>
        normalizeSearchText(asset.name) === key ||
        asset.aliases?.some((alias) => normalizeSearchText(alias) === key),
    )
  );
}

function findAugmentAssetByTemplatePath(
  templatePath: string | undefined,
  assets: GoldenSpatulaAugmentAssetIndex | undefined,
): GoldenSpatulaAugmentAsset | undefined {
  const normalizedTemplate = normalizeKnowledgeTemplatePath(templatePath);
  if (!normalizedTemplate) return undefined;
  return Object.values(assets ?? {}).find((asset) =>
    normalizeKnowledgeTemplatePath(asset.imagePath).endsWith(normalizedTemplate),
  );
}

function findItemAssetByTemplatePath(
  templatePath: string | undefined,
  assets: GoldenSpatulaItemAssetIndex | undefined,
): GoldenSpatulaItemAsset | undefined {
  const normalizedTemplate = normalizeKnowledgeTemplatePath(templatePath);
  if (!normalizedTemplate) return undefined;
  return Object.values(assets ?? {}).find((asset) =>
    normalizeKnowledgeTemplatePath(asset.imagePath).endsWith(normalizedTemplate),
  );
}

function ShopObservationGrid({
  shopSlots,
  championAssets,
  basePath,
  t,
}: {
  shopSlots: Record<number, GoldenSpatulaKnowledgeShopSlotState>;
  championAssets: GoldenSpatulaChampionAssetIndex | undefined;
  basePath: string;
  t: TFunction;
}) {
  const slots = Array.from({ length: 5 }, (_, index) => shopSlots[index + 1]);

  return (
    <div className="grid grid-cols-5 gap-1">
      {slots.map((slot, index) => {
        const asset =
          findChampionAsset(slot?.championName ?? '', championAssets) ??
          findAssetByTemplatePath(slot?.templatePath, championAssets);
        const name = slot?.championName ?? asset?.name;
        const matched = slot?.confidence === 'matched' && Boolean(name);

        return (
          <div
            key={slot?.slotIndex ?? index}
            className={clsx(
              'relative min-w-0 rounded-lg border px-1 py-1 transition-colors',
              matched
                ? 'border-accent/40 bg-accent/10 ring-1 ring-inset ring-accent/20'
                : 'border-border/55 bg-bg-secondary/55 text-text-muted',
            )}
          >
            <span className="absolute left-1 top-1 z-10 rounded-full bg-bg-primary/90 px-1 text-[9px] font-black leading-4 text-text-muted ring-1 ring-inset ring-border/40">
              {index + 1}
            </span>
            <div className="flex min-w-0 items-center gap-1">
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-bg-tertiary text-[10px] ring-1 ring-inset ring-border/55"
                style={costFrameStyle(asset?.cost)}
              >
                <LineupAssetImage imagePath={asset?.imagePath} fallback="?" basePath={basePath} />
              </div>
              <div className="min-w-0 truncate text-[11px] font-black leading-none text-text-primary">
                {name ??
                  t(
                    matched
                      ? 'goldenSpatula.recognition.unknownChampion'
                      : 'goldenSpatula.recognition.notScanned',
                  )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KnowledgeObservationPanel({
  state,
  itemAssets,
  augmentAssets,
  basePath,
  t,
}: {
  state: GoldenSpatulaKnowledgeScanState;
  itemAssets: GoldenSpatulaItemAssetIndex | undefined;
  augmentAssets: GoldenSpatulaAugmentAssetIndex | undefined;
  basePath: string;
  t: TFunction;
}) {
  const selectedAugments = Object.values(state.selectedAugments)
    .filter((slot) => slot.confidence === 'matched')
    .sort((left, right) => left.slotIndex - right.slotIndex);
  const items = Object.values(state.items).slice(0, 8);
  const latestEvent = state.lastEvent ?? state.events[0];

  return (
    <div className="space-y-1 rounded-lg bg-bg-primary/35 p-1.5 ring-1 ring-inset ring-border/30">
      <div className="flex items-center justify-between gap-1.5">
        <SectionTitle icon={Database} label={t('goldenSpatula.recognition.knowledgeObservation')} />
        <StatusPill tone={state.active ? 'success' : 'muted'}>
          {state.active
            ? t('goldenSpatula.lineups.rollStatusRunning')
            : t('goldenSpatula.lineups.rollStatusIdle')}
        </StatusPill>
      </div>

      <div className="grid gap-1 md:grid-cols-2">
        <div className="rounded-lg bg-bg-secondary/60 px-1.5 py-1 ring-1 ring-inset ring-border/30">
          <div className="mb-1 text-[9px] font-black uppercase tracking-wide text-text-muted">
            {t('goldenSpatula.recognition.currentSelectedAugments')}
          </div>
          {selectedAugments.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {selectedAugments.slice(0, 4).map((slot) => {
                const asset =
                  findAugmentAssetByName(slot.augmentName, augmentAssets) ??
                  findAugmentAssetByTemplatePath(slot.templatePath, augmentAssets);
                const name =
                  slot.augmentName ?? asset?.name ?? t('goldenSpatula.recognition.unknownAugment');

                return (
                  <span
                    key={slot.slotIndex}
                    className="inline-flex h-6 max-w-full items-center gap-1 rounded-full bg-accent/10 px-1.5 text-[10px] font-bold text-accent ring-1 ring-inset ring-accent/25"
                    title={name}
                  >
                    <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center overflow-hidden rounded bg-bg-primary text-[8px] ring-1 ring-inset ring-border/50">
                      <LineupAssetImage
                        imagePath={asset?.imagePath ?? slot.templatePath}
                        fallback={String(slot.slotLabel ?? slot.slotIndex)}
                        basePath={basePath}
                      />
                    </span>
                    <span className="truncate">{name}</span>
                  </span>
                );
              })}
            </div>
          ) : (
            <div className="rounded-full bg-bg-primary/55 px-2 py-0.5 text-[10px] font-bold text-text-muted">
              {t('goldenSpatula.recognition.noSelectedAugmentsObserved')}
            </div>
          )}
        </div>

        <div className="rounded-lg bg-bg-secondary/60 px-1.5 py-1 ring-1 ring-inset ring-border/30">
          <div className="mb-1 text-[9px] font-black uppercase tracking-wide text-text-muted">
            {t('goldenSpatula.recognition.currentItems')}
          </div>
          {items.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {items.map((item) => {
                const asset = findItemAssetByTemplatePath(item.templatePath, itemAssets);
                const label =
                  asset?.name ?? item.templatePath.split(/[\\/]/).pop() ?? item.templatePath;

                return (
                  <span
                    key={item.templatePath}
                    className="flex h-6 w-6 items-center justify-center overflow-hidden rounded bg-bg-primary text-[8px] text-text-muted ring-1 ring-inset ring-border/50"
                    title={label}
                  >
                    <LineupAssetImage
                      imagePath={asset?.imagePath ?? item.templatePath}
                      fallback={label.slice(0, 1)}
                      basePath={basePath}
                    />
                  </span>
                );
              })}
            </div>
          ) : (
            <div className="rounded-full bg-bg-primary/55 px-2 py-0.5 text-[10px] font-bold text-text-muted">
              {t('goldenSpatula.recognition.noItemsObserved')}
            </div>
          )}
        </div>
      </div>

      <div className="truncate rounded-full bg-bg-secondary/45 px-2 py-0.5 text-[10px] font-bold text-text-muted">
        {latestEvent?.message ?? t('goldenSpatula.recognition.knowledgeNoEvents')}
      </div>
    </div>
  );
}

function formatOddsValue(value: number | undefined): string {
  if (value === undefined || Number.isNaN(value)) return '-';
  const percent = value <= 1 ? value * 100 : value;
  return `${Math.round(percent)}%`;
}

function formatShopOddsSummary(
  shopOdds: Partial<Record<number, number>> | undefined,
  t: TFunction,
): string {
  const entries = Object.entries(shopOdds ?? {})
    .filter(([, odds]) => odds !== undefined && !Number.isNaN(odds))
    .sort(([left], [right]) => Number(left) - Number(right));

  if (entries.length === 0) return t('goldenSpatula.lineups.decisionShopOddsUnknown');

  return entries
    .map(([cost, odds]) =>
      t('goldenSpatula.lineups.economyCostOdds', {
        cost,
        odds: formatOddsValue(odds),
      }),
    )
    .join('  ');
}

function formatEconomyValue(value: number | string | undefined, fallback: string): string {
  if (value === undefined || value === '') return fallback;
  return String(value);
}

function EconomyStat({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="inline-flex h-6 max-w-[160px] min-w-0 items-center gap-1 rounded-full bg-bg-tertiary px-1.5 ring-1 ring-inset ring-border/30"
      title={`${label}: ${value}`}
    >
      <div className="shrink-0 text-[9px] font-bold text-text-muted">{label}</div>
      <div className="min-w-0 truncate text-[11px] font-black text-text-primary">{value}</div>
    </div>
  );
}

function EconomyRunStatusPanel({
  runState,
  selectedAugments,
  augmentAssets,
  basePath,
  detecting,
  polling,
  detectDisabledReason,
  onDetect,
  t,
}: {
  runState: GoldenSpatulaEconomyRunState;
  selectedAugments: Record<number, GoldenSpatulaKnowledgeSelectedAugmentState>;
  augmentAssets: GoldenSpatulaAugmentAssetIndex | undefined;
  basePath: string;
  detecting: boolean;
  polling: boolean;
  detectDisabledReason?: string;
  onDetect: () => void;
  t: TFunction;
}) {
  const fallback = t('goldenSpatula.lineups.economyStatusUnknown');
  const selectedAugmentList = Object.values(selectedAugments)
    .filter((slot) => slot.confidence === 'matched')
    .sort((left, right) => left.slotIndex - right.slotIndex);
  const economyStats = [
    {
      label: t('goldenSpatula.lineups.economyRound'),
      value: formatEconomyValue(runState.round, fallback),
    },
    {
      label: t('goldenSpatula.lineups.economyGold'),
      value: formatEconomyValue(runState.gold, fallback),
    },
    {
      label: t('goldenSpatula.lineups.economyLevel'),
      value: formatEconomyValue(runState.level, fallback),
    },
    {
      label: t('goldenSpatula.lineups.economyExperience'),
      value:
        runState.experience !== undefined && runState.experienceMax !== undefined
          ? `${runState.experience}/${runState.experienceMax}`
          : fallback,
    },
  ];

  return (
    <div className="rounded-lg bg-bg-primary/55 px-1.5 py-1 ring-1 ring-inset ring-border/35">
      <div className="flex flex-wrap items-center gap-1">
        <div className="inline-flex h-6 items-center gap-1 rounded-full bg-bg-tertiary px-1.5 ring-1 ring-inset ring-border/30">
          <Coins className="h-3 w-3 text-amber-500 dark:text-amber-400" />
          <span className="text-[11px] font-black text-text-primary">
            {t('goldenSpatula.lineups.economyStatus')}
          </span>
        </div>
        {polling && (
          <StatusPill tone="success">{t('goldenSpatula.lineups.economyOcrPolling')}</StatusPill>
        )}
        {economyStats.map((stat) => (
          <EconomyStat key={stat.label} label={stat.label} value={stat.value} />
        ))}

        <div className="mx-0.5 h-4 w-px bg-border/60" />
        <span className="text-[9px] font-black uppercase tracking-wide text-text-muted">
          {t('goldenSpatula.recognition.currentSelectedAugments')}
        </span>
        {selectedAugmentList.length > 0 ? (
          selectedAugmentList.slice(0, 4).map((slot) => {
            const asset =
              findAugmentAssetByName(slot.augmentName, augmentAssets) ??
              findAugmentAssetByTemplatePath(slot.templatePath, augmentAssets);
            const name =
              slot.augmentName ?? asset?.name ?? t('goldenSpatula.recognition.unknownAugment');

            return (
              <span
                key={slot.slotIndex}
                className="inline-flex h-6 max-w-[140px] items-center gap-1 rounded-full bg-bg-tertiary px-1.5 text-[10px] font-bold text-text-primary ring-1 ring-inset ring-border/30"
                title={name}
              >
                <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center overflow-hidden rounded bg-bg-primary text-[8px] ring-1 ring-inset ring-border/50">
                  <LineupAssetImage
                    imagePath={asset?.imagePath ?? slot.templatePath}
                    fallback={String(slot.slotLabel ?? slot.slotIndex)}
                    basePath={basePath}
                  />
                </span>
                <span className="truncate">{name}</span>
              </span>
            );
          })
        ) : (
          <span className="inline-flex h-6 items-center rounded-full bg-bg-tertiary px-1.5 text-[10px] font-bold text-text-muted ring-1 ring-inset ring-border/30">
            {t('goldenSpatula.recognition.noSelectedAugmentsObserved')}
          </span>
        )}

        <button
          type="button"
          disabled={Boolean(detectDisabledReason)}
          onClick={onDetect}
          className="ml-auto inline-flex h-6 items-center justify-center gap-1 rounded-full border border-border/55 bg-bg-secondary px-1.5 text-[10px] font-black text-text-primary transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
          title={detectDisabledReason || t('goldenSpatula.lineups.runEconomyOcr')}
        >
          {detecting ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Search className="h-3 w-3" />
          )}
          <span>
            {detecting
              ? t('goldenSpatula.lineups.stopEconomyOcr')
              : t('goldenSpatula.lineups.runEconomyOcr')}
          </span>
        </button>
      </div>
    </div>
  );
}

function AugmentDecisionPanel({
  decision,
  scanState,
  detecting,
  polling,
  picking,
  pickDisabledReason,
  onPick,
  basePath,
  t,
  embedded = false,
}: {
  decision: GoldenSpatulaAugmentDecision;
  scanState: GoldenSpatulaAugmentScanState;
  detecting: boolean;
  polling: boolean;
  picking: boolean;
  pickDisabledReason?: string;
  onPick: () => void;
  basePath: string;
  t: TFunction;
  embedded?: boolean;
}) {
  const options = decision.options.slice(0, 3);

  return (
    <div
      className={clsx(
        'space-y-1',
        !embedded && 'rounded-lg bg-bg-primary/35 p-1.5 ring-1 ring-inset ring-border/30',
      )}
    >
      {!embedded && (
        <div className="flex items-center justify-between gap-1.5">
          <SectionTitle icon={Sparkles} label={t('goldenSpatula.lineups.augmentTitle')} />
          <div className="flex items-center gap-1">
            {polling && (
              <StatusPill tone="success">{t('goldenSpatula.lineups.economyOcrPolling')}</StatusPill>
            )}
            <StatusPill tone={scanState.active || detecting ? 'success' : 'muted'}>
              {scanState.active || detecting
                ? t('goldenSpatula.lineups.rollStatusRunning')
                : t('goldenSpatula.lineups.rollStatusIdle')}
            </StatusPill>
          </div>
        </div>
      )}
      {options.length > 0 ? (
        <div className="grid grid-cols-3 gap-1">
          {options.map((option) => {
            const selected = decision.bestOption?.slotIndex === option.slotIndex;
            const name =
              option.matchedAsset?.name ??
              option.titleText ??
              t('goldenSpatula.lineups.augmentUnknown');

            return (
              <div
                key={option.slotIndex}
                className={clsx(
                  'min-w-0 rounded-xl border px-1.5 py-1 text-center transition-colors',
                  selected
                    ? 'border-accent/55 bg-accent/10 text-accent ring-1 ring-inset ring-accent/30'
                    : 'border-border/45 bg-bg-secondary/55 text-text-secondary',
                )}
                title={name}
              >
                <div className="mx-auto flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-bg-primary text-[10px] font-black text-text-muted ring-1 ring-inset ring-border/45">
                  <LineupAssetImage
                    imagePath={option.matchedAsset?.imagePath}
                    fallback={name.slice(0, 2)}
                    basePath={basePath}
                  />
                </div>
                <div className="mt-1 truncate text-[11px] font-black">{name}</div>
                <div
                  className={clsx(
                    'mx-auto mt-0.5 inline-flex h-4 min-w-8 items-center justify-center rounded-full px-1.5 text-[9px] font-black ring-1 ring-inset',
                    selected
                      ? 'bg-accent text-white ring-accent'
                      : 'bg-bg-primary text-text-muted ring-border/40',
                  )}
                >
                  {Math.round(option.score)}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-full bg-bg-secondary/60 px-2 py-1 text-[10px] font-bold text-text-muted">
          {scanState.lastEvent?.message ??
            t('goldenSpatula.recognition.noSelectedAugmentsObserved')}
        </div>
      )}
      <button
        type="button"
        disabled={Boolean(pickDisabledReason) || picking || detecting}
        onClick={onPick}
        className="inline-flex h-7 w-full items-center justify-center gap-1 rounded-full bg-accent px-2 text-[10px] font-black text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        title={pickDisabledReason || t('goldenSpatula.lineups.augmentPickBest')}
      >
        {picking ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
        <span>
          {picking
            ? t('goldenSpatula.lineups.augmentPicking')
            : t('goldenSpatula.lineups.augmentPickBest')}
        </span>
      </button>
    </div>
  );
}

function SpecialEventPanel({
  augmentPresence,
  decision,
  scanState,
  detecting,
  polling,
  picking,
  pickDisabledReason,
  onPick,
  basePath,
  t,
}: {
  augmentPresence: GoldenSpatulaAugmentPresenceResult;
  decision: GoldenSpatulaAugmentDecision;
  scanState: GoldenSpatulaAugmentScanState;
  detecting: boolean;
  polling: boolean;
  picking: boolean;
  pickDisabledReason?: string;
  onPick: () => void;
  basePath: string;
  t: TFunction;
}) {
  const hasAugmentChoices = decision.options.length > 0;
  const hasAugmentEvent =
    augmentPresence.visible || scanState.active || detecting || hasAugmentChoices;
  const confidencePercent = Math.round((augmentPresence.confidence ?? 0) * 100);

  return (
    <div
      className={clsx(
        'rounded-lg px-1.5 py-1 ring-1 ring-inset transition-colors',
        hasAugmentEvent ? 'bg-accent/10 ring-accent/25' : 'bg-bg-primary/35 ring-border/30',
      )}
    >
      <div className="flex items-center justify-between gap-1.5">
        <SectionTitle icon={Sparkles} label={t('goldenSpatula.lineups.augmentMonitor')} />
        <div className="flex min-w-0 items-center gap-1">
          {polling && (
            <StatusPill tone="success">{t('goldenSpatula.lineups.economyOcrPolling')}</StatusPill>
          )}
          {augmentPresence.visible && (
            <span className="inline-flex h-5 items-center rounded-full bg-accent/10 px-1.5 text-[9px] font-black text-accent ring-1 ring-inset ring-accent/25">
              {confidencePercent}%
            </span>
          )}
          <StatusPill tone={hasAugmentEvent ? 'success' : 'muted'}>
            {hasAugmentEvent
              ? t('goldenSpatula.lineups.rollStatusRunning')
              : t('goldenSpatula.lineups.rollStatusIdle')}
          </StatusPill>
        </div>
      </div>

      <div className="mt-1">
        {hasAugmentEvent ? (
          <AugmentDecisionPanel
            decision={decision}
            scanState={scanState}
            detecting={detecting}
            polling={polling}
            picking={picking}
            pickDisabledReason={pickDisabledReason}
            onPick={onPick}
            basePath={basePath}
            t={t}
            embedded
          />
        ) : (
          <div className="rounded-full bg-bg-secondary/55 px-2 py-1 text-[10px] font-bold text-text-muted">
            {t('goldenSpatula.lineups.augmentPresenceMissing')}
          </div>
        )}
      </div>
    </div>
  );
}

function DecisionPickCard({
  pick,
  asset,
  basePath,
  selected,
  onToggle,
  t,
}: {
  pick: GoldenSpatulaPickRecommendation;
  asset: GoldenSpatulaChampionAsset | undefined;
  basePath: string;
  selected: boolean;
  onToggle: () => void;
  t: TFunction;
}) {
  const score = Math.round(pick.score);
  const levelLocked = pick.shopOddsAvailability === 'unavailable';
  const scoreToneClass = selected
    ? 'bg-emerald-500 text-white ring-emerald-300 dark:ring-emerald-400/70'
    : score >= 100
      ? 'bg-amber-300 text-slate-950 ring-amber-100'
      : score >= 60
        ? 'bg-sky-500 text-white ring-sky-300/70'
        : score >= 40
          ? 'bg-white text-slate-950 ring-white/70'
          : 'bg-slate-800 text-white ring-white/20 dark:bg-slate-700';

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      title={
        selected
          ? t('goldenSpatula.lineups.decisionTargetSelected')
          : t('goldenSpatula.lineups.decisionSetTarget')
      }
      className={clsx(
        'group relative w-[58px] shrink-0 rounded-xl p-1 text-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
        selected
          ? 'bg-accent/10 text-accent ring-2 ring-accent/70 shadow-sm'
          : 'bg-transparent text-text-primary hover:-translate-y-0.5 hover:bg-bg-hover/70 hover:ring-1 hover:ring-border/70',
        levelLocked && !selected && 'opacity-70',
      )}
    >
      <div
        className={clsx(
          'relative mx-auto flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-bg-tertiary p-[2px] text-[10px] text-text-muted shadow-sm transition-transform group-hover:scale-[1.03]',
          selected && 'ring-2 ring-accent ring-offset-1 ring-offset-bg-secondary',
        )}
        style={costFrameStyle(asset?.cost ?? pick.cost)}
      >
        <div className="h-full w-full overflow-hidden rounded-md bg-bg-primary">
          <LineupAssetImage
            imagePath={asset?.imagePath}
            fallback={shortUnitName(pick.name)}
            basePath={basePath}
            className="scale-105"
          />
        </div>
      </div>
      <span
        className={clsx(
          'relative z-10 mx-auto -mt-2 inline-flex h-4 min-w-9 items-center justify-center rounded-full px-1.5 text-[10px] font-black leading-none shadow-[0_1px_4px_rgba(0,0,0,0.35)] ring-1 ring-inset',
          scoreToneClass,
        )}
      >
        {score}
      </span>
      <span
        className={clsx(
          'mt-1 block max-w-full truncate text-[10px] font-black leading-none',
          selected ? 'text-accent' : 'text-text-primary',
        )}
      >
        {pick.name}
      </span>
    </button>
  );
}

function DecisionPlanPanel({
  plan,
  championAssets,
  basePath,
  shopOdds,
  shopOddsSource,
  activeTargetNames,
  onToggleTarget,
  onAutoCapture,
  t,
}: {
  plan: GoldenSpatulaDecisionPlan;
  championAssets: GoldenSpatulaChampionAssetIndex | undefined;
  itemAssets: GoldenSpatulaItemAssetIndex | undefined;
  basePath: string;
  shopOdds?: Partial<Record<number, number>>;
  shopOddsSource?: GoldenSpatulaShopOddsSource;
  activeTargetNames: string[];
  onToggleTarget: (name: string) => void;
  onAutoCapture: () => void;
  t: TFunction;
}) {
  const selectedTargets = useMemo(
    () => new Set(activeTargetNames.map((name) => normalizeSearchText(name))),
    [activeTargetNames],
  );
  const advice = plan.economyAdvice;
  const roundPolicy = advice.breakdown.roundPolicy;
  const shopOddsText = formatShopOddsSummary(shopOdds, t);
  const topTransition = plan.transitionLineups[0];

  return (
    <div className="space-y-1 rounded-xl border border-border/55 bg-bg-secondary/25 p-1 shadow-sm">
      <div className="flex items-center gap-1 rounded-lg bg-bg-primary/50 px-1.5 py-1 ring-1 ring-inset ring-border/30">
        <div className="inline-flex h-6 items-center gap-1 rounded-full bg-bg-tertiary px-2 ring-1 ring-inset ring-border/30">
          <Crosshair className="h-3.5 w-3.5 text-accent" />
          <span className="text-[11px] font-black text-text-primary">
            {t('goldenSpatula.lineups.decisionPicks')}
          </span>
        </div>
        <span className="hidden min-w-0 truncate text-[10px] font-semibold text-text-muted sm:inline">
          {t('goldenSpatula.lineups.decisionSearchMeta', {
            lineups: plan.evaluatedLineups,
            candidates: plan.evaluatedCandidates,
          })}
        </span>
        <button
          type="button"
          onClick={onAutoCapture}
          className="ml-auto inline-flex h-6 min-w-6 items-center justify-center gap-1 rounded-full border border-border/60 bg-bg-secondary/80 px-1.5 text-[10px] font-bold text-text-secondary transition-colors hover:border-accent hover:text-accent lg:px-2"
          title={t('goldenSpatula.lineups.decisionAutoCaptureTitle')}
        >
          <Target className="h-3 w-3 shrink-0" />
          <span className="hidden lg:inline">{t('goldenSpatula.lineups.decisionAutoCapture')}</span>
        </button>
      </div>

      <div className="hidden">
        <span className="mr-auto min-w-[120px] truncate text-[11px] font-semibold text-text-primary">
          {t(`goldenSpatula.lineups.decisionEconomyHeadline.${advice.action}`)}
        </span>
        <StatusPill tone="warning">
          {t('goldenSpatula.lineups.decisionRollScore', {
            score: advice.breakdown.rollDecisionScore.total,
          })}
        </StatusPill>
        {roundPolicy && (
          <StatusPill tone="muted">
            {t('goldenSpatula.lineups.decisionRoundPolicy', {
              checkpoint: roundPolicy.checkpoint,
              kind: t(`goldenSpatula.lineups.decisionRoundPolicyKind.${roundPolicy.kind}`),
            })}
          </StatusPill>
        )}
        <StatusPill tone="muted">{shopOddsText}</StatusPill>
        {shopOddsSource && (
          <StatusPill tone="muted">
            {t(`goldenSpatula.lineups.economyShopOddsSource.${shopOddsSource}`)}
          </StatusPill>
        )}
      </div>

      <div>
        <div className="hidden">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
            {t('goldenSpatula.lineups.decisionPicks')}
          </div>
          <div className="truncate text-[11px] text-text-muted">
            {t('goldenSpatula.lineups.decisionSearchMeta', {
              lineups: plan.evaluatedLineups,
              candidates: plan.evaluatedCandidates,
            })}
          </div>
        </div>
        {plan.picks.length > 0 ? (
          <div className="flex min-w-0 items-start gap-1.5 overflow-x-auto overflow-y-visible rounded-lg bg-bg-primary/55 px-1.5 py-1 ring-1 ring-inset ring-border/30">
            {plan.picks.slice(0, 12).map((pick) => (
              <DecisionPickCard
                key={pick.name}
                pick={pick}
                asset={findChampionAsset(pick.name, championAssets)}
                basePath={basePath}
                selected={selectedTargets.has(normalizeSearchText(pick.name))}
                onToggle={() => onToggleTarget(pick.name)}
                t={t}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-md bg-bg-primary p-2 text-xs text-text-muted">
            {t('goldenSpatula.lineups.decisionNoPicks')}
          </div>
        )}
      </div>

      {plan.transitionLineups.length > 0 ? (
        <details className="group rounded-lg bg-bg-primary/40 px-2 py-1 ring-1 ring-inset ring-border/30">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 [&::-webkit-details-marker]:hidden">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
              {t('goldenSpatula.lineups.decisionTransitions')}
            </span>
            {topTransition && (
              <>
                <span className="min-w-0 truncate text-[11px] font-bold text-text-primary">
                  {formatLineupDisplayName(topTransition.name)}
                </span>
                <span className="rounded-full bg-bg-tertiary px-1.5 py-0.5 text-[10px] font-black text-text-secondary ring-1 ring-inset ring-border/35">
                  {topTransition.score}
                </span>
              </>
            )}
            <span className="ml-auto rounded-full bg-bg-tertiary px-1.5 py-0.5 text-[10px] font-semibold text-text-muted ring-1 ring-inset ring-border/35">
              {plan.transitionLineups.length}
            </span>
          </summary>
          <div className="mt-1.5 flex flex-wrap gap-1 border-t border-border/45 pt-1.5">
            {plan.transitionLineups.slice(0, 4).map((lineup, index) => (
              <div
                key={`${lineup.lineupId}-${lineup.variantId}`}
                className={clsx(
                  'inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-full border bg-bg-primary px-2 py-1 ring-1 ring-inset',
                  index === 0
                    ? 'border-accent/45 ring-accent/25'
                    : 'border-border/60 ring-border/30',
                )}
              >
                <span
                  className={clsx(
                    'flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-black leading-none',
                    index === 0 ? 'bg-accent text-white' : 'bg-bg-tertiary text-text-secondary',
                  )}
                >
                  #{index + 1}
                </span>
                <span className="min-w-0 truncate text-[11px] font-semibold text-text-primary">
                  {formatLineupDisplayName(lineup.name)}
                </span>
                <span className="rounded bg-bg-tertiary px-1.5 py-0.5 text-[10px] font-bold text-text-secondary">
                  {lineup.score}
                </span>
              </div>
            ))}
          </div>
        </details>
      ) : (
        <div className="rounded-md bg-bg-primary p-2 text-xs text-text-muted">
          {t('goldenSpatula.lineups.decisionNoTransitions')}
        </div>
      )}
    </div>
  );
}
function parseBoardIndex(location?: string): number | undefined {
  if (!location) return undefined;
  const [rowValue, columnValue] = location.split(',').map((part) => Number(part.trim()));
  if (!Number.isInteger(rowValue) || !Number.isInteger(columnValue)) return undefined;
  if (rowValue < 1 || rowValue > 4 || columnValue < 1 || columnValue > 7) return undefined;
  return (rowValue - 1) * 7 + (columnValue - 1);
}

function mapUnitsToBoard(units: GoldenSpatulaLineupUnit[]): Array<GoldenSpatulaLineupUnit | null> {
  const board: Array<GoldenSpatulaLineupUnit | null> = Array.from(
    { length: battleBoardSlotCount },
    () => null,
  );
  const overflow: GoldenSpatulaLineupUnit[] = [];

  for (const unit of units) {
    const index = parseBoardIndex(unit.location);
    if (index !== undefined && !board[index]) {
      board[index] = unit;
    } else {
      overflow.push(unit);
    }
  }

  for (const unit of overflow) {
    const index = board.findIndex((item) => item === null);
    if (index === -1) break;
    board[index] = unit;
  }

  return board;
}

function LineupBattleBoard({
  variant,
  championAssets,
  itemAssets,
  basePath,
  t,
}: {
  variant: GoldenSpatulaLineupVariant;
  championAssets: GoldenSpatulaChampionAssetIndex | undefined;
  itemAssets: GoldenSpatulaItemAssetIndex | undefined;
  basePath: string;
  t: TFunction;
}) {
  const units = collectLineupUnits(variant);
  const boardUnits = mapUnitsToBoard(units);

  return (
    <div className="space-y-1.5">
      <div className="rounded-xl bg-slate-50/90 p-1.5 ring-1 ring-inset ring-slate-200/80 dark:bg-bg-primary/45 dark:ring-border/35">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <div className="inline-flex rounded-full bg-bg-secondary px-2 py-px text-[10px] font-black uppercase tracking-wide text-text-secondary ring-1 ring-inset ring-border/35">
            {t('goldenSpatula.lineups.boardPreview')}
          </div>
          {variant.traitsSummary && (
            <span className="min-w-0 truncate text-[10px] font-medium text-text-muted">
              {variant.traitsSummary}
            </span>
          )}
        </div>
        <div className="grid grid-cols-7 gap-x-1 gap-y-2 rounded-lg bg-white/70 p-2 shadow-inner ring-1 ring-inset ring-slate-200/70 dark:bg-bg-secondary/20 dark:ring-border/25">
          {boardUnits.map((unit, index) => {
            const carry = unit ? isMainCarryUnit(unit, variant) : false;
            const cost = unit ? getUnitCost(unit.name, championAssets) : undefined;

            return (
              <div
                key={unit ? `${unit.name}-${index}` : `slot-${index}`}
                className="relative aspect-[1.08] min-w-0 text-center text-[10px]"
                title={unit ? unitLabel(unit) : undefined}
              >
                {unit ? (
                  <>
                    <div
                      className={clsx(
                        'absolute -top-1.5 left-1/2 z-20 max-w-[calc(100%+10px)] -translate-x-1/2 truncate rounded-full bg-white/95 px-1 py-px text-[8px] font-bold shadow-sm ring-1 ring-slate-200/80 dark:bg-bg-primary/90 dark:ring-border/45',
                        carry ? 'text-accent' : costNameClass(cost),
                      )}
                    >
                      {unit.name}
                    </div>
                    <div className="relative h-full w-full">
                      <div
                        className="absolute inset-0"
                        style={{ ...costFrameStyle(cost), clipPath: hexClipPath }}
                      />
                      <div
                        className={clsx(
                          'absolute inset-[3px] flex items-center justify-center overflow-hidden bg-white shadow-sm ring-1 ring-inset ring-white/80 dark:bg-bg-primary dark:ring-black/25',
                          carry && 'bg-accent/10 dark:bg-accent/10',
                        )}
                        style={{ clipPath: hexClipPath }}
                      >
                        <LineupAssetImage
                          imagePath={findChampionAsset(unit.name, championAssets)?.imagePath}
                          fallback={shortUnitName(unit.name)}
                          basePath={basePath}
                          className="scale-110"
                        />
                      </div>
                    </div>
                    {carry && (
                      <span className="absolute right-0 top-0 z-30 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-400 text-[9px] font-black leading-none text-slate-950 shadow-sm ring-1 ring-white/80">
                        C
                      </span>
                    )}
                    {(unit.items?.length ?? 0) > 0 && (
                      <div className="absolute -bottom-1 left-1/2 z-30 flex -translate-x-1/2 gap-0.5 rounded bg-white/90 px-0.5 py-px shadow-sm ring-1 ring-slate-200/80 backdrop-blur-sm dark:bg-bg-secondary/85 dark:ring-border/45">
                        {unit.items?.slice(0, 3).map((item, itemIndex) => (
                          <span
                            key={`${item}-${itemIndex}`}
                            className="flex h-4 w-4 items-center justify-center overflow-hidden rounded bg-white p-[1px] text-[6px] text-text-muted shadow-sm ring-1 ring-slate-200/80 dark:bg-bg-primary dark:ring-border/55"
                            title={item}
                          >
                            <LineupAssetImage
                              imagePath={findItemAsset(item, itemAssets)?.imagePath}
                              fallback={item.slice(0, 1)}
                              basePath={basePath}
                            />
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center overflow-hidden border border-dashed border-slate-300/70 bg-slate-100/75 text-transparent ring-1 ring-inset ring-slate-200/80 dark:border-border/35 dark:bg-bg-tertiary/25 dark:ring-border/25"
                    style={{ clipPath: hexClipPath }}
                  >
                    +
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {units.length > 0 ? (
        <LineupVisualUnitRow
          title={t('goldenSpatula.lineups.filterUnits')}
          units={units}
          variant={variant}
          championAssets={championAssets}
          itemAssets={itemAssets}
          basePath={basePath}
          empty={t('goldenSpatula.lineups.noData')}
          compact
          showCarryBadge
        />
      ) : (
        <div className="rounded-md bg-bg-tertiary p-2 text-xs text-text-muted">
          {t('goldenSpatula.lineups.noBoardUnits')}
        </div>
      )}
    </div>
  );
}

function LineupVisualSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-border/35 pt-1.5 first:border-t-0 first:pt-0">
      <div className="mb-1.5 inline-flex rounded-full bg-bg-secondary px-2 py-px text-[10px] font-black uppercase tracking-wide text-text-secondary ring-1 ring-inset ring-border/35">
        {title}
      </div>
      {children}
    </section>
  );
}

function LineupVisualItemCard({
  item,
  itemAssets,
  basePath,
  compact = false,
}: {
  item: string;
  itemAssets: GoldenSpatulaItemAssetIndex | undefined;
  basePath: string;
  compact?: boolean;
}) {
  const sizeClass = compact ? 'h-7 w-7 text-[7px]' : 'h-9 w-9 text-[8px]';
  return (
    <div className={clsx('min-w-0 text-center', compact ? 'w-8' : 'w-10')} title={item}>
      <div
        className={clsx(
          'mx-auto flex items-center justify-center overflow-hidden rounded-lg bg-bg-primary shadow-sm ring-1 ring-border/55',
          sizeClass,
        )}
      >
        <LineupAssetImage
          imagePath={findItemAsset(item, itemAssets)?.imagePath}
          fallback={item.slice(0, 1)}
          basePath={basePath}
        />
      </div>
      {!compact && (
        <div className="mt-1 truncate text-[9px] font-semibold text-text-secondary">{item}</div>
      )}
    </div>
  );
}

function LineupVisualUnitCard({
  unit,
  variant,
  championAssets,
  itemAssets,
  basePath,
  compact = false,
  showItems = false,
  showCarryBadge = false,
}: {
  unit: GoldenSpatulaLineupUnit;
  variant: GoldenSpatulaLineupVariant;
  championAssets: GoldenSpatulaChampionAssetIndex | undefined;
  itemAssets: GoldenSpatulaItemAssetIndex | undefined;
  basePath: string;
  compact?: boolean;
  showItems?: boolean;
  showCarryBadge?: boolean;
}) {
  const asset = findChampionAsset(unit.name, championAssets);
  const carry = showCarryBadge && isMainCarryUnit(unit, variant);
  const items = showItems ? (unit.items?.slice(0, 3) ?? []) : [];
  const tileClass = compact ? 'h-10 w-10 text-[9px]' : 'h-11 w-11 text-[10px]';

  return (
    <div
      className={clsx('min-w-0 text-center', compact ? 'w-12' : 'w-[52px]')}
      title={unitLabel(unit)}
    >
      <div
        className={clsx(
          'relative mx-auto flex items-center justify-center rounded-lg p-[2px] shadow-sm',
          tileClass,
        )}
        style={costFrameStyle(asset?.cost)}
      >
        <div className="h-full w-full overflow-hidden rounded-md bg-bg-primary">
          <LineupAssetImage
            imagePath={asset?.imagePath}
            fallback={shortUnitName(unit.name)}
            basePath={basePath}
            className="scale-105"
          />
        </div>
        {carry && (
          <span className="absolute right-0 top-0 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-400 text-[9px] font-bold leading-none text-slate-950 ring-1 ring-white/80">
            C
          </span>
        )}
      </div>
      <div
        className={clsx(
          'mt-1 truncate font-bold leading-none text-text-secondary',
          compact ? 'text-[10px]' : 'text-[11px]',
        )}
      >
        {unit.name}
      </div>
      {items.length > 0 && (
        <div className="mt-1 flex min-h-4 justify-center gap-0.5">
          {items.map((item, index) => (
            <span
              key={`${item}-${index}`}
              className="flex h-4 w-4 items-center justify-center overflow-hidden rounded bg-bg-primary p-[1px] text-[6px] text-text-muted ring-1 ring-border/60"
              title={item}
            >
              <LineupAssetImage
                imagePath={findItemAsset(item, itemAssets)?.imagePath}
                fallback={item.slice(0, 1)}
                basePath={basePath}
              />
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function LineupVisualUnitRow({
  title,
  units,
  variant,
  championAssets,
  itemAssets,
  basePath,
  empty,
  compact = false,
  showItems = false,
  showCarryBadge = false,
}: {
  title: string;
  units: GoldenSpatulaLineupUnit[];
  variant: GoldenSpatulaLineupVariant;
  championAssets: GoldenSpatulaChampionAssetIndex | undefined;
  itemAssets: GoldenSpatulaItemAssetIndex | undefined;
  basePath: string;
  empty: string;
  compact?: boolean;
  showItems?: boolean;
  showCarryBadge?: boolean;
}) {
  const visibleUnits = units.filter(isGoldenSpatulaDisplayableUnit);

  return (
    <LineupVisualSection title={title}>
      {visibleUnits.length > 0 ? (
        <div className={clsx('flex flex-wrap', compact ? 'gap-x-2 gap-y-2' : 'gap-x-3 gap-y-2.5')}>
          {visibleUnits.map((unit, index) => (
            <LineupVisualUnitCard
              key={`${unit.name}-${unit.location ?? index}`}
              unit={unit}
              variant={variant}
              championAssets={championAssets}
              itemAssets={itemAssets}
              basePath={basePath}
              compact={compact}
              showItems={showItems}
              showCarryBadge={showCarryBadge}
            />
          ))}
        </div>
      ) : (
        <div className="mt-1 text-[11px] text-text-muted">{empty}</div>
      )}
    </LineupVisualSection>
  );
}

function LineupVisualItemRow({
  title,
  items,
  itemAssets,
  basePath,
  empty,
}: {
  title: string;
  items: string[];
  itemAssets: GoldenSpatulaItemAssetIndex | undefined;
  basePath: string;
  empty: string;
}) {
  return (
    <LineupVisualSection title={title}>
      {items.length > 0 ? (
        <div className="flex flex-wrap gap-x-3 gap-y-2">
          {items.map((item, index) => (
            <LineupVisualItemCard
              key={`${item}-${index}`}
              item={item}
              itemAssets={itemAssets}
              basePath={basePath}
            />
          ))}
        </div>
      ) : (
        <div className="mt-1 text-[11px] text-text-muted">{empty}</div>
      )}
    </LineupVisualSection>
  );
}

function LineupNotesSection({ variant, t }: { variant: GoldenSpatulaLineupVariant; t: TFunction }) {
  const notes = [
    variant.notes?.early && {
      key: 'early',
      title: t('goldenSpatula.lineups.noteEarly'),
      body: variant.notes.early,
    },
    variant.notes?.economy && {
      key: 'economy',
      title: t('goldenSpatula.lineups.noteEconomy'),
      body: variant.notes.economy,
    },
    variant.notes?.positioning && {
      key: 'positioning',
      title: t('goldenSpatula.lineups.notePositioning'),
      body: variant.notes.positioning,
    },
    variant.notes?.matchup && {
      key: 'matchup',
      title: t('goldenSpatula.lineups.noteMatchup'),
      body: variant.notes.matchup,
    },
  ].filter((item): item is { key: string; title: string; body: string } => Boolean(item));

  if (!variant.traitsSummary && notes.length === 0) return null;

  return (
    <div className="space-y-2 border-t border-border/60 pt-2">
      {variant.traitsSummary && (
        <div className="rounded-md bg-bg-tertiary px-2 py-1.5 text-xs leading-relaxed text-text-secondary">
          {variant.traitsSummary}
        </div>
      )}
      {notes.map((note) => (
        <div key={note.key}>
          <div className="text-xs font-semibold text-text-primary">{note.title}</div>
          <div className="mt-1 text-xs leading-relaxed text-text-secondary">{note.body}</div>
        </div>
      ))}
    </div>
  );
}

function LineupVisualDetails({
  variant,
  championAssets,
  itemAssets,
  basePath,
  t,
}: {
  variant: GoldenSpatulaLineupVariant;
  championAssets: GoldenSpatulaChampionAssetIndex | undefined;
  itemAssets: GoldenSpatulaItemAssetIndex | undefined;
  basePath: string;
  t: TFunction;
}) {
  return (
    <div className="space-y-3">
      <LineupVisualUnitRow
        title={t('goldenSpatula.lineups.filterUnits')}
        units={collectLineupUnits(variant)}
        variant={variant}
        championAssets={championAssets}
        itemAssets={itemAssets}
        basePath={basePath}
        empty={t('goldenSpatula.lineups.noData')}
        compact
        showCarryBadge
      />
      <LineupVisualUnitRow
        title={t('goldenSpatula.lineups.mainCarries')}
        units={variant.mainCarries}
        variant={variant}
        championAssets={championAssets}
        itemAssets={itemAssets}
        basePath={basePath}
        empty={t('goldenSpatula.lineups.noData')}
        showItems
        showCarryBadge
      />
      <LineupVisualUnitRow
        title={t('goldenSpatula.lineups.frontliners')}
        units={variant.frontliners}
        variant={variant}
        championAssets={championAssets}
        itemAssets={itemAssets}
        basePath={basePath}
        empty={t('goldenSpatula.lineups.noData')}
        compact
      />
      <LineupVisualUnitRow
        title={t('goldenSpatula.lineups.units')}
        units={variant.units}
        variant={variant}
        championAssets={championAssets}
        itemAssets={itemAssets}
        basePath={basePath}
        empty={t('goldenSpatula.lineups.noData')}
        compact
        showItems
        showCarryBadge
      />
      <LineupVisualItemRow
        title={t('goldenSpatula.lineups.equipmentOrder')}
        items={variant.equipmentOrder ?? []}
        itemAssets={itemAssets}
        basePath={basePath}
        empty={t('goldenSpatula.lineups.noData')}
      />
      <LineupNotesSection variant={variant} t={t} />
    </div>
  );
}

export function GoldenSpatulaAssistantPanel() {
  const { t } = useTranslation();
  const {
    projectInterface,
    basePath,
    activeInstanceId,
    instances,
    selectedResource,
    instanceConnectionStatus,
    instanceResourceLoaded,
    instanceScreenshotStreaming,
    goldenSpatulaLineupManager,
    setGoldenSpatulaLineupManager,
    addTaskToInstance,
    setSelectedResource,
    setInstanceResourceLoaded,
    toggleTaskEnabled,
    updateInstance,
    setInstanceTaskStatus,
    registerTaskIdName,
    addLog,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<AssistantTab>('lineups');
  const [assistantData, setAssistantData] = useState<GoldenSpatulaAssistantData | null>(null);
  const [recommendedData, setRecommendedData] =
    useState<GoldenSpatulaRecommendedLineupsData | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [recommendedLoading, setRecommendedLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [recommendedError, setRecommendedError] = useState<string | null>(null);
  const [recognitionSummaries, setRecognitionSummaries] = useState<
    GoldenSpatulaRecognitionSummary[]
  >([]);
  const [hasCachedScreenshot, setHasCachedScreenshot] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [lineupSearch, setLineupSearch] = useState('');
  const [recommendedSearch, setRecommendedSearch] = useState('');
  const [recommendedPickerOpen, setRecommendedPickerOpen] = useState(false);
  const [importPanelOpen, setImportPanelOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [autoDecisionInterestTarget, setAutoDecisionInterestTarget] = useState<AutoRollCount>(5);
  const [autoDecisionMode, setAutoDecisionMode] = useState<AutoDecisionMode>('off');
  const [economyOcrSubmitting, setEconomyOcrSubmitting] = useState(false);
  const [economyOcrPolling, setEconomyOcrPolling] = useState(false);
  const [augmentOcrSubmitting, setAugmentOcrSubmitting] = useState(false);
  const [augmentOcrPolling, setAugmentOcrPolling] = useState(false);
  const [augmentPickSubmitting, setAugmentPickSubmitting] = useState(false);
  const [calibrationSelectedAugmentProbeSubmitting, setCalibrationSelectedAugmentProbeSubmitting] =
    useState(false);
  const [selectedAugmentProbeBatchProgress, setSelectedAugmentProbeBatchProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [selectedAugmentProbeReliability, setSelectedAugmentProbeReliability] =
    useState<SelectedAugmentProbeReliabilitySnapshot>(() =>
      createEmptySelectedAugmentProbeReliability(),
    );
  const [selectedAugmentProbeTraceEntries, setSelectedAugmentProbeTraceEntries] = useState<
    SelectedAugmentProbeTraceEntry[]
  >([]);
  const [augmentPresence, setAugmentPresence] = useState<GoldenSpatulaAugmentPresenceResult>({
    visible: false,
    confidence: 0,
    slots: [],
  });
  const [autoDecisionSubmitting, setAutoDecisionSubmitting] = useState(false);
  const [, setRollRunState] = useState<GoldenSpatulaRollRunState>(() => createEmptyRollRunState());
  const [, setXpRunState] = useState<GoldenSpatulaXpRunState>(() => createEmptyXpRunState());
  const [handRunState, setHandRunState] = useState<GoldenSpatulaHandRunState>(() =>
    createEmptyHandRunState(),
  );
  const [economyRunState, setEconomyRunState] = useState<GoldenSpatulaEconomyRunState>(() =>
    createEmptyEconomyRunState(),
  );
  const [augmentScanState, setAugmentScanState] = useState<GoldenSpatulaAugmentScanState>(() =>
    createEmptyAugmentScanState(),
  );
  const [knowledgeScanState, setKnowledgeScanState] = useState<GoldenSpatulaKnowledgeScanState>(
    () => createEmptyKnowledgeScanState(),
  );
  const economyStabilizerRef = useRef(createGoldenSpatulaEconomyStabilizerState());
  const augmentPresenceCheckingRef = useRef(false);
  const augmentPresenceLastCheckAtRef = useRef(0);
  const selectedAugmentVisionLastRunAtRef = useRef(0);
  const selectedAugmentVisionRunningRef = useRef(false);
  const selectedAugmentVisionRunSeqRef = useRef(0);
  const selectedAugmentVisionBackoffUntilRef = useRef(0);
  const selectedAugmentVisionNoPresenceStreakRef = useRef(0);
  const selectedAugmentVisionMissStreakRef = useRef(0);
  const selectedAugmentVisionLastImageFingerprintRef = useRef('');
  const selectedAugmentVisionLastImageAtRef = useRef(0);
  const selectedAugmentActiveProbeRunningRef = useRef(false);
  const selectedAugmentActiveProbeLastRunAtRef = useRef(0);
  const selectedAugmentProbeReliabilityRef = useRef<SelectedAugmentProbeReliabilitySnapshot>(
    createEmptySelectedAugmentProbeReliability(),
  );
  const selectedAugmentProbeCandidateStatsRef = useRef<
    Map<string, SelectedAugmentProbeCandidateStats>
  >(new Map());
  const selectedAugmentProbeTraceEntriesRef = useRef<SelectedAugmentProbeTraceEntry[]>([]);
  const augmentChoiceVisibleLastSeenAtRef = useRef(0);
  const specialEventLogStateRef = useRef<
    Partial<
      Record<
        GoldenSpatulaSpecialEventType,
        {
          visible: boolean;
          lastSeenAt: number;
          lastLoggedAt: number;
        }
      >
    >
  >({});
  const autoDecisionTimerRef = useRef<number | null>(null);
  const autoDecisionFirstDelayRef = useRef(true);

  const isGoldenSpatula = projectInterface?.name === GOLDEN_SPATULA_PROJECT;
  const activeInstance = instances.find((item) => item.id === activeInstanceId);
  const currentResourceName =
    (activeInstanceId && selectedResource[activeInstanceId]) ||
    activeInstance?.resourceName ||
    projectInterface?.resource?.[0]?.name;
  const usingKnowledgeResource = currentResourceName === KNOWLEDGE_RESOURCE;
  const connectionStatus = activeInstanceId
    ? instanceConnectionStatus[activeInstanceId]
    : 'Disconnected';
  const resourceLoaded = activeInstanceId
    ? Boolean(instanceResourceLoaded[activeInstanceId])
    : false;
  const autoDecisionResourceReady = resourceLoaded;
  const screenshotStreaming = activeInstanceId
    ? Boolean(instanceScreenshotStreaming[activeInstanceId])
    : false;
  const knowledgeTasksEnabled =
    activeInstance?.selectedTasks.filter(
      (task) => task.enabled && knowledgeTaskNames.has(task.taskName),
    ).length ?? 0;

  useEffect(() => {
    economyStabilizerRef.current = createGoldenSpatulaEconomyStabilizerState();
    setKnowledgeScanState(createEmptyKnowledgeScanState());
    setAugmentScanState(createEmptyAugmentScanState());
    setAugmentPresence({ visible: false, confidence: 0, slots: [] });
    setAugmentOcrPolling(false);
    augmentPresenceLastCheckAtRef.current = 0;
    selectedAugmentVisionLastRunAtRef.current = 0;
    selectedAugmentVisionRunSeqRef.current += 1;
    selectedAugmentVisionRunningRef.current = false;
    selectedAugmentVisionBackoffUntilRef.current = 0;
    selectedAugmentVisionNoPresenceStreakRef.current = 0;
    selectedAugmentVisionMissStreakRef.current = 0;
    selectedAugmentVisionLastImageFingerprintRef.current = '';
    selectedAugmentVisionLastImageAtRef.current = 0;
    selectedAugmentActiveProbeRunningRef.current = false;
    selectedAugmentActiveProbeLastRunAtRef.current = 0;
    selectedAugmentProbeReliabilityRef.current = createEmptySelectedAugmentProbeReliability();
    selectedAugmentProbeCandidateStatsRef.current = new Map();
    selectedAugmentProbeTraceEntriesRef.current = [];
    setSelectedAugmentProbeReliability(createEmptySelectedAugmentProbeReliability());
    setSelectedAugmentProbeTraceEntries([]);
    setSelectedAugmentProbeBatchProgress(null);
    specialEventLogStateRef.current = {};
  }, [activeInstanceId, currentResourceName]);

  function publishSpecialEventLogs(events: GoldenSpatulaSpecialEventDetection[]) {
    const timestamp = Date.now();
    const visibleTypes = new Set(events.map((event) => event.type));

    if (activeInstanceId) {
      for (const event of events) {
        const previous = specialEventLogStateRef.current[event.type];
        const shouldLog = !previous?.visible;

        specialEventLogStateRef.current[event.type] = {
          visible: true,
          lastSeenAt: timestamp,
          lastLoggedAt: shouldLog ? timestamp : (previous?.lastLoggedAt ?? 0),
        };

        if (shouldLog) {
          addLog(activeInstanceId, {
            type: event.type === 'settlement' ? 'success' : 'warning',
            message: t(`goldenSpatula.lineups.specialEventLog.${event.type}`, {
              confidence: Math.max(0, Math.min(100, Math.round(event.confidence * 100))),
            }),
          });
        }
      }
    }

    for (const type of Object.keys(
      specialEventLogStateRef.current,
    ) as GoldenSpatulaSpecialEventType[]) {
      if (!visibleTypes.has(type)) {
        const previous = specialEventLogStateRef.current[type];
        if (previous && timestamp - previous.lastSeenAt >= specialEventMissingGraceMs) {
          specialEventLogStateRef.current[type] = {
            ...previous,
            visible: false,
          };
        }
      }
    }
  }

  async function detectAndPublishSpecialEvents(cachedImage: string) {
    if (!cachedImage.startsWith('data:image/')) {
      publishSpecialEventLogs([]);
      return;
    }

    try {
      const specialEventResult = await detectGoldenSpatulaSpecialEventsFromDataUrl(cachedImage);
      publishSpecialEventLogs(specialEventResult.events);
    } catch (error) {
      console.warn('Golden Spatula special event detection failed:', error);
      publishSpecialEventLogs([]);
    }
  }

  useEffect(() => {
    if (!isGoldenSpatula) return;

    let cancelled = false;
    setDataLoading(true);
    setDataError(null);

    loadGoldenSpatulaAssistantData(basePath)
      .then((data) => {
        if (!cancelled) {
          setAssistantData(data);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setDataError(error instanceof Error ? error.message : String(error));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setDataLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [basePath, isGoldenSpatula]);

  useEffect(() => {
    if (!isGoldenSpatula) return;

    let cancelled = false;
    setRecommendedLoading(true);
    setRecommendedError(null);

    loadGoldenSpatulaRecommendedLineups(basePath)
      .then((data) => {
        if (!cancelled) {
          setRecommendedData(data);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setRecommendedError(error instanceof Error ? error.message : String(error));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setRecommendedLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [basePath, isGoldenSpatula]);

  useEffect(() => {
    if (!isGoldenSpatula) return;

    let cancelled = false;
    let unlistenCallback: (() => void) | null = null;

    maaService
      .onCallback((message, details) => {
        if (cancelled) return;
        if (useAppStore.getState().projectInterface?.name !== GOLDEN_SPATULA_PROJECT) return;
        const callbackDetails = details as MaaCallbackDetails & Record<string, unknown>;

        const rollEvent = buildRollEvent(message, callbackDetails, t);
        if (rollEvent) {
          setRollRunState((previous) => mergeRollEvent(previous, rollEvent));
          setKnowledgeScanState((previous) => mergeShopSlotsFromRollEvent(previous, rollEvent));
          const handEvent = buildHandEventFromRollEvent(rollEvent, t);
          if (handEvent) {
            setHandRunState((previous) => mergeHandEvent(previous, handEvent));
          }
          const economyEvent = buildEconomyEventFromRollEvent(rollEvent, t);
          if (economyEvent) {
            setEconomyRunState((previous) => mergeEconomyEvent(previous, economyEvent));
          }
          return;
        }

        const xpEvent = buildXpEvent(message, callbackDetails, t);
        if (xpEvent) {
          setXpRunState((previous) => mergeXpEvent(previous, xpEvent));
          const economyEvent = buildEconomyEventFromXpEvent(xpEvent, t);
          if (economyEvent) {
            setEconomyRunState((previous) => mergeEconomyEvent(previous, economyEvent));
          }
          return;
        }

        const handEvent = buildHandEvent(message, callbackDetails, t);
        if (handEvent) {
          setHandRunState((previous) => mergeHandEvent(previous, handEvent));
          return;
        }

        const economyEvent = buildEconomyEvent(message, callbackDetails, t);
        if (economyEvent) {
          setEconomyRunState((previous) => mergeEconomyEvent(previous, economyEvent));
          return;
        }

        const augmentEvent = buildAugmentScanEvent(message, callbackDetails, t);
        if (augmentEvent) {
          setAugmentScanState((previous) => mergeAugmentScanEvent(previous, augmentEvent));
        }

        const knowledgeEvent = buildKnowledgeEvent(message, callbackDetails, t);
        if (knowledgeEvent) {
          setKnowledgeScanState((previous) => mergeKnowledgeEvent(previous, knowledgeEvent));
        }

        const summary = buildRecognitionSummary(message, callbackDetails, t);
        if (!summary) return;

        setRecognitionSummaries((previous) =>
          [summary, ...previous.filter((item) => item.id !== summary.id)].slice(
            0,
            MAX_RECOGNITION_SUMMARIES,
          ),
        );
      })
      .then((unlisten) => {
        if (cancelled) {
          unlisten();
        } else {
          unlistenCallback = unlisten;
        }
      })
      .catch(() => {
        // The main callback logger already reports listener setup failures.
      });

    return () => {
      cancelled = true;
      unlistenCallback?.();
    };
  }, [isGoldenSpatula, t]);

  useEffect(() => {
    if (!isGoldenSpatula || !activeInstanceId || connectionStatus !== 'Connected') {
      setHasCachedScreenshot(false);
      return;
    }

    let cancelled = false;
    maaService
      .getCachedImage(activeInstanceId)
      .then((image) => {
        if (!cancelled) setHasCachedScreenshot(Boolean(image));
      })
      .catch(() => {
        if (!cancelled) setHasCachedScreenshot(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeInstanceId, connectionStatus, isGoldenSpatula, screenshotStreaming]);

  useEffect(() => {
    const augmentAssets = assistantData?.augmentAssets.data;
    if (!isGoldenSpatula || !augmentAssets || !basePath) return;

    let cancelled = false;
    preloadGoldenSpatulaAugmentChoiceVisionTemplates({ augmentAssets, basePath })
      .then((metrics) => {
        if (!cancelled && metrics.templateLoadMs > 100) {
          console.info('Golden Spatula augment choice templates preloaded:', metrics);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.warn('Failed to preload Golden Spatula augment choice templates:', error);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [assistantData?.augmentAssets.data, basePath, isGoldenSpatula]);

  const tabs = useMemo(
    () => [
      { id: 'lineups' as const, label: t('goldenSpatula.tabs.lineups'), icon: BookOpen },
      { id: 'strategy' as const, label: t('goldenSpatula.tabs.strategy'), icon: Route },
      { id: 'recognition' as const, label: t('goldenSpatula.tabs.recognition'), icon: Crosshair },
      { id: 'calibration' as const, label: t('goldenSpatula.tabs.calibration'), icon: Wrench },
    ],
    [t],
  );

  const strategy = assistantData?.strategy.data!;
  const season = assistantData?.season.data!;
  const latestRecognition = recognitionSummaries[0];
  const hasScreenshot = hasCachedScreenshot || screenshotStreaming;
  const variantNames = useMemo<Record<GoldenSpatulaVariantSlot, string>>(
    () => ({
      A: t('goldenSpatula.lineups.variantA'),
      B: t('goldenSpatula.lineups.variantB'),
      C: t('goldenSpatula.lineups.variantC'),
    }),
    [t],
  );
  const managedLineups = goldenSpatulaLineupManager.lineups;
  const activeLineup = managedLineups.find(
    (lineup) => lineup.id === goldenSpatulaLineupManager.activeLineupId,
  );
  const activeVariant =
    activeLineup?.variants.find(
      (variant) => variant.id === goldenSpatulaLineupManager.activeVariantId,
    ) ?? activeLineup?.variants[0];
  useEffect(() => {
    if (!isGoldenSpatula || managedLineups.length === 0 || !recommendedData?.lineups.length) {
      return;
    }

    const recommendedById = new Map<string, GoldenSpatulaRecommendedLineup>();
    for (const recommended of recommendedData.lineups) {
      recommendedById.set(recommended.id, recommended);
      recommendedById.set(recommended.slug, recommended);
    }

    let changed = false;
    const hydratedLineups = managedLineups.map((lineup) => {
      const sourceId = lineup.source?.kind === 'recommended' ? lineup.source.sourceId : undefined;
      const recommended = sourceId ? recommendedById.get(sourceId) : undefined;
      if (!recommended) return lineup;

      const hydrated = hydrateRecommendedManagedLineupItems(lineup, recommended);
      if (hydrated !== lineup) changed = true;
      return hydrated;
    });

    if (!changed) return;

    setGoldenSpatulaLineupManager({
      lineups: hydratedLineups,
      activeLineupId: goldenSpatulaLineupManager.activeLineupId,
      activeVariantId: goldenSpatulaLineupManager.activeVariantId,
    });
  }, [
    goldenSpatulaLineupManager.activeLineupId,
    goldenSpatulaLineupManager.activeVariantId,
    isGoldenSpatula,
    managedLineups,
    recommendedData?.lineups,
    setGoldenSpatulaLineupManager,
  ]);
  const visibleActiveVariants = useMemo(
    () => (activeLineup ? getVisibleVariants(activeLineup, activeVariant?.id) : []),
    [activeLineup, activeVariant?.id],
  );
  const decisionPlan = useMemo(
    () =>
      activeVariant
        ? buildGoldenSpatulaDecisionPlan({
            activeVariant,
            managedLineups,
            recommendedLineups: recommendedData?.lineups,
            championAssets: assistantData?.championAssets.data,
            itemAssets: assistantData?.itemAssets.data,
            handState: handRunState,
            economyState: economyRunState,
            knowledgeState: knowledgeScanState,
          })
        : undefined,
    [
      activeVariant,
      assistantData?.championAssets.data,
      assistantData?.itemAssets.data,
      economyRunState,
      handRunState,
      knowledgeScanState,
      managedLineups,
      recommendedData?.lineups,
    ],
  );
  const augmentDecision = useMemo(
    () =>
      buildGoldenSpatulaAugmentDecision({
        choices: Object.values(augmentScanState.choices),
        activeVariant,
        augmentAssets: assistantData?.augmentAssets.data,
      }),
    [activeVariant, assistantData?.augmentAssets.data, augmentScanState.choices],
  );
  const shopOddsSummary = formatShopOddsSummary(economyRunState.shopOdds, t);
  const autoDecisionReserveGold = autoDecisionInterestTarget * 10;
  const autoDecisionActionCost = getAutoDecisionActionCost(autoDecisionMode);
  const autoDecisionGold = economyRunState.gold;
  const autoDecisionAvailableGold =
    autoDecisionGold !== undefined ? autoDecisionGold - autoDecisionReserveGold : undefined;
  const autoDecisionRequiredGold =
    autoDecisionActionCost !== undefined
      ? autoDecisionReserveGold + autoDecisionActionCost
      : autoDecisionReserveGold;
  const autoDecisionCanSpend =
    autoDecisionMode !== 'off' &&
    autoDecisionActionCost !== undefined &&
    autoDecisionAvailableGold !== undefined &&
    autoDecisionAvailableGold >= autoDecisionActionCost;
  const savedRecommendedIds = useMemo(
    () =>
      new Set(
        managedLineups
          .map((lineup) => lineup.source?.sourceId)
          .filter((sourceId): sourceId is string => Boolean(sourceId)),
      ),
    [managedLineups],
  );
  const filteredLineups = useMemo(() => {
    const query = normalizeSearchText(lineupSearch);
    if (!query) return managedLineups;
    return managedLineups.filter((lineup) =>
      [lineup.name, lineup.source?.version, ...(lineup.tags ?? [])]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase()
        .includes(query),
    );
  }, [lineupSearch, managedLineups]);
  const filteredRecommendedLineups = useMemo(() => {
    const query = normalizeSearchText(recommendedSearch);
    const lineups = recommendedData?.lineups ?? [];
    if (!query) return lineups;
    return lineups.filter((lineup) =>
      [lineup.name, lineup.quality, lineup.version, lineup.season]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase()
        .includes(query),
    );
  }, [recommendedData?.lineups, recommendedSearch]);
  const taskConfigDisabledReason = !activeInstanceId
    ? t('goldenSpatula.lineups.noActiveInstance')
    : !projectInterface?.resource?.some((resource) => resource.name === KNOWLEDGE_RESOURCE)
      ? t('goldenSpatula.lineups.knowledgeResourceMissing')
      : !activeLineup
        ? t('goldenSpatula.lineups.noActiveLineup')
        : undefined;
  const autoDecisionRollSetupDisabledReason = !activeInstanceId
    ? t('goldenSpatula.lineups.noActiveInstance')
    : connectionStatus !== 'Connected'
      ? t('goldenSpatula.lineups.deviceNotConnected')
      : !autoDecisionResourceReady
        ? t('goldenSpatula.lineups.autoBuyNeedsLoadedResource')
        : !autoRollTaskByCount[1] ||
            !projectInterface?.task.some((task) => task.name === autoRollTaskByCount[1])
          ? t('goldenSpatula.lineups.autoRollTaskMissing')
          : undefined;
  const autoDecisionLevelSetupDisabledReason = !activeInstanceId
    ? t('goldenSpatula.lineups.noActiveInstance')
    : connectionStatus !== 'Connected'
      ? t('goldenSpatula.lineups.deviceNotConnected')
      : !autoDecisionResourceReady
        ? t('goldenSpatula.lineups.autoBuyNeedsLoadedResource')
        : !autoBuyExperienceTaskByCount[1] ||
            !projectInterface?.task.some((task) => task.name === autoBuyExperienceTaskByCount[1])
          ? t('goldenSpatula.lineups.autoBuyExperienceTaskMissing')
          : undefined;
  const decisionAutoCaptureSetupDisabledReason = !activeInstanceId
    ? t('goldenSpatula.lineups.noActiveInstance')
    : connectionStatus !== 'Connected'
      ? t('goldenSpatula.lineups.deviceNotConnected')
      : !autoDecisionResourceReady
        ? t('goldenSpatula.lineups.autoBuyNeedsLoadedResource')
        : !activeLineup || !activeVariant
          ? t('goldenSpatula.lineups.noActiveLineup')
          : activeInstance?.isRunning || autoDecisionSubmitting
            ? t('goldenSpatula.lineups.taskRunning')
            : undefined;
  const autoDecisionSetupDisabledReason =
    autoDecisionMode === 'roll'
      ? autoDecisionRollSetupDisabledReason
      : autoDecisionMode === 'level'
        ? autoDecisionLevelSetupDisabledReason
        : undefined;
  const autoDecisionBlockedReason =
    autoDecisionSetupDisabledReason ??
    (autoDecisionMode !== 'off' && (activeInstance?.isRunning || autoDecisionSubmitting)
      ? t('goldenSpatula.lineups.taskRunning')
      : undefined);
  const economyOcrDisabledReason = !activeInstanceId
    ? t('goldenSpatula.lineups.noActiveInstance')
    : connectionStatus !== 'Connected'
      ? t('goldenSpatula.lineups.deviceNotConnected')
      : economyOcrSubmitting
        ? t('goldenSpatula.lineups.taskRunning')
        : undefined;
  const augmentOcrDisabledReason = !activeInstanceId
    ? t('goldenSpatula.lineups.noActiveInstance')
    : !augmentOcrExperimentalEnabled
      ? t('goldenSpatula.lineups.augmentOcrExperimentalDisabled')
      : connectionStatus !== 'Connected'
        ? t('goldenSpatula.lineups.deviceNotConnected')
        : augmentOcrSubmitting
          ? t('goldenSpatula.lineups.taskRunning')
          : !activeLineup || !activeVariant
            ? t('goldenSpatula.lineups.noActiveLineup')
            : !usingKnowledgeResource
              ? t('goldenSpatula.lineups.autoBuyNeedsKnowledgeResource')
              : undefined;
  const augmentPickDisabledReason = !activeInstanceId
    ? t('goldenSpatula.lineups.noActiveInstance')
    : !augmentOcrExperimentalEnabled
      ? t('goldenSpatula.lineups.augmentOcrExperimentalDisabled')
      : connectionStatus !== 'Connected'
        ? t('goldenSpatula.lineups.deviceNotConnected')
        : augmentPickSubmitting || augmentScanState.active
          ? t('goldenSpatula.lineups.taskRunning')
          : !activeLineup || !activeVariant
            ? t('goldenSpatula.lineups.noActiveLineup')
            : !projectInterface?.task.some((task) => task.name === autoPickAugmentEntry)
              ? t('goldenSpatula.lineups.augmentPickTaskMissing')
              : !usingKnowledgeResource
                ? t('goldenSpatula.lineups.autoBuyNeedsKnowledgeResource')
                : !resourceLoaded
                  ? t('goldenSpatula.lineups.autoBuyNeedsLoadedResource')
                  : !augmentDecision.bestOption
                    ? t('goldenSpatula.lineups.augmentNeedsChoices')
                    : undefined;
  const calibrationSelectedAugmentProbeDisabledReason = !activeInstanceId
    ? t('goldenSpatula.lineups.noActiveInstance')
    : connectionStatus !== 'Connected'
      ? t('goldenSpatula.lineups.deviceNotConnected')
      : !resourceLoaded
        ? t('goldenSpatula.lineups.autoBuyNeedsLoadedResource')
        : !hasGoldenSpatulaAugmentVisionAssets(assistantData?.augmentAssets.data)
          ? t('goldenSpatula.calibration.selectedAugmentProbeNeedsTemplates')
          : activeInstance?.isRunning ||
              calibrationSelectedAugmentProbeSubmitting ||
              selectedAugmentActiveProbeRunningRef.current ||
              selectedAugmentVisionRunningRef.current ||
              augmentScanState.active ||
              augmentOcrSubmitting ||
              augmentPickSubmitting ||
              autoDecisionSubmitting ||
              handRunState.active
            ? t('goldenSpatula.lineups.taskRunning')
            : augmentPresence.visible ||
                isSelectedAugmentProbeBlockingSpecialEvent(specialEventLogStateRef.current)
              ? t('goldenSpatula.calibration.selectedAugmentProbeBlocked')
              : undefined;

  useEffect(() => {
    if (!isGoldenSpatula || managedLineups.length === 0 || activeLineup) return;
    const first = managedLineups[0];
    setGoldenSpatulaLineupManager({
      lineups: managedLineups,
      activeLineupId: first.id,
      activeVariantId: first.variants[0]?.id,
    });
  }, [activeLineup, isGoldenSpatula, managedLineups, setGoldenSpatulaLineupManager]);

  useEffect(() => {
    if (!economyOcrPolling) return;

    const interval = window.setInterval(() => {
      if (!economyOcrDisabledReason && !economyOcrSubmitting && !economyRunState.active) {
        void submitEconomyOcrTask(false);
      }
      const now = Date.now();
      if (
        !augmentOcrDisabledReason &&
        !augmentOcrSubmitting &&
        !augmentScanState.active &&
        now - augmentPresenceLastCheckAtRef.current >= augmentPresenceCheckIntervalMs
      ) {
        augmentPresenceLastCheckAtRef.current = now;
        void checkAugmentPresenceAndMaybeOcr(false);
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [
    activeInstanceId,
    augmentOcrDisabledReason,
    augmentOcrSubmitting,
    augmentScanState.active,
    economyOcrDisabledReason,
    economyOcrPolling,
    economyOcrSubmitting,
    economyRunState.active,
  ]);

  const healthItems = [
    {
      key: 'connection',
      label: t('goldenSpatula.calibration.connection'),
      ok: connectionStatus === 'Connected',
      value:
        connectionStatus === 'Connected'
          ? t('goldenSpatula.status.connected')
          : t('goldenSpatula.status.disconnected'),
    },
    {
      key: 'resourceLoaded',
      label: t('goldenSpatula.calibration.resourceLoaded'),
      ok: resourceLoaded,
      value: resourceLoaded ? t('common.success') : t('goldenSpatula.status.notReady'),
    },
    {
      key: 'knowledgeResource',
      label: t('goldenSpatula.calibration.knowledgeResource'),
      ok: usingKnowledgeResource,
      value: usingKnowledgeResource ? t('common.success') : t('goldenSpatula.status.notReady'),
    },
    {
      key: 'latestScreenshot',
      label: t('goldenSpatula.calibration.latestScreenshot'),
      ok: hasScreenshot,
      value: hasScreenshot ? t('common.success') : t('goldenSpatula.status.notReady'),
    },
    {
      key: 'knowledgeTasks',
      label: t('goldenSpatula.calibration.knowledgeTasks'),
      ok: knowledgeTasksEnabled > 0,
      value: t('goldenSpatula.calibration.tasksEnabled', {
        enabled: knowledgeTasksEnabled,
        total: knowledgeTaskNames.size,
      }),
    },
  ];

  const recommendations = [
    connectionStatus !== 'Connected' && t('goldenSpatula.calibration.connectDevice'),
    !resourceLoaded && t('goldenSpatula.calibration.loadResource'),
    !usingKnowledgeResource && t('goldenSpatula.calibration.switchKnowledge'),
    !hasScreenshot && t('goldenSpatula.calibration.captureScreenshot'),
    knowledgeTasksEnabled === 0 && t('goldenSpatula.calibration.enableRecognitionTask'),
  ].filter(Boolean) as string[];
  const selectedAugmentProbeRatePercent = Math.round(
    selectedAugmentProbeReliability.passRate * 100,
  );
  const selectedAugmentProbeTargetPercent = Math.round(
    selectedAugmentProbeReliability.targetRate * 100,
  );
  const selectedAugmentProbeReliabilityReady =
    selectedAugmentProbeReliability.total >= 5 &&
    selectedAugmentProbeReliability.passRate >= selectedAugmentProbeReliability.targetRate;
  const selectedAugmentProbeReliabilityTone =
    selectedAugmentProbeReliability.total === 0
      ? 'muted'
      : selectedAugmentProbeReliabilityReady
        ? 'success'
        : 'warning';
  const selectedAugmentProbeLastStageLabel = selectedAugmentProbeReliability.lastStage
    ? t(
        `goldenSpatula.calibration.selectedAugmentProbeStage.${selectedAugmentProbeReliability.lastStage}`,
      )
    : t('goldenSpatula.calibration.selectedAugmentProbeReliabilityEmpty');

  if (!isGoldenSpatula) {
    return null;
  }

  const copyLineupCode = (name: string, code: string) => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopiedCode(name);
    window.setTimeout(() => setCopiedCode((current) => (current === name ? null : current)), 1500);
  };

  const copyText = (text: string, successKey: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success(t(successKey)))
      .catch(() => toast.error(t('goldenSpatula.lineups.copyFailed')));
  };

  const selectedAugmentProbeStageLabel = (stage: SelectedAugmentProbeRunStage): string =>
    t(`goldenSpatula.calibration.selectedAugmentProbeStage.${stage}`);

  const formatSelectedAugmentProbeTraceTarget = (
    target: SelectedAugmentProbeTraceTarget | undefined,
  ): string => {
    if (!target) return '-';
    const parts = [
      target.source,
      `#${target.slotLabel}`,
      target.augmentName,
      target.score !== undefined ? target.score.toFixed(3) : undefined,
      target.screenTarget ? `@${target.screenTarget[0]},${target.screenTarget[1]}` : undefined,
    ].filter(Boolean);
    return parts.join(' ');
  };

  const formatSelectedAugmentProbeTraceDiagnostics = (
    entry: SelectedAugmentProbeTraceEntry,
  ): string => {
    const diagnostics = entry.detailDiagnostics;
    const match = entry.match;
    if (!diagnostics && !match) {
      return t('goldenSpatula.calibration.selectedAugmentProbeTraceDiagnosticsEmpty');
    }

    const kind =
      match?.matchKind === 'detailTitle'
        ? t('goldenSpatula.calibration.selectedAugmentProbeTraceDiagnosticsKindDetailTitle')
        : match?.matchKind === 'icon'
          ? t('goldenSpatula.calibration.selectedAugmentProbeTraceDiagnosticsKindIcon')
          : t('goldenSpatula.calibration.selectedAugmentProbeTraceDiagnosticsKindUnknown');
    const ownedPanel = diagnostics?.ownedPanelVisible
      ? t('goldenSpatula.calibration.selectedAugmentProbeTraceDiagnosticsVisible')
      : t('goldenSpatula.calibration.selectedAugmentProbeTraceDiagnosticsMissing');
    const sides =
      diagnostics && diagnostics.detailCardSides.length > 0
        ? diagnostics.detailCardSides.join('/')
        : t('goldenSpatula.calibration.selectedAugmentProbeTraceDiagnosticsNoSide');
    const source = [match?.matchSourceLabel, match?.matchSide].filter(Boolean).join('@') || '-';
    const margin = match?.matchMargin ?? diagnostics?.titleMatch?.margin;

    return t('goldenSpatula.calibration.selectedAugmentProbeTraceDiagnosticsValue', {
      kind,
      ownedPanel,
      sides,
      source,
      margin: margin !== undefined ? margin.toFixed(3) : '-',
    });
  };

  const copySelectedAugmentProbeTraceLog = () => {
    if (selectedAugmentProbeTraceEntries.length === 0) {
      toast.info(t('goldenSpatula.calibration.selectedAugmentProbeTraceEmpty'));
      return;
    }

    const payload = {
      createdAt: new Date().toISOString(),
      targetPassRate: selectedAugmentProbeReliabilityTargetRate,
      reliability: selectedAugmentProbeReliability,
      entries: selectedAugmentProbeTraceEntries,
    };
    copyText(
      JSON.stringify(payload, null, 2),
      'goldenSpatula.calibration.selectedAugmentProbeTraceCopied',
    );
  };

  const setLineupManager = (
    lineups: GoldenSpatulaManagedLineup[],
    activeLineupId?: string,
    activeVariantId?: string,
  ) => {
    setGoldenSpatulaLineupManager({
      lineups,
      activeLineupId,
      activeVariantId,
    });
  };

  const selectManagedLineup = (lineup: GoldenSpatulaManagedLineup) => {
    setLineupManager(managedLineups, lineup.id, lineup.variants[0]?.id);
  };

  const addManualLineup = () => {
    const lineup = createManualLineup(
      t('goldenSpatula.lineups.newLineupName', { index: managedLineups.length + 1 }),
      variantNames,
    );
    setLineupManager([lineup, ...managedLineups], lineup.id, lineup.variants[0]?.id);
  };

  const updateManagedLineup = (lineupId: string, patch: Partial<GoldenSpatulaManagedLineup>) => {
    const updated = managedLineups.map((lineup) =>
      lineup.id === lineupId ? { ...lineup, ...patch, updatedAt: Date.now() } : lineup,
    );
    setLineupManager(
      updated,
      goldenSpatulaLineupManager.activeLineupId,
      goldenSpatulaLineupManager.activeVariantId,
    );
  };

  const updateActiveVariant = (patch: Partial<GoldenSpatulaLineupVariant>) => {
    if (!activeLineup || !activeVariant) return;
    updateManagedLineup(activeLineup.id, {
      variants: activeLineup.variants.map((variant) =>
        variant.id === activeVariant.id ? { ...variant, ...patch } : variant,
      ),
    });
  };

  const duplicateManagedLineup = (lineup: GoldenSpatulaManagedLineup) => {
    const now = Date.now();
    const copy: GoldenSpatulaManagedLineup = {
      ...lineup,
      id: createClientId('lineup'),
      name: `${lineup.name}${t('common.copySuffix')}`,
      createdAt: now,
      updatedAt: now,
      variants: lineup.variants.map((variant) => ({
        ...variant,
        id: createClientId('variant'),
      })),
    };
    setLineupManager([copy, ...managedLineups], copy.id, copy.variants[0]?.id);
  };

  const removeManagedLineup = (lineupId: string) => {
    const next = managedLineups.filter((lineup) => lineup.id !== lineupId);
    const nextActive = next[0];
    setLineupManager(next, nextActive?.id, nextActive?.variants[0]?.id);
  };

  const applyRecommendedLineup = (recommended: GoldenSpatulaRecommendedLineup) => {
    const existing = managedLineups.find(
      (lineup) =>
        lineup.source?.kind === 'recommended' && lineup.source.sourceId === recommended.id,
    );
    if (existing) {
      selectManagedLineup(existing);
      toast.success(t('goldenSpatula.lineups.switchedSaved'));
      return;
    }

    const lineup = createManagedLineupFromRecommended(recommended, variantNames);
    setLineupManager([lineup, ...managedLineups], lineup.id, lineup.variants[0]?.id);
    toast.success(t('goldenSpatula.lineups.recommendedApplied'));
  };

  const applyRecommendedLineupAndClose = (recommended: GoldenSpatulaRecommendedLineup) => {
    applyRecommendedLineup(recommended);
    setRecommendedPickerOpen(false);
  };

  const importLineups = async () => {
    try {
      const content = importText.trim()
        ? importText
        : await navigator.clipboard.readText().catch(() => '');
      const result = parseGoldenSpatulaLineupImport(
        content,
        t('goldenSpatula.lineups.importedLineupName', { index: managedLineups.length + 1 }),
        variantNames,
      );

      if (result.lineups.length === 0) {
        toast.error(t('goldenSpatula.lineups.importEmpty'));
        return;
      }

      const existingIds = new Set(managedLineups.map((lineup) => lineup.id));
      const imported = result.lineups.map((lineup) =>
        existingIds.has(lineup.id)
          ? {
              ...lineup,
              id: createClientId('lineup'),
              variants: lineup.variants.map((variant) => ({
                ...variant,
                id: createClientId('variant'),
              })),
            }
          : lineup,
      );
      const first = imported[0];
      setLineupManager([...imported, ...managedLineups], first.id, first.variants[0]?.id);
      setImportText('');
      setImportPanelOpen(false);
      toast.success(t('goldenSpatula.lineups.importSuccess'));
    } catch {
      toast.error(t('goldenSpatula.lineups.importFailed'));
    }
  };

  const applyTaskConfig = () => {
    if (taskConfigDisabledReason || !activeInstanceId || !projectInterface) return;

    const stateBefore = useAppStore.getState();
    const currentInstance = stateBefore.instances.find(
      (instance) => instance.id === activeInstanceId,
    );
    if (!currentInstance) return;

    const currentResource =
      stateBefore.selectedResource[activeInstanceId] ||
      currentInstance.resourceName ||
      projectInterface.resource?.[0]?.name;
    if (currentResource !== KNOWLEDGE_RESOURCE) {
      setSelectedResource(activeInstanceId, KNOWLEDGE_RESOURCE);
    }

    let added = 0;
    let enabled = 0;
    const stateAfterResource = useAppStore.getState();
    let instance = stateAfterResource.instances.find((item) => item.id === activeInstanceId);

    for (const taskName of knowledgeTaskNames) {
      instance = useAppStore.getState().instances.find((item) => item.id === activeInstanceId);
      const existing = instance?.selectedTasks.find((task) => task.taskName === taskName);
      if (existing) {
        if (!existing.enabled) {
          toggleTaskEnabled(activeInstanceId, existing.id);
          enabled += 1;
        }
        continue;
      }

      const taskDef = projectInterface.task.find((task) => task.name === taskName);
      if (taskDef) {
        addTaskToInstance(activeInstanceId, taskDef);
        added += 1;
      }
    }

    toast.success(t('goldenSpatula.lineups.taskConfigApplied', { added, enabled }));
  };

  async function ensureActiveResourceLoaded(showToast: boolean): Promise<boolean> {
    if (!activeInstanceId) return false;

    try {
      const loaded = await maaService.isResourceLoaded(activeInstanceId);
      setInstanceResourceLoaded(activeInstanceId, loaded);
      if (loaded) {
        return true;
      }
    } catch (error) {
      console.warn('Failed to verify Maa resource loaded state:', error);
      if (resourceLoaded) return true;
    }

    if (showToast) toast.error(t('goldenSpatula.lineups.autoBuyNeedsLoadedResource'));
    return false;
  }

  function isSelectedAugmentActiveProbeBlocked(ignoreRunning = false): boolean {
    return Boolean(
      !selectedAugmentActiveProbeEnabled ||
      !activeInstanceId ||
      (!ignoreRunning && selectedAugmentActiveProbeRunningRef.current) ||
      activeInstance?.isRunning ||
      augmentPresence.visible ||
      augmentScanState.active ||
      augmentOcrSubmitting ||
      augmentPickSubmitting ||
      autoDecisionSubmitting ||
      handRunState.active ||
      isSelectedAugmentProbeBlockingSpecialEvent(specialEventLogStateRef.current),
    );
  }

  async function refreshCachedImageAfterAction(delayMs: number): Promise<string> {
    if (!activeInstanceId) return '';
    await waitMs(delayMs);
    await maaService.postScreencap(activeInstanceId).catch(() => 0);
    return maaService.getCachedImage(activeInstanceId);
  }

  async function closeSelectedAugmentDetailCard(dataUrl: string): Promise<void> {
    if (!activeInstanceId || !dataUrl.startsWith('data:image/')) return;
    try {
      const [x, y] = await scaleGoldenSpatulaSelectedAugmentTargetFromDataUrl(
        dataUrl,
        selectedAugmentActiveProbeCloseLogicalTarget,
      );
      await maaService.postClick(activeInstanceId, x, y).catch(() => 0);
      await waitMs(selectedAugmentActiveProbeCloseDelayMs);
      await maaService.postScreencap(activeInstanceId).catch(() => 0);
    } catch (error) {
      console.warn('Selected augment detail close click failed:', error);
    }
  }

  function shouldCloseSelectedAugmentDetailCard(result: {
    detailMatched?: boolean;
    detailDiagnostics?: GoldenSpatulaSelectedAugmentDetailDiagnostics;
  }): boolean {
    const diagnostics = result.detailDiagnostics;
    return Boolean(
      result.detailMatched ||
      diagnostics?.ownedPanelVisible ||
      (diagnostics?.detailCardSides.length ?? 0) > 0,
    );
  }

  async function closeSelectedAugmentDetailCardForResult(
    result: Pick<
      SelectedAugmentProbeSequenceResult,
      'detailMatched' | 'detailDiagnostics' | 'finalImage'
    >,
  ): Promise<void> {
    if (!shouldCloseSelectedAugmentDetailCard(result)) return;
    await closeSelectedAugmentDetailCard(result.finalImage);
  }

  function getUnconfirmedSelectedAugmentProbeTargets(
    targets: GoldenSpatulaSelectedAugmentProbeTarget[],
  ): GoldenSpatulaSelectedAugmentProbeTarget[] {
    const matchedSlots = new Set(
      Object.values(knowledgeScanState.selectedAugments ?? {})
        .filter((slot) => slot.confidence === 'matched')
        .map((slot) => slot.slotIndex),
    );
    const unconfirmed = targets.filter((target) => !matchedSlots.has(target.slotIndex));
    return unconfirmed.length > 0 ? unconfirmed : targets;
  }

  function recordSelectedAugmentProbeReliability(result: SelectedAugmentProbeSequenceResult) {
    const next = updateSelectedAugmentProbeReliability(selectedAugmentProbeReliabilityRef.current, {
      success: result.detailMatched,
      stage: result.stage,
      attempts: result.attempts,
    });
    selectedAugmentProbeReliabilityRef.current = next;
    setSelectedAugmentProbeReliability(next);
  }

  function createSelectedAugmentProbeTraceTarget(
    target: GoldenSpatulaSelectedAugmentProbeTarget | undefined,
  ): SelectedAugmentProbeTraceTarget | undefined {
    if (!target) return undefined;
    return {
      slotIndex: target.slotIndex,
      slotLabel: target.slotLabel,
      source: target.source,
      augmentName: target.augmentName,
      score: target.score,
      logicalTarget: target.logicalTarget,
      screenTarget: target.screenTarget,
    };
  }

  function createSelectedAugmentProbeTraceMatch(
    match: GoldenSpatulaSelectedAugmentVisionSlotResult | undefined,
  ): SelectedAugmentProbeTraceMatch | undefined {
    if (!match) return undefined;
    return {
      augmentName: match.augmentName,
      score: match.score,
      slotIndex: match.slotIndex,
      slotLabel: match.slotLabel,
      templatePath: match.templatePath,
      matchKind: match.matchKind,
      matchCenter: match.matchCenter,
      matchSourceLabel: match.matchSourceLabel,
      matchSide: match.matchSide,
      matchMargin: match.matchMargin,
    };
  }

  function appendSelectedAugmentProbeTrace(params: {
    runKind: SelectedAugmentProbeTraceEntry['runKind'];
    result: SelectedAugmentProbeSequenceResult;
    initialImage?: string;
    iteration?: number;
    total?: number;
  }) {
    const entry: SelectedAugmentProbeTraceEntry = {
      id: `${Date.now()}-${params.runKind}-${params.iteration ?? 0}`,
      timestamp: Date.now(),
      runKind: params.runKind,
      iteration: params.iteration,
      total: params.total,
      success: params.result.detailMatched,
      stage: params.result.stage,
      attempts: params.result.attempts,
      targetCount: params.result.targetCount,
      panelTargetCount: params.result.panelTargetCount,
      initialImage: params.initialImage?.startsWith('data:image/')
        ? params.initialImage
        : undefined,
      finalImage: params.result.finalImage.startsWith('data:image/')
        ? params.result.finalImage
        : undefined,
      target: createSelectedAugmentProbeTraceTarget(params.result.target),
      panelTarget: createSelectedAugmentProbeTraceTarget(params.result.panelTarget),
      match: createSelectedAugmentProbeTraceMatch(params.result.match),
      detailDiagnostics: params.result.detailDiagnostics,
    };
    const next = [entry, ...selectedAugmentProbeTraceEntriesRef.current].slice(
      0,
      selectedAugmentProbeTraceLimit,
    );
    selectedAugmentProbeTraceEntriesRef.current = next;
    setSelectedAugmentProbeTraceEntries(next);
  }

  function getSelectedAugmentAdaptiveTargetLimit(baseLimit: number): number {
    const reliability = selectedAugmentProbeReliabilityRef.current;
    if (reliability.total >= 5 && reliability.passRate < reliability.targetRate) {
      return selectedAugmentMaxScanSlots;
    }
    return Math.max(1, Math.min(selectedAugmentMaxScanSlots, baseLimit));
  }

  function rankSelectedAugmentPanelTargetsForProbe(
    target: GoldenSpatulaSelectedAugmentProbeTarget,
    panelTargets: GoldenSpatulaSelectedAugmentProbeTarget[],
  ): GoldenSpatulaSelectedAugmentProbeTarget[] {
    const expectedName = target.augmentName ? normalizeSearchText(target.augmentName) : '';
    return [...panelTargets].sort((left, right) => {
      const leftSlotMatch = left.slotIndex === target.slotIndex ? 1 : 0;
      const rightSlotMatch = right.slotIndex === target.slotIndex ? 1 : 0;
      if (leftSlotMatch !== rightSlotMatch) return rightSlotMatch - leftSlotMatch;

      const leftNameMatch =
        expectedName && left.augmentName
          ? normalizeSearchText(left.augmentName) === expectedName
          : false;
      const rightNameMatch =
        expectedName && right.augmentName
          ? normalizeSearchText(right.augmentName) === expectedName
          : false;
      if (leftNameMatch !== rightNameMatch) return Number(rightNameMatch) - Number(leftNameMatch);

      const leftScore = (left.score ?? 0) + getSelectedAugmentProbeCandidateWeight(left);
      const rightScore = (right.score ?? 0) + getSelectedAugmentProbeCandidateWeight(right);
      return rightScore - leftScore;
    });
  }

  function getSelectedAugmentProbeTargetKey(
    target: GoldenSpatulaSelectedAugmentProbeTarget,
  ): string {
    return [
      target.source,
      target.slotIndex,
      target.augmentName ? normalizeSearchText(target.augmentName) : '',
      target.templatePath ?? '',
      target.screenTarget.join(','),
    ].join(':');
  }

  function getSelectedAugmentProbeCandidateWeight(
    target: GoldenSpatulaSelectedAugmentProbeTarget,
  ): number {
    const stats = selectedAugmentProbeCandidateStatsRef.current.get(
      getSelectedAugmentProbeTargetKey(target),
    );
    if (!stats) return 0;
    return Math.max(-0.35, Math.min(0.35, stats.success * 0.12 - stats.failure * 0.16));
  }

  function rememberSelectedAugmentProbeCandidateResult(
    target: GoldenSpatulaSelectedAugmentProbeTarget | undefined,
    success: boolean,
  ) {
    if (!target) return;
    const key = getSelectedAugmentProbeTargetKey(target);
    const previous = selectedAugmentProbeCandidateStatsRef.current.get(key) ?? {
      success: 0,
      failure: 0,
      lastUpdatedAt: 0,
    };
    selectedAugmentProbeCandidateStatsRef.current.set(key, {
      success: Math.min(6, previous.success + (success ? 1 : 0)),
      failure: Math.min(6, previous.failure + (success ? 0 : 1)),
      lastUpdatedAt: Date.now(),
    });
  }

  function rankSelectedAugmentProbeTargetsByHistory(
    targets: GoldenSpatulaSelectedAugmentProbeTarget[],
  ): GoldenSpatulaSelectedAugmentProbeTarget[] {
    return [...targets].sort((left, right) => {
      const leftScore = (left.score ?? 0) + getSelectedAugmentProbeCandidateWeight(left);
      const rightScore = (right.score ?? 0) + getSelectedAugmentProbeCandidateWeight(right);
      return rightScore - leftScore;
    });
  }

  async function recognizeAndPublishSelectedAugmentDetail(
    dataUrl: string,
    target: Pick<
      GoldenSpatulaSelectedAugmentProbeTarget,
      'slotIndex' | 'slotLabel' | 'augmentName' | 'score' | 'templatePath'
    >,
    runSeq: number,
    context?: {
      expectedTargets?: ReadonlyArray<
        Pick<GoldenSpatulaSelectedAugmentProbeTarget, 'augmentName' | 'score' | 'templatePath'>
      >;
    },
  ): Promise<SelectedAugmentDetailRecognitionResult> {
    if (selectedAugmentVisionRunSeqRef.current !== runSeq) return {};
    const expectedTargets = [target, ...(context?.expectedTargets ?? [])].filter((candidate) =>
      Boolean(candidate.augmentName),
    );
    const expectedAugmentNames = [
      ...new Set(expectedTargets.map((candidate) => candidate.augmentName!)),
    ];
    const fallbackTarget = expectedTargets
      .filter((candidate) => candidate.augmentName && Number.isFinite(candidate.score))
      .sort((left, right) => (right.score ?? 0) - (left.score ?? 0))[0];
    const detailResult = await recognizeGoldenSpatulaSelectedAugmentDetailFromDataUrl(dataUrl, {
      augmentAssets: assistantData?.augmentAssets.data,
      basePath,
      slotIndex: target.slotIndex,
      slotLabel: target.slotLabel,
      allowOwnedPanelFallback: false,
      expectedAugmentNames,
      fallbackAugmentName: fallbackTarget?.augmentName,
      fallbackScore: fallbackTarget?.score,
      fallbackTemplatePath: fallbackTarget?.templatePath,
    });
    if (selectedAugmentVisionRunSeqRef.current !== runSeq) return {};

    const detailEvents = buildSelectedAugmentKnowledgeEvents(
      detailResult,
      t,
      'SelectedAugmentDetailProbe',
    );
    if (detailEvents.length > 0) {
      setKnowledgeScanState((previous) =>
        detailEvents.reduce<GoldenSpatulaKnowledgeScanState>(
          (state, event) => mergeKnowledgeEvent(state, event),
          previous,
        ),
      );
    }
    return {
      match: detailResult.slots.find((slot) => slot.confidence === 'matched'),
      diagnostics: detailResult.detailDiagnostics,
    };
  }

  async function clickSelectedAugmentProbeTargetAndCapture(
    target: Pick<GoldenSpatulaSelectedAugmentProbeTarget, 'screenTarget'>,
  ): Promise<string> {
    if (!activeInstanceId) return '';
    const [x, y] = target.screenTarget;
    await maaService.postClick(activeInstanceId, x, y);
    await waitMs(selectedAugmentActiveProbeClickDelayMs);
    return refreshCachedImageAfterAction(selectedAugmentActiveProbeScreencapDelayMs);
  }

  async function openSelectedAugmentDetailFromProbeTarget(params: {
    target: GoldenSpatulaSelectedAugmentProbeTarget;
    maxSlots: number;
    runSeq: number;
  }): Promise<SelectedAugmentDetailProbeResult> {
    let attempts = 1;
    let finalImage = await clickSelectedAugmentProbeTargetAndCapture(params.target);
    if (selectedAugmentVisionRunSeqRef.current !== params.runSeq) {
      return {
        detailMatched: false,
        finalImage,
        stage: 'cancelled',
        attempts,
        target: params.target,
        panelTargetCount: 0,
      };
    }

    const triedPanelTargets = new Set<string>();
    let lastPanelTarget: GoldenSpatulaSelectedAugmentProbeTarget | undefined;
    let lastPanelTargetCount = 0;
    let clickedAnyPanelTarget = false;
    let lastDetailDiagnostics: GoldenSpatulaSelectedAugmentDetailDiagnostics | undefined;

    while (attempts < selectedAugmentProbeMaxClickAttempts) {
      const panelTargetsResult =
        await findGoldenSpatulaSelectedAugmentDetailPanelTargetsFromDataUrl(finalImage, {
          augmentAssets: assistantData?.augmentAssets.data,
          basePath,
          maxSlots: params.maxSlots,
          maxTargets: selectedAugmentProbePanelTargetLimit,
          allowPresenceFallback: false,
        });
      const panelTargets = rankSelectedAugmentPanelTargetsForProbe(
        params.target,
        getUnconfirmedSelectedAugmentProbeTargets(panelTargetsResult.targets),
      );
      lastPanelTargetCount = Math.max(lastPanelTargetCount, panelTargets.length);
      const panelTarget = panelTargets.find(
        (candidate) => !triedPanelTargets.has(getSelectedAugmentProbeTargetKey(candidate)),
      );

      if (!panelTarget) break;
      if (isSelectedAugmentActiveProbeBlocked(true)) {
        return {
          detailMatched: false,
          finalImage,
          stage: 'blocked',
          attempts,
          target: params.target,
          panelTarget: lastPanelTarget,
          panelTargetCount: lastPanelTargetCount,
        };
      }

      triedPanelTargets.add(getSelectedAugmentProbeTargetKey(panelTarget));
      lastPanelTarget = panelTarget;
      clickedAnyPanelTarget = true;
      attempts += 1;
      const detailImage = await clickSelectedAugmentProbeTargetAndCapture(panelTarget);
      finalImage = detailImage;
      let detailRecognition = await recognizeAndPublishSelectedAugmentDetail(
        detailImage,
        panelTarget,
        params.runSeq,
        {
          expectedTargets: [params.target, panelTarget],
        },
      );
      let match = detailRecognition.match;
      lastDetailDiagnostics = detailRecognition.diagnostics ?? lastDetailDiagnostics;
      if (!match && selectedAugmentVisionRunSeqRef.current === params.runSeq) {
        const retryImage = await refreshCachedImageAfterAction(
          selectedAugmentDetailProbeSettleRetryDelayMs,
        );
        if (retryImage.startsWith('data:image/')) {
          finalImage = retryImage;
          detailRecognition = await recognizeAndPublishSelectedAugmentDetail(
            retryImage,
            panelTarget,
            params.runSeq,
            {
              expectedTargets: [params.target, panelTarget],
            },
          );
          match = detailRecognition.match;
          lastDetailDiagnostics = detailRecognition.diagnostics ?? lastDetailDiagnostics;
        }
      }
      if (selectedAugmentVisionRunSeqRef.current !== params.runSeq) {
        return {
          detailMatched: false,
          finalImage,
          stage: 'cancelled',
          attempts,
          target: params.target,
          panelTarget,
          detailDiagnostics: lastDetailDiagnostics,
          panelTargetCount: lastPanelTargetCount,
        };
      }
      if (match) {
        rememberSelectedAugmentProbeCandidateResult(params.target, true);
        rememberSelectedAugmentProbeCandidateResult(panelTarget, true);
        return {
          detailMatched: true,
          finalImage,
          stage: 'matched',
          attempts,
          match,
          detailDiagnostics: lastDetailDiagnostics,
          target: params.target,
          panelTarget,
          panelTargetCount: lastPanelTargetCount,
        };
      }
      rememberSelectedAugmentProbeCandidateResult(panelTarget, false);

      if (attempts + 1 >= selectedAugmentProbeMaxClickAttempts) break;
      await closeSelectedAugmentDetailCard(finalImage);
      if (isSelectedAugmentActiveProbeBlocked(true)) {
        return {
          detailMatched: false,
          finalImage,
          stage: 'blocked',
          attempts,
          target: params.target,
          panelTarget,
          detailDiagnostics: lastDetailDiagnostics,
          panelTargetCount: lastPanelTargetCount,
        };
      }
      attempts += 1;
      finalImage = await clickSelectedAugmentProbeTargetAndCapture(params.target);
      if (selectedAugmentVisionRunSeqRef.current !== params.runSeq) {
        return {
          detailMatched: false,
          finalImage,
          stage: 'cancelled',
          attempts,
          target: params.target,
          panelTarget,
          detailDiagnostics: lastDetailDiagnostics,
          panelTargetCount: lastPanelTargetCount,
        };
      }
    }

    const detailRecognition = await recognizeAndPublishSelectedAugmentDetail(
      finalImage,
      params.target,
      params.runSeq,
      {
        expectedTargets: lastPanelTarget ? [params.target, lastPanelTarget] : [params.target],
      },
    );
    const match = detailRecognition.match;
    lastDetailDiagnostics = detailRecognition.diagnostics ?? lastDetailDiagnostics;
    rememberSelectedAugmentProbeCandidateResult(params.target, Boolean(match));
    const detailCardVisible = (lastDetailDiagnostics?.detailCardSides.length ?? 0) > 0;
    return {
      detailMatched: Boolean(match),
      finalImage,
      stage: match
        ? 'matched'
        : clickedAnyPanelTarget
          ? detailCardVisible
            ? 'detailUnmatched'
            : 'noDetailCard'
          : 'noPanelTarget',
      attempts,
      match,
      detailDiagnostics: lastDetailDiagnostics,
      target: params.target,
      panelTarget: lastPanelTarget,
      panelTargetCount: lastPanelTargetCount,
    };
  }

  async function runSelectedAugmentProbeSequenceFromImage(params: {
    cachedImage: string;
    maxSlots: number;
    maxTargets: number;
    runSeq: number;
  }): Promise<SelectedAugmentProbeSequenceResult> {
    if (!params.cachedImage.startsWith('data:image/')) {
      return {
        detailMatched: false,
        finalImage: params.cachedImage,
        stage: 'noScreenshot',
        attempts: 0,
        targetCount: 0,
      };
    }

    const probeTargetResult = await findGoldenSpatulaSelectedAugmentProbeTargetsFromDataUrl(
      params.cachedImage,
      {
        augmentAssets: assistantData?.augmentAssets.data,
        basePath,
        maxSlots: params.maxSlots,
        maxTargets: params.maxTargets,
        allowedSources: ['spectator', 'board'],
        allowPresenceFallback: false,
      },
    );
    if (selectedAugmentVisionRunSeqRef.current !== params.runSeq) {
      return {
        detailMatched: false,
        finalImage: params.cachedImage,
        stage: 'cancelled',
        attempts: 0,
        targetCount: probeTargetResult.targets.length,
      };
    }

    const targets = rankSelectedAugmentProbeTargetsByHistory(
      getUnconfirmedSelectedAugmentProbeTargets(probeTargetResult.targets),
    );
    if (targets.length === 0) {
      return {
        detailMatched: false,
        finalImage: params.cachedImage,
        stage: 'noTargets',
        attempts: 0,
        targetCount: 0,
      };
    }

    let attempts = 0;
    let finalImage = params.cachedImage;
    let lastResult: SelectedAugmentDetailProbeResult | undefined;

    for (const target of targets) {
      if (selectedAugmentVisionRunSeqRef.current !== params.runSeq) {
        return {
          detailMatched: false,
          finalImage,
          stage: 'cancelled',
          attempts,
          targetCount: targets.length,
          target: lastResult?.target,
          panelTarget: lastResult?.panelTarget,
          detailDiagnostics: lastResult?.detailDiagnostics,
        };
      }
      if (isSelectedAugmentActiveProbeBlocked(true)) {
        return {
          detailMatched: false,
          finalImage,
          stage: 'blocked',
          attempts,
          targetCount: targets.length,
          target: lastResult?.target,
          panelTarget: lastResult?.panelTarget,
          detailDiagnostics: lastResult?.detailDiagnostics,
        };
      }
      if (attempts >= selectedAugmentProbeMaxClickAttempts) break;

      const detailProbe = await openSelectedAugmentDetailFromProbeTarget({
        target,
        maxSlots: params.maxSlots,
        runSeq: params.runSeq,
      });
      lastResult = detailProbe;
      attempts += detailProbe.attempts;
      finalImage = detailProbe.finalImage;

      if (detailProbe.detailMatched) {
        return {
          detailMatched: true,
          finalImage,
          stage: 'matched',
          attempts,
          targetCount: targets.length,
          panelTargetCount: detailProbe.panelTargetCount,
          match: detailProbe.match,
          detailDiagnostics: detailProbe.detailDiagnostics,
          target: detailProbe.target,
          panelTarget: detailProbe.panelTarget,
        };
      }

      await closeSelectedAugmentDetailCardForResult({
        detailMatched: detailProbe.detailMatched,
        detailDiagnostics: detailProbe.detailDiagnostics,
        finalImage,
      });
    }

    return {
      detailMatched: false,
      finalImage,
      stage: lastResult?.stage ?? 'detailUnmatched',
      attempts,
      targetCount: targets.length,
      panelTargetCount: lastResult?.panelTargetCount,
      match: lastResult?.match,
      detailDiagnostics: lastResult?.detailDiagnostics,
      target: lastResult?.target,
      panelTarget: lastResult?.panelTarget,
    };
  }

  async function runSelectedAugmentActiveDetailProbe(params: {
    cachedImage: string;
    maxSlots: number;
    expectedCount: number;
    knownMatchedCount: number;
    runSeq: number;
  }): Promise<boolean> {
    if (isSelectedAugmentActiveProbeBlocked()) return false;
    const now = Date.now();
    if (
      now - selectedAugmentActiveProbeLastRunAtRef.current <
      selectedAugmentActiveProbeMinIntervalMs
    ) {
      return false;
    }

    selectedAugmentActiveProbeRunningRef.current = true;
    selectedAugmentActiveProbeLastRunAtRef.current = now;
    let matchedAny = false;

    try {
      const missingCount =
        params.expectedCount > 0 ? Math.max(1, params.expectedCount - params.knownMatchedCount) : 1;
      const targetLimit = getSelectedAugmentAdaptiveTargetLimit(
        Math.min(selectedAugmentMaxScanSlots, Math.max(missingCount, 2)),
      );
      const probeResult = await runSelectedAugmentProbeSequenceFromImage({
        cachedImage: params.cachedImage,
        maxSlots: params.maxSlots,
        maxTargets: targetLimit,
        runSeq: params.runSeq,
      });
      matchedAny = probeResult.detailMatched;
      recordSelectedAugmentProbeReliability(probeResult);
      appendSelectedAugmentProbeTrace({
        runKind: 'active',
        result: probeResult,
        initialImage: params.cachedImage,
      });
      await closeSelectedAugmentDetailCardForResult(probeResult);

      if (matchedAny) {
        selectedAugmentVisionBackoffUntilRef.current = 0;
        selectedAugmentVisionNoPresenceStreakRef.current = 0;
        selectedAugmentVisionMissStreakRef.current = 0;
      }
    } catch (error) {
      console.warn('Selected augment active detail probe failed:', error);
      const errorResult = {
        detailMatched: false,
        finalImage: '',
        stage: 'error',
        attempts: 0,
        targetCount: 0,
      } satisfies SelectedAugmentProbeSequenceResult;
      recordSelectedAugmentProbeReliability(errorResult);
      appendSelectedAugmentProbeTrace({
        runKind: 'active',
        result: errorResult,
      });
    } finally {
      selectedAugmentActiveProbeRunningRef.current = false;
    }

    return matchedAny;
  }

  async function runCalibrationSelectedAugmentProbeTest() {
    if (calibrationSelectedAugmentProbeDisabledReason) {
      toast.error(calibrationSelectedAugmentProbeDisabledReason);
      return;
    }
    if (!activeInstanceId) return;

    selectedAugmentActiveProbeRunningRef.current = true;
    selectedAugmentVisionRunningRef.current = true;
    const runSeq = selectedAugmentVisionRunSeqRef.current + 1;
    selectedAugmentVisionRunSeqRef.current = runSeq;
    setCalibrationSelectedAugmentProbeSubmitting(true);

    try {
      toast.info(t('goldenSpatula.calibration.selectedAugmentProbeTestStarted'));
      const cachedImage = await refreshCachedImageAfterAction(
        selectedAugmentActiveProbeScreencapDelayMs,
      );
      if (selectedAugmentVisionRunSeqRef.current !== runSeq) return;
      if (!cachedImage.startsWith('data:image/')) {
        toast.error(t('goldenSpatula.calibration.selectedAugmentProbeTestNoScreenshot'));
        const noScreenshotResult = {
          detailMatched: false,
          finalImage: cachedImage,
          stage: 'noScreenshot',
          attempts: 0,
          targetCount: 0,
        } satisfies SelectedAugmentProbeSequenceResult;
        recordSelectedAugmentProbeReliability(noScreenshotResult);
        appendSelectedAugmentProbeTrace({
          runKind: 'single',
          result: noScreenshotResult,
          initialImage: cachedImage,
        });
        return;
      }

      const probeResult = await runSelectedAugmentProbeSequenceFromImage({
        cachedImage,
        maxSlots: selectedAugmentMaxScanSlots,
        maxTargets: selectedAugmentProbeCalibrationTargetLimit,
        runSeq,
      });
      if (selectedAugmentVisionRunSeqRef.current !== runSeq) return;
      recordSelectedAugmentProbeReliability(probeResult);
      appendSelectedAugmentProbeTrace({
        runKind: 'single',
        result: probeResult,
        initialImage: cachedImage,
      });
      await closeSelectedAugmentDetailCardForResult(probeResult);

      if (probeResult.stage === 'noTargets') {
        toast.error(t('goldenSpatula.calibration.selectedAugmentProbeTestNoTargets'));
        return;
      }

      if (!probeResult.panelTarget && !probeResult.detailMatched) {
        toast.error(t('goldenSpatula.calibration.selectedAugmentProbeTestNoPanelTarget'));
        return;
      }

      if (probeResult.stage === 'noDetailCard') {
        toast.error(t('goldenSpatula.calibration.selectedAugmentProbeTestNoDetailCard'));
        return;
      }

      if (probeResult.detailMatched) {
        selectedAugmentVisionBackoffUntilRef.current = 0;
        selectedAugmentVisionNoPresenceStreakRef.current = 0;
        selectedAugmentVisionMissStreakRef.current = 0;
        toast.success(
          t('goldenSpatula.calibration.selectedAugmentProbeTestMatched', {
            augmentName:
              probeResult.match?.augmentName ??
              probeResult.target?.augmentName ??
              t('goldenSpatula.recognition.unknownAugment'),
          }),
        );
        return;
      }

      toast.error(t('goldenSpatula.calibration.selectedAugmentProbeTestUnmatched'));
    } catch (error) {
      const errorResult = {
        detailMatched: false,
        finalImage: '',
        stage: 'error',
        attempts: 0,
        targetCount: 0,
      } satisfies SelectedAugmentProbeSequenceResult;
      recordSelectedAugmentProbeReliability(errorResult);
      appendSelectedAugmentProbeTrace({
        runKind: 'single',
        result: errorResult,
      });
      toast.error(
        t('goldenSpatula.calibration.selectedAugmentProbeTestFailed', {
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    } finally {
      selectedAugmentActiveProbeRunningRef.current = false;
      selectedAugmentVisionRunningRef.current = false;
      setCalibrationSelectedAugmentProbeSubmitting(false);
    }
  }

  async function runCalibrationSelectedAugmentProbeBatchTest() {
    if (calibrationSelectedAugmentProbeDisabledReason) {
      toast.error(calibrationSelectedAugmentProbeDisabledReason);
      return;
    }
    if (!activeInstanceId) return;

    selectedAugmentActiveProbeRunningRef.current = true;
    selectedAugmentVisionRunningRef.current = true;
    const runSeq = selectedAugmentVisionRunSeqRef.current + 1;
    selectedAugmentVisionRunSeqRef.current = runSeq;
    setCalibrationSelectedAugmentProbeSubmitting(true);
    setSelectedAugmentProbeBatchProgress({ current: 0, total: selectedAugmentProbeBatchSize });

    let completed = 0;
    let success = 0;
    let attempts = 0;

    try {
      toast.info(
        t('goldenSpatula.calibration.selectedAugmentProbeBatchStarted', {
          total: selectedAugmentProbeBatchSize,
        }),
      );

      for (let index = 0; index < selectedAugmentProbeBatchSize; index += 1) {
        if (selectedAugmentVisionRunSeqRef.current !== runSeq) return;
        if (isSelectedAugmentActiveProbeBlocked(true)) break;

        setSelectedAugmentProbeBatchProgress({
          current: index + 1,
          total: selectedAugmentProbeBatchSize,
        });
        const cachedImage = await refreshCachedImageAfterAction(
          selectedAugmentActiveProbeScreencapDelayMs,
        );
        const probeResult = cachedImage.startsWith('data:image/')
          ? await runSelectedAugmentProbeSequenceFromImage({
              cachedImage,
              maxSlots: selectedAugmentMaxScanSlots,
              maxTargets: selectedAugmentProbeCalibrationTargetLimit,
              runSeq,
            })
          : ({
              detailMatched: false,
              finalImage: cachedImage,
              stage: 'noScreenshot',
              attempts: 0,
              targetCount: 0,
            } satisfies SelectedAugmentProbeSequenceResult);

        if (selectedAugmentVisionRunSeqRef.current !== runSeq) return;
        recordSelectedAugmentProbeReliability(probeResult);
        appendSelectedAugmentProbeTrace({
          runKind: 'batch',
          result: probeResult,
          initialImage: cachedImage,
          iteration: index + 1,
          total: selectedAugmentProbeBatchSize,
        });
        completed += 1;
        attempts += probeResult.attempts;
        if (probeResult.detailMatched) success += 1;
        await closeSelectedAugmentDetailCardForResult(probeResult);

        if (probeResult.stage === 'blocked' || probeResult.stage === 'cancelled') break;
      }

      const rate = completed > 0 ? Math.round((success / completed) * 100) : 0;
      const payload = {
        success,
        total: completed,
        rate,
        target: Math.round(selectedAugmentProbeReliabilityTargetRate * 100),
        attempts,
      };
      if (completed > 0 && rate >= selectedAugmentProbeReliabilityTargetRate * 100) {
        toast.success(t('goldenSpatula.calibration.selectedAugmentProbeBatchMatched', payload));
      } else {
        toast.error(t('goldenSpatula.calibration.selectedAugmentProbeBatchBelowTarget', payload));
      }
    } catch (error) {
      const errorResult = {
        detailMatched: false,
        finalImage: '',
        stage: 'error',
        attempts: 0,
        targetCount: 0,
      } satisfies SelectedAugmentProbeSequenceResult;
      recordSelectedAugmentProbeReliability(errorResult);
      appendSelectedAugmentProbeTrace({
        runKind: 'batch',
        result: errorResult,
      });
      toast.error(
        t('goldenSpatula.calibration.selectedAugmentProbeBatchFailed', {
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    } finally {
      selectedAugmentActiveProbeRunningRef.current = false;
      selectedAugmentVisionRunningRef.current = false;
      setCalibrationSelectedAugmentProbeSubmitting(false);
      setSelectedAugmentProbeBatchProgress(null);
    }
  }

  async function runSelectedAugmentVisionScan(
    cachedImage: string,
    maxSlots = selectedAugmentMaxScanSlots,
    fastMode = true,
    force = false,
    context: {
      expectedCount?: number;
      knownMatchedCount?: number;
      allowActiveProbe?: boolean;
    } = {},
  ) {
    if (!selectedAugmentVisionEnabled) return;
    if (selectedAugmentVisionRunningRef.current) return;
    const imageFingerprint = getGoldenSpatulaDataUrlFastFingerprint(cachedImage);
    const now = Date.now();
    if (
      !force &&
      imageFingerprint &&
      selectedAugmentVisionLastImageFingerprintRef.current === imageFingerprint &&
      now - selectedAugmentVisionLastImageAtRef.current < selectedAugmentRepeatedImageBackoffMs
    ) {
      return;
    }
    if (imageFingerprint) {
      selectedAugmentVisionLastImageFingerprintRef.current = imageFingerprint;
      selectedAugmentVisionLastImageAtRef.current = now;
    }
    const runSeq = selectedAugmentVisionRunSeqRef.current + 1;
    selectedAugmentVisionRunSeqRef.current = runSeq;

    try {
      selectedAugmentVisionRunningRef.current = true;
      await waitForSelectedAugmentVisionBackgroundSlot();
      if (selectedAugmentVisionRunSeqRef.current !== runSeq) return;
      const selectedAugmentVisionResult = await recognizeGoldenSpatulaSelectedAugmentsFromDataUrl(
        cachedImage,
        {
          augmentAssets: assistantData?.augmentAssets.data,
          basePath,
          maxSlots,
          fastMode,
        },
      );
      if (selectedAugmentVisionRunSeqRef.current !== runSeq) return;
      const matchedSelectedAugmentVisionCount = selectedAugmentVisionResult.slots.filter(
        (slot) => slot.confidence === 'matched',
      ).length;
      if (matchedSelectedAugmentVisionCount > 0) {
        selectedAugmentVisionBackoffUntilRef.current = 0;
        selectedAugmentVisionNoPresenceStreakRef.current = 0;
        selectedAugmentVisionMissStreakRef.current = 0;
      } else {
        selectedAugmentVisionMissStreakRef.current = Math.min(
          selectedAugmentVisionMissStreakRef.current + 1,
          selectedAugmentActiveProbeMissThreshold,
        );
        const didRunTemplateMatch =
          (selectedAugmentVisionResult.metrics?.templateCount ?? 0) > 0 ||
          (selectedAugmentVisionResult.metrics?.matchMs ?? 0) > 0;
        if (didRunTemplateMatch) {
          selectedAugmentVisionNoPresenceStreakRef.current = 0;
        } else {
          selectedAugmentVisionNoPresenceStreakRef.current = Math.min(
            selectedAugmentVisionNoPresenceStreakRef.current + 1,
            Math.ceil(selectedAugmentNoPresenceMaxBackoffMs / selectedAugmentNoPresenceBackoffMs),
          );
        }
        const noPresenceBackoff = Math.min(
          selectedAugmentNoPresenceMaxBackoffMs,
          selectedAugmentNoPresenceBackoffMs *
            Math.max(1, selectedAugmentVisionNoPresenceStreakRef.current),
        );
        selectedAugmentVisionBackoffUntilRef.current =
          Date.now() + (didRunTemplateMatch ? selectedAugmentNoMatchBackoffMs : noPresenceBackoff);
      }
      if (
        selectedAugmentVisionResult.metrics &&
        (selectedAugmentVisionResult.metrics.totalMs > 50 ||
          selectedAugmentVisionResult.metrics.templateLoadMs > 30 ||
          selectedAugmentVisionResult.metrics.matchMs > 30)
      ) {
        console.info(
          'Golden Spatula selected augment vision metrics:',
          selectedAugmentVisionResult.metrics,
        );
      }
      const selectedAugmentVisionEvents = buildSelectedAugmentKnowledgeEvents(
        selectedAugmentVisionResult,
        t,
      );
      if (selectedAugmentVisionRunSeqRef.current !== runSeq) return;
      if (selectedAugmentVisionEvents.length > 0) {
        setKnowledgeScanState((previous) =>
          selectedAugmentVisionEvents.reduce<GoldenSpatulaKnowledgeScanState>(
            (state, event) => mergeKnowledgeEvent(state, event),
            previous,
          ),
        );
      }
      const knownMatchedCount = context.knownMatchedCount ?? 0;
      const expectedCount = context.expectedCount ?? 0;
      const knownAndPassiveMatchedCount = Math.max(
        knownMatchedCount,
        matchedSelectedAugmentVisionCount,
      );
      const needsActiveProbe =
        context.allowActiveProbe &&
        matchedSelectedAugmentVisionCount === 0 &&
        selectedAugmentVisionMissStreakRef.current >= selectedAugmentActiveProbeMissThreshold &&
        (expectedCount === 0 || knownAndPassiveMatchedCount < expectedCount);
      if (needsActiveProbe) {
        const probeMatched = await runSelectedAugmentActiveDetailProbe({
          cachedImage,
          maxSlots,
          expectedCount,
          knownMatchedCount: knownAndPassiveMatchedCount,
          runSeq,
        });
        if (probeMatched) {
          selectedAugmentVisionBackoffUntilRef.current = 0;
          selectedAugmentVisionNoPresenceStreakRef.current = 0;
          selectedAugmentVisionMissStreakRef.current = 0;
        }
      }
    } catch (error) {
      console.warn('Selected augment vision recognition failed:', error);
    } finally {
      if (selectedAugmentVisionRunSeqRef.current === runSeq) {
        selectedAugmentVisionRunningRef.current = false;
      }
    }
  }

  async function submitEconomyOcrTask(showToast: boolean) {
    if (economyOcrDisabledReason || !activeInstanceId) {
      if (showToast && economyOcrDisabledReason) {
        toast.error(economyOcrDisabledReason);
      }
      return;
    }

    try {
      setEconomyOcrSubmitting(true);
      const startedAt = Date.now();
      setEconomyRunState((previous) => ({
        ...previous,
        active: true,
        startedAt: previous.startedAt ?? startedAt,
        updatedAt: startedAt,
      }));

      let cachedImage = await maaService.getCachedImage(activeInstanceId);
      if (!cachedImage.startsWith('data:image/')) {
        await maaService.postScreencap(activeInstanceId).catch(() => 0);
        await new Promise((resolve) => window.setTimeout(resolve, 180));
        cachedImage = await maaService.getCachedImage(activeInstanceId);
      }
      await detectAndPublishSpecialEvents(cachedImage);
      const timestamp = Date.now();
      const rawResult = await recognizeGoldenSpatulaEconomyFromDataUrl(cachedImage);
      const stabilized = stabilizeGoldenSpatulaEconomyResult(
        economyStabilizerRef.current,
        rawResult,
        timestamp,
      );
      economyStabilizerRef.current = stabilized.state;
      const result = stabilized.result;
      const events: GoldenSpatulaEconomyEvent[] = [];

      if (result.round !== undefined) {
        events.push({
          id: `${timestamp}-economy-round`,
          timestamp,
          kind: 'recognized',
          field: 'round',
          round: result.round,
          rawText: result.rawText.round,
          message: t('goldenSpatula.lineups.economyStatusEvent.recognized', {
            field: 'round',
            fieldLabel: t('goldenSpatula.lineups.economyField.round'),
            value: result.round,
            rawText: result.rawText.round,
          }),
          nodeName: 'EconomyVision_Round',
        });
      }

      if (result.gold !== undefined) {
        events.push({
          id: `${timestamp}-economy-gold`,
          timestamp,
          kind: 'recognized',
          field: 'gold',
          gold: result.gold,
          rawText: result.rawText.gold,
          message: t('goldenSpatula.lineups.economyStatusEvent.recognized', {
            field: 'gold',
            fieldLabel: t('goldenSpatula.lineups.economyField.gold'),
            value: result.gold,
            rawText: result.rawText.gold,
          }),
          nodeName: 'EconomyVision_Gold',
        });
      }

      if (result.level !== undefined) {
        events.push({
          id: `${timestamp}-economy-level`,
          timestamp,
          kind: 'recognized',
          field: 'level',
          level: result.level,
          rawText: result.rawText.level,
          message: t('goldenSpatula.lineups.economyStatusEvent.recognized', {
            field: 'level',
            fieldLabel: t('goldenSpatula.lineups.economyField.level'),
            value: result.level,
            rawText: result.rawText.level,
          }),
          nodeName: 'EconomyVision_Level',
        });
      }

      if (result.experience !== undefined) {
        const value =
          result.experienceMax !== undefined
            ? `${result.experience}/${result.experienceMax}`
            : result.experience;
        events.push({
          id: `${timestamp}-economy-experience`,
          timestamp,
          kind: 'recognized',
          field: 'experience',
          experience: result.experience,
          experienceMax: result.experienceMax,
          rawText: result.rawText.experience,
          message: t('goldenSpatula.lineups.economyStatusEvent.recognized', {
            field: 'experience',
            fieldLabel: t('goldenSpatula.lineups.economyField.experience'),
            value,
            rawText: result.rawText.experience,
          }),
          nodeName: 'EconomyVision_Experience',
        });
      }

      if (result.streakInterest !== undefined) {
        const value =
          result.streakKind === 'win' || result.streakKind === 'loss'
            ? `${t(`goldenSpatula.lineups.economyStreakKind.${result.streakKind}`)} +${
                result.streakInterest
              }`
            : String(result.streakInterest);
        events.push({
          id: `${timestamp}-economy-streak`,
          timestamp,
          kind: 'recognized',
          field: 'streak',
          streakKind: result.streakKind,
          streakInterest: result.streakInterest,
          rawText: result.rawText.streak,
          message: t('goldenSpatula.lineups.economyStatusEvent.recognized', {
            field: 'streak',
            fieldLabel: t('goldenSpatula.lineups.economyField.streak'),
            value,
            rawText: result.rawText.streak,
          }),
          nodeName: 'EconomyVision_Streak',
        });
      }

      if (result.shopOdds) {
        const value = ([1, 2, 3, 4, 5] as const)
          .map((cost) =>
            t('goldenSpatula.lineups.economyCostOdds', {
              cost,
              odds: formatShopOddsPercent(result.shopOdds?.[cost]),
            }),
          )
          .join(' / ');
        events.push({
          id: `${timestamp}-economy-shop-odds`,
          timestamp,
          kind: 'recognized',
          field: 'shopOdds',
          shopOdds: result.shopOdds,
          shopOddsSource: result.shopOddsSource,
          rawText: Object.values(result.rawText.shopOdds ?? {})
            .filter(Boolean)
            .join(' / '),
          message: t('goldenSpatula.lineups.economyStatusEvent.recognized', {
            field: 'shopOdds',
            fieldLabel: t('goldenSpatula.lineups.economyField.shopOdds'),
            value,
            rawText: Object.values(result.rawText.shopOdds ?? {})
              .filter(Boolean)
              .join(' / '),
          }),
          nodeName: 'EconomyVision_ShopOdds',
        });
      }

      const rawText = [
        result.rawText.round,
        result.rawText.gold,
        result.rawText.level,
        result.rawText.experience,
        result.rawText.streak,
        Object.values(result.rawText.shopOdds ?? {})
          .filter(Boolean)
          .join(' / '),
      ]
        .filter(Boolean)
        .join(' / ');
      if (events.length === 0 && !rawText) {
        events.push({
          id: `${timestamp}-economy-scan-failed`,
          timestamp,
          kind: 'scanFailed',
          field: 'gold',
          rawText,
          message: t('goldenSpatula.lineups.economyStatusEvent.scanFailed', {
            field: 'gold',
            fieldLabel: t('goldenSpatula.lineups.economyField.gold'),
          }),
          nodeName: 'EconomyVision',
        });
      }

      events.push({
        id: `${timestamp}-economy-scanned`,
        timestamp,
        kind: 'scanned',
        message: t('goldenSpatula.lineups.economyStatusEvent.scanned'),
        nodeName: 'EconomyVision',
      });

      let shopVisionEvents: GoldenSpatulaKnowledgeEvent[] = [];
      try {
        const shopVisionResult = await recognizeGoldenSpatulaShopFromDataUrl(cachedImage, {
          championAssets: assistantData?.championAssets.data,
          basePath,
          level: result.level,
          shopOdds: result.shopOdds,
        });
        shopVisionEvents = buildShopVisionKnowledgeEvents(shopVisionResult, t);
      } catch (error) {
        console.warn('Shop vision recognition failed:', error);
      }

      const selectedAugmentVisionAssetsAvailable = hasGoldenSpatulaAugmentVisionAssets(
        assistantData?.augmentAssets.data,
      );
      const selectedAugmentScreenshotAvailable = cachedImage.startsWith('data:image/');
      const selectedAugmentChoiceScreenBusy =
        augmentPresence.visible || augmentScanState.active || augmentOcrSubmitting;
      const selectedAugmentBaseScanAllowed =
        selectedAugmentVisionEnabled &&
        selectedAugmentVisionAssetsAvailable &&
        selectedAugmentScreenshotAvailable &&
        !selectedAugmentChoiceScreenBusy;
      if (selectedAugmentBaseScanAllowed) {
        const matchedSelectedAugmentCount = Object.values(
          knowledgeScanState.selectedAugments ?? {},
        ).filter((augment) => augment.confidence === 'matched').length;
        const selectedAugmentCheckInterval = getSelectedAugmentCheckIntervalMs(
          result.round,
          matchedSelectedAugmentCount,
        );
        const selectedAugmentMaxSlots = getSelectedAugmentMaxScanSlots(
          result.round,
          matchedSelectedAugmentCount,
        );
        const selectedAugmentScanAvailable = isSelectedAugmentScanAvailable(
          result.round,
          matchedSelectedAugmentCount,
        );
        const expectedSelectedAugmentCount = getExpectedSelectedAugmentCountForRound(result.round);
        const selectedAugmentNeedsMoreMatches =
          expectedSelectedAugmentCount > 0
            ? matchedSelectedAugmentCount < expectedSelectedAugmentCount
            : matchedSelectedAugmentCount < 4;
        const selectedAugmentRecentlyWokenByChoice =
          timestamp - augmentChoiceVisibleLastSeenAtRef.current <=
          selectedAugmentPostChoiceWakeWindowMs;
        const selectedAugmentScheduledScanDue =
          timestamp - selectedAugmentVisionLastRunAtRef.current >= selectedAugmentCheckInterval;
        const selectedAugmentChoiceWakeIntervalDue =
          timestamp - selectedAugmentVisionLastRunAtRef.current >=
          selectedAugmentChoiceWakeMinIntervalMs;
        const selectedAugmentChoiceWakeScanDue =
          selectedAugmentRecentlyWokenByChoice &&
          selectedAugmentNeedsMoreMatches &&
          selectedAugmentChoiceWakeIntervalDue;
        const selectedAugmentFastMode =
          !showToast &&
          !selectedAugmentChoiceWakeScanDue &&
          !isLikelySelectedAugmentUpdateWindow(result.round);
        const selectedAugmentBackoffActive =
          !showToast &&
          !selectedAugmentChoiceWakeScanDue &&
          timestamp < selectedAugmentVisionBackoffUntilRef.current;
        const shouldCheckSelectedAugments =
          showToast ||
          (!selectedAugmentBackoffActive &&
            !selectedAugmentVisionRunningRef.current &&
            (selectedAugmentChoiceWakeScanDue ||
              (selectedAugmentScanAvailable && selectedAugmentScheduledScanDue)));
        if (shouldCheckSelectedAugments) {
          selectedAugmentVisionLastRunAtRef.current = timestamp;
          void runSelectedAugmentVisionScan(
            cachedImage,
            selectedAugmentMaxSlots,
            selectedAugmentFastMode,
            showToast,
            {
              expectedCount: expectedSelectedAugmentCount,
              knownMatchedCount: matchedSelectedAugmentCount,
              allowActiveProbe:
                selectedAugmentNeedsMoreMatches &&
                !isSelectedAugmentProbeBlockingSpecialEvent(specialEventLogStateRef.current),
            },
          );
        }
      }

      setEconomyRunState((previous) =>
        events.reduce<GoldenSpatulaEconomyRunState>(
          (state, event) => mergeEconomyEvent(state, event),
          {
            ...previous,
            active: true,
            updatedAt: startedAt,
          },
        ),
      );
      const knowledgeEvents = [...shopVisionEvents];
      if (knowledgeEvents.length > 0) {
        setKnowledgeScanState((previous) =>
          knowledgeEvents.reduce<GoldenSpatulaKnowledgeScanState>(
            (state, event) => mergeKnowledgeEvent(state, event),
            previous,
          ),
        );
      }

      if (showToast) {
        toast.success(t('goldenSpatula.lineups.economyOcrStarted'));
      }
    } catch (error) {
      setEconomyOcrPolling(false);
      setAugmentOcrPolling(false);
      setAugmentPresence({ visible: false, confidence: 0, slots: [] });
      setAugmentScanState(createEmptyAugmentScanState());
      selectedAugmentVisionRunSeqRef.current += 1;
      selectedAugmentVisionRunningRef.current = false;
      selectedAugmentVisionBackoffUntilRef.current = 0;
      selectedAugmentVisionNoPresenceStreakRef.current = 0;
      selectedAugmentVisionMissStreakRef.current = 0;
      selectedAugmentVisionLastImageFingerprintRef.current = '';
      selectedAugmentVisionLastImageAtRef.current = 0;
      selectedAugmentActiveProbeRunningRef.current = false;
      selectedAugmentActiveProbeLastRunAtRef.current = 0;
      setEconomyRunState((previous) => ({ ...previous, active: false, updatedAt: Date.now() }));
      toast.error(
        t('goldenSpatula.lineups.economyOcrFailed', {
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    } finally {
      setEconomyOcrSubmitting(false);
    }
  }

  const runEconomyOcrTask = async () => {
    if (economyOcrPolling) {
      setEconomyOcrPolling(false);
      setAugmentOcrPolling(false);
      setAugmentPresence({ visible: false, confidence: 0, slots: [] });
      setAugmentScanState(createEmptyAugmentScanState());
      selectedAugmentVisionRunSeqRef.current += 1;
      selectedAugmentVisionRunningRef.current = false;
      selectedAugmentVisionBackoffUntilRef.current = 0;
      selectedAugmentVisionNoPresenceStreakRef.current = 0;
      selectedAugmentVisionMissStreakRef.current = 0;
      selectedAugmentVisionLastImageFingerprintRef.current = '';
      selectedAugmentVisionLastImageAtRef.current = 0;
      selectedAugmentActiveProbeRunningRef.current = false;
      selectedAugmentActiveProbeLastRunAtRef.current = 0;
      toast.success(t('goldenSpatula.lineups.economyOcrStopped'));
      return;
    }

    if (economyOcrDisabledReason || !activeInstanceId) {
      if (economyOcrDisabledReason) {
        toast.error(economyOcrDisabledReason);
      }
      return;
    }

    setEconomyOcrPolling(true);
    setAugmentOcrPolling(augmentOcrExperimentalEnabled);
    await submitEconomyOcrTask(true);
    augmentPresenceLastCheckAtRef.current = Date.now();
    if (augmentOcrExperimentalEnabled) {
      await checkAugmentPresenceAndMaybeOcr(false);
    }
  };

  async function submitAugmentOcrTask(
    showToast: boolean,
    preparedImage?: string,
    preparedPresence?: GoldenSpatulaAugmentPresenceResult,
    preparedScreenshot?: HTMLImageElement,
    preparedScreenshotLoadMs = 0,
  ) {
    if (augmentOcrDisabledReason || !activeInstanceId) {
      if (showToast && augmentOcrDisabledReason) {
        toast.error(augmentOcrDisabledReason);
      }
      return;
    }

    try {
      setAugmentOcrSubmitting(true);
      const startedAt = Date.now();
      setAugmentScanState((previous) => ({
        ...(augmentPresence.visible ? previous : createEmptyAugmentScanState()),
        active: true,
        startedAt,
        updatedAt: startedAt,
      }));

      let image = preparedImage ?? (await maaService.getCachedImage(activeInstanceId));
      if (!preparedImage && !image.startsWith('data:image/')) {
        await maaService.postScreencap(activeInstanceId).catch(() => 0);
        await new Promise((resolve) => window.setTimeout(resolve, 120));
        image = await maaService.getCachedImage(activeInstanceId);
      }

      let screenshot = preparedScreenshot;
      let screenshotLoadMs = Math.max(0, preparedScreenshotLoadMs);
      if (!preparedPresence && !screenshot && image.startsWith('data:image/')) {
        const loadedScreenshot = await loadGoldenSpatulaAugmentPresenceImage(image);
        screenshot = loadedScreenshot.image;
        screenshotLoadMs = loadedScreenshot.loadMs;
      }

      const presence =
        preparedPresence ??
        (screenshot
          ? detectGoldenSpatulaAugmentPresenceFromLoadedImage(screenshot, screenshotLoadMs)
          : await detectGoldenSpatulaAugmentPresenceFromDataUrl(image));
      if (presence.visible) augmentChoiceVisibleLastSeenAtRef.current = Date.now();
      if (presence.metrics) {
        console.info('Golden Spatula augment presence metrics:', presence.metrics);
      }
      setAugmentPresence(presence);
      if (!presence.visible) {
        setAugmentScanState(createEmptyAugmentScanState());
        if (showToast) toast.info(t('goldenSpatula.lineups.augmentPresenceMissing'));
        return;
      }

      const choiceVisionOptions = {
        augmentAssets: assistantData?.augmentAssets.data,
        basePath,
      };
      const result = screenshot
        ? await recognizeGoldenSpatulaAugmentChoicesFromImageElement(
            screenshot,
            choiceVisionOptions,
            { screenshotLoadMs },
          )
        : await recognizeGoldenSpatulaAugmentChoicesFromDataUrl(image, choiceVisionOptions);
      console.info('Golden Spatula augment choice vision metrics:', result.metrics);
      setAugmentScanState(buildAugmentChoiceVisionScanState(result, t));
      if (showToast) toast.success(t('goldenSpatula.lineups.augmentOcrStarted'));
    } catch (error) {
      setAugmentScanState((previous) => ({ ...previous, active: false, updatedAt: Date.now() }));
      toast.error(
        t('goldenSpatula.lineups.augmentOcrFailed', {
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    } finally {
      setAugmentOcrSubmitting(false);
    }
  }

  async function checkAugmentPresenceAndMaybeOcr(showToast: boolean) {
    if (augmentPresenceCheckingRef.current || !activeInstanceId) return;
    if (augmentOcrDisabledReason) {
      if (showToast) toast.error(augmentOcrDisabledReason);
      return;
    }

    try {
      augmentPresenceCheckingRef.current = true;
      const image = await maaService.getCachedImage(activeInstanceId);
      let screenshot: HTMLImageElement | undefined;
      let presence: GoldenSpatulaAugmentPresenceResult;
      if (image.startsWith('data:image/')) {
        const loadedScreenshot = await loadGoldenSpatulaAugmentPresenceImage(image);
        screenshot = loadedScreenshot.image;
        presence = detectGoldenSpatulaAugmentPresenceFromLoadedImage(
          screenshot,
          loadedScreenshot.loadMs,
        );
      } else {
        presence = await detectGoldenSpatulaAugmentPresenceFromDataUrl(image);
      }
      if (presence.metrics && (presence.visible || presence.metrics.totalMs > 30)) {
        console.info('Golden Spatula augment presence metrics:', presence.metrics);
      }
      if (presence.visible) augmentChoiceVisibleLastSeenAtRef.current = Date.now();
      setAugmentPresence(presence);

      if (!presence.visible) {
        if (!augmentScanState.active) setAugmentScanState(createEmptyAugmentScanState());
        if (showToast) toast.info(t('goldenSpatula.lineups.augmentPresenceMissing'));
        return;
      }

      if (!augmentOcrSubmitting && !augmentScanState.active) {
        await submitAugmentOcrTask(
          showToast,
          image,
          presence,
          screenshot,
          presence.metrics?.screenshotLoadMs,
        );
      }
    } catch (error) {
      if (showToast) {
        toast.error(
          t('goldenSpatula.lineups.augmentPresenceFailed', {
            error: error instanceof Error ? error.message : String(error),
          }),
        );
      }
    } finally {
      augmentPresenceCheckingRef.current = false;
    }
  }

  const runAutoPickAugmentTask = async () => {
    const bestOption = augmentDecision.bestOption;
    if (augmentPickDisabledReason || !activeInstanceId || !bestOption) {
      if (augmentPickDisabledReason) {
        toast.error(augmentPickDisabledReason);
      }
      return;
    }
    if (!(await ensureActiveResourceLoaded(true))) return;

    try {
      setAugmentPickSubmitting(true);
      setAugmentScanState((previous) => ({
        ...previous,
        active: true,
        updatedAt: Date.now(),
      }));
      const pipelineOverride = buildAutoPickAugmentPipelineOverride(bestOption.slotIndex, {
        title: bestOption.titleText,
        matchedName: bestOption.matchedAsset?.name,
        score: bestOption.score,
      });
      const maaTaskId = await maaService.runTask(
        activeInstanceId,
        autoPickAugmentEntry,
        pipelineOverride,
      );

      registerTaskIdName(
        maaTaskId,
        t('goldenSpatula.lineups.augmentPickTaskName', {
          slot: bestOption.slotLabel || bestOption.slotIndex,
        }),
      );
      updateInstance(activeInstanceId, { isRunning: true });
      setInstanceTaskStatus(activeInstanceId, 'Running');
      toast.success(
        t('goldenSpatula.lineups.augmentPickStarted', {
          slot: bestOption.slotLabel || bestOption.slotIndex,
          name: bestOption.matchedAsset?.name || bestOption.titleText,
        }),
      );
    } catch (error) {
      setAugmentScanState((previous) => ({ ...previous, active: false, updatedAt: Date.now() }));
      toast.error(
        t('goldenSpatula.lineups.augmentPickFailed', {
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    } finally {
      setAugmentPickSubmitting(false);
    }
  };

  const runAutoDecisionOnce = async (mode: Exclude<AutoDecisionMode, 'off'>) => {
    const setupDisabledReason =
      mode === 'roll' ? autoDecisionRollSetupDisabledReason : autoDecisionLevelSetupDisabledReason;
    if (setupDisabledReason || !activeInstanceId || activeInstance?.isRunning) return;

    const taskName = mode === 'roll' ? autoRollTaskByCount[1] : autoBuyExperienceTaskByCount[1];
    if (!taskName) return;
    if (!(await ensureActiveResourceLoaded(false))) return;

    try {
      setAutoDecisionSubmitting(true);
      const startedAt = Date.now();
      if (mode === 'level') {
        setXpRunState({
          active: true,
          current: 0,
          total: 1,
          startedAt,
          updatedAt: startedAt,
          events: [],
        });
      }

      const maaTaskId = await maaService.runTask(activeInstanceId, taskName);
      if (mode === 'roll') {
        setEconomyRunState((previous) => ({
          ...previous,
          gold:
            previous.gold !== undefined
              ? Math.max(0, previous.gold - autoDecisionRollCost)
              : previous.gold,
          estimatedGoldDelta: previous.estimatedGoldDelta - autoDecisionRollCost,
          refreshGold: previous.refreshGold + autoDecisionRollCost,
          updatedAt: startedAt,
        }));
      }

      registerTaskIdName(
        maaTaskId,
        t('goldenSpatula.lineups.autoDecisionTaskName', {
          action: t(`goldenSpatula.lineups.autoDecisionMode.${mode}`),
        }),
      );
      updateInstance(activeInstanceId, { isRunning: true });
      setInstanceTaskStatus(activeInstanceId, 'Running');
    } catch (error) {
      setAutoDecisionMode('off');
      autoDecisionFirstDelayRef.current = true;
      if (mode === 'level') {
        setXpRunState((previous) => ({ ...previous, active: false, updatedAt: Date.now() }));
      }
      toast.error(
        t('goldenSpatula.lineups.autoDecisionTaskFailed', {
          action: t(`goldenSpatula.lineups.autoDecisionMode.${mode}`),
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    } finally {
      setAutoDecisionSubmitting(false);
    }
  };

  const runDecisionAutoCaptureTask = async () => {
    if (decisionAutoCaptureSetupDisabledReason) {
      toast.error(decisionAutoCaptureSetupDisabledReason);
      return;
    }
    if (!activeInstanceId || !activeVariant || !decisionPlan) return;

    const advice = decisionPlan.economyAdvice;
    const action = advice.action;
    const actionText = t(`goldenSpatula.lineups.decisionEconomyAction.${action}`);
    if (action === 'save' || action === 'hold') {
      toast.info(
        t('goldenSpatula.lineups.decisionAutoCaptureSkipped', {
          action: actionText,
        }),
      );
      return;
    }
    if (!(await ensureActiveResourceLoaded(true))) return;

    const taskEntry = action === 'level' ? autoLevelRollBuyEntry : autoRollBuyEntry;
    if (!projectInterface?.task.some((task) => task.name === taskEntry)) {
      toast.error(
        action === 'level'
          ? t('goldenSpatula.lineups.autoLevelRollBuyTaskMissing')
          : t('goldenSpatula.lineups.autoRollBuyTaskMissing'),
      );
      return;
    }

    const targets = collectGoldenSpatulaDecisionRollTargetTemplates({
      variant: activeVariant,
      championAssets: assistantData?.championAssets.data,
      decisionPlan,
      maxTargets: 8,
    });
    if (targets.length === 0) {
      toast.error(t('goldenSpatula.lineups.decisionAutoCaptureNoTargets'));
      return;
    }

    const rollCount = clampAutoRollCount(advice.recommendedRollCount, 1);
    const xpRaw = advice.recommendedXpPurchaseCount;
    const xpCount =
      action === 'level'
        ? xpRaw !== undefined && xpRaw > 0
          ? clampAutoRollCount(xpRaw, 1)
          : undefined
        : undefined;
    if (action === 'level' && xpCount === undefined) {
      toast.error(t('goldenSpatula.lineups.decisionAutoCaptureNeedXpInfo'));
      return;
    }

    const targetNames =
      decisionPlan.recommendedRollTargetNames.length > 0
        ? decisionPlan.recommendedRollTargetNames
        : targets.map((target) => target.name);
    const startedAt = Date.now();
    const pipelineOverride =
      action === 'level'
        ? buildAutoLevelRollBuyPipelineOverride(targets, rollCount, xpCount!)
        : buildAutoRollBuyPipelineOverride(targets, rollCount);

    try {
      setAutoDecisionSubmitting(true);
      setAutoDecisionMode('off');
      autoDecisionFirstDelayRef.current = true;
      updateActiveVariant({ rollTargetNames: targetNames });
      setRollRunState({
        active: true,
        targetNames,
        rollCount,
        currentCycle: 0,
        totalCycles: rollCount + 1,
        startedAt,
        updatedAt: startedAt,
        events: [],
      });
      if (action === 'level') {
        setXpRunState({
          active: true,
          current: 0,
          total: xpCount!,
          startedAt,
          updatedAt: startedAt,
          events: [],
        });
      }

      const maaTaskId = await maaService.runTask(activeInstanceId, taskEntry, pipelineOverride);
      registerTaskIdName(
        maaTaskId,
        action === 'level'
          ? t('goldenSpatula.lineups.autoLevelRollBuyTaskName', {
              xp: xpCount,
              roll: rollCount,
            })
          : t('goldenSpatula.lineups.autoRollBuyTaskName', {
              count: rollCount,
            }),
      );
      updateInstance(activeInstanceId, { isRunning: true });
      setInstanceTaskStatus(activeInstanceId, 'Running');
      toast.success(
        t('goldenSpatula.lineups.decisionAutoCaptureStarted', {
          action: actionText,
          roll: rollCount,
          xp: xpCount ?? 0,
          targets: targetNames.join(', '),
        }),
      );
    } catch (error) {
      setRollRunState((previous) => ({ ...previous, active: false, updatedAt: Date.now() }));
      if (action === 'level') {
        setXpRunState((previous) => ({ ...previous, active: false, updatedAt: Date.now() }));
      }
      toast.error(
        t('goldenSpatula.lineups.decisionAutoCaptureFailed', {
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    } finally {
      setAutoDecisionSubmitting(false);
    }
  };

  const toggleRollTarget = (unitName: string) => {
    if (!activeLineup || !activeVariant) return;

    const currentNames = getActiveRollTargetNames(activeVariant);
    const normalized = normalizeSearchText(unitName);
    const exists = currentNames.some((name) => normalizeSearchText(name) === normalized);
    const nextNames = exists
      ? currentNames.filter((name) => normalizeSearchText(name) !== normalized)
      : [...currentNames, unitName];

    updateActiveVariant({ rollTargetNames: nextNames });
  };

  const selectAutoDecisionMode = (mode: Exclude<AutoDecisionMode, 'off'>) => {
    const setupDisabledReason =
      mode === 'roll' ? autoDecisionRollSetupDisabledReason : autoDecisionLevelSetupDisabledReason;
    const nextMode: AutoDecisionMode = autoDecisionMode === mode ? 'off' : mode;
    if (nextMode !== 'off' && setupDisabledReason) {
      toast.error(setupDisabledReason);
      return;
    }

    autoDecisionFirstDelayRef.current = true;
    setAutoDecisionMode(nextMode);
    if (nextMode === 'off') return;

    if (!economyOcrPolling) setEconomyOcrPolling(true);
    if (!economyOcrSubmitting && !economyOcrDisabledReason) {
      void submitEconomyOcrTask(false);
    }
  };

  useEffect(() => {
    if (autoDecisionTimerRef.current !== null) {
      window.clearTimeout(autoDecisionTimerRef.current);
      autoDecisionTimerRef.current = null;
    }

    if (autoDecisionMode === 'off') {
      autoDecisionFirstDelayRef.current = true;
      return;
    }

    if (autoDecisionBlockedReason || !autoDecisionCanSpend) {
      if (!autoDecisionCanSpend) autoDecisionFirstDelayRef.current = true;
      return;
    }

    const mode = autoDecisionMode;
    const delay = autoDecisionFirstDelayRef.current
      ? autoDecisionInitialDelayMs
      : autoDecisionRepeatDelayMs;
    autoDecisionTimerRef.current = window.setTimeout(() => {
      autoDecisionTimerRef.current = null;
      autoDecisionFirstDelayRef.current = false;
      void runAutoDecisionOnce(mode);
    }, delay);

    return () => {
      if (autoDecisionTimerRef.current !== null) {
        window.clearTimeout(autoDecisionTimerRef.current);
        autoDecisionTimerRef.current = null;
      }
    };
  }, [
    autoDecisionBlockedReason,
    autoDecisionCanSpend,
    autoDecisionGold,
    autoDecisionMode,
    autoDecisionRequiredGold,
  ]);

  const autoDecisionModeText =
    autoDecisionMode === 'off'
      ? t('goldenSpatula.lineups.autoDecisionMode.off')
      : t(`goldenSpatula.lineups.autoDecisionMode.${autoDecisionMode}`);
  const autoDecisionStatusText =
    autoDecisionMode === 'off'
      ? t('goldenSpatula.lineups.autoDecisionIdle')
      : autoDecisionBlockedReason
        ? autoDecisionBlockedReason
        : autoDecisionGold === undefined
          ? t('goldenSpatula.lineups.autoDecisionWaitingGold')
          : autoDecisionCanSpend
            ? t('goldenSpatula.lineups.autoDecisionReady', {
                gold: autoDecisionGold,
                reserve: autoDecisionReserveGold,
                available: Math.max(0, autoDecisionAvailableGold ?? 0),
                cost: autoDecisionActionCost ?? 0,
                first: autoDecisionInitialDelayMs / 1000,
                repeat: autoDecisionRepeatDelayMs / 1000,
              })
            : t('goldenSpatula.lineups.autoDecisionHold', {
                gold: autoDecisionGold,
                reserve: autoDecisionReserveGold,
                required: autoDecisionRequiredGold,
                missing: Math.max(0, autoDecisionRequiredGold - autoDecisionGold),
              });

  const activeLineupStrategyPanel =
    activeLineup && activeVariant ? (
      <div className="space-y-1.5 rounded-lg border border-border/45 bg-bg-secondary/20 p-1.5 ring-1 ring-inset ring-border/20">
        <div className="flex items-center gap-1">
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-bg-primary/80 text-text-muted ring-1 ring-inset ring-border/35">
            <Pencil className="h-3.5 w-3.5" />
          </span>
          <input
            value={activeLineup.name}
            onChange={(event) => updateManagedLineup(activeLineup.id, { name: event.target.value })}
            className="h-7 min-w-0 flex-1 rounded-full border border-border/55 bg-bg-primary/75 px-3 text-[12px] font-black text-text-primary outline-none transition-colors focus:border-accent focus:bg-bg-primary"
          />
          <button
            type="button"
            onClick={() => duplicateManagedLineup(activeLineup)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/55 bg-bg-primary/65 text-text-secondary transition-colors hover:border-accent hover:text-accent"
            title={t('goldenSpatula.lineups.duplicate')}
          >
            <CopyPlus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => removeManagedLineup(activeLineup.id)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/55 bg-bg-primary/65 text-text-secondary transition-colors hover:border-error/60 hover:text-error"
            title={t('goldenSpatula.lineups.delete')}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <details className="group relative shrink-0">
            <summary
              className="inline-flex h-7 cursor-pointer list-none items-center justify-center gap-1 rounded-full border border-border/55 bg-bg-primary/65 px-2 text-[10px] font-black text-text-secondary transition-colors hover:border-accent hover:text-accent [&::-webkit-details-marker]:hidden"
              title={t('goldenSpatula.lineups.advancedActions')}
            >
              <Clipboard className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden truncate xl:inline">
                {t('goldenSpatula.lineups.advancedActions')}
              </span>
            </summary>
            <div className="absolute right-0 top-8 z-30 w-[min(24rem,calc(100vw-2rem))] space-y-1 rounded-xl border border-border/55 bg-bg-primary/95 p-1.5 shadow-xl ring-1 ring-border/35">
              <input
                value={activeVariant.name}
                onChange={(event) => updateActiveVariant({ name: event.target.value })}
                className="h-7 w-full rounded-full border border-border/60 bg-bg-secondary/70 px-3 text-[11px] font-semibold text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent focus:bg-bg-primary"
                placeholder={t('goldenSpatula.lineups.variantName')}
              />

              <textarea
                value={activeVariant.code}
                onChange={(event) => updateActiveVariant({ code: event.target.value })}
                rows={2}
                className="w-full resize-none rounded-lg border border-border/60 bg-bg-secondary/70 px-2.5 py-1.5 text-[11px] leading-4 text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent focus:bg-bg-primary"
                placeholder={t('goldenSpatula.lineups.codePlaceholder')}
              />

              <div className="grid grid-cols-3 gap-1">
                <button
                  type="button"
                  disabled={!activeVariant.code}
                  onClick={() => copyLineupCode(activeVariant.id, activeVariant.code)}
                  className="inline-flex h-7 min-w-0 items-center justify-center gap-1 rounded-full border border-border/60 bg-bg-secondary/80 px-2 text-[10px] font-bold text-text-secondary transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Copy className="h-3 w-3 shrink-0" />
                  <span className="truncate">
                    {copiedCode === activeVariant.id
                      ? t('goldenSpatula.strategy.copied')
                      : t('goldenSpatula.lineups.copyCode')}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    copyText(
                      exportGoldenSpatulaLineups([activeLineup]),
                      'goldenSpatula.lineups.exportSuccess',
                    )
                  }
                  className="inline-flex h-7 min-w-0 items-center justify-center gap-1 rounded-full border border-border/60 bg-bg-secondary/80 px-2 text-[10px] font-bold text-text-secondary transition-colors hover:border-accent hover:text-accent"
                >
                  <Download className="h-3 w-3 shrink-0" />
                  <span className="truncate">{t('goldenSpatula.lineups.exportOne')}</span>
                </button>
                <button
                  type="button"
                  disabled={Boolean(taskConfigDisabledReason)}
                  onClick={applyTaskConfig}
                  className="inline-flex h-7 min-w-0 items-center justify-center gap-1 rounded-full border border-border/60 bg-bg-secondary/80 px-2 text-[10px] font-bold text-text-secondary transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
                  title={taskConfigDisabledReason}
                >
                  <ListChecks className="h-3 w-3 shrink-0" />
                  <span className="truncate">{t('goldenSpatula.lineups.applyTasks')}</span>
                </button>
              </div>

              {activeVariant.sourceUrl && (
                <a
                  className="inline-flex max-w-full truncate rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold text-accent hover:underline"
                  href={activeVariant.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  title={activeVariant.sourceUrl}
                >
                  {t('goldenSpatula.lineups.sourceLink')}
                </a>
              )}
            </div>
          </details>
        </div>

        {visibleActiveVariants.length > 1 && (
          <div
            className={clsx(
              'grid rounded-full bg-bg-primary/55 p-0.5 ring-1 ring-inset ring-border/35',
              visibleActiveVariants.length === 2 ? 'grid-cols-2' : 'grid-cols-3',
            )}
          >
            {visibleActiveVariants.map((variant) => {
              const selected = activeVariant.id === variant.id;
              return (
                <button
                  key={variant.id}
                  type="button"
                  onClick={() => setLineupManager(managedLineups, activeLineup.id, variant.id)}
                  className={clsx(
                    'rounded-full px-2 py-0.5 text-[11px] font-black transition-colors',
                    selected
                      ? 'bg-accent/10 text-accent shadow-sm ring-1 ring-inset ring-accent/25'
                      : 'text-text-muted hover:text-text-primary',
                  )}
                >
                  {variantNames[variant.slot]}
                </button>
              );
            })}
          </div>
        )}

        <LineupCompositionSummary
          name={formatLineupDisplayName(activeVariant.name || activeLineup.name)}
          variant={activeVariant}
          sourceKind={activeLineup.source?.kind}
          version={activeLineup.source?.version}
          championAssets={assistantData?.championAssets.data}
          traitAssets={assistantData?.traitAssets.data}
          itemAssets={assistantData?.itemAssets.data}
          basePath={basePath}
          t={t}
          compact
          selected
        />

        <AugmentRecommendationTierBoard
          recommendations={activeVariant.augmentRecommendations?.details ?? []}
          augmentAssets={assistantData?.augmentAssets.data}
          basePath={basePath}
          t={t}
        />

        <div className="space-y-1 rounded-lg bg-bg-primary/35 p-1.5 ring-1 ring-inset ring-border/30">
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <SectionTitle icon={Route} label={t('goldenSpatula.lineups.autoDecisionPanel')} />
            <StatusPill tone={autoDecisionMode === 'off' ? 'muted' : 'success'}>
              {autoDecisionModeText}
            </StatusPill>
          </div>

          <div className="grid gap-1 md:grid-cols-[minmax(0,1fr)_minmax(12rem,0.72fr)]">
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-black uppercase tracking-wide text-text-muted">
                  {t('goldenSpatula.lineups.autoDecisionInterest')}
                </span>
                <span className="rounded-full bg-bg-secondary px-1.5 py-px text-[10px] font-bold text-text-muted ring-1 ring-inset ring-border/30">
                  {t('goldenSpatula.lineups.autoDecisionReserveGold', {
                    gold: autoDecisionReserveGold,
                  })}
                </span>
              </div>
              <div className="grid grid-cols-10 rounded-full bg-bg-secondary/70 p-0.5 ring-1 ring-inset ring-border/30">
                {autoRollCounts.map((count) => {
                  const selected = autoDecisionInterestTarget === count;
                  return (
                    <button
                      key={count}
                      type="button"
                      onClick={() => {
                        setAutoDecisionInterestTarget(count);
                        autoDecisionFirstDelayRef.current = true;
                      }}
                      className={clsx(
                        'h-6 rounded-full px-0.5 text-[10px] font-black transition-colors',
                        selected
                          ? 'bg-accent/10 text-accent shadow-sm ring-1 ring-inset ring-accent/25'
                          : 'text-text-muted hover:text-text-primary',
                      )}
                    >
                      {t('goldenSpatula.lineups.autoDecisionInterestCount', { count })}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1">
              <span className="block text-[10px] font-black uppercase tracking-wide text-text-muted">
                {t('goldenSpatula.lineups.autoDecisionAction')}
              </span>
              <div className="grid grid-cols-2 gap-1">
                {(['roll', 'level'] as const).map((mode) => {
                  const selected = autoDecisionMode === mode;
                  const setupDisabledReason =
                    mode === 'roll'
                      ? autoDecisionRollSetupDisabledReason
                      : autoDecisionLevelSetupDisabledReason;
                  return (
                    <button
                      key={mode}
                      type="button"
                      disabled={!selected && Boolean(setupDisabledReason)}
                      onClick={() => selectAutoDecisionMode(mode)}
                      className={clsx(
                        'inline-flex h-8 min-w-0 items-center justify-center gap-1 rounded-full border px-2 text-[10px] font-black transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                        selected
                          ? 'border-accent/45 bg-accent/10 text-accent shadow-sm ring-1 ring-inset ring-accent/20'
                          : 'border-border/60 bg-bg-secondary/80 text-text-secondary hover:border-accent hover:text-accent',
                      )}
                      title={setupDisabledReason}
                    >
                      {mode === 'roll' ? (
                        <ShoppingCart className="h-3 w-3 shrink-0" />
                      ) : (
                        <Sparkles className="h-3 w-3 shrink-0" />
                      )}
                      <span className="truncate">
                        {t(`goldenSpatula.lineups.autoDecisionMode.${mode}`)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-bg-secondary/45 px-2 py-1 text-[10px] font-semibold leading-relaxed text-text-muted ring-1 ring-inset ring-border/25">
            {autoDecisionStatusText}
          </div>
        </div>

        <div className="space-y-1.5 rounded-lg bg-bg-secondary/20 p-1.5 ring-1 ring-inset ring-border/25">
          <div className="flex flex-wrap items-center gap-1.5">
            <SectionTitle icon={Target} label={t('goldenSpatula.lineups.targetD')} />
            <span
              className="inline-flex min-w-0 max-w-full items-center rounded-full bg-bg-hover px-1.5 py-px text-[10px] font-semibold leading-4 text-text-secondary ring-1 ring-inset ring-border/70"
              title={`${t('goldenSpatula.lineups.economyShopOdds')}: ${shopOddsSummary}`}
            >
              <span className="shrink-0">{t('goldenSpatula.lineups.economyShopOdds')}</span>
              <span className="ml-1 truncate font-black text-text-primary">{shopOddsSummary}</span>
            </span>
            {economyRunState.shopOddsSource && (
              <StatusPill tone="muted">
                {t(`goldenSpatula.lineups.economyShopOddsSource.${economyRunState.shopOddsSource}`)}
              </StatusPill>
            )}
          </div>
          <ShopObservationGrid
            shopSlots={knowledgeScanState.shopSlots}
            championAssets={assistantData?.championAssets.data}
            basePath={basePath}
            t={t}
          />
          {decisionPlan && (
            <DecisionPlanPanel
              plan={decisionPlan}
              championAssets={assistantData?.championAssets.data}
              itemAssets={assistantData?.itemAssets.data}
              basePath={basePath}
              shopOdds={economyRunState.shopOdds}
              shopOddsSource={economyRunState.shopOddsSource}
              activeTargetNames={getActiveRollTargetNames(activeVariant)}
              onToggleTarget={toggleRollTarget}
              onAutoCapture={runDecisionAutoCaptureTask}
              t={t}
            />
          )}
          <LineupTargetList
            variant={activeVariant}
            championAssets={assistantData?.championAssets.data}
            basePath={basePath}
            onToggleTarget={toggleRollTarget}
            t={t}
          />
          <SpecialEventPanel
            augmentPresence={augmentPresence}
            decision={augmentDecision}
            scanState={augmentScanState}
            detecting={augmentOcrSubmitting || augmentScanState.active}
            polling={augmentOcrPolling}
            picking={augmentPickSubmitting}
            pickDisabledReason={augmentPickDisabledReason}
            onPick={runAutoPickAugmentTask}
            basePath={basePath}
            t={t}
          />
        </div>

        <details className="rounded-lg bg-bg-primary/35 px-1.5 py-1 ring-1 ring-inset ring-border/30">
          <summary className="inline-flex cursor-pointer list-none items-center rounded-full bg-bg-secondary/80 px-2 py-px text-[10px] font-black uppercase tracking-wide text-text-secondary ring-1 ring-inset ring-border/30 transition-colors hover:text-accent [&::-webkit-details-marker]:hidden">
            {t('goldenSpatula.lineups.details')}
          </summary>
          <div className="mt-1.5 space-y-1 border-t border-border/30 pt-1.5">
            <LineupBattleBoard
              variant={activeVariant}
              championAssets={assistantData?.championAssets.data}
              itemAssets={assistantData?.itemAssets.data}
              basePath={basePath}
              t={t}
            />
            <LineupVisualDetails
              variant={activeVariant}
              championAssets={assistantData?.championAssets.data}
              itemAssets={assistantData?.itemAssets.data}
              basePath={basePath}
              t={t}
            />
          </div>
        </details>
      </div>
    ) : (
      <div className="rounded-full bg-bg-primary/50 px-3 py-1 text-[11px] font-bold text-text-muted ring-1 ring-inset ring-border/30">
        {managedLineups.length === 0
          ? t('goldenSpatula.lineups.empty')
          : t('goldenSpatula.lineups.noData')}
      </div>
    );

  const recommendedPicker = recommendedPickerOpen ? (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-3"
      role="presentation"
      onClick={() => setRecommendedPickerOpen(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('goldenSpatula.lineups.recommendedPickerTitle')}
        className="flex max-h-[86vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-bg-primary/95 shadow-xl ring-1 ring-border/45"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-1.5 border-b border-border/40 px-1.5 py-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <Database className="h-3 w-3 shrink-0 text-accent" />
            <div className="truncate text-[11px] font-black uppercase tracking-wide text-text-primary">
              {t('goldenSpatula.lineups.recommendedPickerTitle')}
            </div>
            <span
              className="hidden h-5 shrink-0 items-center gap-1 rounded-full bg-bg-secondary px-1.5 text-[9px] font-black text-text-muted ring-1 ring-inset ring-border/30 sm:inline-flex"
              title={t('goldenSpatula.lineups.recommendedPickerTitle')}
            >
              <Database className="h-3 w-3" />
              {recommendedData?.lineups.length ?? 0}
            </span>
            <span
              className="hidden h-5 shrink-0 items-center gap-1 rounded-full bg-emerald-500/10 px-1.5 text-[9px] font-black text-emerald-700 ring-1 ring-inset ring-emerald-500/25 dark:text-emerald-200 sm:inline-flex"
              title={t('goldenSpatula.lineups.myLineup')}
            >
              <CheckCircle2 className="h-3 w-3" />
              {savedRecommendedIds.size}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setRecommendedPickerOpen(false)}
            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-bg-hover hover:text-text-primary"
            title={t('common.close')}
            aria-label={t('common.close')}
          >
            <XCircle className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="border-b border-border/40 p-1.5">
          <div className="flex items-center gap-1 rounded-lg bg-bg-secondary/60 p-1 ring-1 ring-inset ring-border/30">
            <span
              className="inline-flex h-6 shrink-0 items-center gap-1 rounded-full bg-bg-primary px-1.5 text-[10px] font-black text-text-secondary ring-1 ring-inset ring-border/30"
              title={t('goldenSpatula.lineups.recommendedPickerTitle')}
            >
              <Database className="h-3 w-3 text-text-muted" />
              {filteredRecommendedLineups.length}/{recommendedData?.lineups.length ?? 0}
            </span>
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-text-muted" />
              <input
                value={recommendedSearch}
                onChange={(event) => setRecommendedSearch(event.target.value)}
                placeholder={t('goldenSpatula.lineups.searchRecommended')}
                className="h-6 w-full rounded-full border border-border/55 bg-bg-primary px-2 pl-6 text-[11px] font-semibold text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent"
              />
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
          {recommendedLoading && (
            <div className="inline-flex items-center gap-1 rounded-full bg-bg-secondary px-2 py-0.5 text-[10px] font-bold text-text-muted ring-1 ring-inset ring-border/30">
              <Loader2 className="h-3 w-3 animate-spin" />
              {t('goldenSpatula.lineups.loadingRecommended')}
            </div>
          )}

          {recommendedError && (
            <div className="rounded-full border border-error/25 bg-error/5 px-2 py-1 text-[10px] font-bold text-text-secondary">
              {t('goldenSpatula.lineups.recommendedFailed', { error: recommendedError })}
            </div>
          )}

          {recommendedData?.index.status !== 'ready' && !recommendedLoading && (
            <div className="rounded-full border border-warning/25 bg-warning/5 px-2 py-1 text-[10px] font-bold text-text-secondary">
              {t('goldenSpatula.lineups.recommendedMissing')}
            </div>
          )}

          {recommendedData?.index.status === 'ready' && (
            <div className="space-y-0.5">
              {filteredRecommendedLineups.map((lineup) => {
                const saved = savedRecommendedIds.has(lineup.id);
                return (
                  <div
                    key={lineup.id}
                    className="grid w-full gap-0.5 lg:grid-cols-[minmax(0,1fr)_28px] lg:items-stretch"
                  >
                    <div className="min-w-0 flex-1">
                      <LineupCompositionSummary
                        name={formatLineupDisplayName(lineup.name)}
                        variant={lineup.variant}
                        sourceKind="recommended"
                        version={lineup.version}
                        championAssets={assistantData?.championAssets.data}
                        traitAssets={assistantData?.traitAssets.data}
                        itemAssets={assistantData?.itemAssets.data}
                        basePath={basePath}
                        t={t}
                        compact
                        selected={saved}
                      />
                    </div>
                    <div className="flex shrink-0 items-center justify-end gap-1 lg:w-7 lg:flex-col">
                      <button
                        type="button"
                        onClick={() => applyRecommendedLineupAndClose(lineup)}
                        className={clsx(
                          'inline-flex h-6 w-full items-center justify-center gap-1 rounded-full border border-border/55 bg-bg-secondary px-2 text-[10px] font-black text-text-secondary transition-colors hover:border-accent hover:text-accent lg:h-full lg:px-0',
                          saved &&
                            'border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200',
                        )}
                        title={
                          saved
                            ? t('goldenSpatula.lineups.switchSaved')
                            : t('goldenSpatula.lineups.applyRecommended')
                        }
                      >
                        {saved ? (
                          <RefreshCw className="h-3 w-3 shrink-0" />
                        ) : (
                          <Import className="h-3 w-3 shrink-0" />
                        )}
                        <span className="truncate lg:hidden">
                          {saved
                            ? t('goldenSpatula.lineups.switchSaved')
                            : t('goldenSpatula.lineups.applyRecommended')}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
              {filteredRecommendedLineups.length === 0 && !recommendedLoading && (
                <div className="rounded-full bg-bg-primary/50 px-3 py-1 text-[11px] font-bold text-text-muted ring-1 ring-inset ring-border/30">
                  {t('goldenSpatula.lineups.searchEmpty')}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  ) : null;

  const templateLabel = (key: GoldenSpatulaTemplateCategory) =>
    t(`goldenSpatula.recognition.categories.${key}`);

  return (
    <div className="overflow-hidden rounded-xl bg-bg-primary/75 ring-1 ring-inset ring-border/45">
      <div className="border-b border-border/45 px-2 py-1.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Bot className="h-3.5 w-3.5 shrink-0 text-accent" />
            <span className="truncate text-xs font-black uppercase tracking-wide text-text-primary">
              {t('goldenSpatula.title')}
            </span>
            <span
              className="hidden h-6 shrink-0 items-center gap-1 rounded-full bg-bg-secondary px-2 text-[10px] font-black text-text-muted ring-1 ring-inset ring-border/35 sm:inline-flex"
              title={t('goldenSpatula.lineups.myLineup')}
            >
              <Database className="h-3 w-3" />
              {managedLineups.length}
            </span>
            <span
              className={clsx(
                'hidden h-6 max-w-[180px] shrink-0 items-center gap-1 rounded-full px-2 text-[10px] font-black ring-1 ring-inset sm:inline-flex',
                activeLineup
                  ? 'bg-accent/10 text-accent ring-accent/25'
                  : 'bg-bg-secondary text-text-muted ring-border/35',
              )}
              title={
                activeLineup
                  ? formatLineupDisplayName(activeLineup.name)
                  : t('goldenSpatula.lineups.empty')
              }
            >
              <Target className="h-3 w-3 shrink-0" />
              <span className="truncate">
                {activeLineup ? formatLineupDisplayName(activeLineup.name) : '-'}
              </span>
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-1.5 p-1.5">
        <div className="flex min-w-0 gap-0.5 overflow-x-auto rounded-lg bg-bg-secondary/60 p-0.5 ring-1 ring-inset ring-border/30">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                aria-pressed={selected}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'flex h-6 min-w-[64px] shrink-0 items-center justify-center gap-1 rounded-full px-1.5 text-[10px] font-black transition-colors',
                  selected
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-text-muted hover:bg-bg-hover hover:text-text-primary',
                )}
              >
                <Icon className="h-3 w-3 shrink-0" />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {dataLoading && (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-bg-secondary px-2 py-1 text-[11px] font-medium text-text-muted ring-1 ring-inset ring-border/35">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {t('goldenSpatula.loading')}
          </div>
        )}

        {dataError && (
          <div className="flex gap-1.5 rounded-xl border border-error/25 bg-error/5 px-2 py-1.5">
            <FileWarning className="mt-0.5 h-3.5 w-3.5 shrink-0 text-error" />
            <div className="text-[11px] leading-relaxed text-text-secondary">
              {t('goldenSpatula.loadFailed', { error: dataError })}
            </div>
          </div>
        )}

        {activeTab === 'lineups' && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1 rounded-lg bg-bg-primary/60 p-1 ring-1 ring-inset ring-border/30">
              <span
                className="inline-flex h-6 shrink-0 items-center gap-1 rounded-full bg-bg-secondary px-1.5 text-[10px] font-black text-text-secondary ring-1 ring-inset ring-border/30"
                title={t('goldenSpatula.lineups.myLineup')}
              >
                <Database className="h-3 w-3 text-text-muted" />
                {filteredLineups.length}/{managedLineups.length}
              </span>
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
                <input
                  value={lineupSearch}
                  onChange={(event) => setLineupSearch(event.target.value)}
                  placeholder={t('goldenSpatula.lineups.searchSaved')}
                  className="h-6 w-full rounded-full border border-border/55 bg-bg-secondary px-2 pl-7 text-[11px] font-semibold text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent"
                />
              </div>
              <button
                type="button"
                onClick={() => setRecommendedPickerOpen(true)}
                className="inline-flex h-6 shrink-0 items-center gap-1 rounded-full border border-border/55 bg-bg-secondary px-1.5 text-[10px] font-black text-text-secondary transition-colors hover:border-accent hover:text-accent xl:px-2"
                title={t('goldenSpatula.lineups.openRecommended')}
              >
                {recommendedLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Database className="h-3 w-3" />
                )}
                <span className="hidden whitespace-nowrap xl:inline">
                  {t('goldenSpatula.lineups.openRecommended')}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setImportPanelOpen((open) => !open)}
                aria-expanded={importPanelOpen}
                className={clsx(
                  'inline-flex h-6 shrink-0 items-center gap-1 rounded-full border px-1.5 text-[10px] font-black transition-colors xl:px-2',
                  importPanelOpen
                    ? 'border-accent/50 bg-accent/10 text-accent'
                    : 'border-border/60 bg-bg-secondary text-text-secondary hover:border-accent hover:text-accent',
                )}
                title={t('goldenSpatula.lineups.import')}
              >
                <ClipboardPaste className="h-3 w-3" />
                <span className="hidden whitespace-nowrap xl:inline">
                  {t('goldenSpatula.lineups.import')}
                </span>
              </button>
              <button
                type="button"
                onClick={addManualLineup}
                className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent text-white transition-colors hover:bg-accent-hover"
                title={t('goldenSpatula.lineups.add')}
              >
                <Plus className="h-3 w-3" />
              </button>
              <button
                type="button"
                disabled={managedLineups.length === 0}
                onClick={() =>
                  copyText(
                    exportGoldenSpatulaLineups(managedLineups),
                    'goldenSpatula.lineups.exportSuccess',
                  )
                }
                className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border/55 bg-bg-secondary text-text-secondary transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
                title={t('goldenSpatula.lineups.exportAll')}
              >
                <Download className="h-3 w-3" />
              </button>
            </div>

            {importPanelOpen && (
              <div className="rounded-lg border border-accent/20 bg-accent/5 p-1 shadow-sm ring-1 ring-inset ring-accent/10">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-text-primary">
                    <ClipboardPaste className="h-3.5 w-3.5 shrink-0 text-accent" />
                    <span className="truncate">{t('goldenSpatula.lineups.import')}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setImportPanelOpen(false)}
                    className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-bg-hover hover:text-text-primary"
                    title={t('common.close')}
                  >
                    <XCircle className="h-3.5 w-3.5" />
                  </button>
                </div>
                <textarea
                  value={importText}
                  onChange={(event) => setImportText(event.target.value)}
                  rows={2}
                  className="w-full resize-none rounded-lg border border-border/45 bg-bg-primary/75 px-2 py-1 text-[11px] leading-4 text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent focus:bg-bg-primary"
                  placeholder={t('goldenSpatula.lineups.importPlaceholder')}
                />
                <div className="mt-1 flex justify-end">
                  <button
                    type="button"
                    onClick={importLineups}
                    className="inline-flex h-6 items-center justify-center gap-1 rounded-full bg-accent px-2.5 text-[10px] font-black text-white transition-colors hover:bg-accent-hover"
                  >
                    <Import className="h-3 w-3" />
                    {t('goldenSpatula.lineups.importAction')}
                  </button>
                </div>
              </div>
            )}

            <div className="max-h-[calc(100vh-14rem)] min-h-56 space-y-0.5 overflow-y-auto pr-0.5">
              {filteredLineups.length > 0 ? (
                filteredLineups.map((lineup) => {
                  const selected = activeLineup?.id === lineup.id;
                  const visibleVariants = getVisibleVariants(
                    lineup,
                    selected ? activeVariant?.id : undefined,
                  );
                  const previewVariant = visibleVariants[0] ?? lineup.variants[0];
                  return (
                    <button
                      key={lineup.id}
                      type="button"
                      onClick={() => selectManagedLineup(lineup)}
                      className={clsx(
                        'w-full rounded-md text-left transition duration-150 active:scale-[0.997] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45',
                        selected
                          ? 'text-text-primary'
                          : 'text-text-secondary hover:shadow-sm dark:hover:brightness-110',
                      )}
                    >
                      {previewVariant && (
                        <LineupCompositionSummary
                          name={formatLineupDisplayName(lineup.name)}
                          variant={previewVariant}
                          sourceKind={lineup.source?.kind}
                          version={lineup.source?.version}
                          championAssets={assistantData?.championAssets.data}
                          traitAssets={assistantData?.traitAssets.data}
                          itemAssets={assistantData?.itemAssets.data}
                          basePath={basePath}
                          t={t}
                          compact
                          selected={selected}
                        />
                      )}
                      {!previewVariant && (
                        <div className="rounded-lg bg-bg-primary/45 px-2 py-1 text-[11px] font-bold text-text-muted ring-1 ring-inset ring-border/30">
                          {formatLineupDisplayName(lineup.name)}
                        </div>
                      )}
                    </button>
                  );
                })
              ) : (
                <div className="rounded-full bg-bg-primary/50 px-3 py-1 text-[11px] font-bold text-text-muted ring-1 ring-inset ring-border/30">
                  {managedLineups.length === 0
                    ? t('goldenSpatula.lineups.empty')
                    : t('goldenSpatula.lineups.searchEmpty')}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'strategy' && (
          <div className="space-y-1.5">
            <EconomyRunStatusPanel
              runState={economyRunState}
              selectedAugments={knowledgeScanState.selectedAugments}
              augmentAssets={assistantData?.augmentAssets.data}
              basePath={basePath}
              detecting={economyOcrSubmitting || economyRunState.active}
              polling={economyOcrPolling}
              detectDisabledReason={economyOcrDisabledReason}
              onDetect={runEconomyOcrTask}
              t={t}
            />
            {activeLineupStrategyPanel}
          </div>
        )}
        {false && (
          <div className="space-y-3">
            {assistantData?.season.status !== 'ready' && (
              <div className="rounded-md bg-warning/5 border border-warning/30 p-2 text-xs text-text-secondary">
                {t('goldenSpatula.strategy.seasonMissing')}
              </div>
            )}
            {assistantData?.strategy.status !== 'ready' && (
              <div className="rounded-md bg-warning/5 border border-warning/30 p-2 text-xs text-text-secondary">
                {t('goldenSpatula.strategy.strategyMissing')}
              </div>
            )}

            {strategy && (
              <>
                <div className="rounded-md bg-bg-tertiary p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-text-primary truncate">
                        {strategy.title}
                      </div>
                      <div className="mt-1 text-[11px] text-text-muted truncate">
                        {[
                          strategy.author &&
                            t('goldenSpatula.strategy.author', { name: strategy.author }),
                          strategy.game_version &&
                            t('goldenSpatula.strategy.version', { version: strategy.game_version }),
                          season?.name &&
                            t('goldenSpatula.strategy.season', { season: season.name }),
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </div>
                    </div>
                    <StatusPill tone="muted">
                      {formatDate(
                        strategy.captured_at || season?.fetched_at,
                        t('goldenSpatula.strategy.unknownDate'),
                      )}
                    </StatusPill>
                  </div>
                  {strategy.source_url && (
                    <a
                      className="mt-2 block truncate text-[11px] text-accent hover:underline"
                      href={strategy.source_url}
                      target="_blank"
                      rel="noreferrer"
                      title={strategy.source_url}
                    >
                      {t('goldenSpatula.strategy.source')}
                    </a>
                  )}
                </div>

                <div>
                  <SectionTitle icon={Sparkles} label={t('goldenSpatula.strategy.mainDecision')} />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(strategy.main_decision?.primary_paths ?? []).map((name) => (
                      <StatusPill key={name} tone="success">
                        {name}
                      </StatusPill>
                    ))}
                    {(strategy.main_decision?.conditional_paths ?? []).map((name) => (
                      <StatusPill key={name} tone="muted">
                        {name}
                      </StatusPill>
                    ))}
                  </div>
                  {strategy.main_decision?.fallback && (
                    <p className="mt-2 text-xs leading-relaxed text-text-secondary">
                      {strategy.main_decision?.fallback}
                    </p>
                  )}
                </div>

                <div>
                  <SectionTitle icon={Route} label={t('goldenSpatula.strategy.stageRules')} />
                  <div className="mt-2 space-y-2">
                    {(strategy.stage_rules ?? []).map((stage) => (
                      <div key={stage.stage} className="rounded-md border border-border/70 p-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-text-primary">
                            {stage.stage}
                          </span>
                          {stage.checks && stage.checks.length > 0 && (
                            <span className="text-[11px] text-text-muted truncate">
                              {stage.checks.join(' / ')}
                            </span>
                          )}
                        </div>
                        <div className="mt-1.5 space-y-1">
                          {(stage.rules ?? []).map((rule) => (
                            <div key={`${stage.stage}-${rule.when}`} className="text-xs">
                              <span className="text-text-muted">{rule.when}</span>
                              <span className="text-text-secondary"> → {rule.recommendation}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <SectionTitle icon={Clipboard} label={t('goldenSpatula.strategy.lineupCodes')} />
                  <div className="mt-2 space-y-1.5">
                    {(strategy.lineup_codes ?? []).map((lineup) => (
                      <button
                        key={lineup.name}
                        type="button"
                        onClick={() => copyLineupCode(lineup.name, lineup.code)}
                        className="w-full flex items-center justify-between gap-2 rounded-md bg-bg-tertiary px-2 py-1.5 text-left hover:bg-bg-hover transition-colors"
                      >
                        <span className="text-xs text-text-secondary truncate">{lineup.name}</span>
                        <span className="flex items-center gap-1 text-[11px] text-text-muted shrink-0">
                          <Copy className="w-3 h-3" />
                          {copiedCode === lineup.name
                            ? t('goldenSpatula.strategy.copied')
                            : t('goldenSpatula.strategy.copy')}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'recognition' && (
          <div className="space-y-1.5">
            <div className="flex h-7 items-center justify-between gap-1.5 rounded-lg bg-bg-primary/55 px-1.5 ring-1 ring-inset ring-border/30">
              <div className="flex min-w-0 items-center gap-1.5">
                <Database className="h-3 w-3 shrink-0 text-text-secondary" />
                <span className="truncate text-[10px] font-black uppercase tracking-wide text-text-secondary">
                  {t('goldenSpatula.recognition.knowledgeResource')}
                </span>
              </div>
              <StatusPill tone={usingKnowledgeResource ? 'success' : 'warning'}>
                {usingKnowledgeResource
                  ? t('goldenSpatula.recognition.selected')
                  : t('goldenSpatula.recognition.notSelected')}
              </StatusPill>
            </div>

            <div className="space-y-1">
              <SectionTitle
                icon={ListChecks}
                label={t('goldenSpatula.recognition.templateStatus')}
              />
              <div className="grid gap-1 md:grid-cols-2">
                {(assistantData?.templates ?? []).map((item) => (
                  <TemplateCategoryRow
                    key={item.key}
                    item={item}
                    label={templateLabel(item.key)}
                    t={t}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <SectionTitle icon={Crosshair} label={t('goldenSpatula.recognition.latestResult')} />
              {latestRecognition ? (
                <div className="rounded-lg bg-bg-primary/55 px-1.5 py-1 ring-1 ring-inset ring-border/30">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="truncate text-[11px] font-bold text-text-primary">
                      {latestRecognition.message}
                    </span>
                    <StatusPill
                      tone={
                        latestRecognition.status === 'success'
                          ? 'success'
                          : latestRecognition.status === 'miss'
                            ? 'warning'
                            : 'error'
                      }
                    >
                      {t(`goldenSpatula.recognition.status.${latestRecognition.status}`)}
                    </StatusPill>
                  </div>
                  <div className="mt-0.5 text-[9px] font-bold text-text-muted">
                    {latestRecognition.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              ) : (
                <div className="rounded-full bg-bg-primary/55 px-2 py-1 text-[10px] font-bold text-text-muted ring-1 ring-inset ring-border/30">
                  {t('goldenSpatula.recognition.noResults')}
                </div>
              )}
            </div>

            <KnowledgeObservationPanel
              state={knowledgeScanState}
              itemAssets={assistantData?.itemAssets.data}
              augmentAssets={assistantData?.augmentAssets.data}
              basePath={basePath}
              t={t}
            />

            {recognitionSummaries.length > 1 && (
              <div className="max-h-28 space-y-0.5 overflow-y-auto pr-0.5">
                {recognitionSummaries.slice(1).map((item) => (
                  <div
                    key={item.id}
                    className="flex h-5 items-center justify-between gap-1.5 rounded-full bg-bg-primary/35 px-2 text-[10px] font-bold text-text-muted ring-1 ring-inset ring-border/20"
                  >
                    <span className="truncate">{item.message}</span>
                    <span className="shrink-0">{item.timestamp.toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'calibration' && (
          <div className="space-y-1.5">
            <div className="grid gap-1 md:grid-cols-2">
              {healthItems.map((item) => (
                <div
                  key={item.key}
                  className="flex h-7 min-w-0 items-center justify-between gap-1.5 rounded-lg bg-bg-primary/55 px-1.5 ring-1 ring-inset ring-border/30"
                >
                  <div className="flex min-w-0 items-center gap-1.5">
                    <StatusIcon ok={item.ok} />
                    <span className="truncate text-[10px] font-black text-text-secondary">
                      {item.label}
                    </span>
                  </div>
                  <span className="shrink-0 truncate text-[9px] font-bold text-text-muted">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex min-w-0 items-center justify-between gap-1.5 rounded-lg bg-bg-primary/55 px-1.5 py-1 ring-1 ring-inset ring-border/30">
              <div className="flex min-w-0 items-center gap-1.5">
                <Crosshair className="h-3 w-3 shrink-0 text-success" />
                <span className="truncate text-[10px] font-black text-text-secondary">
                  {t('goldenSpatula.calibration.selectedAugmentProbeTestTitle')}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={runCalibrationSelectedAugmentProbeTest}
                  disabled={calibrationSelectedAugmentProbeSubmitting}
                  title={
                    calibrationSelectedAugmentProbeDisabledReason ??
                    t('goldenSpatula.calibration.selectedAugmentProbeTestTitle')
                  }
                  className="inline-flex h-6 shrink-0 items-center justify-center gap-1 rounded-full border border-success/40 bg-success/10 px-2 text-[10px] font-black text-success transition-colors hover:border-success hover:bg-success/15 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {calibrationSelectedAugmentProbeSubmitting &&
                  !selectedAugmentProbeBatchProgress ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Target className="h-3 w-3" />
                  )}
                  <span>{t('goldenSpatula.calibration.selectedAugmentProbeTest')}</span>
                </button>
                <button
                  type="button"
                  onClick={runCalibrationSelectedAugmentProbeBatchTest}
                  disabled={calibrationSelectedAugmentProbeSubmitting}
                  title={
                    calibrationSelectedAugmentProbeDisabledReason ??
                    t('goldenSpatula.calibration.selectedAugmentProbeBatchTest')
                  }
                  className="inline-flex h-6 shrink-0 items-center justify-center gap-1 rounded-full border border-accent/40 bg-accent/10 px-2 text-[10px] font-black text-accent transition-colors hover:border-accent hover:bg-accent/15 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {selectedAugmentProbeBatchProgress ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Activity className="h-3 w-3" />
                  )}
                  <span>
                    {selectedAugmentProbeBatchProgress
                      ? t('goldenSpatula.calibration.selectedAugmentProbeBatchProgress', {
                          current: selectedAugmentProbeBatchProgress.current,
                          total: selectedAugmentProbeBatchProgress.total,
                        })
                      : t('goldenSpatula.calibration.selectedAugmentProbeBatchTest')}
                  </span>
                </button>
              </div>
            </div>

            <div className="flex min-w-0 items-center justify-between gap-1.5 rounded-lg bg-bg-primary/55 px-1.5 py-1 ring-1 ring-inset ring-border/30">
              <div className="flex min-w-0 items-center gap-1.5">
                <Activity className="h-3 w-3 shrink-0 text-accent" />
                <div className="min-w-0">
                  <div className="truncate text-[10px] font-black text-text-secondary">
                    {t('goldenSpatula.calibration.selectedAugmentProbeReliabilityTitle')}
                  </div>
                  <div className="truncate text-[9px] font-bold text-text-muted">
                    {selectedAugmentProbeReliability.total > 0
                      ? t('goldenSpatula.calibration.selectedAugmentProbeReliabilityLast', {
                          stage: selectedAugmentProbeLastStageLabel,
                          attempts: selectedAugmentProbeReliability.lastAttempts,
                        })
                      : t('goldenSpatula.calibration.selectedAugmentProbeReliabilityEmpty')}
                  </div>
                </div>
              </div>
              <StatusPill tone={selectedAugmentProbeReliabilityTone}>
                {selectedAugmentProbeReliability.total > 0
                  ? t('goldenSpatula.calibration.selectedAugmentProbeReliabilityValue', {
                      success: selectedAugmentProbeReliability.success,
                      total: selectedAugmentProbeReliability.total,
                      rate: selectedAugmentProbeRatePercent,
                      target: selectedAugmentProbeTargetPercent,
                    })
                  : t('goldenSpatula.calibration.selectedAugmentProbeReliabilityEmpty')}
              </StatusPill>
            </div>

            <div className="space-y-1 rounded-lg bg-bg-primary/45 p-1.5 ring-1 ring-inset ring-border/30">
              <div className="flex min-w-0 items-center justify-between gap-1.5">
                <div className="flex min-w-0 items-center gap-1.5">
                  <Clipboard className="h-3 w-3 shrink-0 text-text-muted" />
                  <span className="truncate text-[10px] font-black text-text-secondary">
                    {t('goldenSpatula.calibration.selectedAugmentProbeTraceTitle')}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={copySelectedAugmentProbeTraceLog}
                  disabled={selectedAugmentProbeTraceEntries.length === 0}
                  className="inline-flex h-5 shrink-0 items-center gap-1 rounded-full border border-border/60 bg-bg-secondary px-1.5 text-[9px] font-black text-text-secondary transition-colors hover:border-accent/50 hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Clipboard className="h-3 w-3" />
                  {t('goldenSpatula.calibration.selectedAugmentProbeTraceCopy')}
                </button>
              </div>
              {selectedAugmentProbeTraceEntries.length > 0 ? (
                <div className="max-h-72 space-y-1 overflow-y-auto pr-0.5">
                  {selectedAugmentProbeTraceEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-lg bg-bg-secondary/80 p-1 ring-1 ring-inset ring-border/30"
                    >
                      <div className="flex min-w-0 items-center justify-between gap-1.5">
                        <div className="min-w-0">
                          <div className="truncate text-[10px] font-black text-text-primary">
                            {t(
                              `goldenSpatula.calibration.selectedAugmentProbeTraceRunKind.${entry.runKind}`,
                            )}
                            {entry.iteration && entry.total
                              ? ` ${entry.iteration}/${entry.total}`
                              : ''}
                          </div>
                          <div className="truncate text-[9px] font-bold text-text-muted">
                            {new Date(entry.timestamp).toLocaleTimeString()} ·{' '}
                            {t('goldenSpatula.calibration.selectedAugmentProbeTraceMeta', {
                              stage: selectedAugmentProbeStageLabel(entry.stage),
                              attempts: entry.attempts,
                              targets: entry.targetCount,
                              rows: entry.panelTargetCount ?? 0,
                            })}
                          </div>
                        </div>
                        <StatusPill
                          tone={
                            entry.success
                              ? 'success'
                              : entry.stage === 'error'
                                ? 'error'
                                : 'warning'
                          }
                        >
                          {selectedAugmentProbeStageLabel(entry.stage)}
                        </StatusPill>
                      </div>

                      <div className="mt-1 grid gap-1 md:grid-cols-2">
                        <div className="min-w-0">
                          <div className="mb-0.5 text-[9px] font-black text-text-muted">
                            {t('goldenSpatula.calibration.selectedAugmentProbeTraceInitial')}
                          </div>
                          {entry.initialImage ? (
                            <img
                              src={entry.initialImage}
                              alt={t('goldenSpatula.calibration.selectedAugmentProbeTraceInitial')}
                              className="aspect-video w-full rounded-md object-cover ring-1 ring-inset ring-border/40"
                            />
                          ) : (
                            <div className="flex aspect-video items-center justify-center rounded-md bg-bg-tertiary text-[9px] font-bold text-text-muted ring-1 ring-inset ring-border/40">
                              {t('goldenSpatula.calibration.selectedAugmentProbeTraceNoImage')}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="mb-0.5 text-[9px] font-black text-text-muted">
                            {t('goldenSpatula.calibration.selectedAugmentProbeTraceFinal')}
                          </div>
                          {entry.finalImage ? (
                            <img
                              src={entry.finalImage}
                              alt={t('goldenSpatula.calibration.selectedAugmentProbeTraceFinal')}
                              className="aspect-video w-full rounded-md object-cover ring-1 ring-inset ring-border/40"
                            />
                          ) : (
                            <div className="flex aspect-video items-center justify-center rounded-md bg-bg-tertiary text-[9px] font-bold text-text-muted ring-1 ring-inset ring-border/40">
                              {t('goldenSpatula.calibration.selectedAugmentProbeTraceNoImage')}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-1 space-y-0.5 text-[9px] font-bold text-text-muted">
                        <div className="truncate">
                          {t('goldenSpatula.calibration.selectedAugmentProbeTraceTarget')}:{' '}
                          {formatSelectedAugmentProbeTraceTarget(entry.target)}
                        </div>
                        <div className="truncate">
                          {t('goldenSpatula.calibration.selectedAugmentProbeTracePanelTarget')}:{' '}
                          {formatSelectedAugmentProbeTraceTarget(entry.panelTarget)}
                        </div>
                        <div className="truncate">
                          {t('goldenSpatula.calibration.selectedAugmentProbeTraceMatch')}:{' '}
                          {entry.match?.augmentName ?? '-'}
                          {entry.match?.score !== undefined
                            ? ` ${entry.match.score.toFixed(3)}`
                            : ''}
                        </div>
                        <div className="truncate">
                          {t('goldenSpatula.calibration.selectedAugmentProbeTraceDiagnostics')}:{' '}
                          {formatSelectedAugmentProbeTraceDiagnostics(entry)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-full bg-bg-secondary px-2 py-1 text-[10px] font-bold text-text-muted ring-1 ring-inset ring-border/25">
                  {t('goldenSpatula.calibration.selectedAugmentProbeTraceEmpty')}
                </div>
              )}
            </div>

            <div
              className={clsx(
                'flex gap-1.5 rounded-lg border px-1.5 py-1',
                recommendations.length === 0
                  ? 'border-success/30 bg-success/5'
                  : 'border-warning/30 bg-warning/5',
              )}
            >
              <ShieldAlert
                className={clsx(
                  'mt-0.5 h-3 w-3 shrink-0',
                  recommendations.length === 0 ? 'text-success' : 'text-warning',
                )}
              />
              <div className="text-[10px] font-bold leading-relaxed text-text-secondary">
                {recommendations.length === 0 ? (
                  t('goldenSpatula.calibration.allGood')
                ) : (
                  <div className="space-y-0.5">
                    {recommendations.map((item) => (
                      <div key={item}>{item}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      {recommendedPicker}
    </div>
  );
}
