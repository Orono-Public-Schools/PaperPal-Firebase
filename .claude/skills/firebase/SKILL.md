---
name: firebase
description: PaperPal Firebase infrastructure — project config, Firestore collections, security rules, Cloud Functions, emulators. Use when working with backend, database, auth, or deployment infrastructure.
---

# Firebase Infrastructure

## Project

- **Project ID**: `paperpal-orono`
- **Region**: `us-central1`
- **Config file**: `.firebaserc`
- **Firebase config**: `firebase.json`

## Firestore Collections

| Collection | Purpose |
|------------|---------|
| `users/{uid}` | User profiles (role, name, building, signature) |
| `submissions/{REQ-XXXXX}` | All form submissions |
| `buildings/{id}` | Building names/initials (staff sync reference) |
| `staff/{email}` | Imported staff records from OneSync |
| `settings/app` | App settings (sender email, final approver, fiscal year) |
| `settings/budgetSegments` | UFARS budget code segments |
| `settings/supervisorMappings` | Title overrides (`mappings[]`) + building defaults (`buildingMappings[]`) |
| `settings/formFields` | Form field visibility/ordering config |
| `mail/{id}` | Firebase Trigger Email extension documents |

## Cloud Functions (`functions/index.js`)

| Function | Trigger | Purpose |
|----------|---------|---------|
| `onSubmissionCreated` | Firestore create on `submissions/*` | Generate PDF + send submit emails |
| `onSubmissionStatusChange` | Firestore update on `submissions/*` | Send emails on status changes, Drive upload on approval |
| `extractReceiptTotal` | Callable | OCR via Google Cloud Vision API |
| `generateSubmissionPdf` | Callable | On-demand PDF generation |
| `scheduledStaffSync` | Cloud Scheduler | Sync staff from Google Sheet |
| `syncStaffNow` | Callable | Manual staff sync trigger |
| `setupDriveStructure` | Callable | Create Drive folder structure |
| `fiscalYearRollover` | Cloud Scheduler | Auto-create new FY folders |

## Security Rules (`firestore.rules`)

Key helpers:
- `userRole()` — reads the user's role from their profile
- `isAdmin()` — checks `role == 'admin'`
- `isAdminOrBO()` — checks `role in ['admin', 'business_office', 'controller']`

Submissions access: submitter (own), supervisorEmail match, approverEmail match, or admin/BO.

## Emulators

```bash
firebase emulators:start
```

Starts local Firestore, Functions, and Auth emulators for development.

## Composite Indexes

Firestore auto-prompts for missing indexes. When a new query combination is first run (e.g., `approverEmail + status + createdAt`), check the browser console for an index creation link. Click it, wait ~2 minutes.

## Email Setup

Uses **Firebase Trigger Email Extension** with `smtp.gmail.com:465` (app password auth). Write docs to the `mail` collection — the extension sends automatically.

## Deploying

```bash
# Preview (frontend only)
npm run build && firebase hosting:channel:deploy dev-joel

# Cloud Functions
firebase deploy --only functions

# Firestore rules
firebase deploy --only firestore:rules

# Everything
npm run build && firebase deploy
```
