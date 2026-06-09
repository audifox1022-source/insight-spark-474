---
name: autoresearch
description: Autonomous research, codebase analysis, writing improvement, and self-improvement harness for Codex. Use when the user asks Codex to improve text, documents, a source folder, a project, a vague project goal, an agent skill, or any workflow that should research, design, change, verify, record, commit, and iterate with evidence.
---

# Autoresearch

Use this skill to run a disciplined self-improvement loop for writing, documentation, source code, product behavior, and agent skills. The output must be evidence-backed, resumable, and safe to continue from another Codex session.

## Core Loop

1. **Resume first.** Read `working.md` before doing anything substantial, especially `Current Goal`, `In Progress`, `Next Steps`, and `Completion Audit`. If it does not exist, create it with the schema in `references/autoresearch-workflow.md`.
2. **Inspect reality.** Check the workspace path, git branch, dirty files, package scripts, tests, entrypoints, docs, and existing research artifacts. Protect user changes and never revert unrelated work.
3. **Coordinate.** For long or multi-session work, acquire a local lock with `node scripts/autoresearch-state.mjs acquire`. If a fresh lock exists, record the conflict in `working.md` and choose a non-overlapping task or stop before conflicting edits.
4. **Research.** Combine local inspection with external research when the task depends on current tools, standards, libraries, security, benchmarks, or best practices. Save research notes in `12_research/` using the required fields.
5. **Define the measurable improvement.** Convert the user request into success criteria, risks, tests, and an A/B or baseline-vs-candidate comparison where possible.
6. **Design before editing.** Prefer small, reversible changes. Document the chosen plan and rejected alternatives in `working.md`.
7. **Implement.** Change only the files needed for the goal. Keep edits compatible with existing project conventions.
8. **Verify.** Run the smallest meaningful checks plus any project-required tests. For skill changes, run `node scripts/autoresearch-eval.mjs --candidate SKILL.md --working working.md --research 12_research --json`.
9. **Record.** Update `working.md` with what changed, commands run, results, blockers, commit/push status, and resume instructions.
10. **Commit only with evidence.** Commit only the verified files for this task. Do not include unrelated dirty files. Push only when credentials and repository policy allow it.
11. **Repeat.** If the objective is not fully handled, start the next loop from the updated `working.md`.

## Task Modes

### Text or document input

Improve structure, logic, factual support, clarity, tone, and completeness. Preserve the author's intent unless the user asks for a different voice. Use external research for unstable facts, citations, legal/medical/financial claims, current tools, or claims that need precise sourcing. Verify the final artifact against the original prompt and record the delta.

### Source folder input

Map the architecture first: entrypoints, data flow, dependencies, test strategy, build/deploy config, security boundaries, and known failure modes. Prioritize changes that are testable and valuable: correctness, security, performance, UX, maintainability, docs, and missing tests. Compare against relevant mature projects when useful.

### Vague project goal

Infer the highest-value improvement from the repo context, but make the assumption explicit in `working.md`. Choose work that is small enough to verify. Avoid speculative rewrites.

### Skill or agent harness input

Keep `SKILL.md` concise and procedural. Move detailed rubrics, examples, and research into `references/`. Put deterministic repeated checks in `scripts/`. Ensure the skill has frontmatter with `name` and `description`, and that the description contains trigger contexts because Codex sees it before loading the skill body.

## Required Artifacts

- `working.md`: durable session state and handoff log.
- `12_research/`: external research notes. Each source entry must include source URL, key summary, applicability, difference from this project, adoption priority, and reflected status.
- `scripts/autoresearch-state.mjs`: local state, lock, and atomic-write helper.
- `scripts/autoresearch-eval.mjs`: deterministic skill/harness scoring and baseline comparison.
- `references/autoresearch-workflow.md`: detailed workflow, state schema, locking, and recovery protocol.
- `references/evaluation-rubric.md`: quality criteria for text, source code, research, and skill changes.

## Research Rules

- Prefer primary sources: official docs, papers, benchmark repositories, and project repositories.
- Treat blog posts, forum threads, and social posts as weak evidence unless they report concrete implementation details or failure cases.
- Mark uncertainty explicitly. Do not convert weak research into strong claims.
- Save research before relying on it for design decisions.
- Record whether each finding was actually reflected in the implementation.

## Verification Rules

- A passing test is evidence only for the behavior it covers. Map every explicit requirement to concrete evidence before declaring completion.
- Use baseline-vs-candidate comparison for prompt, skill, document, and harness changes when possible.
- Include regression checks for old failures, not only happy-path samples.
- Record failed checks and recovery steps. If a check cannot run, explain why and choose the best available substitute.
- For web apps, verify build output and, when UI behavior changed, browser rendering and console errors.

## Concurrency and Safety

- Use `.autoresearch/lock.json` only for local coordination. It is runtime state and should not be committed.
- Treat `working.md` as the canonical handoff. Append entries atomically when possible.
- Before editing, snapshot `git status --short`. Before committing, verify the staged set contains only task files.
- If another session changed a file you need, inspect the diff and work with it. Do not overwrite unknown edits.
- Make side effects idempotent. If a command or script can run twice, it must not corrupt state or duplicate critical records.
- Never expose secrets from `.env`, logs, API keys, auth tokens, or private data in research notes or commits.

## Completion Audit

Before finalizing, create a prompt-to-artifact checklist:

- Map every explicit requirement to files, commands, tests, research notes, or git evidence.
- Confirm the validation actually covers the requirement, not just a proxy.
- List missing or weakly verified items and continue work if any required item is unresolved.
- Update `working.md` with the audit result and next resume point.

## Resource Loading

- Read `references/autoresearch-workflow.md` when starting or resuming a task.
- Read `references/evaluation-rubric.md` when defining success criteria or reviewing output quality.
- Run `scripts/autoresearch-state.mjs --help` for state and locking commands.
- Run `scripts/autoresearch-eval.mjs --help` for skill validation and A/B comparison.
