import { useState, useEffect, useRef, useCallback } from 'react';
import { resolveLogo, getInitials } from './LogoResolver';

interface Client {
  id: number;
  name: string;
  domain: string;
  color: string | null;
  description: string | null;
}

const GRID_SIZE = 12;
const ROTATION_INTERVAL = 5000;
const REDUCED_MOTION_INTERVAL = 10000;
const FADE_DURATION = 1500;

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ----- LogoSlot sub-component -----

interface LogoSlotProps {
  client: Client;
  isFading: boolean;
  reducedMotion: boolean;
}

function LogoSlot({ client, isFading, reducedMotion }: LogoSlotProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    setLogoUrl(null);

    resolveLogo(client.domain).then((url) => {
      if (cancelled) return;
      setLogoUrl(url);
      if (!url) setLoaded(true); // Show initials fallback immediately
    });

    return () => {
      cancelled = true;
    };
  }, [client.domain]);

  const fadeStyle = reducedMotion
    ? { opacity: isFading ? 0 : loaded ? 1 : 0 }
    : {
        opacity: isFading ? 0 : loaded ? 1 : 0,
        transition: `opacity ${FADE_DURATION}ms ease-in-out`,
      };

  return (
    <div
      className="group flex flex-col items-center justify-center gap-2 py-3"
      style={fadeStyle}
      title={client.name}
    >
      {/* Logo container */}
      <div className="relative flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-xl bg-white/5 group-hover:bg-white/10 transition-colors duration-300">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={client.name}
            referrerPolicy="no-referrer"
            className="max-h-[48px] max-w-[48px] md:max-h-[56px] md:max-w-[56px] object-contain rounded-md brightness-0 invert opacity-60 group-hover:opacity-100 transition-opacity duration-300"
            onLoad={() => setLoaded(true)}
            onError={() => {
              setLogoUrl(null);
              setLoaded(true);
            }}
          />
        ) : loaded ? (
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-lg flex items-center justify-center bg-white/10">
            <span className="text-white/70 font-bold text-sm md:text-base tracking-wide">
              {getInitials(client.name)}
            </span>
          </div>
        ) : (
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-lg bg-neutral-800 animate-pulse" />
        )}
      </div>

      {/* Client name */}
      <span className="text-[10px] md:text-xs text-neutral-500 group-hover:text-neutral-300 transition-colors duration-300 text-center leading-tight max-w-[80px] md:max-w-[100px] truncate">
        {client.name}
      </span>
    </div>
  );
}

// ----- Main ClientShowcase component -----

export default function ClientShowcase() {
  const [visibleClients, setVisibleClients] = useState<Client[]>([]);
  const [fadingSlot, setFadingSlot] = useState<number | null>(null);
  const [fetchFailed, setFetchFailed] = useState(false);

  const queueRef = useRef<Client[]>([]);
  const visibleCountRef = useRef(0);
  const isRotatingRef = useRef(false);
  const isHoveredRef = useRef(false);
  const reducedMotionRef = useRef(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Detect prefers-reduced-motion
  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      reducedMotionRef.current = mql.matches;
      setReducedMotion(mql.matches);
    };
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);

  // Fetch clients on mount
  // No cancelled flag — React 18 safely ignores setState on unmounted components.
  // The previous closure-based cancelled guard was being set to true during
  // Astro's client:visible hydration re-mount, silently dropping fetched data.
  useEffect(() => {
    console.log('[ClientShowcase] fetch effect running');

    fetch('/api/clients')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: Client[]) => {
        console.log('[ClientShowcase] fetch resolved, clients:', data.length);
        const withDomains = data.filter(
          (c): c is Client => Boolean(c.domain)
        );
        if (withDomains.length === 0) {
          setFetchFailed(true);
          return;
        }
        const shuffled = shuffle(withDomains);
        const slotCount = Math.min(GRID_SIZE, shuffled.length);
        visibleCountRef.current = slotCount;
        setVisibleClients(shuffled.slice(0, slotCount));
        queueRef.current = shuffled.slice(slotCount);
      })
      .catch(() => {
        setFetchFailed(true);
      });
  }, []);

  // Rotation logic
  const rotateOneSlot = useCallback(() => {
    if (isRotatingRef.current) return;
    if (isHoveredRef.current) return;
    if (document.visibilityState === 'hidden') return;
    if (queueRef.current.length === 0) return;
    if (visibleCountRef.current === 0) return;

    isRotatingRef.current = true;
    const slotIndex = Math.floor(Math.random() * visibleCountRef.current);
    const fadeDuration = reducedMotionRef.current ? 0 : FADE_DURATION;

    // Start fade-out
    setFadingSlot(slotIndex);

    // After fade-out completes, swap the client and fade in
    setTimeout(() => {
      setVisibleClients((current) => {
        const next = [...current];
        const outgoing = next[slotIndex];
        const incoming = queueRef.current.shift();
        if (incoming) {
          next[slotIndex] = incoming;
          queueRef.current.push(outgoing);
        }
        return next;
      });
      setFadingSlot(null);

      // Mark rotation as complete after fade-in finishes
      setTimeout(() => {
        isRotatingRef.current = false;
      }, fadeDuration);
    }, fadeDuration);
  }, []);

  // Rotation interval
  useEffect(() => {
    if (visibleClients.length === 0) return;

    const interval = setInterval(
      rotateOneSlot,
      reducedMotion ? REDUCED_MOTION_INTERVAL : ROTATION_INTERVAL
    );
    return () => clearInterval(interval);
  }, [visibleClients.length, rotateOneSlot, reducedMotion]);

  // Don't render if API failed
  if (fetchFailed) return null;

  // Render a placeholder while loading so client:visible can trigger hydration.
  // astro-island uses display:contents, so Astro's visible directive observes
  // children — returning null leaves zero children and IO never fires.
  if (visibleClients.length === 0) {
    return <div aria-hidden="true" style={{ minHeight: '200px' }} />;
  }

  return (
    <section id="clients" className="py-20 bg-neutral-950">
      <div className="max-w-6xl mx-auto px-4">
        {/* Heading */}
        <div className="text-center mb-12">
          <p className="text-sm font-semibold tracking-widest text-blue-400 uppercase mb-3">
            Trusted by Industry Leaders
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Clients We Serve
          </h2>
          <p className="text-neutral-400 max-w-2xl mx-auto">
            Michigan&apos;s commercial &amp; industrial facilities trust RMI
          </p>
        </div>

        {/* Logo grid */}
        <div
          className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-6 gap-y-4"
          onMouseEnter={() => {
            isHoveredRef.current = true;
          }}
          onMouseLeave={() => {
            isHoveredRef.current = false;
          }}
        >
          {visibleClients.map((client, index) => (
            <LogoSlot
              key={`${client.id}-${client.domain}`}
              client={client}
              isFading={fadingSlot === index}
              reducedMotion={reducedMotion}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
