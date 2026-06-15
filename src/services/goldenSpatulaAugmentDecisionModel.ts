import type {
  GoldenSpatulaAugmentAsset,
  GoldenSpatulaAugmentAssetIndex,
  GoldenSpatulaLineupVariant,
} from '@/types/goldenSpatula';

export type GoldenSpatulaAugmentReasonKind =
  | 'priority'
  | 'alternative'
  | 'recommended'
  | 'match'
  | 'economyFit'
  | 'combatFit'
  | 'itemFit'
  | 'lineupKeyword'
  | 'danger'
  | 'tier'
  | 'fallback';

export interface GoldenSpatulaAugmentScoreReason {
  kind: GoldenSpatulaAugmentReasonKind;
  weight: number;
  keyword?: string;
  assetName?: string;
}

export interface GoldenSpatulaAugmentChoiceInput {
  slotIndex: number;
  slotLabel?: string;
  titleText?: string;
  descriptionText?: string;
  rawText?: string;
}

export interface GoldenSpatulaAugmentAssetMatch {
  asset: GoldenSpatulaAugmentAsset;
  confidence: number;
  matchedText: string;
}

export interface GoldenSpatulaAugmentScoreOption {
  slotIndex: number;
  slotLabel?: string;
  titleText?: string;
  descriptionText?: string;
  rawText?: string;
  matchedAsset?: GoldenSpatulaAugmentAsset;
  matchConfidence: number;
  score: number;
  pickable: boolean;
  reasons: GoldenSpatulaAugmentScoreReason[];
}

export interface GoldenSpatulaAugmentDecision {
  options: GoldenSpatulaAugmentScoreOption[];
  bestOption?: GoldenSpatulaAugmentScoreOption;
  recommendationNote?: string;
  priorityIds: number[];
  alternativeIds: number[];
  recommendedIds: number[];
}

export interface BuildGoldenSpatulaAugmentDecisionOptions {
  choices: GoldenSpatulaAugmentChoiceInput[];
  activeVariant?: GoldenSpatulaLineupVariant;
  augmentAssets?: GoldenSpatulaAugmentAssetIndex;
}

const chinesePunctuationPattern = /[\s!！?？,，.。:：;；、'"“”‘’()[\]{}<>《》\-_/\\|·~～]+/gu;
const economyKeywords = [
  '金币',
  '经济',
  '利息',
  '刷新',
  '商店',
  '购买',
  '免费',
  '经验',
  '升级',
  '等级',
  'D牌',
  '升星',
  '三星',
];
const combatKeywords = [
  '战力',
  '伤害',
  '攻击',
  '法术',
  '强度',
  '护甲',
  '魔抗',
  '生命',
  '攻速',
  '暴击',
  '治疗',
  '护盾',
  '吸血',
];
const itemKeywords = ['装备', '基础装备', '成装', '散件', '锻造器', '神器', '重铸', '纹章'];
const dangerPatterns = [
  /无法选择之后的强化符文/u,
  /不能选择之后的强化符文/u,
  /不再获得强化符文/u,
  /代价/u,
  /扣除.*生命/u,
  /损失.*生命/u,
];

export function normalizeGoldenSpatulaAugmentText(text: string | undefined): string {
  return (text ?? '')
    .normalize('NFKC')
    .replace(/[ⅠⅡⅢ]/gu, (value) => {
      if (value === 'Ⅰ') return 'I';
      if (value === 'Ⅱ') return 'II';
      return 'III';
    })
    .replace(chinesePunctuationPattern, '')
    .toLocaleLowerCase();
}

function rawChoiceText(choice: GoldenSpatulaAugmentChoiceInput): string {
  return [choice.titleText, choice.descriptionText, choice.rawText].filter(Boolean).join(' ');
}

function getAssetSearchTexts(asset: GoldenSpatulaAugmentAsset): string[] {
  return Array.from(
    new Set(
      [asset.name, asset.slug, asset.description, ...(asset.aliases ?? [])].filter(
        (item): item is string => Boolean(item),
      ),
    ),
  );
}

function diceCoefficient(left: string, right: string): number {
  if (!left || !right) return 0;
  if (left === right) return 1;
  const short = left.length <= right.length ? left : right;
  const long = left.length > right.length ? left : right;
  if (short.length === 1) return long.includes(short) ? 0.45 : 0;

  const grams = new Map<string, number>();
  for (let index = 0; index < short.length - 1; index += 1) {
    const gram = short.slice(index, index + 2);
    grams.set(gram, (grams.get(gram) ?? 0) + 1);
  }

  let overlap = 0;
  for (let index = 0; index < long.length - 1; index += 1) {
    const gram = long.slice(index, index + 2);
    const count = grams.get(gram) ?? 0;
    if (count <= 0) continue;
    grams.set(gram, count - 1);
    overlap += 1;
  }

  return (2 * overlap) / Math.max(1, short.length + long.length - 2);
}

function getTextMatchConfidence(inputText: string, candidateText: string): number {
  const input = normalizeGoldenSpatulaAugmentText(inputText);
  const candidate = normalizeGoldenSpatulaAugmentText(candidateText);
  if (!input || !candidate) return 0;
  if (input === candidate) return 1;
  if (input.includes(candidate) && candidate.length >= 2) return 0.94;
  if (candidate.includes(input) && input.length >= 2) return 0.9;
  return diceCoefficient(input, candidate);
}

export function matchGoldenSpatulaAugmentAsset(
  choice: GoldenSpatulaAugmentChoiceInput,
  augmentAssets: GoldenSpatulaAugmentAssetIndex | undefined,
): GoldenSpatulaAugmentAssetMatch | undefined {
  const assets = Object.values(augmentAssets ?? {});
  if (assets.length === 0) return undefined;

  const title = choice.titleText ?? '';
  const combinedText = rawChoiceText(choice);
  let best: GoldenSpatulaAugmentAssetMatch | undefined;

  for (const asset of assets) {
    for (const candidate of getAssetSearchTexts(asset)) {
      const confidence = Math.max(
        getTextMatchConfidence(title, candidate),
        getTextMatchConfidence(combinedText, candidate) * 0.92,
      );
      if (confidence < 0.42) continue;
      if (!best || confidence > best.confidence) {
        best = { asset, confidence, matchedText: candidate };
      }
    }
  }

  return best;
}

function containsAny(text: string, keywords: string[]): string | undefined {
  return keywords.find((keyword) => text.includes(keyword));
}

function getVariantKeywords(activeVariant: GoldenSpatulaLineupVariant | undefined): string[] {
  if (!activeVariant) return [];
  return Array.from(
    new Set(
      [
        ...(activeVariant.traitsSummary?.split(/[,\s，、]+/u) ?? []),
        ...activeVariant.mainCarries.map((unit) => unit.name),
        ...activeVariant.frontliners.map((unit) => unit.name),
        ...activeVariant.units.map((unit) => unit.name),
      ]
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function addReason(
  reasons: GoldenSpatulaAugmentScoreReason[],
  kind: GoldenSpatulaAugmentReasonKind,
  weight: number,
  extra: Omit<GoldenSpatulaAugmentScoreReason, 'kind' | 'weight'> = {},
): number {
  reasons.push({ kind, weight, ...extra });
  return weight;
}

function scoreGoldenSpatulaAugmentChoice(
  choice: GoldenSpatulaAugmentChoiceInput,
  options: Omit<BuildGoldenSpatulaAugmentDecisionOptions, 'choices'>,
): GoldenSpatulaAugmentScoreOption {
  const match = matchGoldenSpatulaAugmentAsset(choice, options.augmentAssets);
  const asset = match?.asset;
  const text = [asset?.name, asset?.description, rawChoiceText(choice)].filter(Boolean).join(' ');
  const note = options.activeVariant?.augmentRecommendations?.note ?? '';
  const priorityIds = options.activeVariant?.augmentRecommendations?.priorityIds ?? [];
  const alternativeIds = options.activeVariant?.augmentRecommendations?.alternativeIds ?? [];
  const recommendedIds = options.activeVariant?.augmentRecommendations?.ids ?? [];
  const reasons: GoldenSpatulaAugmentScoreReason[] = [];
  let score = asset ? 35 : 12;

  if (match) {
    score += addReason(reasons, 'match', Math.round(match.confidence * 18), {
      assetName: asset?.name,
    });
  } else if (rawChoiceText(choice).trim()) {
    score += addReason(reasons, 'fallback', 4);
  }

  if (asset?.id !== undefined && priorityIds.includes(asset.id)) {
    score += addReason(reasons, 'priority', 45, { assetName: asset.name });
  } else if (asset?.id !== undefined && alternativeIds.includes(asset.id)) {
    score += addReason(reasons, 'alternative', 32, { assetName: asset.name });
  } else if (asset?.id !== undefined && recommendedIds.includes(asset.id)) {
    score += addReason(reasons, 'recommended', 24, { assetName: asset.name });
  }

  if (asset?.level === 3) score += addReason(reasons, 'tier', 4);
  if (asset?.level === 2) score += addReason(reasons, 'tier', 2);

  const economyKeyword = containsAny(text, economyKeywords);
  const combatKeyword = containsAny(text, combatKeywords);
  const itemKeyword = containsAny(text, itemKeywords);
  const wantsEconomy = /(\d\s*)?经济|金币|质量|利息/u.test(note);
  const wantsCombat = /战力|上限|强度|伤害/u.test(note);
  const wantsItems = /装备|神装|散件|潘朵拉/u.test(note);

  if (economyKeyword) {
    score += addReason(reasons, 'economyFit', wantsEconomy ? 12 : 7, { keyword: economyKeyword });
  }
  if (combatKeyword) {
    score += addReason(reasons, 'combatFit', wantsCombat ? 12 : 7, { keyword: combatKeyword });
  }
  if (itemKeyword) {
    score += addReason(reasons, 'itemFit', wantsItems ? 12 : 6, { keyword: itemKeyword });
  }

  const normalizedText = normalizeGoldenSpatulaAugmentText(text);
  const lineupKeyword = getVariantKeywords(options.activeVariant).find((keyword) => {
    const normalizedKeyword = normalizeGoldenSpatulaAugmentText(keyword);
    return normalizedKeyword.length >= 2 && normalizedText.includes(normalizedKeyword);
  });
  if (lineupKeyword) {
    score += addReason(reasons, 'lineupKeyword', 13, { keyword: lineupKeyword });
  }

  const dangerPattern = dangerPatterns.find((pattern) => pattern.test(text));
  if (dangerPattern) {
    score += addReason(
      reasons,
      'danger',
      asset?.id !== undefined && priorityIds.includes(asset.id) ? -8 : -18,
    );
  }

  return {
    slotIndex: choice.slotIndex,
    slotLabel: choice.slotLabel,
    titleText: choice.titleText,
    descriptionText: choice.descriptionText,
    rawText: choice.rawText,
    matchedAsset: asset,
    matchConfidence: match?.confidence ?? 0,
    score: clampScore(score),
    pickable: Boolean(asset || rawChoiceText(choice).trim()),
    reasons,
  };
}

export function buildGoldenSpatulaAugmentDecision(
  options: BuildGoldenSpatulaAugmentDecisionOptions,
): GoldenSpatulaAugmentDecision {
  const scored = options.choices
    .map((choice) => scoreGoldenSpatulaAugmentChoice(choice, options))
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return right.matchConfidence - left.matchConfidence;
    });
  const bestOption = scored.find((option) => option.pickable);
  const recommendations = options.activeVariant?.augmentRecommendations;

  return {
    options: scored,
    bestOption,
    recommendationNote: recommendations?.note,
    priorityIds: recommendations?.priorityIds ?? [],
    alternativeIds: recommendations?.alternativeIds ?? [],
    recommendedIds: recommendations?.ids ?? [],
  };
}
