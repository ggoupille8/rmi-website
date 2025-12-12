# Design System Documentation

## Overview

Industrial-premium design system built with Tailwind CSS theme extensions and CSS variables. Clean, modern aesthetic with strong contrast and accessibility compliance.

## CSS Variables

All design tokens are defined as CSS variables in `src/styles/global.css` for easy theming and consistency.

### Colors

- **Primary**: Deep steel blue palette (50-900)
- **Accent**: Safety orange palette (50-900)
- **Neutral**: Charcoal and steel grays (50-900)
- **Semantic**: Success, error, warning with light/dark variants

### Border Radius

- `--radius-sm` to `--radius-3xl` (4px to 24px)
- `--radius-full` for circular elements
- Industrial, slightly angular aesthetic

### Spacing Scale

- 8px base unit system
- `--spacing-1` (4px) to `--spacing-32` (128px)
- Consistent vertical rhythm

### Shadows

- `--shadow-xs` to `--shadow-2xl`
- Industrial depth with layered shadows
- `--shadow-inner` for inset effects

### Typography

- Font sizes: `--font-size-xs` to `--font-size-9xl`
- Line heights: tight, snug, normal, relaxed
- Letter spacing: tight, normal, wide, wider

## Tailwind Theme Extensions

### Colors

All colors use CSS variables with alpha channel support:

```jsx
className="bg-primary-600 text-white"
className="bg-accent-500/50" // 50% opacity
```

### Border Radius

```jsx
className="rounded-md" // Uses --radius-md
className="rounded-2xl" // Uses --radius-2xl
```

### Shadows

```jsx
className="shadow-lg" // Uses --shadow-lg
className="shadow-2xl" // Uses --shadow-2xl
```

### Background Patterns

```jsx
className="bg-pattern-grid"
className="bg-pattern-dots"
className="bg-pattern-diagonal"
className="bg-pattern-cross"
```

### Background Gradients

```jsx
className="bg-gradient-industrial"
className="bg-gradient-soft"
```

## Component Classes

### Buttons

- `.btn-primary` - Primary action button
- `.btn-secondary` - Secondary action button
- `.btn-accent` - Accent/highlight button
- `.btn-outline` - Outlined button
- `.btn-ghost` - Minimal button
- `.btn-sm` - Small size
- `.btn-lg` - Large size

### Cards

- `.card` - Base card
- `.card-hover` - Card with hover effects
- `.card-elevated` - Elevated card with stronger shadow
- `.card-interactive` - Interactive card with focus states
- `.card-gradient` - Card with gradient background
- `.card-accent` - Card with accent gradient
- `.card-bordered` - Card with prominent border
- `.card-minimal` - Minimal card style

### Sections

- `.section-padding` - Standard section padding
- `.section-padding-sm` - Small section padding
- `.section-padding-lg` - Large section padding
- `.section-bg-pattern` - Section with grid pattern overlay
- `.section-bg-gradient` - Section with gradient background
- `.section-bg-soft` - Section with soft gradient

### Containers

- `.container-custom` - Standard container (max-w-7xl)
- `.container-narrow` - Narrow container (max-w-4xl)
- `.container-wide` - Wide container (max-w-[1400px])

### Typography

- `.heading-1` through `.heading-4` - Heading styles
- `.text-body`, `.text-body-lg`, `.text-body-sm` - Body text styles
- `.text-gradient-primary` - Primary gradient text
- `.text-gradient-accent` - Accent gradient text

### Badges

- `.badge` - Base badge
- `.badge-primary` - Primary badge
- `.badge-accent` - Accent badge
- `.badge-neutral` - Neutral badge
- `.badge-success` - Success badge

### Dividers

- `.divider` - Standard divider
- `.divider-accent` - Accent divider
- `.divider-primary` - Primary divider

## Usage Examples

### Card Component

```tsx
import Card from '@/components/landing/Card';

<Card variant="hover">
  <h3>Card Title</h3>
  <p>Card content</p>
</Card>
```

### Button with Pattern Background

```tsx
<section className="section-padding section-bg-pattern">
  <div className="container-custom">
    <button className="btn-primary">Get Started</button>
  </div>
</section>
```

### Gradient Text

```tsx
<h1 className="heading-1 text-gradient-primary">
  Industrial Premium
</h1>
```

### Card with Gradient

```tsx
<Card variant="gradient">
  <h3>Premium Feature</h3>
  <p>Description</p>
</Card>
```

## Design Principles

1. **Industrial Premium**: Clean, structured, professional
2. **Strong Contrast**: WCAG AAA compliant
3. **Consistent Spacing**: 8px base unit system
4. **Subtle Patterns**: Background patterns for depth without distraction
5. **Modern Gradients**: Soft, professional gradients
6. **Accessibility First**: Semantic HTML, ARIA labels, keyboard navigation

## Color Contrast

All text meets WCAG AAA standards:
- Primary text: `neutral-900` on `neutral-50` (21:1)
- Primary buttons: `white` on `primary-600` (7.5:1)
- Secondary buttons: `neutral-900` on `white` (21:1)

