## Summary

<!-- Brief description of what changed and why -->

## Pre-merge checklist

- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm run format:check` passes (run `npx prettier --write .` to fix)
- [ ] `npm run build` succeeds
- [ ] Tested on localhost (`npm run dev`)
- [ ] Firebase functions deployed if changed (`firebase deploy --only functions`)
- [ ] Preview channel deployed (`firebase hosting:channel:deploy dev-joel`)

## Test plan

<!-- How was this tested? What flows were verified? -->
