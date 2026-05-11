import { useState, useEffect, useRef } from "react"
import { useParams, useNavigate } from "react-router"
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  RotateCcw,
  Clock,
  Shield,
  FileText,
  Car,
  Briefcase,
  Loader2,
  ArrowRightLeft,
  Printer,
  Download,
  Pencil,
} from "lucide-react"
import AppLayout from "@/components/layout/AppLayout"
import SignatureField, {
  type SignatureFieldRef,
} from "@/components/forms/SignatureField"
import BudgetCodeBuilder from "@/components/forms/BudgetCodeBuilder"
import StaffEmailAutocomplete from "@/components/forms/StaffEmailAutocomplete"
import { formatBudgetCode } from "@/lib/utils"
import { useAuth } from "@/hooks/useAuth"
import {
  getSubmission,
  updateSubmission,
  getAppSettings,
  resolveRoutingChain,
} from "@/lib/firestore"
import type {
  Submission,
  AppSettings,
  SubmissionStatus,
  ActivityLogEntry,
} from "@/lib/types"
import {
  serverTimestamp,
  Timestamp,
  arrayUnion,
  deleteField,
} from "firebase/firestore"
import { httpsCallable } from "firebase/functions"
import { functions } from "@/lib/firebase"
import {
  CheckRequestView,
  MileageView,
  TravelView,
} from "@/components/forms/FormDataView"
import type { CheckRequestData, MileageData, TravelData } from "@/lib/types"

const STATUS_CONFIG: Record<
  SubmissionStatus,
  { label: string; bg: string; color: string; icon: typeof Clock }
> = {
  pending: {
    label: "Pending Review",
    bg: "rgba(67,86,169,0.12)",
    color: "#4356a9",
    icon: Clock,
  },
  approved_by_approver: {
    label: "Approver Approved",
    bg: "rgba(56,74,151,0.12)",
    color: "#384a97",
    icon: Shield,
  },
  reviewed: {
    label: "Awaiting Final Approval",
    bg: "rgba(45,63,137,0.12)",
    color: "#2d3f89",
    icon: Shield,
  },
  approved: {
    label: "Approved",
    bg: "rgba(29,42,93,0.12)",
    color: "#1d2a5d",
    icon: CheckCircle,
  },
  paid: {
    label: "Paid",
    bg: "rgba(5,150,105,0.12)",
    color: "#059669",
    icon: CheckCircle,
  },
  denied: {
    label: "Denied",
    bg: "rgba(173,33,34,0.12)",
    color: "#ad2122",
    icon: XCircle,
  },
  revisions_requested: {
    label: "Revisions Requested",
    bg: "rgba(67,86,169,0.12)",
    color: "#4356a9",
    icon: RotateCcw,
  },
  cancelled: {
    label: "Cancelled",
    bg: "rgba(148,163,184,0.12)",
    color: "#64748b",
    icon: XCircle,
  },
}

const FORM_ICONS: Record<string, typeof FileText> = {
  check: FileText,
  mileage: Car,
  travel: Briefcase,
}

const FORM_LABELS: Record<string, string> = {
  check: "Check Request",
  mileage: "Mileage Reimbursement",
  travel: "Travel Reimbursement",
}

type ActionMode =
  | null
  | "approve"
  | "deny"
  | "revisions"
  | "redirect"
  | "return_to_supervisor"

export default function FormView() {
  const { id } = useParams<{ type: string; id: string }>()
  const navigate = useNavigate()
  const { userProfile } = useAuth()
  const signatureRef = useRef<SignatureFieldRef>(null)

  const [submission, setSubmission] = useState<Submission | null>(null)
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionMode, setActionMode] = useState<ActionMode>(null)
  const [comments, setComments] = useState("")
  const [acting, setActing] = useState(false)
  const [actionDone, setActionDone] = useState<string | null>(null)
  const [budgetCode, setBudgetCode] = useState("")
  const [redirectEmail, setRedirectEmail] = useState("")
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    if (!id) return
    Promise.all([getSubmission(id), getAppSettings()]).then(([s, a]) => {
      setSubmission(s)
      setSettings(a)
      setLoading(false)
    })
  }, [id])

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2
            size={24}
            className="animate-spin"
            style={{ color: "#64748b" }}
          />
        </div>
      </AppLayout>
    )
  }

  if (!submission) {
    return (
      <AppLayout>
        <div className="py-20 text-center">
          <p className="text-lg font-semibold" style={{ color: "#1d2a5d" }}>
            Submission not found
          </p>
          <p className="mt-1 text-sm" style={{ color: "#64748b" }}>
            {id} does not exist or you don&apos;t have access.
          </p>
          <button
            onClick={() => navigate("/")}
            className="mt-4 cursor-pointer text-sm font-medium"
            style={{ color: "#4356a9" }}
          >
            Back to Dashboard
          </button>
        </div>
      </AppLayout>
    )
  }

  const email = userProfile?.email?.toLowerCase() ?? ""
  const isApprover =
    !!submission.approverEmail &&
    email === submission.approverEmail.toLowerCase()
  const isSupervisor = email === submission.supervisorEmail?.toLowerCase()
  const isFinalApprover = email === settings?.finalApproverEmail?.toLowerCase()
  const isSubmitter = userProfile?.uid === submission.submitterUid

  const canApproverAct = isApprover && submission.status === "pending"
  const canSupervisorAct =
    isSupervisor &&
    (submission.approverEmail
      ? submission.status === "approved_by_approver"
      : submission.status === "pending")
  const canFinalApproverAct =
    isFinalApprover && submission.status === "reviewed"

  const isControllerOrAbove = [
    "controller",
    "business_office",
    "admin",
  ].includes(userProfile?.role ?? "")
  const canMarkPaid = isControllerOrAbove && submission.status === "approved"
  const canUnmarkPaid = isControllerOrAbove && submission.status === "paid"

  const isInFlight = [
    "pending",
    "approved_by_approver",
    "reviewed",
    "revisions_requested",
  ].includes(submission.status)
  const canControllerOverride =
    isControllerOrAbove &&
    isInFlight &&
    !canApproverAct &&
    !canSupervisorAct &&
    !canFinalApproverAct

  // Whether the submission is missing any budget code the approver might need
  // to fill in. If everything's set, the approve form skips prompting for it.
  const needsBudgetCode = (() => {
    if (submission.formType === "check") {
      const fd = submission.formData as CheckRequestData
      return fd.expenses.some((e) => !e.code?.trim())
    }
    if (submission.formType === "mileage") {
      return !(submission.formData as MileageData).accountCode?.trim()
    }
    if (submission.formType === "travel") {
      return !(submission.formData as TravelData).accountCode?.trim()
    }
    return false
  })()

  const statusCfg = STATUS_CONFIG[submission.status]
  const StatusIcon = statusCfg.icon
  const FormIcon = FORM_ICONS[submission.formType] ?? FileText
  const formLabel = FORM_LABELS[submission.formType] ?? "Request"

  async function handleApproveAsApprover() {
    if (!submission || !settings) return
    const sig = signatureRef.current?.getDataUrl() ?? ""
    setActing(true)

    const update: Record<string, unknown> = {
      status: "approved_by_approver",
      approverSignatureUrl: sig,
      approverName: userProfile?.fullName ?? email,
      activityLog: arrayUnion({
        action: "approver_approved",
        by: email,
        at: Timestamp.now(),
      }),
    }

    if (budgetCode.trim()) {
      const fd = { ...submission.formData }
      if (submission.formType === "check") {
        const expenses = (fd as CheckRequestData).expenses.map((exp) => ({
          ...exp,
          code: exp.code || budgetCode.trim(),
        }))
        update["formData.expenses"] = expenses
      } else {
        update["formData.accountCode"] = budgetCode.trim()
      }
    }

    await updateSubmission(submission.id, update)
    const updated = {
      ...submission,
      status: "approved_by_approver" as SubmissionStatus,
    }
    setSubmission(updated)
    setActionMode(null)
    setActing(false)
    setActionDone("Approved — sent to supervisor for review")
  }

  async function handleApproveAsSupervisor() {
    if (!submission || !settings) return
    const sig = signatureRef.current?.getDataUrl() ?? ""
    setActing(true)

    // Build update with budget code if provided
    const update: Record<string, unknown> = {
      status: "reviewed",
      supervisorSignatureUrl: sig,
      supervisorName: userProfile?.fullName ?? email,
      reviewedAt: serverTimestamp() as never,
      activityLog: arrayUnion({
        action: "supervisor_approved",
        by: email,
        at: Timestamp.now(),
      }),
    }

    if (budgetCode.trim()) {
      const fd = { ...submission.formData }
      if (submission.formType === "check") {
        // Apply to all expense lines that don't have a code
        const expenses = (fd as CheckRequestData).expenses.map((exp) => ({
          ...exp,
          code: exp.code || budgetCode.trim(),
        }))
        update["formData.expenses"] = expenses
      } else {
        update["formData.accountCode"] = budgetCode.trim()
      }
    }

    await updateSubmission(submission.id, update)
    const updated = { ...submission, status: "reviewed" as SubmissionStatus }
    setSubmission(updated)
    setActionMode(null)
    setActing(false)
    setActionDone("Approved — sent to final approver")
  }

  async function handleApproveAsFinalApprover() {
    if (!submission || !settings) return
    const sig = signatureRef.current?.getDataUrl() ?? ""
    setActing(true)
    await updateSubmission(submission.id, {
      status: "approved",
      finalApproverSignatureUrl: sig,
      finalApproverEmail: email,
      approvedAt: serverTimestamp() as never,
      activityLog: arrayUnion({
        action: "final_approved",
        by: email,
        at: Timestamp.now(),
      }),
    })
    const updated = { ...submission, status: "approved" as SubmissionStatus }
    setSubmission(updated)
    setActionMode(null)
    setActing(false)
    setActionDone("Approved — submitter notified")
  }

  async function handleDeny() {
    if (!submission || !settings || !comments.trim()) return
    setActing(true)
    await updateSubmission(submission.id, {
      status: "denied",
      denialComments: comments.trim(),
      activityLog: arrayUnion({
        action: "denied",
        by: email,
        at: Timestamp.now(),
        comments: comments.trim(),
      }),
    })
    const updated = { ...submission, status: "denied" as SubmissionStatus }
    setSubmission(updated)
    setActionMode(null)
    setComments("")
    setActing(false)
    setActionDone("Denied — submitter notified")
  }

  async function handleRequestRevisions() {
    if (!submission || !settings || !comments.trim()) return
    setActing(true)
    try {
      await updateSubmission(submission.id, {
        status: "revisions_requested",
        revisionComments: comments.trim(),
        revisionHistory: [
          ...submission.revisionHistory,
          {
            comments: comments.trim(),
            requestedBy: email,
            requestedAt: Timestamp.now(),
          },
        ],
        activityLog: arrayUnion({
          action: "revisions_requested",
          by: email,
          at: Timestamp.now(),
          comments: comments.trim(),
        }),
      })
      const updated = {
        ...submission,
        status: "revisions_requested" as SubmissionStatus,
      }
      setSubmission(updated)
      setActionMode(null)
      setComments("")
      setActionDone("Revisions requested — submitter notified")
    } catch (err) {
      console.error("Failed to request revisions:", err)
      alert("Failed to request revisions. Please try again.")
    }
    setActing(false)
  }

  async function handleReturnToSupervisor() {
    if (!submission || !comments.trim()) return
    setActing(true)
    try {
      await updateSubmission(submission.id, {
        status: "pending",
        revisionComments: comments.trim(),
        // Clear the supervisor's signature so they re-sign on re-approval
        supervisorSignatureUrl: deleteField() as never,
        reviewedAt: deleteField() as never,
        activityLog: arrayUnion({
          action: "returned_to_supervisor",
          by: email,
          at: Timestamp.now(),
          comments: comments.trim(),
        }),
      })
      const updated = {
        ...submission,
        status: "pending" as SubmissionStatus,
        revisionComments: comments.trim(),
      }
      setSubmission(updated)
      setActionMode(null)
      setComments("")
      setActionDone("Returned to supervisor — they have been notified")
    } catch (err) {
      console.error("Failed to return to supervisor:", err)
      alert("Failed to return to supervisor. Please try again.")
    }
    setActing(false)
  }

  async function handleRedirect() {
    if (!submission || !redirectEmail.trim()) return
    setActing(true)
    try {
      // Resolve the new chain from the Route To person's role — this drops
      // any stale approver step from the original chain. If the new person
      // is an approver, the flow becomes 4-step with their supervisor as
      // the next step.
      const chain = await resolveRoutingChain(redirectEmail.trim())
      const update: Record<string, unknown> = {
        supervisorEmail: chain.supervisorEmail,
        supervisorName: chain.supervisorName,
        status: "pending",
        activityLog: arrayUnion({
          action: "redirected",
          by: email,
          at: Timestamp.now(),
          comments: `Redirected to ${redirectEmail.trim().toLowerCase()}`,
        }),
      }
      if (chain.approverEmail) {
        update.approverEmail = chain.approverEmail
        update.approverName = chain.approverName ?? ""
      } else {
        update.approverEmail = deleteField()
        update.approverName = deleteField()
      }
      await updateSubmission(submission.id, update)
      const updated: Submission = {
        ...submission,
        supervisorEmail: chain.supervisorEmail,
        supervisorName: chain.supervisorName,
        status: "pending",
        ...(chain.approverEmail
          ? {
              approverEmail: chain.approverEmail,
              approverName: chain.approverName ?? "",
            }
          : { approverEmail: undefined, approverName: undefined }),
      }
      setSubmission(updated)
      setActionMode(null)
      setRedirectEmail("")
      setActing(false)
      setActionDone("Redirected — new supervisor notified")
    } catch (err) {
      console.error("Failed to redirect:", err)
      alert("Failed to redirect. Please try again.")
      setActing(false)
    }
  }

  async function handleDownloadPdf() {
    if (!submission) return
    // If approved with a Drive URL, open it directly
    if (submission.pdfDriveUrl) {
      window.open(submission.pdfDriveUrl, "_blank")
      return
    }
    // Otherwise generate on-demand via Cloud Function
    setDownloading(true)
    try {
      const generatePdf = httpsCallable(functions, "generateSubmissionPdf")
      const result = await generatePdf({ submissionId: submission.id })
      const { pdf } = result.data as { pdf: string }
      const blob = new Blob(
        [Uint8Array.from(atob(pdf), (c) => c.charCodeAt(0))],
        { type: "application/pdf" }
      )
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${submission.id}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error("Failed to download PDF:", err)
      alert("Failed to generate PDF. Please try again.")
    }
    setDownloading(false)
  }

  async function handleMarkAsPaid() {
    if (!submission) return
    setActing(true)
    await updateSubmission(submission.id, {
      status: "paid",
      paidAt: serverTimestamp(),
      paidBy: email,
      activityLog: arrayUnion({
        action: "marked_as_paid",
        by: email,
        at: Timestamp.now(),
      }),
    })
    setSubmission({ ...submission, status: "paid" as SubmissionStatus })
    setActing(false)
    setActionDone("Marked as paid — submitter notified")
  }

  async function handleUnmarkPaid() {
    if (!submission) return
    if (!confirm("Revert this submission back to approved?")) return
    setActing(true)
    await updateSubmission(submission.id, {
      status: "approved",
      paidAt: deleteField(),
      paidBy: deleteField(),
      activityLog: arrayUnion({
        action: "unmarked_as_paid",
        by: email,
        at: Timestamp.now(),
      }),
    })
    setSubmission({ ...submission, status: "approved" as SubmissionStatus })
    setActing(false)
    setActionDone("Reverted to approved")
  }

  return (
    <AppLayout>
      {/* Back + header */}
      <button
        onClick={() => navigate(-1)}
        className="mb-4 flex cursor-pointer items-center gap-1 text-sm font-medium print:hidden"
        style={{ color: "rgba(255,255,255,0.7)" }}
      >
        <ArrowLeft size={14} />
        Back
      </button>

      <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FormIcon size={20} style={{ color: "#ffffff" }} />
            <h1
              className="text-xl font-bold sm:text-2xl"
              style={{ color: "#ffffff" }}
            >
              {formLabel}
            </h1>
          </div>
          <p
            className="mt-1 text-sm"
            style={{ color: "rgba(255,255,255,0.6)" }}
          >
            {submission.id} · Submitted by {submission.submitterName}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {submission.sandbox && (
            <div
              className="flex items-center gap-1.5 rounded-full px-3 py-2"
              style={{ background: "rgba(234,179,8,0.2)" }}
            >
              <span
                className="text-xs font-bold tracking-wider uppercase"
                style={{ color: "#eab308" }}
              >
                Sandbox
              </span>
            </div>
          )}
          <div
            className="flex items-center gap-2 rounded-full px-4 py-2"
            style={{ background: statusCfg.bg }}
          >
            <StatusIcon size={14} style={{ color: statusCfg.color }} />
            <span
              className="text-sm font-semibold"
              style={{ color: statusCfg.color }}
            >
              {statusCfg.label}
            </span>
          </div>
          <button
            onClick={() => window.print()}
            className="flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-white/10 print:hidden"
            style={{ color: "rgba(255,255,255,0.7)" }}
            title="Print"
          >
            <Printer size={16} />
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-white/10 print:hidden"
            style={{ color: "rgba(255,255,255,0.7)" }}
            title="Download PDF"
          >
            {downloading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Download size={16} />
            )}
          </button>
        </div>
      </div>

      {/* Action done banner */}
      {actionDone && (
        <div
          className="mb-4 flex items-center gap-2 rounded-lg px-4 py-3"
          style={{
            background: "linear-gradient(135deg, #4356a9 0%, #5a6fbf 100%)",
            boxShadow: "0 2px 8px rgba(67,86,169,0.3)",
          }}
        >
          <CheckCircle size={16} style={{ color: "#ffffff" }} />
          <span className="text-sm font-medium" style={{ color: "#ffffff" }}>
            {actionDone}
          </span>
        </div>
      )}

      {/* Denial / revision comments */}
      {submission.status === "denied" && submission.denialComments && (
        <div
          className="mb-4 rounded-lg p-4"
          style={{
            background: "rgba(173,33,34,0.08)",
            border: "1px solid rgba(173,33,34,0.2)",
          }}
        >
          <p
            className="text-xs font-semibold tracking-wider uppercase"
            style={{ color: "#ad2122" }}
          >
            Denial Reason
          </p>
          <p className="mt-1 text-sm" style={{ color: "#334155" }}>
            {submission.denialComments}
          </p>
        </div>
      )}
      {submission.status === "revisions_requested" &&
        submission.revisionComments && (
          <div
            className="mb-4 rounded-lg p-4"
            style={{
              background: "rgba(234,88,12,0.08)",
              border: "1px solid rgba(234,88,12,0.2)",
            }}
          >
            <p
              className="text-xs font-semibold tracking-wider uppercase"
              style={{ color: "#c2410c" }}
            >
              Revisions Requested
            </p>
            <p className="mt-1 text-sm" style={{ color: "#334155" }}>
              {submission.revisionComments}
            </p>
          </div>
        )}

      {/* Form data */}
      <div
        className="rounded-xl p-4 sm:p-6"
        style={{
          background: "#ffffff",
          boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06)",
        }}
      >
        {/* Summary bar */}
        <div
          className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg px-4 py-3"
          style={{
            background: "#f8f9fb",
            border: "1px solid rgba(180,185,195,0.25)",
          }}
        >
          <span className="text-sm" style={{ color: "#64748b" }}>
            {submission.summary}
          </span>
          <span className="text-lg font-bold" style={{ color: "#1d2a5d" }}>
            ${submission.amount.toFixed(2)}
          </span>
        </div>

        {/* Form-specific data */}
        {submission.formType === "check" && (
          <CheckRequestView data={submission.formData as CheckRequestData} />
        )}
        {submission.formType === "mileage" && (
          <MileageView data={submission.formData as MileageData} />
        )}
        {submission.formType === "travel" && (
          <TravelView data={submission.formData as TravelData} />
        )}

        {/* Signatures */}
        <div
          className="mt-6 border-t pt-5"
          style={{ borderColor: "rgba(180,185,195,0.25)" }}
        >
          <p
            className="mb-3 text-sm font-semibold tracking-widest uppercase"
            style={{ color: "#1d2a5d" }}
          >
            Signatures
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SigBlock
              label="Employee"
              url={submission.employeeSignatureUrl}
              name={submission.submitterName}
            />
            {submission.approverEmail && (
              <SigBlock
                label="Approver"
                url={submission.approverSignatureUrl}
                name={submission.approverName}
              />
            )}
            <SigBlock
              label="Supervisor"
              url={submission.supervisorSignatureUrl}
              name={submission.supervisorName}
            />
            <SigBlock
              label="Final Approver"
              url={submission.finalApproverSignatureUrl}
              name={settings?.finalApproverName}
            />
          </div>
        </div>

        {/* Attachments */}
        {submission.attachments.length > 0 && (
          <div
            className="mt-6 border-t pt-5"
            style={{ borderColor: "rgba(180,185,195,0.25)" }}
          >
            <p
              className="mb-3 text-sm font-semibold tracking-widest uppercase"
              style={{ color: "#1d2a5d" }}
            >
              Attachments
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {submission.attachments.map((a, i) => {
                const isImage = a.mimeType?.startsWith("image/")
                return (
                  <a
                    key={i}
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={a.name}
                    className="group block aspect-square overflow-hidden rounded-lg transition-all hover:shadow-md"
                    style={{ border: "1px solid rgba(180,185,195,0.25)" }}
                  >
                    {isImage ? (
                      <img
                        src={a.url}
                        alt={a.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div
                        className="flex h-full w-full flex-col items-center justify-center gap-2 p-3 text-center"
                        style={{ color: "#4356a9", background: "#f8f9fb" }}
                      >
                        <FileText size={28} />
                        <span className="line-clamp-2 text-xs font-medium break-all">
                          {a.name}
                        </span>
                      </div>
                    )}
                  </a>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Activity Timeline */}
      {submission.activityLog?.length > 0 && (
        <ActivityTimeline log={submission.activityLog} />
      )}

      {/* Approval actions */}
      {(canApproverAct ||
        canSupervisorAct ||
        canFinalApproverAct ||
        canControllerOverride) &&
        !actionDone && (
          <div
            className="mt-6 rounded-xl p-4 sm:p-6 print:hidden"
            style={{
              background: "#ffffff",
              boxShadow:
                "0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06)",
            }}
          >
            <p
              className="mb-4 text-sm font-semibold tracking-widest uppercase"
              style={{ color: "#1d2a5d" }}
            >
              {canApproverAct
                ? "Approver Review"
                : canSupervisorAct
                  ? "Supervisor Review"
                  : canFinalApproverAct
                    ? "Final Approval"
                    : "Administrative Actions"}
            </p>
            {canControllerOverride && (
              <p className="mb-3 text-xs" style={{ color: "#94a3b8" }}>
                You're acting as a controller — this submission isn't currently
                assigned to you, but you can redirect, edit, or deny it.
              </p>
            )}

            {!actionMode && (
              <div className="flex flex-wrap gap-3">
                {(canApproverAct ||
                  canSupervisorAct ||
                  canFinalApproverAct) && (
                  <button
                    onClick={() => setActionMode("approve")}
                    className="btn-action-approve"
                  >
                    <CheckCircle size={16} />
                    Approve
                  </button>
                )}
                {(canApproverAct ||
                  canSupervisorAct ||
                  canControllerOverride) && (
                  <>
                    <button
                      onClick={() => setActionMode("revisions")}
                      className="btn-action-revisions"
                    >
                      <RotateCcw size={16} />
                      Request Revisions
                    </button>
                    <button
                      onClick={() => setActionMode("redirect")}
                      className="btn-action-revisions"
                    >
                      <ArrowRightLeft size={16} />
                      Redirect
                    </button>
                  </>
                )}
                {(canApproverAct ||
                  canSupervisorAct ||
                  canFinalApproverAct ||
                  canControllerOverride) && (
                  <button
                    onClick={() =>
                      navigate(
                        `/forms/${submission.formType}?edit=${submission.id}`
                      )
                    }
                    className="btn-action-revisions"
                  >
                    <Pencil size={16} />
                    Edit
                  </button>
                )}
                {canFinalApproverAct && (
                  <button
                    onClick={() => setActionMode("return_to_supervisor")}
                    className="btn-action-revisions"
                  >
                    <RotateCcw size={16} />
                    Return to Supervisor
                  </button>
                )}
                <button
                  onClick={() => setActionMode("deny")}
                  className="btn-action-deny"
                >
                  <XCircle size={16} />
                  Deny
                </button>
              </div>
            )}

            {/* Approve mode — signature */}
            {actionMode === "approve" && (
              <div>
                {(canApproverAct || canSupervisorAct) && needsBudgetCode && (
                  <div className="mb-4">
                    <label
                      className="mb-1 block text-xs font-semibold tracking-wider uppercase"
                      style={{ color: "#64748b" }}
                    >
                      Account / Budget Code
                    </label>
                    <p
                      className="mb-2 text-[11px]"
                      style={{ color: "#94a3b8" }}
                    >
                      {submission.formType === "check"
                        ? "Some expense lines are missing a budget code. Enter one to apply to those lines (existing codes are kept)."
                        : "The submitter didn't enter a budget code. Enter one to fill it in."}
                    </p>
                    <input
                      type="text"
                      value={budgetCode}
                      onChange={(e) =>
                        setBudgetCode(formatBudgetCode(e.target.value))
                      }
                      placeholder="##-###-###-###-###-###"
                      maxLength={22}
                      className="input-neu w-full font-mono sm:w-72"
                    />
                    <BudgetCodeBuilder
                      value={budgetCode}
                      onChange={setBudgetCode}
                    />
                  </div>
                )}
                <p className="mb-3 text-sm" style={{ color: "#64748b" }}>
                  Sign below to{" "}
                  {canApproverAct
                    ? "approve and forward to the supervisor"
                    : canSupervisorAct
                      ? "approve and forward to the final approver"
                      : "give final approval"}
                  .
                </p>
                <SignatureField
                  ref={signatureRef}
                  savedSignatureUrl={userProfile?.savedSignatureUrl}
                  fullName={userProfile?.fullName}
                />
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={
                      canApproverAct
                        ? handleApproveAsApprover
                        : canSupervisorAct
                          ? handleApproveAsSupervisor
                          : handleApproveAsFinalApprover
                    }
                    disabled={acting}
                    className="btn-action-approve"
                  >
                    {acting ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <CheckCircle size={14} />
                    )}
                    {acting ? "Approving…" : "Confirm Approval"}
                  </button>
                  <button
                    onClick={() => setActionMode(null)}
                    className="cursor-pointer rounded-lg px-4 py-2.5 text-sm font-medium"
                    style={{ color: "#64748b" }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Deny mode — comments */}
            {actionMode === "deny" && (
              <div>
                <p className="mb-3 text-sm" style={{ color: "#64748b" }}>
                  Explain why this request is being denied. The submitter will
                  be notified.
                </p>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Reason for denial…"
                  rows={3}
                  className="input-neu mb-3 w-full"
                  style={{ resize: "vertical" }}
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleDeny}
                    disabled={acting || !comments.trim()}
                    className="btn-action-deny-solid"
                  >
                    {acting ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <XCircle size={14} />
                    )}
                    {acting ? "Denying…" : "Confirm Denial"}
                  </button>
                  <button
                    onClick={() => {
                      setActionMode(null)
                      setComments("")
                    }}
                    className="cursor-pointer rounded-lg px-4 py-2.5 text-sm font-medium"
                    style={{ color: "#64748b" }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Revisions mode — comments */}
            {actionMode === "revisions" && (
              <div>
                <p className="mb-3 text-sm" style={{ color: "#64748b" }}>
                  Describe what changes are needed. The submitter will be
                  notified and can edit and resubmit.
                </p>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="What needs to be changed…"
                  rows={3}
                  className="input-neu mb-3 w-full"
                  style={{ resize: "vertical" }}
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleRequestRevisions}
                    disabled={acting || !comments.trim()}
                    className="btn-action-revisions-solid"
                  >
                    {acting ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <RotateCcw size={14} />
                    )}
                    {acting ? "Sending…" : "Request Revisions"}
                  </button>
                  <button
                    onClick={() => {
                      setActionMode(null)
                      setComments("")
                    }}
                    className="cursor-pointer rounded-lg px-4 py-2.5 text-sm font-medium"
                    style={{ color: "#64748b" }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Return to supervisor mode — comments */}
            {actionMode === "return_to_supervisor" && (
              <div>
                <p className="mb-3 text-sm" style={{ color: "#64748b" }}>
                  Send this request back to{" "}
                  {submission.supervisorName || "the supervisor"} with a note.
                  They will be notified and can edit, re-approve, or take
                  further action.
                </p>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="What needs the supervisor's attention…"
                  rows={3}
                  className="input-neu mb-3 w-full"
                  style={{ resize: "vertical" }}
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleReturnToSupervisor}
                    disabled={acting || !comments.trim()}
                    className="btn-action-revisions-solid"
                  >
                    {acting ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <RotateCcw size={14} />
                    )}
                    {acting ? "Sending…" : "Return to Supervisor"}
                  </button>
                  <button
                    onClick={() => {
                      setActionMode(null)
                      setComments("")
                    }}
                    className="cursor-pointer rounded-lg px-4 py-2.5 text-sm font-medium"
                    style={{ color: "#64748b" }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Redirect mode — pick new supervisor */}
            {actionMode === "redirect" && (
              <div>
                <p className="mb-3 text-sm" style={{ color: "#64748b" }}>
                  Reassign this request to a different supervisor. They will be
                  notified and can approve, deny, or redirect further.
                </p>
                <label
                  className="mb-1 block text-xs font-semibold tracking-wider uppercase"
                  style={{ color: "#64748b" }}
                >
                  New Supervisor
                </label>
                <StaffEmailAutocomplete
                  value={redirectEmail}
                  onChange={setRedirectEmail}
                  placeholder="Search by name or email…"
                  className="input-neu w-full sm:w-80"
                />
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={handleRedirect}
                    disabled={acting || !redirectEmail.trim()}
                    className="btn-action-revisions-solid"
                  >
                    {acting ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <ArrowRightLeft size={14} />
                    )}
                    {acting ? "Redirecting…" : "Confirm Redirect"}
                  </button>
                  <button
                    onClick={() => {
                      setActionMode(null)
                      setRedirectEmail("")
                    }}
                    className="cursor-pointer rounded-lg px-4 py-2.5 text-sm font-medium"
                    style={{ color: "#64748b" }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      {/* Submitter actions */}
      {isSubmitter &&
        (submission.status === "pending" ||
          submission.status === "revisions_requested") &&
        !actionDone && (
          <div
            className="mt-6 rounded-xl p-4 sm:p-6 print:hidden"
            style={{
              background: "#ffffff",
              boxShadow:
                "0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06)",
            }}
          >
            {submission.status === "revisions_requested" && (
              <p className="mb-4 text-sm" style={{ color: "#334155" }}>
                Your supervisor has requested changes. Edit and resubmit your
                form.
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() =>
                  navigate(
                    `/forms/${submission.formType}?resubmit=${submission.id}`
                  )
                }
                className="btn-action-approve"
              >
                <RotateCcw size={14} />
                {submission.status === "revisions_requested"
                  ? "Edit & Resubmit"
                  : "Edit Request"}
              </button>
              <button
                onClick={async () => {
                  if (
                    !confirm(
                      "Are you sure you want to cancel this request? This cannot be undone."
                    )
                  )
                    return
                  setActing(true)
                  try {
                    await updateSubmission(submission.id, {
                      status: "cancelled",
                      activityLog: arrayUnion({
                        action: "cancelled",
                        by: email,
                        at: Timestamp.now(),
                      }),
                    })
                    setSubmission({
                      ...submission,
                      status: "cancelled" as SubmissionStatus,
                    })
                    setActionDone("Request cancelled")
                  } catch (err) {
                    console.error("Failed to cancel:", err)
                    alert("Failed to cancel. Please try again.")
                  }
                  setActing(false)
                }}
                disabled={acting}
                className="btn-action-deny"
              >
                <XCircle size={14} />
                Cancel Request
              </button>
            </div>
          </div>
        )}

      {/* Mark as Paid */}
      {canMarkPaid && !actionDone && (
        <div
          className="mt-6 rounded-xl p-4 sm:p-6 print:hidden"
          style={{
            background: "#ffffff",
            boxShadow:
              "0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06)",
          }}
        >
          <p
            className="mb-4 text-sm font-semibold tracking-widest uppercase"
            style={{ color: "#059669" }}
          >
            Payment Processing
          </p>
          <p className="mb-4 text-sm" style={{ color: "#64748b" }}>
            This request has been fully approved. Mark it as paid once payment
            has been processed.
          </p>
          <button
            onClick={handleMarkAsPaid}
            disabled={acting}
            className="btn-action-approve"
          >
            {acting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <CheckCircle size={14} />
            )}
            {acting ? "Processing…" : "Mark as Paid"}
          </button>
        </div>
      )}

      {/* Undo Paid */}
      {canUnmarkPaid && !actionDone && (
        <div className="mt-6 flex justify-end print:hidden">
          <button
            onClick={handleUnmarkPaid}
            disabled={acting}
            className="btn-action-deny-solid"
          >
            {acting ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <RotateCcw size={13} />
            )}
            {acting ? "Reverting…" : "Undo Paid"}
          </button>
        </div>
      )}
    </AppLayout>
  )
}

function SigBlock({
  label,
  url,
  name,
}: {
  label: string
  url?: string
  name?: string
}) {
  return (
    <div
      className="rounded-lg p-3"
      style={{
        background: "#f8f9fb",
        border: "1px solid rgba(180,185,195,0.25)",
      }}
    >
      <p
        className="mb-1 text-xs font-semibold tracking-wider uppercase"
        style={{ color: "#64748b" }}
      >
        {label}
      </p>
      {url ? (
        <>
          <img
            src={url}
            alt={`${label} signature`}
            className="rounded"
            style={{ maxHeight: "50px", background: "#f4f5f7" }}
          />
          {name && (
            <p className="mt-1 text-xs" style={{ color: "#94a3b8" }}>
              {name}
            </p>
          )}
        </>
      ) : (
        <p className="text-xs italic" style={{ color: "#94a3b8" }}>
          Not yet signed
        </p>
      )}
    </div>
  )
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  submitted: { label: "Submitted", color: "#4356a9" },
  resubmitted: { label: "Resubmitted", color: "#4356a9" },
  approver_approved: { label: "Approver Approved", color: "#384a97" },
  supervisor_approved: { label: "Supervisor Approved", color: "#2d3f89" },
  final_approved: { label: "Final Approved", color: "#1d2a5d" },
  denied: { label: "Denied", color: "#ad2122" },
  revisions_requested: { label: "Revisions Requested", color: "#c2410c" },
  cancelled: { label: "Cancelled", color: "#64748b" },
  redirected: { label: "Redirected", color: "#4356a9" },
  marked_as_paid: { label: "Marked as Paid", color: "#059669" },
  unmarked_as_paid: { label: "Reverted to Approved", color: "#64748b" },
  returned_to_supervisor: {
    label: "Returned to Supervisor",
    color: "#c2410c",
  },
  edited_by_approver: { label: "Edited by Approver", color: "#4356a9" },
  edited_by_supervisor: { label: "Edited by Supervisor", color: "#4356a9" },
  edited_by_controller: { label: "Edited by Controller", color: "#4356a9" },
}

function ActivityTimeline({ log }: { log: ActivityLogEntry[] }) {
  const sorted = [...log].sort((a, b) => {
    const aMs = a.at?.toMillis?.() ?? 0
    const bMs = b.at?.toMillis?.() ?? 0
    return aMs - bMs
  })

  return (
    <div
      className="mt-6 rounded-xl p-4 sm:p-6"
      style={{
        background: "#ffffff",
        boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06)",
      }}
    >
      <p
        className="mb-4 text-sm font-semibold tracking-widest uppercase"
        style={{ color: "#1d2a5d" }}
      >
        Activity
      </p>
      <div className="relative ml-3">
        {/* Vertical line */}
        <div
          className="absolute top-1 bottom-1 left-0 w-px"
          style={{ background: "rgba(180,185,195,0.4)" }}
        />
        <div className="space-y-4">
          {sorted.map((entry, i) => {
            const cfg = ACTION_LABELS[entry.action] ?? {
              label: entry.action,
              color: "#64748b",
            }
            const time = entry.at?.toDate?.()
            return (
              <div key={i} className="relative pl-5">
                {/* Dot */}
                <div
                  className="absolute top-1.5 left-0 h-2 w-2 -translate-x-1/2 rounded-full"
                  style={{ background: cfg.color }}
                />
                <div>
                  <p
                    className="text-sm font-medium"
                    style={{ color: cfg.color }}
                  >
                    {cfg.label}
                  </p>
                  <p className="text-xs" style={{ color: "#64748b" }}>
                    {entry.by}
                    {time && (
                      <>
                        {" · "}
                        {time.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}{" "}
                        {time.toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </>
                    )}
                  </p>
                  {entry.comments && (
                    <p
                      className="mt-1 text-xs italic"
                      style={{ color: "#94a3b8" }}
                    >
                      {entry.comments}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
