const { google } = require("googleapis")
const { Readable } = require("stream")

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

function getDriveService() {
  const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/drive"],
  })
  return google.drive({ version: "v3", auth })
}

function getFiscalYearLabel(approvedDate, fiscalYearStartMonth) {
  const month = approvedDate.getMonth()
  const year = approvedDate.getFullYear()
  // If approved in/after the start month, it's the next calendar year's FY
  // e.g. fiscalYearStartMonth=6 (July): July 2025 → FY "2026", June 2025 → FY "2025"
  return month >= fiscalYearStartMonth ? String(year + 1) : String(year)
}

function getMonthName(date) {
  return MONTHS[date.getMonth()]
}

async function findFolder(drive, parentId, name) {
  const res = await drive.files.list({
    q: `'${parentId}' in parents and name = '${name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    fields: "files(id, name)",
  })
  return res.data.files?.[0] || null
}

async function createFolder(drive, parentId, name) {
  const res = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    },
    supportsAllDrives: true,
    fields: "id, name",
  })
  return res.data
}

async function findOrCreateFolder(drive, parentId, name) {
  const existing = await findFolder(drive, parentId, name)
  if (existing) return existing
  return createFolder(drive, parentId, name)
}

async function uploadToDrive(pdfBuffer, submission, settings) {
  const drive = getDriveService()
  const rootFolderId = settings.paperpalDriveFolderId || "0ABSKbjIMiOlKUk9PVA"

  const approvedDate = submission.approvedAt?.toDate
    ? submission.approvedAt.toDate()
    : new Date()

  const fiscalYearStartMonth = settings.fiscalYearStartMonth ?? 6
  const yearLabel = getFiscalYearLabel(approvedDate, fiscalYearStartMonth)
  const monthName = getMonthName(approvedDate)

  // Find/create: root → year → month
  const yearFolder = await findOrCreateFolder(drive, rootFolderId, yearLabel)
  const monthFolder = await findOrCreateFolder(drive, yearFolder.id, monthName)

  // Build filename: check_REQ-12345_Mellor.pdf
  const lastName = (submission.submitterName || "Unknown").split(" ").pop()
  const filename = `${submission.formType}_${submission.id}_${lastName}.pdf`

  const file = await drive.files.create({
    requestBody: {
      name: filename,
      parents: [monthFolder.id],
    },
    media: {
      mimeType: "application/pdf",
      body: Readable.from(pdfBuffer),
    },
    fields: "id, webViewLink",
    supportsAllDrives: true,
  })

  return {
    fileId: file.data.id,
    webViewLink: file.data.webViewLink,
    yearFolderId: yearFolder.id,
  }
}

module.exports = { uploadToDrive }
