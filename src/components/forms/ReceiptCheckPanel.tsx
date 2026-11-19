import { FileText } from "lucide-react"
import type {
  Attachment,
  ReceiptCheck,
  ReceiptCheckResult,
  Submission,
  TravelData,
} from "@/lib/types"

const GOOD = { background: "#eaecf5", color: "#1d2a5d" }
const WARN = { background: "#fef3c7", color: "#92400e" }
const BAD = { background: "rgba(173,33,34,0.08)", color: "#ad2122" }

function currency(n: number) {
  return `$${n.toFixed(2)}`
}

function Flag({
  children,
  style,
}: {
  children: React.ReactNode
  style: React.CSSProperties
}) {
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase"
      style={style}
    >
      {children}
    </span>
  )
}

function submissionReceipts(
  submission: Submission
): { receipt: Attachment; amount?: number }[] {
  if (submission.formType === "travel") {
    const expenses = (submission.formData as TravelData).expenses ?? []
    return expenses.flatMap((e) =>
      e.receipt ? [{ receipt: e.receipt, amount: e.amount }] : []
    )
  }
  if (submission.formType === "check") {
    return submission.attachments.map((receipt) => ({ receipt }))
  }
  return []
}

function ResultFlags({
  result,
  amount,
}: {
  result: ReceiptCheckResult
  amount?: number
}) {
  if (result.status === "failed") {
    return (
      <p className="text-xs" style={{ color: "#64748b" }}>
        Not read: {result.reason}. Review this one by hand.
      </p>
    )
  }
  const totalDiffers =
    amount !== undefined &&
    typeof result.total === "number" &&
    Math.abs(result.total - amount) >= 0.01
  return (
    <>
      <p className="text-sm font-medium" style={{ color: "#334155" }}>
        {result.merchant || "Unknown merchant"}
        {result.receiptDate && (
          <span className="font-normal" style={{ color: "#64748b" }}>
            {" "}
            · {result.receiptDate}
          </span>
        )}
        {typeof result.total === "number" && (
          <span className="font-normal" style={{ color: "#64748b" }}>
            {" "}
            · {currency(result.total)}
          </span>
        )}
      </p>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {!result.isReceipt && <Flag style={WARN}>May not be a receipt</Flag>}
        <Flag style={result.itemized ? GOOD : WARN}>
          {result.itemized ? "Itemized" : "Not itemized"}
        </Flag>
        <Flag style={result.alcohol ? BAD : GOOD}>
          {result.alcohol ? "Alcohol" : "No alcohol seen"}
        </Flag>
        <Flag style={GOOD}>
          {result.tipShown
            ? `Tip${typeof result.tipAmount === "number" ? ` ${currency(result.tipAmount)}` : " shown"}`
            : "No tip shown"}
        </Flag>
        {totalDiffers && (
          <Flag style={WARN}>{currency(amount)} entered on form</Flag>
        )}
      </div>
      {result.alcohol && !!result.alcoholItems?.length && (
        <p className="mt-1 text-xs" style={{ color: "#ad2122" }}>
          {result.alcoholItems.join(", ")}
        </p>
      )}
      {result.note && (
        <p className="mt-1 text-xs" style={{ color: "#64748b" }}>
          {result.note}
        </p>
      )}
    </>
  )
}

export default function ReceiptCheckPanel({
  submission,
  check,
}: {
  submission: Submission
  check: ReceiptCheck
}) {
  const results = new Map(check.results.map((r) => [r.url, r]))
  const receipts = submissionReceipts(submission)
  if (!receipts.some(({ receipt }) => results.has(receipt.url))) return null

  return (
    <div
      className="mt-6 border-t pt-5"
      style={{ borderColor: "rgba(180,185,195,0.25)" }}
    >
      <p
        className="text-sm font-semibold tracking-widest uppercase"
        style={{ color: "#1d2a5d" }}
      >
        Receipt Check
      </p>
      <p className="mt-1 mb-3 text-xs" style={{ color: "#94a3b8" }}>
        Read by AI to help you review. It can misread a receipt, so open the
        receipt before acting on a flag.
      </p>
      <div
        className="divide-y"
        style={{ borderColor: "rgba(180,185,195,0.25)" }}
      >
        {receipts.map(({ receipt, amount }, i) => {
          const result = results.get(receipt.url)
          return (
            <div
              key={`${receipt.url}-${i}`}
              className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
            >
              <a
                href={receipt.url}
                target="_blank"
                rel="noopener noreferrer"
                title={receipt.name}
                className="flex-shrink-0"
              >
                {receipt.mimeType?.startsWith("image/") ? (
                  <img
                    src={receipt.url}
                    alt="Receipt"
                    className="h-12 w-12 rounded object-cover"
                  />
                ) : (
                  <span
                    className="flex h-12 w-12 items-center justify-center"
                    style={{ color: "#4356a9" }}
                  >
                    <FileText size={22} />
                  </span>
                )}
              </a>
              <div className="min-w-0">
                {result ? (
                  <ResultFlags result={result} amount={amount} />
                ) : (
                  <p className="text-xs" style={{ color: "#64748b" }}>
                    Not checked. Review this one by hand.
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
