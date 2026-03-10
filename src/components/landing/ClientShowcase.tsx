interface Client {
  name: string;
  logo: string;
  /** true when logo is served from an external CDN (already white) */
  cdn: boolean;
}

const clients: Client[] = [
  // Row 1 — Automotive + Tech
  { name: "Ford Motor Company", logo: "https://cdn.simpleicons.org/ford/white", cdn: true },
  { name: "General Motors", logo: "https://cdn.simpleicons.org/generalmotors/white", cdn: true },
  { name: "Toyota", logo: "https://cdn.simpleicons.org/toyota/white", cdn: true },
  { name: "Stellantis", logo: "/images/clients/stellantis.svg", cdn: false },
  { name: "Nissan", logo: "https://cdn.simpleicons.org/nissan/white", cdn: true },
  { name: "Apple", logo: "https://cdn.simpleicons.org/apple/white", cdn: true },
  // Row 2 — National + Regional
  { name: "Starbucks", logo: "https://cdn.simpleicons.org/starbucks/white", cdn: true },
  { name: "Verizon", logo: "https://cdn.simpleicons.org/verizon/white", cdn: true },
  { name: "Delta Air Lines", logo: "https://cdn.simpleicons.org/delta/white", cdn: true },
  { name: "Henry Ford Health", logo: "/images/clients/henry-ford-health.svg", cdn: false },
  { name: "DTE Energy", logo: "/images/clients/dte-energy.svg", cdn: false },
  { name: "FedEx", logo: "https://cdn.simpleicons.org/fedex/white", cdn: true },
];

export default function ClientShowcase() {
  return (
    <section id="clients" className="py-12 sm:py-16 bg-neutral-950">
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

        {/* Logo grid — 12 items = 2 rows of 6 (desktop), 3 of 4 (tablet), 4 of 3 (mobile) */}
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-6 items-center justify-items-center">
          {clients.map((client) => (
            <div
              key={client.name}
              className="flex items-center justify-center h-16 w-full px-2 opacity-70 hover:opacity-100 transition-opacity duration-300"
              title={client.name}
            >
              <img
                src={client.logo}
                alt={client.name}
                className={`h-10 w-auto max-w-[180px] object-contain ${
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
