interface Client {
  name: string;
  logo: string;
  /** true when logo is served from an external CDN (already white, square 1:1) */
  cdn: boolean;
}

const clients: Client[] = [
  // Row 1 — Automotive + Tech (biggest names, icon-heavy)
  { name: "Ford Motor Company", logo: "https://cdn.simpleicons.org/ford/white", cdn: true },
  { name: "General Motors", logo: "https://cdn.simpleicons.org/generalmotors/white", cdn: true },
  { name: "Toyota", logo: "https://cdn.simpleicons.org/toyota/white", cdn: true },
  { name: "Stellantis", logo: "/images/clients/stellantis.svg", cdn: false },
  { name: "Nissan", logo: "https://cdn.simpleicons.org/nissan/white", cdn: true },
  { name: "Apple", logo: "https://cdn.simpleicons.org/apple/white", cdn: true },
  // Row 2 — Energy + Healthcare + Transport
  { name: "Starbucks", logo: "https://cdn.simpleicons.org/starbucks/white", cdn: true },
  { name: "Delta Air Lines", logo: "https://cdn.simpleicons.org/delta/white", cdn: true },
  { name: "Comcast", logo: "/images/clients/comcast.svg", cdn: false },
  { name: "Flagstar Bank", logo: "/images/clients/flagstar.svg", cdn: false },
  { name: "FedEx", logo: "https://cdn.simpleicons.org/fedex/white", cdn: true },
  { name: "Amazon", logo: "/images/clients/amazon.svg", cdn: false },
  // Row 3 — Industry + Retail + Regional
  { name: "BASF", logo: "/images/clients/basf.svg", cdn: false },
  { name: "Costco", logo: "/images/clients/costco.svg", cdn: false },
  { name: "Rocket Mortgage", logo: "https://cdn.simpleicons.org/rocket/white", cdn: true },
  { name: "Domino's", logo: "/images/clients/dominos.svg", cdn: false },
  { name: "Shake Shack", logo: "/images/clients/shake-shack.svg", cdn: false },
  { name: "Five Below", logo: "/images/clients/five-below.svg", cdn: false },
];

export default function ClientShowcase() {
  return (
    <section id="clients" className="py-6 sm:py-8 lg:py-10 bg-neutral-900 border-t border-neutral-800">
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
          <p className="text-center text-neutral-300 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed mt-4 mb-4 sm:mb-6">
            Michigan&apos;s commercial &amp; industrial facilities trust RMI
          </p>
        </div>

        {/* Logo grid — 18 items = 3 rows of 6 (desktop), 6 rows of 3 (mobile) */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-x-1 gap-y-4 items-center justify-items-center">
          {clients.map((client) => (
            <div
              key={client.name}
              className="flex items-center justify-center h-14 w-full px-2 overflow-hidden opacity-70 hover:opacity-100 transition-opacity duration-300"
              title={client.name}
            >
              <img
                src={client.logo}
                alt={client.name}
                className={`object-contain ${
                  client.cdn
                    ? "h-12 lg:h-14 w-auto max-w-[60px] lg:max-w-[70px]"
                    : "h-10 lg:h-12 w-auto max-w-[150px] lg:max-w-[170px] brightness-0 invert"
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
