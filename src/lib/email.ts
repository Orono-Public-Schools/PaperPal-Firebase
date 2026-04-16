import { addDoc, collection, serverTimestamp } from "firebase/firestore"
import { db } from "./firebase"
import type { Submission, AppSettings } from "./types"

const FORM_LABELS: Record<string, string> = {
  check: "Check Request",
  mileage: "Mileage Reimbursement",
  travel: "Travel Reimbursement",
}

function formUrl(submission: Submission): string {
  return `${window.location.origin}/forms/${submission.formType}/${submission.id}`
}

function currency(amount: number): string {
  return `$${amount.toFixed(2)}`
}

function emailHtml({
  heading,
  body,
  link,
  linkLabel = "View Request",
}: {
  heading: string
  body: string
  link: string
  linkLabel?: string
}): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #1d2a5d 0%, #2d3f89 100%); padding: 28px 32px; border-radius: 12px 12px 0 0;">
        <table cellpadding="0" cellspacing="0" border="0" style="width: 100%;">
          <tr>
            <td style="vertical-align: middle; width: 40px;">
              <img src="https://paperpal-orono.web.app/orono-paperpal.png" alt="PaperPal" width="36" height="36" style="display: block; border-radius: 8px;" />
            </td>
            <td style="vertical-align: middle; padding-left: 12px;">
              <h1 style="color: white; font-size: 20px; margin: 0; font-weight: 700; letter-spacing: 0.5px;">PaperPal</h1>
              <p style="color: rgba(255,255,255,0.6); font-size: 11px; margin: 2px 0 0; letter-spacing: 0.3px;">Orono Public Schools</p>
            </td>
          </tr>
        </table>
      </div>
      <div style="background: #ffffff; padding: 28px 32px; border: 1px solid #e2e5ea; border-top: none;">
        <h2 style="color: #1d2a5d; font-size: 16px; margin: 0 0 16px; font-weight: 700;">${heading}</h2>
        <div style="color: #334155; font-size: 14px; line-height: 1.7;">${body}</div>
        <div style="margin-top: 28px;">
          <a href="${link}" style="display: inline-block; background: linear-gradient(135deg, #1d2a5d 0%, #2d3f89 100%); color: white; text-decoration: none; padding: 11px 28px; border-radius: 8px; font-size: 14px; font-weight: 600; letter-spacing: 0.3px;">${linkLabel}</a>
        </div>
      </div>
      <div style="background: #f8f9fb; padding: 16px 32px; border: 1px solid #e2e5ea; border-top: none; border-radius: 0 0 12px 12px;">
        <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0;">
          Orono Public Schools &middot; PaperPal &middot; Paperless expense forms
        </p>
      </div>
    </div>
  `
}

async function sendMail(to: string | string[], subject: string, html: string) {
  await addDoc(collection(db, "mail"), {
    to,
    message: { subject, html },
    createdAt: serverTimestamp(),
  })
}

// ─── On Submit: notify supervisor + receipt to submitter ─────────────────────

export async function sendSubmissionNotification(
  submission: Submission,
  settings: AppSettings
) {
  if (!settings.notifyOnSubmit || !submission.supervisorEmail) return

  const formLabel = FORM_LABELS[submission.formType] ?? "Request"

  // Notify supervisor
  const supervisorHtml = emailHtml({
    heading: `New ${formLabel} for Review`,
    body: `
      <p><strong>${submission.submitterName}</strong> submitted a ${formLabel.toLowerCase()} for <strong>${currency(submission.amount)}</strong>.</p>
      <p style="color: #64748b; font-size: 13px;">${submission.summary} &middot; ${submission.id}</p>
      <p>Please review and approve or deny this request.</p>
    `,
    link: formUrl(submission),
    linkLabel: "Review Request",
  })

  await sendMail(
    submission.supervisorEmail,
    `[PaperPal] ${formLabel} from ${submission.submitterName} — ${currency(submission.amount)}`,
    supervisorHtml
  )

  // Receipt to submitter
  const receiptHtml = emailHtml({
    heading: `Your ${formLabel} Has Been Submitted`,
    body: `
      <p>Your ${formLabel.toLowerCase()} for <strong>${currency(submission.amount)}</strong> has been submitted and is awaiting supervisor approval.</p>
      <p style="color: #64748b; font-size: 13px;">${submission.summary} &middot; ${submission.id}</p>
    `,
    link: formUrl(submission),
  })

  await sendMail(
    submission.submitterEmail,
    `[PaperPal] Submitted — ${formLabel} ${submission.id}`,
    receiptHtml
  )
}

// ─── On Supervisor Approve: notify final approver + submitter + supervisor confirmation ──

export async function sendReviewedNotification(
  submission: Submission,
  settings: AppSettings
) {
  if (!settings.notifyOnApproval) return

  const formLabel = FORM_LABELS[submission.formType] ?? "Request"

  // Notify final approver
  if (settings.finalApproverEmail) {
    const finalHtml = emailHtml({
      heading: `${formLabel} Awaiting Final Approval`,
      body: `
        <p>A ${formLabel.toLowerCase()} from <strong>${submission.submitterName}</strong> for <strong>${currency(submission.amount)}</strong> has been approved by their supervisor and is awaiting your final approval.</p>
        <p style="color: #64748b; font-size: 13px;">${submission.summary} &middot; ${submission.id}</p>
      `,
      link: formUrl(submission),
      linkLabel: "Review & Approve",
    })

    await sendMail(
      settings.finalApproverEmail,
      `[PaperPal] Final Approval Needed — ${formLabel} from ${submission.submitterName}`,
      finalHtml
    )
  }

  // Notify submitter that supervisor approved
  const submitterHtml = emailHtml({
    heading: `Your ${formLabel} Has Been Approved by Your Supervisor`,
    body: `
      <p>Your ${formLabel.toLowerCase()} for <strong>${currency(submission.amount)}</strong> has been approved by your supervisor and is now awaiting final approval.</p>
      <p style="color: #64748b; font-size: 13px;">${submission.summary} &middot; ${submission.id}</p>
    `,
    link: formUrl(submission),
  })

  await sendMail(
    submission.submitterEmail,
    `[PaperPal] Supervisor Approved — ${formLabel} ${submission.id}`,
    submitterHtml
  )

  // Confirmation to supervisor
  if (submission.supervisorEmail) {
    const confirmHtml = emailHtml({
      heading: `You Approved a ${formLabel}`,
      body: `
        <p>You approved <strong>${submission.submitterName}</strong>'s ${formLabel.toLowerCase()} for <strong>${currency(submission.amount)}</strong>. It has been forwarded to the final approver.</p>
        <p style="color: #64748b; font-size: 13px;">${submission.summary} &middot; ${submission.id}</p>
      `,
      link: formUrl(submission),
    })

    await sendMail(
      submission.supervisorEmail,
      `[PaperPal] You Approved — ${formLabel} ${submission.id}`,
      confirmHtml
    )
  }
}

// ─── On Final Approve: notify submitter + supervisor ─────────────────────────

export async function sendApprovalNotification(
  submission: Submission,
  settings: AppSettings
) {
  if (!settings.notifyOnApproval) return

  const formLabel = FORM_LABELS[submission.formType] ?? "Request"

  // Notify submitter
  const submitterHtml = emailHtml({
    heading: `Your ${formLabel} Has Been Fully Approved`,
    body: `
      <p>Your ${formLabel.toLowerCase()} for <strong>${currency(submission.amount)}</strong> has been fully approved and sent to the business office for processing.</p>
      <p style="color: #64748b; font-size: 13px;">${submission.summary} &middot; ${submission.id}</p>
    `,
    link: formUrl(submission),
  })

  await sendMail(
    submission.submitterEmail,
    `[PaperPal] Approved — ${formLabel} ${submission.id}`,
    submitterHtml
  )

  // Notify supervisor of final approval
  if (submission.supervisorEmail) {
    const supervisorHtml = emailHtml({
      heading: `${formLabel} Fully Approved`,
      body: `
        <p><strong>${submission.submitterName}</strong>'s ${formLabel.toLowerCase()} for <strong>${currency(submission.amount)}</strong> has received final approval and has been sent to the business office.</p>
        <p style="color: #64748b; font-size: 13px;">${submission.summary} &middot; ${submission.id}</p>
      `,
      link: formUrl(submission),
    })

    await sendMail(
      submission.supervisorEmail,
      `[PaperPal] Final Approval — ${formLabel} ${submission.id}`,
      supervisorHtml
    )
  }
}

// ─── On Deny: notify submitter ───────────────────────────────────────────────

export async function sendDenialNotification(
  submission: Submission,
  settings: AppSettings,
  comments: string
) {
  if (!settings.notifyOnDenial) return

  const formLabel = FORM_LABELS[submission.formType] ?? "Request"
  const html = emailHtml({
    heading: `Your ${formLabel} Was Denied`,
    body: `
      <p>Your ${formLabel.toLowerCase()} for <strong>${currency(submission.amount)}</strong> has been denied.</p>
      <div style="background: #fef2f2; border-left: 3px solid #ad2122; padding: 12px 16px; border-radius: 0 8px 8px 0; margin: 16px 0;">
        <p style="color: #ad2122; font-weight: 600; margin: 0 0 4px; font-size: 13px;">Reason</p>
        <p style="color: #334155; margin: 0;">${comments}</p>
      </div>
      <p style="color: #64748b; font-size: 13px;">${submission.summary} &middot; ${submission.id}</p>
    `,
    link: formUrl(submission),
  })

  await sendMail(
    submission.submitterEmail,
    `[PaperPal] Denied — ${formLabel} ${submission.id}`,
    html
  )
}

// ─── On Revisions Requested: notify submitter ────────────────────────────────

export async function sendRevisionNotification(
  submission: Submission,
  settings: AppSettings,
  comments: string
) {
  if (!settings.notifyOnRevision) return

  const formLabel = FORM_LABELS[submission.formType] ?? "Request"
  const html = emailHtml({
    heading: `Revisions Requested on Your ${formLabel}`,
    body: `
      <p>Your supervisor has requested changes to your ${formLabel.toLowerCase()} for <strong>${currency(submission.amount)}</strong>.</p>
      <div style="background: #eaecf5; border-left: 3px solid #4356a9; padding: 12px 16px; border-radius: 0 8px 8px 0; margin: 16px 0;">
        <p style="color: #4356a9; font-weight: 600; margin: 0 0 4px; font-size: 13px;">Requested Changes</p>
        <p style="color: #334155; margin: 0;">${comments}</p>
      </div>
      <p style="color: #64748b; font-size: 13px;">${submission.summary} &middot; ${submission.id}</p>
    `,
    link: formUrl(submission),
    linkLabel: "Edit & Resubmit",
  })

  await sendMail(
    submission.submitterEmail,
    `[PaperPal] Revisions Requested — ${formLabel} ${submission.id}`,
    html
  )
}
