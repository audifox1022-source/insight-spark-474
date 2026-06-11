# Typecheck Hardening Research

Date: 2026-06-11

## Objective

Make TypeScript verification a repeatable product-quality gate. After the export and element-fidelity cycles, `tsc --noEmit` still failed on four legacy type issues, so the app could pass build/lint while still carrying type-contract drift.

## External Research

### TypeScript noEmit

- Source: https://www.typescriptlang.org/tsconfig/noEmit.html
- Finding: `noEmit` lets TypeScript act as a source-code type checker while another tool handles JavaScript output.
- Product implication: This Vite/SWC-style app should keep `vite build` for bundling and add a separate `typecheck` script for type safety.
- Reflected status: Added `npm run typecheck` using `tsc --project tsconfig.app.json --noEmit`.

### pdf.js page rendering

- Source: https://mozilla.github.io/pdf.js/api/draft/module-pdfjsLib-PDFPageProxy.html
- Finding: `PDFPageProxy.render(params)` starts page rendering from explicit render parameters.
- Product implication: The local pdf.js v6 type contract requires the canvas object in render parameters, not only the canvas context.
- Reflected status: `fileParser.ts` now passes both `canvas` and `canvasContext`.

### Supabase custom fetch

- Source: https://supabase.com/docs/reference/javascript/initializing
- Finding: Supabase client initialization supports custom fetch through `global.fetch`.
- Product implication: A custom timeout fetch must preserve the standard `fetch` signature, including `RequestInit.signal`.
- Reflected status: `createTimeoutFetch` now types `init` as `RequestInit`.

## Code Research

Before this cycle:

- `PresentationTabProps.setInfo` accepted only a direct `MeetingInfo`, but the component uses React functional updates.
- `createTimeoutFetch` defaulted `init` to `{}`, so TypeScript could not see `init.signal`.
- `fileParser.ts` used the older pdf.js render shape.
- There was no npm script for typechecking.

Selected improvement:

- Type `setInfo` as `React.Dispatch<React.SetStateAction<MeetingInfo>>`.
- Type custom fetch arguments as `RequestInfo | URL` and `RequestInit`.
- Add the required `canvas` parameter to pdf.js rendering.
- Add `typecheck` script.

## Verification

Run after implementation:

- `npm.cmd run typecheck`
- `npm.cmd test`
- `npm.cmd run build`
- `npm.cmd run lint`
- `git diff --check`

Result:

- Typecheck passed.
- Full suite passed with 42 total tests.
- Build passed.
- Lint passed with 0 errors and the existing 11 warnings.
