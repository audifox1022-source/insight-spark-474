#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import process from 'node:process';

function parseArgs(argv) {
  const args = {
    dist: 'dist',
    baselineKb: 349.55,
    maxKb: 260,
    minImprovement: 0.2,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) {
      args[key] = true;
    } else if (['baseline-kb', 'max-kb', 'min-improvement'].includes(key)) {
      args[key.replace(/-([a-z])/g, (_, char) => char.toUpperCase())] = Number(value);
      index += 1;
    } else {
      args[key] = value;
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
const entryAsset = findEntryAsset(distDir);
const currentKb = statSync(entryAsset).size / 1000;
const improvement = (args.baselineKb - currentKb) / args.baselineKb;
const lazyChunks = listLazyChunks(distDir);

const result = {
  baselineKb: Number(args.baselineKb.toFixed(2)),
  currentKb: Number(currentKb.toFixed(2)),
  maxKb: args.maxKb,
  improvementPct: Number((improvement * 100).toFixed(2)),
  entryAsset: entryAsset.replace(`${process.cwd()}/`, ''),
  lazyChunks,
  passed: currentKb <= args.maxKb && improvement >= args.minImprovement && lazyChunks.length >= 4,
};

console.log(JSON.stringify(result, null, 2));

if (!result.passed) {
  process.exitCode = 1;
}
