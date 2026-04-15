import { Timestamp } from "firebase/firestore"

// ─── Roles ───────────────────────────────────────────────────────────────────

export type UserRole = "staff" | "supervisor" | "business_office" | "admin"

// ─── Buildings ───────────────────────────────────────────────────────────────

export interface Building {
  id: string
  name: string
  address?: string
  approverEmail: string
  approverName: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

// ─── Staff Records (imported) ────────────────────────────────────────────────

export interface StaffRecord {
  email: string
  firstName: string
  lastName: string
  employeeId: string
  building: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

// ─── App Settings ────────────────────────────────────────────────────────────

export interface AppSettings {
  senderEmail: string
  senderName: string
  replyToEmail: string
  notifyOnSubmit: boolean
  notifyOnApproval: boolean
  notifyOnDenial: boolean
  notifyOnRevision: boolean
  schoolAddressLabel: string
  schoolAddress: string
  finalApproverEmail: string
  finalApproverName: string
}

// ─── User ────────────────────────────────────────────────────────────────────

export interface UserProfile {
  uid: string
  email: string
  firstName: string
  lastName: string
  fullName: string
  employeeId?: string
  building?: string
  buildingOverride?: string
  supervisorEmail?: string
  homeAddress?: string
  savedSignatureUrl?: string
  photoURL?: string
  role: UserRole
  allowedFormTypes?: string[]
  createdAt: Timestamp
  updatedAt: Timestamp
}

// ─── Budget Segments ─────────────────────────────────────────────────────────

export type BudgetSegmentType =
  | "fund"
  | "org"
  | "proj"
  | "fin"
  | "course"
  | "obj"

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

export interface MileageTrip {
  date: string
  from: string
  to: string
  purpose: string
  miles: number
  isRoundTrip: boolean
}

export interface MileageData {
  name: string
  employeeId: string
  accountCode: string
  trips: MileageTrip[]
  totalMiles: number
  totalReimbursement: number
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
  advanceRequested: number
  finalClaim: number
}

// ─── Submission ───────────────────────────────────────────────────────────────

export type FormType = "check" | "mileage" | "travel"

export type SubmissionStatus =
  | "pending"
  | "reviewed"
  | "approved"
  | "denied"
  | "revisions_requested"

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

export interface Submission {
  id: string
  formType: FormType
  status: SubmissionStatus

  // People
  submitterUid: string
  submitterEmail: string
  submitterName: string
  supervisorEmail: string
  approverEmail?: string

  // Form data (type-specific)
  formData: CheckRequestData | MileageData | TravelData

  // Signatures
  employeeSignatureUrl?: string
  approverSignatureUrl?: string

  // Attachments
  attachments: Attachment[]

  // PDF
  pdfDriveId?: string
  pdfDriveUrl?: string

  // Workflow
  revisionComments?: string
  denialComments?: string
  revisionHistory: RevisionHistoryEntry[]

  // Denormalized summary fields
  summary: string
  amount: number

  // Timestamps
  createdAt: Timestamp
  updatedAt: Timestamp
  approvedAt?: Timestamp
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
