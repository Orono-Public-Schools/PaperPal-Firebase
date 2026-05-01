import {
  useState,
  useRef,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from "react"
import { Pencil, Type, Trash2, Check, Save } from "lucide-react"

type SigMode = "saved" | "draw" | "type"

export interface SignatureFieldRef {
  getDataUrl: () => string
}

interface Props {
  savedSignatureUrl?: string
  fullName?: string
  onSaveSignature?: (dataUrl: string) => void
}

const SignatureField = forwardRef<SignatureFieldRef, Props>(
  ({ savedSignatureUrl, fullName, onSaveSignature }, ref) => {
    const [localSavedUrl, setLocalSavedUrl] = useState(savedSignatureUrl)
    const hasSaved = !!localSavedUrl
    const [mode, setMode] = useState<SigMode>(hasSaved ? "saved" : "draw")
    const [typedSig, setTypedSig] = useState("")
    const [savedMsg, setSavedMsg] = useState(false)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const drawing = useRef(false)
    const hasDrawn = useRef(false)

    useEffect(() => {
      if (mode !== "draw") return
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
    }, [mode])

    function getPos(
      e:
        | React.MouseEvent<HTMLCanvasElement>
        | React.TouchEvent<HTMLCanvasElement>
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
      e:
        | React.MouseEvent<HTMLCanvasElement>
        | React.TouchEvent<HTMLCanvasElement>
    ) {
      e.preventDefault()
      drawing.current = true
      hasDrawn.current = true
      const ctx = canvasRef.current?.getContext("2d")
      if (!ctx) return
      const { x, y } = getPos(e)
      ctx.beginPath()
      ctx.moveTo(x, y)
    }

    function draw(
      e:
        | React.MouseEvent<HTMLCanvasElement>
        | React.TouchEvent<HTMLCanvasElement>
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
      hasDrawn.current = false
    }

    function getCurrentDataUrl(): string {
      if (mode === "saved") return localSavedUrl ?? ""
      if (mode === "type") {
        if (!typedSig.trim()) return ""
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
      if (!hasDrawn.current) return ""
      return canvasRef.current?.toDataURL() ?? ""
    }

    function handleSaveToProfile() {
      const dataUrl = getCurrentDataUrl()
      if (!dataUrl || !onSaveSignature) return
      onSaveSignature(dataUrl)
      setLocalSavedUrl(dataUrl)
      setMode("saved")
      setSavedMsg(true)
      setTimeout(() => setSavedMsg(false), 2500)
    }

    useImperativeHandle(ref, () => ({
      getDataUrl: () => getCurrentDataUrl(),
    }))

    const modes: { id: SigMode; label: string; icon: typeof Pencil }[] = [
      ...(hasSaved
        ? [{ id: "saved" as SigMode, label: "Saved", icon: Check }]
        : []),
      { id: "draw", label: "Draw", icon: Pencil },
      { id: "type", label: "Type", icon: Type },
    ]

    return (
      <div>
        {/* Mode switcher */}
        <div
          className="mb-3 inline-flex gap-1 rounded-lg border p-1"
          style={{ background: "#f8f9fb", borderColor: "#e2e5ea" }}
        >
          {modes.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setMode(id)}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200"
              style={
                mode === id
                  ? {
                      background:
                        "linear-gradient(135deg, #1d2a5d 0%, #2d3f89 100%)",
                      color: "white",
                      boxShadow: "0 2px 8px rgba(29,42,93,0.25)",
                    }
                  : { color: "#64748b" }
              }
            >
              <Icon size={12} />
              {label}
            </button>
          ))}
        </div>

        {/* Saved signature */}
        {mode === "saved" && localSavedUrl && (
          <div
            className="flex items-center gap-3 rounded-[10px] p-3"
            style={{ background: "#f8f9fb", border: "1px solid #e2e5ea" }}
          >
            <img
              src={localSavedUrl}
              alt="Saved signature"
              className="rounded-[8px]"
              style={{ maxHeight: "60px", background: "#f4f5f7" }}
            />
            <p className="text-xs font-medium" style={{ color: "#ad2122" }}>
              Using your saved signature
            </p>
          </div>
        )}

        {/* Draw */}
        {mode === "draw" && (
          <div>
            <canvas
              ref={canvasRef}
              width={800}
              height={200}
              className="w-full touch-none rounded-[10px]"
              style={{
                background: "#f8f9fb",
                border: "1px solid #e2e5ea",
                cursor: "crosshair",
                maxHeight: "120px",
              }}
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={stopDraw}
              onMouseLeave={stopDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={stopDraw}
            />
            <div className="mt-1.5 flex items-center gap-3">
              <button
                type="button"
                onClick={clearCanvas}
                className="flex cursor-pointer items-center gap-1 text-xs font-medium"
                style={{ color: "#94a3b8" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#ad2122")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}
              >
                <Trash2 size={11} />
                Clear
              </button>
              {onSaveSignature && (
                <button
                  type="button"
                  onClick={handleSaveToProfile}
                  className="flex cursor-pointer items-center gap-1 text-xs font-medium"
                  style={{ color: "#4356a9" }}
                >
                  <Save size={11} />
                  Save as my signature
                </button>
              )}
              {savedMsg && (
                <span
                  className="text-xs font-medium"
                  style={{ color: "#059669" }}
                >
                  Saved!
                </span>
              )}
            </div>
          </div>
        )}

        {/* Type */}
        {mode === "type" && (
          <div>
            <input
              type="text"
              value={typedSig}
              onChange={(e) => setTypedSig(e.target.value)}
              placeholder={fullName ?? "Your name"}
              className="input-neu w-full"
              style={{ fontFamily: "Caveat, cursive", fontSize: "1.25rem" }}
            />
            {typedSig && (
              <>
                <p
                  className="mt-1.5"
                  style={{
                    color: "#1d2a5d",
                    fontFamily: "Caveat, cursive",
                    fontSize: "1.25rem",
                  }}
                >
                  {typedSig}
                </p>
                {onSaveSignature && (
                  <div className="mt-1.5 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleSaveToProfile}
                      className="flex cursor-pointer items-center gap-1 text-xs font-medium"
                      style={{ color: "#4356a9" }}
                    >
                      <Save size={11} />
                      Save as my signature
                    </button>
                    {savedMsg && (
                      <span
                        className="text-xs font-medium"
                        style={{ color: "#059669" }}
                      >
                        Saved!
                      </span>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    )
  }
)

SignatureField.displayName = "SignatureField"
export default SignatureField
