import { useEffect, useState, type ReactNode } from "react"
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from "firebase/auth"
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore"
import { auth, db, googleProvider } from "@/lib/firebase"
import { AuthContext, type UserProfile } from "@/context/authContextDef"

async function isAllowedEmail(email: string): Promise<boolean> {
  if (email.endsWith("@orono.k12.mn.us")) return true
  const snap = await getDoc(doc(db, "allowedExternalEmails", email))
  return snap.exists()
}

async function ensureUserProfile(
  uid: string,
  email: string,
  displayName: string | null,
  photoURL: string | null
): Promise<UserProfile> {
  const ref = doc(db, "users", uid)
  const snap = await getDoc(ref)

  if (snap.exists()) return snap.data() as UserProfile

  const nameParts = (displayName ?? "").split(" ")
  const firstName = nameParts[0] ?? ""
  const lastName = nameParts.slice(1).join(" ")

  const profile: UserProfile = {
    uid,
    email,
    firstName,
    lastName,
    fullName: displayName ?? "",
    photoURL: photoURL ?? "",
    role: "staff",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  await setDoc(ref, profile)
  return profile
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<import("firebase/auth").User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const allowed = await isAllowedEmail(firebaseUser.email ?? "")
        if (!allowed) {
          await firebaseSignOut(auth)
          setUser(null)
          setUserProfile(null)
          setError(
            "Access is restricted to Orono Public Schools staff. Contact your administrator if you need access."
          )
        } else {
          const profile = await ensureUserProfile(
            firebaseUser.uid,
            firebaseUser.email ?? "",
            firebaseUser.displayName,
            firebaseUser.photoURL
          )
          setUser(firebaseUser)
          setUserProfile(profile)
          setError(null)
        }
      } else {
        setUser(null)
        setUserProfile(null)
      }
      setLoading(false)
    })

    return unsubscribe
  }, [])

  async function signIn() {
    setError(null)
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (err: unknown) {
      if (
        err instanceof Error &&
        (err as { code?: string }).code !== "auth/popup-closed-by-user"
      ) {
        setError("Sign-in failed. Please try again.")
      }
    }
  }

  async function signOut() {
    await firebaseSignOut(auth)
  }

  return (
    <AuthContext.Provider
      value={{ user, userProfile, loading, error, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  )
}
