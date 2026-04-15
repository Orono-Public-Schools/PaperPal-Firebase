import { useState, useRef, useEffect, useCallback } from "react"
import { useNavigate } from "react-router"
import { Home, Building2, Plus } from "lucide-react"
import { fetchAddressSuggestions, type PlaceSuggestion } from "@/lib/googleMaps"

export interface QuickFill {
  label: string
  address: string
  icon: "home" | "building"
}

interface Props {
  value: string
  onChange: (value: string) => void
  onSelect?: (value: string) => void
  placeholder?: string
  required?: boolean
  quickFills?: QuickFill[]
  showAddHome?: boolean
}

export default function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder,
  required,
  quickFills,
  showAddHome,
}: Props) {
  const navigate = useNavigate()
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([])
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [showQuickFills, setShowQuickFills] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const validQuickFills = quickFills?.filter((q) => q.address) ?? []

  const fetchSuggestions = useCallback(async (input: string) => {
    if (input.length < 3) {
      setSuggestions([])
      setOpen(false)
      return
    }

    const results = await fetchAddressSuggestions(input)
    setSuggestions(results)
    setOpen(results.length > 0)
    setActiveIndex(-1)
    setShowQuickFills(false)
  }, [])

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    onChange(val)

    clearTimeout(debounceRef.current)
    if (val.length >= 3) {
      debounceRef.current = setTimeout(() => fetchSuggestions(val), 250)
    } else {
      setSuggestions([])
      setOpen(false)
    }
  }

  const hasQuickFillContent = validQuickFills.length > 0 || showAddHome

  function handleFocus() {
    if (suggestions.length > 0) {
      setOpen(true)
    } else if (value.length < 3 && hasQuickFillContent) {
      setShowQuickFills(true)
      setOpen(true)
    }
  }

  function selectSuggestion(text: string) {
    if (onSelect) {
      onSelect(text)
    } else {
      onChange(text)
    }
    setSuggestions([])
    setOpen(false)
    setShowQuickFills(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) return

    const totalItems = showQuickFills ? validQuickFills.length : suggestions.length
    if (totalItems === 0) return

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIndex((prev) => (prev < totalItems - 1 ? prev + 1 : 0))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : totalItems - 1))
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault()
      if (showQuickFills) {
        selectSuggestion(validQuickFills[activeIndex].address)
      } else {
        selectSuggestion(suggestions[activeIndex].text)
      }
    } else if (e.key === "Escape") {
      setOpen(false)
      setShowQuickFills(false)
    }
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
        setShowQuickFills(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const IconMap = { home: Home, building: Building2 }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        placeholder={placeholder}
        required={required}
        className="input-neu w-full"
        autoComplete="off"
      />
      {open && (showQuickFills ? hasQuickFillContent : suggestions.length > 0) && (
        <ul
          className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-lg py-1"
          style={{
            background: "#ffffff",
            boxShadow:
              "0 4px 16px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.08)",
            border: "1px solid #e2e5ea",
          }}
        >
          {showQuickFills ? (
            <>
              {validQuickFills.map((q, i) => {
                const Icon = IconMap[q.icon]
                return (
                  <li
                    key={q.label}
                    onMouseDown={() => selectSuggestion(q.address)}
                    onMouseEnter={() => setActiveIndex(i)}
                    className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm"
                    style={{
                      color: "#334155",
                      background: i === activeIndex ? "#f0f2f5" : "transparent",
                    }}
                  >
                    <Icon size={14} style={{ color: "#4356a9", flexShrink: 0 }} />
                    <div className="min-w-0">
                      <span className="font-medium" style={{ color: "#1d2a5d" }}>
                        {q.label}
                      </span>
                      <span className="ml-1.5 text-xs" style={{ color: "#94a3b8" }}>
                        {q.address}
                      </span>
                    </div>
                  </li>
                )
              })}
              {showAddHome && (
                <li
                  onMouseDown={() => navigate("/profile")}
                  className="flex cursor-pointer items-center gap-2 border-t px-3 py-2 text-sm"
                  style={{
                    color: "#4356a9",
                    borderColor: "rgba(180,185,195,0.25)",
                  }}
                >
                  <Plus size={14} style={{ flexShrink: 0 }} />
                  <span className="font-medium">Add home address</span>
                </li>
              )}
            </>
          ) : (
            suggestions.map((s, i) => (
              <li
                key={s.placeId}
                onMouseDown={() => selectSuggestion(s.text)}
                onMouseEnter={() => setActiveIndex(i)}
                className="cursor-pointer px-3 py-2 text-sm"
                style={{
                  color: "#334155",
                  background: i === activeIndex ? "#f0f2f5" : "transparent",
                }}
              >
                {s.text}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
