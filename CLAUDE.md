# CLAUDE.md — Resource Mechanical Insulation

> **Purpose**: This document is the single source of truth for AI-assisted development on this codebase. It defines architecture, conventions, workflows, and constraints that ensure consistent, high-quality contributions.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Architecture](#architecture)
4. [Directory Structure](#directory-structure)
5. [Development Workflow](#development-workflow)
6. [Code Standards](#code-standards)
7. [Testing Strategy](#testing-strategy)
8. [Content Management](#content-management)
9. [API Reference](#api-reference)
10. [Styling System](#styling-system)
11. [Performance & Optimization](#performance--optimization)
12. [Security](#security)
13. [Deployment](#deployment)
14. [Troubleshooting](#troubleshooting)
15. [Constraints & Non-Negotiables](#constraints--non-negotiables)
16. [Output Protocol](#output-protocol)

---

## Project Overview

### Mission

Ship a clean, fast landing site that drives inbound leads primarily through email for Resource Mechanical Insulation, LLC.

### Success Metrics

- `npm run dev` works without errors
- `npm run build` stays green
- Visual regression tests pass
- Page load time < 3s on 3G
- Accessibility score ≥ 95 (Lighthouse)
- Email CTA conversion as primary goal

### Guiding Principles

1. **No scope creep** — Small, verifiable diffs only
2. **Ship complete** — If claimed done, it must be done, tested, and summarized
3. **Single source of truth** — All content flows from `src/content/site.ts`
4. **Stability first** — Never break what's working

---

## Tech Stack

### Core Framework

| Technology | Version | Purpose |
|------------|---------|---------|
| **Astro** | 4.0.0 | Static site generator with hybrid SSR |
| **React** | 18.2.0 | Interactive component islands |
| **TypeScript** | 5.3.3 | Type safety and developer experience |
| **Node.js** | 20.x | Runtime (see `.nvmrc`) |

### Styling

| Technology | Version | Purpose |
|------------|---------|---------|
| **Tailwind CSS** | 3.3.6 | Utility-first CSS framework |
| **CSS Custom Properties** | — | Design tokens in `global.css` |

### Backend & Services

| Technology | Version | Purpose |
|------------|---------|---------|
| **@vercel/postgres** | 0.10.0 | PostgreSQL database |
| **@sendgrid/mail** | 8.1.6 | Transactional email |
| **@astrojs/vercel** | 7.8.2 | Serverless deployment adapter |

### Testing

| Technology | Version | Purpose |
|------------|---------|---------|
| **Playwright** | 1.57.0 | Visual regression & E2E testing |

### UI Components

| Technology | Version | Purpose |
|------------|---------|---------|
| **lucide-react** | 0.561.0 | Consistent iconography |

---

## Architecture

### Rendering Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                    HYBRID OUTPUT MODE                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   STATIC     │    │   ISLANDS    │    │  SERVERLESS  │  │
│  │   PAGES      │    │   (React)    │    │     API      │  │
│  │              │    │              │    │              │  │
│  │ index.astro  │    │ ContactForm  │    │ /api/quote   │  │
│  │ (prerender)  │    │ client:load  │    │ /api/contact │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  site.ts        │────▶│   Components    │────▶│   Rendered      │
│  (Content)      │     │   (React/Astro) │     │   HTML/JS       │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                │
                                ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  User Input     │────▶│   API Routes    │────▶│   Database +    │
│  (Forms)        │     │   (Serverless)  │     │   SendGrid      │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Component Architecture

```
src/components/
├── landing/              # Production components (USE THESE)
│   ├── Hero.tsx         # Hero section with CTAs
│   ├── Services.tsx     # Services grid display
│   ├── ContactForm.tsx  # Quote request form (client:load)
│   ├── Footer.tsx       # Footer with contact info
│   ├── FloatingMobileCTA.tsx  # Mobile floating button
│   ├── Card.tsx         # Reusable card component
│   ├── SafetyAndPerformance.tsx
│   ├── Process.tsx
│   └── GradientBlendOverlay.tsx
│
└── [root level]          # Legacy components (DO NOT USE)
    ├── ContactForm.tsx   # Deprecated
    ├── FAQ.tsx           # Deprecated - REMOVE
    ├── Hero.tsx          # Deprecated
    ├── Services.tsx      # Deprecated
    └── WhyUs.tsx         # Deprecated - REMOVE
```

---

## Directory Structure

```
root/
├── .github/
│   └── workflows/
│       └── main.yml          # CI/CD pipeline (Windows runner)
│
├── public/                   # Static assets (served as-is)
│   ├── images/
│   │   └── hero/
│   ├── favicon.svg
│   ├── apple-touch-icon.png
│   ├── robots.txt
│   └── site.webmanifest
│
├── src/
│   ├── components/
│   │   └── landing/          # ← USE THESE COMPONENTS
│   │
│   ├── content/
│   │   └── site.ts           # ← SINGLE SOURCE OF TRUTH
│   │
│   ├── config/
│   │   └── site.ts           # Site configuration
│   │
│   ├── layouts/
│   │   └── BaseLayout.astro  # Main layout with meta tags
│   │
│   ├── lib/
│   │   └── db-env.ts         # Database environment resolver
│   │
│   ├── pages/
│   │   ├── index.astro       # Homepage
│   │   └── api/
│   │       ├── contact.ts    # Contact form endpoint
│   │       ├── quote.ts      # Quote request endpoint
│   │       ├── healthz.ts    # Health check
│   │       └── admin/
│   │           ├── contacts.ts
│   │           └── quotes.ts
│   │
│   ├── styles/
│   │   └── global.css        # Design tokens & utilities
│   │
│   └── env.d.ts              # TypeScript env declarations
│
├── scripts/                  # Build & utility scripts
│   ├── check-secrets.js      # Security: scan for exposed secrets
│   ├── db-init.mjs           # Database initialization
│   ├── fix-runtime.js        # Post-build runtime fixes
│   ├── ports-free.ps1        # Windows: free dev ports
│   ├── smoke.ps1             # Smoke tests (Windows)
│   ├── smoke.sh              # Smoke tests (Unix)
│   └── test-runtime-config.js
│
├── tests/
│   ├── visual/
│   │   ├── home.spec.ts      # Visual regression tests
│   │   └── home.spec.ts-snapshots/  # Baseline images
│   ├── accessibility.spec.ts
│   ├── content.spec.ts
│   └── functionality.spec.ts
│
├── artifacts/                # Generated test artifacts
│
├── astro.config.mjs          # Astro configuration
├── tailwind.config.mjs       # Tailwind design system
├── playwright.config.ts      # Test configuration
├── tsconfig.json             # TypeScript configuration
├── vercel.json               # Deployment configuration
├── schema.sql                # Database schema
├── package.json
├── .env.example              # Environment template
├── .nvmrc                    # Node version (20)
└── CLAUDE.md                 # This file
```

---

## Development Workflow

### Initial Setup

```powershell
# 1. Clone and install
git clone <repo>
cd <repo>
npm install

# 2. Configure environment
copy .env.example .env.local
# Edit .env.local with your secrets

# 3. Start development
npm run dev
```

### Available Scripts

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `npm run dev` | Start dev server (port 4321) | Daily development |
| `npm run dev:all` | Free ports + start dev | When port conflicts occur |
| `npm run build` | Production build | Before commit/deploy |
| `npm run preview` | Preview production build | Test production locally |
| `npm run test:visual` | Run visual regression tests | After any UI change |
| `npm run test:visual:update` | Update visual baselines | When change is intentional |
| `npm run test:runtime` | Test runtime configuration | After infra changes |
| `npm run smoke` | End-to-end sanity check | Before major releases |
| `npm run check-secrets` | Scan for exposed secrets | Before every commit |
| `npm run db:init` | Initialize database schema | First-time setup |

### Development Cycle

```
┌─────────────────────────────────────────────────────────────┐
│                    DEVELOPMENT CYCLE                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. PLAN          2. IMPLEMENT        3. VERIFY             │
│  ─────────────    ─────────────       ─────────────         │
│  • Scope change   • Update site.ts    • npm run build       │
│  • Check impact   • Edit components   • npm run test:visual │
│  • Review tests   • Style with TW     • Manual dark mode    │
│                   • Add tests         • Check mobile        │
│                                                              │
│  4. DOCUMENT      5. COMMIT           6. DEPLOY             │
│  ─────────────    ─────────────       ─────────────         │
│  • List changes   • Scoped message    • Push to main        │
│  • Note files     • No && chains      • CI validates        │
│  • Show results   • Small diff        • Auto-deploy         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Windows-Specific Rules

⚠️ **CRITICAL**: This project runs CI on Windows.

```powershell
# ❌ WRONG - Do not use && chains
npm run build && npm run test:visual

# ✅ CORRECT - Separate commands
npm run build
npm run test:visual
```

---

## Code Standards

### TypeScript

```typescript
// ✅ Use explicit types for component props
interface HeroProps {
  headline: string;
  subheadline: string;
  ctaPrimary: string;
  ctaSecondary?: string;
}

// ✅ Use const assertions for static data
const SERVICES = [
  { id: 'piping', name: 'Piping Insulation' },
] as const;

// ✅ Prefer interfaces over types for objects
interface ContactFormData {
  name: string;
  email: string;
  message: string;
}

// ❌ Avoid any type
const data: any = fetchData();  // Bad
const data: unknown = fetchData();  // Better
```

### React Components

```tsx
// ✅ Functional components with TypeScript
export function ServiceCard({ service }: { service: Service }) {
  return (
    <div className="card card-hover">
      <h3>{service.title}</h3>
    </div>
  );
}

// ✅ Use client:load only when necessary
<ContactForm client:load />

// ✅ Import from content source
import { companyName, email } from '@/content/site';

// ❌ Never hardcode company info
const name = "Resource Mechanical Insulation";  // Bad
```

### Astro Pages

```astro
---
// ✅ Imports at top
import BaseLayout from '@/layouts/BaseLayout.astro';
import Hero from '@components/landing/Hero';
import { heroHeadline } from '@/content/site';

// ✅ Use content from site.ts
const title = heroHeadline;
---

<BaseLayout title={title}>
  <Hero client:load />
</BaseLayout>
```

### Path Aliases

```typescript
// tsconfig.json defines these aliases:
import { data } from '@/content/site';           // src/
import Hero from '@components/Hero';              // src/components/
import Card from '@components/landing/Card';      // src/components/landing/
```

---

## Testing Strategy

### Visual Regression Testing

Primary feedback loop for UI changes.

**Test Matrix:**

| Viewport | Light Mode | Dark Mode |
|----------|------------|-----------|
| Desktop (1440px) | ✓ | ✓ |
| Tablet (768px) | ✓ | ✓ |
| Mobile (375px) | ✓ | ✓ |
| iPhone | ✓ | ✓ |
| Android | ✓ | ✓ |

**Commands:**

```powershell
# Run visual tests
npm run test:visual

# Update baselines (requires justification)
npm run test:visual:update
npm run test:visual
```

**Snapshot Rules:**

1. Never update snapshots without clear justification
2. State what changed and why it's intentional
3. Verify both light and dark modes
4. Check all viewport sizes

### Test Files

| File | Purpose |
|------|---------|
| `tests/visual/home.spec.ts` | Homepage visual snapshots |
| `tests/functionality.spec.ts` | Form submission, navigation |
| `tests/accessibility.spec.ts` | WCAG compliance |
| `tests/content.spec.ts` | Content verification |

### Pre-Commit Checklist

```
□ npm run build                    PASS/FAIL
□ npm run test:visual              PASS/FAIL
□ npm run test:runtime             PASS/FAIL (if infra changes)
□ npm run check-secrets            PASS/FAIL
□ Dark mode verified               PASS/FAIL
□ Mobile viewport verified         PASS/FAIL
```

---

## Content Management

### Single Source of Truth

**File:** `src/content/site.ts`

All company constants MUST come from this file. Never duplicate elsewhere.

```typescript
// src/content/site.ts — THE AUTHORITY

// Company Identity
export const companyName = "Resource Mechanical Insulation";
export const companyNameFull = "Resource Mechanical Insulation, LLC";

// Contact Information
export const email = "fab@rmi-llc.net";
export const phone = "419-705-6153";
export const phoneE164 = "+14197056153";

// Address
export const address = {
  street: "11677 Wayne Road, Suite 112",
  city: "Romulus",
  state: "MI",
  zip: "48174",
  full: "11677 Wayne Road, Suite 112, Romulus, MI 48174"
};

// Service Area
export const serviceArea = "Michigan and surrounding areas.";

// Hero Content
export const heroHeadline = "Resource Mechanical Insulation";
export const heroSubheadline = "...";
export const heroCtaPrimary = "Request a Quote";
export const heroCtaSecondary = phone;

// Services (Array of 6)
export const services = [...];

// Materials (20+ items)
export const materials = [...];
```

### Content Change Protocol

```
┌─────────────────────────────────────────────────────────────┐
│                 CONTENT CHANGE WORKFLOW                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. UPDATE SOURCE                                            │
│     └── Edit src/content/site.ts                            │
│                                                              │
│  2. SEARCH FOR DUPLICATES                                    │
│     └── grep -r "old value" src/                            │
│                                                              │
│  3. UPDATE CONSUMERS                                         │
│     └── Fix any hardcoded references                        │
│                                                              │
│  4. REMOVE DUPLICATES                                        │
│     └── Delete redundant definitions                        │
│                                                              │
│  5. VERIFY                                                   │
│     └── npm run build && npm run test:visual                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Homepage Sections

**Keep (supports conversion):**
- Hero
- Services & Systems
- Safety & Performance
- Materials & Pipe Supports (if supports sales path)
- Request a Quote
- Footer

**Remove (filler):**
- FAQ section — delete components/imports/content
- "Why Choose Us" — delete components/imports/content

---

## API Reference

### POST `/api/quote`

Quote request submission endpoint.

**Rate Limit:** 5 requests per 15 minutes per IP

**Request:**
```typescript
interface QuoteRequest {
  name: string;          // Required, max 100 chars
  company: string;       // Required, max 100 chars
  email: string;         // Required, valid email
  phone: string;         // Required, 10-11 digits
  serviceType: string;   // Required, from services list
  message: string;       // Required, max 2000 chars
  honeypot?: string;     // Must be empty (spam detection)
  timestamp: number;     // Unix timestamp (min 2s elapsed)
}
```

**Response:**
```typescript
// Success
{ ok: true, requestId: string }

// Error
{ ok: false, error: string, code?: string }
```

### POST `/api/contact`

General contact form endpoint.

**Rate Limit:** 5 requests per minute per IP

**Request:**
```typescript
interface ContactRequest {
  name: string;          // Required
  email: string;         // Required, valid email
  message: string;       // Required
  source?: string;       // 'contact' | 'footer'
  website?: string;      // Honeypot, must be empty
  timestamp: number;
  metadata?: object;
}
```

### GET `/api/healthz`

Health check endpoint for monitoring.

**Response:** `200 OK` or error status

### Admin Endpoints

Require `ADMIN_API_KEY` header.

- `GET /api/admin/quotes` — List quote submissions
- `GET /api/admin/contacts` — List contact submissions

### Database Schema

```sql
-- quotes table
CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  name VARCHAR(255) NOT NULL,
  company VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  service_type VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- contacts table
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(254) NOT NULL,
  message TEXT NOT NULL,
  source VARCHAR(50) DEFAULT 'contact',
  metadata JSONB DEFAULT '{}'::jsonb
);
```

---

## Styling System

### Design Tokens

Located in `src/styles/global.css` and `tailwind.config.mjs`.

**Color Palette:**

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `--color-primary-600` | #2563EB | #3B82F6 | Primary actions, links |
| `--color-accent-500` | #F97316 | #FB923C | CTAs, highlights |
| `--color-neutral-900` | #111827 | #F9FAFB | Text primary |
| `--color-neutral-50` | #F9FAFB | #111827 | Backgrounds |

**Typography Scale:**

```css
/* Fluid typography with clamp() */
--text-xs: clamp(0.75rem, 0.7rem + 0.25vw, 0.875rem);
--text-sm: clamp(0.875rem, 0.8rem + 0.375vw, 1rem);
--text-base: clamp(1rem, 0.9rem + 0.5vw, 1.125rem);
--text-lg: clamp(1.125rem, 1rem + 0.625vw, 1.25rem);
--text-xl: clamp(1.25rem, 1.1rem + 0.75vw, 1.5rem);
--text-2xl: clamp(1.5rem, 1.25rem + 1.25vw, 2rem);
--text-3xl: clamp(1.875rem, 1.5rem + 1.875vw, 2.5rem);
--text-4xl: clamp(2.25rem, 1.75rem + 2.5vw, 3rem);
```

### Component Classes

**Buttons:**
```html
<button class="btn-primary">Primary Action</button>
<button class="btn-secondary">Secondary</button>
<button class="btn-accent">Accent CTA</button>
<button class="btn-outline">Outline</button>
<button class="btn-ghost">Ghost</button>

<!-- Sizes -->
<button class="btn-primary btn-sm">Small</button>
<button class="btn-primary btn-lg">Large</button>
```

**Cards:**
```html
<div class="card">Basic card</div>
<div class="card card-hover">Hoverable</div>
<div class="card card-elevated">Elevated shadow</div>
<div class="card card-interactive">Clickable</div>
<div class="card card-gradient">Gradient background</div>
<div class="card card-accent">Accent border</div>
```

**Typography:**
```html
<h1 class="heading-1">Page Title</h1>
<h2 class="heading-2">Section Title</h2>
<h3 class="heading-3">Subsection</h3>
<h4 class="heading-4">Card Title</h4>
<p class="text-body">Body text</p>
<p class="text-body-lg">Large body</p>
<p class="text-body-sm">Small body</p>
```

**Layout:**
```html
<div class="container-custom">Standard width</div>
<div class="container-narrow">Narrow content</div>
<div class="container-wide">Wide content</div>
<section class="section-padding">Standard spacing</section>
<section class="section-padding-lg">Large spacing</section>
```

### Dark Mode

Dark mode is handled via CSS custom properties. No `dark:` prefixes needed.

```css
/* Variables automatically switch */
:root {
  --color-bg: var(--color-neutral-50);
  --color-text: var(--color-neutral-900);
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: var(--color-neutral-900);
    --color-text: var(--color-neutral-50);
  }
}
```

**Dark Mode Requirements:**
- Every new UI must include dark mode styling
- Test both modes before claiming done
- Never ship low-contrast text (gray-on-dark)

### Accessibility

| Requirement | Standard |
|-------------|----------|
| Color contrast (normal text) | 7:1 (WCAG AAA) |
| Color contrast (large text) | 4.5:1 (WCAG AAA) |
| Minimum font size | 16px (prevents iOS zoom) |
| Focus indicators | Visible ring on all interactive elements |
| Reduced motion | Respect `prefers-reduced-motion` |

---

## Performance & Optimization

### Rendering Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                  PERFORMANCE PRIORITIES                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. PREFER ASTRO RENDERING                                   │
│     └── Static HTML whenever possible                       │
│     └── Use client:load only for interactive components     │
│                                                              │
│  2. MINIMIZE CLIENT JS                                       │
│     └── ContactForm needs client:load (form state)          │
│     └── FloatingMobileCTA needs client:load (visibility)    │
│     └── Everything else should be static                    │
│                                                              │
│  3. OPTIMIZE ASSETS                                          │
│     └── Use WebP/AVIF for images                            │
│     └── Lazy load below-fold images                         │
│     └── Preconnect to Google Fonts                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Bundle Rules

- **No large dependencies** without explicit approval
- **Prefer native** over library solutions
- **Tree-shake** — import only what's needed

```typescript
// ✅ Good - specific import
import { Mail, Phone } from 'lucide-react';

// ❌ Bad - imports entire library
import * as Icons from 'lucide-react';
```

### Image Optimization

```html
<!-- ✅ Responsive images -->
<img
  src="/images/hero/hero-1.jpg"
  srcset="/images/hero/hero-1-400.jpg 400w,
          /images/hero/hero-1-800.jpg 800w,
          /images/hero/hero-1-1200.jpg 1200w"
  sizes="(max-width: 768px) 100vw, 50vw"
  loading="lazy"
  alt="Industrial insulation installation"
/>
```

---

## Security

### Environment Variables

**File:** `.env.local` (git-ignored)

```bash
# Required for email
SENDGRID_API_KEY=SG.xxx

# Email routing
QUOTE_TO_EMAIL=fab@rmi-llc.net
QUOTE_FROM_EMAIL=no-reply@rmi-llc.net

# Database
POSTGRES_URL=postgres://...

# Admin access
ADMIN_API_KEY=secure-random-key

# Development
BASE_URL=http://localhost:4321
```

### Security Checklist

```
□ Run npm run check-secrets before every commit
□ Never commit .env.local or secrets
□ Use ADMIN_API_KEY for admin endpoints
□ Validate all user input server-side
□ Sanitize output to prevent XSS
□ Rate limit API endpoints
□ Use honeypot fields for spam prevention
```

### Input Validation

All API endpoints validate:
- Email format (regex)
- Phone format (10-11 digits)
- Field length limits
- Required fields
- Honeypot empty
- Submission timing (min 2s elapsed)

---

## Deployment

### Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                    CI/CD PIPELINE                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  TRIGGER: Push to main or PR to main                        │
│  RUNNER: windows-latest (30 min timeout)                    │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ Install  │─▶│ Secrets  │─▶│  Build   │─▶│  Test    │    │
│  │ Deps     │  │  Check   │  │          │  │  Visual  │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
│                                                              │
│                              │                               │
│                              ▼                               │
│                    ┌──────────────────┐                     │
│                    │  Vercel Deploy   │                     │
│                    │  (auto on pass)  │                     │
│                    └──────────────────┘                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Vercel Configuration

**File:** `vercel.json`

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "astro"
}
```

### Environment Setup (Vercel)

Required environment variables in Vercel project settings:
- `SENDGRID_API_KEY`
- `POSTGRES_URL`
- `ADMIN_API_KEY`
- `QUOTE_TO_EMAIL`
- `QUOTE_FROM_EMAIL`

---

## Troubleshooting

### Common Issues

**Port 4321 already in use:**
```powershell
npm run ports:free
npm run dev
```

**Visual tests failing unexpectedly:**
```powershell
# Check for unintentional changes
npm run test:visual

# If change is intentional, update with justification
npm run test:visual:update
# Document: "Updated because [specific reason]"
```

**Build fails with TypeScript errors:**
```powershell
# Check types
npx tsc --noEmit

# Common fix: ensure imports use path aliases
import { data } from '@/content/site';  # Not '../content/site'
```

**Database connection fails:**
```powershell
# Verify environment
node scripts/test-runtime-config.js

# Check POSTGRES_URL is set
echo $env:POSTGRES_URL
```

**Dark mode looks broken:**
```
1. Check CSS variables are defined for both modes
2. Verify no hardcoded colors (use var(--color-*))
3. Test with system preference toggle
```

### Debug Scripts

| Script | Purpose |
|--------|---------|
| `scripts/test-runtime-config.js` | Verify runtime environment |
| `scripts/verify-dom-parity.js` | Check DOM consistency |
| `scripts/mobile-qa.ts` | Mobile-specific QA |
| `scripts/verify-contact-api.ps1` | Test contact API |

---

## Constraints & Non-Negotiables

### Absolute Rules

| Rule | Consequence of Breaking |
|------|------------------------|
| Do not change API contracts | Breaks integrations |
| Do not introduce new frameworks | Scope creep |
| Do not break dark mode | Accessibility violation |
| Email CTA is primary | Conversion loss |
| No incomplete work | Technical debt |

### API Contract Lock

```
Routes, request shapes, and response shapes are LOCKED.

To change an API:
1. Get explicit approval
2. Document breaking changes
3. Update all consumers
4. Add migration path
```

### Framework Lock

```
Current stack is LOCKED:
- Astro 4.x
- React 18.x
- Tailwind 3.x
- Playwright

No new frameworks, UI kits, or state managers without explicit approval.
```

### Conversion Priority

```
1. EMAIL CTA (Primary)
   └── "Request a Quote" buttons
   └── Contact form submissions
   └── Email links

2. PHONE CTA (Secondary)
   └── Always paired with email
   └── Never the only option
```

### Content Rules

```
Cards/Sections:
- Max 1 short paragraph
- Max 2-4 bullets
- Unless explicitly required otherwise

Icons:
- Use lucide-react only
- Semantically consistent
- No random/decorative icons

Text:
- No low-contrast on dark backgrounds
- Readable without squinting
- Consistent vertical rhythm
```

---

## Output Protocol

### Required Format

Every response MUST include:

```markdown
## What Changed
- [Bullet points of changes]

## Files Modified
- `path/to/file.ts` — Description of change

## Commands Run
- `npm run build` — PASS ✓
- `npm run test:visual` — PASS ✓

## Snapshot Updates (if any)
- Updated `home-desktop-light.png` because [specific justification]

## Follow-ups (critical only)
- [Only blockers or security issues]
```

### Example Output

```markdown
## What Changed
- Updated hero headline to match new brand guidelines
- Fixed dark mode contrast on service cards
- Added aria-label to floating CTA button

## Files Modified
- `src/content/site.ts` — Updated heroHeadline value
- `src/components/landing/Services.tsx` — Fixed text color variable
- `src/components/landing/FloatingMobileCTA.tsx` — Added aria-label

## Commands Run
- `npm run build` — PASS ✓
- `npm run test:visual` — PASS ✓
- `npm run test:runtime` — PASS ✓

## Snapshot Updates
- Updated `home-desktop-light.png` — Hero text changed per brand update
- Updated `home-desktop-dark.png` — Same change in dark mode

## Follow-ups
- None
```

### Anti-Patterns

```
❌ "I'll add tests later"
❌ "This might need some cleanup"
❌ "Here are some ideas for improvements"
❌ Brainstorming or suggestions not requested
❌ Vague descriptions of changes
❌ Missing test results
❌ Unjustified snapshot updates
```

---

## Quick Reference

### Most Used Commands

```powershell
npm run dev              # Start development
npm run build            # Production build
npm run test:visual      # Run visual tests
npm run test:visual:update  # Update baselines
npm run check-secrets    # Security scan
```

### Key Files

| Purpose | File |
|---------|------|
| Content source of truth | `src/content/site.ts` |
| Homepage | `src/pages/index.astro` |
| Main layout | `src/layouts/BaseLayout.astro` |
| Design tokens | `src/styles/global.css` |
| Tailwind config | `tailwind.config.mjs` |
| Test config | `playwright.config.ts` |

### Component Locations

| Component | Path |
|-----------|------|
| Hero | `src/components/landing/Hero.tsx` |
| Services | `src/components/landing/Services.tsx` |
| Contact Form | `src/components/landing/ContactForm.tsx` |
| Footer | `src/components/landing/Footer.tsx` |
| Cards | `src/components/landing/Card.tsx` |

### Contact Info (from site.ts)

| Field | Value |
|-------|-------|
| Company | Resource Mechanical Insulation, LLC |
| Email | fab@rmi-llc.net |
| Phone | 419-705-6153 |
| Address | 11677 Wayne Road, Suite 112, Romulus, MI 48174 |
| Service Area | Michigan and surrounding areas |

---

*Last updated: Auto-generated from codebase analysis*
*Version: 2.0.0*
