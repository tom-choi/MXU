import { loadIconAsDataUrl } from '@/services/contentResolver';
import type {
  GoldenSpatulaAugmentAsset,
  GoldenSpatulaAugmentAssetIndex,
  GoldenSpatulaKnowledgeSlotConfidence,
} from '@/types/goldenSpatula';
import { goldenSpatulaLogicalScreenSize } from './goldenSpatulaRollPipeline';

export interface GoldenSpatulaAugmentChoiceVisionSlotResult {
  slotIndex: number;
  slotLabel: string;
  augmentName?: string;
  templatePath?: string;
  confidence: GoldenSpatulaKnowledgeSlotConfidence;
  score?: number;
}

export interface GoldenSpatulaAugmentChoiceVisionMetrics {
  algorithm: 'fixed-icon-feature-v1' | 'histogram-prefilter-v2' | 'title-icon-fusion-v3';
  totalMs: number;
  screenshotLoadMs: number;
  templateLoadMs: number;
  matchMs: number;
  slotCount: number;
  templateCount: number;
  comparisons: number;
  histogramComparisons?: number;
  featureComparisons?: number;
  shortlistSize?: number;
  featureLength: number;
  titleFeatureLength?: number;
}

export interface GoldenSpatulaAugmentChoiceVisionResult {
  scannedAt: number;
  slots: GoldenSpatulaAugmentChoiceVisionSlotResult[];
  metrics: GoldenSpatulaAugmentChoiceVisionMetrics;
}

interface GoldenSpatulaAugmentChoiceVisionOptions {
  augmentAssets: GoldenSpatulaAugmentAssetIndex | undefined;
  basePath: string;
  minScore?: number;
}

interface AugmentChoiceIconSlot {
  index: number;
  label: string;
  roi: readonly [number, number, number, number];
}

interface ColorRaster {
  width: number;
  height: number;
  values: Float32Array;
}

interface TemplateFeature {
  asset: GoldenSpatulaAugmentAsset;
  templatePath: string;
  featureValues: Float32Array;
  colorHistogram: Float32Array;
  titleFeatureValues: Float32Array;
}

interface ChoiceMatch {
  template: TemplateFeature;
  score: number;
  iconScore: number;
  titleScore: number;
}

interface CandidateAssetCacheEntry {
  assets: GoldenSpatulaAugmentAsset[];
  imagePathKey: string;
}

const augmentChoiceIconSlots = [
  { index: 1, label: '1', roi: [260, 95, 120, 120] },
  { index: 2, label: '2', roi: [585, 95, 120, 120] },
  { index: 3, label: '3', roi: [910, 95, 120, 120] },
] as const satisfies ReadonlyArray<AugmentChoiceIconSlot>;

const augmentChoiceTitleSlots = [
  { index: 1, roi: [175, 232, 265, 50] },
  { index: 2, roi: [510, 232, 265, 50] },
  { index: 3, roi: [845, 232, 265, 50] },
] as const;

const augmentChoiceFeatureWidth = 24;
const augmentChoiceFeatureHeight = 24;
const augmentChoiceTitleFeatureWidth = 265;
const augmentChoiceTitleFeatureHeight = 50;
const augmentChoiceHistogramBins = 4;
const augmentChoiceDefaultMinScore = 0.55;
const augmentChoiceStrongScore = 0.42;
const augmentChoiceAmbiguousMargin = 0.008;
const augmentChoiceTemplateBatchSize = 24;
const augmentChoiceTitleSourceThreshold = 170;
const augmentChoiceTitleTemplateThreshold = 50;
const augmentChoiceTitleScoreWeight = 0.9;
const augmentChoiceIconScoreWeight = 0.1;

const augmentChoiceImageCache = new Map<string, Promise<HTMLImageElement>>();
const augmentChoiceTemplateCache = new Map<string, Promise<TemplateFeature[]>>();
const augmentChoiceTemplateCacheByAssetIndex = new WeakMap<
  GoldenSpatulaAugmentAssetIndex,
  Map<string, Promise<TemplateFeature[]>>
>();
const augmentChoiceCandidateAssetCache = new WeakMap<
  GoldenSpatulaAugmentAssetIndex,
  CandidateAssetCacheEntry
>();

function nowMs(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, 0));
}

function loadImage(src: string, cache = true): Promise<HTMLImageElement> {
  const cached = cache ? augmentChoiceImageCache.get(src) : undefined;
  if (cached) return cached;

  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    image.src = src;
  });

  if (cache) augmentChoiceImageCache.set(src, promise);
  return promise;
}

function extractColorRaster(
  image: CanvasImageSource,
  width: number,
  height: number,
  sourceRect?: readonly [number, number, number, number],
): ColorRaster {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return { width, height, values: new Float32Array(width * height * 3) };

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

function normalizeFeature(values: Float32Array): Float32Array {
  let sum = 0;
  for (const value of values) sum += value;
  const mean = values.length > 0 ? sum / values.length : 0;

  let sumSq = 0;
  const normalized = new Float32Array(values.length);
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index] - mean;
    normalized[index] = value;
    sumSq += value * value;
  }

  const norm = Math.sqrt(sumSq);
  if (norm <= 0.000001) return normalized;
  for (let index = 0; index < normalized.length; index += 1) normalized[index] /= norm;
  return normalized;
}

function buildColorHistogram(values: Float32Array): Float32Array {
  const bins = augmentChoiceHistogramBins;
  const histogram = new Float32Array(bins * bins * bins);

  for (let index = 0; index < values.length; index += 3) {
    const red = Math.min(bins - 1, Math.max(0, Math.floor((values[index] ?? 0) * bins)));
    const green = Math.min(bins - 1, Math.max(0, Math.floor((values[index + 1] ?? 0) * bins)));
    const blue = Math.min(bins - 1, Math.max(0, Math.floor((values[index + 2] ?? 0) * bins)));
    histogram[(red * bins + green) * bins + blue] += 1;
  }

  let sumSq = 0;
  for (const value of histogram) sumSq += value * value;
  const norm = Math.sqrt(sumSq);
  if (norm <= 0.000001) return histogram;
  for (let index = 0; index < histogram.length; index += 1) histogram[index] /= norm;
  return histogram;
}

function normalizeBinaryFeature(values: Float32Array): Float32Array {
  let sum = 0;
  for (const value of values) sum += value;
  const mean = values.length > 0 ? sum / values.length : 0;

  let sumSq = 0;
  const normalized = new Float32Array(values.length);
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index] - mean;
    normalized[index] = value;
    sumSq += value * value;
  }

  const norm = Math.sqrt(sumSq);
  if (norm <= 0.000001) return normalized;
  for (let index = 0; index < normalized.length; index += 1) normalized[index] /= norm;
  return normalized;
}

function extractBinaryLuminanceFeature(
  image: CanvasImageSource,
  width: number,
  height: number,
  threshold: number,
  sourceRect?: readonly [number, number, number, number],
): Float32Array {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return new Float32Array(width * height);

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

function buildTitleFeatureFromText(text: string): Float32Array {
  const canvas = document.createElement('canvas');
  canvas.width = augmentChoiceTitleFeatureWidth;
  canvas.height = augmentChoiceTitleFeatureHeight;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    return new Float32Array(augmentChoiceTitleFeatureWidth * augmentChoiceTitleFeatureHeight);
  }

  context.font = '22px SimHei, "Microsoft YaHei", sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.lineWidth = 2;
  context.strokeStyle = 'rgb(0, 0, 0)';
  context.fillStyle = 'rgb(255, 255, 255)';
  const x = augmentChoiceTitleFeatureWidth / 2;
  const y = augmentChoiceTitleFeatureHeight / 2;
  context.strokeText(text, x, y);
  context.fillText(text, x, y);

  return extractBinaryLuminanceFeature(
    canvas,
    augmentChoiceTitleFeatureWidth,
    augmentChoiceTitleFeatureHeight,
    augmentChoiceTitleTemplateThreshold,
  );
}

function dotFeatureValues(left: Float32Array, right: Float32Array): number {
  if (left.length !== right.length) return -1;

  let dot = 0;
  for (let index = 0; index < left.length; index += 1) {
    dot += (left[index] ?? 0) * (right[index] ?? 0);
  }
  return dot;
}

function collectCandidateAssetEntry(
  augmentAssets: GoldenSpatulaAugmentAssetIndex | undefined,
): CandidateAssetCacheEntry {
  if (augmentAssets) {
    const cached = augmentChoiceCandidateAssetCache.get(augmentAssets);
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

  const entry = {
    assets: candidates,
    imagePathKey: candidates
      .map((asset) => asset.imagePath ?? '')
      .sort()
      .join('|'),
  };
  if (augmentAssets) augmentChoiceCandidateAssetCache.set(augmentAssets, entry);
  return entry;
}

function getTemplateCacheKey(
  augmentAssets: GoldenSpatulaAugmentAssetIndex | undefined,
  basePath: string,
): string {
  const assetKeys = collectCandidateAssetEntry(augmentAssets).imagePathKey;
  return [basePath, `${augmentChoiceFeatureWidth}x${augmentChoiceFeatureHeight}`, assetKeys].join(
    '\u0000',
  );
}

async function loadTemplateFeatures(
  augmentAssets: GoldenSpatulaAugmentAssetIndex | undefined,
  basePath: string,
): Promise<TemplateFeature[]> {
  const scopedCacheKey = `${basePath}\u0000${augmentChoiceFeatureWidth}x${augmentChoiceFeatureHeight}`;
  if (augmentAssets) {
    const scopedCache = augmentChoiceTemplateCacheByAssetIndex.get(augmentAssets);
    const cached = scopedCache?.get(scopedCacheKey);
    if (cached) return cached;
  }

  const cacheKey = getTemplateCacheKey(augmentAssets, basePath);
  const cached = augmentChoiceTemplateCache.get(cacheKey);
  if (cached) return cached;

  const promise = (async () => {
    const templates: TemplateFeature[] = [];
    const assets = collectCandidateAssetEntry(augmentAssets).assets;

    for (let index = 0; index < assets.length; index += augmentChoiceTemplateBatchSize) {
      const batch = assets.slice(index, index + augmentChoiceTemplateBatchSize);
      const batchFeatures = await Promise.all(
        batch.map(async (asset): Promise<TemplateFeature | undefined> => {
          if (!asset?.imagePath) return undefined;

          const dataUrl = await loadIconAsDataUrl(asset.imagePath, basePath);
          if (!dataUrl) return undefined;

          const image = await loadImage(dataUrl, true);
          const raster = extractColorRaster(
            image,
            augmentChoiceFeatureWidth,
            augmentChoiceFeatureHeight,
          );
          return {
            asset,
            templatePath: asset.imagePath,
            featureValues: normalizeFeature(raster.values),
            colorHistogram: buildColorHistogram(raster.values),
            titleFeatureValues: buildTitleFeatureFromText(asset.name ?? ''),
          };
        }),
      );
      templates.push(
        ...batchFeatures.filter((feature): feature is TemplateFeature => Boolean(feature)),
      );
      await yieldToBrowser();
    }

    return templates;
  })();

  augmentChoiceTemplateCache.set(cacheKey, promise);
  if (augmentAssets) {
    let scopedCache = augmentChoiceTemplateCacheByAssetIndex.get(augmentAssets);
    if (!scopedCache) {
      scopedCache = new Map();
      augmentChoiceTemplateCacheByAssetIndex.set(augmentAssets, scopedCache);
    }
    scopedCache.set(scopedCacheKey, promise);
  }
  return promise;
}

function scaleLogicalRoi(
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

function scaleSlotRoi(
  roi: readonly [number, number, number, number],
  image: HTMLImageElement,
): [number, number, number, number] {
  return scaleLogicalRoi(roi, image);
}

function matchChoiceSlot(
  screenshot: HTMLImageElement,
  slot: AugmentChoiceIconSlot,
  templates: TemplateFeature[],
  usedTemplatePaths: Set<string>,
  minScore: number,
): GoldenSpatulaAugmentChoiceVisionSlotResult {
  const raster = extractColorRaster(
    screenshot,
    augmentChoiceFeatureWidth,
    augmentChoiceFeatureHeight,
    scaleSlotRoi(slot.roi, screenshot),
  );
  const featureValues = normalizeFeature(raster.values);
  const colorHistogram = buildColorHistogram(raster.values);
  const titleSlot = augmentChoiceTitleSlots.find((item) => item.index === slot.index);
  const titleFeatureValues = titleSlot
    ? extractBinaryLuminanceFeature(
        screenshot,
        augmentChoiceTitleFeatureWidth,
        augmentChoiceTitleFeatureHeight,
        augmentChoiceTitleSourceThreshold,
        scaleLogicalRoi(titleSlot.roi, screenshot),
      )
    : new Float32Array(augmentChoiceTitleFeatureWidth * augmentChoiceTitleFeatureHeight);

  let best: ChoiceMatch | undefined;
  let second: ChoiceMatch | undefined;
  const scored: Array<{
    template: TemplateFeature;
    iconScore: number;
    titleScore: number;
  }> = [];

  for (const template of templates) {
    if (usedTemplatePaths.has(template.templatePath)) continue;
    const featureScore = dotFeatureValues(featureValues, template.featureValues);
    const colorScore = dotFeatureValues(colorHistogram, template.colorHistogram);
    const iconScore = featureScore * 0.78 + colorScore * 0.22;
    const titleScore = dotFeatureValues(titleFeatureValues, template.titleFeatureValues);
    scored.push({ template, iconScore, titleScore });
  }

  const iconScores = scored.map((item) => item.iconScore);
  const titleScores = scored.map((item) => item.titleScore);
  const iconMin = Math.min(...iconScores);
  const iconMax = Math.max(...iconScores);
  const iconRange = iconMax - iconMin;
  const titleMin = Math.min(...titleScores);
  const titleMax = Math.max(...titleScores);
  const titleRange = titleMax - titleMin;

  for (const item of scored) {
    const normalizedIcon = iconRange > 0.000001 ? (item.iconScore - iconMin) / iconRange : 0;
    const normalizedTitle = titleRange > 0.000001 ? (item.titleScore - titleMin) / titleRange : 0;
    const score =
      normalizedTitle * augmentChoiceTitleScoreWeight +
      normalizedIcon * augmentChoiceIconScoreWeight;
    if (!best || score > best.score) {
      second = best;
      best = {
        template: item.template,
        score,
        iconScore: item.iconScore,
        titleScore: item.titleScore,
      };
    } else if (!second || score > second.score) {
      second = {
        template: item.template,
        score,
        iconScore: item.iconScore,
        titleScore: item.titleScore,
      };
    }
  }

  const ambiguous =
    best &&
    second &&
    best.score < augmentChoiceStrongScore &&
    best.score - second.score < augmentChoiceAmbiguousMargin;
  if (best && best.score >= minScore && !ambiguous) {
    usedTemplatePaths.add(best.template.templatePath);
    return {
      slotIndex: slot.index,
      slotLabel: slot.label,
      augmentName: best.template.asset.name,
      templatePath: best.template.templatePath,
      confidence: 'matched' as const,
      score: best.score,
    };
  }

  return {
    slotIndex: slot.index,
    slotLabel: slot.label,
    confidence: 'empty' as const,
    score: best?.score,
  };
}

export async function recognizeGoldenSpatulaAugmentChoicesFromDataUrl(
  dataUrl: string,
  options: GoldenSpatulaAugmentChoiceVisionOptions,
): Promise<GoldenSpatulaAugmentChoiceVisionResult> {
  const scannedAt = Date.now();
  const startedAt = nowMs();
  const emptyMetrics: GoldenSpatulaAugmentChoiceVisionMetrics = {
    algorithm: 'title-icon-fusion-v3',
    totalMs: 0,
    screenshotLoadMs: 0,
    templateLoadMs: 0,
    matchMs: 0,
    slotCount: augmentChoiceIconSlots.length,
    templateCount: 0,
    comparisons: 0,
    histogramComparisons: 0,
    featureComparisons: 0,
    featureLength: augmentChoiceFeatureWidth * augmentChoiceFeatureHeight * 3,
    titleFeatureLength: augmentChoiceTitleFeatureWidth * augmentChoiceTitleFeatureHeight,
  };

  if (!dataUrl.startsWith('data:image/')) {
    return { scannedAt, slots: [], metrics: emptyMetrics };
  }

  const screenshotLoadStartedAt = nowMs();
  const screenshot = await loadImage(dataUrl, false);
  const screenshotLoadMs = nowMs() - screenshotLoadStartedAt;

  return recognizeGoldenSpatulaAugmentChoicesFromImageElement(screenshot, options, {
    scannedAt,
    startedAt,
    screenshotLoadMs,
  });
}

export async function recognizeGoldenSpatulaAugmentChoicesFromImageElement(
  screenshot: HTMLImageElement,
  options: GoldenSpatulaAugmentChoiceVisionOptions,
  timing: {
    scannedAt?: number;
    startedAt?: number;
    screenshotLoadMs?: number;
  } = {},
): Promise<GoldenSpatulaAugmentChoiceVisionResult> {
  const screenshotLoadMs = Math.max(0, timing.screenshotLoadMs ?? 0);
  const scannedAt = timing.scannedAt ?? Date.now();
  const startedAt = timing.startedAt ?? nowMs() - screenshotLoadMs;
  const emptyMetrics: GoldenSpatulaAugmentChoiceVisionMetrics = {
    algorithm: 'title-icon-fusion-v3',
    totalMs: 0,
    screenshotLoadMs,
    templateLoadMs: 0,
    matchMs: 0,
    slotCount: augmentChoiceIconSlots.length,
    templateCount: 0,
    comparisons: 0,
    histogramComparisons: 0,
    featureComparisons: 0,
    featureLength: augmentChoiceFeatureWidth * augmentChoiceFeatureHeight * 3,
    titleFeatureLength: augmentChoiceTitleFeatureWidth * augmentChoiceTitleFeatureHeight,
  };

  const templateLoadStartedAt = nowMs();
  const templates = await loadTemplateFeatures(options.augmentAssets, options.basePath);
  const templateLoadMs = nowMs() - templateLoadStartedAt;
  if (templates.length === 0) {
    return {
      scannedAt,
      slots: [],
      metrics: {
        ...emptyMetrics,
        totalMs: nowMs() - startedAt,
        screenshotLoadMs,
        templateLoadMs,
      },
    };
  }

  const matchStartedAt = nowMs();
  const usedTemplatePaths = new Set<string>();
  const minScore = options.minScore ?? augmentChoiceDefaultMinScore;
  const slots = augmentChoiceIconSlots.map((slot) =>
    matchChoiceSlot(screenshot, slot, templates, usedTemplatePaths, minScore),
  );
  const matchMs = nowMs() - matchStartedAt;
  const histogramComparisons = templates.length * augmentChoiceIconSlots.length;
  const featureComparisons = templates.length * augmentChoiceIconSlots.length;

  return {
    scannedAt,
    slots,
    metrics: {
      algorithm: 'title-icon-fusion-v3',
      totalMs: nowMs() - startedAt,
      screenshotLoadMs,
      templateLoadMs,
      matchMs,
      slotCount: augmentChoiceIconSlots.length,
      templateCount: templates.length,
      comparisons: featureComparisons,
      histogramComparisons,
      featureComparisons,
      featureLength: augmentChoiceFeatureWidth * augmentChoiceFeatureHeight * 3,
      titleFeatureLength: augmentChoiceTitleFeatureWidth * augmentChoiceTitleFeatureHeight,
    },
  };
}

export async function preloadGoldenSpatulaAugmentChoiceVisionTemplates(
  options: GoldenSpatulaAugmentChoiceVisionOptions,
): Promise<GoldenSpatulaAugmentChoiceVisionMetrics> {
  const startedAt = nowMs();
  const templateLoadStartedAt = nowMs();
  const templates = await loadTemplateFeatures(options.augmentAssets, options.basePath);
  const templateLoadMs = nowMs() - templateLoadStartedAt;

  return {
    algorithm: 'title-icon-fusion-v3',
    totalMs: nowMs() - startedAt,
    screenshotLoadMs: 0,
    templateLoadMs,
    matchMs: 0,
    slotCount: augmentChoiceIconSlots.length,
    templateCount: templates.length,
    comparisons: 0,
    histogramComparisons: 0,
    featureComparisons: 0,
    featureLength: augmentChoiceFeatureWidth * augmentChoiceFeatureHeight * 3,
    titleFeatureLength: augmentChoiceTitleFeatureWidth * augmentChoiceTitleFeatureHeight,
  };
}
