import { useState, useRef, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router"
import {
  Plus,
  Trash2,
  CheckCircle,
  Send,
  X,
  Loader2,
  MapPin,
  Upload,
  FileText,
  Image,
  File,
} from "lucide-react"
import AppLayout from "@/components/layout/AppLayout"
import DatePicker from "@/components/forms/DatePicker"
import AddressAutocomplete, {
  type QuickFill,
} from "@/components/forms/AddressAutocomplete"
import BudgetCodeBuilder from "@/components/forms/BudgetCodeBuilder"
import SignatureField, {
  type SignatureFieldRef,
} from "@/components/forms/SignatureField"
import StaffEmailAutocomplete from "@/components/forms/StaffEmailAutocomplete"
import { useAuth } from "@/hooks/useAuth"
import {
  createSubmission,
  getSubmission,
  updateSubmission,
  getAppSettings,
  createOrUpdateUserProfile,
} from "@/lib/firestore"
import type { TravelData } from "@/lib/types"
import { calculateDrivingDistance } from "@/lib/googleMaps"
import { formatBudgetCode } from "@/lib/utils"
import { storage } from "@/lib/firebase"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import type { TravelMeal, TravelActualOther, Attachment } from "@/lib/types"

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
  const [searchParams] = useSearchParams()
  const resubmitId = searchParams.get("resubmit")
  const signatureRef = useRef<SignatureFieldRef>(null)

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
  const [routeRequestTo, setRouteRequestTo] = useState(
    userProfile?.supervisorEmail ?? ""
  )
  const [advanceRequested, setAdvanceRequested] = useState(0)

  // Mileage within travel
  const [mileageFrom, setMileageFrom] = useState("")
  const [mileageTo, setMileageTo] = useState("")
  const [calculatingMiles, setCalculatingMiles] = useState(false)
  const [quickFills, setQuickFills] = useState<QuickFill[]>([])

  // File uploads
  const [justificationFiles, setJustificationFiles] = useState<Attachment[]>([])
  const [mealReceipts, setMealReceipts] = useState<Attachment[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadingReceipts, setUploadingReceipts] = useState(false)

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

  // Build quick-fill options for mileage addresses
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
      // Auto-fill budget year from fiscal year setting
      // Budget year = the ending calendar year of the fiscal period
      // e.g. FY starting July 2025 → budget year "2026", rolls to "2027" on July 1 2026
      if (!budgetYear) {
        const now = new Date()
        const year = now.getFullYear()
        const startMonth = settings.fiscalYearStartMonth ?? 6
        const fy = now.getMonth() >= startMonth ? year + 1 : year
        setBudgetYear(String(fy))
      }

      if (settings.schoolAddress) {
        fills.push({
          label: settings.schoolAddressLabel || "School",
          address: settings.schoolAddress,
          icon: "building",
        })
      }
      setQuickFills(fills)
    })
  }, [userProfile?.homeAddress, budgetYear])

  // Load existing submission for resubmit
  useEffect(() => {
    if (!resubmitId) return
    getSubmission(resubmitId).then((sub) => {
      if (!sub || sub.formType !== "travel") return
      const fd = sub.formData as TravelData
      setSubmitterName(sub.submitterName)
      setRouteRequestTo(sub.supervisorEmail)
      setEmployeeId(fd.employeeId)
      setFormDate(fd.formDate)
      setAddress(fd.address)
      setBudgetYear(fd.budgetYear)
      setAccountCode(fd.accountCode)
      setMeetingTitle(fd.meetingTitle)
      setLocation(fd.location)
      setDateStart(fd.dateStart)
      setDateEnd(fd.dateEnd)
      setTimeAwayStart(fd.timeAwayStart)
      setTimeAwayEnd(fd.timeAwayEnd)
      setJustification(fd.justification)
      setAdvanceRequested(fd.advanceRequested)
      setEstTransport(fd.estimated.transport)
      setEstLodging(fd.estimated.lodging)
      setEstMeals(fd.estimated.meals)
      setEstRegistration(fd.estimated.registration)
      setEstSubstitute(fd.estimated.substitute)
      setEstOther(fd.estimated.other)
      setActMiles(fd.actuals.miles)
      setActOtherTransport(fd.actuals.otherTransport)
      setActLodging(fd.actuals.lodging)
      setActRegistration(fd.actuals.registration)
      setActOthers(fd.actuals.others.length > 0 ? fd.actuals.others : [])
      if (fd.meals.length > 0) setMeals(fd.meals)
    })
  }, [resubmitId])

  async function calcDistance() {
    if (mileageFrom.length < 5 || mileageTo.length < 5) return
    setCalculatingMiles(true)
    const miles = await calculateDrivingDistance(mileageFrom, mileageTo)
    setCalculatingMiles(false)
    if (miles !== null) setActMiles(miles)
  }

  async function handleFileUpload(files: FileList | null) {
    if (!files || !user) return
    setUploading(true)
    const newAttachments: Attachment[] = []
    for (const file of Array.from(files)) {
      const path = `travel-attachments/${user.uid}/${Date.now()}-${file.name}`
      const storageRef = ref(storage, path)
      await uploadBytes(storageRef, file)
      const url = await getDownloadURL(storageRef)
      newAttachments.push({
        name: file.name,
        url,
        mimeType: file.type,
        size: file.size,
      })
    }
    setJustificationFiles((prev) => [...prev, ...newAttachments])
    setUploading(false)
  }

  async function handleReceiptUpload(files: FileList | null) {
    if (!files || !user) return
    setUploadingReceipts(true)
    const newAttachments: Attachment[] = []
    for (const file of Array.from(files)) {
      const path = `travel-receipts/${user.uid}/${Date.now()}-${file.name}`
      const storageRef = ref(storage, path)
      await uploadBytes(storageRef, file)
      const url = await getDownloadURL(storageRef)
      newAttachments.push({
        name: file.name,
        url,
        mimeType: file.type,
        size: file.size,
      })
    }
    setMealReceipts((prev) => [...prev, ...newAttachments])
    setUploadingReceipts(false)
  }

  const MILEAGE_RATE = 0.72
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
      const formData = {
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
      }

      if (resubmitId) {
        await updateSubmission(resubmitId, {
          status: "pending",
          submitterName: userProfile.fullName,
          supervisorEmail: routeRequestTo || userProfile.supervisorEmail || "",
          employeeSignatureUrl: signatureRef.current?.getDataUrl() ?? "",
          formData,
          attachments: justificationFiles,
          summary: `Travel — ${meetingTitle || location}`,
          amount: finalClaim,
          supervisorSignatureUrl: "",
          finalApproverSignatureUrl: "",
          reviewedAt: undefined,
          approvedAt: undefined,
          denialComments: undefined,
          revisionComments: undefined,
          approvalProcessingError: undefined,
          pdfDriveId: undefined,
          pdfDriveUrl: undefined,
        })
        setSubmissionId(resubmitId)
      } else {
        const id = await createSubmission({
          formType: "travel",
          status: "pending",
          submitterUid: user.uid,
          submitterEmail: user.email ?? "",
          submitterName: userProfile.fullName,
          supervisorEmail: routeRequestTo || userProfile.supervisorEmail || "",
          employeeSignatureUrl: signatureRef.current?.getDataUrl() ?? "",
          formData,
          attachments: justificationFiles,
          revisionHistory: [],
          summary: `Travel — ${meetingTitle || location}`,
          amount: finalClaim,
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
            Your travel reimbursement request{" "}
            <span className="font-semibold" style={{ color: "#1d2a5d" }}>
              {submissionId}
            </span>{" "}
            has been submitted for approval.
          </p>
          <p
            className="mt-1 text-sm font-semibold"
            style={{ color: "#4356a9" }}
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
        <h1 className="text-2xl font-bold" style={{ color: "#ffffff" }}>
          Travel Reimbursement
        </h1>
        <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
          Request reimbursement for travel with pre-approved and actual
          expenses.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Employee / trip info */}
        <Section title="Employee & Trip Information">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Full Name">
              <input
                type="text"
                value={submitterName}
                onChange={(e) => setSubmitterName(e.target.value)}
                required
                className="input-neu w-full"
              />
            </Field>
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
              <DatePicker value={formDate} onChange={setFormDate} required />
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
                placeholder="##-###-###-###-###-###"
                onChange={(e) =>
                  setAccountCode(formatBudgetCode(e.target.value))
                }
                maxLength={20}
                className="input-neu font-mono"
                disabled={userProfile?.role === "staff"}
                style={
                  userProfile?.role === "staff"
                    ? { opacity: 0.5, cursor: "not-allowed" }
                    : undefined
                }
              />
              {userProfile?.role !== "staff" && (
                <BudgetCodeBuilder
                  value={accountCode}
                  onChange={setAccountCode}
                />
              )}
              {userProfile?.role === "staff" && (
                <p className="mt-1 text-[11px]" style={{ color: "#94a3b8" }}>
                  Assigned by your supervisor during review.
                </p>
              )}
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
              <DatePicker value={dateStart} onChange={setDateStart} required />
            </Field>
            <Field label="Date — End">
              <DatePicker value={dateEnd} onChange={setDateEnd} required />
            </Field>
            <Field label="Away From Job — Start">
              <DatePicker value={timeAwayStart} onChange={setTimeAwayStart} />
            </Field>
            <Field label="Away From Job — End">
              <DatePicker value={timeAwayEnd} onChange={setTimeAwayEnd} />
            </Field>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Route Request To">
              <StaffEmailAutocomplete
                value={routeRequestTo}
                onChange={setRouteRequestTo}
                placeholder="Supervisor or department admin"
                className="input-neu"
              />
              <p className="mt-1 text-[11px]" style={{ color: "#94a3b8" }}>
                Usually your supervisor, or a specific department admin.
              </p>
            </Field>
          </div>
        </Section>

        {/* Justification for Release */}
        <Section title="Justification for Release">
          <Field label="Justification / Purpose">
            <textarea
              value={justification}
              required
              rows={3}
              placeholder="Additional details or justification comments…"
              onChange={(e) => setJustification(e.target.value)}
              className="input-neu resize-none"
            />
          </Field>
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <p
                className="text-xs font-semibold tracking-wider uppercase"
                style={{ color: "#64748b" }}
              >
                Attachments
              </p>
              <span
                className="text-[11px] font-medium"
                style={{ color: "#94a3b8" }}
              >
                Supported: PDF, IMG, DOC
              </span>
            </div>
            <label
              className="mt-2 flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed p-6 transition-colors"
              style={{ borderColor: "#d1d5db", color: "#94a3b8" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#4356a9"
                e.currentTarget.style.background = "rgba(67,86,169,0.03)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#d1d5db"
                e.currentTarget.style.background = "transparent"
              }}
              onDragOver={(e) => {
                e.preventDefault()
                e.currentTarget.style.borderColor = "#4356a9"
                e.currentTarget.style.background = "rgba(67,86,169,0.06)"
              }}
              onDragLeave={(e) => {
                e.currentTarget.style.borderColor = "#d1d5db"
                e.currentTarget.style.background = "transparent"
              }}
              onDrop={(e) => {
                e.preventDefault()
                e.currentTarget.style.borderColor = "#d1d5db"
                e.currentTarget.style.background = "transparent"
                handleFileUpload(e.dataTransfer.files)
              }}
            >
              <Upload size={24} style={{ color: "#4356a9" }} />
              <p className="text-sm">
                <span
                  className="font-semibold underline"
                  style={{ color: "#4356a9" }}
                >
                  Click to upload
                </span>{" "}
                or drag and drop
              </p>
              <input
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg,.gif,.doc,.docx"
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files)}
              />
            </label>
            {uploading && (
              <div
                className="mt-2 flex items-center gap-2 text-sm"
                style={{ color: "#4356a9" }}
              >
                <Loader2 size={14} className="animate-spin" />
                Uploading…
              </div>
            )}
            {justificationFiles.length > 0 && (
              <div className="mt-3 space-y-2">
                {justificationFiles.map((f, i) => {
                  const isImage = f.mimeType.startsWith("image/")
                  const isPdf = f.mimeType === "application/pdf"
                  const Icon = isImage ? Image : isPdf ? FileText : File
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-3 rounded-lg px-3 py-2"
                      style={{
                        background: "#f8f9fb",
                        border: "1px solid #e2e5ea",
                      }}
                    >
                      <Icon
                        size={16}
                        style={{ color: "#4356a9", flexShrink: 0 }}
                      />
                      <a
                        href={f.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-w-0 flex-1 truncate text-sm font-medium underline"
                        style={{ color: "#1d2a5d" }}
                      >
                        {f.name}
                      </a>
                      <span
                        className="text-[11px]"
                        style={{ color: "#94a3b8" }}
                      >
                        {(f.size / 1024).toFixed(0)} KB
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setJustificationFiles((prev) =>
                            prev.filter((_, j) => j !== i)
                          )
                        }
                        className="cursor-pointer rounded p-1 transition-colors"
                        style={{ color: "#94a3b8" }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.color = "#ad2122")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.color = "#94a3b8")
                        }
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </Section>

        {/* Pre-approved costs */}
        <Section title="Pre-Approved Estimated Expenses">
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
          <TotalRow label="Total Estimated" value={estTotal} />
        </Section>

        {/* Actual costs */}
        <Section title="Actual Costs">
          {/* Transportation by Car */}
          <div
            className="mb-4 rounded-xl p-4"
            style={{ background: "#f8f9fb", border: "1px solid #e2e5ea" }}
          >
            <div className="mb-3 flex items-center justify-between">
              <p
                className="text-xs font-semibold tracking-wider uppercase"
                style={{ color: "#1d2a5d" }}
              >
                Transportation by Car
              </p>
              <span className="text-xs" style={{ color: "#94a3b8" }}>
                Rate: ${MILEAGE_RATE.toFixed(2)} / mile
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="From">
                <AddressAutocomplete
                  value={mileageFrom}
                  onChange={setMileageFrom}
                  onSelect={(v) => {
                    setMileageFrom(v)
                    if (mileageTo.length >= 5) calcDistance()
                  }}
                  placeholder="Origin"
                  quickFills={quickFills}
                  showAddHome={!userProfile?.homeAddress}
                />
              </Field>
              <Field label="To">
                <AddressAutocomplete
                  value={mileageTo}
                  onChange={setMileageTo}
                  onSelect={(v) => {
                    setMileageTo(v)
                    if (mileageFrom.length >= 5) calcDistance()
                  }}
                  placeholder="Destination"
                  quickFills={quickFills}
                  showAddHome={!userProfile?.homeAddress}
                />
              </Field>
              <Field label="Miles">
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    value={actMiles || ""}
                    min={0}
                    step="0.1"
                    placeholder="0.0"
                    onChange={(e) =>
                      setActMiles(parseFloat(e.target.value) || 0)
                    }
                    className="input-neu w-full"
                  />
                  <button
                    type="button"
                    disabled={
                      mileageFrom.length < 5 ||
                      mileageTo.length < 5 ||
                      calculatingMiles
                    }
                    onClick={calcDistance}
                    className="flex cursor-pointer items-center justify-center rounded-lg px-2 transition-colors duration-150 disabled:cursor-default disabled:opacity-40"
                    style={{ color: calculatingMiles ? "#4356a9" : "#64748b" }}
                    title="Calculate distance"
                  >
                    {calculatingMiles ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <MapPin size={16} />
                    )}
                  </button>
                </div>
              </Field>
              <Field label="Mileage Cost">
                <div
                  className="input-neu flex items-center"
                  style={{
                    background: "#f0f2f5",
                    color: "#1d2a5d",
                    fontWeight: 600,
                  }}
                >
                  ${(actMiles * MILEAGE_RATE).toFixed(2)}
                </div>
              </Field>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
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
                    background: "#f8f9fb",
                    border: "1px solid #e2e5ea",
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
            style={{ color: "#4356a9" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "rgba(67,86,169,0.06)")
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
        <Section title="Meal Expenses">
          <div
            className="mb-3 flex items-center gap-2 rounded-lg px-3 py-2"
            style={{ background: "#fef2f2", border: "1px solid #fecaca" }}
          >
            <span
              className="text-xs font-semibold"
              style={{ color: "#ad2122" }}
            >
              *Attach Original Receipts
            </span>
          </div>
          <div className="overflow-visible">
            <table className="w-full text-left text-sm">
              <thead>
                <tr style={{ borderBottom: "2px solid #e2e5ea" }}>
                  <th
                    className="pr-3 pb-2 text-xs font-semibold uppercase"
                    style={{ color: "#64748b" }}
                  >
                    Date
                  </th>
                  <th
                    className="pr-3 pb-2 text-xs font-semibold uppercase"
                    style={{ color: "#64748b" }}
                  >
                    Breakfast
                  </th>
                  <th
                    className="pr-3 pb-2 text-xs font-semibold uppercase"
                    style={{ color: "#64748b" }}
                  >
                    Lunch
                  </th>
                  <th
                    className="pr-3 pb-2 text-xs font-semibold uppercase"
                    style={{ color: "#64748b" }}
                  >
                    Dinner
                  </th>
                  <th
                    className="pb-2 text-right text-xs font-semibold uppercase"
                    style={{ color: "#64748b" }}
                  >
                    Total
                  </th>
                  <th className="pb-2" style={{ width: "32px" }} />
                </tr>
              </thead>
              <tbody>
                {meals.map((meal, i) => {
                  const rowTotal =
                    (meal.breakfast || 0) +
                    (meal.lunch || 0) +
                    (meal.dinner || 0)
                  return (
                    <tr
                      key={meal.date}
                      style={{ borderBottom: "1px solid #f0f2f5" }}
                    >
                      <td className="py-2 pr-3" style={{ minWidth: "140px" }}>
                        <DatePicker
                          value={meal.date}
                          onChange={(v) => updateMeal(i, "date", v)}
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <div className="flex items-center gap-1">
                          <span style={{ color: "#94a3b8" }}>$</span>
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
                            style={{ maxWidth: "80px" }}
                          />
                        </div>
                      </td>
                      <td className="py-2 pr-3">
                        <div className="flex items-center gap-1">
                          <span style={{ color: "#94a3b8" }}>$</span>
                          <input
                            type="number"
                            value={meal.lunch || ""}
                            min={0}
                            step="0.01"
                            placeholder="0.00"
                            onChange={(e) =>
                              updateMeal(
                                i,
                                "lunch",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="input-neu"
                            style={{ maxWidth: "80px" }}
                          />
                        </div>
                      </td>
                      <td className="py-2 pr-3">
                        <div className="flex items-center gap-1">
                          <span style={{ color: "#94a3b8" }}>$</span>
                          <input
                            type="number"
                            value={meal.dinner || ""}
                            min={0}
                            step="0.01"
                            placeholder="0.00"
                            onChange={(e) =>
                              updateMeal(
                                i,
                                "dinner",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="input-neu"
                            style={{ maxWidth: "80px" }}
                          />
                        </div>
                      </td>
                      <td className="py-2 text-right">
                        <span
                          className="font-semibold"
                          style={{ color: "#1d2a5d" }}
                        >
                          ${rowTotal.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-2">
                        <button
                          type="button"
                          onClick={() =>
                            setMeals((prev) => prev.filter((_, j) => j !== i))
                          }
                          className="cursor-pointer rounded p-1 transition-colors"
                          style={{ color: "#94a3b8" }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.color = "#ad2122")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.color = "#94a3b8")
                          }
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            onClick={() => setMeals((prev) => [...prev, emptyMeal(todayStr())])}
            className="mt-2 flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200"
            style={{ color: "#4356a9" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "rgba(67,86,169,0.06)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "transparent")
            }
          >
            <Plus size={15} />
            Add Meal Row
          </button>
          <TotalRow label="Meal Total" value={mealTotal} />

          {/* Receipt upload */}
          <div className="mt-4">
            <p
              className="mb-2 text-xs font-semibold tracking-wider uppercase"
              style={{ color: "#64748b" }}
            >
              Meal Receipts
            </p>
            <label
              className="flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border-2 border-dashed p-4 transition-colors"
              style={{ borderColor: "#d1d5db", color: "#94a3b8" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#4356a9"
                e.currentTarget.style.background = "rgba(67,86,169,0.03)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#d1d5db"
                e.currentTarget.style.background = "transparent"
              }}
              onDragOver={(e) => {
                e.preventDefault()
                e.currentTarget.style.borderColor = "#4356a9"
                e.currentTarget.style.background = "rgba(67,86,169,0.06)"
              }}
              onDragLeave={(e) => {
                e.currentTarget.style.borderColor = "#d1d5db"
                e.currentTarget.style.background = "transparent"
              }}
              onDrop={(e) => {
                e.preventDefault()
                e.currentTarget.style.borderColor = "#d1d5db"
                e.currentTarget.style.background = "transparent"
                handleReceiptUpload(e.dataTransfer.files)
              }}
            >
              <Upload size={20} style={{ color: "#4356a9" }} />
              <p className="text-xs">
                <span
                  className="font-semibold underline"
                  style={{ color: "#4356a9" }}
                >
                  Upload receipts
                </span>{" "}
                or drag and drop
              </p>
              <input
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg,.gif"
                className="hidden"
                onChange={(e) => handleReceiptUpload(e.target.files)}
              />
            </label>
            {uploadingReceipts && (
              <div
                className="mt-2 flex items-center gap-2 text-sm"
                style={{ color: "#4356a9" }}
              >
                <Loader2 size={14} className="animate-spin" />
                Uploading…
              </div>
            )}
            {mealReceipts.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {mealReceipts.map((f, i) => {
                  const isImg = f.mimeType.startsWith("image/")
                  const Icon = isImg ? Image : FileText
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-3 rounded-lg px-3 py-1.5"
                      style={{
                        background: "#f8f9fb",
                        border: "1px solid #e2e5ea",
                      }}
                    >
                      <Icon
                        size={14}
                        style={{ color: "#4356a9", flexShrink: 0 }}
                      />
                      <a
                        href={f.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-w-0 flex-1 truncate text-xs font-medium underline"
                        style={{ color: "#1d2a5d" }}
                      >
                        {f.name}
                      </a>
                      <span
                        className="text-[10px]"
                        style={{ color: "#94a3b8" }}
                      >
                        {(f.size / 1024).toFixed(0)} KB
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setMealReceipts((prev) =>
                            prev.filter((_, j) => j !== i)
                          )
                        }
                        className="cursor-pointer rounded p-0.5 transition-colors"
                        style={{ color: "#94a3b8" }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.color = "#ad2122")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.color = "#94a3b8")
                        }
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </Section>

        {/* Summary */}
        <div
          className="space-y-2 rounded-xl p-5"
          style={{
            background: "#ffffff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
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
            <span className="text-lg font-bold" style={{ color: "#4356a9" }}>
              ${finalClaim.toFixed(2)}
            </span>
          </div>
        </div>

        <Section title="Employee Signature">
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
