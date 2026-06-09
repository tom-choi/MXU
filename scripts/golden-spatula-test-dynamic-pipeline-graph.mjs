import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const servicePath = path.join(repoRoot, 'src', 'services', 'goldenSpatulaRollPipeline.ts');

const screenBounds = {
  width: 1280,
  height: 720,
};

const rollEvents = new Set([
  'started',
  'bought',
  'buyConfirmed',
  'buyUnconfirmed',
  'missed',
  'refreshed',
  'completed',
  'notReady',
]);

const xpEvents = new Set(['started', 'clicked', 'completed', 'notReady']);
const rollCounts = [1, 3, 5];
const targets = [
  { name: 'Vex', templatePath: 'champions/vex.png' },
  { name: 'Poppy', templatePath: 'champions/poppy.png' },
  { name: 'Rakan', templatePath: 'champions/rakan.png' },
];

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

function parsePipeline(pipelineJson, label) {
  const parsed = JSON.parse(pipelineJson);
  assert.ok(parsed && typeof parsed === 'object' && !Array.isArray(parsed), `${label}: bad JSON`);
  return parsed;
}

function asArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function assertRect(rect, label) {
  assert.ok(Array.isArray(rect) && rect.length === 4, `${label}: expected rect`);
  const [x, y, width, height] = rect;
  for (const value of rect) {
    assert.equal(Number.isFinite(value), true, `${label}: rect contains non-number`);
  }
  assert.ok(x >= 0 && y >= 0, `${label}: rect starts outside screen`);
  assert.ok(width > 0 && height > 0, `${label}: rect size must be positive`);
  assert.ok(x + width <= screenBounds.width, `${label}: rect exceeds screen width`);
  assert.ok(y + height <= screenBounds.height, `${label}: rect exceeds screen height`);
}

function assertClickTarget(target, label) {
  assert.ok(Array.isArray(target) && target.length >= 2, `${label}: click target must be point`);
  const [x, y] = target;
  assert.ok(Number.isFinite(x) && Number.isFinite(y), `${label}: click target has non-number`);
  assert.ok(x >= 0 && y >= 0, `${label}: click target starts outside screen`);
  assert.ok(
    x <= screenBounds.width && y <= screenBounds.height,
    `${label}: click target offscreen`,
  );
}

function assertThresholdShape(node, label) {
  const templates = asArray(node.template);
  if (templates.length <= 1 || node.threshold === undefined) return;
  assert.ok(Array.isArray(node.threshold), `${label}: multi-template threshold must be array`);
  assert.equal(
    node.threshold.length,
    templates.length,
    `${label}: threshold count must match template count`,
  );
}

function assertFocusPayload(payload, label) {
  assert.ok(
    payload && typeof payload === 'object' && !Array.isArray(payload),
    `${label}: bad focus`,
  );
  assert.equal(payload.display, 'log', `${label}: focus display must be log`);
  assert.equal(typeof payload.scope, 'string', `${label}: focus scope must be string`);
  assert.equal(typeof payload.event, 'string', `${label}: focus event must be string`);

  if (payload.scope === 'goldenSpatula.roll') {
    assert.ok(rollEvents.has(payload.event), `${label}: unknown roll event ${payload.event}`);
    assert.equal(Number.isFinite(payload.totalCycles), true, `${label}: missing totalCycles`);
    assert.equal(Number.isFinite(payload.rollCount), true, `${label}: missing rollCount`);
  } else if (payload.scope === 'goldenSpatula.xp') {
    assert.ok(xpEvents.has(payload.event), `${label}: unknown xp event ${payload.event}`);
    if (payload.event !== 'notReady') {
      assert.equal(Number.isFinite(payload.total), true, `${label}: missing xp total`);
    }
  } else {
    assert.fail(`${label}: unexpected focus scope ${payload.scope}`);
  }
}

function validateNodeShape(node, label) {
  assert.ok(node && typeof node === 'object' && !Array.isArray(node), `${label}: node must object`);

  if (node.roi !== undefined) {
    assertRect(node.roi, `${label}.roi`);
  }

  if (node.action === 'Click') {
    assertClickTarget(node.target, `${label}.target`);
    if (label.includes('#AutoRollBuy_C') && !label.includes('_Verify')) {
      assert.notEqual(node.target, true, `${label}: buy node must use calibrated slot target`);
    }
  }

  if (node.recognition === 'TemplateMatch') {
    const templates = asArray(node.template);
    assert.ok(templates.length > 0, `${label}: TemplateMatch needs template`);
    for (const template of templates) {
      assert.equal(typeof template, 'string', `${label}: template must be string`);
      assert.ok(template.length > 0, `${label}: template cannot be empty`);
    }
    assertThresholdShape(node, label);
  }

  if (node.focus !== undefined) {
    assert.ok(
      node.focus && typeof node.focus === 'object' && !Array.isArray(node.focus),
      `${label}: focus must be object`,
    );
    for (const [message, payload] of Object.entries(node.focus)) {
      assert.ok(message.startsWith('Node.'), `${label}: unexpected focus message ${message}`);
      assertFocusPayload(payload, `${label}.focus.${message}`);
    }
  }
}

function validateGraph(nodes, entry, label) {
  assert.ok(nodes[entry], `${label}: missing entry ${entry}`);
  const names = new Set(Object.keys(nodes));
  const reachable = new Set();
  const stack = [entry];
  let references = 0;
  let focusPayloads = 0;

  while (stack.length > 0) {
    const nodeName = stack.pop();
    if (reachable.has(nodeName)) continue;
    reachable.add(nodeName);

    const node = nodes[nodeName];
    validateNodeShape(node, `${label}#${nodeName}`);
    focusPayloads += node.focus ? Object.keys(node.focus).length : 0;

    for (const key of ['next', 'on_error']) {
      for (const ref of asArray(node[key])) {
        assert.equal(typeof ref, 'string', `${label}#${nodeName}.${key}: ref must be string`);
        assert.ok(names.has(ref), `${label}#${nodeName}.${key}: dangling ref ${ref}`);
        references += 1;
        stack.push(ref);
      }
    }
  }

  const unreachable = [...names].filter((name) => !reachable.has(name));
  assert.deepEqual(unreachable, [], `${label}: unreachable generated nodes`);
  assert.ok(focusPayloads > 0, `${label}: expected focus payloads`);

  return {
    nodes: names.size,
    references,
    focusPayloads,
  };
}

async function main() {
  const roll = await importRollPipelineModule();
  const cases = [];

  for (const rollCount of rollCounts) {
    cases.push({
      label: `roll-${rollCount}`,
      entry: roll.goldenSpatulaAutoRollBuyEntry,
      json: roll.buildAutoRollBuyPipelineOverride(targets, rollCount),
    });
    cases.push({
      label: `roll-empty-${rollCount}`,
      entry: roll.goldenSpatulaAutoRollBuyEntry,
      json: roll.buildAutoRollBuyPipelineOverride([], rollCount),
    });

    for (const xpCount of rollCounts) {
      cases.push({
        label: `level-${xpCount}-roll-${rollCount}`,
        entry: roll.goldenSpatulaAutoLevelRollBuyEntry,
        json: roll.buildAutoLevelRollBuyPipelineOverride(targets, rollCount, xpCount),
      });
    }
  }

  let nodeCount = 0;
  let referenceCount = 0;
  let focusCount = 0;

  for (const testCase of cases) {
    const nodes = parsePipeline(testCase.json, testCase.label);
    const result = validateGraph(nodes, testCase.entry, testCase.label);
    nodeCount += result.nodes;
    referenceCount += result.references;
    focusCount += result.focusPayloads;
  }

  console.log('Golden Spatula dynamic pipeline graph test');
  console.log(`Generated cases checked: ${cases.length}`);
  console.log(`Generated nodes checked: ${nodeCount}`);
  console.log(`References checked: ${referenceCount}`);
  console.log(`Focus payloads checked: ${focusCount}`);
  console.log('OK: dynamic roll and level+roll overrides have valid graphs.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
