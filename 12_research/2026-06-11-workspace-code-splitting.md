# Workspace Code Splitting Research

Date: 2026-06-11

## Objective

Reduce the amount of workspace code evaluated on the default presentation screen. The app has several secondary workspaces (translator, audio lab, PDF editor, slide designer) that were statically imported and mounted even when hidden.

## External Research

### React lazy

- Source: https://react.dev/reference/react/lazy
- Finding: `lazy` defers loading a component's code until the component is rendered for the first time.
- Finding: Lazy components should be declared at module scope, outside React components, to avoid state resets.
- Product implication: Secondary workspaces can be declared as top-level lazy components, then rendered on first activation behind the existing `Suspense` boundary.

### Vite dynamic imports

- Source: https://vite.dev/guide/features.html#dynamic-import
- Finding: Vite supports dynamic imports and build-time splitting for async modules.
- Finding: Vite's build optimizations generate async chunks and preload their direct shared dependencies when those chunks are requested.
- Product implication: Moving secondary workspaces behind lazy dynamic imports should split their code into separate chunks while preserving the normal Vite preload behavior.

## Code Research

Baseline:

- `Index.tsx` statically imported `TranslatorWorkspace`, `AudioLabWorkspace`, `PDFEditorWorkspace`, and `SlideEditor`.
- The JSX rendered those workspaces on every page load and hid inactive apps with CSS classes.
- This meant a naive `lazy()` conversion would not help, because hidden components would still be rendered and loaded.

Selected improvement:

- Keep `PresentationTab` eager because it is the first screen.
- Convert the four secondary workspaces to top-level `lazy()` imports.
- Track `loadedApps` by app mode.
- Render each secondary workspace only after its first activation, then keep it mounted afterward to preserve state across tab switches.

## A/B Result

Measured with `npm.cmd run build`.

Baseline build before this change:

- Entry JS: `dist/assets/index-DYtdfzoe.js` = 344.15 kB, gzip 93.34 kB.
- Vendor JS: `dist/assets/vendor-Bo1e-Fme.js` = 3,900.32 kB, gzip 1,313.49 kB.

Candidate build after this change:

- Entry JS: `dist/assets/index-B7Yo94nh.js` = 161.52 kB, gzip 47.80 kB.
- Vendor JS: `dist/assets/vendor-BkLveF0w.js` = 3,900.31 kB, gzip 1,314.24 kB.
- New async workspace chunks:
  - `AudioLabWorkspace-RvU_oEHr.js` = 31.27 kB, gzip 8.79 kB.
  - `PDFEditorWorkspace-K2eaAZRc.js` = 43.91 kB, gzip 11.61 kB.
  - `TranslatorWorkspace-DSeK_WeU.js` = 51.01 kB, gzip 13.69 kB.
  - `SlideEditor-CQpqeTsK.js` = 55.83 kB, gzip 14.99 kB.
  - `geminiAudioService-dAjEDjKY.js` = 3.06 kB, gzip 1.63 kB.

Result:

- Entry JS raw size reduced by 182.63 kB (53.1%).
- Entry JS gzip size reduced by 45.54 kB (48.8%).
- Secondary workspace code is now deferred until first use.

Known limitation:

- The large shared vendor chunk remains essentially unchanged.
- `pdfjs` is still modulepreloaded from the presentation upload parser path, so deeper parser/vendor splitting is a separate follow-up target.

## Verification

Run after implementation:

- `npm.cmd run lint`
- `npm.cmd run typecheck`
- `npm.cmd test`
- `npm.cmd run build`
- `git diff --check`

Result:

- Lint passed.
- Typecheck passed.
- Full test suite passed: 13 files, 42 tests.
- Production build passed and emitted separate workspace chunks.
- Diff check passed, with only normal Windows line-ending notices.
