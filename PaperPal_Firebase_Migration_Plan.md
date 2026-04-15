# PaperPal Firebase Migration — Implementation Plan

> **Project:** Migrate PaperPal from Google Apps Script + Google Sheets to React/TypeScript + Firebase
> **Owner:** Paul (OMS Technology)
> **Timeline Target:** 3–5 weeks part-time (evenings/weekends)
> **Created:** April 14, 2026

---

## Architecture Decisions (Locked In)

| Decision          | Choice                                                                                              |
| ----------------- | --------------------------------------------------------------------------------------------------- |
| Auth              | Firebase Auth with Google SSO, restricted to `orono.k12.mn.us` + admin override for external emails |
| Database          | Firestore (proper Firestore-native design)                                                          |
| Hosting           | Firebase Hosting + Cloud Functions (all-in-one)                                                     |
| File Storage      | Cloud Storage for uploads/signatures; Google Drive for generated PDFs                               |
| Email             | Firebase Extension "Trigger Email from Firestore"                                                   |
| UI Framework      | React + TypeScript + Vite + shadcn/ui + Tailwind CSS + Lucide icons                                 |
| Form Architecture | Extensible — designed so new form types can be added without structural changes                     |
| Data Migration    | Full migration of all existing Sheets data                                                          |

---

## Phase 1: Project Scaffolding & Firebase Setup

**Estimated effort:** 1 evening (2–3 hours)
**Claude Code can do:** ~95% — you just click buttons in Firebase Console

### 1.1 Firebase Console Setup (Manual — Paul)

**Status:** ✅ Mostly done — items 1, 2 (all sub-items), 4, 5 complete. Item 3 (Trigger Email extension) deferred to before Phase 5.

These steps require browser interaction and cannot be automated:

1. Go to [Firebase Console](https://console.firebase.google.com) and create project `paperpal-orono` (or similar)
2. Enable these services in the console:
   - **Authentication** → Sign-in providers → Google (enable, set your orono.k12.mn.us domain as authorized)
   - **Firestore Database** → Create in production mode, region `us-central1`
   - **Cloud Storage** → Set up default bucket
   - **Hosting** → Set up (will be configured via CLI)
   - **Cloud Functions** → Enable (requires Blaze/pay-as-you-go plan — should be free tier for your usage volume)
3. Install the **"Trigger Email from Firestore"** extension:
   - Extensions → Trigger Email → Install
   - Configure with your SMTP provider (Gmail SMTP with an orono service account, or a free SendGrid tier)
   - Set the Firestore collection to `mail`
   - Set the "From" address to something like `paperpal-noreply@orono.k12.mn.us`
4. Generate a **Firebase service account key** (Settings → Service accounts → Generate new private key) — you'll need this for the migration script later
5. In Google Cloud Console (linked to this Firebase project):
   - Enable the **Google Drive API** (for PDF storage in Drive)
   - Create a service account for Drive operations (or reuse the Firebase one)

### 1.2 React + TypeScript Project Scaffold (Claude Code)

**Status:** ✅ Complete — scaffold at `PaperPal-Firebase/`, pushed to `Orono-Public-Schools/PaperPal-Firebase`. Deviations: skipped `tailwind.config.ts` (Tailwind v4 uses CSS-first config); installed single `firebase` package (submodules are import paths, not separate packages); `functions/` workspace deferred to 1.3.

**Prompt for Claude Code:**

> Initialize a new React + TypeScript project using Vite. Set up:
>
> - Tailwind CSS v4 with the OPS brand colors (blue: #2d3f89, dark: #1d2a5d, light: #4356a9, lighter: #eaecf5, red: #ad2122)
> - shadcn/ui with the "New York" style variant
> - Lucide React icons
> - React Router v7 for client-side routing
> - Firebase JS SDK (firebase, @firebase/auth, @firebase/firestore, @firebase/storage, @firebase/functions)
> - The following route structure:
>   - `/` → Dashboard (Index)
>   - `/forms/check` → Check Request form
>   - `/forms/mileage` → Mileage Reimbursement form
>   - `/forms/travel` → Travel Reimbursement form
>   - `/forms/:type/:id` → View/Edit/Approve existing form
>   - `/admin` → Admin panel (future)
> - Fonts: Lexend (primary), Caveat (signatures)
> - Create a `firebase.ts` config file with placeholder values
> - ESLint + Prettier configured

**File structure target:**

```
paperpal-firebase/
├── src/
│   ├── components/           # Shared UI components
│   │   ├── ui/              # shadcn/ui components
│   │   ├── layout/          # Header, Footer, Navigation
│   │   ├── forms/           # Form-specific shared components
│   │   │   ├── SignatureModal.tsx
│   │   │   ├── BudgetCodeBuilder.tsx
│   │   │   ├── FileUpload.tsx
│   │   │   └── ApprovalBar.tsx
│   │   └── common/          # Modal, Loader, etc.
│   ├── pages/               # Route pages
│   │   ├── Dashboard.tsx
│   │   ├── CheckRequest.tsx
│   │   ├── MileageReimbursement.tsx
│   │   ├── TravelReimbursement.tsx
│   │   └── FormView.tsx     # Generic view/approve wrapper
│   ├── hooks/               # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useForm.ts       # Generic form state management
│   │   └── useApproval.ts
│   ├── lib/                 # Utilities
│   │   ├── firebase.ts      # Firebase config & init
│   │   ├── firestore.ts     # Firestore helpers (typed CRUD)
│   │   ├── storage.ts       # Cloud Storage helpers
│   │   └── types.ts         # Shared TypeScript types
│   ├── context/             # React Context providers
│   │   └── AuthContext.tsx
│   ├── styles/
│   │   └── globals.css      # Tailwind imports + custom CSS
│   ├── App.tsx
│   └── main.tsx
├── functions/                # Firebase Cloud Functions
│   ├── src/
│   │   ├── index.ts         # Function exports
│   │   ├── forms/           # Form processing functions
│   │   ├── approval/        # Approval workflow functions
│   │   ├── email/           # Email template helpers
│   │   ├── pdf/             # PDF generation
│   │   └── migration/       # Data migration scripts
│   ├── package.json
│   └── tsconfig.json
├── firebase.json             # Hosting + Functions config
├── firestore.rules           # Security rules
├── firestore.indexes.json    # Composite indexes
├── storage.rules             # Storage security rules
├── .firebaserc               # Project alias
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.ts
```

### 1.3 Firebase CLI Configuration (Claude Code)

**Status:** ✅ Complete — `firebase.json`, `.firebaserc`, `firestore.rules`, `firestore.indexes.json`, `storage.rules`, and `functions/` (TypeScript workspace, Node 22, region `us-central1`) all scaffolded; `npm run build` passes for both root and `functions/`.

**Prompt for Claude Code:**

> Set up Firebase CLI configuration for this project:
>
> - `firebase.json` with Hosting (pointing to `dist/` from Vite build), Cloud Functions (TypeScript), Firestore rules, Storage rules
> - Hosting rewrites: all routes → `/index.html` (SPA)
> - Functions region: `us-central1`
> - Create initial `firestore.rules` that locks everything down (we'll open it up per-collection later)
> - Create initial `storage.rules` that allows authenticated users to read/write to their own paths

### 1.4 Auth Implementation (Claude Code)

**Prompt for Claude Code:**

> Implement Firebase Authentication with Google SSO:
>
> 1. `AuthContext.tsx` — provides current user, loading state, sign-in/sign-out functions
> 2. `useAuth.ts` hook — consumes the context
> 3. Domain restriction logic:
>    - After Google sign-in, check if the email ends with `@orono.k12.mn.us`
>    - If not, check a Firestore collection `allowedExternalEmails` for an override
>    - If neither, sign them out immediately and show an error
> 4. A `ProtectedRoute` wrapper component that redirects to a login page if not authenticated
> 5. A simple Login page with Google sign-in button, OPS branding, and error messaging
> 6. Store user profile in Firestore `users/{uid}` on first login (name, email, photoURL, role: 'staff')

**Cloud Function for domain enforcement (belt and suspenders):**

> Create a Cloud Function `beforeSignIn` (blocking function) that rejects sign-ins from non-orono emails unless they're in the `allowedExternalEmails` collection.

### Phase 1 Deliverable

- [ ] Firebase project created and configured
- [ ] React app runs locally with `npm run dev`
- [ ] Can sign in with Google, domain restriction works
- [ ] Can deploy to Firebase Hosting with `firebase deploy`
- [ ] Authenticated user's name shows in header

---

## Phase 2: Firestore Schema & Data Layer

**Estimated effort:** 1–2 evenings
**Claude Code can do:** ~90%

### 2.1 Firestore Schema Design

This is the Firestore-native redesign of your Sheets backend. Key differences from Sheets: no rigid columns, nested objects are fine, queries replace row scanning.

**Collection: `users/{uid}`**

```typescript
interface UserProfile {
  uid: string
  email: string
  firstName: string
  lastName: string
  fullName: string
  employeeId: string
  building: string
  buildingOverride?: string
  supervisorEmail: string
  savedSignatureUrl?: string // Cloud Storage URL instead of base64
  role: "staff" | "admin" | "business_office"
  allowedFormTypes?: string[] // For future extensibility
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

**Collection: `budgetSegments/{segmentId}`**

```typescript
// Replaces the wide Budget Codes sheet — one doc per segment category
interface BudgetSegmentCategory {
  type: "fund" | "org" | "proj" | "fin" | "course" | "obj"
  segments: Array<{
    code: string
    title: string
  }>
  updatedAt: Timestamp
}
```

> Note: With only 6 documents (one per segment type), this is efficient for reads and the budget builder UI. If segment data grows very large (500+ per type), consider subcollections instead.

**Collection: `formTypes/{formTypeId}`**

```typescript
// Replaces the Forms sheet — extensible for future form types
interface FormTypeConfig {
  id: string // 'check', 'mileage', 'travel'
  title: string // 'Check Request'
  icon: string // Lucide icon name
  description: string
  finalRecipientEmail: string
  finalRecipientName: string
  isActive: boolean
  sortOrder: number
  createdAt: Timestamp
}
```

**Collection: `submissions/{submissionId}`**

```typescript
// UNIFIED collection for ALL form types — replaces 3 separate Responses_ sheets
// This is the key architectural improvement: one collection, filtered by formType
interface Submission {
  id: string // Auto-generated or 'REQ-XXXXX' format
  formType: "check" | "mileage" | "travel" | string // string for future types
  status: "pending" | "reviewed" | "approved" | "denied" | "revisions_requested"

  // People
  submitterUid: string
  submitterEmail: string
  submitterName: string
  supervisorEmail: string
  approverEmail?: string

  // Form Data (type-specific, stored as nested object)
  formData: CheckRequestData | MileageData | TravelData | Record<string, any>

  // Signatures (Cloud Storage URLs)
  employeeSignatureUrl?: string
  approverSignatureUrl?: string

  // Files (Cloud Storage URLs)
  attachments: Array<{
    name: string
    url: string
    mimeType: string
    size: number
  }>

  // PDF (Google Drive)
  pdfDriveId?: string
  pdfDriveUrl?: string

  // Workflow
  revisionComments?: string
  denialComments?: string
  revisionHistory: Array<{
    comments: string
    requestedBy: string
    requestedAt: Timestamp
    resubmittedAt?: Timestamp
  }>

  // Summary fields (denormalized for dashboard queries)
  summary: string // Human-readable one-liner for list views
  amount: number // Primary dollar amount for sorting/display

  // Timestamps
  createdAt: Timestamp
  updatedAt: Timestamp
  approvedAt?: Timestamp
}

// Type-specific form data interfaces
interface CheckRequestData {
  dateRequest: string
  dateNeeded: string
  checkNumber?: string
  vendorId: string
  payee: string
  address: {
    street: string
    city: string
    state: string
    zip: string
  }
  expenses: Array<{
    code: string
    description: string
    amount: number
  }>
  grandTotal: number
}

interface MileageData {
  name: string
  employeeId: string
  accountCode: string
  trips: Array<{
    date: string
    from: string
    to: string
    purpose: string
    miles: number
    isRoundTrip: boolean
  }>
  totalMiles: number
  totalReimbursement: number
}

interface TravelData {
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
    others: Array<{ desc: string; amount: number }>
    mealTotal: number
    total: number
  }
  meals: Array<{
    date: string
    breakfast: number
    lunch: number
    dinner: number
  }>
  advanceRequested: number
  finalClaim: number
}
```

**Collection: `mail/{mailId}`** (consumed by Firebase Extension)

```typescript
interface MailDocument {
  to: string | string[]
  message: {
    subject: string
    html: string
  }
  createdAt: Timestamp
}
```

**Collection: `allowedExternalEmails/{email}`**

```typescript
interface AllowedEmail {
  email: string
  addedBy: string
  reason: string
  createdAt: Timestamp
}
```

### 2.2 Firestore Security Rules (Claude Code)

**Prompt for Claude Code:**

> Write Firestore security rules for the PaperPal schema:
>
> 1. `users` — users can read their own doc, admins can read/write all. Creating own doc allowed on first sign-in.
> 2. `submissions` — authenticated users can create. Users can read their own submissions (submitterUid == auth.uid). Supervisors can read submissions where supervisorEmail matches their email. Business office users (role == 'business_office') can read all. Updates restricted: only supervisor/business_office can change status. Submitter can update only if status is 'revisions_requested'.
> 3. `budgetSegments` — all authenticated users can read. Only admins can write.
> 4. `formTypes` — all authenticated users can read. Only admins can write.
> 5. `mail` — only Cloud Functions can write (deny all client writes). No client reads.
> 6. `allowedExternalEmails` — only admins can read/write.

### 2.3 Firestore Indexes (Claude Code)

**Prompt for Claude Code:**

> Create the composite indexes needed for these query patterns:
>
> 1. Dashboard "My Submissions": `submissions` where `submitterUid == X` ordered by `createdAt desc`
> 2. Dashboard "Pending Approvals": `submissions` where `supervisorEmail == X` AND `status == 'pending'` ordered by `createdAt desc`
> 3. Dashboard "Reviewed for Business Office": `submissions` where `status == 'reviewed'` ordered by `createdAt desc`
> 4. History with status filter: `submissions` where `submitterUid == X` AND `status == Y` ordered by `createdAt desc`

### 2.4 Typed Firestore Helpers (Claude Code)

**Prompt for Claude Code:**

> Create `src/lib/firestore.ts` with typed helper functions using Firebase v9+ modular SDK:
>
> - `createSubmission(data: Partial<Submission>): Promise<string>` — generates REQ-XXXXX ID, sets timestamps
> - `getSubmission(id: string): Promise<Submission | null>`
> - `updateSubmission(id: string, updates: Partial<Submission>): Promise<void>`
> - `getUserSubmissions(uid: string): Promise<Submission[]>`
> - `getPendingApprovals(supervisorEmail: string): Promise<Submission[]>`
> - `getReviewedSubmissions(): Promise<Submission[]>` (for business office)
> - `getUserProfile(uid: string): Promise<UserProfile | null>`
> - `createOrUpdateUserProfile(uid: string, data: Partial<UserProfile>): Promise<void>`
> - `getBudgetSegments(): Promise<Record<string, BudgetSegment[]>>` — with client-side caching
> - `getFormTypes(): Promise<FormTypeConfig[]>`
>   All functions should use the TypeScript interfaces from types.ts.

### Phase 2 Deliverable

- [ ] All TypeScript interfaces defined in `types.ts`
- [ ] Firestore security rules deployed
- [ ] Composite indexes deployed
- [ ] Typed CRUD helpers working and tested against live Firestore
- [ ] Can create and read a test submission from the browser console

---

## Phase 3: Shared Components

**Estimated effort:** 2–3 evenings
**Claude Code can do:** ~95%

### 3.1 Layout Components (Claude Code)

**Prompt for Claude Code:**

> Port the PaperPal layout to React components using shadcn/ui and the OPS brand:
>
> 1. `AppHeader.tsx` — blue header bar with "Orono Public Schools No. 278" title, user welcome badge (from useAuth), navigation links, sign-out button. Match the existing GAS design.
> 2. `AppLayout.tsx` — wraps pages with header, main content area, footer
> 3. `Footer.tsx` — copyright line matching existing
> 4. `NavigationTabs.tsx` — the tab bar from Index.html (New Request, Pending, History) as a reusable component
>
> Use the existing HTML/CSS as reference for exact styling. The OPS brand colors are already in the Tailwind config.

### 3.2 Common Components (Claude Code)

**Prompt for Claude Code:**

> Create these shared components, porting from the existing GAS HTML:
>
> 1. `OpsModal.tsx` — replaces the custom modal system in JavaScript.html. Props: title, message, type (info/success/error/warning), onClose, isOpen. Use shadcn Dialog under the hood but match the existing OPS styling (colored header, icon, centered message). Include the focus trap and escape key behavior.
> 2. `OpsConfirmDialog.tsx` — the confirmation variant with Cancel/Confirm buttons. Props: title, message, type (warning/danger), confirmText, onConfirm, onCancel.
> 3. `FullScreenLoader.tsx` — the loading overlay from JavaScript.html with spinner and message text.
> 4. `StatusBadge.tsx` — renders the colored status pills (Pending=amber, Reviewed=blue, Approved=green, Denied=red, Revisions Requested=orange) with Lucide icons. Props: status string.

### 3.3 Form-Specific Shared Components (Claude Code)

**Prompt for Claude Code:**

> Port these form components from the GAS HTML to React:
>
> 1. `SignatureModal.tsx`
>    - Draw tab with canvas (mouse + touch support)
>    - Type tab with Caveat font preview
>    - Load Saved / Save to Profile buttons
>    - Returns signature as data URL or typed text
>    - Props: isOpen, onClose, onApply(signatureData), savedSignature?
>    - Signatures are uploaded to Cloud Storage, URL returned
> 2. `BudgetCodeBuilder.tsx`
>    - The 6-segment builder modal (Fund, Org, Proj, Fin, Course, Obj)
>    - Fetches segment data from Firestore (via getBudgetSegments hook)
>    - Search/filter within each segment
>    - Click-to-select with auto-advance
>    - Returns formatted code string `##-###-###-###-###-###`
>    - Props: isOpen, onClose, onConfirm(code), initialValue?
> 3. `FileUpload.tsx`
>    - Drag-and-drop zone with click-to-browse
>    - Paste support
>    - File list display with remove buttons
>    - Uploads to Cloud Storage on form submission (not immediately)
>    - Props: files, onFilesChange, disabled?
>    - Returns array of File objects (actual upload happens in submission flow)
> 4. `ApprovalBar.tsx`
>    - Sticky bar at top showing approval actions
>    - Buttons: Deny, Revisions, Review, Approve
>    - Decision modal for comments (deny/revise)
>    - Props: onDecision(decision, signature?, comments?), submissionStatus, userRole
> 5. `SignatureBlock.tsx`
>    - The signature line at the bottom of forms (label, signature display, date)
>    - Click to open SignatureModal if editable
>    - Props: label, signatureUrl?, date?, editable?, onSign?
> 6. `BudgetCodeInput.tsx`
>    - Text input with auto-formatting (##-###-###-###-###-###)
>    - Button to open BudgetCodeBuilder
>    - Props: value, onChange, disabled?

### 3.4 Custom Hooks (Claude Code)

**Prompt for Claude Code:**

> Create these custom React hooks:
>
> 1. `useSubmission(id?: string)` — fetches a single submission by ID, returns { data, loading, error }. Sets up a real-time listener (onSnapshot) so approval status updates live.
> 2. `useDashboard()` — fetches user's submissions + pending approvals in parallel. Returns { mySubmissions, pendingApprovals, reviewedSubmissions, loading }. Uses the current user's email/uid from useAuth.
> 3. `useBudgetSegments()` — fetches and caches budget segment data. Returns { segments, loading }.
> 4. `useFormSubmission(formType: string)` — handles the full submission flow: validate → upload files to Cloud Storage → upload signatures to Cloud Storage → create Firestore submission document → call Cloud Function for email notifications. Returns { submit, isSubmitting, error }.

### Phase 3 Deliverable

- [ ] All shared components render correctly in Storybook or a test page
- [ ] SignatureModal captures and returns both drawn and typed signatures
- [ ] BudgetCodeBuilder fetches real data from Firestore and returns formatted codes
- [ ] FileUpload handles drag-drop, click, and paste
- [ ] All hooks fetch real Firestore data

---

## Phase 4: Form Pages

**Estimated effort:** 2–3 evenings
**Claude Code can do:** ~90% — some visual tweaking likely needed

### 4.1 Generic Form Architecture (Claude Code)

**Prompt for Claude Code:**

> Create a `useFormPage` hook and `FormPageWrapper` component that handles the common logic shared across all three form types:
>
> 1. **Mode detection:** Based on URL params and user role, determine if the form is in:
>    - `new` mode (fresh form, user is submitting)
>    - `view` mode (read-only, viewing a past submission)
>    - `revision` mode (submitter editing after revisions requested)
>    - `approval` mode (supervisor reviewing)
>    - `final_approval` mode (business office final sign-off)
> 2. **Auto-population:** In `new` mode, pre-fill user name, employee ID, date from UserProfile
> 3. **Field locking:** In `view` mode, all fields disabled. In `approval`/`final_approval` mode, most fields disabled but budget code editable. In `revision` mode, all fields enabled.
> 4. **Submission handling:** Calls useFormSubmission with form-specific data transformation
> 5. **Approval handling:** Shows ApprovalBar, handles decision submission via Cloud Function
>
> The hook should return: `{ mode, formData, setFormData, isLocked, canEditBudget, submit, handleApproval }`

### 4.2 Check Request Page (Claude Code)

**Prompt for Claude Code:**

> Port `Check_Request.html` to `CheckRequest.tsx` using the shared components and form architecture:
>
> Reference the existing HTML for exact field layout and styling. Key elements:
>
> - Header box with "Orono ISD # 278 / CHECK REQUEST" title
> - Date fields (request date, date needed, check number)
> - Vendor ID, Payee name, mailing address
> - File upload section
> - Expenses table with dynamic rows (budget code + builder, description, amount)
> - Grand total auto-calculation
> - Employee and Supervisor signature blocks
> - Submit button
>
> Use shadcn/ui Table, Input, Button components. Keep the OPS brand styling.
> The expenses array should be managed with useState and support add/remove rows.
> Use `useFormPage` for mode detection and field locking.
> Use `useFormSubmission('check')` for submission.

### 4.3 Mileage Reimbursement Page (Claude Code)

**Prompt for Claude Code:**

> Port `Mileage_Reimbursement.html` to `MileageReimbursement.tsx`:
>
> Key elements:
>
> - Header with "Mileage Report 2025" and reimbursement total display
> - Employee info (name, ID, account code with builder)
> - Trips table with dynamic rows (date, from, to, purpose, round trip checkbox, miles, row total)
> - Auto-calculate button per row (calls Cloud Function for Google Maps distance)
> - Total miles and total reimbursement at $0.70/mile
> - Employee and Supervisor signature blocks
>
> Reuse all shared components. The trip calculation Cloud Function will be built in Phase 5.

### 4.4 Travel Reimbursement Page (Claude Code)

**Prompt for Claude Code:**

> Port `Travel_Reimbursement.html` to `TravelReimbursement.tsx`:
>
> This is the most complex form. Key elements:
>
> - General info section (name, employee ID, date, address, budget year, account code, supervisor dropdown, meeting title, location, attendance dates, time away dates)
> - Justification section with file upload
> - Two-column expense layout: Estimated (left) vs Actual (right)
> - Estimated: transport, lodging, meals, registration, substitute, other, total, advance requested
> - Actuals: mileage with map calculator, other transport, lodging, registration, dynamic other items, meal expenses table
> - Grand totals section (meal total, total actual, less advance, final claim)
> - Supervisor dropdown populated from Firestore users collection
> - All signature blocks
>
> The supervisor dropdown should query Firestore `users` collection and list all staff.

### 4.5 Dashboard Page (Claude Code)

**Prompt for Claude Code:**

> Port `Index.html` to `Dashboard.tsx`:
>
> Three tabs:
>
> 1. **New Request** — Grid of form type cards (fetched from `formTypes` collection). Each card links to `/forms/{type}`. Show icon, title, description.
> 2. **Pending** — Two sections:
>    - "Actions Required" (amber) — submissions where current user is the supervisor and status is pending, OR current user is business_office and status is reviewed. Each row has "Review & Approve" button linking to `/forms/{type}/{id}`.
>    - "My Pending Requests" — current user's submissions with status pending or revisions_requested. Clickable rows link to form view.
>    - Use skeleton loading animation while data fetches.
> 3. **History / Archive** — All of current user's submissions regardless of status. Search by ID/description, filter by status dropdown, sort by date. Clickable rows.
>
> Use `useDashboard()` hook. Show pending badge on tab when items exist.
> Real-time listeners so approval status updates live without refresh.

### Phase 4 Deliverable

- [ ] All three form pages render with full field layout matching the GAS version
- [ ] Forms can be filled out and submitted to Firestore
- [ ] Dashboard shows real data with all three tabs working
- [ ] View mode correctly loads and displays a past submission
- [ ] Approval mode shows the approval bar with correct buttons
- [ ] Revision mode enables fields and shows revision comments alert

---

## Phase 5: Cloud Functions — Workflow Engine

**Estimated effort:** 2 evenings
**Claude Code can do:** ~90%

### 5.1 Form Submission Processing (Claude Code)

**Prompt for Claude Code:**

> Create a Cloud Function `onSubmissionCreated` triggered by Firestore `onCreate` on `submissions/{submissionId}`:
>
> 1. Determine supervisor: Check user's profile `supervisorEmail` first, then fall back to budget code routing logic (port `determineSupervisor` from PureLogic.js)
> 2. Update the submission document with the resolved `supervisorEmail` if it wasn't set by the client
> 3. Write to `mail` collection to trigger email to:
>    - Submitter: confirmation email with request ID, amount, supervisor name
>    - Supervisor: action required email with link to form
> 4. Email HTML templates should match the existing OPS branded style (port from EmailHelper.js / MileageSubmissionEmail.html)

### 5.2 Approval Processing (Claude Code)

**Prompt for Claude Code:**

> Create a callable Cloud Function `handleApproval`:
>
> Input: `{ submissionId, decision, signatureData?, comments?, updates? }`
>
> Logic:
>
> 1. Verify the caller is the assigned supervisor or business office user
> 2. If `updates` provided (e.g. budget code correction), merge into formData
> 3. If `signatureData` provided, upload to Cloud Storage, get URL
> 4. Update submission status:
>    - `approve` → status: 'approved', set approvedAt, approverSignatureUrl
>    - `reviewed` → status: 'reviewed' (forwarded to business office)
>    - `deny` → status: 'denied', set denialComments
>    - `revise` → status: 'revisions_requested', set revisionComments
> 5. Write to `mail` collection for appropriate notification:
>    - Approve/Deny: notify submitter with final status + PDF link (once generated)
>    - Reviewed: notify business office + notify submitter of progress
>    - Revise: notify submitter with comments and edit link
> 6. If approve or deny: trigger PDF generation (call `generatePdf` helper — Phase 7)

### 5.3 Resubmission Processing (Claude Code)

**Prompt for Claude Code:**

> Create a callable Cloud Function `handleResubmission`:
>
> Input: `{ submissionId, updatedFormData, newFiles?, newSignatureData? }`
>
> Logic:
>
> 1. Verify caller is the original submitter
> 2. Verify current status is 'revisions_requested'
> 3. Upload any new files/signature to Cloud Storage
> 4. Update submission: merge formData, append to revisionHistory, reset status to 'pending'
> 5. Email supervisor that the form has been resubmitted

### 5.4 Distance Calculator (Claude Code)

**Prompt for Claude Code:**

> Create a callable Cloud Function `calculateDistance`:
>
> Input: `{ origin: string, destination: string }`
> Output: `{ miles: number }`
>
> Use the Google Maps Directions API (the Firebase project already has Google Cloud, so the Maps API just needs enabling).
> Port the logic from the GAS `calculateDistance` function. Return miles rounded to 1 decimal.

### 5.5 Supervisor Reminder Scheduler (Claude Code)

**Prompt for Claude Code:**

> Create a scheduled Cloud Function `sendSupervisorReminders` that runs daily at 8 AM CT:
>
> 1. Query all submissions with status 'pending' or 'reviewed'
> 2. Group by supervisorEmail
> 3. Filter to only those pending more than 1 day
> 4. Write batched reminder emails to `mail` collection
> 5. Port the email template from the GAS `sendSupervisorReminders` function

### Phase 5 Deliverable

- [ ] Submitting a form triggers email to submitter and supervisor
- [ ] Approval flow works end-to-end (approve, deny, revise, review)
- [ ] Resubmission after revision works
- [ ] Distance calculator returns accurate miles
- [ ] Daily reminder emails fire on schedule

---

## Phase 6: PDF Generation & Drive Integration

**Estimated effort:** 1–2 evenings
**Claude Code can do:** ~80% — PDF rendering always needs manual tweaking

### 6.1 PDF Generation Cloud Function (Claude Code)

**Prompt for Claude Code:**

> Create a Cloud Function helper `generatePdf` that:
>
> 1. Takes a `Submission` object and decision ('approve' | 'deny')
> 2. Renders a branded HTML template for the form type (port the PDF-mode CSS from the GAS HTML templates)
> 3. Uses Puppeteer (via `puppeteer-core` + `@sparticuz/chromium` for Cloud Functions) to convert HTML to PDF
> 4. Names the file: `{Last, First} - {Form Title} - {APPROVED|DENIED} ON {MM-DD-YYYY}.pdf`
> 5. Uploads to Google Drive using the Drive API (via googleapis npm package):
>    - Main archive folder: "OPS Paperless Forms Archive"
>    - Subfolder: "Approved Forms" or "Denied Forms"
>    - Grant viewer permission to the submitter's email
> 6. Returns the Drive file URL
> 7. Updates the submission document with `pdfDriveId` and `pdfDriveUrl`
>
> For the HTML templates, create simplified React components that render to static HTML (no interactivity needed):
>
> - `CheckRequestPdf.tsx`
> - `MileagePdf.tsx`
> - `TravelPdf.tsx`
>
> These should match the print/PDF styling from the GAS versions (table-based layout, OPS blue header, signature lines, etc.)

### 6.2 PDF Viewer in Frontend (Claude Code)

**Prompt for Claude Code:**

> Add a "View PDF" button to the form view page that:
>
> 1. Only shows when submission status is 'approved' or 'denied'
> 2. Opens the Drive preview URL in a new tab (using the stored `pdfDriveUrl`)
> 3. Shows a loading state while fetching

### Phase 6 Deliverable

- [ ] Approving a form generates a branded PDF
- [ ] PDF is saved to the correct Drive folder
- [ ] Submitter can view the PDF via the portal
- [ ] PDF includes both signatures and all form data

---

## Phase 7: Data Migration

**Estimated effort:** 1 evening for script, 1 evening for verification
**Claude Code can do:** ~85%

### 7.1 Migration Script (Claude Code)

**Prompt for Claude Code:**

> Create a Node.js migration script in `functions/src/migration/migrateFromSheets.ts` that:
>
> 1. Reads from the Google Sheets backend using the Sheets API (service account auth)
> 2. Migrates these sheets:
>
>    **Staff Directory → `users` collection:**
>    - Map columns: First Name, Last Name, Email, Employee ID, Building/Org, Supervisor Email, Saved Signature, Building/Org Override
>    - For signatures stored as base64 in the sheet: upload to Cloud Storage, store URL
>    - Set role: 'staff' for all (manually promote admins and business_office after)
>    - Use email as the lookup key, generate a placeholder UID (will be replaced on first real sign-in)
>
>    **Budget Codes → `budgetSegments` collection:**
>    - Parse the wide column layout (A/B = Fund, D/E = Org, G/H = Proj, etc.)
>    - Create 6 documents, one per segment type
>
>    **Forms → `formTypes` collection:**
>    - Map: Form Title, Form ID, Final Recipient Name, Final Recipient Email
>
>    **Responses_CheckRequest, Responses_Mileage, Responses_Travel → `submissions` collection:**
>    - Parse Raw Data JSON column for full form data
>    - Map Status, Supervisor, Signatures
>    - For signatures stored as DRIVE_ID: prefix, resolve to Cloud Storage upload
>    - Set formType based on source sheet
>    - Generate summary and amount fields for dashboard queries
>    - Preserve original Request IDs
>
> 3. Run in batches (Firestore batch writes, max 500 per batch)
> 4. Log progress and any errors/skipped rows
> 5. Support dry-run mode (log what would be written without actually writing)
>
> The script should be runnable as: `npx ts-node functions/src/migration/migrateFromSheets.ts --dry-run`

### 7.2 Verification Script (Claude Code)

**Prompt for Claude Code:**

> Create a verification script that:
>
> 1. Counts documents in each Firestore collection
> 2. Compares against row counts in the source Sheets
> 3. Spot-checks 5 random submissions: verifies all fields, signatures resolve, status matches
> 4. Reports any discrepancies

### 7.3 Post-Migration Manual Steps (Paul)

1. Run migration in dry-run mode, review logs
2. Run migration for real
3. Run verification script
4. Sign in to the new app with your account — verify your profile loaded correctly
5. Check a few submissions across all three types in the dashboard
6. Open an approved submission — verify PDF link still works (it's in Drive, should be fine)
7. Manually set roles in Firestore:
   - Your account: `role: 'admin'`
   - Business office recipient(s): `role: 'business_office'`

### Phase 7 Deliverable

- [ ] All Staff Directory records migrated to `users`
- [ ] All budget segments migrated
- [ ] All form responses migrated with correct statuses and data
- [ ] Signatures resolved from Drive to Cloud Storage
- [ ] Verification script shows 100% match

---

## Phase 8: Testing, Polish & Launch

**Estimated effort:** 2–3 evenings
**Claude Code can do:** ~60% — this phase is mostly human testing

### 8.1 End-to-End Testing Checklist

**For each of the 3 form types, test:**

- [ ] **New submission:** Fill form → attach file → sign → submit → verify Firestore doc created → verify submitter email received → verify supervisor email received
- [ ] **Supervisor approval flow:** Log in as supervisor → see pending item in dashboard → open form → review → sign → approve → verify status changed → verify PDF generated in Drive → verify submitter notified
- [ ] **Supervisor deny flow:** Same as above but deny with comments → verify denial email sent
- [ ] **Revision flow:** As supervisor, request revisions with comments → log in as submitter → see revision alert → edit form → resubmit → verify supervisor re-notified
- [ ] **Reviewed flow:** As supervisor, mark as reviewed → log in as business office → see in pending → final approve → verify PDF
- [ ] **Budget code builder:** Open builder → select all 6 segments → verify formatted code appears in input
- [ ] **Distance calculator (mileage):** Enter two locations → click calculate → verify miles populate
- [ ] **Signature save/load:** Draw signature → save to profile → close → reopen → load saved → verify it appears
- [ ] **PDF accuracy:** Open generated PDF → verify all form data present, both signatures visible, OPS branding correct

### 8.2 Domain Restriction Testing

- [ ] Sign in with `@orono.k12.mn.us` account — should work
- [ ] Sign in with personal Gmail — should be rejected with friendly error
- [ ] Add personal Gmail to `allowedExternalEmails` — should now work
- [ ] Remove from `allowedExternalEmails` — should be rejected again

### 8.3 Mobile Responsiveness

- [ ] Dashboard renders correctly on phone
- [ ] Form pages are usable on tablet
- [ ] Signature drawing works on touch devices
- [ ] File upload works on mobile (camera option appears)

### 8.4 Launch Sequence

1. **Soft launch (Week 1):** Deploy to Firebase Hosting. Only Paul + 1-2 trusted staff test with real submissions. Keep the GAS version running in parallel.
2. **Parallel run (Week 2):** Wider group of staff uses new system. GAS version remains available as fallback. Compare results.
3. **Cutover (Week 3):** Redirect the old GAS URL to the new Firebase URL (or add a banner directing users). Disable form submission on the old system but keep it read-only for historical access.
4. **Decommission (Week 4+):** Once comfortable, fully retire the GAS version.

### 8.5 DNS / Custom Domain (Optional but Recommended)

If you want a clean URL like `forms.orono.k12.mn.us`:

1. Firebase Console → Hosting → Add custom domain
2. Add DNS records in your domain registrar
3. Firebase provisions SSL automatically

### Phase 8 Deliverable

- [ ] All E2E tests pass
- [ ] Mobile testing complete
- [ ] Soft launch with test group
- [ ] Full cutover
- [ ] Old GAS system decommissioned or set to read-only

---

## Quick Reference: Claude Code Session Strategy

For maximum efficiency, here's the recommended order of Claude Code sessions:

| Session | What to Prompt                                       | Depends On            |
| ------- | ---------------------------------------------------- | --------------------- |
| 1       | Phase 1.2 + 1.3 — Scaffold project + Firebase config | Firebase Console done |
| 2       | Phase 1.4 — Auth implementation                      | Session 1             |
| 3       | Phase 2.1 + 2.2 + 2.3 + 2.4 — Full data layer        | Session 2             |
| 4       | Phase 3.1 + 3.2 — Layout + common components         | Session 2             |
| 5       | Phase 3.3 + 3.4 — Form components + hooks            | Sessions 3 + 4        |
| 6       | Phase 4.5 — Dashboard page                           | Session 5             |
| 7       | Phase 4.2 — Check Request page                       | Session 5             |
| 8       | Phase 4.3 — Mileage page                             | Session 5             |
| 9       | Phase 4.4 — Travel page                              | Session 5             |
| 10      | Phase 5 — All Cloud Functions                        | Session 3             |
| 11      | Phase 6 — PDF generation                             | Sessions 9 + 10       |
| 12      | Phase 7 — Migration                                  | Sessions 3 + 10       |

Sessions 6–9 can run in parallel. Sessions 10–12 can run in parallel after their dependencies.

---

## Risk Register

| Risk                                                                            | Mitigation                                                                                                                                                           |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Firebase Auth doesn't restrict to domain as tightly as GAS `DOMAIN` setting     | Blocking Cloud Function `beforeSignIn` + client-side check + security rules                                                                                          |
| PDF generation in Cloud Functions is slow/flaky (Puppeteer + Chromium is heavy) | Use `@sparticuz/chromium` layer, set function memory to 1GB+, 120s timeout. Alternative: use a PDF library like `pdf-lib` or `react-pdf` if Puppeteer is too painful |
| Google Drive API auth from Cloud Functions                                      | Use service account with Domain-Wide Delegation if needed for orono.k12.mn.us Drive                                                                                  |
| Firestore costs spike from real-time listeners                                  | Dashboard listeners are scoped to user's docs only (small result sets). Budget segments cached client-side. Monitor in Firebase Console.                             |
| Staff resist change from familiar GAS forms                                     | Parallel run period. New UI should feel very similar. Keep the OPS branding identical.                                                                               |
| Migration misses edge cases in raw JSON data                                    | Dry-run mode + verification script + keep Sheets as read-only archive for 90 days                                                                                    |
