import { useState, useEffect, useRef } from "react";

interface Client {
  name: string;
  logo: string;
  /** true when the SVG has dark/colored fill and needs CSS inversion to appear white */
  needsInvert: boolean;
}

const clients: Client[] = [
  // Row 1 — Automotive/industrial heavyweights + tech giants
  { name: "Ford Motor Company", logo: "/images/clients/ford.svg", needsInvert: false },
  { name: "General Motors", logo: "/images/clients/generalmotors.svg", needsInvert: false },
  { name: "Toyota", logo: "/images/clients/toyota.svg", needsInvert: false },
  { name: "Stellantis", logo: "/images/clients/stellantis.svg", needsInvert: true },
  { name: "Apple", logo: "/images/clients/apple.svg", needsInvert: false },
  { name: "Amazon", logo: "/images/clients/amazon.svg", needsInvert: true },
  // Row 2 — Logistics, telecom, industrial, financial
  { name: "FedEx", logo: "/images/clients/fedex.svg", needsInvert: false },
  { name: "Delta Air Lines", logo: "/images/clients/delta.svg", needsInvert: false },
  { name: "Comcast", logo: "/images/clients/comcast.svg", needsInvert: true },
  { name: "BASF", logo: "/images/clients/basf.svg", needsInvert: true },
  { name: "Flagstar Bank", logo: "/images/clients/flagstar.svg", needsInvert: true },
  { name: "Nissan", logo: "/images/clients/nissan.svg", needsInvert: false },
  // Row 3 — Retail/food service
  { name: "Target", logo: "/images/clients/target.svg", needsInvert: true },
  { name: "Costco", logo: "/images/clients/costco.svg", needsInvert: true },
  { name: "Starbucks", logo: "/images/clients/starbucks.svg", needsInvert: false },
  { name: "Domino's", logo: "/images/clients/dominos.svg", needsInvert: true },
  { name: "Shake Shack", logo: "/images/clients/shake-shack.svg", needsInvert: true },
  { name: "Five Below", logo: "/images/clients/five-below.svg", needsInvert: true },
];

/** Max stagger delay = 200ms heading lead + 17 logos * 60ms + 500ms duration */
const ANIMATION_TOTAL_MS = 200 + 17 * 60 + 500;

export default function ClientShowcase() {
  const [isVisible, setIsVisible] = useState(false);
  const [animationDone, setAnimationDone] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  const prefersReducedMotion = typeof window !== "undefined"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // SSR-safe guard: only apply animation styles after React hydrates.
  // Without this, SSR renders opacity:0 which collapses the astro-island to 0×0.
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Observe section entering viewport
  useEffect(() => {
    if (prefersReducedMotion) {
      setIsVisible(true);
      setAnimationDone(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );

    const el = sectionRef.current;
    if (el) {
      observer.observe(el);

      // CRITICAL FIX: Check if already in viewport at mount time.
      // client:visible hydration means the element is guaranteed to be
      // in the viewport when React mounts, but IntersectionObserver may
      // not fire for elements that are already intersecting.
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        setIsVisible(true);
        observer.disconnect();
      }
    }

    return () => observer.disconnect();
  }, [prefersReducedMotion]);

  // Fallback: force visibility after 2s in case observer + rect check both miss
  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsVisible(true);
    }, 2000);
    return () => clearTimeout(timeout);
  }, []);

  // Clear stagger delays after entrance animation completes so hover isn't delayed
  useEffect(() => {
    if (isVisible && !animationDone) {
      const timer = setTimeout(() => setAnimationDone(true), ANIMATION_TOTAL_MS);
      return () => clearTimeout(timer);
    }
  }, [isVisible, animationDone]);

  const skipAnimation = !hasMounted || prefersReducedMotion || animationDone;

  return (
    <section
      ref={sectionRef}
      id="clients"
      className="relative py-12 sm:py-16 lg:py-20 bg-neutral-900 border-t border-b border-neutral-800"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(96,165,250,0.04)_0%,transparent_70%)]" />
      <div className="relative max-w-6xl mx-auto px-4">
        {/* Heading */}
        <div className="text-center">
          <p
            className="text-xs font-semibold tracking-widest text-blue-400 uppercase mb-3 transition-all duration-500 ease-out"
            style={skipAnimation ? undefined : {
              transitionDelay: "0ms",
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? "none" : "translateY(16px)",
            }}
          >
            Trusted by Industry Leaders
          </p>
          <h2
            className="font-bold tracking-wider text-white uppercase text-xl sm:text-2xl lg:text-3xl transition-all duration-500 ease-out"
            style={skipAnimation ? undefined : {
              transitionDelay: "100ms",
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? "none" : "translateY(16px)",
            }}
          >
            Clients We Serve
          </h2>
          <div
            className="w-12 h-0.5 bg-accent-500 mt-4 rounded-full mx-auto transition-all duration-500 ease-out"
            style={skipAnimation ? undefined : {
              transitionDelay: "150ms",
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? "none" : "translateY(16px)",
            }}
          />
          <p
            className="text-center text-neutral-300 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed mt-4 mb-8 sm:mb-10 lg:mb-12 transition-all duration-500 ease-out"
            style={skipAnimation ? undefined : {
              transitionDelay: "150ms",
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? "none" : "translateY(16px)",
            }}
          >
            Michigan&apos;s commercial &amp; industrial facilities trust RMI
          </p>
        </div>

        {/* Logo grid — 18 items = 3 rows of 6 (desktop), 6 rows of 3 (mobile) */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-x-4 sm:gap-x-6 lg:gap-x-8 gap-y-6 sm:gap-y-8 lg:gap-y-10 items-center justify-items-center">
          {clients.map((client, index) => (
            <div
              key={client.name}
              className="flex items-center justify-center h-16 sm:h-18 lg:h-20 w-full px-2 opacity-60 hover:opacity-100 hover:scale-110 hover:drop-shadow-[0_0_8px_rgba(96,165,250,0.3)] transition-all duration-300 ease-out"
              style={skipAnimation ? undefined : {
                transitionDelay: `${200 + index * 60}ms`,
                opacity: isVisible ? undefined : 0,
                transform: isVisible ? undefined : "translateY(16px)",
              }}
            >
              <img
                src={client.logo}
                alt={client.name}
                className={`object-contain h-8 sm:h-9 lg:h-10 max-w-[100px] sm:max-w-[120px] lg:max-w-[130px] w-auto${client.needsInvert ? " brightness-0 invert" : ""}`}
                loading="lazy"
                width={130}
                height={40}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
