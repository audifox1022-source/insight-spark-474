#!/usr/bin/env node
import { existsSync } from "node:fs";
import {
  mkdir,
  open,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import process from "node:process";

const root = process.cwd();
const runtimeDir = resolve(root, ".autoresearch");
const lockPath = resolve(runtimeDir, "lock.json");
const statePath = resolve(runtimeDir, "state.json");
const workingPath = resolve(root, "working.md");
const researchDir = resolve(root, "12_research");
const defaultTtlMs = 6 * 60 * 60 * 1000;

function usage() {
  console.log(`Autoresearch state helper

Usage:
  node scripts/autoresearch-state.mjs init [--goal "text"]
  node scripts/autoresearch-state.mjs acquire [--owner "name"] [--ttl-ms 21600000]
  node scripts/autoresearch-state.mjs release --token <token>
  node scripts/autoresearch-state.mjs append --section "Completed Work" --message "text"
  node scripts/autoresearch-state.mjs status [--json]

Commands:
  init      Ensure working.md, 12_research, and runtime state exist.
  acquire   Create .autoresearch/lock.json unless a fresh lock exists.
  release   Remove the lock when the token matches.
  append    Atomically append a timestamped line to working.md.
  status    Print git and autoresearch runtime status.
`);
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const value = argv[i];
    if (!value.startsWith("--")) {
      args._.push(value);
      continue;
    }

    const key = value.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
    } else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

async function ensureDir(path) {
  await mkdir(path, { recursive: true });
}

async function writeAtomic(targetPath, content) {
  await ensureDir(dirname(targetPath));
  const tmpPath = `${targetPath}.tmp-${process.pid}-${Date.now()}-${randomUUID()}`;
  const handle = await open(tmpPath, "w");
  try {
    await handle.writeFile(content, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
  await rename(tmpPath, targetPath);
}

async function readJson(path, fallback = null) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return fallback;
  }
}

async function fileExists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

function getGitStatus() {
  try {
    return execFileSync("git", ["status", "--short"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

function getGitBranch() {
  try {
    return execFileSync("git", ["branch", "--show-current"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

function workingTemplate(goal) {
  const now = new Date().toISOString();
  return `# Autoresearch Working Log

## Current Goal
${goal || "Not yet specified."}

## Completed Work
- ${now}: Created the resumable autoresearch working log.

## In Progress
- Establishing baseline project state and skill harness.

## Next Steps
- Save external research in 12_research/.
- Implement or refine the highest-priority verified improvement.
- Run harness and project validation.

## Findings and Problems
- Existing findings will be appended here.

## Research Sources
- See 12_research/.

## Experiment Results
- No experiments recorded yet.

## Commit and Push History
- No autoresearch commits recorded yet.

## Blockers
- None recorded.

## Resume Procedure
1. Read this file.
2. Run \`git status --short\`.
3. Review the latest entries in Completed Work, In Progress, and Next Steps.
4. Acquire a lock with \`node scripts/autoresearch-state.mjs acquire\` before editing overlapping files.

## Completion Audit
- Pending.
`;
}

async function init(args) {
  await ensureDir(runtimeDir);
  await ensureDir(researchDir);

  if (!(await fileExists(workingPath))) {
    await writeAtomic(workingPath, workingTemplate(args.goal || ""));
  }

  const state = {
    schemaVersion: 1,
    initializedAt: new Date().toISOString(),
    root,
    branch: getGitBranch(),
    workingPath,
    researchDir,
  };
  await writeAtomic(statePath, `${JSON.stringify(state, null, 2)}\n`);
  console.log(`Initialized autoresearch state at ${runtimeDir}`);
}

async function acquire(args) {
  await ensureDir(runtimeDir);
  const ttlMs = Number(args["ttl-ms"] || defaultTtlMs);
  const owner = String(args.owner || process.env.USERNAME || process.env.USER || "codex");
  const now = Date.now();
  const token = randomUUID();
  const lock = {
    owner,
    token,
    pid: process.pid,
    acquiredAt: new Date(now).toISOString(),
    expiresAt: new Date(now + ttlMs).toISOString(),
    root,
    branch: getGitBranch(),
  };

  try {
    const handle = await open(lockPath, "wx");
    try {
      await handle.writeFile(`${JSON.stringify(lock, null, 2)}\n`, "utf8");
      await handle.sync();
    } finally {
      await handle.close();
    }
    console.log(JSON.stringify({ acquired: true, lock }, null, 2));
    return;
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
  }

  const existing = await readJson(lockPath, {});
  const expiresAt = Date.parse(existing.expiresAt || "");
  if (Number.isFinite(expiresAt) && expiresAt < now) {
    const stalePath = `${lockPath}.stale-${now}`;
    await rename(lockPath, stalePath);
    return acquire(args);
  }

  console.error(JSON.stringify({ acquired: false, existing }, null, 2));
  process.exitCode = 2;
}

async function release(args) {
  if (!args.token) {
    throw new Error("release requires --token <token>");
  }
  const existing = await readJson(lockPath, null);
  if (!existing) {
    console.log("No lock to release.");
    return;
  }
  if (existing.token !== args.token) {
    console.error("Lock token mismatch; not releasing.");
    process.exitCode = 3;
    return;
  }
  await rm(lockPath, { force: true });
  console.log("Released autoresearch lock.");
}

async function append(args) {
  const section = String(args.section || "Completed Work");
  const message = String(args.message || "").trim();
  if (!message) {
    throw new Error("append requires --message");
  }
  if (!(await fileExists(workingPath))) {
    await writeAtomic(workingPath, workingTemplate(""));
  }
  const current = await readFile(workingPath, "utf8");
  const stamp = new Date().toISOString();
  const entry = `- ${stamp}: ${message}`;
  const heading = `## ${section}`;
  let next;

  if (current.includes(heading)) {
    const index = current.indexOf(heading) + heading.length;
    next = `${current.slice(0, index)}\n${entry}${current.slice(index)}`;
  } else {
    next = `${current.trimEnd()}\n\n${heading}\n${entry}\n`;
  }

  await writeAtomic(workingPath, next);
  console.log(`Appended to ${section}.`);
}

async function status(args) {
  const payload = {
    root,
    branch: getGitBranch(),
    hasWorkingLog: existsSync(workingPath),
    hasResearchDir: existsSync(researchDir),
    lock: await readJson(lockPath, null),
    gitStatus: getGitStatus(),
  };

  if (args.json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log(`Root: ${payload.root}`);
    console.log(`Branch: ${payload.branch || "(unknown)"}`);
    console.log(`working.md: ${payload.hasWorkingLog ? "present" : "missing"}`);
    console.log(`12_research/: ${payload.hasResearchDir ? "present" : "missing"}`);
    console.log(`Lock: ${payload.lock ? "present" : "none"}`);
    console.log("Git status:");
    console.log(payload.gitStatus || "(clean)");
  }
}

const args = parseArgs(process.argv.slice(2));
const command = args._[0];

try {
  if (!command || command === "--help" || command === "help") usage();
  else if (command === "init") await init(args);
  else if (command === "acquire") await acquire(args);
  else if (command === "release") await release(args);
  else if (command === "append") await append(args);
  else if (command === "status") await status(args);
  else {
    usage();
    process.exitCode = 1;
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
