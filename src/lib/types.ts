import { Timestamp } from "firebase/firestore"

// ─── Roles ───────────────────────────────────────────────────────────────────

export type UserRole =
  | "staff"
  | "approver"
  | "supervisor"
  | "business_office"
  | "controller"
  | "admin"

// ─── Buildings ───────────────────────────────────────────────────────────────

export interface Building {
  id: string
  name: string
  initials: string
  address?: string
  approverEmail?: string
  approverName?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

// ─── Staff Records (imported) ────────────────────────────────────────────────

export interface StaffRecord {
  email: string
  firstName: string
  lastName: string
  employeeId: string
  title: string
  building: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

// ─── Workflow Mapping ───────────────────────────────────────────────────────

export interface SupervisorMapping {
  titles: string[]
  supervisorEmail: string
  supervisorName: string
  approverEmail?: string
  approverName?: string
}

export interface BuildingSupervisorMapping {
  building: string
  buildingName: string
  supervisorEmail: string
  supervisorName: string
  approverEmail?: string
  approverName?: string
}

// ─── App Settings ────────────────────────────────────────────────────────────

export interface MileageRateEntry {
  effective: string // YYYY-MM-DD — applies to trips on/after this date
  rate: number // $/mile
}

export interface AppSettings {
  senderEmail: string
  senderName: string
  replyToEmail: string
  mileageRates: MileageRateEntry[]
  notifyOnSubmit: boolean
  notifyOnApproval: boolean
  notifyOnDenial: boolean
  notifyOnRevision: boolean
  reviewerRemindersEnabled: boolean
  reviewerReminderDays: number // idle days before the daily job nudges the current reviewer
  schoolAddressLabel: string
  schoolAddress: string
  finalApproverEmail: string
  finalApproverName: string
  fiscalYearStartMonth: number // 0-indexed (6 = July)
  commuteDeductionEnabled?: boolean
  closerOriginEnabled?: boolean // measure home legs from school when school is closer
  paperpalDriveFolderId?: string
  paperpalLogSheetId?: string
  staffSheetId?: string
  staffSheetRange?: string // e.g. "Sheet1!A2:H"
  staffSyncEnabled?: boolean
  staffSyncHour?: number // 0-23, hour of day (Central time)
  lastStaffSync?: Timestamp
}

// ─── User ────────────────────────────────────────────────────────────────────

export interface UserProfile {
  uid: string
  email: string
  firstName: string
  lastName: string
  fullName: string
  employeeId?: string
  title?: string
  building?: string
  buildingOverride?: string
  supervisorEmail?: string
  supervisorSource?: "mapping" | "manual" // "manual" = set by the user on Profile; never overwritten by mappings
  homeAddress?: string
  commuteMiles?: number
  commuteCachedHomeAddress?: string
  commuteCachedSchoolAddress?: string
  savedSignatureUrl?: string
  recentBudgetCodes?: string[]
  photoURL?: string
  onboardedAt?: Timestamp // set when the first-login welcome has been shown
  role: UserRole
  allowedFormTypes?: string[]
  createdAt: Timestamp
  updatedAt: Timestamp
}

// ─── Budget Segments ─────────────────────────────────────────────────────────

export type BudgetSegmentType =
  "fund" | "org" | "proj" | "fin" | "course" | "obj"

export interface BudgetSegment {
  code: string
  title: string
}

export interface BudgetSegmentCategory {
  type: BudgetSegmentType
  segments: BudgetSegment[]
  updatedAt: Timestamp
}

// ─── Form Type Config ────────────────────────────────────────────────────────

export interface FormTypeConfig {
  id: string
  title: string
  icon: string
  description: string
  finalRecipientEmail: string
  finalRecipientName: string
  isActive: boolean
  sortOrder: number
  createdAt: Timestamp
}

// ─── Form-Specific Data ───────────────────────────────────────────────────────

export interface CheckRequestExpense {
  code: string
  description: string
  amount: number
}

export interface CheckRequestData {
  dateRequest: string
  dateNeeded: string
  checkNumber?: string
  vendorId?: string
  payee: string
  address: {
    street: string
    city: string
    state: string
    zip: string
  }
  expenses: CheckRequestExpense[]
  grandTotal: number
}

export interface TripLeg {
  from: string
  to: string
  miles: number
  measuredFrom?: string // school label when the leg was measured from school because school is closer to the far end than home
  homeMiles?: number // miles of the leg as driven from/to home, kept for reference
}

// A trip is a point of departure, any stops along the way, and a return
// destination; district policy asks staff to state departure and return.
// legs holds one entry per segment in driving order with the miles used.
export interface TripRoute {
  start: string
  stops: string[]
  end: string // equals start when returnToStart
  returnToStart: boolean
  legs: TripLeg[]
}

export interface TripBase {
  date: string
  miles: number // total miles across all legs; on legacy trips, one-way miles
  isWorkingDay?: boolean
  rate?: number // $/mile stamped at submit from the rate table by trip date
  commuteDeduction?: number // miles deducted from this trip, stamped at submit
  route?: TripRoute
  // Legacy single-leg trips (submitted before Oct 2026) stored one From/To
  // and a round-trip flag. Read through src/lib/route.ts, never directly.
  from?: string
  to?: string
  isRoundTrip?: boolean
  measuredFrom?: string
  homeMiles?: number
}

export interface MileageTrip extends TripBase {
  purpose: string
}

export interface MileageData {
  name: string
  employeeId: string
  accountCode: string
  trips: MileageTrip[]
  totalMiles: number
  totalReimbursement: number
  commuteMilesUsed?: number
  totalCommuteDeduction?: number
  reimbursableMiles?: number
  commuteHomeAddress?: string
}

export interface TravelExpenseItem {
  category: "meal" | "lodging" | "registration" | "airfare" | "other_transport"
  date: string
  amount: number
  mealType?: "breakfast" | "lunch" | "dinner"
  location?: string
  description?: string
  notes?: string
  receipt?: Attachment
}

export interface TravelMeal {
  date: string
  breakfast: number
  lunch: number
  dinner: number
}

export interface TravelActualOther {
  desc: string
  amount: number
}

export type TravelCarTrip = TripBase

export interface TravelData {
  name: string
  employeeId: string
  formDate: string
  address: string
  budgetYear: string
  accountCode: string
  meetingTitle: string
  location: string
  dateStart: string
  dateEnd: string
  timeAwayStart: string
  timeAwayEnd: string
  justification: string
  estimated: {
    transport: number
    lodging: number
    meals: number
    registration: number
    substitute: number
    other: number
    total: number
  }
  actuals: {
    miles: number
    otherTransport: number
    lodging: number
    registration: number
    others: TravelActualOther[]
    mealTotal: number
    total: number
  }
  meals: TravelMeal[]
  expenses?: TravelExpenseItem[]
  carTrips?: TravelCarTrip[]
  taxExemptAcknowledged?: boolean
  advanceRequested: number
  finalClaim: number
  commuteMilesUsed?: number
  totalCommuteDeduction?: number
  reimbursableMiles?: number
  commuteHomeAddress?: string
}

// ─── Submission ───────────────────────────────────────────────────────────────

export type FormType = "check" | "mileage" | "travel"

export type SubmissionStatus =
  | "pending"
  | "approved_by_approver"
  | "reviewed"
  | "approved"
  | "paid"
  | "denied"
  | "revisions_requested"
  | "cancelled"

export interface RevisionHistoryEntry {
  comments: string
  requestedBy: string
  requestedAt: Timestamp
  resubmittedAt?: Timestamp
}

export interface Attachment {
  name: string
  url: string
  mimeType: string
  size: number
}

export type ActivityAction =
  | "submitted"
  | "resubmitted"
  | "approver_approved"
  | "supervisor_approved"
  | "final_approved"
  | "denied"
  | "revisions_requested"
  | "cancelled"
  | "redirected"
  | "marked_as_paid"
  | "unmarked_as_paid"
  | "returned_to_supervisor"
  | "edited_by_approver"
  | "edited_by_supervisor"
  | "edited_by_controller"

export interface FieldChange {
  field: string
  from: string
  to: string
}

export interface ActivityLogEntry {
  action: ActivityAction
  by: string
  at: Timestamp
  comments?: string
  changes?: FieldChange[]
}

export interface Submission {
  id: string
  formType: FormType
  status: SubmissionStatus

  // People
  submitterUid: string
  submitterEmail: string
  submitterName: string
  approverEmail?: string
  approverName?: string
  supervisorEmail: string
  supervisorName?: string
  finalApproverEmail?: string

  // Form data (type-specific)
  formData: CheckRequestData | MileageData | TravelData

  // Signatures
  employeeSignatureUrl?: string
  approverSignatureUrl?: string
  supervisorSignatureUrl?: string
  finalApproverSignatureUrl?: string

  // Attachments
  attachments: Attachment[]

  // PDF
  pdfDriveId?: string
  pdfDriveUrl?: string
  approvalProcessingError?: string

  // Workflow
  revisionComments?: string
  denialComments?: string
  revisionHistory: RevisionHistoryEntry[]
  activityLog: ActivityLogEntry[]

  // Sandbox + visibility
  sandbox?: boolean
  hiddenBySubmitter?: boolean

  // Denormalized summary fields
  summary: string
  amount: number

  // Timestamps
  createdAt: Timestamp
  updatedAt: Timestamp
  reviewedAt?: Timestamp
  approvedAt?: Timestamp
  paidAt?: Timestamp
  paidBy?: string
  lastReminderAt?: Timestamp
}

// ─── Form Field Config ──────────────────────────────────────────────────────

export interface FormFieldConfig {
  id: string
  label: string
  visible: boolean
  sortOrder: number
  locked: boolean // true = always visible, can't hide
}

// ─── Mail ────────────────────────────────────────────────────────────────────

export interface MailDocument {
  to: string | string[]
  message: {
    subject: string
    html: string
  }
  createdAt: Timestamp
}
