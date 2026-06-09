import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const defaultTargetDir = path.join(repoRoot, 'src-tauri', 'target', 'debug');
const defaultReportFile = path.join(defaultTargetDir, 'golden-spatula-readiness-report.json');
const defaultScreenshotFile = path.join(defaultTargetDir, 'golden-spatula-readiness.png');

function parseArgs(args) {
  const parsed = {
    apiBase: process.env.MXU_API_BASE || null,
    allowRunningTasks: false,
    cleanupInstance: true,
    displayShortSide: 720,
    instanceId: `golden-readiness-${Date.now()}`,
    reportFile: defaultReportFile,
    screenshotFile: defaultScreenshotFile,
    skipPrepare: false,
    startMxu: true,
    targetDir: defaultTargetDir,
    timeoutMs: 90000,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];
    if (arg === '--api-base' && next) {
      parsed.apiBase = next;
      index += 1;
    } else if (arg === '--instance' && next) {
      parsed.instanceId = next;
      index += 1;
    } else if (arg === '--target-dir' && next) {
      parsed.targetDir = path.resolve(repoRoot, next);
      index += 1;
    } else if (arg === '--report-file' && next) {
      parsed.reportFile = path.resolve(repoRoot, next);
      index += 1;
    } else if (arg === '--screenshot-file' && next) {
      parsed.screenshotFile = path.resolve(repoRoot, next);
      index += 1;
    } else if (arg === '--timeout-ms' && next) {
      parsed.timeoutMs = Number(next);
      index += 1;
    } else if (arg === '--display-short-side' && next) {
      parsed.displayShortSide = Number(next);
      index += 1;
    } else if (arg === '--skip-prepare') {
      parsed.skipPrepare = true;
    } else if (arg === '--no-start-mxu') {
      parsed.startMxu = false;
    } else if (arg === '--keep-instance') {
      parsed.cleanupInstance = false;
    } else if (arg === '--allow-running-tasks') {
      parsed.allowRunningTasks = true;
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
  }

  if (!Number.isFinite(parsed.timeoutMs) || parsed.timeoutMs <= 0) {
    throw new Error('--timeout-ms must be a positive number');
  }
  if (!Number.isFinite(parsed.displayShortSide) || parsed.displayShortSide <= 0) {
    throw new Error('--display-short-side must be a positive number');
  }

  return parsed;
}

function defaultApiBases() {
  return Array.from({ length: 10 }, (_, index) => `http://127.0.0.1:${12701 + index}/api`);
}

function relativeOrNull(filePath) {
  return filePath ? path.relative(repoRoot, filePath) : null;
}

function countStatuses(checks) {
  return checks.reduce((counts, check) => {
    counts[check.status] = (counts[check.status] ?? 0) + 1;
    return counts;
  }, {});
}

function summarizeStatus(checks) {
  if (checks.some((check) => check.status === 'fail')) return 'fail';
  if (checks.some((check) => check.status === 'warn')) return 'warn';
  return 'pass';
}

function createReport(options) {
  return {
    type: 'mxu.goldenSpatula.readinessReport',
    version: 1,
    createdAt: new Date().toISOString(),
    status: 'fail',
    apiBase: options.apiBase,
    instanceId: options.instanceId,
    targetDir: relativeOrNull(options.targetDir),
    checks: [],
    device: null,
    resourcePaths: [],
    screenshot: null,
    error: null,
  };
}

function addCheck(report, key, status, message, details = {}) {
  report.checks.push({
    key,
    status,
    message,
    details,
  });
  console.log(`${status.toUpperCase()}: ${message}`);
}

async function writeReport(options, report) {
  report.status = summarizeStatus(report.checks);
  await fs.mkdir(path.dirname(options.reportFile), { recursive: true });
  await fs.writeFile(options.reportFile, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`Wrote readiness report: ${relativeOrNull(options.reportFile)}`);
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function runPrepare(targetDir) {
  const result = spawnSync(
    process.execPath,
    [path.join(repoRoot, 'scripts', 'prepare-golden-spatula-mumu.mjs'), '--target-dir', targetDir],
    { cwd: repoRoot, stdio: 'inherit' },
  );

  if (result.status !== 0) {
    throw new Error('prepare-golden-spatula-mumu failed');
  }
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
  return child.pid;
}

async function ensureApi(options, report) {
  const explicitApiBase = Boolean(options.apiBase);
  const candidates = explicitApiBase ? [options.apiBase] : defaultApiBases();
  let reachable = await findReachableApiBase(candidates);
  if (!reachable && options.startMxu) {
    const pid = startMxu(options.targetDir);
    addCheck(report, 'mxu:start', 'pass', `Started MXU process pid=${pid}`);
    const start = Date.now();
    while (Date.now() - start < 30000) {
      reachable = await findReachableApiBase(candidates);
      if (reachable) break;
      await sleep(500);
    }
  }

  if (!reachable) {
    throw new Error(`MXU API is not reachable at ${candidates.join(', ')}`);
  }

  options.apiBase = reachable;
  report.apiBase = reachable;
  addCheck(report, 'api:heartbeat', 'pass', `MXU API is reachable: ${reachable}`);
}

function pickDevice(devices) {
  if (!Array.isArray(devices) || devices.length === 0) return null;
  return [...devices].sort((a, b) => {
    const score = (device) => {
      const name = `${device.name || ''} ${device.address || ''}`.toLowerCase();
      if (device.address === '127.0.0.1:16384') return 0;
      if (name.includes('mumu') && String(device.address || '').startsWith('127.0.0.1')) return 1;
      if (name.includes('mumu')) return 2;
      return 3;
    };
    return score(a) - score(b);
  })[0];
}

function findRunningInstances(state) {
  return Object.entries(state?.instances || {})
    .filter(([, instance]) => instance?.is_running)
    .map(([id]) => id);
}

async function waitForInstance(apiBase, instanceId, predicate, timeoutMs) {
  const start = Date.now();
  let lastInstance = null;
  while (Date.now() - start < timeoutMs) {
    const state = await fetchJson(apiBase, '/maa/state', { timeoutMs: 5000 });
    lastInstance = state?.instances?.[instanceId] || null;
    if (predicate(lastInstance)) return lastInstance;
    await sleep(500);
  }
  throw new Error(`Timed out waiting for instance readiness: ${JSON.stringify(lastInstance)}`);
}

function pngSize(buffer) {
  if (buffer.length < 24 || buffer.toString('ascii', 1, 4) !== 'PNG') return null;
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

async function fetchScreenshot(apiBase, instanceId, filePath) {
  const response = await fetch(`${apiBase}/maa/instances/${instanceId}/screenshot`, {
    signal: AbortSignal.timeout(15000),
  });
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!response.ok) {
    const text = buffer.toString('utf8');
    throw new Error(`GET /screenshot failed: ${response.status} ${text}`);
  }
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, buffer);
  return {
    file: relativeOrNull(filePath),
    sizeBytes: buffer.length,
    dimensions: pngSize(buffer),
  };
}

async function cleanupInstance(options, report) {
  if (!options.cleanupInstance || !options.apiBase) return;
  try {
    await fetchJson(options.apiBase, `/maa/instances/${options.instanceId}`, {
      method: 'DELETE',
      timeoutMs: 5000,
    });
    addCheck(
      report,
      'instance:cleanup',
      'pass',
      `Destroyed readiness instance ${options.instanceId}`,
    );
  } catch (error) {
    addCheck(
      report,
      'instance:cleanup',
      'warn',
      `Could not destroy readiness instance: ${error.message}`,
    );
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const report = createReport(options);

  try {
    if (!options.skipPrepare) {
      runPrepare(options.targetDir);
      addCheck(report, 'package:prepare', 'pass', 'Golden Spatula package prepared');
    }

    await ensureApi(options, report);

    const initialized = await fetchJson(options.apiBase, '/maa/initialized', { timeoutMs: 5000 });
    addCheck(
      report,
      'maa:initialized',
      initialized?.initialized ? 'pass' : 'warn',
      initialized?.initialized
        ? `MaaFramework initialized: ${initialized.version || 'unknown version'}`
        : 'MaaFramework is not initialized yet',
      initialized,
    );

    const stateBefore = await fetchJson(options.apiBase, '/maa/state', { timeoutMs: 5000 });
    const runningInstances = findRunningInstances(stateBefore);
    if (runningInstances.length > 0 && !options.allowRunningTasks) {
      throw new Error(`Existing Maa task is running: ${runningInstances.join(', ')}`);
    }
    addCheck(
      report,
      'state:no-running-task',
      runningInstances.length === 0 ? 'pass' : 'warn',
      runningInstances.length === 0
        ? 'No existing Maa task is running'
        : `Existing Maa task is running: ${runningInstances.join(', ')}`,
      { runningInstances },
    );

    const devices = await fetchJson(options.apiBase, '/maa/devices', { timeoutMs: 30000 });
    const device = pickDevice(devices);
    if (!device) {
      throw new Error('No ADB devices found. Start MuMu and enable ADB first.');
    }
    report.device = {
      name: device.name,
      address: device.address,
      adb_path: device.adb_path,
    };
    addCheck(
      report,
      'adb:device',
      'pass',
      `Using device: ${device.name || device.address}`,
      report.device,
    );

    const resourcePaths = [
      path.join(options.targetDir, 'resource'),
      path.join(options.targetDir, 'resource_knowledge'),
    ];
    report.resourcePaths = resourcePaths.map((resourcePath) => relativeOrNull(resourcePath));
    for (const resourcePath of resourcePaths) {
      if (!existsSync(resourcePath)) {
        throw new Error(`Resource path does not exist: ${resourcePath}`);
      }
    }
    addCheck(report, 'resource:paths', 'pass', 'Resource and knowledge resource paths exist', {
      resourcePaths: report.resourcePaths,
    });

    await fetchJson(options.apiBase, `/maa/instances/${options.instanceId}`, { method: 'PUT' });
    addCheck(report, 'instance:create', 'pass', `Created readiness instance ${options.instanceId}`);

    await fetchJson(options.apiBase, `/maa/instances/${options.instanceId}/connect`, {
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
    addCheck(report, 'controller:connect', 'pass', 'Controller connect request accepted');

    await fetchJson(options.apiBase, `/maa/instances/${options.instanceId}/resource/load`, {
      method: 'POST',
      timeoutMs: 30000,
      body: { paths: resourcePaths },
    });
    addCheck(report, 'resource:load-request', 'pass', 'Resource load request accepted');

    await waitForInstance(
      options.apiBase,
      options.instanceId,
      (instance) => Boolean(instance?.connected && instance?.resource_loaded),
      options.timeoutMs,
    );
    addCheck(report, 'instance:ready', 'pass', 'Controller connected and resources loaded');

    report.screenshot = await fetchScreenshot(
      options.apiBase,
      options.instanceId,
      options.screenshotFile,
    );
    addCheck(
      report,
      'screenshot:capture',
      report.screenshot.dimensions ? 'pass' : 'fail',
      report.screenshot.dimensions
        ? `Screenshot captured: ${report.screenshot.dimensions.width}x${report.screenshot.dimensions.height}`
        : 'Screenshot response was not a PNG image',
      report.screenshot,
    );
  } catch (error) {
    report.error = error.message;
    addCheck(report, 'readiness:exception', 'fail', error.message);
  } finally {
    await cleanupInstance(options, report);
    await writeReport(options, report);
  }

  const counts = countStatuses(report.checks);
  console.log(
    `Readiness: ${report.status} (${counts.pass ?? 0} pass, ${counts.warn ?? 0} warn, ${counts.fail ?? 0} fail)`,
  );
  if (report.status === 'fail') {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
