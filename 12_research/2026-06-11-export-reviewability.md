# Export Reviewability Research

Date: 2026-06-11

## Objective

Make the quality-gate output survive the final export step. The previous cycle added `speakerNotes` and `sourceEvidence` to repaired slides, but PPTX and PDF exports did not include that metadata, so reviewers could lose the source trail after downloading a deck.

## External Research

### PowerPoint speaker notes

- Source: https://support.microsoft.com/en-us/office/add-speaker-notes-to-your-slides-26985155-35f5-45ba-812b-e1bd3c48928e
- Finding: Microsoft positions speaker notes as the place to store talking points that the presenter can see while the audience sees only the slides.
- Product implication: AI-generated talk tracks and evidence should be exported as speaker notes in PPTX, not only stored in app state.
- Reflected status: PPTX export now writes per-slide notes using the same formatter as PDF appendix pages.

### PptxGenJS speaker notes API

- Source: https://gitbrent.github.io/PptxGenJS/docs/speaker-notes.html
- Finding: PptxGenJS supports native slide speaker notes through `slide.addNotes(...)`.
- Product implication: The PPTX exporter can preserve notes in the deck file without adding visible slide clutter.
- Reflected status: `src/lib/pptx-export-service.ts` now calls `addNotes` for slides with notes or evidence.

### PowerPoint accessibility and review quality

- Source: https://support.microsoft.com/en-US/accessibility/powerpoint/make-your-powerpoint-presentations-accessible-to-people-with-disabilities
- Finding: Microsoft recommends readable content order and meaningful supporting text for slide content and visuals.
- Product implication: PDF export should not force reviewers to infer the source basis from visuals only. It needs a readable text appendix for notes and evidence.
- Reflected status: `src/lib/export-presentation.tsx` now appends readable note/evidence pages after the visual slides.

## Code Research

Before this cycle:

- `repairSlideDeck` created `speakerNotes` and `sourceEvidence`.
- `pptx-export-service.ts` drew slide visuals but never wrote speaker notes.
- `export-presentation.tsx` drew PDF slide pages only, so evidence metadata was not visible in exported PDFs.

Selected improvement:

- Add `src/utils/exportNotes.ts` as the shared export-note formatter.
- Add native PPTX speaker notes through PptxGenJS.
- Add PDF appendix pages titled `Speaker Notes and Source Evidence`.
- Normalize structured evidence objects and arrays so exported notes never show `[object Object]`.

## A/B Test Design

Baseline:

- Export path that ignores slide `speakerNotes` and `sourceEvidence`.

Candidate:

- `buildPresentationExportNotes(presentation)` creates per-slide export notes containing title, speaker notes, and source evidence.

Pass criterion:

- Candidate must include the talk track and source evidence.
- Candidate must normalize structured evidence into readable text.
- Candidate must not leak `[object Object]`.

Implemented test:

- `src/utils/exportNotes.test.ts`
- Test name: `A/B preserves speaker notes and source evidence for exported artifacts`

## Verification

Run after implementation:

- `npm.cmd test -- src/utils/exportNotes.test.ts`
- `npm.cmd test`
- `npm.cmd run build`
- `npm.cmd run lint`
- `git diff --check`

Expected result:

- Export note formatter tests pass.
- Full suite passes.
- Build and lint remain clean except for existing repository warnings.
