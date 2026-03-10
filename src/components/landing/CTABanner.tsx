import { useState, useEffect, useRef } from "react";
import { ctaBannerHeading, ctaBannerSubtitle, ctaBannerButton } from "../../content/site";

export default function CTABanner() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
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
  }, []);

  return (
    <section
      ref={sectionRef}
      id="cta-banner"
      className="relative z-10 min-h-[350px] md:min-h-[400px] flex items-center justify-center overflow-hidden bg-neutral-900 border-t border-b border-accent-500/30"
      aria-labelledby="cta-heading"
    >
      {/* GPU-composited gradient animation */}
      <div
        aria-hidden="true"
        className="absolute inset-0 w-[200%] bg-gradient-to-r from-neutral-900 via-blue-950 to-neutral-900 animate-[gradient-pan_8s_ease_infinite] pointer-events-none will-change-transform"
      />

      {/* Dot pattern texture overlay */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      />

      {/* Content */}
      <div className="container-custom relative py-20 px-6 text-center">
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
            className="btn-primary relative w-full sm:w-auto sm:min-w-[280px] px-10 py-3.5 text-lg font-bold shadow-lg shadow-accent-500/20 hover:shadow-accent-500/30 ring-1 ring-accent-400/20"
          >
            {/* Subtle pulse ring */}
            <span
              className="pointer-events-none absolute inset-0 rounded-md ring-2 ring-accent-400/20 animate-[cta-pulse_3s_ease-in-out_infinite]"
              aria-hidden="true"
            />
            {ctaBannerButton}
          </a>
        </div>
      </div>
    </section>
  );
}
