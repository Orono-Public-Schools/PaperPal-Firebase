import { useState, useEffect, useMemo } from "react"
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
  CheckSquare,
  Square,
  DollarSign,
  Loader2,
  Mail,
  ArrowRightLeft,
  Pencil,
  Check,
} from "lucide-react"
import { Timestamp, arrayUnion, deleteField } from "firebase/firestore"
import { httpsCallable } from "firebase/functions"
import { functions } from "@/lib/firebase"
import AppLayout from "@/components/layout/AppLayout"
import StaffEmailAutocomplete from "@/components/forms/StaffEmailAutocomplete"
import { useAuth } from "@/hooks/useAuth"
import { useSandbox } from "@/hooks/useSandbox"
import {
  getUserSubmissions,
  getAllInFlightSubmissions,
  getPendingApprovals,
  getPendingApproverApprovals,
  getReviewedSubmissions,
  getAppSettings,
  updateSubmission,
  batchHideSubmissions,
  batchMarkAsPaid,
  getCompletedApprovals,
  getCompletedApproverApprovals,
  getApprovedSubmissions,
  resolveRoutingChain,
} from "@/lib/firestore"
import type {
  AppSettings,
  FormType,
  Submission,
  SubmissionStatus,
} from "@/lib/types"
import { getCurrentAssignee } from "@/lib/utils"

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
    description: "Claim mileage reimbursement at $0.725 per mile.",
    icon: Car,
    pill: { from: "#ad2122", to: "#c9393a" },
    path: "/forms/mileage",
  },
  {
    id: "travel",
    title: "Travel Reimbursement",
    description: "Request reimbursement for travel expenses.",
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
  approved_by_approver: {
    label: "Approver Approved",
    bg: "rgba(56,74,151,0.12)",
    color: "#384a97",
    cardBg: "linear-gradient(135deg, #384a97 0%, #4d62b5 100%)",
    cardBorder: "#384a97",
    cardGlow: "rgba(56,74,151,0.3)",
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
  paid: {
    label: "Paid",
    bg: "rgba(5,150,105,0.12)",
    color: "#059669",
    cardBg: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
    cardBorder: "#059669",
    cardGlow: "rgba(5,150,105,0.3)",
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
export default function Dashboard() {
  const { user, userProfile } = useAuth()
  const { sandbox } = useSandbox()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get("tab")
  const viewParam = searchParams.get("view")
  const validTabs = ["pending", "history", "approvals"]
  const activeTab = validTabs.includes(tabParam ?? "") ? tabParam! : "new"

  function setActiveTab(tab: string) {
    const params: Record<string, string> = {}
    if (tab !== "new") params.tab = tab
    setSearchParams(params, { replace: true })
  }

  // User's own submissions
  const [submissionData, setSubmissionData] = useState<{
    uid: string
    data: Submission[]
  } | null>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    getUserSubmissions(user.uid)
      .then((data) => {
        if (!cancelled) setSubmissionData({ uid: user.uid, data })
      })
      .catch(console.error)
    return () => {
      cancelled = true
    }
  }, [user])

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

  const pendingSubmissions = submissions.filter(
    (s) => s.status === "pending" || s.status === "approved_by_approver"
  )
  const historySubmissions = submissions.filter(
    (s) =>
      s.status !== "pending" &&
      s.status !== "approved_by_approver" &&
      !s.hiddenBySubmitter
  )

  // Approvals — submissions assigned to this user for review
  const approvalView: "pending" | "completed" | "all" =
    viewParam === "completed"
      ? "completed"
      : viewParam === "all"
        ? "all"
        : "pending"

  function setApprovalView(view: "pending" | "completed" | "all") {
    const params: Record<string, string> = { tab: "approvals" }
    if (view !== "pending") params.view = view
    setSearchParams(params, { replace: true })
  }
  const [approvalData, setApprovalData] = useState<Submission[] | null>(null)
  const [completedData, setCompletedData] = useState<Submission[] | null>(null)
  const [allInFlightData, setAllInFlightData] = useState<Submission[] | null>(
    null
  )
  const loadingCompleted =
    approvalView === "completed" && completedData === null
  const loadingAllInFlight = approvalView === "all" && allInFlightData === null

  useEffect(() => {
    if (!userProfile?.email) return
    let cancelled = false
    const email = userProfile.email.toLowerCase()
    Promise.all([
      getPendingApprovals(email),
      getPendingApproverApprovals(email),
      getAppSettings().then((s) =>
        s.finalApproverEmail?.toLowerCase() === email
          ? getReviewedSubmissions()
          : []
      ),
    ])
      .then(([pending, approverPending, reviewed]) => {
        if (!cancelled) {
          // Deduplicate (sandbox mode sets both approver and supervisor to same email)
          const seen = new Set<string>()
          const all = [...pending, ...approverPending, ...reviewed].filter(
            (s) => {
              if (seen.has(s.id)) return false
              seen.add(s.id)
              return true
            }
          )
          setApprovalData(all)
        }
      })
      .catch(console.error)
    return () => {
      cancelled = true
    }
  }, [userProfile?.email])

  useEffect(() => {
    if (
      activeTab !== "approvals" ||
      approvalView !== "completed" ||
      !userProfile?.email
    )
      return
    let cancelled = false
    const email = userProfile.email.toLowerCase()
    const isController = ["controller", "business_office", "admin"].includes(
      userProfile.role
    )
    Promise.all([
      getCompletedApprovals(email),
      getCompletedApproverApprovals(email),
      isController ? getApprovedSubmissions() : Promise.resolve([]),
    ])
      .then(([supervisor, approver, allApproved]) => {
        if (!cancelled) {
          const seen = new Set<string>()
          const all = [...supervisor, ...approver, ...allApproved].filter(
            (s) => {
              if (seen.has(s.id)) return false
              seen.add(s.id)
              return true
            }
          )
          setCompletedData(all)
        }
      })
      .catch(console.error)
    return () => {
      cancelled = true
    }
  }, [activeTab, approvalView, userProfile?.email, userProfile?.role])

  useEffect(() => {
    if (activeTab !== "approvals" || approvalView !== "all" || !userProfile)
      return
    const isController = ["controller", "business_office", "admin"].includes(
      userProfile.role
    )
    if (!isController) return
    let cancelled = false
    getAllInFlightSubmissions()
      .then((all) => {
        if (!cancelled) setAllInFlightData(all)
      })
      .catch(console.error)
    return () => {
      cancelled = true
    }
  }, [activeTab, approvalView, userProfile])

  // App settings used by the All Open view (for finalApproverEmail / name)
  const [oversightSettings, setOversightSettings] =
    useState<AppSettings | null>(null)
  useEffect(() => {
    if (approvalView !== "all") return
    getAppSettings().then(setOversightSettings).catch(console.error)
  }, [approvalView])

  // All Open filters
  const [filterSubmitter, setFilterSubmitter] = useState("")
  const [filterFormType, setFilterFormType] = useState<FormType | "">("")
  const [filterStatus, setFilterStatus] = useState<SubmissionStatus | "">("")

  const allInFlightSubmitters = useMemo(() => {
    const map = new Map<string, string>()
    ;(allInFlightData ?? [])
      .filter((s) => (sandbox ? s.sandbox === true : !s.sandbox))
      .forEach((s) => {
        const email = s.submitterEmail.toLowerCase()
        if (!map.has(email)) map.set(email, s.submitterName)
      })
    return Array.from(map.entries())
      .map(([email, name]) => ({ email, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [allInFlightData, sandbox])

  const allInFlightFiltered = useMemo(() => {
    return (allInFlightData ?? [])
      .filter((s) => (sandbox ? s.sandbox === true : !s.sandbox))
      .filter(
        (s) =>
          !filterSubmitter || s.submitterEmail.toLowerCase() === filterSubmitter
      )
      .filter((s) => !filterFormType || s.formType === filterFormType)
      .filter((s) => !filterStatus || s.status === filterStatus)
      .sort((a, b) => {
        const aMs = a.updatedAt?.toMillis?.() ?? 0
        const bMs = b.updatedAt?.toMillis?.() ?? 0
        return aMs - bMs
      })
  }, [allInFlightData, sandbox, filterSubmitter, filterFormType, filterStatus])

  const hasActiveFilters =
    filterSubmitter !== "" || filterFormType !== "" || filterStatus !== ""

  // Resend reminder + inline redirect state (All Open only)
  const [resendingIds, setResendingIds] = useState<Set<string>>(new Set())
  const [resendStatus, setResendStatus] = useState<
    Record<string, "sent" | "error">
  >({})
  const [redirectTarget, setRedirectTarget] = useState<Submission | null>(null)
  const [redirectEmail, setRedirectEmail] = useState("")
  const [redirectBusy, setRedirectBusy] = useState(false)

  async function handleResend(submissionId: string) {
    if (!userProfile) return
    setResendingIds((prev) => new Set(prev).add(submissionId))
    setResendStatus((prev) => {
      const next = { ...prev }
      delete next[submissionId]
      return next
    })
    try {
      const callable = httpsCallable(functions, "resendNotification")
      await callable({ submissionId })
      setResendStatus((prev) => ({ ...prev, [submissionId]: "sent" }))
      setTimeout(() => {
        setResendStatus((prev) => {
          const next = { ...prev }
          delete next[submissionId]
          return next
        })
      }, 3000)
    } catch (err) {
      console.error("Resend failed:", err)
      setResendStatus((prev) => ({ ...prev, [submissionId]: "error" }))
    } finally {
      setResendingIds((prev) => {
        const next = new Set(prev)
        next.delete(submissionId)
        return next
      })
    }
  }

  async function handleConfirmRedirect() {
    if (!redirectTarget || !redirectEmail.trim() || !userProfile) return
    setRedirectBusy(true)
    try {
      const chain = await resolveRoutingChain(redirectEmail.trim())
      const update: Record<string, unknown> = {
        supervisorEmail: chain.supervisorEmail,
        supervisorName: chain.supervisorName,
        status: "pending",
        activityLog: arrayUnion({
          action: "redirected",
          by: userProfile.email,
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
      await updateSubmission(redirectTarget.id, update)
      const refreshed = await getAllInFlightSubmissions()
      setAllInFlightData(refreshed)
      setRedirectTarget(null)
      setRedirectEmail("")
    } catch (err) {
      console.error("Redirect failed:", err)
      alert("Failed to redirect. Please try again.")
    } finally {
      setRedirectBusy(false)
    }
  }

  // Tab badge flags
  const hasPendingDot = pendingSubmissions.length > 0
  const hasApprovalDot =
    (approvalData ?? []).filter((s) =>
      sandbox ? s.sandbox === true : !s.sandbox
    ).length > 0

  // Bulk mark-as-paid (controller+ only)
  const isController = ["controller", "business_office", "admin"].includes(
    userProfile?.role ?? ""
  )
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkPaying, setBulkPaying] = useState(false)

  const completedFiltered = (completedData ?? []).filter((s) =>
    sandbox ? s.sandbox === true : !s.sandbox
  )
  const approvedForPayment = completedFiltered.filter(
    (s) => s.status === "approved"
  )

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selectedIds.size === approvedForPayment.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(approvedForPayment.map((s) => s.id)))
    }
  }

  async function handleBulkPay() {
    if (selectedIds.size === 0 || !userProfile?.email) return
    if (
      !confirm(
        `Mark ${selectedIds.size} submission${selectedIds.size > 1 ? "s" : ""} as paid?`
      )
    )
      return
    setBulkPaying(true)
    await batchMarkAsPaid(Array.from(selectedIds), userProfile.email)
    setCompletedData(
      (prev) =>
        prev?.map((s) =>
          selectedIds.has(s.id) ? ({ ...s, status: "paid" } as Submission) : s
        ) ?? null
    )
    setSelectedIds(new Set())
    setBulkPaying(false)
  }

  const loadingApprovals = activeTab === "approvals" && approvalData === null

  return (
    <AppLayout>
      {/* Page title */}
      <div className="mb-5 sm:mb-8">
        <h1
          className="text-xl font-bold sm:text-2xl"
          style={{ color: "#ffffff" }}
        >
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
        className="mb-6 grid grid-cols-2 gap-1 rounded-xl p-1 sm:grid-cols-4"
        style={{
          background: "rgba(255,255,255,0.08)",
        }}
      >
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id
          const showDot =
            (id === "pending" && hasPendingDot) ||
            (id === "approvals" && hasApprovalDot)
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className="relative flex cursor-pointer items-center justify-center gap-2 rounded-lg px-2 py-2.5 text-sm font-medium transition-all duration-200 sm:px-4"
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
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.color = "rgba(255,255,255,0.9)"
                  e.currentTarget.style.background = "rgba(255,255,255,0.08)"
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.color = "rgba(255,255,255,0.5)"
                  e.currentTarget.style.background = "transparent"
                }
              }}
            >
              <Icon size={15} />
              {label}
              {showDot && (
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{
                    background: active ? "#ffffff" : "#ef4444",
                    boxShadow: active
                      ? "0 0 6px rgba(255,255,255,0.6)"
                      : "0 0 6px rgba(239,68,68,0.6)",
                  }}
                />
              )}
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
                className="group h-[180px] cursor-pointer overflow-hidden rounded-2xl transition-all duration-400 hover:scale-[1.04] sm:h-[220px]"
                style={{
                  background: `linear-gradient(135deg, ${pill.from}, ${pill.to})`,
                  boxShadow: `0 4px 24px ${pill.from}50`,
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
                  await batchHideSubmissions(
                    historySubmissions.map((s) => s.id)
                  )
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
        <>
          <div
            className="mb-4 flex gap-1 rounded-lg p-1"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            {[
              { view: "pending" as const, label: "Pending" },
              { view: "completed" as const, label: "Completed" },
              ...(isController
                ? [{ view: "all" as const, label: "All Open" }]
                : []),
            ].map(({ view, label }) => (
              <button
                key={view}
                onClick={() => setApprovalView(view)}
                className="flex-1 cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold transition-all duration-200"
                style={
                  approvalView === view
                    ? {
                        background: "rgba(255,255,255,0.15)",
                        color: "#ffffff",
                      }
                    : { color: "rgba(255,255,255,0.4)" }
                }
              >
                {label}
              </button>
            ))}
          </div>
          {approvalView === "pending" ? (
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
          ) : approvalView === "all" ? (
            <>
              <div
                className="mb-4 flex flex-wrap items-center gap-2 rounded-xl px-2 py-2"
                style={{ background: "rgba(255,255,255,0.06)" }}
              >
                <select
                  value={filterSubmitter}
                  onChange={(e) => setFilterSubmitter(e.target.value)}
                  className="select-dark cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    color: "#ffffff",
                    border: "1px solid rgba(255,255,255,0.1)",
                    outline: "none",
                    colorScheme: "dark",
                  }}
                >
                  <option value="">All submitters</option>
                  {allInFlightSubmitters.map((s) => (
                    <option key={s.email} value={s.email}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <select
                  value={filterFormType}
                  onChange={(e) =>
                    setFilterFormType(e.target.value as FormType | "")
                  }
                  className="select-dark cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    color: "#ffffff",
                    border: "1px solid rgba(255,255,255,0.1)",
                    outline: "none",
                    colorScheme: "dark",
                  }}
                >
                  <option value="">All form types</option>
                  <option value="check">Check Request</option>
                  <option value="mileage">Mileage</option>
                  <option value="travel">Travel</option>
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) =>
                    setFilterStatus(e.target.value as SubmissionStatus | "")
                  }
                  className="select-dark cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    color: "#ffffff",
                    border: "1px solid rgba(255,255,255,0.1)",
                    outline: "none",
                    colorScheme: "dark",
                  }}
                >
                  <option value="">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="approved_by_approver">
                    Approver Approved
                  </option>
                  <option value="reviewed">Awaiting Final Approval</option>
                  <option value="revisions_requested">
                    Revisions Requested
                  </option>
                </select>
                <span
                  className="ml-auto text-xs"
                  style={{ color: "rgba(255,255,255,0.45)" }}
                >
                  {allInFlightFiltered.length} of{" "}
                  {(allInFlightData ?? []).length} · oldest first
                </span>
                {hasActiveFilters && (
                  <button
                    onClick={() => {
                      setFilterSubmitter("")
                      setFilterFormType("")
                      setFilterStatus("")
                    }}
                    className="flex cursor-pointer items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors"
                    style={{
                      color: "rgba(255,255,255,0.7)",
                      background: "rgba(255,255,255,0.08)",
                    }}
                    title="Clear filters"
                  >
                    <X size={12} />
                    Clear
                  </button>
                )}
              </div>
              <SubmissionList
                submissions={allInFlightFiltered}
                loading={loadingAllInFlight}
                emptyIcon={ClipboardCheck}
                emptyTitle={
                  hasActiveFilters
                    ? "No submissions match these filters"
                    : "No open submissions"
                }
                emptySubtitle={
                  hasActiveFilters
                    ? "Try clearing one of the filters above."
                    : "All in-flight submissions across the district appear here so you can redirect or edit any that are stuck."
                }
                showSubmitter
                showAssignee
                showAge
                appSettings={oversightSettings}
                onResend={handleResend}
                onRedirect={(s) => {
                  setRedirectTarget(s)
                  setRedirectEmail("")
                }}
                onEditNavigate={(s) =>
                  navigate(`/forms/${s.formType}?edit=${s.id}`)
                }
                resendingIds={resendingIds}
                resendStatus={resendStatus}
              />
            </>
          ) : (
            <>
              {isController && approvedForPayment.length > 0 && (
                <div
                  className="mb-4 flex items-center justify-between rounded-xl px-4 py-3"
                  style={{ background: "rgba(255,255,255,0.06)" }}
                >
                  <button
                    onClick={toggleSelectAll}
                    className="flex cursor-pointer items-center gap-2 text-xs font-semibold"
                    style={{ color: "rgba(255,255,255,0.6)" }}
                  >
                    {selectedIds.size === approvedForPayment.length ? (
                      <CheckSquare size={14} />
                    ) : (
                      <Square size={14} />
                    )}
                    {selectedIds.size === 0
                      ? `Select all (${approvedForPayment.length})`
                      : `${selectedIds.size} selected`}
                  </button>
                  {selectedIds.size > 0 && (
                    <button
                      onClick={handleBulkPay}
                      disabled={bulkPaying}
                      className="flex cursor-pointer items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold text-white transition-all"
                      style={{
                        background:
                          "linear-gradient(135deg, #059669 0%, #10b981 100%)",
                        boxShadow: "0 2px 8px rgba(5,150,105,0.35)",
                        opacity: bulkPaying ? 0.7 : 1,
                      }}
                    >
                      {bulkPaying ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <DollarSign size={13} />
                      )}
                      Mark {selectedIds.size} as Paid
                    </button>
                  )}
                </div>
              )}
              <SubmissionList
                submissions={completedFiltered}
                loading={loadingCompleted}
                emptyIcon={History}
                emptyTitle="No completed approvals"
                emptySubtitle="Submissions you've acted on will appear here."
                showSubmitter
                selectable={isController}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelected}
              />
            </>
          )}
        </>
      )}

      {redirectTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => !redirectBusy && setRedirectTarget(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6"
            style={{
              background: "#ffffff",
              boxShadow:
                "0 4px 20px rgba(0,0,0,0.15), 0 8px 32px rgba(0,0,0,0.1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p
              className="mb-1 text-xs font-semibold tracking-widest uppercase"
              style={{ color: "#64748b" }}
            >
              Redirect {redirectTarget.id}
            </p>
            <p className="mb-4 text-sm" style={{ color: "#334155" }}>
              {redirectTarget.summary}
            </p>
            <label
              className="mb-1 block text-xs font-semibold tracking-wider uppercase"
              style={{ color: "#64748b" }}
            >
              New Route To
            </label>
            <StaffEmailAutocomplete
              value={redirectEmail}
              onChange={setRedirectEmail}
              placeholder="Supervisor or approver email"
              className="input-neu w-full"
            />
            <p
              className="mt-2 text-[11px]"
              style={{ color: "#94a3b8", lineHeight: 1.5 }}
            >
              If they're an approver, the submission will route through their
              supervisor next. Any prior approver step is cleared.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRedirectTarget(null)}
                disabled={redirectBusy}
                className="cursor-pointer rounded-xl px-4 py-2 text-sm font-medium transition-colors"
                style={{
                  color: "#64748b",
                  background: "transparent",
                  border: "1px solid rgba(180,185,195,0.4)",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRedirect}
                disabled={redirectBusy || !redirectEmail.trim()}
                className="flex cursor-pointer items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-all disabled:cursor-default disabled:opacity-50"
                style={{
                  background:
                    "linear-gradient(135deg, #1d2a5d 0%, #2d3f89 100%)",
                  boxShadow: "0 2px 8px rgba(29,42,93,0.25)",
                }}
              >
                {redirectBusy ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Redirecting…
                  </>
                ) : (
                  "Redirect"
                )}
              </button>
            </div>
          </div>
        </div>
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
  selectable,
  selectedIds,
  onToggleSelect,
  showAssignee,
  showAge,
  appSettings,
  onResend,
  onRedirect,
  onEditNavigate,
  resendingIds,
  resendStatus,
}: {
  submissions: Submission[]
  loading: boolean
  emptyIcon: React.ElementType
  emptyTitle: string
  emptySubtitle: string
  showSubmitter?: boolean
  onHide?: (id: string) => void
  selectable?: boolean
  selectedIds?: Set<string>
  onToggleSelect?: (id: string) => void
  showAssignee?: boolean
  showAge?: boolean
  appSettings?: AppSettings | null
  onResend?: (id: string) => void
  onRedirect?: (s: Submission) => void
  onEditNavigate?: (s: Submission) => void
  resendingIds?: Set<string>
  resendStatus?: Record<string, "sent" | "error">
}) {
  const navigate = useNavigate()
  const [nowMs] = useState(() => Date.now())
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
        const canSelect = selectable && s.status === "approved"
        const isSelected = canSelect && selectedIds?.has(s.id)
        const updMs = showAge ? (s.updatedAt?.toMillis?.() ?? 0) : 0
        const waitingDays = updMs
          ? Math.floor((nowMs - updMs) / (24 * 60 * 60 * 1000))
          : 0
        const isStale = showAge && waitingDays >= 7
        const waitingLabel =
          waitingDays <= 0
            ? "today"
            : waitingDays === 1
              ? "1 day waiting"
              : `${waitingDays} days waiting`
        const waitingColor =
          waitingDays >= 7
            ? "#fca5a5"
            : waitingDays >= 3
              ? "#fcd34d"
              : "rgba(255,255,255,0.55)"
        return (
          <div
            key={s.id}
            onClick={(e) => {
              if ((e.target as HTMLElement).closest("button")) return
              navigate(`/forms/${s.formType}/${s.id}`)
            }}
            className="group flex cursor-pointer items-center overflow-hidden rounded-xl transition-all duration-200 hover:-translate-y-0.5"
            style={{
              background: statusStyle.cardBg,
              boxShadow: `0 2px 12px ${statusStyle.cardGlow}`,
              outline: isSelected
                ? "2px solid rgba(5,150,105,0.6)"
                : isStale
                  ? "2px solid rgba(252,165,165,0.6)"
                  : "2px solid transparent",
            }}
          >
            {/* Checkbox for selectable approved submissions */}
            {canSelect && (
              <div
                className="flex cursor-pointer items-center pl-3"
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleSelect?.(s.id)
                }}
              >
                {isSelected ? (
                  <CheckSquare size={18} style={{ color: "#10b981" }} />
                ) : (
                  <Square
                    size={18}
                    style={{ color: "rgba(255,255,255,0.35)" }}
                  />
                )}
              </div>
            )}

            {/* Content */}
            <div className="flex flex-1 flex-col gap-2 py-3 pr-4 pl-4 sm:flex-row sm:items-center sm:justify-between sm:py-4 sm:pr-5 sm:pl-5">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {s.summary}
                </p>
                <p className="mt-0.5 text-xs text-white/50">
                  {showSubmitter && <>{s.submitterName} · </>}
                  {FORM_LABELS[s.formType] ?? s.formType} · {s.id} · {date}
                  {showAge && (
                    <>
                      {" · "}
                      <span style={{ color: waitingColor, fontWeight: 600 }}>
                        {waitingLabel}
                      </span>
                    </>
                  )}
                </p>
                {showAssignee &&
                  (() => {
                    const assignee = getCurrentAssignee(s, appSettings ?? null)
                    if (!assignee) return null
                    return (
                      <p className="mt-0.5 text-xs text-white/60">
                        Assigned to {assignee.label}:{" "}
                        <span className="font-medium text-white/80">
                          {assignee.name || assignee.email}
                        </span>
                        {assignee.name && (
                          <span className="text-white/40">
                            {" "}
                            ({assignee.email})
                          </span>
                        )}
                      </p>
                    )
                  })()}
              </div>
              <div className="flex shrink-0 items-center gap-2 sm:ml-4 sm:gap-3">
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
                  className="rounded-full px-2.5 py-1 text-xs font-semibold sm:px-3"
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
                {onResend && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onResend(s.id)
                    }}
                    disabled={resendingIds?.has(s.id)}
                    onMouseEnter={(e) => {
                      if (resendStatus?.[s.id]) return
                      e.currentTarget.style.background =
                        "rgba(255,255,255,0.18)"
                      e.currentTarget.style.color = "#ffffff"
                    }}
                    onMouseLeave={(e) => {
                      if (resendStatus?.[s.id]) return
                      e.currentTarget.style.background = "transparent"
                      e.currentTarget.style.color = "rgba(255,255,255,0.7)"
                    }}
                    className="cursor-pointer rounded-lg p-1.5 transition-colors duration-150 disabled:cursor-default"
                    style={{
                      color:
                        resendStatus?.[s.id] === "sent"
                          ? "#10b981"
                          : resendStatus?.[s.id] === "error"
                            ? "#fbbf24"
                            : "rgba(255,255,255,0.7)",
                      background:
                        resendStatus?.[s.id] === "sent"
                          ? "rgba(16,185,129,0.15)"
                          : "transparent",
                    }}
                    title={
                      resendStatus?.[s.id] === "sent"
                        ? "Reminder sent"
                        : resendStatus?.[s.id] === "error"
                          ? "Failed — click to retry"
                          : "Resend reminder email"
                    }
                  >
                    {resendingIds?.has(s.id) ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : resendStatus?.[s.id] === "sent" ? (
                      <Check size={14} />
                    ) : (
                      <Mail size={14} />
                    )}
                  </button>
                )}
                {onRedirect && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onRedirect(s)
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background =
                        "rgba(255,255,255,0.18)"
                      e.currentTarget.style.color = "#ffffff"
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent"
                      e.currentTarget.style.color = "rgba(255,255,255,0.7)"
                    }}
                    className="cursor-pointer rounded-lg p-1.5 transition-colors duration-150"
                    style={{ color: "rgba(255,255,255,0.7)" }}
                    title="Redirect to another reviewer"
                  >
                    <ArrowRightLeft size={14} />
                  </button>
                )}
                {onEditNavigate && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onEditNavigate(s)
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background =
                        "rgba(255,255,255,0.18)"
                      e.currentTarget.style.color = "#ffffff"
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent"
                      e.currentTarget.style.color = "rgba(255,255,255,0.7)"
                    }}
                    className="cursor-pointer rounded-lg p-1.5 transition-colors duration-150"
                    style={{ color: "rgba(255,255,255,0.7)" }}
                    title="Edit submission"
                  >
                    <Pencil size={14} />
                  </button>
                )}
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
