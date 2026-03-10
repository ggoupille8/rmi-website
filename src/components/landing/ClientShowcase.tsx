const clients = [
  { name: "Ford Motor Company", logo: "/images/clients/ford.svg" },
  { name: "General Motors", logo: "/images/clients/general-motors.svg" },
  { name: "Stellantis", logo: "/images/clients/stellantis.svg" },
  { name: "Henry Ford Health", logo: "/images/clients/henry-ford-health.svg" },
  { name: "Corewell Health", logo: "/images/clients/corewell-health.svg" },
  { name: "DTE Energy", logo: "/images/clients/dte-energy.svg" },
  { name: "CMS Energy", logo: "/images/clients/cms-energy.svg" },
  { name: "University of Michigan", logo: "/images/clients/university-of-michigan.svg" },
  { name: "Detroit Metro Airport", logo: "/images/clients/detroit-metro-airport.svg" },
  { name: "Michigan Central", logo: "/images/clients/michigan-central.svg" },
  { name: "Wayne County", logo: "/images/clients/wayne-county.svg" },
];

export default function ClientShowcase() {
  return (
    <section id="clients" className="py-16 sm:py-20 bg-neutral-950">
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
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-8 items-center justify-items-center">
          {clients.map((client) => (
            <div
              key={client.name}
              className="flex items-center justify-center h-12 w-full opacity-60 hover:opacity-100 transition-opacity duration-300"
              title={client.name}
            >
              <img
                src={client.logo}
                alt={client.name}
                className="max-h-10 max-w-[120px] object-contain brightness-0 invert"
                loading="lazy"
                width={120}
                height={40}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
