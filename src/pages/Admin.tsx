import { useState, useEffect } from "react"
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
} from "lucide-react"
import AppLayout from "@/components/layout/AppLayout"
import AddressAutocomplete from "@/components/forms/AddressAutocomplete"
import { useAuth } from "@/hooks/useAuth"
import {
  getBuildings,
  createBuilding,
  updateBuilding,
  deleteBuilding,
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
  getUniqueStaffTitles,
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
} from "@/lib/types"

const ROLE_LABELS: Record<UserRole, string> = {
  staff: "Staff",
  supervisor: "Supervisor",
  business_office: "Business Office",
  admin: "Admin",
}

export default function Admin() {
  const { userProfile } = useAuth()

  if (
    !userProfile ||
    (userProfile.role !== "admin" && userProfile.role !== "business_office")
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
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: "#ffffff" }}>
          Admin Panel
        </h1>
        <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
          Manage buildings, staff data, user roles, and email settings.
        </p>
      </div>

      <div className="space-y-6">
        <GeneralSettingsSection />
        <BudgetSegmentsSection />
        <StaffSyncSection />
        <SupervisorMappingsSection />
        <BuildingsSection />
        <StaffSection />
        <RolesSection />
        <EmailSettingsSection />
      </div>
    </AppLayout>
  )
}

// ─── General Settings ────────────────────────────────────────────────────────

function GeneralSettingsSection() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(true)
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
                <input
                  type="email"
                  value={settings.finalApproverEmail}
                  onChange={(e) => update("finalApproverEmail", e.target.value)}
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

// ─── Buildings ───────────────────────────────────────────────────────────────

function BuildingsSection() {
  const [buildings, setBuildings] = useState<Building[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState("")
  const [newAddress, setNewAddress] = useState("")
  const [newApproverEmail, setNewApproverEmail] = useState("")
  const [newApproverName, setNewApproverName] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editAddress, setEditAddress] = useState("")
  const [editEmail, setEditEmail] = useState("")
  const [editName, setEditName] = useState("")

  useEffect(() => {
    getBuildings().then((b) => {
      setBuildings(b)
      setLoading(false)
    })
  }, [])

  async function handleAdd() {
    if (!newName.trim()) return
    const id = await createBuilding({
      name: newName.trim(),
      address: newAddress.trim(),
      approverEmail: newApproverEmail.trim(),
      approverName: newApproverName.trim(),
    })
    setBuildings((prev) => [
      ...prev,
      {
        id,
        name: newName.trim(),
        address: newAddress.trim(),
        approverEmail: newApproverEmail.trim(),
        approverName: newApproverName.trim(),
      } as Building,
    ])
    setNewName("")
    setNewAddress("")
    setNewApproverEmail("")
    setNewApproverName("")
    setAdding(false)
  }

  async function handleDelete(id: string) {
    await deleteBuilding(id)
    setBuildings((prev) => prev.filter((b) => b.id !== id))
  }

  function startEdit(b: Building) {
    setEditingId(b.id)
    setEditAddress(b.address ?? "")
    setEditEmail(b.approverEmail)
    setEditName(b.approverName)
  }

  async function saveEdit(id: string) {
    await updateBuilding(id, {
      address: editAddress.trim(),
      approverEmail: editEmail.trim(),
      approverName: editName.trim(),
    })
    setBuildings((prev) =>
      prev.map((b) =>
        b.id === id
          ? {
              ...b,
              address: editAddress.trim(),
              approverEmail: editEmail.trim(),
              approverName: editName.trim(),
            }
          : b
      )
    )
    setEditingId(null)
  }

  return (
    <Section
      title="Buildings / Organizations"
      icon={Building2}
      expanded={expanded}
      onToggle={() => setExpanded(!expanded)}
    >
      {loading ? (
        <p className="text-sm" style={{ color: "#64748b" }}>
          Loading…
        </p>
      ) : (
        <>
          <div
            className="divide-y"
            style={{ borderColor: "rgba(180,185,195,0.25)" }}
          >
            {buildings.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0 flex-1">
                  <p
                    className="text-sm font-semibold"
                    style={{ color: "#1d2a5d" }}
                  >
                    {b.name}
                  </p>
                  {editingId === b.id ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <div style={{ maxWidth: "280px", flex: "1 1 280px" }}>
                        <AddressAutocomplete
                          value={editAddress}
                          onChange={setEditAddress}
                          placeholder="Building address"
                        />
                      </div>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Approver name"
                        className="input-neu text-xs"
                        style={{ maxWidth: "180px" }}
                      />
                      <input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        placeholder="Approver email"
                        className="input-neu text-xs"
                        style={{ maxWidth: "220px" }}
                      />
                      <button
                        onClick={() => saveEdit(b.id)}
                        className="cursor-pointer rounded px-3 py-1.5 text-xs font-semibold text-white"
                        style={{
                          background:
                            "linear-gradient(135deg, #1d2a5d 0%, #2d3f89 100%)",
                        }}
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="cursor-pointer rounded px-3 py-1.5 text-xs font-medium"
                        style={{ color: "#64748b" }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      {b.address && (
                        <p className="text-xs" style={{ color: "#94a3b8" }}>
                          {b.address}
                        </p>
                      )}
                      <p className="text-xs" style={{ color: "#64748b" }}>
                        {b.approverName
                          ? `${b.approverName} (${b.approverEmail})`
                          : b.approverEmail || "No approver set"}
                      </p>
                    </>
                  )}
                </div>
                <div className="flex gap-1">
                  {editingId !== b.id && (
                    <button
                      onClick={() => startEdit(b)}
                      className="cursor-pointer rounded p-1.5 text-xs font-medium transition-colors"
                      style={{ color: "#4356a9" }}
                    >
                      Edit
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(b.id)}
                    className="cursor-pointer rounded p-1.5 transition-colors"
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
              </div>
            ))}
          </div>

          {adding ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label
                  className="mb-1 block text-xs font-semibold tracking-wider uppercase"
                  style={{ color: "#64748b" }}
                >
                  Building Name
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Orono Middle School"
                  className="input-neu w-full"
                />
              </div>
              <div>
                <label
                  className="mb-1 block text-xs font-semibold tracking-wider uppercase"
                  style={{ color: "#64748b" }}
                >
                  Address
                </label>
                <AddressAutocomplete
                  value={newAddress}
                  onChange={setNewAddress}
                  placeholder="Building street address"
                />
              </div>
              <div>
                <label
                  className="mb-1 block text-xs font-semibold tracking-wider uppercase"
                  style={{ color: "#64748b" }}
                >
                  Approver Name
                </label>
                <input
                  type="text"
                  value={newApproverName}
                  onChange={(e) => setNewApproverName(e.target.value)}
                  placeholder="Jane Smith"
                  className="input-neu w-full"
                />
              </div>
              <div>
                <label
                  className="mb-1 block text-xs font-semibold tracking-wider uppercase"
                  style={{ color: "#64748b" }}
                >
                  Approver Email
                </label>
                <input
                  type="email"
                  value={newApproverEmail}
                  onChange={(e) => setNewApproverEmail(e.target.value)}
                  placeholder="approver@orono.k12.mn.us"
                  className="input-neu w-full"
                />
              </div>
              <div className="flex items-end gap-2 sm:col-span-2">
                <button
                  onClick={handleAdd}
                  className="cursor-pointer rounded px-4 py-2 text-sm font-semibold text-white"
                  style={{
                    background:
                      "linear-gradient(135deg, #1d2a5d 0%, #2d3f89 100%)",
                  }}
                >
                  Add Building
                </button>
                <button
                  onClick={() => setAdding(false)}
                  className="cursor-pointer rounded px-4 py-2 text-sm font-medium"
                  style={{ color: "#64748b" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="mt-3 flex cursor-pointer items-center gap-2 rounded px-4 py-2 text-sm font-medium transition-all duration-200"
              style={{ color: "#4356a9" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "rgba(67,86,169,0.06)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "transparent")
              }
            >
              <Plus size={15} />
              Add Building
            </button>
          )}
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

// ─── Supervisor Mappings ────────────────────────────────────────────────────

function SupervisorMappingsSection() {
  const [mappings, setMappings] = useState<SupervisorMapping[]>([])
  const [titles, setTitles] = useState<string[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    Promise.all([
      getSupervisorMappings(),
      getUniqueStaffTitles(),
      getAllUsers(),
    ]).then(([m, t, u]) => {
      setMappings(m)
      setTitles(t)
      setUsers(u)
      setLoading(false)
    })
  }, [])

  // Titles that aren't assigned to any mapping yet
  const unmappedTitles = titles.filter(
    (t) => !mappings.some((m) => m.titles.includes(t))
  )

  function handleAssignTitle(title: string, supervisorEmail: string) {
    const supervisor = users.find((u) => u.email === supervisorEmail)
    if (!supervisor) return

    setMappings((prev) => {
      const existing = prev.find((m) => m.supervisorEmail === supervisorEmail)
      if (existing) {
        return prev.map((m) =>
          m.supervisorEmail === supervisorEmail
            ? { ...m, titles: [...m.titles, title] }
            : m
        )
      }
      return [
        ...prev,
        {
          titles: [title],
          supervisorEmail: supervisor.email,
          supervisorName:
            supervisor.fullName ||
            `${supervisor.firstName} ${supervisor.lastName}`,
        },
      ]
    })
  }

  function handleRemoveTitle(title: string, supervisorEmail: string) {
    setMappings((prev) =>
      prev
        .map((m) =>
          m.supervisorEmail === supervisorEmail
            ? { ...m, titles: m.titles.filter((t) => t !== title) }
            : m
        )
        .filter((m) => m.titles.length > 0)
    )
  }

  async function handleSave() {
    setSaving(true)
    await updateSupervisorMappings(mappings)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <Section
      title="Supervisor Mappings"
      icon={Link2}
      expanded={expanded}
      onToggle={() => setExpanded(!expanded)}
    >
      {loading ? (
        <p className="text-sm" style={{ color: "#64748b" }}>
          Loading…
        </p>
      ) : titles.length === 0 ? (
        <p className="text-sm" style={{ color: "#64748b" }}>
          No staff titles found. Sync staff data first to see titles here.
        </p>
      ) : (
        <>
          <p className="mb-4 text-xs" style={{ color: "#64748b" }}>
            Assign a supervisor to each job title. When staff submit forms,
            their title determines who approves it.
          </p>

          {/* Current mappings */}
          {mappings.length > 0 && (
            <div className="mb-4 space-y-3">
              {mappings.map((mapping) => (
                <div
                  key={mapping.supervisorEmail}
                  className="rounded-lg p-3"
                  style={{
                    background: "#f8f9fb",
                    border: "1px solid rgba(180,185,195,0.25)",
                  }}
                >
                  <p
                    className="mb-2 text-xs font-semibold tracking-wider uppercase"
                    style={{ color: "#1d2a5d" }}
                  >
                    {mapping.supervisorName}
                    <span
                      className="ml-2 font-normal tracking-normal normal-case"
                      style={{ color: "#94a3b8" }}
                    >
                      {mapping.supervisorEmail}
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {mapping.titles.map((title) => (
                      <span
                        key={title}
                        className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
                        style={{ background: "#e8ecf4", color: "#1d2a5d" }}
                      >
                        {title}
                        <button
                          onClick={() =>
                            handleRemoveTitle(title, mapping.supervisorEmail)
                          }
                          className="ml-0.5 cursor-pointer rounded-full p-0.5 transition-colors hover:bg-red-100"
                          style={{ color: "#94a3b8" }}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Unmapped titles */}
          {unmappedTitles.length > 0 && (
            <div className="mb-4">
              <p
                className="mb-2 text-xs font-semibold tracking-wider uppercase"
                style={{ color: "#64748b" }}
              >
                Unassigned Titles ({unmappedTitles.length})
              </p>
              <div className="space-y-2">
                {unmappedTitles.map((title) => (
                  <div
                    key={title}
                    className="flex items-center gap-3 rounded-lg p-2.5"
                    style={{
                      background: "#fffbeb",
                      border: "1px solid rgba(234,179,8,0.25)",
                    }}
                  >
                    <span
                      className="flex-1 text-sm"
                      style={{ color: "#334155" }}
                    >
                      {title}
                    </span>
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value)
                          handleAssignTitle(title, e.target.value)
                        e.target.value = ""
                      }}
                      className="input-neu text-xs"
                      style={{ minWidth: 180 }}
                    >
                      <option value="">Assign supervisor…</option>
                      {users
                        .filter(
                          (u) =>
                            u.role === "supervisor" ||
                            u.role === "admin" ||
                            u.role === "business_office"
                        )
                        .sort((a, b) =>
                          (a.fullName || a.lastName).localeCompare(
                            b.fullName || b.lastName
                          )
                        )
                        .map((u) => (
                          <option key={u.uid} value={u.email}>
                            {u.fullName || `${u.firstName} ${u.lastName}`}
                          </option>
                        ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-save flex items-center gap-2"
          >
            <Save size={14} />
            {saving ? "Saving…" : saved ? "Saved!" : "Save Mappings"}
          </button>
        </>
      )}
    </Section>
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
                <div className="flex-1" style={{ minWidth: 200 }}>
                  <select
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    className="input-neu w-full text-xs"
                  >
                    <option value="">Select staff member…</option>
                    {availableStaff
                      .sort((a, b) =>
                        `${a.lastName} ${a.firstName}`.localeCompare(
                          `${b.lastName} ${b.firstName}`
                        )
                      )
                      .map((s) => (
                        <option key={s.email} value={s.email}>
                          {s.firstName} {s.lastName} — {s.email}
                        </option>
                      ))}
                  </select>
                </div>
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
      className="rounded-xl p-5"
      style={{
        background: "#ffffff",
        boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06)",
      }}
    >
      <button
        onClick={onToggle}
        className="flex w-full cursor-pointer items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Icon size={16} />
          <h2
            className="text-sm font-semibold tracking-widest uppercase"
            style={{ color: "#425275" }}
          >
            {title}
          </h2>
        </div>
        {expanded ? (
          <ChevronUp size={16} style={{ color: "#64748b" }} />
        ) : (
          <ChevronDown size={16} style={{ color: "#64748b" }} />
        )}
      </button>
      {expanded && <div className="mt-4">{children}</div>}
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
