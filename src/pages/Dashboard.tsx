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
    color: "#1e3a8a",
    innerBg: "#ecf0ff",
    iconBg: "#bed6fb",
    shadow: "rgba(30,58,138,0.2)",
    path: "/forms/check",
  },
  {
    id: "mileage",
    title: "Mileage Reimbursement",
    description: "Claim mileage reimbursement at $0.70 per mile.",
    icon: Car,
    color: "#059669",
    innerBg: "#e6faf2",
    iconBg: "#a7f3d0",
    shadow: "rgba(5,150,105,0.2)",
    path: "/forms/mileage",
  },
  {
    id: "travel",
    title: "Travel Reimbursement",
    description:
      "Request reimbursement for travel with estimated and actual expenses.",
    icon: Briefcase,
    color: "#7c3aed",
    innerBg: "#f0ecff",
    iconBg: "#c4b5fd",
    shadow: "rgba(124,58,237,0.2)",
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
    label: "Reviewed",
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
        <h1 className="text-2xl font-bold" style={{ color: "#1d2a5d" }}>
          {userProfile?.firstName
            ? `Welcome back, ${userProfile.firstName}.`
            : "Welcome back."}
        </h1>
        <p className="mt-1 text-sm" style={{ color: "#64748b" }}>
          Manage your district forms and reimbursement requests.
        </p>
      </div>

      {/* Tabs */}
      <div
        className="mb-6 flex gap-1 rounded border p-1"
        style={{
          background: "#f8f9fb",
          borderColor: "#e2e5ea",
        }}
      >
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded px-4 py-2.5 text-sm font-medium transition-all duration-200"
              style={
                active
                  ? {
                      background:
                        "linear-gradient(135deg, #1d2a5d 0%, #2d3f89 100%)",
                      color: "white",
                      boxShadow: "0 2px 8px rgba(29,42,93,0.25)",
                    }
                  : { color: "#64748b" }
              }
              onMouseEnter={(e) => {
                if (!active)
                  (e.currentTarget as HTMLButtonElement).style.color = "#1d2a5d"
              }}
              onMouseLeave={(e) => {
                if (!active)
                  (e.currentTarget as HTMLButtonElement).style.color = "#64748b"
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
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FORM_TYPES.map(
            ({ id, title, description, icon: Icon, color, innerBg, iconBg, shadow, path }) => (
              <button
                key={id}
                onClick={() => navigate(path)}
                className="group cursor-pointer rounded-2xl p-2.5 text-left transition-all duration-200 hover:-translate-y-1"
                style={{
                  background: "#ffffff",
                  boxShadow: `0 30px 30px -25px ${shadow}`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = `0 35px 35px -20px ${shadow}`
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = `0 30px 30px -25px ${shadow}`
                }}
              >
                <div
                  className="flex flex-col rounded-xl px-5 pt-10 pb-6"
                  style={{ background: innerBg }}
                >
                  {/* Icon */}
                  <div
                    className="mb-4 flex h-12 w-12 items-center justify-center rounded-full"
                    style={{ background: iconBg }}
                  >
                    <Icon size={22} style={{ color: "#ffffff" }} />
                  </div>

                  {/* Title */}
                  <h3
                    className="mb-1.5 text-lg font-semibold"
                    style={{ color: "#425275" }}
                  >
                    {title}
                  </h3>

                  {/* Description */}
                  <p
                    className="mb-5 text-sm leading-relaxed"
                    style={{ color: "#697e91" }}
                  >
                    {description}
                  </p>

                  {/* CTA */}
                  <div
                    className="mt-auto w-full rounded-md py-2.5 text-center text-sm font-semibold text-white transition-opacity duration-200"
                    style={{ background: color }}
                  >
                    Get Started
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
            className="h-16 animate-pulse rounded-2xl"
            style={{ background: "#f5f7ff" }}
          />
        ))}
      </div>
    )
  }

  if (submissions.length === 0) {
    return (
      <div
        className="rounded-2xl p-2.5"
        style={{
          background: "#ffffff",
          boxShadow: "0 30px 30px -25px rgba(29,42,93,0.12)",
        }}
      >
        <div className="rounded-xl p-8 text-center" style={{ background: "#f5f7ff" }}>
          <EmptyIcon
            size={32}
            className="mx-auto mb-3"
            style={{ color: "#9ca3af" }}
          />
          <p className="font-medium" style={{ color: "#425275" }}>
            {emptyTitle}
          </p>
          <p className="mt-1 text-sm" style={{ color: "#697e91" }}>
            {emptySubtitle}
          </p>
        </div>
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
            className="flex items-center justify-between rounded-2xl px-5 py-4"
            style={{
              background: "#ffffff",
              boxShadow: "0 20px 25px -20px rgba(29,42,93,0.1)",
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
