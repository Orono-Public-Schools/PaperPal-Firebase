import type { BudgetSegment } from "./types"

/**
 * Default Object dimension codes from the MN UFARS manual,
 * filtered to codes most relevant for school district expense forms.
 */
export const DEFAULT_OBJECT_CODES: BudgetSegment[] = [
  // Purchased Services (most common for expense forms)
  { code: "305", title: "Consulting Fees / Fees for Services" },
  { code: "315", title: "Repairs & Maintenance – Computers/Tech" },
  { code: "316", title: "Services from MN Joint-Powers Agencies" },
  { code: "318", title: "Data Processing & Data Entry Services" },
  { code: "319", title: "Computer & Technology Services" },
  { code: "320", title: "Communication Services" },
  { code: "329", title: "Postage & Parcel Services" },
  { code: "330", title: "Utility Services" },
  { code: "335", title: "Short-Term Lease / Rental" },
  { code: "340", title: "Insurance" },
  { code: "350", title: "Repairs & Maintenance" },
  { code: "360", title: "Transportation Contracts" },
  { code: "366", title: "Travel, Conventions & Conferences" },
  { code: "368", title: "Out-of-State Travel (Federal)" },
  { code: "369", title: "Entry Fees / Student Travel" },
  { code: "380", title: "Short-Term Lease – Computer/Tech Hardware" },
  { code: "389", title: "Staff Tuition & Reimbursements" },
  { code: "390", title: "Payments to Other MN School Districts" },
  { code: "394", title: "Payments to Other Agencies (non-district)" },

  // Supplies & Materials
  { code: "401", title: "Supplies & Materials – Non-Instructional" },
  { code: "405", title: "Non-Instructional Software Licensing" },
  { code: "406", title: "Instructional Software Licensing" },
  { code: "430", title: "Supplies & Materials – Non-Individualized Instructional" },
  { code: "433", title: "Supplies & Materials – Individualized Instruction" },
  { code: "440", title: "Fuels" },
  { code: "455", title: "Non-Instructional Technology Supplies" },
  { code: "456", title: "Instructional Technology Supplies" },
  { code: "460", title: "Textbooks & Workbooks" },
  { code: "465", title: "Non-Instructional Technology Devices" },
  { code: "466", title: "Instructional Technology Devices" },
  { code: "470", title: "Media Resources / Library" },
  { code: "490", title: "Food" },
  { code: "495", title: "Milk" },

  // Capital Expenditures
  { code: "505", title: "Capitalized Non-Instructional Software" },
  { code: "506", title: "Capitalized Instructional Software" },
  { code: "530", title: "Other Equipment Purchased" },
  { code: "555", title: "Capitalized Non-Instructional Tech Hardware" },
  { code: "556", title: "Capitalized Instructional Tech Hardware" },

  // Other
  { code: "820", title: "Dues, Memberships, Licenses & Fees" },
  { code: "899", title: "Miscellaneous Expenditures" },
]
