import { useState, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router"
import {
  FileText,
  Car,
  Briefcase,
  Clock,
  History,
  Plus,
  ClipboardCheck,
  Trash2,
  Download,
  X,
} from "lucide-react"
import AppLayout from "@/components/layout/AppLayout"
import { useAuth } from "@/hooks/useAuth"
import { useSandbox } from "@/hooks/useSandbox"
import {
  getUserSubmissions,
  getPendingApprovals,
  getReviewedSubmissions,
  getAppSettings,
  updateSubmission,
} from "@/lib/firestore"
import type { Submission, SubmissionStatus } from "@/lib/types"

const FORM_TYPES = [
  {
    id: "check",
    title: "Check Request",
    description: "Submit a payment request for a vendor or service.",
    icon: FileText,
    pill: { from: "#1d2a5d", to: "#2d3f89" },
    path: "/forms/check",
  },
  {
    id: "mileage",
    title: "Mileage Reimbursement",
    description: "Claim mileage reimbursement at $0.72 per mile.",
    icon: Car,
    pill: { from: "#ad2122", to: "#c9393a" },
    path: "/forms/mileage",
  },
  {
    id: "travel",
    title: "Travel Reimbursement",
    description:
      "Request reimbursement for travel with estimated and actual expenses.",
    icon: Briefcase,
    pill: { from: "#2d3589", to: "#4a56c9" },
    path: "/forms/travel",
  },
]

const TABS = [
  { id: "new", label: "New Request", icon: Plus },
  { id: "pending", label: "Pending", icon: Clock },
  { id: "history", label: "History", icon: History },
  { id: "approvals", label: "Approvals", icon: ClipboardCheck },
]

const STATUS_STYLES: Record<
  SubmissionStatus,
  {
    label: string
    bg: string
    color: string
    cardBg: string
    cardBorder: string
    cardGlow: string
  }
> = {
  pending: {
    label: "Pending",
    bg: "rgba(67,86,169,0.12)",
    color: "#4356a9",
    cardBg: "linear-gradient(135deg, #4356a9 0%, #5a6fbf 100%)",
    cardBorder: "#4356a9",
    cardGlow: "rgba(67,86,169,0.3)",
  },
  reviewed: {
    label: "Awaiting Final Approval",
    bg: "rgba(45,63,137,0.12)",
    color: "#2d3f89",
    cardBg: "linear-gradient(135deg, #2d3f89 0%, #4356a9 100%)",
    cardBorder: "#2d3f89",
    cardGlow: "rgba(45,63,137,0.3)",
  },
  approved: {
    label: "Approved",
    bg: "rgba(29,42,93,0.12)",
    color: "#1d2a5d",
    cardBg: "linear-gradient(135deg, #1d2a5d 0%, #2d3f89 100%)",
    cardBorder: "#1d2a5d",
    cardGlow: "rgba(29,42,93,0.3)",
  },
  denied: {
    label: "Denied",
    bg: "rgba(173,33,34,0.12)",
    color: "#ad2122",
    cardBg: "linear-gradient(135deg, #ad2122 0%, #c9393a 100%)",
    cardBorder: "#ad2122",
    cardGlow: "rgba(173,33,34,0.3)",
  },
  revisions_requested: {
    label: "Revisions Requested",
    bg: "rgba(67,86,169,0.12)",
    color: "#4356a9",
    cardBg: "linear-gradient(135deg, #4356a9 0%, #6b7fd4 100%)",
    cardBorder: "#4356a9",
    cardGlow: "rgba(67,86,169,0.3)",
  },
  cancelled: {
    label: "Cancelled",
    bg: "rgba(148,163,184,0.12)",
    color: "#64748b",
    cardBg: "linear-gradient(135deg, #64748b 0%, #94a3b8 100%)",
    cardBorder: "#64748b",
    cardGlow: "rgba(100,116,139,0.2)",
  },
}

const FORM_LABELS: Record<string, string> = {
  check: "Check Request",
  mileage: "Mileage",
  travel: "Travel",
}

const FORM_TYPE_COLORS: Record<string, string> = {
  check: "#1d2a5d",
  mileage: "#ad2122",
  travel: "#2d3589",
}

export default function Dashboard() {
  const { user, userProfile } = useAuth()
  const { sandbox } = useSandbox()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const tabParam = searchParams.get("tab")
  const validTabs = ["pending", "history", "approvals"]
  const [activeTab, setActiveTab] = useState(
    validTabs.includes(tabParam ?? "") ? tabParam! : "new"
  )

  // User's own submissions
  const [submissionData, setSubmissionData] = useState<{
    uid: string
    data: Submission[]
  } | null>(null)

  useEffect(() => {
    if (!user || (activeTab !== "pending" && activeTab !== "history")) return
    let cancelled = false
    getUserSubmissions(user.uid)
      .then((data) => {
        if (!cancelled) setSubmissionData({ uid: user.uid, data })
      })
      .catch(console.error)
    return () => {
      cancelled = true
    }
  }, [user, activeTab])

  const allSubmissions =
    submissionData && submissionData.uid === user?.uid
      ? submissionData.data
      : []
  const submissions = allSubmissions.filter((s) =>
    sandbox ? s.sandbox === true : !s.sandbox
  )
  const loadingSubmissions =
    (activeTab === "pending" || activeTab === "history") &&
    submissionData?.uid !== user?.uid

  const pendingSubmissions = submissions.filter((s) => s.status === "pending")
  const historySubmissions = submissions.filter(
    (s) => s.status !== "pending" && !s.hiddenBySubmitter
  )

  // Approvals — submissions assigned to this user for review
  const [approvalData, setApprovalData] = useState<Submission[] | null>(null)

  useEffect(() => {
    if (activeTab !== "approvals" || !userProfile?.email) return
    let cancelled = false
    const email = userProfile.email.toLowerCase()
    Promise.all([
      getPendingApprovals(email),
      getAppSettings().then((s) =>
        s.finalApproverEmail?.toLowerCase() === email
          ? getReviewedSubmissions()
          : []
      ),
    ])
      .then(([pending, reviewed]) => {
        if (!cancelled) setApprovalData([...pending, ...reviewed])
      })
      .catch(console.error)
    return () => {
      cancelled = true
    }
  }, [activeTab, userProfile?.email])

  const loadingApprovals = activeTab === "approvals" && approvalData === null

  return (
    <AppLayout>
      {/* Page title */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: "#ffffff" }}>
          {userProfile?.firstName
            ? `Welcome back, ${userProfile.firstName}.`
            : "Welcome back."}
        </h1>
        <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
          Manage your district forms and reimbursement requests.
        </p>
      </div>

      {/* Tabs */}
      <div
        className="mb-6 flex gap-1 rounded-xl p-1"
        style={{
          background: "rgba(255,255,255,0.08)",
        }}
      >
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200"
              style={
                active
                  ? {
                      background:
                        "linear-gradient(135deg, #ad2122 0%, #c9393a 100%)",
                      color: "white",
                      boxShadow: "0 2px 10px rgba(173,33,34,0.35)",
                    }
                  : { color: "rgba(255,255,255,0.5)" }
              }
            >
              <Icon size={15} />
              {label}
            </button>
          )
        })}
      </div>

      {/* Tab: New Request */}
      {activeTab === "new" && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FORM_TYPES.map(
            ({ id, title, description, icon: Icon, pill, path }) => (
              <button
                key={id}
                onClick={() => navigate(path)}
                className="group cursor-pointer overflow-hidden rounded-2xl transition-all duration-400 hover:scale-[1.04]"
                style={{
                  background: `linear-gradient(135deg, ${pill.from}, ${pill.to})`,
                  boxShadow: `0 4px 24px ${pill.from}50`,
                  height: "220px",
                }}
              >
                <div className="flex h-full w-full flex-col items-center justify-center gap-3 transition-all duration-400 group-hover:h-0 group-hover:opacity-0">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
                    <Icon size={32} style={{ color: "#ffffff" }} />
                  </div>
                  <span className="text-lg font-bold text-white">{title}</span>
                </div>
                <div className="flex h-0 w-full flex-col items-center justify-center gap-3 overflow-hidden p-6 opacity-0 transition-all duration-400 group-hover:h-full group-hover:opacity-100">
                  <p className="text-center text-sm leading-relaxed text-white/90">
                    {description}
                  </p>
                  <div className="mt-2 rounded-lg bg-white/20 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-colors duration-200 group-hover:bg-white/30">
                    Get Started →
                  </div>
                </div>
              </button>
            )
          )}
        </div>
      )}

      {/* Tab: Pending */}
      {activeTab === "pending" && (
        <SubmissionList
          submissions={pendingSubmissions}
          loading={loadingSubmissions}
          emptyIcon={Clock}
          emptyTitle="No pending requests"
          emptySubtitle="Submissions awaiting approval will appear here."
        />
      )}

      {/* Tab: History */}
      {activeTab === "history" && (
        <>
          {historySubmissions.length > 0 && (
            <div className="mb-4 flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  const rows = [
                    ["ID", "Type", "Summary", "Amount", "Status", "Date"],
                    ...historySubmissions.map((s) => {
                      const ts = s.createdAt as { toDate?: () => Date } | null
                      const date =
                        ts?.toDate?.()?.toLocaleDateString("en-US") ?? ""
                      return [
                        s.id,
                        s.formType,
                        s.summary,
                        s.amount.toFixed(2),
                        s.status,
                        date,
                      ]
                    }),
                  ]
                  const csv = rows
                    .map((r) => r.map((c) => `"${c}"`).join(","))
                    .join("\n")
                  const blob = new Blob([csv], { type: "text/csv" })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement("a")
                  a.href = url
                  a.download = "paperpal-history.csv"
                  a.click()
                  URL.revokeObjectURL(url)
                }}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors"
                style={{
                  color: "rgba(255,255,255,0.5)",
                  background: "rgba(255,255,255,0.06)",
                }}
              >
                <Download size={13} />
                Export CSV
              </button>
              <button
                onClick={async () => {
                  if (
                    !confirm(
                      `Hide ${historySubmissions.length} completed submissions from your history?`
                    )
                  )
                    return
                  for (const s of historySubmissions) {
                    await updateSubmission(s.id, { hiddenBySubmitter: true })
                  }
                  setSubmissionData((prev) =>
                    prev
                      ? {
                          ...prev,
                          data: prev.data.map((s) =>
                            s.status !== "pending"
                              ? { ...s, hiddenBySubmitter: true }
                              : s
                          ),
                        }
                      : prev
                  )
                }}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors"
                style={{
                  color: "rgba(255,255,255,0.5)",
                  background: "rgba(255,255,255,0.06)",
                }}
              >
                <Trash2 size={13} />
                Clear History
              </button>
            </div>
          )}
          <SubmissionList
            submissions={historySubmissions}
            loading={loadingSubmissions}
            emptyIcon={History}
            emptyTitle="No submissions yet"
            emptySubtitle="Your completed requests will show up here."
            onHide={async (id) => {
              await updateSubmission(id, { hiddenBySubmitter: true })
              setSubmissionData((prev) =>
                prev
                  ? {
                      ...prev,
                      data: prev.data.map((s) =>
                        s.id === id ? { ...s, hiddenBySubmitter: true } : s
                      ),
                    }
                  : prev
              )
            }}
          />
        </>
      )}

      {/* Tab: Approvals */}
      {activeTab === "approvals" && (
        <SubmissionList
          submissions={(approvalData ?? []).filter((s) =>
            sandbox ? s.sandbox === true : !s.sandbox
          )}
          loading={loadingApprovals}
          emptyIcon={ClipboardCheck}
          emptyTitle="No pending approvals"
          emptySubtitle="Submissions assigned to you for review will appear here."
          showSubmitter
        />
      )}
    </AppLayout>
  )
}

// ─── Submission list ──────────────────────────────────────────────────────────

function SubmissionList({
  submissions,
  loading,
  emptyIcon: EmptyIcon,
  emptyTitle,
  emptySubtitle,
  showSubmitter,
  onHide,
}: {
  submissions: Submission[]
  loading: boolean
  emptyIcon: React.ElementType
  emptyTitle: string
  emptySubtitle: string
  showSubmitter?: boolean
  onHide?: (id: string) => void
}) {
  const navigate = useNavigate()
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className="h-16 animate-pulse rounded-xl"
            style={{ background: "rgba(255,255,255,0.1)" }}
          />
        ))}
      </div>
    )
  }

  if (submissions.length === 0) {
    return (
      <div
        className="rounded-2xl p-10 text-center"
        style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px dashed rgba(255,255,255,0.15)",
        }}
      >
        <div
          className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl"
          style={{ background: "rgba(255,255,255,0.08)" }}
        >
          <EmptyIcon size={24} style={{ color: "rgba(255,255,255,0.35)" }} />
        </div>
        <p className="font-semibold" style={{ color: "rgba(255,255,255,0.7)" }}>
          {emptyTitle}
        </p>
        <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
          {emptySubtitle}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {submissions.map((s) => {
        const statusStyle = STATUS_STYLES[s.status] ?? STATUS_STYLES.pending
        const ts = s.createdAt as { toDate?: () => Date } | null
        const date = ts?.toDate
          ? ts.toDate().toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : ""
        return (
          <div
            key={s.id}
            onClick={() => navigate(`/forms/${s.formType}/${s.id}`)}
            className="group flex cursor-pointer items-center gap-4 overflow-hidden rounded-xl transition-all duration-200 hover:-translate-y-0.5"
            style={{
              background: statusStyle.cardBg,
              boxShadow: `0 2px 12px ${statusStyle.cardGlow}`,
            }}
          >
            {/* Left accent bar — form type color */}
            <div
              className="w-1 self-stretch rounded-l-xl"
              style={{
                background:
                  FORM_TYPE_COLORS[s.formType] ?? "rgba(255,255,255,0.25)",
              }}
            />

            {/* Content */}
            <div className="flex flex-1 items-center justify-between py-4 pr-5">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {s.summary}
                </p>
                <p className="mt-0.5 text-xs text-white/50">
                  {showSubmitter && <>{s.submitterName} · </>}
                  {FORM_LABELS[s.formType] ?? s.formType} · {s.id} · {date}
                </p>
              </div>
              <div className="ml-4 flex shrink-0 items-center gap-3">
                {s.sandbox && (
                  <span
                    className="rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase"
                    style={{
                      background: "rgba(234,179,8,0.25)",
                      color: "#fbbf24",
                    }}
                  >
                    Sandbox
                  </span>
                )}
                <span
                  className="rounded-full px-3 py-1 text-xs font-semibold"
                  style={{
                    background: "rgba(255,255,255,0.15)",
                    color: "#ffffff",
                  }}
                >
                  {statusStyle.label}
                </span>
                <span className="text-sm font-bold text-white">
                  ${s.amount.toFixed(2)}
                </span>
                {onHide && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onHide(s.id)
                    }}
                    className="cursor-pointer rounded-lg p-1.5 opacity-0 transition-all duration-200 group-hover:opacity-100"
                    style={{ color: "rgba(255,255,255,0.4)" }}
                    title="Remove from history"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
