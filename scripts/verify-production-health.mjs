import process from 'node:process';

const DEFAULT_PRODUCTION_URL = 'https://twmakeppt.vercel.app';

function normalizeBaseUrl(rawUrl) {
  const value = (rawUrl || DEFAULT_PRODUCTION_URL).trim();
  try {
    const url = new URL(value);
    url.pathname = url.pathname.replace(/\/$/, '');
    url.search = '';
    url.hash = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    throw new Error(`Invalid production URL: ${value}`);
  }
}

function buildHealthUrl(baseUrl) {
  return `${baseUrl}/api/health`;
}

function formatRuntime(runtime = {}) {
  const entries = Object.entries(runtime).map(([key, value]) => `${key}=${String(value)}`);
  return entries.length ? entries.join(', ') : 'no runtime details returned';
}

function fail(...lines) {
  for (const line of lines) {
    console.error(line);
  }
  process.exitCode = 1;
}

async function main() {
  const inputUrl = process.argv[2] || process.env.PRODUCTION_URL;
  const baseUrl = normalizeBaseUrl(inputUrl);
  const healthUrl = buildHealthUrl(baseUrl);

  let response;
  try {
    response = await fetch(healthUrl, {
      headers: {
        Accept: 'application/json',
      },
    });
  } catch (error) {
    fail(`FAIL production health request failed: ${error.message}`);
    return;
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    fail(`FAIL production health returned non-JSON response from ${healthUrl}`, `HTTP ${response.status} ${response.statusText}`);
    return;
  }

  if (!response.ok) {
    fail(`FAIL production health returned HTTP ${response.status}`, JSON.stringify(payload, null, 2));
    return;
  }

  if (payload.ready !== true) {
    fail(
      `FAIL production is not ready: status=${payload.status ?? 'unknown'}, ready=${String(payload.ready)}`,
      formatRuntime(payload.runtime)
    );
    return;
  }

  console.log(`PASS production is ready: ${healthUrl}`);
  console.log(formatRuntime(payload.runtime));
}

try {
  await main();
} catch (error) {
  fail(error.message);
}
