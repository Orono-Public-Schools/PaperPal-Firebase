import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { ActivityAction } from "./types"

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
