import { useState, useRef, useEffect } from "react"
import { Clock } from "lucide-react"
import { formatBudgetCode } from "@/lib/utils"

interface Props {
  value: string
  onChange: (value: string) => void
  recentCodes?: string[]
  disabled?: boolean
  placeholder?: string
  className?: string
}

const digits = (s: string) => s.replace(/\D/g, "")

export default function BudgetCodeAutocomplete({
  value,
  onChange,
  recentCodes = [],
  disabled,
  placeholder = "##-###-###-###-###-###",
  className = "input-neu w-full font-mono",
}: Props) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

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

  // Blank field shows all recents; typing narrows by digits, ignoring the
  // current value itself.
  const typed = digits(value)
  const suggestions = recentCodes
    .filter((c) => c !== value && digits(c).includes(typed))
    .slice(0, 8)

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        maxLength={22}
        disabled={disabled}
        onChange={(e) => {
          onChange(formatBudgetCode(e.target.value))
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        className={className}
        style={disabled ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
      />
      {open && !disabled && suggestions.length > 0 && (
        <div
          className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-lg py-1"
          style={{
            background: "#ffffff",
            boxShadow:
              "0 4px 20px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.08)",
            border: "1px solid #e2e5ea",
          }}
        >
          {suggestions.map((code) => (
            <button
              key={code}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                onChange(code)
                setOpen(false)
              }}
              className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-gray-50"
            >
              <Clock size={13} style={{ color: "#94a3b8", flexShrink: 0 }} />
              <span className="font-mono text-sm" style={{ color: "#1d2a5d" }}>
                {code}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
