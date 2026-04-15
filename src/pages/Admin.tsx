import { useState, useEffect } from "react"
import {
  Plus,
  Trash2,
  Upload,
  Save,
  Building2,
  Users,
  Mail,
  Shield,
  Settings,
  ChevronDown,
  ChevronUp,
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
  importStaffRecords,
  deleteStaffRecord,
  getAllUsers,
  updateUserRole,
  getAppSettings,
  updateAppSettings,
} from "@/lib/firestore"
import type {
  Building,
  StaffRecord,
  UserProfile,
  UserRole,
  AppSettings,
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
              After a supervisor approves, the submission goes to this person for
              final sign-off before it reaches the business office.
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
          ? { ...b, address: editAddress.trim(), approverEmail: editEmail.trim(), approverName: editName.trim() }
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
                (e.currentTarget.style.backgroundColor =
                  "rgba(67,86,169,0.06)")
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

// ─── Staff Import ────────────────────────────────────────────────────────────

function StaffSection() {
  const [records, setRecords] = useState<StaffRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [importing, setImporting] = useState(false)
  const [pasteData, setPasteData] = useState("")

  useEffect(() => {
    getStaffRecords().then((r) => {
      setRecords(r)
      setLoading(false)
    })
  }, [])

  async function handleImport() {
    const lines = pasteData
      .trim()
      .split("\n")
      .filter((l) => l.trim())
    const parsed = lines.map((line) => {
      const parts = line.split("\t").map((s) => s.trim())
      return {
        firstName: parts[0] ?? "",
        lastName: parts[1] ?? "",
        email: parts[2] ?? "",
        employeeId: parts[3] ?? "",
        building: parts[4] ?? "",
      }
    }).filter((r) => r.email)

    if (parsed.length === 0) return
    setImporting(true)
    await importStaffRecords(parsed)
    const updated = await getStaffRecords()
    setRecords(updated)
    setPasteData("")
    setImporting(false)
  }

  async function handleDelete(email: string) {
    await deleteStaffRecord(email)
    setRecords((prev) => prev.filter((r) => r.email !== email))
  }

  return (
    <Section
      title="Staff Data"
      icon={Users}
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
            {records.length} staff record{records.length !== 1 && "s"} imported.
            Paste tab-separated data below to import (columns: First Name, Last
            Name, Email, Employee ID, Building).
          </p>

          <textarea
            value={pasteData}
            onChange={(e) => setPasteData(e.target.value)}
            placeholder={"Jane\tSmith\tjane.smith@orono.k12.mn.us\t12345\tOrono Middle School"}
            rows={4}
            className="input-neu mb-3 w-full"
            style={{ resize: "vertical", fontFamily: "monospace", fontSize: "0.75rem" }}
          />
          <button
            onClick={handleImport}
            disabled={importing || !pasteData.trim()}
            className="flex cursor-pointer items-center gap-2 rounded px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            style={{
              background:
                "linear-gradient(135deg, #1d2a5d 0%, #2d3f89 100%)",
            }}
          >
            <Upload size={14} />
            {importing ? "Importing…" : "Import Staff Data"}
          </button>

          {records.length > 0 && (
            <div className="mt-4 max-h-64 overflow-y-auto">
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
                    <th className="pb-2 font-semibold">Building</th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
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
                        {r.building}
                      </td>
                      <td className="py-2">
                        <button
                          onClick={() => handleDelete(r.email)}
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
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </Section>
  )
}

// ─── Role Management ─────────────────────────────────────────────────────────

function RolesSection() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    getAllUsers().then((u) => {
      setUsers(u)
      setLoading(false)
    })
  }, [])

  async function handleRoleChange(uid: string, role: UserRole) {
    await updateUserRole(uid, role)
    setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, role } : u)))
  }

  return (
    <Section
      title="User Roles"
      icon={Shield}
      expanded={expanded}
      onToggle={() => setExpanded(!expanded)}
    >
      {loading ? (
        <p className="text-sm" style={{ color: "#64748b" }}>
          Loading…
        </p>
      ) : (
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
              {users.map((u) => (
                <tr
                  key={u.uid}
                  style={{
                    borderBottom: "1px solid rgba(180,185,195,0.15)",
                  }}
                >
                  <td className="py-2" style={{ color: "#1d2a5d" }}>
                    {u.fullName}
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
