import { useState, useEffect, useRef, useCallback } from "react";

interface Client {
  id: number;
  name: string;
  domain: string;
  color: string;
  description: string;
  tier: "high" | "medium" | "low";
  seo_value: number;
}

/** Desktop: 3-4-5 pyramid (12 slots). Mobile: fewer slots. */
function getSlotLayout(width: number): number[] {
  if (width < 480) return [2, 2, 3]; // 7 slots
  if (width < 768) return [2, 3, 4]; // 9 slots
  return [3, 4, 5]; // 12 slots
}

function getTotalSlots(layout: number[]): number {
  return layout.reduce((a, b) => a + b, 0);
}

/** Row min-height classes to prevent layout shift */
const ROW_MIN_HEIGHTS = ["min-h-[64px]", "min-h-[48px]", "min-h-[40px]"];

function LogoSlot({
  client,
  fading,
  revealed,
  rowIndex,
}: {
  client: Client;
  fading: boolean;
  revealed: boolean;
  rowIndex: number;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset state when client changes
  useEffect(() => {
    setImgFailed(false);
    setImgLoaded(false);
    // 4s timeout — if image hasn't loaded, show text fallback
    timeoutRef.current = setTimeout(() => {
      setImgFailed(true);
    }, 4000);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [client.id]);

  function handleLoad() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setImgLoaded(true);
  }

  function handleError() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setImgFailed(true);
  }

  // Size classes per row: top = largest, bottom = smallest
  const sizeClasses = [
    "max-h-16 max-w-[160px]", // row 0 (top)
    "max-h-12 max-w-[140px]", // row 1 (middle)
    "max-h-10 max-w-[120px]", // row 2 (bottom)
  ];
  const sizeClass = sizeClasses[rowIndex] ?? sizeClasses[2];
  const fallbackSize = rowIndex === 0 ? "text-sm" : "text-xs";
  const minH = ROW_MIN_HEIGHTS[rowIndex] ?? ROW_MIN_HEIGHTS[2];

  // Visible when: revealed by stagger AND (image loaded OR using text fallback), AND not mid-fade
  const isVisible = revealed && (imgLoaded || imgFailed) && !fading;

  return (
    <div
      className={`transition-opacity duration-[600ms] ease-in-out flex items-center justify-center ${minH}`}
      style={{ opacity: isVisible ? 1 : 0 }}
    >
      {!imgFailed ? (
        <img
          src={`https://cdn.brandfetch.io/${client.domain}/logo`}
          alt={client.name}
          className={`${sizeClass} w-auto object-contain`}
          style={{ filter: "brightness(0) invert(1)", opacity: 0.85 }}
          onLoad={handleLoad}
          onError={handleError}
          referrerPolicy="no-referrer"
          loading="lazy"
        />
      ) : (
        <span
          className={`text-white/70 ${fallbackSize} font-medium tracking-wider whitespace-nowrap`}
        >
          {client.name}
        </span>
      )}
    </div>
  );
}

export default function ClientShowcase() {
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [visibleClients, setVisibleClients] = useState<Client[]>([]);
  const [fadingSlot, setFadingSlot] = useState<number | null>(null);
  const [revealedSlots, setRevealedSlots] = useState<Set<number>>(new Set());
  const [initialRevealDone, setInitialRevealDone] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [layout, setLayout] = useState<number[]>([3, 4, 5]);
  const sectionRef = useRef<HTMLElement>(null);
  const visibleRef = useRef<Client[]>([]);

  // Keep ref in sync for use inside intervals
  useEffect(() => {
    visibleRef.current = visibleClients;
  }, [visibleClients]);

  // Responsive layout
  useEffect(() => {
    function updateLayout() {
      setLayout(getSlotLayout(window.innerWidth));
    }
    updateLayout();
    window.addEventListener("resize", updateLayout);
    return () => window.removeEventListener("resize", updateLayout);
  }, []);

  // Fetch clients
  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then((data: Client[]) => setAllClients(data))
      .catch(() => {});
  }, []);

  // Pick initial visible set when clients load or layout changes
  useEffect(() => {
    if (!allClients.length) return;
    const totalSlots = getTotalSlots(layout);
    const shuffled = [...allClients].sort(() => Math.random() - 0.5);
    setVisibleClients(shuffled.slice(0, totalSlots));
    // Reset reveal state on layout change
    setRevealedSlots(new Set());
    setInitialRevealDone(false);
  }, [allClients, layout]);

  // IntersectionObserver — only for rotation pause/resume
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsInView(entry.isIntersecting),
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Staggered initial reveal — fires immediately when data loads
  useEffect(() => {
    if (!visibleClients.length || initialRevealDone) return;
    const totalSlots = getTotalSlots(layout);
    const staggerDelay = 100;
    const timers: ReturnType<typeof setTimeout>[] = [];

    for (let i = 0; i < totalSlots; i++) {
      timers.push(
        setTimeout(() => {
          setRevealedSlots((prev) => new Set([...prev, i]));
        }, i * staggerDelay)
      );
    }

    timers.push(
      setTimeout(() => {
        setInitialRevealDone(true);
      }, totalSlots * staggerDelay + 700)
    );

    return () => timers.forEach(clearTimeout);
  }, [visibleClients.length, initialRevealDone, layout]);

  // Rotation: swap one random logo every 4s
  const rotate = useCallback(() => {
    const totalSlots = getTotalSlots(layout);
    const current = visibleRef.current;
    if (current.length < totalSlots) return;

    const visibleIds = new Set(current.map((c) => c.id));
    const pool = allClients.filter((c) => !visibleIds.has(c.id));
    if (!pool.length) return;

    const slotIndex = Math.floor(Math.random() * totalSlots);
    const newClient = pool[Math.floor(Math.random() * pool.length)];

    // Phase 1: fade out (600ms transition + 100ms pause)
    setFadingSlot(slotIndex);

    // Phase 2: swap client data after fade-out completes
    setTimeout(() => {
      setVisibleClients((prev) => {
        const next = [...prev];
        next[slotIndex] = newClient;
        return next;
      });
      // Clear fading — LogoSlot will stay at opacity 0 until the new image loads
      // (isVisible requires imgLoaded || imgFailed, which resets on client change)
      setFadingSlot(null);
    }, 700);
  }, [allClients, layout]);

  useEffect(() => {
    const totalSlots = getTotalSlots(layout);
    if (!initialRevealDone || !isInView || allClients.length <= totalSlots)
      return;
    const interval = setInterval(rotate, 4000);
    return () => clearInterval(interval);
  }, [initialRevealDone, isInView, allClients.length, layout, rotate]);

  if (!allClients.length) return null;

  // Build rows from the flat visibleClients array
  let offset = 0;
  const rows = layout.map((count, rowIdx) => {
    const rowClients = visibleClients.slice(offset, offset + count);
    const startIdx = offset;
    offset += count;
    return { rowIdx, rowClients, startIdx };
  });

  const rowGaps = ["gap-10 sm:gap-12", "gap-8 sm:gap-10", "gap-6 sm:gap-8"];

  return (
    <section
      ref={sectionRef}
      id="clients"
      className="py-16 px-4 relative overflow-hidden"
    >
      <div className="max-w-5xl mx-auto relative">
        {/* Header */}
        <div className="text-center mb-10">
          <p className="text-xs uppercase tracking-[0.2em] text-blue-400 mb-2">
            Trusted By Industry Leaders
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-100 tracking-tight">
            Clients We Serve
          </h2>
          <p className="text-sm text-slate-500 mt-2">
            Michigan&apos;s commercial &amp; industrial facilities trust RMI
          </p>
        </div>

        {/* Logo pyramid */}
        <div className="flex flex-col items-center gap-6 sm:gap-8">
          {rows.map(({ rowIdx, rowClients, startIdx }) => (
            <div
              key={rowIdx}
              className={`flex justify-center items-center ${rowGaps[rowIdx] ?? rowGaps[2]}`}
            >
              {rowClients.map((client, i) => {
                const slotIdx = startIdx + i;
                return (
                  <LogoSlot
                    key={`slot-${slotIdx}`}
                    client={client}
                    fading={fadingSlot === slotIdx}
                    revealed={revealedSlots.has(slotIdx)}
                    rowIndex={rowIdx}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
