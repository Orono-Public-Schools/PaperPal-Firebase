import type { ReactNode } from "react"
import AppHeader from "@/components/layout/AppHeader"

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ background: "#f0f2f5" }}
    >
      <AppHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-12">
        {children}
      </main>
      <footer className="py-5 text-center text-xs" style={{ color: "#9ca3af" }}>
        Orono Public Schools No. 278 &mdash; PaperPal &copy;{" "}
        {new Date().getFullYear()}
      </footer>
    </div>
  )
}
