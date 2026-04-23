---
name: checks
description: Run PaperPal CI checks — TypeScript type checking, ESLint, and Prettier formatting. Use before pushing, creating PRs, or when asked to verify code quality.
---

# Pre-push Checks

## Run All Checks

```bash
npm run typecheck && npm run lint && npm run format:check
```

All three must pass before pushing or creating a PR.

## Individual Commands

| Check | Command | Fixes |
|-------|---------|-------|
| TypeScript | `npm run typecheck` | Fix type errors in code |
| ESLint | `npm run lint` | Fix lint issues (max 0 warnings) |
| Prettier | `npm run format:check` | Run `npx prettier --write .` to auto-fix |

## Auto-fix Formatting

If only Prettier fails:

```bash
npx prettier --write .
```

Then commit the formatting fix separately from feature changes.

## Build Verification

After checks pass, verify the production build works:

```bash
npm run build
```

This runs `tsc -b && vite build`. The build must succeed before deploying.

## Common Issues

- **New `SubmissionStatus` value**: TypeScript will error on any `Record<SubmissionStatus, ...>` missing the new key. Add entries to `STATUS_STYLES` (Dashboard.tsx) and `STATUS_CONFIG` (FormView.tsx).
- **Unused imports**: ESLint catches these as warnings (max 0). Remove them.
- **Prettier conflicts after editing**: Always run `npx prettier --write <file>` on files you edited before committing.
