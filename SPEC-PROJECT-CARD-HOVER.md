# SPEC: Project Card Hover Polish

## CONTEXT

The three Featured Projects cards (Henry Ford Hospital, Michigan Central Station, Ford World HQ) are static with no hover interaction. They sit in a 3-column grid with images on top and text below. Unlike the service cards (which now have chevrons and hover lift), the project cards feel flat and non-interactive even though they visually invite exploration.

This spec adds a subtle hover effect to make the project cards feel more alive and polished -- consistent with the service card hover treatment. No new content, no layout changes.

**Branch:** feat/project-card-hover
**File:** frontend/src/components/landing/ProjectShowcase.tsx

---

## TASK: Add Hover Effects to Project Cards

### Changes

#### 1. Card container hover
Each project card container should get:
- transition-all duration-300 ease-out for smooth animation
- hover:-translate-y-1 -- subtle 4px upward lift
- hover:shadow-xl hover:shadow-blue-500/5 -- faint blue glow (lighter than service cards since these are bigger elements)
- hover:border-neutral-600 -- brighten the border slightly if cards have borders

If the card already has a group class, great. If not, add it so we can animate child elements on hover.

#### 2. Image zoom on hover
The project image inside each card should get a subtle zoom effect:
- Wrap the image in a container with overflow-hidden rounded-lg or equivalent (if not already)
- On the image: transition-transform duration-500 ease-out group-hover:scale-105

This creates a slow, elegant zoom when hovering the card -- commonly used on project portfolio sites and it feels premium.

#### 3. Project title highlight
The H3 project title (e.g., "Henry Ford Hospital -- Detroit") should get:
- transition-colors duration-200
- group-hover:text-blue-400 -- lights up the title on hover to match the site's blue accent color

### What NOT to Change
- Do NOT change card content, descriptions, or images
- Do NOT change the 3-column grid layout
- Do NOT add click behavior or links (these are showcase cards, not interactive modals)
- Do NOT change the section heading or subtitle
- Keep mobile behavior unchanged -- hover effects are desktop-only by nature

### Verification
- npm run build passes with zero errors
- npx tsc --noEmit passes with zero errors
- Hovering a project card shows: slight upward lift, image zooms subtly, title turns blue
- Cards return to normal smoothly on mouseout
- No layout shift caused by the hover (transform-based only)
- Mobile layout unaffected

---

## GIT WORKFLOW

git checkout main
git pull
git checkout -b feat/project-card-hover

git add -A
git commit -m "polish: add hover effects to project showcase cards"

Do NOT merge to main
git push -u origin feat/project-card-hover

---

## DEFINITION OF DONE

- [ ] Cards lift subtly on hover (-translate-y-1)
- [ ] Project images zoom on hover (scale-105 with overflow-hidden)
- [ ] Project titles turn blue-400 on hover
- [ ] All transitions smooth (300ms+ ease-out)
- [ ] No layout shift from hover effects
- [ ] Mobile layout unaffected
- [ ] npm run build zero errors
- [ ] npx tsc --noEmit zero errors
