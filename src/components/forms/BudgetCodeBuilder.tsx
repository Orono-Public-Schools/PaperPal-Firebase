import { useState, useEffect, useRef } from "react"
import { Grid3X3, X, Search, ChevronRight, Check } from "lucide-react"
import { getBudgetSegments } from "@/lib/firestore"
import type { BudgetSegmentType, BudgetSegment } from "@/lib/types"

interface Props {
  value: string
  onChange: (value: string) => void
}

const SEGMENT_ORDER: {
  type: BudgetSegmentType
  label: string
  size: number
}[] = [
  { type: "fund", label: "Fund", size: 2 },
  { type: "org", label: "Org", size: 3 },
  { type: "proj", label: "Program", size: 3 },
  { type: "fin", label: "Fin", size: 3 },
  { type: "course", label: "Course", size: 3 },
  { type: "obj", label: "Obj", size: 3 },
]

function padCode(code: string, size: number) {
  return code.padStart(size, "0").slice(0, size)
}

export default function BudgetCodeBuilder({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [segments, setSegments] = useState<Record<
    BudgetSegmentType,
    BudgetSegment[]
  > | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [picks, setPicks] = useState<Record<BudgetSegmentType, string>>({
    fund: "",
    org: "",
    proj: "",
    fin: "",
    course: "",
    obj: "",
  })
  const [search, setSearch] = useState("")
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getBudgetSegments().then(setSegments)
  }, [])

  function openModal() {
    // Parse existing value into picks
    if (value) {
      const parts = value.split("-")
      if (parts.length === 6) {
        setPicks({
          fund: parts[0],
          org: parts[1],
          proj: parts[2],
          fin: parts[3],
          course: parts[4],
          obj: parts[5],
        })
        // Find first empty or go to first
        const firstEmpty = SEGMENT_ORDER.findIndex(
          (s) => !parts[SEGMENT_ORDER.indexOf(s)]
        )
        setActiveIndex(firstEmpty >= 0 ? firstEmpty : 0)
      } else {
        resetPicks()
      }
    } else {
      resetPicks()
    }
    setSearch("")
    setOpen(true)
  }

  function resetPicks() {
    setPicks({ fund: "", org: "", proj: "", fin: "", course: "", obj: "" })
    setActiveIndex(0)
  }

  function selectCode(code: string) {
    const seg = SEGMENT_ORDER[activeIndex]
    const updated = { ...picks, [seg.type]: code }
    setPicks(updated)
    setSearch("")

    // Auto-advance to next
    if (activeIndex < SEGMENT_ORDER.length - 1) {
      setActiveIndex(activeIndex + 1)
      setTimeout(() => searchRef.current?.focus(), 50)
    }
  }

  function goToSegment(index: number) {
    setActiveIndex(index)
    setSearch("")
    setTimeout(() => searchRef.current?.focus(), 50)
  }

  function apply() {
    const code = SEGMENT_ORDER.map((s) => {
      const val = picks[s.type]
      return val ? padCode(val, s.size) : "0".repeat(s.size)
    }).join("-")
    onChange(code)
    setOpen(false)
  }

  function clear() {
    resetPicks()
    setSearch("")
  }

  const activeSeg = SEGMENT_ORDER[activeIndex]
  const items = segments?.[activeSeg.type] ?? []
  const lowerSearch = search.toLowerCase()
  const filtered = lowerSearch
    ? items.filter(
        (s) =>
          s.code.toLowerCase().includes(lowerSearch) ||
          s.title.toLowerCase().includes(lowerSearch)
      )
    : items

  const allPicked = SEGMENT_ORDER.every((s) => picks[s.type])
  const preview = SEGMENT_ORDER.map((s) => {
    const val = picks[s.type]
    return val ? padCode(val, s.size) : "#".repeat(s.size)
  }).join("-")

  return (
    <>
      <button
        type="button"
        onClick={openModal}
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
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false)
          }}
        >
          <div
            className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl"
            style={{
              background: "#ffffff",
              boxShadow: "0 25px 50px rgba(0,0,0,0.25)",
              maxHeight: "85vh",
            }}
          >
            {/* Header */}
            <div
              className="flex items-start justify-between p-5"
              style={{
                background: "linear-gradient(135deg, #1d2a5d 0%, #2d3f89 100%)",
              }}
            >
              <div>
                <h3 className="flex items-center gap-2 text-lg font-bold text-white">
                  <Grid3X3 size={20} />
                  Budget Code Builder
                </h3>
                <p
                  className="mt-1 text-xs"
                  style={{ color: "rgba(255,255,255,0.6)" }}
                >
                  Construct your code step-by-step by selecting segments below.
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="cursor-pointer rounded-lg p-1.5 text-white transition-colors hover:bg-white/20"
              >
                <X size={18} />
              </button>
            </div>

            {/* Segment boxes */}
            <div
              className="border-b px-5 py-4"
              style={{ background: "#f8f9fb", borderColor: "#e2e5ea" }}
            >
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                {SEGMENT_ORDER.map((seg, i) => {
                  const isActive = i === activeIndex
                  const hasPick = !!picks[seg.type]
                  return (
                    <div key={seg.type} className="flex items-center gap-1.5">
                      {i > 0 && (
                        <span
                          className="text-lg font-light"
                          style={{ color: "#d1d5db" }}
                        >
                          -
                        </span>
                      )}
                      <div className="flex flex-col items-center gap-0.5">
                        <label
                          className="text-[9px] font-bold tracking-wider uppercase"
                          style={{ color: isActive ? "#1d2a5d" : "#94a3b8" }}
                        >
                          {seg.label}
                        </label>
                        <button
                          type="button"
                          onClick={() => goToSegment(i)}
                          className="flex cursor-pointer items-center justify-center rounded-lg text-base font-bold transition-all"
                          style={{
                            width: seg.size === 2 ? "44px" : "52px",
                            height: "40px",
                            border: isActive
                              ? "2px solid #1d2a5d"
                              : "2px solid #e2e5ea",
                            background: isActive
                              ? "#eff6ff"
                              : hasPick
                                ? "#ffffff"
                                : "#ffffff",
                            color: hasPick ? "#1d2a5d" : "#94a3b8",
                            boxShadow: isActive
                              ? "0 0 0 3px rgba(29,42,93,0.1)"
                              : "none",
                          }}
                        >
                          {picks[seg.type]
                            ? padCode(picks[seg.type], seg.size)
                            : "0".repeat(seg.size)}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
              <p
                className="mt-2 text-center text-xs font-medium"
                style={{ color: "#4356a9" }}
              >
                Select {activeSeg.label} Code
              </p>
            </div>

            {/* Search */}
            <div
              className="border-b px-5 py-3"
              style={{ borderColor: "#e2e5ea" }}
            >
              <div className="relative">
                <Search
                  size={16}
                  className="absolute top-1/2 left-3 -translate-y-1/2"
                  style={{ color: "#94a3b8" }}
                />
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter options by code or title..."
                  className="input-neu w-full pl-10"
                  autoFocus
                />
              </div>
            </div>

            {/* Options list */}
            <div
              className="flex-1 overflow-y-auto p-3"
              style={{ minHeight: "250px" }}
            >
              {filtered.length === 0 ? (
                <div
                  className="flex flex-col items-center justify-center py-12"
                  style={{ color: "#94a3b8" }}
                >
                  <Search size={32} className="mb-2 opacity-20" />
                  <p className="text-sm">
                    {search
                      ? `No matching codes for "${search}"`
                      : `No ${activeSeg.label} codes configured`}
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filtered.map((item) => {
                    const isSelected = picks[activeSeg.type] === item.code
                    return (
                      <button
                        key={item.code}
                        type="button"
                        onClick={() => selectCode(item.code)}
                        className="flex w-full cursor-pointer items-center justify-between rounded-xl px-4 py-3 text-left transition-all"
                        style={{
                          border: isSelected
                            ? "2px solid #1d2a5d"
                            : "2px solid transparent",
                          background: isSelected ? "#eff6ff" : "transparent",
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected)
                            e.currentTarget.style.background = "#f8f9fb"
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected)
                            e.currentTarget.style.background = "transparent"
                        }}
                      >
                        <div className="min-w-0">
                          <p
                            className="text-sm font-semibold"
                            style={{
                              color: isSelected ? "#1d2a5d" : "#334155",
                            }}
                          >
                            {item.title || "Untitled"}
                          </p>
                          <span
                            className="mt-0.5 inline-block rounded px-1.5 py-0.5 font-mono text-[11px]"
                            style={{ background: "#f0f2f5", color: "#64748b" }}
                          >
                            Code: {item.code}
                          </span>
                        </div>
                        {isSelected ? (
                          <Check
                            size={18}
                            style={{ color: "#1d2a5d", flexShrink: 0 }}
                          />
                        ) : (
                          <ChevronRight
                            size={16}
                            style={{ color: "#d1d5db", flexShrink: 0 }}
                          />
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              className="flex items-center justify-between border-t px-5 py-4"
              style={{ background: "#f8f9fb", borderColor: "#e2e5ea" }}
            >
              <div className="font-mono text-xs" style={{ color: "#94a3b8" }}>
                {preview}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={clear}
                  className="cursor-pointer rounded-lg px-4 py-2 text-xs font-semibold transition-colors"
                  style={{ color: "#64748b", border: "1px solid #e2e5ea" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#f0f2f5")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={apply}
                  disabled={!allPicked}
                  className="cursor-pointer rounded-lg px-6 py-2 text-xs font-bold text-white transition-all disabled:cursor-default disabled:opacity-50"
                  style={{ background: "#1d2a5d" }}
                  onMouseEnter={(e) => {
                    if (allPicked) e.currentTarget.style.background = "#2d3f89"
                  }}
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "#1d2a5d")
                  }
                >
                  Apply Budget Code
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
