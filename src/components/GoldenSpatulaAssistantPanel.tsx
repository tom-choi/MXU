import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
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
  recognizeGoldenSpatulaAugmentChoicesFromDataUrl,
  type GoldenSpatulaAugmentChoiceVisionResult,
} from '@/services/goldenSpatulaAugmentChoiceVision';
import {
  buildGoldenSpatulaAugmentDecision,
  type GoldenSpatulaAugmentDecision,
  type GoldenSpatulaAugmentScoreReason,
} from '@/services/goldenSpatulaAugmentDecisionModel';
import { buildGoldenSpatulaDecisionPlan } from '@/services/goldenSpatulaDecisionEngine';
import {
  collectGoldenSpatulaVariantUnits,
  getGoldenSpatulaActiveRollTargetNames,
  isGoldenSpatulaCarryUnit,
  isGoldenSpatulaDisplayableUnit,
  isGoldenSpatulaFrontlineUnit,
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
  buildAutoPickAugmentPipelineOverride,
  buildAutoLevelRollBuyPipelineOverride,
  buildAutoRollBuyPipelineOverride,
  goldenSpatulaAugmentFocusScope,
  goldenSpatulaAutoPickAugmentEntry as autoPickAugmentEntry,
  goldenSpatulaAutoLevelRollBuyEntry as autoLevelRollBuyEntry,
  goldenSpatulaAutoRollBuyEntry as autoRollBuyEntry,
  goldenSpatulaShopChampionSlots,
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
  recognizeGoldenSpatulaSelectedAugmentsFromDataUrl,
  type GoldenSpatulaSelectedAugmentVisionResult,
} from '@/services/goldenSpatulaSelectedAugmentVision';
import {
  detectGoldenSpatulaAugmentPresenceFromDataUrl,
  type GoldenSpatulaAugmentPresenceResult,
} from '@/services/goldenSpatulaAugmentPresenceVision';
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
  GoldenSpatulaKnowledgeItemKind,
  GoldenSpatulaKnowledgeItemState,
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
  GoldenSpatulaRollEventKind,
  GoldenSpatulaRollRunState,
  GoldenSpatulaShopOddsSource,
  GoldenSpatulaTemplateCategory,
  GoldenSpatulaTemplateCategoryStatus,
  GoldenSpatulaTraitAsset,
  GoldenSpatulaTraitAssetIndex,
  GoldenSpatulaVariantSlot,
  GoldenSpatulaXpEventKind,
  GoldenSpatulaXpRunState,
} from '@/types/goldenSpatula';

export const GOLDEN_SPATULA_PROJECT = 'GoldenSpatulaMuMu';
const KNOWLEDGE_RESOURCE = 'GoldenSpatulaKnowledge';
const MAX_RECOGNITION_SUMMARIES = 20;
const selectedAugmentCheckIntervalMs = 5000;
const augmentPresenceCheckIntervalMs = 5000;

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

type AutoRollCount = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

const autoRollCounts: AutoRollCount[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const autoRollTaskByCount: Partial<Record<AutoRollCount, string>> = {
  1: 'AutoRollShopOnce',
  3: 'AutoRollShopThree',
  5: 'AutoRollShopFive',
};
const autoRollTaskNames = new Set(Object.values(autoRollTaskByCount).filter(Boolean));
const autoBuyExperienceTaskByCount: Partial<Record<AutoRollCount, string>> = {
  1: 'AutoBuyExperienceOnce',
  3: 'AutoBuyExperienceThree',
  5: 'AutoBuyExperienceFive',
};
const goldenSpatulaShopOddsCosts = [1, 2, 3, 4, 5] as const;

function toAutoRollCount(value: number | undefined): AutoRollCount | undefined {
  if (value === undefined || !Number.isFinite(value)) return undefined;
  const normalized = Math.trunc(value);
  return autoRollCounts.includes(normalized as AutoRollCount)
    ? (normalized as AutoRollCount)
    : undefined;
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
    <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
  ) : (
    <XCircle className="w-3.5 h-3.5 text-warning shrink-0" />
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
        'shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset',
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
  const grade = quality?.trim().match(/^[A-Za-z]\+?/u)?.[0]?.toUpperCase();
  if (grade?.startsWith('S')) return 's';
  if (grade?.startsWith('A')) return 'a';
  if (grade?.startsWith('B')) return 'b';
  return 'default';
}

const goldenSpatulaNeutralTagClass =
  'inline-flex items-center rounded bg-bg-hover px-1.5 py-0.5 text-[10px] font-medium text-text-secondary ring-1 ring-inset ring-border/70';

const goldenSpatulaAccentTagClass =
  'inline-flex items-center rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent ring-1 ring-inset ring-accent/30';

function SectionTitle({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs font-medium text-text-primary">
      <Icon className="w-3.5 h-3.5 text-text-secondary" />
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
    <div className="flex items-center justify-between gap-2 rounded-md bg-bg-tertiary px-2 py-1.5">
      <div className="flex items-center gap-2 min-w-0">
        <StatusIcon ok={ready} />
        <span className="text-xs text-text-secondary truncate">{label}</span>
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

function isFrontlinerUnit(
  unit: GoldenSpatulaLineupUnit,
  variant: GoldenSpatulaLineupVariant,
): boolean {
  return isGoldenSpatulaFrontlineUnit(unit, variant);
}

function getLineupUnitRole(unit: GoldenSpatulaLineupUnit, variant: GoldenSpatulaLineupVariant) {
  if (isMainCarryUnit(unit, variant)) return 'carry';
  if (isFrontlinerUnit(unit, variant)) return 'frontline';
  return 'unit';
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

function collectLineupItemFallbacks(
  variant: GoldenSpatulaLineupVariant,
): Map<string, string[]> {
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

  if (
    !mainCarries.changed &&
    !frontliners.changed &&
    !units.changed &&
    !shouldFillEquipmentOrder
  ) {
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

function collectRollTargetUnits(variant: GoldenSpatulaLineupVariant): GoldenSpatulaLineupUnit[] {
  const units = collectLineupUnits(variant);
  const activeNames = getActiveRollTargetNames(variant);

  return activeNames
    .map((name) =>
      units.find((unit) => normalizeSearchText(unit.name) === normalizeSearchText(name)),
    )
    .filter((unit): unit is GoldenSpatulaLineupUnit => Boolean(unit));
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
  const shouldPlaceAbove = rect.bottom + gap + estimatedHeight > viewportHeight && rect.top > estimatedHeight;

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
            className="pointer-events-none fixed z-[1000] overflow-hidden rounded-lg border border-border bg-bg-secondary text-text-primary shadow-2xl shadow-black/10 dark:border-white/10 dark:bg-[#050508] dark:text-white dark:shadow-black/40"
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
        'flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded bg-bg-primary text-[10px] font-bold text-text-muted ring-1 ring-border/70 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-white/15',
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
    .replace(/[（(]\s*(?:总参与击败数|当前加成|击败追踪器|已吸引的朋友数量)[^）)]*[:：]\s*0\s*[）)]/gu, '')
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
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/u, '').replace(/\.$/u, '');
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
    range !== undefined && Number.isFinite(range)
      ? Math.max(0, Math.min(5, Math.round(range)))
      : 0;

  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, index) => (
        <span
          key={index}
          className={clsx(
            'h-2 w-2 rounded-full',
            index < normalizedRange ? 'bg-stone-500 dark:bg-stone-400' : 'bg-bg-active dark:bg-zinc-700',
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

  const parts = cleaned.split(/(【[^】]+】|\d+(?:\.\d+)?(?:\s*\/\s*\d+(?:\.\d+)?)+|[+-]?\d+(?:\.\d+)?%?)/gu);
  return parts.map((part, index) => {
    if (!part) return null;
    if (/^【[^】]+】$/u.test(part)) {
      return <SkillStatToken key={`${part}-${index}`} token={part} />;
    }
    if (/^\d+(?:\.\d+)?(?:\s*\/\s*\d+(?:\.\d+)?)+$/u.test(part.trim())) {
      return (
        <span key={`${part}-${index}`} className="font-black text-amber-700 dark:text-amber-300">
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
      className="group/item relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-md bg-gradient-to-br from-bg-tertiary to-bg-primary p-[1px] shadow-sm ring-1 ring-inset ring-border/70 dark:from-zinc-800 dark:to-zinc-950 dark:ring-white/15"
      title={item}
    >
      <div className="h-full w-full overflow-hidden rounded bg-bg-primary text-[7px] font-bold text-text-muted dark:bg-zinc-950 dark:text-zinc-400">
        <LineupAssetImage
          imagePath={itemAsset?.imagePath}
          fallback={item.slice(0, 1)}
          basePath={basePath}
        />
      </div>
      <div className="pointer-events-none absolute inset-0 rounded-md ring-1 ring-inset ring-border/40 group-hover/item:ring-amber-400/60 dark:ring-black/30 dark:group-hover/item:ring-amber-300/60" />
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
            <div className="h-full w-full overflow-hidden rounded bg-bg-primary text-[10px] font-bold text-text-muted dark:bg-zinc-950 dark:text-zinc-400">
              <LineupAssetImage
                imagePath={asset?.imagePath}
                fallback={shortUnitName(unit.name)}
                basePath={basePath}
              />
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="truncate text-[14px] font-black leading-tight text-text-primary dark:text-zinc-50">
                {unit.name}
              </span>
              {cost !== undefined && (
                <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-black text-amber-300">
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
        <div className="shrink-0 text-right text-[10px] font-black leading-tight text-amber-300/75">
          MXU
        </div>
      </div>

      {(skillName || skillDescription) && (
        <>
          <TooltipDivider />
          <div className="flex items-start gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded bg-bg-primary text-[10px] font-bold text-text-muted ring-1 ring-border/70 dark:bg-zinc-900 dark:text-zinc-400 dark:ring-white/15">
              {asset?.skill?.icon ? (
                <img src={asset.skill.icon} alt="" className="h-full w-full object-cover" />
              ) : (
                shortUnitName(skillName ?? unit.name)
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                {skillName && (
                  <span className="truncate text-[13px] font-black text-text-primary dark:text-zinc-50">
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
                return <TooltipItemIcon key={`${item}-${index}`} item={item} itemAsset={itemAsset} basePath={basePath} />;
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

  const rankDelta = (left.rank ?? Number.MAX_SAFE_INTEGER) - (right.rank ?? Number.MAX_SAFE_INTEGER);
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
              <span className="truncate text-sm font-bold text-text-primary dark:text-white">{name}</span>
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
            <span key={roleTag} className="rounded bg-bg-hover px-1.5 py-0.5 text-[11px] text-text-secondary ring-1 ring-inset ring-border/60 dark:bg-white/10 dark:text-zinc-200 dark:ring-transparent">
              {formatAugmentRoleTag(roleTag, t)}
            </span>
          ))}
        </div>
      )}

      {body && (
        <>
          <TooltipDivider />
          <div className="text-[12px] leading-relaxed text-text-primary dark:text-zinc-100">{body}</div>
        </>
      )}

      {asset?.description && body !== asset.description && (
        <div className="text-[11px] leading-relaxed text-text-muted dark:text-zinc-400">{asset.description}</div>
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
  const decision = detail.selectionDecision || detail.reason || asset?.description;
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
      <div className="min-w-0 rounded-md border border-border/70 bg-bg-primary p-2 text-left shadow-sm transition-colors hover:border-accent/45">
        <div className="flex min-w-0 items-start gap-2">
          <div
            className={clsx(
              'flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md p-[2px] text-[10px] font-bold ring-1 ring-inset',
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
              <span className="min-w-0 flex-1 truncate text-xs font-semibold text-text-primary">
                {name}
              </span>
              {detail.recommendationIndex !== undefined && (
                <span
                  className="shrink-0 rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-accent ring-1 ring-inset ring-accent/30"
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

        {decision && (
          <div className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-text-muted">
            {decision}
          </div>
        )}

        {roleTags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {roleTags.map((roleTag) => (
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
      items: filteredRecommendations.filter((detail) => getAugmentRecommendationTier(detail) === tier),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="space-y-2 rounded-md bg-bg-tertiary/70 p-2 ring-1 ring-inset ring-border/60">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <SectionTitle icon={Sparkles} label={t('goldenSpatula.lineups.augmentMetaTitle')} />
        <div className="flex flex-wrap gap-1.5 sm:justify-end">
          <div className="flex flex-wrap rounded-md bg-bg-primary p-0.5 ring-1 ring-inset ring-border/70">
            {visibleLevelFilters.map((item) => {
              const selected = levelFilter === item;
              const count = levelCounts.get(item) ?? 0;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setLevelFilter(item)}
                  className={clsx(
                    'inline-flex h-6 min-w-12 items-center justify-center gap-1 rounded px-2 text-[11px] font-medium transition-colors',
                    selected
                      ? 'bg-accent/10 text-accent shadow-sm'
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
            <div className="flex flex-wrap rounded-md bg-bg-primary p-0.5 ring-1 ring-inset ring-border/70">
              {visibleGroupFilters.map((item) => {
                const selected = groupFilter === item;
                const count = groupCounts.get(item) ?? 0;
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setGroupFilter(item)}
                    className={clsx(
                      'inline-flex h-6 min-w-12 items-center justify-center gap-1 rounded px-2 text-[11px] font-medium transition-colors',
                      selected
                        ? 'bg-accent/10 text-accent shadow-sm'
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

      <div className="space-y-1.5">
        {tierGroups.length > 0 ? (
          tierGroups.map(({ tier, items }) => (
            <div
              key={tier}
              className={clsx(
                'overflow-hidden rounded-md border bg-bg-primary',
                getAugmentTierRailClass(tier),
              )}
            >
              <div className="flex flex-col sm:flex-row">
                <div className="flex items-center justify-between gap-2 px-3 py-2 sm:w-[4.5rem] sm:flex-col sm:justify-center">
                  <span className="text-sm font-black leading-none">
                    {formatAugmentStrengthTier(tier, t)}
                  </span>
                  <span className="rounded bg-bg-primary/60 px-1.5 py-0.5 text-[10px] font-bold tabular-nums">
                    {items.length}
                  </span>
                </div>
                <div className="grid flex-1 gap-1.5 border-t border-current/15 p-2 sm:grid-cols-2 sm:border-l sm:border-t-0 xl:grid-cols-3">
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
  variant,
  asset,
  basePath,
  selected,
  onClick,
  t,
}: {
  unit: GoldenSpatulaLineupUnit;
  variant: GoldenSpatulaLineupVariant;
  asset: GoldenSpatulaChampionAsset | undefined;
  basePath: string;
  selected?: boolean;
  onClick?: () => void;
  t: TFunction;
}) {
  const role = getLineupUnitRole(unit, variant);
  const highlighted = role === 'carry';
  const cost = asset?.cost;
  const Root = onClick ? 'button' : 'div';

  return (
    <Root
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={clsx(
        'inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left ring-1 ring-inset transition-colors',
        selected
          ? 'bg-accent/10 text-accent ring-accent/40'
          : highlighted
            ? 'bg-accent/10 text-accent ring-accent/30'
            : 'bg-bg-tertiary text-text-secondary ring-border/60',
        onClick && 'hover:text-accent hover:ring-accent/30',
      )}
      title={unitLabel(unit)}
    >
      <div
        className={clsx(
          'relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded p-[2px] text-[10px] font-medium',
          highlighted ? 'bg-accent/15 text-accent' : 'bg-bg-primary text-text-secondary',
        )}
        style={costFrameStyle(cost)}
      >
        <div className="h-full w-full overflow-hidden rounded bg-bg-primary">
          <LineupAssetImage
            imagePath={asset?.imagePath}
            fallback={shortUnitName(unit.name)}
            basePath={basePath}
          />
        </div>
        {highlighted && (
          <span className="absolute right-0 top-0 flex h-3 w-3 items-center justify-center rounded-full bg-amber-400 text-[8px] font-bold leading-none text-slate-950 ring-1 ring-white/80">
            C
          </span>
        )}
      </div>
      <div className="min-w-0">
        <div className="truncate text-xs font-medium">{unit.name}</div>
        {role !== 'unit' && (
          <div className="truncate text-[10px] text-text-muted">
            {t(`goldenSpatula.lineups.targetRole.${role}`)}
          </div>
        )}
      </div>
    </Root>
  );
}

function getLineupDisplayLevel(variant: GoldenSpatulaLineupVariant): number {
  const unitCount = collectLineupUnits(variant).filter(isGoldenSpatulaDisplayableUnit).length;
  return Math.min(10, Math.max(1, unitCount));
}

function getLineupTotalCost(
  variant: GoldenSpatulaLineupVariant,
  championAssets: GoldenSpatulaChampionAssetIndex | undefined,
): number | undefined {
  const costs = collectLineupUnits(variant)
    .filter(isGoldenSpatulaDisplayableUnit)
    .map((unit) => getUnitCost(unit.name, championAssets))
    .filter((cost): cost is number => cost !== undefined);
  if (costs.length === 0) return undefined;
  return costs.reduce((sum, cost) => sum + cost, 0);
}

function parseLineupTraitTags(summary: string | undefined): Array<{ count?: string; name: string }> {
  if (!summary) return [];
  const content = summary.replace(/^.*?】/u, '').trim() || summary.trim();
  const matches = [...content.matchAll(/(\d+)\s*([^0-9\s]+)/gu)]
    .map((match) => ({
      count: match[1],
      name: match[2].replace(/[，,、/]+$/u, '').trim(),
    }))
    .filter((item) => item.name);
  if (matches.length > 0) return matches.slice(0, 8);
  return [{ name: content }].filter((item) => item.name);
}

function normalizeTraitEffectText(text: string): string {
  return sanitizeGoldenSpatulaTooltipText(text) ?? '';
}

function parseTraitEffectLines(asset: GoldenSpatulaTraitAsset | undefined): string[] {
  const source = asset?.effect || asset?.description;
  if (!source) return [];
  const lines = source
    .split('|')
    .map(normalizeTraitEffectText)
    .filter(Boolean);
  return [...new Set(lines)].slice(0, 6);
}

function parseTraitEffectLine(line: string): { threshold?: number; text: string } {
  const match = line.match(/^\((\d+)\)\s*(.+)$/u);
  if (!match) return { text: line };
  return {
    threshold: Number(match[1]),
    text: match[2].trim(),
  };
}

function getActiveTraitThreshold(
  thresholds: number[],
  activeCount: number | undefined,
): number | undefined {
  if (activeCount === undefined) return undefined;
  return thresholds
    .filter((threshold) => activeCount >= threshold)
    .sort((left, right) => right - left)[0];
}

function collectLineupTraitUnits(
  variant: GoldenSpatulaLineupVariant,
  traitName: string,
  championAssets: GoldenSpatulaChampionAssetIndex | undefined,
): GoldenSpatulaLineupUnit[] {
  const traitKey = normalizeSearchText(traitName);
  return collectLineupUnits(variant)
    .filter(isGoldenSpatulaDisplayableUnit)
    .filter((unit) =>
      findChampionAsset(unit.name, championAssets)?.traits?.some(
        (trait) => normalizeSearchText(trait) === traitKey,
      ),
    );
}

function parseTraitActiveCount(
  trait: { count?: string; name: string },
  variant: GoldenSpatulaLineupVariant,
  championAssets: GoldenSpatulaChampionAssetIndex | undefined,
): number | undefined {
  const parsed = trait.count ? Number(trait.count) : undefined;
  if (parsed !== undefined && Number.isFinite(parsed)) return parsed;
  const units = collectLineupTraitUnits(variant, trait.name, championAssets);
  return units.length > 0 ? units.length : undefined;
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
              className="h-11 w-11 rounded-lg dark:bg-zinc-950"
            />
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate text-base font-black text-text-primary dark:text-white">{trait.name}</span>
                {activeCount !== undefined && (
                  <span className="inline-flex shrink-0 items-center rounded-full bg-amber-400 px-2 py-0.5 text-[11px] font-black text-slate-950">
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
          <div className="shrink-0 text-right text-[10px] font-black leading-tight text-amber-300/80">
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
                        : 'bg-bg-tertiary text-text-secondary ring-border/70 dark:bg-white/[0.035] dark:text-zinc-400 dark:ring-white/10',
                    )}
                  >
                    {parsed.threshold !== undefined && (
                      <span
                        className={clsx(
                          'mt-0.5 inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1 text-[11px] font-black ring-1 ring-inset',
                          active
                            ? 'bg-amber-400 text-slate-950 ring-amber-200/80'
                            : 'bg-bg-secondary text-text-muted ring-border/70 dark:bg-zinc-900 dark:text-zinc-400 dark:ring-white/10',
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
                'inline-flex min-w-0 shrink-0 items-center gap-1 rounded-full bg-bg-hover text-text-secondary ring-1 ring-inset ring-border/65 dark:bg-black/35 dark:text-zinc-300 dark:ring-white/10',
                compact ? 'h-5 px-1.5 text-[10px]' : 'h-6 px-2 text-[11px]',
              )}
              title={`${trait.count ? `${trait.count} ` : ''}${trait.name}`}
            >
              {asset?.imagePath && (
                <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-bg-primary dark:bg-zinc-950">
                  <LineupAssetImage
                    imagePath={asset.imagePath}
                    fallback={trait.name.slice(0, 1)}
                    basePath={basePath}
                  />
                </span>
              )}
              {trait.count && (
                <span className="rounded-full bg-amber-400/20 px-1 text-[10px] font-black tabular-nums text-amber-700 dark:text-amber-200">
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

function LineupDarkTierBadge({ quality }: { quality?: string }) {
  const grade = quality?.trim().match(/^[A-Za-z]\+?/u)?.[0]?.toUpperCase() ?? '?';
  const tone = getRecommendedQualityTone(quality);

  return (
    <span
      className={clsx(
        'inline-flex h-9 min-w-9 items-center justify-center rounded-md px-2 text-sm font-black leading-none text-white shadow-sm ring-1 ring-inset',
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

function LineupMetric({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="min-w-0 border-l border-border/70 px-3 first:border-l-0">
      <div className="truncate text-[10px] text-text-muted">{label}</div>
      <div className="mt-0.5 truncate text-sm font-black tabular-nums text-text-primary">
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
        'flex min-w-0 items-start overflow-hidden',
        compact ? 'gap-1.5' : 'gap-2',
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
            <div className={clsx('min-w-0 shrink-0', compact ? 'w-11' : 'w-12')}>
              <div
                className={clsx(
                  'relative flex shrink-0 items-center justify-center rounded-md p-[2px]',
                  compact ? 'h-10 w-10' : 'h-11 w-11',
                )}
                style={costFrameStyle(cost)}
              >
                <div className="h-full w-full overflow-hidden rounded bg-bg-primary text-[10px] font-bold text-text-muted">
                  <LineupAssetImage
                    imagePath={asset?.imagePath}
                    fallback={shortUnitName(unit.name)}
                    basePath={basePath}
                  />
                </div>
                {carry && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-400 px-1 text-[9px] font-black leading-none text-slate-950 ring-1 ring-white/80">
                    C
                  </span>
                )}
                {items.length > 0 && (
                  <div className="absolute -bottom-1 left-1/2 flex -translate-x-1/2 justify-center gap-0.5 rounded bg-bg-secondary/90 px-0.5 py-0.5 shadow-sm ring-1 ring-border/60 backdrop-blur-sm dark:bg-black/70 dark:ring-white/10">
                    {items.map((item, itemIndex) => (
                      <span
                        key={`${item}-${itemIndex}`}
                        className="flex h-4 w-4 items-center justify-center overflow-hidden rounded bg-bg-primary p-[1px] text-[6px] text-text-muted ring-1 ring-border/70 dark:bg-zinc-950 dark:text-zinc-400 dark:ring-black/60"
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
              <div className="mt-1 truncate text-center text-[10px] font-bold leading-none text-text-primary dark:text-white">
                {unit.name}
              </div>
            </div>
          </FloatingInfoTooltip>
        );
      })}
      {Array.from({ length: emptySlots }).map((_, index) => (
        <div
          key={`empty-${index}`}
          className={clsx(
            'shrink-0 rounded-md border-2 border-border-strong/50 bg-bg-tertiary/80',
            compact ? 'h-10 w-10' : 'h-11 w-11',
          )}
        />
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

  return (
    <div
      className={clsx(
        'min-w-0 overflow-hidden rounded-md border border-border bg-bg-secondary text-left shadow-sm ring-1 ring-inset ring-border/35',
        compact ? 'min-h-[116px]' : 'min-h-[126px]',
      )}
    >
      <div
        className={clsx(
          'grid min-w-0',
          compact
            ? 'grid-cols-1 lg:grid-cols-[minmax(360px,0.92fr)_minmax(510px,1.45fr)]'
            : 'grid-cols-1 lg:grid-cols-[minmax(400px,0.95fr)_minmax(540px,1.45fr)]',
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
                <div className="truncate text-sm font-black text-text-primary">
                  {name}
                </div>
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
              <LineupMetric label={t('goldenSpatula.lineups.lineupAugments')} value={augmentCount} />
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
  onToggleTarget?: (unitName: string) => void;
  t: TFunction;
}) {
  const units = collectRollTargetUnits(variant);
  const allUnits = collectLineupUnits(variant);
  const activeTargetNames = new Set(
    getActiveRollTargetNames(variant).map((name) => normalizeSearchText(name)),
  );

  if (onToggleTarget) {
    return allUnits.length > 0 ? (
      <div>
        <div className="mb-1 text-[11px] text-text-muted">
          {t('goldenSpatula.lineups.targetCandidates')}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {allUnits.map((unit, index) => {
            const selected = activeTargetNames.has(normalizeSearchText(unit.name));
            return (
              <LineupTargetCard
                key={`${unit.name}-${unit.location ?? index}`}
                unit={unit}
                variant={variant}
                asset={findChampionAsset(unit.name, championAssets)}
                basePath={basePath}
                selected={selected}
                onClick={() => onToggleTarget(unit.name)}
                t={t}
              />
            );
          })}
        </div>
      </div>
    ) : (
      <div className="rounded-md bg-bg-tertiary p-2 text-xs text-text-muted">
        {t('goldenSpatula.lineups.noRollTargets')}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {units.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {units.map((unit, index) => (
            <LineupTargetCard
              key={`${unit.name}-${unit.location ?? index}`}
              unit={unit}
              variant={variant}
              asset={findChampionAsset(unit.name, championAssets)}
              basePath={basePath}
              selected
              t={t}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-md bg-bg-tertiary p-2 text-xs text-text-muted">
          {t('goldenSpatula.lineups.noRollTargets')}
        </div>
      )}
    </div>
  );
}

function formatRollEventTime(timestamp: number | undefined, fallback: string): string {
  if (!timestamp) return fallback;
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function rollEventTone(kind: GoldenSpatulaRollEventKind): 'success' | 'warning' | 'muted' {
  switch (kind) {
    case 'buyConfirmed':
    case 'completed':
      return 'success';
    case 'buyUnconfirmed':
    case 'missed':
    case 'notReady':
      return 'warning';
    default:
      return 'muted';
  }
}

function xpEventTone(kind: GoldenSpatulaXpEventKind): 'success' | 'warning' | 'muted' {
  switch (kind) {
    case 'completed':
      return 'success';
    case 'notReady':
      return 'warning';
    default:
      return 'muted';
  }
}

function formatRollEventSlot(event: GoldenSpatulaRollEvent | undefined): string {
  if (!event) return '';
  const slot = event.slotLabel ?? event.slotIndex;
  return slot ? ` #${slot}` : '';
}

function RollRunStatusPanel({
  runState,
  t,
}: {
  runState: GoldenSpatulaRollRunState;
  t: TFunction;
}) {
  const latestRecognition = runState.events.find(
    (event) =>
      event.kind === 'bought' ||
      event.kind === 'buyConfirmed' ||
      event.kind === 'buyUnconfirmed' ||
      event.kind === 'missed',
  );
  const latestBuyResult = runState.events.find(
    (event) =>
      event.kind === 'buyConfirmed' ||
      event.kind === 'buyUnconfirmed' ||
      event.kind === 'bought' ||
      event.kind === 'missed',
  );
  const progressReady = runState.totalCycles > 0 && runState.currentCycle > 0;
  const latestSlotText = formatRollEventSlot(latestRecognition);
  const latestBuySlotText = formatRollEventSlot(latestBuyResult);

  const recognitionText =
    latestRecognition?.kind === 'bought' ||
    latestRecognition?.kind === 'buyConfirmed' ||
    latestRecognition?.kind === 'buyUnconfirmed'
      ? `${t('goldenSpatula.lineups.rollStatusRecognitionHit', {
          target: latestRecognition.targetName,
        })}${latestSlotText}`
      : latestRecognition?.kind === 'missed'
        ? t('goldenSpatula.lineups.rollStatusRecognitionMiss')
        : t('goldenSpatula.lineups.rollStatusNoRecognition');
  const buyText =
    latestBuyResult?.kind === 'buyConfirmed'
      ? `${t('goldenSpatula.lineups.rollStatusBuyConfirmed', {
          target: latestBuyResult.targetName,
        })}${latestBuySlotText}`
      : latestBuyResult?.kind === 'buyUnconfirmed'
        ? `${t('goldenSpatula.lineups.rollStatusBuyUnconfirmed', {
            target: latestBuyResult.targetName,
          })}${latestBuySlotText}`
        : latestBuyResult?.kind === 'bought'
          ? `${t('goldenSpatula.lineups.rollStatusBuyHit', {
              target: latestBuyResult.targetName,
            })}${latestBuySlotText}`
          : latestBuyResult?.kind === 'missed'
            ? t('goldenSpatula.lineups.rollStatusBuyMiss')
            : t('goldenSpatula.lineups.rollStatusBuyNone');

  return (
    <div className="space-y-2 rounded-md bg-bg-tertiary/70 p-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-medium text-text-primary">
          {t('goldenSpatula.lineups.rollStatus')}
        </div>
        <StatusPill tone={runState.active ? 'success' : 'muted'}>
          {runState.active
            ? t('goldenSpatula.lineups.rollStatusRunning')
            : t('goldenSpatula.lineups.rollStatusIdle')}
        </StatusPill>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <div className="rounded-md bg-bg-primary p-2 ring-1 ring-inset ring-border/60">
          <div className="text-[10px] text-text-muted">
            {t('goldenSpatula.lineups.rollStatusLatestRecognition')}
          </div>
          <div className="mt-1 truncate text-xs text-text-primary">{recognitionText}</div>
        </div>
        <div className="rounded-md bg-bg-primary p-2 ring-1 ring-inset ring-border/60">
          <div className="text-[10px] text-text-muted">
            {t('goldenSpatula.lineups.rollStatusBuyResult')}
          </div>
          <div className="mt-1 truncate text-xs text-text-primary">{buyText}</div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 text-[11px] text-text-muted">
        <span>
          {progressReady
            ? t('goldenSpatula.lineups.rollStatusProgressValue', {
                current: runState.currentCycle,
                total: runState.totalCycles,
              })
            : t('goldenSpatula.lineups.rollStatusProgressEmpty')}
        </span>
        <span>
          {t('goldenSpatula.lineups.rollStatusLastUpdated', {
            time: formatRollEventTime(runState.updatedAt, '-'),
          })}
        </span>
      </div>

      {runState.events.length > 0 ? (
        <div className="space-y-1">
          <div className="text-[11px] text-text-muted">
            {t('goldenSpatula.lineups.rollStatusHistory')}
          </div>
          <div className="space-y-1">
            {runState.events.slice(0, 4).map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between gap-2 rounded bg-bg-primary px-2 py-1 text-[11px] ring-1 ring-inset ring-border/50"
              >
                <span className="min-w-0 truncate text-text-secondary">{event.message}</span>
                <StatusPill tone={rollEventTone(event.kind)}>
                  {formatRollEventTime(event.timestamp, '-')}
                </StatusPill>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-[11px] text-text-muted">
          {t('goldenSpatula.lineups.rollStatusNoEvents')}
        </div>
      )}
    </div>
  );
}

function XpRunStatusPanel({ runState, t }: { runState: GoldenSpatulaXpRunState; t: TFunction }) {
  const latestEvent = runState.lastEvent;
  const progressReady = runState.total > 0;
  const current = Math.min(runState.current, runState.total || runState.current);
  const latestText = latestEvent?.message ?? t('goldenSpatula.lineups.xpStatusNoEvents');

  return (
    <div className="space-y-2 rounded-md bg-bg-primary p-2 ring-1 ring-inset ring-border/60">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-medium text-text-primary">
          {t('goldenSpatula.lineups.xpStatus')}
        </div>
        <StatusPill tone={runState.active ? 'success' : 'muted'}>
          {runState.active
            ? t('goldenSpatula.lineups.xpStatusRunning')
            : t('goldenSpatula.lineups.xpStatusIdle')}
        </StatusPill>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <div className="rounded-md bg-bg-tertiary p-2">
          <div className="text-[10px] text-text-muted">
            {t('goldenSpatula.lineups.xpStatusProgress')}
          </div>
          <div className="mt-1 truncate text-xs text-text-primary">
            {progressReady
              ? t('goldenSpatula.lineups.xpStatusProgressValue', {
                  current,
                  total: runState.total,
                })
              : t('goldenSpatula.lineups.xpStatusProgressEmpty')}
          </div>
        </div>
        <div className="rounded-md bg-bg-tertiary p-2">
          <div className="text-[10px] text-text-muted">
            {t('goldenSpatula.lineups.xpStatusLatest')}
          </div>
          <div className="mt-1 truncate text-xs text-text-primary">{latestText}</div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 text-[11px] text-text-muted">
        <span>
          {t('goldenSpatula.lineups.rollStatusLastUpdated', {
            time: formatRollEventTime(runState.updatedAt, '-'),
          })}
        </span>
        {runState.events.length > 0 && (
          <StatusPill tone={xpEventTone(runState.events[0].kind)}>
            {formatRollEventTime(runState.events[0].timestamp, '-')}
          </StatusPill>
        )}
      </div>

      {runState.events.length > 0 ? (
        <div className="space-y-1">
          {runState.events.slice(0, 3).map((event) => (
            <div
              key={event.id}
              className="flex items-center justify-between gap-2 rounded bg-bg-tertiary px-2 py-1 text-[11px]"
            >
              <span className="min-w-0 truncate text-text-secondary">{event.message}</span>
              <StatusPill tone={xpEventTone(event.kind)}>
                {formatRollEventTime(event.timestamp, '-')}
              </StatusPill>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-[11px] text-text-muted">
          {t('goldenSpatula.lineups.xpStatusNoEvents')}
        </div>
      )}
    </div>
  );
}

function formatSignedValue(value: number): string {
  return value > 0 ? `+${value}` : `${value}`;
}

function formatShopOddsPercent(odds: number | undefined): string {
  if (odds === undefined) return '-';
  if (odds > 0 && odds < 0.01) return '<1%';
  return `${Math.round(odds * 100)}%`;
}

function formatPercentValue(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return '-';
  return `${Math.round(value * 100)}%`;
}

function shopOddsSourceTone(
  source: GoldenSpatulaShopOddsSource | undefined,
): 'success' | 'warning' | 'error' | 'muted' {
  if (source === 'ocr') return 'success';
  if (source === 'mixed') return 'warning';
  return 'muted';
}

function ShopOddsSummary({
  shopOdds,
  source,
  t,
  className,
}: {
  shopOdds: GoldenSpatulaEconomyRunState['shopOdds'];
  source: GoldenSpatulaShopOddsSource | undefined;
  t: TFunction;
  className?: string;
}) {
  const hasShopOdds = goldenSpatulaShopOddsCosts.some((cost) => shopOdds?.[cost] !== undefined);
  const sourceLabel = hasShopOdds ? (source ?? 'levelTable') : source;

  return (
    <div
      className={clsx(
        'flex min-w-0 flex-1 flex-wrap items-center justify-end gap-1 text-[11px]',
        className,
      )}
    >
      <span className="text-text-muted">{t('goldenSpatula.lineups.economyShopOdds')}</span>
      {hasShopOdds ? (
        goldenSpatulaShopOddsCosts.map((cost) => (
          <StatusPill key={cost} tone={shopOdds?.[cost] !== undefined ? 'success' : 'muted'}>
            {t('goldenSpatula.lineups.economyCostOdds', {
              cost,
              odds: formatShopOddsPercent(shopOdds?.[cost]),
            })}
          </StatusPill>
        ))
      ) : (
        <StatusPill tone="muted">{t('goldenSpatula.lineups.economyStatusUnknown')}</StatusPill>
      )}
      {sourceLabel && (
        <StatusPill tone={shopOddsSourceTone(sourceLabel)}>
          {t(`goldenSpatula.lineups.economyShopOddsSource.${sourceLabel}`)}
        </StatusPill>
      )}
    </div>
  );
}

function formatDecisionEstimate(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return '-';
  if (value > 0 && value < 1) return '<1';
  return `${Math.round(value)}`;
}

function expectedRollsTone(value: number | undefined): 'success' | 'warning' | 'error' | 'muted' {
  if (value === undefined || !Number.isFinite(value)) return 'muted';
  if (value <= 4) return 'success';
  if (value <= 10) return 'warning';
  return 'muted';
}

function completionChanceTone(
  value: number | undefined,
): 'success' | 'warning' | 'error' | 'muted' {
  if (value === undefined) return 'muted';
  if (value >= 0.65) return 'success';
  if (value >= 0.3) return 'warning';
  return 'muted';
}

function HandRunStatusPanel({
  runState,
  t,
}: {
  runState: GoldenSpatulaHandRunState;
  t: TFunction;
}) {
  const latestText = runState.lastEvent?.message ?? t('goldenSpatula.lineups.handStatusNoEvents');

  return (
    <div className="space-y-2 rounded-md bg-bg-primary p-2 ring-1 ring-inset ring-border/60">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-medium text-text-primary">
          {t('goldenSpatula.lineups.handStatus')}
        </div>
        <StatusPill tone={runState.active ? 'success' : 'muted'}>
          {runState.active
            ? t('goldenSpatula.lineups.rollStatusRunning')
            : t('goldenSpatula.lineups.rollStatusIdle')}
        </StatusPill>
      </div>

      <div className="rounded-md bg-bg-tertiary p-2">
        <div className="text-[10px] text-text-muted">
          {t('goldenSpatula.lineups.handStatusLatest')}
        </div>
        <div className="mt-1 truncate text-xs text-text-primary">{latestText}</div>
      </div>

      <div className="flex justify-end text-[11px] text-text-muted">
        <span>
          {t('goldenSpatula.lineups.rollStatusLastUpdated', {
            time: formatRollEventTime(runState.updatedAt, '-'),
          })}
        </span>
      </div>
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
  selectedAugments?: GoldenSpatulaKnowledgeScanState['selectedAugments'];
  augmentAssets?: GoldenSpatulaAugmentAssetIndex;
  basePath: string;
  detecting?: boolean;
  polling?: boolean;
  detectDisabledReason?: string;
  onDetect?: () => void;
  t: TFunction;
}) {
  const detectLabel = polling
    ? t('goldenSpatula.lineups.stopEconomyOcr')
    : t('goldenSpatula.lineups.runEconomyOcr');
  const goldText =
    runState.gold !== undefined
      ? String(runState.gold)
      : runState.estimatedGoldDelta !== 0
        ? t('goldenSpatula.lineups.economyStatusEstimatedGold', {
            delta: formatSignedValue(runState.estimatedGoldDelta),
          })
        : t('goldenSpatula.lineups.economyStatusUnknown');
  const levelText =
    runState.level !== undefined
      ? String(runState.level)
      : t('goldenSpatula.lineups.economyStatusUnknown');
  const experienceText =
    runState.experience !== undefined
      ? runState.experienceMax !== undefined
        ? `${runState.experience}/${runState.experienceMax}`
        : String(runState.experience)
      : runState.xpPurchases > 0
        ? t('goldenSpatula.lineups.economyStatusXpDelta', {
            count: runState.xpPurchases,
          })
        : t('goldenSpatula.lineups.economyStatusUnknown');
  const roundText = runState.round ?? t('goldenSpatula.lineups.economyStatusUnknown');
  const streakText =
    runState.streakInterest !== undefined
      ? runState.streakKind === 'win' || runState.streakKind === 'loss'
        ? `${t(`goldenSpatula.lineups.economyStreakKind.${runState.streakKind}`)} +${
            runState.streakInterest
          }`
        : runState.streakInterest === 0
          ? '0'
          : `+${runState.streakInterest}`
      : t('goldenSpatula.lineups.economyStatusUnknown');
  const selectedAugmentItems = sortKnowledgeSelectedAugments(selectedAugments);

  return (
    <div className="space-y-2 rounded-md bg-bg-primary p-2 ring-1 ring-inset ring-border/60">
      <div className="flex items-center justify-between gap-2">
        <SectionTitle icon={Coins} label={t('goldenSpatula.lineups.economyStatus')} />
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="hidden text-[11px] text-text-muted sm:inline">
            {t('goldenSpatula.lineups.rollStatusLastUpdated', {
              time: formatRollEventTime(runState.updatedAt, '-'),
            })}
          </span>
          <StatusPill tone={runState.active || polling ? 'success' : 'muted'}>
            {polling
              ? t('goldenSpatula.lineups.economyOcrPolling')
              : runState.active
                ? t('goldenSpatula.lineups.rollStatusRunning')
                : t('goldenSpatula.lineups.rollStatusIdle')}
          </StatusPill>
          {onDetect && (
            <button
              type="button"
              disabled={Boolean(detectDisabledReason) && !polling}
              onClick={onDetect}
              className="inline-flex h-6 items-center gap-1 rounded-md border border-border bg-bg-secondary px-2 text-[11px] font-medium text-text-secondary transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
              title={polling ? detectLabel : detectDisabledReason || detectLabel}
            >
              {detecting || polling ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Crosshair className="h-3 w-3" />
              )}
              <span className="hidden sm:inline">{detectLabel}</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5">
        <div className="rounded-md bg-bg-tertiary p-2">
          <div className="text-[10px] text-text-muted">
            {t('goldenSpatula.lineups.economyRound')}
          </div>
          <div className="mt-1 truncate text-xs font-medium text-text-primary">{roundText}</div>
        </div>
        <div className="rounded-md bg-bg-tertiary p-2">
          <div className="text-[10px] text-text-muted">
            {t('goldenSpatula.lineups.economyGold')}
          </div>
          <div className="mt-1 truncate text-xs font-medium text-text-primary">{goldText}</div>
        </div>
        <div className="rounded-md bg-bg-tertiary p-2">
          <div className="text-[10px] text-text-muted">
            {t('goldenSpatula.lineups.economyLevel')}
          </div>
          <div className="mt-1 truncate text-xs font-medium text-text-primary">{levelText}</div>
        </div>
        <div className="rounded-md bg-bg-tertiary p-2">
          <div className="text-[10px] text-text-muted">
            {t('goldenSpatula.lineups.economyExperience')}
          </div>
          <div className="mt-1 truncate text-xs font-medium text-text-primary">
            {experienceText}
          </div>
        </div>
        <div className="rounded-md bg-bg-tertiary p-2">
          <div className="text-[10px] text-text-muted">
            {t('goldenSpatula.lineups.economyStreak')}
          </div>
          <div className="mt-1 truncate text-xs font-medium text-text-primary">{streakText}</div>
        </div>
      </div>

      <div className="rounded-md bg-bg-tertiary p-2">
        <div className="mb-1 flex items-center justify-between gap-2">
          <div className="text-[10px] text-text-muted">
            {t('goldenSpatula.recognition.currentSelectedAugments')}
          </div>
          <span className="text-[10px] text-text-muted">
            {t('goldenSpatula.lineups.rollStatusLastUpdated', {
              time: formatRollEventTime(
                selectedAugmentItems[0]?.updatedAt ?? runState.updatedAt,
                '-',
              ),
            })}
          </span>
        </div>
        {selectedAugmentItems.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {selectedAugmentItems.map((augment) => (
              <KnowledgeSelectedAugmentChip
                key={`economy-${augment.slotIndex}:${augment.templatePath ?? augment.augmentName ?? 'unknown'}`}
                augment={augment}
                augmentAssets={augmentAssets}
                basePath={basePath}
                t={t}
              />
            ))}
          </div>
        ) : (
          <div className="text-xs text-text-muted">
            {t('goldenSpatula.recognition.noSelectedAugmentsObserved')}
          </div>
        )}
      </div>
    </div>
  );
}

function knowledgeTemplateFallback(templatePath: string | undefined, fallback: string): string {
  if (!templatePath) return fallback;
  const fileName = templatePath
    .replace(/\\/g, '/')
    .split('/')
    .pop()
    ?.replace(/\.[^.]+$/, '');
  if (!fileName) return fallback;
  const parts = fileName.split('_').filter(Boolean);
  return parts[parts.length - 1] ?? fallback;
}

function KnowledgeShopSlotCard({
  slot,
  state,
  championAssets,
  basePath,
  t,
}: {
  slot: (typeof goldenSpatulaShopChampionSlots)[number];
  state?: GoldenSpatulaKnowledgeShopSlotState;
  championAssets: GoldenSpatulaChampionAssetIndex | undefined;
  basePath: string;
  t: TFunction;
}) {
  const asset =
    findChampionAsset(state?.championName ?? '', championAssets) ??
    findAssetByTemplatePath(state?.templatePath, championAssets);
  const matched = state?.confidence === 'matched';
  const empty = state?.confidence === 'empty';
  const label = matched
    ? (state?.championName ??
      asset?.name ??
      knowledgeTemplateFallback(
        state?.templatePath,
        t('goldenSpatula.recognition.unknownChampion'),
      ))
    : empty
      ? t('goldenSpatula.recognition.emptySlot')
      : t('goldenSpatula.recognition.unknownSlot');

  return (
    <div className="min-w-0 rounded-md bg-bg-primary p-2 ring-1 ring-inset ring-border/60">
      <div className="flex items-center justify-between gap-1">
        <span className="text-[10px] font-medium text-text-muted">
          {t('goldenSpatula.recognition.shopSlot', { slot: slot.label })}
        </span>
        <StatusPill tone={matched ? 'success' : empty ? 'warning' : 'muted'}>
          {matched
            ? t('goldenSpatula.recognition.status.success')
            : empty
              ? t('goldenSpatula.recognition.status.miss')
              : t('goldenSpatula.recognition.notScanned')}
        </StatusPill>
      </div>
      <div className="mt-1 flex items-center gap-1.5">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded p-[2px] text-[9px] text-text-secondary"
          style={costFrameStyle(asset?.cost)}
        >
          <div className="h-full w-full overflow-hidden rounded bg-bg-tertiary">
            {matched ? (
              <LineupAssetImage
                imagePath={asset?.imagePath}
                fallback={shortUnitName(label)}
                basePath={basePath}
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center">?</span>
            )}
          </div>
        </div>
        <span className="min-w-0 truncate text-xs font-medium text-text-primary">{label}</span>
      </div>
    </div>
  );
}

function ShopObservationGrid({
  shopSlots,
  championAssets,
  basePath,
  t,
}: {
  shopSlots: GoldenSpatulaKnowledgeScanState['shopSlots'];
  championAssets: GoldenSpatulaChampionAssetIndex | undefined;
  basePath: string;
  t: TFunction;
}) {
  return (
    <div>
      <div className="mb-1 text-[11px] font-medium text-text-secondary">
        {t('goldenSpatula.recognition.currentShop')}
      </div>
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-5">
        {goldenSpatulaShopChampionSlots.map((slot) => (
          <KnowledgeShopSlotCard
            key={slot.index}
            slot={slot}
            state={shopSlots[slot.index]}
            championAssets={championAssets}
            basePath={basePath}
            t={t}
          />
        ))}
      </div>
    </div>
  );
}

function knowledgeItemKindTone(
  kind: GoldenSpatulaKnowledgeItemKind,
): 'success' | 'warning' | 'error' | 'muted' {
  if (kind === 'basicItems') return 'muted';
  if (kind === 'completedItems') return 'success';
  return 'warning';
}

function sortKnowledgeItems(
  items: Record<string, GoldenSpatulaKnowledgeItemState>,
): GoldenSpatulaKnowledgeItemState[] {
  return Object.values(items).sort((left, right) => right.updatedAt - left.updatedAt);
}

function KnowledgeItemChip({
  item,
  itemAssets,
  basePath,
  t,
}: {
  item: GoldenSpatulaKnowledgeItemState;
  itemAssets: GoldenSpatulaItemAssetIndex | undefined;
  basePath: string;
  t: TFunction;
}) {
  const asset = findAssetByTemplatePath(item.templatePath, itemAssets);
  const label =
    asset?.name ??
    knowledgeTemplateFallback(item.templatePath, t('goldenSpatula.recognition.unknownItem'));

  return (
    <div className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-md bg-bg-primary px-1.5 py-1 ring-1 ring-inset ring-border/60">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded bg-bg-tertiary text-[9px] text-text-secondary">
        <LineupAssetImage
          imagePath={asset?.imagePath}
          fallback={label.slice(0, 1)}
          basePath={basePath}
        />
      </div>
      <div className="min-w-0">
        <div className="truncate text-[11px] font-medium text-text-primary">{label}</div>
        <div className="mt-0.5 flex flex-wrap gap-0.5">
          <StatusPill tone={knowledgeItemKindTone(item.itemKind)}>
            {t(`goldenSpatula.recognition.itemKind.${item.itemKind}`)}
          </StatusPill>
          {item.zones.slice(0, 2).map((zone) => (
            <span key={zone} className="rounded bg-bg-tertiary px-1 text-[10px] text-text-muted">
              {t(`goldenSpatula.recognition.zone.${zone}`)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function sortKnowledgeSelectedAugments(
  augments: Record<number, GoldenSpatulaKnowledgeSelectedAugmentState> | undefined,
): GoldenSpatulaKnowledgeSelectedAugmentState[] {
  return Object.values(augments ?? {})
    .filter((augment) => augment.confidence === 'matched')
    .sort((left, right) => left.slotIndex - right.slotIndex);
}

function findAugmentAssetByName(
  name: string | undefined,
  assets: GoldenSpatulaAugmentAssetIndex | undefined,
): GoldenSpatulaAugmentAsset | undefined {
  const normalized = normalizeSearchText(name ?? '');
  if (!normalized) return undefined;
  return Object.values(assets ?? {}).find(
    (asset) => normalizeSearchText(asset.name) === normalized,
  );
}

function KnowledgeSelectedAugmentChip({
  augment,
  augmentAssets,
  basePath,
  t,
}: {
  augment: GoldenSpatulaKnowledgeSelectedAugmentState;
  augmentAssets: GoldenSpatulaAugmentAssetIndex | undefined;
  basePath: string;
  t: TFunction;
}) {
  const asset =
    findAssetByTemplatePath(augment.templatePath, augmentAssets) ??
    findAugmentAssetByName(augment.augmentName, augmentAssets);
  const label =
    asset?.name ??
    augment.augmentName ??
    knowledgeTemplateFallback(augment.templatePath, t('goldenSpatula.recognition.unknownAugment'));
  const scoreText =
    augment.score !== undefined && Number.isFinite(augment.score)
      ? `${Math.round(augment.score * 100)}%`
      : undefined;

  return (
    <div className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-md bg-bg-primary px-1.5 py-1 ring-1 ring-inset ring-border/60">
      <div
        className={clsx(
          'flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded ring-1 ring-inset',
          getAugmentLevelFrameClass(asset?.level),
        )}
      >
        <LineupAssetImage
          imagePath={asset?.imagePath}
          fallback={label.slice(0, 1)}
          basePath={basePath}
        />
      </div>
      <div className="min-w-0">
        <div className="truncate text-[11px] font-medium text-text-primary">{label}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-0.5">
          {asset?.level !== undefined && (
            <span className="rounded bg-bg-tertiary px-1 text-[10px] text-text-muted">
              {t('goldenSpatula.lineups.augmentLevel', { level: asset.level })}
            </span>
          )}
          {scoreText && (
            <span className="rounded bg-bg-tertiary px-1 text-[10px] text-text-muted">
              {scoreText}
            </span>
          )}
        </div>
      </div>
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
  const items = sortKnowledgeItems(state.items);
  const selectedAugments = sortKnowledgeSelectedAugments(state.selectedAugments);
  const latestText = state.lastEvent?.message ?? t('goldenSpatula.recognition.knowledgeNoEvents');

  return (
    <div className="space-y-2 rounded-md bg-bg-tertiary/70 p-2">
      <div className="flex items-center justify-between gap-2">
        <SectionTitle
          icon={Crosshair}
          label={t('goldenSpatula.recognition.knowledgeObservation')}
        />
        <StatusPill tone={state.active ? 'success' : 'muted'}>
          {state.active
            ? t('goldenSpatula.lineups.rollStatusRunning')
            : t('goldenSpatula.lineups.rollStatusIdle')}
        </StatusPill>
      </div>

      <div>
        <div className="mb-1 text-[11px] font-medium text-text-secondary">
          {t('goldenSpatula.recognition.currentSelectedAugments')}
        </div>
        {selectedAugments.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {selectedAugments.map((augment) => (
              <KnowledgeSelectedAugmentChip
                key={`${augment.slotIndex}:${augment.templatePath ?? augment.augmentName ?? 'unknown'}`}
                augment={augment}
                augmentAssets={augmentAssets}
                basePath={basePath}
                t={t}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-md bg-bg-primary p-2 text-xs text-text-muted">
            {t('goldenSpatula.recognition.noSelectedAugmentsObserved')}
          </div>
        )}
      </div>

      <div>
        <div className="mb-1 text-[11px] font-medium text-text-secondary">
          {t('goldenSpatula.recognition.currentItems')}
        </div>
        {items.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {items.slice(0, 12).map((item) => (
              <KnowledgeItemChip
                key={`${item.itemKind}:${item.templatePath}`}
                item={item}
                itemAssets={itemAssets}
                basePath={basePath}
                t={t}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-md bg-bg-primary p-2 text-xs text-text-muted">
            {t('goldenSpatula.recognition.noItemsObserved')}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 text-[11px] text-text-muted">
        <span className="min-w-0 truncate">{latestText}</span>
        <span className="shrink-0">
          {t('goldenSpatula.lineups.rollStatusLastUpdated', {
            time: formatRollEventTime(state.updatedAt, '-'),
          })}
        </span>
      </div>
    </div>
  );
}

function mergeShopSlotsFromRollEvent(
  previous: GoldenSpatulaKnowledgeScanState,
  event: GoldenSpatulaRollEvent,
): GoldenSpatulaKnowledgeScanState {
  const shouldReset = event.kind === 'started' || event.kind === 'refreshed';
  const shouldMarkMatched =
    (event.kind === 'bought' || event.kind === 'buyConfirmed') &&
    event.slotIndex !== undefined &&
    Boolean(event.targetName);

  if (!shouldReset && !shouldMarkMatched) return previous;

  const shopSlots = shouldReset ? {} : { ...previous.shopSlots };
  if (shouldMarkMatched && event.slotIndex !== undefined && event.targetName) {
    shopSlots[event.slotIndex] = {
      slotIndex: event.slotIndex,
      slotLabel: event.slotLabel,
      championName: event.targetName,
      confidence: 'matched',
      updatedAt: event.timestamp,
    };
  }

  return {
    ...previous,
    shopSlots,
    updatedAt: event.timestamp,
  };
}

function buildShopVisionKnowledgeEvents(
  result: GoldenSpatulaShopVisionResult,
  t: TFunction,
): GoldenSpatulaKnowledgeEvent[] {
  if (result.slots.length === 0) return [];

  const timestamp = result.scannedAt;
  const startEvent: GoldenSpatulaKnowledgeEvent = {
    id: `${timestamp}-shop-vision-started`,
    timestamp,
    kind: 'shopScanStarted',
    scanKind: 'champions',
    message: t('goldenSpatula.recognition.knowledgeEvent.shopScanStarted'),
    nodeName: 'ShopVision',
  };
  const slotEvents = result.slots.map<GoldenSpatulaKnowledgeEvent>((slot) => {
    const matched = slot.confidence === 'matched';
    const kind = matched ? 'shopChampionHit' : 'shopSlotMiss';
    return {
      id: `${timestamp}-shop-vision-${slot.slotIndex}`,
      timestamp,
      kind,
      scanKind: 'champions',
      slotIndex: slot.slotIndex,
      slotLabel: slot.slotLabel,
      championName: slot.championName,
      templatePath: slot.templatePath,
      rawText: slot.score !== undefined ? slot.score.toFixed(3) : undefined,
      message: t(`goldenSpatula.recognition.knowledgeEvent.${kind}`, {
        slot: slot.slotLabel,
      }),
      nodeName: 'ShopVision',
    };
  });
  const completedEvent: GoldenSpatulaKnowledgeEvent = {
    id: `${timestamp}-shop-vision-completed`,
    timestamp,
    kind: 'shopScanCompleted',
    scanKind: 'champions',
    message: t('goldenSpatula.recognition.knowledgeEvent.shopScanCompleted'),
    nodeName: 'ShopVision',
  };

  return [startEvent, ...slotEvents, completedEvent];
}

function buildSelectedAugmentKnowledgeEvents(
  result: GoldenSpatulaSelectedAugmentVisionResult,
  t: TFunction,
): GoldenSpatulaKnowledgeEvent[] {
  if (result.slots.length === 0) return [];

  const timestamp = result.scannedAt;
  const startEvent: GoldenSpatulaKnowledgeEvent = {
    id: `${timestamp}-selected-augment-vision-started`,
    timestamp,
    kind: 'selectedAugmentScanStarted',
    scanKind: 'augments',
    message: t('goldenSpatula.recognition.knowledgeEvent.selectedAugmentScanStarted'),
    nodeName: 'SelectedAugmentVision',
  };
  const slotEvents = result.slots.map<GoldenSpatulaKnowledgeEvent>((slot) => {
    const matched = slot.confidence === 'matched';
    const kind = matched ? 'selectedAugmentHit' : 'selectedAugmentSlotMiss';
    return {
      id: `${timestamp}-selected-augment-vision-${slot.slotIndex}`,
      timestamp,
      kind,
      scanKind: 'augments',
      slotIndex: slot.slotIndex,
      slotLabel: slot.slotLabel,
      augmentName: slot.augmentName,
      templatePath: slot.templatePath,
      score: slot.score,
      rawText: slot.score !== undefined ? slot.score.toFixed(3) : undefined,
      message: t(`goldenSpatula.recognition.knowledgeEvent.${kind}`, {
        slot: slot.slotLabel,
        augmentName: slot.augmentName,
      }),
      nodeName: 'SelectedAugmentVision',
    };
  });
  const completedEvent: GoldenSpatulaKnowledgeEvent = {
    id: `${timestamp}-selected-augment-vision-completed`,
    timestamp,
    kind: 'selectedAugmentScanCompleted',
    scanKind: 'augments',
    message: t('goldenSpatula.recognition.knowledgeEvent.selectedAugmentScanCompleted'),
    nodeName: 'SelectedAugmentVision',
  };

  return [startEvent, ...slotEvents, completedEvent];
}

function buildAugmentChoiceVisionScanState(
  result: GoldenSpatulaAugmentChoiceVisionResult,
  t: TFunction,
): GoldenSpatulaAugmentScanState {
  const timestamp = result.scannedAt;
  const choices: GoldenSpatulaAugmentScanState['choices'] = {};
  const slotEvents = result.slots.map<GoldenSpatulaAugmentScanEvent>((slot) => {
    const matched = slot.confidence === 'matched' && Boolean(slot.augmentName);
    if (matched) {
      choices[slot.slotIndex] = {
        slotIndex: slot.slotIndex,
        slotLabel: slot.slotLabel,
        titleText: slot.augmentName,
        titleStatus: 'recognized',
        descriptionStatus: 'unknown',
        updatedAt: timestamp,
      };
    }

    return {
      id: `${timestamp}-augment-choice-vision-${slot.slotIndex}`,
      timestamp,
      kind: matched ? 'recognized' : 'scanFailed',
      slotIndex: slot.slotIndex,
      slotLabel: slot.slotLabel,
      field: 'title',
      rawText: slot.augmentName,
      title: slot.augmentName,
      matchedName: slot.augmentName,
      score: slot.score,
      message: t(
        `goldenSpatula.lineups.augmentStatusEvent.${matched ? 'recognized' : 'scanFailed'}`,
        {
          slot: slot.slotLabel,
          field: t('goldenSpatula.lineups.augmentField.title'),
          text: slot.augmentName,
        },
      ),
      nodeName: 'AugmentChoiceVision',
    };
  });
  const scannedEvent: GoldenSpatulaAugmentScanEvent = {
    id: `${timestamp}-augment-choice-vision-scanned`,
    timestamp,
    kind: 'scanned',
    message: t('goldenSpatula.lineups.augmentStatusEvent.scanned'),
    nodeName: 'AugmentChoiceVision',
  };

  return {
    active: false,
    startedAt: timestamp,
    updatedAt: timestamp,
    choices,
    lastEvent: scannedEvent,
    events: [scannedEvent, ...slotEvents],
  };
}

function decisionActionTone(action: string): 'success' | 'warning' | 'error' | 'muted' {
  switch (action) {
    case 'roll':
      return 'warning';
    case 'save':
      return 'success';
    case 'level':
      return 'success';
    default:
      return 'muted';
  }
}

function rollDecisionBandTone(
  band: GoldenSpatulaDecisionPlan['economyAdvice']['breakdown']['rollDecisionScore']['band'],
): 'success' | 'warning' | 'error' | 'muted' {
  if (band === 'rollToQuality') return 'warning';
  if (band === 'smallRoll') return 'success';
  return 'muted';
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
  const levelLocked = pick.shopOddsAvailability === 'unavailable';
  const targetDisabled = levelLocked && !selected;
  const scoreText = Math.round(pick.score);
  const primaryReasons = pick.reasons.slice(0, 2);
  const visibleTraits = pick.traitTags.slice(0, 2);
  const oddsTone =
    pick.shopOddsAvailability === 'available'
      ? 'success'
      : pick.shopOddsAvailability === 'rare'
        ? 'warning'
        : pick.shopOddsAvailability === 'unavailable'
          ? 'error'
          : 'muted';
  const shopOddsLabel =
    pick.currentLevel !== undefined && pick.shopOdds !== undefined
      ? t('goldenSpatula.lineups.decisionShopOdds', {
          level: pick.currentLevel,
          odds: formatShopOddsPercent(pick.shopOdds),
        })
      : pick.shopOdds !== undefined && pick.shopOddsSource === 'ocr'
        ? t('goldenSpatula.lineups.decisionShopOddsOcr', {
            odds: formatShopOddsPercent(pick.shopOdds),
          })
        : pick.shopOdds !== undefined && pick.shopOddsSource === 'mixed'
          ? t('goldenSpatula.lineups.decisionShopOddsMixed', {
              odds: formatShopOddsPercent(pick.shopOdds),
            })
          : t('goldenSpatula.lineups.decisionShopOddsUnknown');

  return (
    <div className="min-w-0 rounded-md border border-border/70 bg-bg-primary p-2 transition-colors hover:border-accent/40">
      <div className="flex items-start gap-2">
        <div
          className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded p-[2px] text-[10px] text-text-secondary"
          style={costFrameStyle(asset?.cost ?? pick.cost)}
        >
          <div className="h-full w-full overflow-hidden rounded bg-bg-primary">
            <LineupAssetImage
              imagePath={asset?.imagePath}
              fallback={shortUnitName(pick.name)}
              basePath={basePath}
            />
          </div>
          <span className="absolute right-0 top-0 rounded-bl bg-bg-primary/90 px-1 text-[9px] font-semibold text-accent">
            {scoreText}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-1">
            <div className="min-w-0">
              <div className="truncate text-xs font-medium text-text-primary">{pick.name}</div>
              <div className="mt-0.5 truncate text-[11px] text-text-muted">
                {t(`goldenSpatula.lineups.decisionRole.${pick.role}`)}
                {pick.cost !== undefined
                  ? ` · ${t('goldenSpatula.lineups.decisionCost', { cost: pick.cost })}`
                  : ''}
                {` · ${t('goldenSpatula.lineups.decisionOwned', { count: pick.ownedCount })}`}
                {pick.copiesNeeded > 0
                  ? ` · ${t('goldenSpatula.lineups.decisionNeed', { count: pick.copiesNeeded })}`
                  : ''}
              </div>
            </div>
            <StatusPill tone={pick.tier === 'core' || pick.tier === 'high' ? 'success' : 'muted'}>
              {t(`goldenSpatula.lineups.decisionTier.${pick.tier}`)}
            </StatusPill>
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {pick.shopVisibleCount !== undefined && pick.shopVisibleCount > 0 && (
              <StatusPill tone="success">
                {t('goldenSpatula.lineups.decisionShopVisible', {
                  count: pick.shopVisibleCount,
                })}
              </StatusPill>
            )}
            {pick.observedItemMatchCount !== undefined && pick.observedItemMatchCount > 0 && (
              <StatusPill tone="success">
                {t('goldenSpatula.lineups.decisionItemFit', {
                  count: pick.observedItemMatchCount,
                })}
              </StatusPill>
            )}
            <StatusPill tone={oddsTone}>
              {shopOddsLabel}
            </StatusPill>
            {pick.levelUpShopOddsGain !== undefined &&
              pick.levelUpShopOddsGain > 0 &&
              pick.nextLevel !== undefined && (
                <StatusPill tone={levelLocked ? 'warning' : 'muted'}>
                  {t('goldenSpatula.lineups.decisionLevelUpOdds', {
                    level: pick.nextLevel,
                    odds: formatShopOddsPercent(pick.levelUpShopOddsGain),
                  })}
                </StatusPill>
              )}
            {pick.acquisitionExpectedRolls !== undefined && (
              <StatusPill tone={expectedRollsTone(pick.acquisitionExpectedRolls)}>
                {t('goldenSpatula.lineups.decisionExpectedRolls', {
                  rolls: formatDecisionEstimate(pick.acquisitionExpectedRolls),
                })}
              </StatusPill>
            )}
            {pick.acquisitionCompletionChance !== undefined && (
              <StatusPill tone={completionChanceTone(pick.acquisitionCompletionChance)}>
                {t('goldenSpatula.lineups.decisionCompletionChance', {
                  chance: formatShopOddsPercent(pick.acquisitionCompletionChance),
                })}
              </StatusPill>
            )}
          </div>
        </div>
      </div>

      {(primaryReasons.length > 0 || visibleTraits.length > 0) && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {primaryReasons.map((reason) => (
          <span key={reason} className={goldenSpatulaAccentTagClass}>
            {t(`goldenSpatula.lineups.decisionReason.${reason}`)}
          </span>
          ))}
          {visibleTraits.map((tag) => (
            <span key={tag} className={goldenSpatulaNeutralTagClass}>
              {tag}
            </span>
          ))}
        </div>
      )}

      <button
        type="button"
        disabled={targetDisabled}
        onClick={onToggle}
        className={clsx(
          'mt-1.5 inline-flex w-full items-center justify-center gap-1 rounded-md px-2 py-1 text-[11px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
          targetDisabled
            ? 'cursor-not-allowed bg-bg-tertiary text-text-muted opacity-70'
            : selected
              ? 'bg-accent/10 text-accent ring-1 ring-inset ring-accent/30'
              : 'bg-bg-tertiary text-text-secondary hover:text-accent',
        )}
      >
        <Target className="h-3 w-3" />
        {targetDisabled
          ? t('goldenSpatula.lineups.decisionLevelLockedAction')
          : selected
            ? t('goldenSpatula.lineups.decisionTargetSelected')
            : t('goldenSpatula.lineups.decisionSetTarget')}
      </button>
    </div>
  );
}

function formatAugmentReason(reason: GoldenSpatulaAugmentScoreReason, t: TFunction): string {
  return t(`goldenSpatula.lineups.augmentReason.${reason.kind}`, {
    keyword: reason.keyword,
    name: reason.assetName,
    weight: Math.abs(reason.weight),
  });
}

function AugmentDecisionPanel({
  decision,
  scanState,
  detecting,
  polling,
  picking,
  pickDisabledReason,
  onPick,
  t,
}: {
  decision: GoldenSpatulaAugmentDecision;
  scanState: GoldenSpatulaAugmentScanState;
  detecting: boolean;
  polling: boolean;
  picking: boolean;
  pickDisabledReason?: string;
  onPick: () => void;
  t: TFunction;
}) {
  const options = decision.options;
  const bestSlot = decision.bestOption?.slotIndex;

  return (
    <div className="space-y-2 rounded-md bg-bg-tertiary/70 p-2 ring-1 ring-inset ring-border/60">
      <div className="flex items-center justify-between gap-2">
        <SectionTitle icon={Sparkles} label={t('goldenSpatula.lineups.augmentTitle')} />
        {decision.recommendationNote && (
          <span className="truncate text-[11px] text-text-muted" title={decision.recommendationNote}>
            {decision.recommendationNote}
          </span>
        )}
      </div>

      <p className="text-[11px] leading-relaxed text-text-muted">
        {t('goldenSpatula.lineups.augmentSubtitle')}
      </p>

      {options.length > 0 ? (
        <div className="grid gap-2 lg:grid-cols-3">
          {options.map((option) => {
            const selected = option.slotIndex === bestSlot;
            const title =
              option.matchedAsset?.name ||
              option.titleText ||
              option.rawText ||
              t('goldenSpatula.lineups.augmentUnknown');
            return (
              <div
                key={option.slotIndex}
                className={clsx(
                  'rounded-md border bg-bg-primary p-2 text-xs shadow-sm',
                  selected ? 'border-accent/60 ring-1 ring-accent/30' : 'border-border/70',
                )}
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="font-medium text-text-primary">
                    {t('goldenSpatula.lineups.augmentSlot', {
                      slot: option.slotLabel || option.slotIndex,
                    })}
                  </span>
                  <span
                    className={clsx(
                      'rounded px-1.5 py-0.5 text-[11px] font-medium',
                      selected ? 'bg-accent/10 text-accent' : 'bg-bg-tertiary text-text-secondary',
                    )}
                  >
                    {t('goldenSpatula.lineups.augmentScore', { score: option.score })}
                  </span>
                </div>
                <div className="truncate font-medium text-text-primary" title={title}>
                  {title}
                </div>
                {option.descriptionText && (
                  <div className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-text-muted">
                    {option.descriptionText}
                  </div>
                )}
                {option.matchedAsset && (
                  <div className="mt-1 text-[11px] text-text-secondary">
                    {t('goldenSpatula.lineups.augmentMatched', {
                      name: option.matchedAsset.name,
                    })}
                  </div>
                )}
                {option.reasons.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {option.reasons.slice(0, 4).map((reason, index) => (
                      <span
                        key={`${reason.kind}-${index}`}
                        className={clsx(
                          'rounded px-1.5 py-0.5 text-[10px]',
                          reason.weight < 0
                            ? 'bg-warning/10 text-warning'
                            : 'bg-success/10 text-success',
                        )}
                      >
                        {formatAugmentReason(reason, t)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-border bg-bg-primary p-2 text-xs text-text-muted">
          {t('goldenSpatula.lineups.augmentNoOcr')}
        </div>
      )}

      {scanState.lastEvent && (
        <div className="text-[11px] text-text-muted">{scanState.lastEvent.message}</div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <StatusPill tone={detecting || polling ? 'success' : 'muted'}>
          {detecting
            ? t('goldenSpatula.lineups.augmentDetecting')
            : polling
              ? t('goldenSpatula.lineups.augmentMonitoring')
              : t('goldenSpatula.lineups.augmentPresenceMissing')}
        </StatusPill>
        <button
          type="button"
          disabled={Boolean(pickDisabledReason)}
          onClick={onPick}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-accent px-2 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          title={pickDisabledReason || t('goldenSpatula.lineups.augmentPickBest')}
        >
          {picking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Target className="h-3.5 w-3.5" />}
          <span>
            {picking
              ? t('goldenSpatula.lineups.augmentPicking')
              : t('goldenSpatula.lineups.augmentPickBest')}
          </span>
        </button>
      </div>
    </div>
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
  onApplySortedTargets,
  onApplyRecommendedCounts,
  t,
}: {
  plan: GoldenSpatulaDecisionPlan;
  championAssets: GoldenSpatulaChampionAssetIndex | undefined;
  basePath: string;
  shopOdds: GoldenSpatulaEconomyRunState['shopOdds'];
  shopOddsSource: GoldenSpatulaShopOddsSource | undefined;
  activeTargetNames: string[];
  onToggleTarget: (name: string) => void;
  onApplySortedTargets?: (names: string[]) => void;
  onApplyRecommendedCounts?: () => void;
  t: TFunction;
}) {
  const selectedTargets = new Set(activeTargetNames.map(normalizeSearchText));
  const advice = plan.economyAdvice;
  const hasRecommendedCounts =
    advice.recommendedRollCount > 0 || (advice.recommendedXpPurchaseCount ?? 0) > 0;
  const benchInterestAdvice = advice.benchInterestAdvice;
  const roundPolicy = advice.breakdown.roundPolicy;
  const benchSellGold =
    benchInterestAdvice?.sellCandidates.reduce((sum, candidate) => sum + candidate.sellGold, 0) ??
    0;

  return (
    <div className="space-y-2 rounded-md bg-bg-tertiary/70 p-2">
      <div className="flex items-center justify-between gap-2">
        <SectionTitle icon={Sparkles} label={t('goldenSpatula.lineups.decisionTitle')} />
        <div className="flex shrink-0 items-center gap-1">
          {onApplySortedTargets && plan.recommendedRollTargetNames.length > 0 && (
            <button
              type="button"
              onClick={() => onApplySortedTargets(plan.recommendedRollTargetNames)}
              className="inline-flex h-6 items-center gap-1 rounded-md border border-border bg-bg-primary px-2 text-[11px] font-medium text-text-secondary transition-colors hover:border-accent hover:text-accent"
              title={t('goldenSpatula.lineups.decisionApplySortedTargetsTitle')}
            >
              <ListChecks className="h-3 w-3" />
              <span className="hidden sm:inline">
                {t('goldenSpatula.lineups.decisionApplySortedTargets')}
              </span>
            </button>
          )}
          {onApplyRecommendedCounts && hasRecommendedCounts && (
            <button
              type="button"
              onClick={onApplyRecommendedCounts}
              className="inline-flex h-6 items-center gap-1 rounded-md border border-border bg-bg-primary px-2 text-[11px] font-medium text-text-secondary transition-colors hover:border-accent hover:text-accent"
              title={t('goldenSpatula.lineups.decisionApplyAutomationCountsTitle')}
            >
              <Sparkles className="h-3 w-3" />
              <span className="hidden sm:inline">
                {t('goldenSpatula.lineups.decisionApplyAutomationCounts')}
              </span>
            </button>
          )}
          <StatusPill tone={decisionActionTone(advice.action)}>
            {t(`goldenSpatula.lineups.decisionEconomyAction.${advice.action}`)}
          </StatusPill>
        </div>
      </div>

      <div className="rounded-md bg-bg-primary p-2 ring-1 ring-inset ring-border/60">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-xs font-medium text-text-primary">
              {t(`goldenSpatula.lineups.decisionEconomyHeadline.${advice.action}`)}
            </div>
            <div className="mt-1 truncate text-[11px] text-text-muted">
              {t('goldenSpatula.lineups.decisionSearchMeta', {
                candidates: plan.evaluatedCandidates,
                lineups: plan.evaluatedLineups,
              })}
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-1">
            <StatusPill tone="muted">
              {t(`goldenSpatula.lineups.decisionConfidence.${advice.confidence}`)}
            </StatusPill>
            <StatusPill tone={rollDecisionBandTone(advice.breakdown.rollDecisionScore.band)}>
              {t('goldenSpatula.lineups.decisionRollScore', {
                score: advice.breakdown.rollDecisionScore.total,
              })}
            </StatusPill>
            {roundPolicy && (
              <StatusPill tone={decisionActionTone(roundPolicy.action)}>
                {t('goldenSpatula.lineups.decisionRoundPolicy', {
                  checkpoint: roundPolicy.checkpoint,
                  kind: t(`goldenSpatula.lineups.decisionRoundPolicyKind.${roundPolicy.kind}`),
                })}
              </StatusPill>
            )}
            {advice.breakdown.projectedRollBudget !== undefined && (
              <StatusPill tone="muted">
                {t('goldenSpatula.lineups.decisionEconomyRollBudget', {
                  count: advice.breakdown.projectedRollBudget,
                })}
              </StatusPill>
            )}
            {roundPolicy?.targetLevel !== undefined && (
              <StatusPill tone="muted">
                {t('goldenSpatula.lineups.decisionRoundPolicyLevel', {
                  level: roundPolicy.targetLevel,
                })}
              </StatusPill>
            )}
            {roundPolicy?.bankFloor !== undefined && (
              <StatusPill tone="muted">
                {t('goldenSpatula.lineups.decisionRoundPolicyBank', {
                  gold: roundPolicy.bankFloor,
                })}
              </StatusPill>
            )}
            {advice.breakdown.levelLockedPickCount > 0 && (
              <StatusPill tone="warning">
                {t('goldenSpatula.lineups.decisionEconomyLockedCount', {
                  count: advice.breakdown.levelLockedPickCount,
                })}
              </StatusPill>
            )}
            {advice.breakdown.levelUpTargetName &&
              advice.breakdown.levelUpShopOddsGain !== undefined &&
              advice.breakdown.levelUpShopOddsGain > 0 &&
              advice.breakdown.levelUpLevel !== undefined && (
                <StatusPill tone={advice.action === 'level' ? 'success' : 'muted'}>
                  {t('goldenSpatula.lineups.decisionEconomyLevelUpOdds', {
                    target: advice.breakdown.levelUpTargetName,
                    level: advice.breakdown.levelUpLevel,
                    odds: formatShopOddsPercent(advice.breakdown.levelUpShopOddsGain),
                  })}
                </StatusPill>
              )}
            {advice.recommendedXpPurchaseCount !== undefined &&
              advice.recommendedXpPurchaseCount > 0 && (
                <StatusPill tone="success">
                  {t('goldenSpatula.lineups.decisionRecommendedXp', {
                    count: advice.recommendedXpPurchaseCount,
                  })}
                </StatusPill>
              )}
            {advice.recommendedRollCount > 0 && (
              <StatusPill tone="warning">
                {t('goldenSpatula.lineups.decisionRecommendedRoll', {
                  count: advice.recommendedRollCount,
                })}
              </StatusPill>
            )}
            {advice.interestGoldNeeded !== undefined && advice.interestGoldNeeded > 0 && (
              <StatusPill tone="success">
                {t('goldenSpatula.lineups.decisionInterestGap', {
                  count: advice.interestGoldNeeded,
                })}
              </StatusPill>
            )}
            {benchInterestAdvice?.canReachNextInterest &&
              benchInterestAdvice.interestGoldNeeded !== undefined &&
              benchInterestAdvice.interestGoldNeeded > 0 && (
                <StatusPill tone="success">
                  {t('goldenSpatula.lineups.decisionBenchSellInterest', {
                    gold: benchInterestAdvice.interestGoldNeeded,
                  })}
                </StatusPill>
              )}
          </div>
        </div>
        {advice.urgentPickNames.length > 0 && (
          <div className="mt-1 truncate text-[11px] text-text-secondary">
            {t('goldenSpatula.lineups.decisionUrgentTargets', {
              targets: advice.urgentPickNames.join(' / '),
            })}
          </div>
        )}
        {benchInterestAdvice !== undefined &&
          benchInterestAdvice.sellCandidates.length > 0 &&
          benchInterestAdvice.interestGoldNeeded !== undefined &&
          benchInterestAdvice.interestGoldNeeded > 0 && (
            <div className="mt-1 truncate text-[11px] text-text-secondary">
              {t('goldenSpatula.lineups.decisionBenchSellCandidates', {
                targets: benchInterestAdvice.sellCandidates
                  .map((candidate) => candidate.name)
                  .join(' / '),
                gold: benchSellGold,
              })}
            </div>
          )}
        {advice.breakdown.rollDecisionScore.stopLineTargetNames.length > 0 && (
          <div className="mt-1 truncate text-[11px] text-text-muted">
            {t('goldenSpatula.lineups.decisionRollStopLine', {
              targets: advice.breakdown.rollDecisionScore.stopLineTargetNames.join(' / '),
            })}
          </div>
        )}
      </div>

      <div>
        <div className="mb-1 flex min-w-0 items-center justify-between gap-2">
          <div className="shrink-0 text-[11px] font-medium text-text-secondary">
            {t('goldenSpatula.lineups.decisionPicks')}
          </div>
          <ShopOddsSummary shopOdds={shopOdds} source={shopOddsSource} t={t} />
        </div>
        {plan.picks.length > 0 ? (
          <div className="grid grid-cols-1 gap-1.5 xl:grid-cols-2">
            {plan.picks.slice(0, 6).map((pick) => (
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

      <div>
        <div className="mb-1 text-[11px] font-medium text-text-secondary">
          {t('goldenSpatula.lineups.decisionTransitions')}
        </div>
        {plan.transitionLineups.length > 0 ? (
          <div className="space-y-1">
            {plan.transitionLineups.map((lineup) => (
              <div
                key={`${lineup.lineupId}-${lineup.variantId}`}
                className="rounded-md bg-bg-primary px-2 py-1.5 ring-1 ring-inset ring-border/50"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-xs font-medium text-text-primary">
                    {lineup.name}
                  </span>
                  <StatusPill tone="muted">
                    {t('goldenSpatula.lineups.decisionScore', { score: lineup.score })}
                  </StatusPill>
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {lineup.scoreBreakdown.sharedTraitScore > 0 && (
                    <StatusPill tone="muted">
                      {t('goldenSpatula.lineups.decisionTransitionTraitScore', {
                        score: formatDecisionEstimate(lineup.scoreBreakdown.sharedTraitScore),
                      })}
                    </StatusPill>
                  )}
                  {lineup.scoreBreakdown.unitScore > 0 && (
                    <StatusPill tone="muted">
                      {t('goldenSpatula.lineups.decisionTransitionUnitScore', {
                        score: formatDecisionEstimate(lineup.scoreBreakdown.unitScore),
                      })}
                    </StatusPill>
                  )}
                  <StatusPill tone={lineup.scoreBreakdown.coreReachRatio >= 0.8 ? 'success' : 'warning'}>
                    {t('goldenSpatula.lineups.decisionTransitionReach', {
                      percent: formatPercentValue(lineup.scoreBreakdown.coreReachRatio),
                    })}
                  </StatusPill>
                  {lineup.shopVisibleUnitNames && lineup.shopVisibleUnitNames.length > 0 && (
                    <StatusPill tone="success">
                      {t('goldenSpatula.lineups.decisionShopVisible', {
                        count: lineup.shopVisibleUnitNames.length,
                      })}
                    </StatusPill>
                  )}
                  {lineup.itemFitNames && lineup.itemFitNames.length > 0 && (
                    <StatusPill tone="success">
                      {t('goldenSpatula.lineups.decisionItemFit', {
                        count: lineup.itemFitNames.length,
                      })}
                    </StatusPill>
                  )}
                  {lineup.blockedUnitNames && lineup.blockedUnitNames.length > 0 && (
                    <StatusPill tone="warning">
                      {t('goldenSpatula.lineups.decisionReason.levelLocked')}
                    </StatusPill>
                  )}
                  {lineup.matchedUnitNames.length > 0 && (
                    <span className={goldenSpatulaAccentTagClass}>
                      {t('goldenSpatula.lineups.decisionOverlap', {
                        units: lineup.matchedUnitNames.join(' / '),
                      })}
                    </span>
                  )}
                  {lineup.shopVisibleUnitNames?.slice(0, 3).map((unitName) => (
                    <span key={`shop-${unitName}`} className={goldenSpatulaAccentTagClass}>
                      {unitName}
                    </span>
                  ))}
                  {lineup.itemFitNames?.slice(0, 3).map((itemName) => (
                    <span key={`item-${itemName}`} className={goldenSpatulaAccentTagClass}>
                      {itemName}
                    </span>
                  ))}
                  {lineup.traitTags.slice(0, 3).map((tag) => (
                    <span key={tag} className={goldenSpatulaNeutralTagClass}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-md bg-bg-primary p-2 text-xs text-text-muted">
            {t('goldenSpatula.lineups.decisionNoTransitions')}
          </div>
        )}
      </div>
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
    <div className="space-y-2">
      <div className="rounded-md bg-bg-tertiary p-2">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="text-[11px] font-medium text-text-secondary">
            {t('goldenSpatula.lineups.boardPreview')}
          </div>
          {variant.traitsSummary && (
            <span className="min-w-0 truncate text-[11px] text-text-muted">
              {variant.traitsSummary}
            </span>
          )}
        </div>
        <div className="grid grid-cols-7 gap-x-1.5 gap-y-3 pt-2">
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
                        'absolute -top-2 left-1/2 z-20 max-w-[calc(100%+12px)] -translate-x-1/2 truncate rounded bg-bg-primary/95 px-1 py-px text-[9px] font-medium shadow-sm ring-1 ring-border/70',
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
                          'absolute inset-[3px] flex items-center justify-center overflow-hidden bg-bg-primary',
                          carry && 'bg-accent/10',
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
                      <span className="absolute right-0 top-0 z-30 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[10px] font-bold leading-none text-slate-950 shadow-sm ring-1 ring-white/80">
                        C
                      </span>
                    )}
                    {(unit.items?.length ?? 0) > 0 && (
                      <div className="absolute -bottom-1 left-1/2 z-30 flex -translate-x-1/2 gap-0.5 rounded bg-bg-secondary/90 px-0.5 py-0.5 shadow-sm ring-1 ring-border/60 backdrop-blur-sm dark:bg-black/70 dark:ring-white/10">
                        {unit.items?.slice(0, 3).map((item, itemIndex) => (
                          <span
                            key={`${item}-${itemIndex}`}
                            className="flex h-[18px] w-[18px] items-center justify-center overflow-hidden rounded bg-bg-primary p-[1px] text-[7px] text-text-muted shadow-sm ring-1 ring-border/70 dark:bg-zinc-950 dark:text-zinc-400 dark:ring-white/10"
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
                    className="flex h-full w-full items-center justify-center overflow-hidden border border-border/50 bg-bg-primary/60 text-text-muted ring-1 ring-inset ring-border/50"
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
    <section className="border-t border-border/60 pt-2 first:border-t-0 first:pt-0">
      <div className="mb-2 text-xs font-semibold text-text-primary">{title}</div>
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
  const sizeClass = compact ? 'h-8 w-8 text-[8px]' : 'h-10 w-10 text-[9px]';
  return (
    <div className={clsx('min-w-0 text-center', compact ? 'w-10' : 'w-12')} title={item}>
      <div
        className={clsx(
          'mx-auto flex items-center justify-center overflow-hidden rounded-md bg-bg-primary shadow-sm ring-1 ring-border/70',
          sizeClass,
        )}
      >
        <LineupAssetImage
          imagePath={findItemAsset(item, itemAssets)?.imagePath}
          fallback={item.slice(0, 1)}
          basePath={basePath}
        />
      </div>
      {!compact && <div className="mt-1 truncate text-[10px] text-text-secondary">{item}</div>}
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
  const tileClass = compact ? 'h-9 w-9 text-[9px]' : 'h-12 w-12 text-[10px]';

  return (
    <div className={clsx('min-w-0 text-center', compact ? 'w-11' : 'w-14')} title={unitLabel(unit)}>
      <div
        className={clsx(
          'relative mx-auto flex items-center justify-center rounded p-[2px]',
          tileClass,
        )}
        style={costFrameStyle(asset?.cost)}
      >
        <div className="h-full w-full overflow-hidden rounded bg-bg-primary">
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
          'mt-1 truncate text-text-secondary',
          compact ? 'text-[10px]' : 'text-[11px] font-medium',
        )}
      >
        {unit.name}
      </div>
      {items.length > 0 && (
        <div className="mt-1 flex min-h-4 justify-center gap-0.5">
          {items.map((item, index) => (
            <span
              key={`${item}-${index}`}
              className="flex h-[18px] w-[18px] items-center justify-center overflow-hidden rounded bg-bg-primary p-[1px] text-[7px] text-text-muted ring-1 ring-border/70 dark:bg-zinc-950 dark:text-zinc-400 dark:ring-white/10"
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
    toggleTaskEnabled,
    updateInstance,
    setInstanceTaskStatus,
    registerTaskIdName,
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
  const [autoRollCount, setAutoRollCount] = useState<AutoRollCount>(3);
  const [autoBuyExperienceCount, setAutoBuyExperienceCount] = useState<AutoRollCount>(1);
  const [economyOcrSubmitting, setEconomyOcrSubmitting] = useState(false);
  const [economyOcrPolling, setEconomyOcrPolling] = useState(false);
  const [augmentOcrSubmitting, setAugmentOcrSubmitting] = useState(false);
  const [augmentOcrPolling, setAugmentOcrPolling] = useState(false);
  const [augmentPickSubmitting, setAugmentPickSubmitting] = useState(false);
  const [augmentPresence, setAugmentPresence] = useState<GoldenSpatulaAugmentPresenceResult>({
    visible: false,
    confidence: 0,
    slots: [],
  });
  const [autoRollBuySubmitting, setAutoRollBuySubmitting] = useState(false);
  const [autoLevelRollBuySubmitting, setAutoLevelRollBuySubmitting] = useState(false);
  const [autoBuyExperienceSubmitting, setAutoBuyExperienceSubmitting] = useState(false);
  const [rollRunState, setRollRunState] = useState<GoldenSpatulaRollRunState>(() =>
    createEmptyRollRunState(),
  );
  const [xpRunState, setXpRunState] = useState<GoldenSpatulaXpRunState>(() =>
    createEmptyXpRunState(),
  );
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
  }, [activeInstanceId, currentResourceName]);

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

        const rollEvent = buildRollEvent(
          message,
          callbackDetails,
          t,
        );
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

        const xpEvent = buildXpEvent(
          message,
          callbackDetails,
          t,
        );
        if (xpEvent) {
          setXpRunState((previous) => mergeXpEvent(previous, xpEvent));
          const economyEvent = buildEconomyEventFromXpEvent(xpEvent, t);
          if (economyEvent) {
            setEconomyRunState((previous) => mergeEconomyEvent(previous, economyEvent));
          }
          return;
        }

        const handEvent = buildHandEvent(
          message,
          callbackDetails,
          t,
        );
        if (handEvent) {
          setHandRunState((previous) => mergeHandEvent(previous, handEvent));
          return;
        }

        const economyEvent = buildEconomyEvent(
          message,
          callbackDetails,
          t,
        );
        if (economyEvent) {
          setEconomyRunState((previous) => mergeEconomyEvent(previous, economyEvent));
          return;
        }

        const augmentEvent = buildAugmentScanEvent(
          message,
          callbackDetails,
          t,
        );
        if (augmentEvent) {
          setAugmentScanState((previous) => mergeAugmentScanEvent(previous, augmentEvent));
        }

        const knowledgeEvent = buildKnowledgeEvent(
          message,
          callbackDetails,
          t,
        );
        if (knowledgeEvent) {
          setKnowledgeScanState((previous) => mergeKnowledgeEvent(previous, knowledgeEvent));
        }

        const summary = buildRecognitionSummary(
          message,
          callbackDetails,
          t,
        );
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
  const showAugmentDecisionPanel =
    augmentPresence.visible ||
    augmentScanState.active ||
    Object.keys(augmentScanState.choices).length > 0;
  const autoRollBuyTargets = useMemo(
    () => {
      if (!activeVariant) return [];

      return collectGoldenSpatulaDecisionRollTargetTemplates({
        variant: activeVariant,
        championAssets: assistantData?.championAssets.data,
        decisionPlan,
      });
    },
    [activeVariant, assistantData?.championAssets.data, decisionPlan],
  );
  const decisionRecommendedRollCount = toAutoRollCount(
    decisionPlan?.economyAdvice.recommendedRollCount,
  );
  const decisionRecommendedXpPurchaseCount = toAutoRollCount(
    decisionPlan?.economyAdvice.recommendedXpPurchaseCount,
  );
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
  const autoRollDisabledReason = !activeInstanceId
    ? t('goldenSpatula.lineups.noActiveInstance')
    : activeInstance?.isRunning
      ? t('goldenSpatula.lineups.taskRunning')
      : !activeLineup || !activeVariant
        ? t('goldenSpatula.lineups.noActiveLineup')
        : !autoRollTaskByCount[autoRollCount] ||
            !projectInterface?.task.some((task) => task.name === autoRollTaskByCount[autoRollCount])
          ? t('goldenSpatula.lineups.autoRollTaskMissing')
          : undefined;
  const autoRollBuyDisabledReason = !activeInstanceId
    ? t('goldenSpatula.lineups.noActiveInstance')
    : connectionStatus !== 'Connected'
      ? t('goldenSpatula.lineups.deviceNotConnected')
      : activeInstance?.isRunning || autoRollBuySubmitting
        ? t('goldenSpatula.lineups.taskRunning')
        : !activeLineup || !activeVariant
          ? t('goldenSpatula.lineups.noActiveLineup')
          : !projectInterface?.task.some((task) => task.name === autoRollBuyEntry)
            ? t('goldenSpatula.lineups.autoRollBuyTaskMissing')
            : !usingKnowledgeResource
              ? t('goldenSpatula.lineups.autoBuyNeedsKnowledgeResource')
              : !resourceLoaded
                ? t('goldenSpatula.lineups.autoBuyNeedsLoadedResource')
                : autoRollBuyTargets.length === 0
                  ? t('goldenSpatula.lineups.autoBuyNoMatchedTargets')
                  : undefined;
  const autoLevelRollBuyDisabledReason = !activeInstanceId
    ? t('goldenSpatula.lineups.noActiveInstance')
    : connectionStatus !== 'Connected'
      ? t('goldenSpatula.lineups.deviceNotConnected')
      : activeInstance?.isRunning ||
          autoRollBuySubmitting ||
          autoBuyExperienceSubmitting ||
          autoLevelRollBuySubmitting
        ? t('goldenSpatula.lineups.taskRunning')
        : !activeLineup || !activeVariant
          ? t('goldenSpatula.lineups.noActiveLineup')
          : !projectInterface?.task.some((task) => task.name === autoLevelRollBuyEntry)
            ? t('goldenSpatula.lineups.autoLevelRollBuyTaskMissing')
            : !usingKnowledgeResource
              ? t('goldenSpatula.lineups.autoBuyNeedsKnowledgeResource')
              : !resourceLoaded
                ? t('goldenSpatula.lineups.autoBuyNeedsLoadedResource')
                : autoRollBuyTargets.length === 0
                  ? t('goldenSpatula.lineups.autoBuyNoMatchedTargets')
                  : undefined;
  const economyOcrDisabledReason = !activeInstanceId
    ? t('goldenSpatula.lineups.noActiveInstance')
    : connectionStatus !== 'Connected'
      ? t('goldenSpatula.lineups.deviceNotConnected')
      : economyOcrSubmitting
        ? t('goldenSpatula.lineups.taskRunning')
        : !resourceLoaded
          ? t('goldenSpatula.lineups.resourceNotLoaded')
          : undefined;
  const augmentOcrDisabledReason = !activeInstanceId
    ? t('goldenSpatula.lineups.noActiveInstance')
    : connectionStatus !== 'Connected'
      ? t('goldenSpatula.lineups.deviceNotConnected')
      : augmentOcrSubmitting
        ? t('goldenSpatula.lineups.taskRunning')
        : !activeLineup || !activeVariant
          ? t('goldenSpatula.lineups.noActiveLineup')
          : !usingKnowledgeResource
            ? t('goldenSpatula.lineups.autoBuyNeedsKnowledgeResource')
            : !resourceLoaded
              ? t('goldenSpatula.lineups.autoBuyNeedsLoadedResource')
              : undefined;
  const augmentPickDisabledReason = !activeInstanceId
    ? t('goldenSpatula.lineups.noActiveInstance')
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
  const autoBuyExperienceDisabledReason = !activeInstanceId
    ? t('goldenSpatula.lineups.noActiveInstance')
    : connectionStatus !== 'Connected'
      ? t('goldenSpatula.lineups.deviceNotConnected')
      : activeInstance?.isRunning || autoBuyExperienceSubmitting
        ? t('goldenSpatula.lineups.taskRunning')
        : !resourceLoaded
          ? t('goldenSpatula.lineups.autoBuyNeedsLoadedResource')
          : !autoBuyExperienceTaskByCount[autoBuyExperienceCount] ||
              !projectInterface?.task.some(
                (task) => task.name === autoBuyExperienceTaskByCount[autoBuyExperienceCount],
              )
            ? t('goldenSpatula.lineups.autoBuyExperienceTaskMissing')
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

  const applyAutoRollTask = () => {
    if (autoRollDisabledReason || !activeInstanceId || !projectInterface) return;

    const taskName = autoRollTaskByCount[autoRollCount];
    if (!taskName) return;
    const currentInstance = useAppStore
      .getState()
      .instances.find((instance) => instance.id === activeInstanceId);

    for (const task of currentInstance?.selectedTasks ?? []) {
      if (autoRollTaskNames.has(task.taskName) && task.enabled && task.taskName !== taskName) {
        toggleTaskEnabled(activeInstanceId, task.id);
      }
    }

    const refreshedInstance = useAppStore
      .getState()
      .instances.find((instance) => instance.id === activeInstanceId);
    const existing = refreshedInstance?.selectedTasks.find((task) => task.taskName === taskName);

    if (existing) {
      if (!existing.enabled) {
        toggleTaskEnabled(activeInstanceId, existing.id);
      }
    } else {
      const taskDef = projectInterface.task.find((task) => task.name === taskName);
      if (taskDef) {
        addTaskToInstance(activeInstanceId, taskDef);
      }
    }

    toast.success(t('goldenSpatula.lineups.autoRollTaskApplied', { count: autoRollCount }));
  };

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

      let selectedAugmentVisionEvents: GoldenSpatulaKnowledgeEvent[] = [];
      const shouldCheckSelectedAugments =
        showToast ||
        timestamp - selectedAugmentVisionLastRunAtRef.current >= selectedAugmentCheckIntervalMs;
      if (shouldCheckSelectedAugments) {
        selectedAugmentVisionLastRunAtRef.current = timestamp;
        try {
          const selectedAugmentVisionResult =
            await recognizeGoldenSpatulaSelectedAugmentsFromDataUrl(cachedImage, {
              augmentAssets: assistantData?.augmentAssets.data,
              basePath,
            });
          selectedAugmentVisionEvents = buildSelectedAugmentKnowledgeEvents(
            selectedAugmentVisionResult,
            t,
          );
        } catch (error) {
          console.warn('Selected augment vision recognition failed:', error);
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
      const knowledgeEvents = [...shopVisionEvents, ...selectedAugmentVisionEvents];
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
    setAugmentOcrPolling(true);
    await submitEconomyOcrTask(true);
    augmentPresenceLastCheckAtRef.current = Date.now();
    await checkAugmentPresenceAndMaybeOcr(false);
  };

  async function submitAugmentOcrTask(showToast: boolean) {
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

      let image = await maaService.getCachedImage(activeInstanceId);
      if (!image.startsWith('data:image/')) {
        await maaService.postScreencap(activeInstanceId).catch(() => 0);
        await new Promise((resolve) => window.setTimeout(resolve, 120));
        image = await maaService.getCachedImage(activeInstanceId);
      }

      const presence = await detectGoldenSpatulaAugmentPresenceFromDataUrl(image);
      setAugmentPresence(presence);
      if (!presence.visible) {
        setAugmentScanState(createEmptyAugmentScanState());
        if (showToast) toast.info(t('goldenSpatula.lineups.augmentPresenceMissing'));
        return;
      }

      const result = await recognizeGoldenSpatulaAugmentChoicesFromDataUrl(image, {
        augmentAssets: assistantData?.augmentAssets.data,
        basePath,
      });
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
      const presence = await detectGoldenSpatulaAugmentPresenceFromDataUrl(image);
      setAugmentPresence(presence);

      if (!presence.visible) {
        if (!augmentScanState.active) setAugmentScanState(createEmptyAugmentScanState());
        if (showToast) toast.info(t('goldenSpatula.lineups.augmentPresenceMissing'));
        return;
      }

      if (!augmentOcrSubmitting && !augmentScanState.active) {
        await submitAugmentOcrTask(showToast);
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

  const runAutoRollBuyTask = async () => {
    if (autoRollBuyDisabledReason || !activeInstanceId || !activeVariant) {
      if (autoRollBuyDisabledReason) {
        toast.error(autoRollBuyDisabledReason);
      }
      return;
    }

    try {
      setAutoRollBuySubmitting(true);
      const startedAt = Date.now();
      setRollRunState({
        active: true,
        targetNames: autoRollBuyTargets.map((target) => target.name),
        rollCount: autoRollCount,
        currentCycle: 1,
        totalCycles: autoRollCount + 1,
        startedAt,
        updatedAt: startedAt,
        events: [],
      });
      setHandRunState({
        ...createEmptyHandRunState(),
        active: true,
        targetNames: autoRollBuyTargets.map((target) => target.name),
        startedAt,
        updatedAt: startedAt,
      });
      economyStabilizerRef.current = createGoldenSpatulaEconomyStabilizerState();
      setEconomyRunState({
        ...createEmptyEconomyRunState(),
        active: true,
        startedAt,
        updatedAt: startedAt,
      });
      const pipelineOverride = buildAutoRollBuyPipelineOverride(autoRollBuyTargets, autoRollCount);
      const maaTaskId = await maaService.runTask(
        activeInstanceId,
        autoRollBuyEntry,
        pipelineOverride,
      );

      registerTaskIdName(
        maaTaskId,
        t('goldenSpatula.lineups.autoRollBuyTaskName', { count: autoRollCount }),
      );
      updateInstance(activeInstanceId, { isRunning: true });
      setInstanceTaskStatus(activeInstanceId, 'Running');
      toast.success(t('goldenSpatula.lineups.autoRollBuyStarted', { count: autoRollCount }));
    } catch (error) {
      setRollRunState((previous) => ({ ...previous, active: false, updatedAt: Date.now() }));
      setHandRunState((previous) => ({ ...previous, active: false, updatedAt: Date.now() }));
      setEconomyRunState((previous) => ({ ...previous, active: false, updatedAt: Date.now() }));
      toast.error(
        t('goldenSpatula.lineups.autoRollBuyFailed', {
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    } finally {
      setAutoRollBuySubmitting(false);
    }
  };

  const runAutoLevelRollBuyTask = async () => {
    if (autoLevelRollBuyDisabledReason || !activeInstanceId || !activeVariant) {
      if (autoLevelRollBuyDisabledReason) {
        toast.error(autoLevelRollBuyDisabledReason);
      }
      return;
    }

    try {
      setAutoLevelRollBuySubmitting(true);
      const startedAt = Date.now();
      setXpRunState({
        active: true,
        current: 0,
        total: autoBuyExperienceCount,
        startedAt,
        updatedAt: startedAt,
        events: [],
      });
      setRollRunState({
        active: true,
        targetNames: autoRollBuyTargets.map((target) => target.name),
        rollCount: autoRollCount,
        currentCycle: 1,
        totalCycles: autoRollCount + 1,
        startedAt,
        updatedAt: startedAt,
        events: [],
      });
      setHandRunState({
        ...createEmptyHandRunState(),
        active: true,
        targetNames: autoRollBuyTargets.map((target) => target.name),
        startedAt,
        updatedAt: startedAt,
      });
      economyStabilizerRef.current = createGoldenSpatulaEconomyStabilizerState();
      setEconomyRunState({
        ...createEmptyEconomyRunState(),
        active: true,
        startedAt,
        updatedAt: startedAt,
      });
      const pipelineOverride = buildAutoLevelRollBuyPipelineOverride(
        autoRollBuyTargets,
        autoRollCount,
        autoBuyExperienceCount,
      );
      const maaTaskId = await maaService.runTask(
        activeInstanceId,
        autoLevelRollBuyEntry,
        pipelineOverride,
      );

      registerTaskIdName(
        maaTaskId,
        t('goldenSpatula.lineups.autoLevelRollBuyTaskName', {
          roll: autoRollCount,
          xp: autoBuyExperienceCount,
        }),
      );
      updateInstance(activeInstanceId, { isRunning: true });
      setInstanceTaskStatus(activeInstanceId, 'Running');
      toast.success(
        t('goldenSpatula.lineups.autoLevelRollBuyStarted', {
          roll: autoRollCount,
          xp: autoBuyExperienceCount,
        }),
      );
    } catch (error) {
      setXpRunState((previous) => ({ ...previous, active: false, updatedAt: Date.now() }));
      setRollRunState((previous) => ({ ...previous, active: false, updatedAt: Date.now() }));
      setHandRunState((previous) => ({ ...previous, active: false, updatedAt: Date.now() }));
      setEconomyRunState((previous) => ({ ...previous, active: false, updatedAt: Date.now() }));
      toast.error(
        t('goldenSpatula.lineups.autoLevelRollBuyFailed', {
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    } finally {
      setAutoLevelRollBuySubmitting(false);
    }
  };

  const runAutoBuyExperienceTask = async () => {
    if (autoBuyExperienceDisabledReason || !activeInstanceId) {
      if (autoBuyExperienceDisabledReason) {
        toast.error(autoBuyExperienceDisabledReason);
      }
      return;
    }

    const taskName = autoBuyExperienceTaskByCount[autoBuyExperienceCount];
    if (!taskName) return;

    try {
      setAutoBuyExperienceSubmitting(true);
      const startedAt = Date.now();
      setXpRunState({
        active: true,
        current: 0,
        total: autoBuyExperienceCount,
        startedAt,
        updatedAt: startedAt,
        events: [],
      });
      economyStabilizerRef.current = createGoldenSpatulaEconomyStabilizerState();
      setEconomyRunState({
        ...createEmptyEconomyRunState(),
        active: true,
        startedAt,
        updatedAt: startedAt,
      });
      const maaTaskId = await maaService.runTask(activeInstanceId, taskName);

      registerTaskIdName(
        maaTaskId,
        t('goldenSpatula.lineups.autoBuyExperienceTaskName', {
          count: autoBuyExperienceCount,
        }),
      );
      updateInstance(activeInstanceId, { isRunning: true });
      setInstanceTaskStatus(activeInstanceId, 'Running');
      toast.success(
        t('goldenSpatula.lineups.autoBuyExperienceStarted', {
          count: autoBuyExperienceCount,
        }),
      );
    } catch (error) {
      setXpRunState((previous) => ({ ...previous, active: false, updatedAt: Date.now() }));
      setEconomyRunState((previous) => ({ ...previous, active: false, updatedAt: Date.now() }));
      toast.error(
        t('goldenSpatula.lineups.autoBuyExperienceFailed', {
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    } finally {
      setAutoBuyExperienceSubmitting(false);
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

  const applySortedRollTargets = (names: string[]) => {
    if (!activeLineup || !activeVariant || names.length === 0) return;

    updateActiveVariant({ rollTargetNames: names });
    toast.success(
      t('goldenSpatula.lineups.decisionSortedTargetsApplied', {
        count: names.length,
      }),
    );
  };

  const applyDecisionAutomationCounts = () => {
    let appliedRollCount: AutoRollCount | undefined;
    let appliedXpCount: AutoRollCount | undefined;

    if (decisionRecommendedRollCount !== undefined) {
      setAutoRollCount(decisionRecommendedRollCount);
      appliedRollCount = decisionRecommendedRollCount;
    }
    if (decisionRecommendedXpPurchaseCount !== undefined) {
      setAutoBuyExperienceCount(decisionRecommendedXpPurchaseCount);
      appliedXpCount = decisionRecommendedXpPurchaseCount;
    }

    if (appliedRollCount === undefined && appliedXpCount === undefined) return;

    toast.success(
      t('goldenSpatula.lineups.decisionAutomationCountsApplied', {
        roll: appliedRollCount ?? autoRollCount,
        xp: appliedXpCount ?? autoBuyExperienceCount,
      }),
    );
  };

  const activeLineupStrategyPanel =
    activeLineup && activeVariant ? (
      <div className="space-y-2 rounded-md border border-border/70 p-2">
        <div className="flex items-center gap-1.5">
          <Pencil className="h-3.5 w-3.5 shrink-0 text-text-muted" />
          <input
            value={activeLineup.name}
            onChange={(event) => updateManagedLineup(activeLineup.id, { name: event.target.value })}
            className="min-w-0 flex-1 rounded border border-border bg-bg-primary px-2 py-1 text-xs text-text-primary outline-none focus:border-accent"
          />
          <button
            type="button"
            onClick={() => duplicateManagedLineup(activeLineup)}
            className="inline-flex h-7 w-7 items-center justify-center rounded border border-border text-text-secondary hover:text-accent"
            title={t('goldenSpatula.lineups.duplicate')}
          >
            <CopyPlus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => removeManagedLineup(activeLineup.id)}
            className="inline-flex h-7 w-7 items-center justify-center rounded border border-border text-text-secondary hover:text-error"
            title={t('goldenSpatula.lineups.delete')}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {visibleActiveVariants.length > 1 && (
          <div
            className={clsx(
              'grid rounded-md bg-bg-tertiary p-0.5',
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
                    'rounded px-2 py-1 text-xs transition-colors',
                    selected
                      ? 'bg-bg-primary text-text-primary shadow-sm'
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
          name={activeVariant.name || activeLineup.name}
          variant={activeVariant}
          sourceKind={activeLineup.source?.kind}
          version={activeLineup.source?.version}
          championAssets={assistantData?.championAssets.data}
          traitAssets={assistantData?.traitAssets.data}
          itemAssets={assistantData?.itemAssets.data}
          basePath={basePath}
          t={t}
        />

        <AugmentRecommendationTierBoard
          recommendations={activeVariant.augmentRecommendations?.details ?? []}
          augmentAssets={assistantData?.augmentAssets.data}
          basePath={basePath}
          t={t}
        />

        <details className="rounded-md bg-bg-tertiary/70 p-2">
          <summary className="cursor-pointer select-none text-xs font-medium text-text-secondary">
            {t('goldenSpatula.lineups.advancedActions')}
          </summary>
          <div className="mt-2 space-y-2">
            <input
              value={activeVariant.name}
              onChange={(event) => updateActiveVariant({ name: event.target.value })}
              className="w-full rounded border border-border bg-bg-primary px-2 py-1 text-xs text-text-primary outline-none focus:border-accent"
              placeholder={t('goldenSpatula.lineups.variantName')}
            />

            <textarea
              value={activeVariant.code}
              onChange={(event) => updateActiveVariant({ code: event.target.value })}
              rows={2}
              className="w-full resize-none rounded border border-border bg-bg-primary px-2 py-1.5 text-xs text-text-primary outline-none focus:border-accent"
              placeholder={t('goldenSpatula.lineups.codePlaceholder')}
            />

            <div className="grid grid-cols-3 gap-1">
              <button
                type="button"
                disabled={!activeVariant.code}
                onClick={() => copyLineupCode(activeVariant.id, activeVariant.code)}
                className="inline-flex min-w-0 items-center justify-center gap-1 rounded-md border border-border bg-bg-primary px-2 py-1.5 text-xs text-text-secondary hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Copy className="h-3.5 w-3.5 shrink-0" />
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
                className="inline-flex min-w-0 items-center justify-center gap-1 rounded-md border border-border bg-bg-primary px-2 py-1.5 text-xs text-text-secondary hover:text-accent"
              >
                <Download className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{t('goldenSpatula.lineups.exportOne')}</span>
              </button>
              <button
                type="button"
                disabled={Boolean(taskConfigDisabledReason)}
                onClick={applyTaskConfig}
                className="inline-flex min-w-0 items-center justify-center gap-1 rounded-md border border-border bg-bg-primary px-2 py-1.5 text-xs text-text-secondary hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
                title={taskConfigDisabledReason}
              >
                <ListChecks className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{t('goldenSpatula.lineups.applyTasks')}</span>
              </button>
            </div>

            <button
              type="button"
              disabled={Boolean(autoRollDisabledReason)}
              onClick={applyAutoRollTask}
              className="inline-flex w-full items-center justify-center gap-1 rounded-md border border-border bg-bg-primary px-2 py-1.5 text-xs text-text-secondary hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
              title={autoRollDisabledReason}
            >
              <RefreshCw className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{t('goldenSpatula.lineups.applyAutoRoll')}</span>
            </button>

            {activeVariant.sourceUrl && (
              <a
                className="block truncate text-[11px] text-accent hover:underline"
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

        <div className="space-y-2 rounded-md bg-bg-primary p-2 ring-1 ring-inset ring-border/70">
          <SectionTitle icon={Target} label={t('goldenSpatula.lineups.targetD')} />
          {showAugmentDecisionPanel ? (
            <AugmentDecisionPanel
              decision={augmentDecision}
              scanState={augmentScanState}
              detecting={augmentOcrSubmitting || augmentScanState.active}
              polling={augmentOcrPolling}
              picking={augmentPickSubmitting}
              pickDisabledReason={augmentPickDisabledReason}
              onPick={runAutoPickAugmentTask}
              t={t}
            />
          ) : (
            <ShopObservationGrid
              shopSlots={knowledgeScanState.shopSlots}
              championAssets={assistantData?.championAssets.data}
              basePath={basePath}
              t={t}
            />
          )}
          {decisionPlan && (
            <DecisionPlanPanel
              plan={decisionPlan}
              championAssets={assistantData?.championAssets.data}
              basePath={basePath}
              shopOdds={economyRunState.shopOdds}
              shopOddsSource={economyRunState.shopOddsSource}
              activeTargetNames={getActiveRollTargetNames(activeVariant)}
              onToggleTarget={toggleRollTarget}
              onApplySortedTargets={applySortedRollTargets}
              onApplyRecommendedCounts={applyDecisionAutomationCounts}
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
          <RollRunStatusPanel
            runState={rollRunState}
            t={t}
          />
          <HandRunStatusPanel runState={handRunState} t={t} />
          <KnowledgeObservationPanel
            state={knowledgeScanState}
            itemAssets={assistantData?.itemAssets.data}
            augmentAssets={assistantData?.augmentAssets.data}
            basePath={basePath}
            t={t}
          />
          <div className="space-y-1.5">
            <div className="grid grid-cols-5 rounded-md bg-bg-tertiary p-0.5">
              {autoRollCounts.map((count) => {
                const selected = autoRollCount === count;
                return (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setAutoRollCount(count)}
                    className={clsx(
                      'rounded px-2 py-1 text-xs transition-colors',
                      selected
                        ? 'bg-bg-primary text-text-primary shadow-sm'
                        : 'text-text-muted hover:text-text-primary',
                    )}
                  >
                    {t('goldenSpatula.lineups.autoRollCount', { count })}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              disabled={Boolean(autoRollBuyDisabledReason)}
              onClick={runAutoRollBuyTask}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-accent px-2 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
              title={autoRollBuyDisabledReason || t('goldenSpatula.lineups.runAutoRollBuy')}
            >
              {autoRollBuySubmitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ShoppingCart className="h-3.5 w-3.5" />
              )}
              <span>{t('goldenSpatula.lineups.runAutoRollBuy')}</span>
            </button>
            <button
              type="button"
              disabled={Boolean(autoLevelRollBuyDisabledReason)}
              onClick={runAutoLevelRollBuyTask}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-accent/60 bg-bg-primary px-2 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/10 disabled:cursor-not-allowed disabled:border-border disabled:text-text-muted disabled:opacity-50"
              title={
                autoLevelRollBuyDisabledReason ||
                t('goldenSpatula.lineups.runAutoLevelRollBuy', {
                  roll: autoRollCount,
                  xp: autoBuyExperienceCount,
                })
              }
            >
              {autoLevelRollBuySubmitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              <span>
                {t('goldenSpatula.lineups.runAutoLevelRollBuy', {
                  roll: autoRollCount,
                  xp: autoBuyExperienceCount,
                })}
              </span>
            </button>
          </div>
          <div className="space-y-1.5 rounded-md bg-bg-tertiary/70 p-2">
            <div className="flex items-center justify-between gap-2">
              <SectionTitle icon={Sparkles} label={t('goldenSpatula.lineups.autoLevel')} />
              <span className="text-[11px] text-text-muted">
                {t('goldenSpatula.lineups.autoRollCount', {
                  count: autoBuyExperienceCount,
                })}
              </span>
            </div>
            <div className="grid grid-cols-5 rounded-md bg-bg-primary p-0.5">
              {autoRollCounts.map((count) => {
                const selected = autoBuyExperienceCount === count;
                return (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setAutoBuyExperienceCount(count)}
                    className={clsx(
                      'rounded px-2 py-1 text-xs transition-colors',
                      selected
                        ? 'bg-bg-secondary text-text-primary shadow-sm'
                        : 'text-text-muted hover:text-text-primary',
                    )}
                  >
                    {t('goldenSpatula.lineups.autoRollCount', { count })}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              disabled={Boolean(autoBuyExperienceDisabledReason)}
              onClick={runAutoBuyExperienceTask}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-border bg-bg-primary px-2 py-1.5 text-xs font-medium text-text-primary transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
              title={
                autoBuyExperienceDisabledReason || t('goldenSpatula.lineups.runAutoBuyExperience')
              }
            >
              {autoBuyExperienceSubmitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              <span>{t('goldenSpatula.lineups.runAutoBuyExperience')}</span>
            </button>
            <XpRunStatusPanel runState={xpRunState} t={t} />
            <div className="text-[11px] leading-relaxed text-text-muted">
              {t('goldenSpatula.lineups.autoBuyExperienceDescription')}
            </div>
          </div>
        </div>

        <details className="rounded-md bg-bg-tertiary/70 p-2">
          <summary className="cursor-pointer select-none text-xs font-medium text-text-secondary">
            {t('goldenSpatula.lineups.details')}
          </summary>
          <div className="mt-2 space-y-2">
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
      <div className="rounded-md bg-bg-tertiary p-2 text-xs text-text-muted">
        {managedLineups.length === 0
          ? t('goldenSpatula.lineups.empty')
          : t('goldenSpatula.lineups.noData')}
      </div>
    );

  const recommendedPicker = recommendedPickerOpen ? (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4"
      role="presentation"
      onClick={() => setRecommendedPickerOpen(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('goldenSpatula.lineups.recommendedPickerTitle')}
        className="flex max-h-[84vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg bg-bg-secondary shadow-xl ring-1 ring-border"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <Database className="h-4 w-4 shrink-0 text-accent" />
            <div className="truncate text-sm font-medium text-text-primary">
              {t('goldenSpatula.lineups.recommendedPickerTitle')}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setRecommendedPickerOpen(false)}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-bg-hover hover:text-text-primary"
            title={t('common.close')}
            aria-label={t('common.close')}
          >
            <XCircle className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-border p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
            <input
              value={recommendedSearch}
              onChange={(event) => setRecommendedSearch(event.target.value)}
              placeholder={t('goldenSpatula.lineups.searchRecommended')}
              className="w-full rounded-md border border-border bg-bg-primary py-1.5 pl-7 pr-2 text-xs text-text-primary outline-none focus:border-accent"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {recommendedLoading && (
            <div className="flex items-center gap-2 rounded-md bg-bg-tertiary p-2 text-xs text-text-muted">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {t('goldenSpatula.lineups.loadingRecommended')}
            </div>
          )}

          {recommendedError && (
            <div className="rounded-md border border-error/30 bg-error/5 p-2 text-xs text-text-secondary">
              {t('goldenSpatula.lineups.recommendedFailed', { error: recommendedError })}
            </div>
          )}

          {recommendedData?.index.status !== 'ready' && !recommendedLoading && (
            <div className="rounded-md border border-warning/30 bg-warning/5 p-2 text-xs text-text-secondary">
              {t('goldenSpatula.lineups.recommendedMissing')}
            </div>
          )}

          {recommendedData?.index.status === 'ready' && (
            <div className="space-y-2">
              {filteredRecommendedLineups.map((lineup) => {
                const saved = savedRecommendedIds.has(lineup.id);
                return (
                  <div
                    key={lineup.id}
                    className="flex w-full flex-col gap-2 rounded-md bg-bg-tertiary/60 p-1.5 ring-1 ring-inset ring-border/60 transition-colors hover:bg-bg-hover/70 lg:flex-row lg:items-stretch"
                  >
                    <div className="min-w-0 flex-1">
                      <LineupCompositionSummary
                        name={lineup.name}
                        variant={lineup.variant}
                        sourceKind="recommended"
                        version={lineup.version}
                        championAssets={assistantData?.championAssets.data}
                        traitAssets={assistantData?.traitAssets.data}
                        itemAssets={assistantData?.itemAssets.data}
                        basePath={basePath}
                        t={t}
                        compact
                      />
                    </div>
                    <div className="flex shrink-0 flex-col gap-1.5 lg:w-24">
                      {saved && (
                        <div className="flex justify-end lg:justify-center">
                          <StatusPill tone="success">
                            {t('goldenSpatula.lineups.source.recommended')}
                          </StatusPill>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => applyRecommendedLineupAndClose(lineup)}
                        className={clsx(
                          'inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-md border border-border bg-bg-primary px-2 text-[11px] font-medium text-text-secondary transition-colors hover:border-accent hover:text-accent',
                          saved ? 'lg:flex-1' : 'lg:min-h-[116px]',
                        )}
                      >
                        <Import className="h-3 w-3 shrink-0" />
                        <span className="truncate">
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
                <div className="rounded-md bg-bg-tertiary p-2 text-xs text-text-muted">
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
    <div className="bg-bg-secondary rounded-lg ring-1 ring-inset ring-border overflow-hidden">
      <div className="px-3 py-2 border-b border-border">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Bot className="w-4 h-4 text-accent shrink-0" />
            <span className="text-sm font-medium text-text-primary truncate">
              {t('goldenSpatula.title')}
            </span>
          </div>
        </div>
      </div>

      <div className="p-3 space-y-3">
        <div className="grid grid-cols-4 rounded-md bg-bg-tertiary p-0.5">
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
                  'flex min-w-0 items-center justify-center gap-1.5 rounded px-2 py-1.5 text-xs transition-colors',
                  selected
                    ? 'bg-bg-primary text-text-primary shadow-sm'
                    : 'text-text-muted hover:text-text-primary',
                )}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {dataLoading && (
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            {t('goldenSpatula.loading')}
          </div>
        )}

        {dataError && (
          <div className="flex gap-2 rounded-md border border-error/30 bg-error/5 p-2.5">
            <FileWarning className="w-3.5 h-3.5 text-error shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed text-text-secondary">
              {t('goldenSpatula.loadFailed', { error: dataError })}
            </div>
          </div>
        )}

        {activeTab === 'lineups' && (
          <div className="space-y-3">
            <div className="flex items-center gap-1.5">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
                <input
                  value={lineupSearch}
                  onChange={(event) => setLineupSearch(event.target.value)}
                  placeholder={t('goldenSpatula.lineups.searchSaved')}
                  className="w-full rounded-md border border-border bg-bg-primary py-1.5 pl-7 pr-2 text-xs text-text-primary outline-none focus:border-accent"
                />
              </div>
              <button
                type="button"
                onClick={() => setRecommendedPickerOpen(true)}
                className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-border bg-bg-primary px-2 text-xs font-medium text-text-secondary transition-colors hover:border-accent hover:text-accent"
                title={t('goldenSpatula.lineups.openRecommended')}
              >
                {recommendedLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Database className="h-3.5 w-3.5" />
                )}
                <span className="whitespace-nowrap">
                  {t('goldenSpatula.lineups.openRecommended')}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setImportPanelOpen((open) => !open)}
                aria-expanded={importPanelOpen}
                className={clsx(
                  'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-2 text-xs font-medium transition-colors',
                  importPanelOpen
                    ? 'border-accent/50 bg-accent/10 text-accent'
                    : 'border-border bg-bg-primary text-text-secondary hover:border-accent hover:text-accent',
                )}
                title={t('goldenSpatula.lineups.import')}
              >
                <ClipboardPaste className="h-3.5 w-3.5" />
                <span className="hidden sm:inline whitespace-nowrap">
                  {t('goldenSpatula.lineups.import')}
                </span>
              </button>
              <button
                type="button"
                onClick={addManualLineup}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-accent text-white transition-colors hover:bg-accent-hover"
                title={t('goldenSpatula.lineups.add')}
              >
                <Plus className="h-3.5 w-3.5" />
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
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-text-secondary transition-colors hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
                title={t('goldenSpatula.lineups.exportAll')}
              >
                <Download className="h-3.5 w-3.5" />
              </button>
            </div>

            {importPanelOpen && (
              <div className="rounded-md border border-accent/30 bg-accent/5 p-2.5 shadow-sm">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-text-primary">
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
                  className="w-full resize-none rounded-md border border-border bg-bg-primary px-2 py-1.5 text-xs text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent"
                  placeholder={t('goldenSpatula.lineups.importPlaceholder')}
                />
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={importLineups}
                    className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-accent px-3 text-xs font-medium text-white transition-colors hover:bg-accent-hover"
                  >
                    <Import className="h-3.5 w-3.5" />
                    {t('goldenSpatula.lineups.importAction')}
                  </button>
                </div>
              </div>
            )}

            <div className="max-h-[calc(100vh-18rem)] min-h-72 space-y-1 overflow-y-auto pr-1">
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
                        'w-full rounded-md text-left transition duration-150',
                        selected
                          ? 'text-text-primary ring-2 ring-inset ring-accent/55'
                          : 'text-text-secondary hover:shadow-sm dark:hover:brightness-110',
                      )}
                    >
                      {previewVariant && (
                        <LineupCompositionSummary
                          name={lineup.name}
                          variant={previewVariant}
                          sourceKind={lineup.source?.kind}
                          version={lineup.source?.version}
                          championAssets={assistantData?.championAssets.data}
                          traitAssets={assistantData?.traitAssets.data}
                          itemAssets={assistantData?.itemAssets.data}
                          basePath={basePath}
                          t={t}
                          compact
                        />
                      )}
                      {!previewVariant && (
                        <div className="rounded-md bg-bg-tertiary p-2 text-xs text-text-muted">
                          {lineup.name}
                        </div>
                      )}
                    </button>
                  );
                })
              ) : (
                <div className="rounded-md bg-bg-tertiary p-2 text-xs text-text-muted">
                  {managedLineups.length === 0
                    ? t('goldenSpatula.lineups.empty')
                    : t('goldenSpatula.lineups.searchEmpty')}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'strategy' && (
          <div className="space-y-2">
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
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 rounded-md bg-bg-tertiary p-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <Database className="w-3.5 h-3.5 text-text-secondary shrink-0" />
                <span className="text-xs text-text-secondary truncate">
                  {t('goldenSpatula.recognition.knowledgeResource')}
                </span>
              </div>
              <StatusPill tone={usingKnowledgeResource ? 'success' : 'warning'}>
                {usingKnowledgeResource
                  ? t('goldenSpatula.recognition.selected')
                  : t('goldenSpatula.recognition.notSelected')}
              </StatusPill>
            </div>

            <div>
              <SectionTitle
                icon={ListChecks}
                label={t('goldenSpatula.recognition.templateStatus')}
              />
              <div className="mt-2 grid gap-1.5">
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

            <div>
              <SectionTitle icon={Crosshair} label={t('goldenSpatula.recognition.latestResult')} />
              {latestRecognition ? (
                <div className="mt-2 rounded-md bg-bg-tertiary p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-text-primary">{latestRecognition.message}</span>
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
                  <div className="mt-1 text-[11px] text-text-muted">
                    {latestRecognition.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              ) : (
                <div className="mt-2 rounded-md bg-bg-tertiary p-2.5 text-xs text-text-muted">
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
              <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                {recognitionSummaries.slice(1).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2 text-[11px] text-text-muted"
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
          <div className="space-y-3">
            <div className="grid gap-1.5">
              {healthItems.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between gap-2 rounded-md bg-bg-tertiary px-2 py-1.5"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <StatusIcon ok={item.ok} />
                    <span className="text-xs text-text-secondary truncate">{item.label}</span>
                  </div>
                  <span className="text-[11px] text-text-muted shrink-0">{item.value}</span>
                </div>
              ))}
            </div>

            <div
              className={clsx(
                'flex gap-2 rounded-md border p-2.5',
                recommendations.length === 0
                  ? 'border-success/30 bg-success/5'
                  : 'border-warning/30 bg-warning/5',
              )}
            >
              <ShieldAlert
                className={clsx(
                  'w-3.5 h-3.5 shrink-0 mt-0.5',
                  recommendations.length === 0 ? 'text-success' : 'text-warning',
                )}
              />
              <div className="text-xs leading-relaxed text-text-secondary">
                {recommendations.length === 0 ? (
                  t('goldenSpatula.calibration.allGood')
                ) : (
                  <div className="space-y-1">
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
