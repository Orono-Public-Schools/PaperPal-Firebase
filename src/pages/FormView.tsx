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
} from "lucide-react"
import AppLayout from "@/components/layout/AppLayout"
import SignatureField, {
  type SignatureFieldRef,
} from "@/components/forms/SignatureField"
import BudgetCodeBuilder from "@/components/forms/BudgetCodeBuilder"
import { formatBudgetCode } from "@/lib/utils"
import { useAuth } from "@/hooks/useAuth"
import {
  getSubmission,
  updateSubmission,
  getAppSettings,
} from "@/lib/firestore"
import type { Submission, AppSettings, SubmissionStatus } from "@/lib/types"
import { serverTimestamp, Timestamp } from "firebase/firestore"
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

type ActionMode = null | "approve" | "deny" | "revisions"

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
  const isSupervisor = email === submission.supervisorEmail?.toLowerCase()
  const isFinalApprover = email === settings?.finalApproverEmail?.toLowerCase()
  const isSubmitter = userProfile?.uid === submission.submitterUid

  const canSupervisorAct = isSupervisor && submission.status === "pending"
  const canFinalApproverAct =
    isFinalApprover && submission.status === "reviewed"

  const statusCfg = STATUS_CONFIG[submission.status]
  const StatusIcon = statusCfg.icon
  const FormIcon = FORM_ICONS[submission.formType] ?? FileText
  const formLabel = FORM_LABELS[submission.formType] ?? "Request"

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

  return (
    <AppLayout>
      {/* Back + header */}
      <button
        onClick={() => navigate(-1)}
        className="mb-4 flex cursor-pointer items-center gap-1 text-sm font-medium"
        style={{ color: "rgba(255,255,255,0.7)" }}
      >
        <ArrowLeft size={14} />
        Back
      </button>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FormIcon size={20} style={{ color: "#ffffff" }} />
            <h1 className="text-2xl font-bold" style={{ color: "#ffffff" }}>
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
        className="rounded-xl p-6"
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
            <div className="space-y-2">
              {submission.attachments.map((a, i) => (
                <a
                  key={i}
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-gray-50"
                  style={{
                    color: "#4356a9",
                    border: "1px solid rgba(180,185,195,0.25)",
                  }}
                >
                  <FileText size={14} />
                  {a.name}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Approval actions */}
      {(canSupervisorAct || canFinalApproverAct) && !actionDone && (
        <div
          className="mt-6 rounded-xl p-6"
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
            {canSupervisorAct ? "Supervisor Review" : "Final Approval"}
          </p>

          {!actionMode && (
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setActionMode("approve")}
                className="btn-action-approve"
              >
                <CheckCircle size={16} />
                Approve
              </button>
              {canSupervisorAct && (
                <button
                  onClick={() => setActionMode("revisions")}
                  className="btn-action-revisions"
                >
                  <RotateCcw size={16} />
                  Request Revisions
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
              {canSupervisorAct && (
                <div className="mb-4">
                  <label
                    className="mb-1 block text-xs font-semibold tracking-wider uppercase"
                    style={{ color: "#64748b" }}
                  >
                    Account / Budget Code
                  </label>
                  <input
                    type="text"
                    value={budgetCode}
                    onChange={(e) =>
                      setBudgetCode(formatBudgetCode(e.target.value))
                    }
                    placeholder="##-###-###-###-###-###"
                    maxLength={20}
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
                {canSupervisorAct
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
                    canSupervisorAct
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
                Explain why this request is being denied. The submitter will be
                notified.
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
                Describe what changes are needed. The submitter will be notified
                and can edit and resubmit.
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
        </div>
      )}

      {/* Submitter actions */}
      {isSubmitter &&
        (submission.status === "pending" ||
          submission.status === "revisions_requested") &&
        !actionDone && (
          <div
            className="mt-6 rounded-xl p-6"
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
