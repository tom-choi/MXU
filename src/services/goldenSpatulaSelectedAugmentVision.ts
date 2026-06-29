import { loadIconAsDataUrl } from '@/services/contentResolver';
import type {
  GoldenSpatulaAugmentAsset,
  GoldenSpatulaAugmentAssetIndex,
  GoldenSpatulaKnowledgeSlotConfidence,
} from '@/types/goldenSpatula';
import { goldenSpatulaLogicalScreenSize } from './goldenSpatulaRollPipeline';

export interface GoldenSpatulaSelectedAugmentVisionSlotResult {
  slotIndex: number;
  slotLabel: string;
  augmentName?: string;
  templatePath?: string;
  confidence: GoldenSpatulaKnowledgeSlotConfidence;
  score?: number;
  matchCenter?: readonly [number, number];
  matchKind?: 'icon' | 'detailTitle';
  matchSourceLabel?: string;
  matchSide?: GoldenSpatulaSelectedAugmentDetailSide;
  matchMargin?: number;
}

export interface GoldenSpatulaSelectedAugmentVisionResult {
  scannedAt: number;
  slots: GoldenSpatulaSelectedAugmentVisionSlotResult[];
  metrics?: GoldenSpatulaSelectedAugmentVisionMetrics;
  detailDiagnostics?: GoldenSpatulaSelectedAugmentDetailDiagnostics;
}

export type GoldenSpatulaSelectedAugmentProbeSource =
  | 'spectator'
  | 'board'
  | 'hud'
  | 'leftList'
  | 'detailPanel';

export type GoldenSpatulaSelectedAugmentDetailSide = 'left' | 'right';

export interface GoldenSpatulaSelectedAugmentDetailPresenceDiagnostic {
  darkRatio: number;
  stripDarkRatio: number;
  purpleRatio: number;
  tealRatio: number;
}

export interface GoldenSpatulaSelectedAugmentDetailCardPresenceDiagnostic extends GoldenSpatulaSelectedAugmentDetailPresenceDiagnostic {
  side: GoldenSpatulaSelectedAugmentDetailSide;
  visible: boolean;
}

export interface GoldenSpatulaSelectedAugmentDetailTitleDiagnostic {
  slotLabel: string;
  side: GoldenSpatulaSelectedAugmentDetailSide;
  augmentName: string;
  score: number;
  margin: number;
  center: readonly [number, number];
}

export interface GoldenSpatulaSelectedAugmentDetailIconDiagnostic {
  slotLabel: string;
  side?: GoldenSpatulaSelectedAugmentDetailSide;
  augmentName?: string;
  score?: number;
  center?: readonly [number, number];
  accepted: boolean;
  rejectedReason?: 'noOwnedPanel' | 'noDetailCardSide';
}

export interface GoldenSpatulaSelectedAugmentDetailDiagnostics {
  ownedPanelVisible: boolean;
  ownedPanelBody: GoldenSpatulaSelectedAugmentDetailPresenceDiagnostic;
  ownedPanelHeader: GoldenSpatulaSelectedAugmentDetailPresenceDiagnostic;
  detailCardSides: GoldenSpatulaSelectedAugmentDetailSide[];
  detailCardPresence: GoldenSpatulaSelectedAugmentDetailCardPresenceDiagnostic[];
  titleAllowedSides: GoldenSpatulaSelectedAugmentDetailSide[];
  iconMatch?: GoldenSpatulaSelectedAugmentDetailIconDiagnostic;
  titleMatch?: GoldenSpatulaSelectedAugmentDetailTitleDiagnostic;
}

export interface GoldenSpatulaSelectedAugmentProbeTarget {
  slotIndex: number;
  slotLabel: string;
  source: GoldenSpatulaSelectedAugmentProbeSource;
  roi: readonly [number, number, number, number];
  logicalTarget: readonly [number, number];
  screenTarget: readonly [number, number];
  confidence: GoldenSpatulaKnowledgeSlotConfidence;
  score?: number;
  augmentName?: string;
  templatePath?: string;
}

export interface GoldenSpatulaSelectedAugmentProbeTargetsResult {
  scannedAt: number;
  targets: GoldenSpatulaSelectedAugmentProbeTarget[];
  metrics?: GoldenSpatulaSelectedAugmentVisionMetrics;
}

export interface GoldenSpatulaSelectedAugmentVisionMetrics {
  algorithm: 'presence-sampled-color-prefilter-cache-v5';
  totalMs: number;
  screenshotLoadMs: number;
  presenceMs: number;
  templateLoadMs: number;
  matchMs: number;
  slotCount: number;
  templateCount: number;
  slotCacheHits: number;
  resultCacheHit: boolean;
  colorCandidateLimit: number;
  preciseCandidateLimit: number;
  presenceSampleStep: number;
}

interface GoldenSpatulaSelectedAugmentVisionOptions {
  augmentAssets: GoldenSpatulaAugmentAssetIndex | undefined;
  basePath: string;
  minScore?: number;
  maxSlots?: number;
  fastMode?: boolean;
}

interface GoldenSpatulaSelectedAugmentProbeOptions {
  augmentAssets: GoldenSpatulaAugmentAssetIndex | undefined;
  basePath: string;
  maxSlots?: number;
  maxTargets?: number;
  allowPresenceFallback?: boolean;
  allowedSources?: readonly GoldenSpatulaSelectedAugmentProbeSource[];
}

interface GoldenSpatulaSelectedAugmentDetailVisionOptions {
  augmentAssets: GoldenSpatulaAugmentAssetIndex | undefined;
  basePath: string;
  slotIndex?: number;
  slotLabel?: string;
  allowOwnedPanelFallback?: boolean;
  expectedAugmentNames?: readonly string[];
  fallbackAugmentName?: string;
  fallbackScore?: number;
  fallbackTemplatePath?: string;
}

export interface GoldenSpatulaAugmentIconVisionSlot {
  index: number;
  label: string;
  roi: readonly [number, number, number, number];
}

interface GoldenSpatulaSelectedAugmentProbeSlot extends GoldenSpatulaAugmentIconVisionSlot {
  selectedSlotIndex: number;
  selectedSlotLabel: string;
  source: GoldenSpatulaSelectedAugmentProbeSource;
}

export interface GoldenSpatulaAugmentIconVisionOptions {
  augmentAssets: GoldenSpatulaAugmentAssetIndex | undefined;
  basePath: string;
  slots: ReadonlyArray<GoldenSpatulaAugmentIconVisionSlot>;
  slotWidth: number;
  slotHeight: number;
  minScore?: number;
  templateHeights?: readonly number[];
  requirePresence?: boolean;
}

interface ColorRaster {
  width: number;
  height: number;
  values: Float32Array;
}

interface RasterPresence {
  darkRatio: number;
  stripDarkRatio: number;
  purpleRatio: number;
  tealRatio: number;
}

interface ColorRasterScratch {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
}

interface TemplateVariant {
  asset: GoldenSpatulaAugmentAsset;
  templatePath: string;
  width: number;
  height: number;
  values: Float32Array;
  featureValues: Float32Array;
  colorHistogram: Float32Array;
}

interface TemplateMatch {
  variant: TemplateVariant;
  score: number;
  baseScore: number;
  featureScore: number;
  colorScore: number;
  x: number;
  y: number;
}

interface DetailTitleSlot {
  index: number;
  label: string;
  side: GoldenSpatulaSelectedAugmentDetailSide;
  roi: readonly [number, number, number, number];
}

interface DetailTitleTemplateFeature {
  asset: GoldenSpatulaAugmentAsset;
  templatePath?: string;
  name: string;
  featureValues: Float32Array;
}

interface DetailTitleMatch {
  slot: DetailTitleSlot;
  template: DetailTitleTemplateFeature;
  score: number;
  margin: number;
}

interface AugmentIconSlotScanResult {
  slots: GoldenSpatulaSelectedAugmentVisionSlotResult[];
  cacheHits: number;
}

interface SelectedAugmentScreenshotImageCacheEntry {
  dataUrl: string;
  promise: Promise<HTMLImageElement>;
  image?: HTMLImageElement;
}

interface PreScannedAugmentIconSlot {
  slot: GoldenSpatulaAugmentIconVisionSlot;
  raster: ColorRaster;
  visible: boolean;
  signature: string;
}

interface PreScannedAugmentIconSlots {
  slots: PreScannedAugmentIconSlot[];
  visible: boolean;
  signature: string;
}

const selectedAugmentBoardSlotStartXCandidates = [360, 344, 376, 382] as const;
const selectedAugmentBoardSlotSpacing = 40;
const selectedAugmentBoardSlotY = 154;
const selectedAugmentBoardSlotWidth = 54;
const selectedAugmentBoardSlotHeight = 58;

function buildSelectedAugmentBoardSlots(startX: number): GoldenSpatulaAugmentIconVisionSlot[] {
  return Array.from({ length: 6 }, (_, index) => ({
    index: index + 1,
    label: String(index + 1),
    roi: [
      startX + index * selectedAugmentBoardSlotSpacing,
      selectedAugmentBoardSlotY,
      selectedAugmentBoardSlotWidth,
      selectedAugmentBoardSlotHeight,
    ],
  }));
}

export const goldenSpatulaSelectedAugmentSlots = buildSelectedAugmentBoardSlots(360);

const goldenSpatulaSelectedAugmentBoardSlotLayouts = selectedAugmentBoardSlotStartXCandidates.map(
  buildSelectedAugmentBoardSlots,
);

const selectedAugmentHudSlotStartXCandidates = [378, 408, 438, 468, 498, 528, 558] as const;
const selectedAugmentHudSlotSpacing = 44;
const selectedAugmentHudSlotY = 2;
const selectedAugmentHudSlotWidth = 42;
const selectedAugmentHudSlotHeight = 40;

function buildSelectedAugmentHudSlots(startX: number): GoldenSpatulaAugmentIconVisionSlot[] {
  return Array.from({ length: 6 }, (_, index) => ({
    index: index + 1,
    label: String(index + 1),
    roi: [
      startX + index * selectedAugmentHudSlotSpacing,
      selectedAugmentHudSlotY,
      selectedAugmentHudSlotWidth,
      selectedAugmentHudSlotHeight,
    ],
  }));
}

const goldenSpatulaSelectedAugmentHudSlotLayouts = selectedAugmentHudSlotStartXCandidates.map(
  buildSelectedAugmentHudSlots,
);

const goldenSpatulaSelectedAugmentSpectatorProbeSlots = [
  {
    index: 101,
    label: 'spectator-1',
    selectedSlotIndex: 1,
    selectedSlotLabel: '1',
    source: 'spectator',
    roi: [42, 82, 84, 84],
  },
  {
    index: 102,
    label: 'spectator-1-tight',
    selectedSlotIndex: 1,
    selectedSlotLabel: '1',
    source: 'spectator',
    roi: [55, 94, 58, 58],
  },
] as const satisfies ReadonlyArray<GoldenSpatulaSelectedAugmentProbeSlot>;

const goldenSpatulaSelectedAugmentLeftListProbeSlots = Array.from(
  { length: 6 },
  (_, index): GoldenSpatulaSelectedAugmentProbeSlot => ({
    index: 201 + index,
    label: `left-list-${index + 1}`,
    selectedSlotIndex: index + 1,
    selectedSlotLabel: String(index + 1),
    source: 'leftList',
    roi: [12, 142 + index * 48, 48, 48],
  }),
);

const goldenSpatulaSelectedAugmentBoardProbeSlots =
  goldenSpatulaSelectedAugmentBoardSlotLayouts.flatMap((layout, layoutIndex) =>
    layout.map(
      (slot): GoldenSpatulaSelectedAugmentProbeSlot => ({
        index: 301 + layoutIndex * 10 + slot.index,
        label: `board-${layoutIndex + 1}-${slot.label}`,
        selectedSlotIndex: slot.index,
        selectedSlotLabel: slot.label,
        source: 'board',
        roi: slot.roi,
      }),
    ),
  );

const goldenSpatulaSelectedAugmentHudProbeSlots =
  goldenSpatulaSelectedAugmentHudSlotLayouts.flatMap((layout, layoutIndex) =>
    layout.map(
      (slot): GoldenSpatulaSelectedAugmentProbeSlot => ({
        index: 401 + layoutIndex * 10 + slot.index,
        label: `hud-${layoutIndex + 1}-${slot.label}`,
        selectedSlotIndex: slot.index,
        selectedSlotLabel: slot.label,
        source: 'hud',
        roi: slot.roi,
      }),
    ),
  );

const goldenSpatulaSelectedAugmentDetailCardSlots = [
  { index: 1, label: 'detail-card', roi: [145, 64, 345, 330] },
  { index: 2, label: 'detail-card-icon', roi: [176, 78, 270, 250] },
  { index: 3, label: 'detail-card-right', roi: [650, 64, 345, 330] },
  { index: 4, label: 'detail-card-right-icon', roi: [700, 78, 270, 250] },
] as const satisfies ReadonlyArray<GoldenSpatulaAugmentIconVisionSlot>;

const goldenSpatulaSelectedAugmentDetailTitleSlots = [
  { index: 101, label: 'detail-title-left', side: 'left', roi: [150, 264, 380, 72] },
  { index: 102, label: 'detail-title-left-low', side: 'left', roi: [150, 296, 380, 72] },
  { index: 103, label: 'detail-title-right', side: 'right', roi: [650, 264, 400, 72] },
  { index: 104, label: 'detail-title-right-low', side: 'right', roi: [650, 296, 400, 72] },
  { index: 105, label: 'detail-title-far-right', side: 'right', roi: [740, 264, 360, 72] },
  { index: 106, label: 'detail-title-far-right-low', side: 'right', roi: [740, 296, 360, 72] },
] as const satisfies ReadonlyArray<DetailTitleSlot>;

const goldenSpatulaSelectedAugmentOwnedPanelIconXCandidates = [840, 900, 960, 1018] as const;
const goldenSpatulaSelectedAugmentOwnedPanelFirstRowYCandidates = [56, 64, 72] as const;
const goldenSpatulaSelectedAugmentOwnedPanelRowHeight = 96;
const goldenSpatulaSelectedAugmentOwnedPanelIconRoiWidth = 155;
const goldenSpatulaSelectedAugmentOwnedPanelIconRoiHeight = 96;
const goldenSpatulaSelectedAugmentOwnedPanelRowClickX = 1160;
const goldenSpatulaSelectedAugmentOwnedPanelFirstRowClickY = 156;

function buildGoldenSpatulaSelectedAugmentOwnedPanelDetailSlots(
  maxSlots = 4,
): GoldenSpatulaSelectedAugmentProbeSlot[] {
  const slotCount = Math.max(1, Math.min(4, Math.trunc(maxSlots)));
  const slots: GoldenSpatulaSelectedAugmentProbeSlot[] = [];
  let slotIndex = 11;

  for (let rowIndex = 0; rowIndex < slotCount; rowIndex += 1) {
    for (
      let xIndex = 0;
      xIndex < goldenSpatulaSelectedAugmentOwnedPanelIconXCandidates.length;
      xIndex += 1
    ) {
      for (
        let yIndex = 0;
        yIndex < goldenSpatulaSelectedAugmentOwnedPanelFirstRowYCandidates.length;
        yIndex += 1
      ) {
        const x = goldenSpatulaSelectedAugmentOwnedPanelIconXCandidates[xIndex];
        const firstRowY = goldenSpatulaSelectedAugmentOwnedPanelFirstRowYCandidates[yIndex];
        slots.push({
          index: slotIndex,
          label: `owned-panel-${rowIndex + 1}-${xIndex + 1}-${yIndex + 1}`,
          selectedSlotIndex: rowIndex + 1,
          selectedSlotLabel: String(rowIndex + 1),
          source: 'detailPanel',
          roi: [
            x,
            firstRowY + rowIndex * goldenSpatulaSelectedAugmentOwnedPanelRowHeight,
            goldenSpatulaSelectedAugmentOwnedPanelIconRoiWidth,
            goldenSpatulaSelectedAugmentOwnedPanelIconRoiHeight,
          ],
        });
        slotIndex += 1;
      }
    }
  }

  return slots;
}

const selectedAugmentSlotWidth = 54;
const selectedAugmentSlotHeight = 54;
const selectedAugmentDefaultMaxSlots = 4;
const selectedAugmentTemplateHeights = [30, 34, 38, 42] as const;
const selectedAugmentLowLatencyTemplateHeights = [34, 38, 42] as const;
const selectedAugmentProbeTemplateHeights = [28, 32, 36, 40, 44] as const;
const selectedAugmentDetailTemplateHeights = [96, 120, 144, 168, 192, 216] as const;
const selectedAugmentOwnedPanelTemplateHeights = [54, 66, 78, 90] as const;
const selectedAugmentMatchStep = 2;
const selectedAugmentFastMatchStep = 4;
const selectedAugmentPreciseCandidateLimit = 36;
const selectedAugmentCachedMatchMinScore = 0.62;
const selectedAugmentFeatureWidth = 18;
const selectedAugmentFeatureHeight = 18;
const selectedAugmentColorHistogramBins = 4;
const selectedAugmentDefaultMinScore = 0.56;
const selectedAugmentHudMinScore = 0.66;
const selectedAugmentProbeMinScore = 0.5;
const selectedAugmentDetailMinScore = 0.5;
const selectedAugmentOwnedPanelDetailMinScore = 0.54;
const selectedAugmentMinPatchNorm = 0.01;
const selectedAugmentStrongScore = 0.74;
const selectedAugmentAmbiguousSecondScore = 0.6;
const selectedAugmentAmbiguousMaxMargin = 0.025;
const selectedAugmentMinFrameDarkRatio = 0.06;
const selectedAugmentMinColorRatio = 0.12;
const selectedAugmentPresenceSampleStep = 3;
const selectedAugmentColorCandidateLimit = 120;
const selectedAugmentSlotSignatureSampleStep = 6;
const selectedAugmentSlotResultCacheLimit = 128;
const selectedAugmentDetailTitleFeatureWidth = 240;
const selectedAugmentDetailTitleFeatureHeight = 56;
const selectedAugmentDetailTitleSourceThreshold = 145;
const selectedAugmentDetailTitleTemplateThreshold = 45;
const selectedAugmentDetailTitleFontSizes = [22, 26, 30] as const;
const selectedAugmentDetailTitleMinScore = 0.12;
const selectedAugmentDetailTitleStrongScore = 0.145;
const selectedAugmentDetailTitleMinMargin = 0.012;
const selectedAugmentDetailTitleUnhintedMinScore = 0.42;
const selectedAugmentDetailTitleUnhintedMinMargin = 0.04;
const selectedAugmentDetailExpectedFallbackMinScore = 0.74;
const selectedAugmentOwnedPanelPresenceMinDarkRatio = 0.5;
const selectedAugmentOwnedPanelPresenceMinStripDarkRatio = 0.45;
const selectedAugmentOwnedPanelPresenceMinTealRatio = 0.22;
const selectedAugmentDetailCardPresenceMinDarkRatio = 0.42;
const selectedAugmentDetailCardPresenceMinPurpleRatio = 0.18;
const selectedAugmentDetailCardPresenceMinTealRatio = 0.04;
const selectedAugmentDetailCardPresenceMaxStripDarkRatio = 0.62;
const selectedAugmentOwnedPanelRowIconMinDarkRatio = 0.65;
const selectedAugmentOwnedPanelRowIconMinBrightRatio = 0.08;
const selectedAugmentOwnedPanelRowIconMinWhiteRatio = 0.015;
const selectedAugmentOwnedPanelRowIconMinColorRatio = 0.05;

type GpuLike = any;

const selectedAugmentGpuMapRead = 0x0001;
const selectedAugmentGpuCopySrc = 0x0004;
const selectedAugmentGpuCopyDst = 0x0008;
const selectedAugmentGpuUniform = 0x0040;
const selectedAugmentGpuStorage = 0x0080;
const selectedAugmentGpuWorkgroupSize = 64;

const selectedAugmentGpuShader = /* wgsl */ `
struct Candidate {
  variantIndex: u32,
  x: u32,
  y: u32,
  templateOffset: u32,
  templateWidth: u32,
  templateHeight: u32,
  pad0: u32,
  pad1: u32,
};

struct Params {
  candidateCount: u32,
  slotWidth: u32,
  slotHeight: u32,
  minPatchNorm: f32,
};

@group(0) @binding(0) var<storage, read> slotValues: array<f32>;
@group(0) @binding(1) var<storage, read> templateValues: array<f32>;
@group(0) @binding(2) var<storage, read> candidates: array<Candidate>;
@group(0) @binding(3) var<storage, read_write> scores: array<f32>;
@group(0) @binding(4) var<uniform> params: Params;

@compute @workgroup_size(${selectedAugmentGpuWorkgroupSize})
fn main(@builtin(global_invocation_id) globalId: vec3<u32>) {
  let candidateIndex = globalId.x;
  if (candidateIndex >= params.candidateCount) {
    return;
  }

  let candidate = candidates[candidateIndex];
  var sum = 0.0;
  var sumSq = 0.0;
  var dot = 0.0;
  var templateIndex = 0u;

  for (var row = 0u; row < candidate.templateHeight; row = row + 1u) {
    for (var column = 0u; column < candidate.templateWidth; column = column + 1u) {
      let slotPixelIndex = ((candidate.y + row) * params.slotWidth + candidate.x + column) * 3u;
      for (var channel = 0u; channel < 3u; channel = channel + 1u) {
        let slotValue = slotValues[slotPixelIndex + channel];
        sum = sum + slotValue;
        sumSq = sumSq + slotValue * slotValue;
        dot = dot + slotValue * templateValues[candidate.templateOffset + templateIndex];
        templateIndex = templateIndex + 1u;
      }
    }
  }

  let count = f32(candidate.templateWidth * candidate.templateHeight * 3u);
  let variance = max(0.0, sumSq - (sum * sum) / count);
  let norm = sqrt(variance);
  if (norm <= params.minPatchNorm) {
    scores[candidateIndex] = -1.0;
    return;
  }

  scores[candidateIndex] = dot / norm;
}
`;

interface SelectedAugmentGpuState {
  readonly device: GpuLike;
  readonly pipeline: GpuLike;
}

interface SelectedAugmentGpuMatcher {
  match(
    slot: ColorRaster,
    ignoredTemplatePaths?: ReadonlySet<string>,
  ): Promise<TemplateMatch[] | undefined>;
  dispose(): void;
}

let selectedAugmentGpuUnavailable = false;
let selectedAugmentGpuStatePromise: Promise<SelectedAugmentGpuState | undefined> | undefined;

const selectedAugmentImageCache = new Map<string, Promise<HTMLImageElement>>();
const selectedAugmentTemplateCache = new Map<string, Promise<TemplateVariant[]>>();
const selectedAugmentLastMatchCache = new Map<string, string>();
const selectedAugmentNoPresenceResultCache = new Map<
  string,
  {
    dataUrl: string;
    result: GoldenSpatulaSelectedAugmentVisionResult;
  }
>();
const selectedAugmentCandidateAssetCache = new WeakMap<
  GoldenSpatulaAugmentAssetIndex,
  GoldenSpatulaAugmentAsset[]
>();
const selectedAugmentTemplateGroupCacheByAssetIndex = new WeakMap<
  GoldenSpatulaAugmentAssetIndex,
  Map<string, Promise<TemplateVariant[]>>
>();
const selectedAugmentDetailTitleTemplateCacheByAssetIndex = new WeakMap<
  GoldenSpatulaAugmentAssetIndex,
  Promise<DetailTitleTemplateFeature[]>
>();
const selectedAugmentNoPresenceCacheLimit = 12;
const selectedAugmentSlotResultCache = new Map<
  string,
  GoldenSpatulaSelectedAugmentVisionSlotResult
>();
const selectedAugmentVisibleResultCache = new Map<
  string,
  GoldenSpatulaSelectedAugmentVisionResult
>();
const selectedAugmentImageResultCache = new Map<
  string,
  {
    dataUrl: string;
    result: GoldenSpatulaSelectedAugmentVisionResult;
  }
>();
const selectedAugmentScreenshotImageCache = new Map<
  string,
  SelectedAugmentScreenshotImageCacheEntry
>();
const selectedAugmentTemplateVariantGroupIds = new WeakMap<TemplateVariant[], number>();
const selectedAugmentTemplateVariantsByPathCache = new WeakMap<
  TemplateVariant[],
  Map<string, TemplateVariant[]>
>();
const selectedAugmentAssetIndexIds = new WeakMap<GoldenSpatulaAugmentAssetIndex, number>();
const selectedAugmentVisibleResultCacheLimit = 32;
const selectedAugmentImageResultCacheLimit = 8;
const selectedAugmentScreenshotImageCacheLimit = 2;
let selectedAugmentNextTemplateVariantGroupId = 1;
let selectedAugmentNextAssetIndexId = 1;

function limitSelectedAugmentSlots<T extends GoldenSpatulaAugmentIconVisionSlot>(
  slots: readonly T[],
  maxSlots: number | undefined,
): readonly T[] {
  const rawMaxSlots = Math.trunc(maxSlots ?? selectedAugmentDefaultMaxSlots);
  const normalizedMaxSlots = Math.max(
    1,
    Math.min(
      selectedAugmentDefaultMaxSlots,
      Number.isFinite(rawMaxSlots) ? rawMaxSlots : selectedAugmentDefaultMaxSlots,
    ),
  );
  return slots.slice(0, normalizedMaxSlots);
}

function nowMs(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, 0));
}

function buildSelectedAugmentVisionMetrics(
  startedAt: number,
  slotCount: number,
  partial: Partial<
    Pick<
      GoldenSpatulaSelectedAugmentVisionMetrics,
      | 'screenshotLoadMs'
      | 'presenceMs'
      | 'templateLoadMs'
      | 'matchMs'
      | 'templateCount'
      | 'slotCacheHits'
      | 'resultCacheHit'
    >
  > = {},
): GoldenSpatulaSelectedAugmentVisionMetrics {
  return {
    algorithm: 'presence-sampled-color-prefilter-cache-v5',
    totalMs: nowMs() - startedAt,
    screenshotLoadMs: partial.screenshotLoadMs ?? 0,
    presenceMs: partial.presenceMs ?? 0,
    templateLoadMs: partial.templateLoadMs ?? 0,
    matchMs: partial.matchMs ?? 0,
    slotCount,
    templateCount: partial.templateCount ?? 0,
    slotCacheHits: partial.slotCacheHits ?? 0,
    resultCacheHit: partial.resultCacheHit ?? false,
    colorCandidateLimit: selectedAugmentColorCandidateLimit,
    preciseCandidateLimit: selectedAugmentPreciseCandidateLimit,
    presenceSampleStep: selectedAugmentPresenceSampleStep,
  };
}

function loadImage(src: string, cache = true): Promise<HTMLImageElement> {
  const cached = cache ? selectedAugmentImageCache.get(src) : undefined;
  if (cached) return cached;

  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    image.src = src;
  });

  if (cache) selectedAugmentImageCache.set(src, promise);
  return promise;
}

function createColorRasterScratch(): ColorRasterScratch | undefined {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return undefined;
  return { canvas, context };
}

function extractColorRaster(
  image: CanvasImageSource,
  width: number,
  height: number,
  sourceRect?: readonly [number, number, number, number],
  scratch?: ColorRasterScratch,
): ColorRaster {
  const canvas = scratch?.canvas ?? document.createElement('canvas');
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;

  const context = scratch?.context ?? canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    return { width, height, values: new Float32Array(width * height * 3) };
  }

  context.clearRect(0, 0, width, height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  if (sourceRect) {
    context.drawImage(
      image,
      sourceRect[0],
      sourceRect[1],
      Math.max(1, sourceRect[2]),
      Math.max(1, sourceRect[3]),
      0,
      0,
      width,
      height,
    );
  } else {
    context.drawImage(image, 0, 0, width, height);
  }

  const imageData = context.getImageData(0, 0, width, height);
  const values = new Float32Array(width * height * 3);
  for (
    let sourceIndex = 0, targetIndex = 0;
    sourceIndex < imageData.data.length;
    sourceIndex += 4
  ) {
    values[targetIndex] = (imageData.data[sourceIndex] ?? 0) / 255;
    values[targetIndex + 1] = (imageData.data[sourceIndex + 1] ?? 0) / 255;
    values[targetIndex + 2] = (imageData.data[sourceIndex + 2] ?? 0) / 255;
    targetIndex += 3;
  }

  return { width, height, values };
}

function normalizeFeature(values: Float32Array): Float32Array | undefined {
  if (values.length === 0) return undefined;

  let sum = 0;
  for (const value of values) sum += value;
  const mean = sum / values.length;

  let sumSq = 0;
  const normalized = new Float32Array(values.length);
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index] - mean;
    normalized[index] = value;
    sumSq += value * value;
  }

  const norm = Math.sqrt(sumSq);
  if (norm <= selectedAugmentMinPatchNorm) return undefined;
  for (let index = 0; index < normalized.length; index += 1) normalized[index] /= norm;
  return normalized;
}

function resizeRasterValues(
  raster: ColorRaster,
  targetWidth: number,
  targetHeight: number,
): Float32Array {
  const resized = new Float32Array(targetWidth * targetHeight * 3);

  for (let y = 0; y < targetHeight; y += 1) {
    const sourceY = Math.min(
      raster.height - 1,
      Math.max(0, Math.round(((y + 0.5) * raster.height) / targetHeight - 0.5)),
    );
    for (let x = 0; x < targetWidth; x += 1) {
      const sourceX = Math.min(
        raster.width - 1,
        Math.max(0, Math.round(((x + 0.5) * raster.width) / targetWidth - 0.5)),
      );
      const sourceOffset = (sourceY * raster.width + sourceX) * 3;
      const targetOffset = (y * targetWidth + x) * 3;
      resized[targetOffset] = raster.values[sourceOffset] ?? 0;
      resized[targetOffset + 1] = raster.values[sourceOffset + 1] ?? 0;
      resized[targetOffset + 2] = raster.values[sourceOffset + 2] ?? 0;
    }
  }

  return resized;
}

function extractRasterPatch(
  raster: ColorRaster,
  x: number,
  y: number,
  width: number,
  height: number,
): ColorRaster {
  const values = new Float32Array(width * height * 3);

  for (let row = 0; row < height; row += 1) {
    for (let column = 0; column < width; column += 1) {
      const sourceX = Math.min(raster.width - 1, Math.max(0, x + column));
      const sourceY = Math.min(raster.height - 1, Math.max(0, y + row));
      const sourceOffset = (sourceY * raster.width + sourceX) * 3;
      const targetOffset = (row * width + column) * 3;
      values[targetOffset] = raster.values[sourceOffset] ?? 0;
      values[targetOffset + 1] = raster.values[sourceOffset + 1] ?? 0;
      values[targetOffset + 2] = raster.values[sourceOffset + 2] ?? 0;
    }
  }

  return { width, height, values };
}

function buildColorHistogram(values: Float32Array): Float32Array {
  const binCount = selectedAugmentColorHistogramBins;
  const histogram = new Float32Array(binCount * binCount * binCount);

  for (let index = 0; index < values.length; index += 3) {
    const red = Math.min(binCount - 1, Math.max(0, Math.floor((values[index] ?? 0) * binCount)));
    const green = Math.min(
      binCount - 1,
      Math.max(0, Math.floor((values[index + 1] ?? 0) * binCount)),
    );
    const blue = Math.min(
      binCount - 1,
      Math.max(0, Math.floor((values[index + 2] ?? 0) * binCount)),
    );
    histogram[(red * binCount + green) * binCount + blue] += 1;
  }

  let normSq = 0;
  for (const value of histogram) normSq += value * value;
  const norm = Math.sqrt(normSq);
  if (norm <= selectedAugmentMinPatchNorm) return histogram;
  for (let index = 0; index < histogram.length; index += 1) histogram[index] /= norm;
  return histogram;
}

function dotFeatureValues(left: Float32Array | undefined, right: Float32Array | undefined): number {
  if (!left || !right || left.length !== right.length) return -1;

  let dot = 0;
  for (let index = 0; index < left.length; index += 1) {
    dot += (left[index] ?? 0) * (right[index] ?? 0);
  }
  return dot;
}

function analyzeRasterPresence(raster: ColorRaster): RasterPresence {
  let sampled = 0;
  let darkPixels = 0;
  let stripPixels = 0;
  let stripDarkPixels = 0;
  let purplePixels = 0;
  let tealPixels = 0;

  for (let y = 0; y < raster.height; y += 2) {
    for (let x = 0; x < raster.width; x += 2) {
      const offset = (y * raster.width + x) * 3;
      const red = raster.values[offset] ?? 0;
      const green = raster.values[offset + 1] ?? 0;
      const blue = raster.values[offset + 2] ?? 0;
      const luminance = (red + green + blue) / 3;
      const chroma = Math.max(red, green, blue) - Math.min(red, green, blue);
      const isDark = luminance < 0.3;
      const isPurple =
        luminance < 0.48 && red > green + 0.04 && blue > green + 0.04 && chroma > 0.08;
      const isTeal =
        luminance < 0.42 &&
        green > 0.16 &&
        blue > 0.16 &&
        green >= red + 0.035 &&
        blue >= red + 0.015 &&
        chroma > 0.035;
      const inLeftStrip = x < raster.width * 0.28;

      sampled += 1;
      if (isDark) darkPixels += 1;
      if (isPurple) purplePixels += 1;
      if (isTeal) tealPixels += 1;
      if (inLeftStrip) {
        stripPixels += 1;
        if (isDark) stripDarkPixels += 1;
      }
    }
  }

  return {
    darkRatio: sampled > 0 ? darkPixels / sampled : 0,
    stripDarkRatio: stripPixels > 0 ? stripDarkPixels / stripPixels : 0,
    purpleRatio: sampled > 0 ? purplePixels / sampled : 0,
    tealRatio: sampled > 0 ? tealPixels / sampled : 0,
  };
}

function roundPresenceRatio(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function toPresenceDiagnostic(
  presence: RasterPresence,
): GoldenSpatulaSelectedAugmentDetailPresenceDiagnostic {
  return {
    darkRatio: roundPresenceRatio(presence.darkRatio),
    stripDarkRatio: roundPresenceRatio(presence.stripDarkRatio),
    purpleRatio: roundPresenceRatio(presence.purpleRatio),
    tealRatio: roundPresenceRatio(presence.tealRatio),
  };
}

function getSelectedAugmentOwnedPanelPresenceDiagnostics(screenshot: HTMLImageElement): {
  visible: boolean;
  body: GoldenSpatulaSelectedAugmentDetailPresenceDiagnostic;
  header: GoldenSpatulaSelectedAugmentDetailPresenceDiagnostic;
} {
  const scratch = createColorRasterScratch();
  const body = analyzeRasterPresence(
    extractColorRaster(
      screenshot,
      128,
      128,
      scaleSlotRoi([1010, 68, 255, 330], screenshot),
      scratch,
    ),
  );
  const header = analyzeRasterPresence(
    extractColorRaster(screenshot, 128, 32, scaleSlotRoi([1018, 70, 248, 58], screenshot), scratch),
  );

  return {
    visible:
      body.darkRatio >= selectedAugmentOwnedPanelPresenceMinDarkRatio &&
      body.stripDarkRatio >= selectedAugmentOwnedPanelPresenceMinStripDarkRatio &&
      header.darkRatio >= selectedAugmentOwnedPanelPresenceMinDarkRatio &&
      header.tealRatio >= selectedAugmentOwnedPanelPresenceMinTealRatio,
    body: toPresenceDiagnostic(body),
    header: toPresenceDiagnostic(header),
  };
}

function getSelectedAugmentLargeDetailCardPresenceDiagnostics(screenshot: HTMLImageElement): {
  sides: Set<GoldenSpatulaSelectedAugmentDetailSide>;
  presence: GoldenSpatulaSelectedAugmentDetailCardPresenceDiagnostic[];
} {
  const scratch = createColorRasterScratch();
  const candidates = [
    { side: 'left' as const, roi: [120, 130, 430, 395] as const },
    { side: 'right' as const, roi: [600, 130, 430, 395] as const },
  ] as const;
  const sides = new Set<GoldenSpatulaSelectedAugmentDetailSide>();
  const diagnostics: GoldenSpatulaSelectedAugmentDetailCardPresenceDiagnostic[] = [];

  for (const candidate of candidates) {
    const presence = analyzeRasterPresence(
      extractColorRaster(screenshot, 120, 140, scaleSlotRoi(candidate.roi, screenshot), scratch),
    );
    const visible =
      presence.darkRatio >= selectedAugmentDetailCardPresenceMinDarkRatio &&
      presence.purpleRatio >= selectedAugmentDetailCardPresenceMinPurpleRatio &&
      (presence.stripDarkRatio <= selectedAugmentDetailCardPresenceMaxStripDarkRatio ||
        presence.tealRatio >= selectedAugmentDetailCardPresenceMinTealRatio);
    diagnostics.push({
      side: candidate.side,
      visible,
      ...toPresenceDiagnostic(presence),
    });
    if (visible) {
      sides.add(candidate.side);
    }
  }

  return { sides, presence: diagnostics };
}

function hasSelectedAugmentOwnedPanelRowContent(
  screenshot: HTMLImageElement,
  rowIndex: number,
): boolean {
  const scratch = createColorRasterScratch();
  const rowOffset = Math.max(0, Math.trunc(rowIndex) - 1);
  const raster = extractColorRaster(
    screenshot,
    96,
    48,
    scaleSlotRoi(
      [1028, 122 + rowOffset * goldenSpatulaSelectedAugmentOwnedPanelRowHeight, 78, 70],
      screenshot,
    ),
    scratch,
  );
  let sampled = 0;
  let darkPixels = 0;
  let brightPixels = 0;
  let whitePixels = 0;
  let colorfulPixels = 0;

  for (let y = 0; y < raster.height; y += 2) {
    for (let x = 0; x < raster.width; x += 2) {
      const offset = (y * raster.width + x) * 3;
      const red = raster.values[offset] ?? 0;
      const green = raster.values[offset + 1] ?? 0;
      const blue = raster.values[offset + 2] ?? 0;
      const luminance = (red + green + blue) / 3;
      const chroma = Math.max(red, green, blue) - Math.min(red, green, blue);

      sampled += 1;
      if (luminance < 0.3) darkPixels += 1;
      if (luminance > 0.48) brightPixels += 1;
      if (luminance > 0.62 && chroma < 0.25) whitePixels += 1;
      if (luminance > 0.22 && chroma > 0.18) colorfulPixels += 1;
    }
  }

  if (sampled === 0) return false;
  const darkRatio = darkPixels / sampled;
  const brightRatio = brightPixels / sampled;
  const whiteRatio = whitePixels / sampled;
  const colorRatio = colorfulPixels / sampled;

  return (
    darkRatio >= selectedAugmentOwnedPanelRowIconMinDarkRatio &&
    brightRatio >= selectedAugmentOwnedPanelRowIconMinBrightRatio &&
    (whiteRatio >= selectedAugmentOwnedPanelRowIconMinWhiteRatio ||
      colorRatio >= selectedAugmentOwnedPanelRowIconMinColorRatio)
  );
}

function getSelectedAugmentOwnedPanelVisibleRows(
  screenshot: HTMLImageElement,
  maxSlots: number | undefined,
): Set<number> {
  const slotCount = clampSelectedAugmentSlotCount(maxSlots);
  const rows = new Set<number>();
  for (let rowIndex = 1; rowIndex <= slotCount; rowIndex += 1) {
    if (hasSelectedAugmentOwnedPanelRowContent(screenshot, rowIndex)) {
      rows.add(rowIndex);
    }
  }
  return rows;
}

function createEmptySelectedAugmentDetailDiagnostics(): GoldenSpatulaSelectedAugmentDetailDiagnostics {
  return {
    ownedPanelVisible: false,
    ownedPanelBody: {
      darkRatio: 0,
      stripDarkRatio: 0,
      purpleRatio: 0,
      tealRatio: 0,
    },
    ownedPanelHeader: {
      darkRatio: 0,
      stripDarkRatio: 0,
      purpleRatio: 0,
      tealRatio: 0,
    },
    detailCardSides: [],
    detailCardPresence: [],
    titleAllowedSides: [],
  };
}

function getSelectedAugmentDetailCardSlotSide(
  slotLabel: string | undefined,
): GoldenSpatulaSelectedAugmentDetailSide | undefined {
  if (!slotLabel) return undefined;
  return slotLabel.includes('right') ? 'right' : 'left';
}

function isSelectedAugmentDetailCardSlotAllowed(
  slot: Pick<GoldenSpatulaSelectedAugmentVisionSlotResult, 'slotLabel'>,
  diagnostics: GoldenSpatulaSelectedAugmentDetailDiagnostics,
): boolean {
  if (!diagnostics.ownedPanelVisible) return false;
  const side = getSelectedAugmentDetailCardSlotSide(slot.slotLabel);
  return Boolean(side && diagnostics.detailCardSides.includes(side));
}

function buildSelectedAugmentDetailIconDiagnostic(
  slot: GoldenSpatulaSelectedAugmentVisionSlotResult | undefined,
  diagnostics: GoldenSpatulaSelectedAugmentDetailDiagnostics,
): GoldenSpatulaSelectedAugmentDetailIconDiagnostic | undefined {
  if (!slot) return undefined;
  const side = getSelectedAugmentDetailCardSlotSide(slot.slotLabel);
  const accepted = isSelectedAugmentDetailCardSlotAllowed(slot, diagnostics);
  const rejectedReason: GoldenSpatulaSelectedAugmentDetailIconDiagnostic['rejectedReason'] =
    accepted ? undefined : !diagnostics.ownedPanelVisible ? 'noOwnedPanel' : 'noDetailCardSide';

  return {
    slotLabel: slot.slotLabel,
    side,
    augmentName: slot.augmentName,
    score: slot.score !== undefined ? roundPresenceRatio(slot.score) : undefined,
    center: slot.matchCenter,
    accepted,
    rejectedReason,
  };
}

function normalizeBinaryFeature(values: Float32Array): Float32Array | undefined {
  if (values.length === 0) return undefined;

  let sum = 0;
  for (const value of values) sum += value;
  const mean = sum / values.length;

  let sumSq = 0;
  const normalized = new Float32Array(values.length);
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index] - mean;
    normalized[index] = value;
    sumSq += value * value;
  }

  const norm = Math.sqrt(sumSq);
  if (norm <= selectedAugmentMinPatchNorm) return undefined;
  for (let index = 0; index < normalized.length; index += 1) normalized[index] /= norm;
  return normalized;
}

function extractBinaryLuminanceFeature(
  image: CanvasImageSource,
  width: number,
  height: number,
  threshold: number,
  sourceRect?: readonly [number, number, number, number],
): Float32Array | undefined {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return undefined;

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  if (sourceRect) {
    context.drawImage(
      image,
      sourceRect[0],
      sourceRect[1],
      Math.max(1, sourceRect[2]),
      Math.max(1, sourceRect[3]),
      0,
      0,
      width,
      height,
    );
  } else {
    context.drawImage(image, 0, 0, width, height);
  }

  const imageData = context.getImageData(0, 0, width, height);
  const values = new Float32Array(width * height);
  for (
    let sourceIndex = 0, targetIndex = 0;
    sourceIndex < imageData.data.length;
    sourceIndex += 4
  ) {
    const red = imageData.data[sourceIndex] ?? 0;
    const green = imageData.data[sourceIndex + 1] ?? 0;
    const blue = imageData.data[sourceIndex + 2] ?? 0;
    values[targetIndex] = (red + green + blue) / 3 >= threshold ? 1 : 0;
    targetIndex += 1;
  }

  return normalizeBinaryFeature(values);
}

function buildDetailTitleFeatureFromText(text: string, fontSize: number): Float32Array | undefined {
  const canvas = document.createElement('canvas');
  canvas.width = selectedAugmentDetailTitleFeatureWidth;
  canvas.height = selectedAugmentDetailTitleFeatureHeight;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return undefined;

  const maxWidth = selectedAugmentDetailTitleFeatureWidth - 12;
  let fittedFontSize = fontSize;
  context.font = `700 ${fittedFontSize}px SimHei, "Microsoft YaHei", sans-serif`;
  const measured = context.measureText(text).width;
  if (measured > maxWidth && measured > 0) {
    fittedFontSize = Math.max(16, Math.floor((fontSize * maxWidth) / measured));
  }

  context.clearRect(
    0,
    0,
    selectedAugmentDetailTitleFeatureWidth,
    selectedAugmentDetailTitleFeatureHeight,
  );
  context.font = `700 ${fittedFontSize}px SimHei, "Microsoft YaHei", sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.lineWidth = Math.max(2, Math.round(fittedFontSize / 10));
  context.strokeStyle = 'rgb(0, 0, 0)';
  context.fillStyle = 'rgb(255, 255, 255)';
  const x = selectedAugmentDetailTitleFeatureWidth / 2;
  const y = selectedAugmentDetailTitleFeatureHeight / 2;
  context.strokeText(text, x, y);
  context.fillText(text, x, y);

  return extractBinaryLuminanceFeature(
    canvas,
    selectedAugmentDetailTitleFeatureWidth,
    selectedAugmentDetailTitleFeatureHeight,
    selectedAugmentDetailTitleTemplateThreshold,
  );
}

function getDetailTitleTemplateNameKey(asset: GoldenSpatulaAugmentAsset, name: string): string {
  return `${asset.imagePath ?? asset.name ?? name}\u0000${name}`;
}

function collectDetailTitleTemplateNames(asset: GoldenSpatulaAugmentAsset): string[] {
  const names = [asset.name, ...(asset.aliases ?? [])]
    .map((name) => name?.trim())
    .filter((name): name is string => Boolean(name));
  return [...new Set(names)];
}

function normalizeSelectedAugmentNameForCompare(name: string | undefined): string {
  return String(name ?? '')
    .trim()
    .toLocaleLowerCase('zh-CN')
    .replace(/[\s!！?？,，.。:：;；"'“”‘’()[\]（）【】·・\-_/\\]/gu, '');
}

function getSelectedAugmentExpectedNameSet(names: readonly string[] | undefined): Set<string> {
  return new Set(
    (names ?? []).map(normalizeSelectedAugmentNameForCompare).filter((name) => name.length > 0),
  );
}

function doesDetailTitleMatchExpected(
  match: DetailTitleMatch,
  expectedNames: ReadonlySet<string>,
): boolean {
  if (expectedNames.size === 0) return false;
  return collectDetailTitleTemplateNames(match.template.asset).some((name) =>
    expectedNames.has(normalizeSelectedAugmentNameForCompare(name)),
  );
}

function isUnhintedDetailTitleMatchStrong(match: DetailTitleMatch): boolean {
  return (
    match.score >= selectedAugmentDetailTitleUnhintedMinScore &&
    match.margin >= selectedAugmentDetailTitleUnhintedMinMargin
  );
}

async function loadDetailTitleTemplateFeatures(
  augmentAssets: GoldenSpatulaAugmentAssetIndex | undefined,
): Promise<DetailTitleTemplateFeature[]> {
  if (!augmentAssets) return [];
  const cached = selectedAugmentDetailTitleTemplateCacheByAssetIndex.get(augmentAssets);
  if (cached) return cached;

  const promise = (async () => {
    const templates: DetailTitleTemplateFeature[] = [];

    for (const asset of collectCandidateAssets(augmentAssets)) {
      for (const name of collectDetailTitleTemplateNames(asset)) {
        for (const fontSize of selectedAugmentDetailTitleFontSizes) {
          const featureValues = buildDetailTitleFeatureFromText(name, fontSize);
          if (!featureValues) continue;
          templates.push({
            asset,
            templatePath: asset.imagePath,
            name,
            featureValues,
          });
        }
      }
      if (templates.length % 48 === 0) await yieldToBrowser();
    }

    return templates;
  })();

  selectedAugmentDetailTitleTemplateCacheByAssetIndex.set(augmentAssets, promise);
  return promise;
}

function scoreDetailTitleSlot(
  screenshot: HTMLImageElement,
  slot: DetailTitleSlot,
  templates: DetailTitleTemplateFeature[],
): DetailTitleMatch | undefined {
  const featureValues = extractBinaryLuminanceFeature(
    screenshot,
    selectedAugmentDetailTitleFeatureWidth,
    selectedAugmentDetailTitleFeatureHeight,
    selectedAugmentDetailTitleSourceThreshold,
    scaleSlotRoi(slot.roi, screenshot),
  );
  if (!featureValues) return undefined;

  const bestByName = new Map<
    string,
    {
      template: DetailTitleTemplateFeature;
      score: number;
    }
  >();

  for (const template of templates) {
    const score = dotFeatureValues(featureValues, template.featureValues);
    const key = getDetailTitleTemplateNameKey(template.asset, template.name);
    const current = bestByName.get(key);
    if (!current || score > current.score) {
      bestByName.set(key, { template, score });
    }
  }

  const ranked = [...bestByName.values()].sort((left, right) => right.score - left.score);
  const best = ranked[0];
  if (!best) return undefined;

  const second = ranked.find(
    (candidate) => candidate.template.asset.imagePath !== best.template.asset.imagePath,
  );
  const margin = best.score - (second?.score ?? -1);
  const confident =
    best.score >= selectedAugmentDetailTitleMinScore &&
    (best.score >= selectedAugmentDetailTitleStrongScore ||
      margin >= selectedAugmentDetailTitleMinMargin);
  if (!confident) return undefined;

  return {
    slot,
    template: best.template,
    score: best.score,
    margin,
  };
}

async function recognizeSelectedAugmentDetailTitleFromImage(
  screenshot: HTMLImageElement,
  augmentAssets: GoldenSpatulaAugmentAssetIndex | undefined,
  allowedSides: ReadonlySet<DetailTitleSlot['side']>,
): Promise<DetailTitleMatch | undefined> {
  const templates = await loadDetailTitleTemplateFeatures(augmentAssets);
  if (templates.length === 0 || allowedSides.size === 0) return undefined;

  let best: DetailTitleMatch | undefined;
  for (const slot of goldenSpatulaSelectedAugmentDetailTitleSlots) {
    if (!allowedSides.has(slot.side)) continue;
    const match = scoreDetailTitleSlot(screenshot, slot, templates);
    if (!match) {
      await yieldToBrowser();
      continue;
    }
    if (!best || match.score > best.score) best = match;
    await yieldToBrowser();
  }

  return best;
}

function getTemplateCacheKey(
  asset: GoldenSpatulaAugmentAsset,
  basePath: string,
  templateHeights: readonly number[],
  maxWidth: number,
  maxHeight: number,
): string {
  return [
    basePath,
    asset.imagePath ?? '',
    `${maxWidth}x${maxHeight}`,
    templateHeights.join(','),
  ].join('\u0000');
}

async function loadTemplateVariants(
  asset: GoldenSpatulaAugmentAsset,
  basePath: string,
  templateHeights: readonly number[] = selectedAugmentTemplateHeights,
  maxWidth = selectedAugmentSlotWidth,
  maxHeight = selectedAugmentSlotHeight,
): Promise<TemplateVariant[]> {
  const cacheKey = getTemplateCacheKey(asset, basePath, templateHeights, maxWidth, maxHeight);
  const cached = selectedAugmentTemplateCache.get(cacheKey);
  if (cached) return cached;

  const promise = (async () => {
    if (!asset.imagePath) return [];

    const dataUrl = await loadIconAsDataUrl(asset.imagePath, basePath);
    if (!dataUrl) return [];

    const image = await loadImage(dataUrl);
    const aspectRatio = (image.naturalWidth || image.width) / (image.naturalHeight || image.height);
    const variants: TemplateVariant[] = [];
    const scratch = createColorRasterScratch();

    for (const height of templateHeights) {
      const width = Math.max(8, Math.round(height * aspectRatio));
      if (width >= maxWidth || height >= maxHeight) continue;

      const raster = extractColorRaster(image, width, height, undefined, scratch);
      const normalized = normalizeFeature(raster.values);
      if (!normalized) continue;

      const featureValues = normalizeFeature(
        resizeRasterValues(raster, selectedAugmentFeatureWidth, selectedAugmentFeatureHeight),
      );
      if (!featureValues) continue;

      variants.push({
        asset,
        templatePath: asset.imagePath,
        width,
        height,
        values: normalized,
        featureValues,
        colorHistogram: buildColorHistogram(raster.values),
      });
    }

    return variants;
  })();

  selectedAugmentTemplateCache.set(cacheKey, promise);
  return promise;
}

function collectCandidateAssets(
  augmentAssets: GoldenSpatulaAugmentAssetIndex | undefined,
): GoldenSpatulaAugmentAsset[] {
  if (augmentAssets) {
    const cached = selectedAugmentCandidateAssetCache.get(augmentAssets);
    if (cached) return cached;
  }

  const candidates: GoldenSpatulaAugmentAsset[] = [];
  const seen = new Set<string>();

  for (const asset of Object.values(augmentAssets ?? {})) {
    if (!asset.imagePath || asset.templateAvailable === false) continue;

    const key = asset.imagePath.replace(/\\/g, '/').toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    candidates.push(asset);
  }

  if (augmentAssets) selectedAugmentCandidateAssetCache.set(augmentAssets, candidates);
  return candidates;
}

function getTemplateGroupCacheKey(
  basePath: string,
  templateHeights: readonly number[],
  maxWidth: number,
  maxHeight: number,
): string {
  return [basePath, `${maxWidth}x${maxHeight}`, templateHeights.join(',')].join('\u0000');
}

async function loadTemplateVariantGroup(
  augmentAssets: GoldenSpatulaAugmentAssetIndex | undefined,
  basePath: string,
  templateHeights: readonly number[] = selectedAugmentTemplateHeights,
  maxWidth = selectedAugmentSlotWidth,
  maxHeight = selectedAugmentSlotHeight,
): Promise<TemplateVariant[]> {
  const candidates = collectCandidateAssets(augmentAssets);
  if (candidates.length === 0) return [];

  const cacheKey = getTemplateGroupCacheKey(basePath, templateHeights, maxWidth, maxHeight);
  if (augmentAssets) {
    const scopedCache = selectedAugmentTemplateGroupCacheByAssetIndex.get(augmentAssets);
    const cached = scopedCache?.get(cacheKey);
    if (cached) return cached;
  }

  const promise = Promise.all(
    candidates.map((asset) =>
      loadTemplateVariants(asset, basePath, templateHeights, maxWidth, maxHeight),
    ),
  ).then((templateGroups) => templateGroups.flat());

  if (augmentAssets) {
    let scopedCache = selectedAugmentTemplateGroupCacheByAssetIndex.get(augmentAssets);
    if (!scopedCache) {
      scopedCache = new Map();
      selectedAugmentTemplateGroupCacheByAssetIndex.set(augmentAssets, scopedCache);
    }
    scopedCache.set(cacheKey, promise);
  }

  return promise;
}

function isDarkFramePixel(red: number, green: number, blue: number): boolean {
  const luminance = (red + green + blue) / 3;
  return luminance < 0.18 || (blue > 0.18 && red < 0.16 && green < 0.2);
}

function isColorfulIconPixel(red: number, green: number, blue: number): boolean {
  const luminance = (red + green + blue) / 3;
  const chroma = Math.max(red, green, blue) - Math.min(red, green, blue);
  return luminance > 0.16 && chroma > 0.08;
}

function hasSelectedAugmentIconPresence(slot: ColorRaster): boolean {
  let framePixels = 0;
  let darkFramePixels = 0;
  let centerPixels = 0;
  let colorPixels = 0;
  let totalDarkPixels = 0;
  let totalColorPixels = 0;
  let topLeftPixels = 0;
  let topLeftDarkPixels = 0;
  let sampledPixels = 0;

  for (let y = 0; y < slot.height; y += selectedAugmentPresenceSampleStep) {
    for (let x = 0; x < slot.width; x += selectedAugmentPresenceSampleStep) {
      const offset = (y * slot.width + x) * 3;
      const red = slot.values[offset] ?? 0;
      const green = slot.values[offset + 1] ?? 0;
      const blue = slot.values[offset + 2] ?? 0;
      const isDark = isDarkFramePixel(red, green, blue);
      const isColorful = isColorfulIconPixel(red, green, blue);
      const inFrame =
        x < slot.width * 0.18 ||
        x > slot.width * 0.82 ||
        y < slot.height * 0.18 ||
        y > slot.height * 0.82;
      const inTopLeft = x < slot.width * 0.72 && y < slot.height * 0.72;

      sampledPixels += 1;
      if (isDark) totalDarkPixels += 1;
      if (isColorful) totalColorPixels += 1;

      if (inFrame) {
        framePixels += 1;
        if (isDark) darkFramePixels += 1;
      } else {
        centerPixels += 1;
        if (isColorful) colorPixels += 1;
      }

      if (inTopLeft) {
        topLeftPixels += 1;
        if (isDark) topLeftDarkPixels += 1;
      }
    }
  }

  const darkFrameRatio = framePixels > 0 ? darkFramePixels / framePixels : 0;
  const colorRatio = centerPixels > 0 ? colorPixels / centerPixels : 0;
  const totalPixels = sampledPixels;
  const totalDarkRatio = totalPixels > 0 ? totalDarkPixels / totalPixels : 0;
  const totalColorRatio = totalPixels > 0 ? totalColorPixels / totalPixels : 0;
  const topLeftDarkRatio = topLeftPixels > 0 ? topLeftDarkPixels / topLeftPixels : 0;
  const floatingIconPresence =
    totalDarkRatio >= 0.08 && totalColorRatio >= 0.2 && topLeftDarkRatio >= 0.08;

  return (
    floatingIconPresence ||
    (darkFrameRatio >= selectedAugmentMinFrameDarkRatio &&
      colorRatio >= selectedAugmentMinColorRatio)
  );
}

function scoreTemplateAt(
  slot: ColorRaster,
  variant: TemplateVariant,
  x: number,
  y: number,
): number {
  let sum = 0;
  let sumSq = 0;
  let dot = 0;
  let templateIndex = 0;

  for (let row = 0; row < variant.height; row += 1) {
    let slotIndex = ((y + row) * slot.width + x) * 3;
    for (let column = 0; column < variant.width; column += 1) {
      for (let channel = 0; channel < 3; channel += 1) {
        const value = slot.values[slotIndex + channel] ?? 0;
        sum += value;
        sumSq += value * value;
        dot += value * (variant.values[templateIndex] ?? 0);
        templateIndex += 1;
      }
      slotIndex += 3;
    }
  }

  const count = variant.width * variant.height * 3;
  const variance = Math.max(0, sumSq - (sum * sum) / count);
  const norm = Math.sqrt(variance);
  return norm <= selectedAugmentMinPatchNorm ? -1 : dot / norm;
}

function scoreTemplatePatchFeatures(
  slot: ColorRaster,
  variant: TemplateVariant,
  x: number,
  y: number,
): Pick<TemplateMatch, 'colorScore' | 'featureScore'> {
  const patch = extractRasterPatch(slot, x, y, variant.width, variant.height);
  const patchFeature = normalizeFeature(
    resizeRasterValues(patch, selectedAugmentFeatureWidth, selectedAugmentFeatureHeight),
  );
  const featureScore = dotFeatureValues(patchFeature, variant.featureValues);
  const colorScore = dotFeatureValues(buildColorHistogram(patch.values), variant.colorHistogram);

  return {
    colorScore,
    featureScore,
  };
}

function combineTemplateScores(
  baseScore: number,
  featureScore: number,
  colorScore: number,
): number {
  const positiveFeatureScore = Math.max(0, featureScore);
  const positiveColorScore = Math.max(0, colorScore);
  const fusedScore = baseScore * 0.68 + positiveFeatureScore * 0.2 + positiveColorScore * 0.12;
  return Math.max(baseScore, fusedScore);
}

function getTemplateMatchKey(variant: TemplateVariant): string {
  const augmentName = (variant.asset.name ?? '').trim().toLocaleLowerCase();
  return augmentName || variant.templatePath.replace(/\\/g, '/').toLocaleLowerCase();
}

function findBestTemplatePlacement(
  slot: ColorRaster,
  variant: TemplateVariant,
  matchStep: number,
): Pick<TemplateMatch, 'baseScore' | 'x' | 'y'> | undefined {
  const maxX = slot.width - variant.width;
  const maxY = slot.height - variant.height;
  if (maxX < 0 || maxY < 0) return undefined;

  let bestScore = -1;
  let bestX = 0;
  let bestY = 0;

  for (let y = 0; y <= maxY; y += matchStep) {
    for (let x = 0; x <= maxX; x += matchStep) {
      const score = scoreTemplateAt(slot, variant, x, y);
      if (score > bestScore) {
        bestScore = score;
        bestX = x;
        bestY = y;
      }
    }
  }

  return {
    baseScore: bestScore,
    x: bestX,
    y: bestY,
  };
}

function chooseFastTemplateVariants(
  variants: TemplateVariant[],
  slot: ColorRaster,
  candidateLimit: number,
): TemplateVariant[] {
  const bestFastVariantByAugment = new Map<string, TemplateVariant>();
  const targetHeight = Math.max(24, Math.min(slot.height - 6, Math.round(slot.height * 0.68)));

  for (const variant of variants) {
    const key = getTemplateMatchKey(variant);
    const current = bestFastVariantByAugment.get(key);
    if (
      !current ||
      Math.abs(variant.height - targetHeight) < Math.abs(current.height - targetHeight)
    ) {
      bestFastVariantByAugment.set(key, variant);
    }
  }

  const scored = [...bestFastVariantByAugment.values()]
    .map((variant) => {
      const placement = findBestTemplatePlacement(slot, variant, selectedAugmentFastMatchStep);
      return {
        key: getTemplateMatchKey(variant),
        score: placement?.baseScore ?? -1,
      };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, candidateLimit);

  const candidateKeys = new Set(scored.map((candidate) => candidate.key));
  return variants.filter((variant) => candidateKeys.has(getTemplateMatchKey(variant)));
}

function chooseColorCandidateVariants(
  variants: TemplateVariant[],
  slot: ColorRaster,
  candidateLimit: number,
): TemplateVariant[] {
  if (variants.length <= candidateLimit) return variants;

  const slotHistogram = buildColorHistogram(slot.values);
  const shortlist: Array<{ variant: TemplateVariant; score: number }> = [];

  for (const variant of variants) {
    const candidate = {
      variant,
      score: dotFeatureValues(slotHistogram, variant.colorHistogram),
    };

    if (shortlist.length < candidateLimit) {
      shortlist.push(candidate);
      if (shortlist.length === candidateLimit) {
        shortlist.sort((left, right) => right.score - left.score);
      }
      continue;
    }

    const weakest = shortlist[shortlist.length - 1];
    if (!weakest || candidate.score <= weakest.score) continue;

    let insertAt = shortlist.length - 1;
    while (insertAt > 0 && candidate.score > (shortlist[insertAt - 1]?.score ?? -1)) {
      shortlist[insertAt] = shortlist[insertAt - 1]!;
      insertAt -= 1;
    }
    shortlist[insertAt] = candidate;
  }

  return shortlist.map((candidate) => candidate.variant);
}

function findTemplateMatches(
  slot: ColorRaster,
  variants: TemplateVariant[],
  candidateLimit = selectedAugmentPreciseCandidateLimit,
  ignoredTemplatePaths?: ReadonlySet<string>,
): TemplateMatch[] {
  const availableVariants = ignoredTemplatePaths?.size
    ? variants.filter((variant) => !ignoredTemplatePaths.has(variant.templatePath))
    : variants;
  if (availableVariants.length === 0) return [];

  const bestByAugment = new Map<string, TemplateMatch>();
  const colorCandidates = chooseColorCandidateVariants(
    availableVariants,
    slot,
    selectedAugmentColorCandidateLimit,
  );
  const preciseVariants =
    colorCandidates.length <= candidateLimit
      ? colorCandidates
      : chooseFastTemplateVariants(colorCandidates, slot, candidateLimit);

  for (const variant of preciseVariants) {
    const placement = findBestTemplatePlacement(slot, variant, selectedAugmentMatchStep);
    if (!placement) continue;

    const key = getTemplateMatchKey(variant);
    const current = bestByAugment.get(key);
    if (!current || placement.baseScore > current.baseScore) {
      bestByAugment.set(key, {
        variant,
        score: placement.baseScore,
        baseScore: placement.baseScore,
        featureScore: -1,
        colorScore: -1,
        x: placement.x,
        y: placement.y,
      });
    }
  }

  return [...bestByAugment.values()]
    .map((match) => {
      const featureScores = scoreTemplatePatchFeatures(slot, match.variant, match.x, match.y);
      return {
        ...match,
        score: combineTemplateScores(
          match.baseScore,
          featureScores.featureScore,
          featureScores.colorScore,
        ),
        featureScore: featureScores.featureScore,
        colorScore: featureScores.colorScore,
      };
    })
    .sort((left, right) => right.score - left.score);
}

async function getSelectedAugmentGpuState(): Promise<SelectedAugmentGpuState | undefined> {
  if (selectedAugmentGpuUnavailable || typeof navigator === 'undefined') return undefined;

  if (!selectedAugmentGpuStatePromise) {
    selectedAugmentGpuStatePromise = (async () => {
      const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<GpuLike> } }).gpu;
      if (!gpu) {
        selectedAugmentGpuUnavailable = true;
        return undefined;
      }

      try {
        const adapter = await gpu.requestAdapter();
        if (!adapter) {
          selectedAugmentGpuUnavailable = true;
          return undefined;
        }

        const device = await adapter.requestDevice();
        const module = device.createShaderModule({ code: selectedAugmentGpuShader });
        const pipeline = device.createComputePipeline({
          layout: 'auto',
          compute: { module, entryPoint: 'main' },
        });
        return { device, pipeline };
      } catch {
        selectedAugmentGpuUnavailable = true;
        return undefined;
      }
    })();
  }

  return selectedAugmentGpuStatePromise;
}

function createSelectedAugmentGpuBuffer(
  device: GpuLike,
  data: ArrayBufferView,
  usage: number,
): GpuLike {
  const buffer = device.createBuffer({
    size: Math.max(4, data.byteLength),
    usage: usage | selectedAugmentGpuCopyDst,
  });
  device.queue.writeBuffer(buffer, 0, data);
  return buffer;
}

function createSelectedAugmentGpuParams(
  candidateCount: number,
  slotWidth: number,
  slotHeight: number,
): Uint8Array {
  const params = new ArrayBuffer(16);
  const view = new DataView(params);
  view.setUint32(0, candidateCount, true);
  view.setUint32(4, slotWidth, true);
  view.setUint32(8, slotHeight, true);
  view.setFloat32(12, selectedAugmentMinPatchNorm, true);
  return new Uint8Array(params);
}

function buildSelectedAugmentTemplateValues(variants: TemplateVariant[]): {
  offsets: Uint32Array;
  values: Float32Array;
} {
  const offsets = new Uint32Array(variants.length);
  let totalLength = 0;

  variants.forEach((variant, index) => {
    offsets[index] = totalLength;
    totalLength += variant.values.length;
  });

  const values = new Float32Array(totalLength);
  let writeOffset = 0;
  for (const variant of variants) {
    values.set(variant.values, writeOffset);
    writeOffset += variant.values.length;
  }

  return { offsets, values };
}

function buildSelectedAugmentGpuCandidates(
  variants: TemplateVariant[],
  templateOffsets: Uint32Array,
  slotWidth: number,
  slotHeight: number,
  matchStep: number,
): Uint32Array {
  const values: number[] = [];

  variants.forEach((variant, variantIndex) => {
    const maxX = slotWidth - variant.width;
    const maxY = slotHeight - variant.height;
    if (maxX < 0 || maxY < 0) return;

    for (let y = 0; y <= maxY; y += matchStep) {
      for (let x = 0; x <= maxX; x += matchStep) {
        values.push(
          variantIndex,
          x,
          y,
          templateOffsets[variantIndex],
          variant.width,
          variant.height,
          0,
          0,
        );
      }
    }
  });

  return new Uint32Array(values);
}

function reduceSelectedAugmentGpuScores(
  slot: ColorRaster,
  variants: TemplateVariant[],
  variantKeys: readonly string[],
  candidates: Uint32Array,
  scores: Float32Array,
  ignoredTemplatePaths?: ReadonlySet<string>,
): TemplateMatch[] {
  const bestByAugment = new Map<string, TemplateMatch>();

  for (let candidateIndex = 0; candidateIndex < scores.length; candidateIndex += 1) {
    const candidateOffset = candidateIndex * 8;
    const variantIndex = candidates[candidateOffset];
    const variant = variants[variantIndex];
    if (!variant || ignoredTemplatePaths?.has(variant.templatePath)) continue;

    const baseScore = scores[candidateIndex];
    const key = variantKeys[variantIndex] ?? getTemplateMatchKey(variant);
    const current = bestByAugment.get(key);
    if (!current || baseScore > current.baseScore) {
      bestByAugment.set(key, {
        variant,
        score: baseScore,
        baseScore,
        featureScore: -1,
        colorScore: -1,
        x: candidates[candidateOffset + 1],
        y: candidates[candidateOffset + 2],
      });
    }
  }

  return [...bestByAugment.values()]
    .map((match) => {
      const featureScores = scoreTemplatePatchFeatures(slot, match.variant, match.x, match.y);
      return {
        ...match,
        score: combineTemplateScores(
          match.baseScore,
          featureScores.featureScore,
          featureScores.colorScore,
        ),
        featureScore: featureScores.featureScore,
        colorScore: featureScores.colorScore,
      };
    })
    .sort((left, right) => right.score - left.score);
}

async function createSelectedAugmentGpuMatcher(
  variants: TemplateVariant[],
  slotWidth: number,
  slotHeight: number,
  matchStep: number,
): Promise<SelectedAugmentGpuMatcher | undefined> {
  if (variants.length === 0) return undefined;

  const state = await getSelectedAugmentGpuState();
  if (!state) return undefined;

  try {
    const { offsets, values } = buildSelectedAugmentTemplateValues(variants);
    const candidates = buildSelectedAugmentGpuCandidates(
      variants,
      offsets,
      slotWidth,
      slotHeight,
      matchStep,
    );
    const candidateCount = Math.floor(candidates.length / 8);
    if (candidateCount === 0 || values.length === 0) return undefined;

    const { device, pipeline } = state;
    const variantKeys = variants.map(getTemplateMatchKey);
    const templateBuffer = createSelectedAugmentGpuBuffer(
      device,
      values,
      selectedAugmentGpuStorage,
    );
    const candidateBuffer = createSelectedAugmentGpuBuffer(
      device,
      candidates,
      selectedAugmentGpuStorage,
    );
    const paramsBuffer = createSelectedAugmentGpuBuffer(
      device,
      createSelectedAugmentGpuParams(candidateCount, slotWidth, slotHeight),
      selectedAugmentGpuUniform,
    );
    const scoreBuffer = device.createBuffer({
      size: candidateCount * Float32Array.BYTES_PER_ELEMENT,
      usage: selectedAugmentGpuStorage | selectedAugmentGpuCopySrc,
    });
    const readBuffer = device.createBuffer({
      size: candidateCount * Float32Array.BYTES_PER_ELEMENT,
      usage: selectedAugmentGpuMapRead | selectedAugmentGpuCopyDst,
    });

    const dispose = () => {
      templateBuffer.destroy?.();
      candidateBuffer.destroy?.();
      paramsBuffer.destroy?.();
      scoreBuffer.destroy?.();
      readBuffer.destroy?.();
    };

    return {
      async match(
        slot: ColorRaster,
        ignoredTemplatePaths?: ReadonlySet<string>,
      ): Promise<TemplateMatch[] | undefined> {
        if (selectedAugmentGpuUnavailable) return undefined;
        if (slot.width !== slotWidth || slot.height !== slotHeight) return undefined;

        const slotBuffer = createSelectedAugmentGpuBuffer(
          device,
          slot.values,
          selectedAugmentGpuStorage,
        );
        try {
          const bindGroup = device.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: [
              { binding: 0, resource: { buffer: slotBuffer } },
              { binding: 1, resource: { buffer: templateBuffer } },
              { binding: 2, resource: { buffer: candidateBuffer } },
              { binding: 3, resource: { buffer: scoreBuffer } },
              { binding: 4, resource: { buffer: paramsBuffer } },
            ],
          });
          const encoder = device.createCommandEncoder();
          const pass = encoder.beginComputePass();
          pass.setPipeline(pipeline);
          pass.setBindGroup(0, bindGroup);
          pass.dispatchWorkgroups(Math.ceil(candidateCount / selectedAugmentGpuWorkgroupSize));
          pass.end();
          encoder.copyBufferToBuffer(
            scoreBuffer,
            0,
            readBuffer,
            0,
            candidateCount * Float32Array.BYTES_PER_ELEMENT,
          );
          device.queue.submit([encoder.finish()]);

          await readBuffer.mapAsync(selectedAugmentGpuMapRead);
          try {
            const mapped = readBuffer.getMappedRange();
            const scores = new Float32Array(mapped.slice(0));
            return reduceSelectedAugmentGpuScores(
              slot,
              variants,
              variantKeys,
              candidates,
              scores,
              ignoredTemplatePaths,
            );
          } finally {
            readBuffer.unmap();
          }
        } catch {
          selectedAugmentGpuUnavailable = true;
          return undefined;
        } finally {
          slotBuffer.destroy?.();
        }
      },
      dispose,
    };
  } catch {
    selectedAugmentGpuUnavailable = true;
    return undefined;
  }
}

function isAmbiguousTemplateMatch(
  best: TemplateMatch | undefined,
  second: TemplateMatch | undefined,
): boolean {
  if (!best || !second || best.score >= selectedAugmentStrongScore) return false;
  return (
    second.score >= selectedAugmentAmbiguousSecondScore &&
    best.score - second.score < selectedAugmentAmbiguousMaxMargin
  );
}

function scaleSlotRoi(
  roi: readonly [number, number, number, number],
  image: HTMLImageElement,
): [number, number, number, number] {
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  const scaleX = width / goldenSpatulaLogicalScreenSize.width;
  const scaleY = height / goldenSpatulaLogicalScreenSize.height;
  return [
    Math.round(roi[0] * scaleX),
    Math.round(roi[1] * scaleY),
    Math.round(roi[2] * scaleX),
    Math.round(roi[3] * scaleY),
  ];
}

function scaleLogicalPointToImage(
  point: readonly [number, number],
  image: HTMLImageElement,
): readonly [number, number] {
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  const scaleX = width / goldenSpatulaLogicalScreenSize.width;
  const scaleY = height / goldenSpatulaLogicalScreenSize.height;
  return [Math.round(point[0] * scaleX), Math.round(point[1] * scaleY)] as const;
}

function getSlotLogicalCenter(slot: GoldenSpatulaAugmentIconVisionSlot): readonly [number, number] {
  return [
    Math.round(slot.roi[0] + slot.roi[2] / 2),
    Math.round(slot.roi[1] + slot.roi[3] / 2),
  ] as const;
}

function getSelectedAugmentProbeClickTarget(
  slot: GoldenSpatulaSelectedAugmentProbeSlot,
  match?: GoldenSpatulaSelectedAugmentVisionSlotResult,
): readonly [number, number] {
  if (slot.source === 'detailPanel') {
    return [
      goldenSpatulaSelectedAugmentOwnedPanelRowClickX,
      goldenSpatulaSelectedAugmentOwnedPanelFirstRowClickY +
        (slot.selectedSlotIndex - 1) * goldenSpatulaSelectedAugmentOwnedPanelRowHeight,
    ] as const;
  }

  return match?.matchCenter ?? getSlotLogicalCenter(slot);
}

function getTemplateMatchLogicalCenter(
  slot: GoldenSpatulaAugmentIconVisionSlot,
  match: TemplateMatch,
  slotWidth: number,
  slotHeight: number,
): readonly [number, number] {
  const matchCenterX = match.x + match.variant.width / 2;
  const matchCenterY = match.y + match.variant.height / 2;
  return [
    Math.round(slot.roi[0] + (matchCenterX / slotWidth) * slot.roi[2]),
    Math.round(slot.roi[1] + (matchCenterY / slotHeight) * slot.roi[3]),
  ] as const;
}

function getSelectedAugmentProbeSourcePriority(
  source: GoldenSpatulaSelectedAugmentProbeSource,
): number {
  switch (source) {
    case 'spectator':
      return 0;
    case 'board':
      return 1;
    case 'leftList':
      return 2;
    case 'detailPanel':
      return 3;
    case 'hud':
      return 4;
  }
}

function clampSelectedAugmentSlotCount(maxSlots: number | undefined): number {
  const raw = Math.trunc(maxSlots ?? selectedAugmentDefaultMaxSlots);
  return Math.max(
    1,
    Math.min(
      selectedAugmentDefaultMaxSlots,
      Number.isFinite(raw) ? raw : selectedAugmentDefaultMaxSlots,
    ),
  );
}

function buildSelectedAugmentProbeSlots(
  maxSlots: number | undefined,
  allowedSources?: readonly GoldenSpatulaSelectedAugmentProbeSource[],
): GoldenSpatulaSelectedAugmentProbeSlot[] {
  const slotCount = clampSelectedAugmentSlotCount(maxSlots);
  const sourceSet = allowedSources ? new Set(allowedSources) : undefined;
  return [
    ...goldenSpatulaSelectedAugmentSpectatorProbeSlots,
    ...goldenSpatulaSelectedAugmentBoardProbeSlots.filter(
      (slot) => slot.selectedSlotIndex <= slotCount,
    ),
    ...goldenSpatulaSelectedAugmentHudProbeSlots.filter(
      (slot) => slot.selectedSlotIndex <= slotCount,
    ),
    ...goldenSpatulaSelectedAugmentLeftListProbeSlots.filter(
      (slot) => slot.selectedSlotIndex <= slotCount,
    ),
  ].filter((slot) => !sourceSet || sourceSet.has(slot.source));
}

function buildSelectedAugmentProbeTarget(
  slot: GoldenSpatulaSelectedAugmentProbeSlot,
  image: HTMLImageElement,
  match?: GoldenSpatulaSelectedAugmentVisionSlotResult,
): GoldenSpatulaSelectedAugmentProbeTarget {
  const logicalTarget = getSelectedAugmentProbeClickTarget(slot, match);
  return {
    slotIndex: slot.selectedSlotIndex,
    slotLabel: slot.selectedSlotLabel,
    source: slot.source,
    roi: slot.roi,
    logicalTarget,
    screenTarget: scaleLogicalPointToImage(logicalTarget, image),
    confidence: match?.confidence ?? 'unknown',
    score: match?.score,
    augmentName: match?.augmentName,
    templatePath: match?.templatePath,
  };
}

function rankSelectedAugmentProbeTargets(
  targets: GoldenSpatulaSelectedAugmentProbeTarget[],
): GoldenSpatulaSelectedAugmentProbeTarget[] {
  const seen = new Set<string>();
  return targets
    .sort((left, right) => {
      const sourceDelta =
        getSelectedAugmentProbeSourcePriority(left.source) -
        getSelectedAugmentProbeSourcePriority(right.source);
      if (sourceDelta !== 0) return sourceDelta;
      return (right.score ?? 0) - (left.score ?? 0);
    })
    .filter((target) => {
      const key = `${target.slotIndex}:${target.source}:${target.logicalTarget.join(',')}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export async function scaleGoldenSpatulaSelectedAugmentTargetFromDataUrl(
  dataUrl: string,
  logicalTarget: readonly [number, number],
): Promise<readonly [number, number]> {
  const loadedScreenshot = await loadSelectedAugmentScreenshotImage(dataUrl);
  return scaleLogicalPointToImage(logicalTarget, loadedScreenshot.image);
}

function getVisionSlotCacheKey(
  slot: GoldenSpatulaAugmentIconVisionSlot,
  slotWidth: number,
  slotHeight: number,
): string {
  return `${slotWidth}x${slotHeight}:${slot.index}:${slot.roi.join(',')}`;
}

function getTemplateVariantGroupId(variants: TemplateVariant[]): number {
  const cached = selectedAugmentTemplateVariantGroupIds.get(variants);
  if (cached) return cached;

  const id = selectedAugmentNextTemplateVariantGroupId;
  selectedAugmentNextTemplateVariantGroupId += 1;
  selectedAugmentTemplateVariantGroupIds.set(variants, id);
  return id;
}

function getTemplateVariantsByPath(
  variants: TemplateVariant[],
  templatePath: string,
): TemplateVariant[] {
  let byPath = selectedAugmentTemplateVariantsByPathCache.get(variants);
  if (!byPath) {
    byPath = new Map();
    for (const variant of variants) {
      const group = byPath.get(variant.templatePath);
      if (group) {
        group.push(variant);
      } else {
        byPath.set(variant.templatePath, [variant]);
      }
    }
    selectedAugmentTemplateVariantsByPathCache.set(variants, byPath);
  }
  return byPath.get(templatePath) ?? [];
}

function getAssetIndexCacheId(augmentAssets: GoldenSpatulaAugmentAssetIndex | undefined): number {
  if (!augmentAssets) return 0;
  const cached = selectedAugmentAssetIndexIds.get(augmentAssets);
  if (cached) return cached;

  const id = selectedAugmentNextAssetIndexId;
  selectedAugmentNextAssetIndexId += 1;
  selectedAugmentAssetIndexIds.set(augmentAssets, id);
  return id;
}

function getSlotRasterSignature(raster: ColorRaster): string {
  let hash = 2166136261;
  let samples = 0;

  for (let y = 0; y < raster.height; y += selectedAugmentSlotSignatureSampleStep) {
    for (let x = 0; x < raster.width; x += selectedAugmentSlotSignatureSampleStep) {
      const offset = (y * raster.width + x) * 3;
      const red = Math.max(0, Math.min(15, Math.round((raster.values[offset] ?? 0) * 15)));
      const green = Math.max(0, Math.min(15, Math.round((raster.values[offset + 1] ?? 0) * 15)));
      const blue = Math.max(0, Math.min(15, Math.round((raster.values[offset + 2] ?? 0) * 15)));
      hash ^= (red << 8) | (green << 4) | blue;
      hash = Math.imul(hash, 16777619);
      samples += 1;
    }
  }

  return `${raster.width}x${raster.height}:${samples}:${(hash >>> 0).toString(36)}`;
}

function scanAugmentIconSlotPresence(
  screenshot: HTMLImageElement,
  slotsToScan: ReadonlyArray<GoldenSpatulaAugmentIconVisionSlot>,
  slotWidth: number,
  slotHeight: number,
): PreScannedAugmentIconSlots {
  const scratch = createColorRasterScratch();
  const slots = slotsToScan.map((slot): PreScannedAugmentIconSlot => {
    const sourceRect = scaleSlotRoi(slot.roi, screenshot);
    const raster = extractColorRaster(screenshot, slotWidth, slotHeight, sourceRect, scratch);
    const visible = hasSelectedAugmentIconPresence(raster);
    return {
      slot,
      raster,
      visible,
      signature: visible ? getSlotRasterSignature(raster) : 'empty',
    };
  });

  return {
    slots,
    visible: slots.some((slot) => slot.visible),
    signature: slots
      .map((slot) => `${slot.slot.index}:${slot.visible ? slot.signature : 'empty'}`)
      .join('|'),
  };
}

function getPreScannedSlotMap(
  preScanned: PreScannedAugmentIconSlots | undefined,
): ReadonlyMap<number, PreScannedAugmentIconSlot> | undefined {
  if (!preScanned) return undefined;
  return new Map(preScanned.slots.map((slot) => [slot.slot.index, slot]));
}

function countVisiblePreScannedSlots(preScanned: PreScannedAugmentIconSlots): number {
  return preScanned.slots.reduce((count, slot) => count + (slot.visible ? 1 : 0), 0);
}

function scanBestAugmentIconSlotPresence(
  screenshot: HTMLImageElement,
  slotLayouts: ReadonlyArray<ReadonlyArray<GoldenSpatulaAugmentIconVisionSlot>>,
  slotWidth: number,
  slotHeight: number,
):
  | {
      slots: ReadonlyArray<GoldenSpatulaAugmentIconVisionSlot>;
      scan: PreScannedAugmentIconSlots;
    }
  | undefined {
  let best:
    | {
        slots: ReadonlyArray<GoldenSpatulaAugmentIconVisionSlot>;
        scan: PreScannedAugmentIconSlots;
        visibleCount: number;
      }
    | undefined;

  for (const slots of slotLayouts) {
    const scan = scanAugmentIconSlotPresence(screenshot, slots, slotWidth, slotHeight);
    const visibleCount = countVisiblePreScannedSlots(scan);
    if (!best || visibleCount > best.visibleCount) {
      best = { slots, scan, visibleCount };
    }
  }

  return best && best.visibleCount > 0 ? { slots: best.slots, scan: best.scan } : undefined;
}

function getSlotResultCacheKey(
  variantGroupId: number,
  slotCacheKey: string,
  minScore: number,
  slotSignature: string,
): string {
  return [variantGroupId, slotCacheKey, Math.round(minScore * 1000), slotSignature].join('\u0000');
}

function getVisibleResultCacheKey(
  augmentAssets: GoldenSpatulaAugmentAssetIndex | undefined,
  basePath: string,
  slotsToScan: ReadonlyArray<GoldenSpatulaAugmentIconVisionSlot>,
  slotWidth: number,
  slotHeight: number,
  minScore: number,
  templateHeights: readonly number[],
  presenceSignature: string,
): string {
  return [
    getAssetIndexCacheId(augmentAssets),
    basePath,
    `${slotWidth}x${slotHeight}`,
    Math.round(minScore * 1000),
    templateHeights.join(','),
    slotsToScan.map((slot) => `${slot.index}:${slot.roi.join(',')}`).join('|'),
    presenceSignature,
  ].join('\u0000');
}

function getImageResultCacheKey(
  dataUrl: string,
  augmentAssets: GoldenSpatulaAugmentAssetIndex | undefined,
  basePath: string,
  slotsToScan: ReadonlyArray<GoldenSpatulaAugmentIconVisionSlot>,
  slotWidth: number,
  slotHeight: number,
  minScore: number,
  templateHeights: readonly number[],
): string {
  return [
    getDataUrlFingerprint(dataUrl),
    getAssetIndexCacheId(augmentAssets),
    basePath,
    `${slotWidth}x${slotHeight}`,
    Math.round(minScore * 1000),
    templateHeights.join(','),
    slotsToScan.map((slot) => `${slot.index}:${slot.roi.join(',')}`).join('|'),
  ].join('\u0000');
}

function cloneSelectedAugmentSlotResult(
  result: GoldenSpatulaSelectedAugmentVisionSlotResult,
): GoldenSpatulaSelectedAugmentVisionSlotResult {
  return { ...result };
}

function cloneSelectedAugmentVisionResult(
  result: GoldenSpatulaSelectedAugmentVisionResult,
  scannedAt: number,
): GoldenSpatulaSelectedAugmentVisionResult {
  return {
    scannedAt,
    slots: result.slots.map(cloneSelectedAugmentSlotResult),
    detailDiagnostics: result.detailDiagnostics
      ? {
          ...result.detailDiagnostics,
          detailCardSides: [...result.detailDiagnostics.detailCardSides],
          detailCardPresence: result.detailDiagnostics.detailCardPresence.map((presence) => ({
            ...presence,
          })),
          titleAllowedSides: [...result.detailDiagnostics.titleAllowedSides],
          iconMatch: result.detailDiagnostics.iconMatch
            ? {
                ...result.detailDiagnostics.iconMatch,
                center: result.detailDiagnostics.iconMatch.center
                  ? [
                      result.detailDiagnostics.iconMatch.center[0],
                      result.detailDiagnostics.iconMatch.center[1],
                    ]
                  : undefined,
              }
            : undefined,
          titleMatch: result.detailDiagnostics.titleMatch
            ? {
                ...result.detailDiagnostics.titleMatch,
                center: [
                  result.detailDiagnostics.titleMatch.center[0],
                  result.detailDiagnostics.titleMatch.center[1],
                ] as const,
              }
            : undefined,
        }
      : undefined,
  };
}

function getCachedVisibleResult(
  cacheKey: string,
  scannedAt: number,
): GoldenSpatulaSelectedAugmentVisionResult | undefined {
  const cached = selectedAugmentVisibleResultCache.get(cacheKey);
  return cached ? cloneSelectedAugmentVisionResult(cached, scannedAt) : undefined;
}

function getCachedImageResult(
  cacheKey: string,
  dataUrl: string,
  scannedAt: number,
): GoldenSpatulaSelectedAugmentVisionResult | undefined {
  const cached = selectedAugmentImageResultCache.get(cacheKey);
  if (!cached || cached.dataUrl !== dataUrl) return undefined;
  return cloneSelectedAugmentVisionResult(cached.result, scannedAt);
}

function rememberVisibleResult(
  cacheKey: string,
  result: GoldenSpatulaSelectedAugmentVisionResult,
): void {
  if (!selectedAugmentVisibleResultCache.has(cacheKey)) {
    const oldestKey = selectedAugmentVisibleResultCache.keys().next().value;
    if (
      oldestKey &&
      selectedAugmentVisibleResultCache.size >= selectedAugmentVisibleResultCacheLimit
    ) {
      selectedAugmentVisibleResultCache.delete(oldestKey);
    }
  }
  selectedAugmentVisibleResultCache.set(
    cacheKey,
    cloneSelectedAugmentVisionResult(result, result.scannedAt),
  );
}

function rememberImageResult(
  cacheKey: string,
  dataUrl: string,
  result: GoldenSpatulaSelectedAugmentVisionResult,
): void {
  if (!selectedAugmentImageResultCache.has(cacheKey)) {
    const oldestKey = selectedAugmentImageResultCache.keys().next().value;
    if (oldestKey && selectedAugmentImageResultCache.size >= selectedAugmentImageResultCacheLimit) {
      selectedAugmentImageResultCache.delete(oldestKey);
    }
  }
  selectedAugmentImageResultCache.set(cacheKey, {
    dataUrl,
    result: cloneSelectedAugmentVisionResult(result, result.scannedAt),
  });
}

function getCachedSlotResult(
  cacheKey: string,
  minScore: number,
  usedTemplatePaths: Set<string>,
): GoldenSpatulaSelectedAugmentVisionSlotResult | undefined {
  const cached = selectedAugmentSlotResultCache.get(cacheKey);
  if (!cached) return undefined;

  if (cached.confidence === 'matched') {
    if (!cached.templatePath || usedTemplatePaths.has(cached.templatePath)) return undefined;
    if ((cached.score ?? 0) < Math.max(minScore, selectedAugmentCachedMatchMinScore))
      return undefined;
    usedTemplatePaths.add(cached.templatePath);
  }

  return cloneSelectedAugmentSlotResult(cached);
}

function rememberSlotResult(
  cacheKey: string,
  result: GoldenSpatulaSelectedAugmentVisionSlotResult,
): void {
  if (!selectedAugmentSlotResultCache.has(cacheKey)) {
    const oldestKey = selectedAugmentSlotResultCache.keys().next().value;
    if (oldestKey && selectedAugmentSlotResultCache.size >= selectedAugmentSlotResultCacheLimit) {
      selectedAugmentSlotResultCache.delete(oldestKey);
    }
  }
  selectedAugmentSlotResultCache.set(cacheKey, cloneSelectedAugmentSlotResult(result));
}

function getDataUrlFingerprint(dataUrl: string): string {
  const middle = Math.max(0, Math.floor(dataUrl.length / 2) - 96);
  return [
    dataUrl.length,
    dataUrl.slice(0, 96),
    dataUrl.slice(middle, middle + 192),
    dataUrl.slice(-192),
  ].join(':');
}

async function loadSelectedAugmentScreenshotImage(
  dataUrl: string,
): Promise<{ image: HTMLImageElement; loadMs: number }> {
  const cacheKey = getDataUrlFingerprint(dataUrl);
  const cached = selectedAugmentScreenshotImageCache.get(cacheKey);
  if (cached?.dataUrl === dataUrl) {
    if (cached.image) {
      return {
        image: cached.image,
        loadMs: 0,
      };
    }

    const waitStartedAt = nowMs();
    return {
      image: await cached.promise,
      loadMs: nowMs() - waitStartedAt,
    };
  }

  const image = new Image();
  image.decoding = 'async';
  image.crossOrigin = 'anonymous';
  const loadStartedAt = nowMs();
  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to load selected augment screenshot'));
  }).catch((error) => {
    const current = selectedAugmentScreenshotImageCache.get(cacheKey);
    if (current?.dataUrl === dataUrl) selectedAugmentScreenshotImageCache.delete(cacheKey);
    throw error;
  });

  if (!selectedAugmentScreenshotImageCache.has(cacheKey)) {
    const oldestKey = selectedAugmentScreenshotImageCache.keys().next().value;
    if (
      oldestKey &&
      selectedAugmentScreenshotImageCache.size >= selectedAugmentScreenshotImageCacheLimit
    ) {
      selectedAugmentScreenshotImageCache.delete(oldestKey);
    }
  }

  const entry: SelectedAugmentScreenshotImageCacheEntry = {
    dataUrl,
    promise,
  };
  selectedAugmentScreenshotImageCache.set(cacheKey, entry);
  image.src = dataUrl;
  await promise;
  entry.image = image;

  return {
    image,
    loadMs: nowMs() - loadStartedAt,
  };
}

function getNoPresenceResultCacheKey(
  dataUrl: string,
  slotsToScan: ReadonlyArray<GoldenSpatulaAugmentIconVisionSlot>,
  slotWidth: number,
  slotHeight: number,
): string {
  return [
    getDataUrlFingerprint(dataUrl),
    `${slotWidth}x${slotHeight}`,
    slotsToScan.map((slot) => `${slot.index}:${slot.roi.join(',')}`).join('|'),
  ].join('\u0000');
}

function getCachedNoPresenceResult(
  cacheKey: string,
  dataUrl: string,
  scannedAt: number,
): GoldenSpatulaSelectedAugmentVisionResult | undefined {
  const cached = selectedAugmentNoPresenceResultCache.get(cacheKey);
  if (!cached || cached.dataUrl !== dataUrl) return undefined;
  return {
    scannedAt,
    slots: cached.result.slots,
  };
}

function rememberNoPresenceResult(
  cacheKey: string,
  dataUrl: string,
  result: GoldenSpatulaSelectedAugmentVisionResult,
): void {
  if (!selectedAugmentNoPresenceResultCache.has(cacheKey)) {
    const oldestKey = selectedAugmentNoPresenceResultCache.keys().next().value;
    if (
      oldestKey &&
      selectedAugmentNoPresenceResultCache.size >= selectedAugmentNoPresenceCacheLimit
    ) {
      selectedAugmentNoPresenceResultCache.delete(oldestKey);
    }
  }
  selectedAugmentNoPresenceResultCache.set(cacheKey, { dataUrl, result });
}

async function scanAugmentIconSlots(
  screenshot: HTMLImageElement,
  variants: TemplateVariant[],
  minScore: number,
  slotsToScan: ReadonlyArray<GoldenSpatulaAugmentIconVisionSlot>,
  slotWidth: number,
  slotHeight: number,
  requirePresence: boolean,
  preScannedSlots?: ReadonlyMap<number, PreScannedAugmentIconSlot>,
): Promise<AugmentIconSlotScanResult> {
  const usedTemplatePaths = new Set<string>();
  const scratch = createColorRasterScratch();
  const variantGroupId = getTemplateVariantGroupId(variants);
  let cacheHits = 0;
  let gpuMatcher: SelectedAugmentGpuMatcher | undefined;
  const slots: GoldenSpatulaSelectedAugmentVisionSlotResult[] = [];

  for (const slot of slotsToScan) {
    const slotCacheKey = getVisionSlotCacheKey(slot, slotWidth, slotHeight);
    const preScannedSlot = preScannedSlots?.get(slot.index);
    const presenceRaster =
      preScannedSlot?.raster ??
      extractColorRaster(
        screenshot,
        slotWidth,
        slotHeight,
        scaleSlotRoi(slot.roi, screenshot),
        scratch,
      );

    const hasPresence = preScannedSlot?.visible ?? hasSelectedAugmentIconPresence(presenceRaster);
    if (requirePresence && !hasPresence) {
      slots.push({
        slotIndex: slot.index,
        slotLabel: slot.label,
        confidence: 'empty' as const,
      });
      await yieldToBrowser();
      continue;
    }

    const slotSignature = preScannedSlot?.signature ?? getSlotRasterSignature(presenceRaster);
    const slotResultCacheKey = getSlotResultCacheKey(
      variantGroupId,
      slotCacheKey,
      minScore,
      slotSignature,
    );
    const cachedSlotResult = getCachedSlotResult(slotResultCacheKey, minScore, usedTemplatePaths);
    if (cachedSlotResult) {
      cacheHits += 1;
      slots.push(cachedSlotResult);
      await yieldToBrowser();
      continue;
    }

    const cachedTemplatePath = selectedAugmentLastMatchCache.get(slotCacheKey);
    if (cachedTemplatePath && !usedTemplatePaths.has(cachedTemplatePath)) {
      const cachedVariants = getTemplateVariantsByPath(variants, cachedTemplatePath);
      const cachedMatches = findTemplateMatches(presenceRaster, cachedVariants, 1);
      const cachedBest = cachedMatches[0];
      if (
        cachedBest &&
        cachedBest.score >= Math.max(minScore, selectedAugmentCachedMatchMinScore)
      ) {
        usedTemplatePaths.add(cachedBest.variant.templatePath);
        const result = {
          slotIndex: slot.index,
          slotLabel: slot.label,
          augmentName: cachedBest.variant.asset.name,
          templatePath: cachedBest.variant.templatePath,
          confidence: 'matched' as const,
          score: cachedBest.score,
          matchCenter: getTemplateMatchLogicalCenter(slot, cachedBest, slotWidth, slotHeight),
          matchKind: 'icon' as const,
          matchSourceLabel: slot.label,
        };
        rememberSlotResult(slotResultCacheKey, result);
        slots.push(result);
        await yieldToBrowser();
        continue;
      }
    }

    gpuMatcher ??= await createSelectedAugmentGpuMatcher(
      variants,
      slotWidth,
      slotHeight,
      selectedAugmentMatchStep,
    );
    const gpuMatches = await gpuMatcher?.match(presenceRaster, usedTemplatePaths);
    const matches =
      gpuMatches ??
      findTemplateMatches(
        presenceRaster,
        variants,
        selectedAugmentPreciseCandidateLimit,
        usedTemplatePaths,
      );
    const best = matches[0];
    const second = matches[1];
    if (best && best.score >= minScore && !isAmbiguousTemplateMatch(best, second)) {
      usedTemplatePaths.add(best.variant.templatePath);
      selectedAugmentLastMatchCache.set(slotCacheKey, best.variant.templatePath);
      const result = {
        slotIndex: slot.index,
        slotLabel: slot.label,
        augmentName: best.variant.asset.name,
        templatePath: best.variant.templatePath,
        confidence: 'matched' as const,
        score: best.score,
        matchCenter: getTemplateMatchLogicalCenter(slot, best, slotWidth, slotHeight),
        matchKind: 'icon' as const,
        matchSourceLabel: slot.label,
      };
      rememberSlotResult(slotResultCacheKey, result);
      slots.push(result);
      await yieldToBrowser();
      continue;
    }

    const result = {
      slotIndex: slot.index,
      slotLabel: slot.label,
      confidence: 'empty' as const,
      score: best?.score,
    };
    rememberSlotResult(slotResultCacheKey, result);
    slots.push(result);
    await yieldToBrowser();
  }

  gpuMatcher?.dispose();
  return { slots, cacheHits };
}

function buildEmptyAugmentIconSlotResults(
  slotsToScan: ReadonlyArray<GoldenSpatulaAugmentIconVisionSlot>,
): GoldenSpatulaSelectedAugmentVisionSlotResult[] {
  return slotsToScan.map((slot) => ({
    slotIndex: slot.index,
    slotLabel: slot.label,
    confidence: 'empty' as const,
  }));
}

export async function recognizeGoldenSpatulaAugmentIconsFromDataUrl(
  dataUrl: string,
  options: GoldenSpatulaAugmentIconVisionOptions,
): Promise<GoldenSpatulaSelectedAugmentVisionResult> {
  const startedAt = nowMs();
  const scannedAt = Date.now();
  if (!dataUrl.startsWith('data:image/')) {
    return {
      scannedAt,
      slots: [],
      metrics: buildSelectedAugmentVisionMetrics(startedAt, options.slots.length),
    };
  }

  if (options.slots.length === 0) {
    return {
      scannedAt,
      slots: [],
      metrics: buildSelectedAugmentVisionMetrics(startedAt, 0),
    };
  }

  const requirePresence = options.requirePresence ?? true;
  const minScore = options.minScore ?? selectedAugmentDefaultMinScore;
  const templateHeights = options.templateHeights ?? selectedAugmentTemplateHeights;
  const imageResultCacheKey = getImageResultCacheKey(
    dataUrl,
    options.augmentAssets,
    options.basePath,
    options.slots,
    options.slotWidth,
    options.slotHeight,
    minScore,
    templateHeights,
  );
  const cachedImageResult = getCachedImageResult(imageResultCacheKey, dataUrl, scannedAt);
  if (cachedImageResult) {
    return {
      ...cachedImageResult,
      metrics: buildSelectedAugmentVisionMetrics(startedAt, options.slots.length, {
        resultCacheHit: true,
        slotCacheHits: cachedImageResult.slots.length,
      }),
    };
  }

  const noPresenceCacheKey = requirePresence
    ? getNoPresenceResultCacheKey(dataUrl, options.slots, options.slotWidth, options.slotHeight)
    : undefined;
  const cachedNoPresence = noPresenceCacheKey
    ? getCachedNoPresenceResult(noPresenceCacheKey, dataUrl, scannedAt)
    : undefined;
  if (cachedNoPresence) {
    return {
      ...cachedNoPresence,
      metrics: buildSelectedAugmentVisionMetrics(startedAt, options.slots.length),
    };
  }

  const loadedScreenshot = await loadSelectedAugmentScreenshotImage(dataUrl);
  const screenshot = loadedScreenshot.image;
  const screenshotLoadMs = loadedScreenshot.loadMs;
  const presenceStartedAt = nowMs();
  const presenceScan = scanAugmentIconSlotPresence(
    screenshot,
    options.slots,
    options.slotWidth,
    options.slotHeight,
  );
  const hasPresence = !requirePresence || presenceScan.visible;
  const presenceMs = nowMs() - presenceStartedAt;
  if (requirePresence && !hasPresence) {
    const result = {
      scannedAt,
      slots: buildEmptyAugmentIconSlotResults(options.slots),
      metrics: buildSelectedAugmentVisionMetrics(startedAt, options.slots.length, {
        screenshotLoadMs,
        presenceMs,
      }),
    };
    if (noPresenceCacheKey) rememberNoPresenceResult(noPresenceCacheKey, dataUrl, result);
    rememberImageResult(imageResultCacheKey, dataUrl, result);
    return result;
  }

  if (collectCandidateAssets(options.augmentAssets).length === 0) {
    const result = {
      scannedAt,
      slots: buildEmptyAugmentIconSlotResults(options.slots),
      metrics: buildSelectedAugmentVisionMetrics(startedAt, options.slots.length, {
        screenshotLoadMs,
        presenceMs,
      }),
    };
    rememberImageResult(imageResultCacheKey, dataUrl, result);
    return result;
  }

  const visibleResultCacheKey = getVisibleResultCacheKey(
    options.augmentAssets,
    options.basePath,
    options.slots,
    options.slotWidth,
    options.slotHeight,
    minScore,
    templateHeights,
    presenceScan.signature,
  );
  const cachedVisibleResult = getCachedVisibleResult(visibleResultCacheKey, scannedAt);
  if (cachedVisibleResult) {
    return {
      ...cachedVisibleResult,
      metrics: buildSelectedAugmentVisionMetrics(startedAt, options.slots.length, {
        screenshotLoadMs,
        presenceMs,
        resultCacheHit: true,
        slotCacheHits: cachedVisibleResult.slots.length,
      }),
    };
  }

  const templateLoadStartedAt = nowMs();
  const variants = await loadTemplateVariantGroup(
    options.augmentAssets,
    options.basePath,
    templateHeights,
    options.slotWidth,
    options.slotHeight,
  );
  const templateLoadMs = nowMs() - templateLoadStartedAt;
  if (variants.length === 0) {
    return {
      scannedAt,
      slots: [],
      metrics: buildSelectedAugmentVisionMetrics(startedAt, options.slots.length, {
        screenshotLoadMs,
        presenceMs,
        templateLoadMs,
      }),
    };
  }

  const matchStartedAt = nowMs();
  const scanResult = await scanAugmentIconSlots(
    screenshot,
    variants,
    minScore,
    options.slots,
    options.slotWidth,
    options.slotHeight,
    requirePresence,
    getPreScannedSlotMap(presenceScan),
  );
  const slots = scanResult.slots;
  const matchMs = nowMs() - matchStartedAt;

  const result = {
    scannedAt,
    slots,
    metrics: buildSelectedAugmentVisionMetrics(startedAt, options.slots.length, {
      screenshotLoadMs,
      presenceMs,
      templateLoadMs,
      matchMs,
      templateCount: variants.length,
      slotCacheHits: scanResult.cacheHits,
    }),
  };
  rememberVisibleResult(visibleResultCacheKey, result);
  rememberImageResult(imageResultCacheKey, dataUrl, result);
  return result;
}

export async function findGoldenSpatulaSelectedAugmentProbeTargetsFromDataUrl(
  dataUrl: string,
  options: GoldenSpatulaSelectedAugmentProbeOptions,
): Promise<GoldenSpatulaSelectedAugmentProbeTargetsResult> {
  const scannedAt = Date.now();
  if (!dataUrl.startsWith('data:image/')) {
    return { scannedAt, targets: [] };
  }

  const probeSlots = buildSelectedAugmentProbeSlots(options.maxSlots, options.allowedSources);
  if (probeSlots.length === 0) return { scannedAt, targets: [] };

  const loadedScreenshot = await loadSelectedAugmentScreenshotImage(dataUrl);
  const screenshot = loadedScreenshot.image;
  const matchResult = await recognizeGoldenSpatulaAugmentIconsFromDataUrl(dataUrl, {
    augmentAssets: options.augmentAssets,
    basePath: options.basePath,
    slots: probeSlots,
    slotWidth: selectedAugmentSlotWidth,
    slotHeight: selectedAugmentSlotHeight,
    minScore: selectedAugmentProbeMinScore,
    templateHeights: selectedAugmentProbeTemplateHeights,
    requirePresence: false,
  });

  const slotByIndex = new Map(probeSlots.map((slot) => [slot.index, slot]));
  const matchedTargets = matchResult.slots
    .filter((slot) => slot.confidence === 'matched' && slot.augmentName)
    .map((slot) => {
      const probeSlot = slotByIndex.get(slot.slotIndex);
      return probeSlot ? buildSelectedAugmentProbeTarget(probeSlot, screenshot, slot) : undefined;
    })
    .filter((target): target is GoldenSpatulaSelectedAugmentProbeTarget => Boolean(target));

  let targets = rankSelectedAugmentProbeTargets(matchedTargets);

  if (targets.length === 0 && options.allowPresenceFallback !== false) {
    const presenceScan = scanAugmentIconSlotPresence(
      screenshot,
      probeSlots,
      selectedAugmentSlotWidth,
      selectedAugmentSlotHeight,
    );
    targets = rankSelectedAugmentProbeTargets(
      presenceScan.slots
        .filter((slot) => slot.visible)
        .map((slot) =>
          buildSelectedAugmentProbeTarget(
            slot.slot as GoldenSpatulaSelectedAugmentProbeSlot,
            screenshot,
          ),
        ),
    );
  }

  return {
    scannedAt,
    targets: targets.slice(0, Math.max(1, Math.trunc(options.maxTargets ?? 3))),
    metrics: matchResult.metrics,
  };
}

export async function findGoldenSpatulaSelectedAugmentDetailPanelTargetsFromDataUrl(
  dataUrl: string,
  options: GoldenSpatulaSelectedAugmentProbeOptions,
): Promise<GoldenSpatulaSelectedAugmentProbeTargetsResult> {
  const scannedAt = Date.now();
  if (!dataUrl.startsWith('data:image/')) return { scannedAt, targets: [] };

  const panelSlots = buildGoldenSpatulaSelectedAugmentOwnedPanelDetailSlots(options.maxSlots);
  if (panelSlots.length === 0) return { scannedAt, targets: [] };

  const loadedScreenshot = await loadSelectedAugmentScreenshotImage(dataUrl);
  const screenshot = loadedScreenshot.image;
  const ownedPanel = getSelectedAugmentOwnedPanelPresenceDiagnostics(screenshot);
  if (!ownedPanel.visible) {
    return { scannedAt, targets: [] };
  }
  const visibleRows = getSelectedAugmentOwnedPanelVisibleRows(screenshot, options.maxSlots);
  if (visibleRows.size === 0) {
    return { scannedAt, targets: [] };
  }

  const matchResult = await recognizeGoldenSpatulaAugmentIconsFromDataUrl(dataUrl, {
    augmentAssets: options.augmentAssets,
    basePath: options.basePath,
    slots: panelSlots,
    slotWidth: 96,
    slotHeight: 96,
    minScore: selectedAugmentOwnedPanelDetailMinScore,
    templateHeights: selectedAugmentOwnedPanelTemplateHeights,
    requirePresence: false,
  });
  const slotByIndex = new Map(panelSlots.map((slot) => [slot.index, slot]));
  const targetsByRow = new Map<number, GoldenSpatulaSelectedAugmentProbeTarget>();
  for (const slot of matchResult.slots) {
    if (slot.confidence !== 'matched' || !slot.augmentName) continue;
    const panelSlot = slotByIndex.get(slot.slotIndex);
    if (!panelSlot || !visibleRows.has(panelSlot.selectedSlotIndex)) continue;
    const target = buildSelectedAugmentProbeTarget(panelSlot, screenshot, slot);
    const previous = targetsByRow.get(target.slotIndex);
    if (!previous || (target.score ?? 0) > (previous.score ?? 0)) {
      targetsByRow.set(target.slotIndex, target);
    }
  }
  let targets = rankSelectedAugmentProbeTargets([...targetsByRow.values()]);
  if (targets.length === 0) {
    targets = rankSelectedAugmentProbeTargets(
      [...visibleRows].map((rowIndex): GoldenSpatulaSelectedAugmentProbeTarget => {
        const fallbackSlot: GoldenSpatulaSelectedAugmentProbeSlot = {
          index: 900 + rowIndex,
          label: `owned-panel-visible-${rowIndex}`,
          selectedSlotIndex: rowIndex,
          selectedSlotLabel: String(rowIndex),
          source: 'detailPanel',
          roi: [
            1018,
            72 + (rowIndex - 1) * goldenSpatulaSelectedAugmentOwnedPanelRowHeight,
            248,
            96,
          ],
        };
        return buildSelectedAugmentProbeTarget(fallbackSlot, screenshot);
      }),
    );
  }
  if (targets.length === 0 && options.allowPresenceFallback === true) {
    const presenceScan = scanAugmentIconSlotPresence(screenshot, panelSlots, 96, 96);
    const fallbackTargetsByRow = new Map<number, GoldenSpatulaSelectedAugmentProbeTarget>();
    for (const slot of presenceScan.slots) {
      const panelSlot = slot.slot as GoldenSpatulaSelectedAugmentProbeSlot;
      if (!slot.visible || !visibleRows.has(panelSlot.selectedSlotIndex)) continue;
      const target = buildSelectedAugmentProbeTarget(panelSlot, screenshot);
      if (!fallbackTargetsByRow.has(target.slotIndex)) {
        fallbackTargetsByRow.set(target.slotIndex, target);
      }
    }
    targets = rankSelectedAugmentProbeTargets([...fallbackTargetsByRow.values()]);
  }

  return {
    scannedAt,
    targets: targets.slice(0, Math.max(1, Math.trunc(options.maxTargets ?? 2))),
    metrics: matchResult.metrics,
  };
}

export async function recognizeGoldenSpatulaSelectedAugmentDetailFromDataUrl(
  dataUrl: string,
  options: GoldenSpatulaSelectedAugmentDetailVisionOptions,
): Promise<GoldenSpatulaSelectedAugmentVisionResult> {
  const scannedAt = Date.now();
  if (!dataUrl.startsWith('data:image/')) {
    return {
      scannedAt,
      slots: [],
      detailDiagnostics: createEmptySelectedAugmentDetailDiagnostics(),
    };
  }

  const slotIndex = Math.max(1, Math.trunc(options.slotIndex ?? 1));
  const slotLabel = options.slotLabel ?? String(slotIndex);
  const expectedNameSet = getSelectedAugmentExpectedNameSet(options.expectedAugmentNames);
  let loadedScreenshotImage: HTMLImageElement | undefined;
  let detailDiagnostics: GoldenSpatulaSelectedAugmentDetailDiagnostics | undefined;
  const getDetailDiagnostics = async (): Promise<{
    image: HTMLImageElement;
    diagnostics: GoldenSpatulaSelectedAugmentDetailDiagnostics;
  }> => {
    if (loadedScreenshotImage && detailDiagnostics) {
      return {
        image: loadedScreenshotImage,
        diagnostics: detailDiagnostics,
      };
    }

    const loadedScreenshot = await loadSelectedAugmentScreenshotImage(dataUrl);
    loadedScreenshotImage = loadedScreenshot.image;
    const ownedPanel = getSelectedAugmentOwnedPanelPresenceDiagnostics(loadedScreenshot.image);
    const detailCards = getSelectedAugmentLargeDetailCardPresenceDiagnostics(
      loadedScreenshot.image,
    );
    const allowedSides = ownedPanel.visible ? [...detailCards.sides] : [];
    detailDiagnostics = {
      ownedPanelVisible: ownedPanel.visible,
      ownedPanelBody: ownedPanel.body,
      ownedPanelHeader: ownedPanel.header,
      detailCardSides: [...detailCards.sides],
      detailCardPresence: detailCards.presence,
      titleAllowedSides: allowedSides,
    };
    return {
      image: loadedScreenshot.image,
      diagnostics: detailDiagnostics,
    };
  };
  const detailResult = await recognizeGoldenSpatulaAugmentIconsFromDataUrl(dataUrl, {
    augmentAssets: options.augmentAssets,
    basePath: options.basePath,
    slots: goldenSpatulaSelectedAugmentDetailCardSlots,
    slotWidth: 240,
    slotHeight: 240,
    minScore: selectedAugmentDetailMinScore,
    templateHeights: selectedAugmentDetailTemplateHeights,
    requirePresence: false,
  });
  const detailHit = detailResult.slots
    .filter((slot) => slot.confidence === 'matched' && slot.augmentName)
    .sort((left, right) => (right.score ?? 0) - (left.score ?? 0))[0];
  const { image, diagnostics } = await getDetailDiagnostics();
  const iconDiagnostic = buildSelectedAugmentDetailIconDiagnostic(detailHit, diagnostics);
  const diagnosticsWithIcon: GoldenSpatulaSelectedAugmentDetailDiagnostics = iconDiagnostic
    ? {
        ...diagnostics,
        iconMatch: iconDiagnostic,
      }
    : diagnostics;
  if (detailHit && isSelectedAugmentDetailCardSlotAllowed(detailHit, diagnostics)) {
    return {
      scannedAt,
      slots: [
        {
          ...detailHit,
          slotIndex,
          slotLabel,
          matchSourceLabel: detailHit.matchSourceLabel ?? detailHit.slotLabel,
        },
      ],
      metrics: detailResult.metrics,
      detailDiagnostics: diagnosticsWithIcon,
    };
  }

  const detailCardSides = new Set<GoldenSpatulaSelectedAugmentDetailSide>(
    diagnosticsWithIcon.titleAllowedSides,
  );
  let latestDiagnostics = diagnosticsWithIcon;
  if (detailCardSides.size > 0) {
    const titleHit = await recognizeSelectedAugmentDetailTitleFromImage(
      image,
      options.augmentAssets,
      detailCardSides,
    );
    if (titleHit) {
      const titleCenter = [
        Math.round(titleHit.slot.roi[0] + titleHit.slot.roi[2] / 2),
        Math.round(titleHit.slot.roi[1] + titleHit.slot.roi[3] / 2),
      ] as const;
      const diagnosticsWithTitleMatch: GoldenSpatulaSelectedAugmentDetailDiagnostics = {
        ...diagnosticsWithIcon,
        titleMatch: {
          slotLabel: titleHit.slot.label,
          side: titleHit.slot.side,
          augmentName: titleHit.template.asset.name,
          score: roundPresenceRatio(titleHit.score),
          margin: roundPresenceRatio(titleHit.margin),
          center: titleCenter,
        },
      };
      latestDiagnostics = diagnosticsWithTitleMatch;
      const titleMatchesExpected = doesDetailTitleMatchExpected(titleHit, expectedNameSet);
      const titleCanStandAlone =
        expectedNameSet.size === 0 && isUnhintedDetailTitleMatchStrong(titleHit);
      if (titleMatchesExpected || titleCanStandAlone) {
        return {
          scannedAt,
          slots: [
            {
              slotIndex,
              slotLabel,
              augmentName: titleHit.template.asset.name,
              templatePath: titleHit.template.templatePath,
              confidence: 'matched' as const,
              score: titleHit.score,
              matchCenter: titleCenter,
              matchKind: 'detailTitle' as const,
              matchSourceLabel: titleHit.slot.label,
              matchSide: titleHit.slot.side,
              matchMargin: titleHit.margin,
            },
          ],
          metrics: detailResult.metrics,
          detailDiagnostics: diagnosticsWithTitleMatch,
        };
      }
    }
  }

  if (
    options.fallbackAugmentName &&
    (options.fallbackScore ?? 0) >= selectedAugmentDetailExpectedFallbackMinScore &&
    latestDiagnostics.ownedPanelVisible &&
    latestDiagnostics.detailCardSides.length > 0
  ) {
    return {
      scannedAt,
      slots: [
        {
          slotIndex,
          slotLabel,
          augmentName: options.fallbackAugmentName,
          templatePath: options.fallbackTemplatePath,
          confidence: 'matched' as const,
          score: options.fallbackScore,
          matchKind: 'icon' as const,
          matchSourceLabel: 'clicked-probe-fallback',
        },
      ],
      metrics: detailResult.metrics,
      detailDiagnostics: latestDiagnostics,
    };
  }

  if (options.allowOwnedPanelFallback === false) {
    return {
      scannedAt,
      slots: [],
      metrics: detailResult.metrics,
      detailDiagnostics: latestDiagnostics,
    };
  }

  const ownedPanelResult = await recognizeGoldenSpatulaAugmentIconsFromDataUrl(dataUrl, {
    augmentAssets: options.augmentAssets,
    basePath: options.basePath,
    slots: buildGoldenSpatulaSelectedAugmentOwnedPanelDetailSlots(),
    slotWidth: 96,
    slotHeight: 96,
    minScore: selectedAugmentOwnedPanelDetailMinScore,
    templateHeights: selectedAugmentOwnedPanelTemplateHeights,
    requirePresence: false,
  });
  const ownedPanelHit = ownedPanelResult.slots
    .filter((slot) => slot.confidence === 'matched' && slot.augmentName)
    .sort((left, right) => (right.score ?? 0) - (left.score ?? 0))[0];
  if (!ownedPanelHit) {
    return {
      scannedAt,
      slots: [],
      metrics: ownedPanelResult.metrics ?? detailResult.metrics,
      detailDiagnostics: latestDiagnostics,
    };
  }

  return {
    scannedAt,
    slots: [
      {
        ...ownedPanelHit,
        slotIndex,
        slotLabel,
        matchSourceLabel: ownedPanelHit.matchSourceLabel ?? ownedPanelHit.slotLabel,
      },
    ],
    metrics: ownedPanelResult.metrics,
    detailDiagnostics: latestDiagnostics,
  };
}

export async function recognizeGoldenSpatulaSelectedAugmentsFromDataUrl(
  dataUrl: string,
  options: GoldenSpatulaSelectedAugmentVisionOptions,
): Promise<GoldenSpatulaSelectedAugmentVisionResult> {
  const startedAt = nowMs();
  const scannedAt = Date.now();
  const boardSlotLayouts = goldenSpatulaSelectedAugmentBoardSlotLayouts.map((slots) =>
    limitSelectedAugmentSlots(slots, options.maxSlots),
  );
  const boardSlots = boardSlotLayouts[0] ?? [];
  const hudSlotLayouts = goldenSpatulaSelectedAugmentHudSlotLayouts.map((slots) =>
    limitSelectedAugmentSlots(slots, options.maxSlots),
  );
  if (!dataUrl.startsWith('data:image/')) {
    return {
      scannedAt,
      slots: [],
      metrics: buildSelectedAugmentVisionMetrics(startedAt, boardSlots.length),
    };
  }

  const minScore = options.minScore ?? selectedAugmentDefaultMinScore;
  const templateHeights = options.fastMode
    ? selectedAugmentLowLatencyTemplateHeights
    : selectedAugmentTemplateHeights;
  const selectedAugmentAllSlots = [...boardSlotLayouts.flat(), ...hudSlotLayouts.flat()];
  const imageResultCacheKey = getImageResultCacheKey(
    dataUrl,
    options.augmentAssets,
    options.basePath,
    selectedAugmentAllSlots,
    selectedAugmentSlotWidth,
    selectedAugmentSlotHeight,
    minScore,
    templateHeights,
  );
  const cachedImageResult = getCachedImageResult(imageResultCacheKey, dataUrl, scannedAt);
  if (cachedImageResult) {
    return {
      ...cachedImageResult,
      metrics: buildSelectedAugmentVisionMetrics(startedAt, cachedImageResult.slots.length, {
        resultCacheHit: true,
        slotCacheHits: cachedImageResult.slots.length,
      }),
    };
  }

  const noPresenceCacheKey = getNoPresenceResultCacheKey(
    dataUrl,
    selectedAugmentAllSlots,
    selectedAugmentSlotWidth,
    selectedAugmentSlotHeight,
  );
  const cachedNoPresence = getCachedNoPresenceResult(noPresenceCacheKey, dataUrl, scannedAt);
  if (cachedNoPresence) {
    return {
      ...cachedNoPresence,
      metrics: buildSelectedAugmentVisionMetrics(startedAt, boardSlots.length),
    };
  }

  const loadedScreenshot = await loadSelectedAugmentScreenshotImage(dataUrl);
  const screenshot = loadedScreenshot.image;
  const screenshotLoadMs = loadedScreenshot.loadMs;
  const presenceStartedAt = nowMs();
  const boardPresence = scanBestAugmentIconSlotPresence(
    screenshot,
    boardSlotLayouts,
    selectedAugmentSlotWidth,
    selectedAugmentSlotHeight,
  );
  const boardHasPresence = Boolean(boardPresence);
  const hudPresence = boardHasPresence
    ? undefined
    : scanBestAugmentIconSlotPresence(
        screenshot,
        hudSlotLayouts,
        selectedAugmentSlotWidth,
        selectedAugmentSlotHeight,
      );
  const hudHasPresence = Boolean(hudPresence);
  const presenceMs = nowMs() - presenceStartedAt;

  if (!boardHasPresence && !hudHasPresence) {
    const result = {
      scannedAt,
      slots: [],
      metrics: buildSelectedAugmentVisionMetrics(startedAt, boardSlots.length, {
        screenshotLoadMs,
        presenceMs,
      }),
    };
    rememberNoPresenceResult(noPresenceCacheKey, dataUrl, result);
    rememberImageResult(imageResultCacheKey, dataUrl, result);
    return result;
  }

  if (collectCandidateAssets(options.augmentAssets).length === 0) {
    const result = {
      scannedAt,
      slots: buildEmptyAugmentIconSlotResults(boardSlots),
      metrics: buildSelectedAugmentVisionMetrics(startedAt, boardSlots.length, {
        screenshotLoadMs,
        presenceMs,
      }),
    };
    rememberImageResult(imageResultCacheKey, dataUrl, result);
    return result;
  }

  const activeSlots = boardHasPresence
    ? (boardPresence?.slots ?? boardSlots)
    : (hudPresence?.slots ?? []);
  const activeMinScore = boardHasPresence
    ? minScore
    : Math.max(minScore, selectedAugmentHudMinScore);
  const activePresenceScan = boardHasPresence ? boardPresence?.scan : hudPresence?.scan;
  const visibleResultCacheKey = getVisibleResultCacheKey(
    options.augmentAssets,
    options.basePath,
    activeSlots,
    selectedAugmentSlotWidth,
    selectedAugmentSlotHeight,
    activeMinScore,
    templateHeights,
    activePresenceScan?.signature ?? '',
  );
  const cachedVisibleResult = getCachedVisibleResult(visibleResultCacheKey, scannedAt);
  if (cachedVisibleResult) {
    return {
      ...cachedVisibleResult,
      metrics: buildSelectedAugmentVisionMetrics(startedAt, cachedVisibleResult.slots.length, {
        screenshotLoadMs,
        presenceMs,
        resultCacheHit: true,
        slotCacheHits: cachedVisibleResult.slots.length,
      }),
    };
  }

  const templateLoadStartedAt = nowMs();
  const variants = await loadTemplateVariantGroup(
    options.augmentAssets,
    options.basePath,
    templateHeights,
    selectedAugmentSlotWidth,
    selectedAugmentSlotHeight,
  );
  const templateLoadMs = nowMs() - templateLoadStartedAt;
  if (variants.length === 0) {
    return {
      scannedAt,
      slots: [],
      metrics: buildSelectedAugmentVisionMetrics(startedAt, boardSlots.length, {
        screenshotLoadMs,
        presenceMs,
        templateLoadMs,
      }),
    };
  }

  const matchStartedAt = nowMs();
  const scanResult = await scanAugmentIconSlots(
    screenshot,
    variants,
    activeMinScore,
    activeSlots,
    selectedAugmentSlotWidth,
    selectedAugmentSlotHeight,
    true,
    getPreScannedSlotMap(activePresenceScan),
  );
  const slots = scanResult.slots;
  const matchMs = nowMs() - matchStartedAt;

  const result = {
    scannedAt,
    slots,
    metrics: buildSelectedAugmentVisionMetrics(startedAt, slots.length, {
      screenshotLoadMs,
      presenceMs,
      templateLoadMs,
      matchMs,
      templateCount: variants.length,
      slotCacheHits: scanResult.cacheHits,
    }),
  };
  rememberVisibleResult(visibleResultCacheKey, result);
  rememberImageResult(imageResultCacheKey, dataUrl, result);
  return result;
}
