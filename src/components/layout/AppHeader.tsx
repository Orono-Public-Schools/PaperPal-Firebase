import { useState } from "react"
import {
  LogOut,
  Menu,
  X,
  ShieldCheck,
  FileText,
  Car,
  Briefcase,
  Clock,
  History,
} from "lucide-react"
import { useNavigate, useLocation } from "react-router"
import { useAuth } from "@/hooks/useAuth"

const NAV_SECTIONS = [
  {
    label: "New Request",
    adminOnly: false,
    links: [
      { label: "Check Request", path: "/forms/check", icon: FileText },
      { label: "Mileage Reimbursement", path: "/forms/mileage", icon: Car },
      { label: "Travel Reimbursement", path: "/forms/travel", icon: Briefcase },
    ],
  },
  {
    label: "My Submissions",
    adminOnly: false,
    links: [
      { label: "Pending", path: "/?tab=pending", icon: Clock },
      { label: "History", path: "/?tab=history", icon: History },
    ],
  },
  {
    label: "Admin",
    adminOnly: true,
    links: [{ label: "Admin Panel", path: "/admin", icon: ShieldCheck }],
  },
]

export default function AppHeader() {
  const { userProfile, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const isAdmin =
    userProfile?.role === "admin" || userProfile?.role === "business_office"

  const visibleSections = NAV_SECTIONS.filter((s) => !s.adminOnly || isAdmin)

  function handleNav(path: string) {
    navigate(path)
    setSidebarOpen(false)
  }

  function isActive(path: string) {
    const [pathname, search] = path.split("?")
    if (search) {
      return (
        location.pathname === pathname &&
        location.search.includes(search.split("=")[1])
      )
    }
    return location.pathname === path
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

        {/* Right: hamburger + user + sign out */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex cursor-pointer items-center justify-center rounded-lg p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>

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
        </div>
      </header>

      {/* Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40"
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

        {/* Nav sections */}
        <nav className="flex flex-col gap-5 overflow-y-auto p-4">
          {visibleSections.map((section) => (
            <div key={section.label}>
              <p
                className="mb-1 px-2 text-[11px] font-semibold tracking-widest uppercase"
                style={{ color: "rgba(255,255,255,0.35)" }}
              >
                {section.label}
              </p>
              <div className="flex flex-col gap-0.5">
                {section.links.map(({ label, path, icon: Icon }) => {
                  const active = isActive(path)
                  return (
                    <button
                      key={path}
                      onClick={() => handleNav(path)}
                      className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-150"
                      style={{
                        background: active
                          ? "rgba(255,255,255,0.15)"
                          : "transparent",
                        color: active ? "white" : "rgba(255,255,255,0.65)",
                      }}
                      onMouseEnter={(e) => {
                        if (!active)
                          (e.currentTarget as HTMLButtonElement).style.color =
                            "white"
                      }}
                      onMouseLeave={(e) => {
                        if (!active)
                          (e.currentTarget as HTMLButtonElement).style.color =
                            "rgba(255,255,255,0.65)"
                      }}
                    >
                      <Icon size={15} />
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom: sign out */}
        <div
          className="mt-auto p-4"
          style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}
        >
          <button
            onClick={signOut}
            className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </aside>
    </>
  )
}
