---
name: deploy
description: Build and deploy PaperPal to Firebase — preview channel, production hosting, Cloud Functions, or all. Use when asked to deploy, push to preview, or publish changes.
---

# Deploy

## Preview Channel (dev-joel)

Build and deploy to the preview channel for testing:

```bash
npm run build && firebase hosting:channel:deploy dev-joel
```

Preview URL: `https://paperpal-orono--dev-joel-a9mkpgqt.web.app` (hash changes if the channel expires and is recreated — the deploy output prints the current URL)

## Cloud Functions

Deploy Cloud Functions to production (email triggers, PDF generation, OCR, staff sync):

```bash
firebase deploy --only functions
```

If it fails with "User code failed to load. Cannot determine backend specification. Timeout after
10000" before anything uploads, the CLI's local discovery step timed out loading `index.js`
(sharp, pdfkit and googleapis take a few seconds on this machine). Retry with a longer discovery
window; nothing is wrong with the code:

```bash
FUNCTIONS_DISCOVERY_TIMEOUT=120 firebase deploy --only functions
```

If even that times out, the first load of the day is slow (cold disk cache / antivirus scanning
`node_modules`; seen at 117 s on 2026-10-15, 2 s once warm). Warm it first, then deploy:

```bash
cd functions && node -e "require('./index.js'); process.exit(0)" && cd ..
```

The PDF generator is `functions/helpers/pdf.js` (plain JS, not under `functions/src`), so a PDF
change needs this deploy, not just hosting.

## Firestore Rules

Deploy security rules:

```bash
firebase deploy --only firestore:rules
```

## Production Hosting

Deploy to production (use with caution — confirm with user first):

```bash
npm run build && firebase deploy --only hosting
```

Production URL: `https://paperpal-orono.web.app`

## Full Deploy (everything)

```bash
npm run build && firebase deploy
```

## Pre-deploy Checklist

Always run before deploying:

```bash
npm run typecheck && npm run lint && npm run format:check
```

If formatting fails, fix with `npx prettier --write .` and commit separately.

## Notes

- Preview deploys only affect the frontend — Cloud Functions need a separate `firebase deploy --only functions`
- The preview channel expires after 7 days and auto-renews on each deploy
- Firebase project: `paperpal-orono`
- Region: `us-central1` for all Cloud Functions
