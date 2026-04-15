# PaperPal — Claude Code Instructions

## Project Overview

PaperPal is an internal web app for **Orono Public Schools** staff to submit and track expense forms through a supervisor approval workflow. Built by Joel Mellor.

**Live forms:**
- Check Request (`/forms/check`)
- Mileage Reimbursement (`/forms/mileage`) — $0.72/mile rate
- Travel Reimbursement (`/forms/travel`)

**Approval flow:** Staff submits → supervisor notified → supervisor approves/denies/requests revisions → business office receives approved submissions.

---

## Tech Stack

| Layer | Tool |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Routing | React Router v7 (`useNavigate`, `useLocation`, `useSearchParams`) |
| Styling | Tailwind CSS v4 (no config file — uses CSS `@import "tailwindcss"`) |
| Backend | Firebase: Auth, Firestore, Hosting |
| Auth | Google SSO — restricted to `@orono.k12.mn.us` domain |
| Icons | Lucide React |

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
    firebase.ts                    # Firebase app init
    firestore.ts                   # Typed Firestore helpers (createSubmission, etc.)
    types.ts                       # All TypeScript interfaces
    utils.ts

  context/
    AuthContext.tsx                 # AuthProvider — wraps app, provides user + userProfile
    authContextDef.ts

  hooks/
    useAuth.ts                     # { user, userProfile, signOut }

  components/
    ProtectedRoute.tsx              # Redirects to /login if unauthenticated
    forms/
      NameField.tsx                 # Name override field (pencil icon to edit on-behalf-of)
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
2. Has a `NameField` for submitter name (supports on-behalf-of override)
3. Uses local `Section` and `Field` sub-components (defined at the bottom of the file)
4. Dynamic rows (trips / expense lines / meal rows) use `divide-y` on the parent + `py-3 first:pt-0 last:pb-0` on each row — no gray wrapper divs on rows
5. Calculates totals reactively
6. On submit: calls `createSubmission`, shows a confirmation screen (replaces the form)

### Dashboard tabs
Deep-linked via `?tab=pending` / `?tab=history` query params. `useSearchParams()` sets initial tab state.

### Navigation
`AppHeader` has a hamburger that opens a right-side sidebar with sections: Navigate, New Request, My Submissions, Account, Admin (admin-only). Profile icon/name is clickable → `/profile`.

### Roles
`UserProfile.role`: `"staff"` | `"admin"` | `"business_office"`. Admin UI shown when `role === "admin" || role === "business_office"`.

---

## Firestore Collections

| Collection | Purpose |
|---|---|
| `users/{uid}` | UserProfile documents |
| `submissions/{REQ-XXXXX}` | All form submissions |
| `mail/{id}` | Firebase Extension trigger docs for outbound email |

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
