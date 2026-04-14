import { Navigate } from "react-router"
import { useAuth } from "@/hooks/useAuth"

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ background: "#f0f2f5" }}
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className="h-10 w-10 animate-spin rounded-full border-4 border-transparent"
            style={{ borderTopColor: "#1d2a5d" }}
          />
          <p className="text-sm" style={{ color: "#64748b" }}>
            Loading…
          </p>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  return <>{children}</>
}
