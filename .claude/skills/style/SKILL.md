---
name: style
description: PaperPal's Orono brand design system — colors, cards, buttons, typography, status badges, layout patterns, form conventions. Use when styling new components, choosing colors, building UI, or checking design consistency.
---

# PaperPal Design System

You are styling for **Orono Public Schools** (OPS). Follow these exact values without deviation unless explicitly asked.

---

## Brand Palette

| Token | Hex | Usage |
|---|---|---|
| OPS navy (dark) | `#1d2a5d` | Section headings, approved badge, primary dark |
| OPS blue | `#2d3f89` | Primary actions, reviewed badge, focus rings |
| OPS light blue | `#4356a9` | Secondary actions, pending badge, checkboxes |
| OPS lighter | `#eaecf5` | Light accent backgrounds |
| OPS red | `#ad2122` | Submit buttons, destructive, denied badge |
| Navy gradient | `linear-gradient(135deg, #1d2a5d 0%, #2d3f89 100%)` | Primary action buttons |

## Layout Colors

| Surface | Value |
|---|---|
| Page background | `linear-gradient(160deg, #0a1230 0%, #131f45 40%, #172550 100%)` (on `body` in index.css) |
| Card surface | `#ffffff` |
| Card shadow | `0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06)` |
| Body text | `#334155` |
| Muted text | `#64748b` |
| Placeholder text | `#94a3b8` |
| Border muted | `rgba(180,185,195,0.25)` |
| Input background | `#ffffff` (border: `1px solid #e2e5ea`) |
| Input read-only bg | `#f8f9fb` |
| Inset background | `#f8f9fb` (summary bars, signature blocks) |

---

## Cards & Sections

Each page defines a local `Section` component (do NOT extract to shared unless asked):

```tsx
const Section = ({ title, children }: { title?: string; children: React.ReactNode }) => (
  <div
    className="rounded-xl p-4 sm:p-5"
    style={{
      background: "#ffffff",
      boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06)",
    }}
  >
    {title && (
      <h2 className="mb-4 text-sm font-semibold tracking-widest uppercase" style={{ color: "#1d2a5d" }}>
        {title}
      </h2>
    )}
    {children}
  </div>
);
```

- Border radius: `rounded-xl` (12px)
- Padding: `p-4 sm:p-5`
- Between sections: `gap-6` or `space-y-6`

---

## Buttons

### CSS classes (defined in `src/index.css`)

| Class | Style | Use for |
|---|---|---|
| `.btn-submit` | OPS red solid, Send icon fly animation | Form submissions |
| `.btn-save` | OPS red solid, icon slides right on hover | Save actions |
| `.btn-cancel` | Transparent + white border, grey fill on hover | Cancel/back actions (on dark bg) |
| `.btn-action-approve` | Navy gradient, shadow | Approve, primary review actions |
| `.btn-action-revisions` | Light blue outline | Request revisions (outline) |
| `.btn-action-revisions-solid` | Light blue solid | Request revisions (confirm) |
| `.btn-action-deny` | Red outline | Deny (outline) |
| `.btn-action-deny-solid` | Red solid | Deny (confirm) |

### Button conventions
- All buttons: `font-size: 0.875rem`, `font-weight: 600`
- Hover: `translateY(-1px)` lift for action buttons, scale for submit/save
- Active: `scale(0.98)` press effect
- Disabled: `opacity: 0.6`, `cursor: default`
- Border radius: `12px` for submit/save/cancel, `0.5rem` (8px) for action buttons

### Inline primary buttons (when not using CSS classes)
```tsx
style={{
  background: "linear-gradient(135deg, #1d2a5d 0%, #2d3f89 100%)",
  boxShadow: "0 2px 8px rgba(29,42,93,0.25)",
  color: "#fff",
}}
```

### Dashboard tab buttons
- Active: `background: "linear-gradient(135deg, #ad2122 0%, #c9393a 100%)"`, `boxShadow: "0 2px 10px rgba(173,33,34,0.35)"`
- Inactive: `color: "rgba(255,255,255,0.5)"`
- Hover (inactive): `background: "rgba(255,255,255,0.08)"`

---

## Typography

| Element | Classes | Color |
|---|---|---|
| Page title (on dark bg) | `text-xl sm:text-2xl font-bold` | `#ffffff` |
| Section heading (in card) | `text-sm font-semibold tracking-widest uppercase` | `#1d2a5d` |
| Field label | `text-xs font-semibold tracking-wider uppercase mb-1` | `#64748b` |
| Body text | `text-sm` | `#334155` |
| Muted/helper text | `text-xs` or `text-sm` | `#94a3b8` |
| Text on dark bg | — | `#ffffff` or `rgba(255,255,255,0.6)` for muted |

Font: **Inter** (loaded via Google Fonts). Signature font: **Caveat**.

---

## Status Badges

```tsx
className="rounded-full px-2.5 py-1 text-xs font-semibold"
style={{ background: STATUS_STYLES[status].bg, color: STATUS_STYLES[status].color }}
```

| Status | Color | Background |
|---|---|---|
| pending | `#4356a9` | `rgba(67,86,169,0.12)` |
| reviewed | `#2d3f89` | `rgba(45,63,137,0.12)` |
| approved | `#1d2a5d` | `rgba(29,42,93,0.12)` |
| denied | `#ad2122` | `rgba(173,33,34,0.12)` |
| revisions_requested | `#4356a9` | `rgba(67,86,169,0.12)` |
| cancelled | `#64748b` | `rgba(148,163,184,0.12)` |

Dashboard submission cards also have gradient backgrounds per status with glow shadows — see `STATUS_STYLES` in Dashboard.tsx.

---

## Form Inputs

### `.input-neu` class
```css
background: #ffffff;
border: 1px solid #e2e5ea;
border-radius: 8px;
padding: 0.5rem 0.75rem;
font-size: 0.875rem;
color: #1d2a5d;
/* Focus: */
border-color: #2d3f89;
box-shadow: 0 0 0 3px rgba(45, 63, 137, 0.1);
```

- Textareas: `.input-neu` + `resize-none`
- Selects: `.input-neu`
- Checkboxes: `h-4 w-4 cursor-pointer accent-[#4356a9]`
- Date fields: custom `DatePicker` component (never native `<input type="date">`)

---

## Layout

### Main content wrapper (AppLayout)
```
mx-auto w-full max-w-5xl flex-1 px-3 py-6 sm:px-4 sm:py-12
```

### Form action row
```
flex flex-col-reverse gap-3 sm:flex-row sm:justify-end
```
Mobile: vertical reverse (cancel on top). Desktop: horizontal right-aligned.

### Dynamic row lists
```tsx
<div className="divide-y" style={{ borderColor: "rgba(180,185,195,0.25)" }}>
  {items.map((item) => (
    <div key={item.id} className="py-3 first:pt-0 last:pb-0">
      {/* Row content */}
    </div>
  ))}
</div>
```
No gray wrapper divs on rows.

### Spacing scale
- Between sections: `gap-6` (1.5rem)
- Within sections: `gap-4` (1rem)
- Tight spacing: `gap-2` (0.5rem)
- Between cards in lists: `space-y-3`

---

## Empty States

```tsx
style={{
  background: "rgba(255,255,255,0.06)",
  border: "1px dashed rgba(255,255,255,0.15)",
}}
```

Icon container: `background: "rgba(255,255,255,0.08)"`, rounded-full.

---

## Dropdown / Popup Menus

```tsx
style={{
  background: "#ffffff",
  boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
  border: "1px solid #e2e5ea",
}}
```
Hover items: `background: #f4f5f7`

---

## Transitions

- Button hover: `0.2s–0.4s ease`
- Lift effect: `translateY(-1px)` on hover
- Press effect: `scale(0.95)` or `scale(0.98)` on active
- Subtle transitions: `transition-all duration-200`

---

## Icon Conventions (Lucide React)

| Context | Size |
|---|---|
| Navigation items | 15–20px |
| Form field icons | 14–16px |
| Button icons | 15–16px |
| Illustrations/empty states | 24–48px |

Icon color follows the parent text color, or use inline `style={{ color: "#hex" }}`.

---

## Key Rules

1. **Inline `style={{}}` is intentional** — Orono hex values don't have Tailwind utilities
2. **Local Section/Field components** per page — don't share unless 3+ pages need it
3. **Never use native date inputs** — use `DatePicker`
4. **No neumorphic styles** — clean white cards, subtle shadows only
5. **Responsive: mobile-first** — use `sm:` breakpoint for desktop adjustments
6. **Print styles** exist in index.css — hide nav, remove shadows, white background
