import { existsSync, readFileSync } from 'node:fs';
import { lookup } from 'node:dns/promises';
import path from 'node:path';
import process from 'node:process';
import dotenv from 'dotenv';

const ROOT = process.cwd();
const ENV_FILES = ['.env.local', '.env'];
const TEMPLATE_VALUES = new Set([
  '',
  'your-supabase-anon-key',
  'your-gemini-api-key',
  'your-vercel-blob-token',
]);

const REQUIRED = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'GEMINI_API_KEY',
  'BLOB_READ_WRITE_TOKEN',
];

for (const envFile of ENV_FILES) {
  const fullPath = path.join(ROOT, envFile);
  if (existsSync(fullPath)) {
    dotenv.config({ path: fullPath, override: false });
  }
}

function readProjectRef() {
  const configPath = path.join(ROOT, 'supabase', 'config.toml');
  if (!existsSync(configPath)) return null;

  const config = readFileSync(configPath, 'utf8');
  return config.match(/project_id\s*=\s*"([^"]+)"/)?.[1] ?? null;
}

function hasUsableValue(name) {
  const value = process.env[name]?.trim() ?? '';
  return value && !TEMPLATE_VALUES.has(value);
}

function getSupabaseRef(rawUrl) {
  try {
    const url = new URL(rawUrl);
    const [ref, ...rest] = url.hostname.split('.');
    if (url.protocol !== 'https:' || rest.join('.') !== 'supabase.co') {
      return null;
    }
    return ref;
  } catch {
    return null;
  }
}

function decodeJwtPayload(token) {
  const [, payload] = token.split('.');
  if (!payload) return null;

  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
  } catch {
    return null;
  }
}

async function canResolve(hostname) {
  try {
    await lookup(hostname);
    return true;
  } catch {
    return false;
  }
}

function addResult(results, ok, label, detail) {
  results.push({ ok, label, detail });
}

const results = [];
const projectRef = readProjectRef();

for (const name of REQUIRED) {
  addResult(
    results,
    hasUsableValue(name),
    `${name} is configured`,
    hasUsableValue(name) ? 'present' : 'missing or placeholder'
  );
}

const clientUrl = process.env.VITE_SUPABASE_URL ?? '';
const serverUrl = process.env.SUPABASE_URL ?? '';
const clientRef = getSupabaseRef(clientUrl);
const serverRef = getSupabaseRef(serverUrl);

addResult(
  results,
  Boolean(clientRef),
  'VITE_SUPABASE_URL uses a valid Supabase HTTPS URL',
  clientRef ? `project ref ${clientRef}` : 'invalid URL'
);

addResult(
  results,
  Boolean(serverRef),
  'SUPABASE_URL uses a valid Supabase HTTPS URL',
  serverRef ? `project ref ${serverRef}` : 'invalid URL'
);

if (clientRef && serverRef) {
  addResult(
    results,
    clientRef === serverRef,
    'Client and server Supabase project refs match',
    `${clientRef} / ${serverRef}`
  );
}

if (projectRef && clientRef) {
  addResult(
    results,
    projectRef === clientRef,
    'VITE_SUPABASE_URL matches supabase/config.toml',
    `${clientRef} / ${projectRef}`
  );
}

if (clientRef) {
  const hostname = new URL(clientUrl).hostname;
  addResult(
    results,
    await canResolve(hostname),
    'VITE_SUPABASE_URL DNS resolves',
    hostname
  );
}

if (serverRef) {
  const hostname = new URL(serverUrl).hostname;
  addResult(
    results,
    await canResolve(hostname),
    'SUPABASE_URL DNS resolves',
    hostname
  );
}

for (const [tokenName, expectedRef] of [
  ['VITE_SUPABASE_ANON_KEY', clientRef],
  ['SUPABASE_ANON_KEY', serverRef],
]) {
  if (!hasUsableValue(tokenName) || !expectedRef) continue;

  const payload = decodeJwtPayload(process.env[tokenName]);
  addResult(
    results,
    Boolean(payload?.ref && payload.ref === expectedRef),
    `${tokenName} JWT ref matches its Supabase URL`,
    payload?.ref ? `token ref ${payload.ref}` : 'could not decode token ref'
  );
}

const failed = results.filter((result) => !result.ok);
for (const result of results) {
  const icon = result.ok ? 'PASS' : 'FAIL';
  console.log(`${icon} ${result.label}: ${result.detail}`);
}

if (failed.length > 0) {
  console.error(`\nRuntime environment verification failed: ${failed.length} issue(s).`);
  process.exit(1);
}

console.log('\nRuntime environment verification passed.');
