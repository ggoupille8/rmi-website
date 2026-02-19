import { useState, useEffect, useRef, useCallback } from "react";
import { phoneTel, phoneDisplay, companyName, email, heroStats, formatLargeNumber, heroHeadline, heroTagline } from "../../content/site";
import { Phone, Mail } from "lucide-react";

const heroImages = [
  "/images/hero/hero-1.jpg",
  "/images/hero/hero-2.jpg",
  "/images/hero/hero-3.jpg",
  "/images/hero/hero-4.jpg",
  "/images/hero/hero-5.jpg",
];

const SLIDE_DURATION = 10000; // 10s per image

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
  const [count, setCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!startOnView) {
      setHasStarted(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted) {
          setHasStarted(true);
        }
      },
      { threshold: 0.3 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [startOnView, hasStarted]);

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
      <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight">
        {finalDisplay}
      </div>
      <div className="mt-1 text-xs sm:text-sm text-neutral-200 uppercase tracking-wider">
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
      setActiveIndex((prev) => (prev + 1) % heroImages.length);
    }, SLIDE_DURATION);
    return () => clearInterval(timer);
  }, []);

  return (
    <section
      className="relative min-h-[60vh] lg:min-h-[70vh] flex flex-col justify-center overflow-hidden pt-12 sm:pt-14"
      aria-labelledby="hero-heading"
    >
      {/* Background Slideshow */}
      <div className="absolute top-12 sm:top-14 left-0 right-0 bottom-0 z-0">
        {heroImages.map((src, index) => (
          <div
            key={src}
            className={`absolute inset-0 transition-opacity duration-[3000ms] ease-in-out ${
              index === activeIndex ? "opacity-100" : "opacity-0"
            }`}
            aria-hidden="true"
          >
            <picture>
              <source
                srcSet={src.replace(/\.jpe?g$/i, ".webp")}
                type="image/webp"
              />
              <img
                src={src}
                alt=""
                className="w-full h-full object-cover object-center"
                loading={index === 0 ? "eager" : "lazy"}
                fetchpriority={index === 0 ? "high" : undefined}
                style={
                  !prefersReducedMotion && index === activeIndex
                    ? { animation: `kenBurns ${SLIDE_DURATION}ms ease-in-out forwards` }
                    : { transform: "scale(1)", filter: "brightness(1)" }
                }
              />
            </picture>
          </div>
        ))}
        {/* Dark gradient overlay — on top of all images */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60" />
      </div>

      {/* Content */}
      <div className="relative z-10 container-custom py-12 lg:py-20 flex-1 flex flex-col">
        <div className="max-w-5xl mx-auto text-center flex-1 flex flex-col justify-center w-full">
          {/* Main Content Card */}
          <div className="max-w-3xl mx-auto bg-neutral-900/40 backdrop-blur-sm rounded-xl border border-neutral-700/30 py-6 px-6 sm:px-10">
            {/* Logo */}
            <h1 id="hero-heading" className="flex justify-center">
              <img
                src="/images/logo/rmi-logo-full.png"
                alt={headline}
                className="h-20 sm:h-28 lg:h-36 xl:h-44 w-auto brightness-0 invert"
              />
            </h1>

            {/* Tagline */}
            <p className="mt-2 text-lg sm:text-xl lg:text-2xl text-neutral-200 font-light tracking-wide">
              {tagline}
            </p>

            {/* CTA Buttons */}
            <div className="mt-5 flex flex-col sm:flex-row gap-3 justify-center items-center">
              {/* Primary CTA */}
              <a
                href="#contact"
                className="btn-primary h-12 px-6"
              >
                Request a Quote
              </a>

              {/* Secondary CTAs */}
              <div className="flex gap-3">
                <a
                  href={phoneTel}
                  className="flex items-center justify-center w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm border border-white/30 hover:bg-white/20 hover:border-white/50 shadow-xl hover:scale-110 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900"
                  aria-label={`Call ${companyName} at ${phoneDisplay}`}
                >
                  <Phone className="w-6 h-6 text-white" aria-hidden="true" />
                </a>
                <a
                  href={`mailto:${email}`}
                  className="flex items-center justify-center w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm border border-white/30 hover:bg-white/20 hover:border-white/50 shadow-xl hover:scale-110 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900"
                  aria-label={`Email ${companyName} at ${email}`}
                >
                  <Mail className="w-6 h-6 text-white" aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>

          {/* Animated Stats — Individual Cards */}
          <div className="mt-auto pt-10 lg:pt-16 flex justify-center gap-6 sm:gap-8">
            {heroStats.map((stat, index) => (
              <div
                key={stat.label}
                className="w-40 sm:w-44 bg-neutral-900/40 backdrop-blur-sm rounded-lg border border-neutral-700/30 px-4 py-3"
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
