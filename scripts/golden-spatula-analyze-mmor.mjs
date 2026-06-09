import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const projectRoot = path.join(repoRoot, 'projects', 'golden_spatula_mumu');
const defaultOutRoot = path.join(projectRoot, 'analysis', 'video');
const ignoredSearchDirs = new Set(['.git', 'node_modules', 'dist', 'target']);

const logicalScreen = {
  width: 1280,
  height: 720,
};

const knownTargets = {
  buyXp: [286, 615],
  refresh: [286, 681],
};

const logicalRegions = [
  { key: 'top', label: 'top HUD', rect: [0, 0, 1280, 110] },
  { key: 'board', label: 'board and combat area', rect: [0, 90, 1280, 410] },
  { key: 'shop', label: 'shop cards', rect: [325, 580, 790, 125] },
  { key: 'bottom', label: 'bottom controls', rect: [0, 610, 1280, 110] },
  { key: 'buyXp', label: 'buy XP button', rect: [180, 575, 140, 80] },
  { key: 'refresh', label: 'shop refresh button', rect: [180, 640, 140, 80] },
  { key: 'slot1', label: 'shop slot 1', rect: [325, 580, 158, 125] },
  { key: 'slot2', label: 'shop slot 2', rect: [483, 580, 158, 125] },
  { key: 'slot3', label: 'shop slot 3', rect: [641, 580, 158, 125] },
  { key: 'slot4', label: 'shop slot 4', rect: [799, 580, 158, 125] },
  { key: 'slot5', label: 'shop slot 5', rect: [957, 580, 158, 125] },
  { key: 'right', label: 'right stage panel', rect: [1040, 0, 240, 720] },
];

const primaryRegionPriority = [
  'refresh',
  'buyXp',
  'slot1',
  'slot2',
  'slot3',
  'slot4',
  'slot5',
  'shop',
  'bottom',
  'right',
  'board',
  'top',
];

const supportedTransforms = {
  normalized: {
    label: 'normalized width/height',
    map: ([rawX, rawY], screen) => [rawX * screen.width, rawY * screen.height],
  },
  shortSideDirect: {
    label: 'short side direct',
    map: ([rawX, rawY], screen) => {
      const side = Math.min(screen.width, screen.height);
      return [rawX * side, rawY * side];
    },
  },
  shortSideSwapped: {
    label: 'short side swapped',
    map: ([rawX, rawY], screen) => {
      const side = Math.min(screen.width, screen.height);
      return [rawY * side, rawX * side];
    },
  },
  rotatedClockwise: {
    label: 'portrait short side rotated clockwise',
    map: ([rawX, rawY], screen) => {
      const side = Math.min(screen.width, screen.height);
      return [rawY * side, screen.height - rawX * side];
    },
  },
  rotatedCounterClockwise: {
    label: 'portrait short side rotated counter-clockwise',
    map: ([rawX, rawY], screen) => {
      const side = Math.min(screen.width, screen.height);
      return [screen.width - rawY * side, rawX * side];
    },
  },
};

function usage() {
  return `Usage:
  pnpm golden:analyze-mmor -- <mmor-path> [options]

Options:
  --out <dir>                    Output directory. Default: projects/golden_spatula_mumu/analysis/video/<mmor-name>
  --video-analysis <analysis>    Optional video analysis JSON for nearest-event alignment
  --coord-transform <name>       auto, normalized, shortSideDirect, shortSideSwapped,
                                 rotatedClockwise, rotatedCounterClockwise. Default: auto
  --max-events <number>          Max interesting operation rows in markdown. Default: 160
  --help                         Show this help
`;
}

function parseArgs(args) {
  const options = {
    mmorPath: '',
    outDir: '',
    videoAnalysisPath: '',
    coordTransform: 'auto',
    maxEvents: 160,
    help: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }
    if (arg === '--out' && next) {
      options.outDir = path.resolve(repoRoot, next);
      index += 1;
      continue;
    }
    if (arg === '--video-analysis' && next) {
      options.videoAnalysisPath = path.resolve(repoRoot, next);
      index += 1;
      continue;
    }
    if (arg === '--coord-transform' && next) {
      options.coordTransform = next;
      index += 1;
      continue;
    }
    if (arg === '--max-events' && next) {
      options.maxEvents = Number(next);
      index += 1;
      continue;
    }
    if (!arg.startsWith('-') && !options.mmorPath) {
      options.mmorPath = path.resolve(repoRoot, arg);
      continue;
    }

    throw new Error(`Unknown or incomplete argument: ${arg}`);
  }

  if (
    options.coordTransform !== 'auto' &&
    !Object.prototype.hasOwnProperty.call(supportedTransforms, options.coordTransform)
  ) {
    throw new Error(`Unsupported coordinate transform: ${options.coordTransform}`);
  }
  if (!Number.isFinite(options.maxEvents) || options.maxEvents <= 0) {
    throw new Error('maxEvents must be a positive number');
  }
  options.maxEvents = Math.round(options.maxEvents);
  return options;
}

function sanitizeFileName(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);
}

function formatPath(filePath) {
  return path.relative(repoRoot, filePath).replaceAll(path.sep, '/');
}

function formatTime(seconds) {
  const totalMs = Math.max(0, Math.round(seconds * 1000));
  const minutes = Math.floor(totalMs / 60000);
  const secs = Math.floor((totalMs % 60000) / 1000);
  const ms = totalMs % 1000;
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function writeJson(filePath, value) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function walkFiles(dir, predicate, output = []) {
  if (!existsSync(dir)) return output;
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (ignoredSearchDirs.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkFiles(fullPath, predicate, output);
    } else if (entry.isFile() && predicate(fullPath)) {
      const stat = await fs.stat(fullPath);
      output.push({ path: fullPath, mtimeMs: stat.mtimeMs, size: stat.size });
    }
  }
  return output;
}

async function findNewestMmor() {
  const candidates = await walkFiles(repoRoot, (filePath) =>
    filePath.toLowerCase().endsWith('.mmor'),
  );
  return candidates.sort((a, b) => b.mtimeMs - a.mtimeMs)[0]?.path ?? '';
}

function parsePressRel(value) {
  const match = String(value ?? '').match(/^press_rel:\(([-+\d.]+),([-+\d.]+)\)$/);
  if (!match) return null;
  return [Number(match[1]), Number(match[2])];
}

function screenFromInfo(info) {
  const width = Number(info?.resolution_x ?? logicalScreen.width);
  const height = Number(info?.resolution_y ?? logicalScreen.height);
  return {
    width: Number.isFinite(width) && width > 0 ? width : logicalScreen.width,
    height: Number.isFinite(height) && height > 0 ? height : logicalScreen.height,
  };
}

function parseGestures(actions) {
  let elapsedMs = 0;
  let current = null;
  const gestures = [];
  const actionCounts = {};

  for (const [index, action] of actions.entries()) {
    elapsedMs += Number(action.timing ?? 0);
    actionCounts[action.type] = (actionCounts[action.type] ?? 0) + 1;

    const raw = parsePressRel(action.data);
    if (raw) {
      const point = { actionIndex: index, elapsedMs, raw };
      if (!current) {
        current = {
          startActionIndex: index,
          startMs: elapsedMs,
          points: [point],
        };
      } else {
        current.points.push(point);
      }
      continue;
    }

    if (action.type === 'touch' && action.data === 'release' && current) {
      gestures.push({
        index: gestures.length + 1,
        startActionIndex: current.startActionIndex,
        endActionIndex: index,
        startMs: current.startMs,
        endMs: elapsedMs,
        durationMs: elapsedMs - current.startMs,
        sampleCount: current.points.length,
        startRaw: current.points[0].raw,
        endRaw: current.points[current.points.length - 1].raw,
      });
      current = null;
    }
  }

  return { gestures, elapsedMs, actionCounts };
}

function pointInRect(point, rect) {
  const [x, y] = point;
  const [rectX, rectY, width, height] = rect;
  return x >= rectX && x <= rectX + width && y >= rectY && y <= rectY + height;
}

function isOnScreen(point, screen) {
  const [x, y] = point;
  return x >= 0 && x <= screen.width && y >= 0 && y <= screen.height;
}

function annotatePoint(point) {
  const regions = logicalRegions
    .filter((region) => pointInRect(point, region.rect))
    .map((region) => region.key);
  const primaryRegion =
    primaryRegionPriority.find((region) => regions.includes(region)) ?? regions[0] ?? 'outside';
  return { regions, primaryRegion };
}

function classifyGesture(startPoint, endPoint, gesture) {
  const distance = Math.hypot(endPoint[0] - startPoint[0], endPoint[1] - startPoint[1]);
  if (distance > 24 || gesture.sampleCount >= 8) return 'drag';
  if (gesture.durationMs <= 180 && distance <= 14) return 'tap';
  return 'press';
}

function annotateGestures(gestures, transformName, screen) {
  const transform = supportedTransforms[transformName];
  return gestures.map((gesture) => {
    const startPoint = transform.map(gesture.startRaw, screen);
    const endPoint = transform.map(gesture.endRaw, screen);
    const pointInfo = annotatePoint(endPoint);
    return {
      ...gesture,
      timeSeconds: Number((gesture.startMs / 1000).toFixed(3)),
      time: formatTime(gesture.startMs / 1000),
      startPoint: startPoint.map((value) => Number(value.toFixed(2))),
      endPoint: endPoint.map((value) => Number(value.toFixed(2))),
      onScreen: isOnScreen(endPoint, screen),
      distance: Number(
        Math.hypot(endPoint[0] - startPoint[0], endPoint[1] - startPoint[1]).toFixed(2),
      ),
      gestureType: classifyGesture(startPoint, endPoint, gesture),
      regions: pointInfo.regions,
      primaryRegion: pointInfo.primaryRegion,
    };
  });
}

function countBy(values) {
  const counts = {};
  for (const value of values) {
    counts[value] = (counts[value] ?? 0) + 1;
  }
  return counts;
}

function evaluateTransform(gestures, transformName, screen) {
  const annotated = annotateGestures(gestures, transformName, screen);
  const regionCounts = countBy(annotated.map((gesture) => gesture.primaryRegion));
  const validCount = annotated.filter((gesture) => gesture.onScreen).length;
  const slotHits = ['slot1', 'slot2', 'slot3', 'slot4', 'slot5'].reduce(
    (sum, key) => sum + (regionCounts[key] ?? 0),
    0,
  );
  const shopHits = annotated.filter((gesture) => gesture.regions.includes('shop')).length;
  const buttonHits = (regionCounts.refresh ?? 0) + (regionCounts.buyXp ?? 0);
  const score =
    validCount * 4 +
    slotHits * 10 +
    shopHits * 4 +
    buttonHits * 6 -
    (annotated.length - validCount) * 12;
  return {
    transform: transformName,
    label: supportedTransforms[transformName].label,
    score,
    validCount,
    outOfBounds: annotated.length - validCount,
    regionCounts,
    shopHits,
    slotHits,
    buttonHits,
  };
}

function selectTransform(gestures, requestedTransform, screen) {
  const candidates = Object.keys(supportedTransforms).map((transformName) =>
    evaluateTransform(gestures, transformName, screen),
  );
  if (requestedTransform !== 'auto') {
    return {
      selected: requestedTransform,
      candidates,
      reason: 'requested by --coord-transform',
    };
  }

  const best = [...candidates].sort((a, b) => b.score - a.score)[0];
  return {
    selected: best.transform,
    candidates,
    reason: 'highest on-screen + known ROI score',
  };
}

function median(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) / 2)];
}

function timingStats(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  const pick = (ratio) =>
    sorted.length > 0 ? sorted[Math.floor((sorted.length - 1) * ratio)] : null;
  const average =
    sorted.length > 0 ? sorted.reduce((sum, value) => sum + value, 0) / sorted.length : null;
  const format = (value) => (value == null ? null : Number(value.toFixed(3)));
  return {
    count: sorted.length,
    min: format(pick(0)),
    p25: format(pick(0.25)),
    median: format(pick(0.5)),
    p75: format(pick(0.75)),
    p90: format(pick(0.9)),
    max: format(pick(1)),
    average: format(average),
  };
}

function buildRegionStats(gestures) {
  return logicalRegions.map((region) => {
    const hits = gestures.filter((gesture) => gesture.regions.includes(region.key));
    const xs = hits.map((gesture) => gesture.endPoint[0]);
    const ys = hits.map((gesture) => gesture.endPoint[1]);
    return {
      key: region.key,
      label: region.label,
      rect: region.rect,
      count: hits.length,
      medianPoint:
        hits.length > 0 ? [Number(median(xs).toFixed(2)), Number(median(ys).toFixed(2))] : null,
      firstTime: hits[0]?.time ?? '',
      lastTime: hits[hits.length - 1]?.time ?? '',
    };
  });
}

function buildTargetValidation(regionStats) {
  const buyXp = regionStats.find((region) => region.key === 'buyXp');
  const refresh = regionStats.find((region) => region.key === 'refresh');

  return [
    {
      key: 'buyXp',
      label: 'buy XP button',
      currentTarget: knownTargets.buyXp,
      recordedMedian: buyXp?.medianPoint ?? null,
    },
    {
      key: 'refresh',
      label: 'shop refresh button',
      currentTarget: knownTargets.refresh,
      recordedMedian: refresh?.medianPoint ?? null,
    },
  ].map((item) => ({
    ...item,
    distance:
      item.recordedMedian == null
        ? null
        : Number(
            Math.hypot(
              item.currentTarget[0] - item.recordedMedian[0],
              item.currentTarget[1] - item.recordedMedian[1],
            ).toFixed(2),
          ),
  }));
}

function buildTimingAnalysis(interestingGestures) {
  const sorted = [...interestingGestures].sort((a, b) => a.timeSeconds - b.timeSeconds);
  const shopGestures = sorted.filter((gesture) => gesture.regions.includes('shop'));
  const slotGestures = sorted.filter((gesture) => /^slot\d$/u.test(gesture.primaryRegion));
  const refreshGestures = sorted.filter((gesture) => gesture.primaryRegion === 'refresh');
  const xpGestures = sorted.filter((gesture) => gesture.primaryRegion === 'buyXp');
  const slotIntervals = [];

  for (let index = 1; index < slotGestures.length; index += 1) {
    const delta = slotGestures[index].timeSeconds - slotGestures[index - 1].timeSeconds;
    if (delta > 0) slotIntervals.push(Number(delta.toFixed(3)));
  }

  const closeSlotIntervals = slotIntervals.filter((value) => value < 3);
  const refreshToNextShop = refreshGestures
    .map((gesture) => {
      const nextShop = slotGestures.find(
        (candidate) => candidate.timeSeconds > gesture.timeSeconds,
      );
      return nextShop ? Number((nextShop.timeSeconds - gesture.timeSeconds).toFixed(3)) : null;
    })
    .filter((value) => value != null);
  const xpToNextShop = xpGestures
    .map((gesture) => {
      const nextShop = slotGestures.find(
        (candidate) => candidate.timeSeconds > gesture.timeSeconds,
      );
      return nextShop ? Number((nextShop.timeSeconds - gesture.timeSeconds).toFixed(3)) : null;
    })
    .filter((value) => value != null);

  return {
    shopGestureCount: shopGestures.length,
    slotGestureCount: slotGestures.length,
    refreshGestureCount: refreshGestures.length,
    xpGestureCount: xpGestures.length,
    slotIntervals,
    closeSlotIntervals,
    refreshToNextShop,
    xpToNextShop,
    slotIntervalStats: timingStats(slotIntervals),
    closeSlotIntervalStats: timingStats(closeSlotIntervals),
    refreshToNextShopStats: timingStats(refreshToNextShop),
    xpToNextShopStats: timingStats(xpToNextShop),
  };
}

async function readVideoAnalysis(options) {
  const candidates = [
    options.videoAnalysisPath,
    options.outDir ? path.join(options.outDir, 'analysis.json') : '',
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return {
        path: candidate,
        data: JSON.parse(await fs.readFile(candidate, 'utf8')),
      };
    }
  }
  return null;
}

function nearestVideoEvent(gesture, videoAnalysis) {
  const events = videoAnalysis?.data?.events;
  if (!Array.isArray(events) || events.length === 0) return null;
  let best = null;
  for (const event of events) {
    const deltaSeconds = Math.abs(Number(event.timeSeconds ?? 0) - gesture.timeSeconds);
    if (!best || deltaSeconds < best.deltaSeconds) {
      best = {
        time: event.time,
        timeSeconds: Number(event.timeSeconds ?? 0),
        deltaSeconds: Number(deltaSeconds.toFixed(3)),
        dominantRegion: event.dominantRegion,
        reasons: event.reasons ?? [],
        screenshot: event.screenshot ?? '',
      };
    }
  }
  return best;
}

function interestingGesture(gesture) {
  return (
    gesture.primaryRegion !== 'outside' &&
    (gesture.regions.includes('shop') ||
      gesture.primaryRegion === 'refresh' ||
      gesture.primaryRegion === 'buyXp' ||
      gesture.primaryRegion === 'right')
  );
}

function buildMarkdown({ report, operationJsonPath, videoAnalysis }) {
  const regionRows = report.regionStats.filter(
    (region) =>
      region.count > 0 ||
      ['shop', 'buyXp', 'refresh', 'slot1', 'slot2', 'slot3', 'slot4', 'slot5'].includes(
        region.key,
      ),
  );
  const timeline = report.interestingGestures.slice(0, report.options.maxEvents);

  const lines = [
    '# Golden Spatula MMOR Operation Analysis',
    '',
    `MMOR: \`${report.metadata.relativePath}\``,
    `Duration: ${report.metadata.durationSeconds.toFixed(2)}s`,
    `Actions: ${report.metadata.actionCount}, gestures: ${report.metadata.gestureCount}`,
    `Screen: ${report.screen.width}x${report.screen.height}`,
    `Transform: \`${report.coordinateTransform.selected}\` (${report.coordinateTransform.reason})`,
    `JSON: \`${formatPath(operationJsonPath)}\``,
  ];

  if (videoAnalysis) {
    lines.push(`Video analysis: \`${formatPath(videoAnalysis.path)}\``);
  }

  lines.push(
    '',
    '## Coordinate Mapping',
    '',
    '| Transform | Score | Valid | Out | Shop | Slots | Buttons |',
    '| - | -: | -: | -: | -: | -: | -: |',
  );

  for (const candidate of report.coordinateTransform.candidates) {
    lines.push(
      `| ${candidate.transform} | ${candidate.score} | ${candidate.validCount} | ${candidate.outOfBounds} | ${candidate.shopHits} | ${candidate.slotHits} | ${candidate.buttonHits} |`,
    );
  }

  lines.push(
    '',
    '## ROI Summary',
    '',
    '| Region | Count | Median Point | First | Last |',
    '| - | -: | - | - | - |',
  );

  for (const region of regionRows) {
    lines.push(
      `| ${region.label} | ${region.count} | ${region.medianPoint ? `[${region.medianPoint.join(', ')}]` : ''} | ${region.firstTime} | ${region.lastTime} |`,
    );
  }

  lines.push(
    '',
    '## Current Target Check',
    '',
    '| Target | Current | Recorded Median | Distance |',
    '| - | - | - | -: |',
  );

  for (const item of report.targetValidation) {
    lines.push(
      `| ${item.label} | [${item.currentTarget.join(', ')}] | ${item.recordedMedian ? `[${item.recordedMedian.join(', ')}]` : ''} | ${item.distance ?? ''} |`,
    );
  }

  lines.push(
    '',
    '## Timing Evidence',
    '',
    '| Metric | Count | Min | P25 | Median | P75 | P90 | Max |',
    '| - | -: | -: | -: | -: | -: | -: | -: |',
  );

  const timingRows = [
    ['Slot intervals', report.timingAnalysis.slotIntervalStats],
    ['Close slot intervals (<3s)', report.timingAnalysis.closeSlotIntervalStats],
    ['Refresh to next shop tap', report.timingAnalysis.refreshToNextShopStats],
    ['XP to next shop tap', report.timingAnalysis.xpToNextShopStats],
  ];
  for (const [label, stats] of timingRows) {
    lines.push(
      `| ${label} | ${stats.count} | ${stats.min ?? ''} | ${stats.p25 ?? ''} | ${stats.median ?? ''} | ${stats.p75 ?? ''} | ${stats.p90 ?? ''} | ${stats.max ?? ''} |`,
    );
  }

  lines.push(
    '',
    '## Interesting Operation Timeline',
    '',
    '| # | Time | Type | Point | Region | Video Delta | Video Event | Screenshot |',
    '| - | - | - | - | - | -: | - | - |',
  );

  for (const gesture of timeline) {
    const event = gesture.nearestVideoEvent;
    lines.push(
      `| ${gesture.index} | ${gesture.time} | ${gesture.gestureType} | [${gesture.endPoint.map((value) => value.toFixed(1)).join(', ')}] | ${gesture.primaryRegion} | ${event ? event.deltaSeconds : ''} | ${event ? `${event.time} ${event.dominantRegion}` : ''} | ${event?.screenshot ? `\`${event.screenshot}\`` : ''} |`,
    );
  }

  if (report.interestingGestures.length > timeline.length) {
    lines.push('', `Shown ${timeline.length} of ${report.interestingGestures.length} operations.`);
  }

  return `${lines.join('\n')}\n`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }

  if (!options.mmorPath) {
    options.mmorPath = await findNewestMmor();
  }
  if (!options.mmorPath || !existsSync(options.mmorPath)) {
    throw new Error(
      `${usage()}\nNo MMOR path was provided and no .mmor file was found in the workspace.`,
    );
  }

  if (!options.outDir) {
    const mmorName = sanitizeFileName(
      path.basename(options.mmorPath, path.extname(options.mmorPath)),
    );
    options.outDir = path.join(defaultOutRoot, mmorName || 'operations');
  }

  const mmor = JSON.parse(await fs.readFile(options.mmorPath, 'utf8'));
  const actions = Array.isArray(mmor.actions) ? mmor.actions : [];
  const screen = screenFromInfo(mmor.info);
  const { gestures, elapsedMs, actionCounts } = parseGestures(actions);
  const transformSelection = selectTransform(gestures, options.coordTransform, screen);
  const annotatedGestures = annotateGestures(gestures, transformSelection.selected, screen);
  const regionStats = buildRegionStats(annotatedGestures);
  const targetValidation = buildTargetValidation(regionStats);
  const videoAnalysis = await readVideoAnalysis(options);
  const interestingGestures = annotatedGestures.filter(interestingGesture).map((gesture) => ({
    ...gesture,
    nearestVideoEvent: nearestVideoEvent(gesture, videoAnalysis),
  }));
  const timingAnalysis = buildTimingAnalysis(interestingGestures);

  const report = {
    generatedAt: new Date().toISOString(),
    metadata: {
      relativePath: formatPath(options.mmorPath),
      sizeBytes: Number((await fs.stat(options.mmorPath)).size),
      actionCount: actions.length,
      actionCounts,
      gestureCount: gestures.length,
      durationMs: elapsedMs,
      durationSeconds: elapsedMs / 1000,
      info: mmor.info ?? {},
    },
    options: {
      coordTransform: options.coordTransform,
      maxEvents: options.maxEvents,
    },
    screen,
    logicalRegions,
    coordinateTransform: transformSelection,
    regionStats,
    targetValidation,
    timingAnalysis,
    interestingGestureCount: interestingGestures.length,
    gestures: annotatedGestures,
    interestingGestures,
    videoAnalysis: videoAnalysis
      ? {
          path: formatPath(videoAnalysis.path),
          eventCount: Array.isArray(videoAnalysis.data?.events)
            ? videoAnalysis.data.events.length
            : 0,
        }
      : null,
  };

  await ensureDir(options.outDir);
  const operationJsonPath = path.join(options.outDir, 'operations.json');
  const operationMdPath = path.join(options.outDir, 'operations.md');
  await writeJson(operationJsonPath, report);
  await fs.writeFile(
    operationMdPath,
    buildMarkdown({ report, operationJsonPath, videoAnalysis }),
    'utf8',
  );

  console.log(`Analyzed ${report.metadata.relativePath}`);
  console.log(
    `Actions: ${report.metadata.actionCount}, gestures: ${report.metadata.gestureCount}, duration: ${report.metadata.durationSeconds.toFixed(2)}s`,
  );
  console.log(
    `Transform: ${report.coordinateTransform.selected}, interesting operations: ${report.interestingGestureCount}`,
  );
  console.log(`Report: ${formatPath(operationMdPath)}`);
  console.log(`Data: ${formatPath(operationJsonPath)}`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
