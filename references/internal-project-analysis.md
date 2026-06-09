# Internal Project Analysis

Snapshot date: 2026-06-09.

## Structure

This workspace contains a Vite React/TypeScript app plus serverless and local API handlers:

- `src/`: React app, stores, hooks, services, utilities, tests, and app-level CSS.
- `api/`: Vercel-style API handlers and shared auth helper.
- `server.js`: local Express API server for Gemini, audio analysis, upload handshakes, and translation.
- `supabase/`: Supabase migrations, config, and functions.
- `public/`: static assets and `pdf.worker.min.mjs`.
- `wiki/`, `README.md`, `updates.md`, `gemini.md`, `skills.md`: project documentation and prior work notes.

File inventory from `rg --files src api supabase`:

- `src`: React/TypeScript application files including app shell, pages, components, hooks, stores, services, integrations, tests, and utilities.
- `api`: 9 API files after current dirty changes, including `_auth.js`.
- `supabase`: config, 6 migrations, and 2 function directories/files.

## Entrypoints and Runtime Flow

- Browser entrypoint: `src/main.tsx` renders `src/App.tsx`.
- App shell: `src/App.tsx` creates the React Query client, validates Supabase env vars, applies theme state, sets global error overlay, and defines routes.
- Main protected route: `/` renders `src/pages/Index.tsx` behind `ProtectedRoute`.
- Feature modes in `Index.tsx`: presentation generation, slide designer, translator, audio lab, and PDF editor.
- Generator route: `/generator` renders `WorkAIGenerator`.
- Backend local entrypoint: `server.js` starts Express on `PORT` or 3001.
- Backend API flow: JSON/body limits and CORS are installed first, then auth middleware gates audio and Gemini endpoints. Gemini calls use `@google/generative-ai`; blob uploads use `@vercel/blob/client`.

## Dependencies and Scripts

Important package scripts from `package.json`:

- `npm run dev`: concurrently starts local API and Vite.
- `npm run start:api`: starts `server.js`.
- `npm run build`: Vite production build.
- `npm run lint`: ESLint.
- `npm test`: Vitest run.

Major runtime dependencies include React, Vite, Supabase, Gemini SDKs, PptxGenJS, PDF libraries, docx, framer-motion, zustand, tanstack/react-query, shadcn/Radix components, and Tailwind.

## Tests and Verification Surface

- Vitest is configured by `vitest.config.ts`.
- Existing discovered tests include `src/lib/utils.test.ts` and `supabase/functions/generate-presentation/index.test.ts`.
- `npm test` currently reports 1 passing test file and 1 passing test.
- `npm run build` is the strongest available broad check for the frontend bundle.
- `npm run lint` currently passes with warnings only in pre-existing app files.

## Configuration and Documentation

- Vite config: `vite.config.ts`.
- TypeScript configs: `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`.
- ESLint configs: `eslint.config.js`, `eslint.config.mjs`.
- Tailwind/PostCSS configs are present.
- `vercel.json` is present.
- No visible `.github/workflows` directory was found in the inspected checkout.
- `.env*` files are gitignored and were not read.

## Security and Failure Risks

- API key and token handling are critical. Do not print or commit `.env` values.
- `server.js` logs the first five characters of `GEMINI_API_KEY`; this may be acceptable for debugging but should be reconsidered for production logs.
- AI endpoints depend on external Gemini services and can fail because of invalid keys, timeouts, blob download failures, JSON parse errors, or large audio uploads.
- Browser direct API calls can trigger CORS failures; prior notes in `updates.md` say proxy routing was introduced to avoid this class of failure.
- Large generated bundles and browser-externalized `buffer` warnings appear during build.
- Existing lint warnings around React hook dependencies and fast refresh exports remain outside this autoresearch change.

## Git and Harness State

- Initial branch was `main`; this task switched to `autoresearch-skill` after branch creation required elevated permission.
- Remote `origin` is `https://github.com/audifox1022-source/insight-spark-474`.
- The worktree had many dirty app files before this autoresearch implementation. They are treated as unrelated and must remain unstaged for this commit.
- No GitHub Actions workflow was visible, so local validation is currently `npm run build`, `npm test`, `npm run lint`, and the new autoresearch harness.

## Existing Intent Inferred From Docs

- The app is a Work AI platform for AI-assisted presentation generation, slide editing, translation, audio analysis, and PDF editing.
- Prior docs emphasize self-healing, robust API fallback, browser testing, API-key safety, and recording work in update logs.
- The new autoresearch skill preserves those ideas at the Codex-skill level by adding resumable state, research notes, lock coordination, and deterministic eval checks.
