const { onSchedule } = require("firebase-functions/v2/scheduler")
const { onCall, HttpsError } = require("firebase-functions/v2/https")
const { initializeApp } = require("firebase-admin/app")
const { getFirestore, FieldValue } = require("firebase-admin/firestore")
const { google } = require("googleapis")

initializeApp()
const db = getFirestore()

// OneSync column order: OneSyncID, BuildingInitials, Username, Email, EmployeeID, LastName, FirstName, Title
const COL = { BUILDING: 1, EMAIL: 3, EMPLOYEE_ID: 4, LAST_NAME: 5, FIRST_NAME: 6, TITLE: 7 }

async function syncStaffFromSheet() {
  // Read config from Firestore
  const settingsSnap = await db.doc("settings/app").get()
  const settings = settingsSnap.data() || {}
  const sheetId = settings.staffSheetId
  const range = settings.staffSheetRange || "Sheet1!A2:H"

  if (!sheetId) {
    throw new Error("No staffSheetId configured in settings/app")
  }

  // Auth with default service account credentials
  const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  })
  const sheets = google.sheets({ version: "v4", auth })

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range,
  })

  const rows = res.data.values || []
  const records = rows
    .filter((row) => row[COL.EMAIL]?.trim())
    .map((row) => ({
      email: row[COL.EMAIL].trim().toLowerCase(),
      firstName: row[COL.FIRST_NAME]?.trim() || "",
      lastName: row[COL.LAST_NAME]?.trim() || "",
      employeeId: row[COL.EMPLOYEE_ID]?.trim() || "",
      title: row[COL.TITLE]?.trim() || "",
      building: row[COL.BUILDING]?.trim() || "",
    }))

  if (records.length === 0) {
    return { rowCount: rows.length, imported: 0 }
  }

  // Delete all existing staff records first (full replace)
  const existing = await db.collection("staff").listDocuments()
  if (existing.length > 0) {
    const delBatches = []
    for (let i = 0; i < existing.length; i += 500) {
      const batch = db.batch()
      existing.slice(i, i + 500).forEach((ref) => batch.delete(ref))
      delBatches.push(batch.commit())
    }
    await Promise.all(delBatches)
  }

  // Batch write new records
  const batches = []
  for (let i = 0; i < records.length; i += 500) {
    const batch = db.batch()
    const chunk = records.slice(i, i + 500)
    for (const record of chunk) {
      const ref = db.doc(`staff/${record.email}`)
      batch.set(ref, {
        ...record,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
    }
    batches.push(batch.commit())
  }
  await Promise.all(batches)

  // Update last sync timestamp
  await db.doc("settings/app").set(
    { lastStaffSync: FieldValue.serverTimestamp() },
    { merge: true }
  )

  return { rowCount: rows.length, imported: records.length }
}

// Scheduled sync — runs on a cron schedule configured in Firestore
// We use "every day 02:00" as default; admins configure the actual time in the UI
// and we redeploy or use Cloud Scheduler API to update
exports.scheduledStaffSync = onSchedule(
  {
    schedule: "every day 02:00",
    timeZone: "America/Chicago",
    region: "us-central1",
  },
  async () => {
    // Check if sync is enabled
    const settingsSnap = await db.doc("settings/app").get()
    const settings = settingsSnap.data() || {}
    if (!settings.staffSyncEnabled) return

    const result = await syncStaffFromSheet()
    console.log(`Scheduled sync complete: ${result.imported} records from ${result.rowCount} rows`)
  }
)

// Callable function — admin can trigger sync manually from the UI
exports.syncStaffNow = onCall(
  { region: "us-central1" },
  async (request) => {
    // Verify the caller is an admin
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in")
    }
    const userSnap = await db.doc(`users/${request.auth.uid}`).get()
    const user = userSnap.data()
    if (!user || (user.role !== "admin" && user.role !== "business_office")) {
      throw new HttpsError("permission-denied", "Admin access required")
    }

    const result = await syncStaffFromSheet()
    return result
  }
)
