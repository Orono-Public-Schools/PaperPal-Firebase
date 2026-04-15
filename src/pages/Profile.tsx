import { useState, useRef, useEffect } from "react"
import { Check, Trash2, Pencil, Type } from "lucide-react"
import AppLayout from "@/components/layout/AppLayout"
import { useAuth } from "@/hooks/useAuth"
import { createOrUpdateUserProfile } from "@/lib/firestore"

type SigTab = "draw" | "type"

export default function Profile() {
  const { user, userProfile } = useAuth()

  // Editable profile fields
  const [firstName, setFirstName] = useState(userProfile?.firstName ?? "")
  const [lastName, setLastName] = useState(userProfile?.lastName ?? "")
  const [employeeId, setEmployeeId] = useState(userProfile?.employeeId ?? "")
  const [building, setBuilding] = useState(userProfile?.building ?? "")
  const [supervisorEmail, setSupervisorEmail] = useState(
    userProfile?.supervisorEmail ?? ""
  )

  // Signature
  const [sigTab, setSigTab] = useState<SigTab>("draw")
  const [typedSig, setTypedSig] = useState("")
  const [savedSig, setSavedSig] = useState(userProfile?.savedSignatureUrl ?? "")
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // ── Canvas drawing ──────────────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.fillStyle = "#f4f5f7"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = "#1d2a5d"
    ctx.lineWidth = 2
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
  }, [sigTab])

  function getPos(
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ("touches" in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      }
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  function startDraw(
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) {
    e.preventDefault()
    drawing.current = true
    const ctx = canvasRef.current?.getContext("2d")
    if (!ctx) return
    const { x, y } = getPos(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  function draw(
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) {
    e.preventDefault()
    if (!drawing.current) return
    const ctx = canvasRef.current?.getContext("2d")
    if (!ctx) return
    const { x, y } = getPos(e)
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  function stopDraw() {
    drawing.current = false
  }

  function clearCanvas() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.fillStyle = "#f4f5f7"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  function getSignatureDataUrl(): string {
    if (sigTab === "type") {
      if (!typedSig.trim()) return savedSig
      const canvas = document.createElement("canvas")
      canvas.width = 400
      canvas.height = 100
      const ctx = canvas.getContext("2d")!
      ctx.fillStyle = "#f4f5f7"
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.font = "48px Caveat, cursive"
      ctx.fillStyle = "#1d2a5d"
      ctx.textBaseline = "middle"
      ctx.fillText(typedSig, 16, 50)
      return canvas.toDataURL()
    }
    return canvasRef.current?.toDataURL() ?? savedSig
  }

  // ── Save ────────────────────────────────────────────────────────────────────

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    try {
      const sigDataUrl = getSignatureDataUrl()
      await createOrUpdateUserProfile(user.uid, {
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`.trim(),
        employeeId,
        building,
        supervisorEmail,
        ...(sigDataUrl ? { savedSignatureUrl: sigDataUrl } : {}),
      })
      if (sigDataUrl) setSavedSig(sigDataUrl)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: "#1d2a5d" }}>
          Profile Settings
        </h1>
        <p className="mt-1 text-sm" style={{ color: "#64748b" }}>
          Your saved details pre-fill forms automatically.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Personal info */}
        <Section title="Personal Information">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First Name">
              <input
                type="text"
                value={firstName}
                required
                onChange={(e) => setFirstName(e.target.value)}
                className="input-neu"
              />
            </Field>
            <Field label="Last Name">
              <input
                type="text"
                value={lastName}
                required
                onChange={(e) => setLastName(e.target.value)}
                className="input-neu"
              />
            </Field>
            <Field label="Employee ID">
              <input
                type="text"
                value={employeeId}
                placeholder="e.g. 12345"
                onChange={(e) => setEmployeeId(e.target.value)}
                className="input-neu"
              />
            </Field>
            <Field label="Building / School">
              <input
                type="text"
                value={building}
                placeholder="e.g. Orono Middle School"
                onChange={(e) => setBuilding(e.target.value)}
                className="input-neu"
              />
            </Field>
            <Field label="Supervisor Email">
              <input
                type="email"
                value={supervisorEmail}
                placeholder="supervisor@orono.k12.mn.us"
                onChange={(e) => setSupervisorEmail(e.target.value)}
                className="input-neu"
              />
            </Field>
            <Field label="Email">
              <input
                type="text"
                readOnly
                value={user?.email ?? ""}
                className="input-neu"
              />
            </Field>
          </div>
        </Section>

        {/* Signature */}
        <Section title="Saved Signature">
          <p className="mb-4 text-sm" style={{ color: "#64748b" }}>
            Your signature will be applied automatically when submitting forms.
          </p>

          {/* Tab switcher */}
          <div
            className="mb-4 inline-flex gap-1 rounded-xl p-1"
            style={{
              background: "linear-gradient(145deg, #eaecf0, #f5f6f8)",
              boxShadow:
                "inset 2px 2px 5px rgba(180,185,195,0.3), inset -2px -2px 5px rgba(255,255,255,0.7)",
            }}
          >
            {(["draw", "type"] as SigTab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setSigTab(t)}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200"
                style={
                  sigTab === t
                    ? {
                        background:
                          "linear-gradient(135deg, #1d2a5d 0%, #2d3f89 100%)",
                        color: "white",
                        boxShadow: "0 2px 8px rgba(29,42,93,0.25)",
                      }
                    : { color: "#64748b" }
                }
              >
                {t === "draw" ? <Pencil size={13} /> : <Type size={13} />}
                {t === "draw" ? "Draw" : "Type"}
              </button>
            ))}
          </div>

          {sigTab === "draw" && (
            <div>
              <canvas
                ref={canvasRef}
                width={600}
                height={150}
                className="w-full touch-none rounded-[14px]"
                style={{
                  background: "#f4f5f7",
                  boxShadow:
                    "inset 2px 2px 5px rgba(180,185,195,0.35), inset -2px -2px 5px rgba(255,255,255,0.9)",
                  cursor: "crosshair",
                  maxHeight: "150px",
                }}
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={stopDraw}
                onMouseLeave={stopDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={stopDraw}
              />
              <button
                type="button"
                onClick={clearCanvas}
                className="mt-2 flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                style={{ color: "#94a3b8" }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.color =
                    "#ad2122")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.color =
                    "#94a3b8")
                }
              >
                <Trash2 size={13} />
                Clear
              </button>
            </div>
          )}

          {sigTab === "type" && (
            <div>
              <input
                type="text"
                value={typedSig}
                onChange={(e) => setTypedSig(e.target.value)}
                placeholder={userProfile?.fullName ?? "Your name"}
                className="input-neu w-full"
                style={{ fontFamily: "Caveat, cursive", fontSize: "1.5rem" }}
              />
              {typedSig && (
                <p
                  className="mt-2 text-xs"
                  style={{
                    color: "#94a3b8",
                    fontFamily: "Caveat, cursive",
                    fontSize: "1.25rem",
                  }}
                >
                  Preview: {typedSig}
                </p>
              )}
            </div>
          )}

          {/* Existing saved signature preview */}
          {savedSig && (
            <div className="mt-4">
              <p
                className="mb-1 text-xs font-semibold tracking-wider uppercase"
                style={{ color: "#64748b" }}
              >
                Currently saved
              </p>
              <img
                src={savedSig}
                alt="Saved signature"
                className="rounded-[10px]"
                style={{ maxHeight: "80px", background: "#f4f5f7" }}
              />
            </div>
          )}
        </Section>

        {/* Save button */}
        <div className="flex justify-end gap-3">
          {saved && (
            <span
              className="flex items-center gap-1.5 text-sm font-medium"
              style={{ color: "#059669" }}
            >
              <Check size={15} />
              Saved!
            </span>
          )}
          <button
            type="submit"
            disabled={saving}
            className="cursor-pointer rounded-xl px-6 py-2.5 text-sm font-semibold text-white transition-all duration-200 disabled:opacity-60"
            style={{
              background: "linear-gradient(135deg, #1d2a5d 0%, #2d3f89 100%)",
              boxShadow: "0 2px 8px rgba(29,42,93,0.25)",
            }}
          >
            {saving ? "Saving…" : "Save Profile"}
          </button>
        </div>
      </form>
    </AppLayout>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div
      className="rounded-[18px] p-5"
      style={{
        background: "linear-gradient(145deg, #fafbfd, #edeef1)",
        boxShadow:
          "4px 4px 10px rgba(180,185,195,0.35), -4px -4px 10px rgba(255,255,255,0.75)",
      }}
    >
      <h2
        className="mb-4 text-sm font-semibold tracking-widest uppercase"
        style={{ color: "#1d2a5d" }}
      >
        {title}
      </h2>
      {children}
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label
        className="mb-1 block text-xs font-semibold tracking-wider uppercase"
        style={{ color: "#64748b" }}
      >
        {label}
      </label>
      {children}
    </div>
  )
}
