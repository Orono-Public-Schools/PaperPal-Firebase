---
name: approval-flow
description: PaperPal approval workflow reference — statuses, roles, routing logic, email triggers, and the full approval chain. Use when modifying the approval flow, debugging routing, or adding workflow features.
---

# Approval Workflow

## Status Flow

```
Without approver (2-step):
  pending → reviewed → approved → paid

With approver (4-step):
  pending → approved_by_approver → reviewed → approved → paid

Any step can also → denied, revisions_requested, or cancelled
Revisions → resubmit → back to pending
```

## Statuses

| Status | Meaning | Who acts next |
|--------|---------|---------------|
| `pending` | Awaiting first review | Approver (if mapped) or Supervisor |
| `approved_by_approver` | Approver approved | Supervisor |
| `reviewed` | Supervisor approved | Final Approver (Controller) |
| `approved` | Fully approved | Controller+ can mark as paid |
| `paid` | Payment processed | Terminal |
| `denied` | Rejected at any step | Submitter notified |
| `revisions_requested` | Changes needed | Submitter can edit & resubmit |
| `cancelled` | Submitter cancelled | Terminal |

## Roles (by access level)

| Role | Budget Codes | Admin Panel | Can Approve | Can Mark Paid |
|------|-------------|-------------|-------------|---------------|
| `staff` | No (greyed out) | No | No | No |
| `approver` | Yes | No | As approver | No |
| `supervisor` | Yes | No | As supervisor | No |
| `business_office` | Yes | Yes | As assigned | Yes |
| `controller` | Yes | Yes | As final approver | Yes |
| `admin` | Yes | Yes (full) | As assigned | Yes |

## Routing Logic (`resolveSupervisor()` in `firestore.ts`)

1. Look up submitter's staff record by email → get their `title` and `building`
2. Check **title overrides** in `settings/supervisorMappings.mappings[]` — if title matches, use that mapping's `supervisorEmail` (and optional `approverEmail`)
3. Fallback: check **building defaults** in `settings/supervisorMappings.buildingMappings[]` — if building matches, use that mapping's `supervisorEmail` (and optional `approverEmail`)
4. If no match, returns `null` (form uses the user's `userProfile.supervisorEmail`)

## Submission Fields

| Field | Set when | Purpose |
|-------|----------|---------|
| `supervisorEmail` | On submit | Who reviews (from Route To field or mapping) |
| `approverEmail` | On submit (optional) | Intermediate approver (from mapping) |
| `approverName` | On approver approval | Approver's display name |
| `approverSignatureUrl` | On approver approval | Approver's signature |
| `supervisorName` | On supervisor approval | Supervisor's display name |
| `supervisorSignatureUrl` | On supervisor approval | Supervisor's signature |
| `finalApproverEmail` | On final approval | Controller's email |
| `finalApproverSignatureUrl` | On final approval | Controller's signature |
| `paidAt` | On mark as paid | Payment timestamp |
| `paidBy` | On mark as paid | Who marked it paid |

## Permission Checks (FormView.tsx)

```ts
isApprover = submission.approverEmail && email === submission.approverEmail
isSupervisor = email === submission.supervisorEmail
isFinalApprover = email === settings.finalApproverEmail
isControllerOrAbove = ["controller", "business_office", "admin"].includes(role)

canApproverAct = isApprover && status === "pending"
canSupervisorAct = isSupervisor && (hasApprover ? status === "approved_by_approver" : status === "pending")
canFinalApproverAct = isFinalApprover && status === "reviewed"
canMarkPaid = isControllerOrAbove && status === "approved"
```

## Email Triggers (Cloud Functions)

| Status Change | Email To | Function |
|--------------|----------|----------|
| New submission | Approver (or Supervisor) + Submitter | `sendSubmitEmails` |
| `approved_by_approver` | Supervisor + Submitter | `sendApproverApprovedEmails` |
| `reviewed` | Final Approver + Submitter + Supervisor | `sendReviewedEmails` |
| `approved` | Submitter + Drive upload + Log sheet | `sendApprovedEmails` |
| `paid` | Submitter | `sendPaidEmails` |
| `denied` | Submitter | `sendDeniedEmails` |
| `revisions_requested` | Submitter | `sendRevisionsEmails` |
| Resubmitted | Approver (or Supervisor) + Submitter | `sendResubmittedEmails` |
| Redirected | New Supervisor + Previous Supervisor | `sendRedirectedEmails` |

## Sandbox Mode

- `supervisorEmail` overridden to submitter's own email
- `approverEmail` overridden to submitter's own email (if approver step selected)
- All notification emails go to submitter only (`sandboxTo()` helper)
- No Drive uploads or log sheet entries
- Forms show "Approval Flow (Sandbox)" dropdown: 2-step or 4-step
- Submissions tagged with `sandbox: true`

## Key Files

| File | What |
|------|------|
| `src/lib/types.ts` | `SubmissionStatus`, `ActivityAction`, `Submission` interface |
| `src/lib/firestore.ts` | `resolveSupervisor()`, approval queries |
| `src/pages/FormView.tsx` | Approval UI, permission checks, action handlers |
| `src/pages/Dashboard.tsx` | Status styles, Approvals tab (Pending/Completed) |
| `functions/index.js` | Status change triggers |
| `functions/helpers/email.js` | Email sending functions |
| `functions/helpers/pdf.js` | PDF generation with signatures |
