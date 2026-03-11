interface Client {
  name: string;
  logo: string;
  /** true when the SVG has dark/colored fill and needs CSS inversion to appear white */
  needsInvert: boolean;
}

const clients: Client[] = [
  // Row 1 — Automotive/industrial heavyweights + tech giants
  { name: "Ford Motor Company", logo: "/images/clients/ford.svg", needsInvert: false },
  { name: "General Motors", logo: "/images/clients/generalmotors.svg", needsInvert: false },
  { name: "Toyota", logo: "/images/clients/toyota.svg", needsInvert: false },
  { name: "Stellantis", logo: "/images/clients/stellantis.svg", needsInvert: true },
  { name: "Apple", logo: "/images/clients/apple.svg", needsInvert: false },
  { name: "Amazon", logo: "/images/clients/amazon.svg", needsInvert: true },
  // Row 2 — Logistics, telecom, industrial, financial
  { name: "FedEx", logo: "/images/clients/fedex.svg", needsInvert: false },
  { name: "Delta Air Lines", logo: "/images/clients/delta.svg", needsInvert: false },
  { name: "Comcast", logo: "/images/clients/comcast.svg", needsInvert: true },
  { name: "BASF", logo: "/images/clients/basf.svg", needsInvert: true },
  { name: "Flagstar Bank", logo: "/images/clients/flagstar.svg", needsInvert: true },
  { name: "Nissan", logo: "/images/clients/nissan.svg", needsInvert: false },
  // Row 3 — Retail/food service
  { name: "Target", logo: "/images/clients/target.svg", needsInvert: true },
  { name: "Costco", logo: "/images/clients/costco.svg", needsInvert: true },
  { name: "Starbucks", logo: "/images/clients/starbucks.svg", needsInvert: false },
  { name: "Domino's", logo: "/images/clients/dominos.svg", needsInvert: true },
  { name: "Shake Shack", logo: "/images/clients/shake-shack.svg", needsInvert: true },
  { name: "Five Below", logo: "/images/clients/five-below.svg", needsInvert: true },
];

export default function ClientShowcase() {
  return (
    <section id="clients" className="py-12 sm:py-16 lg:py-20 bg-neutral-900 border-t border-neutral-800">
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
          <p className="text-center text-neutral-300 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed mt-4 mb-8 sm:mb-10 lg:mb-12">
            Michigan&apos;s commercial &amp; industrial facilities trust RMI
          </p>
        </div>

        {/* Logo grid — 18 items = 3 rows of 6 (desktop), 6 rows of 3 (mobile) */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-x-4 sm:gap-x-6 lg:gap-x-8 gap-y-6 sm:gap-y-8 lg:gap-y-10 items-center justify-items-center">
          {clients.map((client) => (
            <div
              key={client.name}
              className="flex items-center justify-center h-16 sm:h-18 lg:h-20 w-full px-2 opacity-70 hover:opacity-100 transition-opacity duration-300"
            >
              <img
                src={client.logo}
                alt={client.name}
                className={`object-contain h-8 sm:h-9 lg:h-10 max-w-[100px] sm:max-w-[120px] lg:max-w-[130px] w-auto${client.needsInvert ? " brightness-0 invert" : ""}`}
                loading="lazy"
                width={130}
                height={40}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
