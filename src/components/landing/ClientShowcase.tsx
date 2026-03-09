import { useState, useEffect, useRef } from "react";

interface Client {
  id: number;
  name: string;
  domain: string;
  color: string;
  description: string;
  tier: "high" | "medium" | "low";
  seo_value: number;
}

interface ValidatedClient extends Client {
  logoUrl: string;
}

// ── Task 1: Multi-source logo validation ──────────────────────────

const LOGO_SOURCES = (domain: string) => [
  `https://cdn.brandfetch.io/${domain}/logo`,
  `https://cdn.brandfetch.io/${domain}/icon`,
  `https://logo.clearbit.com/${domain}`,
  `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
];

function probeImage(src: string, timeoutMs = 5000): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const timer = setTimeout(() => {
      img.src = "";
      resolve(null);
    }, timeoutMs);
    img.onload = () => {
      clearTimeout(timer);
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      // Reject images smaller than 64x64
      if (w < 64 || h < 64) {
        resolve(null);
        return;
      }
      // Reject Brandfetch fallback branding (square logo returned for unknown domains)
      if (src.includes("brandfetch.io") && w === h) {
        resolve(null);
        return;
      }
      // Reject extreme aspect ratios (> 10:1 either direction)
      const ratio = w / h;
      if (ratio > 10 || ratio < 0.1) {
        resolve(null);
        return;
      }
      resolve(src);
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
    img.referrerPolicy = "no-referrer";
    img.src = src;
  });
}

async function validateLogo(domain: string): Promise<string | null> {
  for (const src of LOGO_SOURCES(domain)) {
    const result = await probeImage(src);
    if (result) return result;
  }
  return null;
}

// ── Task 5: Responsive layout ─────────────────────────────────────

function getSlotLayout(width: number): number[] {
  if (width < 768) return [2, 3]; // 5 slots mobile
  if (width < 1024) return [3, 3, 3]; // 9 slots tablet
  return [3, 4, 5]; // 12 slots desktop
}

function getTotalSlots(layout: number[]): number {
  return layout.reduce((a, b) => a + b, 0);
}

// ── Task 3 & 4: LogoSlot — images only, no text fallbacks ────────

function LogoSlot({
  client,
  logoUrl,
  revealed,
  fading,
  rowIndex,
}: {
  client: ValidatedClient;
  logoUrl: string;
  revealed: boolean;
  fading: "out" | "in" | null;
  rowIndex: number;
}) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
  }, [client.id]);

  const visible = revealed && loaded && fading !== "out";

  // Uniform sizing across all rows for a clean grid
  const sizeClass = "max-h-10 max-w-[160px]";

  return (
    <div
      className="flex items-center justify-center"
      style={{
        minHeight: "40px",
        opacity: visible ? 1 : 0,
        transition: "opacity 600ms ease-in-out",
      }}
    >
      <img
        src={logoUrl}
        alt={client.name}
        className={`${sizeClass} w-auto object-contain`}
        style={{ filter: "brightness(0) invert(1)", opacity: 0.85 }}
        onLoad={() => setLoaded(true)}
        onError={() => {
          /* already validated — keep invisible if somehow fails */
        }}
        referrerPolicy="no-referrer"
        loading="eager"
      />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────

export default function ClientShowcase() {
  const [displayPool, setDisplayPool] = useState<ValidatedClient[]>([]);
  const [visibleSlots, setVisibleSlots] = useState<ValidatedClient[]>([]);
  const [revealedSlots, setRevealedSlots] = useState<Set<number>>(new Set());
  const [fadingSlots, setFadingSlots] = useState<
    Map<number, "out" | "in">
  >(new Map());
  const [initialRevealDone, setInitialRevealDone] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [layout, setLayout] = useState<number[]>([3, 4, 5]);
  const [ready, setReady] = useState(false);

  const sectionRef = useRef<HTMLElement>(null);
  const visibleRef = useRef<ValidatedClient[]>([]);
  const poolRef = useRef<ValidatedClient[]>([]);
  const isInViewRef = useRef(false);
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const unmountedRef = useRef(false);

  // Keep refs in sync
  useEffect(() => {
    visibleRef.current = visibleSlots;
  }, [visibleSlots]);
  useEffect(() => {
    poolRef.current = displayPool;
  }, [displayPool]);
  useEffect(() => {
    isInViewRef.current = isInView;
  }, [isInView]);

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      unmountedRef.current = true;
      timersRef.current.forEach(clearTimeout);
      timersRef.current.clear();
    };
  }, []);

  // Tracked setTimeout that auto-cleans
  function safeTimeout(fn: () => void, ms: number) {
    const id = setTimeout(() => {
      timersRef.current.delete(id);
      if (!unmountedRef.current) fn();
    }, ms);
    timersRef.current.add(id);
    return id;
  }

  // Responsive layout
  useEffect(() => {
    function updateLayout() {
      setLayout(getSlotLayout(window.innerWidth));
    }
    updateLayout();
    window.addEventListener("resize", updateLayout);
    return () => window.removeEventListener("resize", updateLayout);
  }, []);

  // Task 1: Fetch clients + validate logos in parallel
  useEffect(() => {
    let cancelled = false;

    async function init() {
      let clients: Client[];
      try {
        const res = await fetch("/api/clients");
        clients = await res.json();
      } catch {
        return;
      }
      if (cancelled || !clients.length) return;

      const validated: ValidatedClient[] = [];
      let resolvedCount = 0;

      // Race: resolve when 12 ready OR 8s timeout OR all done
      await new Promise<void>((resolve) => {
        const deadline = setTimeout(() => resolve(), 8000);

        const promises = clients.map(async (client) => {
          const logoUrl = await validateLogo(client.domain);
          resolvedCount++;
          if (logoUrl && !cancelled) {
            validated.push({ ...client, logoUrl });
            if (validated.length >= 12) {
              clearTimeout(deadline);
              resolve();
            }
          }
          if (resolvedCount === clients.length) {
            clearTimeout(deadline);
            resolve();
          }
        });

        void Promise.allSettled(promises);
      });

      if (cancelled) return;

      // Task 4: hide section if fewer than 6 logos
      if (validated.length < 6) return;

      // Shuffle for variety
      const shuffled = validated.sort(() => Math.random() - 0.5);
      setDisplayPool(shuffled);
      setReady(true);
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  // Pick visible slots when pool or layout changes
  useEffect(() => {
    if (!displayPool.length) return;
    const totalSlots = getTotalSlots(layout);
    setVisibleSlots(displayPool.slice(0, totalSlots));
    setRevealedSlots(new Set());
    setInitialRevealDone(false);
    setFadingSlots(new Map());
    // Clear existing rotation timers
    timersRef.current.forEach(clearTimeout);
    timersRef.current.clear();
  }, [displayPool, layout]);

  // IntersectionObserver — only for rotation pause/resume
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsInView(entry.isIntersecting),
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Simultaneous initial reveal — all logos appear at once
  useEffect(() => {
    if (!visibleSlots.length || initialRevealDone) return;
    const totalSlots = getTotalSlots(layout);
    const allSlots = new Set<number>();
    for (let i = 0; i < totalSlots; i++) allSlots.add(i);
    setRevealedSlots(allSlots);

    // Mark reveal done after the fade-in transition completes
    safeTimeout(() => {
      setInitialRevealDone(true);
    }, 700);
  }, [visibleSlots.length, initialRevealDone, layout]);

  // Task 2: Independent per-slot rotation with random timers
  useEffect(() => {
    if (!initialRevealDone) return;
    const totalSlots = getTotalSlots(layout);
    if (displayPool.length <= totalSlots) return;

    function scheduleNextSwap(slotIndex: number) {
      const delay = 5000 + Math.random() * 5000; // 5–10s random per slot

      safeTimeout(() => {
        if (!isInViewRef.current) {
          // Not visible — recheck in 1s
          scheduleNextSwap(slotIndex);
          return;
        }

        const current = visibleRef.current;
        const pool = poolRef.current;
        const visibleIds = new Set(current.map((c) => c.id));
        const available = pool.filter((c) => !visibleIds.has(c.id));

        if (!available.length) {
          scheduleNextSwap(slotIndex);
          return;
        }

        const newClient =
          available[Math.floor(Math.random() * available.length)];

        // Phase 1: fade out
        setFadingSlots((prev) => new Map(prev).set(slotIndex, "out"));

        // Phase 2: swap after fade-out (600ms + 100ms pause)
        safeTimeout(() => {
          // Pre-load the new logo before swapping
          const preload = new Image();
          preload.referrerPolicy = "no-referrer";

          const swapTimeout = safeTimeout(() => {
            // Timed out waiting for preload — swap anyway (validated URL)
            doSwap();
          }, 3000);

          function doSwap() {
            clearTimeout(swapTimeout);
            timersRef.current.delete(swapTimeout);
            if (unmountedRef.current) return;

            setVisibleSlots((prev) => {
              const next = [...prev];
              next[slotIndex] = newClient;
              return next;
            });
            setFadingSlots((prev) => {
              const next = new Map(prev);
              next.delete(slotIndex);
              return next;
            });

            // Schedule next rotation for this slot
            safeTimeout(() => {
              scheduleNextSwap(slotIndex);
            }, 700); // wait for fade-in transition
          }

          preload.onload = doSwap;
          preload.onerror = doSwap; // swap anyway — it was validated
          preload.src = newClient.logoUrl;
        }, 700);
      }, delay);
    }

    // Start independent timers for each slot
    for (let i = 0; i < totalSlots; i++) {
      scheduleNextSwap(i);
    }
  }, [initialRevealDone, layout, displayPool.length]);

  // Don't render until validation is done
  if (!ready || !displayPool.length) return null;

  // Build rows
  let offset = 0;
  const rows = layout.map((count, rowIdx) => {
    const rowClients = visibleSlots.slice(offset, offset + count);
    const startIdx = offset;
    offset += count;
    return { rowIdx, rowClients, startIdx };
  });

  // Task 5: spacing per row
  const rowGaps = ["gap-16", "gap-12", "gap-10"];

  return (
    <section
      ref={sectionRef}
      id="clients"
      className="py-20 px-4 relative overflow-hidden"
    >
      <div className="max-w-5xl mx-auto relative">
        {/* Header */}
        <div className="text-center mb-12">
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
                    logoUrl={client.logoUrl}
                    revealed={revealedSlots.has(slotIdx)}
                    fading={fadingSlots.get(slotIdx) ?? null}
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
