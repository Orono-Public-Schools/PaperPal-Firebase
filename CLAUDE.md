# PaperPal — Claude Code Instructions

## Project Overview

PaperPal is an internal web app for **Orono Public Schools** staff to submit and track expense forms through a supervisor approval workflow. Built by Joel Mellor.

**Live forms:**

- Check Request (`/forms/check`)
- Mileage Reimbursement (`/forms/mileage`) — $0.72/mile rate
- Travel Reimbursement (`/forms/travel`)

**Approval flow:** Staff submits → supervisor approves (status: `reviewed`) → final approver/controller approves (status: `approved`) → business office receives. Supervisor can also deny or request revisions.

---

## Tech Stack

| Layer    | Tool                                                                |
| -------- | ------------------------------------------------------------------- |
| Frontend | React 18 + TypeScript + Vite                                        |
| Routing  | React Router v7 (`useNavigate`, `useLocation`, `useSearchParams`)   |
| Styling  | Tailwind CSS v4 (no config file — uses CSS `@import "tailwindcss"`) |
| Backend  | Firebase: Auth, Firestore, Hosting                                  |
| Auth     | Google SSO — restricted to `@orono.k12.mn.us` domain                |
| Icons    | Lucide React                                                        |

---

## Design System (Neumorphic)

**Never deviate from these values without being asked.**

```
Background:        #f0f2f5
Card surface:      linear-gradient(145deg, #fafbfd, #edeef1)
Card shadow:       4px 4px 10px rgba(180,185,195,0.35), -4px -4px 10px rgba(255,255,255,0.75)
OPS navy:          #1d2a5d
Navy gradient:     linear-gradient(135deg, #1d2a5d 0%, #2d3f89 100%)
Accent green:      #059669
Accent blue:       #1e3a8a
Muted text:        #64748b
Body text:         #334155
Border muted:      rgba(180,185,195,0.25)
Input background:  #f4f5f7
```

**Input fields** use the `.input-neu` utility class (defined in `src/index.css`):

- Inset shadow, no border, `border-radius: 10px`, background `#f4f5f7`

**Cards / Sections** use the `Section` local component pattern (each page defines its own inline — do not extract to a shared component unless asked).

**Submit buttons** always use the OPS navy gradient with `text-white`.

**Section headings** inside cards: `text-sm font-semibold tracking-widest uppercase` in `#1d2a5d`.

**Field labels:** `text-xs font-semibold tracking-wider uppercase` in `#64748b`.

---

## File Structure

```
src/
  App.tsx                          # Routes (BrowserRouter + AuthProvider)
  main.tsx
  index.css                        # Global styles + .input-neu utility

  lib/
    firebase.ts                    # Firebase app init (Auth, Firestore, Storage, Functions)
    firestore.ts                   # Typed Firestore helpers (submissions, users, buildings, settings, budget segments)
    googleMaps.ts                  # Google Places autocomplete + Routes distance calc (REST APIs)
    defaultBudgetSegments.ts       # Orono district UFARS codes (auto-seeded to Firestore)
    types.ts                       # All TypeScript interfaces
    utils.ts                       # formatBudgetCode, cn

  context/
    AuthContext.tsx                 # AuthProvider — wraps app, provides user + userProfile
    authContextDef.ts

  hooks/
    useAuth.ts                     # { user, userProfile, signOut }

  components/
    ProtectedRoute.tsx              # Redirects to /login if unauthenticated
    forms/
      AddressAutocomplete.tsx       # Google Places autocomplete + quick-fill dropdown (Home/School)
      BudgetCodeBuilder.tsx         # Full-screen modal: 6-segment step-by-step budget code picker
      DatePicker.tsx                # Custom calendar dropdown (replaces native date inputs)
    layout/
      AppLayout.tsx                 # Page wrapper (AppHeader + main content padding)
      AppHeader.tsx                 # Sticky header + hamburger sidebar nav

  pages/
    Login.tsx                      # Google SSO login page
    Dashboard.tsx                  # Tabs: New Request / Pending / History
    CheckRequest.tsx               # Check Request form
    MileageReimbursement.tsx       # Mileage form
    TravelReimbursement.tsx        # Travel Reimbursement form
    FormView.tsx                   # Read-only view of a submitted form
    Admin.tsx                      # Admin panel (role: admin | business_office)
    Profile.tsx                    # Profile settings + signature capture
```

---

## Key Patterns

### Auth

`useAuth()` returns `{ user: FirebaseUser | null, userProfile: UserProfile | null, signOut }`. All protected pages gate on both being non-null before submitting.

### Firestore submissions

`createSubmission(data)` in `firestore.ts` generates a `REQ-XXXXX` id and writes to the `submissions` collection. Returns the id string.

### Form pages structure

Each form page:

1. Reads `userProfile` to pre-fill name, employeeId
2. Full Name is a plain editable input (pre-filled from profile)
3. Account Code field has `BudgetCodeBuilder` link below it + auto-format on typing
4. Uses local `Section` and `Field` sub-components (defined at the bottom of the file)
5. Date fields use custom `DatePicker` component (not native `<input type="date">`)
6. Dynamic rows (trips / expense lines / meal rows) use `divide-y` on the parent + `py-3 first:pt-0 last:pb-0` on each row — no gray wrapper divs on rows
7. Calculates totals reactively
8. On submit: calls `createSubmission`, shows a confirmation screen (replaces the form)

### Button classes

- `btn-submit` — OPS red, Send icon fly animation on hover. Used for form submissions.
- `btn-save` — OPS red solid, icon slides right on hover, dims on hover. Used for save actions.
- `btn-cancel` — Transparent with border, grey fill on hover, X icon. Used for cancel actions.

### Google Maps integration

- `AddressAutocomplete` — uses Places API (New) REST endpoint for suggestions
- `calculateDrivingDistance` — uses Routes API REST endpoint
- Quick-fill dropdown shows Home (from `userProfile.homeAddress`) and School (from `AppSettings.schoolAddress`)
- API key stored in `VITE_GOOGLE_MAPS_API_KEY` env var

### Budget Code Builder

- Full-screen modal, 6-segment step-by-step flow (Fund → Org → Proj → Fin → Course → Obj)
- Format: `##-###-###-###-###-###`
- Segments stored in Firestore `settings/budgetSegments` doc
- Auto-seeded from `defaultBudgetSegments.ts` on first load
- Admin panel manages segments (collapsible categories, inline edit, add, delete, Quick Import)

### Dashboard tabs

Deep-linked via `?tab=pending` / `?tab=history` query params. `useSearchParams()` sets initial tab state.

### Navigation

`AppHeader` has a hamburger that opens a right-side sidebar with sections: Navigate, New Request, My Submissions, Account, Admin (admin-only). Profile icon/name is clickable → `/profile`.

### Roles

`UserProfile.role`: `"staff"` | `"admin"` | `"business_office"`. Admin UI shown when `role === "admin" || role === "business_office"`.

---

## Firestore Collections

| Collection / Document     | Purpose                                                          |
| ------------------------- | ---------------------------------------------------------------- |
| `users/{uid}`             | UserProfile documents                                            |
| `submissions/{REQ-XXXXX}` | All form submissions                                             |
| `buildings/{id}`          | Building/org with name, address, approver                        |
| `staff/{email}`           | Imported staff records                                           |
| `settings/app`            | AppSettings (email, school address, final approver, fiscal year) |
| `settings/budgetSegments` | Budget code segments (fund, org, proj, fin, course, obj arrays)  |
| `mail/{id}`               | Firebase Extension trigger docs for outbound email               |

---

## Development Commands

```bash
npm run dev          # Local dev server (Vite)
npm run build        # Production build
npm run typecheck    # tsc --noEmit

# Firebase
firebase emulators:start
firebase hosting:channel:deploy dev-joel   # Preview deploy
firebase deploy                            # Production deploy
```

---

## Conventions

- Prefer editing existing files over creating new ones
- Do not add comments unless logic is non-obvious
- Do not add error handling for scenarios that can't happen
- Do not create shared helper components unless the same JSX is needed in 3+ places
- Inline `style={{}}` is intentional — the design system uses specific hex values that Tailwind doesn't have utilities for
- `photoURL` on UserProfile comes from Google OAuth and may be undefined
