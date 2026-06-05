import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const defaultTargetDir = path.join(repoRoot, 'src-tauri', 'target', 'debug');

function parseArgs(args) {
  const parsed = {
    limit: 20,
    sinceMinutes: null,
    targetDir: defaultTargetDir,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    const next = args[i + 1];
    if (arg === '--target-dir' && next) {
      parsed.targetDir = path.resolve(repoRoot, next);
      i += 1;
    } else if (arg === '--limit' && next) {
      parsed.limit = Number(next);
      i += 1;
    } else if (arg === '--since-minutes' && next) {
      parsed.sinceMinutes = Number(next);
      i += 1;
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
  }

  return parsed;
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

async function listArtifacts(files, limit, sinceMs) {
  const scoped = sinceMs ? files.filter((file) => file.mtimeMs >= sinceMs) : files;
  const label = sinceMs ? 'Artifacts for latest/fresh run' : 'Recent artifacts';
  console.log(`\n== ${label}`);
  if (scoped.length === 0) {
    console.log('No screenshot/error artifacts found.');
    return files;
  }

  for (const file of scoped.sort((a, b) => b.mtimeMs - a.mtimeMs).slice(0, limit)) {
    const size = file.path.toLowerCase().endsWith('.png') ? await pngSize(file.path) : '';
    console.log(
      `${path.relative(repoRoot, file.path)}${size ? ` (${size})` : ''} - ${formatAge(
        file.mtimeMs,
      )}`,
    );
  }
  return files;
}

function findLatestPatrolRunStart(files, sinceMinutes) {
  if (sinceMinutes !== null) {
    return Date.now() - sinceMinutes * 60 * 1000;
  }

  const latestLobby = files
    .filter((file) => path.basename(file.path).toLowerCase().startsWith('patrol_lobby_before'))
    .sort((a, b) => b.mtimeMs - a.mtimeMs)[0];
  return latestLobby ? latestLobby.mtimeMs - 2000 : null;
}

function printPatrolCoverage(files, sinceMs) {
  const scoped = sinceMs ? files.filter((file) => file.mtimeMs >= sinceMs) : files;
  const names = new Set(scoped.map((file) => path.basename(file.path).toLowerCase()));
  const expected = [
    'patrol_lobby_before',
    'patrol_event_page',
    'patrol_shop_page',
    'patrol_treasure_page',
    'patrol_codex_page',
    'patrol_summon_page',
    'lobby_ready',
  ];

  console.log('\n== Patrol screenshot coverage');
  if (sinceMs) {
    console.log(`Scope: ${new Date(sinceMs).toLocaleString()} and newer`);
  }
  for (const name of expected) {
    const matched = [...names].some((fileName) => fileName.startsWith(name));
    console.log(`${matched ? 'ok' : 'missing'} ${name}`);
  }
}

async function printStaleIssues(files, sinceMs, limit) {
  if (!sinceMs) return;
  const staleIssues = files
    .filter((file) => {
      const name = path.basename(file.path).toLowerCase();
      return file.mtimeMs < sinceMs && (name.includes('failed') || file.path.includes('on_error'));
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs)
    .slice(0, limit);

  if (staleIssues.length === 0) return;

  console.log('\n== Historical error artifacts ignored for latest coverage');
  for (const file of staleIssues) {
    const size = file.path.toLowerCase().endsWith('.png') ? await pngSize(file.path) : '';
    console.log(
      `${path.relative(repoRoot, file.path)}${size ? ` (${size})` : ''} - ${formatAge(
        file.mtimeMs,
      )}`,
    );
  }
}

async function printLogHints(targetDir, sinceMs) {
  const logFiles = [
    path.join(targetDir, 'debug', 'mxu-tauri.log'),
    path.join(targetDir, 'debug', 'maafw.log'),
    path.join(targetDir, 'maafw.log'),
  ];
  const pattern = /Tasker|Task\.|Recognition|RedDotPatrol|patrol_|failed|error|timeout|on_error/i;

  console.log('\n== Log hints');
  let printed = false;
  for (const logFile of logFiles) {
    if (!existsSync(logFile)) continue;
    const stat = await fs.stat(logFile);
    if (sinceMs && stat.mtimeMs < sinceMs) {
      console.log(
        `Skipping stale log: ${path.relative(repoRoot, logFile)} - ${formatAge(stat.mtimeMs)}`,
      );
      continue;
    }
    const readSize = Math.min(stat.size, 256 * 1024);
    const handle = await fs.open(logFile, 'r');
    try {
      const buffer = Buffer.alloc(readSize);
      await handle.read(buffer, 0, readSize, Math.max(0, stat.size - readSize));
      const lines = buffer
        .toString('utf8')
        .split(/\r?\n/)
        .filter((line) => pattern.test(line))
        .slice(-30);
      if (lines.length > 0) {
        printed = true;
        console.log(`\n-- ${path.relative(repoRoot, logFile)}`);
        for (const line of lines) {
          console.log(line);
        }
      }
    } finally {
      await handle.close();
    }
  }

  if (!printed) {
    console.log('No matching log lines found.');
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const files = await collectArtifacts(options.targetDir);
  const sinceMs = findLatestPatrolRunStart(files, options.sinceMinutes);
  await listArtifacts(files, options.limit, sinceMs);
  printPatrolCoverage(files, sinceMs);
  await printStaleIssues(files, sinceMs, 8);
  await printLogHints(options.targetDir, sinceMs ? sinceMs - 10 * 60 * 1000 : null);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
