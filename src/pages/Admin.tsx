import { useState, useEffect, useRef } from "react"
import {
  Plus,
  Trash2,
  Save,
  Building2,
  Users,
  Mail,
  Shield,
  Settings,
  Grid3X3,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Link2,
  HardDrive,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  Eye,
  EyeOff,
  SlidersHorizontal,
  Lock,
  Search,
  Pencil,
  X,
  Check,
  Tag,
} from "lucide-react"
import AppLayout from "@/components/layout/AppLayout"
import AddressAutocomplete from "@/components/forms/AddressAutocomplete"
import StaffEmailAutocomplete from "@/components/forms/StaffEmailAutocomplete"
import { useAuth } from "@/hooks/useAuth"
import { invalidateFormFieldsCache } from "@/hooks/useFormFields"
import {
  getBuildings,
  getStaffRecords,
  getAllUsers,
  updateUserRole,
  createOrUpdateUserProfile,
  getAppSettings,
  updateAppSettings,
  getBudgetSegments,
  updateBudgetSegments,
  getSupervisorMappings,
  updateSupervisorMappings,
  getBuildingSupervisorMappings,
  updateBuildingSupervisorMappings,
  getUniqueStaffTitles,
  getFormFieldConfigs,
  updateFormFieldConfigs,
} from "@/lib/firestore"
import { httpsCallable } from "firebase/functions"
import { functions } from "@/lib/firebase"
import type {
  Building,
  StaffRecord,
  UserProfile,
  UserRole,
  AppSettings,
  BudgetSegmentType,
  BudgetSegment,
  SupervisorMapping,
  BuildingSupervisorMapping,
  FormFieldConfig,
  FormType,
} from "@/lib/types"

const ROLE_LABELS: Record<UserRole, string> = {
  staff: "Staff",
  approver: "Approver",
  supervisor: "Supervisor",
  business_office: "Business Office",
  controller: "Controller",
  admin: "Admin",
}

const ADMIN_TABS = [
  { id: "forms", label: "Forms & Mappings", icon: SlidersHorizontal },
  { id: "settings", label: "Settings", icon: Settings },
] as const

type AdminTab = (typeof ADMIN_TABS)[number]["id"]

export default function Admin() {
  const { userProfile } = useAuth()
  const [activeTab, setActiveTab] = useState<AdminTab>("forms")

  const isAdmin = userProfile?.role === "admin"

  if (
    !userProfile ||
    !["admin", "business_office", "controller"].includes(userProfile.role)
  ) {
    return (
      <AppLayout>
        <div className="py-20 text-center">
          <p className="text-lg font-semibold" style={{ color: "#1d2a5d" }}>
            Access Denied
          </p>
          <p className="mt-1 text-sm" style={{ color: "#64748b" }}>
            You do not have permission to view this page.
          </p>
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
          Admin Panel
        </h1>
        <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
          Manage forms, mappings, and system settings.
        </p>
      </div>

      {/* Tabs */}
      <div
        className="mb-6 flex gap-1 rounded-xl p-1"
        style={{ background: "rgba(255,255,255,0.08)" }}
      >
        {ADMIN_TABS.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200"
              style={
                active
                  ? {
                      background:
                        "linear-gradient(135deg, #1d2a5d 0%, #2d3f89 100%)",
                      color: "white",
                      boxShadow: "0 2px 10px rgba(29,42,93,0.35)",
                    }
                  : { color: "rgba(255,255,255,0.5)" }
              }
            >
              <Icon size={15} />
              {label}
            </button>
          )
        })}
      </div>

      {/* Forms & Mappings */}
      {activeTab === "forms" && (
        <div className="space-y-6">
          <FormFieldsSection />
          <BudgetSegmentsSection />
          <WorkflowMappingSection />
        </div>
      )}

      {/* Settings */}
      {activeTab === "settings" && (
        <div className="space-y-6">
          <GeneralSettingsSection />
          <RolesSection />
          <StaffSection />
          {isAdmin && <StaffSyncSection />}
          {isAdmin && <EmailSettingsSection />}
          {isAdmin && <DrivePdfSettingsSection />}
        </div>
      )}
    </AppLayout>
  )
}

// ─── General Settings ────────────────────────────────────────────────────────

function GeneralSettingsSection() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    getAppSettings().then((s) => {
      setSettings(s)
      setLoading(false)
    })
  }, [])

  function update<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  async function handleSave() {
    if (!settings) return
    setSaving(true)
    await updateAppSettings({
      schoolAddressLabel: settings.schoolAddressLabel,
      schoolAddress: settings.schoolAddress,
      finalApproverEmail: settings.finalApproverEmail,
      finalApproverName: settings.finalApproverName,
      fiscalYearStartMonth: settings.fiscalYearStartMonth,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    setSaving(false)
  }

  return (
    <Section
      title="General Settings"
      icon={Settings}
      expanded={expanded}
      onToggle={() => setExpanded(!expanded)}
    >
      {loading || !settings ? (
        <p className="text-sm" style={{ color: "#64748b" }}>
          Loading…
        </p>
      ) : (
        <>
          <p
            className="mb-2 text-xs font-semibold tracking-wider uppercase"
            style={{ color: "#64748b" }}
          >
            School Address
          </p>
          <p className="mb-3 text-xs" style={{ color: "#94a3b8" }}>
            Default "School" option on mileage reimbursement forms.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Label">
              <input
                type="text"
                value={settings.schoolAddressLabel}
                onChange={(e) => update("schoolAddressLabel", e.target.value)}
                placeholder="e.g. Orono Schools"
                className="input-neu w-full"
              />
            </Field>
            <Field label="Address">
              <AddressAutocomplete
                value={settings.schoolAddress}
                onChange={(v) => update("schoolAddress", v)}
                placeholder="Street address"
              />
            </Field>
          </div>

          <div
            className="mt-5 border-t pt-5"
            style={{ borderColor: "rgba(180,185,195,0.25)" }}
          >
            <p
              className="mb-2 text-xs font-semibold tracking-wider uppercase"
              style={{ color: "#64748b" }}
            >
              Final Approver
            </p>
            <p className="mb-3 text-xs" style={{ color: "#94a3b8" }}>
              After a supervisor approves, the submission goes to this person
              for final sign-off before it reaches the business office.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name">
                <input
                  type="text"
                  value={settings.finalApproverName}
                  onChange={(e) => update("finalApproverName", e.target.value)}
                  placeholder="e.g. Jane Smith"
                  className="input-neu w-full"
                />
              </Field>
              <Field label="Email">
                <StaffEmailAutocomplete
                  value={settings.finalApproverEmail}
                  onChange={(v) => update("finalApproverEmail", v)}
                  placeholder="controller@orono.k12.mn.us"
                  className="input-neu w-full"
                />
              </Field>
            </div>
          </div>

          <div
            className="mt-5 border-t pt-5"
            style={{ borderColor: "rgba(180,185,195,0.25)" }}
          >
            <p
              className="mb-2 text-xs font-semibold tracking-wider uppercase"
              style={{ color: "#64748b" }}
            >
              Fiscal Year
            </p>
            <p className="mb-3 text-xs" style={{ color: "#94a3b8" }}>
              The budget year on forms rolls over on the 1st of this month.
            </p>
            <div style={{ maxWidth: "200px" }}>
              <Field label="Fiscal Year Starts">
                <select
                  value={settings.fiscalYearStartMonth}
                  onChange={(e) =>
                    update("fiscalYearStartMonth", parseInt(e.target.value))
                  }
                  className="input-neu w-full cursor-pointer"
                >
                  {[
                    "January",
                    "February",
                    "March",
                    "April",
                    "May",
                    "June",
                    "July",
                    "August",
                    "September",
                    "October",
                    "November",
                    "December",
                  ].map((m, i) => (
                    <option key={i} value={i}>
                      {m}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button onClick={handleSave} disabled={saving} className="btn-save">
              <Save size={14} />
              <span>{saving ? "Saving…" : "Save"}</span>
            </button>
            {saved && (
              <span
                className="text-sm font-medium"
                style={{ color: "#4356a9" }}
              >
                Saved!
              </span>
            )}
          </div>
        </>
      )}
    </Section>
  )
}

// ─── Form Fields ────────────────────────────────────────────────────────────

const FORM_TYPE_LABELS: Record<FormType, string> = {
  check: "Check Request",
  mileage: "Mileage Reimbursement",
  travel: "Travel Reimbursement",
}

// Placeholder input bar for form preview
function InputBar({ w = "100%" }: { w?: string }) {
  return (
    <div
      className="rounded-lg"
      style={{ background: "#f4f5f7", height: 34, width: w }}
    />
  )
}

function PreviewLabel({ text }: { text: string }) {
  return (
    <p
      className="mb-1 text-[10px] font-semibold tracking-wider uppercase"
      style={{ color: "#94a3b8" }}
    >
      {text}
    </p>
  )
}

// Each form type defines its sections as preview renderers
const FORM_PREVIEWS: Record<FormType, Record<string, () => React.ReactNode>> = {
  check: {
    fullName: () => (
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <PreviewLabel text="Full Name" />
          <InputBar />
        </div>
        <div>
          <PreviewLabel text="Date of Request" />
          <InputBar />
        </div>
        <div>
          <PreviewLabel text="Date Check Needed" />
          <InputBar />
        </div>
      </div>
    ),
    dateOfRequest: () => null,
    dateCheckNeeded: () => null,
    routeTo: () => (
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <PreviewLabel text="Route To" />
          <InputBar />
        </div>
      </div>
    ),
    payeeName: () => (
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <PreviewLabel text="Payee / Vendor Name" />
          <InputBar />
        </div>
      </div>
    ),
    payeeAddress: () => (
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <PreviewLabel text="Street Address" />
          <InputBar />
        </div>
        <div>
          <PreviewLabel text="City" />
          <InputBar />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <PreviewLabel text="State" />
            <InputBar />
          </div>
          <div>
            <PreviewLabel text="ZIP" />
            <InputBar />
          </div>
        </div>
      </div>
    ),
    expenses: () => (
      <div className="space-y-2">
        <div className="grid grid-cols-3 gap-2">
          <div>
            <PreviewLabel text="Account Code" />
            <InputBar />
          </div>
          <div>
            <PreviewLabel text="Description" />
            <InputBar />
          </div>
          <div>
            <PreviewLabel text="Amount" />
            <InputBar w="80px" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <InputBar />
          <InputBar />
          <InputBar w="80px" />
        </div>
      </div>
    ),
    signature: () => (
      <div
        className="flex items-center justify-center rounded-lg"
        style={{
          background: "#f8f9fb",
          border: "1px dashed #c8ccd4",
          height: 60,
        }}
      >
        <span className="text-xs" style={{ color: "#94a3b8" }}>
          Signature area
        </span>
      </div>
    ),
  },
  mileage: {
    fullName: () => (
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <PreviewLabel text="Full Name" />
          <InputBar />
        </div>
      </div>
    ),
    employeeId: () => (
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <PreviewLabel text="Employee ID" />
          <InputBar />
        </div>
      </div>
    ),
    accountCode: () => (
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <PreviewLabel text="Account Code" />
          <InputBar />
        </div>
      </div>
    ),
    routeTo: () => (
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <PreviewLabel text="Route To" />
          <InputBar />
        </div>
      </div>
    ),
    trips: () => (
      <div className="space-y-2">
        <div className="grid grid-cols-5 gap-2">
          {["Date", "From", "To", "Miles", "Purpose"].map((h) => (
            <PreviewLabel key={h} text={h} />
          ))}
        </div>
        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <InputBar key={n} />
          ))}
        </div>
      </div>
    ),
    tripPurpose: () => null,
    roundTrip: () => null,
    signature: () => (
      <div
        className="flex items-center justify-center rounded-lg"
        style={{
          background: "#f8f9fb",
          border: "1px dashed #c8ccd4",
          height: 60,
        }}
      >
        <span className="text-xs" style={{ color: "#94a3b8" }}>
          Signature area
        </span>
      </div>
    ),
  },
  travel: {
    fullName: () => (
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <PreviewLabel text="Full Name" />
          <InputBar />
        </div>
      </div>
    ),
    employeeId: () => (
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <PreviewLabel text="Employee ID" />
          <InputBar />
        </div>
      </div>
    ),
    formDate: () => (
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <PreviewLabel text="Form Date" />
          <InputBar />
        </div>
      </div>
    ),
    address: () => (
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <PreviewLabel text="Home Address" />
          <InputBar />
        </div>
      </div>
    ),
    routeTo: () => (
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <PreviewLabel text="Route To" />
          <InputBar />
        </div>
      </div>
    ),
    budgetYear: () => (
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <PreviewLabel text="Budget Year" />
          <InputBar />
        </div>
      </div>
    ),
    accountCode: () => (
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <PreviewLabel text="Account Code" />
          <InputBar />
        </div>
      </div>
    ),
    meetingDetails: () => (
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <PreviewLabel text="Meeting / Conference Title" />
          <InputBar />
        </div>
        <div>
          <PreviewLabel text="Location" />
          <InputBar />
        </div>
        <div>
          <PreviewLabel text="Date Start" />
          <InputBar />
        </div>
        <div>
          <PreviewLabel text="Date End" />
          <InputBar />
        </div>
      </div>
    ),
    timeAway: () => (
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <PreviewLabel text="Away From Job Start" />
          <InputBar />
        </div>
        <div>
          <PreviewLabel text="Away From Job End" />
          <InputBar />
        </div>
      </div>
    ),
    justification: () => (
      <div>
        <PreviewLabel text="Justification / Purpose" />
        <div
          className="rounded-lg"
          style={{ background: "#f4f5f7", height: 50 }}
        />
      </div>
    ),
    estimatedExpenses: () => (
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          "Transport",
          "Lodging",
          "Meals",
          "Registration",
          "Substitute",
          "Other",
        ].map((l) => (
          <div key={l}>
            <PreviewLabel text={l} />
            <InputBar w="80px" />
          </div>
        ))}
      </div>
    ),
    actualExpenses: () => (
      <div className="grid gap-3 sm:grid-cols-3">
        {["Miles", "Other Transport", "Lodging", "Registration"].map((l) => (
          <div key={l}>
            <PreviewLabel text={l} />
            <InputBar w="80px" />
          </div>
        ))}
      </div>
    ),
    meals: () => (
      <div className="space-y-2">
        <div className="grid grid-cols-5 gap-2">
          {["Date", "Breakfast", "Lunch", "Dinner", "Total"].map((h) => (
            <PreviewLabel key={h} text={h} />
          ))}
        </div>
        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <InputBar key={n} />
          ))}
        </div>
      </div>
    ),
    advanceRequested: () => (
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <PreviewLabel text="Advance Requested" />
          <InputBar w="120px" />
        </div>
      </div>
    ),
    signature: () => (
      <div
        className="flex items-center justify-center rounded-lg"
        style={{
          background: "#f8f9fb",
          border: "1px dashed #c8ccd4",
          height: 60,
        }}
      >
        <span className="text-xs" style={{ color: "#94a3b8" }}>
          Signature area
        </span>
      </div>
    ),
  },
}

// Section titles that map to field IDs
const SECTION_TITLES: Record<FormType, Record<string, string>> = {
  check: {
    fullName: "Request Details",
    routeTo: "Request Details",
    dateOfRequest: "Request Details",
    dateCheckNeeded: "Request Details",
    payeeName: "Payee Information",
    payeeAddress: "Payee Information",
    expenses: "Expenses",
    signature: "Employee Signature",
  },
  mileage: {
    fullName: "Employee Information",
    employeeId: "Employee Information",
    accountCode: "Employee Information",
    routeTo: "Employee Information",
    trips: "Trip Log",
    tripPurpose: "Trip Log",
    roundTrip: "Trip Log",
    signature: "Employee Signature",
  },
  travel: {
    fullName: "Employee & Trip Information",
    employeeId: "Employee & Trip Information",
    formDate: "Employee & Trip Information",
    address: "Employee & Trip Information",
    routeTo: "Employee & Trip Information",
    budgetYear: "Employee & Trip Information",
    accountCode: "Employee & Trip Information",
    meetingDetails: "Meeting / Conference Details",
    timeAway: "Time Away",
    justification: "Justification & Attachments",
    estimatedExpenses: "Estimated Expenses",
    actualExpenses: "Actual Costs",
    meals: "Meal Expenses",
    advanceRequested: "Advance Requested",
    signature: "Employee Signature",
  },
}

function FormFieldsSection() {
  const [configs, setConfigs] = useState<Record<
    FormType,
    FormFieldConfig[]
  > | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activeForm, setActiveForm] = useState<FormType>("check")

  useEffect(() => {
    getFormFieldConfigs().then((c) => {
      setConfigs(c)
      setLoading(false)
    })
  }, [])

  function moveField(formType: FormType, index: number, dir: -1 | 1) {
    if (!configs) return
    const fields = [...configs[formType]].sort(
      (a, b) => a.sortOrder - b.sortOrder
    )
    const swapIdx = index + dir
    if (swapIdx < 0 || swapIdx >= fields.length) return
    const tempOrder = fields[index].sortOrder
    fields[index] = { ...fields[index], sortOrder: fields[swapIdx].sortOrder }
    fields[swapIdx] = { ...fields[swapIdx], sortOrder: tempOrder }
    setConfigs({ ...configs, [formType]: fields })
  }

  function toggleField(formType: FormType, id: string) {
    if (!configs) return
    setConfigs({
      ...configs,
      [formType]: configs[formType].map((f) =>
        f.id === id && !f.locked ? { ...f, visible: !f.visible } : f
      ),
    })
  }

  async function handleSave() {
    if (!configs) return
    setSaving(true)
    await updateFormFieldConfigs(configs)
    invalidateFormFieldsCache()
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    setSaving(false)
  }

  const fields = configs
    ? [...configs[activeForm]].sort((a, b) => a.sortOrder - b.sortOrder)
    : []

  return (
    <Section
      title="Form Fields"
      icon={SlidersHorizontal}
      expanded={expanded}
      onToggle={() => setExpanded(!expanded)}
    >
      {loading ? (
        <p className="text-sm" style={{ color: "#64748b" }}>
          Loading…
        </p>
      ) : (
        <>
          <p className="mb-4 text-xs" style={{ color: "#94a3b8" }}>
            Show, hide, and reorder sections on each form. Locked sections
            cannot be hidden. Changes affect all users.
          </p>

          {/* Form type tabs */}
          <div
            className="mb-5 flex gap-1 rounded-lg p-1"
            style={{ background: "#f4f5f7" }}
          >
            {(Object.keys(FORM_TYPE_LABELS) as FormType[]).map((ft) => (
              <button
                key={ft}
                onClick={() => setActiveForm(ft)}
                className="flex-1 cursor-pointer rounded-md px-3 py-2 text-xs font-semibold transition-colors"
                style={
                  activeForm === ft
                    ? {
                        background: "#ffffff",
                        color: "#1d2a5d",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                      }
                    : { color: "#64748b" }
                }
              >
                {FORM_TYPE_LABELS[ft]}
              </button>
            ))}
          </div>

          {/* Form preview */}
          <div
            className="rounded-xl p-5"
            style={{
              background:
                "linear-gradient(160deg, #0f1a3e 0%, #1a2754 40%, #1e2d5a 100%)",
            }}
          >
            {/* Mini form header */}
            <div className="mb-4">
              <p
                className="text-lg font-bold"
                style={{ color: "rgba(255,255,255,0.9)" }}
              >
                {FORM_TYPE_LABELS[activeForm]}
              </p>
              <p
                className="mt-0.5 text-xs"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                {fields.filter((f) => f.visible).length} of {fields.length}{" "}
                fields visible — hover sections to edit
              </p>
            </div>

            {/* Sections rendered like the actual form */}
            <div className="flex flex-col gap-4">
              {fields.map((field, i) => {
                const preview = FORM_PREVIEWS[activeForm]?.[field.id]
                if (!preview) return null
                const content = preview()
                if (content === null) return null

                const sectionTitle =
                  SECTION_TITLES[activeForm]?.[field.id] ?? field.label

                if (field.visible) {
                  return (
                    <div
                      key={field.id}
                      className="group relative rounded-xl p-5 transition-all duration-200"
                      style={{
                        background: "#ffffff",
                        boxShadow:
                          "0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06)",
                      }}
                    >
                      <h3
                        className="mb-3 text-xs font-semibold tracking-widest uppercase"
                        style={{ color: "#1d2a5d" }}
                      >
                        {sectionTitle}
                      </h3>
                      {content}

                      {/* Hover toolbar */}
                      <div
                        className="pointer-events-none absolute inset-0 flex items-start justify-end gap-1 rounded-xl p-2 opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100"
                        style={{ background: "rgba(29,42,93,0.03)" }}
                      >
                        <button
                          onClick={() => moveField(activeForm, i, -1)}
                          disabled={i === 0}
                          className="cursor-pointer rounded-lg p-1.5 transition-colors hover:bg-white disabled:cursor-default disabled:opacity-20"
                          style={{
                            color: "#64748b",
                            background: "rgba(255,255,255,0.8)",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                          }}
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          onClick={() => moveField(activeForm, i, 1)}
                          disabled={i === fields.length - 1}
                          className="cursor-pointer rounded-lg p-1.5 transition-colors hover:bg-white disabled:cursor-default disabled:opacity-20"
                          style={{
                            color: "#64748b",
                            background: "rgba(255,255,255,0.8)",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                          }}
                        >
                          <ArrowDown size={14} />
                        </button>
                        {!field.locked && (
                          <button
                            onClick={() => toggleField(activeForm, field.id)}
                            className="flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-colors hover:bg-white"
                            style={{
                              color: "#ad2122",
                              background: "rgba(255,255,255,0.8)",
                              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                            }}
                          >
                            <EyeOff size={12} />
                            Hide
                          </button>
                        )}
                        {field.locked && (
                          <div
                            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold"
                            style={{
                              color: "#94a3b8",
                              background: "rgba(255,255,255,0.8)",
                              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                            }}
                          >
                            <Lock size={10} />
                            Required
                          </div>
                        )}
                      </div>
                    </div>
                  )
                }

                // Hidden field — collapsed
                return (
                  <div
                    key={field.id}
                    className="group flex items-center justify-between rounded-xl px-5 py-3 transition-all duration-200"
                    style={{
                      border: "1px dashed rgba(255,255,255,0.15)",
                      background: "rgba(255,255,255,0.03)",
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <EyeOff
                        size={13}
                        style={{ color: "rgba(255,255,255,0.25)" }}
                      />
                      <span
                        className="text-xs font-medium"
                        style={{
                          color: "rgba(255,255,255,0.35)",
                          textDecoration: "line-through",
                        }}
                      >
                        {sectionTitle} — {field.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => moveField(activeForm, i, -1)}
                        disabled={i === 0}
                        className="cursor-pointer rounded p-1 opacity-0 transition-opacity group-hover:opacity-100 disabled:cursor-default disabled:opacity-20"
                        style={{ color: "rgba(255,255,255,0.4)" }}
                      >
                        <ArrowUp size={12} />
                      </button>
                      <button
                        onClick={() => moveField(activeForm, i, 1)}
                        disabled={i === fields.length - 1}
                        className="cursor-pointer rounded p-1 opacity-0 transition-opacity group-hover:opacity-100 disabled:cursor-default disabled:opacity-20"
                        style={{ color: "rgba(255,255,255,0.4)" }}
                      >
                        <ArrowDown size={12} />
                      </button>
                      <button
                        onClick={() => toggleField(activeForm, field.id)}
                        className="flex cursor-pointer items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors"
                        style={{
                          color: "#4356a9",
                          background: "rgba(67,86,169,0.15)",
                        }}
                      >
                        <Eye size={12} />
                        Show
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button onClick={handleSave} disabled={saving} className="btn-save">
              <Save size={14} />
              <span>{saving ? "Saving…" : "Save"}</span>
            </button>
            {saved && (
              <span
                className="text-sm font-medium"
                style={{ color: "#4356a9" }}
              >
                Saved!
              </span>
            )}
          </div>
        </>
      )}
    </Section>
  )
}

// ─── Budget Segments ─────────────────────────────────────────────────────────

const SEGMENT_LABELS: Record<BudgetSegmentType, string> = {
  fund: "Fund",
  org: "Organization",
  proj: "Project",
  fin: "Finance",
  course: "Course",
  obj: "Object",
}

function BudgetSegmentsSection() {
  const [segments, setSegments] = useState<
    Record<BudgetSegmentType, BudgetSegment[]>
  >({
    fund: [],
    org: [],
    proj: [],
    fin: [],
    course: [],
    obj: [],
  })
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [pasteData, setPasteData] = useState("")
  const [pasteTarget, setPasteTarget] = useState<BudgetSegmentType>("fund")
  const [openCategory, setOpenCategory] = useState<BudgetSegmentType | null>(
    null
  )
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editCode, setEditCode] = useState("")
  const [editTitle, setEditTitle] = useState("")
  const [addingTo, setAddingTo] = useState<BudgetSegmentType | null>(null)
  const [newCode, setNewCode] = useState("")
  const [newTitle, setNewTitle] = useState("")

  useEffect(() => {
    getBudgetSegments().then((s) => {
      setSegments(s)
      setLoading(false)
    })
  }, [])

  function addSegment(type: BudgetSegmentType, code: string, title: string) {
    if (!code.trim()) return
    setSegments((prev) => ({
      ...prev,
      [type]: [...prev[type], { code: code.trim(), title: title.trim() }].sort(
        (a, b) => a.code.localeCompare(b.code)
      ),
    }))
  }

  function removeSegment(type: BudgetSegmentType, index: number) {
    setSegments((prev) => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index),
    }))
  }

  function startEdit(type: BudgetSegmentType, index: number) {
    const item = segments[type][index]
    setEditingKey(`${type}-${index}`)
    setEditCode(item.code)
    setEditTitle(item.title)
  }

  function saveEdit(type: BudgetSegmentType, index: number) {
    if (!editCode.trim()) return
    setSegments((prev) => ({
      ...prev,
      [type]: prev[type].map((s, i) =>
        i === index ? { code: editCode.trim(), title: editTitle.trim() } : s
      ),
    }))
    setEditingKey(null)
  }

  function handleAddSubmit(type: BudgetSegmentType) {
    if (!newCode.trim()) return
    addSegment(type, newCode, newTitle)
    setNewCode("")
    setNewTitle("")
    setAddingTo(null)
  }

  function handlePasteImport() {
    const lines = pasteData
      .trim()
      .split("\n")
      .filter((l) => l.trim())
    for (const line of lines) {
      const parts = line.split("\t").map((s) => s.trim())
      if (parts[0]) {
        addSegment(pasteTarget, parts[0], parts[1] || "")
      }
    }
    setPasteData("")
  }

  async function handleSave() {
    setSaving(true)
    await updateBudgetSegments(segments)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    setSaving(false)
  }

  const totalCount = Object.values(segments).reduce(
    (sum, arr) => sum + arr.length,
    0
  )

  return (
    <Section
      title="Budget Code Segments"
      icon={Grid3X3}
      expanded={expanded}
      onToggle={() => setExpanded(!expanded)}
    >
      {loading ? (
        <p className="text-sm" style={{ color: "#64748b" }}>
          Loading…
        </p>
      ) : (
        <>
          <p className="mb-3 text-xs" style={{ color: "#94a3b8" }}>
            {totalCount} segment{totalCount !== 1 && "s"} across{" "}
            {Object.values(segments).filter((a) => a.length > 0).length}{" "}
            categories. These populate the Budget Code Builder on forms.
          </p>

          {/* Paste import */}
          <div
            className="mb-4 rounded-xl p-3"
            style={{ background: "#f8f9fb", border: "1px solid #e2e5ea" }}
          >
            <p
              className="mb-2 text-xs font-semibold"
              style={{ color: "#1d2a5d" }}
            >
              Quick Import
            </p>
            <div className="mb-2 flex gap-2">
              <select
                value={pasteTarget}
                onChange={(e) =>
                  setPasteTarget(e.target.value as BudgetSegmentType)
                }
                className="input-neu cursor-pointer text-xs"
                style={{ maxWidth: "150px" }}
              >
                {(Object.keys(SEGMENT_LABELS) as BudgetSegmentType[]).map(
                  (t) => (
                    <option key={t} value={t}>
                      {SEGMENT_LABELS[t]}
                    </option>
                  )
                )}
              </select>
            </div>
            <textarea
              value={pasteData}
              onChange={(e) => setPasteData(e.target.value)}
              placeholder={
                "Paste tab-separated: Code \\t Title\n01\tGeneral Fund\n02\tSpecial Revenue"
              }
              rows={3}
              className="input-neu mb-2 w-full"
              style={{
                resize: "vertical",
                fontFamily: "monospace",
                fontSize: "0.7rem",
              }}
            />
            <button
              onClick={handlePasteImport}
              disabled={!pasteData.trim()}
              className="flex cursor-pointer items-center gap-2 rounded px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
              style={{
                background: "linear-gradient(135deg, #1d2a5d 0%, #2d3f89 100%)",
              }}
            >
              <Plus size={12} />
              Import to {SEGMENT_LABELS[pasteTarget]}
            </button>
          </div>

          {/* Segment categories (collapsible) */}
          <div className="space-y-2">
            {(Object.keys(SEGMENT_LABELS) as BudgetSegmentType[]).map(
              (type) => {
                const items = segments[type]
                const isOpen = openCategory === type

                return (
                  <div
                    key={type}
                    className="rounded-lg"
                    style={{ border: "1px solid #e2e5ea" }}
                  >
                    {/* Category header */}
                    <button
                      onClick={() => setOpenCategory(isOpen ? null : type)}
                      className="flex w-full cursor-pointer items-center justify-between px-3 py-2.5"
                      style={{ background: isOpen ? "#f8f9fb" : "transparent" }}
                    >
                      <span
                        className="text-xs font-semibold tracking-wider uppercase"
                        style={{ color: "#1d2a5d" }}
                      >
                        {SEGMENT_LABELS[type]}
                      </span>
                      <div className="flex items-center gap-2">
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                          style={{ background: "#eaecf5", color: "#4356a9" }}
                        >
                          {items.length}
                        </span>
                        {isOpen ? (
                          <ChevronUp size={14} style={{ color: "#64748b" }} />
                        ) : (
                          <ChevronDown size={14} style={{ color: "#64748b" }} />
                        )}
                      </div>
                    </button>

                    {/* Expanded content */}
                    {isOpen && (
                      <div
                        className="border-t px-3 pb-3"
                        style={{ borderColor: "#e2e5ea" }}
                      >
                        {items.length > 0 && (
                          <div className="max-h-60 overflow-y-auto">
                            <table className="w-full text-left text-xs">
                              <thead>
                                <tr
                                  style={{ borderBottom: "1px solid #e2e5ea" }}
                                >
                                  <th
                                    className="py-2 pr-2 font-semibold"
                                    style={{ color: "#94a3b8", width: "80px" }}
                                  >
                                    Code
                                  </th>
                                  <th
                                    className="py-2 pr-2 font-semibold"
                                    style={{ color: "#94a3b8" }}
                                  >
                                    Title
                                  </th>
                                  <th
                                    className="py-2"
                                    style={{ width: "60px" }}
                                  />
                                </tr>
                              </thead>
                              <tbody>
                                {items.map((s, i) => {
                                  const isEditing =
                                    editingKey === `${type}-${i}`
                                  return (
                                    <tr
                                      key={i}
                                      style={{
                                        borderBottom: "1px solid #f0f2f5",
                                      }}
                                    >
                                      {isEditing ? (
                                        <>
                                          <td className="py-1.5 pr-2">
                                            <input
                                              type="text"
                                              value={editCode}
                                              onChange={(e) =>
                                                setEditCode(e.target.value)
                                              }
                                              className="input-neu font-mono text-xs"
                                              style={{ width: "70px" }}
                                            />
                                          </td>
                                          <td className="py-1.5 pr-2">
                                            <input
                                              type="text"
                                              value={editTitle}
                                              onChange={(e) =>
                                                setEditTitle(e.target.value)
                                              }
                                              className="input-neu w-full text-xs"
                                            />
                                          </td>
                                          <td className="py-1.5">
                                            <div className="flex gap-1">
                                              <button
                                                onClick={() =>
                                                  saveEdit(type, i)
                                                }
                                                className="cursor-pointer rounded px-2 py-1 text-[10px] font-semibold text-white"
                                                style={{
                                                  background: "#1d2a5d",
                                                }}
                                              >
                                                Save
                                              </button>
                                              <button
                                                onClick={() =>
                                                  setEditingKey(null)
                                                }
                                                className="cursor-pointer text-[10px] font-medium"
                                                style={{ color: "#64748b" }}
                                              >
                                                Cancel
                                              </button>
                                            </div>
                                          </td>
                                        </>
                                      ) : (
                                        <>
                                          <td
                                            className="py-1.5 pr-2 font-mono font-semibold"
                                            style={{ color: "#1d2a5d" }}
                                          >
                                            {s.code}
                                          </td>
                                          <td
                                            className="py-1.5 pr-2"
                                            style={{ color: "#64748b" }}
                                          >
                                            {s.title}
                                          </td>
                                          <td className="py-1.5">
                                            <div className="flex gap-1">
                                              <button
                                                onClick={() =>
                                                  startEdit(type, i)
                                                }
                                                className="cursor-pointer rounded p-0.5 text-[10px] font-medium transition-colors"
                                                style={{ color: "#4356a9" }}
                                              >
                                                Edit
                                              </button>
                                              <button
                                                onClick={() =>
                                                  removeSegment(type, i)
                                                }
                                                className="cursor-pointer rounded p-0.5 transition-colors"
                                                style={{ color: "#94a3b8" }}
                                                onMouseEnter={(e) =>
                                                  (e.currentTarget.style.color =
                                                    "#ad2122")
                                                }
                                                onMouseLeave={(e) =>
                                                  (e.currentTarget.style.color =
                                                    "#94a3b8")
                                                }
                                              >
                                                <Trash2 size={12} />
                                              </button>
                                            </div>
                                          </td>
                                        </>
                                      )}
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {/* Add new segment */}
                        {addingTo === type ? (
                          <div className="mt-2 flex items-end gap-2">
                            <div>
                              <label
                                className="mb-0.5 block text-[10px] font-semibold uppercase"
                                style={{ color: "#94a3b8" }}
                              >
                                Code
                              </label>
                              <input
                                type="text"
                                value={newCode}
                                onChange={(e) => setNewCode(e.target.value)}
                                placeholder="000"
                                className="input-neu font-mono text-xs"
                                style={{ width: "70px" }}
                                autoFocus
                              />
                            </div>
                            <div className="flex-1">
                              <label
                                className="mb-0.5 block text-[10px] font-semibold uppercase"
                                style={{ color: "#94a3b8" }}
                              >
                                Title
                              </label>
                              <input
                                type="text"
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                placeholder="Description"
                                className="input-neu w-full text-xs"
                                onKeyDown={(e) =>
                                  e.key === "Enter" && handleAddSubmit(type)
                                }
                              />
                            </div>
                            <button
                              onClick={() => handleAddSubmit(type)}
                              disabled={!newCode.trim()}
                              className="cursor-pointer rounded px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                              style={{ background: "#1d2a5d" }}
                            >
                              Add
                            </button>
                            <button
                              onClick={() => {
                                setAddingTo(null)
                                setNewCode("")
                                setNewTitle("")
                              }}
                              className="cursor-pointer px-2 py-2 text-xs font-medium"
                              style={{ color: "#64748b" }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setAddingTo(type)}
                            className="mt-2 flex cursor-pointer items-center gap-1.5 text-xs font-medium transition-colors"
                            style={{ color: "#4356a9" }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.color = "#1d2a5d")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.color = "#4356a9")
                            }
                          >
                            <Plus size={12} />
                            Add {SEGMENT_LABELS[type]} Code
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              }
            )}
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button onClick={handleSave} disabled={saving} className="btn-save">
              <Save size={14} />
              <span>{saving ? "Saving…" : "Save Segments"}</span>
            </button>
            {saved && (
              <span
                className="text-sm font-medium"
                style={{ color: "#4356a9" }}
              >
                Saved!
              </span>
            )}
          </div>
        </>
      )}
    </Section>
  )
}

// ─── Staff Sync (Google Sheet) ──────────────────────────────────────────────

function StaffSyncSection() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [sheetId, setSheetId] = useState("")
  const [sheetRange, setSheetRange] = useState("Sheet1!A2:H")
  const [syncEnabled, setSyncEnabled] = useState(false)
  const [syncHour, setSyncHour] = useState(2)
  const [expanded, setExpanded] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getAppSettings().then((s) => {
      setSettings(s)
      setSheetId(s.staffSheetId ?? "")
      setSheetRange(s.staffSheetRange ?? "Sheet1!A2:H")
      setSyncEnabled(s.staffSyncEnabled ?? false)
      setSyncHour(s.staffSyncHour ?? 2)
    })
  }, [])

  async function handleSave() {
    setSaving(true)
    await updateAppSettings({
      staffSheetId: sheetId,
      staffSheetRange: sheetRange,
      staffSyncEnabled: syncEnabled,
      staffSyncHour: syncHour,
    })
    setSaving(false)
  }

  async function handleSync() {
    if (!sheetId.trim()) return
    setSyncing(true)
    setSyncResult(null)
    try {
      // Save config first so the Cloud Function has it
      await updateAppSettings({
        staffSheetId: sheetId,
        staffSheetRange: sheetRange,
      })
      const syncStaffNow = httpsCallable<
        unknown,
        { rowCount: number; imported: number }
      >(functions, "syncStaffNow")
      const result = await syncStaffNow()
      setSyncResult(
        `Synced ${result.data.imported} staff records from ${result.data.rowCount} rows.`
      )
      // Refresh settings to get updated lastStaffSync
      const updated = await getAppSettings()
      setSettings(updated)
    } catch (err) {
      setSyncResult(
        `Sync failed: ${err instanceof Error ? err.message : "Unknown error"}`
      )
    }
    setSyncing(false)
  }

  const lastSync = settings?.lastStaffSync
    ? new Date(
        (settings.lastStaffSync as unknown as { seconds: number }).seconds *
          1000
      ).toLocaleString()
    : null

  const formatHour = (h: number) => {
    const ampm = h >= 12 ? "PM" : "AM"
    const hr = h === 0 ? 12 : h > 12 ? h - 12 : h
    return `${hr}:00 ${ampm}`
  }

  return (
    <Section
      title="Staff Sync"
      icon={RefreshCw}
      expanded={expanded}
      onToggle={() => setExpanded(!expanded)}
    >
      <p className="mb-3 text-xs" style={{ color: "#64748b" }}>
        Connect a Google Sheet (from OneSync) to sync staff data. Share the
        sheet with{" "}
        <span style={{ fontFamily: "monospace", color: "#1d2a5d" }}>
          firebase-adminsdk-fbsvc@paperpal-orono.iam.gserviceaccount.com
        </span>{" "}
        as a Viewer.
      </p>

      <div className="space-y-3">
        <Field label="Google Sheet ID">
          <input
            type="text"
            value={sheetId}
            onChange={(e) => setSheetId(e.target.value)}
            placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
            className="input-neu w-full"
          />
          <p className="mt-1 text-xs" style={{ color: "#94a3b8" }}>
            Found in the Google Sheet URL between /d/ and /edit
          </p>
        </Field>

        <Field label="Sheet Range">
          <input
            type="text"
            value={sheetRange}
            onChange={(e) => setSheetRange(e.target.value)}
            placeholder="Sheet1!A2:H"
            className="input-neu w-full"
          />
        </Field>

        {/* Nightly sync schedule */}
        <div
          className="rounded-lg p-3"
          style={{
            background: "#f8f9fb",
            border: "1px solid rgba(180,185,195,0.25)",
          }}
        >
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={syncEnabled}
              onChange={(e) => setSyncEnabled(e.target.checked)}
              className="accent-[#1d2a5d]"
            />
            <span className="text-sm font-medium" style={{ color: "#334155" }}>
              Enable nightly auto-sync
            </span>
          </label>

          {syncEnabled && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs" style={{ color: "#64748b" }}>
                Sync at
              </span>
              <select
                value={syncHour}
                onChange={(e) => setSyncHour(Number(e.target.value))}
                className="input-neu text-xs"
                style={{ width: 120 }}
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {formatHour(i)}
                  </option>
                ))}
              </select>
              <span className="text-xs" style={{ color: "#64748b" }}>
                Central Time
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-save flex items-center gap-2"
          >
            <Save size={14} />
            {saving ? "Saving…" : "Save Config"}
          </button>

          <button
            onClick={handleSync}
            disabled={syncing || !sheetId.trim()}
            className="flex cursor-pointer items-center gap-2 rounded px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            style={{
              background: "linear-gradient(135deg, #1d2a5d 0%, #2d3f89 100%)",
            }}
          >
            <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Syncing…" : "Sync Now"}
          </button>
        </div>

        {syncResult && (
          <p
            className="text-xs font-medium"
            style={{
              color: syncResult.startsWith("Sync failed")
                ? "#dc2626"
                : "#059669",
            }}
          >
            {syncResult}
          </p>
        )}

        {lastSync && (
          <p className="text-xs" style={{ color: "#94a3b8" }}>
            Last synced: {lastSync}
          </p>
        )}
      </div>
    </Section>
  )
}

// ─── Workflow Mapping ───────────────────────────────────────────────────────

type WorkflowRow =
  | {
      kind: "building"
      mapping: BuildingSupervisorMapping
      staffCount: number
      sortKey: string
    }
  | {
      kind: "title"
      mapping: SupervisorMapping
      staffCount: number
      sortKey: string
    }

function getRowId(row: WorkflowRow): string {
  return row.kind === "building"
    ? `building:${row.mapping.building}`
    : `title:${row.mapping.supervisorEmail}`
}

function rowMatchesSearch(row: WorkflowRow, q: string): boolean {
  const trimmed = q.trim().toLowerCase()
  if (!trimmed) return true
  const m = row.mapping
  if (m.supervisorEmail.toLowerCase().includes(trimmed)) return true
  if (m.supervisorName.toLowerCase().includes(trimmed)) return true
  if (m.approverEmail?.toLowerCase().includes(trimmed)) return true
  if (m.approverName?.toLowerCase().includes(trimmed)) return true
  if (row.kind === "building") {
    if (row.mapping.building.toLowerCase().includes(trimmed)) return true
    if (row.mapping.buildingName.toLowerCase().includes(trimmed)) return true
  } else {
    if (row.mapping.titles.some((t) => t.toLowerCase().includes(trimmed)))
      return true
  }
  return false
}

function buildTitleMapping(
  supervisor: UserProfile,
  approver: UserProfile | null | undefined,
  titles: string[]
): SupervisorMapping {
  const result: SupervisorMapping = {
    titles: [...titles],
    supervisorEmail: supervisor.email,
    supervisorName:
      supervisor.fullName ||
      `${supervisor.firstName} ${supervisor.lastName}`.trim(),
  }
  if (approver) {
    result.approverEmail = approver.email
    result.approverName =
      approver.fullName ||
      `${approver.firstName} ${approver.lastName}`.trim()
  }
  return result
}

function buildBuildingMapping(
  supervisor: UserProfile,
  approver: UserProfile | null | undefined,
  buildingInitials: string,
  buildingName: string
): BuildingSupervisorMapping {
  const result: BuildingSupervisorMapping = {
    building: buildingInitials,
    buildingName,
    supervisorEmail: supervisor.email,
    supervisorName:
      supervisor.fullName ||
      `${supervisor.firstName} ${supervisor.lastName}`.trim(),
  }
  if (approver) {
    result.approverEmail = approver.email
    result.approverName =
      approver.fullName ||
      `${approver.firstName} ${approver.lastName}`.trim()
  }
  return result
}

function WorkflowMappingSection() {
  const [mappings, setMappings] = useState<SupervisorMapping[]>([])
  const [buildingMappings, setBuildingMappings] = useState<
    BuildingSupervisorMapping[]
  >([])
  const [titles, setTitles] = useState<string[]>([])
  const [staffRecords, setStaffRecords] = useState<StaffRecord[]>([])
  const [buildings, setBuildings] = useState<Building[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])
  const [finalApproverName, setFinalApproverName] = useState("")
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showUncovered, setShowUncovered] = useState(false)
  const [addMode, setAddMode] = useState<"building" | "title" | null>(null)

  // Draft state shared by add and inline-edit forms
  const [draftSupervisor, setDraftSupervisor] = useState("")
  const [draftApprover, setDraftApprover] = useState("")
  const [draftTitles, setDraftTitles] = useState<string[]>([])
  const [draftBuilding, setDraftBuilding] = useState("")

  useEffect(() => {
    Promise.all([
      getSupervisorMappings(),
      getBuildingSupervisorMappings(),
      getUniqueStaffTitles(),
      getAllUsers(),
      getBuildings(),
      getStaffRecords(),
      getAppSettings(),
    ]).then(([m, bm, t, u, b, s, settings]) => {
      setMappings(m)
      setBuildingMappings(bm)
      setTitles(t)
      setUsers(u)
      setBuildings(b)
      setStaffRecords(s)
      setFinalApproverName(
        settings.finalApproverName || settings.finalApproverEmail || ""
      )
      setLoading(false)
    })
  }, [])

  const titlesWithOverride = new Set(mappings.flatMap((m) => m.titles))
  const buildingsWithMapping = new Set(
    buildingMappings.map((bm) => bm.building)
  )

  const uncoveredBuildings = buildings.filter(
    (b) => !buildingsWithMapping.has(b.initials)
  )
  const uncoveredTitles = titles.filter((t) => !titlesWithOverride.has(t))

  const allUsersSorted = [...users].sort((a, b) =>
    (a.fullName || a.lastName).localeCompare(b.fullName || b.lastName)
  )

  // Build unified row list: buildings first, then titles; sorted alphabetically within group
  const rows: WorkflowRow[] = [
    ...buildingMappings.map((bm) => ({
      kind: "building" as const,
      mapping: bm,
      staffCount: staffRecords.filter(
        (s) =>
          (s.building === bm.building || s.building === bm.buildingName) &&
          !titlesWithOverride.has(s.title)
      ).length,
      sortKey: bm.buildingName.toLowerCase(),
    })),
    ...mappings.map((m) => ({
      kind: "title" as const,
      mapping: m,
      staffCount: staffRecords.filter((s) => m.titles.includes(s.title)).length,
      sortKey: m.supervisorName.toLowerCase(),
    })),
  ].sort((a, b) => a.sortKey.localeCompare(b.sortKey))

  const buildingRows = rows.filter(
    (r): r is Extract<WorkflowRow, { kind: "building" }> =>
      r.kind === "building" && rowMatchesSearch(r, search)
  )
  const titleRows = rows.filter(
    (r): r is Extract<WorkflowRow, { kind: "title" }> =>
      r.kind === "title" && rowMatchesSearch(r, search)
  )

  // Titles available for a given row's title-picker.
  // For an existing row, includes its own titles (so they remain checkable) plus any unmapped titles.
  // For an empty currentTitles list (add flow), returns all unmapped titles.
  function availableTitlesForRow(currentTitles: string[]): string[] {
    const currentSet = new Set(currentTitles)
    const otherMapped = new Set(
      mappings.flatMap((m) => m.titles).filter((t) => !currentSet.has(t))
    )
    return titles.filter((t) => !otherMapped.has(t))
  }

  async function ensureRole(
    email: string,
    targetRole: "supervisor" | "approver"
  ) {
    const u = users.find(
      (usr) => usr.email.toLowerCase() === email.toLowerCase()
    )
    if (!u || u.role !== "staff") return
    await updateUserRole(u.uid, targetRole)
    setUsers((prev) =>
      prev.map((usr) =>
        usr.uid === u.uid ? { ...usr, role: targetRole } : usr
      )
    )
  }

  async function handleCreateUser(email: string) {
    const staff = staffRecords.find(
      (s) => s.email.toLowerCase() === email.toLowerCase()
    )
    const uid = `pre-${email.toLowerCase().replace(/[^a-z0-9]/g, "-")}`
    const profile: Partial<UserProfile> = {
      uid,
      email: email.toLowerCase(),
      firstName: staff?.firstName ?? "",
      lastName: staff?.lastName ?? "",
      fullName: staff ? `${staff.firstName} ${staff.lastName}`.trim() : email,
      employeeId: staff?.employeeId ?? "",
      building: staff?.building ?? "",
      role: "staff" as UserRole,
    }
    await createOrUpdateUserProfile(uid, profile)
    setUsers((prev) => [...prev, profile as UserProfile])
  }

  function resetDraft() {
    setDraftSupervisor("")
    setDraftApprover("")
    setDraftTitles([])
    setDraftBuilding("")
  }

  function startEdit(row: WorkflowRow) {
    setEditingId(getRowId(row))
    setAddMode(null)
    setDraftSupervisor(row.mapping.supervisorEmail)
    setDraftApprover(row.mapping.approverEmail || "")
    if (row.kind === "title") {
      setDraftTitles([...row.mapping.titles])
      setDraftBuilding("")
    } else {
      setDraftTitles([])
      setDraftBuilding(row.mapping.building)
    }
  }

  function cancelEdit() {
    setEditingId(null)
    resetDraft()
  }

  async function saveEdit(row: WorkflowRow) {
    if (!draftSupervisor) return
    const supervisor = users.find((u) => u.email === draftSupervisor)
    if (!supervisor) return
    const approver = draftApprover
      ? users.find((u) => u.email === draftApprover)
      : null

    setSaving(true)
    if (row.kind === "title") {
      if (draftTitles.length === 0) {
        setSaving(false)
        return
      }
      const oldEmail = row.mapping.supervisorEmail
      const newEmail = supervisor.email
      const oldIndex = mappings.findIndex(
        (m) => m.supervisorEmail === oldEmail
      )
      const withoutOld = mappings.filter((m) => m.supervisorEmail !== oldEmail)
      const existingTarget = withoutOld.find(
        (m) => m.supervisorEmail === newEmail
      )
      let updated: SupervisorMapping[]
      if (existingTarget) {
        // Merge into existing mapping for the new supervisor
        updated = withoutOld.map((m) =>
          m.supervisorEmail === newEmail
            ? buildTitleMapping(supervisor, approver, [
                ...m.titles,
                ...draftTitles.filter((t) => !m.titles.includes(t)),
              ])
            : m
        )
      } else {
        const newRow = buildTitleMapping(supervisor, approver, draftTitles)
        updated = [
          ...withoutOld.slice(0, oldIndex),
          newRow,
          ...withoutOld.slice(oldIndex),
        ]
      }
      setMappings(updated)
      await updateSupervisorMappings(updated)
    } else {
      const updated = buildingMappings.map((bm) =>
        bm.building === row.mapping.building
          ? buildBuildingMapping(
              supervisor,
              approver,
              bm.building,
              bm.buildingName
            )
          : bm
      )
      setBuildingMappings(updated)
      await updateBuildingSupervisorMappings(updated)
    }
    await ensureRole(supervisor.email, "supervisor")
    if (approver) await ensureRole(approver.email, "approver")
    setSaving(false)
    setEditingId(null)
    resetDraft()
  }

  async function deleteRow(row: WorkflowRow) {
    setSaving(true)
    if (row.kind === "title") {
      const updated = mappings.filter(
        (m) => m.supervisorEmail !== row.mapping.supervisorEmail
      )
      setMappings(updated)
      await updateSupervisorMappings(updated)
    } else {
      const updated = buildingMappings.filter(
        (bm) => bm.building !== row.mapping.building
      )
      setBuildingMappings(updated)
      await updateBuildingSupervisorMappings(updated)
    }
    setSaving(false)
  }

  async function handleAdd() {
    if (!draftSupervisor) return
    const supervisor = users.find((u) => u.email === draftSupervisor)
    if (!supervisor) return
    const approver = draftApprover
      ? users.find((u) => u.email === draftApprover)
      : null

    setSaving(true)
    if (addMode === "title") {
      if (draftTitles.length === 0) {
        setSaving(false)
        return
      }
      const existing = mappings.find(
        (m) => m.supervisorEmail === supervisor.email
      )
      let updated: SupervisorMapping[]
      if (existing) {
        updated = mappings.map((m) =>
          m.supervisorEmail === supervisor.email
            ? buildTitleMapping(supervisor, approver, [
                ...m.titles,
                ...draftTitles.filter((t) => !m.titles.includes(t)),
              ])
            : m
        )
      } else {
        updated = [
          ...mappings,
          buildTitleMapping(supervisor, approver, draftTitles),
        ]
      }
      setMappings(updated)
      await updateSupervisorMappings(updated)
    } else if (addMode === "building") {
      if (!draftBuilding) {
        setSaving(false)
        return
      }
      const building = buildings.find((b) => b.id === draftBuilding)
      if (!building) {
        setSaving(false)
        return
      }
      const updated = [
        ...buildingMappings,
        buildBuildingMapping(
          supervisor,
          approver,
          building.initials,
          building.name
        ),
      ]
      setBuildingMappings(updated)
      await updateBuildingSupervisorMappings(updated)
    }
    await ensureRole(supervisor.email, "supervisor")
    if (approver) await ensureRole(approver.email, "approver")
    setSaving(false)
    setAddMode(null)
    resetDraft()
  }

  function startAddBuildingFor(buildingInitials: string) {
    setEditingId(null)
    resetDraft()
    setAddMode("building")
    const b = buildings.find((x) => x.initials === buildingInitials)
    setDraftBuilding(b?.id || "")
  }

  function startAddTitleFor(title: string) {
    setEditingId(null)
    resetDraft()
    setAddMode("title")
    setDraftTitles([title])
  }

  function toggleAdd(mode: "building" | "title") {
    if (addMode === mode) {
      setAddMode(null)
      resetDraft()
    } else {
      setEditingId(null)
      resetDraft()
      setAddMode(mode)
    }
  }

  const totalMappings = buildingMappings.length + mappings.length
  const totalUncovered =
    uncoveredBuildings.length +
    uncoveredTitles.filter(
      (t) => staffRecords.filter((s) => s.title === t).length > 0
    ).length

  return (
    <Section
      title="Workflow Mapping"
      icon={Link2}
      expanded={expanded}
      onToggle={() => setExpanded(!expanded)}
    >
      {loading ? (
        <p className="text-sm" style={{ color: "#64748b" }}>
          Loading…
        </p>
      ) : (
        <>
          <p className="mb-3 text-xs" style={{ color: "#64748b" }}>
            {staffRecords.length} staff routed via {totalMappings} mapping
            {totalMappings === 1 ? "" : "s"}
            {totalUncovered > 0 ? ` · ${totalUncovered} uncovered` : ""}. Title
            overrides take precedence over building defaults.
          </p>

          {/* Search */}
          <div className="relative mb-4">
            <Search
              size={13}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
              style={{ color: "#94a3b8" }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by supervisor, approver, building, or title…"
              className="input-neu w-full pl-8 text-xs"
            />
          </div>

          {/* Building Defaults group */}
          <MappingGroup
            kind="building"
            icon={Building2}
            label="Building Defaults"
            addLabel="Add Building Default"
            mappingCount={buildingMappings.length}
            isAdding={addMode === "building"}
            onToggleAdd={() => toggleAdd("building")}
            search={search}
            rows={buildingRows}
            emptyText="No building defaults yet."
            emptyTextSearch="No building defaults match your search."
            renderAddForm={() => (
              <>
                <div className="mb-3">
                  <p
                    className="mb-1 text-xs font-semibold tracking-wider uppercase"
                    style={{ color: "#64748b" }}
                  >
                    Building
                  </p>
                  <select
                    value={draftBuilding}
                    onChange={(e) => setDraftBuilding(e.target.value)}
                    className="input-neu w-full text-xs"
                  >
                    <option value="">Select building…</option>
                    {buildings
                      .filter(
                        (b) =>
                          !buildingMappings.some(
                            (bm) => bm.building === b.initials
                          )
                      )
                      .map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.initials})
                        </option>
                      ))}
                  </select>
                </div>
                <SupervisorApproverFields
                  draftSupervisor={draftSupervisor}
                  draftApprover={draftApprover}
                  onSupervisorChange={setDraftSupervisor}
                  onApproverChange={setDraftApprover}
                  allUsersSorted={allUsersSorted}
                  staffRecords={staffRecords}
                  handleCreateUser={handleCreateUser}
                />
                <button
                  onClick={handleAdd}
                  disabled={saving || !draftSupervisor || !draftBuilding}
                  className="flex cursor-pointer items-center gap-1.5 rounded px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                  style={{
                    background:
                      "linear-gradient(135deg, #1d2a5d 0%, #2d3f89 100%)",
                  }}
                >
                  <Plus size={13} />
                  Add Building Default
                </button>
              </>
            )}
            renderRow={(row) => (
              <WorkflowRowCard
                key={getRowId(row)}
                row={row}
                editing={editingId === getRowId(row)}
                saving={saving}
                finalApproverName={finalApproverName}
                onStartEdit={() => startEdit(row)}
                onCancelEdit={cancelEdit}
                onSaveEdit={() => saveEdit(row)}
                onDelete={() => deleteRow(row)}
                draftSupervisor={draftSupervisor}
                draftApprover={draftApprover}
                draftTitles={draftTitles}
                onSupervisorChange={setDraftSupervisor}
                onApproverChange={setDraftApprover}
                onTitlesChange={setDraftTitles}
                allUsersSorted={allUsersSorted}
                staffRecords={staffRecords}
                availableTitles={[]}
                handleCreateUser={handleCreateUser}
              />
            )}
          />

          <div className="my-4 h-px" style={{ background: "rgba(180,185,195,0.25)" }} />

          {/* Title Overrides group */}
          <MappingGroup
            kind="title"
            icon={Tag}
            label="Title Overrides"
            addLabel="Add Title Override"
            mappingCount={mappings.length}
            isAdding={addMode === "title"}
            onToggleAdd={() => toggleAdd("title")}
            search={search}
            rows={titleRows}
            emptyText="No title overrides. Staff use their building's default."
            emptyTextSearch="No title overrides match your search."
            renderAddForm={() => (
              <>
                <div className="mb-3">
                  <p
                    className="mb-1 text-xs font-semibold tracking-wider uppercase"
                    style={{ color: "#64748b" }}
                  >
                    Titles
                  </p>
                  <TitlePicker
                    available={availableTitlesForRow(draftTitles)}
                    selected={draftTitles}
                    onChange={setDraftTitles}
                    staffRecords={staffRecords}
                  />
                </div>
                <SupervisorApproverFields
                  draftSupervisor={draftSupervisor}
                  draftApprover={draftApprover}
                  onSupervisorChange={setDraftSupervisor}
                  onApproverChange={setDraftApprover}
                  allUsersSorted={allUsersSorted}
                  staffRecords={staffRecords}
                  handleCreateUser={handleCreateUser}
                />
                <button
                  onClick={handleAdd}
                  disabled={
                    saving || !draftSupervisor || draftTitles.length === 0
                  }
                  className="flex cursor-pointer items-center gap-1.5 rounded px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                  style={{
                    background:
                      "linear-gradient(135deg, #1d2a5d 0%, #2d3f89 100%)",
                  }}
                >
                  <Plus size={13} />
                  Add Title Override
                </button>
              </>
            )}
            renderRow={(row) => (
              <WorkflowRowCard
                key={getRowId(row)}
                row={row}
                editing={editingId === getRowId(row)}
                saving={saving}
                finalApproverName={finalApproverName}
                onStartEdit={() => startEdit(row)}
                onCancelEdit={cancelEdit}
                onSaveEdit={() => saveEdit(row)}
                onDelete={() => deleteRow(row)}
                draftSupervisor={draftSupervisor}
                draftApprover={draftApprover}
                draftTitles={draftTitles}
                onSupervisorChange={setDraftSupervisor}
                onApproverChange={setDraftApprover}
                onTitlesChange={setDraftTitles}
                allUsersSorted={allUsersSorted}
                staffRecords={staffRecords}
                availableTitles={
                  row.kind === "title"
                    ? availableTitlesForRow(row.mapping.titles)
                    : []
                }
                handleCreateUser={handleCreateUser}
              />
            )}
          />

          {/* Uncovered banner (combined) */}
          {(uncoveredBuildings.length > 0 || uncoveredTitles.length > 0) && (
            <div className="mt-4">
              <button
                onClick={() => setShowUncovered(!showUncovered)}
                className="flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold transition-colors"
                style={{
                  background: "#fffbeb",
                  border: "1px solid rgba(234,179,8,0.25)",
                  color: "#b45309",
                }}
              >
                <span className="flex items-center gap-2">
                  <span
                    className="inline-flex h-1.5 w-1.5 rounded-full"
                    style={{ background: "#b45309" }}
                  />
                  {uncoveredBuildings.length} building
                  {uncoveredBuildings.length === 1 ? "" : "s"} +{" "}
                  {uncoveredTitles.length} title
                  {uncoveredTitles.length === 1 ? "" : "s"} uncovered
                </span>
                <ChevronDown
                  size={14}
                  style={{
                    transform: showUncovered
                      ? "rotate(180deg)"
                      : "rotate(0deg)",
                    transition: "transform 0.2s ease",
                  }}
                />
              </button>
              {showUncovered && (
                <div
                  className="mt-2 space-y-1 rounded-lg p-2"
                  style={{
                    background: "#fffbeb",
                    border: "1px solid rgba(234,179,8,0.25)",
                  }}
                >
                  {uncoveredBuildings.map((b) => {
                    const count = staffRecords.filter(
                      (s) =>
                        (s.building === b.initials || s.building === b.name) &&
                        !titlesWithOverride.has(s.title)
                    ).length
                    return (
                      <button
                        key={b.id}
                        onClick={() => startAddBuildingFor(b.initials)}
                        className="flex w-full cursor-pointer items-center justify-between rounded px-2 py-1.5 text-left transition-colors hover:bg-white/60"
                      >
                        <span className="flex items-center gap-2 text-xs">
                          <Building2 size={12} style={{ color: "#b45309" }} />
                          <span
                            className="font-medium"
                            style={{ color: "#1d2a5d" }}
                          >
                            {b.name}
                          </span>
                          <span style={{ color: "#94a3b8" }}>
                            ({count} staff)
                          </span>
                        </span>
                        <span
                          className="flex items-center gap-1 text-[10px] font-semibold"
                          style={{ color: "#b45309" }}
                        >
                          <Plus size={10} />
                          Add
                        </span>
                      </button>
                    )
                  })}
                  {uncoveredTitles.map((t) => {
                    const count = staffRecords.filter(
                      (s) => s.title === t
                    ).length
                    if (count === 0) return null
                    return (
                      <button
                        key={t}
                        onClick={() => startAddTitleFor(t)}
                        className="flex w-full cursor-pointer items-center justify-between rounded px-2 py-1.5 text-left transition-colors hover:bg-white/60"
                      >
                        <span className="flex items-center gap-2 text-xs">
                          <Tag size={12} style={{ color: "#b45309" }} />
                          <span
                            className="font-medium"
                            style={{ color: "#1d2a5d" }}
                          >
                            {t}
                          </span>
                          <span style={{ color: "#94a3b8" }}>
                            ({count} staff)
                          </span>
                        </span>
                        <span
                          className="flex items-center gap-1 text-[10px] font-semibold"
                          style={{ color: "#b45309" }}
                        >
                          <Plus size={10} />
                          Add
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </Section>
  )
}

function MappingGroup<R extends WorkflowRow>({
  icon: Icon,
  label,
  addLabel,
  mappingCount,
  isAdding,
  onToggleAdd,
  search,
  rows,
  emptyText,
  emptyTextSearch,
  renderAddForm,
  renderRow,
}: {
  kind: "building" | "title"
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>
  label: string
  addLabel: string
  mappingCount: number
  isAdding: boolean
  onToggleAdd: () => void
  search: string
  rows: R[]
  emptyText: string
  emptyTextSearch: string
  renderAddForm: () => React.ReactNode
  renderRow: (row: R) => React.ReactNode
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Icon size={13} style={{ color: "#1d2a5d" }} />
          <p
            className="text-xs font-semibold tracking-wider uppercase"
            style={{ color: "#1d2a5d" }}
          >
            {label}
          </p>
          <span className="text-[11px]" style={{ color: "#94a3b8" }}>
            · {mappingCount} mapping{mappingCount === 1 ? "" : "s"}
          </span>
        </div>
        <button
          onClick={onToggleAdd}
          className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
          style={
            isAdding
              ? {
                  color: "#64748b",
                  background: "transparent",
                  border: "1px solid rgba(180,185,195,0.4)",
                }
              : {
                  color: "#ffffff",
                  background:
                    "linear-gradient(135deg, #1d2a5d 0%, #2d3f89 100%)",
                  border: "1px solid transparent",
                  boxShadow: "0 2px 8px rgba(29,42,93,0.25)",
                }
          }
        >
          {isAdding ? <X size={12} /> : <Plus size={12} />}
          {isAdding ? "Cancel" : addLabel}
        </button>
      </div>

      {isAdding && (
        <div
          className="mb-2 rounded-lg p-3"
          style={{
            background: "#f8f9fb",
            border: "1px solid rgba(29,42,93,0.25)",
          }}
        >
          {renderAddForm()}
        </div>
      )}

      {rows.length === 0 ? (
        <p
          className="rounded-lg py-3 text-center text-xs"
          style={{
            color: "#94a3b8",
            background: "#f8f9fb",
            border: "1px solid rgba(180,185,195,0.25)",
          }}
        >
          {search ? emptyTextSearch : emptyText}
        </p>
      ) : (
        <div className="space-y-2">{rows.map(renderRow)}</div>
      )}
    </div>
  )
}

function SupervisorApproverFields({
  draftSupervisor,
  draftApprover,
  onSupervisorChange,
  onApproverChange,
  allUsersSorted,
  staffRecords,
  handleCreateUser,
}: {
  draftSupervisor: string
  draftApprover: string
  onSupervisorChange: (v: string) => void
  onApproverChange: (v: string) => void
  allUsersSorted: UserProfile[]
  staffRecords: StaffRecord[]
  handleCreateUser: (email: string) => Promise<void>
}) {
  return (
    <>
      <div className="mb-3">
        <p
          className="mb-1 text-xs font-semibold tracking-wider uppercase"
          style={{ color: "#64748b" }}
        >
          Supervisor
        </p>
        <UserSearchDropdown
          users={allUsersSorted}
          staffRecords={staffRecords}
          value={draftSupervisor}
          onChange={onSupervisorChange}
          onCreateUser={handleCreateUser}
          placeholder="Search for supervisor…"
        />
      </div>
      <div className="mb-3">
        <div className="mb-1 flex items-center justify-between">
          <p
            className="text-xs font-semibold tracking-wider uppercase"
            style={{ color: "#64748b" }}
          >
            Approver{" "}
            <span className="font-normal normal-case">(optional)</span>
          </p>
          {draftApprover && (
            <button
              onClick={() => onApproverChange("")}
              className="cursor-pointer text-[10px] font-semibold"
              style={{ color: "#ad2122" }}
            >
              Remove
            </button>
          )}
        </div>
        <UserSearchDropdown
          users={allUsersSorted}
          staffRecords={staffRecords}
          value={draftApprover}
          onChange={onApproverChange}
          onCreateUser={handleCreateUser}
          placeholder="Search for approver (optional)…"
        />
        <p className="mt-1 text-[10px]" style={{ color: "#94a3b8" }}>
          If set, submissions route to this person before the supervisor.
        </p>
      </div>
    </>
  )
}

function TitlePicker({
  available,
  selected,
  onChange,
  staffRecords,
}: {
  available: string[]
  selected: string[]
  onChange: (titles: string[]) => void
  staffRecords: StaffRecord[]
}) {
  return (
    <>
      <div
        className="max-h-40 overflow-y-auto rounded-lg p-2"
        style={{
          background: "#ffffff",
          border: "1px solid rgba(180,185,195,0.25)",
        }}
      >
        {available.length === 0 ? (
          <p
            className="py-2 text-center text-xs"
            style={{ color: "#94a3b8" }}
          >
            All titles have mappings assigned.
          </p>
        ) : (
          [...available].sort().map((title) => {
            const count = staffRecords.filter((s) => s.title === title).length
            const checked = selected.includes(title)
            return (
              <label
                key={title}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 transition-colors hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() =>
                    onChange(
                      checked
                        ? selected.filter((t) => t !== title)
                        : [...selected, title]
                    )
                  }
                  className="accent-[#1d2a5d]"
                />
                <span className="flex-1 text-xs" style={{ color: "#334155" }}>
                  {title}
                </span>
                <span className="text-[10px]" style={{ color: "#94a3b8" }}>
                  {count} staff
                </span>
              </label>
            )
          })
        )}
      </div>
      {selected.length > 0 && (
        <p className="mt-1 text-xs" style={{ color: "#1d2a5d" }}>
          {selected.length} title{selected.length !== 1 && "s"} selected
        </p>
      )}
    </>
  )
}

function RoutingChain({
  approverName,
  supervisorName,
  finalApproverName,
}: {
  approverName?: string
  supervisorName: string
  finalApproverName: string
}) {
  const steps: { label: string; name: string }[] = []
  if (approverName) steps.push({ label: "Approver", name: approverName })
  steps.push({ label: "Supervisor", name: supervisorName })
  if (finalApproverName)
    steps.push({ label: "Final", name: finalApproverName })

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
      {steps.map((step, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <span
            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5"
            style={{
              background: "rgba(255,255,255,0.6)",
              color: "#334155",
              border: "1px solid rgba(180,185,195,0.3)",
            }}
          >
            <span
              className="text-[9px] font-semibold tracking-wider uppercase"
              style={{ color: "#94a3b8" }}
            >
              {step.label}
            </span>
            <span style={{ color: "#1d2a5d" }}>{step.name}</span>
          </span>
          {i < steps.length - 1 && (
            <ArrowRight size={11} style={{ color: "#94a3b8" }} />
          )}
        </span>
      ))}
    </div>
  )
}

function WorkflowRowCard({
  row,
  editing,
  saving,
  finalApproverName,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  draftSupervisor,
  draftApprover,
  draftTitles,
  onSupervisorChange,
  onApproverChange,
  onTitlesChange,
  allUsersSorted,
  staffRecords,
  availableTitles,
  handleCreateUser,
}: {
  row: WorkflowRow
  editing: boolean
  saving: boolean
  finalApproverName: string
  onStartEdit: () => void
  onCancelEdit: () => void
  onSaveEdit: () => void
  onDelete: () => void
  draftSupervisor: string
  draftApprover: string
  draftTitles: string[]
  onSupervisorChange: (v: string) => void
  onApproverChange: (v: string) => void
  onTitlesChange: (v: string[]) => void
  allUsersSorted: UserProfile[]
  staffRecords: StaffRecord[]
  availableTitles: string[]
  handleCreateUser: (email: string) => Promise<void>
}) {
  const TypeIcon = row.kind === "building" ? Building2 : Tag
  const typeLabel = row.kind === "building" ? "Building" : "Title"
  const titleMapping =
    row.kind === "title" ? (row.mapping as SupervisorMapping) : null
  const buildingMapping =
    row.kind === "building"
      ? (row.mapping as BuildingSupervisorMapping)
      : null

  return (
    <div
      className="rounded-lg p-3"
      style={{
        background: editing ? "#ffffff" : "#eef2ff",
        border: editing
          ? "1px solid rgba(29,42,93,0.4)"
          : "1px solid rgba(67,86,169,0.2)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wider uppercase"
              style={{
                background:
                  row.kind === "building"
                    ? "rgba(29,42,93,0.1)"
                    : "rgba(67,86,169,0.12)",
                color: row.kind === "building" ? "#1d2a5d" : "#4356a9",
              }}
            >
              <TypeIcon size={10} />
              {typeLabel}
            </span>
            <span
              className="text-sm font-semibold"
              style={{ color: "#1d2a5d" }}
            >
              {buildingMapping
                ? `${buildingMapping.buildingName} (${buildingMapping.building})`
                : `${titleMapping?.titles.length ?? 0} title${
                    (titleMapping?.titles.length ?? 0) === 1 ? "" : "s"
                  }`}
            </span>
            {row.mapping.approverEmail && (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={{
                  background: "rgba(67,86,169,0.12)",
                  color: "#4356a9",
                }}
              >
                + Approver
              </span>
            )}
            <span className="text-[11px]" style={{ color: "#94a3b8" }}>
              · {row.staffCount} staff
            </span>
          </div>
          {!editing && (
            <RoutingChain
              approverName={row.mapping.approverName}
              supervisorName={row.mapping.supervisorName}
              finalApproverName={finalApproverName}
            />
          )}
          {!editing && titleMapping && titleMapping.titles.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {titleMapping.titles.map((t) => (
                <span
                  key={t}
                  className="inline-block rounded-full px-2 py-0.5 text-[11px] font-medium"
                  style={{
                    background: "rgba(29,42,93,0.08)",
                    color: "#1d2a5d",
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
        {!editing && (
          <div className="flex shrink-0 gap-1">
            <button
              onClick={onStartEdit}
              className="cursor-pointer rounded p-1 transition-colors"
              style={{ color: "#64748b" }}
              title="Edit"
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = "#1d2a5d")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "#64748b")
              }
            >
              <Pencil size={13} />
            </button>
            <button
              onClick={onDelete}
              className="cursor-pointer rounded p-1 transition-colors"
              style={{ color: "#94a3b8" }}
              title="Delete"
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
        )}
      </div>

      {editing && (
        <div
          className="mt-3 rounded-lg p-3"
          style={{
            background: "#f8f9fb",
            border: "1px solid rgba(180,185,195,0.25)",
          }}
        >
          {row.kind === "title" && (
            <div className="mb-3">
              <p
                className="mb-1 text-xs font-semibold tracking-wider uppercase"
                style={{ color: "#64748b" }}
              >
                Titles
              </p>
              <TitlePicker
                available={availableTitles}
                selected={draftTitles}
                onChange={onTitlesChange}
                staffRecords={staffRecords}
              />
            </div>
          )}

          <div className="mb-3">
            <p
              className="mb-1 text-xs font-semibold tracking-wider uppercase"
              style={{ color: "#64748b" }}
            >
              Supervisor
            </p>
            <UserSearchDropdown
              users={allUsersSorted}
              staffRecords={staffRecords}
              value={draftSupervisor}
              onChange={onSupervisorChange}
              onCreateUser={handleCreateUser}
              placeholder="Search for supervisor…"
            />
          </div>

          <div className="mb-3">
            <div className="mb-1 flex items-center justify-between">
              <p
                className="text-xs font-semibold tracking-wider uppercase"
                style={{ color: "#64748b" }}
              >
                Approver{" "}
                <span className="font-normal normal-case">(optional)</span>
              </p>
              {draftApprover && (
                <button
                  onClick={() => onApproverChange("")}
                  className="cursor-pointer text-[10px] font-semibold"
                  style={{ color: "#ad2122" }}
                >
                  Remove
                </button>
              )}
            </div>
            <UserSearchDropdown
              users={allUsersSorted}
              staffRecords={staffRecords}
              value={draftApprover}
              onChange={onApproverChange}
              onCreateUser={handleCreateUser}
              placeholder="Search for approver (optional)…"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={onSaveEdit}
              disabled={
                saving ||
                !draftSupervisor ||
                (row.kind === "title" && draftTitles.length === 0)
              }
              className="flex cursor-pointer items-center gap-1.5 rounded px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
              style={{
                background:
                  "linear-gradient(135deg, #1d2a5d 0%, #2d3f89 100%)",
              }}
            >
              <Check size={13} />
              Save
            </button>
            <button
              onClick={onCancelEdit}
              className="cursor-pointer rounded px-3 py-2 text-xs font-semibold transition-colors"
              style={{
                color: "#64748b",
                background: "transparent",
                border: "1px solid rgba(180,185,195,0.25)",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Staff Directory ─────────────────────────────────────────────────────────

function StaffSection() {
  const [records, setRecords] = useState<StaffRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [search, setSearch] = useState("")
  const [filterBuilding, setFilterBuilding] = useState("")
  const [filterTitle, setFilterTitle] = useState("")

  useEffect(() => {
    getStaffRecords().then((r) => {
      setRecords(r)
      setLoading(false)
    })
  }, [])

  const buildings = [
    ...new Set(records.map((r) => r.building).filter(Boolean)),
  ].sort()
  const titles = [
    ...new Set(records.map((r) => r.title).filter(Boolean)),
  ].sort()

  const filtered = records.filter((r) => {
    const q = search.toLowerCase()
    const matchesSearch =
      !q ||
      `${r.firstName} ${r.lastName}`.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      r.employeeId.includes(q)
    const matchesBuilding = !filterBuilding || r.building === filterBuilding
    const matchesTitle = !filterTitle || r.title === filterTitle
    return matchesSearch && matchesBuilding && matchesTitle
  })

  return (
    <Section
      title="Staff Directory"
      icon={Users}
      expanded={expanded}
      onToggle={() => setExpanded(!expanded)}
    >
      {loading ? (
        <p className="text-sm" style={{ color: "#64748b" }}>
          Loading…
        </p>
      ) : records.length === 0 ? (
        <p className="text-sm" style={{ color: "#64748b" }}>
          No staff records yet. Use Staff Sync to pull data from OneSync.
        </p>
      ) : (
        <>
          <p className="mb-3 text-xs" style={{ color: "#64748b" }}>
            {records.length} staff record{records.length !== 1 && "s"} synced
            from OneSync.
          </p>

          {/* Search + Filters */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or ID…"
              className="input-neu flex-1"
              style={{ minWidth: 200 }}
            />
            <select
              value={filterBuilding}
              onChange={(e) => setFilterBuilding(e.target.value)}
              className="input-neu text-xs"
              style={{ minWidth: 120 }}
            >
              <option value="">All Buildings</option>
              {buildings.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
            <select
              value={filterTitle}
              onChange={(e) => setFilterTitle(e.target.value)}
              className="input-neu text-xs"
              style={{ minWidth: 140 }}
            >
              <option value="">All Titles</option>
              {titles.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {filtered.length === 0 ? (
            <p
              className="py-4 text-center text-xs"
              style={{ color: "#94a3b8" }}
            >
              No records match your search.
            </p>
          ) : (
            <>
              <p className="mb-2 text-xs" style={{ color: "#94a3b8" }}>
                Showing {filtered.length} of {records.length}
              </p>
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr
                      style={{
                        color: "#64748b",
                        borderBottom: "1px solid rgba(180,185,195,0.25)",
                      }}
                    >
                      <th className="pb-2 font-semibold">Name</th>
                      <th className="pb-2 font-semibold">Email</th>
                      <th className="pb-2 font-semibold">ID</th>
                      <th className="pb-2 font-semibold">Title</th>
                      <th className="pb-2 font-semibold">Building</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r) => (
                      <tr
                        key={r.email}
                        style={{
                          borderBottom: "1px solid rgba(180,185,195,0.15)",
                        }}
                      >
                        <td className="py-2" style={{ color: "#1d2a5d" }}>
                          {r.firstName} {r.lastName}
                        </td>
                        <td className="py-2" style={{ color: "#64748b" }}>
                          {r.email}
                        </td>
                        <td className="py-2" style={{ color: "#64748b" }}>
                          {r.employeeId}
                        </td>
                        <td className="py-2" style={{ color: "#64748b" }}>
                          {r.title}
                        </td>
                        <td className="py-2" style={{ color: "#64748b" }}>
                          {r.building}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </Section>
  )
}

// ─── Users & Roles ──────────────────────────────────────────────────────────

function RolesSection() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [staffRecords, setStaffRecords] = useState<StaffRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [addEmail, setAddEmail] = useState("")
  const [addRole, setAddRole] = useState<UserRole>("staff")
  const [adding, setAdding] = useState(false)
  const [search, setSearch] = useState("")

  useEffect(() => {
    Promise.all([getAllUsers(), getStaffRecords()]).then(([u, s]) => {
      setUsers(u)
      setStaffRecords(s)
      setLoading(false)
    })
  }, [])

  // Staff who don't have a user profile yet
  const existingEmails = new Set(users.map((u) => u.email.toLowerCase()))
  const availableStaff = staffRecords.filter(
    (s) => !existingEmails.has(s.email.toLowerCase())
  )

  async function handleRoleChange(uid: string, role: UserRole) {
    await updateUserRole(uid, role)
    setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, role } : u)))
  }

  async function handleAddUser() {
    if (!addEmail) return
    setAdding(true)
    try {
      const staff = staffRecords.find(
        (s) => s.email.toLowerCase() === addEmail.toLowerCase()
      )
      const uid = `pre-${addEmail.toLowerCase().replace(/[^a-z0-9]/g, "-")}`
      const profile: Partial<UserProfile> = {
        uid,
        email: addEmail.toLowerCase(),
        firstName: staff?.firstName ?? "",
        lastName: staff?.lastName ?? "",
        fullName: staff
          ? `${staff.firstName} ${staff.lastName}`.trim()
          : addEmail,
        employeeId: staff?.employeeId ?? "",
        building: staff?.building ?? "",
        role: addRole,
      }
      await createOrUpdateUserProfile(uid, profile)
      const updated = await getAllUsers()
      setUsers(updated)
      setAddEmail("")
      setAddRole("staff")
      setShowAdd(false)
    } catch (err) {
      console.error("Failed to add user:", err)
      alert("Failed to add user. You may not have permission.")
    }
    setAdding(false)
  }

  const filtered = users.filter((u) => {
    const q = search.toLowerCase()
    return (
      !q ||
      u.fullName?.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.building?.toLowerCase().includes(q)
    )
  })

  return (
    <Section
      title="Users & Roles"
      icon={Shield}
      expanded={expanded}
      onToggle={() => setExpanded(!expanded)}
    >
      {loading ? (
        <p className="text-sm" style={{ color: "#64748b" }}>
          Loading…
        </p>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users…"
              className="input-neu flex-1"
              style={{ minWidth: 200 }}
            />
            <button
              onClick={() => setShowAdd(!showAdd)}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors"
              style={{
                color: "#1d2a5d",
                background: showAdd ? "rgba(29,42,93,0.1)" : "transparent",
                border: "1px solid rgba(180,185,195,0.25)",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "rgba(29,42,93,0.08)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = showAdd
                  ? "rgba(29,42,93,0.1)"
                  : "transparent")
              }
            >
              <Plus size={13} />
              Add User
            </button>
          </div>

          {/* Add user form */}
          {showAdd && (
            <div
              className="mb-4 rounded-lg p-3"
              style={{
                background: "#f8f9fb",
                border: "1px solid rgba(180,185,195,0.25)",
              }}
            >
              <p
                className="mb-2 text-xs font-semibold tracking-wider uppercase"
                style={{ color: "#64748b" }}
              >
                Add from Staff Directory
              </p>
              <div className="flex flex-wrap items-end gap-2">
                <StaffSearchDropdown
                  staff={availableStaff}
                  value={addEmail}
                  onChange={setAddEmail}
                />
                <div>
                  <select
                    value={addRole}
                    onChange={(e) => setAddRole(e.target.value as UserRole)}
                    className="input-neu text-xs"
                    style={{ minWidth: 130 }}
                  >
                    {Object.entries(ROLE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleAddUser}
                  disabled={adding || !addEmail}
                  className="flex cursor-pointer items-center gap-1.5 rounded px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                  style={{
                    background:
                      "linear-gradient(135deg, #1d2a5d 0%, #2d3f89 100%)",
                  }}
                >
                  <Plus size={13} />
                  {adding ? "Adding…" : "Add"}
                </button>
              </div>
              {availableStaff.length === 0 && (
                <p className="mt-2 text-xs" style={{ color: "#94a3b8" }}>
                  All staff members already have user accounts.
                </p>
              )}
            </div>
          )}

          <p className="mb-2 text-xs" style={{ color: "#94a3b8" }}>
            {users.length} user{users.length !== 1 && "s"}
          </p>
          <div className="max-h-80 overflow-auto">
            <table
              className="w-full text-left text-xs"
              style={{ minWidth: 500 }}
            >
              <thead>
                <tr
                  style={{
                    color: "#64748b",
                    borderBottom: "1px solid rgba(180,185,195,0.25)",
                  }}
                >
                  <th className="pb-2 font-semibold">Name</th>
                  <th className="pb-2 font-semibold">Email</th>
                  <th className="pb-2 font-semibold">Building</th>
                  <th className="pb-2 font-semibold">Role</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr
                    key={u.uid}
                    style={{
                      borderBottom: "1px solid rgba(180,185,195,0.15)",
                    }}
                  >
                    <td className="py-2" style={{ color: "#1d2a5d" }}>
                      {u.fullName ||
                        `${u.firstName} ${u.lastName}`.trim() ||
                        u.email}
                    </td>
                    <td className="py-2" style={{ color: "#64748b" }}>
                      {u.email}
                    </td>
                    <td className="py-2" style={{ color: "#64748b" }}>
                      {u.building || "—"}
                    </td>
                    <td className="py-2">
                      <select
                        value={u.role}
                        onChange={(e) =>
                          handleRoleChange(u.uid, e.target.value as UserRole)
                        }
                        className="input-neu cursor-pointer text-xs"
                        style={{ minWidth: "130px" }}
                      >
                        {Object.entries(ROLE_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Section>
  )
}

// ─── Email Settings ──────────────────────────────────────────────────────────

function EmailSettingsSection() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    getAppSettings().then((s) => {
      setSettings(s)
      setLoading(false)
    })
  }, [])

  function update<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  async function handleSave() {
    if (!settings) return
    setSaving(true)
    await updateAppSettings(settings)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    setSaving(false)
  }

  return (
    <Section
      title="Email Settings"
      icon={Mail}
      expanded={expanded}
      onToggle={() => setExpanded(!expanded)}
    >
      {loading || !settings ? (
        <p className="text-sm" style={{ color: "#64748b" }}>
          Loading…
        </p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Sender Email">
              <input
                type="email"
                value={settings.senderEmail}
                onChange={(e) => update("senderEmail", e.target.value)}
                placeholder="paperpal@orono.k12.mn.us"
                className="input-neu w-full"
              />
            </Field>
            <Field label="Sender Display Name">
              <input
                type="text"
                value={settings.senderName}
                onChange={(e) => update("senderName", e.target.value)}
                placeholder="PaperPal - Orono Schools"
                className="input-neu w-full"
              />
            </Field>
            <Field label="Reply-To Email">
              <input
                type="email"
                value={settings.replyToEmail}
                onChange={(e) => update("replyToEmail", e.target.value)}
                placeholder="businessoffice@orono.k12.mn.us"
                className="input-neu w-full"
              />
            </Field>
          </div>

          <div className="mt-4">
            <p
              className="mb-2 text-xs font-semibold tracking-wider uppercase"
              style={{ color: "#64748b" }}
            >
              Notification Triggers
            </p>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {(
                [
                  ["notifyOnSubmit", "New submission"],
                  ["notifyOnApproval", "Approved"],
                  ["notifyOnDenial", "Denied"],
                  ["notifyOnRevision", "Revisions requested"],
                ] as const
              ).map(([key, label]) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-center gap-2 text-sm"
                  style={{ color: "#334155" }}
                >
                  <input
                    type="checkbox"
                    checked={settings[key]}
                    onChange={(e) => update(key, e.target.checked)}
                    className="h-4 w-4 cursor-pointer accent-[#1d2a5d]"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button onClick={handleSave} disabled={saving} className="btn-save">
              <Save size={14} />
              <span>{saving ? "Saving…" : "Save Settings"}</span>
            </button>
            {saved && (
              <span
                className="text-sm font-medium"
                style={{ color: "#4356a9" }}
              >
                Saved!
              </span>
            )}
          </div>
        </>
      )}
    </Section>
  )
}

// ─── Drive & PDF Settings ────────────────────────────────────────────────────

function DrivePdfSettingsSection() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [settingUp, setSettingUp] = useState(false)
  const [setupResult, setSetupResult] = useState<string | null>(null)

  useEffect(() => {
    getAppSettings().then((s) => {
      setSettings(s)
      setLoading(false)
    })
  }, [])

  function update<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  async function handleSave() {
    if (!settings) return
    setSaving(true)
    await updateAppSettings({
      paperpalDriveFolderId: settings.paperpalDriveFolderId,
      paperpalLogSheetId: settings.paperpalLogSheetId,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    setSaving(false)
  }

  return (
    <Section
      title="Drive & PDF"
      icon={HardDrive}
      expanded={expanded}
      onToggle={() => setExpanded(!expanded)}
    >
      {loading || !settings ? (
        <p className="text-sm" style={{ color: "#64748b" }}>
          Loading…
        </p>
      ) : (
        <>
          <p className="mb-4 text-xs" style={{ color: "#94a3b8" }}>
            On final approval, PaperPal generates a PDF and uploads it to Google
            Drive. Configure the shared drive folder and log spreadsheet below.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Shared Drive Folder ID">
              <input
                type="text"
                value={settings.paperpalDriveFolderId ?? "0ABSKbjIMiOlKUk9PVA"}
                onChange={(e) =>
                  update("paperpalDriveFolderId", e.target.value)
                }
                placeholder="e.g. 0ABSKbjIMiOlKUk9PVA"
                className="input-neu w-full"
              />
              <p className="mt-1 text-xs" style={{ color: "#94a3b8" }}>
                Shared Drive ID from the Google Drive URL
              </p>
            </Field>
            <Field label="Log Spreadsheet ID">
              <input
                type="text"
                value={settings.paperpalLogSheetId ?? ""}
                onChange={(e) => update("paperpalLogSheetId", e.target.value)}
                placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBZjg"
                className="input-neu w-full"
              />
              <p className="mt-1 text-xs" style={{ color: "#94a3b8" }}>
                Auto-created on first approval. Update each fiscal year if
                needed.
              </p>
            </Field>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button onClick={handleSave} disabled={saving} className="btn-save">
              <Save size={14} />
              <span>{saving ? "Saving…" : "Save"}</span>
            </button>
            <button
              onClick={async () => {
                setSettingUp(true)
                setSetupResult(null)
                try {
                  const setup = httpsCallable<
                    Record<string, never>,
                    {
                      yearLabel: string
                      monthFolders: { name: string; id: string }[]
                      sheetId: string
                    }
                  >(functions, "setupDriveStructure")
                  const res = await setup({})
                  setSetupResult(
                    `Created FY ${res.data.yearLabel}: ${res.data.monthFolders.length} month folders + log sheet`
                  )
                  const fresh = await getAppSettings()
                  if (fresh) setSettings(fresh)
                } catch (err) {
                  setSetupResult(
                    `Error: ${err instanceof Error ? err.message : String(err)}`
                  )
                }
                setSettingUp(false)
              }}
              disabled={settingUp}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              style={{
                background: "linear-gradient(135deg, #1d2a5d 0%, #2d3f89 100%)",
              }}
            >
              <RefreshCw
                size={14}
                className={settingUp ? "animate-spin" : ""}
              />
              {settingUp ? "Setting Up…" : "Setup Drive Structure"}
            </button>
            {saved && (
              <span
                className="text-sm font-medium"
                style={{ color: "#4356a9" }}
              >
                Saved!
              </span>
            )}
          </div>
          {setupResult && (
            <p
              className="mt-2 text-sm"
              style={{
                color: setupResult.startsWith("Error") ? "#ad2122" : "#4356a9",
              }}
            >
              {setupResult}
            </p>
          )}
        </>
      )}
    </Section>
  )
}

// ─── Staff Search Dropdown ───────────────────────────────────────────────────

function StaffSearchDropdown({
  staff,
  value,
  onChange,
}: {
  staff: StaffRecord[]
  value: string
  onChange: (email: string) => void
}) {
  const [query, setQuery] = useState("")
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

  const selected = staff.find(
    (s) => s.email.toLowerCase() === value.toLowerCase()
  )

  const q = query.toLowerCase().trim()
  const filtered =
    q.length >= 1
      ? staff
          .filter(
            (s) =>
              s.email.toLowerCase().includes(q) ||
              `${s.firstName} ${s.lastName}`.toLowerCase().includes(q)
          )
          .sort((a, b) =>
            `${a.lastName} ${a.firstName}`.localeCompare(
              `${b.lastName} ${b.firstName}`
            )
          )
          .slice(0, 12)
      : staff
          .sort((a, b) =>
            `${a.lastName} ${a.firstName}`.localeCompare(
              `${b.lastName} ${b.firstName}`
            )
          )
          .slice(0, 12)

  return (
    <div
      ref={containerRef}
      className="relative flex-1"
      style={{ minWidth: 200 }}
    >
      {selected && !open ? (
        <button
          type="button"
          onClick={() => {
            setOpen(true)
            setQuery("")
          }}
          className="input-neu flex w-full cursor-pointer items-center justify-between text-left text-xs"
        >
          <span style={{ color: "#1d2a5d" }}>
            {selected.firstName} {selected.lastName}{" "}
            <span style={{ color: "#94a3b8" }}>— {selected.email}</span>
          </span>
          <span
            className="ml-2 text-[10px]"
            style={{ color: "#94a3b8" }}
            onClick={(e) => {
              e.stopPropagation()
              onChange("")
              setQuery("")
            }}
          >
            ✕
          </span>
        </button>
      ) : (
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search staff by name or email…"
          className="input-neu w-full text-xs"
          autoFocus={open}
        />
      )}
      {open && (
        <div
          className="absolute z-50 mt-1 max-h-52 w-full overflow-y-auto rounded-lg py-1"
          style={{
            background: "#ffffff",
            boxShadow:
              "0 4px 20px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.08)",
            border: "1px solid #e2e5ea",
          }}
        >
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-xs" style={{ color: "#94a3b8" }}>
              No matches found.
            </p>
          ) : (
            filtered.map((s) => (
              <button
                key={s.email}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  onChange(s.email)
                  setQuery("")
                  setOpen(false)
                }}
                className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-gray-50"
              >
                <div className="min-w-0 flex-1">
                  <p
                    className="truncate text-xs font-medium"
                    style={{ color: "#1d2a5d" }}
                  >
                    {s.firstName} {s.lastName}
                  </p>
                  <p
                    className="truncate text-[11px]"
                    style={{ color: "#64748b" }}
                  >
                    {s.email}
                  </p>
                </div>
                {s.title && (
                  <span
                    className="shrink-0 text-[10px]"
                    style={{ color: "#94a3b8" }}
                  >
                    {s.title}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

function UserSearchDropdown({
  users: userList,
  staffRecords: staffList,
  value,
  onChange,
  onCreateUser,
  placeholder = "Search by name or email…",
}: {
  users: UserProfile[]
  staffRecords?: StaffRecord[]
  value: string
  onChange: (email: string) => void
  onCreateUser?: (email: string) => Promise<void>
  placeholder?: string
}) {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)
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

  const selected = userList.find(
    (u) => u.email.toLowerCase() === value.toLowerCase()
  )

  const q = query.toLowerCase().trim()
  const filtered = (
    q.length >= 1
      ? userList.filter(
          (u) =>
            u.email.toLowerCase().includes(q) ||
            (u.fullName || `${u.firstName} ${u.lastName}`)
              .toLowerCase()
              .includes(q)
        )
      : userList
  )
    .sort((a, b) =>
      (a.fullName || a.lastName).localeCompare(b.fullName || b.lastName)
    )
    .slice(0, 12)

  // Staff records not yet in the users list
  const userEmails = new Set(userList.map((u) => u.email.toLowerCase()))
  const staffMatches =
    staffList && q.length >= 2
      ? staffList
          .filter(
            (s) =>
              !userEmails.has(s.email.toLowerCase()) &&
              (s.email.toLowerCase().includes(q) ||
                `${s.firstName} ${s.lastName}`.toLowerCase().includes(q))
          )
          .slice(0, 6)
      : []

  const ROLE_BADGE: Record<string, string> = {
    staff: "#94a3b8",
    approver: "#4356a9",
    supervisor: "#2d3f89",
    business_office: "#1d2a5d",
    controller: "#1d2a5d",
    admin: "#ad2122",
  }

  return (
    <div ref={containerRef} className="relative" style={{ minWidth: 200 }}>
      {selected && !open ? (
        <button
          type="button"
          onClick={() => {
            setOpen(true)
            setQuery("")
          }}
          className="input-neu flex w-full cursor-pointer items-center justify-between text-left text-xs"
        >
          <span style={{ color: "#1d2a5d" }}>
            {selected.fullName || `${selected.firstName} ${selected.lastName}`}{" "}
            <span style={{ color: "#94a3b8" }}>— {selected.email}</span>
          </span>
          <span
            className="ml-2 text-[10px]"
            style={{ color: "#94a3b8" }}
            onClick={(e) => {
              e.stopPropagation()
              onChange("")
              setQuery("")
            }}
          >
            ✕
          </span>
        </button>
      ) : (
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="input-neu w-full text-xs"
          autoFocus={open}
        />
      )}
      {open && (
        <div
          className="absolute z-50 mt-1 max-h-52 w-full overflow-y-auto rounded-lg py-1"
          style={{
            background: "#ffffff",
            boxShadow:
              "0 4px 20px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.08)",
            border: "1px solid #e2e5ea",
          }}
        >
          {filtered.map((u) => (
            <button
              key={u.email}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                onChange(u.email)
                setQuery("")
                setOpen(false)
              }}
              className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-gray-50"
            >
              <div className="min-w-0 flex-1">
                <p
                  className="truncate text-xs font-medium"
                  style={{ color: "#1d2a5d" }}
                >
                  {u.fullName || `${u.firstName} ${u.lastName}`}
                </p>
                <p
                  className="truncate text-[11px]"
                  style={{ color: "#64748b" }}
                >
                  {u.email}
                </p>
              </div>
              <span
                className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={{
                  color: ROLE_BADGE[u.role] ?? "#94a3b8",
                  background: `${ROLE_BADGE[u.role] ?? "#94a3b8"}18`,
                }}
              >
                {u.role}
              </span>
            </button>
          ))}
          {staffMatches.length > 0 && onCreateUser && (
            <>
              {filtered.length > 0 && (
                <div
                  className="mx-3 my-1"
                  style={{ borderTop: "1px solid #e2e5ea" }}
                />
              )}
              <p
                className="px-3 pt-1 pb-0.5 text-[10px] font-semibold tracking-wider uppercase"
                style={{ color: "#94a3b8" }}
              >
                From Staff Directory
              </p>
              {staffMatches.map((s) => (
                <button
                  key={s.email}
                  type="button"
                  disabled={adding}
                  onMouseDown={async (e) => {
                    e.preventDefault()
                    setAdding(true)
                    await onCreateUser(s.email)
                    onChange(s.email)
                    setQuery("")
                    setOpen(false)
                    setAdding(false)
                  }}
                  className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-gray-50"
                >
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate text-xs font-medium"
                      style={{ color: "#1d2a5d" }}
                    >
                      {s.firstName} {s.lastName}
                    </p>
                    <p
                      className="truncate text-[11px]"
                      style={{ color: "#64748b" }}
                    >
                      {s.email}
                    </p>
                  </div>
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{
                      color: "#059669",
                      background: "rgba(5,150,105,0.1)",
                    }}
                  >
                    + Add
                  </span>
                </button>
              ))}
            </>
          )}
          {filtered.length === 0 && staffMatches.length === 0 && (
            <p className="px-3 py-2 text-xs" style={{ color: "#94a3b8" }}>
              No matches found.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Shared Sub-components ───────────────────────────────────────────────────

function Section({
  title,
  icon: Icon,
  expanded,
  onToggle,
  children,
}: {
  title: string
  icon: React.ComponentType<{ size?: number }>
  expanded: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div
      className="rounded-xl"
      style={{
        background: "#ffffff",
        boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06)",
      }}
    >
      <button
        onClick={onToggle}
        className="flex w-full cursor-pointer items-center justify-between p-4 sm:p-5"
      >
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ background: "rgba(29,42,93,0.08)" }}
          >
            <Icon size={14} />
          </div>
          <h2
            className="text-sm font-semibold tracking-widest uppercase"
            style={{ color: "#1d2a5d" }}
          >
            {title}
          </h2>
        </div>
        <ChevronDown
          size={18}
          style={{
            color: "#64748b",
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
          }}
        />
      </button>
      {expanded && (
        <div
          className="px-4 pb-4 sm:px-5 sm:pb-5"
          style={{ borderTop: "1px solid rgba(180,185,195,0.2)" }}
        >
          <div className="pt-4">{children}</div>
        </div>
      )}
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
