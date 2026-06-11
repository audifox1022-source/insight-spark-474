# Element Export Fidelity Research

Date: 2026-06-11

## Objective

Preserve manually added slide elements across the editor, PPTX export, and PDF export. The app had legacy toolbar element data using `left`, `top`, `text`, and `fill`, while active render/export paths expected `x`, `y`, `content`, and `backgroundColor`. That mismatch could make user-added elements disappear.

## External Research

### PptxGenJS text and shapes

- Sources:
  - https://gitbrent.github.io/PptxGenJS/docs/api-text.html
  - https://gitbrent.github.io/PptxGenJS/docs/api-shapes.html
- Finding: PptxGenJS positions text and shapes with `x`, `y`, `w`, and `h` values in slide units, and supports text styling plus rectangle, ellipse, and line drawing.
- Product implication: The exporter needs a single coordinate conversion layer from canvas pixels to PPTX inches.
- Reflected status: Added `slideElementToPptxFrame` and draw logic for normalized text, shapes, lines, and data-URL images.

### PDF-lib page drawing

- Source: https://pdf-lib.js.org/docs/api/classes/pdfpage
- Finding: PDF-lib draws text, rectangles, ellipses, lines, and images on a page using explicit page coordinates.
- Product implication: The PDF exporter needs top-left canvas coordinates converted to PDF bottom-left page coordinates.
- Reflected status: Added `slideElementToPdfFrame` and PDF draw logic for normalized slide elements.

### PowerPoint accessibility and review quality

- Source: https://support.microsoft.com/en-US/accessibility/powerpoint/make-your-powerpoint-presentations-accessible-to-people-with-disabilities
- Finding: Microsoft recommends preserving readable content order and meaningful slide content.
- Product implication: User-added content should not exist only in the editor state. It must survive export so reviewers and presenters see the same deck.
- Reflected status: The active slide renderer now overlays normalized elements, and exports draw those same normalized elements.

## Code Research

Before this cycle:

- `EditorSidebar` created legacy objects such as `{ left, top, text, fill }`.
- `SlideElement` renderers and exporters expected `{ x, y, content, backgroundColor }`.
- `SlideLayoutRenderer` did not render `slide.elements`.
- PPTX/PDF exports only drew generated layout/content fields and ignored `slide.elements`.

Selected improvement:

- Add `src/utils/slideElements.ts`
  - `normalizeSlideElement`
  - `normalizeSlideElements`
  - `slideElementToPptxFrame`
  - `slideElementToPdfFrame`
- Normalize new store elements before saving.
- Overlay normalized elements in `SlideLayoutRenderer`.
- Draw normalized text, shapes, lines, and data-URL images in PPTX/PDF export paths.

## A/B Test Design

Baseline:

- Legacy toolbar text element has visible text in `text`, but render/export code reads `content`, so visible/exportable text is empty.

Candidate:

- `normalizeSlideElement(legacyElement)` maps `left -> x`, `top -> y`, `text -> content`, and `fill -> color/background`.

Pass criterion:

- Candidate must recover visible text and coordinates.
- Candidate must normalize legacy rectangle/circle shapes.
- Candidate must convert coordinates deterministically for PPTX and PDF exports.

Implemented test:

- `src/utils/slideElements.test.ts`
- Test name: `A/B recovers legacy toolbar text fields for rendering and export`

## Verification

Run after implementation:

- `npm.cmd test -- src/utils/slideElements.test.ts`
- `npm.cmd test`
- `npm.cmd run build`
- `npm.cmd run lint`
- `node_modules\.bin\tsc.cmd --project tsconfig.app.json --noEmit`
- `git diff --check`

Result:

- Focused element tests passed.
- Full suite passed with 42 total tests.
- Build passed.
- Lint passed with 0 errors and the existing 11 warnings.
- `tsc --noEmit` no longer reports issues from this cycle after the line-element compatibility patch. It still reports pre-existing type errors in `PresentationTab.tsx`, `supabase/client.ts`, and `fileParser.ts`.
