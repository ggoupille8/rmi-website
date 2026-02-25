import { useState, useEffect, useRef, useCallback } from "react";
import { phoneTel, phoneDisplay, companyName, email, heroStats, formatLargeNumber, heroHeadline, heroTagline } from "../../content/site";
import { Phone, Mail } from "lucide-react";

const heroImages = [
  "/images/hero/hero-1.webp",
  "/images/hero/hero-2.webp",
  "/images/hero/hero-3.webp",
  "/images/hero/hero-4.webp",
  "/images/hero/hero-5.webp",
];

// Per-image mobile object-position (Issue 4)
const heroImagePositions = [
  "object-[50%_65%] sm:object-center",  // hero-1: equipment is in lower portion, shift down to avoid showing just ceiling/sky
  "object-[60%_45%] sm:object-center",  // hero-2: pipes cluster right-of-center, shift right and slightly up
  "object-[35%_50%] sm:object-center",  // hero-3: ultra-wide, subject left-of-center, shift left to capture it
  "object-[50%_60%] sm:object-center",  // hero-4: portrait — favor lower portion where ductwork is, not sky
  "object-[55%_40%] sm:object-center",  // hero-5: similar to hero-2, slight right and up adjustment
];

const heroImageAlts = [
  "Rooftop HVAC insulation installation",
  "Insulated pipe cluster",
  "Industrial valve and equipment insulation",
  "Mechanical insulation work in progress",
  "Commercial insulation project",
];

// Per-image Ken Burns zoom origins for visual variety
const heroImageOrigins = [
  "center center",     // hero-1: centered zoom
  "60% 40%",           // hero-2: zoom toward pipe cluster
  "35% center",        // hero-3: zoom toward left subject
  "center 35%",        // hero-4: zoom toward upper equipment
  "55% 40%",           // hero-5: zoom toward right-of-center
];

const SLIDE_DURATION = 12000; // 12s per image

interface HeroFullWidthProps {
  headline?: string;
  tagline?: string;
}

// Animated counter hook
function useCountUp(
  endValue: number,
  duration: number = 2000,
  startOnView: boolean = true
): { count: number; ref: React.RefObject<HTMLDivElement | null> } {
  // Initialize at endValue so SSR HTML shows final numbers (no "0+" flash)
  const [count, setCount] = useState(endValue);
  const [hasStarted, setHasStarted] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // On client mount, reset to 0 for animation
  useEffect(() => {
    setCount(0);
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!hasMounted) return;
    if (!startOnView) {
      setHasStarted(true);
      return;
    }
    // Already animated — never re-observe
    if (hasStarted) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [hasMounted, startOnView, hasStarted]);

  useEffect(() => {
    if (!hasStarted) return;

    const startTime = Date.now();
    const startValue = 0;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentValue = Math.floor(
        startValue + (endValue - startValue) * easeOutQuart
      );

      setCount(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [hasStarted, endValue, duration]);

  return { count, ref };
}

// Single animated stat component
function AnimatedStat({
  endValue,
  suffix,
  label,
  shortLabel,
  delay = 0,
}: {
  endValue: number;
  suffix: string;
  label: string;
  shortLabel?: string;
  delay?: number;
}) {
  const { count, ref } = useCountUp(endValue, 2500 + delay);

  // Format large numbers nicely
  const displayValue =
    endValue >= 10000 ? formatLargeNumber(count) : `${count.toLocaleString()}${suffix}`;

  // For very large numbers, show the formatted version once animation completes
  const finalDisplay =
    endValue >= 10000 && count === endValue
      ? formatLargeNumber(endValue)
      : displayValue;

  return (
    <div ref={ref} className="text-center">
      <div className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight" style={{ textShadow: "1px 1px 3px rgba(0,0,0,0.8), 0 0 8px rgba(0,0,0,0.5)" }}>
        {finalDisplay}
      </div>
      <div className="mt-1 text-[10px] sm:text-xs lg:text-sm text-neutral-200 uppercase tracking-normal sm:tracking-wider lg:tracking-widest leading-tight" style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.7)" }}>
        {shortLabel ? (
          <>
            <span className="hidden sm:inline">{label}</span>
            <span className="sm:hidden">{shortLabel}</span>
          </>
        ) : (
          label
        )}
      </div>
    </div>
  );
}

export default function HeroFullWidth({
  headline = heroHeadline,
  tagline = heroTagline,
}: HeroFullWidthProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const prevIndexRef = useRef(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => {
        prevIndexRef.current = prev;
        return (prev + 1) % heroImages.length;
      });
    }, SLIDE_DURATION);
    return () => clearInterval(timer);
  }, []);

  return (
    <section
      className="relative min-h-[90dvh] hero-dvh flex flex-col justify-center overflow-hidden pt-12 sm:pt-14 bg-neutral-900"
      aria-labelledby="hero-heading"
    >
      {/* Background Slideshow */}
      <div className="absolute top-12 sm:top-14 left-0 right-0 bottom-0 z-0 overflow-hidden">
        {heroImages.map((src, index) => {
          const isActive = index === activeIndex;
          const isPrev = index === prevIndexRef.current && index !== activeIndex;
          return (
          <div
            key={src}
            className={`absolute inset-0 ease-in-out ${
              isActive
                ? "transition-opacity duration-[2000ms] opacity-100"
                : isPrev
                ? "transition-opacity duration-[2000ms] opacity-0"
                : "transition-opacity duration-[0ms] opacity-0"
            }`}
            style={{ zIndex: isActive ? 2 : isPrev ? 1 : 0 }}
            aria-hidden="true"
          >
            <picture>
              <source
                srcSet={src.replace(/\.jpe?g$/i, ".webp")}
                type="image/webp"
              />
              <img
                src={src}
                alt={heroImageAlts[index]}
                width="1920"
                height="1080"
                className={`w-full h-full object-cover ${heroImagePositions[index]}`}
                sizes="100vw"
                loading={index === 0 ? "eager" : "lazy"}
                fetchpriority={index === 0 ? "high" : undefined}
                style={
                  !prefersReducedMotion
                    ? isActive
                      ? { animation: `kenBurns ${SLIDE_DURATION}ms ease-in-out forwards`, transformOrigin: heroImageOrigins[index] }
                      : isPrev
                        ? { transform: "scale(1.05)", filter: "brightness(1.05)", transformOrigin: heroImageOrigins[index] }
                        : { transform: "scale(1)", filter: "brightness(1)" }
                    : { transform: "scale(1)", filter: "brightness(1)" }
                }
              />
            </picture>
          </div>
          );
        })}
        {/* Dark gradient overlay — on top of all images */}
        <div className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
      </div>

      {/* Content */}
      <div className="relative z-10 container-custom py-12 lg:py-20 flex-1 flex flex-col">
        <div className="max-w-5xl mx-auto text-center flex-1 flex flex-col justify-center w-full">
          {/* Main Content Card */}
          <div
            className="max-w-3xl mx-auto py-6 px-6 sm:px-10"
          >
            {/* Logo */}
            <h1 id="hero-heading" className="flex justify-center">
              <img
                src="/images/logo/rmi-logo-full.png"
                alt={headline}
                className="h-24 sm:h-32 lg:h-40 xl:h-48 w-auto brightness-0 invert"
                style={{ filter: 'brightness(0) invert(1) drop-shadow(3px 3px 6px rgba(0,0,0,1)) drop-shadow(-1px -1px 4px rgba(0,0,0,0.8))' }}
              />
            </h1>

            {/* Tagline */}
            <p
              className="mt-2 text-lg sm:text-xl lg:text-2xl text-neutral-200 font-semibold tracking-wide"
              style={{ textShadow: "0 2px 8px rgba(0,0,0,0.9), 0 1px 3px rgba(0,0,0,1)" }}
            >
              {tagline}
            </p>

            {/* CTA Buttons */}
            <div className="mt-5 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
              {/* Primary CTA */}
              <a
                href="#contact"
                className="btn-primary w-full sm:w-auto h-12 px-6"
                onClick={() => {
                  if (typeof window !== "undefined" && typeof window.gtag === "function") {
                    window.gtag("event", "cta_click", {
                      event_category: "Engagement",
                      event_label: "Hero Request a Quote",
                    });
                  }
                }}
              >
                Request a Quote
              </a>

              {/* Secondary CTAs */}
              <div className="flex gap-3">
                <a
                  href={phoneTel}
                  className="flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/10 backdrop-blur-sm border border-white/30 hover:bg-white/20 hover:border-white/50 hover:ring-2 hover:ring-white/30 shadow-xl hover:scale-110 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900"
                  aria-label={`Call ${companyName} at ${phoneDisplay}`}
                  onClick={() => {
                    if (typeof window !== "undefined" && typeof window.gtag === "function") {
                      window.gtag("event", "cta_click", {
                        event_category: "Engagement",
                        event_label: "Hero Phone Call",
                      });
                    }
                  }}
                >
                  <Phone className="w-6 h-6 text-white" aria-hidden="true" />
                </a>
                <a
                  href={`mailto:${email}`}
                  className="flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/10 backdrop-blur-sm border border-white/30 hover:bg-white/20 hover:border-white/50 hover:ring-2 hover:ring-white/30 shadow-xl hover:scale-110 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900"
                  aria-label={`Email ${companyName} at ${email}`}
                  onClick={() => {
                    if (typeof window !== "undefined" && typeof window.gtag === "function") {
                      window.gtag("event", "cta_click", {
                        event_category: "Engagement",
                        event_label: "Hero Email",
                      });
                    }
                  }}
                >
                  <Mail className="w-6 h-6 text-white" aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>

          {/* Animated Stats — Individual Cards */}
          <div data-testid="hero-stats" className="mt-6 sm:mt-auto pb-2 sm:pb-4 grid grid-cols-3 gap-1 sm:flex sm:flex-wrap sm:justify-center sm:gap-8 lg:gap-16">
            {heroStats.map((stat, index) => (
              <div
                key={stat.label}
                data-testid="stat-card"
                className="min-w-[100px] sm:min-w-[140px] px-2 sm:px-4 py-1.5"
              >
                <AnimatedStat
                  endValue={stat.endValue}
                  suffix={stat.suffix}
                  label={stat.label}
                  shortLabel={stat.shortLabel}
                  delay={index * 200}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
