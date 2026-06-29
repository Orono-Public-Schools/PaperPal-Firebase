import { useState, useRef, useEffect } from "react"
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react"

interface Props {
  value: string // yyyy-mm-dd
  onChange: (value: string) => void
  required?: boolean
  placeholder?: string
}

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

function pad(n: number) {
  return n.toString().padStart(2, "0")
}

function toDateStr(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`
}

function parseValue(value: string) {
  if (!value) return null
  const [y, m, d] = value.split("-").map(Number)
  return { year: y, month: m - 1, day: d }
}

function formatDisplay(value: string) {
  const p = parseValue(value)
  return p ? `${pad(p.month + 1)}/${pad(p.day)}/${p.year}` : ""
}

// Parse a typed MM/DD/YYYY (or M/D/YYYY, with / or - separators) into yyyy-mm-dd.
function parseTyped(text: string): string | null {
  const m = text.trim().match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (!m) return null
  const month = Number(m[1])
  const day = Number(m[2])
  const year = Number(m[3])
  if (month < 1 || month > 12) return null
  const daysInMonth = new Date(year, month, 0).getDate()
  if (day < 1 || day > daysInMonth) return null
  return `${year}-${pad(month)}-${pad(day)}`
}

export default function DatePicker({
  value,
  onChange,
  required,
  placeholder = "MM/DD/YYYY",
}: Props) {
  const parsed = parseValue(value)
  const today = new Date()
  const [viewOffset, setViewOffset] = useState<{
    year: number
    month: number
  } | null>(null)
  const [open, setOpen] = useState(false)
  const [text, setText] = useState("")
  const [focused, setFocused] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // View defaults to the selected date, or today. Manual nav overrides via viewOffset.
  const baseYear = parsed?.year ?? today.getFullYear()
  const baseMonth = parsed?.month ?? today.getMonth()
  const viewYear = viewOffset?.year ?? baseYear
  const viewMonth = viewOffset?.month ?? baseMonth

  // While typing, show the raw text; otherwise reflect the canonical value.
  const displayText = focused ? text : formatDisplay(value)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  function prevMonth() {
    setViewOffset(
      viewMonth === 0
        ? { year: viewYear - 1, month: 11 }
        : { year: viewYear, month: viewMonth - 1 }
    )
  }

  function nextMonth() {
    setViewOffset(
      viewMonth === 11
        ? { year: viewYear + 1, month: 0 }
        : { year: viewYear, month: viewMonth + 1 }
    )
  }

  function selectDay(day: number) {
    onChange(toDateStr(viewYear, viewMonth, day))
    setOpen(false)
  }

  function handleTextChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
    setText(raw)
    if (raw.trim() === "") {
      onChange("")
      return
    }
    const valid = parseTyped(raw)
    if (valid) {
      onChange(valid)
      setViewOffset(null)
    }
  }

  function handleBlur() {
    setFocused(false)
  }

  const firstDay = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()

  // Only current month days, with null placeholders for leading blanks
  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const todayStr = toDateStr(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  )

  return (
    <div ref={containerRef} className="relative">
      {/* Hidden mirror carries the real value for native required validation */}
      <input
        type="text"
        value={value}
        required={required}
        readOnly
        tabIndex={-1}
        aria-hidden="true"
        style={{
          position: "absolute",
          opacity: 0,
          pointerEvents: "none",
          height: 0,
        }}
      />
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Toggle calendar"
        className="absolute top-1/2 left-2 flex -translate-y-1/2 cursor-pointer items-center"
        style={{ color: "#94a3b8" }}
      >
        <Calendar size={14} />
      </button>
      <input
        type="text"
        value={displayText}
        onChange={handleTextChange}
        onFocus={() => {
          setFocused(true)
          setText(formatDisplay(value))
        }}
        onBlur={handleBlur}
        placeholder={placeholder}
        inputMode="numeric"
        className="input-neu w-full"
        style={{ paddingLeft: "2rem" }}
      />

      {open && (
        <div
          className="absolute z-50 mt-1 rounded-xl p-3"
          style={{
            background: "#ffffff",
            boxShadow:
              "0 4px 20px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.08)",
            border: "1px solid #e2e5ea",
            width: "260px",
          }}
        >
          {/* Header */}
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={prevMonth}
              className="flex min-h-[36px] min-w-[36px] cursor-pointer items-center justify-center rounded-lg transition-colors"
              style={{ color: "#64748b" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#f0f2f5"
                e.currentTarget.style.color = "#1d2a5d"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent"
                e.currentTarget.style.color = "#64748b"
              }}
            >
              <ChevronLeft size={16} />
            </button>
            <span
              className="text-sm font-semibold"
              style={{ color: "#1d2a5d" }}
            >
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="flex min-h-[36px] min-w-[36px] cursor-pointer items-center justify-center rounded-lg transition-colors"
              style={{ color: "#64748b" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#f0f2f5"
                e.currentTarget.style.color = "#1d2a5d"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent"
                e.currentTarget.style.color = "#64748b"
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Day headers */}
          <div className="mb-1 grid grid-cols-7 text-center">
            {DAYS.map((d) => (
              <span
                key={d}
                className="pb-1 text-[10px] font-semibold uppercase"
                style={{ color: "#94a3b8" }}
              >
                {d}
              </span>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 text-center">
            {cells.map((day, i) => {
              if (day === null) {
                return <div key={i} />
              }
              const cellStr = toDateStr(viewYear, viewMonth, day)
              const isSelected = cellStr === value
              const isToday = cellStr === todayStr

              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => selectDay(day)}
                  className="mx-auto flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-sm transition-all duration-150"
                  style={{
                    color: isSelected ? "#ffffff" : "#1d2a5d",
                    background: isSelected ? "#ad2122" : "transparent",
                    fontWeight: isToday || isSelected ? 700 : 400,
                    ...(isToday && !isSelected
                      ? { border: "1.5px solid #ad2122" }
                      : {}),
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = "#f0f2f5"
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = "transparent"
                    }
                  }}
                >
                  {day}
                </button>
              )
            })}
          </div>

          {/* Today button */}
          <button
            type="button"
            onClick={() => {
              onChange(todayStr)
              setOpen(false)
            }}
            className="mt-2 w-full cursor-pointer rounded-lg py-1.5 text-xs font-semibold transition-colors"
            style={{ color: "#4356a9" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#f0f2f5"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent"
            }}
          >
            Today
          </button>
        </div>
      )}
    </div>
  )
}
