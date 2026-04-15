# PaperPal — Plan

## Up Next

- Staff rostering / user integration
  - How do staff get into the system? Options: Google Sheets sync, CSV upload, or manual admin entry
  - Auto-create UserProfile on first Google SSO sign-in from staff record match
  - Building → supervisor/approver mapping (auto-resolve from building assignment)
  - Bulk import: fields — first name, last name, email, employee ID, building
  - Building selector with override on forms (instead of free-text)

- FormView page (read-only view + approval actions)
  - Supervisor approve/deny/request revisions workflow
  - Final approver (controller) second approval step
  - Signature capture on approval
  - PDF generation on final approval

- Email notifications
  - On submit → notify supervisor
  - On supervisor approve → notify final approver
  - On final approve → notify submitter + business office
  - On deny/revisions → notify submitter

## Done

- Google Maps integration (Places API New + Routes API)
  - Address autocomplete on mileage From/To fields (REST API)
  - Auto-calculate driving distance with MapPin button
  - Quick-fill dropdown: Home (from profile) + School (from admin settings)
  - "Add home address" link → Profile page with auto-focus
  - Home address field on Profile page
  - School address configurable in Admin > General Settings
- Budget Code Builder
  - Full-screen step-by-step modal (Fund → Org → Proj → Fin → Course → Obj)
  - All Orono district codes imported (167 total across 6 segments)
  - Admin panel: collapsible categories, inline edit, per-category add, Quick Import
  - Auto-format on manual typing (##-###-###-###-###-###)
  - Pre-seeded UFARS Object codes as defaults
- Travel Reimbursement form overhaul
  - Transportation by Car section with mileage calc (From/To + distance)
  - Meal Expenses table (date picker per row, per-row totals, receipt upload)
  - Justification for Release with file upload (PDF/IMG/DOC) + drag-and-drop
  - Pre-Approved Estimated Expenses section
  - Route Request To field (supervisor selector)
  - Away From Job dates (DatePicker, not time inputs)
  - Budget year auto-fills from fiscal year setting
- Custom DatePicker component (circular days, OPS red selected, today ring)
- Three-step approval flow data model: pending → reviewed → approved
- Final approver (controller) configurable in Admin > General Settings
- Fiscal year start month configurable in Admin (defaults July)
- Button redesign: btn-submit (Send fly), btn-save (red solid), btn-cancel (transparent)
- Full Name simplified to plain editable input (removed NameField component)
- Dark theme redesign (dark navy bg, white cards, OPS brand colors)
- Animated submit buttons (OPS red, Send icon fly animation)
- Dashboard cards with expand-on-hover, color accent bars
- Inter font, clean white inputs with borders
- Mileage rate $0.72/mile
- Admin panel (buildings, staff import, user roles, email settings, general settings)
- Firestore security rules for new collections
- Role system (staff, supervisor, business_office, admin)
- Auto-populate user profile from staff record on first sign-in
- Profile page with signature canvas, home address
- Hamburger sidebar navigation
