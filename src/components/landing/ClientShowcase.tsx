import { useState, useEffect, useRef } from "react";

interface Client {
  name: string;
  logo: string;
  /** true when the SVG has dark/colored fill and needs CSS inversion to appear white */
  needsInvert?: boolean;
  /** CSS transform scale multiplier (default 1) — icon logos need boosting vs wordmarks */
  scale?: number;
}

const clients: Client[] = [
  // Row 1 — Automotive heavyweights + tech giants
  { name: "Ford Motor Company", logo: "/images/clients/ford.svg", scale: 3 },
  { name: "General Motors", logo: "/images/clients/generalmotors.svg", scale: 1.75 },
  { name: "Toyota", logo: "/images/clients/toyota.svg", scale: 2.1 },
  { name: "Stellantis", logo: "/images/clients/stellantis.svg", needsInvert: true },
  { name: "Apple", logo: "/images/clients/apple.svg", scale: 1.8 },
  { name: "Amazon", logo: "/images/clients/amazon.svg", needsInvert: true },
  // Row 2 — Logistics, auto, industrial, telecom
  { name: "FedEx", logo: "/images/clients/fedex.svg", scale: 4 },
  { name: "Delta Air Lines", logo: "/images/clients/delta.svg", scale: 3 },
  { name: "BMW", logo: "/images/clients/bmw.svg", scale: 2.2 },
  { name: "BASF", logo: "/images/clients/basf.svg", needsInvert: true },
  { name: "Flagstar Bank", logo: "/images/clients/flagstar.svg", needsInvert: true },
  { name: "Verizon", logo: "/images/clients/verizon.svg" },
  // Row 3 — Michigan/commercial/industrial
  { name: "Rocket Mortgage", logo: "/images/clients/rocket.svg", scale: 1.2 },
  { name: "CBRE", logo: "/images/clients/cbre.svg" },
  { name: "University of Michigan", logo: "/images/clients/michigan.svg", scale: 2.5 },
  { name: "Meijer", logo: "/images/clients/meijer.svg" },
  { name: "Babcock & Wilcox", logo: "/images/clients/babcock-wilcox.svg" },
  { name: "Nissan", logo: "/images/clients/nissan.svg", scale: 2 },
  // Row 4 — Consumer/regional
  { name: "Target", logo: "/images/clients/target.svg", needsInvert: true },
  { name: "Cadillac", logo: "/images/clients/cadillac.svg", scale: 2 },
  { name: "Starbucks", logo: "/images/clients/starbucks.svg", scale: 2 },
  { name: "Consumers Energy", logo: "/images/clients/consumers-energy.svg" },
  { name: "Shake Shack", logo: "/images/clients/shake-shack.svg", needsInvert: true, scale: 1.5 },
  { name: "Five Below", logo: "/images/clients/five-below.svg", needsInvert: true, scale: 1.2 },
  // Row 5 — Regional (partial row)
  { name: "Ascension Health", logo: "/images/clients/ascension.svg", scale: 1.3 },
  { name: "Culver's", logo: "/images/clients/culvers.svg", scale: 1.3 },
  { name: "Eastern Michigan University", logo: "/images/clients/eastern-michigan.svg", scale: 2 },
  { name: "Barton Malow", logo: "/images/clients/barton-malow.svg" },
];

/** Max stagger delay = 200ms heading lead + 27 logos * 60ms + 500ms duration */
const ANIMATION_TOTAL_MS = 200 + 27 * 60 + 500;

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
      className="relative py-6 sm:py-8 lg:py-10 bg-neutral-900 border-t border-b border-neutral-800"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(96,165,250,0.04)_0%,transparent_70%)]" />
      <div className="relative max-w-6xl mx-auto px-4">
        {/* Heading */}
        <div className="text-center">
          <p
            className="text-xs font-semibold tracking-widest text-blue-400 uppercase mb-1 transition-all duration-500 ease-out"
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
            className="w-12 h-0.5 bg-accent-500 mt-2 rounded-full mx-auto transition-all duration-500 ease-out"
            style={skipAnimation ? undefined : {
              transitionDelay: "150ms",
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? "none" : "translateY(16px)",
            }}
          />
          <p
            className="text-center text-neutral-300 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed mt-4 mb-3 sm:mb-4 transition-all duration-500 ease-out"
            style={skipAnimation ? undefined : {
              transitionDelay: "150ms",
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? "none" : "translateY(16px)",
            }}
          >
            Michigan&apos;s commercial &amp; industrial facilities trust RMI
          </p>
        </div>

        {/* Logo grid — 28 items = ~5 rows of 6 (desktop), ~10 rows of 3 (mobile) */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-x-2 sm:gap-x-3 lg:gap-x-4 gap-y-3 sm:gap-y-4 lg:gap-y-5 items-center justify-items-center">
          {clients.map((client, index) => (
            <div
              key={client.name}
              className="flex items-center justify-center h-12 sm:h-14 lg:h-16 w-full px-2 overflow-visible opacity-[0.65] hover:opacity-100 hover:scale-110 hover:drop-shadow-[0_0_8px_rgba(96,165,250,0.3)] transition-all duration-300 ease-out"
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
                style={client.scale && client.scale !== 1 ? { transform: `scale(${client.scale})` } : undefined}
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
