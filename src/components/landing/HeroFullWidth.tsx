import { useState, useEffect, useRef } from "react";
import { phoneTel, phoneDisplay, companyName, email, heroStats, formatLargeNumber } from "../../content/site";
import { Phone, Mail } from "lucide-react";

interface HeroFullWidthProps {
  headline?: string;
  tagline?: string;
  backgroundImage?: string;
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
      <div className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight">
        {finalDisplay}
      </div>
      <div className="mt-2 text-sm sm:text-base text-neutral-300 uppercase tracking-wider">
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
  headline = "Resource Mechanical Insulation",
  tagline = "Commercial & Industrial Insulation Experts",
  backgroundImage = "/images/hero/hero-1.jpg",
}: HeroFullWidthProps) {
  return (
    <section
      className="relative min-h-screen flex flex-col justify-center overflow-hidden"
      aria-labelledby="hero-heading"
    >
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <picture>
          <source
            srcSet={backgroundImage.replace(/\.jpe?g$/i, ".webp")}
            type="image/webp"
          />
          <img
            src={backgroundImage}
            alt=""
            className="w-full h-full object-cover"
            loading="eager"
            fetchPriority="high"
            aria-hidden="true"
          />
        </picture>
        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />
      </div>

      {/* Content */}
      <div className="relative z-10 container-custom py-20 lg:py-32">
        <div className="max-w-5xl mx-auto text-center">
          {/* Headline - Plain stencil font */}
          <h1
            id="hero-heading"
            className="stencil-spray text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-white leading-[1.1]"
          >
            {headline}
          </h1>

          {/* Tagline */}
          <p className="mt-6 text-xl sm:text-2xl lg:text-3xl text-neutral-200 font-light tracking-wide">
            {tagline}
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
            {/* Primary CTA */}
            <a
              href="#contact"
              className="btn-primary h-14 px-8 text-lg flex items-center justify-center shadow-2xl hover:shadow-xl hover:scale-105 transition-all duration-300"
            >
              Request a Quote
            </a>

            {/* Secondary CTAs */}
            <div className="flex gap-3">
              <a
                href={phoneTel}
                className="flex items-center justify-center w-14 h-14 rounded-full bg-white/10 backdrop-blur-sm border border-white/30 hover:bg-white/20 hover:border-white/50 shadow-xl hover:scale-110 transition-all duration-300"
                aria-label={`Call ${companyName} at ${phoneDisplay}`}
              >
                <Phone className="w-6 h-6 text-white" aria-hidden="true" />
              </a>
              <a
                href={`mailto:${email}`}
                className="flex items-center justify-center w-14 h-14 rounded-full bg-white/10 backdrop-blur-sm border border-white/30 hover:bg-white/20 hover:border-white/50 shadow-xl hover:scale-110 transition-all duration-300"
                aria-label={`Email ${companyName} at ${email}`}
              >
                <Mail className="w-6 h-6 text-white" aria-hidden="true" />
              </a>
            </div>
          </div>

          {/* Animated Stats */}
          <div className="mt-16 lg:mt-24 grid grid-cols-3 gap-6 sm:gap-8 lg:gap-12 max-w-3xl mx-auto">
            {heroStats.map((stat, index) => (
              <AnimatedStat
                key={stat.label}
                endValue={stat.endValue}
                suffix={stat.suffix}
                label={stat.label}
                shortLabel={stat.shortLabel}
                delay={index * 200}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Scroll indicator - removed for cleaner look */}
    </section>
  );
}
