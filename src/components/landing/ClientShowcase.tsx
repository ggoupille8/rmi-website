interface Client {
  name: string;
  logo: string;
  /** true when logo is served from an external CDN (already white) */
  cdn: boolean;
  /** controls rendered height — sm for visually heavy, lg for thin/small logos */
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses: Record<string, string> = {
  sm: 'h-8 sm:h-10 lg:h-12 w-auto max-w-[130px] sm:max-w-[150px] lg:max-w-[170px]',
  md: 'h-10 sm:h-12 lg:h-14 w-auto max-w-[140px] sm:max-w-[160px] lg:max-w-[190px]',
  lg: 'h-12 sm:h-14 lg:h-16 w-auto max-w-[150px] sm:max-w-[170px] lg:max-w-[210px]',
};

const clients: Client[] = [
  // Row 1 — Automotive + Tech (biggest names, icon-heavy)
  { name: "Ford Motor Company", logo: "https://cdn.simpleicons.org/ford/white", cdn: true, size: "lg" },
  { name: "General Motors", logo: "https://cdn.simpleicons.org/generalmotors/white", cdn: true, size: "lg" },
  { name: "Toyota", logo: "https://cdn.simpleicons.org/toyota/white", cdn: true, size: "lg" },
  { name: "Stellantis", logo: "/images/clients/stellantis.svg", cdn: false, size: "md" },
  { name: "Nissan", logo: "https://cdn.simpleicons.org/nissan/white", cdn: true, size: "md" },
  { name: "Apple", logo: "https://cdn.simpleicons.org/apple/white", cdn: true, size: "md" },
  // Row 2 — Energy + Healthcare + Transport
  { name: "Starbucks", logo: "https://cdn.simpleicons.org/starbucks/white", cdn: true, size: "md" },
  { name: "Delta Air Lines", logo: "https://cdn.simpleicons.org/delta/white", cdn: true, size: "lg" },
  { name: "Henry Ford Health", logo: "/images/clients/henry-ford-health.svg", cdn: false, size: "md" },
  { name: "DTE Energy", logo: "/images/clients/dte-energy.svg", cdn: false, size: "sm" },
  { name: "FedEx", logo: "https://cdn.simpleicons.org/fedex/white", cdn: true, size: "lg" },
  { name: "Amazon", logo: "/images/clients/amazon.svg", cdn: false, size: "md" },
  // Row 3 — Industry + Retail + Regional
  { name: "BASF", logo: "/images/clients/basf.svg", cdn: false, size: "md" },
  { name: "Costco", logo: "/images/clients/costco.svg", cdn: false, size: "md" },
  { name: "Rocket Mortgage", logo: "https://cdn.simpleicons.org/rocket/white", cdn: true, size: "md" },
  { name: "Domino's", logo: "/images/clients/dominos.svg", cdn: false, size: "md" },
  { name: "Shake Shack", logo: "/images/clients/shake-shack.svg", cdn: false, size: "md" },
  { name: "Five Below", logo: "/images/clients/five-below.svg", cdn: false, size: "md" },
];

export default function ClientShowcase() {
  return (
    <section id="clients" className="py-8 sm:py-10 lg:py-12 bg-neutral-900 border-t border-neutral-800">
      <div className="max-w-6xl mx-auto px-4">
        {/* Heading */}
        <div className="text-center">
          <p className="text-xs font-semibold tracking-widest text-blue-400 uppercase mb-3">
            Trusted by Industry Leaders
          </p>
          <h2 className="font-bold tracking-wider text-white uppercase text-xl sm:text-2xl lg:text-3xl">
            Clients We Serve
          </h2>
          <div className="w-12 h-0.5 bg-accent-500 mt-4 rounded-full mx-auto" />
          <p className="text-center text-neutral-300 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed mt-4 mb-8 sm:mb-10">
            Michigan&apos;s commercial &amp; industrial facilities trust RMI
          </p>
        </div>

        {/* Logo grid — 18 items = 3 rows of 6 (desktop), 6 rows of 3 (mobile) */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-x-2 gap-y-6 items-center justify-items-center">
          {clients.map((client) => (
            <div
              key={client.name}
              className="flex items-center justify-center h-20 w-full px-2 overflow-visible opacity-70 hover:opacity-100 transition-opacity duration-300"
              title={client.name}
            >
              <img
                src={client.logo}
                alt={client.name}
                className={`${sizeClasses[client.size ?? 'md']} object-contain ${
                  client.cdn ? "" : "brightness-0 invert"
                }`}
                loading="lazy"
                width={180}
                height={40}
                referrerPolicy="no-referrer"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
