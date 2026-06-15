import type {
  GoldenSpatulaShopCost,
  GoldenSpatulaShopOddsByCost,
  GoldenSpatulaShopOddsSource,
} from '@/types/goldenSpatula';
import {
  getGoldenSpatulaShopOddsDisplayText,
  getGoldenSpatulaShopOddsByLevel,
  goldenSpatulaShopOddsCosts,
  resolveGoldenSpatulaShopOdds,
} from './goldenSpatulaShopOdds';

export interface GoldenSpatulaEconomyVisionResult {
  round?: string;
  gold?: number;
  level?: number;
  experience?: number;
  experienceMax?: number;
  streakKind?: GoldenSpatulaEconomyVisionStreakKind;
  streakInterest?: number;
  shopOdds?: GoldenSpatulaShopOddsByCost;
  shopOddsSource?: GoldenSpatulaShopOddsSource;
  rawText: {
    round?: string;
    gold?: string;
    level?: string;
    experience?: string;
    streak?: string;
    shopOdds?: Partial<Record<GoldenSpatulaShopCost, string>>;
  };
}

export interface GoldenSpatulaEconomyImageData {
  data: Uint8Array | Uint8ClampedArray;
  width: number;
  height: number;
}

export type GoldenSpatulaEconomyVisionStreakKind = 'win' | 'loss' | 'none' | 'unknown';

type EconomyField = 'round' | 'gold' | 'level' | 'experience' | 'streak';

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface GlyphComponent {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  activePixels: number;
}

interface ClassifiedDigit {
  digit: string;
  score: number;
  component: GlyphComponent;
}

interface ParsedExperience {
  text: string;
  current?: number;
  max?: number;
}

interface ParsedStreak {
  text: string;
  kind: GoldenSpatulaEconomyVisionStreakKind;
  interest?: number;
}

const BASE_WIDTH = 1280;
const BASE_HEIGHT = 720;

const economyRects: Record<EconomyField, Rect> = {
  round: { x: 500, y: 6, width: 70, height: 28 },
  gold: { x: 620, y: 540, width: 60, height: 24 },
  level: { x: 180, y: 540, width: 18, height: 22 },
  experience: { x: 250, y: 548, width: 65, height: 16 },
  streak: { x: 720, y: 532, width: 70, height: 42 },
};

const roundCandidateRects: Rect[] = [
  { x: 420, y: 0, width: 80, height: 34 },
  { x: 430, y: 0, width: 64, height: 34 },
  economyRects.round,
  { x: 488, y: 0, width: 82, height: 34 },
  { x: 488, y: 2, width: 94, height: 30 },
  { x: 472, y: 0, width: 126, height: 34 },
  { x: 448, y: 0, width: 172, height: 40 },
];

const shopOddsCostRects: Record<GoldenSpatulaShopCost, Rect> = {
  1: { x: 321, y: 548, width: 30, height: 22 },
  2: { x: 362, y: 548, width: 30, height: 22 },
  3: { x: 402, y: 548, width: 28, height: 22 },
  4: { x: 442, y: 548, width: 28, height: 22 },
  5: { x: 483, y: 548, width: 28, height: 22 },
};

const reliableExperienceMaxValues = new Set([2, 6, 10, 20, 36, 56, 60, 68, 80]);

const digitTemplates: Record<string, string[][]> = {
  '0': [
    [
      '00111110',
      '01111111',
      '01100111',
      '11100011',
      '11100011',
      '11100011',
      '11100011',
      '11100011',
      '11100011',
      '11110111',
      '01111110',
      '00111110',
    ],
    [
      '00111100',
      '01111110',
      '01100111',
      '11000111',
      '11000011',
      '11000011',
      '11000011',
      '11000011',
      '11100111',
      '01111110',
      '01111110',
      '00111100',
    ],
    [
      '00111110',
      '01111110',
      '01100111',
      '01100011',
      '11000011',
      '11000011',
      '11100011',
      '11100011',
      '01100011',
      '01111111',
      '01111110',
      '00011100',
    ],
    [
      '00111100',
      '01111110',
      '01111111',
      '11100111',
      '11100111',
      '11100111',
      '11100111',
      '11100111',
      '11100111',
      '01111110',
      '01111110',
      '00111100',
    ],
    [
      '00111100',
      '00111111',
      '01111111',
      '01100111',
      '01100111',
      '01100111',
      '11100111',
      '11100111',
      '01100111',
      '01100111',
      '00111111',
      '00111110',
    ],
  ],
  '1': [
    [
      '00111111',
      '11111111',
      '11111111',
      '11111111',
      '00001111',
      '00001111',
      '00001111',
      '00001111',
      '00001111',
      '00111111',
      '00111111',
      '00111111',
    ],
    [
      '00011100',
      '00111100',
      '01111100',
      '00011100',
      '00011100',
      '00011100',
      '00011100',
      '00011100',
      '00011100',
      '00011100',
      '01111110',
      '01111110',
    ],
    [
      '00001111',
      '00111111',
      '11111111',
      '11111111',
      '00001111',
      '00001111',
      '00001111',
      '00001111',
      '00001111',
      '00001111',
      '00111111',
      '00111111',
    ],
    [
      '00000111',
      '00111111',
      '11111111',
      '11111111',
      '00111111',
      '00111111',
      '00111111',
      '00111111',
      '00111111',
      '00111111',
      '00111111',
      '00111111',
    ],
  ],
  '2': [
    [
      '00001000',
      '01111110',
      '11000111',
      '11000011',
      '11100011',
      '01000110',
      '00000110',
      '00001100',
      '00011000',
      '00110000',
      '01111111',
      '11111111',
    ],
    [
      '00111100',
      '01111110',
      '11101111',
      '11100111',
      '11100111',
      '00000110',
      '00001100',
      '00011100',
      '00111000',
      '01111111',
      '11111111',
      '11111111',
    ],
    [
      '01111110',
      '11111111',
      '11000111',
      '11100111',
      '11100111',
      '01001110',
      '00001100',
      '00011100',
      '00111000',
      '01111111',
      '11111111',
      '11111111',
    ],
    [
      '00001110',
      '00001111',
      '00001111',
      '11000011',
      '10000011',
      '00000011',
      '00001110',
      '00001110',
      '00011110',
      '01111000',
      '01111111',
      '01111111',
    ],
  ],
  '3': [
    [
      '11111100',
      '11111101',
      '00011001',
      '00111001',
      '00110000',
      '01111000',
      '01111101',
      '00011101',
      '11001101',
      '11011100',
      '11111001',
      '11111001',
    ],
    [
      '01111111',
      '01111111',
      '00001110',
      '00001100',
      '00011000',
      '00111110',
      '00111111',
      '00000111',
      '01000011',
      '11100111',
      '11111110',
      '01111100',
    ],
  ],
  '4': [
    [
      '00001110',
      '00001110',
      '00111110',
      '00110110',
      '01110110',
      '01100110',
      '01100110',
      '11111111',
      '11111111',
      '00000110',
      '00000110',
      '00000110',
    ],
    [
      '00001110',
      '00011110',
      '00111110',
      '00110110',
      '01110110',
      '01100110',
      '11000110',
      '11111111',
      '11111111',
      '00000110',
      '00000110',
      '00000110',
    ],
  ],
  '5': [
    [
      '11111111',
      '11111111',
      '11111111',
      '11100000',
      '11100000',
      '11100000',
      '11100000',
      '11100000',
      '11100000',
      '11111100',
      '11111110',
      '11111110',
    ],
    [
      '01111110',
      '01111110',
      '01100000',
      '01100000',
      '01111100',
      '01111110',
      '00001111',
      '00000111',
      '11000111',
      '11111111',
      '11111110',
      '00111100',
    ],
    [
      '01111000',
      '01110000',
      '01110000',
      '01110000',
      '01110000',
      '00100111',
      '00000111',
      '00000011',
      '10000011',
      '11000011',
      '11111111',
      '01111110',
    ],
  ],
  '6': [
    [
      '00011110',
      '00111110',
      '01111000',
      '01110000',
      '11111110',
      '11111110',
      '11100111',
      '11100111',
      '11100111',
      '11110111',
      '01111110',
      '00111100',
    ],
    [
      '00111110',
      '01111100',
      '01111000',
      '11111100',
      '11111111',
      '11111111',
      '11110111',
      '11100011',
      '11100011',
      '11100111',
      '11111111',
      '11111111',
    ],
    [
      '00011100',
      '00111100',
      '00111000',
      '01111100',
      '01111110',
      '11111111',
      '11100011',
      '11100011',
      '11100011',
      '01111111',
      '01111110',
      '00111100',
    ],
  ],
  '7': [
    [
      '11111111',
      '11111111',
      '00000111',
      '00001110',
      '00001100',
      '00011100',
      '00011000',
      '00111000',
      '00110000',
      '01110000',
      '01100000',
      '01100000',
    ],
    [
      '00001111',
      '00001111',
      '00001100',
      '00001100',
      '00001100',
      '00111100',
      '00110000',
      '00110000',
      '11110000',
      '11110000',
      '11110000',
      '11000000',
    ],
  ],
  '8': [
    [
      '00111100',
      '01111110',
      '11100111',
      '11100111',
      '01111110',
      '00111100',
      '01111110',
      '11100111',
      '11100111',
      '11100111',
      '01111110',
      '00111100',
    ],
  ],
  '9': [
    [
      '00011000',
      '01111100',
      '11111110',
      '11111111',
      '11101111',
      '11001111',
      '11000111',
      '11000111',
      '11000111',
      '11000111',
      '11100111',
      '11101111',
    ],
  ],
};

digitTemplates['3'].push([
  '01111110',
  '01111110',
  '00001100',
  '00011100',
  '00011100',
  '00011110',
  '00001110',
  '00000111',
  '11000111',
  '11111110',
  '11111110',
  '00111000',
]);

digitTemplates['9'].push([
  '00011000',
  '01111110',
  '01000110',
  '11000011',
  '11000011',
  '11000011',
  '01111111',
  '00111110',
  '00000110',
  '00001100',
  '00011000',
  '00110000',
]);

function createImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to load screenshot image'));
    image.src = dataUrl;
  });
}

function scaleRect(rect: Rect, width: number, height: number): Rect {
  const scaleX = width / BASE_WIDTH;
  const scaleY = height / BASE_HEIGHT;
  return {
    x: Math.round(rect.x * scaleX),
    y: Math.round(rect.y * scaleY),
    width: Math.max(1, Math.round(rect.width * scaleX)),
    height: Math.max(1, Math.round(rect.height * scaleY)),
  };
}

function getFullImageData(image: HTMLImageElement): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    throw new Error('Canvas 2D context is unavailable');
  }
  context.drawImage(image, 0, 0);
  return context.getImageData(0, 0, canvas.width, canvas.height);
}

function cropImageData(
  imageData: GoldenSpatulaEconomyImageData,
  rect: Rect,
): GoldenSpatulaEconomyImageData {
  const source = imageData.data;
  const cropped = new Uint8ClampedArray(rect.width * rect.height * 4);

  for (let y = 0; y < rect.height; y += 1) {
    const sourceY = rect.y + y;
    for (let x = 0; x < rect.width; x += 1) {
      const sourceX = rect.x + x;
      const targetOffset = (y * rect.width + x) * 4;
      const sourceOffset = (sourceY * imageData.width + sourceX) * 4;
      cropped[targetOffset] = source[sourceOffset] ?? 0;
      cropped[targetOffset + 1] = source[sourceOffset + 1] ?? 0;
      cropped[targetOffset + 2] = source[sourceOffset + 2] ?? 0;
      cropped[targetOffset + 3] = source[sourceOffset + 3] ?? 255;
    }
  }

  return {
    data: cropped,
    width: rect.width,
    height: rect.height,
  };
}

function isNeutralGlyphPixel(r: number, g: number, b: number): boolean {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const luma = 0.299 * r + 0.587 * g + 0.114 * b;
  return luma > 145 && max - min < 100 && !(g > 145 && b > 90 && r < 120);
}

function isGlyphPixel(r: number, g: number, b: number): boolean {
  const neutralText = isNeutralGlyphPixel(r, g, b);
  const warmHudText = r > 155 && g > 120 && g < 225 && b < 120;
  return neutralText || warmHudText;
}

function isShopOddsGlyphPixel(r: number, g: number, b: number): boolean {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const luma = 0.299 * r + 0.587 * g + 0.114 * b;
  const dimNeutralText = luma > 88 && max - min < 82;
  const saturatedText = max > 105 && max - min > 34;
  const brightText = luma > 135 && max > 150;
  return dimNeutralText || saturatedText || brightText;
}

function isRoundGlyphPixel(r: number, g: number, b: number): boolean {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const luma = 0.299 * r + 0.587 * g + 0.114 * b;
  const dimNeutralText = luma > 72 && max - min < 78;
  const dimWarmHudText = r > 92 && g > 78 && b < 88 && max - min < 92;
  return isGlyphPixel(r, g, b) || dimNeutralText || dimWarmHudText;
}

function isStreakGlyphPixel(r: number, g: number, b: number): boolean {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const luma = 0.299 * r + 0.587 * g + 0.114 * b;
  return min > 115 && luma > 130 && max - min < 80;
}

function buildMask(
  imageData: GoldenSpatulaEconomyImageData,
  isActivePixel = isGlyphPixel,
): boolean[][] {
  const mask: boolean[][] = [];
  for (let y = 0; y < imageData.height; y += 1) {
    const row: boolean[] = [];
    for (let x = 0; x < imageData.width; x += 1) {
      const offset = (y * imageData.width + x) * 4;
      row.push(
        isActivePixel(
          imageData.data[offset] ?? 0,
          imageData.data[offset + 1] ?? 0,
          imageData.data[offset + 2] ?? 0,
        ),
      );
    }
    mask.push(row);
  }
  return mask;
}

function trimStreakMask(mask: boolean[][]): boolean[][] {
  const height = mask.length;
  const top = Math.floor(height * 0.36);
  const bottom = Math.ceil(height * 0.83);

  return mask.map((row, y) =>
    row.map((value) => value && y >= top && y <= bottom),
  );
}

function buildMaskFromRect(
  imageData: GoldenSpatulaEconomyImageData,
  rect: Rect,
  isActivePixel = isGlyphPixel,
): boolean[][] {
  const mask: boolean[][] = [];
  const source = imageData.data;

  for (let y = 0; y < rect.height; y += 1) {
    const row: boolean[] = [];
    const sourceY = rect.y + y;
    const sourceRowOffset = sourceY * imageData.width * 4;
    const outsideY = sourceY < 0 || sourceY >= imageData.height;

    for (let x = 0; x < rect.width; x += 1) {
      const sourceX = rect.x + x;
      if (outsideY || sourceX < 0 || sourceX >= imageData.width) {
        row.push(false);
        continue;
      }

      const offset = sourceRowOffset + sourceX * 4;
      row.push(
        isActivePixel(
          source[offset] ?? 0,
          source[offset + 1] ?? 0,
          source[offset + 2] ?? 0,
        ),
      );
    }
    mask.push(row);
  }

  return mask;
}

function extractComponents(mask: boolean[][]): GlyphComponent[] {
  const height = mask.length;
  const width = mask[0]?.length ?? 0;
  const activeColumns = Array.from({ length: width }, (_, x) => {
    let count = 0;
    for (let y = 0; y < height; y += 1) {
      if (mask[y]?.[x]) count += 1;
    }
    return count >= 1;
  });

  const components: GlyphComponent[] = [];
  let x = 0;
  while (x < width) {
    while (x < width && !activeColumns[x]) x += 1;
    if (x >= width) break;
    const x0 = x;
    while (x < width && activeColumns[x]) x += 1;
    const x1 = x;

    let y0 = height;
    let y1 = 0;
    let activePixels = 0;
    for (let yy = 0; yy < height; yy += 1) {
      for (let xx = x0; xx < x1; xx += 1) {
        if (mask[yy]?.[xx]) {
          y0 = Math.min(y0, yy);
          y1 = Math.max(y1, yy + 1);
          activePixels += 1;
        }
      }
    }

    if (x1 - x0 >= 1 && y1 - y0 >= 2) {
      components.push({ x0, y0, x1, y1, activePixels });
    }
  }

  return components;
}

function componentWidth(component: GlyphComponent): number {
  return component.x1 - component.x0;
}

function componentHeight(component: GlyphComponent): number {
  return component.y1 - component.y0;
}

function isDigitSized(component: GlyphComponent): boolean {
  const width = componentWidth(component);
  const height = componentHeight(component);
  return width >= 3 && width <= 18 && height >= 8 && height <= 24;
}

function isStreakDigitSized(component: GlyphComponent): boolean {
  const width = componentWidth(component);
  const height = componentHeight(component);
  return width >= 2 && width <= 24 && height >= 8 && height <= 34;
}

function componentToBits(mask: boolean[][], component: GlyphComponent): string[] {
  const rows: string[] = [];
  const width = componentWidth(component);
  const height = componentHeight(component);

  for (let gy = 0; gy < 12; gy += 1) {
    let row = '';
    for (let gx = 0; gx < 8; gx += 1) {
      const xStart = Math.floor(component.x0 + (gx * width) / 8);
      const xEnd = Math.max(xStart + 1, Math.ceil(component.x0 + ((gx + 1) * width) / 8));
      const yStart = Math.floor(component.y0 + (gy * height) / 12);
      const yEnd = Math.max(yStart + 1, Math.ceil(component.y0 + ((gy + 1) * height) / 12));
      let total = 0;
      let active = 0;

      for (let y = yStart; y < yEnd; y += 1) {
        for (let x = xStart; x < xEnd; x += 1) {
          total += 1;
          if (mask[y]?.[x]) active += 1;
        }
      }

      row += active / Math.max(1, total) > 0.18 ? '1' : '0';
    }
    rows.push(row);
  }

  return rows;
}

function templateScore(bits: string[], template: string[]): number {
  let intersection = 0;
  let union = 0;
  let same = 0;
  let total = 0;

  for (let y = 0; y < bits.length; y += 1) {
    for (let x = 0; x < (bits[y]?.length ?? 0); x += 1) {
      const a = bits[y]?.[x] === '1';
      const b = template[y]?.[x] === '1';
      if (a && b) intersection += 1;
      if (a || b) union += 1;
      if (a === b) same += 1;
      total += 1;
    }
  }

  const jaccard = union > 0 ? intersection / union : 0;
  return jaccard * 0.72 + (same / Math.max(1, total)) * 0.28;
}

function classifyDigit(
  mask: boolean[][],
  component: GlyphComponent,
  minScore = 0.46,
  isSized = isDigitSized,
): ClassifiedDigit | null {
  if (!isSized(component)) return null;

  const bits = componentToBits(mask, component);
  let bestDigit = '';
  let bestScore = 0;

  for (const [digit, templates] of Object.entries(digitTemplates)) {
    for (const template of templates) {
      const score = templateScore(bits, template);
      if (score > bestScore) {
        bestDigit = digit;
        bestScore = score;
      }
    }
  }

  if (!bestDigit || bestScore < minScore) return null;
  return { digit: bestDigit, score: bestScore, component };
}

function countComponentPixelsInRegion(
  mask: boolean[][],
  component: GlyphComponent,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): number {
  let count = 0;
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      if (
        x >= component.x0 &&
        x < component.x1 &&
        y >= component.y0 &&
        y < component.y1 &&
        mask[y]?.[x]
      ) {
        count += 1;
      }
    }
  }
  return count;
}

function classifyStreakDigit(
  mask: boolean[][],
  component: GlyphComponent,
): ClassifiedDigit | null {
  const classified = classifyDigit(mask, component, 0.22, isStreakDigitSized);
  const width = componentWidth(component);
  const height = componentHeight(component);
  if (
    classified &&
    (classified.digit === '5' || classified.digit === '6') &&
    component.x0 >= 20 &&
    component.x0 <= 32 &&
    width <= 7 &&
    height <= 10 &&
    component.activePixels <= 38
  ) {
    const correctionXMid = component.x0 + Math.floor(width / 2);
    const correctionYMid = component.y0 + Math.floor(height / 2);
    const upperLeft = countComponentPixelsInRegion(
      mask,
      component,
      component.x0,
      component.y0,
      correctionXMid,
      correctionYMid,
    );
    const upperRight = countComponentPixelsInRegion(
      mask,
      component,
      correctionXMid,
      component.y0,
      component.x1,
      correctionYMid,
    );
    const topRows = countComponentPixelsInRegion(
      mask,
      component,
      component.x0,
      component.y0,
      component.x1,
      component.y0 + 2,
    );
    if (upperLeft >= upperRight && upperLeft - upperRight <= 3 && topRows >= 8) {
      return { digit: '3', score: classified.score, component };
    }
  }

  if (
    classified?.digit === '0' &&
    component.x0 >= 20 &&
    component.x0 <= 32 &&
    width <= 7 &&
    height <= 10
  ) {
    const topRows = countComponentPixelsInRegion(
      mask,
      component,
      component.x0,
      component.y0,
      component.x1,
      component.y0 + 2,
    );
    const bottomRows = countComponentPixelsInRegion(
      mask,
      component,
      component.x0,
      component.y1 - 2,
      component.x1,
      component.y1,
    );
    if (topRows >= 7 && bottomRows <= 6) {
      return { digit: '9', score: classified.score, component };
    }
  }

  if (
    classified?.digit === '6' &&
    component.x0 >= 20 &&
    component.x0 <= 32 &&
    width <= 7 &&
    height <= 10
  ) {
    const correctionXMid = component.x0 + Math.floor(width / 2);
    const correctionYMid = component.y0 + Math.floor(height / 2);
    const lowerLeft = countComponentPixelsInRegion(
      mask,
      component,
      component.x0,
      correctionYMid,
      correctionXMid,
      component.y1,
    );
    const topRows = countComponentPixelsInRegion(
      mask,
      component,
      component.x0,
      component.y0,
      component.x1,
      component.y0 + 2,
    );
    if (lowerLeft <= 4 && topRows >= 6) {
      return { digit: '5', score: classified.score, component };
    }
  }

  if (classified) return classified;
  if (!isStreakDigitSized(component)) return null;

  if (
    component.x0 >= 20 &&
    component.x0 <= 32 &&
    width >= 6 &&
    width <= 9 &&
    height >= 7 &&
    height <= 10 &&
    component.activePixels >= 24
  ) {
    return { digit: '2', score: 0.22, component };
  }

  if (width < 5 || height < 10) return null;

  const xMid = component.x0 + Math.floor(width / 2);
  const yTop = component.y0 + Math.floor(height * 0.3);
  const yMidStart = component.y0 + Math.floor(height * 0.36);
  const yMidEnd = component.y0 + Math.ceil(height * 0.68);
  const yBottom = component.y0 + Math.floor(height * 0.72);

  const topBand = countComponentPixelsInRegion(
    mask,
    component,
    component.x0,
    component.y0,
    component.x1,
    yTop,
  );
  const middleBand = countComponentPixelsInRegion(
    mask,
    component,
    component.x0,
    yMidStart,
    component.x1,
    yMidEnd,
  );
  const bottomBand = countComponentPixelsInRegion(
    mask,
    component,
    component.x0,
    yBottom,
    component.x1,
    component.y1,
  );
  const upperRight = countComponentPixelsInRegion(
    mask,
    component,
    xMid,
    component.y0,
    component.x1,
    yMidEnd,
  );
  const lowerLeft = countComponentPixelsInRegion(
    mask,
    component,
    component.x0,
    yMidStart,
    xMid + 1,
    component.y1,
  );

  if (
    topBand >= 5 &&
    middleBand >= 4 &&
    bottomBand >= 5 &&
    upperRight >= 4 &&
    lowerLeft >= 4
  ) {
    return { digit: '2', score: 0.22, component };
  }

  return null;
}

function isSlashLike(mask: boolean[][], component: GlyphComponent): boolean {
  const width = componentWidth(component);
  const height = componentHeight(component);
  if (width > 7 || height < 7 || component.activePixels > 18) return false;

  const centers: number[] = [];
  for (let y = component.y0; y < component.y1; y += 1) {
    const xs: number[] = [];
    for (let x = component.x0; x < component.x1; x += 1) {
      if (mask[y]?.[x]) xs.push(x);
    }
    if (xs.length > 0) {
      centers.push(xs.reduce((sum, value) => sum + value, 0) / xs.length);
    }
  }

  if (centers.length < 4) return false;
  return Math.abs((centers[centers.length - 1] ?? 0) - centers[0]) >= 2;
}

function toDigitText(digits: ClassifiedDigit[]): string {
  return digits
    .sort((a, b) => a.component.x0 - b.component.x0)
    .map((digit) => digit.digit)
    .join('');
}

function parseInteger(text: string): number | undefined {
  if (!text) return undefined;
  const value = Number.parseInt(text, 10);
  return Number.isFinite(value) ? value : undefined;
}

function parseGold(text: string): number | undefined {
  const value = parseInteger(text);
  if (value === undefined || value < 0 || value > 99) return undefined;
  return value;
}

function parseLevel(text: string): number | undefined {
  const value = parseInteger(text);
  if (value === undefined || value < 1 || value > 11) return undefined;
  return value;
}

function normalizeExperience(
  experience: ParsedExperience | undefined,
): ParsedExperience | undefined {
  if (!experience) return undefined;

  const { current, max } = experience;
  if (current === undefined && max === undefined) return experience;
  if (
    current === undefined ||
    max === undefined ||
    current < 0 ||
    max <= 0 ||
    current > max ||
    !reliableExperienceMaxValues.has(max)
  ) {
    return { text: experience.text };
  }

  return experience;
}

function normalizeStreak(
  streak: ParsedStreak | undefined,
  hasEconomyHud: boolean,
): ParsedStreak | undefined {
  if (!streak) return hasEconomyHud ? { text: '', kind: 'none', interest: 0 } : undefined;
  if (hasEconomyHud && streak.kind === 'none') {
    return {
      text: streak.text,
      kind: 'none',
      interest: 0,
    };
  }

  if (
    !hasEconomyHud ||
    streak.interest === undefined ||
    streak.interest < 0 ||
    streak.interest > 99
  ) {
    if (hasEconomyHud && streak.interest === undefined && streak.text.length === 0) {
      return {
        text: streak.text,
        kind: 'none',
        interest: 0,
      };
    }

    return {
      text: streak.text,
      kind: 'unknown',
    };
  }

  return streak;
}

function hasReliableEconomyHud(
  gold: number | undefined,
  level: number | undefined,
  experience: ParsedExperience | undefined,
): boolean {
  return (
    gold !== undefined ||
    level !== undefined ||
    (experience?.current !== undefined && experience.max !== undefined)
  );
}

function recognizeGold(mask: boolean[][]): string {
  const digits = extractComponents(mask)
    .filter((component) => component.x0 >= 20 && component.x0 <= 54 && component.y0 >= 4)
    .map((component) => classifyDigit(mask, component))
    .filter((digit): digit is ClassifiedDigit => Boolean(digit));

  return toDigitText(digits);
}

function recognizeLevel(mask: boolean[][]): string {
  const digits = extractComponents(mask)
    .filter((component) => component.x0 <= 12 && component.y0 >= 4)
    .map((component) => classifyDigit(mask, component))
    .filter((digit): digit is ClassifiedDigit => Boolean(digit));

  return toDigitText(digits.slice(0, 1));
}

function recognizeRound(mask: boolean[][]): string {
  const digits = extractComponents(mask)
    .filter((component) => component.x0 >= 8 && component.y0 >= 3)
    .map((component) => classifyDigit(mask, component, 0.42))
    .filter((digit): digit is ClassifiedDigit => Boolean(digit))
    .sort((a, b) => a.component.x0 - b.component.x0);
  const text = digits.map((digit) => digit.digit).join('');
  if (text.length >= 2) return `${text[0]}-${text.slice(1, 3)}`;
  return '';
}

function normalizeRoundText(value: string): string | undefined {
  const match = /^([1-9]\d?)-([1-9]\d?)$/u.exec(value);
  if (!match) return undefined;
  const stage = parseInteger(match[1] ?? '');
  const round = parseInteger(match[2] ?? '');
  if (stage === undefined || round === undefined || stage > 9 || round > 7) {
    return undefined;
  }
  if (stage === 1 && round > 4) return '1-4';
  return `${stage}-${round}`;
}

function recognizeRoundFromImageData(imageData: GoldenSpatulaEconomyImageData): string {
  const candidates = roundCandidateRects
    .flatMap((rect) => {
      const scaledRect = scaleRect(rect, imageData.width, imageData.height);
      return [
        recognizeRound(buildMaskFromRect(imageData, scaledRect)),
        recognizeRound(buildMaskFromRect(imageData, scaledRect, isNeutralGlyphPixel)),
        recognizeRound(buildMaskFromRect(imageData, scaledRect, isRoundGlyphPixel)),
      ];
    })
    .map(normalizeRoundText)
    .filter((round): round is string => Boolean(round));

  return candidates[0] ?? '';
}

function recognizePercentInteger(mask: boolean[][]): number | undefined {
  const text = toDigitText(
    extractComponents(mask)
      .filter((component) => componentHeight(component) >= 6)
      .map((component) => classifyDigit(mask, component, 0.34))
      .filter((digit): digit is ClassifiedDigit => Boolean(digit)),
  );
  return parsePercentText(text);
}

function parsePercentText(text: string): number | undefined {
  if (text.startsWith('0')) return 0;

  for (const length of [3, 2, 1]) {
    const value = parseInteger(text.slice(0, length));
    if (value !== undefined && value >= 0 && value <= 100) return value;
  }

  return undefined;
}

function recognizeShopOdds(imageData: GoldenSpatulaEconomyImageData): {
  odds?: GoldenSpatulaShopOddsByCost;
  rawText?: Partial<Record<GoldenSpatulaShopCost, string>>;
} {
  const rawText: Partial<Record<GoldenSpatulaShopCost, string>> = {};
  const odds: GoldenSpatulaShopOddsByCost = {};
  let recognizedCount = 0;

  for (const cost of goldenSpatulaShopOddsCosts) {
    const value = recognizePercentInteger(
      buildMaskFromRect(
        imageData,
        scaleRect(shopOddsCostRects[cost], imageData.width, imageData.height),
        isShopOddsGlyphPixel,
      ),
    );
    if (value !== undefined) {
      rawText[cost] = `${value}%`;
      odds[cost] = value / 100;
      recognizedCount += 1;
    }
  }

  return recognizedCount > 0 ? { odds, rawText } : { rawText };
}

function parseExperienceWithoutSlash(text: string): ParsedExperience {
  if (text.length < 2) return { text };

  if (text.length === 2) {
    return {
      text: `${text[0]}/${text[1]}`,
      current: parseInteger(text[0] ?? ''),
      max: parseInteger(text[1] ?? ''),
    };
  }

  if (text.length === 3) {
    return {
      text: `${text[0]}/${text.slice(1)}`,
      current: parseInteger(text[0] ?? ''),
      max: parseInteger(text.slice(1)),
    };
  }

  return {
    text: `${text.slice(0, -2)}/${text.slice(-2)}`,
    current: parseInteger(text.slice(0, -2)),
    max: parseInteger(text.slice(-2)),
  };
}

function recognizeExperience(mask: boolean[][]): ParsedExperience {
  const components = extractComponents(mask).filter(
    (component) => componentHeight(component) >= 7 && component.y1 <= mask.length,
  );
  const slash = components.find((component) => isSlashLike(mask, component));
  const digitComponents = components.filter((component) => component !== slash);

  if (slash) {
    const leftDigits = digitComponents
      .filter((component) => component.x1 <= slash.x0)
      .map((component) => classifyDigit(mask, component))
      .filter((digit): digit is ClassifiedDigit => Boolean(digit));
    const rightDigits = digitComponents
      .filter((component) => component.x0 >= slash.x1)
      .map((component) => classifyDigit(mask, component))
      .filter((digit): digit is ClassifiedDigit => Boolean(digit));
    const currentText = toDigitText(leftDigits);
    const maxText = toDigitText(rightDigits);
    const text = currentText || maxText ? `${currentText}/${maxText}` : '';

    return {
      text,
      current: parseInteger(currentText),
      max: parseInteger(maxText),
    };
  }

  const text = toDigitText(
    digitComponents
      .map((component) => classifyDigit(mask, component))
      .filter((digit): digit is ClassifiedDigit => Boolean(digit)),
  );
  return parseExperienceWithoutSlash(text);
}

function inferStreakKind(
  imageData: GoldenSpatulaEconomyImageData,
  interest: number | undefined,
): GoldenSpatulaEconomyVisionStreakKind {
  if (interest === 0) return 'none';

  let warmPixels = 0;
  let coolPixels = 0;

  const iconWidth = Math.min(40, imageData.width);
  for (let y = 0; y < imageData.height; y += 1) {
    for (let x = 0; x < iconWidth; x += 1) {
      const offset = (y * imageData.width + x) * 4;
      const r = imageData.data[offset] ?? 0;
      const g = imageData.data[offset + 1] ?? 0;
      const b = imageData.data[offset + 2] ?? 0;
      if (r > 155 && g > 55 && g < 175 && b < 105) warmPixels += 1;
      if (b > 120 && g > 90 && r < 120) coolPixels += 1;
    }
  }

  if (warmPixels > 40) return 'win';
  if (coolPixels > 60 && coolPixels > warmPixels * 1.5) return 'loss';
  return 'none';
}

function recognizeStreak(
  imageData: GoldenSpatulaEconomyImageData,
  mask: boolean[][],
): ParsedStreak {
  const components = extractComponents(mask).filter(
    (component) => componentHeight(component) >= 6 && component.y0 >= 3,
  );
  const digitComponents = components.filter(
    (component) => component.x0 >= 20 && componentWidth(component) <= 24,
  );
  const allDigits = digitComponents
    .map((component) => classifyStreakDigit(mask, component))
    .filter((digit): digit is ClassifiedDigit => Boolean(digit))
    .sort((a, b) => a.component.x0 - b.component.x0);
  const candidateDigits = allDigits;
  const compactDigits: ClassifiedDigit[] = [];
  for (const digit of candidateDigits) {
    const previous = compactDigits[compactDigits.length - 1];
    if (previous && digit.component.x0 - previous.component.x1 > 5) break;
    compactDigits.push(digit);
    if (compactDigits.length >= 2) break;
  }

  const text = toDigitText(compactDigits);
  const interest = parseInteger(text);

  return {
    text,
    interest,
    kind: inferStreakKind(imageData, interest),
  };
}

function recognizeField(
  imageData: GoldenSpatulaEconomyImageData,
  mask: boolean[][],
  field: EconomyField,
): string | ParsedExperience | ParsedStreak {
  if (field === 'round') return recognizeRound(mask);
  if (field === 'gold') return recognizeGold(mask);
  if (field === 'level') return recognizeLevel(mask);
  if (field === 'streak') return recognizeStreak(imageData, mask);
  return recognizeExperience(mask);
}

export function recognizeGoldenSpatulaEconomyFromImageData(
  imageData: GoldenSpatulaEconomyImageData,
): GoldenSpatulaEconomyVisionResult {
  const rawText: GoldenSpatulaEconomyVisionResult['rawText'] = {};
  let parsedExperience: ParsedExperience | undefined;
  let parsedStreak: ParsedStreak | undefined;

  for (const field of Object.keys(economyRects) as EconomyField[]) {
    if (field === 'round') {
      rawText.round = recognizeRoundFromImageData(imageData);
      continue;
    }

    const scaledRect = scaleRect(economyRects[field], imageData.width, imageData.height);
    const crop = field === 'streak' ? cropImageData(imageData, scaledRect) : undefined;
      const mask =
        field === 'streak'
          ? trimStreakMask(
              buildMask(crop as GoldenSpatulaEconomyImageData, isStreakGlyphPixel),
            )
          : buildMaskFromRect(imageData, scaledRect);
    const result = recognizeField(crop ?? imageData, mask, field);
    if (field === 'experience') {
      parsedExperience = result as ParsedExperience;
      rawText.experience = parsedExperience.text;
    } else if (field === 'streak') {
      parsedStreak = result as ParsedStreak;
      rawText.streak = parsedStreak.text;
    } else {
      rawText[field] = result as string;
    }
  }

  const gold = parseGold(rawText.gold ?? '');
  const level = parseLevel(rawText.level ?? '');
  parsedExperience = normalizeExperience(parsedExperience);

  const hasEconomyHud = hasReliableEconomyHud(gold, level, parsedExperience);
  parsedStreak = normalizeStreak(parsedStreak, hasEconomyHud);
  const shopOdds = level !== undefined ? recognizeShopOdds(imageData) : {};
  const shopOddsFromLevel = getGoldenSpatulaShopOddsByLevel(level);
  const resolvedShopOdds = hasEconomyHud
    ? resolveGoldenSpatulaShopOdds(shopOdds.odds, shopOddsFromLevel)
    : { sourceByCost: {} };
  rawText.shopOdds = getGoldenSpatulaShopOddsDisplayText(
    shopOdds.rawText,
    shopOddsFromLevel,
    resolvedShopOdds.sourceByCost,
  );

  return {
    round: rawText.round || undefined,
    gold,
    level,
    experience: parsedExperience?.current,
    experienceMax: parsedExperience?.max,
    streakKind: parsedStreak?.kind,
    streakInterest: parsedStreak?.interest,
    shopOdds: resolvedShopOdds.odds,
    shopOddsSource: resolvedShopOdds.source,
    rawText,
  };
}

export async function recognizeGoldenSpatulaEconomyFromDataUrl(
  dataUrl: string,
): Promise<GoldenSpatulaEconomyVisionResult> {
  const image = await createImage(dataUrl);
  return recognizeGoldenSpatulaEconomyFromImageData(getFullImageData(image));
}
