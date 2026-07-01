import { existsSync, readFileSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { assetManifest } from '../content/packs/midnight-hospital/assetManifest';

const rootDir = process.cwd();
const failures: string[] = [];

function assertReady(condition: boolean, message: string) {
  if (!condition) {
    failures.push(message);
  }
}

async function collectFiles(dir: string, predicate: (fileName: string) => boolean): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        return collectFiles(fullPath, predicate);
      }
      return predicate(entry.name) ? [fullPath] : [];
    }),
  );
  return files.flat();
}

function checkEnvironmentTemplates() {
  const envExamplePath = join(rootDir, '.env.example');
  assertReady(existsSync(envExamplePath), '.env.example is missing.');
  if (!existsSync(envExamplePath)) {
    return;
  }

  const envExample = readFileSync(envExamplePath, 'utf8');
  assertReady(!/sk-[A-Za-z0-9_-]{12,}/.test(envExample), '.env.example must not contain a real API key.');
  assertReady(envExample.includes('DEEPSEEK_API_KEY='), '.env.example must document DEEPSEEK_API_KEY.');
  assertReady(envExample.includes('DEEPSEEK_MODEL='), '.env.example must document DEEPSEEK_MODEL.');
}

async function checkAssets() {
  const imageRoot = join(rootDir, 'public/assets/images/midnight_hospital');
  assertReady(existsSync(imageRoot), 'public/assets/images/midnight_hospital is missing.');
  if (!existsSync(imageRoot)) {
    return;
  }

  const webpFiles = await collectFiles(imageRoot, (fileName) => fileName.endsWith('.webp'));
  assertReady(webpFiles.length === 50, `Expected 50 WebP assets, found ${webpFiles.length}.`);

  for (const [assetId, asset] of Object.entries(assetManifest)) {
    if (!asset.src.startsWith('/')) {
      failures.push(`Asset ${assetId} must use an absolute public path.`);
      continue;
    }
    const filePath = join(rootDir, 'public', asset.src);
    assertReady(existsSync(filePath), `Asset ${assetId} points to a missing file: ${asset.src}`);
  }
}

function checkBuildOutputs() {
  assertReady(existsSync(join(rootDir, 'dist/index.html')), 'dist/index.html is missing. Run npm run build first.');
  assertReady(existsSync(join(rootDir, 'dist-server/server/productionServer.js')), 'Production server build is missing.');
  assertReady(existsSync(join(rootDir, 'dist-server/server/storyApi.js')), 'Story API server build is missing.');
}

async function main() {
  checkEnvironmentTemplates();
  await checkAssets();
  checkBuildOutputs();

  if (failures.length) {
    console.error('Production readiness check failed:');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.info('Production readiness check passed.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
