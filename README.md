# PaperPal

Internal web app for **Orono Public Schools** staff to submit and track expense reimbursement forms through a supervisor approval workflow. Built and maintained by Joel Mellor.

## Forms

| Form                  | Path             | Notes                              |
| --------------------- | ---------------- | ---------------------------------- |
| Check Request         | `/forms/check`   | Vendor / service payments          |
| Mileage Reimbursement | `/forms/mileage` | IRS rate per trip date             |
| Travel Reimbursement  | `/forms/travel`  | Multi-category trip expenses + OCR |

## Approval flow

Configurable per title. Default is 2-step; titles with an approver mapped use 4-step.

```
Staff submits → [Approver] → Supervisor → Controller approves → Controller marks paid
```

Any reviewer can also deny, request revisions, redirect to a different reviewer, or cancel. Submissions in flight surface on the **All Open** oversight tab for controllers/business office/admin with inline resend, redirect, and edit actions.

## Roles

In ascending access order:

`staff` → `approver` → `supervisor` → `business_office` → `controller` → `admin`

Approver and above can edit submissions assigned to them. Business office / controller / admin see the admin panel. Controllers + admins can mark paid (individually or in bulk) and resend reminder emails.

## Tech stack

- **Frontend** — React 18 + TypeScript + Vite + Tailwind v4
- **Backend** — Firebase (Auth, Firestore, Hosting, Cloud Functions)
- **Auth** — Google SSO restricted to `@orono.k12.mn.us`
- **PDFs + Email** — Cloud Functions render PDFs, upload to Drive, and trigger workflow emails via the Firebase Trigger Email extension
- **Maps** — Google Places + Routes REST APIs for address autocomplete and mileage calculation

## Local development

```bash
npm install
npm run dev              # Vite dev server
npm run typecheck        # tsc -b
npm run lint             # eslint --max-warnings=0
npm run format:check     # prettier --check
firebase emulators:start # local Firestore / Functions / Auth
```

Before pushing, all three checks must pass — CI rejects PRs that fail any of them:

```bash
npm run typecheck && npm run lint && npm run format:check
```

## Deploy

```bash
firebase hosting:channel:deploy dev-joel   # preview channel (expires in 7 days)
firebase deploy                            # production
firebase deploy --only functions           # functions only
firebase deploy --only firestore:rules     # rules only
```

In-progress features push to `dev-joel` and deploy to the preview channel; production deploys happen via PR-to-`main` merges, not direct `firebase deploy`.

## Further reading

- [CLAUDE.md](./CLAUDE.md) — architecture, design system (Orono brand palette, component patterns, button classes), file structure, Firestore schema
- [plan.md](./plan.md) — production state, queued work, and completed milestones
- `.claude/skills/` — runbooks for common operations (deploy, checks, approval flow, Firebase, brand style)
