# RMI Design System

> Source of truth: tailwind.config.mjs + src/styles/global.css
> Dark theme only. WCAG AAA compliance required on all components.

---

## Color Palette

Colors are defined as CSS custom properties in `src/styles/global.css` and consumed via `tailwind.config.mjs`.

### Primary (Grayscale)

| Token        | RGB             | Hex       | Usage                    |
| ------------ | --------------- | --------- | ------------------------ |
| primary-50   | 250 250 250     | `#fafafa` | Lightest surface         |
| primary-100  | 245 245 245     | `#f5f5f5` | Light surface            |
| primary-200  | 229 229 229     | `#e5e5e5` | Light border             |
| primary-300  | 212 212 212     | `#d4d4d4` | Muted text               |
| primary-400  | 163 163 163     | `#a3a3a3` | Secondary text           |
| primary-500  | 115 115 115     | `#737373` | Medium gray              |
| primary-600  | 82 82 82        | `#525252` | **DEFAULT** — dark gray  |
| primary-700  | 64 64 64        | `#404040` | Darker hover state       |
| primary-800  | 38 38 38        | `#262626` | Dark surface             |
| primary-900  | 23 23 23        | `#171717` | Deepest surface          |

### Accent (Bright Blue)

| Token       | RGB             | Hex       | Usage                      |
| ----------- | --------------- | --------- | -------------------------- |
| accent-50   | 239 246 255     | `#eff6ff` | Lightest tint              |
| accent-100  | 219 234 254     | `#dbeafe` | Light tint                 |
| accent-200  | 191 219 254     | `#bfdbfe` | Light accent               |
| accent-300  | 147 197 253     | `#93c5fd` | Hover highlights           |
| accent-400  | 96 165 250      | `#60a5fa` | Focus rings, active states |
| accent-500  | 59 130 246      | `#3b82f6` | **DEFAULT** — main accent  |
| accent-600  | 37 99 235       | `#2563eb` | CTA buttons, primary links |
| accent-700  | 29 78 216       | `#1d4ed8` | Hover state on CTAs        |
| accent-800  | 30 64 175       | `#1e40af` | Deep accent                |
| accent-900  | 30 58 138       | `#1e3a8a` | Darkest accent             |

### Neutral (Charcoal & Steel Grays)

Same RGB values as Primary palette. Used for text, backgrounds, and borders.

### Semantic Colors

| Token         | RGB             | Hex       | Usage           |
| ------------- | --------------- | --------- | --------------- |
| success       | 22 163 74       | `#16a34a` | Green-600       |
| success-light | 240 253 244     | `#f0fdf4` | Success bg      |
| success-dark  | 20 83 45        | `#14532d` | Success text    |
| error         | 220 38 38       | `#dc2626` | Red-600         |
| error-light   | 254 242 242     | `#fef2f2` | Error bg        |
| error-dark    | 153 27 27       | `#991b1b` | Error text      |
| warning       | 217 119 6       | `#d97706` | Amber-600       |
| warning-light | 255 251 235     | `#fffbeb` | Warning bg      |
| warning-dark  | 146 64 14       | `#92400e` | Warning text    |

---

## Typography

### Font Families

- **Body**: System font stack (Tailwind default)
- **Display**: `'Russo One'` — loaded via Google Fonts, used for hero headline

### Type Scale

| Token | Size      | Line Height | Letter Spacing | Pixel   |
| ----- | --------- | ----------- | -------------- | ------- |
| xs    | 0.75rem   | 1.6         | 0.025em        | 12px    |
| sm    | 0.875rem  | 1.7         | 0.025em        | 14px    |
| base  | 1rem      | 1.75        | 0.01em         | 16px    |
| lg    | 1.125rem  | 1.75        | 0.01em         | 18px    |
| xl    | 1.25rem   | 1.7         | 0em            | 20px    |
| 2xl   | 1.5rem    | 1.5         | -0.01em        | 24px    |
| 3xl   | 1.875rem  | 1.4         | -0.02em        | 30px    |
| 4xl   | 2.25rem   | 1.3         | -0.02em        | 36px    |
| 5xl   | 3rem      | 1.2         | -0.03em        | 48px    |
| 6xl   | 3.75rem   | 1.15        | -0.03em        | 60px    |
| 7xl   | 4.5rem    | 1.1         | -0.04em        | 72px    |
| 8xl   | 6rem      | 1.1         | -0.04em        | 96px    |
| 9xl   | 8rem      | 1.05        | -0.05em        | 128px   |

### Font Weights

| Token     | Value |
| --------- | ----- |
| normal    | 400   |
| medium    | 500   |
| semibold  | 600   |
| bold      | 700   |
| extrabold | 800   |

---

## Spacing Scale

Tailwind defaults plus custom extensions in `tailwind.config.mjs`:

| Token | Value    | Pixels |
| ----- | -------- | ------ |
| 18    | 4.5rem   | 72px   |
| 22    | 5.5rem   | 88px   |
| 26    | 6.5rem   | 104px  |
| 30    | 7.5rem   | 120px  |
| 34    | 8.5rem   | 136px  |
| 38    | 9.5rem   | 152px  |
| 42    | 10.5rem  | 168px  |
| 46    | 11.5rem  | 184px  |
| 50    | 12.5rem  | 200px  |

### Container Padding

| Breakpoint | Padding |
| ---------- | ------- |
| DEFAULT    | 1rem    |
| sm (640px) | 1.5rem  |
| lg (1024px)| 2rem    |
| xl (1280px)| 2.5rem  |

### Container Max Widths

| Breakpoint | Max Width |
| ---------- | --------- |
| sm         | 640px     |
| md         | 768px     |
| lg         | 1024px    |
| xl         | 1280px    |
| 2xl        | 1400px    |

---

## Border Radius

Defined as CSS custom properties in `global.css`:

| Token  | Value     | Pixels |
| ------ | --------- | ------ |
| none   | 0         | 0      |
| sm     | 0.25rem   | 4px    |
| base   | 0.375rem  | 6px    |
| md     | 0.5rem    | 8px    |
| lg     | 0.75rem   | 12px   |
| xl     | 1rem      | 16px   |
| 2xl    | 1.25rem   | 20px   |
| 3xl    | 1.5rem    | 24px   |
| full   | 9999px    | pill   |

---

## Box Shadows

Defined as CSS custom properties in `global.css`:

| Token  | Value                                                                 |
| ------ | --------------------------------------------------------------------- |
| xs     | `0 1px 2px 0 rgb(0 0 0 / 0.05)`                                      |
| sm     | `0 1px 2px 0 rgb(0 0 0 / 0.08)`                                      |
| base   | `0 2px 4px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)`  |
| md     | `0 4px 6px -2px rgb(0 0 0 / 0.1), 0 2px 4px -3px rgb(0 0 0 / 0.1)`  |
| lg     | `0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)`|
| xl     | `0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)`|
| 2xl    | `0 25px 50px -12px rgb(0 0 0 / 0.15)`                                |
| inner  | `inset 0 2px 4px 0 rgb(0 0 0 / 0.08)`                               |

---

## Animation & Transitions

### Keyframes (defined in global.css)

| Name                   | Description                                      | Duration               |
| ---------------------- | ------------------------------------------------ | ---------------------- |
| service-ticker-scroll  | Marquee translateX(0) → translateX(-50%)         | 36s (desktop), 60s (tablet), 90s (mobile) |
| modalIn                | Scale 0.95 + opacity 0 → scale 1 + opacity 1    | Used on service modals |
| fadeIn                 | Opacity 0 → 1                                    | General fade           |
| kenBurns               | Scale 1 → 1.05, brightness 1 → 1.05             | Hero background images |

### Standard Transition

- Duration: 200ms–300ms ease-in-out (component hover/focus)
- Never use: instant transitions, opacity flash, layout-shifting animations
- Reduced motion: All animations respect `prefers-reduced-motion: reduce`
- Marquee in reduced motion: Slowed to 120s, never stopped

### Marquee Behavior

- Pauses on hover (CSS `animation-play-state: paused`)
- Speed varies by breakpoint for readability

---

## Breakpoints

| Width   | Label            |
| ------- | ---------------- |
| 320px   | Mobile small     |
| 375px   | Mobile standard  |
| 414px   | Mobile large     |
| 640px   | Tailwind `sm`    |
| 768px   | Tablet / `md`    |
| 1024px  | Desktop small / `lg` |
| 1280px  | Desktop standard / `xl` |
| 1400px  | Max content / `2xl` |

---

## Component Patterns

### Cards (About.tsx)

- Background: `bg-neutral-900/50 backdrop-blur-sm`
- Border: `border border-neutral-700/50`
- Padding: `p-6 sm:p-8`
- Border radius: `rounded-xl`
- Hover: `hover:border-accent-500/30`
- Shadow: `shadow-lg`

### Service Cards (Services.tsx)

- Background: `bg-neutral-900/50 backdrop-blur-sm`
- Border: `border border-neutral-700/50 border-l-[3px] border-l-accent-500`
- Padding: `p-4`
- Hover: `hover:border-l-accent-400 hover:bg-neutral-800/60 hover:-translate-y-0.5 hover:shadow-lg`
- Transition: `transition-all duration-200`

### Buttons / CTAs

**Primary (btn-primary class):**
- Background: `bg-accent-600`
- Text: `text-white font-semibold`
- Padding: `px-6 py-3`
- Border radius: `rounded-md`
- Hover: `hover:bg-accent-500 hover:scale-105 hover:-translate-y-1`
- Focus: `focus-visible:ring-2 focus-visible:ring-accent-400`
- Active: `active:bg-accent-700`

### Forms (ContactForm.tsx)

- Input background: `bg-neutral-800/50 backdrop-blur-sm`
- Input border: `border border-neutral-600`
- Input focus: `focus:border-accent-500 focus:ring-1 focus:ring-accent-500/50`
- Input text: `text-white placeholder-neutral-500`
- Input font-size: 16px minimum (prevents iOS zoom)
- Validation error: `border-red-400 text-red-300`

### Navigation (Navbar.astro)

- Default: `bg-neutral-900/85 backdrop-blur(8px)` — semi-transparent
- Scrolled (>50px): `bg-neutral-900/95 backdrop-blur(12px)` — more opaque + shadow
- Mobile open: Full-screen overlay `bg-neutral-900/97 backdrop-blur(12px)`
- Active link: White text + blue underline (`accent-500`)
- Height: `h-12 sm:h-14`

---

## Accessibility Standards

- Minimum contrast ratio: 7:1 (WCAG AAA)
- Focus indicators: Visible `ring-2 ring-accent-400` on all interactive elements
- Touch targets: 44x44px minimum
- Screen reader: All images have alt text, all forms have labels
- Skip link: Present in BaseLayout.astro
- Reduced motion: Respected via `prefers-reduced-motion` media query
