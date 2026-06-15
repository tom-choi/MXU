import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const projectDir = path.join(repoRoot, 'projects', 'golden_spatula_mumu');
const knowledgeResourceDir = path.join(projectDir, 'resource_knowledge');
const knowledgeImageDir = path.join(knowledgeResourceDir, 'image');
const apiBase = 'https://www.jinchanchan.fun/api/jinchanchan/data';
const siteBase = 'https://www.jinchanchan.fun';
const opggAugmentTierPage = 'https://op.gg/zh-cn/tft/meta-trends/augments';
const defaultVersionPage = `${siteBase}/hero/v/`;
const fetchedAt = new Date().toISOString();

const imageSizes = {
  champion: 64,
  item: 48,
  trait: 48,
  augment: 48,
};

const knowledgeFocusScope = 'goldenSpatula.knowledge';
const shopChampionSlots = [
  { index: 1, label: '1', roi: [325, 580, 158, 125] },
  { index: 2, label: '2', roi: [483, 580, 158, 125] },
  { index: 3, label: '3', roi: [641, 580, 158, 125] },
  { index: 4, label: '4', roi: [799, 580, 158, 125] },
  { index: 5, label: '5', roi: [957, 580, 158, 125] },
];
const itemRecognitionZones = [
  { id: 'inventory', label: 'inventory', roi: [8, 72, 58, 230] },
  { id: 'bench', label: 'bench', roi: [270, 405, 620, 140] },
  { id: 'boardLower', label: 'boardLower', roi: [250, 245, 760, 230] },
];
const streakRecognitionRoi = [720, 532, 70, 42];

const requestHeaders = {
  'User-Agent': 'MXU GoldenSpatula knowledge fetcher (+local MaaFramework template research)',
};

function parseArgs(args) {
  const parsed = {
    force: false,
    limitImages: null,
    noResize: false,
    skipImages: false,
    versionId: null,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--force') {
      parsed.force = true;
      continue;
    }
    if (arg === '--no-resize') {
      parsed.noResize = true;
      continue;
    }
    if (arg === '--skip-images') {
      parsed.skipImages = true;
      continue;
    }
    if (arg === '--limit-images') {
      const next = args[i + 1];
      if (!next || Number.isNaN(Number(next))) {
        throw new Error('--limit-images requires a number');
      }
      parsed.limitImages = Number(next);
      i += 1;
      continue;
    }
    if (arg === '--version-id') {
      const next = args[i + 1];
      if (!next) {
        throw new Error('--version-id requires a value');
      }
      parsed.versionId = next;
      i += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return parsed;
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function writeJson(filePath, value) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function fetchJson(url) {
  let lastError = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: requestHeaders,
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok) {
        throw new Error(`Fetch failed ${response.status} ${response.statusText}: ${url}`);
      }
      return response.json();
    } catch (error) {
      lastError = error;
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
  }
  throw lastError;
}

async function fetchData(dataType, versionId = null) {
  const url = new URL(apiBase);
  url.searchParams.set('dataType', dataType);
  if (versionId) {
    url.searchParams.set('versionId', versionId);
  }

  const payload = await fetchJson(url);
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return payload.data;
  }
  return payload;
}

function asArray(value) {
  if (Array.isArray(value)) {
    return value;
  }
  if (value && typeof value === 'object') {
    return Object.values(value);
  }
  return [];
}

function safeToken(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);
}

function basenameToken(sourceUrl) {
  if (!sourceUrl) {
    return '';
  }
  try {
    const pathname = new URL(sourceUrl).pathname;
    return safeToken(path.basename(pathname, path.extname(pathname)));
  } catch {
    return safeToken(path.basename(sourceUrl, path.extname(sourceUrl)));
  }
}

function makeSlug(prefix, id, sourceUrl, fallbackName = '') {
  const token = basenameToken(sourceUrl) || safeToken(fallbackName);
  return [prefix, id, token].filter(Boolean).join('_');
}

function toRelativeResourcePath(filePath) {
  return path.relative(knowledgeImageDir, filePath).split(path.sep).join('/');
}

function toRelativeProjectPath(filePath) {
  return path.relative(projectDir, filePath).split(path.sep).join('/');
}

function cleanText(value) {
  if (value == null) {
    return '';
  }
  return String(value).replace(/\s+/g, ' ').trim();
}

function parseCsvIds(value) {
  if (!value) {
    return [];
  }
  return String(value)
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function uniqueFiniteIds(values) {
  return Array.from(new Set(values.map(Number).filter((value) => Number.isFinite(value))));
}

function parseMaybeJson(value, fallback = null) {
  if (value == null || value === '') {
    return fallback;
  }
  if (typeof value !== 'string') {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function itemCategory(item) {
  const type = cleanText(item.type);
  if (type.includes('基础')) {
    return 'basic';
  }
  if (Number(item.synthesis1) > 0 || Number(item.synthesis2) > 0 || type.includes('成')) {
    return 'completed';
  }
  return 'special';
}

function sourcePage(kind, versionId, id) {
  if (kind === 'lineup') {
    return `${siteBase}/lineup/v/${versionId}`;
  }
  if (kind === 'champion') {
    return `${siteBase}/hero/${versionId}/${id}`;
  }
  return `${siteBase}/${kind}/v/${versionId}`;
}

function championTraits(champion) {
  return [...asArray(champion.races), ...asArray(champion.traits)].map((trait) => ({
    id: trait.id ?? trait.trait_id ?? trait.tft_trait_id ?? null,
    name: trait.name ?? '',
  }));
}

function normalizeChampion(champion, context) {
  const slug = makeSlug('champion', champion.id, champion.picture, champion.name);
  const cost = Number(champion.price ?? champion.buy_price ?? 0);
  const templatePath = path.join(knowledgeImageDir, 'champion', String(cost), `${slug}.png`);
  const rawPath = path.join(
    projectDir,
    'raw',
    'jinchanchan',
    context.versionId,
    'image',
    'champion',
    `${slug}.png`,
  );
  const traits = championTraits(champion);

  return {
    id: Number(champion.id),
    slug,
    name: champion.name,
    aliases: [
      champion.name,
      champion.hero_paint,
      basenameToken(champion.picture),
      basenameToken(champion.skill_icon),
    ].filter(Boolean),
    cost,
    buy_price: Number(champion.buy_price ?? cost),
    traits: traits.map((trait) => trait.name).filter(Boolean),
    trait_refs: traits,
    skill: {
      name: champion.skill_name ?? '',
      description: cleanText(champion.skill_desc),
      brief_value: champion.skill_brief_value ?? '',
      value_description: cleanText(champion.skill_value_desc),
      icon: champion.skill_icon ?? '',
    },
    stats: asArray(champion.star_levels),
    image: {
      source_url: champion.picture ?? '',
      raw_path: toRelativeProjectPath(rawPath),
      template_path: toRelativeProjectPath(templatePath),
      template_resource_path: toRelativeResourcePath(templatePath),
      size: `${imageSizes.champion}x${imageSizes.champion}`,
    },
    source: {
      page_url: sourcePage('champion', context.versionId, champion.id),
      api_url: context.urls.chess,
      cdn_url: champion.picture ?? '',
    },
    season: context.season,
    version_id: context.versionId,
    fetched_at: fetchedAt,
    _raw: champion,
  };
}

function normalizeTrait(trait, context) {
  const id = trait.id ?? trait.trait_id ?? trait.tft_trait_id;
  const slug = makeSlug('trait', id, trait.picture, trait.name);
  const templatePath = path.join(knowledgeImageDir, 'trait', `${slug}.png`);
  const rawPath = path.join(
    projectDir,
    'raw',
    'jinchanchan',
    context.versionId,
    'image',
    'trait',
    `${slug}.png`,
  );

  return {
    id,
    slug,
    name: trait.name,
    aliases: [trait.name, basenameToken(trait.picture), trait.tft_trait_id].filter(Boolean),
    description: cleanText(trait.desc),
    effect: cleanText(trait.effect_desc ?? trait.level_info),
    levels: parseCsvIds(trait.num_list)
      .map(Number)
      .filter((num) => !Number.isNaN(num)),
    members: asArray(trait.members).map((member) => ({
      id: Number(member.id),
      name: member.name,
      cost: Number(member.price ?? 0),
    })),
    image: {
      source_url: trait.picture ?? '',
      raw_path: toRelativeProjectPath(rawPath),
      template_path: toRelativeProjectPath(templatePath),
      template_resource_path: toRelativeResourcePath(templatePath),
      size: `${imageSizes.trait}x${imageSizes.trait}`,
    },
    source: {
      page_url: sourcePage('trait', context.versionId, id),
      api_url: context.urls.trait,
      cdn_url: trait.picture ?? '',
    },
    season: context.season,
    version_id: context.versionId,
    fetched_at: fetchedAt,
    _raw: trait,
  };
}

function normalizeItem(item, context) {
  const category = itemCategory(item);
  const slug = makeSlug('item', item.id, item.picture, item.name);
  const templatePath = path.join(knowledgeImageDir, 'item', category, `${slug}.png`);
  const rawPath = path.join(
    projectDir,
    'raw',
    'jinchanchan',
    context.versionId,
    'image',
    'item',
    `${slug}.png`,
  );

  return {
    id: Number(item.id),
    slug,
    name: item.name,
    aliases: [item.name, item.icon, basenameToken(item.picture)].filter(Boolean),
    category,
    type: item.type ?? '',
    description: cleanText(item.desc),
    synthesis: [item.synthesis1, item.synthesis2]
      .map(Number)
      .filter((id) => Number.isFinite(id) && id > 0),
    recommended_users: [],
    needs_review: !item.picture,
    image: {
      source_url: item.picture ?? '',
      raw_path: toRelativeProjectPath(rawPath),
      template_path: toRelativeProjectPath(templatePath),
      template_resource_path: toRelativeResourcePath(templatePath),
      size: `${imageSizes.item}x${imageSizes.item}`,
    },
    source: {
      page_url: sourcePage('equip', context.versionId, item.id),
      api_url: context.urls.equip,
      cdn_url: item.picture ?? '',
    },
    season: context.season,
    version_id: context.versionId,
    fetched_at: fetchedAt,
    _raw: item,
  };
}

function normalizeAugment(hex, context) {
  const slug = makeSlug('augment', hex.id, hex.icon, hex.name);
  const templatePath = path.join(knowledgeImageDir, 'augment', `${slug}.png`);
  const rawPath = path.join(
    projectDir,
    'raw',
    'jinchanchan',
    context.versionId,
    'image',
    'augment',
    `${slug}.png`,
  );

  return {
    id: Number(hex.id),
    slug,
    name: hex.name,
    aliases: [hex.name, basenameToken(hex.icon)].filter(Boolean),
    level: Number(hex.level ?? 0),
    description: cleanText(hex.description),
    is_legend: Boolean(hex.is_legend),
    hero_enhancement_type: hex.hero_enhancement_type ?? '',
    fetter_id: hex.fetter_id ?? '',
    fetter_type: hex.fetter_type ?? '',
    image: {
      source_url: hex.icon ?? '',
      raw_path: toRelativeProjectPath(rawPath),
      template_path: toRelativeProjectPath(templatePath),
      template_resource_path: toRelativeResourcePath(templatePath),
      size: `${imageSizes.augment}x${imageSizes.augment}`,
    },
    source: {
      page_url: sourcePage('hex', context.versionId, hex.id),
      api_url: context.urls.hex,
      cdn_url: hex.icon ?? '',
    },
    season: context.season,
    version_id: context.versionId,
    fetched_at: fetchedAt,
    _raw: hex,
  };
}

function normalizeNameKey(value) {
  return cleanText(value).replace(/\s+/g, '').toLocaleLowerCase();
}

function extractJsonValueAfter(text, marker) {
  const markerIndex = text.indexOf(marker);
  if (markerIndex < 0) {
    return null;
  }

  let position = markerIndex + marker.length;
  while (/\s/.test(text[position])) {
    position += 1;
  }

  const open = text[position];
  const close = open === '[' ? ']' : '}';
  if ((open !== '[' && open !== '{') || !close) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escaping = false;

  for (let index = position; index < text.length; index += 1) {
    const char = text[index];
    if (inString) {
      if (escaping) {
        escaping = false;
      } else if (char === '\\') {
        escaping = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === open) {
      depth += 1;
      continue;
    }
    if (char === close) {
      depth -= 1;
      if (depth === 0) {
        return text.slice(position, index + 1);
      }
    }
  }

  return null;
}

function decodeNextRscPayload(html) {
  const regex = /<script>self\.__next_f\.push\(\[1,([\s\S]*?)\]\)<\/script>/g;
  let text = '';
  for (const match of html.matchAll(regex)) {
    try {
      text += JSON.parse(match[1]);
    } catch {
      // Ignore non-data chunks.
    }
  }
  return text;
}

async function fetchOpggAugmentStrengthTiers() {
  try {
    const response = await fetch(opggAugmentTierPage, { headers: requestHeaders });
    if (!response.ok) {
      throw new Error(`OP.GG fetch failed ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    const payload = decodeNextRscPayload(html);
    const tiersJson = extractJsonValueAfter(payload, '"augmentTiers":');
    const augmentsJson = extractJsonValueAfter(payload, '"AUGMENTS":');
    if (!tiersJson || !augmentsJson) {
      throw new Error('OP.GG augment tier payload was not found');
    }

    const tiers = JSON.parse(tiersJson);
    const augments = JSON.parse(augmentsJson);
    const opTierByApiName = new Map(
      asArray(tiers)
        .map((entry) => [entry.augments, entry.opTier])
        .filter(([apiName]) => apiName),
    );
    const byName = new Map();

    for (const augment of Object.values(augments)) {
      const name = cleanText(augment?.name);
      if (!name) continue;
      const key = normalizeNameKey(name);
      byName.set(key, {
        api_name: augment.apiName,
        name,
        tier: augment.tier,
        op_tier: opTierByApiName.get(augment.apiName) ?? null,
        source_url: opggAugmentTierPage,
      });
    }

    console.log(`OP.GG augment tiers loaded: ${byName.size}`);
    return byName;
  } catch (error) {
    console.warn(`Warning: OP.GG augment tier enrichment skipped: ${error.message}`);
    return new Map();
  }
}

function normalizeLineupUnit(unit, indexes) {
  const heroId = Number(unit.hero_id);
  const equipmentIds = parseCsvIds(unit.equipment_id).map(Number);
  const champion = indexes.championsById.get(heroId);
  return {
    id_in_lineup: unit.idInLineup ?? null,
    type: unit.chess_type ?? '',
    hero_id: Number.isFinite(heroId) ? heroId : unit.hero_id,
    hero_name: champion?.name ?? indexes.chessNameById.get(heroId) ?? '',
    equipment_ids: equipmentIds,
    equipment_names: equipmentIds.map((id) => indexes.itemsById.get(id)?.name ?? ''),
    is_carry: Boolean(unit.is_carry_hero),
    location: unit.location ?? '',
    needs_review: !champion,
  };
}

const augmentTierBonus = {
  OP: 8,
  S: 6,
  A: 4,
  B: 1,
  C: -4,
  contextual: 0,
  unknown: 0,
};

function clampRecommendationIndex(score) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function inferAugmentRoleTags(augment, lineupName) {
  const text = `${augment?.name ?? ''} ${augment?.description ?? ''} ${lineupName ?? ''}`;
  const tags = [];
  const add = (tag, pattern) => {
    if (pattern.test(text) && !tags.includes(tag)) {
      tags.push(tag);
    }
  };

  if (
    cleanText(augment?.hero_enhancement_type) &&
    cleanText(augment?.hero_enhancement_type) !== '0'
  ) {
    tags.push('exclusive');
  }
  add('economy', /金币|利息|经济|储蓄|收入|投资|贷款|消费|奖励|福袋|百宝袋/u);
  add('reroll', /刷新|商店|D牌|D个|升星|三星|复制器|弈子|备战席|门票/u);
  add('leveling', /经验|升级|等级|人口|上进心|后期专家|前瞻思维/u);
  add('combat', /伤害|攻击|法术|强度|暴击|攻速|飞升|护盾|治疗|护甲|魔抗|吸血|击杀/u);
  add('item', /装备|散件|成装|神器|锻炉|铁砧|重铸|潘朵拉|拆卸器|大剑|法杖|拳套|腰带|女神之泪/u);
  add('trait', /纹章|转职|羁绊|锅铲|阿福|节外生枝|蔓延之根|厨神/u);

  if (tags.length === 0) {
    tags.push('flex');
  }
  return tags;
}

function getAugmentStrength(augment, indexes) {
  const strength =
    indexes.augmentStrengthByName?.get(normalizeNameKey(augment?.name)) ??
    indexes.augmentStrengthByName?.get(normalizeNameKey(augment?.slug));
  return strength ?? null;
}

function noteMatchesRole(note, roleTags) {
  const checks = [
    ['economy', /经济|金币|利息|质量|追三|三星/u],
    ['reroll', /刷新|D|追三|三星|质量/u],
    ['leveling', /人口|上9|九五|95|经验/u],
    ['combat', /战力|上限|伤害|飞升/u],
    ['item', /装备|散件|神器|神装/u],
    ['trait', /转职|羁绊|定阵/u],
  ];

  return checks.some(([tag, pattern]) => roleTags.includes(tag) && pattern.test(note));
}

function buildSelectionDecision({ group, score, roleTags, strengthTier }) {
  const roleText = roleTags
    .filter((tag) => tag !== 'flex')
    .map((tag) => {
      if (tag === 'economy') return '经济';
      if (tag === 'reroll') return '追三/刷新';
      if (tag === 'leveling') return '升级节奏';
      if (tag === 'combat') return '战力';
      if (tag === 'item') return '装备';
      if (tag === 'trait') return '转职/羁绊';
      if (tag === 'exclusive') return '专属';
      return tag;
    })
    .join('、');
  const tierText =
    strengthTier && strengthTier !== 'contextual' && strengthTier !== 'unknown'
      ? `；通用强度 ${strengthTier}`
      : '';

  if (roleTags.includes('exclusive')) {
    return `定阵/专属强化：满足阵容条件时优先拿${tierText}`;
  }
  if (group === 'priority') {
    return score >= 94
      ? `首选强化：优先级最高，契合${roleText || '当前阵容'}${tierText}`
      : `核心推荐：同类选项中优先选择，主要补${roleText || '阵容需求'}${tierText}`;
  }
  return `可替代强化：主推荐缺席时选择，按${roleText || '当前局势'}补足阵容短板${tierText}`;
}

function buildAugmentRecommendationDetail({ id, group, rank, note, lineupName, indexes }) {
  const augment = indexes.augmentsById.get(Number(id));
  const strength = getAugmentStrength(augment, indexes);
  const strengthTier = strength?.op_tier || 'contextual';
  const roleTags = inferAugmentRoleTags(augment, lineupName);
  const baseScore = group === 'priority' ? 91 : 76;
  const rankPenalty = Math.max(0, rank - 1) * (group === 'priority' ? 2 : 1);
  const score = clampRecommendationIndex(
    baseScore -
      rankPenalty +
      (augmentTierBonus[strengthTier] ?? 0) +
      (roleTags.includes('exclusive') && group === 'priority' ? 5 : 0) +
      (noteMatchesRole(note, roleTags) ? 3 : 0),
  );

  return {
    id: Number(id),
    name: augment?.name ?? '',
    group,
    rank,
    recommended_index: score,
    strength_tier: strengthTier,
    level: Number(augment?.level ?? 0),
    role_tags: roleTags,
    selection_decision: buildSelectionDecision({ group, score, roleTags, strengthTier }),
    reason: [
      group === 'priority' ? '阵容来源列为核心推荐' : '阵容来源列为可替代推荐',
      strength?.op_tier
        ? `OP.GG 通用梯度 ${strength.op_tier}`
        : '通用榜单未稳定匹配，按阵容上下文评估',
      note ? `阵容备注：${note}` : '',
    ]
      .filter(Boolean)
      .join('；'),
    source: strength?.source_url ? 'jinchanchan_lineup+opgg_meta_trends' : 'jinchanchan_lineup',
  };
}

function buildLineupAugmentRecommendationDetails(
  priorityIds,
  alternativeIds,
  note,
  lineupName,
  indexes,
) {
  const seen = new Set();
  const details = [];
  for (const [group, ids] of [
    ['priority', priorityIds],
    ['alternative', alternativeIds],
  ]) {
    ids.forEach((id, index) => {
      const numericId = Number(id);
      if (!Number.isFinite(numericId) || seen.has(numericId)) {
        return;
      }
      seen.add(numericId);
      details.push(
        buildAugmentRecommendationDetail({
          id: numericId,
          group,
          rank: index + 1,
          note,
          lineupName,
          indexes,
        }),
      );
    });
  }
  return details;
}

function normalizeLineup(lineup, context, indexes) {
  const detail = parseMaybeJson(lineup.detail, {});
  const id = Number(lineup.id);
  const slug = `lineup_${id}`;
  const units = asArray(detail.hero_location).map((unit) => normalizeLineupUnit(unit, indexes));
  const carries = units.filter((unit) => unit.is_carry);
  const equipmentOrder = parseCsvIds(detail.equipment_order).map(Number);
  const hexbuff = detail.hexbuff ?? {};
  const priorityAugmentIds = uniqueFiniteIds(parseCsvIds(hexbuff.recomm));
  const alternativeAugmentIds = uniqueFiniteIds(parseCsvIds(hexbuff.replace)).filter(
    (augmentId) => !priorityAugmentIds.includes(augmentId),
  );
  const augmentIds = uniqueFiniteIds([...priorityAugmentIds, ...alternativeAugmentIds]);
  const augmentNote = cleanText(detail.hex_info);
  const lineupName = detail.line_name ?? lineup.line_name ?? '';

  return {
    id,
    slug,
    name: lineupName,
    quality: lineup.quality ?? '',
    rating: lineup.quality ?? '',
    tags: parseCsvIds(detail.line_tag),
    mode: lineup.mode ?? '',
    season: lineup.simulator_season ?? context.season,
    version: lineup.simulator_edition ?? context.version,
    main_carries: carries.map((unit) => ({
      hero_id: unit.hero_id,
      hero_name: unit.hero_name,
      equipment_ids: unit.equipment_ids,
      equipment_names: unit.equipment_names,
      location: unit.location,
    })),
    frontliners: units
      .filter((unit) => !unit.is_carry && String(unit.location).startsWith('1,'))
      .map((unit) => ({
        hero_id: unit.hero_id,
        hero_name: unit.hero_name,
        location: unit.location,
      })),
    units,
    traits_summary: detail.line_name ?? '',
    recommended_equipment: {
      note: cleanText(detail.equipment_info),
      order_ids: equipmentOrder,
      order_names: equipmentOrder.map((id) => indexes.itemsById.get(id)?.name ?? ''),
    },
    augment_recommendations: {
      ids: augmentIds,
      priority_ids: priorityAugmentIds,
      alternative_ids: alternativeAugmentIds,
      details: buildLineupAugmentRecommendationDetails(
        priorityAugmentIds,
        alternativeAugmentIds,
        augmentNote,
        lineupName,
        indexes,
      ),
      note: augmentNote,
    },
    notes: {
      early: cleanText(detail.early_info),
      economy: cleanText(detail.d_time),
      positioning: cleanText(detail.location_info),
      matchup: cleanText(detail.enemy_info),
    },
    source: {
      page_url: sourcePage('lineup', context.versionId, id),
      api_url: context.urls.lineup,
    },
    version_id: context.versionId,
    fetched_at: fetchedAt,
    _raw: {
      ...lineup,
      detail,
    },
  };
}

function makeLineupReferenceChampion(heroId, context, indexes) {
  const name = indexes.chessNameById.get(Number(heroId)) ?? `未解析棋子 ${heroId}`;
  return {
    id: Number(heroId),
    slug: `champion_ref_${heroId}`,
    name,
    aliases: [name, String(heroId)],
    cost: 0,
    buy_price: 0,
    traits: [],
    trait_refs: [],
    skill: {
      name: '',
      description: '',
      brief_value: '',
      value_description: '',
      icon: '',
    },
    stats: [],
    needs_review: true,
    source_kind: 'lineup_reference',
    image: {
      source_url: '',
      raw_path: '',
      template_path: '',
      template_resource_path: '',
      template_available: false,
      needs_review: true,
      download_error:
        'Lineup references this hero id, but the current chess table has no matching row.',
    },
    source: {
      page_url: sourcePage('lineup', context.versionId, heroId),
      api_url: context.urls.lineup,
      cdn_url: '',
    },
    season: context.season,
    version_id: context.versionId,
    fetched_at: fetchedAt,
    _raw: null,
  };
}

function addLineupReferenceChampions(champions, lineups, context, indexes) {
  const knownIds = new Set(champions.map((champion) => Number(champion.id)));
  const missingIds = new Set();

  for (const lineup of lineups) {
    for (const unit of lineup.units ?? []) {
      const heroId = Number(unit.hero_id);
      if (!Number.isFinite(heroId) || unit.type === 'pet' || knownIds.has(heroId)) {
        continue;
      }
      missingIds.add(heroId);
    }
  }

  for (const heroId of missingIds) {
    const placeholder = makeLineupReferenceChampion(heroId, context, indexes);
    champions.push(placeholder);
    indexes.championsById.set(heroId, placeholder);
  }

  for (const lineup of lineups) {
    for (const unit of lineup.units ?? []) {
      if (!unit.needs_review || unit.hero_name) {
        continue;
      }
      unit.hero_name = indexes.championsById.get(Number(unit.hero_id))?.name ?? '';
    }
  }

  champions.sort((a, b) => a.cost - b.cost || a.id - b.id);
  return missingIds.size;
}

function manifestEntry(entry, category, roiHint) {
  return {
    id: entry.id,
    name: entry.name,
    slug: entry.slug,
    category,
    season: entry.season,
    version_id: entry.version_id,
    source_url: entry.image.source_url,
    template_resource_path: entry.image.template_resource_path,
    template_available: entry.image.template_available !== false,
    needs_review: Boolean(entry.needs_review || entry.image.needs_review),
    download_error: entry.image.download_error ?? '',
    raw_path: entry.image.raw_path,
    usage: 'MaaFramework TemplateMatch local recognition template',
    roi_hint: roiHint,
  };
}

async function downloadFile(sourceUrl, destination, force) {
  if (!sourceUrl) {
    return { skipped: true, reason: 'missing-url' };
  }
  if (!force && (await exists(destination))) {
    return { skipped: true, reason: 'exists' };
  }

  await ensureDir(path.dirname(destination));
  const response = await fetch(sourceUrl, { headers: requestHeaders });
  if (!response.ok) {
    throw new Error(`Image fetch failed ${response.status}: ${sourceUrl}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(destination, buffer);
  return { skipped: false };
}

async function runLimited(items, limit, mapper) {
  const results = [];
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index], index);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

async function resizeBatch(jobs) {
  if (jobs.length === 0) {
    return;
  }

  const tempDir = path.join(repoRoot, 'node_modules', '.cache', 'golden_spatula_mumu');
  await ensureDir(tempDir);
  const jobsPath = path.join(tempDir, 'resize-jobs.json');
  const scriptPath = path.join(tempDir, 'resize-images.ps1');
  await writeJson(jobsPath, jobs);
  await fs.writeFile(
    scriptPath,
    `
param([string]$JobsPath)
Add-Type -AssemblyName System.Drawing
$jobs = Get-Content -Raw -LiteralPath $JobsPath | ConvertFrom-Json
foreach ($job in $jobs) {
  $source = [string]$job.source
  $destination = [string]$job.destination
  $width = [int]$job.width
  $height = [int]$job.height
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $destination) | Out-Null
  $image = $null
  $bitmap = $null
  $graphics = $null
  try {
    $image = [System.Drawing.Image]::FromFile($source)
    $bitmap = New-Object System.Drawing.Bitmap $width, $height, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.Clear([System.Drawing.Color]::Transparent)
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.DrawImage($image, 0, 0, $width, $height)
    $bitmap.Save($destination, [System.Drawing.Imaging.ImageFormat]::Png)
  }
  finally {
    if ($graphics -ne $null) { $graphics.Dispose() }
    if ($bitmap -ne $null) { $bitmap.Dispose() }
    if ($image -ne $null) { $image.Dispose() }
  }
}
`,
    'utf8',
  );

  await execFileAsync(
    'powershell',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath, jobsPath],
    { maxBuffer: 1024 * 1024 * 10 },
  );
}

async function copyImagesWithoutResize(jobs) {
  for (const job of jobs) {
    await ensureDir(path.dirname(job.destination));
    await fs.copyFile(job.source, job.destination);
  }
}

function buildRecognitionProbe({
  entry,
  filenamePrefix,
  matchMessage,
  matchNode,
  noMatchMessage,
  noMatchNode,
  roi,
  templates,
  threshold,
  timeout,
  tryNode,
}) {
  if (entry === 'RecognizeShopChampions') {
    return buildShopChampionSlotProbe({ templates, threshold });
  }

  const itemProbeConfig =
    entry === 'RecognizeItems'
      ? { itemKind: 'basicItems', nodePrefix: 'Items' }
      : entry === 'RecognizeBasicItems'
        ? { itemKind: 'basicItems', nodePrefix: 'BasicItems' }
        : entry === 'RecognizeCompletedItems'
          ? { itemKind: 'completedItems', nodePrefix: 'CompletedItems' }
          : entry === 'RecognizeSpecialItems'
            ? { itemKind: 'specialItems', nodePrefix: 'SpecialItems' }
            : null;

  if (itemProbeConfig) {
    return buildItemAreaProbe({
      entry,
      filenamePrefix,
      templates,
      threshold,
      ...itemProbeConfig,
    });
  }

  return {
    [entry]: {
      action: 'Screencap',
      filename: `${filenamePrefix}_before`,
      next: [tryNode],
    },
    [tryNode]: {
      next: [matchNode],
      timeout,
      on_error: [noMatchNode],
    },
    [matchNode]: {
      recognition: 'TemplateMatch',
      template: templates,
      threshold: templates.map(() => threshold),
      roi,
      action: 'Screencap',
      filename: `${filenamePrefix}_match`,
      focus: {
        'Node.Recognition.Succeeded': {
          content: matchMessage,
          display: 'log',
        },
      },
    },
    [noMatchNode]: {
      action: 'Screencap',
      filename: `${filenamePrefix}_no_match`,
      focus: {
        'Node.PipelineNode.Succeeded': {
          content: noMatchMessage,
          display: 'log',
        },
      },
    },
  };
}

function buildKnowledgeFocus(content, event, payload = {}) {
  return {
    content,
    display: 'log',
    scope: knowledgeFocusScope,
    event,
    ...payload,
  };
}

function getNextShopSlotFirstNode(slotPosition, templates) {
  const nextSlot = shopChampionSlots[slotPosition + 1];
  return nextSlot && templates.length > 0
    ? `KnowledgeShopChampions_S${nextSlot.index}_T1`
    : 'KnowledgeShopChampions_Done';
}

function buildShopChampionSlotProbe({ templates, threshold }) {
  const nodes = {
    RecognizeShopChampions: {
      action: 'Screencap',
      filename: 'knowledge_shop_champion_before',
      next:
        templates.length > 0
          ? [`KnowledgeShopChampions_S${shopChampionSlots[0].index}_T1`]
          : ['KnowledgeShopChampions_Done'],
      focus: {
        'Node.PipelineNode.Succeeded': buildKnowledgeFocus(
          'Start shop champion recognition across 5 calibrated slots.',
          'shopScanStarted',
          { scanKind: 'champions' },
        ),
      },
    },
    KnowledgeShopChampions_Done: {
      action: 'Screencap',
      filename: 'knowledge_shop_champion_done',
      focus: {
        'Node.PipelineNode.Succeeded': buildKnowledgeFocus(
          'Shop slot recognition completed.',
          'shopScanCompleted',
          { scanKind: 'champions' },
        ),
      },
    },
  };

  for (const [slotPosition, slot] of shopChampionSlots.entries()) {
    const slotMissNode = `KnowledgeShopChampions_S${slot.index}_NoMatch`;
    const nextSlotFirstNode = getNextShopSlotFirstNode(slotPosition, templates);

    for (const [templateIndex, templatePath] of templates.entries()) {
      const nodeName = `KnowledgeShopChampions_S${slot.index}_T${templateIndex + 1}`;
      const nextTemplateNode =
        templateIndex < templates.length - 1
          ? `KnowledgeShopChampions_S${slot.index}_T${templateIndex + 2}`
          : slotMissNode;

      nodes[nodeName] = {
        recognition: 'TemplateMatch',
        template: templatePath,
        threshold,
        roi: slot.roi,
        action: 'DoNothing',
        next: [nextSlotFirstNode],
        on_error: [nextTemplateNode],
        focus: {
          'Node.Recognition.Succeeded': buildKnowledgeFocus(
            `Shop slot ${slot.label} matched a champion template.`,
            'shopChampionHit',
            {
              scanKind: 'champions',
              slotIndex: slot.index,
              slotLabel: slot.label,
              templatePath,
            },
          ),
        },
      };
    }

    nodes[slotMissNode] = {
      action: 'DoNothing',
      next: [nextSlotFirstNode],
      focus: {
        'Node.PipelineNode.Succeeded': buildKnowledgeFocus(
          `Shop slot ${slot.label} did not match any champion template.`,
          'shopSlotMiss',
          {
            scanKind: 'champions',
            slotIndex: slot.index,
            slotLabel: slot.label,
          },
        ),
      },
    };
  }

  return nodes;
}

function getItemZoneSuffix(zone) {
  return zone.id[0].toUpperCase() + zone.id.slice(1);
}

function buildItemAreaProbe({ entry, filenamePrefix, itemKind, nodePrefix, templates, threshold }) {
  const getNodeName = (zone, templateIndex) =>
    `Knowledge${nodePrefix}_${getItemZoneSuffix(zone)}_T${templateIndex + 1}`;
  const doneNode = `Knowledge${nodePrefix}_Done`;
  const firstNode = templates.length > 0 ? getNodeName(itemRecognitionZones[0], 0) : doneNode;
  const nodes = {
    [entry]: {
      action: 'Screencap',
      filename: `${filenamePrefix}_before`,
      next: [firstNode],
      focus: {
        'Node.PipelineNode.Succeeded': buildKnowledgeFocus(
          'Start item recognition across inventory, bench, and lower-board zones.',
          'itemScanStarted',
          { scanKind: itemKind, itemKind },
        ),
      },
    },
    [doneNode]: {
      action: 'Screencap',
      filename: `${filenamePrefix}_done`,
      focus: {
        'Node.PipelineNode.Succeeded': buildKnowledgeFocus(
          'Item zone recognition completed.',
          'itemScanCompleted',
          { scanKind: itemKind, itemKind },
        ),
      },
    },
  };

  for (const [zoneIndex, zone] of itemRecognitionZones.entries()) {
    for (const [templateIndex, templatePath] of templates.entries()) {
      const isLastTemplate = templateIndex === templates.length - 1;
      const nextZone = itemRecognitionZones[zoneIndex + 1];
      const nextNode = !isLastTemplate
        ? getNodeName(zone, templateIndex + 1)
        : nextZone
          ? getNodeName(nextZone, 0)
          : doneNode;

      nodes[getNodeName(zone, templateIndex)] = {
        recognition: 'TemplateMatch',
        template: templatePath,
        threshold,
        roi: zone.roi,
        action: 'DoNothing',
        next: [nextNode],
        on_error: [nextNode],
        focus: {
          'Node.Recognition.Succeeded': buildKnowledgeFocus(
            `Item template matched in ${zone.label}.`,
            'itemHit',
            {
              scanKind: itemKind,
              itemKind,
              zone: zone.id,
              templatePath,
            },
          ),
        },
      };
    }
  }

  return nodes;
}

function buildStreakProbe() {
  const replace = [
    ['O', '0'],
    ['o', '0'],
    ['I', '1'],
    ['l', '1'],
    ['S', '5'],
    ['s', '5'],
    ['B', '8'],
  ];
  const nodes = {
    RecognizeStreakState: {
      action: 'Screencap',
      filename: 'knowledge_streak_before',
      next: ['KnowledgeStreak_Interest'],
      focus: {
        'Node.PipelineNode.Succeeded': buildKnowledgeFocus(
          'Start win/loss streak interest OCR.',
          'streakScanStarted',
          { scanKind: 'streak' },
        ),
      },
    },
    KnowledgeStreak_Interest: {
      recognition: 'OCR',
      expected: String.raw`\d{1}`,
      threshold: 0.35,
      replace,
      order_by: 'Expected',
      roi: streakRecognitionRoi,
      action: 'DoNothing',
      next: ['KnowledgeStreak_Done'],
      on_error: ['KnowledgeStreak_Done'],
      focus: {
        'Node.Recognition.Succeeded': buildKnowledgeFocus(
          'Win/loss streak interest OCR matched.',
          'streakRecognized',
          { scanKind: 'streak' },
        ),
        'Node.Recognition.Failed': buildKnowledgeFocus(
          'Win/loss streak interest OCR missed.',
          'streakScanFailed',
          { scanKind: 'streak' },
        ),
      },
    },
    KnowledgeStreak_Done: {
      action: 'Screencap',
      filename: 'knowledge_streak_done',
      focus: {
        'Node.PipelineNode.Succeeded': buildKnowledgeFocus(
          'Win/loss streak OCR completed.',
          'streakScanCompleted',
          { scanKind: 'streak' },
        ),
      },
    },
  };

  return nodes;
}

function buildKnowledgePipeline(templates) {
  const smokeChampion = templates.champions[0] ?? 'champion/1/missing.png';
  const smokeItem =
    templates.itemsBasic[0] ??
    templates.itemsCompleted[0] ??
    templates.itemsSpecial[0] ??
    'item/basic/missing.png';
  const smokeTrait = templates.traits[0] ?? 'trait/missing.png';
  const smokeAugment = templates.augments[0] ?? 'augment/missing.png';

  return {
    KnowledgeSmokeTest: {
      action: 'Screencap',
      filename: 'knowledge_smoke_before',
      next: ['KnowledgeSmoke_ChampionTemplateLoads'],
    },
    KnowledgeSmoke_ChampionTemplateLoads: {
      recognition: 'TemplateMatch',
      template: smokeChampion,
      threshold: 0.999,
      roi: [0, 0, 1280, 720],
      inverse: true,
      action: 'DoNothing',
      next: ['KnowledgeSmoke_ItemTemplateLoads'],
      focus: {
        'Node.Recognition.Failed': {
          content: '知识库模板加载异常：棋子模板未通过探测。',
          display: 'log',
        },
      },
    },
    KnowledgeSmoke_ItemTemplateLoads: {
      recognition: 'TemplateMatch',
      template: smokeItem,
      threshold: 0.999,
      roi: [0, 0, 1280, 720],
      inverse: true,
      action: 'DoNothing',
      next: ['KnowledgeSmoke_TraitTemplateLoads'],
      focus: {
        'Node.Recognition.Failed': {
          content: '知识库模板加载异常：装备模板未通过探测。',
          display: 'log',
        },
      },
    },
    KnowledgeSmoke_TraitTemplateLoads: {
      recognition: 'TemplateMatch',
      template: smokeTrait,
      threshold: 0.999,
      roi: [0, 0, 1280, 720],
      inverse: true,
      action: 'DoNothing',
      next: ['KnowledgeSmoke_AugmentTemplateLoads'],
      focus: {
        'Node.Recognition.Failed': {
          content: '知识库模板加载异常：羁绊模板未通过探测。',
          display: 'log',
        },
      },
    },
    KnowledgeSmoke_AugmentTemplateLoads: {
      recognition: 'TemplateMatch',
      template: smokeAugment,
      threshold: 0.999,
      roi: [0, 0, 1280, 720],
      inverse: true,
      action: 'DoNothing',
      next: ['KnowledgeSmoke_Done'],
      focus: {
        'Node.Recognition.Failed': {
          content: '知识库模板加载异常：强化符文模板未通过探测。',
          display: 'log',
        },
      },
    },
    KnowledgeSmoke_Done: {
      action: 'Screencap',
      filename: 'knowledge_smoke_templates_loaded',
      focus: {
        'Node.PipelineNode.Succeeded': {
          content: '知识库模板加载完成：棋子、装备、羁绊和强化符文模板可读取。',
          display: 'log',
        },
      },
    },

    ...buildRecognitionProbe({
      entry: 'RecognizeShopChampions',
      filenamePrefix: 'knowledge_shop_champion',
      matchMessage: '商店棋子模板命中。',
      matchNode: 'KnowledgeShopChampions_MatchAny',
      noMatchMessage: '商店棋子模板未命中。',
      noMatchNode: 'KnowledgeShopChampions_NoMatch',
      roi: [150, 500, 980, 220],
      templates: templates.champions,
      threshold: 0.72,
      timeout: 1500,
      tryNode: 'KnowledgeShopChampions_TryMatch',
    }),

    ...buildRecognitionProbe({
      entry: 'RecognizeItems',
      filenamePrefix: 'knowledge_basic_item',
      matchMessage: '基础装备模板命中。',
      matchNode: 'KnowledgeItems_MatchBasic',
      noMatchMessage: '基础装备模板未命中。',
      noMatchNode: 'KnowledgeItems_NoBasicMatch',
      roi: [0, 400, 1280, 320],
      templates: templates.itemsBasic,
      threshold: 0.86,
      timeout: 1500,
      tryNode: 'KnowledgeItems_TryBasicMatch',
    }),
    ...buildRecognitionProbe({
      entry: 'RecognizeBasicItems',
      filenamePrefix: 'knowledge_basic_item',
      matchMessage: '基础装备模板命中。',
      matchNode: 'KnowledgeBasicItems_MatchAny',
      noMatchMessage: '基础装备模板未命中。',
      noMatchNode: 'KnowledgeBasicItems_NoMatch',
      roi: [0, 400, 1280, 320],
      templates: templates.itemsBasic,
      threshold: 0.86,
      timeout: 1500,
      tryNode: 'KnowledgeBasicItems_TryMatch',
    }),
    ...buildRecognitionProbe({
      entry: 'RecognizeCompletedItems',
      filenamePrefix: 'knowledge_completed_item',
      matchMessage: '成装模板命中。',
      matchNode: 'KnowledgeCompletedItems_MatchAny',
      noMatchMessage: '成装模板未命中。',
      noMatchNode: 'KnowledgeCompletedItems_NoMatch',
      roi: [0, 400, 1280, 320],
      templates: templates.itemsCompleted,
      threshold: 0.86,
      timeout: 1500,
      tryNode: 'KnowledgeCompletedItems_TryMatch',
    }),
    ...buildRecognitionProbe({
      entry: 'RecognizeSpecialItems',
      filenamePrefix: 'knowledge_special_item',
      matchMessage: '特殊装备模板命中。',
      matchNode: 'KnowledgeSpecialItems_MatchAny',
      noMatchMessage: '特殊装备模板未命中。',
      noMatchNode: 'KnowledgeSpecialItems_NoMatch',
      roi: [0, 400, 1280, 320],
      templates: templates.itemsSpecial,
      threshold: 0.88,
      timeout: 2000,
      tryNode: 'KnowledgeSpecialItems_TryMatch',
    }),

    ...buildStreakProbe(),

    ...buildRecognitionProbe({
      entry: 'RecognizeTraitsPanel',
      filenamePrefix: 'knowledge_trait',
      matchMessage: '羁绊模板命中。',
      matchNode: 'KnowledgeTraits_MatchAny',
      noMatchMessage: '羁绊模板未命中。',
      noMatchNode: 'KnowledgeTraits_NoMatch',
      roi: [0, 0, 360, 720],
      templates: templates.traits,
      threshold: 0.74,
      timeout: 1500,
      tryNode: 'KnowledgeTraits_TryMatch',
    }),
  };
}

async function writeManifests(entries, context) {
  const imageDir = knowledgeImageDir;
  const imageEntries = {
    augments: entries.augments.filter((entry) => entry.image.source_url),
    champions: entries.champions.filter((entry) => entry.image.source_url),
    items: entries.items.filter((entry) => entry.image.source_url),
    traits: entries.traits.filter((entry) => entry.image.source_url),
  };

  const championRoi = {
    shop_slots_1280x720: shopChampionSlots.map((slot) => slot.roi),
    note: '5 calibrated shop slot ROIs shared with the dynamic roll pipeline.',
  };
  const itemRoi = {
    zones_1280x720: Object.fromEntries(itemRecognitionZones.map((zone) => [zone.id, zone.roi])),
    note: 'Item recognition is split into inventory, bench, and lower-board zones.',
  };
  const traitRoi = {
    left_panel_1280x720: [0, 0, 360, 720],
    note: '对局内左侧羁绊列表或羁绊面板区域。',
  };
  const augmentRoi = {
    augment_choice_1280x720: [180, 120, 920, 500],
    note: '强化符文选择区域；第一版仅做模板分类，不接自动选择。',
  };

  const championManifest = {
    generated_at: fetchedAt,
    source: context.urls,
    season: context.season,
    version_id: context.versionId,
    category: 'champion',
    entries: imageEntries.champions.map((entry) => manifestEntry(entry, 'champion', championRoi)),
  };
  await writeJson(path.join(imageDir, 'champion', 'manifest.json'), championManifest);
  for (const cost of [0, 1, 2, 3, 4, 5]) {
    const costEntries = imageEntries.champions.filter((entry) => Number(entry.cost) === cost);
    await writeJson(path.join(imageDir, 'champion', String(cost), 'manifest.json'), {
      ...championManifest,
      cost,
      entries: costEntries.map((entry) => manifestEntry(entry, 'champion', championRoi)),
    });
  }

  const itemManifest = {
    generated_at: fetchedAt,
    source: context.urls,
    season: context.season,
    version_id: context.versionId,
    category: 'item',
    entries: imageEntries.items.map((entry) => manifestEntry(entry, entry.category, itemRoi)),
  };
  await writeJson(path.join(imageDir, 'item', 'manifest.json'), itemManifest);
  for (const category of ['basic', 'completed', 'special']) {
    const categoryEntries = imageEntries.items.filter((entry) => entry.category === category);
    await writeJson(path.join(imageDir, 'item', category, 'manifest.json'), {
      ...itemManifest,
      subcategory: category,
      entries: categoryEntries.map((entry) => manifestEntry(entry, category, itemRoi)),
    });
  }

  await writeJson(path.join(imageDir, 'trait', 'manifest.json'), {
    generated_at: fetchedAt,
    source: context.urls,
    season: context.season,
    version_id: context.versionId,
    category: 'trait',
    entries: imageEntries.traits.map((entry) => manifestEntry(entry, 'trait', traitRoi)),
  });

  await writeJson(path.join(imageDir, 'augment', 'manifest.json'), {
    generated_at: fetchedAt,
    source: context.urls,
    season: context.season,
    version_id: context.versionId,
    category: 'augment',
    entries: imageEntries.augments.map((entry) => manifestEntry(entry, 'augment', augmentRoi)),
  });
}

async function writeKnowledge(entries, context, versionsInfo, activeVersions) {
  const knowledgeDir = path.join(projectDir, 'knowledge');

  await writeJson(path.join(knowledgeDir, 'seasons', 'current.json'), {
    version_id: context.versionId,
    version: context.version,
    season: context.season,
    name: context.versionInfo?.name ?? '',
    set_id: context.versionInfo?.set_id ?? '',
    is_active: Boolean(context.versionInfo?.is_active),
    is_default: Boolean(context.versionInfo?.is_default),
    fetched_at: fetchedAt,
    source_urls: {
      default_version_api: context.urls.defaultVersion,
      active_versions_api: context.urls.activeVersions,
      versions_info_api: context.urls.versionsInfo,
      hero_page: `${defaultVersionPage}${context.versionId}`,
      lineup_page: `${siteBase}/lineup/v/${context.versionId}`,
    },
    counts: {
      champions: entries.champions.length,
      traits: entries.traits.length,
      items: entries.items.length,
      augments: entries.augments.length,
      lineups: entries.lineups.length,
    },
    active_versions: activeVersions,
    versions_info: versionsInfo,
  });

  const collections = [
    ['champions', entries.champions],
    ['traits', entries.traits],
    ['items', entries.items],
    ['augments', entries.augments],
    ['lineups', entries.lineups],
  ];

  for (const [name, collection] of collections) {
    const dir = path.join(knowledgeDir, name);
    await ensureDir(dir);
    await writeJson(path.join(dir, 'index.json'), {
      generated_at: fetchedAt,
      version_id: context.versionId,
      season: context.season,
      count: collection.length,
      entries: collection.map((entry) => ({
        id: entry.id,
        slug: entry.slug,
        name: entry.name,
        path: `${entry.slug}.json`,
      })),
    });

    for (const entry of collection) {
      await writeJson(path.join(dir, `${entry.slug}.json`), entry);
    }
  }
}

async function writeRawData(rawData, context) {
  const rawDir = path.join(projectDir, 'raw', 'jinchanchan', context.versionId, 'data');
  for (const [name, value] of Object.entries(rawData)) {
    await writeJson(path.join(rawDir, `${name}.json`), value);
  }
}

async function prepareImages(entries, options) {
  const allImageEntries = [
    ...entries.champions.map((entry) => ['champion', entry]),
    ...entries.items.map((entry) => ['item', entry]),
    ...entries.traits.map((entry) => ['trait', entry]),
    ...entries.augments.map((entry) => ['augment', entry]),
  ].filter(([, entry]) => entry.image.source_url);

  const selected = options.limitImages
    ? allImageEntries.slice(0, options.limitImages)
    : allImageEntries;

  console.log(`Preparing ${selected.length} image templates...`);

  const downloadJobs = selected.map(([kind, entry]) => ({
    kind,
    entry,
    sourceUrl: entry.image.source_url,
    rawPath: path.join(projectDir, entry.image.raw_path),
    templatePath: path.join(projectDir, entry.image.template_path),
    size: imageSizes[kind],
  }));

  let downloaded = 0;
  const readyJobs = [];
  await runLimited(downloadJobs, 8, async (job) => {
    try {
      const result = await downloadFile(job.sourceUrl, job.rawPath, options.force);
      if (!result.skipped) {
        downloaded += 1;
      }
      if (await exists(job.rawPath)) {
        readyJobs.push(job);
      }
    } catch (error) {
      job.entry.needs_review = true;
      job.entry.image.needs_review = true;
      job.entry.image.template_available = false;
      job.entry.image.download_error = error.message;
      console.warn(`Warning: skipped image template for ${job.entry.name}: ${error.message}`);
    }
  });

  const resizeJobs = readyJobs
    .filter((job) => job.rawPath !== job.templatePath)
    .map((job) => ({
      source: job.rawPath,
      destination: job.templatePath,
      width: job.size,
      height: job.size,
    }));

  if (options.noResize) {
    await copyImagesWithoutResize(resizeJobs);
  } else {
    await resizeBatch(resizeJobs);
  }

  console.log(
    `Image templates ready: ${selected.length}, downloaded: ${downloaded}, resized: ${resizeJobs.length}`,
  );
}

function buildContext(versionId, versionsInfo) {
  const allVersions = asArray(versionsInfo);
  const versionInfo =
    allVersions.find((item) => item.version_id === versionId) ??
    allVersions.find((item) => item.is_default) ??
    {};

  return {
    versionId,
    version: versionInfo.version ?? '',
    season: versionInfo.season ?? '',
    versionInfo,
    urls: {
      defaultVersion: `${apiBase}?dataType=default_version`,
      activeVersions: `${apiBase}?dataType=active_versions`,
      versionsInfo: `${apiBase}?dataType=versions_info`,
      chess: `${apiBase}?dataType=chess&versionId=${encodeURIComponent(versionId)}`,
      chessNameIndex: `${apiBase}?dataType=chess_name_index&versionId=${encodeURIComponent(versionId)}`,
      equip: `${apiBase}?dataType=equip&versionId=${encodeURIComponent(versionId)}`,
      trait: `${apiBase}?dataType=trait&versionId=${encodeURIComponent(versionId)}`,
      hex: `${apiBase}?dataType=hex&versionId=${encodeURIComponent(versionId)}`,
      lineup: `${apiBase}?dataType=lineup&versionId=${encodeURIComponent(versionId)}`,
    },
  };
}

function enrichItemsWithLineupRecommendations(items, lineups) {
  const itemById = new Map(items.map((item) => [Number(item.id), item]));
  for (const lineup of lineups) {
    for (const unit of lineup.units ?? []) {
      for (const itemId of unit.equipment_ids ?? []) {
        const item = itemById.get(Number(itemId));
        if (!item || !unit.hero_name) {
          continue;
        }
        if (!item.recommended_users.includes(unit.hero_name)) {
          item.recommended_users.push(unit.hero_name);
        }
      }
    }
  }
}

function pipelineTemplates(entries) {
  const champions = entries.champions
    .filter((entry) => Number(entry.cost) > 0)
    .filter((entry) => entry._raw?.enabled !== false)
    .filter((entry) => entry._raw?.show_hero_tag !== false)
    .filter((entry) => entry.image.template_available !== false)
    .map((entry) => entry.image.template_resource_path);
  const availableItems = entries.items
    .filter((entry) => entry.image.template_available !== false)
    .filter((entry) => entry.image.template_resource_path);
  const itemsBasic = availableItems
    .filter((entry) => entry.category === 'basic')
    .map((entry) => entry.image.template_resource_path);
  const itemsCompleted = availableItems
    .filter((entry) => entry.category === 'completed')
    .map((entry) => entry.image.template_resource_path);
  const itemsSpecial = availableItems
    .filter((entry) => entry.category === 'special')
    .map((entry) => entry.image.template_resource_path);
  const traits = entries.traits
    .filter((entry) => entry.image.template_available !== false)
    .map((entry) => entry.image.template_resource_path);
  const augments = entries.augments
    .filter((entry) => entry.image.template_available !== false)
    .slice(0, 80)
    .map((entry) => entry.image.template_resource_path);
  return { augments, champions, itemsBasic, itemsCompleted, itemsSpecial, traits };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const defaultVersion = await fetchData('default_version');
  const versionId = options.versionId ?? String(defaultVersion);

  console.log(`Fetching Golden Spatula knowledge data: ${versionId}`);

  const [activeVersions, versionsInfo, chessRaw, equipRaw, traitRaw, hexRaw, lineupRaw] =
    await Promise.all([
      fetchData('active_versions'),
      fetchData('versions_info'),
      fetchData('chess', versionId),
      fetchData('equip', versionId),
      fetchData('trait', versionId),
      fetchData('hex', versionId),
      fetchData('lineup', versionId),
    ]);
  const chessNameIndexRaw = await fetchData('chess_name_index', versionId);
  const augmentStrengthByName = await fetchOpggAugmentStrengthTiers();

  const context = buildContext(versionId, versionsInfo);
  const champions = asArray(chessRaw)
    .filter((champion) => champion && champion.picture)
    .map((champion) => normalizeChampion(champion, context))
    .sort((a, b) => a.cost - b.cost || a.id - b.id);
  const traits = asArray(traitRaw)
    .filter((trait) => trait && trait.picture)
    .map((trait) => normalizeTrait(trait, context))
    .sort((a, b) => String(a.name).localeCompare(String(b.name), 'zh-Hans-CN'));
  const items = asArray(equipRaw)
    .filter((item) => item && item.picture)
    .map((item) => normalizeItem(item, context))
    .sort((a, b) => a.id - b.id);
  const augments = asArray(hexRaw)
    .filter((hex) => hex && hex.icon)
    .map((hex) => normalizeAugment(hex, context))
    .sort((a, b) => a.id - b.id);

  const indexes = {
    championsById: new Map(champions.map((champion) => [Number(champion.id), champion])),
    augmentsById: new Map(augments.map((augment) => [Number(augment.id), augment])),
    augmentStrengthByName,
    itemsById: new Map(items.map((item) => [Number(item.id), item])),
    chessNameById: new Map(
      Object.entries(chessNameIndexRaw ?? {}).map(([name, id]) => [
        Number(id),
        String(name).replace(/\(远程\)$/u, ''),
      ]),
    ),
  };
  const lineups = asArray(lineupRaw)
    .map((lineup) => normalizeLineup(lineup, context, indexes))
    .filter((lineup) => lineup.id && lineup.name)
    .sort((a, b) => a.id - b.id);
  const lineupReferenceChampions = addLineupReferenceChampions(
    champions,
    lineups,
    context,
    indexes,
  );
  enrichItemsWithLineupRecommendations(items, lineups);

  const entries = { augments, champions, items, lineups, traits };
  await writeRawData(
    {
      active_versions: activeVersions,
      chess: chessRaw,
      chess_name_index: chessNameIndexRaw,
      equip: equipRaw,
      hex: hexRaw,
      lineup: lineupRaw,
      trait: traitRaw,
      versions_info: versionsInfo,
    },
    context,
  );
  if (!options.skipImages) {
    await prepareImages(entries, options);
  }

  await writeKnowledge(entries, context, versionsInfo, activeVersions);
  await writeManifests(entries, context);
  await writeJson(
    path.join(knowledgeResourceDir, 'pipeline', 'knowledge.json'),
    buildKnowledgePipeline(pipelineTemplates(entries)),
  );

  console.log('Knowledge base generated.');
  console.log(`Champions: ${champions.length}`);
  console.log(`Lineup reference champions needing review: ${lineupReferenceChampions}`);
  console.log(`Traits: ${traits.length}`);
  console.log(`Items: ${items.length}`);
  console.log(`Augments: ${augments.length}`);
  console.log(`Lineups: ${lineups.length}`);
}

main().catch((error) => {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
});
