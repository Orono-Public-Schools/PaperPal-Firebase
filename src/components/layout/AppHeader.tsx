import { useState, useRef, useEffect } from "react"
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
  LayoutDashboard,
  UserCircle,
  Settings,
  FlaskConical,
} from "lucide-react"
import { useNavigate, useLocation } from "react-router"
import { useAuth } from "@/hooks/useAuth"
import { useSandbox } from "@/hooks/useSandbox"

const NAV_SECTIONS = [
  {
    label: "Navigate",
    adminOnly: false,
    links: [{ label: "Dashboard", path: "/", icon: LayoutDashboard }],
  },
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
    label: "Account",
    adminOnly: false,
    links: [{ label: "Profile Settings", path: "/profile", icon: UserCircle }],
  },
  {
    label: "Admin",
    adminOnly: true,
    links: [{ label: "Admin Panel", path: "/admin", icon: ShieldCheck }],
  },
]

export default function AppHeader() {
  const { userProfile, signOut } = useAuth()
  const { sandbox, setSandbox } = useSandbox()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        profileRef.current &&
        !profileRef.current.contains(e.target as Node)
      ) {
        setProfileOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const isAdmin =
    userProfile?.role === "admin" ||
    userProfile?.role === "controller" ||
    userProfile?.role === "business_office"

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
      <div className="sticky top-0 z-50">
      {sandbox && (
        <div
          className="flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-semibold"
          style={{ background: "#eab308", color: "#422006" }}
        >
          <FlaskConical size={12} />
          Sandbox Mode — emails go to you only, no Drive uploads
          <button
            onClick={() => { setSandbox(false); window.location.reload() }}
            className="ml-2 cursor-pointer rounded px-2 py-0.5 text-[11px] font-bold transition-colors"
            style={{ background: "rgba(66,32,6,0.15)", color: "#422006" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(66,32,6,0.25)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(66,32,6,0.15)")}
          >
            Turn Off
          </button>
        </div>
      )}
      <header
        className="flex items-center justify-between px-6 py-3"
        style={{
          background: "#1d2a5d",
          boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
        }}
      >
        {/* Left: branding */}
        <button
          onClick={() => navigate("/")}
          className="flex cursor-pointer items-center"
          style={{ gap: "2px" }}
        >
          <img
            src="/orono-paperpal.png"
            alt="PaperPal"
            className="h-12 w-12 object-contain"
          />
          <div className="text-xl font-bold tracking-tight text-white">
            PaperPal
          </div>
        </button>

        {/* Right: hamburger + user + sign out */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex cursor-pointer items-center justify-center rounded p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>

          {userProfile && (
            <div ref={profileRef} className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 transition-colors hover:bg-white/10"
              >
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
              </button>

              {profileOpen && (
                <div
                  className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-lg py-1"
                  style={{
                    background: "#ffffff",
                    boxShadow:
                      "0 4px 20px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.08)",
                    border: "1px solid #e2e5ea",
                  }}
                >
                  <button
                    onClick={() => {
                      navigate("/profile")
                      setProfileOpen(false)
                    }}
                    className="flex w-full cursor-pointer items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-gray-50"
                    style={{ color: "#334155" }}
                  >
                    <Settings size={15} style={{ color: "#64748b" }} />
                    Profile Settings
                  </button>
                  <div style={{ borderTop: "1px solid #e2e5ea" }} />
                  <button
                    onClick={() => {
                      signOut()
                      setProfileOpen(false)
                    }}
                    className="flex w-full cursor-pointer items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-gray-50"
                    style={{ color: "#ad2122" }}
                  >
                    <LogOut size={15} />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>
      </div>

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
            className="cursor-pointer rounded p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
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
                      className="flex cursor-pointer items-center gap-3 rounded px-3 py-2.5 text-sm font-medium transition-colors duration-150"
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

        {/* Sandbox toggle (controller+) */}
        {isAdmin && (
          <div
            className="mx-4 mt-auto rounded-lg p-3"
            style={{
              background: sandbox
                ? "rgba(234,179,8,0.15)"
                : "rgba(255,255,255,0.05)",
              border: sandbox
                ? "1px solid rgba(234,179,8,0.3)"
                : "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <label className="flex cursor-pointer items-center gap-2.5">
              <FlaskConical
                size={15}
                style={{ color: sandbox ? "#eab308" : "rgba(255,255,255,0.4)" }}
              />
              <span
                className="flex-1 text-sm font-medium"
                style={{
                  color: sandbox ? "#eab308" : "rgba(255,255,255,0.6)",
                }}
              >
                Sandbox Mode
              </span>
              <div
                className="relative h-5 w-9 rounded-full transition-colors"
                style={{
                  background: sandbox ? "#eab308" : "rgba(255,255,255,0.2)",
                }}
                onClick={() => { setSandbox(!sandbox); window.location.reload() }}
              >
                <div
                  className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform"
                  style={{
                    left: sandbox ? "18px" : "2px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                  }}
                />
              </div>
            </label>
            {sandbox && (
              <p
                className="mt-1.5 text-[10px]"
                style={{ color: "rgba(234,179,8,0.7)" }}
              >
                Emails go to you only. No Drive uploads.
              </p>
            )}
          </div>
        )}

        {/* Bottom: sign out */}
        <div
          className="p-4"
          style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}
        >
          <button
            onClick={signOut}
            className="flex w-full cursor-pointer items-center gap-3 rounded px-3 py-2.5 text-sm font-medium text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </aside>
    </>
  )
}
