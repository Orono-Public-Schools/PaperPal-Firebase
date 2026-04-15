import type { ReactNode } from "react"
import AppHeader from "@/components/layout/AppHeader"

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-12">
        {children}
      </main>
      <footer className="py-5 text-center text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
        Orono Public Schools &mdash; PaperPal &copy;{" "}
        {new Date().getFullYear()}
      </footer>
    </div>
  )
}
