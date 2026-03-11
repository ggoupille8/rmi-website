interface Client {
  name: string;
  logo: string;
  /** true when logo is served from an external CDN (already white/square) */
  cdn: boolean;
  /** Tailwind size classes for this logo (optical balancing) */
  size: string;
}

const clients: Client[] = [
  // Row 1 — Ford, Starbucks, Toyota, Comcast, FedEx, Apple
  { name: "Ford Motor Company", logo: "https://cdn.simpleicons.org/ford/white", cdn: true, size: "h-8 sm:h-10 w-auto" },
  { name: "Starbucks", logo: "https://cdn.simpleicons.org/starbucks/white", cdn: true, size: "h-10 sm:h-12 w-auto" },
  { name: "Toyota", logo: "https://cdn.simpleicons.org/toyota/white", cdn: true, size: "h-9 sm:h-11 w-auto" },
  { name: "Comcast", logo: "/images/clients/comcast.svg", cdn: false, size: "h-5 sm:h-6 w-auto" },
  { name: "FedEx", logo: "https://cdn.simpleicons.org/fedex/white", cdn: true, size: "h-7 sm:h-9 w-auto" },
  { name: "Apple", logo: "https://cdn.simpleicons.org/apple/white", cdn: true, size: "h-9 sm:h-11 w-auto" },
  // Row 2 — GM, Delta, Flagstar, Stellantis, Amazon, BASF
  { name: "General Motors", logo: "https://cdn.simpleicons.org/generalmotors/white", cdn: true, size: "h-9 sm:h-11 w-auto" },
  { name: "Delta Air Lines", logo: "https://cdn.simpleicons.org/delta/white", cdn: true, size: "h-7 sm:h-9 w-auto" },
  { name: "Flagstar Bank", logo: "/images/clients/flagstar.svg", cdn: false, size: "h-6 sm:h-8 w-auto" },
  { name: "Stellantis", logo: "/images/clients/stellantis.svg", cdn: false, size: "h-8 sm:h-10 w-auto" },
  { name: "Amazon", logo: "/images/clients/amazon.svg", cdn: false, size: "h-5 sm:h-7 w-auto" },
  { name: "BASF", logo: "/images/clients/basf.svg", cdn: false, size: "h-6 sm:h-8 w-auto" },
  // Row 3 — Nissan, Target, Costco, Domino's, Shake Shack, Five Below
  { name: "Nissan", logo: "https://cdn.simpleicons.org/nissan/white", cdn: true, size: "h-9 sm:h-11 w-auto" },
  { name: "Target", logo: "/images/clients/target.svg", cdn: false, size: "h-9 sm:h-11 w-auto" },
  { name: "Costco", logo: "/images/clients/costco.svg", cdn: false, size: "h-5 sm:h-6 w-auto" },
  { name: "Domino's", logo: "/images/clients/dominos.svg", cdn: false, size: "h-5 sm:h-6 w-auto" },
  { name: "Shake Shack", logo: "/images/clients/shake-shack.svg", cdn: false, size: "h-7 sm:h-9 w-auto" },
  { name: "Five Below", logo: "/images/clients/five-below.svg", cdn: false, size: "h-5 sm:h-6 w-auto" },
];

export default function ClientShowcase() {
  return (
    <section
      id="clients"
      className="py-8 sm:py-10 lg:py-12 bg-neutral-900 border-t border-neutral-800"
      aria-labelledby="clients-heading"
    >
      <div className="container-custom max-w-5xl">
        {/* Section Header */}
        <div className="flex flex-col items-center mb-3">
          <p className="text-xs font-semibold tracking-widest text-accent-400 uppercase mb-3">
            Trusted by Industry Leaders
          </p>
          <h2
            id="clients-heading"
            className="font-bold tracking-wider text-white uppercase text-xl sm:text-2xl lg:text-3xl"
          >
            Clients We Serve
          </h2>
          <div className="w-12 h-0.5 bg-accent-500 mt-4 rounded-full" />
        </div>

        {/* Subtitle */}
        <p className="text-center text-neutral-300 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed mt-4 mb-6 sm:mb-8">
          Michigan&apos;s commercial &amp; industrial facilities trust RMI
        </p>

        {/* Logo grid — 3 cols mobile, 6 cols desktop */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-x-2 sm:gap-x-4 gap-y-4 sm:gap-y-6 items-center justify-items-center">
          {clients.map((client) => (
            <div
              key={client.name}
              className="flex items-center justify-center h-14 sm:h-16 lg:h-20 w-full px-2 sm:px-3 opacity-70 hover:opacity-100 transition-opacity duration-300"
            >
              <img
                src={client.logo}
                alt={client.name}
                className={`object-contain max-w-[90px] sm:max-w-[120px] lg:max-w-[140px] ${client.size} ${!client.cdn ? "brightness-0 invert" : ""}`}
                loading="lazy"
                width={120}
                height={48}
                referrerPolicy="no-referrer"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
