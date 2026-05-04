const { getFirestore, FieldValue } = require("firebase-admin/firestore")

const APP_URL = "https://paperpal-orono.web.app"
const LOGO_URL = "https://paperpal-orono.web.app/orono-paperpal.png"

const FORM_LABELS = {
  check: "Check Request",
  mileage: "Mileage Reimbursement",
  travel: "Travel Reimbursement",
}

function formUrl(submission) {
  const base = `${APP_URL}/forms/${submission.formType}/${submission.id}`
  return submission.sandbox ? `${base}?sandbox=true` : base
}

function currency(n) {
  return `$${Number(n || 0).toFixed(2)}`
}

function emailHtml({ heading, body, link, linkLabel = "View Request" }) {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #1d2a5d 0%, #2d3f89 100%); padding: 28px 32px; border-radius: 12px 12px 0 0;">
        <table cellpadding="0" cellspacing="0" border="0" style="width: 100%;">
          <tr>
            <td style="vertical-align: middle; width: 40px;">
              <img src="${LOGO_URL}" alt="PaperPal" width="36" height="36" style="display: block; border-radius: 8px;" />
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

// In sandbox mode, redirect all emails to the submitter
function sandboxTo(submission, originalTo) {
  if (!submission.sandbox) return originalTo
  return submission.submitterEmail
}

async function sendMail(to, subject, html, pdfBuffer, pdfFilename) {
  const db = getFirestore()
  const doc = {
    to,
    message: { subject, html },
    createdAt: FieldValue.serverTimestamp(),
  }

  if (pdfBuffer && pdfFilename) {
    doc.message.attachments = [
      {
        filename: pdfFilename,
        content: pdfBuffer.toString("base64"),
        encoding: "base64",
        contentType: "application/pdf",
      },
    ]
  }

  await db.collection("mail").add(doc)
}

function pdfFilename(submission) {
  const lastName = (submission.submitterName || "Unknown").split(" ").pop()
  return `${FORM_LABELS[submission.formType] || "Request"} - ${submission.id} - ${lastName}.pdf`
}

// ─── On Submit (pending) ─────────────────────────────────────────────────────

async function sendSubmitEmails(submission, settings, pdfBuffer) {
  const formLabel = FORM_LABELS[submission.formType] || "Request"
  const fname = pdfFilename(submission)
  const link = formUrl(submission)
  const tag = submission.sandbox ? "[SANDBOX] " : ""

  if (!settings.notifyOnSubmit) return

  // Send review notification to approver (if exists) or supervisor
  const reviewerEmail = submission.approverEmail || submission.supervisorEmail
  const reviewerRole = submission.approverEmail ? "approver" : "supervisor"
  if (reviewerEmail) {
    await sendMail(
      sandboxTo(submission, reviewerEmail),
      `${tag}[PaperPal] ${formLabel} from ${submission.submitterName} — ${currency(submission.amount)}`,
      emailHtml({
        heading: `New ${formLabel} for Review`,
        body: `
          <p><strong>${submission.submitterName}</strong> submitted a ${formLabel.toLowerCase()} for <strong>${currency(submission.amount)}</strong>.</p>
          <p style="color: #64748b; font-size: 13px;">${submission.summary} &middot; ${submission.id}</p>
          <p>Please review and approve or deny this request.</p>
        `,
        link,
        linkLabel: "Review Request",
      }),
      pdfBuffer,
      fname
    )
  }

  // Receipt to submitter
  const awaitingLabel = submission.approverEmail ? "approver" : "supervisor"
  await sendMail(
    submission.submitterEmail,
    `${tag}[PaperPal] Submitted — ${formLabel} ${submission.id}`,
    emailHtml({
      heading: `Your ${formLabel} Has Been Submitted`,
      body: `
        <p>Your ${formLabel.toLowerCase()} for <strong>${currency(submission.amount)}</strong> has been submitted and is awaiting ${awaitingLabel} approval.</p>
        <p style="color: #64748b; font-size: 13px;">${submission.summary} &middot; ${submission.id}</p>
      `,
      link,
    }),
    pdfBuffer,
    fname
  )
}

// ─── On Supervisor Approve (reviewed) ────────────────────────────────────────

async function sendReviewedEmails(submission, settings, pdfBuffer) {
  const formLabel = FORM_LABELS[submission.formType] || "Request"
  const fname = pdfFilename(submission)
  const link = formUrl(submission)
  const tag = submission.sandbox ? "[SANDBOX] " : ""

  if (!settings.notifyOnApproval) return

  // Final approver
  if (settings.finalApproverEmail) {
    await sendMail(
      sandboxTo(submission, settings.finalApproverEmail),
      `${tag}[PaperPal] Final Approval Needed — ${formLabel} from ${submission.submitterName}`,
      emailHtml({
        heading: `${formLabel} Awaiting Final Approval`,
        body: `
          <p>A ${formLabel.toLowerCase()} from <strong>${submission.submitterName}</strong> for <strong>${currency(submission.amount)}</strong> has been approved by their supervisor and is awaiting your final approval.</p>
          <p style="color: #64748b; font-size: 13px;">${submission.summary} &middot; ${submission.id}</p>
        `,
        link,
        linkLabel: "Review & Approve",
      }),
      pdfBuffer,
      fname
    )
  }

  // Submitter — supervisor approved
  await sendMail(
    submission.submitterEmail,
    `${tag}[PaperPal] Supervisor Approved — ${formLabel} ${submission.id}`,
    emailHtml({
      heading: `Your ${formLabel} Has Been Approved by Your Supervisor`,
      body: `
        <p>Your ${formLabel.toLowerCase()} for <strong>${currency(submission.amount)}</strong> has been approved by your supervisor and is now awaiting final approval.</p>
        <p style="color: #64748b; font-size: 13px;">${submission.summary} &middot; ${submission.id}</p>
      `,
      link,
    }),
    pdfBuffer,
    fname
  )

  // Supervisor confirmation
  if (submission.supervisorEmail) {
    await sendMail(
      sandboxTo(submission, submission.supervisorEmail),
      `${tag}[PaperPal] You Approved — ${formLabel} ${submission.id}`,
      emailHtml({
        heading: `You Approved a ${formLabel}`,
        body: `
          <p>You approved <strong>${submission.submitterName}</strong>'s ${formLabel.toLowerCase()} for <strong>${currency(submission.amount)}</strong>. It has been forwarded to the final approver.</p>
          <p style="color: #64748b; font-size: 13px;">${submission.summary} &middot; ${submission.id}</p>
        `,
        link,
      }),
      pdfBuffer,
      fname
    )
  }
}

// ─── On Final Approve (approved) ─────────────────────────────────────────────

async function sendApprovedEmails(submission, settings, pdfBuffer) {
  const formLabel = FORM_LABELS[submission.formType] || "Request"
  const fname = pdfFilename(submission)
  const link = formUrl(submission)
  const tag = submission.sandbox ? "[SANDBOX] " : ""

  if (!settings.notifyOnApproval) return

  // Submitter
  await sendMail(
    submission.submitterEmail,
    `${tag}[PaperPal] Approved — ${formLabel} ${submission.id}`,
    emailHtml({
      heading: `Your ${formLabel} Has Been Fully Approved`,
      body: `
        <p>Your ${formLabel.toLowerCase()} for <strong>${currency(submission.amount)}</strong> has been fully approved and sent to the business office for processing.</p>
        <p style="color: #64748b; font-size: 13px;">${submission.summary} &middot; ${submission.id}</p>
      `,
      link,
    }),
    pdfBuffer,
    fname
  )

  // Supervisor
  if (submission.supervisorEmail) {
    await sendMail(
      sandboxTo(submission, submission.supervisorEmail),
      `${tag}[PaperPal] Final Approval — ${formLabel} ${submission.id}`,
      emailHtml({
        heading: `${formLabel} Fully Approved`,
        body: `
          <p><strong>${submission.submitterName}</strong>'s ${formLabel.toLowerCase()} for <strong>${currency(submission.amount)}</strong> has received final approval and has been sent to the business office.</p>
          <p style="color: #64748b; font-size: 13px;">${submission.summary} &middot; ${submission.id}</p>
        `,
        link,
      }),
      pdfBuffer,
      fname
    )
  }
}

// ─── On Deny ─────────────────────────────────────────────────────────────────

async function sendDeniedEmails(submission, settings, pdfBuffer) {
  const formLabel = FORM_LABELS[submission.formType] || "Request"
  const fname = pdfFilename(submission)
  const link = formUrl(submission)
  const tag = submission.sandbox ? "[SANDBOX] " : ""

  if (!settings.notifyOnDenial) return

  await sendMail(
    submission.submitterEmail,
    `${tag}[PaperPal] Denied — ${formLabel} ${submission.id}`,
    emailHtml({
      heading: `Your ${formLabel} Was Denied`,
      body: `
        <p>Your ${formLabel.toLowerCase()} for <strong>${currency(submission.amount)}</strong> has been denied.</p>
        <div style="background: #fef2f2; border-left: 3px solid #ad2122; padding: 12px 16px; border-radius: 0 8px 8px 0; margin: 16px 0;">
          <p style="color: #ad2122; font-weight: 600; margin: 0 0 4px; font-size: 13px;">Reason</p>
          <p style="color: #334155; margin: 0;">${submission.denialComments || ""}</p>
        </div>
        <p style="color: #64748b; font-size: 13px;">${submission.summary} &middot; ${submission.id}</p>
      `,
      link,
    }),
    pdfBuffer,
    fname
  )
}

// ─── On Revisions Requested ──────────────────────────────────────────────────

async function sendRevisionsEmails(submission, settings, pdfBuffer) {
  const formLabel = FORM_LABELS[submission.formType] || "Request"
  const fname = pdfFilename(submission)
  const link = formUrl(submission)
  const tag = submission.sandbox ? "[SANDBOX] " : ""

  if (!settings.notifyOnRevision) return

  await sendMail(
    submission.submitterEmail,
    `${tag}[PaperPal] Revisions Requested — ${formLabel} ${submission.id}`,
    emailHtml({
      heading: `Revisions Requested on Your ${formLabel}`,
      body: `
        <p>Your supervisor has requested changes to your ${formLabel.toLowerCase()} for <strong>${currency(submission.amount)}</strong>.</p>
        <div style="background: #eaecf5; border-left: 3px solid #4356a9; padding: 12px 16px; border-radius: 0 8px 8px 0; margin: 16px 0;">
          <p style="color: #4356a9; font-weight: 600; margin: 0 0 4px; font-size: 13px;">Requested Changes</p>
          <p style="color: #334155; margin: 0;">${submission.revisionComments || ""}</p>
        </div>
        <p style="color: #64748b; font-size: 13px;">${submission.summary} &middot; ${submission.id}</p>
      `,
      link,
      linkLabel: "Edit & Resubmit",
    }),
    pdfBuffer,
    fname
  )
}

// ─── On Resubmit (revisions_requested → pending) ────────────────────────────

async function sendResubmittedEmails(submission, settings, pdfBuffer) {
  const formLabel = FORM_LABELS[submission.formType] || "Request"
  const fname = pdfFilename(submission)
  const link = formUrl(submission)
  const tag = submission.sandbox ? "[SANDBOX] " : ""

  if (!settings.notifyOnSubmit) return

  // Send to approver (if exists) or supervisor
  const reviewerEmail = submission.approverEmail || submission.supervisorEmail
  if (reviewerEmail) {
    await sendMail(
      sandboxTo(submission, reviewerEmail),
      `${tag}[PaperPal] Resubmitted — ${formLabel} from ${submission.submitterName}`,
      emailHtml({
        heading: `${formLabel} Resubmitted for Review`,
        body: `
          <p><strong>${submission.submitterName}</strong> has revised and resubmitted their ${formLabel.toLowerCase()} for <strong>${currency(submission.amount)}</strong>.</p>
          <p style="color: #64748b; font-size: 13px;">${submission.summary} &middot; ${submission.id}</p>
          <p>Please review the updated request.</p>
        `,
        link,
        linkLabel: "Review Request",
      }),
      pdfBuffer,
      fname
    )
  }

  // Receipt to submitter
  const awaitingLabel = submission.approverEmail ? "approver" : "supervisor"
  await sendMail(
    submission.submitterEmail,
    `${tag}[PaperPal] Resubmitted — ${formLabel} ${submission.id}`,
    emailHtml({
      heading: `Your ${formLabel} Has Been Resubmitted`,
      body: `
        <p>Your revised ${formLabel.toLowerCase()} for <strong>${currency(submission.amount)}</strong> has been resubmitted and is awaiting ${awaitingLabel} approval.</p>
        <p style="color: #64748b; font-size: 13px;">${submission.summary} &middot; ${submission.id}</p>
      `,
      link,
    }),
    pdfBuffer,
    fname
  )
}

// ─── On Redirect (supervisor reassigned) ────────────────────────────────────

async function sendRedirectedEmails(
  submission,
  settings,
  previousSupervisorEmail,
  pdfBuffer
) {
  const formLabel = FORM_LABELS[submission.formType] || "Request"
  const fname = pdfFilename(submission)
  const link = formUrl(submission)
  const tag = submission.sandbox ? "[SANDBOX] " : ""

  // New supervisor notification
  if (submission.supervisorEmail) {
    await sendMail(
      sandboxTo(submission, submission.supervisorEmail),
      `${tag}[PaperPal] ${formLabel} Redirected to You — ${submission.submitterName}`,
      emailHtml({
        heading: `${formLabel} Redirected to You for Review`,
        body: `
          <p>A ${formLabel.toLowerCase()} from <strong>${submission.submitterName}</strong> for <strong>${currency(submission.amount)}</strong> has been redirected to you for review.</p>
          <p style="color: #64748b; font-size: 13px;">${submission.summary} &middot; ${submission.id}</p>
          <p>Please review and approve or deny this request.</p>
        `,
        link,
        linkLabel: "Review Request",
      }),
      pdfBuffer,
      fname
    )
  }

  // Confirmation to previous supervisor
  if (previousSupervisorEmail) {
    await sendMail(
      sandboxTo(submission, previousSupervisorEmail),
      `${tag}[PaperPal] Redirected — ${formLabel} ${submission.id}`,
      emailHtml({
        heading: `${formLabel} Redirected`,
        body: `
          <p>You redirected <strong>${submission.submitterName}</strong>'s ${formLabel.toLowerCase()} for <strong>${currency(submission.amount)}</strong> to <strong>${submission.supervisorEmail}</strong>.</p>
          <p style="color: #64748b; font-size: 13px;">${submission.summary} &middot; ${submission.id}</p>
        `,
        link,
      }),
      pdfBuffer,
      fname
    )
  }
}

// ─── On Returned to Supervisor (controller sends back) ────────────────────

async function sendReturnedToSupervisorEmails(submission, settings, pdfBuffer) {
  const formLabel = FORM_LABELS[submission.formType] || "Request"
  const fname = pdfFilename(submission)
  const link = formUrl(submission)
  const tag = submission.sandbox ? "[SANDBOX] " : ""
  const note = submission.revisionComments || ""

  if (submission.supervisorEmail) {
    await sendMail(
      sandboxTo(submission, submission.supervisorEmail),
      `${tag}[PaperPal] ${formLabel} Returned to You — ${submission.submitterName}`,
      emailHtml({
        heading: `${formLabel} Returned for Your Review`,
        body: `
          <p>The controller has returned <strong>${submission.submitterName}</strong>'s ${formLabel.toLowerCase()} for <strong>${currency(submission.amount)}</strong> back to you for further review.</p>
          <p style="color: #64748b; font-size: 13px;">${submission.summary} &middot; ${submission.id}</p>
          ${note ? `<div style="background: #f8f9fb; border-left: 3px solid #c2410c; padding: 12px 16px; margin: 16px 0; border-radius: 4px;"><p style="margin: 0; color: #334155; font-size: 13px;"><strong>Note from controller:</strong></p><p style="margin: 6px 0 0; color: #334155; font-size: 13px;">${note}</p></div>` : ""}
          <p>Please review, edit if needed, and re-approve.</p>
        `,
        link,
        linkLabel: "Review Request",
      }),
      pdfBuffer,
      fname
    )
  }
}

// ─── On Approver Approve (approved_by_approver) ────────────────────────────

async function sendApproverApprovedEmails(submission, settings, pdfBuffer) {
  const formLabel = FORM_LABELS[submission.formType] || "Request"
  const fname = pdfFilename(submission)
  const link = formUrl(submission)
  const tag = submission.sandbox ? "[SANDBOX] " : ""

  // Notify supervisor — it's now their turn
  if (submission.supervisorEmail) {
    await sendMail(
      sandboxTo(submission, submission.supervisorEmail),
      `${tag}[PaperPal] ${formLabel} from ${submission.submitterName} — Approver Approved`,
      emailHtml({
        heading: `${formLabel} Ready for Supervisor Review`,
        body: `
          <p><strong>${submission.submitterName}</strong>'s ${formLabel.toLowerCase()} for <strong>${currency(submission.amount)}</strong> has been approved by ${submission.approverName || "the approver"} and is now ready for your review.</p>
          <p style="color: #64748b; font-size: 13px;">${submission.summary} &middot; ${submission.id}</p>
          <p>Please review and approve or deny this request.</p>
        `,
        link,
        linkLabel: "Review Request",
      }),
      pdfBuffer,
      fname
    )
  }

  // Confirmation to submitter
  await sendMail(
    submission.submitterEmail,
    `${tag}[PaperPal] Approver Approved — ${formLabel} ${submission.id}`,
    emailHtml({
      heading: `Your ${formLabel} Has Been Approved by ${submission.approverName || "Approver"}`,
      body: `
        <p>Your ${formLabel.toLowerCase()} for <strong>${currency(submission.amount)}</strong> has been approved and forwarded to your supervisor for review.</p>
        <p style="color: #64748b; font-size: 13px;">${submission.summary} &middot; ${submission.id}</p>
      `,
      link,
    }),
    pdfBuffer,
    fname
  )
}

// ─── On Paid (approved → paid) ──────────────────────────────────────────────

async function sendPaidEmails(submission, settings, pdfBuffer) {
  const formLabel = FORM_LABELS[submission.formType] || "Request"
  const fname = pdfFilename(submission)
  const link = formUrl(submission)
  const tag = submission.sandbox ? "[SANDBOX] " : ""

  await sendMail(
    submission.submitterEmail,
    `${tag}[PaperPal] Paid — ${formLabel} ${submission.id}`,
    emailHtml({
      heading: `Your ${formLabel} Has Been Paid`,
      body: `
        <p>Your ${formLabel.toLowerCase()} for <strong>${currency(submission.amount)}</strong> has been processed and marked as paid.</p>
        <p style="color: #64748b; font-size: 13px;">${submission.summary} &middot; ${submission.id}</p>
      `,
      link,
    }),
    pdfBuffer,
    fname
  )
}

module.exports = {
  sendSubmitEmails,
  sendReviewedEmails,
  sendApprovedEmails,
  sendDeniedEmails,
  sendRevisionsEmails,
  sendResubmittedEmails,
  sendRedirectedEmails,
  sendApproverApprovedEmails,
  sendPaidEmails,
  sendReturnedToSupervisorEmails,
}
