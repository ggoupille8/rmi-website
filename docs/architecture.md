# RMI Architecture

---

## Repository Structure

```
astro-project/
├── .github/
│   └── workflows/
│       └── main.yml              # CI/CD pipeline (Windows runner)
├── autohotkey/
│   ├── rmi-workflow.ahk          # Workflow hotkeys (Win+T, Win+O, Win+S)
│   └── README.md                 # AutoHotkey setup instructions
├── docs/
│   ├── templates/                # Task spec templates
│   │   ├── ui-change.md
│   │   ├── bug-fix.md
│   │   ├── new-component.md
│   │   ├── feature.md
│   │   └── backend-change.md
│   ├── screenshots/
│   │   ├── baseline/             # Visual regression baselines
│   │   └── current/              # Latest captured screenshots
│   ├── design-system.md          # Tailwind tokens, colors, spacing
│   ├── architecture.md           # This file
│   ├── workflow.md               # Git, testing, spec workflow
│   ├── CURRENT_TASK.md           # Active task spec
│   └── CHANGELOG.md              # Verified task completions
├── public/
│   ├── images/
│   │   ├── hero/                 # Hero background images (WebP + JPG)
│   │   └── logo/                 # Company logo variants
│   ├── favicon.svg
│   ├── apple-touch-icon.png
│   ├── robots.txt
│   └── site.webmanifest
├── scripts/
│   ├── check-secrets.js          # Security scan for exposed secrets
│   ├── db-init.mjs               # Database initialization
│   ├── db-migrate.mjs            # Database migrations
│   ├── dev.mjs                   # Dev server launcher
│   ├── fix-runtime.js            # Post-build runtime fixes
│   ├── mobile-inspect.ts         # Mobile QA inspection
│   ├── mobile-qa.ts              # Mobile QA automation
│   ├── open-task.ps1             # Open CURRENT_TASK.md in editor
│   ├── paste-task.ps1            # Paste clipboard to CURRENT_TASK.md
│   ├── ports-free.ps1            # Free stuck port 4321
│   ├── screenshots.ps1           # Capture screenshots at all breakpoints
│   ├── screenshots.ts            # Playwright screenshot runner
│   ├── setup-pre-commit.ps1      # Pre-commit hook setup
│   ├── smoke.ps1                 # Smoke tests (Windows)
│   ├── smoke.sh                  # Smoke tests (Unix)
│   ├── test-runtime-config.js    # Runtime environment verification
│   ├── verify-contact-api.ps1    # Contact API verification
│   ├── verify-contact-api.sh     # Contact API verification (Unix)
│   └── verify-dom-parity.js      # DOM consistency check
├── src/
│   ├── components/
│   │   ├── landing/              # Production components
│   │   │   ├── About.tsx         # Why Choose RMI section (4 feature cards)
│   │   │   ├── ContactForm.tsx   # Quote request form (client:load)
│   │   │   ├── CTABanner.tsx     # Call-to-action banner
│   │   │   ├── FloatingMobileCTA.tsx  # Mobile floating contact button (client:load)
│   │   │   ├── Footer.tsx        # Footer with contact info + back-to-top
│   │   │   ├── HeroFullWidth.tsx # Hero with slideshow + animated stats (client:load)
│   │   │   ├── MaterialsMarquee.tsx   # Scrolling materials ticker
│   │   │   ├── Navbar.astro      # Fixed header, mobile menu, active links
│   │   │   └── Services.tsx      # 9 service cards with modal (client:load)
│   │   └── __tests__/
│   │       └── ContactForm.test.tsx   # Unit tests for ContactForm
│   ├── content/
│   │   └── site.ts               # Single source of truth for all content
│   ├── layouts/
│   │   └── BaseLayout.astro      # Main layout (meta tags, JSON-LD, GA4)
│   ├── lib/
│   │   ├── db-env.ts             # Database environment resolver
│   │   ├── rate-limiter.ts       # API rate limiting
│   │   ├── validation.ts         # Input validation utilities
│   │   └── __tests__/            # Unit tests for lib modules
│   ├── pages/
│   │   ├── index.astro           # Homepage (single page)
│   │   ├── 404.astro             # Custom 404 page
│   │   └── api/
│   │       ├── contact.ts        # POST /api/contact
│   │       ├── quote.ts          # POST /api/quote
│   │       ├── healthz.ts        # GET /api/healthz
│   │       └── admin/
│   │           ├── contacts.ts   # GET /api/admin/contacts
│   │           └── quotes.ts     # GET /api/admin/quotes
│   ├── styles/
│   │   └── global.css            # CSS custom properties, keyframes, utilities
│   ├── test/
│   │   └── setup.ts              # Vitest setup
│   └── env.d.ts                  # TypeScript environment declarations
├── tests/
│   ├── visual/
│   │   ├── home.spec.ts          # Visual regression snapshots
│   │   └── home.spec.ts-snapshots/  # Baseline images (18 snapshots)
│   ├── screenshots/
│   │   └── polish-review/        # Manual review screenshots
│   ├── accessibility.spec.ts     # WCAG compliance tests
│   ├── content.spec.ts           # Content verification tests
│   ├── dark-mode.spec.ts         # Dark mode tests
│   ├── error-scenarios.spec.ts   # Error handling tests
│   ├── fixtures.ts               # Shared test fixtures
│   ├── functionality.spec.ts     # Form, navigation tests
│   ├── mobile-audit.spec.ts      # Mobile QA tests
│   ├── mobile-qa-fixes.spec.ts   # Mobile QA fix verification
│   └── screenshots.spec.ts       # Automated screenshot capture
├── artifacts/                    # Generated test artifacts
├── CLAUDE.md                     # AI context file (read every session)
├── SETUP_SPEC.md                 # Workflow setup specification
├── astro.config.mjs              # Astro configuration (hybrid SSR, Vercel adapter)
├── tailwind.config.mjs           # Tailwind design system tokens
├── playwright.config.ts          # Playwright test configuration
├── tsconfig.json                 # TypeScript configuration
├── vercel.json                   # Deployment configuration
├── schema.sql                    # PostgreSQL database schema
├── package.json                  # Dependencies and scripts
└── .nvmrc                        # Node version (20)
```

---

## Frontend Architecture

### Astro Islands Pattern

Static by default. React islands ONLY for components requiring interactivity:

| Component             | Hydration     | Reason                              |
| --------------------- | ------------- | ----------------------------------- |
| HeroFullWidth.tsx     | `client:load` | Animated stats counter, slideshow   |
| Services.tsx          | `client:load` | Modal open/close, keyboard trap     |
| ContactForm.tsx       | `client:load` | Form validation + submission        |
| FloatingMobileCTA.tsx | `client:load` | Scroll-based visibility, expand     |
| MaterialsMarquee.tsx  | Static        | CSS animation only (no hydration)   |
| About.tsx             | Static        | No interactivity needed             |
| CTABanner.tsx         | Static        | No interactivity needed             |
| Footer.tsx            | Static        | No interactivity needed             |
| Navbar.astro          | Static        | Vanilla JS in `<script>` tag        |

### Page Structure

Single page application: `src/pages/index.astro`

Section order:
```
Navbar → Hero → Services → About → Marquee → CTA Banner → Contact Form → Footer
```

Scroll anchors: `#services`, `#about`, `#contact` (with `scroll-mt-14` offset for fixed navbar)

### API Routes (Astro Serverless)

All API routes are Astro serverless functions deployed to Vercel:

| Route                    | Method | Purpose                          |
| ------------------------ | ------ | -------------------------------- |
| `/api/contact`           | POST   | Contact form submission          |
| `/api/quote`             | POST   | Quote request submission         |
| `/api/healthz`           | GET    | Health check → 200 OK            |
| `/api/admin/contacts`    | GET    | View contact submissions (auth)  |
| `/api/admin/quotes`      | GET    | View quote submissions (auth)    |

### Input Validation

All API endpoints validate:
- Email format (regex)
- Phone format (10-11 digits)
- Field length limits
- Required fields
- Honeypot empty (spam prevention)
- Submission timing (min 2s elapsed)
- Rate limiting (5 requests per 15 min per IP for quotes)

---

## Database Schema

PostgreSQL via `@vercel/postgres`. Schema defined in `schema.sql`:

```sql
CREATE TABLE IF NOT EXISTS quotes (
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

CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(254),
  phone VARCHAR(50),
  message TEXT NOT NULL,
  source VARCHAR(50) DEFAULT 'contact',
  metadata JSONB DEFAULT '{}'::jsonb
);
```

Indexes: `created_at DESC`, `service_type`, `source`

---

## Environment Variables

### Required for Production

| Variable          | Purpose                              |
| ----------------- | ------------------------------------ |
| POSTGRES_URL      | PostgreSQL connection string         |
| SENDGRID_API_KEY  | Email notifications                  |
| QUOTE_TO_EMAIL    | fab@rmi-llc.net                      |
| QUOTE_FROM_EMAIL  | no-reply@rmi-llc.net                 |
| ADMIN_API_KEY     | Admin endpoint authentication        |

### Contact Routing

- All form submissions → fab@rmi-llc.net
- Admin notifications → ggoupille8@gmail.com

---

## Deployment

| Setting          | Value                                    |
| ---------------- | ---------------------------------------- |
| Platform         | Vercel                                   |
| Trigger          | Push to `main` branch → auto-deploy     |
| Build command    | `npm run build` (Astro hybrid SSR)       |
| Output directory | `dist`                                   |
| Runtime          | Node.js 20.x                             |
| Production URL   | https://www.rmi-llc.net |

---

## Testing Configuration

### Playwright (`playwright.config.ts`)

- Test directory: `./tests`
- Parallel execution: Yes (local), sequential (CI)
- Retries: 2 (handles browser timing races)
- Base URL: `http://localhost:4321`
- Dev server: Auto-started before tests
- Browsers: Chromium, Firefox, WebKit
- Visual diff threshold: 1% pixel ratio

### Vitest

- Unit tests for: `src/lib/`, `src/components/__tests__/`
- Environment: happy-dom
- Coverage: @vitest/coverage-v8
