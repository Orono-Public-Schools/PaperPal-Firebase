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

export default function DatePicker({
  value,
  onChange,
  required,
  placeholder = "Select date",
}: Props) {
  const parsed = parseValue(value)
  const today = new Date()
  const [viewOffset, setViewOffset] = useState<{
    year: number
    month: number
  } | null>(null)
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // View defaults to the selected date, or today. Manual nav overrides via viewOffset.
  const baseYear = parsed?.year ?? today.getFullYear()
  const baseMonth = parsed?.month ?? today.getMonth()
  const viewYear = viewOffset?.year ?? baseYear
  const viewMonth = viewOffset?.month ?? baseMonth

  function setViewYear(y: number) {
    setViewOffset({ year: y, month: viewMonth })
  }
  function setViewMonth(m: number) {
    setViewOffset({ year: viewYear, month: m })
  }

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
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear(viewYear - 1)
    } else {
      setViewMonth(viewMonth - 1)
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear(viewYear + 1)
    } else {
      setViewMonth(viewMonth + 1)
    }
  }

  function selectDay(day: number) {
    onChange(toDateStr(viewYear, viewMonth, day))
    setOpen(false)
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
  const displayValue = parsed
    ? `${pad(parsed.month + 1)}/${pad(parsed.day)}/${parsed.year}`
    : ""

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={value}
        required={required}
        readOnly
        tabIndex={-1}
        style={{
          position: "absolute",
          opacity: 0,
          pointerEvents: "none",
          height: 0,
        }}
      />
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="input-neu flex w-full cursor-pointer items-center gap-2 text-left"
      >
        <Calendar size={14} style={{ color: "#94a3b8", flexShrink: 0 }} />
        {displayValue ? (
          <span style={{ color: "#1d2a5d" }}>{displayValue}</span>
        ) : (
          <span style={{ color: "#94a3b8" }}>{placeholder}</span>
        )}
      </button>

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
