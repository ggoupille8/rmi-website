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

const TIER_SLOTS = { high: 3, medium: 5, low: 7 } as const;
const TIER_ORDER = ["high", "medium", "low"] as const;

function Monogram({ name, color }: { name: string; color: string }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
  const textColor = color === "#FFCB05" ? "#8B6914" : color;
  return (
    <span
      className="font-mono font-black tracking-widest text-xs"
      style={{ color: textColor }}
    >
      {initials}
    </span>
  );
}

function LogoImage({
  domain,
  name,
  color,
}: {
  domain: string;
  name: string;
  color: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return <Monogram name={name} color={color} />;
  return (
    <img
      src={`https://logo.clearbit.com/${domain}`}
      alt={name}
      className="max-h-full max-w-full object-contain"
      style={{ filter: "brightness(0) invert(1)", opacity: 0.85 }}
      onError={() => setFailed(true)}
      loading="lazy"
      width={80}
      height={32}
    />
  );
}

function ClientCard({
  client,
  size,
  animDelay,
  sectionVisible,
}: {
  client: Client;
  size: "large" | "medium" | "small";
  animDelay: number;
  sectionVisible: boolean;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!sectionVisible) return;
    const t = setTimeout(() => setReady(true), animDelay);
    return () => clearTimeout(t);
  }, [sectionVisible, animDelay]);

  const heights = { large: "h-20", medium: "h-14", small: "h-10" };
  const paddings = { large: "px-5 py-4", medium: "px-4 py-3", small: "px-3 py-2" };

  return (
    <div
      className={`
        relative flex flex-col items-center justify-center rounded-xl
        ${heights[size]} ${paddings[size]}
        transition-all duration-700 ease-out
        hover:border-blue-500/30 hover:bg-white/[0.04] group
      `}
      style={{
        opacity: ready ? 1 : 0,
        transform: ready
          ? "translateY(0) scale(1)"
          : "translateY(8px) scale(0.96)",
        background: "rgba(255,255,255,0.025)",
        border: `1px solid ${client.color}22`,
      }}
      title={`${client.name} — ${client.description}`}
    >
      {/* Subtle color glow top */}
      <div
        className="absolute inset-x-0 top-0 h-px rounded-t-xl"
        style={{
          background: `linear-gradient(90deg, transparent, ${client.color}40, transparent)`,
        }}
      />
      <LogoImage domain={client.domain} name={client.name} color={client.color} />
    </div>
  );
}

export default function ClientShowcase() {
  const [clients, setClients] = useState<Client[]>([]);
  const [visible, setVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then((data: Client[]) => setClients(data))
      .catch(() => {}); // fail silently — section just won't render
  }, []);

  useEffect(() => {
    if (!clients.length) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, [clients.length]);

  useEffect(() => {
    if (!clients.length || visible) return;
    if (sectionRef.current && sectionRef.current.getBoundingClientRect().top < window.innerHeight) {
      setVisible(true);
    }
  }, [clients.length, visible]);

  if (!clients.length) return null;

  return (
    <section
      ref={sectionRef}
      id="clients"
      className="py-16 px-4 relative overflow-hidden"
    >
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-950/10 to-transparent pointer-events-none" />

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

        {/* Tiered grid — pyramid layout */}
        <div className="flex flex-col items-center gap-3">
          {TIER_ORDER.map((tier, rowIdx) => {
            const tierClients = clients
              .filter((c) => c.tier === tier)
              .slice(0, TIER_SLOTS[tier]);
            if (!tierClients.length) return null;
            const size =
              tier === "high" ? "large" : tier === "medium" ? "medium" : "small";
            const maxW =
              tier === "high" ? "560px" : tier === "medium" ? "800px" : "100%";
            const gap =
              tier === "high" ? "12px" : tier === "medium" ? "10px" : "8px";

            return (
              <div
                key={tier}
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${tierClients.length}, 1fr)`,
                  gap,
                  width: "100%",
                  maxWidth: maxW,
                }}
              >
                {tierClients.map((client, i) => (
                  <ClientCard
                    key={client.id}
                    client={client}
                    size={size}
                    animDelay={rowIdx * 160 + i * 80}
                    sectionVisible={visible}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
