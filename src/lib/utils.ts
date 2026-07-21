import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type {
  ActivityAction,
  AppSettings,
  Attachment,
  FieldChange,
  Submission,
} from "./types"

export function getCurrentAssignee(
  submission: Submission,
  settings: AppSettings | null
): { label: string; email: string; name?: string } | null {
  switch (submission.status) {
    case "pending":
      if (submission.approverEmail) {
        return {
          label: "Approver",
          email: submission.approverEmail,
          name: submission.approverName,
        }
      }
      return {
        label: "Supervisor",
        email: submission.supervisorEmail,
        name: submission.supervisorName,
      }
    case "approved_by_approver":
      return {
        label: "Supervisor",
        email: submission.supervisorEmail,
        name: submission.supervisorName,
      }
    case "reviewed":
      return {
        label: "Final Approver",
        email: settings?.finalApproverEmail ?? "",
        name: settings?.finalApproverName,
      }
    case "revisions_requested":
      return {
        label: "Submitter",
        email: submission.submitterEmail,
        name: submission.submitterName,
      }
    default:
      return null
  }
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function editActionForRole(
  editorEmail: string,
  approverEmail: string | undefined,
  supervisorEmail: string | undefined
): Extract<
  ActivityAction,
  "edited_by_approver" | "edited_by_supervisor" | "edited_by_controller"
> {
  const e = editorEmail.toLowerCase()
  if (approverEmail && e === approverEmail.toLowerCase())
    return "edited_by_approver"
  if (supervisorEmail && e === supervisorEmail.toLowerCase())
    return "edited_by_supervisor"
  return "edited_by_controller"
}

const MAX_CHANGES = 50

function humanizeKey(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim()
}

function formatDiffValue(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—"
  if (typeof v === "boolean") return v ? "Yes" : "No"
  if (typeof v === "number") return String(v)
  if (typeof v === "string") return v.length > 80 ? v.slice(0, 77) + "…" : v
  return ""
}

function isAttachmentLike(v: unknown): v is Attachment {
  return (
    typeof v === "object" &&
    v !== null &&
    "name" in v &&
    "url" in v &&
    "mimeType" in v
  )
}

// One-line summary of a row object, for added/removed array rows
function summarizeRow(row: unknown): string {
  if (row === null || typeof row !== "object") return formatDiffValue(row)
  if (isAttachmentLike(row)) return row.name
  const parts = Object.values(row)
    .filter((v) => typeof v !== "object" || v === null)
    .map(formatDiffValue)
    .filter((s) => s !== "—")
  const joined = parts.join(" · ")
  return joined.length > 100 ? joined.slice(0, 97) + "…" : joined || "—"
}

function collectChanges(
  before: unknown,
  after: unknown,
  label: string,
  out: FieldChange[]
): void {
  if (out.length >= MAX_CHANGES) return

  if (isAttachmentLike(before) || isAttachmentLike(after)) {
    const b = isAttachmentLike(before) ? before.name : "—"
    const a = isAttachmentLike(after) ? after.name : "—"
    if (b !== a) out.push({ field: label, from: b, to: a })
    return
  }

  if (Array.isArray(before) || Array.isArray(after)) {
    const b = Array.isArray(before) ? before : []
    const a = Array.isArray(after) ? after : []
    const len = Math.max(b.length, a.length)
    for (let i = 0; i < len; i++) {
      const rowLabel = `${label} ${i + 1}`
      if (i >= b.length) {
        out.push({
          field: `${rowLabel} (added)`,
          from: "—",
          to: summarizeRow(a[i]),
        })
      } else if (i >= a.length) {
        out.push({
          field: `${rowLabel} (removed)`,
          from: summarizeRow(b[i]),
          to: "—",
        })
      } else {
        collectChanges(b[i], a[i], rowLabel, out)
      }
    }
    return
  }

  if (
    typeof before === "object" &&
    before !== null &&
    typeof after === "object" &&
    after !== null
  ) {
    const keys = new Set([...Object.keys(before), ...Object.keys(after)])
    for (const key of keys) {
      collectChanges(
        (before as Record<string, unknown>)[key],
        (after as Record<string, unknown>)[key],
        label ? `${label} · ${humanizeKey(key)}` : humanizeKey(key),
        out
      )
    }
    return
  }

  const b = formatDiffValue(before)
  const a = formatDiffValue(after)
  if (b !== a) out.push({ field: label, from: b, to: a })
}

/**
 * Field-level diff between two versions of a submission's form data +
 * attachments, for the activity log. Returns human-readable labels and values.
 */
export function diffSubmissionChanges(
  before: { formData: unknown; attachments?: Attachment[] },
  after: { formData: unknown; attachments?: Attachment[] }
): FieldChange[] {
  const out: FieldChange[] = []
  collectChanges(before.formData, after.formData, "", out)

  const beforeNames = (before.attachments ?? []).map((r) => r.name).join(", ")
  const afterNames = (after.attachments ?? []).map((r) => r.name).join(", ")
  if (beforeNames !== afterNames) {
    out.push({
      field: "Receipts",
      from: beforeNames || "—",
      to: afterNames || "—",
    })
  }

  return out.slice(0, MAX_CHANGES)
}

/**
 * Auto-formats a budget code string as ##-###-###-###-###-###
 * Strips non-digits, inserts dashes at the right positions.
 */
export function formatBudgetCode(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, "").slice(0, 17)
  const breaks = [2, 5, 8, 11, 14]
  let result = ""
  for (let i = 0; i < digits.length; i++) {
    if (breaks.includes(i)) result += "-"
    result += digits[i]
  }
  return result
}
