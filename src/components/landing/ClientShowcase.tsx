import { useState, useEffect, useRef, useCallback } from "react";

interface Client {
  id: number;
  name: string;
  domain: string;
  color: string;
  description: string;
  logo_scale: number;
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
  'gm.com', 'rolandberger.com', 'ldc.com',
  'arhaus.com', 'smoothieking.com', 'flooranddecor.com',
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

      if (w < 64 || h < 64) {
        resolve(null);
        return;
      }

      if (endpoint === "logo") {
        const ratio = w / h;
        if (ratio <= 1.2 || ratio > 10) {
          resolve(null);
          return;
        }
      }

      if (endpoint === "icon") {
        if (w === h && w <= 256) {
          resolve(null);
          return;
        }
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

// ── Responsive layout ────────────────────────────────────────────

function getSlotLayout(width: number, poolSize: number): number[] {
  if (poolSize < 6) return [];
  if (poolSize <= 7) return width < 768 ? [3, 3] : [3, 3];
  if (poolSize <= 11) return width < 768 ? [2, 3] : [3, 4];

  if (width < 768) return [2, 3];
  if (width < 1024) return [3, 3, 3];
  return [3, 4, 5];
}

function getTotalSlots(layout: number[]): number {
  return layout.reduce((a, b) => a + b, 0);
}

// ── LogoSlot — two states: loaded + fadingOut ────────────────────

function LogoSlot({
  client,
  fadingOut,
}: {
  client: ValidatedClient;
  fadingOut: boolean;
}) {
  const [loaded, setLoaded] = useState(false);

  // Reset loaded when client changes (new logo swapped in)
  useEffect(() => {
    setLoaded(false);
  }, [client.id]);

  const handleLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const img = e.currentTarget;
      // Reject square images — Brandfetch branding artifacts
      if (img.naturalWidth === img.naturalHeight) return;
      setLoaded(true);
    },
    [],
  );

  return (
    <div
      className="flex items-center justify-center"
      style={{
        minHeight: "56px",
        opacity: loaded && !fadingOut ? 1 : 0,
        transition: "opacity 600ms ease-in-out",
      }}
    >
      <img
        src={client.logoUrl}
        alt={client.name}
        className="max-h-14 max-w-[220px] w-auto object-contain"
        style={{
          filter: "brightness(0) invert(1)",
          opacity: 0.85,
          transform: `scale(${client.logo_scale || 1})`,
        }}
        onLoad={handleLoad}
        onError={() => setLoaded(false)}
        referrerPolicy="no-referrer"
        loading="eager"
      />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────

export default function ClientShowcase() {
  const [allClients, setAllClients] = useState<ValidatedClient[]>([]);
  const [visibleClients, setVisibleClients] = useState<ValidatedClient[]>([]);
  const [ready, setReady] = useState(false);
  const [isInView, setIsInView] = useState(true);
  const [fadingSlots, setFadingSlots] = useState<Set<number>>(new Set());

  const [layout, setLayout] = useState<number[]>([3, 4, 5]);

  const sectionRef = useRef<HTMLElement>(null);
  const visibleRef = useRef<ValidatedClient[]>([]);
  const allRef = useRef<ValidatedClient[]>([]);
  const isInViewRef = useRef(true);
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const unmountedRef = useRef(false);
  const lastSwappedOutRef = useRef<Map<number, number>>(new Map());

  // Keep refs in sync
  useEffect(() => { visibleRef.current = visibleClients; }, [visibleClients]);
  useEffect(() => { allRef.current = allClients; }, [allClients]);
  useEffect(() => { isInViewRef.current = isInView; }, [isInView]);

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      unmountedRef.current = true;
      timersRef.current.forEach(clearTimeout);
      timersRef.current.clear();
    };
  }, []);

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
      setLayout(getSlotLayout(window.innerWidth, allClients.length));
    }
    updateLayout();
    window.addEventListener("resize", updateLayout);
    return () => window.removeEventListener("resize", updateLayout);
  }, [allClients.length]);

  // Fetch clients + validate logos
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

      const results: Array<{ client: Client; result: ProbeResult }> = [];
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

      const validated: ValidatedClient[] = results.map(({ client, result }) => ({
        ...client,
        logoUrl: result.url,
      }));

      if (validated.length < 6) return;

      const shuffled = validated.sort(() => Math.random() - 0.5);
      setAllClients(shuffled);

      const totalSlots = getTotalSlots(getSlotLayout(window.innerWidth, shuffled.length));
      setVisibleClients(shuffled.slice(0, totalSlots));

      // Fade in immediately — no scroll trigger
      setReady(true);
    }

    init();
    return () => { cancelled = true; };
  }, []);

  // Update visible clients when layout changes (resize)
  useEffect(() => {
    if (!allClients.length) return;
    const totalSlots = getTotalSlots(layout);
    setVisibleClients((prev) => {
      if (prev.length === totalSlots) return prev;
      return allClients.slice(0, totalSlots);
    });
    timersRef.current.forEach(clearTimeout);
    timersRef.current.clear();
  }, [layout, allClients]);

  // IntersectionObserver — ONLY for pausing/resuming rotation
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Independent per-slot rotation
  useEffect(() => {
    if (!ready) return;
    const totalSlots = getTotalSlots(layout);
    if (allClients.length <= totalSlots) return;

    // Wait for initial fade-in before starting rotation
    safeTimeout(() => {
      for (let i = 0; i < totalSlots; i++) {
        scheduleNextSwap(i);
      }
    }, 800);

    function scheduleNextSwap(slotIndex: number) {
      const delay = 5000 + Math.random() * 5000;

      safeTimeout(() => {
        if (!isInViewRef.current) {
          scheduleNextSwap(slotIndex);
          return;
        }

        const current = visibleRef.current;
        const pool = allRef.current;
        const visibleIds = new Set(current.map((c) => c.id));
        const lastOut = lastSwappedOutRef.current.get(slotIndex);
        const available = pool.filter(
          (c) => !visibleIds.has(c.id) && c.id !== lastOut,
        );

        if (!available.length) {
          scheduleNextSwap(slotIndex);
          return;
        }

        const newClient = available[Math.floor(Math.random() * available.length)];

        // Track the logo leaving this slot
        if (current[slotIndex]) {
          lastSwappedOutRef.current.set(slotIndex, current[slotIndex].id);
        }

        // Phase 1: fade out
        setFadingSlots((prev) => {
          const next = new Set(prev);
          next.add(slotIndex);
          return next;
        });

        // Phase 2: after fade-out completes, swap the client
        safeTimeout(() => {
          const preload = new Image();
          preload.referrerPolicy = "no-referrer";

          const swapTimeout = safeTimeout(() => doSwap(), 3000);

          function doSwap() {
            clearTimeout(swapTimeout);
            timersRef.current.delete(swapTimeout);
            if (unmountedRef.current) return;

            setVisibleClients((prev) => {
              const next = [...prev];
              next[slotIndex] = newClient;
              return next;
            });
            setFadingSlots((prev) => {
              const next = new Set(prev);
              next.delete(slotIndex);
              return next;
            });

            // Wait for fade-in, then schedule next swap
            safeTimeout(() => scheduleNextSwap(slotIndex), 700);
          }

          preload.onload = doSwap;
          preload.onerror = doSwap;
          preload.src = newClient.logoUrl;
        }, 700);
      }, delay);
    }
  }, [ready, layout, allClients.length]);

  if (!ready || !allClients.length || layout.length === 0) return null;

  // Build rows
  let offset = 0;
  const rows = layout.map((count, rowIdx) => {
    const rowClients = visibleClients.slice(offset, offset + count);
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

        {/* Logo grid — fades in when ready, no scroll trigger */}
        <div
          className="flex flex-col items-center gap-4"
          style={{
            opacity: ready ? 1 : 0,
            transition: "opacity 800ms ease-in-out",
          }}
        >
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
                    fadingOut={fadingSlots.has(slotIdx)}
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
