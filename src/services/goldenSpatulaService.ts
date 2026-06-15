import { invoke } from '@tauri-apps/api/core';
import { isTauri } from '@/utils/paths';
import type {
  GoldenSpatulaAssistantData,
  GoldenSpatulaAugmentAssetIndex,
  GoldenSpatulaChampionSkill,
  GoldenSpatulaChampionStat,
  GoldenSpatulaChampionAssetIndex,
  GoldenSpatulaFileLoad,
  GoldenSpatulaItemAssetIndex,
  GoldenSpatulaLineupExportPackage,
  GoldenSpatulaLineupIndexData,
  GoldenSpatulaLineupManagerState,
  GoldenSpatulaLineupAugmentRecommendationDetail,
  GoldenSpatulaLineupAugmentRecommendationGroup,
  GoldenSpatulaLineupAugmentStrengthTier,
  GoldenSpatulaLineupUnit,
  GoldenSpatulaLineupVariant,
  GoldenSpatulaManagedLineup,
  GoldenSpatulaRecommendedLineup,
  GoldenSpatulaRecommendedLineupsData,
  GoldenSpatulaSeasonInfo,
  GoldenSpatulaStrategyData,
  GoldenSpatulaTemplateCategory,
  GoldenSpatulaTemplateCategoryStatus,
  GoldenSpatulaTemplateManifest,
  GoldenSpatulaTraitAssetIndex,
  GoldenSpatulaVariantSlot,
} from '@/types/goldenSpatula';

const seasonPath = 'knowledge/seasons/current.json';
const strategyPath = 'knowledge/strategy/lin_xiaobei_17_4.json';
const lineupIndexPath = 'knowledge/lineups/index.json';
const championIndexPath = 'knowledge/champions/index.json';
const traitIndexPath = 'knowledge/traits/index.json';
const augmentIndexPath = 'knowledge/augments/index.json';
const bundledProjectPath = 'projects/golden_spatula_mumu';
const lineupPackageType = 'mxu.goldenSpatula.lineups';
const variantSlots: GoldenSpatulaVariantSlot[] = ['A', 'B', 'C'];

const templateManifestPaths: Record<GoldenSpatulaTemplateCategory, string> = {
  champions: 'resource_knowledge/image/champion/manifest.json',
  items: 'resource_knowledge/image/item/manifest.json',
  traits: 'resource_knowledge/image/trait/manifest.json',
  augments: 'resource_knowledge/image/augment/manifest.json',
};

function normalizeRelativePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\/+/, '');
}

function canUseHttpBasePath(basePath?: string): boolean {
  if (!basePath) return false;
  if (/^[a-zA-Z]:[\\/]/.test(basePath)) return false;
  if (basePath.includes('\\')) return false;
  return basePath.startsWith('/') || /^https?:\/\//.test(basePath);
}

function joinHttpPath(basePath: string, relativePath: string): string {
  return `${basePath.replace(/\/+$/, '')}/${relativePath}`;
}

function joinLocalPath(basePath: string, relativePath: string): string {
  return `${basePath.replace(/[\\/]+$/, '').replace(/\\/g, '/')}/${relativePath}`;
}

async function readText(relativePath: string, basePath?: string): Promise<string | null> {
  const normalized = normalizeRelativePath(relativePath);
  const bundledPath = `${bundledProjectPath}/${normalized}`;

  if (isTauri()) {
    const candidates = [
      ...(basePath ? [joinLocalPath(basePath, normalized)] : []),
      normalized,
      bundledPath,
    ];

    for (const candidate of candidates) {
      try {
        return await invoke<string>('read_local_file', { filename: candidate });
      } catch {
        // Try the next candidate.
      }
    }

    return null;
  }

  const candidates = [
    ...(canUseHttpBasePath(basePath) ? [joinHttpPath(basePath!, normalized)] : []),
    `/${normalized}`,
    normalized,
    `/${bundledPath}`,
    bundledPath,
  ];

  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate);
      if (response.ok) {
        return await response.text();
      }
    } catch {
      // Try the next candidate.
    }
  }

  return null;
}

async function readJson<T>(
  relativePath: string,
  basePath?: string,
): Promise<GoldenSpatulaFileLoad<T>> {
  const path = normalizeRelativePath(relativePath);
  const content = await readText(path, basePath);
  if (content === null) {
    return { path, status: 'missing' };
  }

  try {
    return { path, status: 'ready', data: JSON.parse(content) as T };
  } catch (error) {
    return {
      path,
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function asString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || undefined;
  }
  if (typeof value === 'number') return String(value);
  return undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => asString(item)).filter((item): item is string => Boolean(item))
    : [];
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function uniqueStringArray(values: Array<string | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

export function isGoldenSpatulaPlaceholderUnitName(name: string | undefined): boolean {
  if (!name) return true;
  const normalized = name.replace(/\s+/g, '').trim().toLocaleLowerCase();
  if (!normalized) return true;
  return (
    /^未解析棋子\d+$/u.test(normalized) ||
    /^未解(?:析)?(?:棋子)?\d*$/u.test(normalized) ||
    /^未知(?:棋子)?\d*$/u.test(normalized) ||
    /^unknown(?:champion|unit)?\d*$/u.test(normalized) ||
    normalized === '圣物' ||
    normalized === '聖物'
  );
}

function normalizeLineupUnit(value: unknown): GoldenSpatulaLineupUnit | null {
  const unit = asRecord(value);
  if (!unit) return null;

  const name = asString(unit.hero_name) || asString(unit.name);
  if (!name) return null;
  if (isGoldenSpatulaPlaceholderUnitName(name)) return null;

  const unitType = asString(unit.type);
  if (unitType && unitType !== 'hero') return null;
  const items = asStringArray(unit.equipment_names);

  return {
    name,
    items: items.length > 0 ? items : asStringArray(unit.items),
    location: asString(unit.location),
    isCarry: unit.is_carry === true || unit.isCarry === true,
    type: unitType,
    needsReview: unit.needs_review === true || unit.needsReview === true,
  };
}

function normalizeLineupUnits(value: unknown): GoldenSpatulaLineupUnit[] {
  return Array.isArray(value)
    ? value
        .map((item) => normalizeLineupUnit(item))
        .filter((item): item is GoldenSpatulaLineupUnit => Boolean(item))
    : [];
}

function sanitizeLineupTargetNames(value: unknown): string[] | undefined {
  const names = asStringArray(value).filter((name) => !isGoldenSpatulaPlaceholderUnitName(name));
  return names.length > 0 ? names : undefined;
}

function uniqueNumbers(values: Array<number | undefined>): number[] {
  return Array.from(
    new Set(
      values.filter((value): value is number => value !== undefined && Number.isFinite(value)),
    ),
  );
}

function parseNumberList(value: unknown): number[] {
  if (Array.isArray(value)) return uniqueNumbers(value.map((item) => asNumber(item)));
  if (typeof value === 'string') {
    return uniqueNumbers(
      value
        .split(/[,\s，、|/]+/u)
        .map((item) => Number(item.trim()))
        .filter((item) => Number.isFinite(item)),
    );
  }
  const parsed = asNumber(value);
  return parsed === undefined ? [] : [parsed];
}

function normalizeLineupAugmentRecommendationGroup(
  value: unknown,
): GoldenSpatulaLineupAugmentRecommendationGroup | undefined {
  if (value === 'priority' || value === 'alternative' || value === 'recommended') {
    return value;
  }
  return undefined;
}

function normalizeLineupAugmentStrengthTier(
  value: unknown,
): GoldenSpatulaLineupAugmentStrengthTier | undefined {
  if (
    value === 'OP' ||
    value === 'S' ||
    value === 'A' ||
    value === 'B' ||
    value === 'C' ||
    value === 'contextual' ||
    value === 'unknown'
  ) {
    return value;
  }
  return undefined;
}

function normalizeLineupAugmentRecommendationDetails(
  value: unknown,
): GoldenSpatulaLineupAugmentRecommendationDetail[] {
  if (!Array.isArray(value)) return [];

  const details: GoldenSpatulaLineupAugmentRecommendationDetail[] = [];
  for (const item of value) {
    const detail = asRecord(item);
    const id = asNumber(detail?.id);
    if (!detail || id === undefined) continue;

    const roleTags =
      asStringArray(detail.roleTags).length > 0
        ? asStringArray(detail.roleTags)
        : asStringArray(detail.role_tags);

    details.push({
      id,
      name: asString(detail.name),
      group: normalizeLineupAugmentRecommendationGroup(detail.group),
      rank: asNumber(detail.rank),
      recommendationIndex:
        asNumber(detail.recommendationIndex) ?? asNumber(detail.recommended_index),
      strengthTier:
        normalizeLineupAugmentStrengthTier(detail.strengthTier) ??
        normalizeLineupAugmentStrengthTier(detail.strength_tier),
      level: asNumber(detail.level),
      roleTags: roleTags.length > 0 ? roleTags : undefined,
      selectionDecision: asString(detail.selectionDecision) || asString(detail.selection_decision),
      reason: asString(detail.reason),
      source: asString(detail.source),
    });
  }

  return details;
}

function normalizeLineupAugmentRecommendations(
  raw: Record<string, unknown>,
  detail?: Record<string, unknown>,
): GoldenSpatulaLineupVariant['augmentRecommendations'] {
  const direct =
    asRecord(raw.augment_recommendations) ||
    asRecord(raw.augmentRecommendations) ||
    asRecord(raw.augments);
  const hexbuff = asRecord(detail?.hexbuff);
  const priorityIds = uniqueNumbers([
    ...parseNumberList(direct?.priorityIds),
    ...parseNumberList(direct?.priority_ids),
    ...parseNumberList(direct?.recomm),
    ...parseNumberList(hexbuff?.recomm),
  ]);
  const alternativeIds = uniqueNumbers([
    ...parseNumberList(direct?.alternativeIds),
    ...parseNumberList(direct?.alternative_ids),
    ...parseNumberList(direct?.replace),
    ...parseNumberList(hexbuff?.replace),
  ]);
  const ids = uniqueNumbers([
    ...parseNumberList(direct?.ids),
    ...parseNumberList(direct?.id),
    ...priorityIds,
    ...alternativeIds,
  ]);
  const note = asString(direct?.note) || asString(detail?.hex_info);
  const details = normalizeLineupAugmentRecommendationDetails(
    direct?.details ?? direct?.recommendations,
  );

  if (
    priorityIds.length === 0 &&
    alternativeIds.length === 0 &&
    ids.length === 0 &&
    !note &&
    details.length === 0
  ) {
    return undefined;
  }

  return {
    priorityIds: priorityIds.length > 0 ? priorityIds : undefined,
    alternativeIds: alternativeIds.length > 0 ? alternativeIds : undefined,
    ids: ids.length > 0 ? ids : undefined,
    note,
    details: details.length > 0 ? details : undefined,
  };
}

function normalizeAssetKey(name: string): string {
  return name.trim().toLocaleLowerCase();
}

function inferChampionCostFromPath(path: string | undefined): number | undefined {
  const match = path?.replace(/\\/g, '/').match(/(?:^|\/)champion\/([1-5])\//);
  return match ? Number(match[1]) : undefined;
}

function normalizeImageAssets(
  manifest: GoldenSpatulaTemplateManifest | undefined,
  baseImagePath: string,
  metadata?: Record<
    string,
    { cost?: number; traits?: string[]; skill?: GoldenSpatulaChampionSkill; stats?: GoldenSpatulaChampionStat[] }
  >,
): GoldenSpatulaChampionAssetIndex {
  const assets: GoldenSpatulaChampionAssetIndex = {};
  const entries = Array.isArray(manifest?.entries) ? manifest.entries : [];

  for (const entryValue of entries) {
    const entry = asRecord(entryValue);
    const name = asString(entry?.name);
    if (!name) continue;

    const key = normalizeAssetKey(name);
    const templateResourcePath = asString(entry?.template_resource_path);
    const templateAvailable = entry?.template_available !== false;
    const imagePath =
      templateAvailable && templateResourcePath
        ? `${baseImagePath}/${normalizeRelativePath(templateResourcePath)}`
        : undefined;
    const asset = {
      id: asNumber(entry?.id),
      name,
      imagePath,
      sourceUrl: asString(entry?.source_url),
      templateAvailable,
      cost:
        metadata?.[key]?.cost ??
        asNumber(entry?.cost) ??
        inferChampionCostFromPath(templateResourcePath),
      traits: metadata?.[key]?.traits,
      skill: metadata?.[key]?.skill,
      stats: metadata?.[key]?.stats,
    };
    const existing = assets[key];
    if (!existing || (!existing.imagePath && asset.imagePath)) {
      assets[key] = asset;
    }
  }

  return assets;
}

function normalizeChampionAssets(
  manifest: GoldenSpatulaTemplateManifest | undefined,
  metadata?: Record<
    string,
    { cost?: number; traits?: string[]; skill?: GoldenSpatulaChampionSkill; stats?: GoldenSpatulaChampionStat[] }
  >,
): GoldenSpatulaChampionAssetIndex {
  return normalizeImageAssets(manifest, 'resource_knowledge/image', metadata);
}

function normalizeItemAssets(
  manifest: GoldenSpatulaTemplateManifest | undefined,
): GoldenSpatulaItemAssetIndex {
  return normalizeImageAssets(manifest, 'resource_knowledge/image');
}

interface GoldenSpatulaTraitMetadata {
  id?: number;
  name?: string;
  slug?: string;
  description?: string;
  effect?: string;
  aliases?: string[];
  sourceUrl?: string;
  templateResourcePath?: string;
  thresholds?: number[];
  members?: Array<{
    id?: number;
    name: string;
    cost?: number;
  }>;
}

function normalizeTraitAssets(
  manifest: GoldenSpatulaTemplateManifest | undefined,
  metadata: Record<string, GoldenSpatulaTraitMetadata> = {},
): GoldenSpatulaTraitAssetIndex {
  const assets = normalizeImageAssets(
    manifest,
    'resource_knowledge/image',
  ) as GoldenSpatulaTraitAssetIndex;

  for (const details of Object.values(metadata)) {
    const name =
      details.name || details.slug || (details.id !== undefined ? String(details.id) : undefined);
    if (!name) continue;

    const candidateKeys = [
      details.name,
      details.slug,
      ...(details.aliases ?? []),
      details.id !== undefined ? String(details.id) : undefined,
    ]
      .filter((item): item is string => Boolean(item))
      .map(normalizeAssetKey);
    const existingKey = candidateKeys.find((key) => assets[key]);
    const key = existingKey || normalizeAssetKey(name);
    const existing = assets[key];
    const merged = {
      ...existing,
      id: existing?.id ?? details.id,
      name: existing?.name || name,
      imagePath:
        existing?.imagePath ||
        (details.templateResourcePath
          ? `resource_knowledge/image/${normalizeRelativePath(details.templateResourcePath)}`
          : undefined),
      sourceUrl: existing?.sourceUrl || details.sourceUrl,
      templateAvailable: existing?.templateAvailable,
      slug: details.slug,
      description: details.description,
      effect: details.effect,
      aliases: details.aliases,
      thresholds: details.thresholds,
      members: details.members,
    };
    assets[normalizeAssetKey(merged.name)] = merged;
  }

  return assets;
}

interface GoldenSpatulaAugmentMetadata {
  id?: number;
  name?: string;
  slug?: string;
  level?: number;
  description?: string;
  aliases?: string[];
  sourceUrl?: string;
  templateResourcePath?: string;
  isLegend?: boolean;
  heroEnhancementType?: string;
}

function normalizeAugmentAssets(
  manifest: GoldenSpatulaTemplateManifest | undefined,
  metadata: Record<string, GoldenSpatulaAugmentMetadata> = {},
): GoldenSpatulaAugmentAssetIndex {
  const assets = normalizeImageAssets(
    manifest,
    'resource_knowledge/image',
  ) as GoldenSpatulaAugmentAssetIndex;

  for (const details of Object.values(metadata)) {
    const name =
      details.name || details.slug || (details.id !== undefined ? String(details.id) : undefined);
    if (!name) continue;

    const candidateKeys = [
      details.name,
      details.slug,
      ...(details.aliases ?? []),
      details.id !== undefined ? String(details.id) : undefined,
    ]
      .filter((item): item is string => Boolean(item))
      .map(normalizeAssetKey);
    const existingKey = candidateKeys.find((key) => assets[key]);
    const key = existingKey || normalizeAssetKey(name);
    const existing = assets[key];
    const merged = {
      ...existing,
      id: existing?.id ?? details.id,
      name: existing?.name || name,
      imagePath:
        existing?.imagePath ||
        (details.templateResourcePath
          ? `resource_knowledge/image/${normalizeRelativePath(details.templateResourcePath)}`
          : undefined),
      sourceUrl: existing?.sourceUrl || details.sourceUrl,
      templateAvailable: existing?.templateAvailable,
      slug: details.slug,
      level: details.level,
      description: details.description,
      aliases: details.aliases,
      isLegend: details.isLegend,
      heroEnhancementType: details.heroEnhancementType,
    };
    assets[normalizeAssetKey(merged.name)] = merged;
  }

  return assets;
}

type GoldenSpatulaChampionMetadata = {
  cost?: number;
  traits?: string[];
  skill?: GoldenSpatulaChampionSkill;
  stats?: GoldenSpatulaChampionStat[];
};

function normalizeChampionSkill(data: Record<string, unknown>): GoldenSpatulaChampionSkill | undefined {
  const skill = asRecord(data.skill);
  const raw = asRecord(data._raw);
  const normalized: GoldenSpatulaChampionSkill = {
    name: asString(skill?.name) || asString(raw?.skill_name),
    description: asString(skill?.description) || asString(raw?.skill_desc),
    briefValue: asString(skill?.brief_value) || asString(raw?.skill_brief_value),
    valueDescription: asString(skill?.value_description) || asString(raw?.skill_value_desc),
    icon: asString(skill?.icon) || asString(raw?.skill_icon),
  };

  return Object.values(normalized).some(Boolean) ? normalized : undefined;
}

function normalizeChampionStats(data: Record<string, unknown>): GoldenSpatulaChampionStat[] | undefined {
  const raw = asRecord(data._raw);
  const statValues = asArray(data.stats).length > 0 ? asArray(data.stats) : asArray(raw?.star_levels);
  const stats = statValues
    .map((value): GoldenSpatulaChampionStat | null => {
      const stat = asRecord(value);
      if (!stat) return null;
      return {
        level: asNumber(stat.level),
        sellPrice: asNumber(stat.sell_price),
        armor: asNumber(stat.armor),
        attackRange: asNumber(stat.attack_range),
        attackSpeed: asNumber(stat.attack_speed),
        criticalStrikeChance: asNumber(stat.critical_strike_chance),
        attackDamage: asNumber(stat.init_attack_damage),
        hp: asNumber(stat.init_hp),
        initialMana: asNumber(stat.init_mp),
        magicResist: asNumber(stat.magic_resist),
        maxMana: asNumber(stat.max_mp),
      };
    })
    .filter((stat): stat is GoldenSpatulaChampionStat => Boolean(stat));
  return stats.length > 0 ? stats : undefined;
}

async function loadChampionMetadata(
  basePath?: string,
): Promise<Record<string, GoldenSpatulaChampionMetadata>> {
  const index = await readJson<{ entries?: unknown[] }>(championIndexPath, basePath);
  if (index.status !== 'ready' || !Array.isArray(index.data?.entries)) return {};

  const pairs = await Promise.all(
    index.data.entries.map(
      async (entryValue): Promise<[string, GoldenSpatulaChampionMetadata] | null> => {
        const entry = asRecord(entryValue);
        const path = asString(entry?.path);
        const fallbackName = asString(entry?.name);
        if (!path) return null;

        const detail = await readJson<Record<string, unknown>>(
          `knowledge/champions/${normalizeRelativePath(path)}`,
          basePath,
        );
        if (detail.status !== 'ready' || !detail.data) return null;

        const name = asString(detail.data.name) || fallbackName;
        const cost = asNumber(detail.data.cost) ?? asNumber(asRecord(detail.data._raw)?.price);
        const traits = asStringArray(detail.data.traits);
        const skill = normalizeChampionSkill(detail.data);
        const stats = normalizeChampionStats(detail.data);
        if (!name || cost === undefined) return null;

        return [normalizeAssetKey(name), { cost, traits, skill, stats }];
      },
    ),
  );

  const metadata: Record<string, GoldenSpatulaChampionMetadata> = {};
  for (const pair of pairs) {
    if (!pair) continue;
    const [key, value] = pair;
    if (value.cost && value.cost > 0) {
      metadata[key] = value;
    } else if (!metadata[key]) {
      metadata[key] = value;
    }
  }
  return metadata;
}

function parseTraitThresholds(value: unknown): number[] | undefined {
  const source = asString(value);
  if (!source) return undefined;
  const thresholds = source
    .split('|')
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item) && item > 0);
  return thresholds.length > 0 ? thresholds : undefined;
}

function parseTraitMembers(value: unknown): GoldenSpatulaTraitMetadata['members'] {
  if (!Array.isArray(value)) return undefined;
  const members: NonNullable<GoldenSpatulaTraitMetadata['members']> = [];
  for (const memberValue of value) {
    const member = asRecord(memberValue);
    const name = asString(member?.name);
    if (!name) continue;
    const id = asNumber(member?.id);
    const cost = asNumber(member?.cost) ?? asNumber(member?.price);
    members.push({
      ...(id !== undefined ? { id } : {}),
      name,
      ...(cost !== undefined ? { cost } : {}),
    });
  }
  return members.length > 0 ? members : undefined;
}

async function loadTraitMetadata(
  basePath?: string,
): Promise<Record<string, GoldenSpatulaTraitMetadata>> {
  const index = await readJson<{ entries?: unknown[] }>(traitIndexPath, basePath);
  if (index.status !== 'ready' || !Array.isArray(index.data?.entries)) return {};

  const details = await Promise.all(
    index.data.entries.map(async (entryValue): Promise<GoldenSpatulaTraitMetadata | null> => {
      const entry = asRecord(entryValue);
      const path = asString(entry?.path);
      if (!path) return null;

      const detail = await readJson<Record<string, unknown>>(
        `knowledge/traits/${normalizeRelativePath(path)}`,
        basePath,
      );
      if (detail.status !== 'ready' || !detail.data) return null;

      const raw = asRecord(detail.data._raw);
      const image = asRecord(detail.data.image);
      const name = asString(detail.data.name) || asString(entry?.name);
      if (!name) return null;

      return {
        id: asNumber(detail.data.id) ?? asNumber(entry?.id),
        name,
        slug: asString(detail.data.slug) || asString(entry?.slug),
        description: asString(detail.data.description) || asString(raw?.desc),
        effect: asString(detail.data.effect) || asString(raw?.effect_desc),
        aliases: asStringArray(detail.data.aliases),
        sourceUrl: asString(image?.source_url),
        templateResourcePath: asString(image?.template_resource_path),
        thresholds:
          parseTraitThresholds(raw?.num_list) ??
          parseTraitThresholds(raw?.level_num_list) ??
          parseTraitThresholds(detail.data.levels),
        members: parseTraitMembers(detail.data.members) ?? parseTraitMembers(raw?.members),
      };
    }),
  );

  const metadata: Record<string, GoldenSpatulaTraitMetadata> = {};
  for (const detail of details) {
    if (!detail?.name) continue;
    metadata[normalizeAssetKey(detail.name)] = detail;
    for (const alias of detail.aliases ?? []) {
      metadata[normalizeAssetKey(alias)] = detail;
    }
  }
  return metadata;
}

async function loadAugmentMetadata(
  basePath?: string,
): Promise<Record<string, GoldenSpatulaAugmentMetadata>> {
  const index = await readJson<{ entries?: unknown[] }>(augmentIndexPath, basePath);
  if (index.status !== 'ready' || !Array.isArray(index.data?.entries)) return {};

  const details = await Promise.all(
    index.data.entries.map(async (entryValue): Promise<GoldenSpatulaAugmentMetadata | null> => {
      const entry = asRecord(entryValue);
      const path = asString(entry?.path);
      if (!path) return null;

      const detail = await readJson<Record<string, unknown>>(
        `knowledge/augments/${normalizeRelativePath(path)}`,
        basePath,
      );
      const detailRecord = detail.status === 'ready' ? detail.data : undefined;
      const metadataRecord = asRecord(detailRecord?.metadata);
      const name = asString(detailRecord?.name) || asString(entry?.name);
      const id = asNumber(detailRecord?.id) ?? asNumber(entry?.id);
      const slug = asString(detailRecord?.slug) || asString(entry?.slug);
      const aliases = uniqueStringArray([...asStringArray(detailRecord?.aliases), name, slug]);

      return {
        id,
        name,
        slug,
        level: asNumber(detailRecord?.level),
        description: asString(detailRecord?.description),
        aliases: aliases.length > 0 ? aliases : undefined,
        sourceUrl: asString(metadataRecord?.source_url),
        templateResourcePath: asString(metadataRecord?.template_resource_path),
        isLegend: detailRecord?.is_legend === true,
        heroEnhancementType: asString(detailRecord?.hero_enhancement_type),
      };
    }),
  );

  const metadata: Record<string, GoldenSpatulaAugmentMetadata> = {};
  for (const detail of details) {
    if (!detail) continue;
    for (const key of [
      detail.name,
      detail.slug,
      ...(detail.aliases ?? []),
      String(detail.id ?? ''),
    ]) {
      const normalized = key ? normalizeAssetKey(key) : '';
      if (normalized) metadata[normalized] = detail;
    }
  }
  return metadata;
}

function getRawDetail(raw: Record<string, unknown>): Record<string, unknown> | undefined {
  const rawRecord = asRecord(raw._raw);
  const detail = asRecord(rawRecord?.detail);
  return detail || asRecord(raw.detail);
}

function normalizeVariantFromLineup(
  raw: Record<string, unknown>,
  fallback: { id: string; name: string; path: string; season?: string },
): GoldenSpatulaLineupVariant {
  const detail = getRawDetail(raw);
  const recommendedEquipment = asRecord(raw.recommended_equipment);
  const notes = asRecord(raw.notes);
  const source = asRecord(raw.source);
  const sourceId = asString(raw.slug) || fallback.id;
  const name =
    asString(raw.name) || asString(detail?.line_name) || fallback.name || sourceId || fallback.path;

  return {
    id: createId('variant'),
    slot: 'A',
    name,
    code: asString(detail?.shareCode) || asString(raw.shareCode) || '',
    sourceUrl: asString(source?.page_url),
    sourceId,
    quality: asString(raw.quality) || asString(raw.rating),
    version: asString(raw.version),
    season: asString(raw.season) || fallback.season,
    mainCarries: normalizeLineupUnits(raw.main_carries),
    frontliners: normalizeLineupUnits(raw.frontliners),
    units: normalizeLineupUnits(raw.units),
    rollTargetNames: undefined,
    equipmentOrder: asStringArray(recommendedEquipment?.order_names),
    augmentRecommendations: normalizeLineupAugmentRecommendations(raw, detail),
    traitsSummary: asString(raw.traits_summary),
    notes: {
      early: asString(notes?.early),
      economy: asString(notes?.economy),
      positioning: asString(notes?.positioning),
      matchup: asString(notes?.matchup),
    },
  };
}

function sanitizeVariant(
  value: unknown,
  slot: GoldenSpatulaVariantSlot,
  fallbackName: string,
): GoldenSpatulaLineupVariant {
  const variant = asRecord(value);
  const notes = asRecord(variant?.notes);
  const rollTargetNames = sanitizeLineupTargetNames(variant?.rollTargetNames);
  const augmentRecommendations = normalizeLineupAugmentRecommendations(
    { augmentRecommendations: variant?.augmentRecommendations },
    undefined,
  );

  return {
    id: asString(variant?.id) || createId('variant'),
    slot,
    name: asString(variant?.name) || fallbackName,
    code: asString(variant?.code) || '',
    sourceUrl: asString(variant?.sourceUrl),
    sourceId: asString(variant?.sourceId),
    quality: asString(variant?.quality),
    version: asString(variant?.version),
    season: asString(variant?.season),
    mainCarries: normalizeLineupUnits(variant?.mainCarries),
    frontliners: normalizeLineupUnits(variant?.frontliners),
    units: normalizeLineupUnits(variant?.units),
    rollTargetNames,
    equipmentOrder: asStringArray(variant?.equipmentOrder),
    augmentRecommendations,
    traitsSummary: asString(variant?.traitsSummary),
    notes: notes
      ? {
          early: asString(notes.early),
          economy: asString(notes.economy),
          positioning: asString(notes.positioning),
          matchup: asString(notes.matchup),
        }
      : undefined,
  };
}

export function sanitizeGoldenSpatulaLineupVariant(
  variant: GoldenSpatulaLineupVariant,
): GoldenSpatulaLineupVariant {
  return {
    ...variant,
    mainCarries: normalizeLineupUnits(variant.mainCarries),
    frontliners: normalizeLineupUnits(variant.frontliners),
    units: normalizeLineupUnits(variant.units),
    rollTargetNames: sanitizeLineupTargetNames(variant.rollTargetNames),
    augmentRecommendations: normalizeLineupAugmentRecommendations(
      { augmentRecommendations: variant.augmentRecommendations },
      undefined,
    ),
  };
}

export function sanitizeGoldenSpatulaManagedLineup(
  lineup: GoldenSpatulaManagedLineup,
): GoldenSpatulaManagedLineup {
  return {
    ...lineup,
    variants: Array.isArray(lineup.variants)
      ? lineup.variants.map(sanitizeGoldenSpatulaLineupVariant)
      : [],
  };
}

export function sanitizeGoldenSpatulaLineupManagerState(
  manager: GoldenSpatulaLineupManagerState,
): GoldenSpatulaLineupManagerState {
  const lineups = Array.isArray(manager.lineups)
    ? manager.lineups.map(sanitizeGoldenSpatulaManagedLineup)
    : [];
  const activeLineupExists =
    manager.activeLineupId !== undefined &&
    lineups.some((lineup) => lineup.id === manager.activeLineupId);
  const activeVariantExists =
    manager.activeVariantId !== undefined &&
    lineups.some((lineup) =>
      lineup.variants.some((variant) => variant.id === manager.activeVariantId),
    );

  return {
    lineups,
    activeLineupId: activeLineupExists ? manager.activeLineupId : lineups[0]?.id,
    activeVariantId: activeVariantExists ? manager.activeVariantId : lineups[0]?.variants[0]?.id,
  };
}

export function createEmptyLineupVariant(
  slot: GoldenSpatulaVariantSlot,
  name: string,
): GoldenSpatulaLineupVariant {
  return {
    id: createId('variant'),
    slot,
    name,
    code: '',
    mainCarries: [],
    frontliners: [],
    units: [],
  };
}

export function ensureThreeLineupVariants(
  variants: unknown,
  fallbackNames: Record<GoldenSpatulaVariantSlot, string>,
): GoldenSpatulaLineupVariant[] {
  const input = Array.isArray(variants) ? variants : [];
  return variantSlots.map((slot, index) =>
    sanitizeVariant(input[index], slot, fallbackNames[slot]),
  );
}

function sanitizeManagedLineup(
  value: unknown,
  fallbackNames: Record<GoldenSpatulaVariantSlot, string>,
): GoldenSpatulaManagedLineup | null {
  const lineup = asRecord(value);
  const name = asString(lineup?.name);
  if (!lineup || !name) return null;

  const now = Date.now();
  const source = asRecord(lineup.source);

  return {
    id: asString(lineup.id) || createId('lineup'),
    name,
    createdAt: Number(lineup.createdAt) || now,
    updatedAt: Number(lineup.updatedAt) || now,
    source: source
      ? {
          kind:
            source.kind === 'recommended' || source.kind === 'imported' || source.kind === 'manual'
              ? source.kind
              : 'imported',
          sourceId: asString(source.sourceId),
          sourceUrl: asString(source.sourceUrl),
          version: asString(source.version),
        }
      : { kind: 'imported' },
    tags: asStringArray(lineup.tags),
    variants: ensureThreeLineupVariants(lineup.variants, fallbackNames),
  };
}

export function createManualLineup(
  name: string,
  fallbackNames: Record<GoldenSpatulaVariantSlot, string>,
): GoldenSpatulaManagedLineup {
  const now = Date.now();
  return {
    id: createId('lineup'),
    name,
    createdAt: now,
    updatedAt: now,
    source: { kind: 'manual' },
    variants: variantSlots.map((slot) => createEmptyLineupVariant(slot, fallbackNames[slot])),
  };
}

export function createManagedLineupFromRecommended(
  recommended: GoldenSpatulaRecommendedLineup,
  fallbackNames: Record<GoldenSpatulaVariantSlot, string>,
): GoldenSpatulaManagedLineup {
  const now = Date.now();
  return sanitizeGoldenSpatulaManagedLineup({
    id: createId('lineup'),
    name: recommended.name,
    createdAt: now,
    updatedAt: now,
    source: {
      kind: 'recommended',
      sourceId: recommended.id,
      sourceUrl: recommended.sourceUrl,
      version: recommended.version,
    },
    tags: [recommended.quality, recommended.version, recommended.season].filter(
      (tag): tag is string => Boolean(tag),
    ),
    variants: [
      { ...recommended.variant, id: createId('variant'), slot: 'A', name: fallbackNames.A },
      createEmptyLineupVariant('B', fallbackNames.B),
      createEmptyLineupVariant('C', fallbackNames.C),
    ],
  });
}

export function exportGoldenSpatulaLineups(lineups: GoldenSpatulaManagedLineup[]): string {
  const payload: GoldenSpatulaLineupExportPackage = {
    type: lineupPackageType,
    version: 1,
    exportedAt: new Date().toISOString(),
    lineups,
  };
  return JSON.stringify(payload, null, 2);
}

export function parseGoldenSpatulaLineupImport(
  content: string,
  fallbackLineupName: string,
  fallbackNames: Record<GoldenSpatulaVariantSlot, string>,
): { source: 'json' | 'text'; lineups: GoldenSpatulaManagedLineup[] } {
  const trimmed = content.trim();
  if (!trimmed) {
    return { source: 'text', lineups: [] };
  }

  if (trimmed.startsWith('{')) {
    const parsed = JSON.parse(trimmed) as unknown;
    const payload = asRecord(parsed);
    if (payload?.type !== lineupPackageType || payload.version !== 1) {
      throw new Error('unsupported_lineup_package');
    }
    const lineups = Array.isArray(payload.lineups)
      ? payload.lineups
          .map((item) => sanitizeManagedLineup(item, fallbackNames))
          .filter((item): item is GoldenSpatulaManagedLineup => Boolean(item))
      : [];
    return { source: 'json', lineups };
  }

  const lines = trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 3);

  if (lines.length === 0) return { source: 'text', lineups: [] };

  const lineup = createManualLineup(fallbackLineupName, fallbackNames);
  return {
    source: 'text',
    lineups: [
      {
        ...lineup,
        source: { kind: 'imported' },
        variants: lineup.variants.map((variant, index) => ({
          ...variant,
          code: lines[index] ?? '',
        })),
      },
    ],
  };
}

async function loadTemplateStatus(
  key: GoldenSpatulaTemplateCategory,
  basePath?: string,
): Promise<GoldenSpatulaTemplateCategoryStatus> {
  const manifestPath = templateManifestPaths[key];
  const manifest = await readJson<GoldenSpatulaTemplateManifest>(manifestPath, basePath);
  if (manifest.status !== 'ready') {
    return {
      key,
      path: manifest.path,
      status: manifest.status,
      error: manifest.error,
    };
  }

  return {
    key,
    path: manifest.path,
    status: 'ready',
    count: Array.isArray(manifest.data?.entries) ? manifest.data.entries.length : 0,
  };
}

export async function loadGoldenSpatulaAssistantData(
  basePath?: string,
): Promise<GoldenSpatulaAssistantData> {
  const [
    season,
    strategy,
    championManifest,
    championMetadata,
    itemManifest,
    traitManifest,
    traitMetadata,
    augmentManifest,
    augmentMetadata,
    templates,
  ] = await Promise.all([
    readJson<GoldenSpatulaSeasonInfo>(seasonPath, basePath),
    readJson<GoldenSpatulaStrategyData>(strategyPath, basePath),
    readJson<GoldenSpatulaTemplateManifest>(templateManifestPaths.champions, basePath),
    loadChampionMetadata(basePath),
    readJson<GoldenSpatulaTemplateManifest>(templateManifestPaths.items, basePath),
    readJson<GoldenSpatulaTemplateManifest>(templateManifestPaths.traits, basePath),
    loadTraitMetadata(basePath),
    readJson<GoldenSpatulaTemplateManifest>(templateManifestPaths.augments, basePath),
    loadAugmentMetadata(basePath),
    Promise.all(
      (Object.keys(templateManifestPaths) as GoldenSpatulaTemplateCategory[]).map((key) =>
        loadTemplateStatus(key, basePath),
      ),
    ),
  ]);

  return {
    season,
    strategy,
    championAssets:
      championManifest.status === 'ready'
        ? {
            path: championManifest.path,
            status: 'ready',
            data: normalizeChampionAssets(championManifest.data, championMetadata),
          }
        : {
            path: championManifest.path,
            status: championManifest.status,
            error: championManifest.error,
          },
    itemAssets:
      itemManifest.status === 'ready'
        ? {
            path: itemManifest.path,
            status: 'ready',
            data: normalizeItemAssets(itemManifest.data),
          }
        : {
            path: itemManifest.path,
            status: itemManifest.status,
            error: itemManifest.error,
          },
    traitAssets:
      traitManifest.status === 'ready'
        ? {
            path: traitManifest.path,
            status: 'ready',
            data: normalizeTraitAssets(traitManifest.data, traitMetadata),
          }
        : {
            path: traitManifest.path,
            status: traitManifest.status,
            error: traitManifest.error,
          },
    augmentAssets:
      augmentManifest.status === 'ready'
        ? {
            path: augmentManifest.path,
            status: 'ready',
            data: normalizeAugmentAssets(augmentManifest.data, augmentMetadata),
          }
        : {
            path: augmentManifest.path,
            status: augmentManifest.status,
            error: augmentManifest.error,
          },
    templates,
    loadedAt: Date.now(),
  };
}

export async function loadGoldenSpatulaRecommendedLineups(
  basePath?: string,
): Promise<GoldenSpatulaRecommendedLineupsData> {
  const index = await readJson<GoldenSpatulaLineupIndexData>(lineupIndexPath, basePath);

  if (index.status !== 'ready') {
    return {
      index,
      lineups: [],
      loadedAt: Date.now(),
    };
  }

  const entries = index.data?.entries ?? [];
  const lineups = (
    await Promise.all(
      entries.map(async (entry): Promise<GoldenSpatulaRecommendedLineup | null> => {
        const path = entry.path ? `knowledge/lineups/${normalizeRelativePath(entry.path)}` : '';
        if (!path) return null;

        const detail = await readJson<Record<string, unknown>>(path, basePath);
        if (detail.status !== 'ready' || !detail.data) return null;

        const fallbackId = String(entry.id ?? entry.slug ?? entry.path ?? path);
        const variant = normalizeVariantFromLineup(detail.data, {
          id: fallbackId,
          name: entry.name ?? fallbackId,
          path,
          season: index.data?.season,
        });

        return {
          id: variant.sourceId || fallbackId,
          slug: entry.slug ?? variant.sourceId ?? fallbackId,
          name: asString(detail.data.name) || entry.name || variant.name,
          path,
          quality: variant.quality,
          version: variant.version,
          season: variant.season,
          sourceUrl: variant.sourceUrl,
          variant,
        };
      }),
    )
  ).filter((item): item is GoldenSpatulaRecommendedLineup => Boolean(item));

  return {
    index,
    lineups,
    loadedAt: Date.now(),
  };
}
