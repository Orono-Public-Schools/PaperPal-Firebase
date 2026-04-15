# STYLE.md - Orono Directory Design System

This document outlines the design patterns, color palette, and styling conventions used throughout the Orono Directory application.

## Design Philosophy

The application uses a **Neumorphic (Soft UI)** design pattern with soft shadows, subtle gradients, and floating accent elements. The design emphasizes:

- Clean, professional appearance suitable for a school environment
- Consistent visual language across all pages
- Accessible, readable typography
- Responsive layouts for all device sizes

---

## Color Palette

### Background Colors

| Color                 | Hex       | Usage                     |
| --------------------- | --------- | ------------------------- |
| Base Background       | `#f0f2f5` | Body/page background      |
| Card Background Light | `#fafbfd` | Neumorphic gradient start |
| Card Background Dark  | `#eaecf0` | Neumorphic gradient end   |

### Primary Colors (School Theme)

| Color              | Hex       | Usage                                 |
| ------------------ | --------- | ------------------------------------- |
| Navy Blue (Dark)   | `#1d2a5d` | Primary brand, headers, hero sections |
| Navy Blue (Medium) | `#1e3a8a` | Buttons, accents                      |
| Navy Blue (Light)  | `#1e40af` | Gradient endpoints                    |
| Blue Accent        | `#3b82f6` | Selected states, links                |

### Secondary Colors

| Color              | Hex       | Usage                          |
| ------------------ | --------- | ------------------------------ |
| Orono Red (Dark)   | `#991b1b` | Staff accents, primary actions |
| Orono Red (Medium) | `#c13435` | Staff buttons, alerts          |
| Orono Red (Light)  | `#ef4444` | Hover states                   |

### Accent Colors by Feature

| Feature        | Primary   | Secondary | Usage                  |
| -------------- | --------- | --------- | ---------------------- |
| Students       | `#1e3a8a` | `#3b82f6` | Blue gradient          |
| Staff          | `#991b1b` | `#ef4444` | Red gradient           |
| Report Wizard  | `#8b5cf6` | `#a855f7` | Purple (magical theme) |
| Class Finder   | `#059669` | `#047857` | Green (academic)       |
| Phone Book     | `#f59e0b` | `#d97706` | Orange                 |
| Transportation | `#fbbf24` | `#f59e0b` | Yellow (school bus)    |
| Disabled       | `#4b5563` | `#9ca3af` | Grey                   |

### Status Colors

| Status  | Hex                   | Usage                               |
| ------- | --------------------- | ----------------------------------- |
| Success | `#10b981` / `#059669` | Confirmations, success states       |
| Error   | `#ef4444` / `#dc2626` | Error messages, destructive actions |
| Warning | `#f59e0b` / `#fbbf24` | Partial matches, cautions           |
| Info    | `#3b82f6` / `#1e40af` | Information messages                |

---

## Typography

### Font Family

```css
font-family: "Roboto", sans-serif;
```

### Font Sizes

| Element              | Size                 | Weight  |
| -------------------- | -------------------- | ------- |
| Hero Title           | `2rem`               | 700     |
| Page Title           | `1.8rem`             | 600     |
| Section Title        | `1.3rem`             | 600     |
| Card Title           | `1.1rem`             | 600     |
| Body Text            | `0.9rem` - `1rem`    | 400-500 |
| Small/Meta           | `0.8rem` - `0.85rem` | 400     |
| Button Text (Hero)   | `0.85rem`            | 700     |
| Button Text (Normal) | `14px`               | 500-600 |

### Text Colors

| Usage           | Hex                                 |
| --------------- | ----------------------------------- |
| Primary Text    | `#1d2a5d` / `#1e293b`               |
| Secondary Text  | `#555` / `#495057`                  |
| Muted Text      | `#64748b` / `#666`                  |
| Light Text      | `#888` / `#9ca3af`                  |
| White (on dark) | `#ffffff` / `rgba(255,255,255,0.9)` |

---

## Neumorphic Design Elements

### Card Base Style

```css
background: linear-gradient(145deg, #fafbfd, #eaecf0);
border-radius: 20px;
border: none;
box-shadow:
  5px 5px 12px rgba(180, 185, 195, 0.35),
  -5px -5px 12px rgba(255, 255, 255, 0.6);
```

### Card Hover State

```css
box-shadow:
  3px 3px 8px rgba(180, 185, 195, 0.4),
  -3px -3px 8px rgba(255, 255, 255, 0.7),
  inset 1px 1px 4px rgba(180, 185, 195, 0.15),
  inset -1px -1px 4px rgba(255, 255, 255, 0.4);
transform: translateY(-2px);
```

### Floating Pill Accent (Card Left Edge)

```css
/* Standard pill */
position: absolute;
left: -6px;
top: 1rem;
width: 12px;
height: 40px;
background: linear-gradient(180deg, [start-color], [end-color]);
border-radius: 6px;
box-shadow:
  1px 1px 4px rgba(0, 0, 0, 0.1),
  -1px -1px 3px rgba(255, 255, 255, 0.3);
```

### Pill Accent Colors by Type

| Type                      | Gradient              |
| ------------------------- | --------------------- |
| Student (Blue)            | `#1e3a8a` → `#3b82f6` |
| Staff (Red)               | `#991b1b` → `#ef4444` |
| Wizard (Purple)           | `#8b5cf6` → `#a855f7` |
| Summary (Orange)          | `#d97706` → `#fbbf24` |
| Account Status (Blue)     | `#1e3a8a` → `#3b82f6` |
| Password Section (Purple) | `#6b21a8` → `#a855f7` |
| Schedule Info (Red)       | `#991b1b` → `#ef4444` |
| Lunch (Green)             | `#166534` → `#22c55e` |

---

## Button Styles

### Primary Button (Navy)

```css
background: linear-gradient(45deg, #1d2a5d 0%, #1a365d 100%);
/* or */
background: linear-gradient(135deg, #1d2a5d 0%, #3730a3 100%);
color: white;
border-radius: 8px-12px;
box-shadow: 0 4px 12px rgba(29, 42, 93, 0.35);
padding: 0.75rem 1.5rem;
font-weight: 500-600;
```

### Hero Action Buttons

```css
/* Common properties */
height: 60px;
min-width: 140px;
border-radius: 12px;
font-weight: 700;
text-transform: uppercase;
letter-spacing: 0.5px;
padding: 1rem 0.75rem;
```

### Shimmer Effect (All Buttons)

```css
/* Before pseudo-element */
content: "";
position: absolute;
top: 0;
left: -100%;
width: 100%;
height: 100%;
background: linear-gradient(
  90deg,
  transparent,
  rgba(255, 255, 255, 0.3),
  transparent
);
transition: left 0.6s ease;

/* On hover */
left: 100%;
```

### Button State Transitions

```css
transition: all 0.3s ease;
/* or */
transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

/* Hover */
transform: translateY(-2px);
/* or with scale */
transform: translateY(-2px) scale(1.02);
```

### Disabled Button State

```css
opacity: 0.5-0.6;
cursor: not-allowed;
transform: none;
background: linear-gradient(45deg, #6c757d 0%, #5a6268 100%);
/* or */
background: #a1a1aa;
```

---

## Modal Styles

### Modal Overlay

```css
background-color: rgba(0, 0, 0, 0.5);
backdrop-filter: blur(6px);
z-index: 1000;
```

### Modal Content

```css
background: linear-gradient(145deg, #fafbfd, #eaecf0);
padding: 2rem;
padding-left: 2.25rem; /* Account for pill accent */
border-radius: 20px;
max-width: 600px;
max-height: 95vh;
animation: modalSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
```

### Modal Animation

```css
@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-30px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
```

---

## Grid Layouts

### Card Grid (Auto-fit)

```css
display: grid;
grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
gap: 1.5rem;
```

### Grade Selection Grid (Centered)

```css
display: grid;
grid-template-columns: repeat(auto-fit, minmax(90px, 120px));
gap: 1rem;
justify-content: center;
```

**Note:** Use `auto-fit` (not `auto-fill`) when you need items to center when there are fewer items than would fill the row.

### Fields Grid

```css
display: grid;
grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
gap: 1rem;
```

---

## Hero Section

### Hero Container

```css
background: linear-gradient(135deg, #1d2a5d 0%, #1a365d 100%);
height: 100vh;
color: white;
```

### Normal Header (Collapsed)

```css
background: #1d2a5d;
padding: 1.5rem 2rem;
box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
```

### Hero to Normal Transition

```css
transition: transform 0.8s cubic-bezier(0.4, 0, 0.2, 1);

/* Hidden state */
transform: translateY(-100vh);
```

---

## Search Bar

### Search Wrapper

```css
background: white;
border-radius: 10px;
box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2); /* Hero */
/* or */
box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); /* Normal header */
```

### Search Button

```css
background: linear-gradient(45deg, #c13435 0%, #a02728 100%);
border-radius: 8px;
box-shadow: 0 2px 8px rgba(193, 52, 53, 0.3);
```

---

## Animations

### Fade In Up (Content Entry)

```css
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### Icon Float (Buttons)

```css
@keyframes wizardIconFloat {
  0%,
  100% {
    transform: translateY(0) rotate(0deg);
  }
  25% {
    transform: translateY(-2px) rotate(2deg);
  }
  50% {
    transform: translateY(0) rotate(0deg);
  }
  75% {
    transform: translateY(-1px) rotate(-1deg);
  }
}
```

### Glow/Pulse (Active States)

```css
@keyframes activeStepGlow {
  0%,
  100% {
    box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
  }
  50% {
    box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
  }
}
```

### Spin (Loading)

```css
@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
```

### Sparkle Rotate (Completed Steps)

```css
@keyframes sparkleRotate {
  0% {
    transform: rotate(0deg) scale(1);
  }
  50% {
    transform: rotate(180deg) scale(1.2);
  }
  100% {
    transform: rotate(360deg) scale(1);
  }
}
```

---

## Responsive Breakpoints

| Breakpoint   | Max Width      | Usage                            |
| ------------ | -------------- | -------------------------------- |
| Desktop      | > 1024px       | Full layout                      |
| Tablet       | 768px - 1024px | Stacked sections, smaller gaps   |
| Mobile       | 480px - 768px  | Single column, reduced padding   |
| Small Mobile | < 480px        | Minimal padding, stacked buttons |

### Common Responsive Patterns

```css
/* Tablet */
@media (max-width: 1024px) {
  .fields-section {
    flex-direction: column;
  }
}

/* Mobile */
@media (max-width: 768px) {
  .user-grid {
    grid-template-columns: 1fr;
  }

  .wizard-navigation {
    flex-direction: column;
  }
}

/* Small Mobile */
@media (max-width: 480px) {
  body {
    padding: 10px;
  }

  .wizard-header h1 {
    font-size: 1.5rem;
  }
}
```

---

## Z-Index Scale

| Level           | Z-Index | Usage               |
| --------------- | ------- | ------------------- |
| Base            | 0       | Normal content      |
| Header          | 50      | Normal header       |
| Hero            | 100     | Hero container      |
| Sticky Sidebar  | 998-999 | Navigation sidebar  |
| Modal           | 1000    | Modal overlays      |
| Loading Overlay | 10000   | Full-screen loading |
| Copy Toast      | 10001   | Feedback toasts     |

---

## Component Quick Reference

### User Card

- Border radius: `20px`
- Min height: `160px`
- Padding: `1.5rem` (left: `1.75rem` for pill)
- Pill: `12px × 40px`

### Field Card

- Border radius: `14px`
- Padding: `0.875rem 1.25rem`
- Circular icon: `18px` diameter with `+` or `−`

### Grade Card

- Border radius: `14px`
- Max width: `120px`
- Min height: `65px`
- Pill: `8px × 22px`

### Progress Step

- Border radius: `50px` (pill shape)
- Padding: `0.75rem 1.5rem`
- Connector: `60px × 3px`

### Summary Item

- Border radius: `16px`
- Padding: `1rem`
- Pill: `10px × 25px`

---

## CSS File Organization

| File                     | Purpose                                    |
| ------------------------ | ------------------------------------------ |
| `site.css`               | Global resets, animations, messages        |
| `hero.css`               | Hero section, search, sidebar navigation   |
| `buttons.css`            | All button variants and states             |
| `cards.css`              | User card grid and styling                 |
| `modal.css`              | Modal dialogs, accordions, class schedules |
| `wizard-reports.css`     | Report wizard specific styles              |
| `wizard-setup.css`       | Setup wizard specific styles               |
| `class-finder.css`       | Class finder page styles                   |
| `phone-book.css`         | Phone book page styles                     |
| `transportation.css`     | Transportation page styles                 |
| `google-oauth-modal.css` | Google OAuth specific modal                |

---

## Best Practices

1. **Use CSS Variables for Colors** - When extending, consider migrating to CSS custom properties
2. **Maintain Neumorphic Consistency** - Always use matching gradient direction (`145deg`) and shadow values
3. **Pill Accents** - Every neumorphic card should have a colored pill accent on the left edge
4. **Button Shimmer** - All interactive buttons should have the shimmer hover effect
5. **Responsive First** - Test all new components across breakpoints
6. **Animation Timing** - Use `cubic-bezier(0.4, 0, 0.2, 1)` for smooth easing
7. **Overflow Management** - Set `overflow: visible` on elements with external pill accents
