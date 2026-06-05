import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const projectDir = path.join(repoRoot, 'projects', 'golden_spatula_mumu');

function parseArgs(args) {
  const parsed = {
    strictMaaFw: false,
    targetDir: path.join(repoRoot, 'src-tauri', 'target', 'debug'),
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--strict-maafw') {
      parsed.strictMaaFw = true;
      continue;
    }
    if (arg === '--target-dir') {
      const next = args[i + 1];
      if (!next) {
        throw new Error('--target-dir requires a path');
      }
      parsed.targetDir = path.resolve(repoRoot, next);
      i += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return parsed;
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function copyProject(targetDir) {
  await fs.mkdir(targetDir, { recursive: true });
  await fs.copyFile(
    path.join(projectDir, 'interface.json'),
    path.join(targetDir, 'interface.json'),
  );
  await fs.rm(path.join(targetDir, 'resource'), { recursive: true, force: true });
  await fs.cp(path.join(projectDir, 'resource'), path.join(targetDir, 'resource'), {
    recursive: true,
    force: true,
  });
  const knowledgeResourceDir = path.join(projectDir, 'resource_knowledge');
  await fs.rm(path.join(targetDir, 'resource_knowledge'), { recursive: true, force: true });
  if (await exists(knowledgeResourceDir)) {
    await fs.cp(knowledgeResourceDir, path.join(targetDir, 'resource_knowledge'), {
      recursive: true,
      force: true,
    });
  }
  const knowledgeDir = path.join(projectDir, 'knowledge');
  await fs.rm(path.join(targetDir, 'knowledge'), { recursive: true, force: true });
  if (await exists(knowledgeDir)) {
    await fs.cp(knowledgeDir, path.join(targetDir, 'knowledge'), {
      recursive: true,
      force: true,
    });
  }
}

async function checkMaaFw(targetDir, strictMaaFw) {
  const maafwDir = path.join(targetDir, 'maafw');
  const candidates = [
    path.join(maafwDir, 'MaaFramework.dll'),
    path.join(maafwDir, 'libMaaFramework.dylib'),
    path.join(maafwDir, 'libMaaFramework.so'),
  ];

  const found = [];
  for (const candidate of candidates) {
    if (await exists(candidate)) {
      found.push(candidate);
    }
  }

  if (found.length > 0) {
    console.log(`MaaFramework runtime found: ${found[0]}`);
    return;
  }

  const message = `MaaFramework runtime was not found under ${maafwDir}. Put the MaaFramework release bin files there before running MXU.`;
  if (strictMaaFw) {
    throw new Error(message);
  }
  console.warn(`Warning: ${message}`);
}

async function main() {
  const { targetDir, strictMaaFw } = parseArgs(process.argv.slice(2));

  if (!(await exists(projectDir))) {
    throw new Error(`Project package not found: ${projectDir}`);
  }

  await copyProject(targetDir);
  console.log(`Golden Spatula MuMu project copied to ${targetDir}`);
  await checkMaaFw(targetDir, strictMaaFw);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
