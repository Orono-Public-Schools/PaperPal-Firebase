const { google } = require("googleapis")
const { Readable } = require("stream")

const SHARED_DRIVE_ID = "0ABSKbjIMiOlKUk9PVA"

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
  const fy = month >= fiscalYearStartMonth ? year + 1 : year
  return `${fy} FY`
}

function getMonthName(date) {
  return MONTHS[date.getMonth()]
}

async function findFolder(drive, parentId, name) {
  const res = await drive.files.list({
    q: `'${parentId}' in parents and name = '${name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    corpora: "drive",
    driveId: SHARED_DRIVE_ID,
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

  const approvedDate = submission.approvedAt?.toDate
    ? submission.approvedAt.toDate()
    : new Date()

  const fiscalYearStartMonth = settings.fiscalYearStartMonth ?? 6
  const yearLabel = getFiscalYearLabel(approvedDate, fiscalYearStartMonth)
  const monthName = getMonthName(approvedDate)

  // Find/create: shared drive root → year → month
  const yearFolder = await findOrCreateFolder(drive, SHARED_DRIVE_ID, yearLabel)
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

async function uploadToDriveSetup(yearLabel) {
  const drive = getDriveService()

  const yearFolder = await findOrCreateFolder(drive, SHARED_DRIVE_ID, yearLabel)

  const monthFolders = []
  for (const month of MONTHS) {
    const folder = await findOrCreateFolder(drive, yearFolder.id, month)
    monthFolders.push({ name: month, id: folder.id })
  }

  return { yearFolderId: yearFolder.id, monthFolders }
}

async function updateDriveFile(fileId, pdfBuffer) {
  const drive = getDriveService()
  await drive.files.update({
    fileId,
    media: {
      mimeType: "application/pdf",
      body: Readable.from(pdfBuffer),
    },
    supportsAllDrives: true,
  })
}

module.exports = { uploadToDrive, uploadToDriveSetup, updateDriveFile }
