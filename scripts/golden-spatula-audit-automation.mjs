import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const projectRoot = path.join(repoRoot, 'projects', 'golden_spatula_mumu');
const interfacePath = path.join(projectRoot, 'interface.json');
const assistantPanelPath = path.join(
  repoRoot,
  'src',
  'components',
  'GoldenSpatulaAssistantPanel.tsx',
);
const rollPipelinePath = path.join(repoRoot, 'src', 'services', 'goldenSpatulaRollPipeline.ts');
const automationEventsPath = path.join(
  repoRoot,
  'src',
  'services',
  'goldenSpatulaAutomationEvents.ts',
);
const pipelineDirs = [
  path.join(projectRoot, 'resource', 'pipeline'),
  path.join(projectRoot, 'resource_knowledge', 'pipeline'),
];

const screenBounds = {
  width: 1280,
  height: 720,
};

const criticalEntries = [
  'BeginnerTutorialFullRun',
  'Tutorial_Stage1BuyXp',
  'AutoBuyExperienceOnce',
  'AutoBuyExperienceThree',
  'AutoBuyExperienceFive',
  'AutoRollShopOnce',
  'AutoRollShopThree',
  'AutoRollShopFive',
  'AutoRollAndBuyTargets',
  'AutoLevelRollAndBuyTargets',
];

const criticalGeneratedTutorialNodes = [
  'Tutorial_Stage1BuyXp',
  'Tutorial_Stage5RefreshA',
  'Tutorial_Stage5RefreshB',
  'Tutorial_Stage5RefreshC',
  'Tutorial_Stage5RefreshD',
];

const buyXpButtonGuard = {
  template: ['ingame/buy_xp_button_idle.png', 'ingame/buy_xp_button_active.png'],
  threshold: [0.76, 0.7],
  roi: [180, 575, 140, 80],
};

const shopRefreshButtonGuard = {
  template: ['ingame/shop_refresh_button_idle.png', 'ingame/shop_refresh_button_active.png'],
  threshold: [0.76, 0.7],
  roi: [180, 640, 140, 80],
};

const shopChampionSlotRois = [
  [325, 580, 158, 125],
  [483, 580, 158, 125],
  [641, 580, 158, 125],
  [799, 580, 158, 125],
  [957, 580, 158, 125],
];

const autoRollRefreshClickNodes = [
  'AutoRollShopOnce_Click1',
  'AutoRollShopThree_Click1',
  'AutoRollShopThree_Click2',
  'AutoRollShopThree_Click3',
  'AutoRollShopFive_Click1',
  'AutoRollShopFive_Click2',
  'AutoRollShopFive_Click3',
  'AutoRollShopFive_Click4',
  'AutoRollShopFive_Click5',
];

const autoBuyExperienceClickNodes = [
  'AutoBuyExperienceOnce_Click',
  'AutoBuyExperienceThree_Click1',
  'AutoBuyExperienceThree_Click2',
  'AutoBuyExperienceThree_Click3',
  'AutoBuyExperienceFive_Click1',
  'AutoBuyExperienceFive_Click2',
  'AutoBuyExperienceFive_Click3',
  'AutoBuyExperienceFive_Click4',
  'AutoBuyExperienceFive_Click5',
];

const calibratedTemplateGuards = [
  {
    nodeName: 'Tutorial_Stage1BuyXp',
    ...buyXpButtonGuard,
  },
  ...autoBuyExperienceClickNodes.map((nodeName) => ({
    nodeName,
    ...buyXpButtonGuard,
  })),
  ...[
    'Tutorial_Stage5RefreshA',
    'Tutorial_Stage5RefreshB',
    'Tutorial_Stage5RefreshC',
    'Tutorial_Stage5RefreshD',
    ...autoRollRefreshClickNodes,
  ].map((nodeName) => ({
    nodeName,
    ...shopRefreshButtonGuard,
  })),
];

const calibratedClickTargets = [
  {
    nodeName: 'Tutorial_Stage1BuyXp',
    target: [286, 615, 2, 2],
    source: 'docs/mp4s/金铲铲之战(1).mp4 at 03:11.000',
  },
  ...autoBuyExperienceClickNodes.map((nodeName) => ({
    nodeName,
    target: [286, 615, 2, 2],
    source: 'docs/mp4s/金铲铲之战(1).mp4 at 03:11.000',
  })),
  {
    nodeName: 'AutoRollShopOnce_Click1',
    target: [286, 681, 2, 2],
    source: 'docs/mp4s/金铲铲之战(1).mp4 at 02:24.500',
  },
  {
    nodeName: 'AutoRollShopThree_Click1',
    target: [286, 681, 2, 2],
    source: 'docs/mp4s/金铲铲之战(1).mp4 at 02:24.500',
  },
  {
    nodeName: 'AutoRollShopThree_Click2',
    target: [286, 681, 2, 2],
    source: 'docs/mp4s/金铲铲之战(1).mp4 at 02:24.500',
  },
  {
    nodeName: 'AutoRollShopThree_Click3',
    target: [286, 681, 2, 2],
    source: 'docs/mp4s/金铲铲之战(1).mp4 at 02:24.500',
  },
  {
    nodeName: 'AutoRollShopFive_Click1',
    target: [286, 681, 2, 2],
    source: 'docs/mp4s/金铲铲之战(1).mp4 at 02:24.500',
  },
  {
    nodeName: 'AutoRollShopFive_Click2',
    target: [286, 681, 2, 2],
    source: 'docs/mp4s/金铲铲之战(1).mp4 at 02:24.500',
  },
  {
    nodeName: 'AutoRollShopFive_Click3',
    target: [286, 681, 2, 2],
    source: 'docs/mp4s/金铲铲之战(1).mp4 at 02:24.500',
  },
  {
    nodeName: 'AutoRollShopFive_Click4',
    target: [286, 681, 2, 2],
    source: 'docs/mp4s/金铲铲之战(1).mp4 at 02:24.500',
  },
  {
    nodeName: 'AutoRollShopFive_Click5',
    target: [286, 681, 2, 2],
    source: 'docs/mp4s/金铲铲之战(1).mp4 at 02:24.500',
  },
];

function formatPath(filePath) {
  return path.relative(repoRoot, filePath).replaceAll(path.sep, '/');
}

function asArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

async function readJson(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`${formatPath(filePath)}: ${error.message}`);
  }
}

async function walkJsonFiles(dir, output = []) {
  if (!existsSync(dir)) return output;

  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkJsonFiles(fullPath, output);
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      output.push(fullPath);
    }
  }
  return output;
}

function normalizeNodeRef(ref) {
  if (typeof ref !== 'string') return null;
  const jumpBackMatch = ref.match(/^\[JumpBack\](.+)$/);
  return jumpBackMatch ? jumpBackMatch[1] : ref;
}

function templateBaseDirForPipeline(pipelinePath) {
  return pipelinePath.includes(`${path.sep}resource_knowledge${path.sep}`)
    ? path.join(projectRoot, 'resource_knowledge', 'image')
    : path.join(projectRoot, 'resource', 'image');
}

function hasValidPoint(point) {
  if (!Array.isArray(point) || point.length < 2) return false;
  const [x, y] = point;
  return (
    Number.isFinite(x) &&
    Number.isFinite(y) &&
    x >= 0 &&
    y >= 0 &&
    x <= screenBounds.width &&
    y <= screenBounds.height
  );
}

function hasValidRect(rect) {
  if (!Array.isArray(rect) || rect.length < 4) return false;
  const [x, y, width, height] = rect;
  return (
    Number.isFinite(x) &&
    Number.isFinite(y) &&
    Number.isFinite(width) &&
    Number.isFinite(height) &&
    x >= 0 &&
    y >= 0 &&
    width > 0 &&
    height > 0 &&
    x <= screenBounds.width &&
    y <= screenBounds.height
  );
}

function findTemplateRefs(node) {
  const refs = [];
  for (const key of ['template', 'templates']) {
    refs.push(...asArray(node[key]).filter((value) => typeof value === 'string'));
  }
  return refs;
}

function validateThresholdShape(node, location, errors) {
  const templates = findTemplateRefs(node);
  if (templates.length <= 1 || node.threshold === undefined || !Array.isArray(node.threshold)) {
    return;
  }

  if (node.threshold.length !== templates.length) {
    errors.push(
      `${location}: threshold array length ${node.threshold.length} does not match template length ${templates.length}`,
    );
  }
}

function validateActionTargets(node, location, errors, warnings) {
  if (node.action === 'Click') {
    if (node.target === true) return;
    if (!hasValidPoint(node.target)) {
      errors.push(`${location}: Click action has invalid target ${JSON.stringify(node.target)}`);
    }
  }

  if (node.action === 'Swipe') {
    const begin = node.begin || node.begin_point || node.start || node.target;
    const end = node.end || node.end_point || node.stop;
    if (!hasValidPoint(begin) || !hasValidPoint(end)) {
      errors.push(
        `${location}: Swipe action has invalid begin/end ${JSON.stringify({ begin, end })}`,
      );
    }
  }

  if (node.roi !== undefined && !hasValidRect(node.roi)) {
    warnings.push(
      `${location}: roi is outside expected 1280x720 bounds: ${JSON.stringify(node.roi)}`,
    );
  }
}

function validateFocus(node, location, warnings) {
  if (!node.focus) return;

  if (Array.isArray(node.focus)) {
    for (const [index, focus] of node.focus.entries()) {
      if (!isPlainObject(focus)) {
        warnings.push(`${location}: focus[${index}] is not an object`);
        continue;
      }
      if (typeof focus.event !== 'string' || typeof focus.display !== 'string') {
        warnings.push(`${location}: focus[${index}] is missing event/display`);
      }
    }
    return;
  }

  if (!isPlainObject(node.focus)) {
    warnings.push(`${location}: focus is not an object`);
    return;
  }

  if (typeof node.focus.event === 'string') {
    if (typeof node.focus.display !== 'string') {
      warnings.push(`${location}: focus is missing display`);
    }
    return;
  }

  for (const [eventName, payload] of Object.entries(node.focus)) {
    if (!eventName.startsWith('Node.')) {
      warnings.push(`${location}: focus event key looks unusual: ${eventName}`);
    }
    if (!isPlainObject(payload)) {
      warnings.push(`${location}: focus payload for ${eventName} is not an object`);
      continue;
    }
    if (typeof payload.display !== 'string') {
      warnings.push(`${location}: focus payload for ${eventName} is missing display`);
    }
  }
}

async function loadPipelines() {
  const pipelineFiles = [];
  for (const dir of pipelineDirs) {
    await walkJsonFiles(dir, pipelineFiles);
  }

  const pipelines = [];
  const allNodes = new Map();
  for (const pipelinePath of pipelineFiles) {
    const json = await readJson(pipelinePath);
    pipelines.push({ path: pipelinePath, json });
    for (const [name, node] of Object.entries(json)) {
      if (!allNodes.has(name)) allNodes.set(name, []);
      allNodes.get(name).push({ path: pipelinePath, node });
    }
  }

  return { pipelines, allNodes };
}

function auditInterfaceTasks(interfaceJson, allNodes, errors, warnings) {
  const tasks = Array.isArray(interfaceJson.task) ? interfaceJson.task : [];
  for (const task of tasks) {
    if (!task?.entry) {
      warnings.push(`interface task ${task?.name || '<unknown>'}: missing entry`);
      continue;
    }
    if (!allNodes.has(task.entry)) {
      errors.push(`interface task ${task.name || '<unknown>'}: entry ${task.entry} is missing`);
    }
  }
}

async function auditPipelineFiles(pipelines, allNodes, errors, warnings, stats) {
  for (const pipeline of pipelines) {
    const templateBaseDir = templateBaseDirForPipeline(pipeline.path);
    for (const [nodeName, node] of Object.entries(pipeline.json)) {
      const location = `${formatPath(pipeline.path)}#${nodeName}`;

      if (!isPlainObject(node)) {
        errors.push(`${location}: node must be an object`);
        continue;
      }

      for (const key of ['next', 'on_error']) {
        for (const ref of asArray(node[key])) {
          if (typeof ref !== 'string') {
            errors.push(`${location}: ${key} contains non-string ref ${JSON.stringify(ref)}`);
            continue;
          }
          stats.nodeRefs += 1;
          const target = normalizeNodeRef(ref);
          if (!target || !allNodes.has(target)) {
            errors.push(`${location}: ${key} references missing node ${ref}`);
          }
        }
      }

      const templateRefs = findTemplateRefs(node);
      for (const templateRef of templateRefs) {
        stats.templateRefs += 1;
        if (path.isAbsolute(templateRef)) {
          warnings.push(`${location}: template should be project-relative: ${templateRef}`);
          continue;
        }
        const templatePath = path.join(templateBaseDir, templateRef);
        if (!existsSync(templatePath)) {
          errors.push(`${location}: missing template ${formatPath(templatePath)}`);
        }
      }

      validateThresholdShape(node, location, errors);
      validateActionTargets(node, location, errors, warnings);
      validateFocus(node, location, warnings);
    }
  }
}

function auditCriticalNodes(allNodes, errors, warnings) {
  for (const entry of criticalEntries) {
    if (!allNodes.has(entry)) {
      errors.push(`critical Golden Spatula entry is missing: ${entry}`);
    }
  }

  for (const nodeName of criticalGeneratedTutorialNodes) {
    if (!allNodes.has(nodeName)) {
      warnings.push(`generated tutorial node is missing: ${nodeName}`);
    }
  }

  const autoRollPlaceholder = allNodes.get('AutoRollAndBuyTargets')?.find(({ node }) => {
    return node.action === 'Screencap' && node.filename === 'auto_roll_buy_not_configured';
  });
  if (autoRollPlaceholder) {
    warnings.push(
      'AutoRollAndBuyTargets is still a static placeholder in resource pipelines; the UI must provide a dynamic override before running buy automation.',
    );
  }

  const autoLevelRollPlaceholder = allNodes.get('AutoLevelRollAndBuyTargets')?.find(({ node }) => {
    return node.action === 'Screencap' && node.filename === 'auto_level_roll_buy_not_configured';
  });
  if (autoLevelRollPlaceholder) {
    warnings.push(
      'AutoLevelRollAndBuyTargets is still a static placeholder in resource pipelines; the UI must provide a dynamic override before running level + buy automation.',
    );
  }
}

function auditCalibratedClickTargets(allNodes, errors) {
  for (const calibration of calibratedClickTargets) {
    const candidates = allNodes.get(calibration.nodeName) ?? [];
    if (candidates.length === 0) {
      errors.push(`calibrated click node is missing: ${calibration.nodeName}`);
      continue;
    }

    for (const candidate of candidates) {
      if (JSON.stringify(candidate.node.target) !== JSON.stringify(calibration.target)) {
        errors.push(
          `${formatPath(candidate.path)}#${calibration.nodeName}: expected target ${JSON.stringify(
            calibration.target,
          )} from ${calibration.source}, got ${JSON.stringify(candidate.node.target)}`,
        );
      }
    }
  }
}

function auditCalibratedTemplateGuards(allNodes, errors) {
  for (const guard of calibratedTemplateGuards) {
    const candidates = allNodes.get(guard.nodeName) ?? [];
    if (candidates.length === 0) {
      errors.push(`calibrated guard node is missing: ${guard.nodeName}`);
      continue;
    }

    for (const candidate of candidates) {
      for (const field of ['template', 'threshold', 'roi']) {
        if (JSON.stringify(candidate.node[field]) !== JSON.stringify(guard[field])) {
          errors.push(
            `${formatPath(candidate.path)}#${guard.nodeName}: expected ${field} ${JSON.stringify(
              guard[field],
            )}, got ${JSON.stringify(candidate.node[field])}`,
          );
        }
      }
    }
  }
}

async function auditDynamicRollSource(errors) {
  const source = await fs.readFile(rollPipelinePath, 'utf8');
  for (const roi of shopChampionSlotRois) {
    const expected = `roi: [${roi.join(', ')}]`;
    if (!source.includes(expected)) {
      errors.push(
        `${formatPath(rollPipelinePath)}: missing dynamic shop slot ROI ${JSON.stringify(roi)}`,
      );
    }
  }

  const expectedSnippets = [
    'slotIndex: slot.index',
    'slotLabel: slot.label',
    "buildAutoRollFocus('buyConfirmed'",
    "buildAutoRollFocus('buyUnconfirmed'",
    "buildAutoRollFocus('notReady'",
    "buildXpFocus('started'",
    'goldenSpatulaAutoLevelRollBuyEntry',
    'buildAutoLevelRollBuyPipelineOverride',
    'AutoLevelRollBuy_XpClick',
    'AutoLevelRollBuy_XpDone',
    'goldenSpatulaBuyXpTarget',
    'on_error: [refreshNotReadyNode]',
    'auto_roll_buy_roll${cycle + 1}_refresh_not_ready',
    'inverse: true',
    'getAutoRollBuyTargetNode(cycle, attempt, targetIndex, slotPosition + 1)',
    'if (targets.length === 0)',
  ];

  for (const snippet of expectedSnippets) {
    if (!source.includes(snippet)) {
      errors.push(`${formatPath(rollPipelinePath)}: missing dynamic roll snippet ${snippet}`);
    }
  }

  const assistantSource = await fs.readFile(assistantPanelPath, 'utf8');
  const expectedAssistantSnippets = [
    'formatRollEventSlot(latestRecognition)',
    'formatRollEventSlot(latestBuyResult)',
    'buildAutoRollBuyPipelineOverride(autoRollBuyTargets, autoRollCount)',
    'buildAutoLevelRollBuyPipelineOverride(',
    'autoBuyExperienceTaskByCount',
    'runAutoBuyExperienceTask',
    'runAutoLevelRollBuyTask',
    'autoBuyExperienceDisabledReason',
    'autoLevelRollBuyDisabledReason',
    'XpRunStatusPanel',
    "case 'notReady':",
    'setXpRunState((previous) => mergeXpEvent(previous, xpEvent))',
  ];

  for (const snippet of expectedAssistantSnippets) {
    if (!assistantSource.includes(snippet)) {
      errors.push(`${formatPath(assistantPanelPath)}: missing assistant snippet ${snippet}`);
    }
  }

  const eventsSource = await fs.readFile(automationEventsPath, 'utf8');
  const expectedEventSnippets = [
    'goldenSpatulaAutoRollBuyFocusScope',
    'goldenSpatulaXpFocusScope',
    'export function buildRollEvent',
    'export function mergeRollEvent',
    'export function buildXpEvent',
    'export function mergeXpEvent',
    'slotIndex',
    'slotLabel',
    "value === 'notReady'",
    "event.kind === 'completed' || event.kind === 'notReady'",
  ];

  for (const snippet of expectedEventSnippets) {
    if (!eventsSource.includes(snippet)) {
      errors.push(`${formatPath(automationEventsPath)}: missing event snippet ${snippet}`);
    }
  }
}

function printReport({ pipelines, interfaceJson, errors, warnings, stats }) {
  const taskCount = Array.isArray(interfaceJson.task) ? interfaceJson.task.length : 0;
  const nodeCount = pipelines.reduce((sum, pipeline) => sum + Object.keys(pipeline.json).length, 0);

  console.log('Golden Spatula automation audit');
  console.log(`Pipelines: ${pipelines.length} files, ${nodeCount} nodes`);
  console.log(`Interface tasks: ${taskCount}`);
  console.log(`Node references checked: ${stats.nodeRefs}`);
  console.log(`Template references checked: ${stats.templateRefs}`);

  if (warnings.length > 0) {
    console.log('\nWarnings:');
    for (const warning of warnings) {
      console.log(`- ${warning}`);
    }
  }

  if (errors.length > 0) {
    console.error('\nErrors:');
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log('\nOK: no structural automation errors found.');
}

async function main() {
  const interfaceJson = await readJson(interfacePath);
  const { pipelines, allNodes } = await loadPipelines();
  const errors = [];
  const warnings = [];
  const stats = {
    nodeRefs: 0,
    templateRefs: 0,
  };

  if (pipelines.length === 0) {
    errors.push('no Golden Spatula pipeline files found');
  }

  auditInterfaceTasks(interfaceJson, allNodes, errors, warnings);
  await auditPipelineFiles(pipelines, allNodes, errors, warnings, stats);
  auditCriticalNodes(allNodes, errors, warnings);
  auditCalibratedClickTargets(allNodes, errors);
  auditCalibratedTemplateGuards(allNodes, errors);
  await auditDynamicRollSource(errors);
  printReport({ pipelines, interfaceJson, errors, warnings, stats });
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
