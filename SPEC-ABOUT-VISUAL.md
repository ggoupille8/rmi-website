# SPEC: About Section Visual Upgrade

**Spec Version:** 1.0
**Date:** March 4, 2026
**Execution:** Claude Code autonomous

---

## CONTEXT

The "Why Choose RMI" about section displays 4 cards in a grid. The cards work but are visually flat. This spec adds scroll-triggered entrance animations, icon enhancements, and subtle card improvements to make the section more engaging.

**DO NOT MODIFY:** Card content text (already corrected in previous specs), hero, services, footer, analytics, or SEO.

---

## TASK 1: Card Entrance Animations on Scroll

### Files
- `frontend/src/components/landing/About.tsx`

### Approach
1. Add staggered fade-in-up animations to each card as they scroll into view.
2. Use the Intersection Observer API:
   ```tsx
   useEffect(() => {
     const observer = new IntersectionObserver(
       (entries) => {
         entries.forEach((entry) => {
           if (entry.isIntersecting) {
             entry.target.classList.add('animate-in');
             observer.unobserve(entry.target);
           }
         });
       },
       { threshold: 0.2 }
     );
     
     document.querySelectorAll('.about-card').forEach(card => observer.observe(card));
     return () => observer.disconnect();
   }, []);
   ```
3. CSS for the animation:
   ```css
   .about-card {
     opacity: 0;
     transform: translateY(20px);
     transition: opacity 0.5s ease-out, transform 0.5s ease-out;
   }
   .about-card.animate-in {
     opacity: 1;
     transform: translateY(0);
   }
   ```
4. Stagger each card by 100ms using `transition-delay`:
   - Card 1: `delay-0`
   - Card 2: `delay-100`
   - Card 3: `delay-200`
   - Card 4: `delay-300`
5. Use Tailwind classes where possible, or add a small `<style>` block if needed.

### Verification
- `npm run build` passes.
- Scrolling to the About section triggers cards to fade in from below, one after another.
- The animation only plays once (observer unobserves after triggering).
- Cards that are already in viewport on page load still animate in.

---

## TASK 2: Icon Glow Effect

### Files
- `frontend/src/components/landing/About.tsx`

### Approach
1. Each about card has an icon (Shield, Clock, Award, Users or similar). Add a subtle glow behind the icon:
   ```tsx
   <div className="relative mb-4">
     <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl" />
     <div className="relative w-12 h-12 flex items-center justify-center rounded-full bg-blue-500/10 border border-blue-500/30">
       <IconComponent className="w-6 h-6 text-blue-400" />
     </div>
   </div>
   ```
2. The glow is a blurred blue circle behind the icon container — creates a soft ambient light effect.
3. Apply this to all 4 cards.

### Verification
- `npm run build` passes.
- Each card icon has a subtle blue glow behind it.
- The glow is visible but not distracting.
- Consistent across all 4 cards.

---

## TASK 3: Card Hover Lift Effect

### Files
- `frontend/src/components/landing/About.tsx`

### Approach
1. Add a subtle hover effect to the about cards:
   ```
   hover:-translate-y-1 hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/5
   ```
2. Add `transition-all duration-300` for smooth animation.
3. The cards should feel interactive without being clickable (they don't link anywhere).
4. Keep the existing background (`bg-neutral-800` or similar) and border styling — just enhance on hover.

### Verification
- `npm run build` passes.
- Hovering over an about card lifts it slightly with a subtle blue shadow.
- Transition is smooth (300ms).

---

## TASK 4: Section Heading — Animated Underline

### Files
- `frontend/src/components/landing/About.tsx`

### Approach
1. The blue accent line below the "WHY CHOOSE RESOURCE MECHANICAL INSULATION" heading is currently static. Animate it to extend from 0 width to full width when the section scrolls into view:
   ```tsx
   <div className="w-12 h-0.5 bg-accent-500 mx-auto mt-4 transition-all duration-700 ease-out"
        ref={lineRef}
        style={{ width: isVisible ? '3rem' : '0' }}
   />
   ```
2. Use the same Intersection Observer as Task 1 — when the heading comes into view, trigger the line to expand.
3. Alternative approach using CSS only:
   ```css
   .section-line {
     width: 0;
     transition: width 0.7s ease-out 0.3s; /* 300ms delay after scroll trigger */
   }
   .section-line.animate-in {
     width: 3rem;
   }
   ```

### Verification
- `npm run build` passes.
- The blue accent line animates from 0 to full width when the section scrolls into view.
- The animation plays smoothly over ~700ms.

---

## TASK 5: Apply Entrance Animations to Other Sections

### Files
- `frontend/src/components/landing/MaterialsMarquee.tsx`
- `frontend/src/components/landing/ProjectShowcase.tsx`
- `frontend/src/components/landing/CTABanner.tsx`

### Approach
1. Apply the same scroll-triggered fade-in animation pattern from Task 1 to these sections:
   - **Materials Marquee**: The heading and subtitle fade in, then the marquee starts scrolling.
   - **Featured Projects**: The heading fades in, then project cards stagger in (same as about cards).
   - **CTA Banner**: The heading, subtext, and button fade in together.
2. For sections that are React components, use the same `IntersectionObserver` + `useEffect` pattern.
3. For the Materials Marquee, if the marquee animation is already running before it's visible, consider starting it only when the section enters the viewport.
4. Keep animations subtle — just `opacity-0 → opacity-100` with `translateY(20px) → translateY(0)`. No fancy rotations or scaling.
5. Each section should animate independently (not all at once).

### Verification
- `npm run build` passes.
- Scrolling down the page, each section animates in as it enters the viewport.
- Animations are consistent across sections (same timing, same easing).
- Animations only play once per section.
- No jank or layout shift during animations.

---

## EXECUTION ORDER
1. Task 3 (card hover — quick CSS)
2. Task 2 (icon glow — moderate)
3. Task 4 (heading line animation — moderate)
4. Task 1 (card entrance animation — moderate)
5. Task 5 (apply to other sections — most work)

## GIT WORKFLOW
1. `git checkout main && git pull origin main`
2. `git checkout -b feat/about-visual-upgrade`
3. Make all changes, `npm run build`, `npm run test`
4. Update visual baselines if needed: `npm run test:visual:update`
5. `git add . && git commit -m "feat: scroll animations, icon glow, card hover, heading line animation"`
6. `git push origin feat/about-visual-upgrade`
7. **Do NOT merge to main.**

## DEFINITION OF DONE
- [ ] About cards stagger-animate in on scroll
- [ ] Card icons have subtle blue glow
- [ ] Cards lift slightly on hover
- [ ] Section heading accent line animates from 0 to full width
- [ ] Materials, Projects, and CTA sections also animate on scroll
- [ ] All animations play once and are smooth
- [ ] `npm run build` passes
- [ ] Branch pushed, NOT merged
- [ ] Summary written to `tasks/todo.md`
