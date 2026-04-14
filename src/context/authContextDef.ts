import { createContext } from "react"
import type { User } from "firebase/auth"

export interface UserProfile {
  uid: string
  email: string
  firstName: string
  lastName: string
  fullName: string
  photoURL: string
  role: "staff" | "admin" | "business_office"
  createdAt: unknown
  updatedAt: unknown
}

export interface AuthContextValue {
  user: User | null
  userProfile: UserProfile | null
  loading: boolean
  error: string | null
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
