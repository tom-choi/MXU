import { loadIconAsDataUrl } from '@/services/contentResolver';
import type {
  GoldenSpatulaChampionAsset,
  GoldenSpatulaChampionAssetIndex,
  GoldenSpatulaKnowledgeSlotConfidence,
  GoldenSpatulaShopCost,
  GoldenSpatulaShopOddsByCost,
} from '@/types/goldenSpatula';
import {
  goldenSpatulaLogicalScreenSize,
  goldenSpatulaShopChampionSlots,
} from './goldenSpatulaRollPipeline';
import {
  getGoldenSpatulaShopOddsByLevel,
  goldenSpatulaShopOddsCosts,
} from './goldenSpatulaShopOdds';

export interface GoldenSpatulaShopVisionSlotResult {
  slotIndex: number;
  slotLabel: string;
  championName?: string;
  templatePath?: string;
  confidence: GoldenSpatulaKnowledgeSlotConfidence;
  score?: number;
}

export interface GoldenSpatulaShopVisionResult {
  scannedAt: number;
  slots: GoldenSpatulaShopVisionSlotResult[];
}

interface GoldenSpatulaShopVisionOptions {
  championAssets: GoldenSpatulaChampionAssetIndex | undefined;
  basePath: string;
  level?: number;
  shopOdds?: GoldenSpatulaShopOddsByCost;
  minScore?: number;
}

interface ColorRaster {
  width: number;
  height: number;
  values: Float32Array;
}

interface TemplateVariant {
  asset: GoldenSpatulaChampionAsset;
  templatePath: string;
  width: number;
  height: number;
  values: Float32Array;
}

interface TemplateMatch {
  variant: TemplateVariant;
  score: number;
}

const shopVisionSlotWidth = 64;
const shopVisionSlotHeight = 50;
const shopVisionTemplateHeights = [16, 20, 24, 28] as const;
const shopVisionMatchStep = 2;
const shopVisionDefaultMinScore = 0.65;
const shopVisionMinPatchNorm = 0.01;
const shopVisionCostRegionXStartRatio = 0.68;
const shopVisionBottomRegionYStartRatio = 0.8;
const shopVisionMinCostGoldPixels = 4;
const shopVisionMinCostGoldRatio = 0.003;
const shopVisionMinBottomLightPixels = 12;
const shopVisionMinBottomLightRatio = 0.01;
const shopVisionPortraitRegionXStartRatio = 0.04;
const shopVisionPortraitRegionXEndRatio = 0.96;
const shopVisionPortraitRegionYStartRatio = 0.1;
const shopVisionPortraitRegionYEndRatio = 0.74;
const shopVisionMinPortraitBrightRatio = 0.2;
const shopVisionMinPortraitBrightOnlyRatio = 0.32;
const shopVisionMinPortraitColorRatio = 0.18;
const shopVisionAmbiguousSecondScore = 0.62;
const shopVisionAmbiguousMaxMargin = 0.025;
const shopVisionConfusingPairMaxBestScore = 0.72;
const shopVisionConfusingPairMinCandidateScore = 0.57;
const shopVisionConfusingPairMaxMargin = 0.08;
const shopVisionCostLockedMinScore = 0.59;
const shopVisionCostLockedMaxRawBestScore = 0.74;
const shopVisionCostLockedSecondScore = 0.57;
const shopVisionCostLockedMaxMargin = 0.035;
const shopVisionCostSignalMinPixels = 220;
const shopVisionCostSignalNameplateXStartRatio = 0.05;
const shopVisionCostSignalNameplateXEndRatio = 0.62;
const shopVisionCostSignalNameplateYStartRatio = 0.8;
const shopVisionCostSignalNameplateYEndRatio = 0.96;
const shopVisionTwoCostMinGreen = 0.2;
const shopVisionTwoCostMinGreenOverRed = 0.09;
const shopVisionTwoCostMinGreenOverBlue = 0.07;
const shopVisionOneCostMinBlue = 0.18;
const shopVisionOneCostMaxBlue = 0.25;
const shopVisionOneCostMinBlueOverRed = 0.05;
const shopVisionOneCostMinGreenOverRed = 0.02;
const shopVisionOneCostMaxBlueOverGreen = 0.075;
const shopVisionThreeCostMinBlue = 0.25;
const shopVisionThreeCostMinBlueOverGreen = 0.1;
const shopVisionThreeCostMinGreenOverRed = 0.015;
const shopVisionFourCostMinRed = 0.25;
const shopVisionFourCostMinBlue = 0.23;
const shopVisionFourCostMaxGreen = 0.18;
const shopVisionFourCostMinRedOverGreen = 0.14;
const shopVisionFourCostMinBlueOverGreen = 0.16;
const shopVisionFiveCostMinRed = 0.42;
const shopVisionFiveCostMinGreen = 0.25;
const shopVisionFiveCostMaxBlue = 0.12;
const shopVisionFiveCostMinRedOverGreen = 0.13;
const shopVisionFiveCostMinGreenOverBlue = 0.18;

type GpuLike = any;

const shopVisionGpuMapRead = 0x0001;
const shopVisionGpuCopySrc = 0x0004;
const shopVisionGpuCopyDst = 0x0008;
const shopVisionGpuUniform = 0x0040;
const shopVisionGpuStorage = 0x0080;
const shopVisionGpuWorkgroupSize = 64;

const shopVisionGpuShader = /* wgsl */ `
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

@compute @workgroup_size(${shopVisionGpuWorkgroupSize})
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

interface ShopVisionGpuState {
  readonly device: GpuLike;
  readonly pipeline: GpuLike;
}

interface ShopVisionGpuMatcher {
  match(slot: ColorRaster): Promise<TemplateMatch[] | undefined>;
  dispose(): void;
}

let shopVisionGpuUnavailable = false;
let shopVisionGpuStatePromise: Promise<ShopVisionGpuState | undefined> | undefined;

const shopVisionImageCache = new Map<string, Promise<HTMLImageElement>>();
const shopVisionTemplateCache = new Map<string, Promise<TemplateVariant[]>>();

function loadImage(src: string): Promise<HTMLImageElement> {
  const cached = shopVisionImageCache.get(src);
  if (cached) return cached;

  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to load image'));
    image.src = src;
  });
  shopVisionImageCache.set(src, promise);
  return promise;
}

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function extractColorRaster(
  image: HTMLImageElement,
  targetWidth: number,
  targetHeight: number,
  sourceRect?: readonly [number, number, number, number],
): ColorRaster {
  const canvas = createCanvas(targetWidth, targetHeight);
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    throw new Error('Canvas 2D context is unavailable');
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';

  if (sourceRect) {
    context.drawImage(
      image,
      sourceRect[0],
      sourceRect[1],
      sourceRect[2],
      sourceRect[3],
      0,
      0,
      targetWidth,
      targetHeight,
    );
  } else {
    context.drawImage(image, 0, 0, targetWidth, targetHeight);
  }

  const data = context.getImageData(0, 0, targetWidth, targetHeight).data;
  const values = new Float32Array(targetWidth * targetHeight * 3);
  for (let sourceIndex = 0, targetIndex = 0; sourceIndex < data.length; sourceIndex += 4) {
    values[targetIndex++] = data[sourceIndex] / 255;
    values[targetIndex++] = data[sourceIndex + 1] / 255;
    values[targetIndex++] = data[sourceIndex + 2] / 255;
  }

  return { width: targetWidth, height: targetHeight, values };
}

function normalizeFeature(values: Float32Array): Float32Array | undefined {
  let sum = 0;
  let sumSq = 0;
  for (const value of values) {
    sum += value;
    sumSq += value * value;
  }

  const mean = sum / values.length;
  const variance = Math.max(0, sumSq - sum * mean);
  const norm = Math.sqrt(variance);
  if (norm <= shopVisionMinPatchNorm) return undefined;

  const normalized = new Float32Array(values.length);
  for (let index = 0; index < values.length; index += 1) {
    normalized[index] = (values[index] - mean) / norm;
  }
  return normalized;
}

function isShopCostGoldPixel(red: number, green: number, blue: number): boolean {
  return red > 0.53 && green > 0.41 && blue < 0.41 && red > green * 0.9 && green > blue * 1.2;
}

function isBottomTextLightPixel(red: number, green: number, blue: number): boolean {
  return (red + green + blue) / 3 > 0.55;
}

type ShopCardCostSignal = {
  cost: number;
  confidence: number;
};

function estimateShopCardCostSignal(slot: ColorRaster): ShopCardCostSignal | undefined {
  const xStart = Math.max(0, Math.floor(slot.width * shopVisionCostSignalNameplateXStartRatio));
  const xEnd = Math.min(slot.width, Math.ceil(slot.width * shopVisionCostSignalNameplateXEndRatio));
  const yStart = Math.max(0, Math.floor(slot.height * shopVisionCostSignalNameplateYStartRatio));
  const yEnd = Math.min(
    slot.height,
    Math.ceil(slot.height * shopVisionCostSignalNameplateYEndRatio),
  );

  let pixels = 0;
  let redTotal = 0;
  let greenTotal = 0;
  let blueTotal = 0;
  for (let y = yStart; y < yEnd; y += 1) {
    for (let x = xStart; x < xEnd; x += 1) {
      const index = (y * slot.width + x) * 3;
      const red = slot.values[index];
      const green = slot.values[index + 1];
      const blue = slot.values[index + 2];
      const maxChannel = Math.max(red, green, blue);
      const minChannel = Math.min(red, green, blue);
      if (
        maxChannel < 0.14 ||
        maxChannel - minChannel < 0.047 ||
        (red > 0.7 && green > 0.7 && blue > 0.63)
      ) {
        continue;
      }
      pixels += 1;
      redTotal += red;
      greenTotal += green;
      blueTotal += blue;
    }
  }

  if (pixels < shopVisionCostSignalMinPixels) return undefined;

  const red = redTotal / pixels;
  const green = greenTotal / pixels;
  const blue = blueTotal / pixels;
  const greenOverRed = green - red;
  const greenOverBlue = green - blue;
  const blueOverGreen = blue - green;
  const blueOverRed = blue - red;
  const redOverGreen = red - green;
  const redOverBlue = red - blue;
  const makeSignal = (cost: number, confidence: number): ShopCardCostSignal => ({
    cost,
    confidence: Math.min(1, Math.max(0, confidence)),
  });

  if (
    red >= shopVisionFiveCostMinRed &&
    green >= shopVisionFiveCostMinGreen &&
    blue <= shopVisionFiveCostMaxBlue &&
    redOverGreen >= shopVisionFiveCostMinRedOverGreen &&
    greenOverBlue >= shopVisionFiveCostMinGreenOverBlue
  ) {
    return makeSignal(5, (redOverBlue + greenOverBlue) / 0.7);
  }

  if (
    red >= shopVisionFourCostMinRed &&
    blue >= shopVisionFourCostMinBlue &&
    green <= shopVisionFourCostMaxGreen &&
    redOverGreen >= shopVisionFourCostMinRedOverGreen &&
    blueOverGreen >= shopVisionFourCostMinBlueOverGreen
  ) {
    return makeSignal(4, (redOverGreen + blueOverGreen) / 0.55);
  }

  if (
    blue >= shopVisionThreeCostMinBlue &&
    blueOverGreen >= shopVisionThreeCostMinBlueOverGreen &&
    greenOverRed >= shopVisionThreeCostMinGreenOverRed
  ) {
    return makeSignal(3, blueOverGreen / 0.18);
  }

  if (
    green >= shopVisionTwoCostMinGreen &&
    greenOverRed >= shopVisionTwoCostMinGreenOverRed &&
    greenOverBlue >= shopVisionTwoCostMinGreenOverBlue
  ) {
    return makeSignal(2, (greenOverRed + greenOverBlue) / 0.24);
  }

  if (
    blue >= shopVisionOneCostMinBlue &&
    blue <= shopVisionOneCostMaxBlue &&
    blueOverRed >= shopVisionOneCostMinBlueOverRed &&
    greenOverRed >= shopVisionOneCostMinGreenOverRed &&
    blueOverGreen <= shopVisionOneCostMaxBlueOverGreen
  ) {
    return makeSignal(1, (blueOverRed + greenOverRed) / 0.16);
  }

  return undefined;
}

function hasShopCardPresence(slot: ColorRaster): boolean {
  const costXStart = Math.max(0, Math.floor(slot.width * shopVisionCostRegionXStartRatio));
  const bottomYStart = Math.max(0, Math.floor(slot.height * shopVisionBottomRegionYStartRatio));
  const bottomTextXEnd = Math.max(1, costXStart);

  let costGoldPixels = 0;
  let costRegionPixels = 0;
  for (let y = bottomYStart; y < slot.height; y += 1) {
    for (let x = costXStart; x < slot.width; x += 1) {
      const index = (y * slot.width + x) * 3;
      costRegionPixels += 1;
      if (isShopCostGoldPixel(slot.values[index], slot.values[index + 1], slot.values[index + 2])) {
        costGoldPixels += 1;
      }
    }
  }

  let bottomLightPixels = 0;
  let bottomTextPixels = 0;
  for (let y = bottomYStart; y < slot.height; y += 1) {
    for (let x = 0; x < bottomTextXEnd; x += 1) {
      const index = (y * slot.width + x) * 3;
      bottomTextPixels += 1;
      if (
        isBottomTextLightPixel(slot.values[index], slot.values[index + 1], slot.values[index + 2])
      ) {
        bottomLightPixels += 1;
      }
    }
  }

  const minCostGoldPixels = Math.max(
    shopVisionMinCostGoldPixels,
    Math.floor(costRegionPixels * shopVisionMinCostGoldRatio),
  );
  const minBottomLightPixels = Math.max(
    shopVisionMinBottomLightPixels,
    Math.floor(bottomTextPixels * shopVisionMinBottomLightRatio),
  );

  const portraitXStart = Math.max(0, Math.floor(slot.width * shopVisionPortraitRegionXStartRatio));
  const portraitXEnd = Math.min(
    slot.width,
    Math.ceil(slot.width * shopVisionPortraitRegionXEndRatio),
  );
  const portraitYStart = Math.max(0, Math.floor(slot.height * shopVisionPortraitRegionYStartRatio));
  const portraitYEnd = Math.min(
    bottomYStart,
    Math.ceil(slot.height * shopVisionPortraitRegionYEndRatio),
  );

  let portraitPixels = 0;
  let portraitBrightPixels = 0;
  let portraitColorPixels = 0;
  for (let y = portraitYStart; y < portraitYEnd; y += 1) {
    for (let x = portraitXStart; x < portraitXEnd; x += 1) {
      const index = (y * slot.width + x) * 3;
      const red = slot.values[index];
      const green = slot.values[index + 1];
      const blue = slot.values[index + 2];
      const luminance = (red + green + blue) / 3;
      const chroma = Math.max(red, green, blue) - Math.min(red, green, blue);
      portraitPixels += 1;
      if (luminance > 0.18) portraitBrightPixels += 1;
      if (chroma > 0.08) portraitColorPixels += 1;
    }
  }

  const portraitBrightRatio = portraitPixels > 0 ? portraitBrightPixels / portraitPixels : 0;
  const portraitColorRatio = portraitPixels > 0 ? portraitColorPixels / portraitPixels : 0;

  return (
    costGoldPixels >= minCostGoldPixels &&
    bottomLightPixels >= minBottomLightPixels &&
    (portraitBrightRatio >= shopVisionMinPortraitBrightOnlyRatio ||
      (portraitBrightRatio >= shopVisionMinPortraitBrightRatio &&
        portraitColorRatio >= shopVisionMinPortraitColorRatio))
  );
}

function getTemplateCacheKey(asset: GoldenSpatulaChampionAsset, basePath: string): string {
  return `${basePath}\u0000${asset.imagePath ?? ''}`;
}

async function loadTemplateVariants(
  asset: GoldenSpatulaChampionAsset,
  basePath: string,
): Promise<TemplateVariant[]> {
  const cacheKey = getTemplateCacheKey(asset, basePath);
  const cached = shopVisionTemplateCache.get(cacheKey);
  if (cached) return cached;

  const promise = (async () => {
    if (!asset.imagePath) return [];

    const dataUrl = await loadIconAsDataUrl(asset.imagePath, basePath);
    if (!dataUrl) return [];

    const image = await loadImage(dataUrl);
    const aspectRatio = (image.naturalWidth || image.width) / (image.naturalHeight || image.height);
    const variants: TemplateVariant[] = [];

    for (const height of shopVisionTemplateHeights) {
      const width = Math.max(8, Math.round(height * aspectRatio));
      if (width >= shopVisionSlotWidth || height >= shopVisionSlotHeight) continue;

      const raster = extractColorRaster(image, width, height);
      const normalized = normalizeFeature(raster.values);
      if (!normalized) continue;

      variants.push({
        asset,
        templatePath: asset.imagePath,
        width,
        height,
        values: normalized,
      });
    }

    return variants;
  })();

  shopVisionTemplateCache.set(cacheKey, promise);
  return promise;
}

function resolveAllowedCosts(
  shopOdds: GoldenSpatulaShopOddsByCost | undefined,
  level: number | undefined,
): Set<GoldenSpatulaShopCost> | undefined {
  const odds = shopOdds ?? getGoldenSpatulaShopOddsByLevel(level);
  if (!odds) return undefined;

  const costs = goldenSpatulaShopOddsCosts.filter((cost) => (odds[cost] ?? 0) > 0);
  return costs.length > 0 ? new Set(costs) : undefined;
}

function collectCandidateAssets(
  championAssets: GoldenSpatulaChampionAssetIndex | undefined,
  allowedCosts: Set<GoldenSpatulaShopCost> | undefined,
): GoldenSpatulaChampionAsset[] {
  const candidates: GoldenSpatulaChampionAsset[] = [];
  const seen = new Set<string>();

  for (const asset of Object.values(championAssets ?? {})) {
    if (!asset.imagePath || asset.templateAvailable === false) continue;
    if (asset.cost === undefined || asset.cost < 1 || asset.cost > 5) continue;
    if (allowedCosts && !allowedCosts.has(asset.cost as GoldenSpatulaShopCost)) continue;

    const key = asset.imagePath.replace(/\\/g, '/').toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    candidates.push(asset);
  }

  return candidates;
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
        const value = slot.values[slotIndex + channel];
        sum += value;
        sumSq += value * value;
        dot += value * variant.values[templateIndex];
        templateIndex += 1;
      }
      slotIndex += 3;
    }
  }

  const count = variant.width * variant.height * 3;
  const variance = Math.max(0, sumSq - (sum * sum) / count);
  const norm = Math.sqrt(variance);
  return norm <= shopVisionMinPatchNorm ? -1 : dot / norm;
}

function getTemplateMatchKey(variant: TemplateVariant): string {
  const championName = (variant.asset.name ?? '').trim().toLocaleLowerCase();
  const normalizedChampionName = championName.replace(/分身$/u, '');
  return normalizedChampionName || variant.templatePath.replace(/\\/g, '/').toLocaleLowerCase();
}

function findTemplateMatches(slot: ColorRaster, variants: TemplateVariant[]): TemplateMatch[] {
  const bestByChampion = new Map<string, TemplateMatch>();

  for (const variant of variants) {
    const maxX = slot.width - variant.width;
    const maxY = slot.height - variant.height;
    if (maxX < 0 || maxY < 0) continue;

    for (let y = 0; y <= maxY; y += shopVisionMatchStep) {
      for (let x = 0; x <= maxX; x += shopVisionMatchStep) {
        const score = scoreTemplateAt(slot, variant, x, y);
        const key = getTemplateMatchKey(variant);
        const current = bestByChampion.get(key);
        if (!current || score > current.score) {
          bestByChampion.set(key, { variant, score });
        }
      }
    }
  }

  return [...bestByChampion.values()].sort((left, right) => right.score - left.score);
}

async function getShopVisionGpuState(): Promise<ShopVisionGpuState | undefined> {
  if (shopVisionGpuUnavailable || typeof navigator === 'undefined') return undefined;

  if (!shopVisionGpuStatePromise) {
    shopVisionGpuStatePromise = (async () => {
      const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<GpuLike> } }).gpu;
      if (!gpu) {
        shopVisionGpuUnavailable = true;
        return undefined;
      }

      try {
        const adapter = await gpu.requestAdapter();
        if (!adapter) {
          shopVisionGpuUnavailable = true;
          return undefined;
        }

        const device = await adapter.requestDevice();
        const module = device.createShaderModule({ code: shopVisionGpuShader });
        const pipeline = device.createComputePipeline({
          layout: 'auto',
          compute: { module, entryPoint: 'main' },
        });
        return { device, pipeline };
      } catch {
        shopVisionGpuUnavailable = true;
        return undefined;
      }
    })();
  }

  return shopVisionGpuStatePromise;
}

function createShopVisionGpuBuffer(device: GpuLike, data: ArrayBufferView, usage: number): GpuLike {
  const buffer = device.createBuffer({
    size: Math.max(4, data.byteLength),
    usage: usage | shopVisionGpuCopyDst,
  });
  device.queue.writeBuffer(buffer, 0, data);
  return buffer;
}

function createShopVisionGpuParams(candidateCount: number): Uint8Array {
  const params = new ArrayBuffer(16);
  const view = new DataView(params);
  view.setUint32(0, candidateCount, true);
  view.setUint32(4, shopVisionSlotWidth, true);
  view.setUint32(8, shopVisionSlotHeight, true);
  view.setFloat32(12, shopVisionMinPatchNorm, true);
  return new Uint8Array(params);
}

function buildShopVisionTemplateValues(variants: TemplateVariant[]): {
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

function buildShopVisionGpuCandidates(
  variants: TemplateVariant[],
  templateOffsets: Uint32Array,
): Uint32Array {
  const values: number[] = [];

  variants.forEach((variant, variantIndex) => {
    const maxX = shopVisionSlotWidth - variant.width;
    const maxY = shopVisionSlotHeight - variant.height;
    if (maxX < 0 || maxY < 0) return;

    for (let y = 0; y <= maxY; y += shopVisionMatchStep) {
      for (let x = 0; x <= maxX; x += shopVisionMatchStep) {
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

function reduceShopVisionGpuScores(
  variants: TemplateVariant[],
  candidates: Uint32Array,
  scores: Float32Array,
): TemplateMatch[] {
  const bestByChampion = new Map<string, TemplateMatch>();

  for (let candidateIndex = 0; candidateIndex < scores.length; candidateIndex += 1) {
    const variantIndex = candidates[candidateIndex * 8];
    const variant = variants[variantIndex];
    if (!variant) continue;

    const score = scores[candidateIndex];
    const key = getTemplateMatchKey(variant);
    const current = bestByChampion.get(key);
    if (!current || score > current.score) {
      bestByChampion.set(key, { variant, score });
    }
  }

  return [...bestByChampion.values()].sort((left, right) => right.score - left.score);
}

async function createShopVisionGpuMatcher(
  variants: TemplateVariant[],
): Promise<ShopVisionGpuMatcher | undefined> {
  const state = await getShopVisionGpuState();
  if (!state || variants.length === 0) return undefined;

  try {
    const { offsets, values } = buildShopVisionTemplateValues(variants);
    const candidates = buildShopVisionGpuCandidates(variants, offsets);
    const candidateCount = Math.floor(candidates.length / 8);
    if (candidateCount === 0 || values.length === 0) return undefined;

    const { device, pipeline } = state;
    const templateBuffer = createShopVisionGpuBuffer(device, values, shopVisionGpuStorage);
    const candidateBuffer = createShopVisionGpuBuffer(device, candidates, shopVisionGpuStorage);
    const paramsBuffer = createShopVisionGpuBuffer(
      device,
      createShopVisionGpuParams(candidateCount),
      shopVisionGpuUniform,
    );
    const scoreBuffer = device.createBuffer({
      size: candidateCount * Float32Array.BYTES_PER_ELEMENT,
      usage: shopVisionGpuStorage | shopVisionGpuCopySrc,
    });
    const readBuffer = device.createBuffer({
      size: candidateCount * Float32Array.BYTES_PER_ELEMENT,
      usage: shopVisionGpuMapRead | shopVisionGpuCopyDst,
    });

    const dispose = () => {
      templateBuffer.destroy?.();
      candidateBuffer.destroy?.();
      paramsBuffer.destroy?.();
      scoreBuffer.destroy?.();
      readBuffer.destroy?.();
    };

    return {
      async match(slot: ColorRaster): Promise<TemplateMatch[] | undefined> {
        if (shopVisionGpuUnavailable) {
          return undefined;
        }
        if (slot.width !== shopVisionSlotWidth || slot.height !== shopVisionSlotHeight) {
          return undefined;
        }

        const slotBuffer = createShopVisionGpuBuffer(device, slot.values, shopVisionGpuStorage);
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
          pass.dispatchWorkgroups(Math.ceil(candidateCount / shopVisionGpuWorkgroupSize));
          pass.end();
          encoder.copyBufferToBuffer(
            scoreBuffer,
            0,
            readBuffer,
            0,
            candidateCount * Float32Array.BYTES_PER_ELEMENT,
          );
          device.queue.submit([encoder.finish()]);

          await readBuffer.mapAsync(shopVisionGpuMapRead);
          const mapped = readBuffer.getMappedRange();
          const scores = new Float32Array(mapped.slice(0));
          readBuffer.unmap();

          return reduceShopVisionGpuScores(variants, candidates, scores);
        } catch {
          shopVisionGpuUnavailable = true;
          return undefined;
        } finally {
          slotBuffer.destroy?.();
        }
      },
      dispose,
    };
  } catch {
    shopVisionGpuUnavailable = true;
    return undefined;
  }
}

function isAmbiguousTemplateMatch(
  best: TemplateMatch | undefined,
  second: TemplateMatch | undefined,
): boolean {
  if (!best || !second) return false;
  return (
    second.score >= shopVisionAmbiguousSecondScore &&
    best.score - second.score < shopVisionAmbiguousMaxMargin
  );
}

function templateMatchIncludes(match: TemplateMatch, token: string): boolean {
  const haystack = `${match.variant.templatePath} ${match.variant.asset.name}`.toLocaleLowerCase();
  return haystack.includes(token);
}

function hasNearbyConfusingCandidate(
  best: TemplateMatch,
  matches: TemplateMatch[],
  token: string,
): boolean {
  return matches.some(
    (match) =>
      match !== best &&
      templateMatchIncludes(match, token) &&
      match.score >= shopVisionConfusingPairMinCandidateScore &&
      best.score - match.score <= shopVisionConfusingPairMaxMargin,
  );
}

function isKnownConfusingTemplateMatch(
  best: TemplateMatch | undefined,
  matches: TemplateMatch[],
): boolean {
  if (!best || best.score >= shopVisionConfusingPairMaxBestScore) return false;

  if (templateMatchIncludes(best, 'urgot')) {
    return hasNearbyConfusingCandidate(best, matches, 'viktor');
  }
  if (templateMatchIncludes(best, 'viktor')) {
    return hasNearbyConfusingCandidate(best, matches, 'urgot');
  }

  return false;
}

function isCostLockedAmbiguousTemplateMatch(
  best: TemplateMatch | undefined,
  second: TemplateMatch | undefined,
): boolean {
  if (!best || !second) return false;
  return (
    second.score >= shopVisionCostLockedSecondScore &&
    best.score - second.score < shopVisionCostLockedMaxMargin
  );
}

function selectCostLockedTemplateMatches(
  matches: TemplateMatch[],
  costSignal: ShopCardCostSignal | undefined,
  minScore: number,
): TemplateMatch[] | undefined {
  if (!costSignal || costSignal.cost === 1 || costSignal.cost < 1 || costSignal.cost > 5) {
    return undefined;
  }

  const costMatches = matches.filter((match) => match.variant.asset.cost === costSignal.cost);
  const costBest = costMatches[0];
  if (!costBest || costBest.score < shopVisionCostLockedMinScore) return undefined;

  const rawBest = matches[0];
  const rawSecond = matches[1];
  if (
    rawBest &&
    rawBest.variant.asset.cost !== costSignal.cost &&
    rawBest.score > shopVisionCostLockedMaxRawBestScore
  ) {
    return undefined;
  }
  if (
    rawBest &&
    rawBest.variant.asset.cost === costSignal.cost &&
    rawBest.score >= minScore &&
    !isAmbiguousTemplateMatch(rawBest, rawSecond) &&
    !isKnownConfusingTemplateMatch(rawBest, matches)
  ) {
    return undefined;
  }
  if (isCostLockedAmbiguousTemplateMatch(costBest, costMatches[1])) {
    return undefined;
  }
  if (isKnownConfusingTemplateMatch(costBest, costMatches)) {
    return undefined;
  }

  return costMatches;
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

export async function recognizeGoldenSpatulaShopFromDataUrl(
  dataUrl: string,
  options: GoldenSpatulaShopVisionOptions,
): Promise<GoldenSpatulaShopVisionResult> {
  const scannedAt = Date.now();
  if (!dataUrl.startsWith('data:image/')) {
    return { scannedAt, slots: [] };
  }

  const allowedCosts = resolveAllowedCosts(options.shopOdds, options.level);
  const candidates = collectCandidateAssets(options.championAssets, allowedCosts);
  if (candidates.length === 0) {
    return { scannedAt, slots: [] };
  }

  const [screenshot, templateGroups] = await Promise.all([
    loadImage(dataUrl),
    Promise.all(candidates.map((asset) => loadTemplateVariants(asset, options.basePath))),
  ]);
  const variants = templateGroups.flat();
  if (variants.length === 0) {
    return { scannedAt, slots: [] };
  }

  const minScore = options.minScore ?? shopVisionDefaultMinScore;
  const slots: GoldenSpatulaShopVisionSlotResult[] = [];
  let gpuMatcher: ShopVisionGpuMatcher | undefined;

  try {
    for (const slot of goldenSpatulaShopChampionSlots) {
      const sourceRect = scaleSlotRoi(slot.roi, screenshot);
      const slotPresenceRaster = extractColorRaster(
        screenshot,
        Math.max(1, sourceRect[2]),
        Math.max(1, sourceRect[3]),
        sourceRect,
      );
      if (!hasShopCardPresence(slotPresenceRaster)) {
        slots.push({
          slotIndex: slot.index,
          slotLabel: slot.label,
          confidence: 'empty' as const,
        });
        continue;
      }

      const slotRaster = extractColorRaster(
        screenshot,
        shopVisionSlotWidth,
        shopVisionSlotHeight,
        sourceRect,
      );
      gpuMatcher ??= await createShopVisionGpuMatcher(variants);
      const gpuMatches = await gpuMatcher?.match(slotRaster);
      const matches = gpuMatches ?? findTemplateMatches(slotRaster, variants);
      const costSignal = estimateShopCardCostSignal(slotPresenceRaster);
      const costLockedMatches = selectCostLockedTemplateMatches(matches, costSignal, minScore);
      const effectiveMatches = costLockedMatches ?? matches;
      const effectiveMinScore = costLockedMatches ? shopVisionCostLockedMinScore : minScore;
      const best = effectiveMatches[0];
      const second = effectiveMatches[1];
      if (
        best &&
        best.score >= effectiveMinScore &&
        !isAmbiguousTemplateMatch(best, second) &&
        !isKnownConfusingTemplateMatch(best, effectiveMatches)
      ) {
        slots.push({
          slotIndex: slot.index,
          slotLabel: slot.label,
          championName: best.variant.asset.name,
          templatePath: best.variant.templatePath,
          confidence: 'matched' as const,
          score: best.score,
        });
        continue;
      }

      slots.push({
        slotIndex: slot.index,
        slotLabel: slot.label,
        confidence: 'empty' as const,
        score: best?.score,
      });
    }
  } finally {
    gpuMatcher?.dispose();
  }

  return { scannedAt, slots };
}
