const { onSchedule } = require("firebase-functions/v2/scheduler")
const { onCall, HttpsError } = require("firebase-functions/v2/https")
const { onDocumentUpdated } = require("firebase-functions/v2/firestore")
const { initializeApp } = require("firebase-admin/app")
const { getFirestore, FieldValue } = require("firebase-admin/firestore")
const { google } = require("googleapis")
const { generatePdf } = require("./helpers/pdf")
const { uploadToDrive } = require("./helpers/drive")
const { appendToLog } = require("./helpers/sheets")

initializeApp()
const db = getFirestore()

// OneSync column order: OneSyncID, BuildingInitials, Username, Email, EmployeeID, LastName, FirstName, Title
const COL = {
  BUILDING: 1,
  EMAIL: 3,
  EMPLOYEE_ID: 4,
  LAST_NAME: 5,
  FIRST_NAME: 6,
  TITLE: 7,
}

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

  // Sync title + building to existing user profiles
  const usersSnap = await db.collection("users").get()
  const staffByEmail = Object.fromEntries(records.map((r) => [r.email, r]))
  const profileBatches = []
  const profileUpdates = usersSnap.docs.filter((d) => {
    const user = d.data()
    const staff = staffByEmail[user.email?.toLowerCase()]
    return (
      staff && (user.title !== staff.title || user.building !== staff.building)
    )
  })
  for (let i = 0; i < profileUpdates.length; i += 500) {
    const batch = db.batch()
    profileUpdates.slice(i, i + 500).forEach((d) => {
      const staff = staffByEmail[d.data().email.toLowerCase()]
      batch.update(d.ref, {
        title: staff.title,
        building: staff.building,
        updatedAt: FieldValue.serverTimestamp(),
      })
    })
    profileBatches.push(batch.commit())
  }
  await Promise.all(profileBatches)

  // Update last sync timestamp
  await db
    .doc("settings/app")
    .set({ lastStaffSync: FieldValue.serverTimestamp() }, { merge: true })

  return {
    rowCount: rows.length,
    imported: records.length,
    profilesUpdated: profileUpdates.length,
  }
}

// Scheduled sync — runs on a cron schedule configured in Firestore
// We use "every day 02:00" as default; admins configure the actual time in the UI
// and we redeploy or use Cloud Scheduler API to update
exports.scheduledStaffSync = onSchedule(
  {
    schedule: "every day 05:00",
    timeZone: "America/Chicago",
    region: "us-central1",
  },
  async () => {
    // Check if sync is enabled
    const settingsSnap = await db.doc("settings/app").get()
    const settings = settingsSnap.data() || {}
    if (!settings.staffSyncEnabled) return

    const result = await syncStaffFromSheet()
    console.log(
      `Scheduled sync complete: ${result.imported} records from ${result.rowCount} rows`
    )
  }
)

// Callable function — admin can trigger sync manually from the UI
exports.syncStaffNow = onCall({ region: "us-central1" }, async (request) => {
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
})

// ─── On Final Approval: PDF → Drive → Sheets ────────────────────────────────

exports.onSubmissionApproved = onDocumentUpdated(
  {
    document: "submissions/{submissionId}",
    region: "us-central1",
  },
  async (event) => {
    const before = event.data.before.data()
    const after = event.data.after.data()

    // Only fire on transition to "approved"
    if (before.status === "approved" || after.status !== "approved") return

    // Idempotency: skip if PDF already generated
    if (after.pdfDriveId) return

    try {
      const settingsSnap = await db.doc("settings/app").get()
      const settings = settingsSnap.data() || {}

      // Generate PDF
      const pdfBuffer = await generatePdf(after)

      // Upload to Drive
      const { fileId, webViewLink, yearFolderId } = await uploadToDrive(
        pdfBuffer,
        after,
        settings
      )

      // Update submission with Drive link
      await event.data.after.ref.update({
        pdfDriveId: fileId,
        pdfDriveUrl: webViewLink,
        updatedAt: FieldValue.serverTimestamp(),
      })

      // Append to log sheet (auto-creates sheet if needed)
      await appendToLog(after, settings, webViewLink, yearFolderId, db)

      console.log(
        `Processed approval for ${after.id}: PDF uploaded (${fileId})`
      )
    } catch (err) {
      console.error(`Error processing approval for ${after.id}:`, err)
      // Write error to submission doc so admin can see it — do NOT throw
      // (throwing causes retries which could create duplicate PDFs)
      await event.data.after.ref
        .update({
          approvalProcessingError: err.message || String(err),
          updatedAt: FieldValue.serverTimestamp(),
        })
        .catch((e) => console.error("Failed to write error to doc:", e))
    }
  }
)
