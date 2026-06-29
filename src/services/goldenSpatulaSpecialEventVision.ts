import {
  goldenSpatulaLogicalScreenSize,
  scaleGoldenSpatulaLogicalRectToScreen,
  type GoldenSpatulaPipelineRect,
} from '@/services/goldenSpatulaRollPipeline';

export type GoldenSpatulaSpecialEventType =
  | 'augmentChoice'
  | 'deityDuel'
  | 'rewardBlessing'
  | 'itemArmory'
  | 'settlement';

export interface GoldenSpatulaSpecialEventDetection {
  type: GoldenSpatulaSpecialEventType;
  confidence: number;
}

export interface GoldenSpatulaSpecialEventVisionResult {
  events: GoldenSpatulaSpecialEventDetection[];
  metrics?: {
    algorithm: 'roi-color-gates-v1';
    totalMs: number;
    roiCount: number;
    sampledPixels: number;
  };
}

interface RectSignal {
  darkRatio: number;
  brightRatio: number;
  purpleRatio: number;
  goldRatio: number;
  colorRatio: number;
  sampledPixels: number;
}

interface LoadedSpecialEventImageCacheEntry {
  dataUrl: string;
  promise: Promise<HTMLImageElement>;
  image?: HTMLImageElement;
}

const specialEventLoadedImageCacheLimit = 2;
const specialEventLoadedImageCache = new Map<string, LoadedSpecialEventImageCacheEntry>();
const specialEventMinConfidence = 0.45;

function nowMs(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function clampRatio(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function getSpecialEventDataUrlFingerprint(dataUrl: string): string {
  const middle = Math.max(0, Math.floor(dataUrl.length / 2) - 96);
  return [
    dataUrl.length,
    dataUrl.slice(0, 96),
    dataUrl.slice(middle, middle + 192),
    dataUrl.slice(-192),
  ].join(':');
}

function isDarkUiPixel(red: number, green: number, blue: number, alpha: number): boolean {
  if (alpha < 32) return false;
  return red < 82 && green < 82 && blue < 116;
}

function isBrightUiPixel(red: number, green: number, blue: number, alpha: number): boolean {
  if (alpha < 32) return false;
  return red > 150 && green > 145 && blue > 135;
}

function isPurpleEventPixel(red: number, green: number, blue: number, alpha: number): boolean {
  if (alpha < 32) return false;
  if (blue < 85 || red < 50) return false;
  if (blue < green * 1.12) return false;
  if (red < green * 0.68) return false;
  return blue + red - green * 2 > 36;
}

function isGoldEventPixel(red: number, green: number, blue: number, alpha: number): boolean {
  if (alpha < 32) return false;
  return red > 125 && green > 88 && blue < 105 && red >= green * 1.04 && green >= blue * 1.12;
}

function isCardColorPixel(red: number, green: number, blue: number, alpha: number): boolean {
  if (alpha < 32) return false;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  return max > 92 && max - min > 42;
}

async function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  const cacheKey = getSpecialEventDataUrlFingerprint(dataUrl);
  const cached = specialEventLoadedImageCache.get(cacheKey);
  if (cached?.dataUrl === dataUrl) {
    if (cached.image) return cached.image;
    return cached.promise;
  }

  const image = new Image();
  image.decoding = 'async';
  const loaded = new Promise<HTMLImageElement>((resolve, reject) => {
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to load screenshot for special event detection'));
  });
  const promise = loaded.catch((error) => {
    const current = specialEventLoadedImageCache.get(cacheKey);
    if (current?.dataUrl === dataUrl) specialEventLoadedImageCache.delete(cacheKey);
    throw error;
  });

  if (!specialEventLoadedImageCache.has(cacheKey)) {
    const oldestKey = specialEventLoadedImageCache.keys().next().value;
    if (oldestKey && specialEventLoadedImageCache.size >= specialEventLoadedImageCacheLimit) {
      specialEventLoadedImageCache.delete(oldestKey);
    }
  }

  const entry: LoadedSpecialEventImageCacheEntry = {
    dataUrl,
    promise,
  };
  specialEventLoadedImageCache.set(cacheKey, entry);
  image.src = dataUrl;
  await promise;
  entry.image = image;
  return image;
}

function measureRectSignal(
  image: HTMLImageElement,
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  rect: GoldenSpatulaPipelineRect,
): RectSignal {
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
  const step = Math.max(2, Math.round(Math.min(width, height) / 70));
  const sampleWidth = Math.max(1, Math.ceil(width / step));
  const sampleHeight = Math.max(1, Math.ceil(height / step));

  if (canvas.width !== sampleWidth) canvas.width = sampleWidth;
  if (canvas.height !== sampleHeight) canvas.height = sampleHeight;
  context.clearRect(0, 0, sampleWidth, sampleHeight);
  context.imageSmoothingEnabled = false;
  context.drawImage(image, x, y, width, height, 0, 0, sampleWidth, sampleHeight);

  const imageData = context.getImageData(0, 0, sampleWidth, sampleHeight);
  let sampledPixels = 0;
  let darkPixels = 0;
  let brightPixels = 0;
  let purplePixels = 0;
  let goldPixels = 0;
  let colorPixels = 0;

  for (let index = 0; index < imageData.data.length; index += 4) {
    const red = imageData.data[index] ?? 0;
    const green = imageData.data[index + 1] ?? 0;
    const blue = imageData.data[index + 2] ?? 0;
    const alpha = imageData.data[index + 3] ?? 255;
    sampledPixels += 1;
    if (isDarkUiPixel(red, green, blue, alpha)) darkPixels += 1;
    if (isBrightUiPixel(red, green, blue, alpha)) brightPixels += 1;
    if (isPurpleEventPixel(red, green, blue, alpha)) purplePixels += 1;
    if (isGoldEventPixel(red, green, blue, alpha)) goldPixels += 1;
    if (isCardColorPixel(red, green, blue, alpha)) colorPixels += 1;
  }

  return {
    darkRatio: sampledPixels > 0 ? darkPixels / sampledPixels : 0,
    brightRatio: sampledPixels > 0 ? brightPixels / sampledPixels : 0,
    purpleRatio: sampledPixels > 0 ? purplePixels / sampledPixels : 0,
    goldRatio: sampledPixels > 0 ? goldPixels / sampledPixels : 0,
    colorRatio: sampledPixels > 0 ? colorPixels / sampledPixels : 0,
    sampledPixels,
  };
}

function detectAugmentChoice(
  measure: (rect: GoldenSpatulaPipelineRect) => RectSignal,
): GoldenSpatulaSpecialEventDetection | undefined {
  const cardRects: GoldenSpatulaPipelineRect[] = [
    [110, 30, 330, 500],
    [475, 30, 330, 500],
    [840, 30, 330, 500],
  ];
  const cards = cardRects.map(measure);
  const buttonStrip = measure([210, 480, 860, 80]);
  const bottomCenter = measure([520, 585, 240, 70]);
  const visibleCards = cards.filter(
    (signal) =>
      signal.darkRatio >= 0.55 &&
      signal.purpleRatio >= 0.12 &&
      signal.colorRatio >= 0.22,
  ).length;
  const relaxedAnimatedCards = cards.filter(
    (signal) =>
      signal.darkRatio >= 0.48 &&
      signal.purpleRatio >= 0.16 &&
      signal.colorRatio >= 0.28 &&
      signal.brightRatio >= 0.01,
  ).length;
  const hasRerollStrip = buttonStrip.darkRatio >= 0.86 && buttonStrip.colorRatio <= 0.07;
  const hasBottomConfirm = bottomCenter.darkRatio >= 0.86 && bottomCenter.colorRatio <= 0.05;
  const hasCardLayout = visibleCards >= 3 || relaxedAnimatedCards >= 3;

  if (!hasCardLayout || !hasRerollStrip || !hasBottomConfirm) return undefined;

  const confidence =
    cards.reduce(
      (sum, signal) =>
        sum + clampRatio(signal.purpleRatio / 0.2) * 0.38 + clampRatio(signal.darkRatio / 0.7) * 0.28,
      0,
    ) /
      3 +
    clampRatio(buttonStrip.darkRatio / 0.95) * 0.2 +
    clampRatio(bottomCenter.darkRatio / 0.95) * 0.14;

  return { type: 'augmentChoice', confidence: clampRatio(confidence) };
}

function detectDeityDuel(
  measure: (rect: GoldenSpatulaPipelineRect) => RectSignal,
): GoldenSpatulaSpecialEventDetection | undefined {
  const left = measure([395, 185, 215, 285]);
  const right = measure([675, 185, 215, 285]);
  const vsArea = measure([610, 285, 70, 90]);
  const titleArea = measure([380, 82, 520, 55]);

  const sideCardsVisible =
    left.darkRatio >= 0.78 &&
    right.darkRatio >= 0.78 &&
    left.colorRatio + right.colorRatio >= 0.24;
  const titleOrVsVisible =
    titleArea.brightRatio + titleArea.goldRatio >= 0.08 &&
    vsArea.brightRatio + vsArea.purpleRatio >= 0.08;

  if (!sideCardsVisible || !titleOrVsVisible) return undefined;

  const confidence =
    clampRatio((left.darkRatio + right.darkRatio) / 1.8) * 0.32 +
    clampRatio((left.colorRatio + right.colorRatio) / 0.32) * 0.24 +
    clampRatio((vsArea.brightRatio + vsArea.purpleRatio) / 0.18) * 0.26 +
    clampRatio((titleArea.brightRatio + titleArea.goldRatio) / 0.12) * 0.18;

  return { type: 'deityDuel', confidence: clampRatio(confidence) };
}

function detectDarkDeityDuel(
  measure: (rect: GoldenSpatulaPipelineRect) => RectSignal,
  screenSignal: RectSignal,
): GoldenSpatulaSpecialEventDetection | undefined {
  const left = measure([395, 185, 215, 285]);
  const right = measure([675, 185, 215, 285]);
  const vsArea = measure([610, 285, 70, 90]);
  const wideTitle = measure([300, 72, 680, 80]);
  const centerPanel = measure([300, 160, 680, 390]);

  const sideContent =
    left.colorRatio +
    right.colorRatio +
    left.purpleRatio +
    right.purpleRatio +
    left.goldRatio +
    right.goldRatio;
  const vsSignal = vsArea.brightRatio + vsArea.purpleRatio;
  const titleSignal = wideTitle.brightRatio + wideTitle.goldRatio;

  const hasDarkDuelOverlay =
    screenSignal.darkRatio >= 0.82 &&
    centerPanel.darkRatio >= 0.88 &&
    left.darkRatio >= 0.82 &&
    right.darkRatio >= 0.82 &&
    vsSignal >= 0.08 &&
    titleSignal >= 0.035 &&
    sideContent >= 0.08;

  if (!hasDarkDuelOverlay) return undefined;

  const confidence =
    clampRatio(centerPanel.darkRatio / 0.94) * 0.22 +
    clampRatio(Math.min(left.darkRatio, right.darkRatio) / 0.9) * 0.22 +
    clampRatio(vsSignal / 0.18) * 0.28 +
    clampRatio(titleSignal / 0.12) * 0.14 +
    clampRatio(sideContent / 0.2) * 0.14;

  return { type: 'deityDuel', confidence: clampRatio(confidence) };
}

function detectCenteredChoiceItemArmory(
  measure: (rect: GoldenSpatulaPipelineRect) => RectSignal,
  screenSignal: RectSignal,
): GoldenSpatulaSpecialEventDetection | undefined {
  const panel = measure([120, 455, 1040, 230]);
  const panelTitle = measure([430, 490, 420, 45]);
  const compactChoiceStrip = measure([120, 585, 1040, 95]);
  const leftHud = measure([0, 80, 125, 400]);
  const rightHud = measure([1120, 80, 150, 520]);
  const hasGameplayHud = leftHud.darkRatio < 0.95 || rightHud.darkRatio < 0.95;

  const wideFiveChoiceSlots: GoldenSpatulaPipelineRect[] = [
    [150, 535, 150, 125],
    [340, 535, 150, 125],
    [530, 535, 150, 125],
    [720, 535, 150, 125],
    [910, 535, 150, 125],
  ];
  const wideFourChoiceSlots: GoldenSpatulaPipelineRect[] = [
    [210, 535, 170, 125],
    [430, 535, 170, 125],
    [650, 535, 170, 125],
    [870, 535, 170, 125],
  ];
  const wideThreeChoiceSlots: GoldenSpatulaPipelineRect[] = [
    [250, 535, 185, 125],
    [545, 535, 185, 125],
    [840, 535, 185, 125],
  ];

  const relaxedVisible = (rect: GoldenSpatulaPipelineRect) => {
    const signal = measure(rect);
    return (
      signal.darkRatio >= 0.55 &&
      (signal.colorRatio >= 0.025 ||
        signal.brightRatio >= 0.01 ||
        signal.goldRatio >= 0.004 ||
        signal.purpleRatio >= 0.004)
    );
  };
  const colorfulVisible = (rect: GoldenSpatulaPipelineRect) => {
    const signal = measure(rect);
    return (
      signal.darkRatio >= 0.35 &&
      (signal.colorRatio >= 0.08 ||
        signal.brightRatio >= 0.025 ||
        signal.goldRatio >= 0.008 ||
        signal.purpleRatio >= 0.01)
    );
  };
  const countVisible = (
    slots: GoldenSpatulaPipelineRect[],
    predicate: (rect: GoldenSpatulaPipelineRect) => boolean,
  ) => slots.reduce((count, rect) => count + (predicate(rect) ? 1 : 0), 0);

  const relaxedFive = countVisible(wideFiveChoiceSlots, relaxedVisible);
  const relaxedFour = countVisible(wideFourChoiceSlots, relaxedVisible);
  const relaxedThree = countVisible(wideThreeChoiceSlots, relaxedVisible);
  const colorfulFive = countVisible(wideFiveChoiceSlots, colorfulVisible);
  const colorfulFour = countVisible(wideFourChoiceSlots, colorfulVisible);
  const colorfulThree = countVisible(wideThreeChoiceSlots, colorfulVisible);

  const hasDarkCenteredChoice =
    compactChoiceStrip.darkRatio >= 0.82 &&
    compactChoiceStrip.colorRatio <= 0.055 &&
    panel.darkRatio >= 0.58 &&
    panelTitle.darkRatio >= 0.52;
  const hasColorTitleChoice =
    compactChoiceStrip.darkRatio >= 0.82 &&
    compactChoiceStrip.colorRatio <= 0.065 &&
    panel.darkRatio >= 0.54 &&
    panel.colorRatio <= 0.45 &&
    (panelTitle.purpleRatio >= 0.08 ||
      panelTitle.brightRatio >= 0.18 ||
      (panelTitle.colorRatio >= 0.75 &&
        panel.purpleRatio >= 0.06 &&
        compactChoiceStrip.colorRatio <= 0.055));
  const hasMediumStrongTitleChoice =
    compactChoiceStrip.darkRatio >= 0.7 &&
    compactChoiceStrip.colorRatio <= 0.065 &&
    panel.darkRatio >= 0.58 &&
    panelTitle.darkRatio >= 0.58 &&
    (panelTitle.goldRatio >= 0.03 ||
      panelTitle.brightRatio >= 0.04 ||
      panelTitle.purpleRatio >= 0.025);
  const hasCenteredChoicePanel =
    screenSignal.darkRatio >= 0.38 &&
    panel.darkRatio >= 0.54 &&
    compactChoiceStrip.darkRatio - panel.darkRatio >= 0.03 &&
    panel.colorRatio >= 0.07 &&
    (hasDarkCenteredChoice || hasColorTitleChoice || hasMediumStrongTitleChoice);
  const hasRelaxedChoices =
    relaxedFive >= 3 ||
    relaxedFour >= 3 ||
    relaxedThree >= 3;
  const hasColorfulChoices =
    colorfulFive >= 4 ||
    colorfulFour >= 4 ||
    colorfulThree >= 3;
  const hasVisibleChoices =
    (hasDarkCenteredChoice && hasRelaxedChoices) ||
    (hasColorTitleChoice && hasColorfulChoices) ||
    (hasMediumStrongTitleChoice &&
      (hasRelaxedChoices || colorfulFive >= 3 || colorfulFour >= 3));

  if (!hasGameplayHud || !hasCenteredChoicePanel || !hasVisibleChoices) return undefined;

  const visibleRatio = Math.max(
    relaxedFive / 5,
    relaxedFour / 4,
    relaxedThree / 3,
    colorfulFive / 5,
    colorfulFour / 4,
    colorfulThree / 3,
  );
  const confidence =
    clampRatio(panel.darkRatio / 0.76) * 0.28 +
    clampRatio(compactChoiceStrip.darkRatio / 0.9) * 0.22 +
    clampRatio(panel.colorRatio / 0.24) * 0.25 +
    clampRatio(visibleRatio) * 0.25;

  return { type: 'itemArmory', confidence: clampRatio(confidence) };
}

function detectItemArmory(
  measure: (rect: GoldenSpatulaPipelineRect) => RectSignal,
  screenSignal: RectSignal,
): GoldenSpatulaSpecialEventDetection | undefined {
  const panel = measure([120, 455, 1040, 230]);
  const panelTitle = measure([430, 490, 420, 45]);
  const compactThreeChoiceStrip = measure([120, 585, 1040, 95]);
  const bottomHud = measure([0, 640, 1280, 80]);
  const centerScene = measure([180, 120, 920, 300]);
  const itemSlots: GoldenSpatulaPipelineRect[] = [
    [235, 535, 120, 125],
    [380, 535, 120, 125],
    [525, 535, 120, 125],
    [670, 535, 120, 125],
    [815, 535, 120, 125],
  ];
  const threeChoiceSlots: GoldenSpatulaPipelineRect[] = [
    [430, 535, 170, 135],
    [610, 535, 170, 135],
    [790, 535, 170, 135],
  ];
  const wideFiveChoiceSlots: GoldenSpatulaPipelineRect[] = [
    [120, 535, 150, 125],
    [315, 535, 150, 125],
    [510, 535, 150, 125],
    [705, 535, 150, 125],
    [900, 535, 150, 125],
  ];
  const wideFourChoiceSlots: GoldenSpatulaPipelineRect[] = [
    [175, 535, 155, 125],
    [405, 535, 155, 125],
    [635, 535, 155, 125],
    [865, 535, 155, 125],
  ];
  const wideTwoChoiceSlots: GoldenSpatulaPipelineRect[] = [
    [330, 535, 180, 135],
    [575, 535, 180, 135],
    [820, 535, 180, 135],
  ];
  const visibleItems = itemSlots
    .map(measure)
    .filter(
      (signal) =>
        signal.darkRatio >= 0.8 &&
        (signal.colorRatio >= 0.01 || signal.purpleRatio >= 0.008 || signal.goldRatio >= 0.003),
    ).length;
  const threeChoiceSignals = threeChoiceSlots.map(measure);
  const visibleThreeChoiceItems = threeChoiceSignals.filter(
    (signal) => signal.darkRatio >= 0.7 && signal.colorRatio >= 0.16 && signal.purpleRatio >= 0.06,
  ).length;
  const visibleCompactThreeChoiceItems = threeChoiceSignals.filter(
    (signal) =>
      signal.darkRatio >= 0.8 &&
      signal.brightRatio >= 0.018 &&
      (signal.colorRatio >= 0.004 || signal.purpleRatio >= 0.004 || signal.goldRatio >= 0.001),
  ).length;
  const wideFiveChoiceSignals = wideFiveChoiceSlots.map(measure);
  const visibleWideFiveChoiceItems = wideFiveChoiceSignals.filter(
      (signal) =>
        signal.darkRatio >= 0.82 &&
        (signal.colorRatio >= 0.03 || signal.purpleRatio >= 0.02 || signal.goldRatio >= 0.006),
  ).length;
  const visibleGoldFiveChoiceItems = wideFiveChoiceSignals.filter(
    (signal) =>
      signal.darkRatio >= 0.45 &&
      (signal.colorRatio >= 0.035 || signal.goldRatio >= 0.014 || signal.purpleRatio >= 0.008),
  ).length;
  const visibleWideFourChoiceItems = wideFourChoiceSlots
    .map(measure)
    .filter(
      (signal) =>
        (signal.darkRatio >= 0.68 &&
          (signal.colorRatio >= 0.12 || signal.purpleRatio >= 0.04 || signal.goldRatio >= 0.01)) ||
        (signal.darkRatio >= 0.62 && signal.colorRatio >= 0.2 && signal.purpleRatio >= 0.02),
    ).length;
  const visiblePurpleTwoChoiceItems = wideTwoChoiceSlots
    .map(measure)
    .filter((signal) => signal.purpleRatio >= 0.5 && signal.colorRatio >= 0.65 && signal.darkRatio <= 0.35)
    .length;
  const hasBottomSpecialChoicePanel =
    panel.darkRatio >= 0.72 &&
    panel.colorRatio >= 0.1 &&
    (panelTitle.darkRatio >= 0.42 || panelTitle.brightRatio >= 0.02 || panelTitle.goldRatio >= 0.01) &&
    (panel.purpleRatio >= 0.018 ||
      panelTitle.purpleRatio >= 0.035 ||
      panelTitle.goldRatio >= 0.015 ||
      panelTitle.colorRatio >= 0.16);
  const hasCompactThreeChoicePanel =
    panel.darkRatio >= 0.74 &&
    panel.colorRatio >= 0.055 &&
    panel.colorRatio <= 0.22 &&
    compactThreeChoiceStrip.darkRatio >= 0.9 &&
    panelTitle.darkRatio >= 0.5;
  const hasGoldFiveChoicePanel =
    panel.darkRatio >= 0.58 &&
    panel.darkRatio <= 0.72 &&
    panel.colorRatio >= 0.055 &&
    panel.colorRatio <= 0.12 &&
    panelTitle.darkRatio >= 0.5 &&
    panelTitle.goldRatio >= 0.025;
  const hasPurpleChoicePanel =
    panel.darkRatio >= 0.2 &&
    panel.darkRatio <= 0.5 &&
    panel.purpleRatio >= 0.45 &&
    panel.colorRatio >= 0.5 &&
    panelTitle.purpleRatio >= 0.5 &&
    compactThreeChoiceStrip.purpleRatio >= 0.5;
  const hasBrightBottomChoicePanel =
    panel.darkRatio >= 0.62 &&
    panel.colorRatio >= 0.12 &&
    compactThreeChoiceStrip.darkRatio >= 0.72 &&
    compactThreeChoiceStrip.colorRatio >= 0.09 &&
    panelTitle.darkRatio >= 0.45 &&
    (panelTitle.brightRatio >= 0.08 || panelTitle.purpleRatio >= 0.04);
  const hasSpecialChoicePanel =
    hasBottomSpecialChoicePanel ||
    hasCompactThreeChoicePanel ||
    hasGoldFiveChoicePanel ||
    hasPurpleChoicePanel ||
    hasBrightBottomChoicePanel;
  const hasPureBottomCinematic =
    bottomHud.colorRatio < 0.006 &&
    compactThreeChoiceStrip.darkRatio >= 0.98 &&
    panelTitle.darkRatio < 0.42 &&
    panelTitle.brightRatio < 0.02 &&
    panelTitle.goldRatio < 0.01;
  const hasBlackShopInterruption =
    centerScene.darkRatio >= 0.95 &&
    centerScene.colorRatio <= 0.02 &&
    panel.colorRatio <= 0.05;
  const hasVisibleChoices =
    visibleItems >= 4 ||
    visibleThreeChoiceItems >= 3 ||
    (hasCompactThreeChoicePanel && visibleCompactThreeChoiceItems >= 3) ||
    (hasGoldFiveChoicePanel && visibleGoldFiveChoiceItems >= 5) ||
    (hasPurpleChoicePanel && visiblePurpleTwoChoiceItems >= 2) ||
    visibleWideFiveChoiceItems >= 5 ||
    ((hasBottomSpecialChoicePanel || hasBrightBottomChoicePanel) && visibleWideFourChoiceItems >= 4);

  if (
    screenSignal.darkRatio < 0.34 ||
    hasPureBottomCinematic ||
    hasBlackShopInterruption ||
    (!hasSpecialChoicePanel && panel.darkRatio < 0.74) ||
    !hasVisibleChoices
  ) {
    return undefined;
  }
  const visibleRatio = Math.max(
    visibleItems / 4,
    visibleThreeChoiceItems / 3,
    visibleCompactThreeChoiceItems / 3,
    visibleGoldFiveChoiceItems / 5,
    visiblePurpleTwoChoiceItems / 2,
    visibleWideFiveChoiceItems / 5,
    visibleWideFourChoiceItems / 4,
  );

  const confidence =
    clampRatio(screenSignal.darkRatio / 0.55) * 0.2 +
    clampRatio(panel.darkRatio / 0.88) * 0.28 +
    clampRatio(visibleRatio) * 0.42 +
    (hasSpecialChoicePanel ? 0.1 : 0);

  return { type: 'itemArmory', confidence: clampRatio(confidence) };
}

function detectRewardBlessing(
  measure: (rect: GoldenSpatulaPipelineRect) => RectSignal,
  screenSignal: RectSignal,
): GoldenSpatulaSpecialEventDetection | undefined {
  const panel = measure([145, 485, 990, 200]);
  const panelCore = measure([330, 500, 620, 170]);
  const titleArea = measure([410, 450, 460, 58]);
  const rewardSlots: GoldenSpatulaPipelineRect[] = [
    [185, 540, 260, 110],
    [510, 540, 260, 110],
    [835, 540, 260, 110],
  ];
  const visibleRewards = rewardSlots
    .map(measure)
    .filter(
      (signal) =>
        signal.darkRatio >= 0.8 && (signal.colorRatio >= 0.035 || signal.purpleRatio >= 0.02),
    ).length;
  const hasEventPanelSignal =
    panel.colorRatio >= 0.07 || titleArea.colorRatio >= 0.02 || titleArea.brightRatio >= 0.02;

  if (
    screenSignal.darkRatio < 0.34 ||
    panel.darkRatio < 0.74 ||
    panelCore.purpleRatio < 0.015 ||
    !hasEventPanelSignal ||
    visibleRewards < 3
  ) {
    return undefined;
  }

  const confidence =
    clampRatio(screenSignal.darkRatio / 0.55) * 0.2 +
    clampRatio(panel.darkRatio / 0.88) * 0.36 +
    clampRatio(visibleRewards / 3) * 0.44;

  return { type: 'rewardBlessing', confidence: clampRatio(confidence) };
}

function detectSettlement(
  measure: (rect: GoldenSpatulaPipelineRect) => RectSignal,
  screenSignal: RectSignal,
): GoldenSpatulaSpecialEventDetection | undefined {
  const rankArea = measure([505, 270, 270, 90]);
  const finalRankPanel = measure([110, 105, 500, 420]);
  const finalRankText = measure([135, 125, 360, 210]);

  const victoryVisible =
    screenSignal.darkRatio >= 0.38 &&
    rankArea.darkRatio >= 0.25 &&
    rankArea.darkRatio <= 0.6 &&
    rankArea.purpleRatio <= 0.025 &&
    rankArea.brightRatio + rankArea.goldRatio >= 0.16;
  if (victoryVisible) {
    const confidence =
      clampRatio(screenSignal.darkRatio / 0.62) * 0.22 +
      clampRatio((rankArea.brightRatio + rankArea.goldRatio) / 0.2) * 0.48 +
      clampRatio((0.6 - rankArea.darkRatio) / 0.35) * 0.3;

    return { type: 'settlement', confidence: clampRatio(confidence) };
  }

  const rankBannerVisible =
    screenSignal.darkRatio >= 0.22 &&
    rankArea.darkRatio >= 0.3 &&
    rankArea.darkRatio <= 0.48 &&
    rankArea.colorRatio >= 0.45 &&
    rankArea.brightRatio >= 0.045 &&
    rankArea.goldRatio <= 0.025 &&
    rankArea.purpleRatio <= 0.035;
  if (rankBannerVisible) {
    const rankBannerConfidence =
      clampRatio((rankArea.colorRatio - 0.42) / 0.24) * 0.34 +
      clampRatio((rankArea.brightRatio - 0.038) / 0.05) * 0.28 +
      clampRatio((0.5 - rankArea.darkRatio) / 0.22) * 0.22 +
      clampRatio(screenSignal.darkRatio / 0.45) * 0.16;

    return { type: 'settlement', confidence: clampRatio(rankBannerConfidence) };
  }

  const finalRankScreenVisible =
    screenSignal.darkRatio >= 0.42 &&
    screenSignal.darkRatio <= 0.62 &&
    rankArea.goldRatio >= 0.07 &&
    finalRankPanel.darkRatio >= 0.72 &&
    finalRankPanel.colorRatio <= 0.08 &&
    finalRankPanel.brightRatio >= 0.03 &&
    finalRankText.darkRatio >= 0.8 &&
    finalRankText.brightRatio >= 0.05 &&
    finalRankText.colorRatio <= 0.06;
  if (finalRankScreenVisible) {
    const finalRankConfidence =
      clampRatio((rankArea.goldRatio - 0.06) / 0.08) * 0.36 +
      clampRatio((finalRankPanel.darkRatio - 0.68) / 0.22) * 0.24 +
      clampRatio((finalRankText.brightRatio - 0.04) / 0.08) * 0.24 +
      clampRatio((0.1 - finalRankPanel.colorRatio) / 0.1) * 0.16;

    return { type: 'settlement', confidence: clampRatio(finalRankConfidence) };
  }
}

export function detectGoldenSpatulaSpecialEventsFromLoadedImage(
  image: HTMLImageElement,
): GoldenSpatulaSpecialEventVisionResult {
  const startedAt = nowMs();
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return { events: [] };

  let roiCount = 0;
  let sampledPixels = 0;
  const measure = (rect: GoldenSpatulaPipelineRect): RectSignal => {
    const signal = measureRectSignal(image, canvas, context, rect);
    roiCount += 1;
    sampledPixels += signal.sampledPixels;
    return signal;
  };

  const screenSignal = measure([0, 0, 1280, 720]);
  // Keep this order intentional:
  // settlement and center-screen choice events are more visually distinctive;
  // reward/blessing is narrower than item/armory, so keep it first when both occupy the bottom panel.
  const detectors = [
    () => detectSettlement(measure, screenSignal),
    () => detectAugmentChoice(measure),
    () => detectDeityDuel(measure),
    () => detectDarkDeityDuel(measure, screenSignal),
    () => detectRewardBlessing(measure, screenSignal),
    () => detectCenteredChoiceItemArmory(measure, screenSignal),
    () => detectItemArmory(measure, screenSignal),
  ];
  let best: GoldenSpatulaSpecialEventDetection | undefined;
  for (const detector of detectors) {
    best = detector();
    if (best && best.confidence >= specialEventMinConfidence) break;
    best = undefined;
  }

  return {
    events: best ? [best] : [],
    metrics: {
      algorithm: 'roi-color-gates-v1',
      totalMs: nowMs() - startedAt,
      roiCount,
      sampledPixels,
    },
  };
}

export async function detectGoldenSpatulaSpecialEventsFromDataUrl(
  dataUrl: string,
): Promise<GoldenSpatulaSpecialEventVisionResult> {
  if (!dataUrl.startsWith('data:image/') || typeof document === 'undefined') {
    return { events: [] };
  }

  const image = await loadImage(dataUrl);
  return detectGoldenSpatulaSpecialEventsFromLoadedImage(image);
}

