import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore"
import { db } from "./firebase"
import type { Submission, UserProfile } from "./types"

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
