import { createContext } from "react"
import type { User } from "firebase/auth"
import type { UserProfile } from "@/lib/types"

export type { UserProfile }

export interface AuthContextValue {
  user: User | null
  userProfile: UserProfile | null
  loading: boolean
  error: string | null
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
