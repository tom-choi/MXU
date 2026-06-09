import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const projectRoot = path.join(repoRoot, 'projects', 'golden_spatula_mumu');

const cases = [
  {
    name: 'buy-xp-idle',
    source: 'samples/screenshots/source_in_game_shop_idle.png',
    template: 'resource/image/ingame/buy_xp_button_idle.png',
    cropRect: [188, 586, 124, 56],
    guardRoi: [180, 575, 140, 80],
  },
  {
    name: 'buy-xp-active',
    source: 'samples/screenshots/source_in_game_shop_active.png',
    template: 'resource/image/ingame/buy_xp_button_active.png',
    cropRect: [188, 586, 124, 56],
    guardRoi: [180, 575, 140, 80],
  },
  {
    name: 'shop-refresh-idle',
    source: 'samples/screenshots/source_in_game_shop_idle.png',
    template: 'resource/image/ingame/shop_refresh_button_idle.png',
    cropRect: [188, 652, 124, 56],
    guardRoi: [180, 640, 140, 80],
  },
  {
    name: 'shop-refresh-active',
    source: 'samples/screenshots/source_in_game_shop_active.png',
    template: 'resource/image/ingame/shop_refresh_button_active.png',
    cropRect: [188, 652, 124, 56],
    guardRoi: [180, 640, 140, 80],
  },
];

function psSingleQuote(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function rectContains(outer, inner) {
  const [outerX, outerY, outerWidth, outerHeight] = outer;
  const [innerX, innerY, innerWidth, innerHeight] = inner;
  return (
    innerX >= outerX &&
    innerY >= outerY &&
    innerX + innerWidth <= outerX + outerWidth &&
    innerY + innerHeight <= outerY + outerHeight
  );
}

async function runPowerShellMatcher(caseFile) {
  const command = `
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies 'System.Drawing' -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class MxuImageMatcher
{
    private static Bitmap ToArgbBitmap(string path)
    {
        using (var image = Image.FromFile(path))
        {
            var bitmap = new Bitmap(image.Width, image.Height, PixelFormat.Format32bppArgb);
            using (var graphics = Graphics.FromImage(bitmap))
            {
                graphics.DrawImage(image, 0, 0, image.Width, image.Height);
            }
            return bitmap;
        }
    }

    public static double[] FindBest(string sourcePath, string templatePath, int roiX, int roiY, int roiW, int roiH)
    {
        using (var source = ToArgbBitmap(sourcePath))
        using (var template = ToArgbBitmap(templatePath))
        {
            if (template.Width > roiW || template.Height > roiH)
            {
                throw new InvalidOperationException("template is larger than ROI");
            }

            var sourceRect = new Rectangle(0, 0, source.Width, source.Height);
            var templateRect = new Rectangle(0, 0, template.Width, template.Height);
            var sourceData = source.LockBits(sourceRect, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
            var templateData = template.LockBits(templateRect, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);

            try
            {
                var sourceBytes = new byte[Math.Abs(sourceData.Stride) * source.Height];
                var templateBytes = new byte[Math.Abs(templateData.Stride) * template.Height];
                Marshal.Copy(sourceData.Scan0, sourceBytes, 0, sourceBytes.Length);
                Marshal.Copy(templateData.Scan0, templateBytes, 0, templateBytes.Length);

                var bestX = roiX;
                var bestY = roiY;
                var bestScore = double.MaxValue;
                var maxX = roiX + roiW - template.Width;
                var maxY = roiY + roiH - template.Height;

                for (var y = roiY; y <= maxY; y++)
                {
                    for (var x = roiX; x <= maxX; x++)
                    {
                        long diff = 0;
                        for (var ty = 0; ty < template.Height; ty++)
                        {
                            var sourceRow = (y + ty) * sourceData.Stride + x * 4;
                            var templateRow = ty * templateData.Stride;
                            for (var tx = 0; tx < template.Width; tx++)
                            {
                                var sourceIndex = sourceRow + tx * 4;
                                var templateIndex = templateRow + tx * 4;
                                diff += Math.Abs(sourceBytes[sourceIndex] - templateBytes[templateIndex]);
                                diff += Math.Abs(sourceBytes[sourceIndex + 1] - templateBytes[templateIndex + 1]);
                                diff += Math.Abs(sourceBytes[sourceIndex + 2] - templateBytes[templateIndex + 2]);
                            }
                        }

                        var score = (double)diff / (template.Width * template.Height * 3);
                        if (score < bestScore)
                        {
                            bestScore = score;
                            bestX = x;
                            bestY = y;
                        }
                    }
                }

                return new double[] { bestX, bestY, bestScore, template.Width, template.Height };
            }
            finally
            {
                source.UnlockBits(sourceData);
                template.UnlockBits(templateData);
            }
        }
    }
}
'@

$cases = Get-Content -Raw -LiteralPath ${psSingleQuote(caseFile)} | ConvertFrom-Json
$results = @()
foreach ($case in $cases) {
  $result = [MxuImageMatcher]::FindBest(
    [string]$case.sourcePath,
    [string]$case.templatePath,
    [int]$case.guardRoi[0],
    [int]$case.guardRoi[1],
    [int]$case.guardRoi[2],
    [int]$case.guardRoi[3]
  )
  $results += [pscustomobject]@{
    name = [string]$case.name
    bestX = [int]$result[0]
    bestY = [int]$result[1]
    score = [double]$result[2]
    width = [int]$result[3]
    height = [int]$result[4]
  }
}
$results | ConvertTo-Json -Depth 4
`;

  const result = spawnSync(
    'powershell',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command],
    {
      cwd: repoRoot,
      encoding: 'utf8',
      maxBuffer: 1024 * 1024,
    },
  );

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || 'PowerShell image matcher failed');
  }

  const output = result.stdout.trim();
  if (!output) {
    throw new Error(result.stderr || 'PowerShell image matcher produced no JSON output');
  }

  return JSON.parse(output);
}

async function main() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mxu-golden-template-match-'));
  const caseFile = path.join(tempDir, 'cases.json');
  const expandedCases = cases.map((testCase) => {
    assert.ok(rectContains(testCase.guardRoi, testCase.cropRect), `${testCase.name}: ROI mismatch`);
    return {
      ...testCase,
      sourcePath: path.join(projectRoot, testCase.source),
      templatePath: path.join(projectRoot, testCase.template),
    };
  });

  await fs.writeFile(caseFile, JSON.stringify(expandedCases), 'utf8');
  const results = await runPowerShellMatcher(caseFile);
  const resultByName = new Map(results.map((result) => [result.name, result]));

  for (const testCase of cases) {
    const result = resultByName.get(testCase.name);
    assert.ok(result, `${testCase.name}: missing match result`);
    assert.equal(result.bestX, testCase.cropRect[0], `${testCase.name}: unexpected best x`);
    assert.equal(result.bestY, testCase.cropRect[1], `${testCase.name}: unexpected best y`);
    assert.equal(result.width, testCase.cropRect[2], `${testCase.name}: unexpected width`);
    assert.equal(result.height, testCase.cropRect[3], `${testCase.name}: unexpected height`);
    assert.ok(result.score <= 0.01, `${testCase.name}: template match score ${result.score}`);
  }

  await fs.rm(tempDir, { recursive: true, force: true });

  console.log('Golden Spatula in-game template match test');
  console.log(`Templates matched in guard ROI: ${cases.length}`);
  console.log('OK: XP and refresh button templates match their calibrated source screenshots.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
