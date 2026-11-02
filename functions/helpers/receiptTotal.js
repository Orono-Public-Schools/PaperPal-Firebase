// Finds the amount paid in OCR text from a receipt. Subtotals are excluded, and
// the largest labelled amount wins so a total printed before the tip loses to
// the one printed after it, and "Total: 3 items" loses to the real total.
const LABELLED_TOTAL =
  /(?<![a-z])(?<!sub[\s-])(?:total|amount\s*due|balance\s*due)[:\s]*\$?\s*([\d,]+\.?\d{0,2})/gi
const DOLLAR_AMOUNT = /\$\s*([\d,]+\.\d{2})/g

function largestAmount(text, pattern) {
  let largest = 0
  for (const match of text.matchAll(pattern)) {
    const amount = parseFloat(match[1].replace(/,/g, ""))
    if (amount > largest && amount < 10000) largest = amount
  }
  return largest
}

function parseReceiptTotal(text) {
  const amount =
    largestAmount(text, LABELLED_TOTAL) || largestAmount(text, DOLLAR_AMOUNT)
  return amount > 0 ? amount : null
}

module.exports = { parseReceiptTotal }
