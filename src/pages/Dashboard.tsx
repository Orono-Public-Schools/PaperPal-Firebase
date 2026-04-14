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
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FORM_TYPES.map(
            ({ id, title, description, icon: Icon, pill, path }) => (
              <button
                key={id}
                onClick={() => navigate(path)}
                className="group cursor-pointer overflow-hidden rounded-[20px] text-center transition-all duration-500"
                style={{
                  backgroundColor: "#edeef1",
                  border: "8px solid #edeef1",
                  maxHeight: "160px",
                  boxShadow:
                    "inset 4px 4px 8px rgba(180,185,195,0.45), inset -4px -4px 8px rgba(255,255,255,0.85)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.maxHeight = "320px"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.maxHeight = "160px"
                }}
              >
                {/* Icon circle */}
                <div
                  className="mx-auto mt-5 mb-3 flex h-14 w-14 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: "#edeef1",
                    boxShadow:
                      "6px 6px 10px rgba(180,185,195,0.45), -6px -6px 10px rgba(255,255,255,0.85)",
                  }}
                >
                  <Icon size={24} style={{ color: pill.from }} />
                </div>

                {/* Title — always visible */}
                <div
                  className="px-4 pb-4 text-sm font-semibold"
                  style={{ color: "#1d2a5d" }}
                >
                  {title}
                </div>

                {/* Content — slides in on hover */}
                <div
                  className="mx-3 mb-3 -translate-y-6 scale-0 rounded-xl px-4 py-3 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100"
                  style={{
                    backgroundColor: "#edeef1",
                    boxShadow:
                      "5px 5px 8px rgba(180,185,195,0.4), -5px -5px 8px rgba(255,255,255,0.8)",
                  }}
                >
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "#475569" }}
                  >
                    {description}
                  </p>
                  <p
                    className="mt-3 text-sm font-semibold"
                    style={{ color: pill.from }}
                  >
                    Start →
                  </p>
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
