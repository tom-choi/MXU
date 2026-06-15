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
  algorithm: 'fixed-icon-feature-v1';
  totalMs: number;
  screenshotLoadMs: number;
  templateLoadMs: number;
  matchMs: number;
  slotCount: number;
  templateCount: number;
  comparisons: number;
  featureLength: number;
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
}

interface ChoiceMatch {
  template: TemplateFeature;
  score: number;
}

const augmentChoiceIconSlots = [
  { index: 1, label: '1', roi: [260, 95, 120, 120] },
  { index: 2, label: '2', roi: [585, 95, 120, 120] },
  { index: 3, label: '3', roi: [910, 95, 120, 120] },
] as const satisfies ReadonlyArray<AugmentChoiceIconSlot>;

const augmentChoiceFeatureWidth = 24;
const augmentChoiceFeatureHeight = 24;
const augmentChoiceHistogramBins = 4;
const augmentChoiceDefaultMinScore = 0.3;
const augmentChoiceStrongScore = 0.42;
const augmentChoiceAmbiguousMargin = 0.008;
const augmentChoiceTemplateBatchSize = 24;

const augmentChoiceImageCache = new Map<string, Promise<HTMLImageElement>>();
const augmentChoiceTemplateCache = new Map<string, Promise<TemplateFeature[]>>();

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
  for (let sourceIndex = 0, targetIndex = 0; sourceIndex < imageData.data.length; sourceIndex += 4) {
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

function dotFeatureValues(left: Float32Array, right: Float32Array): number {
  if (left.length !== right.length) return -1;

  let dot = 0;
  for (let index = 0; index < left.length; index += 1) {
    dot += (left[index] ?? 0) * (right[index] ?? 0);
  }
  return dot;
}

function collectCandidateAssets(
  augmentAssets: GoldenSpatulaAugmentAssetIndex | undefined,
): GoldenSpatulaAugmentAsset[] {
  const candidates: GoldenSpatulaAugmentAsset[] = [];
  const seen = new Set<string>();

  for (const asset of Object.values(augmentAssets ?? {})) {
    if (!asset.imagePath || asset.templateAvailable === false) continue;

    const key = asset.imagePath.replace(/\\/g, '/').toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    candidates.push(asset);
  }

  return candidates;
}

function getTemplateCacheKey(
  augmentAssets: GoldenSpatulaAugmentAssetIndex | undefined,
  basePath: string,
): string {
  const assetKeys = collectCandidateAssets(augmentAssets)
    .map((asset) => asset.imagePath ?? '')
    .sort()
    .join('|');
  return [
    basePath,
    `${augmentChoiceFeatureWidth}x${augmentChoiceFeatureHeight}`,
    assetKeys,
  ].join('\u0000');
}

async function loadTemplateFeatures(
  augmentAssets: GoldenSpatulaAugmentAssetIndex | undefined,
  basePath: string,
): Promise<TemplateFeature[]> {
  const cacheKey = getTemplateCacheKey(augmentAssets, basePath);
  const cached = augmentChoiceTemplateCache.get(cacheKey);
  if (cached) return cached;

  const promise = (async () => {
    const templates: TemplateFeature[] = [];
    const assets = collectCandidateAssets(augmentAssets);

    for (let index = 0; index < assets.length; index += 1) {
      const asset = assets[index];
      if (!asset?.imagePath) continue;

      const dataUrl = await loadIconAsDataUrl(asset.imagePath, basePath);
      if (!dataUrl) continue;

      const image = await loadImage(dataUrl, true);
      const raster = extractColorRaster(
        image,
        augmentChoiceFeatureWidth,
        augmentChoiceFeatureHeight,
      );
      templates.push({
        asset,
        templatePath: asset.imagePath,
        featureValues: normalizeFeature(raster.values),
        colorHistogram: buildColorHistogram(raster.values),
      });

      if (index > 0 && index % augmentChoiceTemplateBatchSize === 0) {
        await yieldToBrowser();
      }
    }

    return templates;
  })();

  augmentChoiceTemplateCache.set(cacheKey, promise);
  return promise;
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

  let best: ChoiceMatch | undefined;
  let second: ChoiceMatch | undefined;

  for (const template of templates) {
    if (usedTemplatePaths.has(template.templatePath)) continue;

    const featureScore = dotFeatureValues(featureValues, template.featureValues);
    const colorScore = dotFeatureValues(colorHistogram, template.colorHistogram);
    const score = featureScore * 0.78 + colorScore * 0.22;
    if (!best || score > best.score) {
      second = best;
      best = { template, score };
    } else if (!second || score > second.score) {
      second = { template, score };
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
    algorithm: 'fixed-icon-feature-v1',
    totalMs: 0,
    screenshotLoadMs: 0,
    templateLoadMs: 0,
    matchMs: 0,
    slotCount: augmentChoiceIconSlots.length,
    templateCount: 0,
    comparisons: 0,
    featureLength: augmentChoiceFeatureWidth * augmentChoiceFeatureHeight * 3,
  };

  if (!dataUrl.startsWith('data:image/')) {
    return { scannedAt, slots: [], metrics: emptyMetrics };
  }

  const screenshotLoadStartedAt = nowMs();
  const screenshot = await loadImage(dataUrl, false);
  const screenshotLoadMs = nowMs() - screenshotLoadStartedAt;

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

  return {
    scannedAt,
    slots,
    metrics: {
      algorithm: 'fixed-icon-feature-v1',
      totalMs: nowMs() - startedAt,
      screenshotLoadMs,
      templateLoadMs,
      matchMs,
      slotCount: augmentChoiceIconSlots.length,
      templateCount: templates.length,
      comparisons: templates.length * augmentChoiceIconSlots.length,
      featureLength: augmentChoiceFeatureWidth * augmentChoiceFeatureHeight * 3,
    },
  };
}
