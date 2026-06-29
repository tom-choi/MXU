import type {
  GoldenSpatulaItemAssetIndex,
  GoldenSpatulaKnowledgeItemState,
  GoldenSpatulaKnowledgeScanState,
} from '@/types/goldenSpatula';
import { normalizeDecisionText } from './goldenSpatulaDecisionContext';

export interface GoldenSpatulaObservedItemSignal {
  name: string;
  score: number;
  count: number;
}

export type GoldenSpatulaItemFamily = 'ad' | 'ap' | 'mana' | 'tank';

export interface GoldenSpatulaItemFamilyFitSignal {
  score: number;
  count: number;
  names: string[];
  families: GoldenSpatulaItemFamily[];
}

const itemFamilyKeywords: Record<GoldenSpatulaItemFamily, string[]> = {
  ad: [
    'deathblade',
    'infinity edge',
    'last whisper',
    'giant slayer',
    'guinsoo',
    'rageblade',
    'runaan',
    'hurricane',
    'edge of night',
    'bloodthirster',
    'sterak',
    'red buff',
    'sword',
    'bow',
    '无尽',
    '轻语',
    '巨杀',
    '羊刀',
    '分裂',
    '饮血',
    '夜刃',
  ],
  ap: [
    'rabadon',
    'jeweled',
    'archangel',
    'nashor',
    'morello',
    'hextech gunblade',
    'crownguard',
    'ionic spark',
    'adaptive helm',
    'rod',
    '法爆',
    '帽子',
    '大天使',
    '纳什',
    '鬼书',
    '科技枪',
    '离子',
  ],
  mana: [
    'blue buff',
    'spear of shojin',
    'shojin',
    'adaptive helm',
    'tear',
    '蓝霸符',
    '青龙刀',
    '适应性头盔',
    '眼泪',
  ],
  tank: [
    'warmog',
    'bramble',
    'dragon claw',
    'gargoyle',
    'redemption',
    'sunfire',
    'steadfast',
    'crownguard',
    'protector',
    'tank vest',
    'vest',
    'armor',
    'cloak',
    'belt',
    '狂徒',
    '反甲',
    '龙牙',
    '石像鬼',
    '救赎',
    '日炎',
    '板甲',
  ],
};

function normalizeItemFamilyText(value: string): string {
  return normalizeDecisionText(value)
    .replace(/[\\/_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getGoldenSpatulaItemFamilies(itemName: string): GoldenSpatulaItemFamily[] {
  const normalized = normalizeItemFamilyText(itemName);
  if (!normalized) return [];
  const families: GoldenSpatulaItemFamily[] = [];

  for (const [family, keywords] of Object.entries(itemFamilyKeywords)) {
    if (keywords.some((keyword) => normalized.includes(keyword))) {
      families.push(family as GoldenSpatulaItemFamily);
    }
  }

  return families;
}

function normalizeKnowledgeTemplatePath(path: string | undefined): string {
  if (!path) return '';
  const normalized = path.replace(/\\/g, '/').replace(/^\/+/, '').toLocaleLowerCase();
  const marker = 'resource_knowledge/image/';
  const markerIndex = normalized.lastIndexOf(marker);
  return markerIndex >= 0 ? normalized.slice(markerIndex + marker.length) : normalized;
}

function findItemNameByTemplatePath(
  templatePath: string | undefined,
  itemAssets: GoldenSpatulaItemAssetIndex | undefined,
): string | undefined {
  const normalizedTemplate = normalizeKnowledgeTemplatePath(templatePath);
  if (!normalizedTemplate) return undefined;

  return Object.values(itemAssets ?? {}).find((asset) =>
    normalizeKnowledgeTemplatePath(asset.imagePath).endsWith(normalizedTemplate),
  )?.name;
}

function observedItemScore(item: GoldenSpatulaKnowledgeItemState): number {
  const zoneScore =
    (item.zones.includes('inventory') ? 8 : 0) +
    (item.zones.includes('bench') ? 5 : 0) +
    (item.zones.includes('boardLower') ? 3 : 0);
  const kindScore =
    item.itemKind === 'completedItems' ? 10 : item.itemKind === 'specialItems' ? 12 : 5;
  return kindScore + zoneScore;
}

export function getGoldenSpatulaObservedItemSignals(
  knowledgeState: GoldenSpatulaKnowledgeScanState | undefined,
  itemAssets: GoldenSpatulaItemAssetIndex | undefined,
): Map<string, GoldenSpatulaObservedItemSignal> {
  const signals = new Map<string, GoldenSpatulaObservedItemSignal>();

  for (const item of Object.values(knowledgeState?.items ?? {})) {
    const name = findItemNameByTemplatePath(item.templatePath, itemAssets);
    const key = normalizeDecisionText(name ?? '');
    if (!key || !name) continue;

    const existing = signals.get(key);
    const score = observedItemScore(item);
    if (existing) {
      existing.count += 1;
      existing.score += score;
    } else {
      signals.set(key, { name, score, count: 1 });
    }
  }

  return signals;
}

export function getGoldenSpatulaRecommendedItemFitSignal(
  itemNames: Iterable<string>,
  observedItems: Map<string, GoldenSpatulaObservedItemSignal>,
): { score: number; count: number; names: string[] } {
  const names: string[] = [];
  let score = 0;
  let count = 0;

  for (const itemName of itemNames) {
    const observed = observedItems.get(normalizeDecisionText(itemName));
    if (!observed) continue;
    names.push(observed.name);
    count += observed.count;
    score += observed.score;
  }

  return {
    score: Math.min(54, score),
    count,
    names: Array.from(new Set(names)).slice(0, 3),
  };
}

export function getGoldenSpatulaRecommendedItemFamilyFitSignal(
  itemNames: Iterable<string>,
  observedItems: Map<string, GoldenSpatulaObservedItemSignal>,
): GoldenSpatulaItemFamilyFitSignal {
  const recommendedFamilies = new Set<GoldenSpatulaItemFamily>();
  for (const itemName of itemNames) {
    for (const family of getGoldenSpatulaItemFamilies(itemName)) {
      recommendedFamilies.add(family);
    }
  }

  if (recommendedFamilies.size === 0) {
    return { score: 0, count: 0, names: [], families: [] };
  }

  const names: string[] = [];
  const families = new Set<GoldenSpatulaItemFamily>();
  let score = 0;
  let count = 0;

  for (const observed of observedItems.values()) {
    const sharedFamilies = getGoldenSpatulaItemFamilies(observed.name).filter((family) =>
      recommendedFamilies.has(family),
    );
    if (sharedFamilies.length === 0) continue;
    names.push(observed.name);
    for (const family of sharedFamilies) families.add(family);
    count += observed.count;
    score += Math.round(observed.score * Math.min(0.72, 0.42 + sharedFamilies.length * 0.16));
  }

  return {
    score: Math.min(42, score),
    count,
    names: Array.from(new Set(names)).slice(0, 3),
    families: Array.from(families).slice(0, 4),
  };
}
