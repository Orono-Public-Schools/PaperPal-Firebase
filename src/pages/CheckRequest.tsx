import { useState } from "react"
import { useNavigate } from "react-router"
import { Plus, Trash2, CheckCircle } from "lucide-react"
import AppLayout from "@/components/layout/AppLayout"
import { useAuth } from "@/hooks/useAuth"
import { createSubmission } from "@/lib/firestore"
import type { CheckRequestExpense } from "@/lib/types"

function emptyExpense(): CheckRequestExpense {
  return { code: "", description: "", amount: 0 }
}

export default function CheckRequest() {
  const { user, userProfile } = useAuth()
  const navigate = useNavigate()

  // Header fields
  const [dateRequest, setDateRequest] = useState(
    new Date().toISOString().split("T")[0]
  )
  const [dateNeeded, setDateNeeded] = useState("")

  // Payee fields
  const [payee, setPayee] = useState("")
  const [street, setStreet] = useState("")
  const [city, setCity] = useState("")
  const [state, setState] = useState("")
  const [zip, setZip] = useState("")

  // Expense rows
  const [expenses, setExpenses] = useState<CheckRequestExpense[]>([
    emptyExpense(),
  ])

  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submissionId, setSubmissionId] = useState("")

  const grandTotal = expenses.reduce((sum, e) => sum + (e.amount || 0), 0)

  function updateExpense<K extends keyof CheckRequestExpense>(
    index: number,
    field: K,
    value: CheckRequestExpense[K]
  ) {
    setExpenses((prev) =>
      prev.map((e, i) => (i === index ? { ...e, [field]: value } : e))
    )
  }

  function addExpense() {
    setExpenses((prev) => [...prev, emptyExpense()])
  }

  function removeExpense(index: number) {
    setExpenses((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !userProfile) return
    setSubmitting(true)
    try {
      const id = await createSubmission({
        formType: "check",
        status: "pending",
        submitterUid: user.uid,
        submitterEmail: user.email ?? "",
        submitterName: userProfile.fullName,
        supervisorEmail: userProfile.supervisorEmail ?? "",
        formData: {
          dateRequest,
          dateNeeded,
          payee,
          address: { street, city, state, zip },
          expenses,
          grandTotal,
        },
        attachments: [],
        revisionHistory: [],
        summary: `Check Request — ${payee}`,
        amount: grandTotal,
      })
      setSubmissionId(id)
      setSubmitted(true)
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <AppLayout>
        <div
          className="mx-auto max-w-lg rounded-[20px] p-10 text-center"
          style={{
            background: "linear-gradient(145deg, #fafbfd, #edeef1)",
            boxShadow:
              "6px 6px 14px rgba(180,185,195,0.4), -6px -6px 14px rgba(255,255,255,0.8)",
          }}
        >
          <CheckCircle
            size={48}
            className="mx-auto mb-4"
            style={{ color: "#1e3a8a" }}
          />
          <h2 className="text-xl font-bold" style={{ color: "#1d2a5d" }}>
            Submitted!
          </h2>
          <p className="mt-2 text-sm" style={{ color: "#64748b" }}>
            Your check request{" "}
            <span className="font-semibold" style={{ color: "#1d2a5d" }}>
              {submissionId}
            </span>{" "}
            has been submitted for approval.
          </p>
          <p
            className="mt-1 text-sm font-semibold"
            style={{ color: "#1e3a8a" }}
          >
            ${grandTotal.toFixed(2)} payable to {payee}
          </p>
          <button
            onClick={() => navigate("/")}
            className="mt-6 cursor-pointer rounded-xl px-6 py-2.5 text-sm font-semibold text-white transition-all duration-200"
            style={{
              background: "linear-gradient(135deg, #1d2a5d 0%, #2d3f89 100%)",
              boxShadow: "0 2px 8px rgba(29,42,93,0.25)",
            }}
          >
            Back to Dashboard
          </button>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: "#1d2a5d" }}>
          Check Request
        </h1>
        <p className="mt-1 text-sm" style={{ color: "#64748b" }}>
          Submit a payment request for a vendor or service.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Request details */}
        <Section title="Request Details">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Requested By">
              <input
                type="text"
                readOnly
                value={userProfile?.fullName ?? ""}
                className="input-neu"
              />
            </Field>
            <Field label="Date of Request">
              <input
                type="date"
                value={dateRequest}
                required
                onChange={(e) => setDateRequest(e.target.value)}
                className="input-neu"
              />
            </Field>
            <Field label="Date Check Needed">
              <input
                type="date"
                value={dateNeeded}
                required
                onChange={(e) => setDateNeeded(e.target.value)}
                className="input-neu"
              />
            </Field>
          </div>
        </Section>

        {/* Payee info */}
        <Section title="Payee Information">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Payee / Vendor Name">
              <input
                type="text"
                value={payee}
                required
                placeholder="Name on check"
                onChange={(e) => setPayee(e.target.value)}
                className="input-neu"
              />
            </Field>
            <Field label="Street Address">
              <input
                type="text"
                value={street}
                required
                placeholder="123 Main St"
                onChange={(e) => setStreet(e.target.value)}
                className="input-neu"
              />
            </Field>
            <Field label="City">
              <input
                type="text"
                value={city}
                required
                placeholder="City"
                onChange={(e) => setCity(e.target.value)}
                className="input-neu"
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="State">
                <input
                  type="text"
                  value={state}
                  required
                  placeholder="MN"
                  maxLength={2}
                  onChange={(e) => setState(e.target.value.toUpperCase())}
                  className="input-neu"
                />
              </Field>
              <Field label="ZIP">
                <input
                  type="text"
                  value={zip}
                  required
                  placeholder="55368"
                  maxLength={10}
                  onChange={(e) => setZip(e.target.value)}
                  className="input-neu"
                />
              </Field>
            </div>
          </div>
        </Section>

        {/* Expense lines */}
        <Section title="Expenses">
          <div className="space-y-3">
            {expenses.map((expense, i) => (
              <ExpenseRow
                key={i}
                expense={expense}
                index={i}
                onChange={updateExpense}
                onRemove={
                  expenses.length > 1 ? () => removeExpense(i) : undefined
                }
              />
            ))}
          </div>
          <button
            type="button"
            onClick={addExpense}
            className="mt-3 flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200"
            style={{ color: "#1e3a8a" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "rgba(30,58,138,0.06)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "transparent")
            }
          >
            <Plus size={15} />
            Add Expense Line
          </button>
        </Section>

        {/* Total */}
        <div
          className="rounded-[18px] p-5"
          style={{
            background: "linear-gradient(145deg, #fafbfd, #edeef1)",
            boxShadow:
              "4px 4px 10px rgba(180,185,195,0.35), -4px -4px 10px rgba(255,255,255,0.75)",
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-base font-bold" style={{ color: "#1d2a5d" }}>
              Grand Total
            </span>
            <span className="text-lg font-bold" style={{ color: "#1e3a8a" }}>
              ${grandTotal.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="cursor-pointer rounded-xl px-5 py-2.5 text-sm font-medium transition-all duration-200"
            style={{ color: "#64748b" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "rgba(100,116,139,0.08)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "transparent")
            }
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="cursor-pointer rounded-xl px-6 py-2.5 text-sm font-semibold text-white transition-all duration-200 disabled:opacity-60"
            style={{
              background: "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)",
              boxShadow: "0 2px 8px rgba(30,58,138,0.3)",
            }}
          >
            {submitting ? "Submitting…" : "Submit Request"}
          </button>
        </div>
      </form>
    </AppLayout>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

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

function ExpenseRow({
  expense,
  index,
  onChange,
  onRemove,
}: {
  expense: CheckRequestExpense
  index: number
  onChange: <K extends keyof CheckRequestExpense>(
    i: number,
    field: K,
    value: CheckRequestExpense[K]
  ) => void
  onRemove?: () => void
}) {
  return (
    <div
      className="rounded-[14px] p-4"
      style={{
        background: "#edeef1",
        boxShadow:
          "inset 2px 2px 5px rgba(180,185,195,0.4), inset -2px -2px 5px rgba(255,255,255,0.8)",
      }}
    >
      <div className="grid gap-3 sm:grid-cols-[1fr_2fr_auto_auto]">
        <Field label="Account Code">
          <input
            type="text"
            value={expense.code}
            required
            placeholder="Code"
            onChange={(e) => onChange(index, "code", e.target.value)}
            className="input-neu"
          />
        </Field>
        <Field label="Description">
          <input
            type="text"
            value={expense.description}
            required
            placeholder="What is this for?"
            onChange={(e) => onChange(index, "description", e.target.value)}
            className="input-neu"
          />
        </Field>
        <Field label="Amount">
          <input
            type="number"
            value={expense.amount || ""}
            required
            min={0}
            step="0.01"
            placeholder="0.00"
            onChange={(e) =>
              onChange(index, "amount", parseFloat(e.target.value) || 0)
            }
            className="input-neu"
            style={{ maxWidth: "120px" }}
          />
        </Field>
        <div className="flex items-end pb-0.5">
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="cursor-pointer rounded-lg p-1.5 transition-colors duration-150"
              style={{ color: "#94a3b8" }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.color = "#ad2122")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.color = "#94a3b8")
              }
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
