import { useState, useEffect } from "react"
import { useNavigate } from "react-router"
import { Plus, Trash2, CheckCircle, Send, Loader2, MapPin, X } from "lucide-react"
import AppLayout from "@/components/layout/AppLayout"
import NameField from "@/components/forms/NameField"
import AddressAutocomplete, { type QuickFill } from "@/components/forms/AddressAutocomplete"
import { useAuth } from "@/hooks/useAuth"
import { createSubmission, getAppSettings } from "@/lib/firestore"
import { calculateDrivingDistance } from "@/lib/googleMaps"
import type { MileageTrip } from "@/lib/types"

const RATE = 0.72

function emptyTrip(): MileageTrip {
  return {
    date: "",
    from: "",
    to: "",
    purpose: "",
    miles: 0,
    isRoundTrip: false,
  }
}

export default function MileageReimbursement() {
  const { user, userProfile } = useAuth()
  const navigate = useNavigate()

  const [submitterName, setSubmitterName] = useState(
    userProfile?.fullName ?? ""
  )
  const [employeeId, setEmployeeId] = useState(userProfile?.employeeId ?? "")
  const [accountCode, setAccountCode] = useState(
    userProfile?.savedSignatureUrl ? "" : ""
  )
  const [trips, setTrips] = useState<MileageTrip[]>([emptyTrip()])
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submissionId, setSubmissionId] = useState("")
  const [calculatingMiles, setCalculatingMiles] = useState<number | null>(null)
  const [quickFills, setQuickFills] = useState<QuickFill[]>([])

  // Build quick-fill options for From/To fields
  useEffect(() => {
    const fills: QuickFill[] = []

    if (userProfile?.homeAddress) {
      fills.push({
        label: "Home",
        address: userProfile.homeAddress,
        icon: "home",
      })
    }

    getAppSettings().then((settings) => {
      if (settings.schoolAddress) {
        fills.push({
          label: settings.schoolAddressLabel || "School",
          address: settings.schoolAddress,
          icon: "building",
        })
      }
      setQuickFills(fills)
    })
  }, [userProfile?.homeAddress])

  // Auto-calculate distance when From or To changes
  async function calcDistance(index: number, from: string, to: string) {
    if (from.length < 5 || to.length < 5) return

    setCalculatingMiles(index)
    const miles = await calculateDrivingDistance(from, to)
    setCalculatingMiles((prev) => (prev === index ? null : prev))
    if (miles !== null) {
      setTrips((prev) =>
        prev.map((t, i) => (i === index ? { ...t, miles } : t))
      )
    }
  }

  const totalMiles = trips.reduce(
    (sum, t) => sum + (t.isRoundTrip ? t.miles * 2 : t.miles),
    0
  )
  const totalReimbursement = totalMiles * RATE

  function updateTrip<K extends keyof MileageTrip>(
    index: number,
    field: K,
    value: MileageTrip[K]
  ) {
    setTrips((prev) =>
      prev.map((t, i) => (i === index ? { ...t, [field]: value } : t))
    )
  }

  function addTrip() {
    setTrips((prev) => [...prev, emptyTrip()])
  }

  function removeTrip(index: number) {
    setTrips((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !userProfile) return
    setSubmitting(true)
    try {
      const id = await createSubmission({
        formType: "mileage",
        status: "pending",
        submitterUid: user.uid,
        submitterEmail: user.email ?? "",
        submitterName: userProfile.fullName,
        supervisorEmail: userProfile.supervisorEmail ?? "",
        formData: {
          name: submitterName,
          employeeId,
          accountCode,
          trips,
          totalMiles,
          totalReimbursement,
        },
        attachments: [],
        revisionHistory: [],
        summary: `Mileage — ${totalMiles.toFixed(1)} mi`,
        amount: totalReimbursement,
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
          className="mx-auto max-w-lg rounded-xl p-10 text-center"
          style={{
            background: "#ffffff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06)",
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
            Your mileage reimbursement request{" "}
            <span className="font-semibold" style={{ color: "#1d2a5d" }}>
              {submissionId}
            </span>{" "}
            has been submitted for approval.
          </p>
          <p
            className="mt-1 text-sm font-semibold"
            style={{ color: "#4356a9" }}
          >
            ${totalReimbursement.toFixed(2)} for {totalMiles.toFixed(1)} miles
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
          Mileage Reimbursement
        </h1>
        <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
          Reimbursed at <span className="font-semibold">$0.72 per mile</span>.
          Enter each trip below and submit for supervisor approval.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Employee info */}
        <Section title="Employee Information">
          <div className="grid gap-4 sm:grid-cols-2">
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
                className="input-neu w-full"
              />
            </Field>
            <Field label="Account Code">
              <input
                type="text"
                value={accountCode}
                onChange={(e) => setAccountCode(e.target.value)}
                placeholder="e.g. 01-000-0000-000-000"
                required
                className="input-neu w-full"
              />
            </Field>
          </div>
        </Section>

        {/* Trip log */}
        <Section title="Trip Log">
          <div
            className="divide-y"
            style={{ borderColor: "rgba(180,185,195,0.25)" }}
          >
            {trips.map((trip, i) => (
              <TripRow
                key={i}
                trip={trip}
                index={i}
                onChange={updateTrip}
                onRemove={trips.length > 1 ? () => removeTrip(i) : undefined}
                onCalcDistance={(idx, from, to) => calcDistance(idx, from, to)}
                calculatingMiles={calculatingMiles === i}
                quickFills={quickFills}
                showAddHome={!userProfile?.homeAddress}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={addTrip}
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
            Add Trip
          </button>
        </Section>

        {/* Totals */}
        <div
          className="rounded-xl p-5"
          style={{
            background: "#ffffff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium" style={{ color: "#64748b" }}>
              Total Miles
            </span>
            <span className="font-semibold" style={{ color: "#1d2a5d" }}>
              {totalMiles.toFixed(1)} mi
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm font-medium" style={{ color: "#64748b" }}>
              Rate
            </span>
            <span className="font-semibold" style={{ color: "#1d2a5d" }}>
              $0.72 / mile
            </span>
          </div>
          <div
            className="mt-3 flex items-center justify-between border-t pt-3"
            style={{ borderColor: "rgba(180,185,195,0.4)" }}
          >
            <span className="text-base font-bold" style={{ color: "#1d2a5d" }}>
              Total Reimbursement
            </span>
            <span className="text-lg font-bold" style={{ color: "#4356a9" }}>
              ${totalReimbursement.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
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
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div
      className="rounded-xl p-5"
      style={{
        background: "#ffffff",
        boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06)",
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

function TripRow({
  trip,
  index,
  onChange,
  onRemove,
  onCalcDistance,
  calculatingMiles,
  quickFills,
  showAddHome,
}: {
  trip: MileageTrip
  index: number
  onChange: <K extends keyof MileageTrip>(
    i: number,
    field: K,
    value: MileageTrip[K]
  ) => void
  onRemove?: () => void
  onCalcDistance: (index: number, from: string, to: string) => void
  calculatingMiles: boolean
  quickFills: QuickFill[]
  showAddHome: boolean
}) {
  function handleFromChange(val: string) {
    onChange(index, "from", val)
  }
  function handleToChange(val: string) {
    onChange(index, "to", val)
  }
  function handleFromSelect(val: string) {
    onChange(index, "from", val)
    if (trip.to.length >= 5) onCalcDistance(index, val, trip.to)
  }
  function handleToSelect(val: string) {
    onChange(index, "to", val)
    if (trip.from.length >= 5) onCalcDistance(index, trip.from, val)
  }

  const canCalc = trip.from.length >= 5 && trip.to.length >= 5 && !calculatingMiles

  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Date">
          <input
            type="date"
            value={trip.date}
            required
            onChange={(e) => onChange(index, "date", e.target.value)}
            className="input-neu w-full"
          />
        </Field>
        <Field label="From">
          <AddressAutocomplete
            value={trip.from}
            onChange={handleFromChange}
            onSelect={handleFromSelect}
            placeholder="Origin address"
            required
            quickFills={quickFills}
            showAddHome={showAddHome}
          />
        </Field>
        <Field label="To">
          <AddressAutocomplete
            value={trip.to}
            onChange={handleToChange}
            onSelect={handleToSelect}
            placeholder="Destination address"
            required
            quickFills={quickFills}
            showAddHome={showAddHome}
          />
        </Field>
        <Field label="Miles (one way)">
          <div className="flex gap-1.5">
            <input
              type="number"
              value={trip.miles || ""}
              required
              min={0}
              step="0.1"
              placeholder="0.0"
              onChange={(e) =>
                onChange(index, "miles", parseFloat(e.target.value) || 0)
              }
              className="input-neu w-full"
            />
            <button
              type="button"
              disabled={!canCalc}
              onClick={() => onCalcDistance(index, trip.from, trip.to)}
              className="flex cursor-pointer items-center justify-center rounded-lg px-2 transition-colors duration-150 disabled:cursor-default disabled:opacity-40"
              style={{ color: calculatingMiles ? "#4356a9" : "#64748b" }}
              title="Calculate distance"
              onMouseEnter={(e) => {
                if (canCalc) e.currentTarget.style.color = "#4356a9"
              }}
              onMouseLeave={(e) => {
                if (!calculatingMiles) e.currentTarget.style.color = "#64748b"
              }}
            >
              {calculatingMiles ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <MapPin size={16} />
              )}
            </button>
          </div>
        </Field>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field label="Purpose">
          <input
            type="text"
            value={trip.purpose}
            required
            placeholder="Reason for travel"
            onChange={(e) => onChange(index, "purpose", e.target.value)}
            className="input-neu w-full"
          />
        </Field>
        <div className="flex items-end justify-between gap-4">
          <label
            className="flex cursor-pointer items-center gap-2 text-sm font-medium"
            style={{ color: "#334155" }}
          >
            <input
              type="checkbox"
              checked={trip.isRoundTrip}
              onChange={(e) => onChange(index, "isRoundTrip", e.target.checked)}
              className="h-4 w-4 cursor-pointer accent-[#4356a9]"
            />
            Round trip
            {trip.isRoundTrip && trip.miles > 0 && (
              <span
                className="text-xs font-semibold"
                style={{ color: "#4356a9" }}
              >
                ({(trip.miles * 2).toFixed(1)} mi total)
              </span>
            )}
          </label>
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
