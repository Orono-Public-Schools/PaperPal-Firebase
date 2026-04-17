# PaperPal — Plan

## Up Next

- Supervisor redirect
  - Supervisor can reassign a submission to a different supervisor/user
  - Dropdown to pick new supervisor (staff email autocomplete)
  - Updates supervisorEmail on the submission, resets to pending
  - Notification email sent to the new supervisor
  - Original supervisor gets a confirmation that it was reassigned

- Approval history / activity timeline
  - Timeline component in FormView showing all workflow events
  - Events: submitted, supervisor approved, final approved, denied, revisions requested, resubmitted, cancelled, redirected
  - Each entry: who, what action, when, comments (if any)
  - Store as an array on the submission (activityLog or expand revisionHistory)
  - Displayed between form data and approval actions in FormView

- Bug fix: resubmit broken
  - updateDoc() fails with "Unsupported field value: undefined" for reviewedAt
  - Cause: resubmit sets reviewedAt/approvedAt/etc to undefined, but Firestore rejects undefined
  - Fix: use deleteField() from firebase/firestore instead of undefined to clear fields

- Print & export
  - "Print" button on FormView — opens browser print dialog with clean print-friendly layout
  - "Download PDF" button on FormView — downloads the server-generated PDF
  - For approved submissions: download the final PDF (with all signatures) from Drive
  - For in-progress submissions: generate a PDF on-demand via callable Cloud Function
  - Print CSS: hide nav/header/actions, show only form data + signatures

## Done

- Resubmission flow
  - All 3 forms support ?resubmit=ID to load and edit existing submission
  - Updates existing submission, resets status to pending
  - Works from both pending (edit) and revisions_requested (edit & resubmit)
- Cancel request
  - Submitter can cancel pending or revisions_requested submissions
  - Confirmation dialog, sets status to cancelled
  - Firestore rules updated to allow submitter edits on pending status
- Server-side email with PDF attachments
  - All notifications moved to Cloud Functions (onSubmissionCreated + onSubmissionStatusChange)
  - PDF generated at each status change, attached to every email
  - Submitter gets: receipt, supervisor approved, final approved
  - Supervisor gets: new request, approval confirmation, final approved
  - Final approver gets: awaiting approval notification
- Google Drive integration + PDF generation
  - Shared Drive structure: Paperless Forms → FY folders → month folders
  - "2026 FY" naming convention for fiscal year folders
  - Auto-create folders + log sheet on first approval or via admin button
  - Setup Drive Structure admin button creates all 12 months + log sheet
  - Fiscal year rollover scheduled function (July 1)
  - PDF uploaded to correct month folder on final approval
  - Row appended to fiscal year log sheet
  - pdfDriveId + pdfDriveUrl stored on submission
- Firebase Trigger Email extension
  - Configured for mail collection, sender paperpal@orono.k12.mn.us
  - Gmail SMTP with app password
- Budget code workflow
  - Greyed out for staff users on all 3 forms
  - Supervisor assigns budget code during approval review
  - BudgetCodeBuilder available in supervisor approval section
- UI polish
  - Review buttons: Orono brand colors + hover effects (CSS classes)
  - Status badges: Orono palette across FormView + Dashboard
  - Success banner: lighter blue gradient with white text
  - Email template: PaperPal logo, branded header, footer bar
  - Chrome autofill suppression on address fields
  - Dynamic PDF table rows for long addresses
  - PR template for GitHub
  - CI actions bumped to v6
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
