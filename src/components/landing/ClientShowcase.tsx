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

interface ValidatedClient extends Client {
  logoUrl: string;
}

// ── Verified domains — only these return real logos from Brandfetch ──

const VERIFIED_DOMAINS = new Set([
  'ford.com', 'dteenergy.com', 'cmsenergy.com', 'stellantis.com',
  'toyota.com', 'basf.com', 'ameresco.com',
  'costco.com', 'amazon.com',
  'verizon.com', 'nissan.com', 'delta.com', 'dominos.com',
  'fidelity.com', 'comcast.com', 'flagstar.com', 'ymca.org',
  'cartier.com', 'tagheuer.com', 'primark.com',
  'mahle.com', 'shakeshack.com', 'fivebelow.com', 'quickenloans.com',
  'umich.edu', 'emich.edu', 'udmercy.edu',
]);

// ── Strict Brandfetch-only validation ────────────────────────────

interface ProbeResult {
  url: string;
  width: number;
  height: number;
}

function probeImage(
  src: string,
  endpoint: "logo" | "icon",
  timeoutMs = 5000,
): Promise<ProbeResult | null> {
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

      // Reject images smaller than 64px in either dimension
      if (w < 64 || h < 64) {
        resolve(null);
        return;
      }

      if (endpoint === "logo") {
        // Wordmark logos must be wider than tall (aspect ratio > 1.2:1)
        const ratio = w / h;
        if (ratio <= 1.2) {
          resolve(null);
          return;
        }
        // Reject extreme aspect ratios (> 10:1)
        if (ratio > 10) {
          resolve(null);
          return;
        }
      }

      if (endpoint === "icon") {
        // Reject square icons ≤ 256px — Brandfetch fallback branding
        if (w === h && w <= 256) {
          resolve(null);
          return;
        }
        // Icons must be at least 200px to be a real high-res icon
        if (w < 200) {
          resolve(null);
          return;
        }
      }

      resolve({ url: src, width: w, height: h });
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
    img.referrerPolicy = "no-referrer";
    img.src = src;
  });
}

async function validateLogo(
  domain: string,
): Promise<ProbeResult | null> {
  // Only attempt Brandfetch for verified domains — skip all others
  if (!VERIFIED_DOMAINS.has(domain)) return null;

  const logoResult = await probeImage(
    `https://cdn.brandfetch.io/${domain}/logo`,
    "logo",
  );
  if (logoResult) return logoResult;

  const iconResult = await probeImage(
    `https://cdn.brandfetch.io/${domain}/icon`,
    "icon",
  );
  if (iconResult) return iconResult;

  return null;
}

// ── Responsive layout with minimum pool support (Task 4) ────────

function getSlotLayout(width: number, poolSize: number): number[] {
  // Task 4: Adapt layout to available pool
  if (poolSize < 6) return []; // hide section
  if (poolSize <= 7) return width < 768 ? [3, 3] : [3, 3];
  if (poolSize <= 11) return width < 768 ? [2, 3] : [3, 4];

  // Full layout
  if (width < 768) return [2, 3]; // 5 slots mobile
  if (width < 1024) return [3, 3, 3]; // 9 slots tablet
  return [3, 4, 5]; // 12 slots desktop
}

function getTotalSlots(layout: number[]): number {
  return layout.reduce((a, b) => a + b, 0);
}

// ── LogoSlot — strict visual artifact rejection (Task 3) ────────

function LogoSlot({
  client,
  logoUrl,
  revealed,
  fading,
}: {
  client: ValidatedClient;
  logoUrl: string;
  revealed: boolean;
  fading: "out" | "in" | null;
  rowIndex: number;
}) {
  const [loaded, setLoaded] = useState(false);
  const [rejected, setRejected] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setRejected(false);
  }, [client.id]);

  // Task 3: All three conditions must be true for visibility
  const visible = revealed && loaded && !rejected && fading !== "out";

  const handleLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const img = e.currentTarget;
      // Task 3: Post-render square check — reject visual artifacts
      if (img.naturalWidth === img.naturalHeight) {
        setRejected(true);
        return;
      }
      setLoaded(true);
    },
    [],
  );

  if (rejected) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ minHeight: "56px", opacity: 0 }}
      />
    );
  }

  return (
    <div
      className="flex items-center justify-center"
      style={{
        minHeight: "56px",
        opacity: visible ? 1 : 0,
        transition: "opacity 600ms ease-in-out",
      }}
    >
      <img
        src={logoUrl}
        alt={client.name}
        className="max-h-14 max-w-[220px] w-auto object-contain"
        style={{ filter: "brightness(0) invert(1)", opacity: 0.85 }}
        onLoad={handleLoad}
        onError={() => setRejected(true)}
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

  // Responsive layout — depends on pool size for Task 4
  useEffect(() => {
    function updateLayout() {
      setLayout(getSlotLayout(window.innerWidth, displayPool.length));
    }
    updateLayout();
    window.addEventListener("resize", updateLayout);
    return () => window.removeEventListener("resize", updateLayout);
  }, [displayPool.length]);

  // Task 1: Fetch clients + validate logos with strict Brandfetch-only sources
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

      // Validate all in parallel, collecting results with dimensions
      const results: Array<{
        client: Client;
        result: ProbeResult;
      }> = [];

      let resolvedCount = 0;

      await new Promise<void>((resolve) => {
        const deadline = setTimeout(() => resolve(), 8000);

        const promises = clients.map(async (client) => {
          const probeResult = await validateLogo(client.domain);
          resolvedCount++;
          if (probeResult && !cancelled) {
            results.push({ client, result: probeResult });
            if (results.length >= 16) {
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

      // Build validated pool — whitelist approach prevents Brandfetch branding
      const validated: ValidatedClient[] = results
        .map(({ client, result }) => ({
          ...client,
          logoUrl: result.url,
        }));

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

  // Independent per-slot rotation with random timers
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

  // Task 4: hide if layout is empty (fewer than 6 logos)
  if (layout.length === 0) return null;

  // Build rows
  let offset = 0;
  const rows = layout.map((count, rowIdx) => {
    const rowClients = visibleSlots.slice(offset, offset + count);
    const startIdx = offset;
    offset += count;
    return { rowIdx, rowClients, startIdx };
  });

  return (
    <section
      ref={sectionRef}
      id="clients"
      className="py-12 px-4 relative overflow-hidden"
    >
      <div className="max-w-5xl mx-auto relative">
        {/* Header — tighter spacing */}
        <div className="text-center mb-6">
          <p className="text-xs uppercase tracking-[0.2em] text-blue-400 mb-2">
            Trusted By Industry Leaders
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            Clients We Serve
          </h2>
          <p className="text-sm text-slate-400 mt-2">
            Michigan&apos;s commercial &amp; industrial facilities trust RMI
          </p>
        </div>

        {/* Logo grid — dense, uniform gap-12, tighter row spacing */}
        <div className="flex flex-col items-center gap-4">
          {rows.map(({ rowIdx, rowClients, startIdx }) => (
            <div
              key={rowIdx}
              className="flex justify-center items-center gap-8"
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
