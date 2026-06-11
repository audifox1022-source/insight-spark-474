# Presentation Quality Upgrade Research

Date: 2026-06-11

## Objective

Increase the product quality of the presentation generator, especially the native flow:

1. Uploaded files become source-grounded AI plans.
2. AI plan items render readable titles and details.
3. Improvements are accepted only when A/B-style deterministic tests show measurable improvement.

## External Research

### Google Gemini document understanding

- Source: https://ai.google.dev/gemini-api/docs/document-processing
- Finding: Gemini can process PDFs with native vision and use text, images, diagrams, charts, and tables, and can extract information into structured output formats.
- Product implication: The presentation app should preserve uploaded source evidence through planning and generation, instead of reducing files to vague notes.
- Reflected status: Already strengthened in prior upload-context fixes; current cycle builds on this by repairing weak plan items using source signals.

### Google Gemini structured outputs

- Source: https://ai.google.dev/gemini-api/docs/structured-output
- Finding: Gemini supports JSON Schema style structured responses for predictable, type-safe extraction and agentic workflow handoffs.
- Product implication: The plan stage must not assume one ad hoc response shape. It needs a stable internal schema even when model output uses `tasks`, `outline`, `steps`, `deliverables`, or nested objects.
- Reflected status: Added `src/utils/planTasks.ts` to normalize AI plan variants into `id/title/description/status/impact`.

### Google Gemini prompt design strategies

- Source: https://ai.google.dev/gemini-api/docs/prompting-strategies
- Finding: Prompt design is iterative and should use clear, specific instructions, then refine from observed model behavior.
- Product implication: Plan quality should be measured and repaired from real failure modes, not only by changing prompt text.
- Reflected status: Added deterministic quality scoring and repair tests, including a legacy-vs-candidate A/B test.

## Code Research

### Current behavior before this cycle

- `usePresentation.handleGenerateOutline` extracted a plan array from multiple possible AI response keys.
- `SlideEditor.PlanTaskItem` displayed plan items with shallow fallback keys.
- Failure mode: nested `deliverables`, `key_points`, object arrays, or numeric `step` labels could render as blank, weak content, numeric-only titles, or `[object Object]`.

### Product-quality improvement selected

Add a plan-quality normalization and repair layer:

- Normalize many AI response variants into a stable plan task shape.
- Convert nested arrays and objects into readable multiline text.
- Score plan quality using title quality, description depth, object-leak detection, and source-signal overlap.
- Repair low-quality plans by appending source evidence from uploaded context.
- If the model returns no usable tasks, build source-grounded fallback tasks.

## A/B Test Design

Baseline:

- Legacy shallow mapping:
  - title: `task.title || task.phaseName || task.step || ...`
  - description: `task.description || task.detail || task.deliverables || ...`

Candidate:

- `repairPlanTasks(rawPlan, sourceText, requestedCount)`

Pass criterion:

- Candidate score must be greater than baseline score for nested/object plan output.
- Candidate must not leak `[object Object]`.
- Candidate must include source evidence from uploaded context.

Implemented test:

- `src/utils/planTasks.test.ts`
- Test name: `A/B improves weak AI plan display against legacy shallow mapping`

## Adopted Changes

- `src/utils/planTasks.ts`
  - `normalizePlanTask`
  - `normalizePlanTasks`
  - `planValueToText`
  - `scorePlanTasks`
  - `repairPlanTasks`
- `src/hooks/usePresentation.ts`
  - uses `repairPlanTasks` before storing `executionPlan.tasks`
- `src/components/designer/SlideEditor.tsx`
  - uses normalized display task data when rendering plan items
- `src/store/useSlideStore.ts`
  - updates id-less plan tasks by stable fallback id

## Verification

Run after implementation:

- `npm.cmd test`
- `npm.cmd run build`
- `npm.cmd run lint`
- `git diff --check`

Acceptance note:

- Source-grounded plan repair is a low-risk product-quality feature because it only affects malformed or weak plan data and leaves high-quality model plans unchanged.
