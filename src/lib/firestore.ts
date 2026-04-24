import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore"
import { db } from "./firebase"
import type {
  Submission,
  UserProfile,
  Building,
  StaffRecord,
  AppSettings,
  BudgetSegmentType,
  BudgetSegment,
  SupervisorMapping,
  BuildingSupervisorMapping,
  FormFieldConfig,
  FormType,
} from "./types"

// ─── ID Generator ─────────────────────────────────────────────────────────────

function generateReqId(): string {
  const num = Math.floor(10000 + Math.random() * 90000)
  return `REQ-${num}`
}

// ─── Submissions ──────────────────────────────────────────────────────────────

export async function createSubmission(
  data: Omit<Submission, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const id = generateReqId()
  const ref = doc(db, "submissions", id)
  await setDoc(ref, {
    ...data,
    id,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return id
}

export async function getSubmission(id: string): Promise<Submission | null> {
  const ref = doc(db, "submissions", id)
  const snap = await getDoc(ref)
  return snap.exists() ? (snap.data() as Submission) : null
}

export async function updateSubmission(
  id: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updates: Record<string, any>
): Promise<void> {
  const ref = doc(db, "submissions", id)
  await updateDoc(ref, { ...updates, updatedAt: serverTimestamp() })
}

export async function batchHideSubmissions(ids: string[]): Promise<void> {
  const batch = writeBatch(db)
  for (const id of ids) {
    batch.update(doc(db, "submissions", id), {
      hiddenBySubmitter: true,
      updatedAt: serverTimestamp(),
    })
  }
  await batch.commit()
}

export async function getUserSubmissions(uid: string): Promise<Submission[]> {
  const q = query(
    collection(db, "submissions"),
    where("submitterUid", "==", uid),
    orderBy("createdAt", "desc")
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => d.data() as Submission)
}

export async function getPendingApprovals(
  supervisorEmail: string
): Promise<Submission[]> {
  const [pendingSnap, approverApprovedSnap] = await Promise.all([
    getDocs(
      query(
        collection(db, "submissions"),
        where("supervisorEmail", "==", supervisorEmail),
        where("status", "==", "pending"),
        orderBy("createdAt", "desc")
      )
    ),
    getDocs(
      query(
        collection(db, "submissions"),
        where("supervisorEmail", "==", supervisorEmail),
        where("status", "==", "approved_by_approver"),
        orderBy("createdAt", "desc")
      )
    ),
  ])
  return [
    ...pendingSnap.docs.map((d) => d.data() as Submission),
    ...approverApprovedSnap.docs.map((d) => d.data() as Submission),
  ]
}

export async function getPendingApproverApprovals(
  approverEmail: string
): Promise<Submission[]> {
  const q = query(
    collection(db, "submissions"),
    where("approverEmail", "==", approverEmail),
    where("status", "==", "pending"),
    orderBy("createdAt", "desc")
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => d.data() as Submission)
}

const COMPLETED_STATUSES = ["approved", "paid", "denied", "cancelled"]

export async function getCompletedApprovals(
  supervisorEmail: string
): Promise<Submission[]> {
  const q = query(
    collection(db, "submissions"),
    where("supervisorEmail", "==", supervisorEmail),
    where("status", "in", COMPLETED_STATUSES),
    orderBy("createdAt", "desc")
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => d.data() as Submission)
}

export async function getCompletedApproverApprovals(
  approverEmail: string
): Promise<Submission[]> {
  const q = query(
    collection(db, "submissions"),
    where("approverEmail", "==", approverEmail),
    where("status", "in", COMPLETED_STATUSES),
    orderBy("createdAt", "desc")
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => d.data() as Submission)
}

export async function getApprovedSubmissions(): Promise<Submission[]> {
  const q = query(
    collection(db, "submissions"),
    where("status", "==", "approved"),
    orderBy("createdAt", "desc")
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => d.data() as Submission)
}

export async function getReviewedSubmissions(): Promise<Submission[]> {
  const q = query(
    collection(db, "submissions"),
    where("status", "==", "reviewed"),
    orderBy("createdAt", "desc")
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => d.data() as Submission)
}

// ─── User Profiles ────────────────────────────────────────────────────────────

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const ref = doc(db, "users", uid)
  const snap = await getDoc(ref)
  return snap.exists() ? (snap.data() as UserProfile) : null
}

export async function createOrUpdateUserProfile(
  uid: string,
  data: Partial<UserProfile>
): Promise<void> {
  const ref = doc(db, "users", uid)
  await setDoc(ref, { ...data, updatedAt: serverTimestamp() }, { merge: true })
}

export async function getAllUsers(): Promise<UserProfile[]> {
  const snap = await getDocs(collection(db, "users"))
  return snap.docs.map((d) => d.data() as UserProfile)
}

export async function updateUserRole(
  uid: string,
  role: UserProfile["role"]
): Promise<void> {
  const ref = doc(db, "users", uid)
  await updateDoc(ref, { role, updatedAt: serverTimestamp() })
}

// ─── Buildings ───────────────────────────────────────────────────────────────

export async function getBuildings(): Promise<Building[]> {
  const q = query(collection(db, "buildings"), orderBy("name"))
  const snap = await getDocs(q)
  return snap.docs.map((d) => d.data() as Building)
}

export async function createBuilding(
  data: Omit<Building, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const ref = doc(collection(db, "buildings"))
  await setDoc(ref, {
    ...data,
    id: ref.id,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateBuilding(
  id: string,
  data: Partial<Building>
): Promise<void> {
  const ref = doc(db, "buildings", id)
  await updateDoc(ref, { ...data, updatedAt: serverTimestamp() })
}

export async function deleteBuilding(id: string): Promise<void> {
  await deleteDoc(doc(db, "buildings", id))
}

export async function getBuildingByName(
  name: string
): Promise<Building | null> {
  const q = query(collection(db, "buildings"), where("name", "==", name))
  const snap = await getDocs(q)
  return snap.empty ? null : (snap.docs[0].data() as Building)
}

const DEFAULT_BUILDINGS: { initials: string; name: string }[] = [
  { initials: "MS", name: "Orono Middle School" },
  { initials: "SE", name: "Orono Schumann Elementary" },
  { initials: "HS", name: "Orono High School" },
  { initials: "IS", name: "Orono Intermediate School" },
  { initials: "CE", name: "Community Ed" },
  { initials: "DO", name: "District Office" },
  { initials: "DC", name: "Discovery Center" },
  { initials: "AC", name: "Orono Activities Center" },
  { initials: "SUB", name: "Substitutes" },
]

export async function seedBuildingsFromInitials(): Promise<number> {
  const existing = await getBuildings()
  const existingInitials = new Set(existing.map((b) => b.initials))
  let created = 0
  for (const bld of DEFAULT_BUILDINGS) {
    if (existingInitials.has(bld.initials)) continue
    await createBuilding({
      name: bld.name,
      initials: bld.initials,
      approverEmail: "",
      approverName: "",
    })
    created++
  }
  return created
}

// ─── Staff Records ───────────────────────────────────────────────────────────

export async function getStaffRecords(): Promise<StaffRecord[]> {
  const snap = await getDocs(collection(db, "staff"))
  return snap.docs.map((d) => d.data() as StaffRecord)
}

export async function importStaffRecords(
  records: Omit<StaffRecord, "createdAt" | "updatedAt">[]
): Promise<number> {
  const batch = writeBatch(db)
  for (const record of records) {
    const ref = doc(db, "staff", record.email.toLowerCase())
    batch.set(
      ref,
      { ...record, createdAt: serverTimestamp(), updatedAt: serverTimestamp() },
      { merge: true }
    )
  }
  await batch.commit()
  return records.length
}

export async function deleteStaffRecord(email: string): Promise<void> {
  await deleteDoc(doc(db, "staff", email.toLowerCase()))
}

export async function clearAllStaffRecords(): Promise<number> {
  const snap = await getDocs(collection(db, "staff"))
  const batch = writeBatch(db)
  snap.docs.forEach((d) => batch.delete(d.ref))
  await batch.commit()
  return snap.size
}

// ─── App Settings ────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: AppSettings = {
  senderEmail: "",
  senderName: "PaperPal - Orono Schools",
  replyToEmail: "",
  notifyOnSubmit: true,
  notifyOnApproval: true,
  notifyOnDenial: true,
  notifyOnRevision: true,
  schoolAddressLabel: "",
  schoolAddress: "",
  finalApproverEmail: "",
  finalApproverName: "",
  fiscalYearStartMonth: 6, // July
}

export async function getAppSettings(): Promise<AppSettings> {
  const ref = doc(db, "settings", "app")
  const snap = await getDoc(ref)
  return snap.exists()
    ? { ...DEFAULT_SETTINGS, ...(snap.data() as Partial<AppSettings>) }
    : DEFAULT_SETTINGS
}

export async function updateAppSettings(
  data: Partial<AppSettings>
): Promise<void> {
  const ref = doc(db, "settings", "app")
  await setDoc(ref, data, { merge: true })
}

// ─── Budget Segments ────────────────────────────────────────────────────────

export async function getBudgetSegments(): Promise<
  Record<BudgetSegmentType, BudgetSegment[]>
> {
  const ref = doc(db, "settings", "budgetSegments")
  const snap = await getDoc(ref)
  const defaults: Record<BudgetSegmentType, BudgetSegment[]> = {
    fund: [],
    org: [],
    proj: [],
    fin: [],
    course: [],
    obj: [],
  }
  if (snap.exists()) {
    const data = {
      ...defaults,
      ...(snap.data() as Record<BudgetSegmentType, BudgetSegment[]>),
    }
    // Seed defaults if any category is empty
    const hasEmpty = Object.values(data).some((arr) => arr.length === 0)
    if (hasEmpty) {
      import("./defaultBudgetSegments").then(({ DEFAULT_SEGMENTS }) => {
        const merged = { ...data }
        for (const key of Object.keys(
          DEFAULT_SEGMENTS
        ) as BudgetSegmentType[]) {
          if (merged[key].length === 0) merged[key] = DEFAULT_SEGMENTS[key]
        }
        updateBudgetSegments(merged)
      })
    }
    return data
  }
  // First load — seed with all default segments
  import("./defaultBudgetSegments").then(({ DEFAULT_SEGMENTS }) => {
    updateBudgetSegments(DEFAULT_SEGMENTS)
  })
  return defaults
}

export async function updateBudgetSegments(
  data: Record<BudgetSegmentType, BudgetSegment[]>
): Promise<void> {
  const ref = doc(db, "settings", "budgetSegments")
  await setDoc(ref, data)
}

// ─── Supervisor Mappings ────────────────────────────────────────────────────

export async function getSupervisorMappings(): Promise<SupervisorMapping[]> {
  const ref = doc(db, "settings", "supervisorMappings")
  const snap = await getDoc(ref)
  return snap.exists()
    ? ((snap.data().mappings as SupervisorMapping[]) ?? [])
    : []
}

export async function updateSupervisorMappings(
  mappings: SupervisorMapping[]
): Promise<void> {
  const ref = doc(db, "settings", "supervisorMappings")
  await setDoc(ref, { mappings }, { merge: true })
}

export async function getBuildingSupervisorMappings(): Promise<
  BuildingSupervisorMapping[]
> {
  const ref = doc(db, "settings", "supervisorMappings")
  const snap = await getDoc(ref)
  return snap.exists()
    ? ((snap.data().buildingMappings as BuildingSupervisorMapping[]) ?? [])
    : []
}

export async function updateBuildingSupervisorMappings(
  buildingMappings: BuildingSupervisorMapping[]
): Promise<void> {
  const ref = doc(db, "settings", "supervisorMappings")
  await setDoc(ref, { buildingMappings }, { merge: true })
}

export async function resolveSupervisor(email: string): Promise<{
  email: string
  name: string
  approverEmail?: string
  approverName?: string
} | null> {
  // 1. Look up staff record for their title
  const staffRef = doc(db, "staff", email.toLowerCase())
  const staffSnap = await getDoc(staffRef)
  if (!staffSnap.exists()) return null

  const staff = staffSnap.data() as StaffRecord
  if (!staff.title) return null

  // 2. Find a supervisor mapping that includes this title
  const mappings = await getSupervisorMappings()
  const match = mappings.find((m) =>
    m.titles.some((t) => t.toLowerCase() === staff.title.toLowerCase())
  )
  if (match)
    return {
      email: match.supervisorEmail,
      name: match.supervisorName,
      approverEmail: match.approverEmail || undefined,
      approverName: match.approverName || undefined,
    }

  // 3. Fallback: building supervisor mapping
  if (staff.building) {
    const buildingMappings = await getBuildingSupervisorMappings()
    const bMatch = buildingMappings.find(
      (bm) =>
        bm.building === staff.building || bm.buildingName === staff.building
    )
    if (bMatch)
      return {
        email: bMatch.supervisorEmail,
        name: bMatch.supervisorName,
        approverEmail: bMatch.approverEmail || undefined,
        approverName: bMatch.approverName || undefined,
      }
  }

  return null
}

// ─── Staff Sync Metadata ────────────────────────────────────────────────────

export async function getStaffRecord(
  email: string
): Promise<StaffRecord | null> {
  const ref = doc(db, "staff", email.toLowerCase())
  const snap = await getDoc(ref)
  return snap.exists() ? (snap.data() as StaffRecord) : null
}

export async function getUniqueStaffTitles(): Promise<string[]> {
  const records = await getStaffRecords()
  const titles = new Set(records.map((r) => r.title).filter(Boolean))
  return [...titles].sort()
}

// ─── Form Field Config ──────────────────────────────────────────────────────

function f(
  id: string,
  label: string,
  sortOrder: number,
  locked = false
): FormFieldConfig {
  return { id, label, visible: true, sortOrder, locked }
}

export const DEFAULT_FORM_FIELDS: Record<FormType, FormFieldConfig[]> = {
  check: [
    f("fullName", "Full Name", 0, true),
    f("dateOfRequest", "Date of Request", 1, true),
    f("dateCheckNeeded", "Date Check Needed", 2),
    f("routeTo", "Route To", 3, true),
    f("payeeName", "Payee / Vendor Name", 4, true),
    f("payeeAddress", "Payee Address", 5),
    f("expenses", "Expenses", 6, true),
    f("signature", "Employee Signature", 7, true),
  ],
  mileage: [
    f("fullName", "Full Name", 0, true),
    f("employeeId", "Employee ID", 1),
    f("accountCode", "Account Code", 2),
    f("routeTo", "Route To", 3, true),
    f("trips", "Trip Details", 4, true),
    f("tripPurpose", "Trip Purpose Column", 5),
    f("roundTrip", "Round Trip Option", 6),
    f("signature", "Employee Signature", 7, true),
  ],
  travel: [
    f("fullName", "Full Name", 0, true),
    f("employeeId", "Employee ID", 1),
    f("formDate", "Form Date", 2),
    f("address", "Employee Address", 3),
    f("routeTo", "Route To", 4, true),
    f("budgetYear", "Budget Year", 5),
    f("accountCode", "Account Code", 6),
    f("meetingDetails", "Meeting / Conference Details", 7, true),
    f("timeAway", "Time Away", 8),
    f("justification", "Justification & Attachments", 9),
    f("estimatedExpenses", "Estimated Expenses", 10),
    f("actualExpenses", "Actual Expenses", 11, true),
    f("meals", "Meals", 12),
    f("advanceRequested", "Advance Requested", 13),
    f("signature", "Employee Signature", 14, true),
  ],
}

export async function getFormFieldConfigs(): Promise<
  Record<FormType, FormFieldConfig[]>
> {
  const ref = doc(db, "settings", "formFields")
  const snap = await getDoc(ref)
  if (snap.exists()) {
    const data = snap.data() as Record<FormType, FormFieldConfig[]>
    // Merge with defaults to pick up any new fields added later
    const merged = { ...DEFAULT_FORM_FIELDS }
    for (const formType of Object.keys(DEFAULT_FORM_FIELDS) as FormType[]) {
      if (data[formType]) {
        const savedIds = new Set(data[formType].map((f) => f.id))
        const newFields = DEFAULT_FORM_FIELDS[formType].filter(
          (f) => !savedIds.has(f.id)
        )
        merged[formType] = [...data[formType], ...newFields]
      }
    }
    return merged
  }
  return DEFAULT_FORM_FIELDS
}

export async function updateFormFieldConfigs(
  configs: Record<FormType, FormFieldConfig[]>
): Promise<void> {
  const ref = doc(db, "settings", "formFields")
  await setDoc(ref, configs)
}
