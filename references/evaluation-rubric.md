# Autoresearch Evaluation Rubric

Use this rubric to define success criteria and judge whether a loop should commit.

## Universal Criteria

- Requirement coverage: every explicit user requirement maps to evidence.
- Traceability: research, decisions, commands, and results are recorded.
- Reproducibility: another session can resume from `working.md`.
- Safety: unrelated user changes and secrets are protected.
- Verification: checks are relevant to the changed behavior.

## Text and Document Criteria

- Preserves the user's intent and target audience.
- Improves structure, transitions, and argument flow.
- Makes unsupported claims explicit or adds sourced support.
- Removes ambiguity without flattening the author's voice.
- Provides a before/after or rationale when the improvement is substantial.

## Source Code Criteria

- Fits existing architecture and style.
- Limits scope to the requested behavior.
- Adds or updates tests proportional to risk.
- Handles errors and edge cases that the current code can realistically hit.
- Avoids security regressions, secret exposure, and unnecessary dependencies.

## Research Criteria

- Uses primary sources whenever possible.
- Separates facts from inference.
- Records applicability and project-specific tradeoffs.
- Notes whether each finding was reflected now, deferred, or rejected.

## Skill and Harness Criteria

- Valid skill frontmatter with clear trigger description.
- Concise procedural body with progressive disclosure to references.
- Deterministic scripts for repeated state/eval tasks.
- Concurrency strategy: lock, stale-lock recovery, atomic writes, and conflict detection.
- Evidence strategy: baseline comparison, explicit metrics, regression logs, and completion audit.
