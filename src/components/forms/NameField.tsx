import { useState } from "react"
import { Pencil, X } from "lucide-react"

interface NameFieldProps {
  defaultName: string
  value: string
  onChange: (name: string) => void
}

export default function NameField({
  defaultName,
  value,
  onChange,
}: NameFieldProps) {
  const [overriding, setOverriding] = useState(false)

  function startOverride() {
    setOverriding(true)
    onChange("")
  }

  function clearOverride() {
    setOverriding(false)
    onChange(defaultName)
  }

  return (
    <div>
      <label
        className="mb-1 block text-xs font-semibold tracking-wider uppercase"
        style={{ color: "#64748b" }}
      >
        Full Name
      </label>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={overriding ? value : defaultName}
          readOnly={!overriding}
          required
          placeholder="Enter name"
          onChange={(e) => onChange(e.target.value)}
          className="input-neu flex-1"
          style={overriding ? { color: "#1d2a5d" } : {}}
        />
        {overriding ? (
          <button
            type="button"
            onClick={clearOverride}
            title="Use my name"
            className="flex cursor-pointer items-center justify-center rounded-lg p-2 transition-colors duration-150"
            style={{ color: "#94a3b8" }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.color = "#ad2122")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.color = "#94a3b8")
            }
          >
            <X size={15} />
          </button>
        ) : (
          <button
            type="button"
            onClick={startOverride}
            title="Fill on behalf of someone else"
            className="flex cursor-pointer items-center justify-center rounded-lg p-2 transition-colors duration-150"
            style={{ color: "#94a3b8" }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.color = "#1d2a5d")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.color = "#94a3b8")
            }
          >
            <Pencil size={14} />
          </button>
        )}
      </div>
      {overriding && (
        <p className="mt-1 text-[11px]" style={{ color: "#94a3b8" }}>
          Submitting on behalf of another person.{" "}
          <button
            type="button"
            onClick={clearOverride}
            className="cursor-pointer underline"
            style={{ color: "#1d2a5d" }}
          >
            Use my name
          </button>
        </p>
      )}
    </div>
  )
}
