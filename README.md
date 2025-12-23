# Resource Mechanical Insulation - Landing Page

A modern, accessible landing page built with Astro, React, TypeScript, and Tailwind CSS. Optimized for deployment on Vercel.

## Features

- ⚡️ Astro for optimal performance and SEO
- ⚛️ React for interactive components
- 🎨 Tailwind CSS with custom design system
- 📘 TypeScript for type safety
- ♿️ WCAG AAA accessible design with strong contrast
- 📱 Fully responsive and mobile-first
- 🏭 Industrial aesthetic design system
- 🚀 Ready for Vercel deployment

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open [http://localhost:4321](http://localhost:4321) in your browser.

## Project Structure

```
/
├── public/              # Static assets
├── src/
│   ├── components/
│   │   └── landing/    # Landing page components
│   │       ├── Hero.tsx
│   │       ├── Services.tsx
│   │       ├── WhyUs.tsx
│   │       ├── Process.tsx
│   │       ├── FAQ.tsx
│   │       └── ContactForm.tsx
│   ├── layouts/        # Astro layouts
│   │   └── BaseLayout.astro
│   ├── pages/          # Astro pages
│   │   └── index.astro
│   └── styles/         # Global styles
│       └── global.css
├── astro.config.mjs
├── tailwind.config.mjs
├── tsconfig.json
├── vercel.json         # Vercel configuration
└── .vercelignore      # Vercel ignore patterns
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run test:visual` - Run visual regression tests
- `npm run test:visual:update` - Update visual test snapshots

## Design System

The project includes a comprehensive design system with:

- **Container widths**: Responsive container system with max-widths
- **Spacing scale**: Consistent 8px-based spacing scale
- **Type scale**: 13-size typography system with proper line heights
- **Button styles**: 5 button variants (primary, secondary, accent, outline, ghost)
- **Color system**: CSS variables for industrial theme (steel blue primary, safety orange accent)
- **Strong contrast**: WCAG AAA compliant dark-on-light theme

## Deployment

### Vercel

This project is configured for automatic deployment on Vercel:

1. Push your code to GitHub/GitLab/Bitbucket
2. Import your repository in Vercel
3. Vercel will automatically detect Astro and use the configuration in `vercel.json`
4. Your site will be live after the build completes

The `vercel.json` file includes:
- Build configuration
- Output directory settings
- Framework detection

## Technologies

- [Astro](https://astro.build/) - Static site generator
- [React](https://react.dev/) - UI library for interactive components
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Vercel](https://vercel.com/) - Deployment platform

## Accessibility

- Semantic HTML5 elements
- ARIA labels and roles where appropriate
- Skip to main content link
- Keyboard navigation support
- Screen reader friendly
- WCAG AAA color contrast ratios

