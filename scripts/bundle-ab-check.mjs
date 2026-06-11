#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import process from 'node:process';

function parseArgs(argv) {
  const args = {
    dist: 'dist',
    baselineKb: 349.55,
    baselineInitialKb: null,
    baselineChunkKb: null,
    chunkPattern: null,
    maxKb: 260,
    maxInitialKb: null,
    maxChunkKb: null,
    minImprovement: 0.2,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const normalizedKey = key.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) {
      args[normalizedKey] = true;
    } else if (['baseline-kb', 'baseline-initial-kb', 'baseline-chunk-kb', 'max-kb', 'max-initial-kb', 'max-chunk-kb', 'min-improvement'].includes(key)) {
      args[normalizedKey] = Number(value);
      index += 1;
    } else {
      args[normalizedKey] = value;
      index += 1;
    }
  }

  return args;
}

function findEntryAsset(distDir) {
  const indexPath = join(distDir, 'index.html');
  if (!existsSync(indexPath)) {
    throw new Error(`Missing ${indexPath}. Run npm run build first.`);
  }

  const html = readFileSync(indexPath, 'utf8');
  const moduleScript = html.match(/<script[^>]+type="module"[^>]+src="([^"]+)"/);
  if (!moduleScript) {
    throw new Error('Unable to find module entry script in dist/index.html.');
  }

  return join(distDir, moduleScript[1].replace(/^\//, ''));
}

function listLazyChunks(distDir) {
  const assetsDir = join(distDir, 'assets');
  if (!existsSync(assetsDir)) return [];
  return readdirSync(assetsDir)
    .filter((name) => /Workspace|SlideEditor|AudioLab|Translator|PDFEditor/.test(name) && name.endsWith('.js'))
    .sort();
}

const args = parseArgs(process.argv.slice(2));
const distDir = resolve(process.cwd(), args.dist);
const indexHtml = readFileSync(join(distDir, 'index.html'), 'utf8');
const entryAsset = findEntryAsset(distDir);
const currentKb = statSync(entryAsset).size / 1000;
const improvement = (args.baselineKb - currentKb) / args.baselineKb;
const lazyChunks = listLazyChunks(distDir);
const initialAssets = [...indexHtml.matchAll(/(?:src|href)="\/assets\/([^"]+\.js)"/g)].map((match) => match[1]);
const initialKb = initialAssets.reduce((sum, asset) => {
  return sum + statSync(join(distDir, 'assets', asset)).size / 1000;
}, 0);
const initialImprovement = args.baselineInitialKb
  ? (args.baselineInitialKb - initialKb) / args.baselineInitialKb
  : null;
const chunkAsset = args.chunkPattern
  ? readdirSync(join(distDir, 'assets')).find((asset) => asset.includes(args.chunkPattern) && asset.endsWith('.js'))
  : null;
const chunkKb = chunkAsset ? statSync(join(distDir, 'assets', chunkAsset)).size / 1000 : null;
const chunkImprovement = args.baselineChunkKb && chunkKb !== null
  ? (args.baselineChunkKb - chunkKb) / args.baselineChunkKb
  : null;

const initialPassed =
  args.baselineInitialKb && args.maxInitialKb
    ? initialKb <= args.maxInitialKb && initialImprovement >= args.minImprovement
    : true;
const chunkPassed =
  args.chunkPattern && args.baselineChunkKb && args.maxChunkKb
    ? Boolean(chunkAsset && chunkKb !== null && chunkKb <= args.maxChunkKb && chunkImprovement >= 0)
    : true;

const result = {
  baselineKb: Number(args.baselineKb.toFixed(2)),
  currentKb: Number(currentKb.toFixed(2)),
  baselineInitialKb: args.baselineInitialKb === null ? null : Number(args.baselineInitialKb.toFixed(2)),
  currentInitialKb: Number(initialKb.toFixed(2)),
  baselineChunkKb: args.baselineChunkKb === null ? null : Number(args.baselineChunkKb.toFixed(2)),
  currentChunkKb: chunkKb === null ? null : Number(chunkKb.toFixed(2)),
  maxKb: args.maxKb,
  maxInitialKb: args.maxInitialKb,
  maxChunkKb: args.maxChunkKb,
  improvementPct: Number((improvement * 100).toFixed(2)),
  initialImprovementPct: initialImprovement === null ? null : Number((initialImprovement * 100).toFixed(2)),
  chunkImprovementPct: chunkImprovement === null ? null : Number((chunkImprovement * 100).toFixed(2)),
  entryAsset: entryAsset.replace(`${process.cwd()}/`, ''),
  chunkAsset,
  initialAssets,
  lazyChunks,
  passed: currentKb <= args.maxKb && improvement >= args.minImprovement && lazyChunks.length >= 4 && initialPassed && chunkPassed,
};

console.log(JSON.stringify(result, null, 2));

if (!result.passed) {
  process.exitCode = 1;
}
