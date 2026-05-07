# PaperPal — Plan

## Production state (2026-05-06 EOD)

- Functions live with Plan B link-based emails + sharp receipt compression
- Hosting live with FormView attachment thumbnail grid
- PR #19 merged to main; `dev-joel` and `main` are in sync

## Bugs to investigate

- **REQ-67380: routing didn't match user expectation.** Rachel submitted, expected Nick Taintor (her chosen supervisor) to be the first recipient, but the system emailed Kristin Palm first. Investigated 2026-05-07: system worked as configured, but the configuration was a surprise. Rachel's title `FINANCE-UNAF` has no title-level mapping, so the District Office building default kicked in (approver = Kristin, supervisor = Aaron). Rachel overrode the supervisor to Nick but didn't see/touch the approver, so the 4-step flow ran with Kristin getting the first email.

  **Policy clarification (2026-05-07):** Building Mappings and Title Overrides are supposed to be **prefill, never enforcement**. If a submitter changes any part of the routing, the system shouldn't silently keep other inherited values invisibly applied. The mapping config exists to save the submitter typing — it's not a workflow rule the user can't override.

  **Implementation outline for next session:**
  1. **Surface the full routing chain in every form** (CheckRequest, MileageReimbursement, TravelReimbursement). Show: Approver → Supervisor → Final Approver with names and emails. Currently the supervisor is editable via `routeRequestTo` but the approver is set silently via `chain.approverEmail` — see [TravelReimbursement.tsx:646-654](src/pages/TravelReimbursement.tsx#L646).
  2. **Make every routing field editable.** Currently only supervisor has an override field. Add equivalent override controls for approver — including the ability to **remove the approver step entirely** (collapsing to 2-step flow). A small "Remove approver" or "X" button on the approver row, or a "this submission needs an approver review" toggle that defaults to whatever the prefill says but is user-controlled.
  3. **Treat each routing field as independent.** Manual changes to one field shouldn't auto-clear the others, but the user must SEE all of them so they can make conscious choices.
  4. **Extend the same chain display to FormView** so reviewers see who else is in the chain — currently they can only see the next step (themselves) and don't know who's after them.
  5. **Same logic should govern Mileage and Check Request forms** — the routing logic is replicated across all three form pages.

  **Resolution for REQ-67380 specifically:** doesn't need a code change — the submission can be edited (controller has edit access) to remove `approverEmail`/`approverName`, which would skip Kristin and route directly to Nick on the next status change. Plan B link-only emails make this re-route cheap.

## Up next (start of new session)

User explicitly flagged these as the next things to tackle:

1. **Rename "Project" → "Program" in budget codes** (small, do first). Affects:
   - `BudgetCodeBuilder.tsx` — segment label "Proj" + step heading
   - `defaultBudgetSegments.ts` — segment metadata
   - Firestore `settings/budgetSegments` doc — has a `proj` array key. Decision needed: keep the internal key as `proj` and only change display labels (cheap, no migration), OR migrate the key to `prog` (cleaner, requires touching every read/write site + a one-time data migration). Recommend keeping internal `proj`, only renaming display strings, unless there's a reason to be strict.
   - Anywhere the format guide says "Fund / Org / Proj / Fin / Course / Obj"
   - PDF rendering and FormView display of the breakdown
   - Travel PDF mileage detail parity (separate Follow-up below) might intersect
2. **Commute subtraction automation for Mileage + Travel forms.** Policy: on working days, the user's commute (home ↔ school distance) is _not_ reimbursable — they'd drive that anyway. Off-toggle for non-working days (PD on a Saturday, conference travel that doesn't replace a workday, etc.).
   - **Default toggle**: per-submission (or per-trip?) "This is a working day" checkbox, default ON.
   - **When ON**: subtract the commute distance from total reimbursable miles. Need a decision on the rule: simplest is "subtract one round-trip commute per working day from the submission total." More accurate but complex is "first leg from home → subtract one-way commute from that leg; last leg back to home → subtract one-way commute from that leg; middle legs full."
   - **When OFF**: full mileage reimbursable (today's behavior).
   - **Inputs**: needs `userProfile.homeAddress` and `AppSettings.schoolAddress` (both already exist) and a Routes API call for the commute distance (already wired via `googleMaps.ts`). Could cache the per-user commute distance once it's computed.
   - **UI**: applies to both Mileage Reimbursement and Travel Reimbursement (carTrips section).
   - **Display**: PDF + FormView should show both the raw total and the subtracted reimbursable total, so the controller can audit the math.

## Follow-ups queued from email-latency phase

These came up during the work and were intentionally deferred — pick up if/when they're worth the time, no rush:

- **PDF page-1 thumbnails in FormView attachments** — currently PDF receipts render as file-icon cards. Real page previews would need PDF.js + a worker (~150KB bundle hit). Worth doing for reviewer UX, but not urgent.
- **Bundle size warning** — `dist/assets/index-*.js` is ~870KB pre-gzip and trips Vite's 500KB warning every build. Cosmetic, but a `React.lazy` split on FormView and Admin would chunk it cleanly.
- **Legacy "Per-trip detail not recorded" submissions** — old in-flight Travel forms still show this text on their PDFs. Supervisors can fix via the Edit button if any block final approval; nothing to code unless it becomes a real friction point.
- **Travel PDF mileage detail parity with Mileage form** — when a Travel Reimbursement has carTrips, the PDF currently squashes them into the unified Expenses table's 4-col format ("Date / Category / Detail / Amount") where the route lives inside the Detail cell. The dedicated Mileage Reimbursement form renders trips in a clean 5-col table: **Date / From / To / Purpose / Miles** — see [pdf.js:367-373](functions/helpers/pdf.js#L367). Travel should add a separate "Trips" section above the Expenses table mirroring that layout (the carTrips data already has from/to; per-trip purpose probably defaults to the parent meetingTitle since Travel forms don't capture it per trip). Same fix needed in FormView's TravelView via FormDataView.tsx.

## Future

- Notification preferences (user opt-in/out from profile)
- Reporting / analytics dashboard (totals, trends, approvals per month)
- FormView: respect form field config (hide hidden fields in read-only view)
- Light mode (requires refactoring inline styles to CSS variables)

## Done

- Firestore rules fix (2026-05-07): added `isApproverOrAbove()` helper. Loosened `staff/{email}` read so approver+ can list the directory (was failing silently for non-admin/BO users — empty staff array → no autocomplete suggestions in redirect dialog and other StaffEmailAutocomplete uses). Loosened `settings/{settingId}` write and `users/{uid}` create/update from `isAdmin()` to `isAdminOrBO()` so controllers (not just admins) can edit workflow mappings + the auto-role-promotion that runs when assigning someone as a supervisor in a mapping. Diagnosed when Rachel (controller) couldn't add to workflow mappings while Joel (admin) could. Deployed via `firebase deploy --only firestore:rules`.
- Email latency fix (link-based workflow notifications, receipt compression via sharp): Gmail log diagnosis showed Workspace's pre-delivery scanning was the bottleneck — not our code, and not file size (compression to 91KB still triggered 4+ minute delays). Pivoted to link-only emails for every workflow status; only the final-approval submitter copy still carries a PDF. Result: end-to-end delivery dropped from 4+ minutes (sometimes never arriving) to ~10 seconds.
- Travel form polish (per-line notes, per-trip mileage detail with date/from/to, Final Claim category breakdown, PDF legacy fallback wording, submission validation)
- Approver/supervisor edit access (mirror controller-edit flow; activity log distinguishes edited_by_approver / edited_by_supervisor / edited_by_controller)
- Email timing instrumentation (`[timing]` logs on onSubmissionCreated, onSubmissionStatusChange, sendMail)
- Workflow Mapping overhaul (rename Supervisor Mappings → Workflow Mapping, inline edit, search, routing chain, condensed uncovered banner, prominent per-group add buttons)
- Business office feedback round (mileage rate $0.725, Airfare expense category, meal certification, Travel Policy slide-out drawer)
- Dashboard tab state persisted in URL (back button restores correct tab/sub-view)
- Bulk mark as paid (controller+ multi-select on Completed approvals)
- Undo paid (revert to approved, regenerate PDF without watermark, clear log sheet)
- PAID watermark on PDF (stamps all pages, updates existing Drive file)
- Approval history sub-tab (Pending/Completed) in Approvals tab
- Mark as Paid status (controller+ can mark approved submissions as paid)
- Sandbox approval flow selector (2-step vs 4-step toggle)
- Claude Code skills (deploy, checks, firebase, approval-flow, style)
- Supervisor mappings: searchable user dropdowns, inline user creation from staff directory, auto-role promotion
- Supervisor mappings consolidation (building defaults moved into mappings, BuildingsSection removed)
- Optional approver step (Staff → Approver → Supervisor → Controller, configurable per-title)
- Roles restructure (staff → approver → supervisor → business_office → controller → admin)
- Mobile optimization (responsive layouts, touch targets, stacking, 2x2 tab grid)
- Travel expenses redesign (unified expenses, receipt upload, OCR, PDF receipts, auto-save drafts)
- Testing & polish phase (totals positioning, form field cache fix, dead code cleanup)
- Resubmit bug fix (deleteField instead of undefined)
- Supervisor redirect (reassign + email notifications)
- Activity timeline (log all workflow events, vertical timeline in FormView)
- Print & export (print button, on-demand PDF via callable Cloud Function)
- Resubmit email notifications (supervisor + submitter notified)
- Controller role (restricted admin panel, Firestore rules, nav access)
- Sandbox mode (isolated test environment, emails to self, no Drive uploads)
- Form field config (admin UI to show/hide/reorder form sections)
- Admin panel redesign (Forms & Mappings / Settings tabs, collapsible accordions)
- Dashboard UI refresh (rotate-reveal cards, gradient submission rows, form-type accents)
- History management (hide submissions, clear history, export CSV)
- Searchable staff dropdown in admin Users & Roles
- Add user bug fix (Firestore rules + error handling)
- Resubmission flow (edit & resubmit from pending or revisions_requested)
- Cancel request (submitter can cancel pending/revisions_requested)
- Server-side email with PDF attachments (Cloud Functions)
- Google Drive integration + PDF generation
- Firebase Trigger Email extension
- Budget code workflow (staff greyed out, supervisor assigns)
- UI polish (Orono brand colors, status badges, email template)
- Staff integration (OneSync → Google Sheet → Cloud Function → Firestore)
- Supervisor mappings (hybrid building + title approach)
- Approval workflow (FormView)
- Email notifications (branded HTML template)
- Signature system (draw / type / saved)
- Staff email autocomplete
- Dashboard (clickable rows, approvals tab)
- Users & Roles
- Google Maps integration (Places API + Routes API)
- Budget Code Builder (6-segment UFARS codes)
- Travel Reimbursement form
- Custom DatePicker component
- Three-step approval flow (pending → reviewed → approved)
- Admin panel (buildings, staff, roles, settings, budget segments)
