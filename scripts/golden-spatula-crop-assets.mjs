import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const projectDir = path.join(repoRoot, 'projects', 'golden_spatula_mumu');
const defaultRecipePath = path.join(projectDir, 'tooling', 'crop-recipes.json');

function parseArgs(args) {
  const parsed = {
    recipePath: defaultRecipePath,
    dryRun: false,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    const next = args[i + 1];
    if (arg === '--recipe' && next) {
      parsed.recipePath = path.resolve(repoRoot, next);
      i += 1;
    } else if (arg === '--dry-run') {
      parsed.dryRun = true;
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
  }

  return parsed;
}

function psQuote(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function cropWithPowerShell(source, output, rect) {
  const [x, y, width, height] = rect;
  const command = [
    'Add-Type -AssemblyName System.Drawing',
    `$src = [System.Drawing.Image]::FromFile(${psQuote(source)})`,
    `$rect = New-Object System.Drawing.Rectangle(${x}, ${y}, ${width}, ${height})`,
    '$bmp = New-Object System.Drawing.Bitmap($rect.Width, $rect.Height)',
    '$gfx = [System.Drawing.Graphics]::FromImage($bmp)',
    '$gfx.DrawImage($src, 0, 0, $rect, [System.Drawing.GraphicsUnit]::Pixel)',
    `$bmp.Save(${psQuote(output)}, [System.Drawing.Imaging.ImageFormat]::Png)`,
    '$gfx.Dispose()',
    '$bmp.Dispose()',
    '$src.Dispose()',
  ].join('; ');

  const result = spawnSync(
    'powershell',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command],
    { stdio: 'pipe', encoding: 'utf8' },
  );

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `PowerShell crop failed: ${output}`);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const recipes = JSON.parse(await fs.readFile(options.recipePath, 'utf8'));
  if (!Array.isArray(recipes)) {
    throw new Error(`Recipe file must contain an array: ${options.recipePath}`);
  }

  for (const recipe of recipes) {
    const source = path.resolve(projectDir, recipe.source);
    const output = path.resolve(projectDir, recipe.output);
    const rect = recipe.rect;

    if (!Array.isArray(rect) || rect.length !== 4) {
      throw new Error(`Invalid rect for recipe output=${recipe.output}`);
    }

    if (!existsSync(source)) {
      if (recipe.optional) {
        console.log(`skip missing optional source: ${path.relative(repoRoot, source)}`);
        continue;
      }
      throw new Error(`Source image not found: ${source}`);
    }

    console.log(
      `${options.dryRun ? 'would crop' : 'crop'} ${recipe.source} [${rect.join(
        ', ',
      )}] -> ${recipe.output}`,
    );

    if (!options.dryRun) {
      await fs.mkdir(path.dirname(output), { recursive: true });
      cropWithPowerShell(source, output, rect);
    }
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
