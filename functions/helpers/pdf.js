const PDFDocument = require("pdfkit")
const https = require("https")
const sharp = require("sharp")
const { PDFDocument: PDFLib, rgb, degrees } = require("pdf-lib")

const MILEAGE_RATE = 0.725

const FORM_LABELS = {
  check: "Check Request",
  mileage: "Mileage Reimbursement",
  travel: "Travel Reimbursement",
}

const NAVY = "#1d2a5d"
const LABEL_COLOR = "#64748b"
const TEXT_COLOR = "#334155"
const BORDER_COLOR = "#c8ccd4"

function currency(n) {
  return `$${Number(n || 0).toFixed(2)}`
}

function formatDate(d) {
  if (!d) return "—"
  const [y, m, day] = d.split("-")
  return `${m}/${day}/${y}`
}

function formatTimestamp(ts) {
  if (!ts) return "—"
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString("en-US")
}

async function compressReceiptImage(buffer) {
  if (!buffer) return null
  try {
    return await sharp(buffer)
      .rotate()
      .resize({ width: 1600, withoutEnlargement: true })
      .jpeg({ quality: 75, mozjpeg: true })
      .toBuffer()
  } catch {
    return buffer
  }
}

async function fetchImageBuffer(url) {
  if (!url) return null

  // Data URL (base64 signature from canvas)
  if (url.startsWith("data:image")) {
    const base64 = url.split(",")[1]
    if (!base64) return null
    return Buffer.from(base64, "base64")
  }

  // HTTP(S) URL (Firebase Storage)
  return new Promise((resolve) => {
    https
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          resolve(null)
          return
        }
        const chunks = []
        res.on("data", (chunk) => chunks.push(chunk))
        res.on("end", () => resolve(Buffer.concat(chunks)))
        res.on("error", () => resolve(null))
      })
      .on("error", () => resolve(null))
  })
}

// ─── PDF Layout Helpers ──────────────────────────────────────────────────────

function drawHeader(doc, submission) {
  const formLabel = FORM_LABELS[submission.formType] || "Request"

  // Navy banner
  doc.rect(0, 0, doc.page.width, 72).fill(NAVY)
  doc
    .font("Helvetica-Bold")
    .fontSize(18)
    .fillColor("#ffffff")
    .text("Orono Public Schools", 50, 20)
  doc.fontSize(10).text("PaperPal", 50, 42)

  // Right side: submission ID
  doc.fontSize(10).text(submission.id, 50, 28, {
    align: "right",
    width: doc.page.width - 100,
  })

  doc.fillColor(TEXT_COLOR)
  doc.y = 90

  // Form type + submitter info
  doc.font("Helvetica-Bold").fontSize(14).fillColor(NAVY).text(formLabel, 50)
  doc.moveDown(0.3)
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor(LABEL_COLOR)
    .text(
      `Submitted by ${submission.submitterName} · ${formatTimestamp(submission.createdAt)} · ${currency(submission.amount)}`,
      50
    )
  doc.moveDown(1)
}

function drawField(doc, label, value, x, y, width) {
  doc
    .font("Helvetica-Bold")
    .fontSize(7)
    .fillColor(LABEL_COLOR)
    .text(label.toUpperCase(), x, y, { width })
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor(TEXT_COLOR)
    .text(value || "—", x, y + 10, { width })
}

function drawFieldRow(doc, fields, y) {
  const margin = 50
  const pageWidth = doc.page.width - margin * 2
  const colWidth = pageWidth / fields.length
  for (let i = 0; i < fields.length; i++) {
    drawField(
      doc,
      fields[i][0],
      fields[i][1],
      margin + i * colWidth,
      y,
      colWidth - 10
    )
  }
  return y + 28
}

function drawSectionHeading(doc, title) {
  doc.moveDown(0.5)
  doc
    .font("Helvetica-Bold")
    .fontSize(8)
    .fillColor(NAVY)
    .text(title.toUpperCase(), 50)
  doc.moveDown(0.3)
}

function drawTableHeaders(doc, headers, colWidths, startX) {
  const y = doc.y
  doc.font("Helvetica-Bold").fontSize(7).fillColor(LABEL_COLOR)
  let x = startX
  for (let i = 0; i < headers.length; i++) {
    doc.text(headers[i], x, y, { width: colWidths[i] })
    x += colWidths[i]
  }
  doc.y = y + 12
  doc
    .moveTo(startX, doc.y)
    .lineTo(startX + colWidths.reduce((a, b) => a + b, 0), doc.y)
    .strokeColor(BORDER_COLOR)
    .lineWidth(0.5)
    .stroke()
  doc.y += 4
}

function drawTableRow(doc, cells, colWidths, startX, bold) {
  const y = doc.y
  const font = bold ? "Helvetica-Bold" : "Helvetica"
  doc
    .font(font)
    .fontSize(8)
    .fillColor(bold ? NAVY : TEXT_COLOR)

  // Measure the tallest cell
  let maxH = 12
  for (let i = 0; i < cells.length; i++) {
    const h = doc.heightOfString(String(cells[i] ?? ""), {
      width: colWidths[i] - 4,
    })
    if (h > maxH) maxH = h
  }

  let x = startX
  for (let i = 0; i < cells.length; i++) {
    doc.text(String(cells[i] ?? ""), x, y, { width: colWidths[i] - 4 })
    x += colWidths[i]
  }
  doc.y = y + maxH + 4
  doc
    .moveTo(startX, doc.y - 2)
    .lineTo(startX + colWidths.reduce((a, b) => a + b, 0), doc.y - 2)
    .strokeColor(BORDER_COLOR)
    .lineWidth(0.25)
    .stroke()
}

function ensureSpace(doc, needed) {
  if (doc.y + needed > doc.page.height - 80) {
    doc.addPage()
    doc.y = 50
  }
}

async function drawSignatures(doc, submission) {
  ensureSpace(doc, 100)
  doc.moveDown(1)
  drawSectionHeading(doc, "Signatures")

  const sigs = [
    {
      label: "Employee",
      url: submission.employeeSignatureUrl,
      name: submission.submitterName,
      date: submission.createdAt,
    },
    ...(submission.approverEmail
      ? [
          {
            label: "Approver",
            url: submission.approverSignatureUrl,
            name: submission.approverName,
            date: undefined,
          },
        ]
      : []),
    {
      label: "Supervisor",
      url: submission.supervisorSignatureUrl,
      name: submission.supervisorName,
      date: submission.reviewedAt,
    },
    {
      label: "Final Approver",
      url: submission.finalApproverSignatureUrl,
      name: submission.finalApproverEmail,
      date: submission.approvedAt,
    },
  ]

  const startY = doc.y
  const cols = sigs.length
  const colWidth = (doc.page.width - 100) / cols
  const margin = 50

  for (let i = 0; i < sigs.length; i++) {
    const x = margin + i * colWidth
    const sig = sigs[i]

    doc
      .font("Helvetica-Bold")
      .fontSize(7)
      .fillColor(LABEL_COLOR)
      .text(sig.label.toUpperCase(), x, startY)

    const imgBuf = await fetchImageBuffer(sig.url)
    if (imgBuf) {
      try {
        doc.image(imgBuf, x, startY + 12, { width: 120, height: 40 })
      } catch {
        doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor(TEXT_COLOR)
          .text("Signature on file", x, startY + 20)
      }
    } else {
      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor(TEXT_COLOR)
        .text("Not yet signed", x, startY + 20)
    }

    doc
      .font("Helvetica")
      .fontSize(7)
      .fillColor(TEXT_COLOR)
      .text(sig.name || "—", x, startY + 56)
    doc
      .font("Helvetica")
      .fontSize(7)
      .fillColor(LABEL_COLOR)
      .text(formatTimestamp(sig.date), x, startY + 66)
  }

  doc.y = startY + 80
}

// ─── Check Request ───────────────────────────────────────────────────────────

function renderCheckRequest(doc, data) {
  let y = doc.y

  y = drawFieldRow(
    doc,
    [
      ["Date of Request", formatDate(data.dateRequest)],
      ["Date Needed", formatDate(data.dateNeeded)],
    ],
    y
  )

  y = drawFieldRow(
    doc,
    [
      ["Payee", data.payee],
      [
        "Address",
        data.address
          ? `${data.address.street}, ${data.address.city}, ${data.address.state} ${data.address.zip}`
          : "—",
      ],
    ],
    y
  )

  if (data.checkNumber) {
    y = drawFieldRow(
      doc,
      [
        ["Check Number", data.checkNumber],
        ["Vendor ID", data.vendorId],
      ],
      y
    )
  }

  doc.y = y
  drawSectionHeading(doc, "Expenses")

  const colWidths = [140, 220, 80]
  drawTableHeaders(
    doc,
    ["Account Code", "Description", "Amount"],
    colWidths,
    50
  )

  for (const exp of data.expenses || []) {
    ensureSpace(doc, 20)
    drawTableRow(
      doc,
      [exp.code || "—", exp.description || "—", currency(exp.amount)],
      colWidths,
      50
    )
  }

  ensureSpace(doc, 20)
  drawTableRow(
    doc,
    ["", "Grand Total", currency(data.grandTotal)],
    colWidths,
    50,
    true
  )
}

// ─── Mileage Reimbursement ───────────────────────────────────────────────────

function renderMileage(doc, data) {
  let y = doc.y

  y = drawFieldRow(
    doc,
    [
      ["Employee Name", data.name],
      ["Employee ID", data.employeeId],
      ["Account Code", data.accountCode],
    ],
    y
  )

  doc.y = y
  drawSectionHeading(doc, "Trips")

  const colWidths = [50, 130, 130, 90, 50]
  drawTableHeaders(
    doc,
    ["Date", "From", "To", "Purpose", "Miles"],
    colWidths,
    50
  )

  for (const trip of data.trips || []) {
    ensureSpace(doc, 20)
    const effectiveMiles = trip.isRoundTrip ? trip.miles * 2 : trip.miles
    const milesText = `${effectiveMiles.toFixed(1)}${trip.isRoundTrip ? " RT" : ""}`
    drawTableRow(
      doc,
      [
        formatDate(trip.date),
        trip.from,
        trip.to,
        trip.purpose || "—",
        milesText,
      ],
      colWidths,
      50
    )
  }

  ensureSpace(doc, 20)
  drawTableRow(
    doc,
    ["", "", "", "Total", `${data.totalMiles.toFixed(1)} mi`],
    colWidths,
    50,
    true
  )

  // Summary box
  doc.moveDown(0.5)
  ensureSpace(doc, 30)
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor(LABEL_COLOR)
    .text(
      `${data.totalMiles.toFixed(1)} mi × $${MILEAGE_RATE.toFixed(3)} = `,
      50,
      doc.y,
      { continued: true }
    )
  doc
    .font("Helvetica-Bold")
    .fillColor(NAVY)
    .text(currency(data.totalReimbursement))
}

// ─── Travel Reimbursement ────────────────────────────────────────────────────

function renderTravel(doc, data) {
  let y = doc.y

  y = drawFieldRow(
    doc,
    [
      ["Employee Name", data.name],
      ["Employee ID", data.employeeId],
      ["Form Date", formatDate(data.formDate)],
    ],
    y
  )

  y = drawFieldRow(
    doc,
    [
      ["Address", data.address],
      ["Budget Year", data.budgetYear],
    ],
    y
  )

  y = drawFieldRow(doc, [["Account Code", data.accountCode]], y)

  y = drawFieldRow(
    doc,
    [
      ["Meeting / Conference Title", data.meetingTitle],
      ["Location", data.location],
    ],
    y
  )

  y = drawFieldRow(
    doc,
    [
      [
        "Dates Away",
        `${formatDate(data.dateStart)} – ${formatDate(data.dateEnd)}`,
      ],
      [
        "Time Away",
        data.timeAwayStart && data.timeAwayEnd
          ? `${data.timeAwayStart} – ${data.timeAwayEnd}`
          : "—",
      ],
    ],
    y
  )

  if (data.justification) {
    doc.y = y
    doc
      .font("Helvetica-Bold")
      .fontSize(7)
      .fillColor(LABEL_COLOR)
      .text("JUSTIFICATION", 50)
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(TEXT_COLOR)
      .text(data.justification, 50, doc.y + 2, { width: doc.page.width - 100 })
    doc.moveDown(0.5)
  } else {
    doc.y = y
  }

  const CATEGORY_LABELS = {
    meal: "Meal",
    lodging: "Lodging",
    registration: "Registration",
    airfare: "Airfare",
    other_transport: "Other Transportation",
  }

  if (data.expenses && data.expenses.length > 0) {
    // New format: unified expenses table (mileage included as a row)
    doc.moveDown(0.5)
    ensureSpace(doc, 40)
    drawSectionHeading(doc, "Expenses")
    const expCols = [60, 90, 130, 70]
    drawTableHeaders(doc, ["Date", "Category", "Detail", "Amount"], expCols, 50)

    let expTotal = 0

    if (data.carTrips && data.carTrips.length > 0) {
      for (const trip of data.carTrips) {
        const effective = trip.isRoundTrip ? trip.miles * 2 : trip.miles
        if (effective <= 0) continue
        const route =
          trip.from && trip.to
            ? `${trip.from} → ${trip.to}${trip.isRoundTrip ? " (round trip)" : ""}`
            : trip.isRoundTrip
              ? "Round trip"
              : "—"
        const detail = `${route}\n${effective.toFixed(1)} mi × $${MILEAGE_RATE.toFixed(3)}`
        ensureSpace(doc, 18)
        drawTableRow(
          doc,
          [
            formatDate(trip.date) || "—",
            "Mileage",
            detail,
            currency(effective * MILEAGE_RATE),
          ],
          expCols,
          50
        )
        expTotal += effective * MILEAGE_RATE
      }
    } else if (data.actuals.miles > 0) {
      const mileageCost = data.actuals.miles * MILEAGE_RATE
      ensureSpace(doc, 18)
      drawTableRow(
        doc,
        [
          "—",
          "Mileage",
          `${data.actuals.miles} mi × $${MILEAGE_RATE.toFixed(3)}\n(Per-trip detail not recorded — request resubmission for audit)`,
          currency(mileageCost),
        ],
        expCols,
        50
      )
      expTotal += mileageCost
    }

    for (const exp of data.expenses) {
      ensureSpace(doc, 18)
      const baseDetail = exp.mealType
        ? exp.mealType.charAt(0).toUpperCase() + exp.mealType.slice(1)
        : exp.location || exp.description || "—"
      const detail = exp.notes
        ? `${baseDetail}\nNote: ${exp.notes}`
        : baseDetail
      drawTableRow(
        doc,
        [
          formatDate(exp.date),
          CATEGORY_LABELS[exp.category] || exp.category,
          detail,
          currency(exp.amount),
        ],
        expCols,
        50
      )
      expTotal += exp.amount || 0
    }
    ensureSpace(doc, 18)
    drawTableRow(doc, ["", "", "Total", currency(expTotal)], expCols, 50, true)
  } else {
    // Legacy format: actuals + meals
    doc.moveDown(0.5)
    ensureSpace(doc, 40)
    drawSectionHeading(doc, "Actual Expenses")
    const actCols = [200, 100]
    drawTableHeaders(doc, ["Category", "Amount"], actCols, 50)

    const actRows = [
      [
        `Miles (${data.actuals.miles} × $${MILEAGE_RATE.toFixed(3)})`,
        currency(data.actuals.miles * MILEAGE_RATE),
      ],
      ["Other Transport", currency(data.actuals.otherTransport)],
      ["Lodging", currency(data.actuals.lodging)],
      ["Registration", currency(data.actuals.registration)],
    ]
    for (const [label, amount] of actRows) {
      ensureSpace(doc, 18)
      drawTableRow(doc, [label, amount], actCols, 50)
    }
    for (const item of data.actuals.others || []) {
      ensureSpace(doc, 18)
      drawTableRow(
        doc,
        [item.desc || "Other", currency(item.amount)],
        actCols,
        50
      )
    }
    ensureSpace(doc, 18)
    drawTableRow(doc, ["Meals", currency(data.actuals.mealTotal)], actCols, 50)
    ensureSpace(doc, 18)
    drawTableRow(
      doc,
      ["Total", currency(data.actuals.total)],
      actCols,
      50,
      true
    )

    if (data.meals && data.meals.length > 0) {
      doc.moveDown(0.5)
      ensureSpace(doc, 40)
      drawSectionHeading(doc, "Meals")
      const mealCols = [80, 70, 70, 70, 80]
      drawTableHeaders(
        doc,
        ["Date", "Breakfast", "Lunch", "Dinner", "Day Total"],
        mealCols,
        50
      )

      let mealGrandTotal = 0
      for (const meal of data.meals) {
        ensureSpace(doc, 18)
        const dayTotal = meal.breakfast + meal.lunch + meal.dinner
        mealGrandTotal += dayTotal
        drawTableRow(
          doc,
          [
            formatDate(meal.date),
            currency(meal.breakfast),
            currency(meal.lunch),
            currency(meal.dinner),
            currency(dayTotal),
          ],
          mealCols,
          50
        )
      }
      ensureSpace(doc, 18)
      drawTableRow(
        doc,
        ["", "", "", "Meal Total", currency(mealGrandTotal)],
        mealCols,
        50,
        true
      )
    }
  }

  // Advance / Final Claim
  if (data.advanceRequested > 0 || data.finalClaim > 0) {
    doc.moveDown(0.5)
    ensureSpace(doc, 30)
    if (data.advanceRequested > 0) {
      drawFieldRow(
        doc,
        [
          ["Advance Requested", currency(data.advanceRequested)],
          data.finalClaim > 0
            ? ["Final Claim", currency(data.finalClaim)]
            : ["", ""],
        ],
        doc.y
      )
    } else if (data.finalClaim > 0) {
      drawFieldRow(doc, [["Final Claim", currency(data.finalClaim)]], doc.y)
    }
  }
}

// ─── Main Export ─────────────────────────────────────────────────────────────

async function generatePdf(submission) {
  const doc = new PDFDocument({ size: "LETTER", margin: 50 })
  const chunks = []
  doc.on("data", (chunk) => chunks.push(chunk))

  drawHeader(doc, submission)

  const formData = submission.formData
  switch (submission.formType) {
    case "check":
      renderCheckRequest(doc, formData)
      break
    case "mileage":
      renderMileage(doc, formData)
      break
    case "travel":
      renderTravel(doc, formData)
      break
  }

  await drawSignatures(doc, submission)

  // Footer
  doc.moveDown(1)
  doc
    .font("Helvetica")
    .fontSize(7)
    .fillColor(LABEL_COLOR)
    .text(
      `Generated by PaperPal · ${new Date().toLocaleDateString("en-US")}`,
      50,
      doc.y,
      {
        align: "center",
        width: doc.page.width - 100,
      }
    )

  // Collect all attachments to append as pages
  // 1. Travel expense item receipts (new format)
  const expenseReceipts = (formData.expenses || [])
    .filter((e) => e.receipt?.url)
    .map((e) => ({
      label: `Receipt: ${
        {
          meal: "Meal",
          lodging: "Lodging",
          registration: "Registration",
          other_transport: "Other Transportation",
        }[e.category] || e.category
      } — ${formatDate(e.date)} — ${currency(e.amount)}`,
      url: e.receipt.url,
      mimeType: e.receipt.mimeType,
    }))

  // 2. Submission-level attachments (check request receipts, justification files, etc.)
  const submissionAttachments = (submission.attachments || [])
    .filter((a) => a.url)
    .map((a, i) => ({
      label: `Attachment ${i + 1}: ${a.name}`,
      url: a.url,
      mimeType: a.mimeType,
    }))

  const allAttachments = [...expenseReceipts, ...submissionAttachments]

  for (const att of allAttachments) {
    if (att.mimeType?.startsWith("image/")) {
      const rawBuf = await fetchImageBuffer(att.url)
      const imgBuf = await compressReceiptImage(rawBuf)
      if (imgBuf) {
        doc.addPage()
        doc
          .font("Helvetica-Bold")
          .fontSize(10)
          .fillColor(NAVY)
          .text(att.label, 50, 40)
        try {
          const maxW = doc.page.width - 100
          const maxH = doc.page.height - 120
          doc.image(imgBuf, 50, 65, { fit: [maxW, maxH] })
        } catch {
          doc
            .font("Helvetica")
            .fontSize(9)
            .fillColor(TEXT_COLOR)
            .text("(Image could not be embedded)", 50, 70)
        }
      }
    }
    // PDF attachments handled after PDFKit finishes via pdf-lib merge
  }

  doc.end()

  const pdfKitBuffer = await new Promise((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)))
    doc.on("error", reject)
  })

  // Merge any PDF attachments using pdf-lib
  const pdfAttachments = allAttachments.filter(
    (a) => a.mimeType === "application/pdf" && a.url
  )
  if (pdfAttachments.length === 0) return pdfKitBuffer

  try {
    const merged = await PDFLib.load(pdfKitBuffer)

    for (const item of pdfAttachments) {
      const buf = await fetchImageBuffer(item.url)
      if (!buf) continue
      try {
        const externalPdf = await PDFLib.load(buf)
        const pages = await merged.copyPages(
          externalPdf,
          externalPdf.getPageIndices()
        )
        for (const page of pages) {
          merged.addPage(page)
        }
      } catch {
        // Skip unreadable PDFs
      }
    }

    const mergedBytes = await merged.save()
    return Buffer.from(mergedBytes)
  } catch {
    return pdfKitBuffer
  }
}

async function stampPaidWatermark(pdfBuffer) {
  const pdfDoc = await PDFLib.load(pdfBuffer)
  const pages = pdfDoc.getPages()

  for (const page of pages) {
    const { width, height } = page.getSize()
    const text = "PAID"
    const fontSize = 120

    page.drawText(text, {
      x: width / 2 - 180,
      y: height / 2 - 40,
      size: fontSize,
      color: rgb(0.02, 0.6, 0.4),
      opacity: 0.12,
      rotate: degrees(-35),
    })
  }

  const stamped = await pdfDoc.save()
  return Buffer.from(stamped)
}

module.exports = { generatePdf, stampPaidWatermark }
