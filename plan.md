# PaperPal — Plan

## Current Phase: Workflow Mapping Overhaul

Rename "Supervisor Mappings" → **Workflow Mapping** and rebuild the admin UX. The current admin section (`Admin.tsx:1718–2565`) has two parallel subsections (Building Defaults + Title Overrides) with no inline editing, weak approver visibility, and brittle title management.

### Goals

1. **Rename**: "Supervisor Mappings" → "Workflow Mapping" everywhere (UI, admin tab label, code variable names where reasonable). Backing Firestore doc stays at `settings/supervisorMappings` (no migration).
2. **Inline edit**: every existing row should be editable in place — supervisor, approver, building/titles. No more delete-and-re-add.
3. **Clearer routing model**: each row visualizes the resolved chain (Staff → Approver? → Supervisor → Final Approver). Make precedence (title override > building default > profile fallback) visible from the UI.
4. **Approver as a first-class field**: not buried under "optional"; show pill/badge in the row so admins can scan which mappings have an approver step.
5. **Coverage gaps**: surface uncovered staff/buildings/titles inline, not in a separate collapsible. One uncovered row should be a one-click "add mapping" affordance.
6. **Consolidated add flow**: one "Add Mapping" button that asks "By Building" or "By Title" first, then drops into the same form fields. Less duplicate form code.
7. **Search/filter**: small search box that filters rows by staff name, supervisor, approver, building, or title. The list is small now but will grow.

### Concrete UI changes

- Header: "Workflow Mapping" with one-line summary ("X staff routed via Y mappings · Z uncovered")
- Single unified table/list of rows, with a "Type" column (Building / Title) so they can coexist visually but stay sortable/filterable
- Each row in collapsed mode: type badge · scope (building name or title list) · supervisor · approver pill (if any) · staff count · edit/delete icons
- Expanded edit mode (inline): change supervisor (UserSearchDropdown), change approver (UserSearchDropdown w/ "remove" option), edit building, add/remove titles
- Uncovered section condensed to one banner with chevron, e.g. "3 buildings + 12 titles uncovered" → expands

### Out of scope for this phase

- Firestore data model changes (keep `mappings[]` and `buildingMappings[]` arrays for now)
- Bulk import/export of mappings
- Per-form-type mappings (e.g. different supervisor for Travel vs Mileage)

### Files to touch

- `src/pages/Admin.tsx` — the SupervisorMappingsSection (~850 lines today; should shrink)
- `src/lib/types.ts` — keep types as-is, possibly rename interface aliases
- `src/lib/firestore.ts` — `resolveSupervisor()` logic stays unchanged
- Anywhere "Supervisor Mappings" copy appears (admin tab labels, settings titles)

## Future

- Notification preferences (user opt-in/out from profile)
- Reporting / analytics dashboard (totals, trends, approvals per month)
- FormView: respect form field config (hide hidden fields in read-only view)
- Light mode (requires refactoring inline styles to CSS variables)

## Done

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
