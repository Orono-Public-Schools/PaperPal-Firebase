import { useState } from "react"
import { LogOut, Menu, X, ShieldCheck, LayoutDashboard } from "lucide-react"
import { useNavigate, useLocation } from "react-router"
import { useAuth } from "@/hooks/useAuth"

const NAV_LINKS = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard, adminOnly: false },
  { label: "Admin", path: "/admin", icon: ShieldCheck, adminOnly: true },
]

export default function AppHeader() {
  const { userProfile, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const isAdmin =
    userProfile?.role === "admin" || userProfile?.role === "business_office"

  const visibleLinks = NAV_LINKS.filter((l) => !l.adminOnly || isAdmin)

  function handleNav(path: string) {
    navigate(path)
    setSidebarOpen(false)
  }

  return (
    <>
      <header
        className="sticky top-0 z-50 flex items-center justify-between px-6 py-3"
        style={{
          background: "#1d2a5d",
          boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
        }}
      >
        {/* Left: branding */}
        <button
          onClick={() => navigate("/")}
          className="flex cursor-pointer items-center gap-2"
        >
          <img
            src="/orono-paperpal.png"
            alt="PaperPal"
            className="h-10 w-10 object-contain"
          />
          <div className="text-xl font-bold tracking-tight text-white">
            PaperPal
          </div>
        </button>

        {/* Right: user + hamburger */}
        <div className="flex items-center gap-3">
          {userProfile && (
            <div className="flex items-center gap-2">
              {userProfile.photoURL ? (
                <img
                  src={userProfile.photoURL}
                  alt={userProfile.fullName}
                  className="h-7 w-7 rounded-full object-cover"
                  style={{ border: "2px solid rgba(255,255,255,0.2)" }}
                />
              ) : (
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold text-white"
                  style={{ background: "rgba(255,255,255,0.15)" }}
                >
                  {userProfile.firstName?.[0]}
                  {userProfile.lastName?.[0]}
                </div>
              )}
              <span className="text-sm text-white/90">
                {userProfile.firstName}
              </span>
            </div>
          )}

          <button
            onClick={signOut}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            title="Sign out"
          >
            <LogOut size={14} />
            Sign out
          </button>

          <button
            onClick={() => setSidebarOpen(true)}
            className="flex cursor-pointer items-center justify-center rounded-lg p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
        </div>
      </header>

      {/* Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 transition-opacity duration-300"
          style={{ background: "rgba(0,0,0,0.3)" }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className="fixed top-0 right-0 z-50 flex h-full w-64 flex-col"
        style={{
          background: "#1d2a5d",
          boxShadow: "-4px 0 24px rgba(0,0,0,0.25)",
          transform: sidebarOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.25s ease",
        }}
      >
        {/* Sidebar header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}
        >
          <span className="text-sm font-semibold tracking-widest text-white/80 uppercase">
            Menu
          </span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="cursor-pointer rounded-lg p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex flex-col gap-1 p-4">
          {visibleLinks.map(({ label, path, icon: Icon }) => {
            const active = location.pathname === path
            return (
              <button
                key={path}
                onClick={() => handleNav(path)}
                className="flex cursor-pointer items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors duration-150"
                style={{
                  background: active ? "rgba(255,255,255,0.15)" : "transparent",
                  color: active ? "white" : "rgba(255,255,255,0.65)",
                }}
                onMouseEnter={(e) => {
                  if (!active)
                    (e.currentTarget as HTMLButtonElement).style.color = "white"
                }}
                onMouseLeave={(e) => {
                  if (!active)
                    (e.currentTarget as HTMLButtonElement).style.color =
                      "rgba(255,255,255,0.65)"
                }}
              >
                <Icon size={16} />
                {label}
              </button>
            )
          })}
        </nav>
      </aside>
    </>
  )
}
