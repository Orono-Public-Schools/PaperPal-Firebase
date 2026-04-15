import { LogOut } from "lucide-react"
import { useNavigate } from "react-router"
import { useAuth } from "@/hooks/useAuth"

export default function AppHeader() {
  const { userProfile, signOut } = useAuth()
  const navigate = useNavigate()

  return (
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

      {/* Right: user + sign out */}
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
      </div>
    </header>
  )
}
