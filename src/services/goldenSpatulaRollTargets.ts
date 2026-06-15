import type {
  GoldenSpatulaChampionAsset,
  GoldenSpatulaChampionAssetIndex,
  GoldenSpatulaDecisionPlan,
  GoldenSpatulaLineupVariant,
} from '@/types/goldenSpatula';
import {
  getGoldenSpatulaActiveRollTargetNames,
  normalizeDecisionText,
} from './goldenSpatulaDecisionContext';
import type { GoldenSpatulaRollBuyTargetTemplate } from './goldenSpatulaRollPipeline';

export interface GoldenSpatulaRollTargetTemplateInput {
  variant: GoldenSpatulaLineupVariant;
  championAssets?: GoldenSpatulaChampionAssetIndex;
  preferredNames?: string[];
  includeVariantTargets?: boolean;
  maxTargets?: number;
}

export interface GoldenSpatulaDecisionRollTargetTemplateInput
  extends Omit<
    GoldenSpatulaRollTargetTemplateInput,
    'preferredNames' | 'includeVariantTargets'
  > {
  decisionPlan?: Pick<GoldenSpatulaDecisionPlan, 'evaluatedCandidates' | 'recommendedRollTargetNames'>;
}

export function toGoldenSpatulaMaaTemplatePath(imagePath: string): string {
  const normalized = imagePath.replace(/\\/g, '/');
  const resourceMarker = 'resource_knowledge/image/';
  const resourceIndex = normalized.lastIndexOf(resourceMarker);
  if (resourceIndex >= 0) {
    return normalized.slice(resourceIndex + resourceMarker.length);
  }

  const imageMarker = '/image/';
  const imageIndex = normalized.lastIndexOf(imageMarker);
  return imageIndex >= 0 ? normalized.slice(imageIndex + imageMarker.length) : normalized;
}

function findChampionAsset(
  unitName: string,
  assets: GoldenSpatulaChampionAssetIndex | undefined,
): GoldenSpatulaChampionAsset | undefined {
  const normalizedName = normalizeDecisionText(unitName);
  if (!normalizedName || !assets) return undefined;
  return (
    assets[normalizedName] ??
    Object.values(assets).find((asset) => normalizeDecisionText(asset.name) === normalizedName)
  );
}

function collectOrderedTargetNames({
  variant,
  preferredNames,
  includeVariantTargets,
}: Pick<
  GoldenSpatulaRollTargetTemplateInput,
  'variant' | 'preferredNames' | 'includeVariantTargets'
>): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  const addName = (name: string) => {
    const key = normalizeDecisionText(name);
    if (!key || seen.has(key)) return;
    seen.add(key);
    names.push(name);
  };

  for (const name of preferredNames ?? []) addName(name);
  if (includeVariantTargets !== false) {
    for (const name of getGoldenSpatulaActiveRollTargetNames(variant)) addName(name);
  }

  return names;
}

export function collectGoldenSpatulaRollTargetTemplates({
  variant,
  championAssets,
  preferredNames,
  includeVariantTargets = true,
  maxTargets = 8,
}: GoldenSpatulaRollTargetTemplateInput): GoldenSpatulaRollBuyTargetTemplate[] {
  const seenTemplates = new Set<string>();
  const targets: GoldenSpatulaRollBuyTargetTemplate[] = [];

  for (const name of collectOrderedTargetNames({ variant, preferredNames, includeVariantTargets })) {
    const asset = findChampionAsset(name, championAssets);
    const imagePath = asset?.imagePath;
    if (!imagePath) continue;

    const templatePath = toGoldenSpatulaMaaTemplatePath(imagePath);
    const key = `${normalizeDecisionText(asset.name)}:${templatePath}`;
    if (!templatePath || seenTemplates.has(key)) continue;
    seenTemplates.add(key);

    const target: GoldenSpatulaRollBuyTargetTemplate = {
      name: asset.name,
      templatePath,
    };
    if (asset.cost !== undefined) target.cost = asset.cost;
    targets.push(target);
    if (targets.length >= maxTargets) break;
  }

  return targets;
}

export function shouldFallbackToGoldenSpatulaVariantRollTargets(
  decisionPlan:
    | Pick<GoldenSpatulaDecisionPlan, 'evaluatedCandidates' | 'recommendedRollTargetNames'>
    | undefined,
): boolean {
  if (!decisionPlan) return true;
  return decisionPlan.recommendedRollTargetNames.length === 0 && decisionPlan.evaluatedCandidates === 0;
}

export function collectGoldenSpatulaDecisionRollTargetTemplates({
  decisionPlan,
  ...input
}: GoldenSpatulaDecisionRollTargetTemplateInput): GoldenSpatulaRollBuyTargetTemplate[] {
  return collectGoldenSpatulaRollTargetTemplates({
    ...input,
    preferredNames: decisionPlan?.recommendedRollTargetNames,
    includeVariantTargets: shouldFallbackToGoldenSpatulaVariantRollTargets(decisionPlan),
  });
}
