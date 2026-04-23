import { useState, useRef, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router"
import {
  Plus,
  Trash2,
  CheckCircle,
  Send,
  X,
  Upload,
  Loader2,
  Image,
  FileText,
  File,
  Camera,
} from "lucide-react"
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
import { useDraft } from "@/hooks/useDraft"
import {
  createSubmission,
  getSubmission,
  updateSubmission,
  createOrUpdateUserProfile,
  resolveSupervisor,
} from "@/lib/firestore"
import type { CheckRequestData, Attachment } from "@/lib/types"
import { formatBudgetCode } from "@/lib/utils"
import { storage } from "@/lib/firebase"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import type { CheckRequestExpense } from "@/lib/types"

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
  const draft = useDraft<{
    submitterName: string
    routeRequestTo: string
    dateRequest: string
    dateNeeded: string
    payee: string
    street: string
    city: string
    state: string
    zip: string
    expenses: CheckRequestExpense[]
    receipts: Attachment[]
  }>("paperpal-draft-check", !!resubmitId)
  const {
    save: saveDraft,
    load: loadDraft,
    clear: clearDraft,
    lastSaved: draftLastSaved,
  } = draft

  // Load draft on mount
  const draftLoaded = useRef(false)
  const saved = loadDraft()
  const initName = saved?.submitterName ?? userProfile?.fullName ?? ""
  const initRoute = sandbox
    ? (user?.email ?? "")
    : (userProfile?.supervisorEmail ?? "")
  const initDateReq =
    saved?.dateRequest ?? new Date().toISOString().split("T")[0]

  const [submitterName, setSubmitterName] = useState(initName)
  const [routeRequestTo, setRouteRequestTo] = useState(initRoute)

  // Header fields
  const [dateRequest, setDateRequest] = useState(initDateReq)
  const [dateNeeded, setDateNeeded] = useState(saved?.dateNeeded ?? "")

  // Payee fields
  const [payee, setPayee] = useState(saved?.payee ?? "")
  const [street, setStreet] = useState(saved?.street ?? "")
  const [city, setCity] = useState(saved?.city ?? "")
  const [state, setState] = useState(saved?.state ?? "")
  const [zip, setZip] = useState(saved?.zip ?? "")

  // Expense rows
  const [expenses, setExpenses] = useState<CheckRequestExpense[]>(
    saved?.expenses?.length ? saved.expenses : [emptyExpense()]
  )

  // Receipts
  const [receipts, setReceipts] = useState<Attachment[]>(saved?.receipts ?? [])
  const [uploadingReceipts, setUploadingReceipts] = useState(false)

  const [sandboxApproverStep, setSandboxApproverStep] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submissionId, setSubmissionId] = useState("")

  // Auto-save draft on changes
  useEffect(() => {
    if (draftLoaded.current) {
      saveDraft({
        submitterName,
        routeRequestTo,
        dateRequest,
        dateNeeded,
        payee,
        street,
        city,
        state,
        zip,
        expenses,
        receipts,
      })
    }
    draftLoaded.current = true
  }, [
    saveDraft,
    submitterName,
    routeRequestTo,
    dateRequest,
    dateNeeded,
    payee,
    street,
    city,
    state,
    zip,
    expenses,
    receipts,
  ])

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

  async function handleReceiptUpload(files: FileList | null) {
    if (!files || !user) return
    setUploadingReceipts(true)
    const newAttachments: Attachment[] = []
    for (const file of Array.from(files)) {
      const isImage = file.type.startsWith("image/")
      const toUpload = isImage ? await compressImage(file) : file
      const ext = isImage ? "jpg" : file.name.split(".").pop() || "pdf"
      const path = `check-receipts/${user.uid}/${Date.now()}-${file.name.replace(/\.[^.]+$/, "")}.${ext}`
      const storageRef = ref(storage, path)
      await uploadBytes(storageRef, toUpload)
      const url = await getDownloadURL(storageRef)
      newAttachments.push({
        name: file.name,
        url,
        mimeType: isImage ? "image/jpeg" : file.type,
        size: toUpload.size,
      })
    }
    setReceipts((prev) => [...prev, ...newAttachments])
    setUploadingReceipts(false)
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

      // Resolve approval chain to check for optional approver step
      const chain = await resolveSupervisor(user.email ?? "")
      const hasApprover = sandbox ? sandboxApproverStep : !!chain?.approverEmail
      const approverFields = hasApprover
        ? {
            approverEmail: sandbox ? (user.email ?? "") : chain!.approverEmail!,
            approverName: chain?.approverName ?? "",
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
          summary: `Check Request — ${payee}`,
          amount: grandTotal,
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
          formType: "check",
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
          attachments: receipts,
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
      <div className="mb-5 sm:mb-8">
        <h1
          className="text-xl font-bold sm:text-2xl"
          style={{ color: "#ffffff" }}
        >
          Check Request
        </h1>
        <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
          Submit a payment request for a vendor or service.
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
          {sandbox && (
            <div className="mt-4">
              <Field label="Approval Flow (Sandbox)">
                <select
                  value={sandboxApproverStep ? "4-step" : "2-step"}
                  onChange={(e) =>
                    setSandboxApproverStep(e.target.value === "4-step")
                  }
                  className="input-neu cursor-pointer text-sm"
                >
                  <option value="2-step">Supervisor → Final Approver</option>
                  <option value="4-step">
                    Approver → Supervisor → Final Approver
                  </option>
                </select>
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

        {/* Receipts */}
        <Section title="Receipts" style={{ order: getOrder("expenses") + 1 }}>
          <p className="mb-3 text-sm" style={{ color: "#94a3b8" }}>
            Attach invoices, receipts, or other supporting documents.
          </p>
          <div className="flex items-center gap-2">
            <label
              className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors sm:hidden"
              style={{ color: "#4356a9", background: "rgba(67,86,169,0.06)" }}
            >
              <Camera size={14} />
              Scan Receipt
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => handleReceiptUpload(e.target.files)}
              />
            </label>
            <label
              className="flex w-full cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed p-6 transition-colors"
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
                accept=".pdf,.png,.jpg,.jpeg"
                className="hidden"
                onChange={(e) => handleReceiptUpload(e.target.files)}
              />
            </label>
          </div>
          {uploadingReceipts && (
            <div
              className="mt-2 flex items-center gap-2 text-sm"
              style={{ color: "#4356a9" }}
            >
              <Loader2 size={14} className="animate-spin" />
              Uploading…
            </div>
          )}
          {receipts.length > 0 && (
            <div className="mt-3 space-y-2">
              {receipts.map((f, i) => {
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
                    {isImage ? (
                      <img
                        src={f.url}
                        alt="Receipt"
                        className="h-10 w-10 rounded object-cover"
                        style={{ flexShrink: 0 }}
                      />
                    ) : (
                      <Icon
                        size={16}
                        style={{ color: "#4356a9", flexShrink: 0 }}
                      />
                    )}
                    <a
                      href={f.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-w-0 flex-1 truncate text-sm font-medium underline"
                      style={{ color: "#1d2a5d" }}
                    >
                      {f.name}
                    </a>
                    <span className="text-[11px]" style={{ color: "#94a3b8" }}>
                      {(f.size / 1024).toFixed(0)} KB
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setReceipts((prev) => prev.filter((_, j) => j !== i))
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
        </Section>

        {/* Total */}
        <div
          className="rounded-xl p-4 sm:p-5"
          style={{
            order: 90,
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
            className="input-neu sm:max-w-[120px]"
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
