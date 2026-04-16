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
      <div style="background: linear-gradient(135deg, #1d2a5d 0%, #2d3f89 100%); padding: 24px 32px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; font-size: 20px; margin: 0;">PaperPal</h1>
      </div>
      <div style="background: #ffffff; padding: 28px 32px; border: 1px solid #e2e5ea; border-top: none; border-radius: 0 0 12px 12px;">
        <h2 style="color: #1d2a5d; font-size: 16px; margin: 0 0 12px;">${heading}</h2>
        <div style="color: #334155; font-size: 14px; line-height: 1.6;">${body}</div>
        <div style="margin-top: 24px;">
          <a href="${link}" style="display: inline-block; background: linear-gradient(135deg, #1d2a5d 0%, #2d3f89 100%); color: white; text-decoration: none; padding: 10px 24px; border-radius: 8px; font-size: 14px; font-weight: 600;">${linkLabel}</a>
        </div>
      </div>
      <p style="color: #94a3b8; font-size: 11px; text-align: center; margin-top: 16px;">
        Orono Public Schools &middot; PaperPal
      </p>
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

export async function sendSubmissionNotification(
  submission: Submission,
  settings: AppSettings
) {
  if (!settings.notifyOnSubmit || !submission.supervisorEmail) return

  const formLabel = FORM_LABELS[submission.formType] ?? "Request"
  const html = emailHtml({
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
    html
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

export async function sendReviewedNotification(
  submission: Submission,
  settings: AppSettings
) {
  if (!settings.notifyOnApproval || !settings.finalApproverEmail) return

  const formLabel = FORM_LABELS[submission.formType] ?? "Request"
  const html = emailHtml({
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
    html
  )
}

export async function sendApprovalNotification(
  submission: Submission,
  settings: AppSettings
) {
  if (!settings.notifyOnApproval) return

  const formLabel = FORM_LABELS[submission.formType] ?? "Request"
  const html = emailHtml({
    heading: `Your ${formLabel} Has Been Approved`,
    body: `
      <p>Your ${formLabel.toLowerCase()} for <strong>${currency(submission.amount)}</strong> has been fully approved and sent to the business office for processing.</p>
      <p style="color: #64748b; font-size: 13px;">${submission.summary} &middot; ${submission.id}</p>
    `,
    link: formUrl(submission),
  })

  await sendMail(
    submission.submitterEmail,
    `[PaperPal] Approved — ${formLabel} ${submission.id}`,
    html
  )
}

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
      <div style="background: #fffbeb; border-left: 3px solid #b45309; padding: 12px 16px; border-radius: 0 8px 8px 0; margin: 16px 0;">
        <p style="color: #b45309; font-weight: 600; margin: 0 0 4px; font-size: 13px;">Requested Changes</p>
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
