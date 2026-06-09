import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const servicePath = path.join(repoRoot, 'src', 'services', 'goldenSpatulaRollPipeline.ts');
const runnerPath = path.join(repoRoot, 'scripts', 'golden-spatula-run-red-dot.mjs');
const championManifestPath = path.join(
  repoRoot,
  'projects',
  'golden_spatula_mumu',
  'resource_knowledge',
  'image',
  'champion',
  'manifest.json',
);
const lineupIndexPath = path.join(
  repoRoot,
  'projects',
  'golden_spatula_mumu',
  'knowledge',
  'lineups',
  'index.json',
);
const lineupDir = path.join(repoRoot, 'projects', 'golden_spatula_mumu', 'knowledge', 'lineups');
const projectRoot = path.join(repoRoot, 'projects', 'golden_spatula_mumu');
const resourceImageRoot = path.join(projectRoot, 'resource', 'image');
const knowledgeImageRoot = path.join(projectRoot, 'resource_knowledge', 'image');
const mmorCalibrationPath = path.join(projectRoot, 'analysis', 'video', '2', 'operations.json');
const defaultTargetDir = path.join(repoRoot, 'src-tauri', 'target', 'debug');
const allowedCounts = new Set([1, 3, 5]);
const allowedLineupTargetModes = new Set(['main', 'core', 'all']);
const maxCapturedOutputChars = 20000;

function parseArgs(args) {
  const parsed = {
    apiBase: process.env.MXU_API_BASE || null,
    displayShortSide: 720,
    dryRun: true,
    instanceId: 'golden-auto-roll-buy',
    levelFirst: false,
    lineupJson: null,
    lineupQuery: null,
    lineupTargetMode: 'core',
    printOverride: false,
    preflightOnly: false,
    reportFile: null,
    rollCount: 3,
    selectedTaskId: `golden-auto-roll-buy-${Date.now()}`,
    skipPrepare: false,
    startMxu: true,
    targetDir: defaultTargetDir,
    championNames: [],
    targets: [],
    targetsJson: null,
    timeoutMs: 300000,
    writeOverride: null,
    xpCount: 1,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    const next = args[i + 1];
    if (arg === '--run') {
      parsed.dryRun = false;
      parsed.preflightOnly = false;
    } else if (arg === '--dry-run') {
      parsed.dryRun = true;
      parsed.preflightOnly = false;
    } else if (arg === '--preflight-only') {
      parsed.dryRun = true;
      parsed.preflightOnly = true;
    } else if (arg === '--level-first') {
      parsed.levelFirst = true;
    } else if (arg === '--print-override') {
      parsed.printOverride = true;
    } else if (arg === '--target' && next) {
      parsed.targets.push(parseTargetSpec(next));
      i += 1;
    } else if (arg === '--champion' && next) {
      parsed.championNames.push(next);
      i += 1;
    } else if (arg === '--targets-json' && next) {
      parsed.targetsJson = path.resolve(repoRoot, next);
      i += 1;
    } else if (arg === '--lineup' && next) {
      parsed.lineupQuery = next;
      i += 1;
    } else if (arg === '--lineup-json' && next) {
      parsed.lineupJson = path.resolve(repoRoot, next);
      i += 1;
    } else if (arg === '--lineup-target-mode' && next) {
      if (!allowedLineupTargetModes.has(next)) {
        throw new Error('--lineup-target-mode must be one of main, core, all');
      }
      parsed.lineupTargetMode = next;
      i += 1;
    } else if (arg === '--report-file' && next) {
      parsed.reportFile = path.resolve(repoRoot, next);
      i += 1;
    } else if (arg === '--roll-count' && next) {
      parsed.rollCount = parseCount(next, '--roll-count');
      i += 1;
    } else if (arg === '--xp-count' && next) {
      parsed.xpCount = parseCount(next, '--xp-count');
      parsed.levelFirst = true;
      i += 1;
    } else if (arg === '--write-override' && next) {
      parsed.writeOverride = path.resolve(repoRoot, next);
      i += 1;
    } else if (arg === '--api-base' && next) {
      parsed.apiBase = next;
      i += 1;
    } else if (arg === '--instance' && next) {
      parsed.instanceId = next;
      i += 1;
    } else if (arg === '--selected-task-id' && next) {
      parsed.selectedTaskId = next;
      i += 1;
    } else if (arg === '--target-dir' && next) {
      parsed.targetDir = path.resolve(repoRoot, next);
      i += 1;
    } else if (arg === '--timeout-ms' && next) {
      parsed.timeoutMs = Number(next);
      i += 1;
    } else if (arg === '--display-short-side' && next) {
      parsed.displayShortSide = Number(next);
      i += 1;
    } else if (arg === '--skip-prepare') {
      parsed.skipPrepare = true;
    } else if (arg === '--no-start-mxu') {
      parsed.startMxu = false;
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
  }

  return parsed;
}

function parseCount(value, label) {
  const count = Number(value);
  if (!allowedCounts.has(count)) {
    throw new Error(`${label} must be one of 1, 3, 5`);
  }
  return count;
}

function parseTargetSpec(spec) {
  const separator = spec.indexOf('=');
  if (separator <= 0 || separator === spec.length - 1) {
    throw new Error('--target must use NAME=template/path.png');
  }

  return normalizeTarget({
    name: spec.slice(0, separator),
    templatePath: spec.slice(separator + 1),
  });
}

function normalizeTemplatePath(rawValue) {
  if (typeof rawValue !== 'string') {
    throw new Error('Target templatePath must be a string');
  }

  const raw = rawValue.trim();
  if (!raw) {
    throw new Error('Target templatePath cannot be empty');
  }

  let normalized = raw.replace(/\\/g, '/');
  const imageMarker = '/image/';
  const imageIndex = normalized.lastIndexOf(imageMarker);
  if (imageIndex >= 0) {
    normalized = normalized.slice(imageIndex + imageMarker.length);
  } else if (normalized.startsWith('image/')) {
    normalized = normalized.slice('image/'.length);
  } else if (path.isAbsolute(raw)) {
    throw new Error(`Absolute template paths must point inside an image directory: ${raw}`);
  }

  normalized = normalized.replace(/^\/+/, '');
  const segments = normalized.split('/').filter(Boolean);
  if (segments.length === 0 || segments.some((segment) => segment === '..')) {
    throw new Error(`Unsafe target template path: ${raw}`);
  }
  if (!normalized.toLowerCase().endsWith('.png')) {
    throw new Error(`Target template path must end with .png: ${raw}`);
  }

  return segments.join('/');
}

function normalizeRelativeJsonPath(rawValue) {
  if (typeof rawValue !== 'string') {
    throw new Error('Lineup path must be a string');
  }

  const raw = rawValue.trim().replace(/\\/g, '/');
  const segments = raw.split('/').filter(Boolean);
  if (segments.length === 0 || segments.some((segment) => segment === '..')) {
    throw new Error(`Unsafe lineup path: ${rawValue}`);
  }
  if (!raw.toLowerCase().endsWith('.json')) {
    throw new Error(`Lineup path must end with .json: ${rawValue}`);
  }

  return segments.join('/');
}

function normalizeTarget(input) {
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (!name) {
    throw new Error('Target name cannot be empty');
  }

  const templatePath = normalizeTemplatePath(
    input.templatePath ?? input.template ?? input.path ?? input.imagePath,
  );

  return { name, templatePath };
}

function normalizeLookupName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/絲/g, '丝');
}

async function loadChampionManifest() {
  const raw = await fs.readFile(championManifestPath, 'utf8');
  const manifest = JSON.parse(raw);
  const entries = Array.isArray(manifest.entries) ? manifest.entries : [];
  return entries.filter(
    (entry) => entry?.template_available !== false && entry?.template_resource_path,
  );
}

function findChampionEntry(championEntries, value) {
  const query = normalizeLookupName(value);
  return (
    championEntries.find((entry) => normalizeLookupName(entry.name) === query) ??
    championEntries.find((entry) => normalizeLookupName(entry.slug).includes(query))
  );
}

function findChampionEntryByUnit(championEntries, unit) {
  const heroId = Number(unit?.hero_id ?? unit?.id);
  if (Number.isFinite(heroId)) {
    const matchedById = championEntries.find((entry) => Number(entry.id) === heroId);
    if (matchedById) return matchedById;
  }

  const name = getLineupUnitName(unit);
  return name ? findChampionEntry(championEntries, name) : null;
}

function championEntryToTarget(entry) {
  return normalizeTarget({
    name: entry.name,
    templatePath: entry.template_resource_path,
  });
}

async function loadChampionTargets(names, championEntries) {
  if (names.length === 0) return [];

  return names.map((name) => {
    const matched = findChampionEntry(championEntries, name);

    if (!matched) {
      throw new Error(`Champion target not found in local manifest: ${name}`);
    }

    return championEntryToTarget(matched);
  });
}

async function loadTargetsJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  const parsed = JSON.parse(raw);
  const items = Array.isArray(parsed) ? parsed : parsed?.targets;
  if (!Array.isArray(items)) {
    throw new Error(`${filePath} must contain an array or { "targets": [...] }`);
  }
  return items.map((item) => normalizeTarget(item));
}

function getLineupUnitName(unit) {
  const name = typeof unit?.hero_name === 'string' ? unit.hero_name.trim() : '';
  if (name) return name;
  return typeof unit?.name === 'string' ? unit.name.trim() : '';
}

function isUsableLineupUnit(unit) {
  const type = typeof unit?.type === 'string' ? unit.type : unit?.chess_type;
  if (type && type !== 'hero') return false;

  const name = getLineupUnitName(unit);
  if (!name) return Boolean(unit?.hero_id ?? unit?.id);
  if (/^未解析棋子\s*\d+/u.test(name) || name === '圣物' || name === '聖物') return false;
  return true;
}

function asLineupUnitArray(value) {
  return Array.isArray(value) ? value.filter(isUsableLineupUnit) : [];
}

function getRawLineupDetail(raw) {
  const rawRecord = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw._raw : null;
  if (rawRecord && typeof rawRecord === 'object' && !Array.isArray(rawRecord)) {
    const detail = rawRecord.detail;
    if (detail && typeof detail === 'object' && !Array.isArray(detail)) return detail;
  }
  return raw?.detail && typeof raw.detail === 'object' && !Array.isArray(raw.detail)
    ? raw.detail
    : null;
}

function getLineupTargetUnits(lineup, mode) {
  const mainCarries = asLineupUnitArray(lineup.main_carries);
  const frontliners = asLineupUnitArray(lineup.frontliners);
  const units = asLineupUnitArray(lineup.units);

  if (mode === 'main') return mainCarries;
  if (mode === 'all') return [...mainCarries, ...frontliners, ...units];
  return [...mainCarries, ...frontliners];
}

function findLineupEntry(index, query) {
  const entries = Array.isArray(index.entries) ? index.entries : [];
  const normalizedQuery = normalizeLookupName(query);
  const exact = entries.filter((entry) => {
    return (
      String(entry?.id ?? '') === String(query) ||
      normalizeLookupName(entry?.slug) === normalizedQuery ||
      normalizeLookupName(entry?.name) === normalizedQuery
    );
  });

  if (exact.length === 1) return exact[0];
  if (exact.length > 1) {
    throw new Error(`Lineup query is ambiguous: ${query}`);
  }

  const fuzzy = entries.filter((entry) =>
    normalizeLookupName(entry?.name).includes(normalizedQuery),
  );
  if (fuzzy.length === 1) return fuzzy[0];
  if (fuzzy.length > 1) {
    throw new Error(
      `Lineup query is ambiguous: ${query}. Matches: ${fuzzy
        .slice(0, 6)
        .map((entry) => entry.name || entry.slug || entry.id)
        .join(', ')}`,
    );
  }

  throw new Error(`Lineup not found in local index: ${query}`);
}

async function loadLineupFromQuery(query) {
  const index = JSON.parse(await fs.readFile(lineupIndexPath, 'utf8'));
  const entry = findLineupEntry(index, query);
  if (!entry?.path) {
    throw new Error(`Lineup index entry has no detail path: ${query}`);
  }

  const detailPath = path.join(lineupDir, normalizeRelativeJsonPath(entry.path));
  const detail = JSON.parse(await fs.readFile(detailPath, 'utf8'));
  return {
    detail,
    label: detail.name || entry.name || entry.slug || String(entry.id),
  };
}

async function loadLineupFromJson(filePath) {
  const detail = JSON.parse(await fs.readFile(filePath, 'utf8'));
  return {
    detail,
    label: detail.name || path.basename(filePath),
  };
}

async function loadLineupTargets(options, championEntries) {
  const requestedLineups = [];
  if (options.lineupQuery) {
    requestedLineups.push(await loadLineupFromQuery(options.lineupQuery));
  }
  if (options.lineupJson) {
    requestedLineups.push(await loadLineupFromJson(options.lineupJson));
  }
  if (requestedLineups.length === 0) {
    return { targets: [], labels: [], skipped: [] };
  }

  const targets = [];
  const skipped = [];
  for (const lineup of requestedLineups) {
    const detail = lineup.detail;
    const rawDetail = getRawLineupDetail(detail);
    const source = {
      ...detail,
      main_carries: detail.main_carries?.length ? detail.main_carries : rawDetail?.main_carries,
      frontliners: detail.frontliners?.length ? detail.frontliners : rawDetail?.frontliners,
      units: detail.units?.length ? detail.units : rawDetail?.units,
    };
    const units = getLineupTargetUnits(source, options.lineupTargetMode);
    for (const unit of units) {
      const matched = findChampionEntryByUnit(championEntries, unit);
      if (!matched) {
        skipped.push(getLineupUnitName(unit) || String(unit?.hero_id ?? unit?.id ?? 'unknown'));
        continue;
      }
      targets.push(championEntryToTarget(matched));
    }
  }

  return {
    targets,
    labels: requestedLineups.map((lineup) => lineup.label),
    skipped,
  };
}

function dedupeTargets(targets) {
  const seen = new Set();
  const result = [];
  for (const target of targets) {
    const key = target.templatePath;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(target);
  }
  return result;
}

async function importRollPipelineModule() {
  const source = await fs.readFile(servicePath, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2020,
      sourceMap: false,
    },
    fileName: servicePath,
  });

  const moduleUrl = `data:text/javascript;base64,${Buffer.from(transpiled.outputText).toString(
    'base64',
  )}`;
  return import(moduleUrl);
}

function countFocusPayloads(nodes) {
  return Object.values(nodes).reduce((total, node) => {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return total;
    const focus = node.focus;
    return total + (focus && typeof focus === 'object' ? Object.keys(focus).length : 0);
  }, 0);
}

function summarizePipeline(overrideJson) {
  const nodes = JSON.parse(overrideJson);
  const nodeValues = Object.values(nodes);
  const recognitionNodes = nodeValues.filter(
    (node) => node?.recognition === 'TemplateMatch',
  ).length;
  const clickNodes = nodeValues.filter((node) => node?.action === 'Click').length;
  return {
    nodes: Object.keys(nodes).length,
    recognitionNodes,
    clickNodes,
    focusPayloads: countFocusPayloads(nodes),
  };
}

function pointInRect(point, rect) {
  const [x, y] = point;
  const [rectX, rectY, width, height] = rect;
  return x >= rectX && x <= rectX + width && y >= rectY && y <= rectY + height;
}

function distance(pointA, pointB) {
  return Number(Math.hypot(pointA[0] - pointB[0], pointA[1] - pointB[1]).toFixed(2));
}

function createPreflightCheck(key, status, message, details = {}) {
  return {
    key,
    status,
    message,
    details,
  };
}

function summarizePreflight(checks) {
  if (checks.some((check) => check.status === 'fail')) return 'fail';
  if (checks.some((check) => check.status === 'warn')) return 'warn';
  return 'pass';
}

async function fileExists(filePath) {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile();
  } catch {
    return false;
  }
}

async function buildTemplatePreflight(plan) {
  const checks = [];
  for (const target of plan.targets) {
    const absolutePath = path.join(knowledgeImageRoot, target.templatePath);
    const exists = await fileExists(absolutePath);
    checks.push(
      createPreflightCheck(
        `target-template:${target.name}`,
        exists ? 'pass' : 'fail',
        exists
          ? `Target template exists: ${target.name}`
          : `Target template is missing: ${target.name}`,
        {
          name: target.name,
          templatePath: target.templatePath,
          absolutePath: relativeOrNull(absolutePath),
        },
      ),
    );
  }
  return checks;
}

async function buildButtonTemplatePreflight(roll) {
  const templates = [
    ...roll.goldenSpatulaBuyXpButtonTemplates,
    ...roll.goldenSpatulaShopRefreshButtonTemplates,
  ];

  const checks = [];
  for (const template of templates) {
    const absolutePath = path.join(resourceImageRoot, template);
    const exists = await fileExists(absolutePath);
    checks.push(
      createPreflightCheck(
        `button-template:${template}`,
        exists ? 'pass' : 'fail',
        exists ? `Button template exists: ${template}` : `Button template is missing: ${template}`,
        {
          templatePath: template,
          absolutePath: relativeOrNull(absolutePath),
        },
      ),
    );
  }
  return checks;
}

function buildSlotTargetPreflight(roll) {
  return roll.goldenSpatulaShopChampionSlots.map((slot) => {
    const point = [...slot.target];
    const roi = [...slot.roi];
    const inside = pointInRect(point, roi);
    return createPreflightCheck(
      `slot-target:${slot.label}`,
      inside ? 'pass' : 'fail',
      inside
        ? `Slot ${slot.label} buy target is inside its ROI`
        : `Slot ${slot.label} buy target is outside its ROI`,
      {
        slotIndex: slot.index,
        roi,
        target: point,
      },
    );
  });
}

function buildOverrideShapePreflight(plan) {
  const nodes = JSON.parse(plan.pipelineOverride);
  const buyNodes = Object.entries(nodes).filter(
    ([name, node]) => /^AutoRollBuy_C\d+_Buy\d+_T\d+_S\d+$/.test(name) && node?.action === 'Click',
  );
  const dynamicCenterTargets = buyNodes.filter(([, node]) => node.target === true);
  const fixedPointTargets = buyNodes.filter(([, node]) => Array.isArray(node.target));
  const badTargets = fixedPointTargets.filter(([, node]) => !pointInRect(node.target, node.roi));

  return [
    createPreflightCheck(
      'override:initial-shop-ready-guard',
      nodes.AutoRollBuy_ShopReady?.recognition === 'TemplateMatch' &&
        nodes.AutoRollBuy_ShopReady?.action === 'DoNothing' &&
        Array.isArray(nodes.AutoRollBuy_ShopReady?.on_error) &&
        nodes.AutoRollBuy_ShopReady.on_error.includes('AutoRollBuy_InitialShopNotReady')
        ? 'pass'
        : 'fail',
      'Dynamic override includes initial shop-ready guard',
      {
        hasShopReady: Boolean(nodes.AutoRollBuy_ShopReady),
        hasInitialNotReady: Boolean(nodes.AutoRollBuy_InitialShopNotReady),
      },
    ),
    createPreflightCheck(
      'override:fixed-buy-targets',
      dynamicCenterTargets.length === 0 && badTargets.length === 0 ? 'pass' : 'fail',
      dynamicCenterTargets.length === 0 && badTargets.length === 0
        ? 'Dynamic buy nodes use calibrated fixed slot targets'
        : 'Dynamic buy nodes contain unsafe buy targets',
      {
        buyNodeCount: buyNodes.length,
        fixedPointTargetCount: fixedPointTargets.length,
        dynamicCenterTargetCount: dynamicCenterTargets.length,
        badTargetCount: badTargets.length,
      },
    ),
  ];
}

async function buildMmorEvidencePreflight(roll) {
  if (!(await fileExists(mmorCalibrationPath))) {
    return [
      createPreflightCheck(
        'calibration:mmor-video-2',
        'warn',
        'Second recording MMOR calibration report is missing',
        {
          expectedPath: relativeOrNull(mmorCalibrationPath),
        },
      ),
    ];
  }

  const report = JSON.parse(await fs.readFile(mmorCalibrationPath, 'utf8'));
  const checks = [];
  checks.push(
    createPreflightCheck(
      'calibration:mmor-transform',
      report.coordinateTransform?.selected === 'rotatedClockwise' ? 'pass' : 'warn',
      `MMOR coordinate transform: ${report.coordinateTransform?.selected ?? 'unknown'}`,
      {
        selected: report.coordinateTransform?.selected ?? null,
        gestureCount: report.metadata?.gestureCount ?? null,
      },
    ),
  );

  for (const slot of roll.goldenSpatulaShopChampionSlots) {
    const region = report.regionStats?.find((item) => item.key === `slot${slot.index}`);
    if (!region?.medianPoint) {
      checks.push(
        createPreflightCheck(
          `calibration:slot-${slot.label}`,
          'warn',
          `No MMOR median point for slot ${slot.label}`,
          {
            slotIndex: slot.index,
          },
        ),
      );
      continue;
    }

    const drift = distance([...slot.target], region.medianPoint);
    checks.push(
      createPreflightCheck(
        `calibration:slot-${slot.label}`,
        drift <= 70 ? 'pass' : 'fail',
        `Slot ${slot.label} fixed buy target drift from MMOR median: ${drift}px`,
        {
          slotIndex: slot.index,
          target: [...slot.target],
          recordedMedian: region.medianPoint,
          distance: drift,
          recordedCount: region.count,
        },
      ),
    );
  }

  const timing = report.timingAnalysis;
  if (timing) {
    const refreshMinMs = Math.floor(timing.refreshToNextShopStats?.min * 1000);
    const refreshMedianMs = Math.ceil(timing.refreshToNextShopStats?.median * 1000);
    const refreshWindowMs =
      roll.goldenSpatulaShopRefreshPostDelayMs + roll.goldenSpatulaAutoBuyRecognitionTimeoutMs;
    checks.push(
      createPreflightCheck(
        'calibration:timing-refresh',
        refreshWindowMs >= refreshMinMs - 150 &&
          roll.goldenSpatulaShopRefreshPostDelayMs <= refreshMedianMs
          ? 'pass'
          : 'fail',
        `Refresh wait window ${refreshWindowMs}ms vs recorded refresh-to-shop min ${refreshMinMs}ms`,
        {
          refreshPostDelayMs: roll.goldenSpatulaShopRefreshPostDelayMs,
          firstRecognitionTimeoutMs: roll.goldenSpatulaAutoBuyRecognitionTimeoutMs,
          refreshWindowMs,
          recordedMinMs: refreshMinMs,
          recordedMedianMs: refreshMedianMs,
        },
      ),
    );

    const xpMinMs = Math.floor(timing.xpToNextShopStats?.min * 1000);
    checks.push(
      createPreflightCheck(
        'calibration:timing-xp',
        roll.goldenSpatulaBuyXpPostDelayMs >= xpMinMs - 150 ? 'pass' : 'fail',
        `XP post delay ${roll.goldenSpatulaBuyXpPostDelayMs}ms vs recorded XP-to-shop min ${xpMinMs}ms`,
        {
          xpPostDelayMs: roll.goldenSpatulaBuyXpPostDelayMs,
          recordedMinMs: xpMinMs,
        },
      ),
    );

    const closeShopMedianMs = Math.floor(timing.closeSlotIntervalStats?.median * 1000);
    checks.push(
      createPreflightCheck(
        'calibration:timing-shop-cadence',
        roll.goldenSpatulaAutoBuyClickPostDelayMs >= 600 ? 'pass' : 'fail',
        `Buy post delay ${roll.goldenSpatulaAutoBuyClickPostDelayMs}ms vs recorded close-shop median ${closeShopMedianMs}ms`,
        {
          buyPostDelayMs: roll.goldenSpatulaAutoBuyClickPostDelayMs,
          recordedCloseShopMedianMs: closeShopMedianMs,
        },
      ),
    );
  }

  return checks;
}

async function buildPreflight(options, plan, roll) {
  const checks = [
    ...buildSlotTargetPreflight(roll),
    ...buildOverrideShapePreflight(plan),
    ...(await buildButtonTemplatePreflight(roll)),
    ...(await buildTemplatePreflight(plan)),
    ...(await buildMmorEvidencePreflight(roll)),
  ];

  return {
    status: summarizePreflight(checks),
    checkedAt: new Date().toISOString(),
    mode: getRunMode(options),
    checks,
  };
}

function hashText(value) {
  return createHash('sha256').update(value).digest('hex');
}

async function createPlan(options) {
  const roll = await importRollPipelineModule();
  const championEntries = await loadChampionManifest();
  const jsonTargets = options.targetsJson ? await loadTargetsJson(options.targetsJson) : [];
  const championTargets = await loadChampionTargets(options.championNames, championEntries);
  const lineupTargetResult = await loadLineupTargets(options, championEntries);
  const targets = dedupeTargets([
    ...lineupTargetResult.targets,
    ...options.targets,
    ...championTargets,
    ...jsonTargets,
  ]);
  if (targets.length === 0) {
    throw new Error('No D roll targets. Add --lineup, --champion, --target, or --targets-json.');
  }

  const entry = options.levelFirst
    ? roll.goldenSpatulaAutoLevelRollBuyEntry
    : roll.goldenSpatulaAutoRollBuyEntry;
  const pipelineOverride = options.levelFirst
    ? roll.buildAutoLevelRollBuyPipelineOverride(targets, options.rollCount, options.xpCount)
    : roll.buildAutoRollBuyPipelineOverride(targets, options.rollCount);
  const summary = summarizePipeline(pipelineOverride);

  return {
    entry,
    pipelineOverride,
    summary,
    targets,
    lineupLabels: lineupTargetResult.labels,
    skippedLineupTargets: lineupTargetResult.skipped,
    roll,
  };
}

async function writeOverrideFile(filePath, content) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(JSON.parse(content), null, 2)}\n`, 'utf8');
}

async function writeJsonFile(filePath, content) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(content, null, 2)}\n`, 'utf8');
}

function relativeOrNull(filePath) {
  return filePath ? path.relative(repoRoot, filePath) : null;
}

function displayArg(arg) {
  return path.isAbsolute(arg) ? path.relative(repoRoot, arg) : arg;
}

function uniqueStrings(values) {
  return [...new Set(values.filter((value) => typeof value === 'string' && value.length > 0))];
}

function appendBoundedOutput(current, next) {
  const merged = `${current}${next}`;
  return merged.length > maxCapturedOutputChars
    ? merged.slice(merged.length - maxCapturedOutputChars)
    : merged;
}

function getRunMode(options) {
  if (options.preflightOnly) return 'preflight-only';
  return options.dryRun ? 'dry-run' : 'real-run';
}

function buildRunReport(options, plan, status, preflight, extra = {}) {
  return {
    type: 'mxu.goldenSpatula.autoRollReport',
    version: 1,
    createdAt: new Date().toISOString(),
    status,
    mode: getRunMode(options),
    entry: plan.entry,
    selectedTaskId: options.selectedTaskId,
    instanceId: options.instanceId,
    targetDir: relativeOrNull(options.targetDir),
    levelFirst: options.levelFirst,
    rollCount: options.rollCount,
    xpCount: options.levelFirst ? options.xpCount : 0,
    lineupTargetMode: options.lineupTargetMode,
    lineups: plan.lineupLabels,
    targets: plan.targets.map((target) => ({
      name: target.name,
      templatePath: target.templatePath,
    })),
    skippedLineupTargets: uniqueStrings(plan.skippedLineupTargets),
    override: {
      sha256: hashText(plan.pipelineOverride),
      summary: plan.summary,
      writtenPath: relativeOrNull(extra.overrideFile || options.writeOverride),
    },
    preflight,
    runner: extra.runner,
    runnerSummary: extra.runnerSummary,
  };
}

async function maybeWriteReport(options, plan, status, preflight, extra = {}) {
  if (!options.reportFile) return;
  const report = buildRunReport(options, plan, status, preflight, extra);
  await writeJsonFile(options.reportFile, report);
  console.log(`Wrote report: ${path.relative(repoRoot, options.reportFile)}`);
}

function sanitizeFileName(value) {
  return value.replace(/[^a-zA-Z0-9_.-]+/g, '_').slice(0, 80) || `auto-roll-buy-${Date.now()}`;
}

function printPlan(options, plan) {
  console.log('Golden Spatula auto roll/buy runner');
  console.log(`Mode: ${getRunMode(options)}`);
  console.log(`Entry: ${plan.entry}`);
  if (plan.lineupLabels.length > 0) {
    console.log(`Lineups: ${plan.lineupLabels.join(', ')} (${options.lineupTargetMode})`);
  }
  console.log(`Targets: ${plan.targets.map((target) => target.name).join(', ')}`);
  if (plan.skippedLineupTargets.length > 0) {
    console.log(
      `Skipped without local template: ${[...new Set(plan.skippedLineupTargets)].join(', ')}`,
    );
  }
  console.log(`Roll refreshes: ${options.rollCount}`);
  if (options.levelFirst) {
    console.log(`XP clicks: ${options.xpCount}`);
  }
  console.log(
    `Generated override: ${plan.summary.nodes} nodes, ${plan.summary.recognitionNodes} recognitions, ${plan.summary.clickNodes} clicks, ${plan.summary.focusPayloads} focus payloads`,
  );
}

function printPreflight(preflight) {
  const counts = countStatuses(preflight.checks);
  console.log(
    `Preflight: ${preflight.status} (${counts.pass ?? 0} pass, ${counts.warn ?? 0} warn, ${counts.fail ?? 0} fail)`,
  );
  for (const check of preflight.checks.filter((item) => item.status !== 'pass')) {
    console.log(`- ${check.status.toUpperCase()}: ${check.message}`);
  }
}

function countStatuses(checks) {
  return checks.reduce((counts, check) => {
    counts[check.status] = (counts[check.status] ?? 0) + 1;
    return counts;
  }, {});
}

function buildRunnerArgs(options, plan, overrideFile, summaryFile) {
  const args = [
    runnerPath,
    '--entry',
    plan.entry,
    '--pipeline-override-file',
    overrideFile,
    '--load-knowledge-resource',
    '--selected-task-id',
    options.selectedTaskId,
    '--instance',
    options.instanceId,
    '--target-dir',
    options.targetDir,
    '--timeout-ms',
    String(options.timeoutMs),
    '--display-short-side',
    String(options.displayShortSide),
    '--summary-file',
    summaryFile,
    '--no-strict-patrol-coverage',
  ];

  if (options.apiBase) {
    args.push('--api-base', options.apiBase);
  }
  if (options.skipPrepare) {
    args.push('--skip-prepare');
  }
  if (!options.startMxu) {
    args.push('--no-start-mxu');
  }

  return args;
}

async function runRealTask(options, plan) {
  const overrideDir = path.join(options.targetDir, 'debug', 'golden-spatula-overrides');
  const overrideFile = path.join(overrideDir, `${sanitizeFileName(options.selectedTaskId)}.json`);
  const summaryFile = path.join(
    overrideDir,
    `${sanitizeFileName(options.selectedTaskId)}.runner-summary.json`,
  );
  await writeOverrideFile(overrideFile, plan.pipelineOverride);

  console.log(`Override file: ${path.relative(repoRoot, overrideFile)}`);
  console.log('Starting MXU runner. This will click XP/refresh and buy matched target cards.');
  const runnerArgs = buildRunnerArgs(options, plan, overrideFile, summaryFile);

  const startedAt = Date.now();
  const result = await runChildProcess(process.execPath, runnerArgs, {
    cwd: repoRoot,
  });
  const finishedAt = Date.now();
  const exitCode = result.exitCode ?? 1;
  const runnerSummary = await readOptionalJson(summaryFile);
  return {
    overrideFile,
    summaryFile,
    exitCode,
    runner: {
      command: process.execPath,
      args: runnerArgs.map((arg) => displayArg(arg)),
      exitCode,
      startedAt: new Date(startedAt).toISOString(),
      finishedAt: new Date(finishedAt).toISOString(),
      durationMs: finishedAt - startedAt,
      stdoutTail: result.stdout,
      stderrTail: result.stderr,
    },
    runnerSummary,
  };
}

async function readOptionalJson(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function runChildProcess(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (chunk) => {
      const text = chunk.toString('utf8');
      process.stdout.write(text);
      stdout = appendBoundedOutput(stdout, text);
    });

    child.stderr?.on('data', (chunk) => {
      const text = chunk.toString('utf8');
      process.stderr.write(text);
      stderr = appendBoundedOutput(stderr, text);
    });

    child.on('error', reject);
    child.on('close', (exitCode) => {
      resolve({ exitCode, stdout, stderr });
    });
  });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const plan = await createPlan(options);
  const preflight = await buildPreflight(options, plan, plan.roll);
  printPlan(options, plan);
  printPreflight(preflight);

  if (options.writeOverride) {
    await writeOverrideFile(options.writeOverride, plan.pipelineOverride);
    console.log(`Wrote override: ${path.relative(repoRoot, options.writeOverride)}`);
  }

  if (options.printOverride) {
    console.log(plan.pipelineOverride);
  }

  if (preflight.status === 'fail') {
    console.error('Preflight failed. Fix the failed checks before submitting this task.');
    await maybeWriteReport(options, plan, 'preflight-failed', preflight, {
      overrideFile: options.writeOverride,
    });
    process.exitCode = 1;
    return;
  }

  if (options.preflightOnly) {
    console.log('Preflight-only complete. No task was submitted and no MuMu API call was made.');
    await maybeWriteReport(options, plan, 'preflight-succeeded', preflight, {
      overrideFile: options.writeOverride,
    });
    return;
  }

  if (options.dryRun) {
    console.log('Dry-run complete. Add --run to submit this pipeline to the MuMu instance.');
    await maybeWriteReport(options, plan, 'dry-run-succeeded', preflight, {
      overrideFile: options.writeOverride,
    });
    return;
  }

  const runResult = await runRealTask(options, plan);
  const status = runResult.exitCode === 0 ? 'real-run-succeeded' : 'real-run-failed';
  await maybeWriteReport(options, plan, status, preflight, runResult);
  if (runResult.exitCode !== 0) {
    process.exitCode = runResult.exitCode;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
