import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { ActivityAction, AppSettings, Submission } from "./types"

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
