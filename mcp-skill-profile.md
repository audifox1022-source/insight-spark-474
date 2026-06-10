# MCP & Skill Profile

Updated: 2026-06-10

This app is a Vite/React Work AI presentation workspace with Vercel Functions, Supabase auth/storage configuration, Gemini-backed AI routes, Vercel Blob uploads, PDF/PPT export, and audio analysis. The following MCP connectors and Codex skills are the practical set for operating and extending it.

## Applied MCP Connectors

| MCP | Status | Why this app needs it | Current evidence |
| --- | --- | --- | --- |
| GitHub | Applied | Inspect commit statuses, deployment checks, repository state, and CI/Vercel integration results after pushes. | GitHub MCP successfully read the latest Vercel commit status for `audifox1022-source/insight-spark-474`. |
| Vercel | Required | Inspect production deployments, build logs, deployment limits, aliases, and runtime deployment state for `tw_make_ppt`. | Vercel is the production host. Direct MCP project access currently needs the `audifoxs-projects` scope to be re-authenticated; Vercel CLI/API was used as a fallback. |
| Canva | Optional workflow | Useful when generated presentations need to become editable Canva designs or when Canva decks need to be inspected/converted. | Canva MCP is available, but no Canva design URL or design ID is currently configured in the app. |
| Google Drive | Optional workflow | Useful for importing source Docs/Slides/Sheets into the presentation generator or exporting generated content to Workspace files. | Google Drive MCP is available, but the app currently has no Drive file ID or integration config. |
| Gmail | Not needed by default | No email ingestion, notification, or inbox workflow exists in the current app. | No Gmail-dependent code path was found. |

## Applied Codex Skills

These user-scoped skills were installed under `~/.codex/skills`. Restart Codex after installation so the skill registry picks them up automatically.

| Skill | Status | Use for this app |
| --- | --- | --- |
| `vercel-deploy` | Installed | Preview/production deployment workflows and deployment URL handoff. |
| `playwright` | Installed | Browser-based UI smoke checks for auth routing, editor rendering, PDF workspace, upload flows, and production pages. |
| `pdf` | Installed | Visual inspection and layout validation for PDF export and PDF editor work. |
| `security-best-practices` | Installed | Focused security reviews for JavaScript/TypeScript web code, API key handling, auth boundaries, CORS, and server routes. |
| `transcribe` | Installed | Local audio transcription jobs when users provide audio/video files for text extraction. This is a helper skill, not the production Gemini audio path. |

## When To Use Each Skill

- Use `vercel-deploy` when the user asks to deploy, create a preview, inspect deploy output, or recover a Vercel failure.
- Use `playwright` when a UI route, production page, auth redirect, editor interaction, or visual behavior needs real-browser evidence.
- Use `pdf` when PDF rendering, Korean glyph support, export fidelity, page layout, or visual PDF inspection matters.
- Use `security-best-practices` only for explicit security review/hardening work. This app has several sensitive boundaries: `GEMINI_API_KEY`, Supabase auth, Vercel Blob upload tokens, Redis/KV tokens, and CORS.
- Use `transcribe` only for user-provided audio/video transcription tasks. Do not confuse it with the app's Gemini audio analysis API.

## Current Runtime MCP Notes

- Production project: `tw_make_ppt`.
- Production domain observed: `https://twmakeppt.vercel.app`.
- Latest verified GitHub/Vercel status at the time of this profile: Vercel status check succeeded on `main`.
- Vercel MCP direct project reads returned a scope authorization error for `audifoxs-projects`. Reconnect or re-authenticate the Vercel connector to that scope for full MCP-based deployment inspection. Until then, `vercel inspect` and `vercel api` work as the fallback when the local CLI is authenticated.

## Recommended App Workflow

1. Use GitHub MCP after every push to verify the Vercel status context on the exact commit SHA.
2. Use Vercel MCP or CLI/API to inspect failed deployments, especially hidden `errorCode` fields not shown in build logs.
3. Use Playwright for production smoke checks after UI-impacting changes:
   - `/`
   - `/auth`
   - authenticated workspace routes when credentials/session are available
   - `/api/health` as a runtime status check
4. Use the PDF skill for export changes and render generated PDFs to images before considering layout work complete.
5. Use the security skill before changing auth, upload, proxy, AI key, CORS, or environment-variable logic.

## Not Applied

- `openai-docs`: not installed from the curated list because the production AI stack currently uses Gemini and Vercel AI SDK, not OpenAI APIs. A system `openai-docs` skill is available if OpenAI API work is introduced later.
- Figma skills: not installed because this app has no Figma file or design-system workflow in the current repo.
- Sentry skill: not installed because Sentry is not configured in `package.json` or runtime settings.
