import { invoke } from '@tauri-apps/api/core';
import { isTauri } from '@/utils/paths';
import type {
  GoldenSpatulaAssistantData,
  GoldenSpatulaAugmentAssetIndex,
  GoldenSpatulaChampionAssetIndex,
  GoldenSpatulaFileLoad,
  GoldenSpatulaItemAssetIndex,
  GoldenSpatulaLineupExportPackage,
  GoldenSpatulaLineupIndexData,
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
  GoldenSpatulaVariantSlot,
} from '@/types/goldenSpatula';

const seasonPath = 'knowledge/seasons/current.json';
const strategyPath = 'knowledge/strategy/lin_xiaobei_17_4.json';
const lineupIndexPath = 'knowledge/lineups/index.json';
const championIndexPath = 'knowledge/champions/index.json';
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

function normalizeLineupUnit(value: unknown): GoldenSpatulaLineupUnit | null {
  const unit = asRecord(value);
  if (!unit) return null;

  const name = asString(unit.hero_name) || asString(unit.name);
  if (!name) return null;
  if (/^未解析棋子\s*\d+/u.test(name) || name === '圣物' || name === '聖物') return null;

  const unitType = asString(unit.type);
  if (unitType && unitType !== 'hero') return null;

  return {
    name,
    items: asStringArray(unit.equipment_names),
    location: asString(unit.location),
    isCarry: Boolean(unit.is_carry),
    type: unitType,
    needsReview: Boolean(unit.needs_review),
  };
}

function normalizeLineupUnits(value: unknown): GoldenSpatulaLineupUnit[] {
  return Array.isArray(value)
    ? value
        .map((item) => normalizeLineupUnit(item))
        .filter((item): item is GoldenSpatulaLineupUnit => Boolean(item))
    : [];
}

function normalizeAssetKey(name: string): string {
  return name.trim().toLocaleLowerCase();
}

function normalizeImageAssets(
  manifest: GoldenSpatulaTemplateManifest | undefined,
  baseImagePath: string,
  metadata?: Record<string, { cost?: number }>,
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
      name,
      imagePath,
      sourceUrl: asString(entry?.source_url),
      templateAvailable,
      cost: metadata?.[key]?.cost ?? asNumber(entry?.cost),
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
  metadata?: Record<string, { cost?: number }>,
): GoldenSpatulaChampionAssetIndex {
  return normalizeImageAssets(manifest, 'resource_knowledge/image', metadata);
}

function normalizeItemAssets(
  manifest: GoldenSpatulaTemplateManifest | undefined,
): GoldenSpatulaItemAssetIndex {
  return normalizeImageAssets(manifest, 'resource_knowledge/image');
}

function normalizeAugmentAssets(
  manifest: GoldenSpatulaTemplateManifest | undefined,
): GoldenSpatulaAugmentAssetIndex {
  return normalizeImageAssets(manifest, 'resource_knowledge/image');
}

async function loadChampionMetadata(basePath?: string): Promise<Record<string, { cost?: number }>> {
  const index = await readJson<{ entries?: unknown[] }>(championIndexPath, basePath);
  if (index.status !== 'ready' || !Array.isArray(index.data?.entries)) return {};

  const pairs = await Promise.all(
    index.data.entries.map(async (entryValue): Promise<[string, { cost?: number }] | null> => {
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
      if (!name || cost === undefined) return null;

      return [normalizeAssetKey(name), { cost }];
    }),
  );

  const metadata: Record<string, { cost?: number }> = {};
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
  const rollTargetNames = Array.isArray(variant?.rollTargetNames)
    ? asStringArray(variant.rollTargetNames)
    : undefined;

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
  return {
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
  };
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
    augmentManifest,
    templates,
  ] = await Promise.all([
    readJson<GoldenSpatulaSeasonInfo>(seasonPath, basePath),
    readJson<GoldenSpatulaStrategyData>(strategyPath, basePath),
    readJson<GoldenSpatulaTemplateManifest>(templateManifestPaths.champions, basePath),
    loadChampionMetadata(basePath),
    readJson<GoldenSpatulaTemplateManifest>(templateManifestPaths.items, basePath),
    readJson<GoldenSpatulaTemplateManifest>(templateManifestPaths.augments, basePath),
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
    augmentAssets:
      augmentManifest.status === 'ready'
        ? {
            path: augmentManifest.path,
            status: 'ready',
            data: normalizeAugmentAssets(augmentManifest.data),
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
