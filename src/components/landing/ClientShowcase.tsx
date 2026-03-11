interface Client {
  name: string;
  logo: string;
  /** true when the SVG has dark/colored fill and needs CSS inversion to appear white */
  needsInvert: boolean;
}

const clients: Client[] = [
  // Row 1 — Ford, Starbucks, Toyota, Comcast, FedEx, Apple
  { name: "Ford Motor Company", logo: "/images/clients/ford.svg", needsInvert: false },
  { name: "Starbucks", logo: "/images/clients/starbucks.svg", needsInvert: false },
  { name: "Toyota", logo: "/images/clients/toyota.svg", needsInvert: false },
  { name: "Comcast", logo: "/images/clients/comcast.svg", needsInvert: true },
  { name: "FedEx", logo: "/images/clients/fedex.svg", needsInvert: false },
  { name: "Apple", logo: "/images/clients/apple.svg", needsInvert: false },
  // Row 2 — GM, Delta, Flagstar, Stellantis, Amazon, BASF
  { name: "General Motors", logo: "/images/clients/generalmotors.svg", needsInvert: false },
  { name: "Delta Air Lines", logo: "/images/clients/delta.svg", needsInvert: false },
  { name: "Flagstar Bank", logo: "/images/clients/flagstar.svg", needsInvert: true },
  { name: "Stellantis", logo: "/images/clients/stellantis.svg", needsInvert: true },
  { name: "Amazon", logo: "/images/clients/amazon.svg", needsInvert: true },
  { name: "BASF", logo: "/images/clients/basf.svg", needsInvert: true },
  // Row 3 — Nissan, Target, Costco, Domino's, Shake Shack, Five Below
  { name: "Nissan", logo: "/images/clients/nissan.svg", needsInvert: false },
  { name: "Target", logo: "/images/clients/target.svg", needsInvert: true },
  { name: "Costco", logo: "/images/clients/costco.svg", needsInvert: true },
  { name: "Domino's", logo: "/images/clients/dominos.svg", needsInvert: true },
  { name: "Shake Shack", logo: "/images/clients/shake-shack.svg", needsInvert: true },
  { name: "Five Below", logo: "/images/clients/five-below.svg", needsInvert: true },
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
