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
      return (data.expenses || []).map((e) => e.code).filter(Boolean).join(", ")
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
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    fields: "files(id, name)",
  })

  if (res.data.files?.length > 0) {
    return res.data.files[0].id
  }

  // Create the spreadsheet
  const createRes = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: sheetName },
      sheets: [
        {
          properties: { title: "Sheet1" },
          data: [
            {
              startRow: 0,
              startColumn: 0,
              rowData: [
                {
                  values: LOG_HEADERS.map((h) => ({
                    userEnteredValue: { stringValue: h },
                    userEnteredFormat: { textFormat: { bold: true } },
                  })),
                },
              ],
            },
          ],
        },
      ],
    },
  })

  const sheetId = createRes.data.spreadsheetId

  // Move into the year folder on the shared drive
  const fileInfo = await drive.files.get({
    fileId: sheetId,
    fields: "parents",
    supportsAllDrives: true,
  })

  await drive.files.update({
    fileId: sheetId,
    addParents: yearFolderId,
    removeParents: (fileInfo.data.parents || []).join(","),
    supportsAllDrives: true,
  })

  // Save the sheet ID to settings so we don't recreate it
  if (db) {
    await db
      .doc("settings/app")
      .set({ paperpalLogSheetId: sheetId }, { merge: true })
  }

  console.log(`Created log sheet "${sheetName}" (${sheetId}) in folder ${yearFolderId}`)
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
    const yearLabel = month >= fiscalYearStartMonth ? String(year + 1) : String(year)

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

module.exports = { appendToLog }
