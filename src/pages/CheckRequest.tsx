import { useState, useRef, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router"
import { Plus, Trash2, CheckCircle, Send, X } from "lucide-react"
import AppLayout from "@/components/layout/AppLayout"
import BudgetCodeBuilder from "@/components/forms/BudgetCodeBuilder"
import SignatureField, {
  type SignatureFieldRef,
} from "@/components/forms/SignatureField"
import DatePicker from "@/components/forms/DatePicker"
import StaffEmailAutocomplete from "@/components/forms/StaffEmailAutocomplete"
import { deleteField, arrayUnion, Timestamp } from "firebase/firestore"
import { useAuth } from "@/hooks/useAuth"
import { useSandbox } from "@/hooks/useSandbox"
import { useFormFields } from "@/hooks/useFormFields"
import {
  createSubmission,
  getSubmission,
  updateSubmission,
  createOrUpdateUserProfile,
} from "@/lib/firestore"
import type { CheckRequestData } from "@/lib/types"
import { formatBudgetCode } from "@/lib/utils"
import type { CheckRequestExpense } from "@/lib/types"

function emptyExpense(): CheckRequestExpense {
  return { code: "", description: "", amount: 0 }
}

export default function CheckRequest() {
  const { user, userProfile } = useAuth()
  const { sandbox } = useSandbox()
  const { isVisible, getOrder } = useFormFields("check")
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const resubmitId = searchParams.get("resubmit")
  const signatureRef = useRef<SignatureFieldRef>(null)

  const [submitterName, setSubmitterName] = useState(
    userProfile?.fullName ?? ""
  )
  const [routeRequestTo, setRouteRequestTo] = useState(
    userProfile?.supervisorEmail ?? ""
  )

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

  // Load existing submission for resubmit
  useEffect(() => {
    if (!resubmitId) return
    getSubmission(resubmitId).then((sub) => {
      if (!sub || sub.formType !== "check") return
      const fd = sub.formData as CheckRequestData
      setSubmitterName(sub.submitterName)
      setRouteRequestTo(sub.supervisorEmail)
      setDateRequest(fd.dateRequest)
      setDateNeeded(fd.dateNeeded)
      setPayee(fd.payee)
      setStreet(fd.address?.street ?? "")
      setCity(fd.address?.city ?? "")
      setState(fd.address?.state ?? "")
      setZip(fd.address?.zip ?? "")
      setExpenses(fd.expenses.length > 0 ? fd.expenses : [emptyExpense()])
    })
  }, [resubmitId])

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
      const formData = {
        dateRequest,
        dateNeeded,
        payee,
        address: { street, city, state, zip },
        expenses,
        grandTotal,
      }

      if (resubmitId) {
        await updateSubmission(resubmitId, {
          status: "pending",
          submitterName: userProfile.fullName,
          supervisorEmail: routeRequestTo || userProfile.supervisorEmail || "",
          employeeSignatureUrl: signatureRef.current?.getDataUrl() ?? "",
          formData,
          summary: `Check Request — ${payee}`,
          amount: grandTotal,
          sandbox: sandbox || false,
          supervisorSignatureUrl: "",
          finalApproverSignatureUrl: "",
          reviewedAt: deleteField() as never,
          approvedAt: deleteField() as never,
          denialComments: deleteField() as never,
          revisionComments: deleteField() as never,
          approvalProcessingError: deleteField() as never,
          pdfDriveId: deleteField() as never,
          pdfDriveUrl: deleteField() as never,
          activityLog: arrayUnion({
            action: "resubmitted",
            by: user.email ?? "",
            at: Timestamp.now(),
          }),
        })
        setSubmissionId(resubmitId)
      } else {
        const id = await createSubmission({
          formType: "check",
          status: "pending",
          submitterUid: user.uid,
          submitterEmail: user.email ?? "",
          submitterName: userProfile.fullName,
          supervisorEmail: routeRequestTo || userProfile.supervisorEmail || "",
          employeeSignatureUrl: signatureRef.current?.getDataUrl() ?? "",
          formData,
          attachments: [],
          revisionHistory: [],
          activityLog: [
            {
              action: "submitted",
              by: user.email ?? "",
              at: Timestamp.now(),
            },
          ],
          summary: `Check Request — ${payee}`,
          amount: grandTotal,
          ...(sandbox && { sandbox: true }),
        })
        setSubmissionId(id)
      }
      setSubmitted(true)
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <AppLayout>
        <div
          className="mx-auto max-w-lg rounded-xl p-10 text-center"
          style={{
            background: "#ffffff",
            boxShadow:
              "0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06)",
          }}
        >
          <CheckCircle
            size={48}
            className="mx-auto mb-4"
            style={{ color: "#4356a9" }}
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
            style={{ color: "#4356a9" }}
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
        <h1 className="text-2xl font-bold" style={{ color: "#ffffff" }}>
          Check Request
        </h1>
        <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
          Submit a payment request for a vendor or service.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Request details */}
        <Section
          title="Request Details"
          style={{ order: getOrder("fullName") }}
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Full Name">
              <input
                type="text"
                value={submitterName}
                onChange={(e) => setSubmitterName(e.target.value)}
                required
                className="input-neu w-full"
              />
            </Field>
            {isVisible("dateOfRequest") && (
              <Field label="Date of Request">
                <DatePicker
                  value={dateRequest}
                  onChange={setDateRequest}
                  required
                />
              </Field>
            )}
            {isVisible("dateCheckNeeded") && (
              <Field label="Date Check Needed">
                <DatePicker value={dateNeeded} onChange={setDateNeeded} />
              </Field>
            )}
          </div>
          {isVisible("routeTo") && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Route To">
                <StaffEmailAutocomplete
                  value={routeRequestTo}
                  onChange={setRouteRequestTo}
                  placeholder="Supervisor email"
                  className="input-neu"
                />
                <p className="mt-1 text-[11px]" style={{ color: "#94a3b8" }}>
                  Your form will be sent to this person for approval.
                </p>
              </Field>
            </div>
          )}
        </Section>

        {/* Payee info */}
        <Section
          title="Payee Information"
          style={{ order: getOrder("payeeName") }}
        >
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
            {isVisible("payeeAddress") && (
              <>
                <Field label="Street Address">
                  <input
                    type="text"
                    value={street}
                    placeholder="123 Main St"
                    onChange={(e) => setStreet(e.target.value)}
                    className="input-neu"
                  />
                </Field>
                <Field label="City">
                  <input
                    type="text"
                    value={city}
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
                      placeholder="55368"
                      maxLength={10}
                      onChange={(e) => setZip(e.target.value)}
                      className="input-neu"
                    />
                  </Field>
                </div>
              </>
            )}
          </div>
        </Section>

        {/* Expense lines */}
        <Section title="Expenses" style={{ order: getOrder("expenses") }}>
          <div
            className="divide-y"
            style={{ borderColor: "rgba(180,185,195,0.25)" }}
          >
            {expenses.map((expense, i) => (
              <ExpenseRow
                key={i}
                expense={expense}
                index={i}
                onChange={updateExpense}
                isStaff={userProfile?.role === "staff"}
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
            style={{ color: "#4356a9" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "rgba(67,86,169,0.06)")
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
          className="rounded-xl p-5"
          style={{
            order: getOrder("signature") - 0.5,
            background: "#ffffff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-base font-bold" style={{ color: "#1d2a5d" }}>
              Grand Total
            </span>
            <span className="text-lg font-bold" style={{ color: "#4356a9" }}>
              ${grandTotal.toFixed(2)}
            </span>
          </div>
        </div>

        <Section
          title="Employee Signature"
          style={{ order: getOrder("signature") }}
        >
          <SignatureField
            ref={signatureRef}
            savedSignatureUrl={userProfile?.savedSignatureUrl}
            fullName={userProfile?.fullName}
            onSaveSignature={(dataUrl) => {
              if (user)
                createOrUpdateUserProfile(user.uid, {
                  savedSignatureUrl: dataUrl,
                })
            }}
          />
        </Section>

        {/* Actions */}
        <div className="flex justify-end gap-3" style={{ order: 99 }}>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="btn-cancel"
          >
            <X size={16} />
            <span>Cancel</span>
          </button>
          <button type="submit" disabled={submitting} className="btn-submit">
            <div className="svg-wrapper">
              <Send size={16} />
            </div>
            <span>{submitting ? "Submitting…" : "Submit"}</span>
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
  style: extraStyle,
}: {
  title: string
  children: React.ReactNode
  style?: React.CSSProperties
}) {
  return (
    <div
      className="rounded-xl p-5"
      style={{
        background: "#ffffff",
        boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06)",
        ...extraStyle,
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
  isStaff,
}: {
  expense: CheckRequestExpense
  index: number
  onChange: <K extends keyof CheckRequestExpense>(
    i: number,
    field: K,
    value: CheckRequestExpense[K]
  ) => void
  onRemove?: () => void
  isStaff?: boolean
}) {
  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <div className="grid gap-3 sm:grid-cols-[1fr_2fr_auto_auto]">
        <Field label="Account Code">
          <input
            type="text"
            value={expense.code}
            placeholder="##-###-###-###-###-###"
            onChange={(e) =>
              onChange(index, "code", formatBudgetCode(e.target.value))
            }
            maxLength={20}
            className="input-neu font-mono"
            disabled={isStaff}
            style={
              isStaff ? { opacity: 0.5, cursor: "not-allowed" } : undefined
            }
          />
          {!isStaff && (
            <BudgetCodeBuilder
              value={expense.code}
              onChange={(v) => onChange(index, "code", v)}
            />
          )}
          {isStaff && (
            <p className="mt-1 text-[11px]" style={{ color: "#94a3b8" }}>
              Assigned by supervisor
            </p>
          )}
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
