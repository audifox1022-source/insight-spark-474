# Agentic Software Engineering Research

## Source 1

- Source URL: https://arxiv.org/abs/2405.15793
- Key Summary: SWE-agent reports that a purpose-built agent-computer interface improves repository navigation, editing, and test execution for software engineering tasks.
- Applicability: Strong. Autoresearch needs explicit command, edit, test, and repository navigation protocols rather than vague autonomy.
- Difference From This Project: SWE-agent is an executable agent framework; this project is a Codex skill and lightweight harness.
- Adoption Priority: High.
- Reflected Status: Reflected in the skill's inspect/edit/verify loop, git-safety rules, and deterministic helper scripts.

## Source 2

- Source URL: https://github.com/SWE-agent/SWE-agent
- Key Summary: The project takes GitHub issues and attempts to fix them with an LM; the repository describes it as usable for software engineering, cybersecurity, and coding challenges.
- Applicability: Strong for GitHub-issue style task framing and isolated execution.
- Difference From This Project: SWE-agent owns the full runtime; this skill must operate inside Codex and the user's workspace.
- Adoption Priority: High.
- Reflected Status: Reflected in issue-like success criteria, evidence mapping, and commit gating.

## Source 3

- Source URL: https://arxiv.org/abs/2310.06770
- Key Summary: SWE-bench frames real GitHub issue resolution as a benchmark where a model edits a codebase to address an issue.
- Applicability: Strong for baseline-vs-candidate and task realism.
- Difference From This Project: SWE-bench is a benchmark dataset/harness, not a daily project improvement workflow.
- Adoption Priority: High.
- Reflected Status: Reflected in the requirement to define measurable improvements and regression checks before committing.

## Source 4

- Source URL: https://github.com/SWE-bench/SWE-bench
- Key Summary: The repository provides the SWE-bench benchmark and harness for real-world GitHub issue resolution.
- Applicability: Medium to strong. It validates that repository-level agent work should be judged against executable evidence.
- Difference From This Project: This repo is JavaScript/TypeScript and a skill artifact, so the local harness is simpler and project-specific.
- Adoption Priority: Medium.
- Reflected Status: Reflected in `scripts/autoresearch-eval.mjs` and completion-audit evidence mapping.

## Source 5

- Source URL: https://github.com/aider-ai/aider
- Key Summary: Aider is an AI pair-programming terminal tool for editing existing codebases and has a large user base.
- Applicability: Medium. Its workflow reinforces git-aware, small-edit, user-controllable coding assistance.
- Difference From This Project: Aider is an interactive coding tool; this skill is procedural guidance plus validation scripts.
- Adoption Priority: Medium.
- Reflected Status: Reflected in the skill's emphasis on scoped edits and committing only verified files.
