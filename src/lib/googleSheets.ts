import { GoogleAuthProvider, signInWithPopup } from "firebase/auth"
import { auth } from "./firebase"
import type { StaffRecord } from "./types"

const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly"

/**
 * Get a Google OAuth access token with Sheets read scope.
 * Triggers a popup for the admin to grant consent (one-time).
 */
async function getSheetsAccessToken(): Promise<string> {
  const provider = new GoogleAuthProvider()
  provider.addScope(SHEETS_SCOPE)
  provider.setCustomParameters({ hd: "orono.k12.mn.us" })

  const result = await signInWithPopup(auth, provider)
  const credential = GoogleAuthProvider.credentialFromResult(result)
  if (!credential?.accessToken) {
    throw new Error("Failed to get Google Sheets access token")
  }
  return credential.accessToken
}

// OneSync column order: OneSyncID, BuildingInitials, Username, Email, EmployeeID, LastName, FirstName, Title
const COL = {
  BUILDING: 1,
  EMAIL: 3,
  EMPLOYEE_ID: 4,
  LAST_NAME: 5,
  FIRST_NAME: 6,
  TITLE: 7,
} as const

export interface SheetSyncResult {
  records: Omit<StaffRecord, "createdAt" | "updatedAt">[]
  rowCount: number
}

export async function fetchStaffFromSheet(
  sheetId: string,
  range = "Sheet1!A2:H"
): Promise<SheetSyncResult> {
  const token = await getSheetsAccessToken()

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}/values/${encodeURIComponent(range)}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Sheets API error ${res.status}: ${body}`)
  }

  const data = await res.json()
  const rows: string[][] = data.values ?? []

  const records = rows
    .filter((row) => row[COL.EMAIL]?.trim())
    .map((row) => ({
      email: row[COL.EMAIL].trim().toLowerCase(),
      firstName: row[COL.FIRST_NAME]?.trim() ?? "",
      lastName: row[COL.LAST_NAME]?.trim() ?? "",
      employeeId: row[COL.EMPLOYEE_ID]?.trim() ?? "",
      title: row[COL.TITLE]?.trim() ?? "",
      building: row[COL.BUILDING]?.trim() ?? "",
    }))

  return { records, rowCount: rows.length }
}
