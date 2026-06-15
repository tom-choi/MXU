import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const projectDir = path.join(repoRoot, 'projects', 'golden_spatula_mumu');
const lineupDir = path.join(projectDir, 'knowledge', 'lineups');
const augmentDir = path.join(projectDir, 'knowledge', 'augments');
const seasonPath = path.join(projectDir, 'knowledge', 'seasons', 'current.json');
const opggAugmentTierPage = 'https://op.gg/zh-cn/tft/meta-trends/augments';

const requestHeaders = {
  'User-Agent': 'MXU GoldenSpatula augment recommendation enricher',
};

const augmentTierBonus = {
  OP: 8,
  S: 6,
  A: 4,
  B: 1,
  C: -4,
  contextual: 0,
  unknown: 0,
};

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return Object.values(value);
  return [];
}

function cleanText(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseCsvIds(value) {
  return cleanText(value)
    .split(',')
    .map((part) => Number(part.trim()))
    .filter((id) => Number.isFinite(id));
}

function uniqueFiniteIds(values) {
  return Array.from(new Set(values.map(Number).filter((value) => Number.isFinite(value))));
}

function normalizeNameKey(value) {
  return cleanText(value).replace(/\s+/g, '').toLocaleLowerCase();
}

function extractJsonValueAfter(text, marker) {
  const markerIndex = text.indexOf(marker);
  if (markerIndex < 0) return null;

  let position = markerIndex + marker.length;
  while (/\s/.test(text[position])) position += 1;

  const open = text[position];
  const close = open === '[' ? ']' : '}';
  if ((open !== '[' && open !== '{') || !close) return null;

  let depth = 0;
  let inString = false;
  let escaping = false;

  for (let index = position; index < text.length; index += 1) {
    const char = text[index];
    if (inString) {
      if (escaping) escaping = false;
      else if (char === '\\') escaping = true;
      else if (char === '"') inString = false;
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
      if (depth === 0) return text.slice(position, index + 1);
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
  const response = await fetch(opggAugmentTierPage, { headers: requestHeaders });
  if (!response.ok) {
    throw new Error(`OP.GG fetch failed ${response.status} ${response.statusText}`);
  }

  const payload = decodeNextRscPayload(await response.text());
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
    byName.set(normalizeNameKey(name), {
      api_name: augment.apiName,
      name,
      tier: augment.tier,
      op_tier: opTierByApiName.get(augment.apiName) ?? null,
      source_url: opggAugmentTierPage,
    });
  }

  return byName;
}

function inferAugmentRoleTags(augment, lineupName) {
  const text = `${augment?.name ?? ''} ${augment?.description ?? ''} ${lineupName ?? ''}`;
  const tags = [];
  const add = (tag, pattern) => {
    if (pattern.test(text) && !tags.includes(tag)) tags.push(tag);
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

  if (tags.length === 0) tags.push('flex');
  return tags;
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

function clampRecommendationIndex(score) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function roleLabel(tag) {
  if (tag === 'economy') return '经济';
  if (tag === 'reroll') return '追三/刷新';
  if (tag === 'leveling') return '升级节奏';
  if (tag === 'combat') return '战力';
  if (tag === 'item') return '装备';
  if (tag === 'trait') return '转职/羁绊';
  if (tag === 'exclusive') return '专属';
  return tag;
}

function buildSelectionDecision({ group, score, roleTags, strengthTier }) {
  const roleText = roleTags
    .filter((tag) => tag !== 'flex')
    .map(roleLabel)
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

function buildRecommendationDetail({
  id,
  group,
  rank,
  note,
  lineupName,
  augmentById,
  strengthByName,
}) {
  const augment = augmentById.get(Number(id));
  const strength = strengthByName.get(normalizeNameKey(augment?.name));
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

function buildRecommendationDetails({
  priorityIds,
  alternativeIds,
  note,
  lineupName,
  augmentById,
  strengthByName,
}) {
  const seen = new Set();
  const details = [];
  for (const [group, ids] of [
    ['priority', priorityIds],
    ['alternative', alternativeIds],
  ]) {
    ids.forEach((id, index) => {
      const numericId = Number(id);
      if (!Number.isFinite(numericId) || seen.has(numericId)) return;
      seen.add(numericId);
      details.push(
        buildRecommendationDetail({
          id: numericId,
          group,
          rank: index + 1,
          note,
          lineupName,
          augmentById,
          strengthByName,
        }),
      );
    });
  }
  return details;
}

async function main() {
  const [lineupIndex, augmentIndex, strengthByName] = await Promise.all([
    readJson(path.join(lineupDir, 'index.json')),
    readJson(path.join(augmentDir, 'index.json')),
    fetchOpggAugmentStrengthTiers(),
  ]);

  const augmentById = new Map();
  for (const entry of augmentIndex.entries ?? []) {
    const detail = await readJson(path.join(augmentDir, entry.path));
    augmentById.set(Number(detail.id ?? entry.id), detail);
  }

  let enriched = 0;
  let recommendationDetails = 0;
  const strengthTiers = new Map();

  for (const entry of lineupIndex.entries ?? []) {
    const filePath = path.join(lineupDir, entry.path);
    const lineup = await readJson(filePath);
    const hexbuff = lineup._raw?.detail?.hexbuff ?? {};
    const priorityIds = uniqueFiniteIds(parseCsvIds(hexbuff.recomm));
    const alternativeIds = uniqueFiniteIds(parseCsvIds(hexbuff.replace)).filter(
      (id) => !priorityIds.includes(id),
    );
    const note = cleanText(lineup.augment_recommendations?.note ?? lineup._raw?.detail?.hex_info);
    const ids = uniqueFiniteIds([...priorityIds, ...alternativeIds]);
    const details = buildRecommendationDetails({
      priorityIds,
      alternativeIds,
      note,
      lineupName: lineup.name,
      augmentById,
      strengthByName,
    });

    lineup.augment_recommendations = {
      ...(lineup.augment_recommendations ?? {}),
      ids,
      priority_ids: priorityIds,
      alternative_ids: alternativeIds,
      details,
      note,
    };

    for (const detail of details) {
      recommendationDetails += 1;
      strengthTiers.set(detail.strength_tier, (strengthTiers.get(detail.strength_tier) ?? 0) + 1);
    }
    enriched += 1;
    await writeJson(filePath, lineup);
  }

  const season = await readJson(seasonPath);
  season.source_urls = {
    ...(season.source_urls ?? {}),
    lineup_api:
      'https://www.jinchanchan.fun/api/jinchanchan/data?dataType=lineup&versionId=17_17.17.4_S18',
    augment_page: 'https://www.jinchanchan.fun/hex/v/17_17.17.4_S18',
    augment_strength_page: opggAugmentTierPage,
  };
  season.counts = {
    ...(season.counts ?? {}),
    lineup_augment_recommendations: recommendationDetails,
  };
  await writeJson(seasonPath, season);

  console.log('Golden Spatula augment recommendations enriched.');
  console.log(`Lineups: ${enriched}`);
  console.log(`Recommendation details: ${recommendationDetails}`);
  console.log(`Strength tiers: ${JSON.stringify(Object.fromEntries(strengthTiers), null, 2)}`);
}

main().catch((error) => {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
});
