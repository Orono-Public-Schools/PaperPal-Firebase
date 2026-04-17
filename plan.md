# PaperPal — Plan

## Current Phase: Travel Expenses Redesign

### 1. Unified Expenses Section

Replace the three separate sections (Actual Costs, Meal Expenses, Summary) with a single "Expenses" section. Users add individual expense items categorized by type.

**Categories and fields:**

| Category | Fields |
|---|---|
| Meal | Date, Meal Type (Breakfast/Lunch/Dinner), Amount, Receipt |
| Lodging | Date, Location, Amount, Receipt |
| Registration | Date, Amount, Receipt |
| Other Transportation | Date, Description, Amount, Receipt |

**Key design decisions:**
- Transportation by Car (mileage calculator) stays separate — it's mileage-based, not receipt-based
- "+ Add Expense" button with category picker dropdown
- Expenses grouped visually by category with subtotals
- Running total at the bottom
- Tax acknowledgment checkbox: "I confirm all amounts are pre-tax (Orono Public Schools is tax-exempt)"

**Data model change:**
```ts
interface TravelExpenseItem {
  category: "meal" | "lodging" | "registration" | "other_transport"
  date: string
  amount: number
  mealType?: "breakfast" | "lunch" | "dinner"
  location?: string
  description?: string
  receipt?: Attachment
}
```

Replace `actuals.otherTransport`, `actuals.lodging`, `actuals.registration`, `actuals.others`, and `meals` with `expenses: TravelExpenseItem[]`. Keep `actuals.miles` for the mileage calculator.

**Backward compatibility:** Existing submissions use the old structure. FormView, FormDataView, and PDF generation must handle both old and new formats.

### 2. Receipt Scan & Upload

Per-expense-item receipt attachment with camera scanning support.

**Implementation:**
- `<input type="file" accept="image/*" capture="environment">` for camera scanning (opens camera on mobile, file picker on desktop)
- Separate "Upload" button for file picker (PDF, image)
- Image compression before upload (phone camera images can be large)
- Upload to Firebase Storage, URL saved on the expense item as `receipt: Attachment`
- Thumbnail preview shown inline next to the expense item
- FormView shows receipt thumbnails with click-to-enlarge

### 3. OCR Auto-Fill (Receipt Total Extraction)

Auto-extract the total amount from scanned/uploaded receipt images.

**Implementation:**
- Callable Cloud Function sends receipt image to Google Cloud Vision API (TEXT_DETECTION)
- Parse OCR text for dollar amounts — heuristics: look for "total", "amount due", "balance", or fall back to largest dollar value
- Auto-fill the amount field, user confirms or adjusts
- Show a subtle "Extracted: $XX.XX" hint so user knows it was auto-detected
- Graceful fallback — if OCR fails or can't find a total, user enters manually

**Cost:** Cloud Vision API is ~$1.50 per 1,000 images.

### 4. PDF with Receipts

Append receipt images/PDFs to the generated form PDF.

**Implementation:**
- After generating the form data pages, append each receipt as an additional page
- Images: embed with PDFKit (already in use), scale to fit page
- Uploaded PDFs: use `pdf-lib` to merge pages
- Label each receipt page with the expense category, date, and amount
- Receipts appear in the same order as the expenses on the form

### Files affected:
- `src/lib/types.ts` — new `TravelExpenseItem` type, update `TravelData`
- `src/pages/TravelReimbursement.tsx` — rebuild expenses UI, add scan/upload per item
- `src/components/forms/FormDataView.tsx` — update TravelView for new + old format
- `src/pages/FormView.tsx` — receipt thumbnails
- `functions/helpers/pdf.js` — update travel PDF layout, append receipt pages
- `functions/index.js` — new `extractReceiptTotal` callable Cloud Function
- `functions/package.json` — add `@google-cloud/vision` and `pdf-lib` dependencies

## Up Next (after expenses redesign)

- Mobile responsiveness
  - Dashboard cards layout on small screens
  - Submission rows — readable on phone
  - Form pages — input grids, signature field, file upload
  - Admin panel — tabs, accordion sections, form field editor
  - FormView — header, timeline, approval actions
  - Sidebar nav — already slides in, verify touch targets

## Future (post business office meeting)

- Notification preferences (user opt-in/out from profile)
- Reporting / analytics dashboard (totals, trends, approvals per month)
- FormView: respect form field config (hide hidden fields in read-only view)
- Light mode (requires refactoring inline styles to CSS variables)

## Done

- Testing & polish phase (totals positioning, form field cache fix, dead code cleanup)
- Resubmit bug fix (deleteField instead of undefined)
- Supervisor redirect (reassign + email notifications)
- Activity timeline (log all workflow events, vertical timeline in FormView)
- Print & export (print button, on-demand PDF via callable Cloud Function)
- Resubmit email notifications (supervisor + submitter notified)
- Controller role (restricted admin panel, Firestore rules, nav access)
- Sandbox mode (isolated test environment, emails to self, no Drive uploads)
- Form field config (admin UI to show/hide/reorder form sections)
- Admin panel redesign (Forms & Mappings / Settings tabs, collapsible accordions)
- Dashboard UI refresh (rotate-reveal cards, gradient submission rows, form-type accents)
- History management (hide submissions, clear history, export CSV)
- Searchable staff dropdown in admin Users & Roles
- Add user bug fix (Firestore rules + error handling)
- Resubmission flow (edit & resubmit from pending or revisions_requested)
- Cancel request (submitter can cancel pending/revisions_requested)
- Server-side email with PDF attachments (Cloud Functions)
- Google Drive integration + PDF generation
- Firebase Trigger Email extension
- Budget code workflow (staff greyed out, supervisor assigns)
- UI polish (Orono brand colors, status badges, email template)
- Staff integration (OneSync → Google Sheet → Cloud Function → Firestore)
- Supervisor mappings (hybrid building + title approach)
- Approval workflow (FormView)
- Email notifications (branded HTML template)
- Signature system (draw / type / saved)
- Staff email autocomplete
- Dashboard (clickable rows, approvals tab)
- Users & Roles
- Google Maps integration (Places API + Routes API)
- Budget Code Builder (6-segment UFARS codes)
- Travel Reimbursement form
- Custom DatePicker component
- Three-step approval flow (pending → reviewed → approved)
- Admin panel (buildings, staff, roles, settings, budget segments)
