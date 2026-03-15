import { useState, useEffect, useRef } from "react";

// ── Static fallback data (hardcoded logos — always available) ──
interface StaticClient {
  name: string;
  logo: string;
  needsInvert?: boolean;
  scale?: number;
}

const STATIC_CLIENTS: StaticClient[] = [
  // Row 1 — Automotive heavyweights + tech giants
  { name: "Ford Motor Company", logo: "/images/clients/ford.svg", scale: 2.0 },
  { name: "General Motors", logo: "/images/clients/generalmotors.svg", scale: 1.4 },
  { name: "Toyota", logo: "/images/clients/toyota.svg", scale: 1.68 },
  { name: "Stellantis", logo: "/images/clients/stellantis.svg", needsInvert: true },
  { name: "Apple", logo: "/images/clients/apple.svg", scale: 1.44 },
  { name: "Amazon", logo: "/images/clients/amazon.svg", needsInvert: true, scale: 0.8 },
  // Row 2 — Logistics, auto, industrial, telecom
  { name: "FedEx", logo: "/images/clients/fedex.svg", scale: 2.0 },
  { name: "Delta Air Lines", logo: "/images/clients/delta.svg", scale: 2.0 },
  { name: "BMW", logo: "/images/clients/bmw.svg", scale: 1.76 },
  { name: "BASF", logo: "/images/clients/basf.svg", needsInvert: true, scale: 0.8 },
  { name: "Flagstar Bank", logo: "/images/clients/flagstar.svg", needsInvert: true, scale: 0.8 },
  { name: "Verizon", logo: "/images/clients/verizon.svg", scale: 0.8 },
  // Row 3 — Michigan/commercial/industrial
  { name: "Rocket Mortgage", logo: "/images/clients/rocket.svg", scale: 1.92 },
  { name: "CBRE", logo: "/images/clients/cbre.svg", scale: 0.8 },
  { name: "University of Michigan", logo: "/images/clients/michigan.svg", scale: 1.5 },
  { name: "Meijer", logo: "/images/clients/meijer.svg", scale: 1.12 },
  { name: "Babcock & Wilcox", logo: "/images/clients/babcock-wilcox.svg" },
  { name: "Nissan", logo: "/images/clients/nissan.svg", scale: 2 },
  // Row 4 — Consumer/regional
  { name: "Target", logo: "/images/clients/target.svg", needsInvert: true, scale: 0.8 },
  { name: "Cadillac", logo: "/images/clients/cadillac.svg", scale: 2.0 },
  { name: "Starbucks", logo: "/images/clients/starbucks.svg", scale: 1.6 },
  { name: "Consumers Energy", logo: "/images/clients/consumers-energy.svg", scale: 0.8 },
  { name: "Shake Shack", logo: "/images/clients/shake-shack.svg", needsInvert: true, scale: 1.2 },
  { name: "Five Below", logo: "/images/clients/five-below.svg", needsInvert: true, scale: 0.96 },
  // Row 5 — Regional + new additions
  { name: "Ascension Health", logo: "/images/clients/ascension.svg", scale: 1.04 },
  { name: "Culver's", logo: "/images/clients/culvers.svg", scale: 1.04 },
  { name: "Eastern Michigan University", logo: "/images/clients/eastern-michigan.svg", scale: 1.6 },
  { name: "Mercedes-Benz", logo: "/images/clients/mercedes-benz.svg", scale: 1.0 },
  { name: "Audi", logo: "/images/clients/audi.svg", scale: 1.5 },
  { name: "Edward Jones", logo: "/images/clients/edward-jones.svg", scale: 1.2 },
  // Row 6 — Michigan healthcare + energy
  { name: "Henry Ford Health", logo: "/images/clients/henry-ford-health.svg", scale: 0.8 },
  { name: "DTE Energy", logo: "/images/clients/dte-energy.svg", scale: 1.6 },
];

// ── DB client shape from /api/clients?featured=1 ──
interface DBClient {
  id: number;
  name: string;
  logo_url: string;
  logo_type: string;
  display_scale: number;
  needs_invert: boolean;
}

/** Normalize DB row into the same shape used for rendering */
function dbToRenderClient(db: DBClient): StaticClient {
  return {
    name: db.name,
    logo: db.logo_url,
    needsInvert: db.needs_invert,
    scale: db.display_scale,
  };
}

/** Max stagger delay = 200ms heading lead + 31 logos * 60ms + 500ms duration */
const ANIMATION_TOTAL_MS = 200 + 31 * 60 + 500;

export default function ClientShowcase() {
  const [isVisible, setIsVisible] = useState(false);
  const [animationDone, setAnimationDone] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const [displayClients, setDisplayClients] = useState<StaticClient[]>(STATIC_CLIENTS);
  const sectionRef = useRef<HTMLElement>(null);

  const prefersReducedMotion = typeof window !== "undefined"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // SSR-safe guard: only apply animation styles after React hydrates.
  // Without this, SSR renders opacity:0 which collapses the astro-island to 0×0.
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Fetch featured clients from DB — fall back to hardcoded on failure
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/clients?featured=1", { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error("API error");
        return r.json() as Promise<DBClient[]>;
      })
      .then((rows) => {
        // Only switch to DB data if we got a reasonable number of clients
        if (rows.length >= 6) {
          setDisplayClients(rows.map(dbToRenderClient));
        }
        // Otherwise keep hardcoded fallback — never show a worse grid
      })
      .catch(() => {
        // Network/API failure — keep hardcoded grid, no blank state ever
      });
    return () => controller.abort();
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

        {/* Logo grid — responsive: 3 cols mobile, 6 cols desktop */}
        <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-6 gap-x-1 sm:gap-x-3 lg:gap-x-4 gap-y-2 sm:gap-y-4 lg:gap-y-5 items-center justify-items-center">
          {displayClients.map((client, index) => (
            <div
              key={client.name}
              className="group relative flex items-center justify-center h-10 sm:h-14 lg:h-16 w-full px-2 overflow-visible opacity-[0.65] grayscale hover:opacity-100 hover:grayscale-0 hover:scale-105 hover:drop-shadow-[0_0_8px_rgba(96,165,250,0.3)] transition-all duration-300 ease-out"
              style={skipAnimation ? undefined : {
                transitionDelay: `${200 + index * 60}ms`,
                opacity: isVisible ? undefined : 0,
                transform: isVisible ? undefined : "translateY(16px)",
              }}
            >
              <img
                src={client.logo}
                alt={client.name}
                className={`object-contain h-8 sm:h-9 lg:h-10 max-w-[80px] sm:max-w-[120px] lg:max-w-[130px] w-auto${client.needsInvert ? " brightness-0 invert" : ""}`}
                style={client.scale && client.scale !== 1 ? { transform: `scale(${client.scale})` } : undefined}
                loading="lazy"
                decoding="async"
                width={130}
                height={40}
              />
              <span className={`pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-neutral-800 px-2 py-0.5 text-xs text-neutral-200 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg border border-neutral-700 z-10 ${index >= displayClients.length - 6 ? "-top-7" : "-bottom-7"}`}>
                {client.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
