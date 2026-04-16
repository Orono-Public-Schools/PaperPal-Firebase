import { useState, useRef, useEffect } from "react"
import type { StaffRecord } from "@/lib/types"
import { getStaffRecords } from "@/lib/firestore"

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

let cachedStaff: StaffRecord[] | null = null

export default function StaffEmailAutocomplete({
  value,
  onChange,
  placeholder = "name@orono.k12.mn.us",
  className = "input-neu w-full",
}: Props) {
  const [staff, setStaff] = useState<StaffRecord[]>(cachedStaff ?? [])
  const [open, setOpen] = useState(false)
  const [focused, setFocused] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (cachedStaff) return
    getStaffRecords().then((records) => {
      cachedStaff = records
      setStaff(records)
    })
  }, [])

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

  const q = value.toLowerCase().trim()
  const suggestions =
    focused && q.length >= 2
      ? staff
          .filter(
            (s) =>
              s.email.toLowerCase().includes(q) ||
              `${s.firstName} ${s.lastName}`.toLowerCase().includes(q)
          )
          .slice(0, 8)
      : []

  return (
    <div ref={containerRef} className="relative">
      <input
        type="email"
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
        }}
        onFocus={() => {
          setFocused(true)
          if (q.length >= 2) setOpen(true)
        }}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        className={className}
      />
      {open && suggestions.length > 0 && (
        <div
          className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-lg py-1"
          style={{
            background: "#ffffff",
            boxShadow:
              "0 4px 20px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.08)",
            border: "1px solid #e2e5ea",
          }}
        >
          {suggestions.map((s) => (
            <button
              key={s.email}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                onChange(s.email)
                setOpen(false)
              }}
              className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-gray-50"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm" style={{ color: "#1d2a5d" }}>
                  {s.firstName} {s.lastName}
                </p>
                <p className="truncate text-xs" style={{ color: "#64748b" }}>
                  {s.email}
                </p>
              </div>
              {s.title && (
                <span
                  className="shrink-0 text-[10px]"
                  style={{ color: "#94a3b8" }}
                >
                  {s.title}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
