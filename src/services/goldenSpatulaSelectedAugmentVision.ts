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
}

export interface GoldenSpatulaSelectedAugmentVisionResult {
  scannedAt: number;
  slots: GoldenSpatulaSelectedAugmentVisionSlotResult[];
}

interface GoldenSpatulaSelectedAugmentVisionOptions {
  augmentAssets: GoldenSpatulaAugmentAssetIndex | undefined;
  basePath: string;
  minScore?: number;
}

export interface GoldenSpatulaAugmentIconVisionSlot {
  index: number;
  label: string;
  roi: readonly [number, number, number, number];
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

export const goldenSpatulaSelectedAugmentSlots = [
  { index: 1, label: '1', roi: [382, 154, 54, 58] },
  { index: 2, label: '2', roi: [428, 154, 54, 58] },
  { index: 3, label: '3', roi: [474, 154, 54, 58] },
  { index: 4, label: '4', roi: [520, 154, 54, 58] },
  { index: 5, label: '5', roi: [566, 154, 54, 58] },
  { index: 6, label: '6', roi: [612, 154, 54, 58] },
] as const;

const goldenSpatulaSelectedAugmentHudSlots = [
  { index: 1, label: '1', roi: [558, 2, 42, 40] },
  { index: 2, label: '2', roi: [602, 2, 42, 40] },
  { index: 3, label: '3', roi: [646, 2, 42, 40] },
  { index: 4, label: '4', roi: [690, 2, 42, 40] },
  { index: 5, label: '5', roi: [734, 2, 42, 40] },
  { index: 6, label: '6', roi: [778, 2, 42, 40] },
] as const;

const selectedAugmentSlotWidth = 54;
const selectedAugmentSlotHeight = 54;
const selectedAugmentTemplateHeights = [30, 34, 38, 42] as const;
const selectedAugmentMatchStep = 2;
const selectedAugmentFastMatchStep = 4;
const selectedAugmentPreciseCandidateLimit = 56;
const selectedAugmentCachedMatchMinScore = 0.62;
const selectedAugmentFeatureWidth = 18;
const selectedAugmentFeatureHeight = 18;
const selectedAugmentColorHistogramBins = 4;
const selectedAugmentDefaultMinScore = 0.56;
const selectedAugmentHudMinScore = 0.66;
const selectedAugmentMinPatchNorm = 0.01;
const selectedAugmentStrongScore = 0.74;
const selectedAugmentAmbiguousSecondScore = 0.6;
const selectedAugmentAmbiguousMaxMargin = 0.025;
const selectedAugmentMinFrameDarkRatio = 0.06;
const selectedAugmentMinColorRatio = 0.12;

const selectedAugmentImageCache = new Map<string, Promise<HTMLImageElement>>();
const selectedAugmentTemplateCache = new Map<string, Promise<TemplateVariant[]>>();
const selectedAugmentLastMatchCache = new Map<string, string>();

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
  if (!context) {
    return { width, height, values: new Float32Array(width * height * 3) };
  }

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
    const green = Math.min(binCount - 1, Math.max(0, Math.floor((values[index + 1] ?? 0) * binCount)));
    const blue = Math.min(binCount - 1, Math.max(0, Math.floor((values[index + 2] ?? 0) * binCount)));
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

    for (const height of templateHeights) {
      const width = Math.max(8, Math.round(height * aspectRatio));
      if (width >= maxWidth || height >= maxHeight) continue;

      const raster = extractColorRaster(image, width, height);
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

  for (let y = 0; y < slot.height; y += 1) {
    for (let x = 0; x < slot.width; x += 1) {
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
  const totalPixels = slot.width * slot.height;
  const totalDarkRatio = totalPixels > 0 ? totalDarkPixels / totalPixels : 0;
  const totalColorRatio = totalPixels > 0 ? totalColorPixels / totalPixels : 0;
  const topLeftDarkRatio = topLeftPixels > 0 ? topLeftDarkPixels / topLeftPixels : 0;
  const floatingIconPresence =
    totalDarkRatio >= 0.08 &&
    totalColorRatio >= 0.2 &&
    topLeftDarkRatio >= 0.08;

  return (
    floatingIconPresence ||
    (
      darkFrameRatio >= selectedAugmentMinFrameDarkRatio &&
      colorRatio >= selectedAugmentMinColorRatio
    )
  );
}

function scoreTemplateAt(slot: ColorRaster, variant: TemplateVariant, x: number, y: number): number {
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

function combineTemplateScores(baseScore: number, featureScore: number, colorScore: number): number {
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
    if (!current || Math.abs(variant.height - targetHeight) < Math.abs(current.height - targetHeight)) {
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

function findTemplateMatches(
  slot: ColorRaster,
  variants: TemplateVariant[],
  candidateLimit = selectedAugmentPreciseCandidateLimit,
): TemplateMatch[] {
  const bestByAugment = new Map<string, TemplateMatch>();
  const preciseVariants =
    variants.length <= candidateLimit
      ? variants
      : chooseFastTemplateVariants(variants, slot, candidateLimit);

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
      const featureScores = scoreTemplatePatchFeatures(
        slot,
        match.variant,
        match.x,
        match.y,
      );
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

function isAmbiguousTemplateMatch(best: TemplateMatch | undefined, second: TemplateMatch | undefined): boolean {
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

function getVisionSlotCacheKey(
  slot: GoldenSpatulaAugmentIconVisionSlot,
  slotWidth: number,
  slotHeight: number,
): string {
  return `${slotWidth}x${slotHeight}:${slot.index}:${slot.roi.join(',')}`;
}

function scanAugmentIconSlots(
  screenshot: HTMLImageElement,
  variants: TemplateVariant[],
  minScore: number,
  slotsToScan: ReadonlyArray<GoldenSpatulaAugmentIconVisionSlot>,
  slotWidth: number,
  slotHeight: number,
  requirePresence: boolean,
): GoldenSpatulaSelectedAugmentVisionSlotResult[] {
  const usedTemplatePaths = new Set<string>();

  return slotsToScan.map((slot) => {
    const slotCacheKey = getVisionSlotCacheKey(slot, slotWidth, slotHeight);
    const sourceRect = scaleSlotRoi(slot.roi, screenshot);
    const presenceRaster = extractColorRaster(
      screenshot,
      slotWidth,
      slotHeight,
      sourceRect,
    );

    if (requirePresence && !hasSelectedAugmentIconPresence(presenceRaster)) {
      return {
        slotIndex: slot.index,
        slotLabel: slot.label,
        confidence: 'empty' as const,
      };
    }

    const cachedTemplatePath = selectedAugmentLastMatchCache.get(slotCacheKey);
    if (cachedTemplatePath && !usedTemplatePaths.has(cachedTemplatePath)) {
      const cachedVariants = variants.filter((variant) => variant.templatePath === cachedTemplatePath);
      const cachedMatches = findTemplateMatches(presenceRaster, cachedVariants, 1);
      const cachedBest = cachedMatches[0];
      if (cachedBest && cachedBest.score >= Math.max(minScore, selectedAugmentCachedMatchMinScore)) {
        usedTemplatePaths.add(cachedBest.variant.templatePath);
        return {
          slotIndex: slot.index,
          slotLabel: slot.label,
          augmentName: cachedBest.variant.asset.name,
          templatePath: cachedBest.variant.templatePath,
          confidence: 'matched' as const,
          score: cachedBest.score,
        };
      }
    }

    const matches = findTemplateMatches(presenceRaster, variants).filter(
      (match) => !usedTemplatePaths.has(match.variant.templatePath),
    );
    const best = matches[0];
    const second = matches[1];
    if (best && best.score >= minScore && !isAmbiguousTemplateMatch(best, second)) {
      usedTemplatePaths.add(best.variant.templatePath);
      selectedAugmentLastMatchCache.set(slotCacheKey, best.variant.templatePath);
      return {
        slotIndex: slot.index,
        slotLabel: slot.label,
        augmentName: best.variant.asset.name,
        templatePath: best.variant.templatePath,
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
  });
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

function hasAugmentIconPresenceInSlots(
  screenshot: HTMLImageElement,
  slotsToScan: ReadonlyArray<GoldenSpatulaAugmentIconVisionSlot>,
  slotWidth: number,
  slotHeight: number,
): boolean {
  return slotsToScan.some((slot) => {
    const sourceRect = scaleSlotRoi(slot.roi, screenshot);
    const raster = extractColorRaster(screenshot, slotWidth, slotHeight, sourceRect);
    return hasSelectedAugmentIconPresence(raster);
  });
}

export async function recognizeGoldenSpatulaAugmentIconsFromDataUrl(
  dataUrl: string,
  options: GoldenSpatulaAugmentIconVisionOptions,
): Promise<GoldenSpatulaSelectedAugmentVisionResult> {
  const scannedAt = Date.now();
  if (!dataUrl.startsWith('data:image/')) {
    return { scannedAt, slots: [] };
  }

  const candidates = collectCandidateAssets(options.augmentAssets);
  if (candidates.length === 0 || options.slots.length === 0) {
    return { scannedAt, slots: [] };
  }

  const templateHeights = options.templateHeights ?? selectedAugmentTemplateHeights;
  const [screenshot, templateGroups] = await Promise.all([
    loadImage(dataUrl, false),
    Promise.all(
      candidates.map((asset) =>
        loadTemplateVariants(
          asset,
          options.basePath,
          templateHeights,
          options.slotWidth,
          options.slotHeight,
        ),
      ),
    ),
  ]);
  const variants = templateGroups.flat();
  if (variants.length === 0) {
    return { scannedAt, slots: [] };
  }

  const minScore = options.minScore ?? selectedAugmentDefaultMinScore;
  const slots = scanAugmentIconSlots(
    screenshot,
    variants,
    minScore,
    options.slots,
    options.slotWidth,
    options.slotHeight,
    options.requirePresence ?? true,
  );

  return { scannedAt, slots };
}

export async function recognizeGoldenSpatulaSelectedAugmentsFromDataUrl(
  dataUrl: string,
  options: GoldenSpatulaSelectedAugmentVisionOptions,
): Promise<GoldenSpatulaSelectedAugmentVisionResult> {
  const scannedAt = Date.now();
  if (!dataUrl.startsWith('data:image/')) {
    return { scannedAt, slots: [] };
  }

  const candidates = collectCandidateAssets(options.augmentAssets);
  if (candidates.length === 0) {
    return { scannedAt, slots: [] };
  }

  const screenshot = await loadImage(dataUrl, false);
  const boardHasPresence = hasAugmentIconPresenceInSlots(
    screenshot,
    goldenSpatulaSelectedAugmentSlots,
    selectedAugmentSlotWidth,
    selectedAugmentSlotHeight,
  );
  const hudHasPresence = boardHasPresence
    ? false
    : hasAugmentIconPresenceInSlots(
        screenshot,
        goldenSpatulaSelectedAugmentHudSlots,
        selectedAugmentSlotWidth,
        selectedAugmentSlotHeight,
      );

  if (!boardHasPresence && !hudHasPresence) {
    return {
      scannedAt,
      slots: buildEmptyAugmentIconSlotResults(goldenSpatulaSelectedAugmentSlots),
    };
  }

  const templateGroups = await Promise.all(
    candidates.map((asset) =>
      loadTemplateVariants(
        asset,
        options.basePath,
        selectedAugmentTemplateHeights,
        selectedAugmentSlotWidth,
        selectedAugmentSlotHeight,
      ),
    ),
  );
  const variants = templateGroups.flat();
  if (variants.length === 0) {
    return { scannedAt, slots: [] };
  }

  const minScore = options.minScore ?? selectedAugmentDefaultMinScore;
  const slots = boardHasPresence
    ? scanAugmentIconSlots(
        screenshot,
        variants,
        minScore,
        goldenSpatulaSelectedAugmentSlots,
        selectedAugmentSlotWidth,
        selectedAugmentSlotHeight,
        true,
      )
    : scanAugmentIconSlots(
        screenshot,
        variants,
        Math.max(minScore, selectedAugmentHudMinScore),
        goldenSpatulaSelectedAugmentHudSlots,
        selectedAugmentSlotWidth,
        selectedAugmentSlotHeight,
        true,
      );

  return { scannedAt, slots };
}
