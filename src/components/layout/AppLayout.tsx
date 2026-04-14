import type { ReactNode } from "react"
import AppHeader from "@/components/layout/AppHeader"

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: "#f0f2f5" }}>
      <AppHeader />
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  )
}
