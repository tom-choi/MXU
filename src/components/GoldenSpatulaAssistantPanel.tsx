import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
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
  FileWarning,
  Import,
  ListChecks,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Route,
  Search,
  ShieldAlert,
  ShoppingCart,
  Sparkles,
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
import { buildGoldenSpatulaDecisionPlan } from '@/services/goldenSpatulaDecisionEngine';
import {
  createManagedLineupFromRecommended,
  createManualLineup,
  exportGoldenSpatulaLineups,
  loadGoldenSpatulaAssistantData,
  loadGoldenSpatulaRecommendedLineups,
  parseGoldenSpatulaLineupImport,
} from '@/services/goldenSpatulaService';
import {
  buildAutoRollBuyPipelineOverride,
  goldenSpatulaAutoRollBuyEntry as autoRollBuyEntry,
  goldenSpatulaShopChampionSlots,
  type GoldenSpatulaRollBuyTargetTemplate,
} from '@/services/goldenSpatulaRollPipeline';
import {
  createGoldenSpatulaEconomyStabilizerState,
  stabilizeGoldenSpatulaEconomyResult,
} from '@/services/goldenSpatulaEconomyStabilizer';
import { recognizeGoldenSpatulaEconomyFromDataUrl } from '@/services/goldenSpatulaEconomyVision';
import { useAppStore } from '@/stores/appStore';
import type {
  GoldenSpatulaAssistantData,
  GoldenSpatulaChampionAsset,
  GoldenSpatulaChampionAssetIndex,
  GoldenSpatulaDecisionPlan,
  GoldenSpatulaPickRecommendation,
  GoldenSpatulaEconomyEvent,
  GoldenSpatulaEconomyRunState,
  GoldenSpatulaHandRunState,
  GoldenSpatulaItemAsset,
  GoldenSpatulaItemAssetIndex,
  GoldenSpatulaKnowledgeItemKind,
  GoldenSpatulaKnowledgeItemState,
  GoldenSpatulaKnowledgeScanState,
  GoldenSpatulaKnowledgeShopSlotState,
  GoldenSpatulaLineupUnit,
  GoldenSpatulaLineupVariant,
  GoldenSpatulaManagedLineup,
  GoldenSpatulaOwnedConfidence,
  GoldenSpatulaRecognitionKind,
  GoldenSpatulaRecognitionStatus,
  GoldenSpatulaRecognitionSummary,
  GoldenSpatulaRecommendedLineup,
  GoldenSpatulaRecommendedLineupsData,
  GoldenSpatulaRollEvent,
  GoldenSpatulaRollEventKind,
  GoldenSpatulaRollRunState,
  GoldenSpatulaTemplateCategory,
  GoldenSpatulaTemplateCategoryStatus,
  GoldenSpatulaVariantSlot,
  GoldenSpatulaXpEventKind,
  GoldenSpatulaXpRunState,
} from '@/types/goldenSpatula';

export const GOLDEN_SPATULA_PROJECT = 'GoldenSpatulaMuMu';
const KNOWLEDGE_RESOURCE = 'GoldenSpatulaKnowledge';
const MAX_RECOGNITION_SUMMARIES = 20;

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

function buildRecognitionSummary(
  message: string,
  details: MaaCallbackDetails & Record<string, unknown>,
  t: TFunction,
): GoldenSpatulaRecognitionSummary | null {
  if (!hasFocusForMessage(message, details)) return null;

  const nodeName = typeof details.name === 'string' ? details.name : undefined;
  if (!nodeName) return null;

  const mapped =
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
        'text-[11px] px-1.5 py-0.5 rounded shrink-0',
        tone === 'success' && 'bg-success/10 text-success',
        tone === 'warning' && 'bg-warning/10 text-warning',
        tone === 'error' && 'bg-error/10 text-error',
        tone === 'muted' && 'bg-bg-tertiary text-text-muted',
      )}
    >
      {children}
    </span>
  );
}

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
  const seen = new Set<string>();
  return [...variant.frontliners, ...variant.mainCarries, ...variant.units].filter((unit) => {
    const key = normalizeSearchText(unit.name);
    if (!key || seen.has(key) || !isDisplayableLineupUnit(unit)) return false;
    seen.add(key);
    return true;
  });
}

function isDisplayableLineupUnit(unit: GoldenSpatulaLineupUnit): boolean {
  if (!unit.name) return false;
  if (unit.type && unit.type !== 'hero') return false;
  if (unit.needsReview) return false;
  if (/^未解析棋子\s*\d+/u.test(unit.name) || unit.name === '圣物' || unit.name === '聖物') {
    return false;
  }
  return true;
}

function isMainCarryUnit(
  unit: GoldenSpatulaLineupUnit,
  variant: GoldenSpatulaLineupVariant,
): boolean {
  const key = normalizeSearchText(unit.name);
  return (
    Boolean(unit.isCarry) ||
    variant.mainCarries.some((carry) => normalizeSearchText(carry.name) === key)
  );
}

function isFrontlinerUnit(
  unit: GoldenSpatulaLineupUnit,
  variant: GoldenSpatulaLineupVariant,
): boolean {
  const key = normalizeSearchText(unit.name);
  return variant.frontliners.some((frontliner) => normalizeSearchText(frontliner.name) === key);
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

function getDefaultRollTargetNames(variant: GoldenSpatulaLineupVariant): string[] {
  const seen = new Set<string>();
  const candidates = [...variant.mainCarries, ...variant.frontliners, ...variant.units];

  return candidates
    .filter((unit) => {
      const key = normalizeSearchText(unit.name);
      if (!key || seen.has(key) || !isDisplayableLineupUnit(unit)) return false;

      const isPriority =
        isMainCarryUnit(unit, variant) ||
        isFrontlinerUnit(unit, variant) ||
        Boolean(unit.isCarry) ||
        (unit.items?.length ?? 0) > 0;
      if (!isPriority) return false;

      seen.add(key);
      return true;
    })
    .slice(0, 8)
    .map((unit) => unit.name);
}

function getActiveRollTargetNames(variant: GoldenSpatulaLineupVariant): string[] {
  return Array.isArray(variant.rollTargetNames)
    ? variant.rollTargetNames
    : getDefaultRollTargetNames(variant);
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

function toMaaTemplatePath(imagePath: string): string {
  const normalized = imagePath.replace(/\\/g, '/');
  const resourceMarker = 'resource_knowledge/image/';
  const resourceIndex = normalized.lastIndexOf(resourceMarker);
  if (resourceIndex >= 0) {
    return normalized.slice(resourceIndex + resourceMarker.length);
  }

  const imageMarker = '/image/';
  const imageIndex = normalized.lastIndexOf(imageMarker);
  return imageIndex >= 0 ? normalized.slice(imageIndex + imageMarker.length) : normalized;
}

function collectRollTargetTemplates(
  variant: GoldenSpatulaLineupVariant,
  championAssets: GoldenSpatulaChampionAssetIndex | undefined,
): GoldenSpatulaRollBuyTargetTemplate[] {
  const seen = new Set<string>();
  return collectRollTargetUnits(variant)
    .map((unit) => {
      const asset = findChampionAsset(unit.name, championAssets);
      const imagePath = asset?.imagePath;
      if (!imagePath) return null;
      const target: GoldenSpatulaRollBuyTargetTemplate = {
        name: unit.name,
        templatePath: toMaaTemplatePath(imagePath),
      };
      if (asset?.cost !== undefined) {
        target.cost = asset.cost;
      }
      return target;
    })
    .filter((target): target is GoldenSpatulaRollBuyTargetTemplate => Boolean(target?.templatePath))
    .filter((target) => {
      const key = `${normalizeSearchText(target.name)}:${target.templatePath}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
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
  const [imageUrl, setImageUrl] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    setImageUrl(undefined);

    if (!imagePath) return;

    loadIconAsDataUrl(imagePath, basePath)
      .then((url) => {
        if (!cancelled) setImageUrl(url);
      })
      .catch(() => {
        if (!cancelled) setImageUrl(undefined);
      });

    return () => {
      cancelled = true;
    };
  }, [imagePath, basePath]);

  return imageUrl ? (
    <img src={imageUrl} alt="" className={clsx('h-full w-full object-cover', className)} />
  ) : (
    <span className="truncate">{fallback}</span>
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

function LineupIconStrip({
  variant,
  championAssets,
  itemAssets,
  basePath,
  size = 'sm',
  maxUnits = 9,
  showCarryBadge = true,
  itemPlacement = 'overlay',
  className,
}: {
  variant: GoldenSpatulaLineupVariant;
  championAssets: GoldenSpatulaChampionAssetIndex | undefined;
  itemAssets: GoldenSpatulaItemAssetIndex | undefined;
  basePath: string;
  size?: 'sm' | 'md';
  maxUnits?: number;
  showCarryBadge?: boolean;
  itemPlacement?: 'overlay' | 'below';
  className?: string;
}) {
  const units = collectLineupUnits(variant).slice(0, maxUnits);
  if (units.length === 0) return null;
  const iconClass = size === 'md' ? 'h-10 w-10 text-[10px]' : 'h-8 w-8 text-[9px]';
  const wrapperClass =
    itemPlacement === 'below' ? (size === 'md' ? 'w-12' : 'w-10') : size === 'md' ? 'w-11' : 'w-8';
  const itemIconClass =
    itemPlacement === 'below'
      ? size === 'md'
        ? 'h-4 w-4 text-[7px]'
        : 'h-3.5 w-3.5 text-[6px]'
      : size === 'md'
        ? 'h-3.5 w-3.5 text-[6px]'
        : 'h-3 w-3 text-[6px]';

  return (
    <div
      className={clsx(
        'mt-1.5 flex min-w-0 flex-wrap',
        itemPlacement === 'below' ? 'gap-x-2 gap-y-1.5' : 'gap-1',
        className,
      )}
    >
      {units.map((unit, index) => {
        const carry = showCarryBadge && isMainCarryUnit(unit, variant);
        const cost = getUnitCost(unit.name, championAssets);
        const items = unit.items?.slice(0, itemPlacement === 'below' ? 3 : 2) ?? [];
        return (
          <div
            key={`${unit.name}-${unit.location ?? index}`}
            className={clsx('flex shrink-0 flex-col items-center', wrapperClass)}
            title={unitLabel(unit)}
          >
            <div
              className={clsx(
                'relative flex shrink-0 items-center justify-center rounded p-[2px]',
                iconClass,
                carry ? 'text-accent' : 'text-text-secondary',
              )}
              style={costFrameStyle(cost)}
            >
              <div className="h-full w-full overflow-hidden rounded bg-bg-primary">
                <LineupAssetImage
                  imagePath={findChampionAsset(unit.name, championAssets)?.imagePath}
                  fallback={shortUnitName(unit.name)}
                  basePath={basePath}
                />
              </div>
              {carry && (
                <span className="absolute right-0 top-0 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-400 text-[9px] font-bold leading-none text-slate-950 ring-1 ring-white/80">
                  C
                </span>
              )}
              {itemPlacement === 'overlay' && items.length > 0 && (
                <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-px bg-bg-primary/80 px-px py-px">
                  {items.map((item) => (
                    <span
                      key={item}
                      className={clsx(
                        'flex items-center justify-center overflow-hidden rounded-sm bg-bg-secondary',
                        itemIconClass,
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
            {itemPlacement === 'below' && (
              <div className="mt-1 flex min-h-4 w-full justify-center gap-0.5">
                {items.map((item) => (
                  <span
                    key={item}
                    className={clsx(
                      'flex items-center justify-center overflow-hidden rounded bg-bg-primary ring-1 ring-border/70',
                      itemIconClass,
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
        );
      })}
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
  championAssets,
  basePath,
  runState,
  shopSlots,
  t,
}: {
  championAssets: GoldenSpatulaChampionAssetIndex | undefined;
  basePath: string;
  runState: GoldenSpatulaRollRunState;
  shopSlots: GoldenSpatulaKnowledgeScanState['shopSlots'];
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

      <ShopObservationGrid
        shopSlots={shopSlots}
        championAssets={championAssets}
        basePath={basePath}
        t={t}
      />

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

function ownedConfidenceTone(
  confidence: GoldenSpatulaOwnedConfidence | undefined,
): 'success' | 'warning' | 'error' | 'muted' {
  if (confidence === 'confirmed') return 'success';
  if (confidence === 'estimated') return 'warning';
  if (confidence === 'stale') return 'muted';
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
  detecting,
  polling,
  detectDisabledReason,
  onDetect,
  t,
}: {
  runState: GoldenSpatulaEconomyRunState;
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

function KnowledgeObservationPanel({
  state,
  itemAssets,
  basePath,
  t,
}: {
  state: GoldenSpatulaKnowledgeScanState;
  itemAssets: GoldenSpatulaItemAssetIndex | undefined;
  basePath: string;
  t: TFunction;
}) {
  const items = sortKnowledgeItems(state.items);
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
  const oddsTone =
    pick.shopOddsAvailability === 'available'
      ? 'success'
      : pick.shopOddsAvailability === 'rare'
        ? 'warning'
        : pick.shopOddsAvailability === 'unavailable'
          ? 'error'
          : 'muted';

  return (
    <div className="min-w-0 rounded-md bg-bg-primary p-2 ring-1 ring-inset ring-border/60">
      <div className="flex items-start gap-2">
        <div
          className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded p-[2px] text-[10px] text-text-secondary"
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
            {pick.score}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1">
            <div className="truncate text-xs font-medium text-text-primary">{pick.name}</div>
            <StatusPill tone={pick.tier === 'core' || pick.tier === 'high' ? 'success' : 'muted'}>
              {t(`goldenSpatula.lineups.decisionTier.${pick.tier}`)}
            </StatusPill>
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            <StatusPill tone="muted">
              {t(`goldenSpatula.lineups.decisionRole.${pick.role}`)}
            </StatusPill>
            {pick.cost !== undefined && (
              <StatusPill tone="muted">
                {t('goldenSpatula.lineups.decisionCost', { cost: pick.cost })}
              </StatusPill>
            )}
            <StatusPill tone={pick.ownedCount > 0 ? 'success' : 'muted'}>
              {t('goldenSpatula.lineups.decisionOwned', { count: pick.ownedCount })}
            </StatusPill>
            {pick.ownedCount > 0 && pick.ownedConfidence && (
              <StatusPill tone={ownedConfidenceTone(pick.ownedConfidence)}>
                {t(`goldenSpatula.lineups.ownedConfidence.${pick.ownedConfidence}`)}
              </StatusPill>
            )}
            {pick.copiesNeeded > 0 && (
              <StatusPill tone="warning">
                {t('goldenSpatula.lineups.decisionNeed', { count: pick.copiesNeeded })}
              </StatusPill>
            )}
            <StatusPill tone={oddsTone}>
              {pick.currentLevel !== undefined && pick.shopOdds !== undefined
                ? t('goldenSpatula.lineups.decisionShopOdds', {
                    level: pick.currentLevel,
                    odds: formatShopOddsPercent(pick.shopOdds),
                  })
                : t('goldenSpatula.lineups.decisionShopOddsUnknown')}
            </StatusPill>
          </div>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {pick.reasons.slice(0, 3).map((reason) => (
          <span
            key={reason}
            className="rounded bg-bg-tertiary px-1.5 py-0.5 text-[10px] text-text-muted"
          >
            {t(`goldenSpatula.lineups.decisionReason.${reason}`)}
          </span>
        ))}
      </div>

      {pick.traitTags.length > 0 && (
        <div className="mt-1 truncate text-[10px] text-text-muted">
          {pick.traitTags.slice(0, 3).join(' / ')}
        </div>
      )}

      <button
        type="button"
        disabled={targetDisabled}
        onClick={onToggle}
        className={clsx(
          'mt-2 inline-flex w-full items-center justify-center gap-1 rounded-md px-2 py-1 text-[11px] transition-colors',
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

function DecisionPlanPanel({
  plan,
  championAssets,
  basePath,
  activeTargetNames,
  onToggleTarget,
  onApplySortedTargets,
  t,
}: {
  plan: GoldenSpatulaDecisionPlan;
  championAssets: GoldenSpatulaChampionAssetIndex | undefined;
  basePath: string;
  activeTargetNames: string[];
  onToggleTarget: (name: string) => void;
  onApplySortedTargets?: (names: string[]) => void;
  t: TFunction;
}) {
  const selectedTargets = new Set(activeTargetNames.map(normalizeSearchText));
  const advice = plan.economyAdvice;

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
          </div>
        </div>
        {advice.urgentPickNames.length > 0 && (
          <div className="mt-1 truncate text-[11px] text-text-secondary">
            {t('goldenSpatula.lineups.decisionUrgentTargets', {
              targets: advice.urgentPickNames.join(' / '),
            })}
          </div>
        )}
      </div>

      <div>
        <div className="mb-1 text-[11px] font-medium text-text-secondary">
          {t('goldenSpatula.lineups.decisionPicks')}
        </div>
        {plan.picks.length > 0 ? (
          <div className="grid grid-cols-2 gap-1.5">
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
                <div className="mt-1 flex flex-wrap gap-1 text-[10px] text-text-muted">
                  {lineup.matchedUnitNames.length > 0 && (
                    <span className="rounded bg-bg-tertiary px-1.5 py-0.5">
                      {t('goldenSpatula.lineups.decisionOverlap', {
                        units: lineup.matchedUnitNames.join(' / '),
                      })}
                    </span>
                  )}
                  {lineup.traitTags.slice(0, 3).map((tag) => (
                    <span key={tag} className="rounded bg-bg-tertiary px-1.5 py-0.5">
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
                      <div className="absolute -bottom-1 left-1/2 z-30 flex -translate-x-1/2 gap-0.5">
                        {unit.items?.slice(0, 3).map((item) => (
                          <span
                            key={item}
                            className="flex h-[18px] w-[18px] items-center justify-center overflow-hidden rounded bg-bg-primary text-[7px] shadow-sm ring-1 ring-border/80"
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
              className="flex h-4 w-4 items-center justify-center overflow-hidden rounded bg-bg-primary text-[7px] ring-1 ring-border/70"
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
  const visibleUnits = units.filter(isDisplayableLineupUnit);

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
  const [importText, setImportText] = useState('');
  const [autoRollCount, setAutoRollCount] = useState<AutoRollCount>(3);
  const [autoBuyExperienceCount, setAutoBuyExperienceCount] = useState<AutoRollCount>(1);
  const [economyOcrSubmitting, setEconomyOcrSubmitting] = useState(false);
  const [economyOcrPolling, setEconomyOcrPolling] = useState(false);
  const [autoRollBuySubmitting, setAutoRollBuySubmitting] = useState(false);
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
  const [knowledgeScanState, setKnowledgeScanState] = useState<GoldenSpatulaKnowledgeScanState>(
    () => createEmptyKnowledgeScanState(),
  );
  const economyStabilizerRef = useRef(createGoldenSpatulaEconomyStabilizerState());

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

        const rollEvent = buildRollEvent(
          message,
          details as MaaCallbackDetails & Record<string, unknown>,
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
          details as MaaCallbackDetails & Record<string, unknown>,
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
          details as MaaCallbackDetails & Record<string, unknown>,
          t,
        );
        if (handEvent) {
          setHandRunState((previous) => mergeHandEvent(previous, handEvent));
          return;
        }

        const economyEvent = buildEconomyEvent(
          message,
          details as MaaCallbackDetails & Record<string, unknown>,
          t,
        );
        if (economyEvent) {
          setEconomyRunState((previous) => mergeEconomyEvent(previous, economyEvent));
          return;
        }

        const knowledgeEvent = buildKnowledgeEvent(
          message,
          details as MaaCallbackDetails & Record<string, unknown>,
          t,
        );
        if (knowledgeEvent) {
          setKnowledgeScanState((previous) => mergeKnowledgeEvent(previous, knowledgeEvent));
        }

        const summary = buildRecognitionSummary(
          message,
          details as MaaCallbackDetails & Record<string, unknown>,
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
  const visibleActiveVariants = useMemo(
    () => (activeLineup ? getVisibleVariants(activeLineup, activeVariant?.id) : []),
    [activeLineup, activeVariant?.id],
  );
  const autoRollBuyTargets = useMemo(
    () =>
      activeVariant
        ? collectRollTargetTemplates(activeVariant, assistantData?.championAssets.data)
        : [],
    [activeVariant, assistantData?.championAssets.data],
  );
  const decisionPlan = useMemo(
    () =>
      activeVariant
        ? buildGoldenSpatulaDecisionPlan({
            activeVariant,
            managedLineups,
            recommendedLineups: recommendedData?.lineups,
            championAssets: assistantData?.championAssets.data,
            handState: handRunState,
            economyState: economyRunState,
          })
        : undefined,
    [
      activeVariant,
      assistantData?.championAssets.data,
      economyRunState,
      handRunState,
      managedLineups,
      recommendedData?.lineups,
    ],
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
  const economyOcrDisabledReason = !activeInstanceId
    ? t('goldenSpatula.lineups.noActiveInstance')
    : connectionStatus !== 'Connected'
      ? t('goldenSpatula.lineups.deviceNotConnected')
      : economyOcrSubmitting
        ? t('goldenSpatula.lineups.taskRunning')
        : !resourceLoaded
          ? t('goldenSpatula.lineups.resourceNotLoaded')
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
      if (economyOcrDisabledReason || economyOcrSubmitting || economyRunState.active) return;
      void submitEconomyOcrTask(false);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [economyOcrDisabledReason, economyOcrPolling, economyOcrSubmitting, economyRunState.active]);

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

      const rawText = [
        result.rawText.round,
        result.rawText.gold,
        result.rawText.level,
        result.rawText.experience,
        result.rawText.streak,
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

      if (showToast) {
        toast.success(t('goldenSpatula.lineups.economyOcrStarted'));
      }
    } catch (error) {
      setEconomyOcrPolling(false);
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
    await submitEconomyOcrTask(true);
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

        <div className="rounded-md bg-bg-primary p-2 ring-1 ring-inset ring-border/70">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-medium text-text-primary">
              {t('goldenSpatula.lineups.myLineup')}
            </div>
            {activeVariant.traitsSummary && (
              <span className="min-w-0 truncate text-[11px] text-text-muted">
                {activeVariant.traitsSummary}
              </span>
            )}
          </div>
          <LineupIconStrip
            variant={activeVariant}
            championAssets={assistantData?.championAssets.data}
            itemAssets={assistantData?.itemAssets.data}
            basePath={basePath}
            size="md"
            maxUnits={10}
            showCarryBadge={false}
            itemPlacement="below"
            className="mt-2 gap-x-2.5 gap-y-2"
          />
        </div>

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
          <div className="flex items-center justify-between gap-2">
            <SectionTitle icon={Target} label={t('goldenSpatula.lineups.targetD')} />
          </div>
          {decisionPlan && (
            <DecisionPlanPanel
              plan={decisionPlan}
              championAssets={assistantData?.championAssets.data}
              basePath={basePath}
              activeTargetNames={getActiveRollTargetNames(activeVariant)}
              onToggleTarget={toggleRollTarget}
              onApplySortedTargets={applySortedRollTargets}
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
            championAssets={assistantData?.championAssets.data}
            basePath={basePath}
            runState={rollRunState}
            shopSlots={knowledgeScanState.shopSlots}
            t={t}
          />
          <HandRunStatusPanel runState={handRunState} t={t} />
          <KnowledgeObservationPanel
            state={knowledgeScanState}
            itemAssets={assistantData?.itemAssets.data}
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
        className="flex max-h-[84vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-bg-secondary shadow-xl ring-1 ring-border"
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
            <div className="grid gap-2 md:grid-cols-2">
              {filteredRecommendedLineups.map((lineup) => {
                const saved = savedRecommendedIds.has(lineup.id);
                return (
                  <div
                    key={lineup.id}
                    className="min-w-0 rounded-md bg-bg-tertiary p-2 ring-1 ring-inset ring-border/60"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-xs font-medium text-text-primary">
                          {lineup.name}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[11px] text-text-muted">
                          {lineup.quality && <span>{lineup.quality}</span>}
                          {lineup.version && <span>{lineup.version}</span>}
                          {lineup.variant.code && <span>{lineup.variant.code}</span>}
                        </div>
                      </div>
                      {saved && (
                        <StatusPill tone="success">
                          {t('goldenSpatula.lineups.source.recommended')}
                        </StatusPill>
                      )}
                    </div>
                    <LineupIconStrip
                      variant={lineup.variant}
                      championAssets={assistantData?.championAssets.data}
                      itemAssets={assistantData?.itemAssets.data}
                      basePath={basePath}
                      maxUnits={10}
                      showCarryBadge={false}
                      itemPlacement="below"
                    />
                    <button
                      type="button"
                      onClick={() => applyRecommendedLineupAndClose(lineup)}
                      className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-md border border-border bg-bg-primary px-2 py-1.5 text-[11px] font-medium text-text-secondary transition-colors hover:border-accent hover:text-accent"
                    >
                      <Import className="h-3 w-3" />
                      {saved
                        ? t('goldenSpatula.lineups.switchSaved')
                        : t('goldenSpatula.lineups.applyRecommended')}
                    </button>
                  </div>
                );
              })}
              {filteredRecommendedLineups.length === 0 && !recommendedLoading && (
                <div className="rounded-md bg-bg-tertiary p-2 text-xs text-text-muted md:col-span-2">
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

            <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
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
                        'w-full rounded-md px-2 py-2 text-left transition-colors',
                        selected
                          ? 'bg-accent/10 text-text-primary ring-1 ring-inset ring-accent/30'
                          : 'bg-bg-tertiary text-text-secondary hover:bg-bg-hover',
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-xs font-medium text-text-primary">
                            {lineup.name}
                          </div>
                          <div className="mt-0.5 flex items-center gap-1 text-[11px] text-text-muted">
                            <span>{visibleVariants.length}/3</span>
                            {lineup.source?.version && <span>{lineup.source.version}</span>}
                          </div>
                        </div>
                        <StatusPill
                          tone={lineup.source?.kind === 'recommended' ? 'success' : 'muted'}
                        >
                          {t(`goldenSpatula.lineups.source.${lineup.source?.kind ?? 'manual'}`)}
                        </StatusPill>
                      </div>
                      {previewVariant && (
                        <LineupIconStrip
                          variant={previewVariant}
                          championAssets={assistantData?.championAssets.data}
                          itemAssets={assistantData?.itemAssets.data}
                          basePath={basePath}
                          maxUnits={10}
                          showCarryBadge={false}
                          itemPlacement="below"
                        />
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

            <div>
              <SectionTitle icon={ClipboardPaste} label={t('goldenSpatula.lineups.import')} />
              <div className="mt-2 space-y-1.5">
                <textarea
                  value={importText}
                  onChange={(event) => setImportText(event.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-md border border-border bg-bg-primary px-2 py-1.5 text-xs text-text-primary outline-none focus:border-accent"
                  placeholder={t('goldenSpatula.lineups.importPlaceholder')}
                />
                <button
                  type="button"
                  onClick={importLineups}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-bg-tertiary px-2 py-1.5 text-xs text-text-secondary transition-colors hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ClipboardPaste className="h-3.5 w-3.5" />
                  {t('goldenSpatula.lineups.importAction')}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'strategy' && (
          <div className="space-y-2">
            <EconomyRunStatusPanel
              runState={economyRunState}
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
