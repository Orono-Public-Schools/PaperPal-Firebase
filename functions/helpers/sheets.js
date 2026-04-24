const { google } = require("googleapis")

const FORM_LABELS = {
  check: "Check Request",
  mileage: "Mileage Reimbursement",
  travel: "Travel Reimbursement",
}

const LOG_HEADERS = [
  "Submission ID",
  "Form Type",
  "Submitter",
  "Amount",
  "Account Code",
  "Approved Date",
  "Supervisor",
  "PDF Link",
  "Paid Date",
  "Paid By",
]

function getAuth() {
  return new google.auth.GoogleAuth({
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive",
    ],
  })
}

function getAccountCode(submission) {
  const data = submission.formData
  switch (submission.formType) {
    case "check":
      return (data.expenses || [])
        .map((e) => e.code)
        .filter(Boolean)
        .join(", ")
    case "mileage":
      return data.accountCode || ""
    case "travel":
      return data.accountCode || ""
    default:
      return ""
  }
}

async function findOrCreateLogSheet(yearLabel, yearFolderId, db) {
  const auth = getAuth()
  const drive = google.drive({ version: "v3", auth })
  const sheets = google.sheets({ version: "v4", auth })

  const sheetName = `${yearLabel} PaperPal Log`

  // Check if it already exists in the year folder
  const res = await drive.files.list({
    q: `'${yearFolderId}' in parents and name = '${sheetName}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`,
    corpora: "drive",
    driveId: "0ABSKbjIMiOlKUk9PVA",
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    fields: "files(id, name)",
  })

  if (res.data.files?.length > 0) {
    return res.data.files[0].id
  }

  // Create the spreadsheet directly in the shared drive folder
  const fileRes = await drive.files.create({
    requestBody: {
      name: sheetName,
      mimeType: "application/vnd.google-apps.spreadsheet",
      parents: [yearFolderId],
    },
    supportsAllDrives: true,
    fields: "id",
  })

  const sheetId = fileRes.data.id

  // Add headers
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: "Sheet1!A1:H1",
    valueInputOption: "RAW",
    requestBody: {
      values: [LOG_HEADERS],
    },
  })

  // Bold the header row
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: sheetId,
    requestBody: {
      requests: [
        {
          repeatCell: {
            range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1 },
            cell: {
              userEnteredFormat: { textFormat: { bold: true } },
            },
            fields: "userEnteredFormat.textFormat.bold",
          },
        },
      ],
    },
  })

  // Save the sheet ID to settings so we don't recreate it
  if (db) {
    await db
      .doc("settings/app")
      .set({ paperpalLogSheetId: sheetId }, { merge: true })
  }

  console.log(
    `Created log sheet "${sheetName}" (${sheetId}) in folder ${yearFolderId}`
  )
  return sheetId
}

async function appendToLog(submission, settings, driveUrl, yearFolderId, db) {
  let sheetId = settings.paperpalLogSheetId

  // Auto-create the log sheet if not configured
  if (!sheetId) {
    if (!yearFolderId) {
      throw new Error("No paperpalLogSheetId and no yearFolderId to create one")
    }
    const approvedDate = submission.approvedAt?.toDate
      ? submission.approvedAt.toDate()
      : new Date()
    const fiscalYearStartMonth = settings.fiscalYearStartMonth ?? 6
    const month = approvedDate.getMonth()
    const year = approvedDate.getFullYear()
    const fy = month >= fiscalYearStartMonth ? year + 1 : year
    const yearLabel = `${fy} FY`

    sheetId = await findOrCreateLogSheet(yearLabel, yearFolderId, db)
  }

  const auth = getAuth()
  const sheets = google.sheets({ version: "v4", auth })

  const approvedDate = submission.approvedAt?.toDate
    ? submission.approvedAt.toDate()
    : new Date()

  const row = [
    submission.id,
    FORM_LABELS[submission.formType] || submission.formType,
    submission.submitterName || "",
    Number(submission.amount || 0).toFixed(2),
    getAccountCode(submission),
    approvedDate.toLocaleDateString("en-US"),
    submission.supervisorName || "",
    driveUrl || "",
  ]

  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: "Sheet1!A:H",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [row] },
  })
}

async function markPaidInLog(submission, settings) {
  const sheetId = settings.paperpalLogSheetId
  if (!sheetId) return

  const auth = getAuth()
  const sheets = google.sheets({ version: "v4", auth })

  // Find the row with this submission ID
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: "Sheet1!A:A",
  })

  const rows = res.data.values || []
  let rowIndex = -1
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][0] === submission.id) {
      rowIndex = i + 1 // 1-indexed for Sheets API
      break
    }
  }

  if (rowIndex === -1) return // Row not found

  const paidDate = submission.paidAt?.toDate
    ? submission.paidAt.toDate().toLocaleDateString("en-US")
    : new Date().toLocaleDateString("en-US")

  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `Sheet1!I${rowIndex}:J${rowIndex}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[paidDate, submission.paidBy || ""]] },
  })
}

module.exports = {
  appendToLog,
  markPaidInLog,
  setupLogSheet: findOrCreateLogSheet,
}
