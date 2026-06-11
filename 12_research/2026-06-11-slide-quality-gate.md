# Slide Quality Gate Research

Date: 2026-06-11

## Objective

Improve the final generated presentation deck after the plan stage. The target problem is weak slide output: generic titles, empty descriptions, missing source grounding, missing speaker notes, and `[object Object]` style leaks.

## External Research

### Microsoft PowerPoint accessibility guidance

- Source: https://support.microsoft.com/en-US/accessibility/powerpoint/make-your-powerpoint-presentations-accessible-to-people-with-disabilities
- Finding: Microsoft recommends unique slide titles, readable content order, sufficient whitespace, and alt/description text for visuals. It also recommends larger fonts and avoiding crowded or illegible slides.
- Product implication: Generated slides should always have meaningful titles, readable text items, and presenter notes that describe the evidence and intent of the slide.
- Reflected status: Added a deterministic post-generation slide quality gate that repairs generic titles, thin content, and missing speaker notes.

### W3C WCAG Reflow

- Source: https://www.w3.org/WAI/WCAG22/Understanding/reflow.html
- Finding: Reflow guidance emphasizes limiting unnecessary two-dimensional scrolling and keeping non-excepted content within usable containers. Fixed-layout content can be an exception, but surrounding text should still reflow.
- Product implication: Slide content should be concise and bounded so it can render in the editor and export surfaces without forcing awkward overflow.
- Reflected status: The repair layer bounds generated title and description lengths while preserving source evidence.

### Nielsen Norman Group writing research

- Sources:
  - https://www.nngroup.com/articles/how-users-read-on-the-web/
  - https://www.nngroup.com/articles/concise-scannable-and-objective-how-to-write-for-the-web/
- Finding: Concise, scannable, objective writing improved usability, and participants relied on topic sentences and broken-up content.
- Product implication: Slides should have specific headings and concise evidence-bearing descriptions, not vague marketing copy.
- Reflected status: The quality gate scores concise, non-generic titles and sufficiently descriptive slide content.

## Code Research

Before this cycle:

- `usePresentation.normalizeGeneratedSlides` normalized array/string content, but it accepted weak slides as long as the model returned an array.
- Empty content, generic titles like `Slide 2`, and missing descriptions reached the editor.
- Speaker notes existed in the type model but were not guaranteed.

Selected improvement:

- Add `src/utils/slideQuality.ts`
  - `scoreSlideDeck`
  - `repairSlideDeck`
- Apply it after AI full generation in `usePresentation.handleGenerateFull`.
- Add deterministic A/B tests in `src/utils/slideQuality.test.ts`.

## A/B Test Design

Baseline:

- Existing normalized generated slides with generic titles and empty content descriptions.

Candidate:

- `repairSlideDeck(baselineSlides, uploadedSourceText)`

Pass criterion:

- Candidate score must be greater than baseline score.
- Candidate must include source evidence in repaired title/content.
- Candidate must add speaker notes when missing.
- Candidate must not introduce `[object Object]` in visible slide text.

Implemented test:

- `src/utils/slideQuality.test.ts`
- Test name: `A/B improves weak generated slides with source-grounded content`

## Verification

Run after implementation:

- `npm.cmd test`
- `npm.cmd run build`
- `npm.cmd run lint`
- `git diff --check`

Result:

- Tests passed with 37 total tests after this cycle.
- Build passed.
- Lint passed with 0 errors and existing warnings.
