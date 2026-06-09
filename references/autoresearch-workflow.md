# Autoresearch Workflow Reference

Use this reference when starting, resuming, or auditing an autoresearch run.

## Working Log Schema

`working.md` must contain these sections:

- Current Goal
- Completed Work
- In Progress
- Next Steps
- Findings and Problems
- Research Sources
- Experiment Results
- Commit and Push History
- Blockers
- Resume Procedure
- Completion Audit

Each session entry should include the date/time, branch, relevant dirty files, commands run, result, and the next safe action.

## Locking Protocol

Use the helper script for local coordination:

```sh
node scripts/autoresearch-state.mjs acquire
node scripts/autoresearch-state.mjs release --token <token>
```

The lock file is `.autoresearch/lock.json`. It contains an owner, token, process ID, timestamp, and time-to-live. A lock prevents accidental simultaneous edits; it is not a distributed consensus system. If a lock is stale, the script can replace it after the TTL. If a lock is fresh, do not edit the same files until the owner releases it or the work is coordinated.

## Atomic Writes

Use write-temp-then-rename for generated state and logs. The helper writes a temporary file in the same directory, flushes it, then renames it over the target. This keeps `working.md` and `.autoresearch/state.json` recoverable after interruption.

## Baseline Comparison

For skill and prompt changes, compare a baseline against the candidate:

```sh
node scripts/autoresearch-eval.mjs --baseline-git HEAD:SKILL.md --candidate SKILL.md --working working.md --research 12_research --json
```

The score is not a substitute for human judgment. It checks whether the artifact contains the required harness behaviors: metadata, resume state, external research, A/B evaluation, locking, atomic writes, git safety, verification, and completion audit.

## External Research Note Format

Every source entry in `12_research/` must use these labels:

- Source URL:
- Key Summary:
- Applicability:
- Difference From This Project:
- Adoption Priority:
- Reflected Status:

Group sources by theme rather than creating one file per URL.

## Resume Procedure

1. Read `working.md` and the latest entry.
2. Run `git status --short`.
3. Inspect any file listed under "In Progress" or "Next Steps".
4. Acquire a lock if edits will continue.
5. Continue from the first unchecked requirement in the completion audit.

## Failure and Blocker Handling

When a command cannot run because of permissions, missing secrets, missing network, unavailable services, test flakiness, or conflicting edits:

- Record the exact command and error summary.
- Record whether the failure blocks completion.
- Try a lower-risk substitute check.
- Leave a concrete resume command or manual action.

Do not claim the improvement is verified unless the substitute check actually covers the requirement.
