#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import process from "node:process";

function usage() {
  console.log(`Autoresearch eval helper

Usage:
  node scripts/autoresearch-eval.mjs --candidate SKILL.md [--working working.md] [--research 12_research] [--json]
  node scripts/autoresearch-eval.mjs --baseline-git HEAD:SKILL.md --candidate SKILL.md --working working.md --research 12_research --json
  node scripts/autoresearch-eval.mjs --baseline old.md --candidate SKILL.md

Checks skill metadata, required workflow coverage, research-note structure, working log schema, and baseline-vs-candidate score delta.
`);
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const value = argv[i];
    if (!value.startsWith("--")) continue;
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

function readSpec(spec) {
  if (!spec) return "";
  return readFileSync(resolve(process.cwd(), spec), "utf8");
}

function readGitSpec(spec) {
  return execFileSync("git", ["show", spec], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function hasAll(text, terms) {
  const lower = text.toLowerCase();
  return terms.every((term) => lower.includes(term.toLowerCase()));
}

function countMatches(text, terms) {
  const lower = text.toLowerCase();
  return terms.filter((term) => lower.includes(term.toLowerCase())).length;
}

function frontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const metadata = {};
  for (const line of match[1].split(/\r?\n/)) {
    const parts = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
    if (parts) metadata[parts[1]] = parts[2].replace(/^["']|["']$/g, "");
  }
  return metadata;
}

function scoreSkill(text) {
  const meta = frontmatter(text);
  const checks = [
    {
      id: "frontmatter",
      weight: 12,
      pass: Boolean(meta?.name && meta?.description && /^[a-z0-9-]+$/.test(meta.name)),
    },
    {
      id: "trigger_description",
      weight: 8,
      pass: Boolean(meta?.description && countMatches(meta.description, ["source", "project", "document", "research", "verify", "iterate"]) >= 4),
    },
    {
      id: "resume_state",
      weight: 10,
      pass: hasAll(text, ["working.md", "resume", "Next Steps"]),
    },
    {
      id: "external_research",
      weight: 10,
      pass: hasAll(text, ["12_research", "Source URL", "Applicability"]),
    },
    {
      id: "loop",
      weight: 10,
      pass: hasAll(text, ["research", "design", "implement", "verify", "record", "commit", "repeat"]),
    },
    {
      id: "concurrency",
      weight: 10,
      pass: hasAll(text, ["lock", "atomic", "conflict"]),
    },
    {
      id: "ab_eval",
      weight: 10,
      pass: hasAll(text, ["A/B", "baseline", "candidate"]),
    },
    {
      id: "git_safety",
      weight: 8,
      pass: hasAll(text, ["git status", "unrelated", "commit"]),
    },
    {
      id: "task_modes",
      weight: 8,
      pass: hasAll(text, ["Text or document", "Source folder", "Vague project goal"]),
    },
    {
      id: "completion_audit",
      weight: 8,
      pass: hasAll(text, ["Completion Audit", "checklist", "evidence"]),
    },
    {
      id: "resource_disclosure",
      weight: 6,
      pass: hasAll(text, ["references/", "scripts/"]),
    },
  ];
  const score = checks.reduce((sum, check) => sum + (check.pass ? check.weight : 0), 0);
  return { score, checks };
}

function validateWorkingLog(path) {
  if (!path) return { present: false, missingSections: [] };
  const abs = resolve(process.cwd(), path);
  if (!existsSync(abs)) return { present: false, missingSections: [] };
  const text = readFileSync(abs, "utf8");
  const sections = [
    "Current Goal",
    "Completed Work",
    "In Progress",
    "Next Steps",
    "Findings and Problems",
    "Research Sources",
    "Experiment Results",
    "Commit and Push History",
    "Blockers",
    "Resume Procedure",
    "Completion Audit",
  ];
  return {
    present: true,
    missingSections: sections.filter((section) => !text.includes(`## ${section}`)),
  };
}

function researchFiles(dir) {
  const abs = resolve(process.cwd(), dir || "12_research");
  if (!existsSync(abs) || !statSync(abs).isDirectory()) return [];
  return readdirSync(abs)
    .filter((name) => name.endsWith(".md"))
    .map((name) => resolve(abs, name));
}

function validateResearch(dir) {
  const files = researchFiles(dir);
  const required = [
    "Source URL:",
    "Key Summary:",
    "Applicability:",
    "Difference From This Project:",
    "Adoption Priority:",
    "Reflected Status:",
  ];
  const results = files.map((file) => {
    const text = readFileSync(file, "utf8");
    return {
      file,
      sourceCount: (text.match(/Source URL:/g) || []).length,
      missingLabels: required.filter((label) => !text.includes(label)),
    };
  });
  return {
    fileCount: files.length,
    sourceCount: results.reduce((sum, result) => sum + result.sourceCount, 0),
    files: results,
  };
}

function validateScripts(candidateText) {
  const scripts = [
    "scripts/autoresearch-state.mjs",
    "scripts/autoresearch-eval.mjs",
  ];
  return scripts.map((script) => ({
    script,
    present: existsSync(resolve(process.cwd(), script)),
    referenced: candidateText.includes(script),
  }));
}

const args = parseArgs(process.argv.slice(2));
if (args.help || Object.keys(args).length === 0) {
  usage();
  process.exit(0);
}

const candidateText = readSpec(args.candidate || "SKILL.md");
const candidate = scoreSkill(candidateText);
let baseline = null;

if (args.baseline) {
  baseline = scoreSkill(readSpec(args.baseline));
}
if (args["baseline-git"]) {
  baseline = scoreSkill(readGitSpec(String(args["baseline-git"])));
}

const working = validateWorkingLog(args.working || "working.md");
const research = validateResearch(args.research || "12_research");
const scripts = validateScripts(candidateText);

const failures = [];
for (const check of candidate.checks) {
  if (!check.pass) failures.push(`candidate:${check.id}`);
}
if (!working.present) failures.push("working:missing");
for (const section of working.missingSections) failures.push(`working:missing:${section}`);
if (research.fileCount < 3) failures.push("research:too_few_files");
if (research.sourceCount < 8) failures.push("research:too_few_sources");
for (const file of research.files) {
  for (const label of file.missingLabels) failures.push(`research:${file.file}:missing:${label}`);
}
for (const script of scripts) {
  if (!script.present) failures.push(`script:missing:${script.script}`);
  if (!script.referenced) failures.push(`script:not_referenced:${script.script}`);
}
if (baseline && candidate.score <= baseline.score) failures.push("ab:no_score_improvement");

const result = {
  candidateScore: candidate.score,
  baselineScore: baseline?.score ?? null,
  improved: baseline ? candidate.score > baseline.score : null,
  working,
  research,
  scripts,
  failures,
  passed: failures.length === 0,
};

if (args.json) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`Candidate score: ${result.candidateScore}`);
  if (baseline) console.log(`Baseline score: ${result.baselineScore}`);
  console.log(`Working log: ${working.present ? "present" : "missing"}`);
  console.log(`Research: ${research.fileCount} files, ${research.sourceCount} sources`);
  console.log(`Passed: ${result.passed}`);
  if (failures.length) console.log(`Failures:\n- ${failures.join("\n- ")}`);
}

process.exitCode = result.passed ? 0 : 1;
