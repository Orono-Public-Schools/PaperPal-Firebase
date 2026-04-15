import { useState, useEffect, useRef } from "react"
import { Grid3X3, X } from "lucide-react"
import { getBudgetSegments } from "@/lib/firestore"
import type { BudgetSegmentType, BudgetSegment } from "@/lib/types"

interface Props {
  value: string
  onChange: (value: string) => void
}

const SEGMENT_ORDER: { type: BudgetSegmentType; label: string }[] = [
  { type: "fund", label: "Fund" },
  { type: "org", label: "Organization" },
  { type: "proj", label: "Project" },
  { type: "fin", label: "Finance" },
  { type: "course", label: "Course" },
  { type: "obj", label: "Object" },
]

export default function BudgetCodeBuilder({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [segments, setSegments] = useState<Record<BudgetSegmentType, BudgetSegment[]> | null>(null)
  const [picks, setPicks] = useState<Record<BudgetSegmentType, string>>({
    fund: "", org: "", proj: "", fin: "", course: "", obj: "",
  })
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getBudgetSegments().then(setSegments)
  }, [])

  // Parse existing value into picks when opening
  useEffect(() => {
    if (open && value) {
      const parts = value.split("-")
      if (parts.length === 6) {
        setPicks({
          fund: parts[0], org: parts[1], proj: parts[2],
          fin: parts[3], course: parts[4], obj: parts[5],
        })
      }
    }
  }, [open, value])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  function selectSegment(type: BudgetSegmentType, code: string) {
    const updated = { ...picks, [type]: code }
    setPicks(updated)

    // Auto-assemble if all segments are picked
    const allPicked = SEGMENT_ORDER.every((s) => updated[s.type])
    if (allPicked) {
      const assembled = SEGMENT_ORDER.map((s) => updated[s.type]).join("-")
      onChange(assembled)
    }
  }

  function apply() {
    const assembled = SEGMENT_ORDER.map((s) => picks[s.type] || "###").join("-")
    onChange(assembled)
    setOpen(false)
  }

  function clear() {
    setPicks({ fund: "", org: "", proj: "", fin: "", course: "", obj: "" })
    onChange("")
  }

  const preview = SEGMENT_ORDER.map((s) => picks[s.type] || "###").join("-")
  const hasSegments = segments && SEGMENT_ORDER.some((s) => (segments[s.type]?.length ?? 0) > 0)

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="mt-1 flex cursor-pointer items-center gap-1.5 text-xs font-semibold transition-colors"
        style={{ color: "#4356a9" }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "#1d2a5d")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "#4356a9")}
      >
        <Grid3X3 size={12} />
        Budget Code Builder
      </button>

      {open && (
        <div
          className="absolute z-50 mt-1 rounded-xl p-4"
          style={{
            background: "#ffffff",
            boxShadow: "0 4px 24px rgba(0,0,0,0.18), 0 1px 3px rgba(0,0,0,0.08)",
            border: "1px solid #e2e5ea",
            width: "340px",
            left: 0,
          }}
        >
          <div className="mb-3 flex items-center justify-between">
            <h3
              className="text-sm font-semibold"
              style={{ color: "#1d2a5d" }}
            >
              Build Budget Code
            </h3>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="cursor-pointer rounded p-1 transition-colors"
              style={{ color: "#94a3b8" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#1d2a5d")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}
            >
              <X size={14} />
            </button>
          </div>

          {/* Preview */}
          <div
            className="mb-3 rounded-lg px-3 py-2 text-center font-mono text-sm font-semibold tracking-wider"
            style={{ background: "#f0f2f5", color: "#1d2a5d" }}
          >
            {preview}
          </div>

          {!hasSegments ? (
            <p className="py-4 text-center text-xs" style={{ color: "#94a3b8" }}>
              No budget segments configured. An admin can add them in the Admin Panel.
            </p>
          ) : (
            <div className="space-y-2">
              {SEGMENT_ORDER.map((seg) => {
                const items = segments?.[seg.type] ?? []
                if (items.length === 0) return null

                return (
                  <div key={seg.type}>
                    <label
                      className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wider"
                      style={{ color: "#94a3b8" }}
                    >
                      {seg.label}
                    </label>
                    <select
                      value={picks[seg.type]}
                      onChange={(e) => selectSegment(seg.type, e.target.value)}
                      className="input-neu w-full cursor-pointer text-xs"
                    >
                      <option value="">Select {seg.label}…</option>
                      {items.map((s) => (
                        <option key={s.code} value={s.code}>
                          {s.code} — {s.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )
              })}
            </div>
          )}

          {/* Actions */}
          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              onClick={clear}
              className="cursor-pointer text-xs font-medium transition-colors"
              style={{ color: "#94a3b8" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#ad2122")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}
            >
              Clear
            </button>
            <button
              type="button"
              onClick={apply}
              className="cursor-pointer rounded-lg px-4 py-1.5 text-xs font-semibold text-white transition-colors"
              style={{ background: "#1d2a5d" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#2d3f89")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#1d2a5d")}
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
