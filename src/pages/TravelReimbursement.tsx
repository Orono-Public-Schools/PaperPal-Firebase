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
  Camera,
  ChevronDown,
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
import { useSandbox } from "@/hooks/useSandbox"
import { useFormFields } from "@/hooks/useFormFields"
import { useDraft } from "@/hooks/useDraft"
import {
  createSubmission,
  getSubmission,
  updateSubmission,
  getAppSettings,
  createOrUpdateUserProfile,
  resolveSupervisor,
} from "@/lib/firestore"
import type { TravelData, TravelExpenseItem } from "@/lib/types"
import { calculateDrivingDistance } from "@/lib/googleMaps"
import { formatBudgetCode } from "@/lib/utils"
import { storage, functions } from "@/lib/firebase"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { deleteField, arrayUnion, Timestamp } from "firebase/firestore"
import { httpsCallable } from "firebase/functions"
import type { TravelMeal, TravelActualOther, Attachment } from "@/lib/types"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().split("T")[0]
}

type ExpenseCategory = TravelExpenseItem["category"]

const EXPENSE_CATEGORIES: {
  value: ExpenseCategory
  label: string
  icon: string
}[] = [
  { value: "meal", label: "Meal", icon: "🍽" },
  { value: "lodging", label: "Lodging", icon: "🏨" },
  { value: "registration", label: "Registration", icon: "🎫" },
  { value: "other_transport", label: "Other Transportation", icon: "🚌" },
]

function emptyExpense(category: ExpenseCategory): TravelExpenseItem {
  return { category, date: todayStr(), amount: 0 }
}

async function compressImage(
  file: File,
  maxDim = 1200,
  quality = 0.7
): Promise<Blob> {
  if (!file.type.startsWith("image/")) return file
  return new Promise((resolve) => {
    const img = new window.Image()
    img.onload = () => {
      let { width, height } = img
      if (width > maxDim || height > maxDim) {
        const scale = maxDim / Math.max(width, height)
        width = Math.round(width * scale)
        height = Math.round(height * scale)
      }
      const canvas = document.createElement("canvas")
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext("2d")!
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob((blob) => resolve(blob ?? file), "image/jpeg", quality)
    }
    img.onerror = () => resolve(file)
    img.src = URL.createObjectURL(file)
  })
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function TravelReimbursement() {
  const { user, userProfile } = useAuth()
  const { sandbox } = useSandbox()
  const { isVisible, getOrder } = useFormFields("travel")
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const resubmitId = searchParams.get("resubmit")
  const signatureRef = useRef<SignatureFieldRef>(null)
  const draft = useDraft<{
    submitterName: string
    employeeId: string
    formDate: string
    address: string
    budgetYear: string
    accountCode: string
    meetingTitle: string
    location: string
    dateStart: string
    dateEnd: string
    timeAwayStart: string
    timeAwayEnd: string
    justification: string
    routeRequestTo: string
    advanceRequested: number
    mileageFrom: string
    mileageTo: string
    actMiles: number
    justificationFiles: Attachment[]
    expenses: TravelExpenseItem[]
    taxExemptAcknowledged: boolean
    estTransport: number
    estLodging: number
    estMeals: number
    estRegistration: number
    estSubstitute: number
    estOther: number
  }>("paperpal-draft-travel", !!resubmitId)
  const {
    save: saveDraft,
    load: loadDraft,
    clear: clearDraft,
    lastSaved: draftLastSaved,
  } = draft

  const draftLoaded = useRef(false)
  const saved = loadDraft()

  // Employee / trip header
  const [submitterName, setSubmitterName] = useState(
    saved?.submitterName ?? userProfile?.fullName ?? ""
  )
  const [employeeId, setEmployeeId] = useState(
    saved?.employeeId ?? userProfile?.employeeId ?? ""
  )
  const [formDate, setFormDate] = useState(saved?.formDate ?? todayStr())
  const [address, setAddress] = useState(saved?.address ?? "")
  const [budgetYear, setBudgetYear] = useState(saved?.budgetYear ?? "")
  const [accountCode, setAccountCode] = useState(saved?.accountCode ?? "")
  const [meetingTitle, setMeetingTitle] = useState(saved?.meetingTitle ?? "")
  const [location, setLocation] = useState(saved?.location ?? "")
  const [dateStart, setDateStart] = useState(saved?.dateStart ?? "")
  const [dateEnd, setDateEnd] = useState(saved?.dateEnd ?? "")
  const [timeAwayStart, setTimeAwayStart] = useState(saved?.timeAwayStart ?? "")
  const [timeAwayEnd, setTimeAwayEnd] = useState(saved?.timeAwayEnd ?? "")
  const [justification, setJustification] = useState(saved?.justification ?? "")
  const [routeRequestTo, setRouteRequestTo] = useState(
    sandbox ? (user?.email ?? "") : (userProfile?.supervisorEmail ?? "")
  )
  const [advanceRequested, setAdvanceRequested] = useState(
    saved?.advanceRequested ?? 0
  )

  // Mileage within travel
  const [mileageFrom, setMileageFrom] = useState(saved?.mileageFrom ?? "")
  const [mileageTo, setMileageTo] = useState(saved?.mileageTo ?? "")
  const [calculatingMiles, setCalculatingMiles] = useState(false)
  const [quickFills, setQuickFills] = useState<QuickFill[]>([])

  // File uploads
  const [justificationFiles, setJustificationFiles] = useState<Attachment[]>(
    saved?.justificationFiles ?? []
  )
  const [uploading, setUploading] = useState(false)

  // Estimated costs
  const [estTransport, setEstTransport] = useState(saved?.estTransport ?? 0)
  const [estLodging, setEstLodging] = useState(saved?.estLodging ?? 0)
  const [estMeals, setEstMeals] = useState(saved?.estMeals ?? 0)
  const [estRegistration, setEstRegistration] = useState(
    saved?.estRegistration ?? 0
  )
  const [estSubstitute, setEstSubstitute] = useState(saved?.estSubstitute ?? 0)
  const [estOther, setEstOther] = useState(saved?.estOther ?? 0)

  // Mileage (stays separate from expenses)
  const [actMiles, setActMiles] = useState(saved?.actMiles ?? 0)

  // Unified expenses
  const [expenses, setExpenses] = useState<TravelExpenseItem[]>(
    saved?.expenses ?? []
  )
  const [showCategoryPicker, setShowCategoryPicker] = useState(false)
  const [uploadingExpenseIdx, setUploadingExpenseIdx] = useState<number | null>(
    null
  )
  const [ocrLoadingIdx, setOcrLoadingIdx] = useState<number | null>(null)
  const [taxExemptAcknowledged, setTaxExemptAcknowledged] = useState(
    saved?.taxExemptAcknowledged ?? false
  )

  // Auto-save draft
  useEffect(() => {
    if (draftLoaded.current) {
      saveDraft({
        submitterName,
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
        routeRequestTo,
        advanceRequested,
        mileageFrom,
        mileageTo,
        actMiles,
        justificationFiles,
        expenses,
        taxExemptAcknowledged,
        estTransport,
        estLodging,
        estMeals,
        estRegistration,
        estSubstitute,
        estOther,
      })
    }
    draftLoaded.current = true
  }, [
    saveDraft,
    submitterName,
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
    routeRequestTo,
    advanceRequested,
    mileageFrom,
    mileageTo,
    actMiles,
    justificationFiles,
    expenses,
    taxExemptAcknowledged,
    estTransport,
    estLodging,
    estMeals,
    estRegistration,
    estSubstitute,
    estOther,
  ])

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
      if (fd.expenses && fd.expenses.length > 0) {
        setExpenses(fd.expenses)
        setTaxExemptAcknowledged(fd.taxExemptAcknowledged ?? false)
      } else {
        // Convert legacy format to new expenses array
        const converted: TravelExpenseItem[] = []
        if (fd.actuals.otherTransport > 0) {
          converted.push({
            category: "other_transport",
            date: fd.dateStart,
            amount: fd.actuals.otherTransport,
          })
        }
        if (fd.actuals.lodging > 0) {
          converted.push({
            category: "lodging",
            date: fd.dateStart,
            amount: fd.actuals.lodging,
          })
        }
        if (fd.actuals.registration > 0) {
          converted.push({
            category: "registration",
            date: fd.dateStart,
            amount: fd.actuals.registration,
          })
        }
        for (const o of fd.actuals.others) {
          converted.push({
            category: "other_transport",
            date: fd.dateStart,
            amount: o.amount,
            description: o.desc,
          })
        }
        for (const m of fd.meals) {
          if (m.breakfast > 0)
            converted.push({
              category: "meal",
              date: m.date,
              amount: m.breakfast,
              mealType: "breakfast",
            })
          if (m.lunch > 0)
            converted.push({
              category: "meal",
              date: m.date,
              amount: m.lunch,
              mealType: "lunch",
            })
          if (m.dinner > 0)
            converted.push({
              category: "meal",
              date: m.date,
              amount: m.dinner,
              mealType: "dinner",
            })
        }
        if (converted.length > 0) setExpenses(converted)
      }
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

  async function handleExpenseReceipt(expenseIdx: number, file: File) {
    if (!user) return
    setUploadingExpenseIdx(expenseIdx)
    try {
      const isImage = file.type.startsWith("image/")
      const toUpload = isImage ? await compressImage(file) : file
      const ext = isImage ? "jpg" : file.name.split(".").pop() || "pdf"
      const path = `travel-receipts/${user.uid}/${Date.now()}-receipt.${ext}`
      const storageRef = ref(storage, path)
      await uploadBytes(storageRef, toUpload)
      const url = await getDownloadURL(storageRef)
      const attachment: Attachment = {
        name: file.name,
        url,
        mimeType: isImage ? "image/jpeg" : file.type,
        size: toUpload.size,
      }
      setExpenses((prev) =>
        prev.map((e, i) =>
          i === expenseIdx ? { ...e, receipt: attachment } : e
        )
      )
      // Auto-run OCR for images
      if (isImage) {
        runOcr(expenseIdx, url)
      }
    } finally {
      setUploadingExpenseIdx(null)
    }
  }

  async function runOcr(expenseIdx: number, imageUrl: string) {
    setOcrLoadingIdx(expenseIdx)
    try {
      const extractTotal = httpsCallable<
        { imageUrl: string },
        { amount: number | null }
      >(functions, "extractReceiptTotal")
      const result = await extractTotal({ imageUrl })
      if (result.data.amount !== null && result.data.amount > 0) {
        setExpenses((prev) =>
          prev.map((e, i) =>
            i === expenseIdx && e.amount === 0
              ? { ...e, amount: result.data.amount! }
              : e
          )
        )
      }
    } catch {
      // OCR failed silently — user enters amount manually
    } finally {
      setOcrLoadingIdx(null)
    }
  }

  const MILEAGE_RATE = 0.72
  const expensesTotal = expenses.reduce((sum, e) => sum + (e.amount || 0), 0)
  const actTotal = actMiles * MILEAGE_RATE + expensesTotal

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

  function updateExpense(index: number, updates: Partial<TravelExpenseItem>) {
    setExpenses((prev) =>
      prev.map((e, i) => (i === index ? { ...e, ...updates } : e))
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !userProfile) return
    setSubmitting(true)
    try {
      // Build legacy actuals from new expenses for backward compat
      const mealExpenses = expenses.filter((e) => e.category === "meal")
      const mealTotal = mealExpenses.reduce((s, e) => s + (e.amount || 0), 0)
      const lodgingTotal = expenses
        .filter((e) => e.category === "lodging")
        .reduce((s, e) => s + (e.amount || 0), 0)
      const registrationTotal = expenses
        .filter((e) => e.category === "registration")
        .reduce((s, e) => s + (e.amount || 0), 0)
      const otherTransportTotal = expenses
        .filter((e) => e.category === "other_transport")
        .reduce((s, e) => s + (e.amount || 0), 0)

      // Build legacy meals array grouped by date
      const mealsByDate = new Map<string, TravelMeal>()
      for (const e of mealExpenses) {
        if (!mealsByDate.has(e.date))
          mealsByDate.set(e.date, {
            date: e.date,
            breakfast: 0,
            lunch: 0,
            dinner: 0,
          })
        const m = mealsByDate.get(e.date)!
        if (e.mealType === "breakfast") m.breakfast += e.amount || 0
        else if (e.mealType === "lunch") m.lunch += e.amount || 0
        else if (e.mealType === "dinner") m.dinner += e.amount || 0
      }

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
          otherTransport: otherTransportTotal,
          lodging: lodgingTotal,
          registration: registrationTotal,
          others: [] as TravelActualOther[],
          mealTotal,
          total: actTotal,
        },
        meals: Array.from(mealsByDate.values()),
        expenses,
        taxExemptAcknowledged,
        advanceRequested,
        finalClaim,
      }

      // Resolve approval chain to check for optional approver step
      const chain = !sandbox ? await resolveSupervisor(user.email ?? "") : null
      const approverFields = chain?.approverEmail
        ? {
            approverEmail: chain.approverEmail,
            approverName: chain.approverName ?? "",
          }
        : {}

      if (resubmitId) {
        await updateSubmission(resubmitId, {
          status: "pending",
          submitterName: userProfile.fullName,
          supervisorEmail: sandbox
            ? (user.email ?? "")
            : routeRequestTo || userProfile.supervisorEmail || "",
          ...approverFields,
          employeeSignatureUrl: signatureRef.current?.getDataUrl() ?? "",
          formData,
          attachments: justificationFiles,
          summary: `Travel — ${meetingTitle || location}`,
          amount: finalClaim,
          sandbox: sandbox || false,
          approverSignatureUrl: "",
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
          formType: "travel",
          status: "pending",
          submitterUid: user.uid,
          submitterEmail: user.email ?? "",
          submitterName: userProfile.fullName,
          supervisorEmail: sandbox
            ? (user.email ?? "")
            : routeRequestTo || userProfile.supervisorEmail || "",
          ...approverFields,
          employeeSignatureUrl: signatureRef.current?.getDataUrl() ?? "",
          formData,
          attachments: justificationFiles,
          revisionHistory: [],
          activityLog: [
            {
              action: "submitted",
              by: user.email ?? "",
              at: Timestamp.now(),
            },
          ],
          summary: `Travel — ${meetingTitle || location}`,
          amount: finalClaim,
          ...(sandbox && { sandbox: true }),
        })
        setSubmissionId(id)
      }
      clearDraft()
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
      <div className="mb-5 sm:mb-8">
        <h1
          className="text-xl font-bold sm:text-2xl"
          style={{ color: "#ffffff" }}
        >
          Travel Reimbursement
        </h1>
        <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
          Request reimbursement for travel with pre-approved and actual
          expenses.
        </p>
        {draftLastSaved && (
          <div className="mt-2 flex items-center gap-3">
            <span
              className="text-[11px]"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              Draft saved {draftLastSaved.toLocaleTimeString()}
            </span>
            <button
              type="button"
              onClick={() => {
                clearDraft()
                window.location.reload()
              }}
              className="cursor-pointer text-[11px] font-medium underline"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              Clear draft
            </button>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Employee / trip info */}
        <Section
          title="Employee & Trip Information"
          style={{ order: getOrder("fullName") }}
        >
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
            {isVisible("employeeId") && (
              <Field label="Employee ID">
                <input
                  type="text"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  placeholder="e.g. 12345"
                  className="input-neu"
                />
              </Field>
            )}
            {isVisible("formDate") && (
              <Field label="Form Date">
                <DatePicker value={formDate} onChange={setFormDate} required />
              </Field>
            )}
            {isVisible("address") && (
              <Field label="Home Address">
                <input
                  type="text"
                  value={address}
                  required
                  placeholder="Street, City, State ZIP"
                  onChange={(e) => setAddress(e.target.value)}
                  className="input-neu"
                />
                {userProfile?.homeAddress && !address && (
                  <button
                    type="button"
                    onClick={() => setAddress(userProfile.homeAddress!)}
                    className="mt-1 cursor-pointer text-[11px] font-medium"
                    style={{ color: "#4356a9" }}
                  >
                    Use saved address
                  </button>
                )}
              </Field>
            )}
            {isVisible("budgetYear") && (
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
            )}
            {isVisible("accountCode") && (
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
            )}
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
            {isVisible("timeAway") && (
              <Field label="Away From Job — Start">
                <DatePicker value={timeAwayStart} onChange={setTimeAwayStart} />
              </Field>
            )}
            {isVisible("timeAway") && (
              <Field label="Away From Job — End">
                <DatePicker value={timeAwayEnd} onChange={setTimeAwayEnd} />
              </Field>
            )}
          </div>
          {isVisible("routeTo") && (
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
          )}
        </Section>

        {/* Justification for Release */}
        {isVisible("justification") && (
          <Section
            title="Justification for Release"
            style={{ order: getOrder("justification") }}
          >
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
        )}

        {/* Pre-approved costs */}
        {isVisible("estimatedExpenses") && (
          <Section
            title="Pre-Approved Estimated Expenses"
            style={{ order: getOrder("estimatedExpenses") }}
          >
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
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
        )}

        {/* Transportation by Car */}
        <Section
          title="Transportation by Car"
          style={{ order: getOrder("actualExpenses") }}
        >
          <div className="mb-3 flex items-center justify-between">
            <p
              className="text-xs font-semibold tracking-wider uppercase"
              style={{ color: "#64748b" }}
            >
              Mileage Calculator
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
                  onChange={(e) => setActMiles(parseFloat(e.target.value) || 0)}
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
        </Section>

        {/* Unified Expenses */}
        <Section title="Expenses" style={{ order: getOrder("meals") }}>
          {expenses.length === 0 && (
            <p className="mb-3 text-sm" style={{ color: "#94a3b8" }}>
              Add your actual travel expenses here — meals, lodging,
              registration fees, and other transportation costs (taxi, parking,
              airfare, etc.). Attach a receipt to each item.
            </p>
          )}

          {/* Expense items grouped by category */}
          {(() => {
            const grouped = EXPENSE_CATEGORIES.map((cat) => ({
              ...cat,
              items: expenses
                .map((e, idx) => ({ ...e, _idx: idx }))
                .filter((e) => e.category === cat.value),
            })).filter((g) => g.items.length > 0)

            return grouped.map((group) => (
              <div key={group.value} className="mb-4">
                <div className="mb-2 flex items-center justify-between">
                  <p
                    className="text-xs font-semibold tracking-wider uppercase"
                    style={{ color: "#1d2a5d" }}
                  >
                    {group.icon} {group.label}
                  </p>
                  <span
                    className="text-xs font-semibold"
                    style={{ color: "#4356a9" }}
                  >
                    $
                    {group.items
                      .reduce((s, e) => s + (e.amount || 0), 0)
                      .toFixed(2)}
                  </span>
                </div>
                <div
                  className="divide-y"
                  style={{ borderColor: "rgba(180,185,195,0.25)" }}
                >
                  {group.items.map((expense) => (
                    <div
                      key={expense._idx}
                      className="py-3 first:pt-0 last:pb-0"
                    >
                      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto]">
                        <Field label="Date">
                          <DatePicker
                            value={expense.date}
                            onChange={(v) =>
                              updateExpense(expense._idx, { date: v })
                            }
                          />
                        </Field>
                        {expense.category === "meal" && (
                          <Field label="Meal Type">
                            <select
                              value={expense.mealType || ""}
                              required
                              onChange={(e) =>
                                updateExpense(expense._idx, {
                                  mealType: e.target
                                    .value as TravelExpenseItem["mealType"],
                                })
                              }
                              className="input-neu"
                            >
                              <option value="">Select…</option>
                              <option value="breakfast">Breakfast</option>
                              <option value="lunch">Lunch</option>
                              <option value="dinner">Dinner</option>
                            </select>
                          </Field>
                        )}
                        {expense.category === "lodging" && (
                          <Field label="Location">
                            <input
                              type="text"
                              value={expense.location || ""}
                              placeholder="Hotel name / city"
                              onChange={(e) =>
                                updateExpense(expense._idx, {
                                  location: e.target.value,
                                })
                              }
                              className="input-neu"
                            />
                          </Field>
                        )}
                        {expense.category === "other_transport" && (
                          <Field label="Description">
                            <input
                              type="text"
                              value={expense.description || ""}
                              required
                              placeholder="e.g. Taxi, Parking"
                              onChange={(e) =>
                                updateExpense(expense._idx, {
                                  description: e.target.value,
                                })
                              }
                              className="input-neu"
                            />
                          </Field>
                        )}
                        {expense.category === "registration" && <div />}
                        <Field label="Amount">
                          <div className="flex items-center gap-1">
                            <span style={{ color: "#94a3b8" }}>$</span>
                            <input
                              type="number"
                              value={expense.amount || ""}
                              required
                              min={0}
                              step="0.01"
                              placeholder="0.00"
                              onChange={(e) =>
                                updateExpense(expense._idx, {
                                  amount: parseFloat(e.target.value) || 0,
                                })
                              }
                              className="input-neu sm:max-w-[110px]"
                            />
                            {ocrLoadingIdx === expense._idx && (
                              <Loader2
                                size={14}
                                className="animate-spin"
                                style={{ color: "#4356a9" }}
                              />
                            )}
                          </div>
                        </Field>
                        <div className="flex items-end gap-1 pb-0.5">
                          <button
                            type="button"
                            onClick={() =>
                              setExpenses((prev) =>
                                prev.filter((_, j) => j !== expense._idx)
                              )
                            }
                            className="cursor-pointer rounded-lg p-1.5"
                            style={{ color: "#94a3b8" }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.color = "#ad2122")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.color = "#94a3b8")
                            }
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                      {/* Receipt attachment */}
                      <div className="mt-2">
                        {expense.receipt ? (
                          <div
                            className="flex items-center gap-3 rounded-lg px-3 py-1.5"
                            style={{
                              background: "#f8f9fb",
                              border: "1px solid #e2e5ea",
                            }}
                          >
                            {expense.receipt.mimeType.startsWith("image/") ? (
                              <img
                                src={expense.receipt.url}
                                alt="Receipt"
                                className="h-10 w-10 rounded object-cover"
                              />
                            ) : (
                              <FileText
                                size={14}
                                style={{ color: "#4356a9", flexShrink: 0 }}
                              />
                            )}
                            <a
                              href={expense.receipt.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="min-w-0 flex-1 truncate text-xs font-medium underline"
                              style={{ color: "#1d2a5d" }}
                            >
                              {expense.receipt.name}
                            </a>
                            <span
                              className="text-[10px]"
                              style={{ color: "#94a3b8" }}
                            >
                              {(expense.receipt.size / 1024).toFixed(0)} KB
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                updateExpense(expense._idx, {
                                  receipt: undefined,
                                })
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
                        ) : (
                          <div className="flex items-center gap-2">
                            {uploadingExpenseIdx === expense._idx ? (
                              <div
                                className="flex items-center gap-2 text-xs"
                                style={{ color: "#4356a9" }}
                              >
                                <Loader2 size={14} className="animate-spin" />
                                Uploading…
                              </div>
                            ) : (
                              <>
                                <label
                                  className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors sm:hidden"
                                  style={{
                                    color: "#4356a9",
                                    background: "rgba(67,86,169,0.06)",
                                  }}
                                >
                                  <Camera size={14} />
                                  Scan Receipt
                                  <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    className="hidden"
                                    onChange={(e) => {
                                      const f = e.target.files?.[0]
                                      if (f)
                                        handleExpenseReceipt(expense._idx, f)
                                    }}
                                  />
                                </label>
                                <label
                                  className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors"
                                  style={{
                                    color: "#4356a9",
                                    background: "rgba(67,86,169,0.06)",
                                  }}
                                >
                                  <Upload size={14} />
                                  Upload
                                  <input
                                    type="file"
                                    accept=".pdf,.png,.jpg,.jpeg"
                                    className="hidden"
                                    onChange={(e) => {
                                      const f = e.target.files?.[0]
                                      if (f)
                                        handleExpenseReceipt(expense._idx, f)
                                    }}
                                  />
                                </label>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          })()}

          {/* Add Expense button with category picker */}
          <div className="relative mt-2">
            <button
              type="button"
              onClick={() => setShowCategoryPicker(!showCategoryPicker)}
              className="flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200"
              style={{ color: "#4356a9" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "rgba(67,86,169,0.06)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "transparent")
              }
            >
              <Plus size={15} />
              Add Expense
              <ChevronDown size={14} />
            </button>
            {showCategoryPicker && (
              <div
                className="absolute left-0 z-10 mt-1 rounded-xl py-1"
                style={{
                  background: "#ffffff",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                  border: "1px solid #e2e5ea",
                  minWidth: "200px",
                }}
              >
                {EXPENSE_CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => {
                      setExpenses((prev) => [...prev, emptyExpense(cat.value)])
                      setShowCategoryPicker(false)
                    }}
                    className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors"
                    style={{ color: "#334155" }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor = "#f4f5f7")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = "transparent")
                    }
                  >
                    <span>{cat.icon}</span>
                    <span className="font-medium">{cat.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Tax exempt acknowledgment */}
          {expenses.length > 0 && (
            <label
              className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5"
              style={{ background: "#fef2f2", border: "1px solid #fecaca" }}
            >
              <input
                type="checkbox"
                checked={taxExemptAcknowledged}
                onChange={(e) => setTaxExemptAcknowledged(e.target.checked)}
                className="mt-0.5"
                required
              />
              <span
                className="text-xs font-medium"
                style={{ color: "#ad2122" }}
              >
                I confirm all amounts are pre-tax (Orono Public Schools is
                tax-exempt)
              </span>
            </label>
          )}

          <TotalRow label="Expenses Total" value={expensesTotal} />
        </Section>

        {/* Summary */}
        <div
          className="space-y-2 rounded-xl p-4 sm:p-5"
          style={{
            background: "#ffffff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            order: 90,
          }}
        >
          <div className="flex items-center justify-between text-sm">
            <span style={{ color: "#64748b" }}>Total Actual Expenses</span>
            <span className="font-semibold" style={{ color: "#1d2a5d" }}>
              ${actTotal.toFixed(2)}
            </span>
          </div>
          {isVisible("advanceRequested") && (
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
          )}
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

        <Section title="Employee Signature" style={{ order: 91 }}>
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
        <div
          className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"
          style={{ order: 99 }}
        >
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
      className="rounded-xl p-4 sm:p-5"
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
