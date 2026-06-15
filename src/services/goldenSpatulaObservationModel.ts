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
