# PaperPal — Plan

## Up Next

- Automatic location & mileage capabilities
  - Address autocomplete on mileage form (From / To fields)
  - Auto-calculate distance between locations (Google Maps Distance Matrix API or similar)
  - Pre-populate "From" with user's building address
  - Round trip auto-doubles the calculated distance

- Update form pages to use building selector with override option + auto-resolve approver from building

- Staff rostering integration
  - Google Sheets sync (pull staff data from a connected sheet)
  - CSV file upload in admin panel
  - Fields: first name, last name, email, employee ID, building
  - Supervisor email comes from building → approver mapping, not staff data

## Done

- Dark theme redesign (Droplet-inspired — dark navy bg, white cards, OPS brand colors)
- Animated submit buttons (OPS red, Send icon fly animation)
- Dashboard cards with expand-on-hover, color accent bars, brand colors
- Inter font, clean white inputs with borders
- Mileage rate updated to $0.72/mile
- Admin panel (buildings, staff import, user roles, email settings)
- Firestore security rules for new collections (buildings, staff, settings)
- Role system (staff, supervisor, business_office, admin)
- Auto-populate user profile from staff record on first sign-in
- Profile icon clickable → /profile
- Signature canvas enlarged (800x250)
- Unified UserProfile type (removed duplicate in authContextDef.ts)
