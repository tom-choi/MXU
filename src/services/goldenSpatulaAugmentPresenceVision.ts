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

function clampRatio(value: number): number {
  return Math.max(0, Math.min(1, value));
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

export function detectGoldenSpatulaAugmentPresenceFromImageData(
  imageData: ImageData,
): GoldenSpatulaAugmentPresenceResult {
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
    const goldRatio = measureLogicalRectRatio(imageData, slot.buttonRoi, isAugmentGoldButtonPixel);
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
  };
}

export async function detectGoldenSpatulaAugmentPresenceFromDataUrl(
  dataUrl: string,
): Promise<GoldenSpatulaAugmentPresenceResult> {
  if (!dataUrl || typeof document === 'undefined') {
    return { visible: false, confidence: 0, slots: [] };
  }

  const image = new Image();
  image.decoding = 'async';
  const loaded = new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('Failed to load screenshot for augment detection'));
  });
  image.src = dataUrl;
  await loaded;

  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth || goldenSpatulaLogicalScreenSize.width;
  canvas.height = image.naturalHeight || goldenSpatulaLogicalScreenSize.height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return { visible: false, confidence: 0, slots: [] };
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return detectGoldenSpatulaAugmentPresenceFromImageData(
    context.getImageData(0, 0, canvas.width, canvas.height),
  );
}
