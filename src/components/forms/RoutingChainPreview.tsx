import { useState, useEffect } from "react"
import { AlertTriangle, ChevronRight } from "lucide-react"
import {
  resolveRoutingChain,
  getAppSettings,
  type RoutingChain,
} from "@/lib/firestore"
import type { AppSettings } from "@/lib/types"

interface Props {
  routeToEmail: string
}

export default function RoutingChainPreview({ routeToEmail }: Props) {
  const [chain, setChain] = useState<RoutingChain | null>(null)
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getAppSettings().then(setSettings)
  }, [])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      const trimmed = routeToEmail.trim()
      if (!trimmed.includes("@")) {
        if (!cancelled) setChain(null)
        return
      }
      await new Promise((r) => setTimeout(r, 400))
      if (cancelled) return
      setLoading(true)
      try {
        const resolved = await resolveRoutingChain(trimmed)
        if (!cancelled) setChain(resolved)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [routeToEmail])

  if (!routeToEmail.trim().includes("@")) return null
  if (!chain && !loading) return null

  return (
    <div
      className="mt-2 rounded-lg p-3"
      style={{
        background: "#f8f9fb",
        border: "1px solid rgba(180,185,195,0.25)",
      }}
    >
      <div className="mb-2 flex items-center justify-between">
        <p
          className="text-[11px] font-semibold tracking-wider uppercase"
          style={{ color: "#64748b" }}
        >
          Approval Chain
        </p>
        {chain && (
          <span
            className="text-[10px] font-semibold tracking-wider uppercase"
            style={{ color: "#4356a9" }}
          >
            {chain.flow}
          </span>
        )}
      </div>
      {loading && !chain ? (
        <p className="text-xs" style={{ color: "#94a3b8" }}>
          Resolving…
        </p>
      ) : chain ? (
        <div className="space-y-1.5">
          {!chain.routeToFound && (
            <div
              className="flex items-start gap-1.5 text-xs"
              style={{ color: "#ad2122" }}
            >
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              <span>
                <strong>{routeToEmail}</strong> isn't a registered user yet —
                they'll need to sign in once before they can approve.
              </span>
            </div>
          )}
          {chain.flow === "4-step" && chain.approverEmail && (
            <Step
              role="Approver"
              name={chain.approverName || ""}
              email={chain.approverEmail}
            />
          )}
          <Step
            role="Supervisor"
            name={chain.supervisorName || ""}
            email={chain.supervisorEmail}
            warning={
              chain.flow === "4-step" && !chain.supervisorEmail
                ? "Approver has no supervisor set on their profile"
                : undefined
            }
          />
          {settings?.finalApproverEmail && (
            <Step
              role="Controller"
              name={settings.finalApproverName || ""}
              email={settings.finalApproverEmail}
            />
          )}
        </div>
      ) : null}
    </div>
  )
}

function Step({
  role,
  name,
  email,
  warning,
}: {
  role: string
  name: string
  email: string
  warning?: string
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <ChevronRight size={12} style={{ color: "#94a3b8" }} />
      <span
        className="font-semibold"
        style={{ color: "#1d2a5d", minWidth: "78px" }}
      >
        {role}
      </span>
      <span style={{ color: "#334155" }}>
        {name || <em style={{ color: "#94a3b8" }}>(no name)</em>}
      </span>
      <span style={{ color: "#94a3b8" }}>{email}</span>
      {warning && (
        <span
          className="flex items-center gap-1"
          style={{ color: "#ad2122" }}
          title={warning}
        >
          <AlertTriangle size={12} />
        </span>
      )}
    </div>
  )
}
