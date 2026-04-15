import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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
