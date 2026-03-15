import { useState, useEffect, useRef } from "react";
import { ctaBannerHeading, ctaBannerSubtitle, ctaBannerButton } from "../../content/site";

export default function CTABanner() {
  const skipAnimations =
    typeof IntersectionObserver === "undefined" ||
    (typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [isVisible, setIsVisible] = useState(skipAnimations);
  const sectionRef = useRef<HTMLElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible) return;
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [isVisible]);

  // Subtle parallax scroll on background (disabled for reduced motion)
  useEffect(() => {
    if (skipAnimations) return;
    const onScroll = () => {
      const el = sectionRef.current;
      const bg = bgRef.current;
      if (!el || !bg) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      if (rect.bottom < 0 || rect.top > vh) return;
      const progress = (vh - rect.top) / (vh + rect.height);
      const offset = (progress - 0.5) * 40;
      bg.style.transform = `translateY(${offset}px)`;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [skipAnimations]);

  return (
    <section
      ref={sectionRef}
      id="cta-banner"
      className="relative z-10 min-h-[280px] sm:min-h-[350px] md:min-h-[400px] flex items-center justify-center overflow-hidden bg-neutral-900 border-t border-b border-accent-500/30"
      aria-labelledby="cta-heading"
    >
      {/* Parallax background wrapper */}
      <div
        ref={bgRef}
        aria-hidden="true"
        className="pointer-events-none absolute will-change-transform"
        style={{ top: '-24px', left: 0, right: 0, bottom: '-24px' }}
      >
        {/* GPU-composited gradient animation */}
        <div
          className="absolute inset-0 w-[200%] bg-gradient-to-r from-neutral-900 via-blue-950 to-neutral-900 animate-[gradient-pan_8s_ease_infinite] will-change-transform"
        />
        {/* Dot pattern texture overlay */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />
      </div>

      {/* Content */}
      <div className="container-custom relative py-12 sm:py-20 px-4 sm:px-6 text-center">
        <h2
          id="cta-heading"
          className={`text-xl sm:text-2xl lg:text-3xl font-bold text-white tracking-wider uppercase transition-all duration-500 ease-out ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          {ctaBannerHeading}
        </h2>
        <p
          className={`mt-3 text-base sm:text-lg text-neutral-200 max-w-2xl mx-auto leading-relaxed transition-all duration-500 ease-out delay-100 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          {ctaBannerSubtitle}
        </p>
        <div
          className={`mt-6 transition-all duration-500 ease-out delay-200 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <a
            href="#contact"
            className="btn-primary relative w-full sm:w-auto sm:min-w-[280px] px-10 py-3.5 text-base sm:text-lg font-bold shadow-lg shadow-accent-500/25 hover:shadow-[0_0_28px_rgba(59,130,246,0.4)] ring-1 ring-accent-400/20"
          >
            {/* Subtle pulse ring */}
            <span
              className="pointer-events-none absolute inset-0 rounded-md ring-2 ring-accent-400/30 animate-[cta-pulse_3s_ease-in-out_infinite]"
              aria-hidden="true"
            />
            {ctaBannerButton}
          </a>
        </div>
      </div>
    </section>
  );
}
