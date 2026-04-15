import { useState, useEffect } from "react"
import { useNavigate } from "react-router"
import { Plus, Trash2, CheckCircle } from "lucide-react"
import AppLayout from "@/components/layout/AppLayout"
import NameField from "@/components/forms/NameField"
import { useAuth } from "@/hooks/useAuth"
import { createSubmission } from "@/lib/firestore"
import type { TravelMeal, TravelActualOther } from "@/lib/types"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().split("T")[0]
}

function datesBetween(start: string, end: string): string[] {
  if (!start || !end || start > end) return []
  const dates: string[] = []
  const cur = new Date(start + "T00:00:00")
  const last = new Date(end + "T00:00:00")
  while (cur <= last) {
    dates.push(cur.toISOString().split("T")[0])
    cur.setDate(cur.getDate() + 1)
  }
  return dates
}

function emptyMeal(date: string): TravelMeal {
  return { date, breakfast: 0, lunch: 0, dinner: 0 }
}

function emptyOther(): TravelActualOther {
  return { desc: "", amount: 0 }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function TravelReimbursement() {
  const { user, userProfile } = useAuth()
  const navigate = useNavigate()

  // Employee / trip header
  const [submitterName, setSubmitterName] = useState(
    userProfile?.fullName ?? ""
  )
  const [employeeId, setEmployeeId] = useState(userProfile?.employeeId ?? "")
  const [formDate, setFormDate] = useState(todayStr())
  const [address, setAddress] = useState("")
  const [budgetYear, setBudgetYear] = useState("")
  const [accountCode, setAccountCode] = useState("")
  const [meetingTitle, setMeetingTitle] = useState("")
  const [location, setLocation] = useState("")
  const [dateStart, setDateStart] = useState("")
  const [dateEnd, setDateEnd] = useState("")
  const [timeAwayStart, setTimeAwayStart] = useState("")
  const [timeAwayEnd, setTimeAwayEnd] = useState("")
  const [justification, setJustification] = useState("")
  const [advanceRequested, setAdvanceRequested] = useState(0)

  // Estimated costs
  const [estTransport, setEstTransport] = useState(0)
  const [estLodging, setEstLodging] = useState(0)
  const [estMeals, setEstMeals] = useState(0)
  const [estRegistration, setEstRegistration] = useState(0)
  const [estSubstitute, setEstSubstitute] = useState(0)
  const [estOther, setEstOther] = useState(0)

  // Actual costs
  const [actMiles, setActMiles] = useState(0)
  const [actOtherTransport, setActOtherTransport] = useState(0)
  const [actLodging, setActLodging] = useState(0)
  const [actRegistration, setActRegistration] = useState(0)
  const [actOthers, setActOthers] = useState<TravelActualOther[]>([])

  // Meals per day
  const [meals, setMeals] = useState<TravelMeal[]>([])

  // Sync meals rows when dates change
  useEffect(() => {
    const dates = datesBetween(dateStart, dateEnd)
    setMeals((prev) => {
      const map = Object.fromEntries(prev.map((m) => [m.date, m]))
      return dates.map((d) => map[d] ?? emptyMeal(d))
    })
  }, [dateStart, dateEnd])

  const MILEAGE_RATE = 0.7
  const mealTotal = meals.reduce(
    (sum, m) => sum + (m.breakfast || 0) + (m.lunch || 0) + (m.dinner || 0),
    0
  )
  const actOthersTotal = actOthers.reduce((sum, o) => sum + (o.amount || 0), 0)
  const actTotal =
    actMiles * MILEAGE_RATE +
    actOtherTransport +
    actLodging +
    actRegistration +
    actOthersTotal +
    mealTotal

  const estTotal =
    estTransport +
    estLodging +
    estMeals +
    estRegistration +
    estSubstitute +
    estOther
  const finalClaim = actTotal - advanceRequested

  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submissionId, setSubmissionId] = useState("")

  function updateMeal(
    index: number,
    field: keyof TravelMeal,
    value: number | string
  ) {
    setMeals((prev) =>
      prev.map((m, i) => (i === index ? { ...m, [field]: value } : m))
    )
  }

  function updateOther(
    index: number,
    field: keyof TravelActualOther,
    value: string | number
  ) {
    setActOthers((prev) =>
      prev.map((o, i) => (i === index ? { ...o, [field]: value } : o))
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !userProfile) return
    setSubmitting(true)
    try {
      const id = await createSubmission({
        formType: "travel",
        status: "pending",
        submitterUid: user.uid,
        submitterEmail: user.email ?? "",
        submitterName: userProfile.fullName,
        supervisorEmail: userProfile.supervisorEmail ?? "",
        formData: {
          name: submitterName,
          employeeId,
          formDate,
          address,
          budgetYear,
          accountCode,
          meetingTitle,
          location,
          dateStart,
          dateEnd,
          timeAwayStart,
          timeAwayEnd,
          justification,
          estimated: {
            transport: estTransport,
            lodging: estLodging,
            meals: estMeals,
            registration: estRegistration,
            substitute: estSubstitute,
            other: estOther,
            total: estTotal,
          },
          actuals: {
            miles: actMiles,
            otherTransport: actOtherTransport,
            lodging: actLodging,
            registration: actRegistration,
            others: actOthers,
            mealTotal,
            total: actTotal,
          },
          meals,
          advanceRequested,
          finalClaim,
        },
        attachments: [],
        revisionHistory: [],
        summary: `Travel — ${meetingTitle || location}`,
        amount: finalClaim,
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
            style={{ color: "#8b5cf6" }}
          />
          <h2 className="text-xl font-bold" style={{ color: "#1d2a5d" }}>
            Submitted!
          </h2>
          <p className="mt-2 text-sm" style={{ color: "#64748b" }}>
            Your travel reimbursement request{" "}
            <span className="font-semibold" style={{ color: "#1d2a5d" }}>
              {submissionId}
            </span>{" "}
            has been submitted for approval.
          </p>
          <p
            className="mt-1 text-sm font-semibold"
            style={{ color: "#8b5cf6" }}
          >
            Final claim: ${finalClaim.toFixed(2)}
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
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: "#1d2a5d" }}>
          Travel Reimbursement
        </h1>
        <p className="mt-1 text-sm" style={{ color: "#64748b" }}>
          Request reimbursement for travel with estimated and actual expenses.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Employee / trip info */}
        <Section title="Employee & Trip Information">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <NameField
              defaultName={userProfile?.fullName ?? ""}
              value={submitterName}
              onChange={setSubmitterName}
            />
            <Field label="Employee ID">
              <input
                type="text"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="e.g. 12345"
                className="input-neu"
              />
            </Field>
            <Field label="Form Date">
              <input
                type="date"
                value={formDate}
                required
                onChange={(e) => setFormDate(e.target.value)}
                className="input-neu"
              />
            </Field>
            <Field label="Home Address">
              <input
                type="text"
                value={address}
                required
                placeholder="Street, City, State ZIP"
                onChange={(e) => setAddress(e.target.value)}
                className="input-neu"
              />
            </Field>
            <Field label="Budget Year">
              <input
                type="text"
                value={budgetYear}
                required
                placeholder="e.g. 2025-2026"
                onChange={(e) => setBudgetYear(e.target.value)}
                className="input-neu"
              />
            </Field>
            <Field label="Account Code">
              <input
                type="text"
                value={accountCode}
                required
                placeholder="e.g. 01-000-0000-000-000"
                onChange={(e) => setAccountCode(e.target.value)}
                className="input-neu"
              />
            </Field>
            <Field label="Meeting / Conference Title">
              <input
                type="text"
                value={meetingTitle}
                required
                placeholder="Event name"
                onChange={(e) => setMeetingTitle(e.target.value)}
                className="input-neu"
              />
            </Field>
            <Field label="Location">
              <input
                type="text"
                value={location}
                required
                placeholder="City, State"
                onChange={(e) => setLocation(e.target.value)}
                className="input-neu"
              />
            </Field>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Date — Start">
              <input
                type="date"
                value={dateStart}
                required
                onChange={(e) => setDateStart(e.target.value)}
                className="input-neu"
              />
            </Field>
            <Field label="Date — End">
              <input
                type="date"
                value={dateEnd}
                required
                onChange={(e) => setDateEnd(e.target.value)}
                className="input-neu"
              />
            </Field>
            <Field label="Time Away — Depart">
              <input
                type="time"
                value={timeAwayStart}
                onChange={(e) => setTimeAwayStart(e.target.value)}
                className="input-neu"
              />
            </Field>
            <Field label="Time Away — Return">
              <input
                type="time"
                value={timeAwayEnd}
                onChange={(e) => setTimeAwayEnd(e.target.value)}
                className="input-neu"
              />
            </Field>
          </div>
          <div className="mt-4">
            <Field label="Justification / Purpose">
              <textarea
                value={justification}
                required
                rows={3}
                placeholder="Explain the purpose and benefit of this travel…"
                onChange={(e) => setJustification(e.target.value)}
                className="input-neu resize-none"
              />
            </Field>
          </div>
        </Section>

        {/* Estimated costs */}
        <Section title="Estimated Costs">
          <div className="grid gap-4 sm:grid-cols-3">
            <DollarField
              label="Transportation"
              value={estTransport}
              onChange={setEstTransport}
            />
            <DollarField
              label="Lodging"
              value={estLodging}
              onChange={setEstLodging}
            />
            <DollarField
              label="Meals"
              value={estMeals}
              onChange={setEstMeals}
            />
            <DollarField
              label="Registration"
              value={estRegistration}
              onChange={setEstRegistration}
            />
            <DollarField
              label="Substitute"
              value={estSubstitute}
              onChange={setEstSubstitute}
            />
            <DollarField
              label="Other"
              value={estOther}
              onChange={setEstOther}
            />
          </div>
          <TotalRow label="Estimated Total" value={estTotal} />
        </Section>

        {/* Actual costs */}
        <Section title="Actual Costs">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={`Miles Driven (@ $${MILEAGE_RATE}/mi)`}>
              <input
                type="number"
                value={actMiles || ""}
                min={0}
                step="0.1"
                placeholder="0.0"
                onChange={(e) => setActMiles(parseFloat(e.target.value) || 0)}
                className="input-neu"
              />
            </Field>
            <DollarField
              label="Other Transportation"
              value={actOtherTransport}
              onChange={setActOtherTransport}
            />
            <DollarField
              label="Lodging"
              value={actLodging}
              onChange={setActLodging}
            />
            <DollarField
              label="Registration"
              value={actRegistration}
              onChange={setActRegistration}
            />
          </div>

          {/* Other actuals (variable rows) */}
          {actOthers.length > 0 && (
            <div className="mt-4 space-y-3">
              <p
                className="text-xs font-semibold tracking-wider uppercase"
                style={{ color: "#64748b" }}
              >
                Other Expenses
              </p>
              {actOthers.map((o, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[1fr_auto_auto] gap-3 rounded-[14px] p-3"
                  style={{
                    background: "#edeef1",
                    boxShadow:
                      "inset 2px 2px 5px rgba(180,185,195,0.4), inset -2px -2px 5px rgba(255,255,255,0.8)",
                  }}
                >
                  <Field label="Description">
                    <input
                      type="text"
                      value={o.desc}
                      required
                      placeholder="e.g. Parking"
                      onChange={(e) => updateOther(i, "desc", e.target.value)}
                      className="input-neu"
                    />
                  </Field>
                  <Field label="Amount">
                    <input
                      type="number"
                      value={o.amount || ""}
                      required
                      min={0}
                      step="0.01"
                      placeholder="0.00"
                      onChange={(e) =>
                        updateOther(
                          i,
                          "amount",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="input-neu"
                      style={{ maxWidth: "110px" }}
                    />
                  </Field>
                  <div className="flex items-end pb-0.5">
                    <button
                      type="button"
                      onClick={() =>
                        setActOthers((prev) => prev.filter((_, j) => j !== i))
                      }
                      className="cursor-pointer rounded-lg p-1.5"
                      style={{ color: "#94a3b8" }}
                      onMouseEnter={(e) =>
                        ((e.currentTarget as HTMLButtonElement).style.color =
                          "#ad2122")
                      }
                      onMouseLeave={(e) =>
                        ((e.currentTarget as HTMLButtonElement).style.color =
                          "#94a3b8")
                      }
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => setActOthers((prev) => [...prev, emptyOther()])}
            className="mt-3 flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200"
            style={{ color: "#8b5cf6" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "rgba(139,92,246,0.06)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "transparent")
            }
          >
            <Plus size={15} />
            Add Other Expense
          </button>

          <TotalRow
            label={`Actual Total (incl. ${actMiles.toFixed(1)} mi @ $${MILEAGE_RATE})`}
            value={actTotal}
          />
        </Section>

        {/* Meals per day */}
        {meals.length > 0 && (
          <Section title="Meals (Per Day)">
            <div className="space-y-3">
              {meals.map((meal, i) => (
                <div
                  key={meal.date}
                  className="grid grid-cols-[1fr_repeat(3,auto)] items-end gap-4 rounded-[14px] p-4"
                  style={{
                    background: "#edeef1",
                    boxShadow:
                      "inset 2px 2px 5px rgba(180,185,195,0.4), inset -2px -2px 5px rgba(255,255,255,0.8)",
                  }}
                >
                  <span
                    className="pb-0.5 text-sm font-semibold"
                    style={{ color: "#1d2a5d" }}
                  >
                    {new Date(meal.date + "T00:00:00").toLocaleDateString(
                      "en-US",
                      {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      }
                    )}
                  </span>
                  <Field label="Breakfast">
                    <input
                      type="number"
                      value={meal.breakfast || ""}
                      min={0}
                      step="0.01"
                      placeholder="0.00"
                      onChange={(e) =>
                        updateMeal(
                          i,
                          "breakfast",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="input-neu"
                      style={{ maxWidth: "90px" }}
                    />
                  </Field>
                  <Field label="Lunch">
                    <input
                      type="number"
                      value={meal.lunch || ""}
                      min={0}
                      step="0.01"
                      placeholder="0.00"
                      onChange={(e) =>
                        updateMeal(i, "lunch", parseFloat(e.target.value) || 0)
                      }
                      className="input-neu"
                      style={{ maxWidth: "90px" }}
                    />
                  </Field>
                  <Field label="Dinner">
                    <input
                      type="number"
                      value={meal.dinner || ""}
                      min={0}
                      step="0.01"
                      placeholder="0.00"
                      onChange={(e) =>
                        updateMeal(i, "dinner", parseFloat(e.target.value) || 0)
                      }
                      className="input-neu"
                      style={{ maxWidth: "90px" }}
                    />
                  </Field>
                </div>
              ))}
            </div>
            <TotalRow label="Meal Total" value={mealTotal} />
          </Section>
        )}

        {/* Summary */}
        <div
          className="space-y-2 rounded-[18px] p-5"
          style={{
            background: "linear-gradient(145deg, #fafbfd, #edeef1)",
            boxShadow:
              "4px 4px 10px rgba(180,185,195,0.35), -4px -4px 10px rgba(255,255,255,0.75)",
          }}
        >
          <div className="flex items-center justify-between text-sm">
            <span style={{ color: "#64748b" }}>Total Actual Expenses</span>
            <span className="font-semibold" style={{ color: "#1d2a5d" }}>
              ${actTotal.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span style={{ color: "#64748b" }}>Less Advance Requested</span>
            <div className="flex items-center gap-2">
              <span style={{ color: "#64748b" }}>$</span>
              <input
                type="number"
                value={advanceRequested || ""}
                min={0}
                step="0.01"
                placeholder="0.00"
                onChange={(e) =>
                  setAdvanceRequested(parseFloat(e.target.value) || 0)
                }
                className="input-neu text-right"
                style={{ maxWidth: "100px" }}
              />
            </div>
          </div>
          <div
            className="flex items-center justify-between border-t pt-3"
            style={{ borderColor: "rgba(180,185,195,0.4)" }}
          >
            <span className="text-base font-bold" style={{ color: "#1d2a5d" }}>
              Final Claim
            </span>
            <span className="text-lg font-bold" style={{ color: "#8b5cf6" }}>
              ${finalClaim.toFixed(2)}
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
              background: "linear-gradient(135deg, #1d2a5d 0%, #2d3f89 100%)",
              boxShadow: "0 2px 8px rgba(29,42,93,0.25)",
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

function DollarField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <Field label={label}>
      <input
        type="number"
        value={value || ""}
        min={0}
        step="0.01"
        placeholder="0.00"
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="input-neu"
      />
    </Field>
  )
}

function TotalRow({ label, value }: { label: string; value: number }) {
  return (
    <div
      className="mt-4 flex items-center justify-between border-t pt-3"
      style={{ borderColor: "rgba(180,185,195,0.4)" }}
    >
      <span className="text-sm font-semibold" style={{ color: "#1d2a5d" }}>
        {label}
      </span>
      <span className="font-bold" style={{ color: "#1d2a5d" }}>
        ${value.toFixed(2)}
      </span>
    </div>
  )
}
