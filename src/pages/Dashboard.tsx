import { useState, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router"
import { FileText, Car, Briefcase, Clock, History, Plus } from "lucide-react"
import AppLayout from "@/components/layout/AppLayout"
import { useAuth } from "@/hooks/useAuth"
import { getUserSubmissions } from "@/lib/firestore"
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
    pill: { from: "#4356a9", to: "#6b7fd4" },
    path: "/forms/travel",
  },
]

const TABS = [
  { id: "new", label: "New Request", icon: Plus },
  { id: "pending", label: "Pending", icon: Clock },
  { id: "history", label: "History", icon: History },
]

const STATUS_STYLES: Record<
  SubmissionStatus,
  { label: string; bg: string; color: string }
> = {
  pending: { label: "Pending", bg: "rgba(245,158,11,0.12)", color: "#b45309" },
  reviewed: {
    label: "Awaiting Final Approval",
    bg: "rgba(59,130,246,0.12)",
    color: "#1d4ed8",
  },
  approved: { label: "Approved", bg: "rgba(5,150,105,0.12)", color: "#065f46" },
  denied: { label: "Denied", bg: "rgba(173,33,34,0.12)", color: "#ad2122" },
  revisions_requested: {
    label: "Revisions Requested",
    bg: "rgba(234,88,12,0.12)",
    color: "#c2410c",
  },
}

const FORM_LABELS: Record<string, string> = {
  check: "Check Request",
  mileage: "Mileage",
  travel: "Travel",
}

export default function Dashboard() {
  const { user, userProfile } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const tabParam = searchParams.get("tab")
  const [activeTab, setActiveTab] = useState(
    tabParam === "pending" || tabParam === "history" ? tabParam : "new"
  )

  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loadingSubmissions, setLoadingSubmissions] = useState(false)

  useEffect(() => {
    if (!user || (activeTab !== "pending" && activeTab !== "history")) return
    setLoadingSubmissions(true)
    getUserSubmissions(user.uid)
      .then(setSubmissions)
      .catch(console.error)
      .finally(() => setLoadingSubmissions(false))
  }, [user, activeTab])

  const pendingSubmissions = submissions.filter((s) => s.status === "pending")
  const historySubmissions = submissions.filter((s) => s.status !== "pending")

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
                      background: "linear-gradient(135deg, #ad2122 0%, #c9393a 100%)",
                      color: "white",
                      boxShadow: "0 2px 10px rgba(173,33,34,0.35)",
                    }
                  : { color: "rgba(255,255,255,0.5)" }
              }
              onMouseEnter={(e) => {
                if (!active) {
                  ;(e.currentTarget as HTMLButtonElement).style.color = "#ffffff"
                  ;(e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.08)"
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  ;(e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.5)"
                  ;(e.currentTarget as HTMLButtonElement).style.background = "transparent"
                }
              }}
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
                className="group cursor-pointer overflow-hidden rounded-xl text-center transition-all duration-500"
                style={{
                  backgroundColor: "#ffffff",
                  maxHeight: "180px",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.maxHeight = "340px"
                  e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.25)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.maxHeight = "180px"
                  e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.15)"
                }}
              >
                {/* Color accent bar */}
                <div
                  className="h-1 w-full"
                  style={{ background: `linear-gradient(90deg, ${pill.from}, ${pill.to})` }}
                />

                {/* Icon */}
                <div
                  className="mx-auto mt-5 mb-3 flex h-14 w-14 items-center justify-center rounded-xl"
                  style={{ background: `${pill.from}15` }}
                >
                  <Icon size={26} style={{ color: pill.from }} />
                </div>

                {/* Title */}
                <div
                  className="px-4 pb-4 text-base font-bold"
                  style={{ color: "#1d2a5d" }}
                >
                  {title}
                </div>

                {/* Hover content */}
                <div
                  className="mx-4 mb-4 -translate-y-6 scale-0 rounded-lg px-4 py-4 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100"
                  style={{ backgroundColor: `${pill.from}08` }}
                >
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "#64748b" }}
                  >
                    {description}
                  </p>
                  <div
                    className="mt-4 inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white"
                    style={{ background: pill.from }}
                  >
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
        <SubmissionList
          submissions={historySubmissions}
          loading={loadingSubmissions}
          emptyIcon={History}
          emptyTitle="No submissions yet"
          emptySubtitle="Your completed requests will show up here."
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
}: {
  submissions: Submission[]
  loading: boolean
  emptyIcon: React.ElementType
  emptyTitle: string
  emptySubtitle: string
}) {
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
        className="rounded-xl p-8 text-center"
        style={{
          background: "#ffffff",
          boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06)",
        }}
      >
        <EmptyIcon
          size={32}
          className="mx-auto mb-3"
          style={{ color: "#9ca3af" }}
        />
        <p className="font-medium" style={{ color: "#1d2a5d" }}>
          {emptyTitle}
        </p>
        <p className="mt-1 text-sm" style={{ color: "#64748b" }}>
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
            className="flex items-center justify-between rounded-xl px-5 py-4"
            style={{
              background: "#ffffff",
              boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06)",
            }}
          >
            <div className="min-w-0">
              <p
                className="truncate text-sm font-semibold"
                style={{ color: "#1d2a5d" }}
              >
                {s.summary}
              </p>
              <p className="mt-0.5 text-xs" style={{ color: "#94a3b8" }}>
                {FORM_LABELS[s.formType] ?? s.formType} · {s.id} · {date}
              </p>
            </div>
            <div className="ml-4 flex shrink-0 items-center gap-3">
              <span
                className="rounded-full px-3 py-1 text-xs font-semibold"
                style={{ background: statusStyle.bg, color: statusStyle.color }}
              >
                {statusStyle.label}
              </span>
              <span className="text-sm font-bold" style={{ color: "#1d2a5d" }}>
                ${s.amount.toFixed(2)}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
