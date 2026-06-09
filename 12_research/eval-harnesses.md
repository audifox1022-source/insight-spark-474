# Evaluation Harness Research

## Source 1

- Source URL: https://github.com/openai/evals
- Key Summary: OpenAI Evals provides a framework and registry for evaluating LLMs and LLM systems, including custom evals.
- Applicability: Strong. Autoresearch needs explicit evaluation criteria and repeatable checks.
- Difference From This Project: OpenAI Evals is a Python package and registry; this project uses a lightweight Node script to avoid new dependencies.
- Adoption Priority: High.
- Reflected Status: Reflected in `scripts/autoresearch-eval.mjs`, baseline scoring, and explicit failure lists.

## Source 2

- Source URL: https://inspect.aisi.org.uk/
- Key Summary: Inspect defines evaluations from datasets, solvers, and scorers, with support for coding, agentic tasks, tool use, logs, and sandboxes.
- Applicability: Strong. It supports the idea that agent work needs structured samples, solvers, scorers, and logs.
- Difference From This Project: Inspect is a full Python framework; this skill uses repo-native checks and can later integrate Inspect if needed.
- Adoption Priority: High.
- Reflected Status: Reflected in the rubric and skill validation design.

## Source 3

- Source URL: https://inspect.aisi.org.uk/agents.html
- Key Summary: Inspect's agent docs describe agents as combining planning, memory, and tool use, and mention software engineering agents via external bridges.
- Applicability: Medium. It informs the planning/memory/tool-use structure without requiring the Inspect runtime.
- Difference From This Project: This skill does not run Inspect agents directly.
- Adoption Priority: Medium.
- Reflected Status: Reflected in the skill's task modes and stateful loop.

## Source 4

- Source URL: https://www.promptfoo.dev/docs/intro/
- Key Summary: Promptfoo provides declarative tests for prompts, agents, and RAG systems with CLI and CI/CD usage.
- Applicability: Strong for prompt/skill A/B comparisons and regression tests.
- Difference From This Project: Promptfoo is a broader tool with its own config format; this repo now includes a minimal built-in eval first.
- Adoption Priority: Medium.
- Reflected Status: Partially reflected through baseline-vs-candidate scoring; full promptfoo adoption is deferred.

## Source 5

- Source URL: https://github.com/promptfoo/promptfoo
- Key Summary: The promptfoo repository emphasizes prompt, agent, RAG, red-team, and CI/CD comparisons across model providers.
- Applicability: Medium. It validates future expansion toward CI-integrated prompt tests and security checks.
- Difference From This Project: This change adds local deterministic checks rather than adding a dependency.
- Adoption Priority: Medium.
- Reflected Status: Deferred as a future integration option in favor of a no-dependency harness.
