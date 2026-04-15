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
import type { Submission, UserProfile, Building, StaffRecord, AppSettings } from "./types"

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
  updates: Partial<Submission>
): Promise<void> {
  const ref = doc(db, "submissions", id)
  await updateDoc(ref, { ...updates, updatedAt: serverTimestamp() })
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
  const q = query(
    collection(db, "submissions"),
    where("supervisorEmail", "==", supervisorEmail),
    where("status", "==", "pending"),
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
