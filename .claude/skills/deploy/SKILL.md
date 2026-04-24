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

Preview URL: `https://paperpal-orono--dev-joel-p0yuewu4.web.app`

## Cloud Functions

Deploy Cloud Functions to production (email triggers, PDF generation, OCR, staff sync):

```bash
firebase deploy --only functions
```

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
