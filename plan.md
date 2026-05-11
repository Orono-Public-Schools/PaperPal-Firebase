# PaperPal — Plan

## Production state (2026-05-11 EOD)

- All commute deduction phases shipped (admin-gated, default off): Profile commute display, per-trip Working day toggle on Mileage + Travel, totals breakdown, PDF deduction rows, FormView "Working" badges
- Role-based routing chain replaces the old silent approver injection — Route To user's role determines 2-step vs 4-step. RoutingChainPreview shows the resolved flow on Mileage/Travel/Check Request before submit. Workflow Mapping is purely prefill now
- All Open oversight sub-tab visible to controller/business_office/admin — every in-flight submission across the district with assignee + inline resend/redirect/edit
- New `resendNotification` Cloud Function callable (controller+ only) for nudging the current reviewer
- FormView "Administrative Actions" group for controllers viewing a stuck submission they're not assigned to (Redirect/Edit/Request Revisions/Deny)
- Approval flow polish: budget code prompt only renders when the submission actually has missing codes; empty signatures blocked at approval time (matches submit-form guard); SignatureField reactive to userProfile load; Type-mode signatures await Caveat webfont before drawing
- Firestore rules: `/users/{uid}` read opened to any authenticated user (needed for client-side routing chain resolution)
- PRs #27, #28, #29, #30 all merged. `dev-joel` and `main` in sync

## Up next (start of new session)

**Recommended: All Open list filters + age sort** (~1-2 hr). Direct compound on what just shipped:

1. Sort the All Open list by age, oldest in-flight first, so stuck submissions surface
2. Display "X days waiting" inline on each row (use `updatedAt` or last status-change activity log entry)
3. Filter row above the list: by submitter, by form type, by status
4. Optional polish: stale highlight (red border / pill) if waiting > 7 days

Files: `src/pages/Dashboard.tsx` (Approvals tab, All Open branch — see the `approvalView === "all"` block), and probably a small filter UI component. `getAllInFlightSubmissions()` already returns desc by createdAt — likely want to switch the All Open variant to sort by oldest in-flight age instead. The SubmissionList renders rows; you may want to thread an additional badge for the "X days waiting" display.

## Follow-ups queued

Pick up if/when they're worth the time, no rush:

- **Travel PDF mileage detail parity with Mileage form** — Travel's PDF squashes carTrips into the unified Expenses 4-col table ("Date / Category / Detail / Amount") where the route lives inside Detail. Mileage's PDF renders the dedicated 5-col Trips table (Date / From / To / Purpose / Miles) — see [pdf.js:382-432](functions/helpers/pdf.js#L382). Travel should add a separate "Trips" section above the Expenses table mirroring that layout. Same fix needed in `FormDataView.tsx`'s TravelView.
- **PDF page-1 thumbnails in FormView attachments** — currently PDF receipts render as file-icon cards. Real page previews would need PDF.js + a worker (~150KB bundle hit). Worth doing for reviewer UX, not urgent.
- **Bundle size warning** — `dist/assets/index-*.js` is ~890KB pre-gzip and trips Vite's 500KB warning every build. Cosmetic, but a `React.lazy` split on FormView and Admin would chunk it cleanly.
- **Legacy "Per-trip detail not recorded" submissions** — old in-flight Travel forms still show this text on their PDFs. Supervisors can fix via the Edit button if any block final approval; nothing to code unless it becomes a real friction point.
- **Verify Nick's typed-signature fix** — reportedly Type-mode signatures weren't coming through for him specifically. Today we added `await document.fonts.load("48px Caveat")` before canvas draw + empty-signature guard at approval. Should be fixed; passive verification next time he approves with Type mode.
- **Stuck-submission migration script** — submissions redirected with the pre-fix code still carry stale `approverEmail`/`approverName`. Users can fix individually via the new in-row Redirect (which re-resolves the chain). A one-shot Firestore script could batch-clear the stale state if it becomes tedious.

## Future

- Notification preferences (user opt-in/out from profile)
- Reporting / analytics dashboard (totals, trends, approvals per month)
- FormView: respect form field config (hide hidden fields in read-only view)
- Light mode (requires refactoring inline styles to CSS variables)

## Done

- **Approval flow polish (2026-05-11)**: budget code prompt at approval time hides when submitter already filled in every code (mileage/travel `accountCode`, check-request per-expense `code`); empty-signature guard added to all three approve handlers in FormView (alerts and bails — matches the submit-form guard); SignatureField now reactive to `savedSignatureUrl` prop changes (was caching once on mount, so the "Saved" tab never appeared when userProfile loaded after first render); typed signatures await Caveat webfont via `document.fonts.load` before drawing the canvas (some browsers don't fall back synchronously, which left typed sigs blank). `getDataUrl` is async now; all 7 callers await.
- **All Open oversight (2026-05-11)**: new sub-tab in Approvals visible to controller/business_office/admin showing every in-flight submission across the district (`pending`, `approved_by_approver`, `reviewed`, `revisions_requested`). Per-row Assignee line (derived from status + chain + AppSettings.finalApprover). Inline Mail/Redirect/Edit icons with hover effects: Mail calls the new `resendNotification` callable Cloud Function (gated to controller+) that reuses `sendReviewerReminder` to ping the current step's reviewer; Redirect opens a modal that calls `resolveRoutingChain` so the chain re-evaluates from the new Route To role (clears stale approver state); Edit jumps to the form-page edit URL. Row-click vs button-click resolved via `target.closest("button")` guard.
- **FormView administrative actions (2026-05-11)**: controllers viewing a stuck submission they're not personally assigned to now see an "Administrative Actions" group with Redirect/Edit/Request Revisions/Deny. Previously the whole approval-actions block was hidden when the viewer wasn't in the chain.
- **Role-based routing chain (2026-05-11)**: replaces the old silent approver injection from the submitter's own title/building mapping. Route To user's role determines flow — supervisor (or higher) → 2-step; approver → 4-step where the approver's own `userProfile.supervisorEmail` provides the next step. New `resolveRoutingChain()` helper in `firestore.ts` + `RoutingChainPreview` component shown below the Route To input on all three forms (Mileage, Travel, Check Request), debounced 400ms, displays each step + flow type. `handleRedirect` in FormView now re-resolves the chain so redirecting to a supervisor clears any stale 4-step approver state. Sandbox: dropped the 2-step/4-step dropdown — flow follows the user's actual role. Firestore rule `/users/{uid}` read loosened to any authenticated user (needed for client-side resolution; signature URLs governed separately by Storage rules).
- **Commute deduction (2026-05-11, phases 1-4)**: admin-gated subtraction of the user's home↔school commute from working-day mileage on Mileage + Travel forms. Round-trip working-day trip deducts 2× commute; one-way trip deducts 1× commute, both capped at the trip's own miles (no negative). Existing submissions render exactly as before — math is frozen at submit time. Phase 1: Profile shows commute, cached on UserProfile with auto-invalidation when home/school addresses change. Phase 2: Mileage form per-trip Working day checkbox + totals breakdown (Total Miles → Less commute deduction → Reimbursable Miles → Rate → Total Reimbursement). Phase 3: Travel form carTrips with same toggle + breakdown + Final Claim meta. Phase 4: PDF mileage/travel deduction breakdown rows. FormDataView shows "Working" badge per row that contributed. Admin toggle in General Settings (`commuteDeductionEnabled`, default OFF).
- **Budget segment "Project" → "Program"** (2026-05-11): display-only rename across BudgetCodeBuilder + Admin segment label + CLAUDE.md format guide. Internal Firestore key stays `proj`, no migration needed.
- **Budget code maxLength fix (2026-05-11)**: input field's `maxLength={20}` was cutting off the last two chars of the 22-char `##-###-###-###-###-###` format. Bumped to 22 across all 4 input sites.
- **Dashboard URL→state mirror cleanup (2026-05-11)**: dropped redundant `useState`+`useEffect` pairs that mirrored search params into local state. Pre-empts the new `react-hooks/set-state-in-effect` rule from eslint-plugin-react-hooks 7 and makes the URL the single source of truth for tab/sub-view.
- **Dependabot batch (2026-05-11)**: merged the weekly minor-and-patch groups (root + functions). Closed eslint 10 / @eslint/js 10 PRs (blocked by eslint-plugin-react-hooks not yet supporting eslint 10).
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
