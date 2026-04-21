const { onSchedule } = require("firebase-functions/v2/scheduler")
const { onCall, HttpsError } = require("firebase-functions/v2/https")
const {
  onDocumentUpdated,
  onDocumentCreated,
} = require("firebase-functions/v2/firestore")
const { initializeApp } = require("firebase-admin/app")
const { getFirestore, FieldValue } = require("firebase-admin/firestore")
const { google } = require("googleapis")
const { generatePdf } = require("./helpers/pdf")
const { uploadToDrive } = require("./helpers/drive")
const { appendToLog } = require("./helpers/sheets")
const {
  sendSubmitEmails,
  sendReviewedEmails,
  sendApprovedEmails,
  sendDeniedEmails,
  sendRevisionsEmails,
  sendResubmittedEmails,
  sendRedirectedEmails,
  sendApproverApprovedEmails,
} = require("./helpers/email")

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

// ─── Setup Drive Structure ───────────────────────────────────────────────────

exports.setupDriveStructure = onCall(
  { region: "us-central1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in")
    }
    const userSnap = await db.doc(`users/${request.auth.uid}`).get()
    const user = userSnap.data()
    if (!user || (user.role !== "admin" && user.role !== "business_office")) {
      throw new HttpsError("permission-denied", "Admin access required")
    }

    const { uploadToDriveSetup } = require("./helpers/drive")
    const { setupLogSheet } = require("./helpers/sheets")

    const settingsSnap = await db.doc("settings/app").get()
    const settings = settingsSnap.data() || {}
    const fiscalYearStartMonth = settings.fiscalYearStartMonth ?? 6

    // Determine current fiscal year
    const now = new Date()
    const month = now.getMonth()
    const year = now.getFullYear()
    const fy = month >= fiscalYearStartMonth ? year + 1 : year
    const yearLabel = `${fy} FY`

    // Create folder structure
    const { yearFolderId, monthFolders } = await uploadToDriveSetup(yearLabel)

    // Create log sheet
    const sheetId = await setupLogSheet(yearLabel, yearFolderId, db)

    return {
      yearLabel,
      yearFolderId,
      monthFolders,
      sheetId,
    }
  }
)

// ─── Fiscal Year Rollover (July 1 at midnight Central) ──────────────────────

exports.fiscalYearRollover = onSchedule(
  {
    schedule: "0 0 1 7 *",
    timeZone: "America/Chicago",
    region: "us-central1",
  },
  async () => {
    const { uploadToDriveSetup } = require("./helpers/drive")
    const { setupLogSheet } = require("./helpers/sheets")

    const settingsSnap = await db.doc("settings/app").get()
    const settings = settingsSnap.data() || {}
    const fiscalYearStartMonth = settings.fiscalYearStartMonth ?? 6

    // July 1 means we're now in the new fiscal year
    const now = new Date()
    const fy =
      now.getMonth() >= fiscalYearStartMonth
        ? now.getFullYear() + 1
        : now.getFullYear()
    const yearLabel = `${fy} FY`

    // Create folder structure + log sheet
    const { yearFolderId } = await uploadToDriveSetup(yearLabel)
    const sheetId = await setupLogSheet(yearLabel, yearFolderId, db)

    console.log(
      `Fiscal year rollover: created "${yearLabel}" structure, sheet ${sheetId}`
    )
  }
)

// ─── On New Submission: generate PDF + send emails ──────────────────────────

exports.onSubmissionCreated = onDocumentCreated(
  {
    document: "submissions/{submissionId}",
    region: "us-central1",
  },
  async (event) => {
    const submission = event.data.data()
    if (submission.status !== "pending") return

    try {
      const settingsSnap = await db.doc("settings/app").get()
      const settings = settingsSnap.data() || {}

      const pdfBuffer = await generatePdf(submission)
      await sendSubmitEmails(submission, settings, pdfBuffer)

      console.log(`Submit emails sent for ${submission.id}`)
    } catch (err) {
      console.error(`Error on submit for ${submission.id}:`, err)
    }
  }
)

// ─── On Status Change: generate PDF + send emails + Drive (on final) ────────

exports.onSubmissionStatusChange = onDocumentUpdated(
  {
    document: "submissions/{submissionId}",
    region: "us-central1",
  },
  async (event) => {
    const before = event.data.before.data()
    const after = event.data.after.data()

    // Detect redirect: supervisor changed while status stays pending
    const isRedirect =
      before.status === "pending" &&
      after.status === "pending" &&
      before.supervisorEmail !== after.supervisorEmail

    // Detect resubmit from pending (edit & resubmit without status change)
    const isResubmitFromPending =
      before.status === "pending" &&
      after.status === "pending" &&
      (after.activityLog || []).length > (before.activityLog || []).length &&
      !isRedirect

    // Only fire on actual status transitions, redirects, or resubmits
    if (before.status === after.status && !isRedirect && !isResubmitFromPending)
      return

    try {
      const settingsSnap = await db.doc("settings/app").get()
      const settings = settingsSnap.data() || {}

      // Handle redirect before the status switch
      if (isRedirect) {
        const pdfBuffer = await generatePdf(after)
        await sendRedirectedEmails(
          after,
          settings,
          before.supervisorEmail,
          pdfBuffer
        )
        console.log(
          `Redirect emails sent for ${after.id}: ${before.supervisorEmail} → ${after.supervisorEmail}`
        )
        return
      }

      // Generate PDF with current signatures
      const pdfBuffer = await generatePdf(after)

      switch (after.status) {
        case "pending":
          // Resubmit: revisions_requested → pending, or pending → pending (edit & resubmit)
          if (
            before.status === "revisions_requested" ||
            isResubmitFromPending
          ) {
            await sendResubmittedEmails(after, settings, pdfBuffer)
            console.log(`Resubmit emails sent for ${after.id}`)
          }
          break

        case "approved_by_approver":
          await sendApproverApprovedEmails(after, settings, pdfBuffer)
          console.log(`Approver-approved emails sent for ${after.id}`)
          break

        case "reviewed":
          await sendReviewedEmails(after, settings, pdfBuffer)
          console.log(`Reviewed emails sent for ${after.id}`)
          break

        case "approved": {
          // Upload to shared drive + log sheet (skip in sandbox)
          if (!after.pdfDriveId && !after.sandbox) {
            const { fileId, webViewLink, yearFolderId } = await uploadToDrive(
              pdfBuffer,
              after,
              settings
            )

            await event.data.after.ref.update({
              pdfDriveId: fileId,
              pdfDriveUrl: webViewLink,
              updatedAt: FieldValue.serverTimestamp(),
            })

            await appendToLog(after, settings, webViewLink, yearFolderId, db)
            console.log(
              `Approval processed for ${after.id}: PDF uploaded (${fileId})`
            )
          }

          await sendApprovedEmails(after, settings, pdfBuffer)
          break
        }

        case "denied":
          await sendDeniedEmails(after, settings, pdfBuffer)
          console.log(`Denial emails sent for ${after.id}`)
          break

        case "revisions_requested":
          await sendRevisionsEmails(after, settings, pdfBuffer)
          console.log(`Revision emails sent for ${after.id}`)
          break
      }
    } catch (err) {
      console.error(`Error processing status change for ${after.id}:`, err)
      await event.data.after.ref
        .update({
          approvalProcessingError: err.message || String(err),
          updatedAt: FieldValue.serverTimestamp(),
        })
        .catch((e) => console.error("Failed to write error to doc:", e))
    }
  }
)

// ─── Receipt OCR (callable) ─────────────────────────────────────────────────

exports.extractReceiptTotal = onCall(
  { region: "us-central1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in")
    }

    const { imageUrl } = request.data
    if (!imageUrl) {
      throw new HttpsError("invalid-argument", "imageUrl is required")
    }

    try {
      const vision = require("@google-cloud/vision")
      const client = new vision.ImageAnnotatorClient()

      const [result] = await client.textDetection(imageUrl)
      const detections = result.textAnnotations
      if (!detections || detections.length === 0) {
        return { amount: null }
      }

      const fullText = detections[0].description || ""

      // Look for total-like patterns
      const totalPatterns = [
        /total[:\s]*\$?\s*([\d,]+\.?\d{0,2})/i,
        /amount\s*due[:\s]*\$?\s*([\d,]+\.?\d{0,2})/i,
        /balance\s*due[:\s]*\$?\s*([\d,]+\.?\d{0,2})/i,
        /grand\s*total[:\s]*\$?\s*([\d,]+\.?\d{0,2})/i,
      ]

      for (const pattern of totalPatterns) {
        const match = fullText.match(pattern)
        if (match) {
          const amount = parseFloat(match[1].replace(",", ""))
          if (amount > 0 && amount < 10000) {
            return { amount }
          }
        }
      }

      // Fallback: find the largest dollar amount on the receipt
      const dollarPattern = /\$\s*([\d,]+\.\d{2})/g
      let largest = 0
      let m
      while ((m = dollarPattern.exec(fullText)) !== null) {
        const val = parseFloat(m[1].replace(",", ""))
        if (val > largest && val < 10000) largest = val
      }

      return { amount: largest > 0 ? largest : null }
    } catch (err) {
      console.error("OCR error:", err)
      return { amount: null }
    }
  }
)

// ─── On-Demand PDF Generation (callable) ────────────────────────────────────

exports.generateSubmissionPdf = onCall(
  { region: "us-central1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in")
    }

    const { submissionId } = request.data
    if (!submissionId) {
      throw new HttpsError("invalid-argument", "submissionId is required")
    }

    const submissionSnap = await db.doc(`submissions/${submissionId}`).get()
    if (!submissionSnap.exists) {
      throw new HttpsError("not-found", "Submission not found")
    }

    const submission = submissionSnap.data()

    // Verify caller has access (submitter, supervisor, or admin)
    const callerUid = request.auth.uid
    const callerEmail = request.auth.token.email?.toLowerCase()
    const userSnap = await db.doc(`users/${callerUid}`).get()
    const user = userSnap.data()
    const isAdminOrBO =
      user?.role === "admin" ||
      user?.role === "controller" ||
      user?.role === "business_office"

    if (
      submission.submitterUid !== callerUid &&
      submission.supervisorEmail?.toLowerCase() !== callerEmail &&
      !isAdminOrBO
    ) {
      throw new HttpsError("permission-denied", "No access to this submission")
    }

    const pdfBuffer = await generatePdf(submission)
    return { pdf: pdfBuffer.toString("base64") }
  }
)
