import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const defaultTargetDir = path.join(repoRoot, 'src-tauri', 'target', 'debug');

function parseArgs(args) {
  const parsed = {
    apiBase: process.env.MXU_API_BASE || null,
    displayShortSide: 720,
    entry: 'RedDotPatrol',
    instanceId: 'golden-red-dot-smoke',
    selectedTaskId: `golden-red-dot-${Date.now()}`,
    skipPrepare: false,
    startMxu: true,
    strictPatrolCoverage: true,
    targetDir: defaultTargetDir,
    timeoutMs: 240000,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    const next = args[i + 1];
    if (arg === '--api-base' && next) {
      parsed.apiBase = next;
      i += 1;
    } else if (arg === '--entry' && next) {
      parsed.entry = next;
      i += 1;
    } else if (arg === '--instance' && next) {
      parsed.instanceId = next;
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
    } else if (arg === '--no-strict-patrol-coverage') {
      parsed.strictPatrolCoverage = false;
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
  }

  return parsed;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function logStep(message) {
  console.log(`\n== ${message}`);
}

function defaultApiBases() {
  return Array.from({ length: 10 }, (_, index) => `http://127.0.0.1:${12701 + index}/api`);
}

function runPrepare(targetDir) {
  logStep('Preparing Golden Spatula project package');
  const result = spawnSync(
    process.execPath,
    [path.join(repoRoot, 'scripts', 'prepare-golden-spatula-mumu.mjs'), '--target-dir', targetDir],
    { cwd: repoRoot, stdio: 'inherit' },
  );

  if (result.status !== 0) {
    throw new Error('prepare-golden-spatula-mumu failed');
  }
}

async function fetchJson(apiBase, route, options = {}) {
  const body = options.body === undefined ? undefined : JSON.stringify(options.body);
  const response = await fetch(`${apiBase}${route}`, {
    method: options.method || 'GET',
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body,
    signal: AbortSignal.timeout(options.timeoutMs || 10000),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(
      `${options.method || 'GET'} ${route} failed: ${response.status} ${data?.error || text}`,
    );
  }

  return data;
}

async function heartbeat(apiBase) {
  try {
    await fetchJson(apiBase, '/heartbeat', { timeoutMs: 2000 });
    return true;
  } catch {
    return false;
  }
}

async function findReachableApiBase(candidates) {
  for (const candidate of candidates) {
    if (await heartbeat(candidate)) {
      return candidate;
    }
  }
  return null;
}

function startMxu(targetDir) {
  const exePath = path.join(targetDir, 'mxu.exe');
  if (!existsSync(exePath)) {
    throw new Error(`MXU executable not found: ${exePath}`);
  }

  const child = spawn(exePath, [], {
    cwd: targetDir,
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  });
  child.unref();
  console.log(`Started MXU process pid=${child.pid}`);
}

async function ensureApi(options) {
  const explicitApiBase = Boolean(options.apiBase);
  const candidates = explicitApiBase ? [options.apiBase] : defaultApiBases();
  const existing = await findReachableApiBase(candidates);
  if (existing) {
    options.apiBase = existing;
    console.log(`Using MXU API: ${existing}`);
    return;
  }

  if (!options.startMxu) {
    throw new Error(`MXU API is not reachable at ${candidates.join(', ')}`);
  }

  logStep('Starting MXU executable');
  startMxu(options.targetDir);

  const start = Date.now();
  while (Date.now() - start < 30000) {
    const reachable = await findReachableApiBase(candidates);
    if (reachable) {
      options.apiBase = reachable;
      console.log(`Using MXU API: ${reachable}`);
      return;
    }
    await sleep(500);
  }

  throw new Error(`Timed out waiting for MXU API at ${candidates.join(', ')}`);
}

function pickDevice(devices) {
  if (!Array.isArray(devices) || devices.length === 0) {
    throw new Error('No ADB devices found. Start MuMu and enable ADB first.');
  }

  const ranked = [...devices].sort((a, b) => {
    const score = (device) => {
      const name = `${device.name || ''} ${device.address || ''}`.toLowerCase();
      if (device.address === '127.0.0.1:16384') return 0;
      if (name.includes('mumu') && String(device.address || '').startsWith('127.0.0.1')) {
        return 1;
      }
      if (name.includes('mumu')) return 2;
      return 3;
    };
    return score(a) - score(b);
  });

  return ranked[0];
}

function isKnowledgeEntry(entry) {
  return (
    entry === 'KnowledgeSmokeTest' ||
    entry === 'RecognizeShopChampions' ||
    entry === 'RecognizeItems' ||
    entry === 'RecognizeBasicItems' ||
    entry === 'RecognizeCompletedItems' ||
    entry === 'RecognizeSpecialItems' ||
    entry === 'RecognizeTraitsPanel'
  );
}

function getInstance(state, instanceId) {
  return state?.instances?.[instanceId] || null;
}

function getSelectedStatus(instance, selectedTaskId) {
  return instance?.task_run_state?.statuses?.[selectedTaskId] || null;
}

async function waitForInstance(apiBase, instanceId, predicate, label, timeoutMs) {
  const start = Date.now();
  let lastState = null;
  while (Date.now() - start < timeoutMs) {
    const state = await fetchJson(apiBase, '/maa/state', { timeoutMs: 5000 });
    const instance = getInstance(state, instanceId);
    lastState = instance;
    if (predicate(instance)) {
      return instance;
    }
    await sleep(500);
  }

  throw new Error(`Timed out waiting for ${label}: ${JSON.stringify(lastState)}`);
}

async function connectAndLoad(apiBase, options) {
  logStep('Finding ADB devices');
  const devices = await fetchJson(apiBase, '/maa/devices', { timeoutMs: 30000 });
  const device = pickDevice(devices);
  console.log(`Using device: ${device.name || device.address} (${device.address})`);

  try {
    await fetchJson(apiBase, `/maa/instances/${options.instanceId}`, {
      method: 'DELETE',
      timeoutMs: 5000,
    });
  } catch {
    // Best effort cleanup; the following PUT is idempotent.
  }

  await fetchJson(apiBase, `/maa/instances/${options.instanceId}`, { method: 'PUT' });

  logStep('Connecting controller');
  await fetchJson(apiBase, `/maa/instances/${options.instanceId}/connect`, {
    method: 'POST',
    timeoutMs: 60000,
    body: {
      type: 'Adb',
      adb_path: device.adb_path,
      address: device.address,
      screencap_methods: String(device.screencap_methods),
      input_methods: String(device.input_methods),
      config: device.config || '{}',
      display_short_side: options.displayShortSide,
    },
  });

  logStep('Loading resource bundle');
  const resourcePaths = [path.join(options.targetDir, 'resource')];
  if (isKnowledgeEntry(options.entry)) {
    resourcePaths.push(path.join(options.targetDir, 'resource_knowledge'));
  }
  await fetchJson(apiBase, `/maa/instances/${options.instanceId}/resource/load`, {
    method: 'POST',
    timeoutMs: isKnowledgeEntry(options.entry) ? 30000 : 10000,
    body: { paths: resourcePaths },
  });

  await waitForInstance(
    apiBase,
    options.instanceId,
    (instance) => Boolean(instance?.connected && instance?.resource_loaded),
    'controller/resource readiness',
    60000,
  );
}

async function runTask(apiBase, options) {
  logStep(`Starting task ${options.entry}`);
  const taskStartedAt = Date.now();
  const taskBody = {
    tasks: [
      {
        entry: options.entry,
        pipeline_override: '[]',
        selected_task_id: options.selectedTaskId,
      },
    ],
    cwd: options.targetDir,
    tcp_compat_mode: false,
  };

  let result;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      result = await fetchJson(apiBase, `/maa/instances/${options.instanceId}/tasks/start`, {
        method: 'POST',
        timeoutMs: 15000,
        body: taskBody,
      });
      break;
    } catch (error) {
      if (!/Tasker not/i.test(error.message) || attempt === 3) {
        throw error;
      }
      console.log(`Tasker is still initializing; retrying start in 2s (attempt ${attempt}/3).`);
      await sleep(2000);
    }
  }

  console.log(`Maa task ids: ${(result?.taskIds || []).join(', ')}`);

  const instance = await waitForInstance(
    apiBase,
    options.instanceId,
    (current) => {
      const status = getSelectedStatus(current, options.selectedTaskId);
      return status === 'succeeded' || status === 'failed';
    },
    `${options.entry} completion`,
    options.timeoutMs,
  );

  const status = getSelectedStatus(instance, options.selectedTaskId);
  if (status !== 'succeeded') {
    throw new Error(`${options.entry} finished with status=${status}`);
  }

  return taskStartedAt;
}

async function walkFiles(dir, out = []) {
  if (!existsSync(dir)) return out;
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkFiles(fullPath, out);
    } else {
      const stat = await fs.stat(fullPath);
      out.push({ path: fullPath, mtimeMs: stat.mtimeMs, size: stat.size });
    }
  }
  return out;
}

async function pngSize(filePath) {
  const handle = await fs.open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(24);
    await handle.read(buffer, 0, 24, 0);
    if (buffer.toString('ascii', 1, 4) !== 'PNG') return '';
    return `${buffer.readUInt32BE(16)}x${buffer.readUInt32BE(20)}`;
  } finally {
    await handle.close();
  }
}

function formatAge(mtimeMs) {
  const seconds = Math.max(0, Math.round((Date.now() - mtimeMs) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.round(minutes / 60)}h ago`;
}

async function printArtifactList(files, limit) {
  const recent = files.sort((a, b) => b.mtimeMs - a.mtimeMs).slice(0, limit);

  for (const file of recent) {
    const size = file.path.toLowerCase().endsWith('.png') ? await pngSize(file.path) : '';
    const relative = path.relative(repoRoot, file.path);
    console.log(`${relative}${size ? ` (${size})` : ''} - ${formatAge(file.mtimeMs)}`);
  }
}

async function summarizeArtifacts(targetDir, sinceMs = null) {
  const files = await collectArtifacts(targetDir);
  if (files.length === 0) {
    logStep('Screenshots and error artifacts');
    console.log('No screenshots or error artifacts found yet.');
    return;
  }

  if (sinceMs) {
    const freshCutoff = sinceMs - 2000;
    const fresh = files.filter((file) => file.mtimeMs >= freshCutoff);
    const staleIssues = files.filter((file) => {
      const name = path.basename(file.path).toLowerCase();
      return (
        file.mtimeMs < freshCutoff && (name.includes('failed') || file.path.includes('on_error'))
      );
    });

    logStep('Fresh screenshots and error artifacts from this run');
    if (fresh.length === 0) {
      console.log('No fresh artifacts from this run.');
    } else {
      await printArtifactList(fresh, 16);
    }

    if (staleIssues.length > 0) {
      logStep('Historical error artifacts ignored for this run');
      await printArtifactList(staleIssues, 8);
    }
    return;
  }

  logStep('Recent screenshots and error artifacts');
  await printArtifactList(files, 12);
}

async function collectArtifacts(targetDir) {
  const dirs = [
    path.join(targetDir, 'screencap'),
    path.join(targetDir, 'debug', 'screencap'),
    path.join(targetDir, 'on_error'),
    path.join(targetDir, 'debug', 'on_error'),
  ];
  const files = [];
  for (const dir of dirs) {
    await walkFiles(dir, files);
  }
  return files;
}

async function assertStrictPatrolCoverage(targetDir, taskStartedAt) {
  const expected = [
    'patrol_lobby_before',
    'patrol_event_page',
    'patrol_shop_page',
    'patrol_treasure_page',
    'patrol_codex_page',
    'patrol_summon_page',
    'lobby_ready',
  ];
  const files = await collectArtifacts(targetDir);
  const freshCutoff = taskStartedAt - 2000;
  const freshIssues = files.filter((file) => {
    const name = path.basename(file.path).toLowerCase();
    return (
      file.mtimeMs >= freshCutoff &&
      (name.includes('failed') || name.includes('unverified') || file.path.includes('on_error'))
    );
  });

  if (freshIssues.length > 0) {
    throw new Error(
      `RedDotPatrol produced fresh diagnostic artifacts: ${freshIssues
        .map((file) => path.relative(repoRoot, file.path))
        .join(', ')}`,
    );
  }

  const missing = expected.filter((prefix) => {
    return !files.some((file) => {
      const name = path.basename(file.path).toLowerCase();
      return name.startsWith(prefix) && file.mtimeMs >= freshCutoff;
    });
  });

  if (missing.length > 0) {
    const waitFailed = files
      .filter((file) =>
        path.basename(file.path).toLowerCase().startsWith('patrol_wait_lobby_failed'),
      )
      .sort((a, b) => b.mtimeMs - a.mtimeMs)[0];
    const hint =
      waitFailed && waitFailed.mtimeMs >= freshCutoff
        ? `; latest wait-lobby failure: ${path.relative(repoRoot, waitFailed.path)}`
        : '';
    throw new Error(
      `RedDotPatrol did not produce fresh full coverage: ${missing.join(', ')}${hint}`,
    );
  }

  console.log('Strict patrol coverage verified.');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (!options.skipPrepare) {
    runPrepare(options.targetDir);
  }

  await ensureApi(options);
  await connectAndLoad(options.apiBase, options);
  const taskStartedAt = await runTask(options.apiBase, options);
  await summarizeArtifacts(options.targetDir, taskStartedAt);
  if (options.entry === 'RedDotPatrol' && options.strictPatrolCoverage) {
    await assertStrictPatrolCoverage(options.targetDir, taskStartedAt);
  }
  console.log(`\n${options.entry} succeeded.`);
}

main().catch(async (error) => {
  const options = parseArgs(process.argv.slice(2));
  console.error(`\n${options.entry} failed: ${error.message}`);
  const targetDir = options.targetDir;
  await summarizeArtifacts(targetDir).catch(() => {});
  process.exitCode = 1;
});
