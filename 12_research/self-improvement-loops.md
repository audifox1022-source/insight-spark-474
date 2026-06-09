# Self-Improvement Loop Research

## Source 1

- Source URL: https://arxiv.org/abs/2303.11366
- Key Summary: Reflexion uses verbal feedback and memory from prior trials to improve later agent behavior without model fine-tuning.
- Applicability: Strong. Autoresearch should retain failure notes, reflections, and successful strategies in `working.md`.
- Difference From This Project: Reflexion is a research method; this skill implements a practical log-and-resume protocol.
- Adoption Priority: High.
- Reflected Status: Reflected in the working log, failure handling, and repeat loop.

## Source 2

- Source URL: https://arxiv.org/abs/2303.17651
- Key Summary: Self-Refine iteratively improves outputs with self-feedback and refinement.
- Applicability: Strong for text, docs, prompts, and skill body improvements.
- Difference From This Project: Self-Refine focuses on output refinement; autoresearch also covers source code, tests, git, and external research.
- Adoption Priority: High.
- Reflected Status: Reflected in the research/design/verify/repeat structure and document-improvement mode.

## Source 3

- Source URL: https://dspy.ai/getting-started/gepa-optimization/
- Key Summary: DSPy's GEPA optimization uses reflection to improve instructions against a metric.
- Applicability: Medium to strong. It reinforces metric-driven prompt/skill iteration.
- Difference From This Project: DSPy provides a Python optimization framework; this repo uses a transparent local heuristic score for the skill.
- Adoption Priority: Medium.
- Reflected Status: Reflected in `scripts/autoresearch-eval.mjs`; deeper optimizer integration is deferred.

## Source 4

- Source URL: https://dspy.ai/
- Key Summary: DSPy promotes programming language-model pipelines with signatures, modules, metrics, and optimizers rather than untracked prompt edits.
- Applicability: Medium. Autoresearch benefits from treating prompts and skill instructions as measurable programs.
- Difference From This Project: This repo does not currently depend on DSPy or Python eval infrastructure.
- Adoption Priority: Low to medium.
- Reflected Status: Reflected conceptually in the evaluation rubric; not added as a dependency.
