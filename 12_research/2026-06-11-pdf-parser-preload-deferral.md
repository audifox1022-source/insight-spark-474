# PDF Parser Preload Deferral Research

Date: 2026-06-11

## Objective

Defer `pdfjs` from the first page's HTML modulepreload list while preserving PDF upload parsing. The previous code-splitting pass deferred secondary workspaces, but the production HTML still preloaded the `pdfjs` chunk from the presentation upload parser path.

## External Research

### Vite Dynamic Imports

- Source: https://vite.dev/guide/features.html#dynamic-import
- Finding: Vite supports dynamic imports and bundles matching modules as async chunks.
- Product implication: The PDF parser can be moved behind a dynamic import so PDF parsing remains available when a PDF is uploaded.

### Vite Module Preload Control

- Source: https://vite.dev/config/build-options.html#build-modulepreload
- Finding: Vite computes dependency preloads automatically and supports `build.modulePreload.resolveDependencies` for fine-grained dependency filtering.
- Finding: The resolver receives `hostType`, so filtering can be scoped to HTML entries while leaving JavaScript async chunk preloads intact.
- Product implication: Filtering `assets/pdfjs-*.js` only for `hostType === "html"` removes the first-load preload while preserving dependency preloads when PDF-related async chunks are requested.

## Code Research

Baseline after workspace code splitting:

- `parseFile(file)` lived in `src/utils/fileParser.ts`.
- PDF parsing used a dynamic `import("pdfjs-dist")`, but the built HTML still included a `pdfjs` modulepreload.
- Built HTML preloads included:
  - `rolldown-runtime-CMxvf4Kt.js`
  - `pdfjs-Bnw5bkX1.js`
  - `vendor-BkLveF0w.js`

Selected improvement:

- Moved PDF parsing implementation into `src/utils/pdfParser.ts`.
- Kept the public upload API unchanged: `parseFile(file)` still handles PDF files.
- Changed the PDF branch to `await import("@/utils/pdfParser")`.
- Added a Vite HTML-entry-only modulepreload filter for hashed `assets/pdfjs-*.js` files.
- Added a unit test that verifies PDF uploads route through the lazy parser module.

## A/B Result

Measured with `npm.cmd run build` and `Select-String -Path dist\index.html -Pattern 'modulepreload|pdfjs|pdfParser'`.

Baseline:

- HTML modulepreloads included `pdfjs`.
- Preloaded PDF chunk size: 422.53 kB raw, 126.12 kB gzip.
- Entry JS: 161.52 kB raw, 47.80 kB gzip.

Candidate:

- HTML modulepreloads include only:
  - `rolldown-runtime-CMxvf4Kt.js`
  - `vendor-BwS1QRS8.js`
- `pdfjs-DwA9kGbk.js` is still emitted as an async chunk: 421.18 kB raw, 125.56 kB gzip.
- `pdfParser-C3OBSpnl.js` is emitted as an async chunk: 1.60 kB raw, 0.82 kB gzip.
- Entry JS: 160.14 kB raw, 47.41 kB gzip.

Result:

- Removed `pdfjs` from the first HTML modulepreload list.
- Deferred roughly 421 kB raw / 126 kB gzip of PDF parser dependency from initial preload.
- Preserved PDF parsing through the unchanged `parseFile(file)` API.

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
- Full test suite passed: 13 files, 43 tests.
- Production build passed.
- Built HTML contains no `pdfjs` or `pdfParser` modulepreload entries.
- Diff check passed, with only normal Windows line-ending notices.
