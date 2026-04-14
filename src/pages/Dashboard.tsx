import { useState } from "react"
import { useNavigate } from "react-router"
import { FileText, Car, Briefcase, Clock, History, Plus } from "lucide-react"
import AppLayout from "@/components/layout/AppLayout"
import { useAuth } from "@/hooks/useAuth"

const FORM_TYPES = [
  {
    id: "check",
    title: "Check Request",
    description: "Submit a payment request for a vendor or service.",
    icon: FileText,
    pill: { from: "#1e3a8a", to: "#3b82f6" },
    path: "/forms/check",
  },
  {
    id: "mileage",
    title: "Mileage Reimbursement",
    description: "Claim mileage reimbursement at $0.70 per mile.",
    icon: Car,
    pill: { from: "#059669", to: "#34d399" },
    path: "/forms/mileage",
  },
  {
    id: "travel",
    title: "Travel Reimbursement",
    description:
      "Request reimbursement for travel with estimated and actual expenses.",
    icon: Briefcase,
    pill: { from: "#8b5cf6", to: "#a855f7" },
    path: "/forms/travel",
  },
]

const TABS = [
  { id: "new", label: "New Request", icon: Plus },
  { id: "pending", label: "Pending", icon: Clock },
  { id: "history", label: "History", icon: History },
]

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("new")
  const { userProfile } = useAuth()
  const navigate = useNavigate()

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
        className="mb-6 flex gap-1 rounded-xl p-1"
        style={{
          background: "linear-gradient(145deg, #eaecf0, #f5f6f8)",
          boxShadow:
            "inset 2px 2px 5px rgba(180,185,195,0.3), inset -2px -2px 5px rgba(255,255,255,0.7)",
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FORM_TYPES.map(
            ({ id, title, description, icon: Icon, pill, path }) => (
              <button
                key={id}
                onClick={() => navigate(path)}
                className="group relative cursor-pointer rounded-[18px] p-5 text-left transition-all duration-300 hover:-translate-y-0.5"
                style={{
                  background: `linear-gradient(145deg, #fafbfd, #edeef1) padding-box, linear-gradient(180deg, ${pill.from}, ${pill.to}) border-box`,
                  borderLeft: "3px solid transparent",
                  boxShadow:
                    "3px 3px 8px rgba(180,185,195,0.25), -3px -3px 8px rgba(255,255,255,0.55)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow =
                    "2px 2px 6px rgba(180,185,195,0.3), -2px -2px 6px rgba(255,255,255,0.6), inset 1px 1px 3px rgba(180,185,195,0.1), inset -1px -1px 3px rgba(255,255,255,0.4)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow =
                    "3px 3px 8px rgba(180,185,195,0.25), -3px -3px 8px rgba(255,255,255,0.55)"
                }}
              >
                {/* Icon */}
                <div
                  className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{
                    background: `linear-gradient(135deg, ${pill.from}22, ${pill.to}33)`,
                  }}
                >
                  <Icon size={20} style={{ color: pill.from }} />
                </div>

                <h3
                  className="mb-1 text-base font-semibold"
                  style={{ color: "#1d2a5d" }}
                >
                  {title}
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "#64748b" }}
                >
                  {description}
                </p>

                {/* Hover arrow */}
                <div
                  className="absolute right-4 bottom-4 text-xs font-semibold opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                  style={{ color: pill.from }}
                >
                  Start →
                </div>
              </button>
            )
          )}
        </div>
      )}

      {/* Tab: Pending */}
      {activeTab === "pending" && (
        <div
          className="rounded-[18px] p-8 text-center"
          style={{
            background: "linear-gradient(145deg, #fafbfd, #edeef1)",
            boxShadow:
              "3px 3px 8px rgba(180,185,195,0.25), -3px -3px 8px rgba(255,255,255,0.55)",
          }}
        >
          <Clock
            size={32}
            className="mx-auto mb-3"
            style={{ color: "#9ca3af" }}
          />
          <p className="font-medium" style={{ color: "#1d2a5d" }}>
            No pending requests
          </p>
          <p className="mt-1 text-sm" style={{ color: "#64748b" }}>
            Submissions awaiting approval will appear here.
          </p>
        </div>
      )}

      {/* Tab: History */}
      {activeTab === "history" && (
        <div
          className="rounded-[18px] p-8 text-center"
          style={{
            background: "linear-gradient(145deg, #fafbfd, #edeef1)",
            boxShadow:
              "3px 3px 8px rgba(180,185,195,0.25), -3px -3px 8px rgba(255,255,255,0.55)",
          }}
        >
          <History
            size={32}
            className="mx-auto mb-3"
            style={{ color: "#9ca3af" }}
          />
          <p className="font-medium" style={{ color: "#1d2a5d" }}>
            No submissions yet
          </p>
          <p className="mt-1 text-sm" style={{ color: "#64748b" }}>
            Your completed requests will show up here.
          </p>
        </div>
      )}
    </AppLayout>
  )
}
