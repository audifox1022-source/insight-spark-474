# Hook Dependency Hardening Research

Date: 2026-06-11

## Objective

Reduce React hook dependency drift after the typecheck gate was made green. Lint still reported hook warnings in slide editing and PDF editing code, which can hide stale closures or missed cleanup paths during interactive work.

## External Research

### React exhaustive-deps lint

- Source: https://react.dev/reference/eslint-plugin-react-hooks/lints/exhaustive-deps
- Finding: The rule validates that hook dependency arrays contain the values referenced inside hooks. Missing dependencies can cause stale closures.
- Product implication: Editor and PDF render effects should either include the values they use or move mutable async work into refs/cleanup.
- Reflected status: Hook warnings were removed from `ScaledSlide`, `SlideEditor`, `PDFCanvas`, and `PDFEditorWorkspace`.

### React useEffect

- Source: https://react.dev/reference/react/useEffect
- Finding: Effects synchronize components with external systems, and cleanup should undo or cancel external work when dependencies change.
- Product implication: PDF render tasks should be cancelled when the file/page/scale changes or the component unmounts.
- Reflected status: `PDFCanvas` now tracks the active render task with a ref and cancels it in effect cleanup.

## Code Research

Before this cycle:

- `ScaledSlide` edited text using callbacks and `element.content` but only depended on `isEditing`.
- `SlideEditor` set edit mode through the whole Zustand store object while using an empty dependency array.
- `PDFCanvas` stored the active pdf.js render task in state and omitted it from dependencies.
- `PDFEditorWorkspace.loadPdf` used `setRightSidebarOpen` without declaring it in `useCallback` dependencies.

Selected improvement:

- Use a stable Zustand selector for `setIsEditMode`.
- Include current content and callbacks in `ScaledSlide` edit-completion effect.
- Move PDF render task tracking to a ref and cancel active tasks on cleanup.
- Add the missing PDF workspace callback dependency.

## Verification

Run after implementation:

- `npm.cmd run lint`
- `npm.cmd run typecheck`
- `npm.cmd test`
- `npm.cmd run build`
- `git diff --check`

Result:

- Lint warnings reduced from 11 to 7.
- All hook dependency warnings were cleared.
- Typecheck passed.
- Full suite passed with 42 total tests.
- Build passed.
