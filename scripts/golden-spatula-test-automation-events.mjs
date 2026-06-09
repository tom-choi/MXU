import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const eventsServicePath = path.join(
  repoRoot,
  'src',
  'services',
  'goldenSpatulaAutomationEvents.ts',
);

async function importEventsModule() {
  const source = await fs.readFile(eventsServicePath, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2020,
      sourceMap: false,
      paths: {},
    },
    fileName: eventsServicePath,
  });

  const output = transpiled.outputText
    .replace(
      /from ['"]@\/services\/goldenSpatulaRollPipeline['"];?/g,
      "from './goldenSpatulaRollPipeline.js';",
    )
    .replace(/from ['"]@\/types\/goldenSpatula['"];?/g, "from './goldenSpatulaTypes.js';");
  const tempDir = path.join(repoRoot, 'node_modules', '.cache', 'mxu-golden-tests');
  await fs.mkdir(tempDir, { recursive: true });
  await fs.writeFile(
    path.join(tempDir, 'goldenSpatulaRollPipeline.js'),
    [
      'export const goldenSpatulaAutoRollBuyFocusScope = "goldenSpatula.roll";',
      'export const goldenSpatulaXpFocusScope = "goldenSpatula.xp";',
      '',
    ].join('\n'),
  );
  await fs.writeFile(path.join(tempDir, 'goldenSpatulaTypes.js'), 'export {};\n');
  const modulePath = path.join(tempDir, `goldenSpatulaAutomationEvents-${Date.now()}.mjs`);
  await fs.writeFile(modulePath, output);
  return import(`file://${modulePath.replaceAll('\\', '/')}`);
}

function makeTranslator() {
  return (key, values = {}) => {
    if (key.includes('rollStatusEvent.bought')) return `bought ${values.target}`;
    if (key.includes('rollStatusEvent.buyConfirmed')) return `confirmed ${values.target}`;
    if (key.includes('rollStatusEvent.refreshed')) {
      return `refreshed ${values.current}/${values.total}`;
    }
    if (key.includes('rollStatusEvent.completed')) return 'roll completed';
    if (key.includes('rollStatusEvent.started')) return 'roll started';
    if (key.includes('rollStatusEvent.notReady')) return 'roll not ready';
    if (key.includes('xpStatusEvent.started')) return 'xp started';
    if (key.includes('xpStatusEvent.clicked')) {
      return `xp clicked ${values.current}/${values.total}`;
    }
    if (key.includes('xpStatusEvent.completed')) return 'xp completed';
    if (key.includes('xpStatusEvent.notReady')) return 'xp not ready';
    return key;
  };
}

function makeFocus(message, payload) {
  return {
    focus: {
      [message]: payload,
    },
  };
}

function assertNull(value, label) {
  assert.equal(value, null, label);
}

async function main() {
  const {
    buildRollEvent,
    buildXpEvent,
    createEmptyRollRunState,
    createEmptyXpRunState,
    mergeRollEvent,
    mergeXpEvent,
  } = await importEventsModule();
  const t = makeTranslator();

  assert.deepEqual(createEmptyRollRunState(), {
    active: false,
    targetNames: [],
    rollCount: 0,
    currentCycle: 0,
    totalCycles: 0,
    events: [],
  });
  assert.deepEqual(createEmptyXpRunState(), {
    active: false,
    current: 0,
    total: 0,
    events: [],
  });

  const started = buildRollEvent(
    'Node.PipelineNode.Succeeded',
    {
      name: 'AutoRollAndBuyTargets',
      ...makeFocus('Node.PipelineNode.Succeeded', {
        scope: 'goldenSpatula.roll',
        event: 'started',
        cycle: 1,
        totalCycles: 4,
        rollCount: 3,
        targetNames: ['薇古丝', '波比'],
      }),
    },
    t,
    1000,
  );
  assert.equal(started.kind, 'started');
  assert.equal(started.message, 'roll started');
  let rollState = mergeRollEvent(createEmptyRollRunState(), started);
  assert.equal(rollState.active, true);
  assert.deepEqual(rollState.targetNames, ['薇古丝', '波比']);
  assert.equal(rollState.currentCycle, 1);
  assert.equal(rollState.totalCycles, 4);

  const bought = buildRollEvent(
    'Node.Action.Succeeded',
    {
      name: 'AutoRollBuy_C0_Buy1_T0_S3',
      ...makeFocus('Node.Action.Succeeded', {
        scope: 'goldenSpatula.roll',
        event: 'bought',
        cycle: '1',
        totalCycles: '4',
        rollCount: '3',
        targetName: '薇古丝',
        targetNames: ['薇古丝', '波比'],
        slotIndex: '3',
        slotLabel: '3',
      }),
    },
    t,
    1100,
  );
  assert.equal(bought.kind, 'bought');
  assert.equal(bought.message, 'bought 薇古丝 #3');
  assert.equal(bought.slotIndex, 3);
  rollState = mergeRollEvent(rollState, bought);
  assert.equal(rollState.active, true);
  assert.equal(rollState.events.length, 2);

  const confirmed = buildRollEvent(
    'Node.Recognition.Succeeded',
    {
      name: 'AutoRollBuy_C0_Buy1_T0_S3_Verify',
      ...makeFocus('Node.Recognition.Succeeded', {
        scope: 'goldenSpatula.roll',
        event: 'buyConfirmed',
        cycle: 1,
        totalCycles: 4,
        rollCount: 3,
        targetName: '薇古丝',
        targetNames: ['薇古丝', '波比'],
        slotIndex: 3,
        slotLabel: '3',
      }),
    },
    t,
    1200,
  );
  assert.equal(confirmed.message, 'confirmed 薇古丝 #3');
  rollState = mergeRollEvent(rollState, confirmed);
  assert.equal(rollState.lastEvent.kind, 'buyConfirmed');

  const refreshed = buildRollEvent(
    'Node.Action.Succeeded',
    {
      name: 'AutoRollBuy_Roll1',
      ...makeFocus('Node.Action.Succeeded', {
        scope: 'goldenSpatula.roll',
        event: 'refreshed',
        cycle: 2,
        totalCycles: 4,
        rollCount: 3,
        targetNames: ['薇古丝', '波比'],
      }),
    },
    t,
    1300,
  );
  assert.equal(refreshed.message, 'refreshed 2/4');
  rollState = mergeRollEvent(rollState, refreshed);
  assert.equal(rollState.currentCycle, 2);

  const completed = buildRollEvent(
    'Node.PipelineNode.Succeeded',
    {
      name: 'AutoRollBuy_Done',
      ...makeFocus('Node.PipelineNode.Succeeded', {
        scope: 'goldenSpatula.roll',
        event: 'completed',
        cycle: 4,
        totalCycles: 4,
        rollCount: 3,
        targetNames: ['薇古丝', '波比'],
      }),
    },
    t,
    1400,
  );
  rollState = mergeRollEvent(rollState, completed);
  assert.equal(rollState.active, false);
  assert.equal(rollState.updatedAt, 1400);

  const rollNotReady = buildRollEvent(
    'Node.PipelineNode.Succeeded',
    {
      name: 'AutoRollBuy_Roll1_NotReady',
      ...makeFocus('Node.PipelineNode.Succeeded', {
        scope: 'goldenSpatula.roll',
        event: 'notReady',
        cycle: 2,
        totalCycles: 4,
        rollCount: 3,
        targetNames: ['è–‡å¤ä¸', 'æ³¢æ¯”'],
      }),
    },
    t,
    1450,
  );
  assert.equal(rollNotReady.kind, 'notReady');
  assert.equal(rollNotReady.message, 'roll not ready');
  rollState = mergeRollEvent({ ...rollState, active: true }, rollNotReady);
  assert.equal(rollState.active, false);
  assert.equal(rollState.lastEvent.kind, 'notReady');

  assertNull(
    buildRollEvent(
      'Node.Action.Succeeded',
      {
        name: 'AutoRollBuy_C0_Buy1_T0_S1',
        ...makeFocus('Node.Action.Succeeded', {
          scope: 'goldenSpatula.xp',
          event: 'clicked',
        }),
      },
      t,
      1500,
    ),
    'wrong scope must not become roll event',
  );

  const xpStarted = buildXpEvent(
    'Node.PipelineNode.Succeeded',
    {
      name: 'AutoBuyExperienceThree',
      ...makeFocus('Node.PipelineNode.Succeeded', {
        scope: 'goldenSpatula.xp',
        event: 'started',
        total: 3,
      }),
    },
    t,
    2000,
  );
  assert.equal(xpStarted.message, 'xp started');
  let xpState = mergeXpEvent(createEmptyXpRunState(), xpStarted);
  assert.equal(xpState.active, true);
  assert.equal(xpState.total, 3);

  const xpClicked = buildXpEvent(
    'Node.Action.Succeeded',
    {
      name: 'AutoBuyExperienceThree_Click2',
      ...makeFocus('Node.Action.Succeeded', {
        scope: 'goldenSpatula.xp',
        event: 'clicked',
        current: '2',
        total: '3',
      }),
    },
    t,
    2100,
  );
  assert.equal(xpClicked.message, 'xp clicked 2/3');
  xpState = mergeXpEvent(xpState, xpClicked);
  assert.equal(xpState.current, 2);
  assert.equal(xpState.active, true);

  const xpCompleted = buildXpEvent(
    'Node.PipelineNode.Succeeded',
    {
      name: 'AutoBuyExperienceThree_After',
      ...makeFocus('Node.PipelineNode.Succeeded', {
        scope: 'goldenSpatula.xp',
        event: 'completed',
        total: 3,
      }),
    },
    t,
    2200,
  );
  xpState = mergeXpEvent(xpState, xpCompleted);
  assert.equal(xpState.active, false);
  assert.equal(xpState.current, 3);

  const notReady = buildXpEvent(
    'Node.PipelineNode.Succeeded',
    {
      name: 'AutoBuyExperienceNotReady',
      ...makeFocus('Node.PipelineNode.Succeeded', {
        scope: 'goldenSpatula.xp',
        event: 'notReady',
      }),
    },
    t,
    2300,
  );
  xpState = mergeXpEvent({ ...xpState, active: true }, notReady);
  assert.equal(xpState.active, false);
  assert.equal(xpState.lastEvent.kind, 'notReady');

  assertNull(
    buildXpEvent(
      'Node.PipelineNode.Succeeded',
      {
        name: 'AutoRollBuy_Done',
        ...makeFocus('Node.PipelineNode.Succeeded', {
          scope: 'goldenSpatula.roll',
          event: 'completed',
        }),
      },
      t,
      2400,
    ),
    'wrong scope must not become xp event',
  );

  console.log('Golden Spatula automation event test');
  console.log(`Roll events checked: ${rollState.events.length}`);
  console.log(`XP events checked: ${xpState.events.length}`);
  console.log('OK: callback event parsing and state merging are valid.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
