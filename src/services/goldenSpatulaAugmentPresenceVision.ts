import {
  goldenSpatulaLogicalScreenSize,
  scaleGoldenSpatulaLogicalRectToScreen,
  type GoldenSpatulaPipelineRect,
} from '@/services/goldenSpatulaRollPipeline';

export interface GoldenSpatulaAugmentPresenceSlotSignal {
  slotIndex: number;
  purpleRatio: number;
  brightRatio: number;
  darkRatio: number;
  goldRatio: number;
  confidence: number;
  visible: boolean;
}

export interface GoldenSpatulaAugmentPresenceResult {
  visible: boolean;
  confidence: number;
  slots: GoldenSpatulaAugmentPresenceSlotSignal[];
  metrics?: GoldenSpatulaAugmentPresenceMetrics;
}

export interface GoldenSpatulaAugmentPresenceMetrics {
  algorithm: 'full-image-sampled-v1' | 'roi-sampled-v2' | 'roi-sampled-v3-gated';
  totalMs: number;
  screenshotLoadMs: number;
  analyzeMs: number;
  roiCount: number;
  sampledPixels: number;
}

export const goldenSpatulaAugmentPresenceSlots = [
  { slotIndex: 1, roi: [130, 80, 355, 390], buttonRoi: [255, 468, 92, 52] },
  { slotIndex: 2, roi: [465, 80, 355, 390], buttonRoi: [590, 468, 92, 52] },
  { slotIndex: 3, roi: [800, 80, 355, 390], buttonRoi: [925, 468, 92, 52] },
] as const satisfies ReadonlyArray<{
  slotIndex: number;
  roi: GoldenSpatulaPipelineRect;
  buttonRoi: GoldenSpatulaPipelineRect;
}>;

// Human-reviewed game frames show augment choices always expose fixed reroll buttons.
// Use those tiny button ROIs as a cheap gate before scanning the three large cards.
const augmentPresenceWeakButtonGoldRatio = 0.012;
const augmentPresenceStrongButtonGoldRatio = 0.025;
const augmentPresenceLoadedImageCacheLimit = 2;

interface LoadedPresenceImageCacheEntry {
  dataUrl: string;
  promise: Promise<HTMLImageElement>;
  image?: HTMLImageElement;
}

interface RatioMeasurement {
  ratio: number;
  sampledPixels: number;
}

const augmentPresenceLoadedImageCache = new Map<string, LoadedPresenceImageCacheEntry>();

function nowMs(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function clampRatio(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function getPresenceDataUrlFingerprint(dataUrl: string): string {
  const middle = Math.max(0, Math.floor(dataUrl.length / 2) - 96);
  return [
    dataUrl.length,
    dataUrl.slice(0, 96),
    dataUrl.slice(middle, middle + 192),
    dataUrl.slice(-192),
  ].join(':');
}

function isAugmentPurplePixel(red: number, green: number, blue: number, alpha: number): boolean {
  if (alpha < 32) return false;
  if (blue < 78 || red < 42) return false;
  if (blue < green * 1.18) return false;
  if (red < green * 0.72) return false;
  return blue + red - green * 2 > 42;
}

function isAugmentBrightFramePixel(red: number, green: number, blue: number, alpha: number): boolean {
  if (alpha < 32) return false;
  return blue > 125 && red > 75 && green > 55 && blue > green * 1.1;
}

function isAugmentDarkCardPixel(red: number, green: number, blue: number, alpha: number): boolean {
  if (alpha < 32) return false;
  return red < 82 && green < 72 && blue < 132 && blue >= green * 0.9;
}

function isAugmentGoldButtonPixel(red: number, green: number, blue: number, alpha: number): boolean {
  if (alpha < 32) return false;
  return red > 115 && green > 82 && blue < 92 && red >= green * 1.05 && green >= blue * 1.25;
}

function shouldRunAugmentCardPresenceScan(goldRatios: readonly number[]): boolean {
  const weakSignals = goldRatios.filter((ratio) => ratio >= augmentPresenceWeakButtonGoldRatio).length;
  const strongSignals = goldRatios.filter((ratio) => ratio >= augmentPresenceStrongButtonGoldRatio).length;
  return weakSignals >= 3 || (weakSignals >= 2 && strongSignals >= 1);
}

function buildButtonGateOnlySlots(
  goldRatios: readonly number[],
): GoldenSpatulaAugmentPresenceSlotSignal[] {
  return goldenSpatulaAugmentPresenceSlots.map((slot, index) => {
    const goldRatio = goldRatios[index] ?? 0;
    return {
      slotIndex: slot.slotIndex,
      purpleRatio: 0,
      brightRatio: 0,
      darkRatio: 0,
      goldRatio,
      confidence: clampRatio(goldRatio / 0.16) * 0.18,
      visible: false,
    };
  });
}

function measureLogicalRectRatio(
  imageData: ImageData,
  rect: GoldenSpatulaPipelineRect,
  predicate: (red: number, green: number, blue: number, alpha: number) => boolean,
): number {
  const [x, y, width, height] = scaleGoldenSpatulaLogicalRectToScreen(rect, {
    width: imageData.width,
    height: imageData.height,
  });
  const step = Math.max(2, Math.round(Math.min(width, height) / 80));
  let sampled = 0;
  let matched = 0;

  for (let yy = y; yy < y + height; yy += step) {
    for (let xx = x; xx < x + width; xx += step) {
      if (xx < 0 || yy < 0 || xx >= imageData.width || yy >= imageData.height) continue;
      const offset = (yy * imageData.width + xx) * 4;
      const red = imageData.data[offset] ?? 0;
      const green = imageData.data[offset + 1] ?? 0;
      const blue = imageData.data[offset + 2] ?? 0;
      const alpha = imageData.data[offset + 3] ?? 255;
      sampled += 1;
      if (predicate(red, green, blue, alpha)) matched += 1;
    }
  }

  return sampled > 0 ? matched / sampled : 0;
}

function measureLogicalImageRectRatio(
  image: HTMLImageElement,
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  rect: GoldenSpatulaPipelineRect,
  predicate: (red: number, green: number, blue: number, alpha: number) => boolean,
): RatioMeasurement {
  const imageWidth = image.naturalWidth || image.width || goldenSpatulaLogicalScreenSize.width;
  const imageHeight = image.naturalHeight || image.height || goldenSpatulaLogicalScreenSize.height;
  const [rawX, rawY, rawWidth, rawHeight] = scaleGoldenSpatulaLogicalRectToScreen(rect, {
    width: imageWidth,
    height: imageHeight,
  });
  const x = Math.max(0, Math.min(imageWidth - 1, rawX));
  const y = Math.max(0, Math.min(imageHeight - 1, rawY));
  const width = Math.max(1, Math.min(rawWidth, imageWidth - x));
  const height = Math.max(1, Math.min(rawHeight, imageHeight - y));
  const step = Math.max(2, Math.round(Math.min(width, height) / 80));
  const sampleWidth = Math.max(1, Math.ceil(width / step));
  const sampleHeight = Math.max(1, Math.ceil(height / step));

  if (canvas.width !== sampleWidth) canvas.width = sampleWidth;
  if (canvas.height !== sampleHeight) canvas.height = sampleHeight;
  context.clearRect(0, 0, sampleWidth, sampleHeight);
  context.imageSmoothingEnabled = false;
  context.drawImage(image, x, y, width, height, 0, 0, sampleWidth, sampleHeight);

  const imageData = context.getImageData(0, 0, sampleWidth, sampleHeight);
  let sampledPixels = 0;
  let matched = 0;

  for (let index = 0; index < imageData.data.length; index += 4) {
    const red = imageData.data[index] ?? 0;
    const green = imageData.data[index + 1] ?? 0;
    const blue = imageData.data[index + 2] ?? 0;
    const alpha = imageData.data[index + 3] ?? 255;
    sampledPixels += 1;
    if (predicate(red, green, blue, alpha)) matched += 1;
  }

  return {
    ratio: sampledPixels > 0 ? matched / sampledPixels : 0,
    sampledPixels,
  };
}

function buildAugmentPresenceResult(
  slots: GoldenSpatulaAugmentPresenceSlotSignal[],
  metrics?: GoldenSpatulaAugmentPresenceMetrics,
): GoldenSpatulaAugmentPresenceResult {
  const visibleSlots = slots.filter((slot) => slot.visible);
  const strongCardSlots = slots.filter(
    (slot) =>
      slot.darkRatio >= 0.2 &&
      slot.purpleRatio >= 0.04 &&
      slot.brightRatio >= 0.035 &&
      slot.confidence >= 0.42,
  );
  const confidence =
    slots
      .map((slot) => slot.confidence)
      .sort((left, right) => right - left)
      .slice(0, 3)
      .reduce((sum, value) => sum + value, 0) / Math.max(1, slots.length);

  return {
    visible:
      (visibleSlots.length >= 3 && confidence >= 0.44) ||
      (strongCardSlots.length >= 3 && confidence >= 0.46),
    confidence,
    slots,
    metrics,
  };
}

export function detectGoldenSpatulaAugmentPresenceFromImageData(
  imageData: ImageData,
): GoldenSpatulaAugmentPresenceResult {
  const buttonGoldRatios = goldenSpatulaAugmentPresenceSlots.map((slot) =>
    measureLogicalRectRatio(imageData, slot.buttonRoi, isAugmentGoldButtonPixel),
  );

  if (!shouldRunAugmentCardPresenceScan(buttonGoldRatios)) {
    return buildAugmentPresenceResult(buildButtonGateOnlySlots(buttonGoldRatios));
  }

  const slots = goldenSpatulaAugmentPresenceSlots.map((slot) => {
    const innerRoi = [
      slot.roi[0] + 72,
      slot.roi[1] + 165,
      slot.roi[2] - 144,
      150,
    ] as const;
    const purpleRatio = measureLogicalRectRatio(imageData, slot.roi, isAugmentPurplePixel);
    const brightRatio = measureLogicalRectRatio(imageData, slot.roi, isAugmentBrightFramePixel);
    const darkRatio = measureLogicalRectRatio(imageData, innerRoi, isAugmentDarkCardPixel);
    const goldRatio = buttonGoldRatios[slot.slotIndex - 1] ?? 0;
    const confidence =
      clampRatio(purpleRatio / 0.12) * 0.3 +
      clampRatio(brightRatio / 0.045) * 0.18 +
      clampRatio(darkRatio / 0.28) * 0.34 +
      clampRatio(goldRatio / 0.16) * 0.18;
    const cardCoreVisible =
      darkRatio >= 0.18 &&
      purpleRatio >= 0.03 &&
      brightRatio >= 0.03;
    const buttonOrStrongFrameVisible =
      goldRatio >= 0.025 ||
      (purpleRatio >= 0.075 && brightRatio >= 0.038);

    return {
      slotIndex: slot.slotIndex,
      purpleRatio,
      brightRatio,
      darkRatio,
      goldRatio,
      confidence,
      visible:
        cardCoreVisible &&
        buttonOrStrongFrameVisible &&
        confidence >= 0.38,
    };
  });

  return buildAugmentPresenceResult(slots);
}

function analyzeGoldenSpatulaAugmentPresenceImageElement(
  image: HTMLImageElement,
): Omit<GoldenSpatulaAugmentPresenceMetrics, 'algorithm' | 'totalMs' | 'screenshotLoadMs' | 'analyzeMs'> & {
  result: GoldenSpatulaAugmentPresenceResult;
} {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    return {
      result: { visible: false, confidence: 0, slots: [] },
      roiCount: 0,
      sampledPixels: 0,
    };
  }

  let roiCount = 0;
  let sampledPixels = 0;
  const measure = (
    rect: GoldenSpatulaPipelineRect,
    predicate: (red: number, green: number, blue: number, alpha: number) => boolean,
  ) => {
    const measured = measureLogicalImageRectRatio(image, canvas, context, rect, predicate);
    roiCount += 1;
    sampledPixels += measured.sampledPixels;
    return measured.ratio;
  };

  const buttonGoldRatios = goldenSpatulaAugmentPresenceSlots.map((slot) =>
    measure(slot.buttonRoi, isAugmentGoldButtonPixel),
  );

  if (!shouldRunAugmentCardPresenceScan(buttonGoldRatios)) {
    return {
      result: buildAugmentPresenceResult(buildButtonGateOnlySlots(buttonGoldRatios)),
      roiCount,
      sampledPixels,
    };
  }

  const slots = goldenSpatulaAugmentPresenceSlots.map((slot) => {
    const innerRoi = [
      slot.roi[0] + 72,
      slot.roi[1] + 165,
      slot.roi[2] - 144,
      150,
    ] as const;
    const purpleRatio = measure(slot.roi, isAugmentPurplePixel);
    const brightRatio = measure(slot.roi, isAugmentBrightFramePixel);
    const darkRatio = measure(innerRoi, isAugmentDarkCardPixel);
    const goldRatio = buttonGoldRatios[slot.slotIndex - 1] ?? 0;
    const confidence =
      clampRatio(purpleRatio / 0.12) * 0.3 +
      clampRatio(brightRatio / 0.045) * 0.18 +
      clampRatio(darkRatio / 0.28) * 0.34 +
      clampRatio(goldRatio / 0.16) * 0.18;
    const cardCoreVisible = darkRatio >= 0.18 && purpleRatio >= 0.03 && brightRatio >= 0.03;
    const buttonOrStrongFrameVisible =
      goldRatio >= 0.025 || (purpleRatio >= 0.075 && brightRatio >= 0.038);

    return {
      slotIndex: slot.slotIndex,
      purpleRatio,
      brightRatio,
      darkRatio,
      goldRatio,
      confidence,
      visible: cardCoreVisible && buttonOrStrongFrameVisible && confidence >= 0.38,
    };
  });

  return {
    result: buildAugmentPresenceResult(slots),
    roiCount,
    sampledPixels,
  };
}

export async function loadGoldenSpatulaAugmentPresenceImage(
  dataUrl: string,
): Promise<{ image: HTMLImageElement; loadMs: number }> {
  const cacheKey = getPresenceDataUrlFingerprint(dataUrl);
  const cached = augmentPresenceLoadedImageCache.get(cacheKey);
  if (cached?.dataUrl === dataUrl) {
    if (cached.image) {
      return {
        image: cached.image,
        loadMs: 0,
      };
    }
    const waitStartedAt = nowMs();
    const image = await cached.promise;
    return {
      image,
      loadMs: nowMs() - waitStartedAt,
    };
  }

  const image = new Image();
  image.decoding = 'async';
  const screenshotLoadStartedAt = nowMs();
  const loaded = new Promise<HTMLImageElement>((resolve, reject) => {
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to load screenshot for augment detection'));
  });
  const promise = loaded.catch((error) => {
    const current = augmentPresenceLoadedImageCache.get(cacheKey);
    if (current?.dataUrl === dataUrl) augmentPresenceLoadedImageCache.delete(cacheKey);
    throw error;
  });
  if (!augmentPresenceLoadedImageCache.has(cacheKey)) {
    const oldestKey = augmentPresenceLoadedImageCache.keys().next().value;
    if (
      oldestKey &&
      augmentPresenceLoadedImageCache.size >= augmentPresenceLoadedImageCacheLimit
    ) {
      augmentPresenceLoadedImageCache.delete(oldestKey);
    }
  }
  const entry: LoadedPresenceImageCacheEntry = {
    dataUrl,
    promise,
  };
  augmentPresenceLoadedImageCache.set(cacheKey, entry);
  image.src = dataUrl;
  await promise;
  entry.image = image;
  return {
    image,
    loadMs: nowMs() - screenshotLoadStartedAt,
  };
}

export function detectGoldenSpatulaAugmentPresenceFromLoadedImage(
  image: HTMLImageElement,
  screenshotLoadMs = 0,
): GoldenSpatulaAugmentPresenceResult {
  const startedAt = nowMs() - Math.max(0, screenshotLoadMs);

  const analyzeStartedAt = nowMs();
  const detection = analyzeGoldenSpatulaAugmentPresenceImageElement(image);
  const analyzeMs = nowMs() - analyzeStartedAt;

  return {
    ...detection.result,
    metrics: {
      algorithm: 'roi-sampled-v3-gated',
      totalMs: nowMs() - startedAt,
      screenshotLoadMs,
      analyzeMs,
      roiCount: detection.roiCount,
      sampledPixels: detection.sampledPixels,
    },
  };
}

export async function detectGoldenSpatulaAugmentPresenceFromDataUrl(
  dataUrl: string,
): Promise<GoldenSpatulaAugmentPresenceResult> {
  if (!dataUrl || typeof document === 'undefined') {
    return { visible: false, confidence: 0, slots: [] };
  }

  const { image, loadMs } = await loadGoldenSpatulaAugmentPresenceImage(dataUrl);
  return detectGoldenSpatulaAugmentPresenceFromLoadedImage(image, loadMs);
}
