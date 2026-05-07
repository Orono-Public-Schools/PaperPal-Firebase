# PaperPal — Claude Code Instructions

## Project Overview

PaperPal is an internal web app for **Orono Public Schools** staff to submit and track expense forms through a supervisor approval workflow. Built by Joel Mellor.

**Live forms:**

- Check Request (`/forms/check`)
- Mileage Reimbursement (`/forms/mileage`) — $0.725/mile rate
- Travel Reimbursement (`/forms/travel`)

**Approval flow (configurable per-title):**

- **2-step (default):** Staff submits (`pending`) → Supervisor approves (`reviewed`) → Controller approves (`approved`) → Controller marks paid (`paid`)
- **4-step (when approver mapped):** Staff submits (`pending`) → Approver approves (`approved_by_approver`) → Supervisor approves (`reviewed`) → Controller approves (`approved`) → Controller marks paid (`paid`)
- Any step can also → `denied`, `revisions_requested`, or `cancelled`

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

## Design System

**Never deviate from these values without being asked.**

### Orono Brand Palette

```
OPS navy (dark):   #1d2a5d
OPS blue:          #2d3f89
OPS light blue:    #4356a9
OPS lighter:       #eaecf5
OPS red:           #ad2122
Navy gradient:     linear-gradient(135deg, #1d2a5d 0%, #2d3f89 100%)
```

### Layout Colors

```
Page background:   Dark navy gradient (set in AppLayout)
Card surface:      #ffffff
Card shadow:       0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06)
Muted text:        #64748b
Body text:         #334155
Border muted:      rgba(180,185,195,0.25)
Input background:  #f4f5f7
Inset background:  #f8f9fb (summary bars, signature blocks)
```

### Components

**Input fields** use the `.input-neu` utility class (defined in `src/index.css`):

- Inset shadow, no border, `border-radius: 10px`, background `#f4f5f7`

**Cards / Sections** use the `Section` local component pattern (each page defines its own inline — do not extract to a shared component unless asked). White background + subtle drop shadow.

**Submit buttons** use OPS red (`#ad2122`) with `text-white`. Classes: `btn-submit` (send fly animation), `btn-save` (icon slide).

**Primary action buttons** (approve, navigate) use the navy gradient with `text-white` and `boxShadow: 0 2px 8px rgba(29,42,93,0.25)`.

**Secondary action buttons** (revisions, alternate actions) use OPS light blue outline style: `color: #4356a9`, `background: rgba(67,86,169,0.1)`, `border: 1px solid rgba(67,86,169,0.3)`.

**Destructive buttons** (deny, delete) use OPS red: `color: #ad2122`, `background: rgba(173,33,34,0.08)`, `border: 1px solid rgba(173,33,34,0.2)`. Solid red for confirm actions.

**Status badges** use Orono colors: pending/revisions = light blue (`#4356a9`), approved_by_approver = blue (`#384a97`), reviewed = blue (`#2d3f89`), approved = navy (`#1d2a5d`), paid = green (`#059669`), denied = red (`#ad2122`).

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
    Dashboard.tsx                  # Tabs: New Request / Pending / History / Approvals (Pending/Completed sub-tabs)
    CheckRequest.tsx               # Check Request form
    MileageReimbursement.tsx       # Mileage form
    TravelReimbursement.tsx        # Travel Reimbursement form
    FormView.tsx                   # Read-only view of a submitted form
    Admin.tsx                      # Admin panel (role: admin | business_office | controller)
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

- Full-screen modal, 6-segment step-by-step flow (Fund → Org → Program → Fin → Course → Obj)
- Format: `##-###-###-###-###-###`
- Segments stored in Firestore `settings/budgetSegments` doc
- Auto-seeded from `defaultBudgetSegments.ts` on first load
- Admin panel manages segments (collapsible categories, inline edit, add, delete, Quick Import)

### Dashboard tabs

Deep-linked via `?tab=pending` / `?tab=history` query params. `useSearchParams()` sets initial tab state.

### Navigation

`AppHeader` has a hamburger that opens a right-side sidebar with sections: Navigate, New Request, My Submissions, Account, Admin (admin-only). Profile icon/name is clickable → `/profile`.

### Roles

`UserProfile.role` (ordered by access level):

| Role                | Budget Code | Admin | Can Approve       | Mark Paid |
| ------------------- | ----------- | ----- | ----------------- | --------- |
| `"staff"`           | No          | No    | No                | No        |
| `"approver"`        | Yes         | No    | As approver       | No        |
| `"supervisor"`      | Yes         | No    | As supervisor     | No        |
| `"business_office"` | Yes         | Yes   | As assigned       | Yes       |
| `"controller"`      | Yes         | Yes   | As final approver | Yes       |
| `"admin"`           | Yes         | Yes   | As assigned       | Yes       |

Admin UI shown when `role` is `"admin"`, `"business_office"`, or `"controller"`. Auto-role promotion: assigning someone as a supervisor/approver in mappings automatically upgrades their role from `"staff"`.

---

## Firestore Collections

| Collection / Document         | Purpose                                                                   |
| ----------------------------- | ------------------------------------------------------------------------- |
| `users/{uid}`                 | UserProfile documents                                                     |
| `submissions/{REQ-XXXXX}`     | All form submissions                                                      |
| `buildings/{id}`              | Building names/initials (staff sync reference)                            |
| `staff/{email}`               | Imported staff records                                                    |
| `settings/app`                | AppSettings (email, school address, final approver, fiscal year)          |
| `settings/budgetSegments`     | Budget code segments (fund, org, proj, fin, course, obj arrays)           |
| `settings/supervisorMappings` | Title overrides (`mappings[]`) + building defaults (`buildingMappings[]`) |
| `settings/formFields`         | Form field visibility/ordering config                                     |
| `mail/{id}`                   | Firebase Extension trigger docs for outbound email                        |

---

## Development Commands

```bash
npm run dev          # Local dev server (Vite)
npm run build        # Production build
npm run typecheck    # tsc -b
npm run lint         # eslint . --max-warnings=0
npm run format:check # prettier --check .

# Firebase
firebase emulators:start
firebase hosting:channel:deploy dev-joel   # Preview deploy
firebase deploy                            # Production deploy
```

### Before pushing / PR

Always run all three checks before pushing — CI will fail otherwise:

```bash
npm run typecheck && npm run lint && npm run format:check
```

If formatting fails, fix with `npx prettier --write .` and commit separately.

---

## Conventions

- Prefer editing existing files over creating new ones
- Do not add comments unless logic is non-obvious
- Do not add error handling for scenarios that can't happen
- Do not create shared helper components unless the same JSX is needed in 3+ places
- Inline `style={{}}` is intentional — the design system uses specific hex values that Tailwind doesn't have utilities for
- `photoURL` on UserProfile comes from Google OAuth and may be undefined
