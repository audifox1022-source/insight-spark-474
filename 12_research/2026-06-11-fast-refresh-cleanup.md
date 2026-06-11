# Fast Refresh Cleanup Research

Date: 2026-06-11

## Objective

Remove the remaining React Fast Refresh lint warnings without changing runtime behavior. The target was to keep TSX files exporting React components only, while preserving existing helpers, variant factories, and context hooks through sibling TypeScript modules.

## External Research

### eslint-plugin-react-refresh

- Source: https://github.com/ArnaudBarre/eslint-plugin-react-refresh
- Finding: The plugin validates that components can be safely updated by Fast Refresh, and its single rule is `react-refresh/only-export-components`.
- Finding: The rule is intentionally focused on JSX/TSX files by default and relies on component naming conventions, so colocated utility exports can trigger warnings.
- Finding: Its examples classify a lowercase utility export next to a component as a failure, while component-only exports pass.
- Product implication: The safest fix for this codebase is to move non-component exports from TSX files into adjacent `.ts` modules instead of disabling the rule.

## Code Research

Baseline after the hook dependency pass:

- `npm.cmd run lint` reported 7 `react-refresh/only-export-components` warnings.
- Warning files: `StepIndicator.tsx`, `ui/badge.tsx`, `ui/button.tsx`, `ui/form.tsx`, `ui/sidebar.tsx`, `ui/sonner.tsx`, and `ui/toggle.tsx`.

Selected improvement:

- Moved CVA variant factories into `button-variants.ts`, `badge-variants.ts`, `toggle-variants.ts`, and `sidebar-variants.ts`.
- Moved form and sidebar hooks/context values into `form-context.ts` and `sidebar-context.ts`.
- Moved `getStepGuide` into `src/utils/stepGuide.ts`.
- Stopped re-exporting `toast` from `ui/sonner.tsx`; direct imports already use `sonner`.

## A/B Result

- Baseline: 7 Fast Refresh warnings.
- Candidate: 0 Fast Refresh warnings.
- Measured with: `npm.cmd run lint`.

## Verification

Run after implementation:

- `npm.cmd run lint`
- `npm.cmd run typecheck`
- `npm.cmd test`
- `npm.cmd run build`
- `git diff --check`

Result:

- Lint passed with zero warnings.
- Typecheck passed.
- Full test suite passed: 13 files, 42 tests.
- Production build passed.
- Diff check passed, with only normal Windows line-ending notices.
