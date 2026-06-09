import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const rollPipelinePath = path.join(repoRoot, 'src', 'services', 'goldenSpatulaRollPipeline.ts');
const eventsServicePath = path.join(
  repoRoot,
  'src',
  'services',
  'goldenSpatulaAutomationEvents.ts',
);

async function transpileTsFile(filePath) {
  const source = await fs.readFile(filePath, 'utf8');
  return ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2020,
      sourceMap: false,
      paths: {},
    },
    fileName: filePath,
  }).outputText;
}

async function importScenarioModules() {
  const tempDir = path.join(repoRoot, 'node_modules', '.cache', 'mxu-golden-tests');
  await fs.mkdir(tempDir, { recursive: true });

  const suffix = Date.now();
  const rollModulePath = path.join(tempDir, `goldenSpatulaRollPipeline-scenario-${suffix}.mjs`);
  const eventsModulePath = path.join(tempDir, `goldenSpatulaEvents-scenario-${suffix}.mjs`);
  const typesModulePath = path.join(tempDir, `goldenSpatulaTypes-scenario-${suffix}.mjs`);

  await fs.writeFile(rollModulePath, await transpileTsFile(rollPipelinePath));
  await fs.writeFile(typesModulePath, 'export {};\n');

  const eventsOutput = (await transpileTsFile(eventsServicePath))
    .replace(
      /from ['"]@\/services\/goldenSpatulaRollPipeline['"];?/g,
      `from './${path.basename(rollModulePath)}';`,
    )
    .replace(
      /from ['"]@\/types\/goldenSpatula['"];?/g,
      `from './${path.basename(typesModulePath)}';`,
    );
  await fs.writeFile(eventsModulePath, eventsOutput);

  return {
    roll: await import(`file://${rollModulePath.replaceAll('\\', '/')}`),
    events: await import(`file://${eventsModulePath.replaceAll('\\', '/')}`),
  };
}

function makeTranslator() {
  return (key, values = {}) => {
    if (key.includes('rollStatusEvent.started')) return 'roll started';
    if (key.includes('rollStatusEvent.bought')) return `bought ${values.target}`;
    if (key.includes('rollStatusEvent.buyConfirmed')) return `confirmed ${values.target}`;
    if (key.includes('rollStatusEvent.buyUnconfirmed')) return `unconfirmed ${values.target}`;
    if (key.includes('rollStatusEvent.missed')) return 'roll missed';
    if (key.includes('rollStatusEvent.refreshed')) return `refreshed ${values.current}`;
    if (key.includes('rollStatusEvent.completed')) return 'roll completed';
    if (key.includes('rollStatusEvent.notReady')) return 'roll not ready';
    if (key.includes('xpStatusEvent.started')) return 'xp started';
    if (key.includes('xpStatusEvent.clicked')) return `xp clicked ${values.current}`;
    if (key.includes('xpStatusEvent.completed')) return 'xp completed';
    if (key.includes('xpStatusEvent.notReady')) return 'xp not ready';
    return key;
  };
}

function getNode(nodes, nodeName) {
  const node = nodes[nodeName];
  assert.ok(node, `missing generated node ${nodeName}`);
  return node;
}

function getFocusMessage(node, message, nodeName) {
  const payload = node.focus?.[message];
  assert.ok(payload, `${nodeName}: missing focus ${message}`);
  return payload;
}

function dispatchFocus({ nodes, nodeName, message, timestamp, t, eventApi, rollState, xpState }) {
  const node = getNode(nodes, nodeName);
  getFocusMessage(node, message, nodeName);
  const details = {
    name: nodeName,
    focus: node.focus,
  };
  const rollEvent = eventApi.buildRollEvent(message, details, t, timestamp);
  const xpEvent = eventApi.buildXpEvent(message, details, t, timestamp);

  assert.ok(
    Boolean(rollEvent) !== Boolean(xpEvent),
    `${nodeName}: exactly one automation event should be emitted`,
  );

  return {
    rollState: rollEvent ? eventApi.mergeRollEvent(rollState, rollEvent) : rollState,
    xpState: xpEvent ? eventApi.mergeXpEvent(xpState, xpEvent) : xpState,
    rollEvent,
    xpEvent,
  };
}

async function main() {
  const { roll, events } = await importScenarioModules();
  const t = makeTranslator();
  const targets = [
    { name: '薇古丝', templatePath: 'champions/vex.png' },
    { name: '波比', templatePath: 'champions/poppy.png' },
  ];
  const nodes = JSON.parse(roll.buildAutoLevelRollBuyPipelineOverride(targets, 1, 3));

  let rollState = events.createEmptyRollRunState();
  let xpState = events.createEmptyXpRunState();
  let current;

  current = dispatchFocus({
    nodes,
    nodeName: roll.goldenSpatulaAutoLevelRollBuyEntry,
    message: 'Node.PipelineNode.Succeeded',
    timestamp: 1000,
    t,
    eventApi: events,
    rollState,
    xpState,
  });
  ({ rollState, xpState } = current);
  assert.equal(current.xpEvent.kind, 'started');
  assert.equal(xpState.active, true);
  assert.equal(xpState.total, 3);
  assert.equal(rollState.events.length, 0);

  for (let index = 1; index <= 3; index += 1) {
    current = dispatchFocus({
      nodes,
      nodeName: `AutoLevelRollBuy_XpClick${index}`,
      message: 'Node.Action.Succeeded',
      timestamp: 1000 + index * 100,
      t,
      eventApi: events,
      rollState,
      xpState,
    });
    ({ rollState, xpState } = current);
    assert.equal(current.xpEvent.kind, 'clicked');
    assert.equal(xpState.current, index);
    assert.equal(xpState.active, true);
  }

  current = dispatchFocus({
    nodes,
    nodeName: 'AutoLevelRollBuy_XpDone',
    message: 'Node.PipelineNode.Succeeded',
    timestamp: 1400,
    t,
    eventApi: events,
    rollState,
    xpState,
  });
  ({ rollState, xpState } = current);
  assert.equal(current.xpEvent.kind, 'completed');
  assert.equal(xpState.active, false);
  assert.equal(xpState.current, 3);
  assert.equal(rollState.active, false);

  current = dispatchFocus({
    nodes,
    nodeName: roll.goldenSpatulaAutoRollBuyEntry,
    message: 'Node.PipelineNode.Succeeded',
    timestamp: 1500,
    t,
    eventApi: events,
    rollState,
    xpState,
  });
  ({ rollState, xpState } = current);
  assert.equal(current.rollEvent.kind, 'started');
  assert.equal(rollState.active, true);
  assert.equal(rollState.rollCount, 1);
  assert.equal(rollState.totalCycles, 2);
  assert.deepEqual(
    rollState.targetNames,
    targets.map((target) => target.name),
  );

  current = dispatchFocus({
    nodes,
    nodeName: 'AutoRollBuy_C0_Buy1_T0_S1',
    message: 'Node.Action.Succeeded',
    timestamp: 1600,
    t,
    eventApi: events,
    rollState,
    xpState,
  });
  ({ rollState, xpState } = current);
  assert.equal(current.rollEvent.kind, 'bought');
  assert.equal(rollState.lastEvent.targetName, '薇古丝');
  assert.equal(rollState.lastEvent.slotIndex, 1);

  current = dispatchFocus({
    nodes,
    nodeName: 'AutoRollBuy_C0_Buy1_T0_S1_Verify',
    message: 'Node.Recognition.Succeeded',
    timestamp: 1700,
    t,
    eventApi: events,
    rollState,
    xpState,
  });
  ({ rollState, xpState } = current);
  assert.equal(current.rollEvent.kind, 'buyConfirmed');
  assert.equal(rollState.active, true);

  current = dispatchFocus({
    nodes,
    nodeName: 'AutoRollBuy_Roll1',
    message: 'Node.Action.Succeeded',
    timestamp: 1800,
    t,
    eventApi: events,
    rollState,
    xpState,
  });
  ({ rollState, xpState } = current);
  assert.equal(current.rollEvent.kind, 'refreshed');
  assert.equal(rollState.currentCycle, 2);

  current = dispatchFocus({
    nodes,
    nodeName: 'AutoRollBuy_C1_Buy1_Miss',
    message: 'Node.PipelineNode.Succeeded',
    timestamp: 1900,
    t,
    eventApi: events,
    rollState,
    xpState,
  });
  ({ rollState, xpState } = current);
  assert.equal(current.rollEvent.kind, 'missed');
  assert.equal(rollState.active, true);

  current = dispatchFocus({
    nodes,
    nodeName: 'AutoRollBuy_Done',
    message: 'Node.PipelineNode.Succeeded',
    timestamp: 2000,
    t,
    eventApi: events,
    rollState,
    xpState,
  });
  ({ rollState, xpState } = current);
  assert.equal(current.rollEvent.kind, 'completed');
  assert.equal(rollState.active, false);
  assert.equal(rollState.events.length, 6);
  assert.equal(xpState.events.length, 5);

  let blockedRollState = events.createEmptyRollRunState();
  let blockedXpState = events.mergeXpEvent(
    events.createEmptyXpRunState(),
    events.buildXpEvent(
      'Node.PipelineNode.Succeeded',
      {
        name: roll.goldenSpatulaAutoLevelRollBuyEntry,
        focus: getNode(nodes, roll.goldenSpatulaAutoLevelRollBuyEntry).focus,
      },
      t,
      3000,
    ),
  );
  current = dispatchFocus({
    nodes,
    nodeName: 'AutoLevelRollBuy_XpNotReady',
    message: 'Node.PipelineNode.Succeeded',
    timestamp: 3100,
    t,
    eventApi: events,
    rollState: blockedRollState,
    xpState: blockedXpState,
  });
  blockedRollState = current.rollState;
  blockedXpState = current.xpState;
  assert.equal(current.xpEvent.kind, 'notReady');
  assert.equal(blockedXpState.active, false);
  assert.equal(blockedRollState.events.length, 0);
  assert.deepEqual(getNode(nodes, 'AutoLevelRollBuy_XpNotReady').next, undefined);

  let refreshBlockedRollState = events.mergeRollEvent(
    events.createEmptyRollRunState(),
    events.buildRollEvent(
      'Node.PipelineNode.Succeeded',
      {
        name: roll.goldenSpatulaAutoRollBuyEntry,
        focus: getNode(nodes, roll.goldenSpatulaAutoRollBuyEntry).focus,
      },
      t,
      4000,
    ),
  );
  const refreshBlockedXpState = events.createEmptyXpRunState();
  current = dispatchFocus({
    nodes,
    nodeName: 'AutoRollBuy_Roll1_NotReady',
    message: 'Node.PipelineNode.Succeeded',
    timestamp: 4100,
    t,
    eventApi: events,
    rollState: refreshBlockedRollState,
    xpState: refreshBlockedXpState,
  });
  refreshBlockedRollState = current.rollState;
  assert.equal(current.rollEvent.kind, 'notReady');
  assert.equal(refreshBlockedRollState.active, false);
  assert.equal(refreshBlockedRollState.lastEvent.message, 'roll not ready');
  assert.equal(current.xpState.events.length, 0);
  assert.deepEqual(getNode(nodes, 'AutoRollBuy_Roll1_NotReady').next, undefined);

  let initialBlockedRollState = events.mergeRollEvent(
    events.createEmptyRollRunState(),
    events.buildRollEvent(
      'Node.PipelineNode.Succeeded',
      {
        name: roll.goldenSpatulaAutoRollBuyEntry,
        focus: getNode(nodes, roll.goldenSpatulaAutoRollBuyEntry).focus,
      },
      t,
      5000,
    ),
  );
  current = dispatchFocus({
    nodes,
    nodeName: 'AutoRollBuy_InitialShopNotReady',
    message: 'Node.PipelineNode.Succeeded',
    timestamp: 5100,
    t,
    eventApi: events,
    rollState: initialBlockedRollState,
    xpState: events.createEmptyXpRunState(),
  });
  initialBlockedRollState = current.rollState;
  assert.equal(current.rollEvent.kind, 'notReady');
  assert.equal(initialBlockedRollState.active, false);
  assert.deepEqual(getNode(nodes, 'AutoRollBuy_InitialShopNotReady').next, undefined);

  console.log('Golden Spatula automation scenario test');
  console.log(`Scenario targets checked: ${targets.length}`);
  console.log(`XP events after happy path: ${xpState.events.length}`);
  console.log(`Roll events after happy path: ${rollState.events.length}`);
  console.log('OK: generated level + roll pipeline focus drives panel state correctly.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
